
import { renderHook } from '@testing-library/react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import * as authUtils from '@/utils/auth';

// Mock utils
jest.mock('@/utils/auth', () => ({
  parseJwt: jest.fn(),
}));

describe('useAdminAuth', () => {
    
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it('should return default state when no token exists', () => {
    const { result } = renderHook(() => useAdminAuth());
    
    expect(result.current).toEqual({
      orgId: null,
      userId: null,
      displayName: '',
      role: 'employee'
    });
  });

  it('should return default state when token is invalid', () => {
    sessionStorage.setItem('admin_token', 'invalid-token');
    (authUtils.parseJwt as jest.Mock).mockReturnValue(null);
    
    const { result } = renderHook(() => useAdminAuth());
    
    expect(result.current).toEqual({
      orgId: null,
      userId: null,
      displayName: '',
      role: 'employee'
    });
  });

  it('should return correct auth state from valid token', () => {
    sessionStorage.setItem('admin_token', 'valid-token');
    (authUtils.parseJwt as jest.Mock).mockReturnValue({
      sub: 'user-123',
      role: 'admin',
      org_id: 'org-456',
      display_name: 'Test Admin'
    });

    const { result } = renderHook(() => useAdminAuth());
    
    expect(result.current).toEqual({
      userId: 'user-123',
      role: 'admin',
      orgId: 'org-456',
      displayName: 'Test Admin'
    });
  });

  it('should handle missing optional claims gracefully', () => {
      sessionStorage.setItem('admin_token', 'partial-token');
      (authUtils.parseJwt as jest.Mock).mockReturnValue({
        sub: 'user-789'
        // Missing role (default 'employee')
        // Missing org_id (default null)
        // Missing display_name (default '')
      });
  
      const { result } = renderHook(() => useAdminAuth());
      
      expect(result.current).toEqual({
        userId: 'user-789',
        role: 'employee',
        orgId: null,
        displayName: ''
      });
    });
});
