/* eslint-disable */
"use client";

import { useState } from "react";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";

export default function LandingPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
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
        <main className="min-h-screen bg-white flex">
            {/* Left: Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-black text-white flex-col justify-between p-16">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Aura</h1>
                    <p className="text-white/40 mt-2 text-sm">Photo Management Platform</p>
                </div>
                
                <div className="space-y-8">
                    <div className="max-w-md">
                        <h2 className="text-5xl font-bold leading-tight">
                            Manage your
                            <br />studio photos
                            <br />with ease.
                        </h2>
                    </div>
                    <p className="text-white/60 max-w-sm leading-relaxed">
                        Face recognition, instant search, bundle distribution—all in one platform designed for Ethiopian studios.
                    </p>
                </div>
                
                <div className="text-white/30 text-sm">
                    © 2026 Aura. All rights reserved.
                </div>
            </div>
            
            {/* Right: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-12 text-center">
                        <h1 className="text-3xl font-bold text-black">Aura</h1>
                        <p className="text-black/40 mt-1 text-sm">Photo Management Platform</p>
                    </div>
                    
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold text-black">Sign in</h2>
                        <p className="text-black/50 mt-2">Enter your credentials to access your account.</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-black mb-2">
                                Email
                            </label>
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@studio.com"
                                className="w-full h-12 px-4 border border-black/20 rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-black placeholder:text-black/30"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-black mb-2">
                                Password
                            </label>
                            <input 
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full h-12 px-4 border border-black/20 rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-black placeholder:text-black/30"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-black text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-black/90 active:scale-[0.99] transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                    
                    <p className="mt-8 text-center text-sm text-black/40">
                        Contact your administrator if you don't have an account.
                    </p>
                </div>
            </div>
        </main>
    );
}
