/* eslint-disable */
'use client';

import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Share, ExternalLink, Activity, ArrowLeft, Camera } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import VoidBackground from '@/components/VoidBackground';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CameraConnect = dynamic(() => import('../../../components/CameraConnect'), { ssr: false });
const PhotoGallery = dynamic(() => import('../../../components/PhotoGallery'), { ssr: false });

export default function CapturePage() {
  const [eventUrl, setEventUrl] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEventUrl(`${window.location.origin}/scan`);
    }
  }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans bg-[#050505]">
      <VoidBackground />
      
      {/* 2026 Header Style */}
      <nav className="fixed top-0 w-full p-8 flex justify-between items-center z-[200]">
          <div className="flex items-center gap-2">
              <Link href="/" className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Camera className="w-5 h-5 text-white" />
              </Link>
              <div className="flex flex-col">
                  <span className="font-heading font-semibold tracking-[4px] uppercase text-[10px] text-white">Aura Pro</span>
                  <span className="text-[8px] font-mono text-white/30 tracking-widest uppercase">Admin Station</span>
              </div>
          </div>
          <div className="flex items-center gap-8">
            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-mono border border-blue-500/20 uppercase tracking-widest">
                <Activity className="w-3 h-3 animate-pulse" />
                Live Sync
            </span>
            <div className="relative">
                <div className="w-5 h-0.5 bg-[var(--accent)]" />
                <div className="w-3 h-0.5 bg-[var(--accent)] absolute top-1.5 right-0" />
            </div>
          </div>
      </nav>

      <main className="relative z-10 pt-32 px-6 md:px-20 max-w-7xl mx-auto pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 px-4">
          <div>
            <h1 className="text-6xl font-extralight tracking-tight text-white mb-2 animate-reveal">
              Capture <span className="text-[var(--accent)] block font-normal">Station</span>
            </h1>
            <p className="text-white/20 font-mono text-[11px] uppercase tracking-[0.3em]">Monitoring connected devices</p>
          </div>
          
          <div className="flex items-center gap-6">
            <Dialog>
              <DialogTrigger asChild>
                <button className="h-14 px-8 border border-white/10 bg-white/5 hover:bg-white/10 flex items-center gap-3 text-white font-mono text-xs uppercase tracking-widest transition-all active:scale-95">
                  <QrCode className="w-4 h-4 text-[var(--accent)]" />
                  QR Code
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[var(--bg)] border-white/10 rounded-none p-12 max-w-sm text-center border shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-light text-white uppercase tracking-widest">Event Access</DialogTitle>
                  <DialogDescription className="text-white/20 font-mono text-xs mt-4 leading-relaxed">
                    GUESTS SCAN THIS TO JOIN THE GRID.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-8 bg-white/95 mt-8 border border-white/20">
                  <QRCodeSVG value={eventUrl} size={180} />
                </div>
                <div className="mt-10 flex flex-col gap-4">
                   <button 
                     className="w-full h-14 bg-[var(--accent)] text-black font-mono text-[11px] font-bold uppercase tracking-[0.2em] hover:opacity-90 active:scale-95 transition-all"
                     onClick={() => window.open(eventUrl, '_blank')}
                   >
                     Preview Terminal
                   </button>
                   <button 
                     className="w-full h-14 border border-white/10 text-white/40 hover:text-white hover:bg-white/5 font-mono text-[10px] uppercase tracking-widest transition-all"
                     onClick={() => {
                       if (navigator.share) {
                         navigator.share({ title: 'Aura Event', url: eventUrl });
                       } else {
                         navigator.clipboard.writeText(eventUrl);
                         alert('Terminal link copied.');
                       }
                     }}
                   >
                     Distribute Link
                   </button>
                </div>
              </DialogContent>
            </Dialog>
            
            <CameraConnect />
          </div>
        </header>

        <section className="px-4">
          <PhotoGallery />
        </section>
      </main>

      <footer className="fixed bottom-10 left-10 z-50">
         <p className="font-mono text-[9px] text-white/20 uppercase tracking-[0.4em]">Engine: Precision Core v1</p>
      </footer>
    </div>
  );
}
