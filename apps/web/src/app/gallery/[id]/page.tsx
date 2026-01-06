"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import GalleryView, { SearchMatch } from "@/components/GalleryView";

interface BundleData {
  id: string;
  name: string;
  photo_ids: string[]; // paths
  created_at: string;
}

export default function BundlePage() {
  const params = useParams();
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bundleName, setBundleName] = useState("");

  useEffect(() => {
    if (!params.id) return;
    
    fetch(`/api/bundles/${params.id}`)
      .then(async res => {
        if (!res.ok) throw new Error("Bundle not found");
        return res.json();
      })
      .then((data: BundleData) => {
        setBundleName(data.name);
        // Convert paths to SearchMatch objects
        const bundleMatches: SearchMatch[] = data.photo_ids.map((path, idx) => ({
          id: `bundle-${idx}`,
          source_path: path,
          distance: 0,
          photo_date: data.created_at || new Date().toISOString(), // Use bundle date to group them together
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

  return (
    <main className="bg-[var(--bg)] min-h-screen">
      <div className="pt-20 px-4 md:px-8">
        <div className="max-w-[1600px] mx-auto mb-8">
           <h1 className="text-3xl font-light text-white tracking-wide">
             {bundleName}
           </h1>
           <p className="text-gray-500 font-mono text-xs uppercase mt-2">
             Curated Collection • {matches.length} Photos
           </p>
        </div>
      </div>
      
      <GalleryView 
        matches={matches} 
        onBack={() => window.location.href = "/"}
        isBundle={true}
      />
    </main>
  );
}
