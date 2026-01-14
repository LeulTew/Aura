/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, Upload, Images, FolderOpen, Users, 
    HardDrive, Settings, LogOut, Menu, X, ChevronRight,
    Building2
} from 'lucide-react';

// JWT Parser
function parseJwt(token: string): any {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

// Navigation Items with Role Access
const NAV_ITEMS = [
    { 
        href: '/admin', 
        label: 'Dashboard', 
        icon: LayoutDashboard,
        roles: ['admin', 'employee'],
        labels: ['manager', 'photographer', 'editor']
    },
    { 
        href: '/admin/capture', 
        label: 'Upload', 
        icon: Upload,
        roles: ['admin', 'employee'],
        labels: ['manager', 'photographer'] // editors can't upload
    },
    { 
        href: '/admin/gallery', 
        label: 'Gallery', 
        icon: Images,
        roles: ['admin', 'employee'],
        labels: ['manager', 'photographer', 'editor']
    },
    { 
        href: '/admin/files', 
        label: 'File Manager', 
        icon: FolderOpen,
        roles: ['admin', 'employee'],
        labels: ['manager'] // only managers
    },
    { 
        href: '/admin/team', 
        label: 'Team', 
        icon: Users,
        roles: ['admin'], // admin only
        labels: []
    },
    { 
        href: '/admin/sources', 
        label: 'Sources', 
        icon: HardDrive,
        roles: ['admin', 'employee'],
        labels: ['manager']
    },
    { 
        href: '/admin/settings', 
        label: 'Settings', 
        icon: Settings,
        roles: ['admin'],
        labels: []
    },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userRole, setUserRole] = useState<string>('');
    const [userLabel, setUserLabel] = useState<string>('photographer');
    const [orgName, setOrgName] = useState<string>('');
    const [displayName, setDisplayName] = useState<string>('');

    useEffect(() => {
        const token = sessionStorage.getItem('admin_token');
        if (!token) {
            window.location.href = '/login';
            return;
        }
        
        const claims = parseJwt(token);
        if (claims) {
            setUserRole(claims.role || 'employee');
            setUserLabel(claims.label || 'photographer');
            setOrgName(claims.org_name || 'Organization');
            setDisplayName(claims.display_name || claims.email || 'User');
        }
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem('admin_token');
        window.location.href = '/login';
    };

    // Filter nav items based on role and label
    const visibleItems = NAV_ITEMS.filter(item => {
        // Admin sees everything
        if (userRole === 'admin') return true;
        // Check if role is allowed
        if (!item.roles.includes(userRole)) return false;
        // For employees, check label
        if (userRole === 'employee') {
            return item.labels.includes(userLabel);
        }
        return true;
    });

    return (
        <div className="min-h-screen bg-[#050505] text-white flex">
            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-white/5 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#6366f1] rounded-lg flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-sm uppercase tracking-wider">Aura</span>
                    </Link>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/40 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Org Info */}
                <div className="px-6 py-4 border-b border-white/5">
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider">Organization</p>
                    <p className="text-sm font-medium mt-1 truncate">{orgName}</p>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {visibleItems.map(item => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                    isActive 
                                        ? 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20' 
                                        : 'text-white/50 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold uppercase">
                            {displayName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{displayName}</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider">{userRole}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-400/5 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 min-h-screen">
                {/* Mobile Header */}
                <header className="lg:hidden sticky top-0 z-30 h-16 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 text-white/60 hover:text-white">
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-sm uppercase tracking-wider">Aura</span>
                    <div className="w-10" /> {/* Spacer */}
                </header>

                {/* Page Content */}
                <div className="p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
