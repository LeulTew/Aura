"use client";

import { useEffect, useRef } from "react";

export default function VoidBackground() {
  const auraRef = useRef<HTMLDivElement>(null);
  const shard1Ref = useRef<HTMLDivElement>(null);
  const shard2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;

      // Parallax shards
      if (shard1Ref.current) {
        shard1Ref.current.style.transform = `translate(${x * 20}px, ${y * 20}px) rotate(15deg)`;
      }
      if (shard2Ref.current) {
        shard2Ref.current.style.transform = `translate(${x * 40}px, ${y * 40}px) rotate(-10deg)`;
      }

      // Aura follows mouse
      if (auraRef.current) {
        auraRef.current.style.transform = `translate(${x * -30}px, ${y * -30}px)`;
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      {/* Noise texture overlay */}
      <svg className="void-texture" aria-hidden="true">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      {/* Ambient glow */}
      <div ref={auraRef} className="aura-bg animate-pulse-void" />

      {/* Glass elements */}
      <div ref={shard1Ref} className="shard shard-glass transition-transform duration-500" style={{ transform: 'rotate(15deg)', opacity: 0.1 }} />
      <div ref={shard2Ref} className="shard shard-glass transition-transform duration-500" style={{ transform: 'rotate(-10deg)', opacity: 0.05, top: '20%', left: '70%', width: '30vw', height: '60vh' }} />

      {/* Cinematic lens flare */}
      <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen z-0">
        <img 
           src="/lens_flare_overlay_premium_1768033818263.png" 
           alt="" 
           className="w-full h-full object-cover"
        />
      </div>
    </>
  );
}
