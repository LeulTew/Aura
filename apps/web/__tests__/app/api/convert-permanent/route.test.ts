/**
 * @jest-environment node
 */
// Mock Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

import { POST, GET } from '@/app/api/convert-permanent/route';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

const mockUpdate = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockInsert = jest.fn();

const mockSupabase = {
  from: jest.fn(() => ({
    update: mockUpdate,
    select: mockSelect,
    insert: mockInsert,
    eq: mockEq // sometimes direct eq
  }))
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

beforeEach(() => {
  jest.clearAllMocks();
  // Chain setup
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ in: mockIn, select: mockSelect }); // update().eq().eq() pattern support
  mockIn.mockReturnValue({ select: mockSelect });
  mockSelect.mockResolvedValue({ data: [], error: null });
  
  // For GET
  mockSelect.mockReturnValue({ eq: mockEq });
});

describe('Convert Permanent API', () => {
  describe('POST', () => {
    it('converts event_temp photos to permanent', async () => {
      const req = new NextRequest('http://localhost/api/convert-permanent', {
        method: 'POST',
        body: JSON.stringify({
          orgId: 'org-123',
          convertAll: true
        })
      });

      // Mock select returning converted items
      mockSelect.mockResolvedValueOnce({ data: [{ id: '1' }, { id: '2' }], error: null });

      const res = await POST(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.convertedCount).toBe(2);
      expect(mockUpdate).toHaveBeenCalledWith({ source_type: 'cloud', expires_at: null });
      // Verify usage log insert
      expect(mockInsert).toHaveBeenCalled();
    });

    it('returns error if orgId missing', async () => {
        const req = new NextRequest('http://localhost/api/convert-permanent', {
            method: 'POST',
            body: JSON.stringify({ })
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });
  });

  describe('GET', () => {
     it('returns count of event_temp photos', async () => {
        const req = new NextRequest('http://localhost/api/convert-permanent?orgId=org-123');
        
        mockSelect.mockResolvedValueOnce({ count: 5, error: null });
        
        const res = await GET(req);
        const json = await res.json();
        
        expect(json.success).toBe(true);
        expect(json.eventTempCount).toBe(5);
     });
  });
});
