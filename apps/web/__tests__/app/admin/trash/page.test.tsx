import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TrashPage from '@/app/admin/trash/page';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

describe('TrashPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Valid token
    const mockToken = `header.${btoa(JSON.stringify({ org_id: '123', role: 'admin' }))}.signature`;
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(() => mockToken)
      },
      writable: true
    });
  });

  it('fetches and displays empty trash state', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, photos: [] })
    });

    render(<TrashPage />);

    await waitFor(() => {
      expect(screen.getByText('Trash is empty')).toBeInTheDocument();
    });
  });

  it('displays trashed items with countdown', async () => {
    const today = new Date();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        photos: [
          {
            id: '1',
            full_path: 'foo/bar/img.jpg',
            metadata: { trashed_at: today.toISOString(), original_path: 'bar/img.jpg' },
            created_at: today.toISOString()
          }
        ]
      })
    });

    render(<TrashPage />);

    await waitFor(() => {
      expect(screen.getByText('img.jpg')).toBeInTheDocument();
      // 30 days remaining
      expect(screen.getByText(/30 days remaining/)).toBeInTheDocument();
    });
  });

  it('handles restore action', async () => {
    // 1. Initial Load
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          photos: [{ id: '1', full_path: 'img.jpg', metadata: { trashed: true } }]
        })
      })
      // 2. Restore Action
      .mockResolvedValueOnce({
        json: async () => ({ success: true, message: 'Restored' })
      })
      // 3. Refresh List (Empty)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, photos: [] })
      });

    render(<TrashPage />);
    
    await waitFor(() => screen.getByText('img.jpg'));
    
    const restoreBtn = screen.getByText('Restore');
    fireEvent.click(restoreBtn);

    await waitFor(() => {
        expect(screen.getByText('Restored')).toBeInTheDocument();
    });
  });
});
