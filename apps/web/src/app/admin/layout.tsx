'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, Upload, Images, FolderOpen, Users, 
    HardDrive, Settings, LogOut, Menu, X, ChevronRight,
    Sun, Moon, Camera
} from 'lucide-react';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';

// JWT Parser
interface JwtClaims {
    role?: string;
    label?: string;
    org_name?: string;
    display_name?: string;
    email?: string;
}

function parseJwt(token: string): JwtClaims | null {
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

// Navigation Items
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
        labels: ['manager', 'photographer'] 
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
        labels: ['manager'] 
    },
    { 
        href: '/admin/team', 
        label: 'Team', 
        icon: Users,
        roles: ['admin'], 
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

function AdminShell({ children }: { children: React.ReactNode }) {
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Lazy initialization from sessionStorage to avoid setState-in-effect
    const [userState] = useState(() => {
        if (typeof window === 'undefined') {
            return { role: '', label: 'photographer', orgName: '', displayName: '' };
        }
        const token = sessionStorage.getItem('admin_token');
        if (!token) {
            return { role: '', label: 'photographer', orgName: '', displayName: '', redirect: true };
        }
        const claims = parseJwt(token);
        return {
            role: claims?.role || 'employee',
            label: claims?.label || 'photographer',
            orgName: claims?.org_name || 'Organization',
            displayName: claims?.display_name || claims?.email || 'User',
            redirect: false
        };
    });

    useEffect(() => {
        if (userState.redirect) {
            window.location.href = '/login';
        }
    }, [userState.redirect]);

    const userRole = userState.role;
    const userLabel = userState.label;
    const orgName = userState.orgName;
    const displayName = userState.displayName;

    const handleLogout = () => {
        sessionStorage.removeItem('admin_token');
        window.location.href = '/login';
    };

    const visibleItems = NAV_ITEMS.filter(item => {
        if (userRole === 'admin') return true;
        if (!item.roles.includes(userRole)) return false;
        if (userRole === 'employee') {
            return item.labels.includes(userLabel);
        }
        return true;
    });

    return (
        <div 
            className={`min-h-screen transition-colors duration-300 ${theme === 'light' ? 'bg-gray-50 text-gray-900' : 'bg-[#050505] text-white'}`}
            style={{ '--accent': '#7C3AED' } as React.CSSProperties}
        >
            {/* Sidebar Desktop */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#0a0a0a] border-white/5'}`}>
                {/* Logo Area */}
                <div className="h-20 flex items-center justify-between px-8 border-b border-[inherit]">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center shadow-lg shadow-[#7C3AED]/20">
                            <Camera className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-sans font-black uppercase tracking-tight text-lg">Aura</span>
                    </Link>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden opacity-50 hover:opacity-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Org Header */}
                <div className="px-8 py-6 border-b border-[inherit]">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 mb-2">Organization</p>
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${theme === 'light' ? 'bg-[#7C3AED]' : 'bg-[#7C3AED] shadow-[0_0_10px_#7C3AED]'}`} />
                        <span className="font-bold text-sm truncate">{orgName}</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2 mt-4">
                    {visibleItems.map(item => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                    isActive 
                                        ? 'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20' 
                                        : 'border-transparent opacity-50 hover:opacity-100 hover:bg-[var(--foreground)]/5'
                                }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-[#7C3AED]' : ''}`} />
                                {item.label}
                                {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer User Profile */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[inherit] bg-[inherit]">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase border ${theme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-white/10 border-white/10'}`}>
                            {displayName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{displayName}</p>
                            <p className="text-[10px] opacity-40 uppercase tracking-wider">{userRole}</p>
                        </div>
                        
                        {/* Theme Toggle */}
                        <button 
                            onClick={toggleTheme}
                             className={`p-2 rounded-lg transition-colors ${theme === 'light' ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white/40 hover:text-white'}`}
                        >
                           {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </button>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-red-500 bg-red-500/5 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                    >
                        <LogOut className="w-4 h-4" />
                        Disconnect
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main className={`lg:ml-72 min-h-screen transition-all duration-300`}>
                {/* Mobile Header */}
                <header className={`lg:hidden h-16 border-b flex items-center justify-between px-6 sticky top-0 z-30 backdrop-blur-md ${theme === 'light' ? 'bg-white/80 border-gray-200' : 'bg-[#050505]/80 border-white/5'}`}>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 opacity-60 hover:opacity-100">
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="font-sans font-black uppercase text-lg tracking-tight">Aura</span>
                    <button onClick={toggleTheme} className="p-2 -mr-2 opacity-60 hover:opacity-100">
                         {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </button>
                </header>

                <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <AdminShell>{children}</AdminShell>
        </ThemeProvider>
    );
}
