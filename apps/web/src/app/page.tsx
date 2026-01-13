/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
    ArrowRight, Camera, Sparkles, Shield, Zap, 
    Smartphone, Mail
} from "lucide-react";

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Design Tokens
    const accentColor = '#7C3AED';
    const fontDisplay = "font-sans font-black uppercase leading-[0.85] tracking-[-0.04em]";
    const fontMono = "font-mono text-xs uppercase tracking-[0.2em] font-medium";

    return (
        <main className="min-h-screen bg-black text-white antialiased selection:bg-[#7C3AED] selection:text-white">
            {/* Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
                scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/10 py-4' : 'bg-transparent py-8'
            }`}>
                <div className="max-w-[1400px] mx-auto px-8 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white flex items-center justify-center">
                            <Camera className="w-6 h-6 text-black" />
                        </div>
                        <span className={`${fontDisplay} text-2xl`}>Aura</span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-12">
                        {['Features', 'Intelligence', 'For Studios'].map((item) => (
                            <a 
                                key={item} 
                                href={`#${item.toLowerCase().replace(' ', '-')}`} 
                                className={`${fontMono} text-white/40 hover:text-white transition-colors`}
                            >
                                {item}
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-6">
                        <Link 
                            href="/login"
                            className="bg-white text-black px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#7C3AED] hover:text-white transition-all duration-300"
                        >
                            Log In
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col justify-center items-center pt-24 overflow-hidden px-8">
                {/* Visual Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-[#7C3AED]/10 blur-[120px] rounded-full" />
                    <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full" />
                </div>

                <div className="relative z-10 max-w-[1200px] w-full text-center">
                    <div className="inline-flex items-center gap-3 px-4 py-2 border border-white/10 bg-white/5 backdrop-blur-md mb-12">
                        <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                        <span className={fontMono}>The Future of Photography Workflow</span>
                    </div>
                    
                    <h1 className={`${fontDisplay} text-[10vw] md:text-[8vw] mb-8`}>
                        Next Gen<br />
                        <span className="text-white/20 outline-text">Intelligence</span>
                    </h1>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end text-left mt-16">
                        <div>
                            <p className="text-xl md:text-2xl text-white/50 leading-tight max-w-md">
                                Professional grade face recognition and photo distribution for modern studios.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-6 lg:justify-end">
                            <Link 
                                href="/login"
                                className="bg-[#7C3AED] text-white px-12 py-6 text-sm font-bold uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-[0_0_40px_rgba(124,58,237,0.3)] text-center"
                            >
                                Log In
                            </Link>
                            <a 
                                href="#for-studios" 
                                className="border-2 border-white/10 text-white px-12 py-6 text-sm font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all text-center"
                            >
                                Learn More
                            </a>
                        </div>
                    </div>
                </div>

                {/* Aesthetic Hero Asset */}
                <div className="relative mt-24 max-w-[1400px] w-full aspect-video border-[3px] border-white/5 group">
                    <img 
                        src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=2000" 
                        alt="Aura Intelligence"
                        className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    
                    {/* Floating Data Points */}
                    <div className="absolute bottom-12 left-12 p-6 bg-black/80 backdrop-blur-xl border border-white/10 max-w-xs">
                        <div className={fontMono} style={{ color: accentColor }}>System Status</div>
                        <div className="text-lg font-bold mt-2 font-mono">NEURAL INDEX ACTIVE</div>
                        <div className="mt-4 flex gap-2">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1 h-8 bg-[#7C3AED]/40 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features (Grid) */}
            <section id="features" className="py-32 bg-[#050505]">
                <div className="max-w-[1400px] mx-auto px-8">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
                        <div className="max-w-2xl">
                            <span className={fontMono} style={{ color: accentColor }}>Core Capabilities</span>
                            <h2 className={`${fontDisplay} text-6xl mt-4`}>Built for the<br />Elite Studio.</h2>
                        </div>
                        <div className="text-white/40 max-w-xs text-sm font-mono leading-relaxed">
                            AURA COMBINES EDGE COMPUTING WITH CLOUD SCALING TO DELIVER SUB-SECOND RECOGNITION.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[3px] bg-white/5 border border-white/5">
                        <FeatureBlock 
                            icon={<Zap className="w-8 h-8" />}
                            title="Neural Search"
                            desc="Find specific faces across 500k+ images in 400ms. Local-first indexing for zero latency."
                            accent={accentColor}
                            mono={fontMono}
                        />
                        <FeatureBlock 
                            icon={<Smartphone className="w-8 h-8" />}
                            title="Instant Delivery"
                            desc="Auto-generate private galleries for every guest. Distribution via QR or secure magic links."
                            accent={accentColor}
                            mono={fontMono}
                        />
                        <FeatureBlock 
                            icon={<Shield className="w-8 h-8" />}
                            title="Hybrid Vault"
                            desc="Military-grade encryption. Local storage for offline sync and cloud backup for reliability."
                            accent={accentColor}
                            mono={fontMono}
                        />
                    </div>
                </div>
            </section>

            {/* For Studios CTA */}
            <section id="for-studios" className="py-48 px-8 border-t border-white/5 overflow-hidden">
                <div className="max-w-5xl mx-auto text-center relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-[800px] h-[400px] bg-[#7C3AED]/20 blur-[150px] pointer-events-none" />
                    
                    <h2 className={`${fontDisplay} text-[8vw] mb-12`}>Work with<br />Aura.</h2>
                    <p className="text-2xl text-white/40 mb-16 max-w-xl mx-auto font-mono uppercase tracking-widest leading-normal">
                        Platform access is by invitation only.
                    </p>
                    <a 
                        href="mailto:partners@aura.studio"
                        className="inline-flex items-center gap-4 bg-white text-black px-16 py-8 text-lg font-black uppercase tracking-[0.3em] hover:bg-[#7C3AED] hover:text-white transition-all transform hover:-translate-y-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                    >
                        <Mail className="w-6 h-6" />
                        Contact for Access
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-24 border-t border-white/5 bg-black">
                <div className="max-w-[1400px] mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-16">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-4 mb-8 text-white">
                            <div className="w-8 h-8 bg-white flex items-center justify-center">
                                <Camera className="w-5 h-5 text-black" />
                            </div>
                            <span className={`${fontDisplay} text-xl`}>Aura</span>
                        </div>
                        <p className="text-white/30 max-w-xs font-mono text-[10px] leading-relaxed">
                            DESIGNED FOR PHOTOGRAPHERS WHO DEMAND PERFECTION. BUILT IN ETHIOPIA, AVAILABLE GLOBALLY.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 md:col-span-2">
                        <div>
                            <div className={`${fontMono} mb-6 text-white`}>Platform</div>
                            <div className="space-y-4 text-sm text-white/40 font-mono">
                                <Link href="/login" className="block hover:text-white transition-colors">Access Portal</Link>
                                <div className="hover:text-white cursor-pointer transition-colors">Agent Sync</div>
                                <div className="hover:text-white cursor-pointer transition-colors">Cloud API</div>
                            </div>
                        </div>
                        <div>
                            <div className={`${fontMono} mb-6 text-white`}>Company</div>
                            <div className="space-y-4 text-sm text-white/40 font-mono">
                                <div className="hover:text-white cursor-pointer transition-colors">Privacy</div>
                                <div className="hover:text-white cursor-pointer transition-colors">Terms</div>
                                <a href="mailto:partners@aura.studio" className="block hover:text-white transition-colors">Contact</a>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="max-w-[1400px] mx-auto px-8 mt-24 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-white/5 pt-12">
                    <p className={`${fontMono} text-[10px] text-white/20`}>© 2026 AURA SYSTEMS INC.</p>
                    <div className="flex gap-8">
                        <div className="w-5 h-5 border border-white/20 text-white/20 flex items-center justify-center text-[10px] font-mono hover:border-white hover:text-white transition-all cursor-pointer">X</div>
                        <div className="w-5 h-5 border border-white/20 text-white/20 flex items-center justify-center text-[10px] font-mono hover:border-white hover:text-white transition-all cursor-pointer">IG</div>
                    </div>
                </div>
            </footer>

            <style jsx global>{`
                .outline-text {
                    -webkit-text-stroke: 1px rgba(255,255,255,0.2);
                    color: transparent;
                }
                @media (min-width: 768px) {
                    .outline-text {
                        -webkit-text-stroke: 2px rgba(255,255,255,0.2);
                    }
                }
            `}</style>
        </main>
    );
}

function FeatureBlock({ icon, title, desc, accent, mono }: any) {
    return (
        <div className="bg-black p-12 hover:bg-[#111] transition-all duration-500 group border-r border-white/5 last:border-r-0">
            <div className="mb-12 text-white/20 group-hover:text-white transition-colors duration-500 transform group-hover:scale-110 origin-left">
                {icon}
            </div>
            <div className={`${mono} mb-4`} style={{ color: accent }}>01 // Function</div>
            <h3 className="text-3xl font-black uppercase tracking-tight mb-6">{title}</h3>
            <p className="text-white/40 leading-relaxed font-mono uppercase text-[10px] tracking-widest">
                {desc}
            </p>
            <div className="mt-12 h-0.5 w-0 bg-white transition-all duration-700 group-hover:w-full" />
        </div>
    );
}
