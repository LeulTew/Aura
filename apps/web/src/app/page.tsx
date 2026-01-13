/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Camera, Sparkles, Shield, Zap, Users, ChevronDown } from "lucide-react";

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <main className="min-h-screen bg-white text-black antialiased">
            {/* Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                            <Camera className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-lg">Aura</span>
                    </div>
                    <div className="flex items-center gap-8">
                        <a href="#features" className="text-sm text-black/60 hover:text-black transition-colors hidden sm:block">Features</a>
                        <a href="#how-it-works" className="text-sm text-black/60 hover:text-black transition-colors hidden sm:block">How it works</a>
                        <Link 
                            href="/login"
                            className="h-10 px-5 bg-black text-white text-sm font-medium rounded-full flex items-center gap-2 hover:bg-black/80 transition-colors"
                        >
                            Sign in
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-40" />
                
                <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/5 rounded-full mb-8">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium">AI-Powered Photo Management</span>
                    </div>
                    
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
                        Find any face
                        <br />
                        <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            in seconds.
                        </span>
                    </h1>
                    
                    <p className="text-xl text-black/60 max-w-2xl mx-auto mb-10 leading-relaxed">
                        The all-in-one photo management platform for professional studios. 
                        Face recognition, instant search, and seamless client delivery.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link 
                            href="/login"
                            className="h-14 px-8 bg-black text-white font-semibold rounded-full flex items-center gap-3 hover:bg-black/80 transition-all hover:scale-105 shadow-lg shadow-black/20"
                        >
                            Get Started
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <a 
                            href="#how-it-works"
                            className="h-14 px-8 border-2 border-black/10 text-black font-medium rounded-full flex items-center gap-2 hover:border-black/30 transition-colors"
                        >
                            See how it works
                        </a>
                    </div>
                    
                    {/* Scroll indicator */}
                    <div className="mt-20 animate-bounce">
                        <ChevronDown className="w-6 h-6 text-black/30 mx-auto" />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-gray-50">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need</h2>
                        <p className="text-lg text-black/60 max-w-xl mx-auto">
                            Powerful tools designed for Ethiopian studios and photographers.
                        </p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard 
                            icon={<Zap className="w-6 h-6" />}
                            title="Instant Face Search"
                            description="Find photos of any person across thousands of images in under a second using AI-powered face recognition."
                        />
                        <FeatureCard 
                            icon={<Users className="w-6 h-6" />}
                            title="Multi-Tenant Platform"
                            description="Manage multiple studios from one dashboard. Each organization gets isolated data and customizable access."
                        />
                        <FeatureCard 
                            icon={<Shield className="w-6 h-6" />}
                            title="Offline-First Design"
                            description="Works even with unreliable internet. Queue uploads locally and sync when connected."
                        />
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-24">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">How it works</h2>
                        <p className="text-lg text-black/60 max-w-xl mx-auto">
                            Three simple steps from photo capture to client delivery.
                        </p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-12">
                        <StepCard 
                            step="01"
                            title="Upload Photos"
                            description="Connect your camera directly via USB or upload folders. Photos are indexed automatically with face embeddings."
                        />
                        <StepCard 
                            step="02"
                            title="Search & Bundle"
                            description="Find specific faces instantly. Create shareable bundles with selected photos for each client."
                        />
                        <StepCard 
                            step="03"
                            title="Deliver"
                            description="Share a secure link or QR code. Clients can view and download their photos without an account."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-black text-white">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-6">Ready to transform your workflow?</h2>
                    <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
                        Join studios across Ethiopia already using Aura to manage their photos smarter.
                    </p>
                    <Link 
                        href="/login"
                        className="inline-flex h-14 px-8 bg-white text-black font-semibold rounded-full items-center gap-3 hover:bg-gray-100 transition-all hover:scale-105"
                    >
                        Sign in to your account
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-black/5">
                <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                            <Camera className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-medium">Aura</span>
                    </div>
                    <p className="text-sm text-black/40">
                        © 2026 Aura. Built for Ethiopian studios.
                    </p>
                </div>
            </footer>
        </main>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="p-8 bg-white rounded-2xl border border-black/5 hover:shadow-xl hover:shadow-black/5 transition-all">
            <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center mb-6">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-3">{title}</h3>
            <p className="text-black/60 leading-relaxed">{description}</p>
        </div>
    );
}

function StepCard({ step, title, description }: { step: string; title: string; description: string }) {
    return (
        <div className="text-center">
            <div className="text-6xl font-bold text-black/10 mb-4">{step}</div>
            <h3 className="text-xl font-semibold mb-3">{title}</h3>
            <p className="text-black/60 leading-relaxed">{description}</p>
        </div>
    );
}
