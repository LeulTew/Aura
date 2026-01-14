/**
 * @jest-environment node
 */
// Mock env BEFORE imports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

import { POST } from '@/app/api/optimize/route';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockUpload = jest.fn();
const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: mockFrom
    }
  }))
}));

// Mock Sharp
const mockToBuffer = jest.fn();
const mockWebp = jest.fn(() => ({ toBuffer: mockToBuffer }));
const mockResize = jest.fn(() => ({ webp: mockWebp }));
const mockSharp = jest.fn(() => ({
  resize: mockResize,
  metadata: jest.fn().mockResolvedValue({ width: 1000 })
}));

jest.mock('sharp', () => ({
  __esModule: true,
  default: mockSharp
}));

describe('Optimize API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({ upload: mockUpload });
    mockUpload.mockResolvedValue({ data: { path: 'optimized/img.webp' }, error: null });
    mockToBuffer.mockResolvedValue(Buffer.from('fake-image'));
  });

  it('optimizes image and uploads variants', async () => {
    // Create a fake form data with a file
    const formData = new FormData();
    const file = new File(['fake content'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    formData.append('orgSlug', 'test-org');
    formData.append('year', '2025');
    formData.append('folder', 'events');

    const req = new NextRequest('http://localhost/api/optimize', {
      method: 'POST',
      body: formData
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(mockSharp).toHaveBeenCalled();
    // Expect 2 uploads (full and thumb)
    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('optimized/full/'), 
        expect.anything(), 
        expect.anything()
    );
  });
});
