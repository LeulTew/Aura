import { useState, useEffect } from 'react';
import { parseJwt } from '@/utils/auth';

export function useAdminAuth() {
    // Lazy initialization - compute once on mount
    const [auth] = useState(() => {
        if (typeof window === 'undefined') {
            return {
                orgId: null as string | null,
                userId: null as string | null,
                displayName: '',
                role: 'employee'
            };
        }
        
        const token = sessionStorage.getItem('admin_token');
        if (!token) {
            return {
                orgId: null as string | null,
                userId: null as string | null,
                displayName: '',
                role: 'employee'
            };
        }
        
        const claims = parseJwt(token);
        if (!claims) {
            return {
                orgId: null as string | null,
                userId: null as string | null,
                displayName: '',
                role: 'employee'
            };
        }
        
        return {
            orgId: claims.org_id || null,
            userId: claims.sub || null,
            displayName: claims.display_name || '',
            role: claims.role || 'employee'
        };
    });

    return auth;
}
