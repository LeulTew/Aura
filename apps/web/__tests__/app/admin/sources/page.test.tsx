/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SourcesPage from '@/app/admin/sources/page';
import '@testing-library/jest-dom';

// Setup Mock SessionStorage
const mockStore: Record<string, string> = {};
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: (key: string) => mockStore[key] || null,
    setItem: (key: string, val: string) => { mockStore[key] = val; },
    removeItem: (key: string) => { delete mockStore[key]; },
    clear: () => { for (const k in mockStore) delete mockStore[k]; }
  },
  writable: true
});

// Setup Mock Supabase
const mockEq = jest.fn(); 
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom
  }
}));

describe('SourcesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default valid token
    const token = `header.${btoa(JSON.stringify({ org_id: 'org-1,', role: 'admin' }))}.signature`;
    mockStore['sb-access-token'] = token;
    
    // Default mock response
    mockEq.mockResolvedValue({ 
      data: [
        { source_type: 'cloud', created_at: '2025-01-01' },
        { source_type: 'event_temp', created_at: '2025-01-02' }
      ], 
      error: null 
    });
  });

  it('renders stats correctly', async () => {
    render(<SourcesPage />);
    
    // Wait for data fetch
    await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('photos');
        expect(mockSelect).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalled();
    });

    // Check for "Cloud Storage" and "Event Temp" texts
    expect(await screen.findByText('Cloud Storage')).toBeInTheDocument();
    expect(await screen.findByText('Event Temp')).toBeInTheDocument();
  });
});
