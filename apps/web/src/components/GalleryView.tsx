"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import VoidBackground from "./VoidBackground";

interface SearchMatch {
  id: string;
  source_path: string;
  distance: number;
  created_at: string;
}

interface GalleryViewProps {
  matches: SearchMatch[];
  onBack: () => void;
}

export default function GalleryView({ matches, onBack }: GalleryViewProps) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<SearchMatch | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const viewerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Convert Windows paths to web-accessible paths
  const getImageUrl = (sourcePath: string) => {
    // For now, we'll use a proxy endpoint - this needs backend support
    // The backend stores images with their source_path
    return `/api/image?path=${encodeURIComponent(sourcePath)}`;
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(matches.map(m => m.id)));
  };

  const openViewer = (match: SearchMatch) => {
    if (selectMode) {
      toggleSelect(match.id);
      return;
    }
    setCurrentImage(match);
    setViewerOpen(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setCurrentImage(null);
  };

  // Wheel zoom handler
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(5, Math.max(1, prev * delta)));
  }, []);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      isDragging.current = true;
      lastPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current && scale > 1) {
      setPosition({
        x: e.clientX - lastPos.current.x,
        y: e.clientY - lastPos.current.y
      });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    if (viewerOpen && viewerRef.current) {
      viewerRef.current.addEventListener("wheel", handleWheel, { passive: false });
      return () => viewerRef.current?.removeEventListener("wheel", handleWheel);
    }
  }, [viewerOpen, handleWheel]);

  // Download functionality
  const downloadImage = async (match: SearchMatch) => {
    try {
      const response = await fetch(getImageUrl(match.source_path));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = match.source_path.split("/").pop() || "photo.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const downloadAll = async () => {
    const toDownload = selectMode && selected.size > 0 
      ? matches.filter(m => selected.has(m.id))
      : matches;
    
    for (const match of toDownload) {
      await downloadImage(match);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <VoidBackground />

      {/* Top Bar */}
      <nav className="fixed top-0 left-0 w-full h-20 flex items-center justify-between px-6 md:px-10 bg-[rgba(5,5,5,0.9)] backdrop-blur-xl z-50 border-b border-white/5">
        <button 
          onClick={onBack}
          className="font-mono font-bold text-sm tracking-tight uppercase hover:text-[var(--accent)] transition-colors"
        >
          ← Back
        </button>

        <div className="flex gap-3">
          {!selectMode ? (
            <>
              <button
                onClick={() => setSelectMode(true)}
                className="px-5 py-2.5 border border-white/20 font-mono text-[11px] font-bold uppercase tracking-wide hover:border-[var(--accent)] transition-all"
              >
                Select
              </button>
              <button
                onClick={downloadAll}
                className="px-5 py-2.5 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] font-mono text-[11px] font-bold uppercase tracking-wide hover:opacity-90 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all"
              >
                Download All
              </button>
            </>
          ) : (
            <>
              <button
                onClick={selectAll}
                className="px-5 py-2.5 border border-white/20 font-mono text-[11px] font-bold uppercase tracking-wide hover:border-[var(--accent)] transition-all"
              >
                Select All
              </button>
              <button
                onClick={() => { setSelectMode(false); setSelected(new Set()); }}
                className="px-5 py-2.5 border border-white/20 font-mono text-[11px] font-bold uppercase tracking-wide hover:border-red-400 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={downloadAll}
                disabled={selected.size === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] font-mono text-[11px] font-bold uppercase tracking-wide hover:opacity-90 transition-all disabled:opacity-50"
              >
                Download ({selected.size})
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Results Header */}
      <div className="pt-28 pb-4 px-6 md:px-10 text-center">
        <h1 className="text-3xl md:text-4xl font-semibold mb-2">
          Found <span className="text-[var(--accent)]">{matches.length}</span> Matches
        </h1>
        <p className="text-gray-500 font-mono text-xs">
          {matches.length > 0 && `Best match: ${(100 - matches[0].distance / 10).toFixed(1)}% similarity`}
        </p>
      </div>

      {/* Masonry Grid */}
      <main 
        className={`px-4 md:px-10 pb-10 columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 max-w-[1800px] mx-auto transition-opacity duration-500 ${viewerOpen ? 'opacity-0 pointer-events-none' : ''}`}
      >
        {matches.map((match, index) => (
          <div
            key={match.id}
            onClick={() => openViewer(match)}
            className="relative break-inside-avoid mb-4 bg-[#111] cursor-pointer overflow-hidden group"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Selection checkbox */}
            <div 
              className={`absolute top-3 right-3 w-6 h-6 border-2 border-white bg-black/50 z-10 flex items-center justify-center transition-all ${
                selectMode ? 'opacity-100' : 'opacity-0'
              } ${selected.has(match.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : ''}`}
            >
              {selected.has(match.id) && <span className="text-white text-sm">✓</span>}
            </div>

            {/* Distance badge */}
            <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-sm rounded font-mono text-[10px] text-[var(--accent)] z-10">
              {match.distance < 100 ? "★ Best Match" : `${match.distance.toFixed(0)}`}
            </div>

            {/* Image */}
            <img
              src={getImageUrl(match.source_path)}
              alt="Match"
              loading="lazy"
              className="w-full block transition-all duration-700 group-hover:scale-105 group-hover:saturate-100 saturate-[0.8] contrast-[1.1]"
              onError={(e) => {
                // Fallback for broken images
                (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23111'%3E%3Crect width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' fill='%23333' text-anchor='middle' dy='.3em' font-family='sans-serif'%3EImage Unavailable%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>
        ))}
      </main>

      {/* Fullscreen Viewer */}
      {viewerOpen && currentImage && (
        <div
          ref={viewerRef}
          className="fixed inset-0 bg-[var(--bg)] z-[1000] flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Close button */}
          <button
            onClick={closeViewer}
            className="absolute top-10 right-10 text-white text-3xl font-mono hover:text-[var(--accent)] transition-colors z-[1010]"
          >
            ×
          </button>

          {/* Main image */}
          <img
            src={getImageUrl(currentImage.source_path)}
            alt="Full view"
            className="max-w-full max-h-full object-contain select-none transition-transform duration-100"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: scale > 1 ? "grab" : "default"
            }}
            draggable={false}
          />

          {/* Bottom UI */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-5 items-center z-[1010]">
            <p className="font-mono text-xs text-gray-400">
              {currentImage.source_path.split("/").pop()}
            </p>
            <button
              onClick={() => downloadImage(currentImage)}
              className="px-8 py-3 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] font-mono text-sm font-bold uppercase tracking-wide hover:opacity-90 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all"
            >
              Download
            </button>
          </div>

          {/* Zoom indicator */}
          {scale > 1 && (
            <div className="absolute top-10 left-10 font-mono text-xs text-gray-400">
              {(scale * 100).toFixed(0)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}
