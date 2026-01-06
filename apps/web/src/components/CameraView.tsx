"use client";

import { useRef, useCallback, useState } from "react";
import Webcam from "react-webcam";

interface CameraViewProps {
  onCapture: (imageBlob: Blob) => void;
  onBack: () => void;
  isProcessing?: boolean;
}

export default function CameraView({ onCapture, onBack, isProcessing = false }: CameraViewProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isReady, setIsReady] = useState(false);

  const handleCapture = useCallback(async () => {
    if (!webcamRef.current || isProcessing) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    // Convert base64 to blob
    const res = await fetch(imageSrc);
    const blob = await res.blob();
    onCapture(blob);
  }, [onCapture, isProcessing]);

  return (
    <div className="fixed inset-0 bg-[var(--bg)] flex flex-col overflow-hidden">
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-[100]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Camera feed */}
      <div className="relative flex-1 overflow-hidden">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }}
          onUserMedia={() => setIsReady(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "saturate(0.3) contrast(1.1) brightness(0.7)" }}
          mirrored
        />

        {/* Topography grid */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), 
                              linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(circle at center, black, transparent 80%)"
          }}
        />

        {/* Corner accents */}
        <div className="absolute top-5 left-5 w-4 h-4 border-t-[1.5px] border-l-[1.5px] border-[var(--accent)]" />
        <div className="absolute top-5 right-5 w-4 h-4 border-t-[1.5px] border-r-[1.5px] border-[var(--accent)]" />
        <div className="absolute bottom-5 left-5 w-4 h-4 border-b-[1.5px] border-l-[1.5px] border-[var(--accent)]" />
        <div className="absolute bottom-5 right-5 w-4 h-4 border-b-[1.5px] border-r-[1.5px] border-[var(--accent)]" />

        {/* Face mesh SVG overlay */}
        <svg 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[280px] h-[380px] pointer-events-none"
          style={{ filter: "drop-shadow(0 0 8px var(--accent))" }}
          viewBox="0 0 100 130"
        >
          {/* Stylized geometric face map */}
          <path 
            className="mesh-line"
            d="M50,10 L70,20 L85,45 L85,85 L70,115 L50,125 L30,115 L15,85 L15,45 L30,20 Z" 
            stroke="var(--accent)"
            strokeWidth="0.5"
            fill="none"
            opacity="0.6"
            strokeDasharray="400"
            style={{ animation: "drawMesh 4s cubic-bezier(0.4, 0, 0.2, 1) infinite" }}
          />
          <path 
            className="mesh-line"
            d="M50,30 L65,40 L70,60 L65,85 L50,100 L35,85 L30,60 L35,40 Z" 
            stroke="var(--accent)"
            strokeWidth="0.5"
            fill="none"
            opacity="0.6"
            strokeDasharray="400"
            style={{ animation: "drawMesh 4s cubic-bezier(0.4, 0, 0.2, 1) infinite", animationDelay: "0.5s" }}
          />
          <path 
            className="mesh-line"
            d="M15,45 L30,60 M85,45 L70,60 M15,85 L30,85 M85,85 L70,85" 
            stroke="var(--accent)"
            strokeWidth="0.5"
            fill="none"
            opacity="0.6"
          />
          <circle cx="40" cy="50" r="3" stroke="var(--accent)" strokeWidth="0.5" fill="none" opacity="0.6" />
          <circle cx="60" cy="50" r="3" stroke="var(--accent)" strokeWidth="0.5" fill="none" opacity="0.6" />
          <path d="M42,80 Q50,85 58,80" stroke="var(--accent)" strokeWidth="0.5" fill="none" opacity="0.6" />
        </svg>

        {/* Scanning bar */}
        <div 
          className="absolute left-[10%] w-[80%] h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent z-[15]"
          style={{ 
            boxShadow: "0 0 15px var(--accent)",
            animation: "scanMove 4s ease-in-out infinite" 
          }}
        />

        {/* Instructions */}
        <div className="absolute top-[65%] w-full text-center pointer-events-none">
          <h1 className="text-2xl font-extrabold text-white mb-2 drop-shadow-lg">
            {isProcessing ? "Processing..." : "Align Face"}
          </h1>
        </div>
      </div>

      {/* Bottom controls - frosted glass */}
      <div 
        className="relative mx-5 mb-10 p-6 bg-[rgba(10,12,16,0.7)] backdrop-blur-xl border border-white/15 rounded-[30px] flex justify-between items-center"
        style={{ clipPath: "polygon(0 15px, 15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)" }}
      >
        {/* Back button */}
        <button 
          onClick={onBack}
          className="flex flex-col gap-1 text-left hover:opacity-70 transition-opacity"
        >
          <span className="font-mono text-[10px] text-gray-500 tracking-wide uppercase">Back</span>
          <span className="text-white font-extrabold text-xs">HOME</span>
        </button>

        {/* Capture button */}
        <button 
          onClick={handleCapture}
          disabled={!isReady || isProcessing}
          className="w-16 h-16 bg-white rounded-full flex justify-center items-center relative transition-transform active:scale-90 disabled:opacity-50"
        >
          <div className="absolute -inset-1.5 border-2 border-[var(--accent)] rounded-full opacity-40" />
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#05070a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="#05070a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Status */}
        <div className="flex flex-col gap-1 text-right">
          <span className="font-mono text-[10px] text-gray-500 tracking-wide uppercase">Status</span>
          <span className="text-white font-extrabold text-xs">
            {isReady ? "READY" : "LOADING"}
          </span>
        </div>
      </div>

      {/* CSS Keyframes */}
      <style jsx>{`
        @keyframes drawMesh {
          0% { stroke-dashoffset: 400; opacity: 0; }
          20% { opacity: 0.6; }
          50% { stroke-dashoffset: 0; opacity: 0.8; }
          80% { opacity: 0.6; }
          100% { stroke-dashoffset: -400; opacity: 0; }
        }
        @keyframes scanMove {
          0%, 100% { top: 25%; opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { top: 60%; }
        }
      `}</style>
    </div>
  );
}
