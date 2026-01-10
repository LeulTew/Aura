'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function PhotoGallery() {
  const photos = useLiveQuery(() => db.photos.orderBy('createdAt').reverse().toArray());

  if (!photos) return null;

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-white/10" />
        </div>
        <p className="text-white/20 font-bold text-lg">No photos captured yet.</p>
        <p className="text-white/10 text-sm mt-1">Connect a camera to start syncing.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} />
      ))}
    </div>
  );
}

function PhotoCard({ photo }: { photo: any }) {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    if (photo.thumbnailBlob) {
      const url = URL.createObjectURL(photo.thumbnailBlob);
      setSrc(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [photo.thumbnailBlob]);

  return (
    <Card className="aspect-[3/4] overflow-hidden bg-[#111] border-white/5 rounded-[2rem] relative group border shadow-2xl transition-transform active:scale-95">
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      ) : (
        <div className="w-full h-full bg-white/2 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white/5" />
        </div>
      )}
      
      {/* Status Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Status Badge */}
      <div className="absolute top-4 right-4 z-10">
        {photo.status === 'synced' ? (
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-xl shadow-green-500/40 border-2 border-green-400">
            <Check className="w-4 h-4 text-white font-bold" />
          </div>
        ) : photo.status === 'error' ? (
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-xl shadow-red-500/40 border-2 border-red-400">
            <AlertCircle className="w-4 h-4 text-white font-bold" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center shadow-xl shadow-yellow-500/40 border-2 border-yellow-400 animate-pulse">
            <Clock className="w-4 h-4 text-white font-bold" />
          </div>
        )}
      </div>
    </Card>
  );
}
