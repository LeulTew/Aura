import { useState, useRef, useEffect, useMemo, useCallback } from "react";

export interface SearchMatch {
  id: string;
  source_path: string;
  distance: number;
  photo_date: string;
  created_at: string;
}

interface GalleryViewProps {
  matches: SearchMatch[];
  onBack: () => void;
  isBundle?: boolean;
}

interface TransitionState {
  isAnimating: boolean;
  startRect: DOMRect | null;
  match: SearchMatch | null;
}

interface GroupedMatches {
  date: string;
  dateLabel: string;
  matches: SearchMatch[];
}

export default function GalleryView({ matches, onBack, isBundle = false }: GalleryViewProps) {
  const [selectMode, setSelectMode] = useState(isBundle);
  const [selected, setSelected] = useState<Set<string>>(new Set(isBundle ? matches.map(m => m.id) : []));
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<SearchMatch | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [transition, setTransition] = useState<TransitionState>({ 
    isAnimating: false, 
    startRect: null, 
    match: null 
  });
  
  // Auto-select all for bundles if matches change
  useEffect(() => {
    if (isBundle && matches.length > 0) {
      setSelectMode(true);
      setSelected(new Set(matches.map(m => m.id)));
    }
  }, [isBundle, matches]);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const imageRefs = useRef<Map<string, HTMLElement>>(new Map());

  const getImageUrl = (sourcePath: string, width?: number) => {
    let url = `/api/image?path=${encodeURIComponent(sourcePath)}`;
    if (width) url += `&w=${width}`;
    return url;
  };

  // Group matches by date, sorted by date (newest first), then by distance within each group
  const groupedMatches = useMemo((): GroupedMatches[] => {
    const groups = new Map<string, SearchMatch[]>();
    
    // Sort all matches by distance first
    const sortedMatches = [...matches].sort((a, b) => a.distance - b.distance);
    
    // Group by actual photo date (from EXIF metadata)
    sortedMatches.forEach(match => {
      const date = match.photo_date || match.created_at.split("T")[0];
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(match);
    });
    
    // Convert to array and sort by date (newest first)
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, dateMatches]) => ({
        date,
        dateLabel: formatDateLabel(date),
        matches: dateMatches // Already sorted by distance
      }));
  }, [matches]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectDate = (groupMatches: SearchMatch[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = groupMatches.every(m => next.has(m.id));
      
      if (allSelected) {
        // Deselect all
        groupMatches.forEach(m => next.delete(m.id));
      } else {
        // Select all
        groupMatches.forEach(m => next.add(m.id));
      }
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(matches.map(m => m.id)));

  const openViewer = (match: SearchMatch, e: React.MouseEvent) => {
    if (selectMode) {
      toggleSelect(match.id);
      return;
    }

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    setTransition({ isAnimating: true, startRect: rect, match });
    setCurrentImage(match);
    
    requestAnimationFrame(() => {
      setViewerOpen(true);
      setTimeout(() => {
        setTransition(prev => ({ ...prev, isAnimating: false }));
      }, 350);
    });
    
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const closeViewer = () => {
    const match = currentImage;
    if (!match) {
      setViewerOpen(false);
      setCurrentImage(null);
      return;
    }

    const el = imageRefs.current.get(match.id);
    const rect = el?.getBoundingClientRect() || null;
    
    setTransition({ isAnimating: true, startRect: rect, match });
    setViewerOpen(false);
    
    setTimeout(() => {
      setTransition({ isAnimating: false, startRect: null, match: null });
      setCurrentImage(null);
    }, 350);
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(5, Math.max(1, prev * delta)));
  }, []);

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

  const handleMouseUp = () => { isDragging.current = false; };

  useEffect(() => {
    if (viewerOpen && viewerRef.current) {
      viewerRef.current.addEventListener("wheel", handleWheel, { passive: false });
      return () => viewerRef.current?.removeEventListener("wheel", handleWheel);
    }
  }, [viewerOpen, handleWheel]);

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

  // Download state
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const downloadAll = async () => {
    const toDownload = selectMode && selected.size > 0 
      ? matches.filter(m => selected.has(m.id))
      : matches;

    // Single file - direct download
    if (toDownload.length === 1) {
      await downloadImage(toDownload[0]);
      return;
    }

    // Initialize progress
    setDownloadProgress({ current: 0, total: toDownload.length });
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
    try {
      // 1. Fetch all blobs concurrently (Faster, preserves User Gesture for iOS Share)
      const fetchPromises = toDownload.map(async (match, idx) => {
        if (signal.aborted) throw new Error("Download cancelled");
        
        let attempts = 0;
        while (attempts < 3) {
           try {
             // Update progress roughly
             const response = await fetch(getImageUrl(match.source_path), { signal });
             if (!response.ok) throw new Error(`HTTP ${response.status}`);
             const blob = await response.blob();
             return { blob, match };
           } catch (err: any) {
             if (signal.aborted || err.name === 'AbortError') throw err;
             attempts++;
             if (attempts === 3) throw err;
             await new Promise(r => setTimeout(r, 500)); 
           }
        }
        throw new Error("Failed to fetch");
      });

      // Wait for all
      const results = await Promise.all(fetchPromises);
      setDownloadProgress({ current: results.length, total: results.length }); // Done fetching
      
      // Convert to Files
      const files = results.map(({ blob, match }) => {
         const filename = match.source_path.split("/").pop() || `photo-${match.id}.jpg`;
         return new File([blob], filename, { type: blob.type });
      });

      // 2. Try Native Share (Mobile)
      if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
        try {
          await navigator.share({
            files: files,
            title: 'Aura Photos',
            text: `Here are ${files.length} photos from Aura`
          });
          resetDownloadState();
          return;
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') {
            console.warn("Share failed, falling back to ZIP:", shareErr);
          } else {
             resetDownloadState();
             return; 
          }
        }
      }

      // 3. Fallback: ZIP
      if (signal.aborted) return;
      
      const JSZip = (await import("jszip")).default;
      const { saveAs } = (await import("file-saver"));
      const zip = new JSZip();
      
      files.forEach(file => {
        zip.file(file.name, file);
      });

      const content = await zip.generateAsync({ type: "blob" });
      if (!signal.aborted) {
        saveAs(content, `aura-photos-${new Date().toISOString().split('T')[0]}.zip`);
      }
      
      resetDownloadState();

    } catch (err: any) {
      if (err.message === "Download cancelled") {
        console.log("Download cancelled by user");
      } else {
        console.error("Download failed:", err);
        alert("Download failed. Please try again.");
      }
      resetDownloadState();
    }
  };

  const cancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetDownloadState();
  };

  const resetDownloadState = () => {
    setDownloadProgress(null);
    abortControllerRef.current = null;
    setSelectMode(false);
    setSelected(new Set());
  };

  const getTransitionStyle = (): React.CSSProperties => {
    const { isAnimating, startRect } = transition;
    
    if (!startRect) return { opacity: 0, pointerEvents: "none" };
    
    if (isAnimating && !viewerOpen) {
      return {
        position: "fixed",
        top: startRect.top,
        left: startRect.left,
        width: startRect.width,
        height: startRect.height,
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 2000,
        objectFit: "cover" as const,
        borderRadius: "4px",
      };
    }
    
    if (isAnimating && viewerOpen) {
      return {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 2000,
        objectFit: "contain" as const,
      };
    }
    
    return { opacity: 0, pointerEvents: "none" };
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] overflow-x-hidden">
      {/* Top Bar */}
      <nav className="fixed top-0 left-0 w-full h-20 flex items-center justify-between px-6 md:px-10 bg-[rgba(5,5,5,0.9)] backdrop-blur-xl z-50 border-b border-white/5">
        {!isBundle ? (
          <button 
            onClick={onBack}
            className="font-mono font-bold text-sm tracking-tight uppercase hover:text-[var(--accent)] transition-colors"
          >
            ← Back
          </button>
        ) : (
          <div className="font-mono font-bold text-sm tracking-tight uppercase text-[var(--accent)]">
            Shared Bundle
          </div>
        )}

        <div className="flex gap-3">
          {!isBundle ? (
             !selectMode ? (
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
            )
          ) : (
            // Bundle Mode: Just the download button
             <button
                onClick={downloadAll}
                className="px-5 py-2.5 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] font-mono text-[11px] font-bold uppercase tracking-wide hover:opacity-90 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all animate-pulse"
              >
                Download Bundle ({matches.length})
              </button>
          )}
        </div>
      </nav>

      {/* Results Header */}
      {!isBundle && (
        <div className="pt-28 pb-4 px-6 md:px-10 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold mb-2">
            Found <span className="text-[var(--accent)]">{matches.length}</span> Matches
          </h1>
          <p className="text-gray-500 font-mono text-xs">
            {matches.length > 0 && `Best match: ${(100 - matches[0].distance / 10).toFixed(1)}% similarity`}
          </p>
        </div>
      )}

      {/* Date-Grouped Gallery */}
      <main className={`px-2 md:px-10 pb-10 max-w-[1800px] mx-auto transition-opacity duration-300 ${viewerOpen ? 'opacity-0 pointer-events-none' : ''}`}>
        {groupedMatches.map((group, groupIndex) => (
          <div key={group.date} className="mb-8">
            {/* Date Separator */}
            <div className="flex items-center gap-4 mb-4 px-2">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              {/* Select Date Button */}
              {selectMode && (
                <button
                  onClick={() => toggleSelectDate(group.matches)}
                  className={`font-mono text-[10px] px-2 py-0.5 rounded border transition-all ${
                    group.matches.every(m => selected.has(m.id)) 
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-black' 
                      : 'border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black'
                  }`}
                >
                  {group.matches.every(m => selected.has(m.id)) ? 'DESELECT' : 'SELECT'} DATE
                </button>
              )}
              
              <span className="font-mono text-xs text-[var(--accent)] uppercase tracking-wider whitespace-nowrap">
                {group.dateLabel}
              </span>
              <span className="font-mono text-[10px] text-gray-500">
                ({group.matches.length})
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
            
            {/* Grid for this date */}
            <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-2 md:gap-4">
              {group.matches.map((match) => (
                <div
                  key={match.id}
                  ref={(el) => { if (el) imageRefs.current.set(match.id, el); }}
                  onClick={(e) => openViewer(match, e)}
                  className="relative break-inside-avoid mb-2 md:mb-4 bg-[#111] cursor-pointer overflow-hidden group rounded"
                >
                  {/* Selection checkbox */}
                  <div 
                    className={`absolute top-2 right-2 w-5 h-5 border-2 border-white bg-black/50 z-10 flex items-center justify-center transition-opacity ${
                      selectMode ? 'opacity-100' : 'opacity-0'
                    } ${selected.has(match.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : ''}`}
                  >
                    {selected.has(match.id) && <span className="text-white text-xs">✓</span>}
                  </div>

                  {/* Distance badge */}
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded font-mono text-[9px] text-[var(--accent)] z-10">
                    {match.distance < 100 ? "★" : `${match.distance.toFixed(0)}`}
                  </div>

                  {/* Image - Use thumbnail for grid */}
                  <img
                    src={getImageUrl(match.source_path, 400)}
                    alt="Match"
                    loading="lazy"
                    className="w-full block transition-transform duration-300 group-hover:scale-[1.02]"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.retried) {
                        img.dataset.retried = "true";
                        img.src = getImageUrl(match.source_path, 400) + "&t=" + Date.now();
                      } else {
                        img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23111'%3E%3Crect width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' fill='%23333' text-anchor='middle' dy='.3em' font-family='sans-serif'%3EUnavailable%3C/text%3E%3C/svg%3E";
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Transition Overlay */}
      {transition.isAnimating && transition.match && (
        <img
          src={getImageUrl(transition.match.source_path)}
          alt="Transition"
          style={getTransitionStyle()}
        />
      )}

      {/* Fullscreen Viewer */}
      {viewerOpen && currentImage && !transition.isAnimating && (
        <div
          ref={viewerRef}
          className="fixed inset-0 bg-[var(--bg)] z-[1000] flex items-center justify-center animate-fade-in"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <button
            onClick={closeViewer}
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center text-white text-3xl font-light hover:text-[var(--accent)] transition-all z-[1010] bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] hover:bg-white/20 active:scale-95"
          >
            ×
          </button>

          <img
            src={getImageUrl(currentImage.source_path)}
            alt="Full view"
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: scale > 1 ? "grab" : "default",
              transition: scale === 1 ? "transform 0.1s" : "none"
            }}
            draggable={false}
          />

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 items-center z-[1010]">
            <p className="font-mono text-xs text-gray-400 hidden sm:block">
              {currentImage.source_path.split("/").pop()}
            </p>
            <button
              onClick={() => downloadImage(currentImage)}
              className="px-6 py-2.5 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] font-mono text-sm font-bold uppercase tracking-wide hover:opacity-90 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all rounded"
            >
              Download
            </button>
          </div>

          {scale > 1 && (
            <div className="absolute top-6 left-6 font-mono text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
              {(scale * 100).toFixed(0)}%
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
      {/* Download Progress Overlay */}
      {downloadProgress && (
        <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-white/20 border-t-[var(--accent)] rounded-full animate-spin mb-6" />
          <h3 className="text-xl font-light text-white mb-2">Preparing Photos...</h3>
          <p className="font-mono text-sm text-gray-400 mb-8">
            {downloadProgress.current} / {downloadProgress.total} ready
          </p>
          <button
            onClick={cancelDownload}
            className="px-8 py-3 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-full font-mono text-xs uppercase tracking-widest transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// Helper to format date labels
function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (dateStr === today.toISOString().split("T")[0]) {
    return "Today";
  }
  if (dateStr === yesterday.toISOString().split("T")[0]) {
    return "Yesterday";
  }
  
  return date.toLocaleDateString("en-US", { 
    weekday: "short", 
    month: "short", 
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined
  });
}
