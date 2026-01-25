'use client';

import { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';
import { parseJwt } from '@/utils/auth';

interface Organization {
    id: string;
    name: string;
    slug: string;
    role: string;
    is_primary: boolean;
}

export default function StudioSwitcher() {
    const [isOpen, setIsOpen] = useState(false);
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
    const [switching, setSwitching] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchOrganizations();

        // Close dropdown on outside click
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchOrganizations = async () => {
        try {
            const token = sessionStorage.getItem('admin_token');
            if (!token) return;

            const claims = parseJwt(token);
            const currentOrgId = claims?.org_id;

            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const res = await fetch(`${backendUrl}/api/owner/organizations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                // Might be 404 if table doesn't exist yet, that's okay
                console.debug('StudioSwitcher: Organizations endpoint not available');
                return;
            }

            const data = await res.json();
            if (data.success && data.organizations) {
                // API returns org_id, but we store as id in our interface
                const mappedOrgs = data.organizations.map((o: { org_id: string; org_name: string; org_slug: string; role: string; is_primary: boolean }) => ({
                    id: o.org_id,
                    name: o.org_name,
                    slug: o.org_slug,
                    role: o.role,
                    is_primary: o.is_primary
                }));
                setOrgs(mappedOrgs);
                const current = mappedOrgs.find((o: Organization) => o.id === currentOrgId);
                if (current) setCurrentOrg(current);
                else if (mappedOrgs.length > 0) setCurrentOrg(mappedOrgs[0]);
            }
        } catch (err) {
            console.error('Failed to fetch organizations:', err);
        }
    };

    const handleSwitch = async (org: Organization) => {
        if (org.id === currentOrg?.id) {
            setIsOpen(false);
            return;
        }

        setSwitching(true);
        try {
            const token = sessionStorage.getItem('admin_token');
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

            const res = await fetch(`${backendUrl}/api/owner/switch-org`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ org_id: org.id })
            });

            const data = await res.json();

            if (data.success && data.token) {
                // Store new token
                sessionStorage.setItem('admin_token', data.token);
                // Reload page to refresh context
                window.location.reload();
            }
        } catch (err) {
            console.error('Failed to switch organization:', err);
        } finally {
            setSwitching(false);
        }
    };

    // Don't render if user only has one org
    if (orgs.length <= 1) return null;

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={switching}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm"
            >
                {switching ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                ) : (
                    <Building2 className="w-4 h-4 text-[var(--accent)]" />
                )}
                <span className="text-white/80 max-w-[120px] truncate">
                    {currentOrg?.name || 'Select Studio'}
                </span>
                <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-2 border-b border-white/5">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-white/30 px-2">
                            Switch Studio
                        </p>
                    </div>
                    <div className="py-1 max-h-64 overflow-y-auto">
                        {orgs.map((org) => (
                            <button
                                key={org.id}
                                onClick={() => handleSwitch(org)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left ${
                                    org.id === currentOrg?.id ? 'bg-[var(--accent)]/10' : ''
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-white/90 truncate">{org.name}</div>
                                    <div className="text-[10px] text-white/40 font-mono">{org.slug}</div>
                                </div>
                                {org.id === currentOrg?.id && (
                                    <Check className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
                                )}
                                {org.is_primary && org.id !== currentOrg?.id && (
                                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 uppercase">
                                        Primary
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
