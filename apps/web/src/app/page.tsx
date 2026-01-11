/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import Link from 'next/link';
import { LayoutGrid, Camera, Cpu, ArrowRight, ShieldCheck, Globe } from "lucide-react";
import VoidBackground from "@/components/VoidBackground";

export default function LandingPage() {
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    if (!isHydrated) return null;

    return (
        <main className="relative min-h-screen bg-[#050505] text-white overflow-x-hidden font-sans">
            <VoidBackground />
            
            {/* Header / Nav */}
            <nav className="fixed top-0 w-full z-[200] px-10 py-8 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Camera className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-heading font-semibold tracking-[4px] uppercase text-sm">Aura</span>
                </div>
                <div className="flex items-center gap-10">
                    <Link href="/admin" className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
                        Terminal
                    </Link>
                    <Link href="/admin/capture" className="px-5 py-2 rounded-full border border-white/10 bg-white/5 text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-white/10 transition-all">
                        Photographer Console
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 px-10 max-w-7xl mx-auto z-10 flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/10 bg-blue-500/5 text-blue-400 text-[9px] font-mono uppercase tracking-[0.2em] mb-8">
                    <Cpu className="w-3 h-3" />
                    Production Ready 2026
                </div>
                
                <h1 className="text-6xl md:text-8xl font-light tracking-tight text-center mb-10 leading-[1.1]">
                    The Soul of <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] via-indigo-400 to-blue-600 font-normal italic">
                        Neural Photography
                    </span>
                </h1>

                <p className="max-w-xl text-center text-white/40 text-sm md:text-base leading-relaxed mb-16 font-light">
                    A multi-tenant intelligent ecosystem bridging the gap between professional optics and instant neural delivery. 
                    Built for the modern studio.
                </p>

                <div className="flex flex-col md:flex-row gap-6">
                    <Link 
                        href="/admin" 
                        className="group relative px-10 py-5 bg-white text-black rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-white/5"
                    >
                        <div className="relative z-10 flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-widest">
                            Manager Console <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                    <Link 
                        href="/scan" 
                        className="px-10 py-5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-white/60 hover:text-white"
                    >
                        Neural Instance Demo
                    </Link>
                </div>

                {/* Spatial Mockup Image */}
                <div className="mt-24 relative w-full max-w-5xl group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="relative border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl bg-[#0a0a0a]">
                        <img 
                            src="/aura_pro_hero_2026_1768164016208.png" 
                            alt="Aura Pro Interface" 
                            className="w-full h-auto transform group-hover:scale-[1.01] transition-transform duration-1000"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent" />
                    </div>
                </div>
            </section>

            {/* Bento Grid Features */}
            <section className="py-32 px-10 max-w-7xl mx-auto z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Feature 1 */}
                    <div className="md:col-span-8 p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col justify-between group hover:border-[var(--accent)]/30 transition-all">
                        <LayoutGrid className="w-10 h-10 text-[var(--accent)] mb-20" />
                        <div>
                            <h3 className="text-2xl font-light mb-4 uppercase tracking-wider">Multi-Tenant HUD</h3>
                            <p className="text-white/30 text-sm leading-relaxed max-w-md">
                                Manage multiple studios, photographers, and events from a single spatial command center. 
                                Rule Level Security (RLS) ensures total data isolation.
                            </p>
                        </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="md:col-span-4 p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col justify-between group hover:border-indigo-500/30 transition-all">
                        <Cpu className="w-10 h-10 text-indigo-400 mb-20" />
                        <div>
                            <h3 className="text-2xl font-light mb-4 uppercase tracking-wider">Neural Core</h3>
                            <p className="text-white/30 text-sm leading-relaxed">
                                Real-time face vectorization and similarity matching in &lt; 200ms.
                            </p>
                        </div>
                    </div>

                    {/* Feature 3 */}
                    <div className="md:col-span-4 p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col justify-between group hover:border-blue-400/30 transition-all">
                        <Globe className="w-10 h-10 text-blue-400 mb-20" />
                        <div>
                            <h3 className="text-2xl font-light mb-4 uppercase tracking-wider">Cloud Ingest</h3>
                            <p className="text-white/30 text-sm leading-relaxed">
                                Direct-to-storage piping with WebUSB and studio card-reader support.
                            </p>
                        </div>
                    </div>

                    {/* Feature 4 */}
                    <div className="md:col-span-8 p-10 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 flex flex-col justify-between group hover:border-indigo-400/30 transition-all">
                        <ShieldCheck className="w-10 h-10 text-indigo-400 mb-20" />
                        <div>
                            <h3 className="text-2xl font-light mb-4 uppercase tracking-wider">Privacy First</h3>
                            <p className="text-white/30 text-sm leading-relaxed max-w-md">
                                Intelligent matching ensures guests only see photos containing their own likeness. 
                                Secure, transient, and private by default.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-10 border-t border-white/5 text-center">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center">
                        <Camera className="w-3.5 h-3.5 text-white/50" />
                    </div>
                    <span className="font-heading font-semibold tracking-[4px] uppercase text-[10px] text-white/50">Aura Pro</span>
                </div>
                <p className="text-white/10 text-[9px] font-mono uppercase tracking-widest">
                    &copy; 2026 Aura Intelligent Systems. All Rights Reserved.
                </p>
            </footer>
        </main>
    );
}
