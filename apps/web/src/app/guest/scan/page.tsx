'use client';

import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STEPS = [
  { id: 'idle', label: 'Face ID' },
  { id: 'capturing', label: 'Analyzing Face...' },
  { id: 'matching', label: 'Searching Database...' },
  { id: 'found', label: 'Processing Matches...' },
  { id: 'success', label: 'Found You!' }
];

export default function FaceScanPage() {
  const [step, setStep] = useState('idle');
  const [matchCount, setMatchCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const router = useRouter();

  const handleCapture = useCallback(async () => {
    if (!webcamRef.current) return;
    
    setStep('capturing');
    setError(null);

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setError("Could not capture image from webcam.");
      setStep('idle');
      return;
    }

    try {
      const blob = await fetch(imageSrc).then(r => r.blob());
      const formData = new FormData();
      formData.append('file', blob, 'face.jpg');

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      
      // Dramatic pause for "Analysis"
      await new Promise(r => setTimeout(r, 800));
      
      const loginRes = await fetch(`${backendUrl}/api/auth/face-login`, {
        method: 'POST',
        body: formData
      });

      if (!loginRes.ok) throw new Error('Face login failed. Try again.');
      
      const loginData = await loginRes.json();
      const { user_id } = loginData;

      // 2. Trigger Matching (Phase 3 Endpoint)
      setStep('matching');
      await new Promise(r => setTimeout(r, 1200)); 
      
      const matchRes = await fetch(`${backendUrl}/api/match/mine?user_id=${user_id}`, {
        method: 'POST'
      });

      if (!matchRes.ok) throw new Error('Matching failed.');
      
      const matchData = await matchRes.json();
      setMatchCount(matchData.count || 0);
      
      setStep('found');
      await new Promise(r => setTimeout(r, 1000));
      
      setStep('success');
      
      // Redirect after success
      setTimeout(() => {
        router.push(`/gallery/${user_id}`);
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setStep('idle');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Access your Gallery</h1>
          <p className="text-white/40 font-light">Secure face-match login</p>
        </div>

        <Card className="relative aspect-[3/4] overflow-hidden bg-white/5 border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border">
          {/* Webcam Container */}
          <div className="absolute inset-0 z-0">
             {step === 'idle' ? (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user", width: 720, height: 960 }}
                  className="w-full h-full object-cover grayscale opacity-60"
                />
             ) : (
                <div className="w-full h-full bg-black/40 backdrop-blur-3xl flex items-center justify-center">
                    <div className="relative">
                         <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-48 h-48 rounded-full border border-indigo-500/30 bg-indigo-500/5"
                         />
                         <div className="absolute inset-0 flex items-center justify-center">
                            {step === 'success' ? (
                                <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                                    <CheckCircle2 className="w-16 h-16 text-green-400" />
                                </motion.div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                     <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                                     <AnimatePresence mode="wait">
                                        <motion.span
                                            key={step}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="text-xs font-bold tracking-widest uppercase text-indigo-300"
                                        >
                                            {STEPS.find(s => s.id === step)?.label}
                                        </motion.span>
                                     </AnimatePresence>
                                </div>
                            )}
                         </div>
                    </div>
                </div>
             )}
          </div>

          {/* Glowing Overlay Ring */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
             <svg className="w-[85%] h-[85%]" viewBox="0 0 100 100">
                <circle 
                    cx="50" cy="50" r="48" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="0.2" 
                    strokeDasharray="1 3"
                    className="text-white/10"
                />
                <motion.circle 
                    cx="50" cy="50" r="48" 
                    fill="none" 
                    stroke="url(#scanGradient)" 
                    strokeWidth="1.5"
                    strokeDasharray="20 80"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                />
                <defs>
                    <linearGradient id="scanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                </defs>
             </svg>
          </div>

          {/* Success Content */}
          {step === 'success' && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-green-500/10 backdrop-blur-md z-20 flex flex-col items-center justify-center text-center p-8"
            >
                <motion.h3 
                    initial={{ y: 20 }} animate={{ y: 0 }}
                    className="text-3xl font-extrabold text-white"
                >
                    Found {matchCount} Photos
                </motion.h3>
                <p className="text-white/60 text-lg mt-3 font-light">Opening your private gallery...</p>
            </motion.div>
          )}

          {/* Idle Controls */}
          {step === 'idle' && (
            <div className="absolute bottom-10 inset-x-0 flex justify-center z-20 px-10">
               <Button 
                onClick={handleCapture}
                className="w-full h-16 text-xl font-extrabold bg-white text-black hover:bg-white/90 rounded-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4"
               >
                 <Sparkles className="w-6 h-6" />
                 Scan my face
               </Button>
            </div>
          )}
        </Card>

        {error && (
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/5 border border-red-500/20 rounded-3xl p-5 flex items-center gap-4 text-red-400 text-sm"
            >
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-5 h-5" />
                </div>
                <p className="font-medium">{error}</p>
            </motion.div>
        )}

        <div className="text-center">
            <Link href="/" className="text-white/30 hover:text-white/60 text-sm font-medium transition-colors">
                Cancel and return home
            </Link>
        </div>
      </div>
    </div>
  );
}
