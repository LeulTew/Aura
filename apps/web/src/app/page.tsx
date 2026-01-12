/* eslint-disable */
"use client";

import { useState } from "react";
import Link from 'next/link';
import { Camera, ArrowRight, Scan, Users, Zap, Shield, Folder, Download } from "lucide-react";

export default function LandingPage() {
    const [showDemo, setShowDemo] = useState(false);
    
    // Design tokens - Editorial style
    const accentColor = '#3B82F6'; // Professional blue
    const fontDisplay = "font-sans font-black uppercase leading-[0.9] tracking-[-0.03em]";
    const fontBody = "font-sans text-lg leading-[1.6]";
    const fontMono = "font-mono text-xs uppercase tracking-[0.15em] font-medium";
    const container = "max-w-[1100px] mx-auto w-full";
    const slab = "py-20 px-8 border-b-[3px] border-black";
    
    return (
        <div className="w-full bg-white text-black antialiased">
            {/* HEADER */}
            <header className="fixed top-0 w-full z-50 bg-white border-b-[3px] border-black">
                <div className={`${container} flex justify-between items-center py-4 px-8`}>
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black flex items-center justify-center">
                            <Camera className="w-5 h-5 text-white" />
                        </div>
                        <span className={`${fontMono} text-sm`}>Aura Pro</span>
                    </Link>
                    <nav className="flex items-center gap-8">
                        <Link href="/scan" className={`${fontMono} text-black/50 hover:text-black transition-colors`}>
                            Guest Scan
                        </Link>
                        <Link href="/admin" className="bg-black text-white px-6 py-3 hover:bg-[#3B82F6] transition-colors">
                            <span className={fontMono}>Studio Login</span>
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="pt-[72px]">
                {/* HERO SECTION */}
                <section className="bg-black text-white py-32 px-8 border-b-[3px] border-white">
                    <div className={container}>
                        <div className={fontMono} style={{ color: accentColor }}>Professional Photo Studio Platform</div>
                        <h1 className={`${fontDisplay} text-[clamp(3rem,12vw,8rem)] mt-6 mb-4`}>
                            FIND YOUR<br />PHOTOS.
                        </h1>
                        <h2 className={`${fontDisplay} text-[clamp(1.2rem,4vw,2.5rem)] text-white/60 mb-12`}>
                            Instant face-powered delivery for events.
                        </h2>
                        
                        <div className="flex flex-col sm:flex-row gap-4 mb-16">
                            <Link 
                                href="/scan"
                                className="bg-white text-black px-10 py-5 flex items-center justify-center gap-3 hover:bg-[#3B82F6] hover:text-white transition-colors group"
                            >
                                <Scan className="w-5 h-5" />
                                <span className={fontMono}>Scan Your Face</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link 
                                href="/admin"
                                className="border-[3px] border-white text-white px-10 py-5 flex items-center justify-center gap-3 hover:bg-white hover:text-black transition-colors"
                            >
                                <span className={fontMono}>I'm a Photographer</span>
                            </Link>
                        </div>

                        {/* Stats bar */}
                        <div className="border-t border-white/20 pt-6 flex flex-wrap gap-12">
                            <div>
                                <div className={`${fontDisplay} text-4xl`}>{"<"}200ms</div>
                                <div className={`${fontMono} text-white/50 mt-1`}>Face Match Speed</div>
                            </div>
                            <div>
                                <div className={`${fontDisplay} text-4xl`}>100K+</div>
                                <div className={`${fontMono} text-white/50 mt-1`}>Photos Indexed</div>
                            </div>
                            <div>
                                <div className={`${fontDisplay} text-4xl`}>99.9%</div>
                                <div className={`${fontMono} text-white/50 mt-1`}>Recognition Accuracy</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS */}
                <section className={`${slab} bg-white`}>
                    <div className={container}>
                        <span className={fontMono} style={{ color: accentColor }}>For Event Guests</span>
                        <h2 className={`${fontDisplay} text-[clamp(2rem,6vw,4rem)] my-6`}>Find yourself in seconds.</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-[3px] bg-black mt-12">
                            <div className="bg-white p-10">
                                <div className="w-16 h-16 bg-black text-white flex items-center justify-center text-2xl font-black mb-6">01</div>
                                <h3 className={`${fontDisplay} text-2xl mb-4`}>SCAN</h3>
                                <p className={fontBody}>Open the camera on your phone and take a quick selfie. No app download required.</p>
                            </div>
                            <div className="bg-white p-10">
                                <div className="w-16 h-16 bg-black text-white flex items-center justify-center text-2xl font-black mb-6">02</div>
                                <h3 className={`${fontDisplay} text-2xl mb-4`}>MATCH</h3>
                                <p className={fontBody}>Our AI instantly finds every photo you appear in from the entire event gallery.</p>
                            </div>
                            <div className="bg-white p-10">
                                <div className="w-16 h-16 bg-black text-white flex items-center justify-center text-2xl font-black mb-6">03</div>
                                <h3 className={`${fontDisplay} text-2xl mb-4`}>DOWNLOAD</h3>
                                <p className={fontBody}>View, select, and download your photos as a zip file. Done in under 60 seconds.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FOR PHOTOGRAPHERS - Split Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2">
                    <div className="bg-black text-white p-12 md:p-20 border-b-[3px] border-r-0 md:border-r-[3px] border-white">
                        <span className={fontMono} style={{ color: accentColor }}>For Studios</span>
                        <h2 className={`${fontDisplay} text-[clamp(2rem,5vw,3.5rem)] my-6`}>Bulk ingest. Zero friction.</h2>
                        <p className={`${fontBody} text-white/70 mb-8`}>
                            Upload thousands of photos at once. Our AI processes faces in the background while you focus on your next shoot.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-4">
                                <Folder className="w-6 h-6" style={{ color: accentColor }} />
                                <span className={fontMono}>Recursive folder upload</span>
                            </li>
                            <li className="flex items-center gap-4">
                                <Zap className="w-6 h-6" style={{ color: accentColor }} />
                                <span className={fontMono}>Parallel processing</span>
                            </li>
                            <li className="flex items-center gap-4">
                                <Users className="w-6 h-6" style={{ color: accentColor }} />
                                <span className={fontMono}>Multi-tenant isolation</span>
                            </li>
                        </ul>
                    </div>
                    <div className="bg-[#F5F5F5] p-12 md:p-20 border-b-[3px] border-black">
                        <span className={fontMono} style={{ color: accentColor }}>Revenue</span>
                        <h2 className={`${fontDisplay} text-[clamp(2rem,5vw,3.5rem)] my-6`}>Monetize your work.</h2>
                        <p className={`${fontBody} text-black/70 mb-8`}>
                            Create shareable bundles with unique download links. Integrate with Stripe for direct payments. Your photos, your rules.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-4">
                                <Download className="w-6 h-6" style={{ color: accentColor }} />
                                <span className={fontMono}>Bundle creation</span>
                            </li>
                            <li className="flex items-center gap-4">
                                <Shield className="w-6 h-6" style={{ color: accentColor }} />
                                <span className={fontMono}>Watermark protection</span>
                            </li>
                            <li className="flex items-center gap-4">
                                <span className="w-6 h-6 flex items-center justify-center font-black" style={{ color: accentColor }}>$</span>
                                <span className={fontMono}>Stripe integration</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* TECH SPECS */}
                <section className={`${slab} bg-white`}>
                    <div className={container}>
                        <span className={fontMono}>The Stack</span>
                        <h2 className={`${fontDisplay} text-[clamp(2rem,5vw,3rem)] my-6`}>Built for scale.</h2>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-[3px] bg-black mt-8">
                            {[
                                { label: "Frontend", value: "Next.js 15" },
                                { label: "Backend", value: "FastAPI" },
                                { label: "Database", value: "Supabase" },
                                { label: "ML", value: "InsightFace" },
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-6 text-center">
                                    <div className={`${fontMono} text-black/40 mb-2`}>{item.label}</div>
                                    <div className={`${fontDisplay} text-xl`}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-32 px-8 text-center" style={{ backgroundColor: accentColor }}>
                    <div className={container}>
                        <span className={`${fontMono} text-white/80`}>Get Started</span>
                        <h2 className={`${fontDisplay} text-[clamp(2.5rem,8vw,5rem)] text-white mt-4 mb-8`}>
                            READY TO<br />TRANSFORM?
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link 
                                href="/admin"
                                className="bg-white text-black px-12 py-6 hover:bg-black hover:text-white transition-colors inline-flex items-center justify-center gap-3"
                            >
                                <span className={fontMono}>Launch Studio Portal</span>
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link 
                                href="/scan"
                                className="border-[3px] border-white text-white px-12 py-6 hover:bg-white hover:text-black transition-colors inline-flex items-center justify-center"
                            >
                                <span className={fontMono}>Try Guest Demo</span>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* FOOTER */}
            <footer className="bg-black text-white py-16 px-8">
                <div className={`${container} flex flex-col md:flex-row justify-between items-center gap-8`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white flex items-center justify-center">
                            <Camera className="w-5 h-5 text-black" />
                        </div>
                        <span className={fontMono}>Aura Pro</span>
                    </div>
                    <div className={`${fontMono} text-white/40`}>
                        © 2026 Aura Intelligent Systems. Ethiopia.
                    </div>
                </div>
            </footer>
        </div>
    );
}
