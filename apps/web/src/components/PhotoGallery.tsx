/* eslint-disable */
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { PhotoRecord } from '@/lib/db';
import { Check, Clock, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function PhotoGallery() {
  const photos = useLiveQuery(() => db.photos.orderBy('createdAt').reverse().toArray());

  if (!photos) return null;

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 border border-dashed border-white/5 bg-white/[0.01]">
        <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center mb-6">
            <ImageIcon className="w-6 h-6 text-white/10" />
        </div>
        <p className="text-white/20 font-mono text-[10px] uppercase tracking-[0.4em]">Empty Cache</p>
        <p className="text-white/10 font-mono text-[9px] mt-2 uppercase tracking-widest">Awaiting optical feed...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4 pb-20">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} />
      ))}
    </div>
  );
}

function PhotoCard({ photo }: { photo: PhotoRecord }) {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    let url = '';
    if (photo.thumbnailBlob) {
      url = URL.createObjectURL(photo.thumbnailBlob);
      setSrc(url);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo.thumbnailBlob]);

  return (
    <div className="aspect-[3/4] overflow-hidden bg-black border border-white/5 relative group transition-all active:scale-95 cursor-pointer">
      {src ? (
        <img src={src} alt={`Photo ${photo.id}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-90" />
      ) : (
        <div className="w-full h-full bg-white/2 flex items-center justify-center">
            <Clock className="w-4 h-4 text-white/5 animate-pulse" />
        </div>
      )}
      
      {/* Corner Trim */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20" />

      {/* Status Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40 group-hover:opacity-60 transition-opacity" />

      {/* Bottom Label (Minimal) */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2">
         <span className="font-mono text-[8px] text-white/40 tracking-tighter uppercase">
            IMG_{photo.id?.toString().slice(-4) || '....'}
         </span>
         {photo.status === 'pending' && (
            <span className="h-1 w-4 bg-[var(--accent)] animate-pulse" />
         )}
      </div>

      {/* Status Badge (Glowing Dot Style) */}
      <div className="absolute top-2 right-2 z-10">
        {photo.status === 'synced' ? (
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
        ) : photo.status === 'error' ? (
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-pulse" />
        )}
      </div>
    </div>
  );
}
