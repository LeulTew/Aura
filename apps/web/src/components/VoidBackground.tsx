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

      {/* Crystal shards */}
      <div ref={shard1Ref} className="shard shard-1 transition-transform duration-500" />
      <div ref={shard2Ref} className="shard shard-2 transition-transform duration-500" />
    </>
  );
}
