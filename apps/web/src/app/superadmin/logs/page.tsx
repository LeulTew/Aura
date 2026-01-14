
'use client';

import { ArrowLeft } from "lucide-react";
import Link from 'next/link';

export default function LogsPage() {
    return (
        <div className="min-h-screen bg-[#f7f3ee] text-[#1a1c1e] p-8 font-mono">
            <style jsx global>{`
                body {
                    background-image: url("https://www.transparenttextures.com/patterns/felt.png");
                }
            `}</style>
            
            <header className="mb-8">
                <Link href="/superadmin" className="flex items-center gap-2 text-[#8e9196] hover:text-[#1a1c1e] transition-colors mb-4 text-xs font-bold uppercase tracking-wider">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold uppercase tracking-tight">System Logs</h1>
                <p className="text-[#c5a059] text-xs uppercase tracking-widest mt-2">Full Audit Trail</p>
            </header>

            <div className="border border-[#1a1c1e]/10 bg-white/50 p-6 font-mono text-xs">
                <div className="flex justify-between border-b border-[#1a1c1e]/10 pb-2 mb-4 text-[#8e9196]">
                    <span>TIMESTAMP</span>
                    <span>ACTION</span>
                    <span>USER</span>
                </div>
                {/* Fallback empty state */}
                <div className="text-center py-12 text-[#8e9196]">
                    No logs available in current period.
                </div>
            </div>
        </div>
    );
}
