/* eslint-disable */
"use client";

import { useState } from "react";
import { Camera, ArrowRight, Loader2, AlertCircle, Shield } from "lucide-react";

export default function LandingPage() {
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    // Exact theme tokens from user's innovative example
    const accentColor = '#FF4D00'; // Pure High-Contrast Orange
    const fontDisplay = "font-sans font-[900] uppercase leading-[0.8] tracking-[-0.05em]";
    const fontMono = "font-mono text-[11px] uppercase tracking-[0.25em] font-bold";
    const container = "max-w-[1100px] mx-auto w-full px-8";
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const res = await fetch(`${backendUrl}/api/admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin })
            });
            const data = await res.json();
            
            if (data.success) {
                sessionStorage.setItem("admin_token", data.token);
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    window.location.href = "/admin";
                }
            } else {
                setError("ACCESS DENIED: INVALID CREDENTIALS");
            }
        } catch (err) {
            setError("SYSTEM ERROR: UNABLE TO REACH AUTH CORE");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white antialiased selection:bg-[#FF4D00] selection:text-white">
            
            {/* TOP BAR / LOGO */}
            <header className="border-b-[3px] border-white py-6">
                <div className={container + " flex justify-between items-center"}>
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white flex items-center justify-center">
                            <Camera className="w-6 h-6 text-black" />
                         </div>
                         <span className={fontMono}>Aura Neural Studio</span>
                    </div>
                    <div className={fontMono} style={{ color: accentColor }}>V2.0.4 PRO</div>
                </div>
            </header>

            {/* HERO SECTION - PURE BOLD DESIGN */}
            <section className="py-24 border-b-[3px] border-white">
                <div className={container}>
                    <div className={fontMono} style={{ color: accentColor }}>Unified Studio Environment</div>
                    <h1 className={`${fontDisplay} text-[clamp(4rem,20vw,14rem)] mt-8 mb-4`}>
                        AURA<br />PRO.
                    </h1>
                    <div className="flex flex-col md:flex-row justify-between items-end gap-12 mt-12">
                        <h2 className={`${fontDisplay} text-[clamp(2rem,6vw,4rem)] text-white/40 max-w-2xl leading-none`}>
                            DISTRIBUTED<br />INTELLIGENCE.
                        </h2>
                        <div className="text-right">
                            <div className={fontMono}>System Status</div>
                            <div className="text-2xl font-black text-green-500 uppercase">Operating</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* LOGIN SECTION - HIGH CONTRAST SLAB */}
            <section className="bg-white text-black py-32">
                <div className={container}>
                    <div className="max-w-[800px] mb-20">
                        <span className={fontMono} style={{ color: accentColor }}>Security Gate</span>
                        <h3 className={`${fontDisplay} text-6xl md:text-8xl mt-6 mb-10`}>AUTHENTICATE.</h3>
                        <p className="text-2xl font-serif leading-[1.4] text-black/80">
                            The platform core is restricted to authorized personnel. 
                            Studio owners, photographers, and platform supervisors must provide valid access credentials 
                            to initiate an encrypted session.
                        </p>
                    </div>

                    {/* LOGIN FORM BOX - NO SHADOWS, NO BLUR */}
                    <div className="max-w-xl">
                        <form onSubmit={handleLogin} className="border-[4px] border-black p-1">
                            <div className="bg-white p-10 border-[1px] border-black/10">
                                <label className={`${fontMono} text-black mb-6 block`}>Enter Authorization PIN</label>
                                <input 
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="••••"
                                    className="w-full text-7xl font-[900] tracking-[0.25em] border-none outline-none focus:ring-0 placeholder:text-black/5 bg-transparent mb-12"
                                    autoFocus
                                    required
                                />

                                {error && (
                                    <div className="p-5 bg-black text-white flex items-center gap-4 mb-8">
                                        <AlertCircle className="w-6 h-6 shrink-0" style={{ color: accentColor }} />
                                        <span className={fontMono} style={{ color: '#fff' }}>{error}</span>
                                    </div>
                                )}

                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-24 bg-black text-white flex items-center justify-center gap-6 group hover:bg-[#FF4D00] transition-colors active:scale-[0.99] duration-100"
                                >
                                    {loading ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        <>
                                            <span className={`${fontMono} text-lg font-black`}>Open Secure Link</span>
                                            <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                        
                        <div className="mt-10 flex items-center gap-4 text-black/40">
                            <Shield className="w-5 h-5" />
                            <p className={fontMono}>Encrypted Pipeline: AES-256 + Distributed RLS</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER SPECS */}
            <footer className="py-20 border-t-[3px] border-white">
                <div className={container + " flex flex-col md:flex-row justify-between items-center gap-12"}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 w-full md:w-auto">
                        <div>
                            <div className={fontMono} style={{ color: accentColor }}>Region</div>
                            <div className="text-xl font-black uppercase">Ethiopia</div>
                        </div>
                        <div>
                            <div className={fontMono} style={{ color: accentColor }}>Sync</div>
                            <div className="text-xl font-black uppercase">Throttled</div>
                        </div>
                        <div>
                            <div className={fontMono} style={{ color: accentColor }}>Auth</div>
                            <div className="text-xl font-black uppercase">Role-Base</div>
                        </div>
                        <div>
                            <div className={fontMono} style={{ color: accentColor }}>Model</div>
                            <div className="text-xl font-black uppercase">Insight-26</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={fontMono}>© 2026 Aura Intelligent Systems</div>
                        <div className="text-white/20 text-[10px] mt-2 font-mono uppercase tracking-widest">Distributed Ledger Verified</div>
                    </div>
                </div>
            </footer>

            <style jsx global>{`
                @font-face {
                    font-family: 'AuraMono';
                    src: url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap');
                }
            `}</style>
        </main>
    );
}
