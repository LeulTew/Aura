import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StudioSwitcher from '@/components/StudioSwitcher';
import { reloadPage } from '@/utils/navigation';
import '@testing-library/jest-dom';

// Mock navigation
jest.mock('@/utils/navigation', () => ({
    reloadPage: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

// Mock sessionStorage
const mockSessionStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

// Helper to mock JWT token
const mockToken = (orgId: string) => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ 
        sub: "user123", 
        org_id: orgId,
        exp: Date.now() / 1000 + 3600 
    }));
    return `${header}.${payload}.signature`;
};

describe('StudioSwitcher', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSessionStorage.clear();
        mockSessionStorage.setItem('admin_token', mockToken('org1'));
    });

    it('does not render if user has only 1 organization', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                organizations: [
                    { org_id: 'org1', org_name: 'Studio A', role: 'admin', is_primary: true }
                ]
            })
        });

        const { container } = render(<StudioSwitcher />);
        
        // Wait for fetch
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        
        // Should be empty
        expect(container.firstChild).toBeNull();
    });

    it('renders dropdown if user has multiple organizations', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                organizations: [
                    { org_id: 'org1', org_name: 'Studio A', role: 'admin', is_primary: true },
                    { org_id: 'org2', org_name: 'Studio B', role: 'admin', is_primary: false }
                ]
            })
        });

        render(<StudioSwitcher />);
        
        await waitFor(() => {
            expect(screen.getByText('Studio A')).toBeInTheDocument();
        });
        
        // Button exists
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('switches organization when clicked', async () => {
        // 1. Mock List Orgs
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    organizations: [
                        { org_id: 'org1', org_name: 'Studio A', role: 'admin', is_primary: true },
                        { org_id: 'org2', org_name: 'Studio B', role: 'admin', is_primary: false }
                    ]
                })
            })
            // 2. Mock Switch API
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    token: 'new_token_123'
                })
            });

        render(<StudioSwitcher />);
        
        // Open dropdown
        await waitFor(() => screen.getByText('Studio A'));
        fireEvent.click(screen.getByRole('button'));
        
        // Click second org
        const studioB = screen.getByText('Studio B');
        fireEvent.click(studioB);
        
        // Verify switch API call
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(global.fetch).toHaveBeenLastCalledWith(
                expect.stringContaining('/api/owner/switch-org'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ org_id: 'org2' })
                })
            );
        });

        // Verify token update and reload
        expect(mockSessionStorage.getItem('admin_token')).toBe('new_token_123');
        expect(reloadPage).toHaveBeenCalled();
    });
});
