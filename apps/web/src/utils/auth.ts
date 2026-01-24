export interface JWTPayload {
    sub: string;
    email?: string;
    role?: 'superadmin' | 'admin' | 'employee' | 'guest';
    org_id?: string;
    org_slug?: string;
    org_name?: string;
    display_name?: string;
    exp?: number;
    [key: string]: any; // Allow other claims but prefer typed ones
}

export function parseJwt(token: string): JWTPayload | null {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        
        return JSON.parse(jsonPayload) as JWTPayload;
    } catch (e) {
        console.error("Failed to parse JWT", e);
        return null; // Return null safely on failure
    }
}
