/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import GalleryView, { SearchMatch } from '@/components/GalleryView';
import VoidBackground from '@/components/VoidBackground';

export default function GuestGalleryPage() {
  const { id: userId } = useParams();
  const router = useRouter();
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPhotos() {
       if (!userId) return;
       setLoading(true);
       
       try {
         const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
         
         // 1. Check if this is a Bundle ID
         const bundleRes = await fetch(`${backendUrl}/api/bundles/${userId}`);
         if (bundleRes.ok) {
             const bundleData = await bundleRes.json();
             // bundleData.photo_ids contains the paths or IDs
             // In our current setup, bundles store IDs or paths. Let's assume paths for direct lookup.
             // If they are IDs, we fetch by IDs.
             const { data, error } = await supabase
                .from('photos')
                .select('*')
                .in('id', bundleData.photo_ids); // Assuming they are IDs
             
             if (error) throw error;
             
             const transformed = (data || []).map((p: any) => ({
                id: p.id?.toString() || Math.random().toString(),
                source_path: p.full_path,
                distance: 0,
                photo_date: (p.created_at || '').split('T')[0],
                created_at: p.created_at
             }));
             setMatches(transformed);
             return;
         }

         // 2. Fallback: Standard Session Fetch
         const { data, error } = await supabase
           .from('photos')
           .select('*')
           .order('created_at', { ascending: false });

         if (error) throw error;
         
         const transformedMatches: SearchMatch[] = (data || []).map((p: any) => ({
           id: p.id?.toString() || Math.random().toString(),
           source_path: p.full_path,
           distance: 0,
           photo_date: (p.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
           created_at: p.created_at || new Date().toISOString()
         }));

         setMatches(transformedMatches);
       } catch (err) {
         console.error('Error fetching gallery:', err);
       } finally {
         setLoading(false);
       }
    }
    fetchPhotos();
  }, [userId]);

  if (loading) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[var(--bg)] text-white font-sans">
        <VoidBackground />
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs text-gray-400 tracking-widest uppercase">Fetching Records...</p>
      </main>
    );
  }

  // If no photos found and not loading, we can show the GalleryView empty state or handle it here
  // The current GalleryView component handles empty matches list elegantly.
  
  return (
    <GalleryView 
      matches={matches} 
      onBack={() => router.push('/')} 
      isBundle={true} // Use bundle mode for shared result links
    />
  );
}
