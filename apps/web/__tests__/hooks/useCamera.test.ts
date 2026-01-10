import { renderHook, act } from '@testing-library/react';
import { useCamera } from '../../src/hooks/useCamera';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: jest.fn() },
    from: jest.fn()
  }
}));

jest.mock('tethr', () => ({
  TethrManager: class {
    constructor() {}
    watch = jest.fn()
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

describe('useCamera', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.status).toBe('disconnected');
    expect(result.current.logs).toEqual([]);
  });
});
