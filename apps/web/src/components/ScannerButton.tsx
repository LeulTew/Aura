"use client";

import { useRef } from "react";

interface ScannerButtonProps {
  onClick?: () => void;
}

export default function ScannerButton({ onClick }: ScannerButtonProps) {
  const iconRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    // Flash effect
    if (iconRef.current) {
      iconRef.current.style.background = "#ffffff";
      iconRef.current.style.boxShadow = "0 0 40px #ffffff";
      
      setTimeout(() => {
        if (iconRef.current) {
          iconRef.current.style.background = "var(--accent)";
          iconRef.current.style.boxShadow = "none";
        }
      }, 1000);
    }
    
    onClick?.();
  };

  return (
    <div className="scanner-container" onClick={handleClick}>
      {/* Orbiting ring */}
      <div className="scanner-orbit animate-rotate" />
      
      {/* Static ring */}
      <div className="scanner-ring" />
      
      {/* Core button */}
      <div className="scanner-core">
        {/* Rotating gradient */}
        <div 
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-rotate-fast"
          style={{
            background: "conic-gradient(from 0deg, transparent, var(--accent), transparent 30%)",
            opacity: 0.4,
          }}
        />
        
        {/* Inner glass */}
        <div className="scanner-inner-glass">
          {/* Scanning line */}
          <div className="scanner-line animate-scan" />
          
          {/* Aperture icon */}
          <div 
            ref={iconRef}
            className="scanner-icon animate-core-pulse transition-all duration-300 flex items-center justify-center p-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full text-white">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2l4 7-6 1h6l-4 7-2-8h6" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
