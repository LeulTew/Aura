"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import GalleryView, { SearchMatch, GalleryViewHandle } from "@/components/GalleryView";

interface EnrichedPhoto {
  path: string;
  photo_date: string;
}

interface BundleData {
  id: string;
  name: string;
  photos: EnrichedPhoto[]; 
  created_at: string;
}

export default function BundlePage() {
  const params = useParams();
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bundleName, setBundleName] = useState("");
  const galleryRef = useRef<GalleryViewHandle>(null);

  useEffect(() => {
    if (!params.id) return;
    
    fetch(`/api/bundles/${params.id}`)
      .then(async res => {
        if (!res.ok) throw new Error("Bundle not found");
        return res.json();
      })
      .then((data: BundleData) => {
        setBundleName(data.name);
        
        // Use enriched metadata if present, else fallback
        const bundleMatches: SearchMatch[] = data.photos.map((photo, idx) => ({
          id: `bundle-${idx}`,
          source_path: photo.path,
          distance: 0,
          photo_date: photo.photo_date !== "Unknown" ? photo.photo_date : (data.created_at || new Date().toISOString()),
          created_at: data.created_at
        }));
        setMatches(bundleMatches);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs uppercase tracking-widest opacity-50">Unpacking Bundle...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-red-400 font-mono">
        {error}
      </div>
    );
  }

  const handleDownload = () => {
    if (galleryRef.current) {
       galleryRef.current.downloadAll();
    }
  };

  return (
    <main className="bg-[var(--bg)] min-h-screen">
      <div className="pt-24 pb-12 px-4 md:px-8 text-center bg-gradient-to-b from-black/50 to-transparent">
        <div className="max-w-[1600px] mx-auto">
           <p className="text-[var(--accent)] font-mono text-[10px] uppercase tracking-[0.2em] mb-4">
             Shared Stash
           </p>
           <h1 className="text-4xl md:text-6xl font-light text-white tracking-tight mb-8">
             {bundleName}
           </h1>
           
           {/* Primary Download CTA - Centered below title */}
           <button
             onClick={handleDownload}
             className="px-10 py-4 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white font-mono text-sm font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all rounded-full mb-6"
           >
             Download All {matches.length} Photos
           </button>
           
           <p className="text-gray-500 font-mono text-[10px] uppercase tracking-wide opacity-50">
             Direct Download • High Resolution • No Expiration
           </p>
        </div>
      </div>
      
      {/* Gallery View - Navigation download buttons hidden here as they are replaced by the header button */}
      <GalleryView 
        ref={galleryRef}
        matches={matches} 
        onBack={() => window.location.href = "/"}
        isBundle={true}
        hideNavActions={true}
      />
    </main>
  );
}
