/* eslint-disable */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, ArrowRight, Camera, ArrowLeft } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Design Tokens (Editorial Dark)
    const accentColor = '#7C3AED';
    const fontDisplay = "font-sans font-black uppercase leading-[0.85] tracking-[-0.04em]";
    const fontMono = "font-mono text-xs uppercase tracking-[0.2em] font-medium";
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const res = await fetch(`${backendUrl}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (data.success) {
                sessionStorage.setItem("admin_token", data.token);
                if (data.user) {
                    sessionStorage.setItem("user", JSON.stringify(data.user));
                }
                window.location.href = data.redirect || "/admin";
            } else {
                setError(data.error || "Invalid credentials");
            }
        } catch (err) {
            setError("Connection failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white antialiased selection:bg-[#7C3AED] selection:text-white flex">
            {/* Left: Form Panel */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 lg:p-16 relative">
                {/* Background Glow */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#7C3AED]/10 blur-[120px] rounded-full" />
                </div>

                {/* Header */}
                <div className="relative z-10">
                    <Link href="/" className="inline-flex items-center gap-3 text-white/40 hover:text-white transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className={fontMono}>Back to Home</span>
                    </Link>
                </div>

                {/* Form */}
                <div className="relative z-10 max-w-md mx-auto w-full">
                    <div className="mb-12">
                        <span className={fontMono} style={{ color: accentColor }}>Access Portal</span>
                        <h1 className={`${fontDisplay} text-5xl mt-4`}>Sign In</h1>
                        <p className="text-white/40 mt-4 font-mono text-sm leading-relaxed">
                            Enter your credentials to access the platform.
                        </p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-8">
                        <div>
                            <label className={`${fontMono} text-white/40 block mb-3`}>
                                Email Address
                            </label>
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@studio.com"
                                className="w-full h-14 px-5 bg-transparent border-[2px] border-white/10 focus:border-[#7C3AED] outline-none transition-all text-white placeholder:text-white/20 font-mono"
                                required
                                autoFocus
                            />
                        </div>
                        
                        <div>
                            <label className={`${fontMono} text-white/40 block mb-3`}>
                                Password
                            </label>
                            <input 
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full h-14 px-5 bg-transparent border-[2px] border-white/10 focus:border-[#7C3AED] outline-none transition-all text-white placeholder:text-white/20 font-mono"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-4 border-[2px] border-red-500/50 bg-red-500/10 flex items-center gap-4 text-red-400">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span className={fontMono}>{error}</span>
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full h-16 bg-white text-black font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#7C3AED] hover:text-white active:scale-[0.99] transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Authenticate
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                    
                    <p className="mt-12 text-center text-white/20 font-mono text-[10px] uppercase tracking-widest">
                        Access is by invitation only. Contact your administrator.
                    </p>
                </div>

                {/* Footer */}
                <div className="relative z-10">
                    <p className={`${fontMono} text-[10px] text-white/20`}>© 2026 AURA SYSTEMS INC.</p>
                </div>
            </div>

            {/* Right: Branding Panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#050505] flex-col justify-between p-16 border-l border-white/5 relative overflow-hidden">
                {/* Background Asset */}
                <div className="absolute inset-0 opacity-20">
                    <img 
                        src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=2000"
                        alt="Studio"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent" />
                </div>
                
                {/* Logo */}
                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white flex items-center justify-center">
                        <Camera className="w-7 h-7 text-black" />
                    </div>
                    <span className={`${fontDisplay} text-3xl`}>Aura</span>
                </div>

                {/* Tagline */}
                <div className="relative z-10 max-w-lg">
                    <h2 className={`${fontDisplay} text-7xl leading-[0.9]`}>
                        Professional<br />
                        <span className="text-white/20">Intelligence.</span>
                    </h2>
                    <p className="text-white/40 mt-8 font-mono text-sm leading-relaxed max-w-sm">
                        Face recognition, instant search, bundle distribution—all in one platform designed for Ethiopian studios.
                    </p>
                </div>

                {/* Stats */}
                <div className="relative z-10 grid grid-cols-3 gap-8 border-t border-white/5 pt-8">
                    <div>
                        <div className={`${fontDisplay} text-4xl`}>400ms</div>
                        <div className={`${fontMono} text-white/40 mt-2`}>Search Latency</div>
                    </div>
                    <div>
                        <div className={`${fontDisplay} text-4xl`}>500K+</div>
                        <div className={`${fontMono} text-white/40 mt-2`}>Images Indexed</div>
                    </div>
                    <div>
                        <div className={`${fontDisplay} text-4xl`}>99.9%</div>
                        <div className={`${fontMono} text-white/40 mt-2`}>Accuracy</div>
                    </div>
                </div>
            </div>
        </main>
    );
}
