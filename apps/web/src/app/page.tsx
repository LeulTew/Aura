'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Image as ImageIcon, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg text-white">
              A
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Aura</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <Link href="/admin/capture" className="hover:text-white transition-colors">For Photographers</Link>
          </div>
          <Link href="/guest/scan">
            <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 rounded-full text-white">
              Find my photos
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Background blobs for depth */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-5xl -z-10 opacity-30 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-600/40 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-purple-600/40 rounded-full blur-[150px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-6">
              <Sparkles className="w-3 h-3" />
              AI-Powered Photo Delivery
            </span>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-[1.05] text-white">
              Your Photos, <br />
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 1 }}
                className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400"
              >
                Instantly delivered.
              </motion.span>
            </h1>
            <p className="mt-8 text-xl md:text-2xl text-white/40 max-w-2xl mx-auto font-light leading-relaxed">
              No QR codes. No cables. Just your face and a split second to find every photo you're in.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6"
          >
            <Link href="/guest/scan">
              <Button size="lg" className="h-16 px-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-lg font-semibold transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] active:scale-95">
                Scan my face
              </Button>
            </Link>
            <Link href="/admin/capture">
              <Button size="lg" variant="outline" className="h-16 px-10 border-white/10 bg-white/5 hover:bg-white/10 rounded-full text-white text-lg font-semibold active:scale-95">
                I'm a Photographer
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-32 px-6 border-t border-white/5 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl font-bold tracking-tight">Built for speed.</h2>
            <p className="text-white/40 mt-4 text-lg">Every feature optimized for a seamless event experience.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-yellow-400" />}
              title="No Cable"
              description="Connect your camera via USB. We sync as you shoot. No more card swapping."
            />
            <FeatureCard 
              icon={<Camera className="w-6 h-6 text-blue-400" />}
              title="Remote Capture"
              description="Trigger your shutter from your browser. Perfect for tethered sessions."
            />
            <FeatureCard 
              icon={<ImageIcon className="w-6 h-6 text-green-400" />}
              title="AI Matching"
              description="State-of-the-art face recognition ensures users find their photos in milliseconds."
            />
          </div>
        </div>
      </section>

      <footer className="py-16 border-t border-white/5 text-center text-white/20 text-sm">
        <div className="flex justify-center gap-8 mb-8 text-white/40">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
        &copy; 2026 Aura Pro. All rights reserved.
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="p-10 border-white/5 bg-white/[0.02] backdrop-blur-sm rounded-[2rem] hover:bg-white/[0.04] transition-all group overflow-hidden relative">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4 text-white">{title}</h3>
      <p className="text-white/40 leading-relaxed text-base">
        {description}
      </p>
      {/* Subtle border shine effect */}
      <div className="absolute inset-0 border border-white/5 rounded-[2rem] pointer-events-none" />
    </Card>
  );
}
