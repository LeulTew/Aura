'use client';

import { useState, useEffect, useMemo } from 'react';
import { RowsPhotoAlbum } from 'react-photo-album';
import "react-photo-album/rows.css";
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Share2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function GuestGalleryPage() {
  const { id: userId } = useParams();
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(-1);

  useEffect(() => {
    async function fetchPhotos() {
       if (!userId) return;
       
       setLoading(true);
       try {
         // Because of RLS, this simple query only returns matched photos
         const { data, error } = await supabase
           .from('photos')
           .select('*')
           .order('created_at', { ascending: false });

         if (error) throw error;
         
         const transformedPhotos = (data || []).map((p: any) => ({
           src: p.path,
           width: p.metadata?.width || 4,
           height: p.metadata?.height || 3,
           id: p.id,
           path: p.path
         }));
         
         // Generate signed URLs for private bucket photos
         const signedPhotos = await Promise.all(transformedPhotos.map(async (p) => {
            const { data } = await supabase.storage.from('photos').createSignedUrl(p.path, 3600);
            return { ...p, src: data?.signedUrl || p.src };
         }));

         setPhotos(signedPhotos);
       } catch (err) {
         console.error('Error fetching gallery:', err);
       } finally {
         setLoading(false);
       }
    }
    fetchPhotos();
  }, [userId]);

  const slides = useMemo(() => photos.map(p => ({ src: p.src })), [photos]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 font-sans">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-12 h-16 sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 px-2">
        <div className="flex items-center gap-5">
            <Link href="/">
                <Button variant="secondary" size="icon" className="rounded-2xl bg-white/5 hover:bg-white/10 text-white border-white/5 border">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-black tracking-tight text-white leading-none">Your Gallery</h1>
                <p className="text-white/30 text-xs mt-1 font-medium">{photos.length} photos found</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 flex items-center gap-2 text-white h-11">
                <Share2 className="w-4 h-4" />
                Share
            </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {loading ? (
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-[2rem] bg-white/5" />
              ))}
           </div>
        ) : photos.length > 0 ? (
           <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
           >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {photos.map((photo, i) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="group overflow-hidden rounded-[2.5rem] relative cursor-pointer active:scale-[0.97] transition-all duration-500 shadow-2xl shadow-black/40 border border-white/5 aspect-[4/5]"
                  onClick={() => setIndex(i)}
                >
                  <img 
                    src={photo.src} 
                    alt="" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-8">
                    <Button 
                        variant="secondary" 
                        className="w-full rounded-2xl bg-white text-black hover:bg-white/90 h-14 font-bold shadow-xl"
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(photo.src, '_blank');
                        }}
                    >
                        <Download className="w-5 h-5 mr-3" />
                        Download
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
           </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 text-center space-y-8">
             <div className="w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/5">
                <ImageIcon className="w-10 h-10 text-white/10" />
             </div>
             <div className="space-y-3">
                <h3 className="text-3xl font-black text-white">Nothing here yet</h3>
                <p className="text-white/30 max-w-sm mx-auto text-lg leading-relaxed font-light">
                    We couldn't find any photos of you. If you just had your photo taken, wait a few seconds and try scanning again.
                </p>
             </div>
             <Link href="/guest/scan">
                <Button className="h-16 px-10 rounded-[2rem] bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-lg shadow-[0_0_30px_rgba(79,70,229,0.3)]">
                    Scan again
                </Button>
             </Link>
          </div>
        )}
      </main>

      <Lightbox
        index={index}
        slides={slides}
        open={index >= 0}
        close={() => setIndex(-1)}
      />
    </div>
  );
}
