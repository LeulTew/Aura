'use client';

import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Share, ExternalLink, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CameraConnect = dynamic(() => import('@/components/CameraConnect'), { ssr: false });
const PhotoGallery = dynamic(() => import('@/components/PhotoGallery'), { ssr: false });

export default function CapturePage() {
  const [eventUrl, setEventUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEventUrl(window.location.origin);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 font-sans">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 pt-8">
        <div>
          <h1 className="text-5xl font-black tracking-tight mb-3 text-white">Capture Station</h1>
          <div className="flex items-center gap-4">
             <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20">
                <Activity className="w-3 h-3" />
                Live Sync Active
             </span>
             <p className="text-white/30 font-medium">Monitoring connected devices</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 flex items-center gap-3 text-white font-bold transition-all active:scale-95">
                <QrCode className="w-5 h-5" />
                Event QR
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f0f0f] border-white/10 rounded-[3rem] p-12 max-w-sm text-center border shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black text-white">Event Access</DialogTitle>
                <DialogDescription className="text-white/40 text-base mt-2">
                  Guests scan this to register and find their photos instantly.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] mt-8 shadow-xl">
                <QRCodeSVG value={eventUrl} size={200} />
              </div>
              <div className="mt-10 flex flex-col gap-4">
                 <Button 
                   className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20"
                   onClick={() => window.open(eventUrl, '_blank')}
                 >
                   Open Landing Page
                   <ExternalLink className="w-4 h-4 ml-2" />
                 </Button>
                 <Button 
                   variant="ghost" 
                   className="w-full h-12 rounded-2xl text-white/30 hover:text-white hover:bg-white/5 font-medium"
                   onClick={() => {
                     if (navigator.share) {
                       navigator.share({ title: 'Aura Event', url: eventUrl });
                     } else {
                       navigator.clipboard.writeText(eventUrl);
                       alert('Link copied to clipboard!');
                     }
                   }}
                 >
                   <Share className="w-4 h-4 mr-3" />
                   Share Event Link
                 </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <CameraConnect />
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <PhotoGallery />
      </main>
    </div>
  );
}
