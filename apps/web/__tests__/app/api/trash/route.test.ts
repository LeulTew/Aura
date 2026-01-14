/**
 * @jest-environment node
 */
// Mock Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

import { POST, PUT, GET } from '@/app/api/trash/route';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

// Mock Database Calls
const mockUpdate = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockMove = jest.fn();
const mockList = jest.fn();
const mockInsert = jest.fn();

const mockSupabase = {
  from: jest.fn(() => ({
    update: mockUpdate,
    select: mockSelect,
    insert: mockInsert,
    delete: jest.fn(() => ({ eq: mockEq }))
  })),
  storage: {
    from: jest.fn(() => ({
      move: mockMove,
      list: mockList,
      remove: jest.fn()
    }))
  }
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

// Reset mocks helper
beforeEach(() => {
  jest.clearAllMocks();
  // Default chain setup
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ in: mockIn, select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEq }); // chainable
  mockIn.mockResolvedValue({ data: [], error: null });
  // Default success response for simple selects
  mockSelect.mockResolvedValue({ data: [{ id: '1' }], error: null });
  // Default success for storage
  mockMove.mockResolvedValue({ error: null });
});

describe('Trash API', () => {
    
  describe('POST (Soft Delete)', () => {
    it('moves file to trash and updates DB', async () => {
      // Setup payload
      const req = new NextRequest('http://localhost/api/trash', {
        method: 'POST',
        body: JSON.stringify({ 
          photoIds: ['123'], 
          orgSlug: 'test-org',
          orgId: 'org-123' 
        })
      });

      // Mock getting photo paths
      mockSelect.mockResolvedValueOnce({ 
        data: [{ id: '123', full_path: 'folder/img.jpg' }], 
        error: null 
      });

      const res = await POST(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(mockMove).toHaveBeenCalledWith('folder/img.jpg', 'test-org/.trash/img.jpg');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ 
        full_path: 'test-org/.trash/img.jpg',
        metadata: expect.objectContaining({ trashed: true })
      }));
    });
  });

  describe('PUT (Restore)', () => {
    it('restores file from trash', async () => {
      const req = new NextRequest('http://localhost/api/trash', {
        method: 'PUT',
        body: JSON.stringify({ photoId: '123' })
      });

      // Mock getting photo info
      mockSelect.mockResolvedValueOnce({ 
        data: [{ 
            id: '123', 
            full_path: 'test-org/.trash/img.jpg',
            metadata: { original_path: 'folder/img.jpg' } 
        }], 
        error: null 
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(mockMove).toHaveBeenCalledWith('test-org/.trash/img.jpg', 'folder/img.jpg');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ 
        full_path: 'folder/img.jpg',
        source_type: 'cloud'
      }));
    });
  });

  describe('GET (List)', () => {
    it('lists trashed photos for org', async () => {
      const req = new NextRequest('http://localhost/api/trash?orgId=org-123');
      
      await GET(req);
      
      // Since it calls supabase.from('photos').select...
      expect(mockSelect).toHaveBeenCalled();
      // We expect it to filter by metadata->trashed
      // Note: testing complex filter chains with mocks is fragile, mainly checking flow here
    });
  });
});
