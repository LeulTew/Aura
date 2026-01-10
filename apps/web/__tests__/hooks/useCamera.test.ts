/* eslint-disable */ 
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCamera } from '../../src/hooks/useCamera';

// Setup Mock Tethr
const mockRequestCamera = jest.fn();
const mockWatch = jest.fn();

jest.mock('tethr', () => ({
  TethrManager: class {
    constructor() {}
    watch = (cb: any) => mockWatch(cb);
    requestCamera = (...args: any) => mockRequestCamera(...args);
  }
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'path' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'url' } })
      }))
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null })
    }))
  }
}));

jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn(() => [])
}));

jest.mock('@/lib/db', () => ({
  db: {
    photos: {
      put: jest.fn(),
      update: jest.fn()
    }
  }
}));

global.URL.createObjectURL = jest.fn(() => 'blob:url');
global.URL.revokeObjectURL = jest.fn();

const mockCamera = {
  open: jest.fn(),
  close: jest.fn(),
  name: 'Mock Sony',
  getBatteryLevel: jest.fn().mockResolvedValue(80),
  getModel: jest.fn().mockResolvedValue('Mock Model'),
  takePhoto: jest.fn().mockResolvedValue({
    blob: new Blob(['mock'], { type: 'image/jpeg' })
  }),
  on: jest.fn(),
  off: jest.fn()
};

describe('useCamera Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes disconnected', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.status).toBe('disconnected');
  });

  it('connects to camera successfully', async () => {
    mockRequestCamera.mockResolvedValue(mockCamera);
    
    const { result } = renderHook(() => useCamera());

    await act(async () => {
       await result.current.connect();
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.cameraName).toBe('Mock Sony');
  });

  it('handles disconnect', async () => {
    mockRequestCamera.mockResolvedValue(mockCamera);
    const { result } = renderHook(() => useCamera());
    await act(async () => { await result.current.connect(); });
    
    await act(async () => {
      await result.current.disconnect();
    });
    
    expect(result.current.status).toBe('disconnected');
    expect(mockCamera.close).toHaveBeenCalled();
  });
});
