'use client';

import dynamic from 'next/dynamic';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useMemo } from 'react';

const CameraConnect = dynamic(
  () => import('@/components/CameraConnect').then((mod) => mod.CameraConnect),
  { ssr: false }
);

function PhotoGallery() {
  const photos = useLiveQuery(() => db.photos.orderBy('createdAt').reverse().toArray());

  // Convert blobs to URLs
  const photoUrls = useMemo(() => {
    if (!photos) return new Map();
    const map = new Map();
    photos.forEach(p => map.set(p.id, URL.createObjectURL(p.thumbnailBlob)));
    return map;
  }, [photos]);

  if (!photos || photos.length === 0) {
    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 min-h-[300px] flex items-center justify-center text-gray-400">
           <p>Captured photos will appear here</p>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {photos.map(p => (
        <div key={p.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
          <img 
            src={photoUrls.get(p.id)} 
            alt={p.filename} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-2">
            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${
              p.status === 'synced' ? 'bg-green-500' : p.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`}>
              {p.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CapturePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Capture Station</h1>
          <p className="text-gray-500">Connect camera via USB to sync photos directly.</p>
        </div>

        <CameraConnect />
        
        <PhotoGallery />
      </div>
    </div>
  );
}
