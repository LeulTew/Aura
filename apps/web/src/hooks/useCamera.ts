import { useState, useRef, useCallback } from 'react';
import { TethrManager } from 'tethr';
import { createThumbnail } from '../lib/imageUtils';
import { supabase } from '../lib/supabase';

export type CameraStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface CameraState {
  status: CameraStatus;
  cameraName: string | null;
  batteryLevel: number | null;
  error: string | null;
  logs: string[];
}

export function useCamera() {
  const [state, setState] = useState<CameraState>({
    status: 'disconnected',
    cameraName: null,
    batteryLevel: null,
    error: null,
    logs: [],
  });
  
  const cameraRef = useRef<any | null>(null); // Use any to bypass strict type issues if initTethr missing

  const appendLog = (msg: string) => {
    setState(s => ({ ...s, logs: [...s.logs.slice(-4), msg] }));
  };

  const connect = useCallback(async () => {
    setState(s => ({ ...s, status: 'connecting', error: null }));
    
    try {
      const manager = new TethrManager();
      const cam = await manager.requestCamera('default' as any);
      
      if (!cam) {
        throw new Error('No camera selected.');
      }
      
      await cam.open();
      cameraRef.current = cam;
      
      const name = await cam.getModel();
      const battery = await cam.getBatteryLevel();
      
      setState(s => ({
        ...s,
        status: 'connected',
        cameraName: name || 'Camera',
        batteryLevel: typeof battery === 'number' ? battery : null,
        error: null
      }));
      
      appendLog(`Connected to ${name}`);

      // Setup polling or listeners if possible
      // cam.on('disconnect', ...)

    } catch (err: any) {
      console.error('Connection failed:', err);
      let msg = err.message || 'Failed to connect';
      if (msg.includes('claimed')) msg = 'Camera busy. Close other apps.';
      setState(s => ({ ...s, status: 'error', error: msg }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (cameraRef.current) {
      await cameraRef.current.close();
      cameraRef.current = null;
    }
    setState(s => ({ ...s, status: 'disconnected', cameraName: null, batteryLevel: null }));
  }, []);

  const triggerCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      appendLog('Capturing...');
      const result = await cameraRef.current.takePhoto({ download: true });
      
      if (result.status === 'ok') {
        const objects = result.value;
        appendLog(`Captured ${objects.length} photos`);
        
        for (const obj of objects) {
          if (obj.blob) {
            await processAndUpload(obj.blob, obj.filename);
          }
        }
      } else {
        appendLog('Capture failed');
      }
    } catch (e: any) {
      console.error(e);
      appendLog(`Error: ${e.message}`);
    }
  }, []);

  const processAndUpload = async (blob: Blob, filename: string) => {
    // Generate thumbnail immediately
    const thumb = await createThumbnail(blob);
    
    // Save to Cache (Pending)
    const dbId = await import('../lib/db').then(m => m.db.photos.add({
      filename,
      thumbnailBlob: thumb,
      createdAt: new Date(),
      status: 'pending'
    }));

    try {
      appendLog(`Uploading ${filename}...`);
      
      // 1. Upload Full Res
      const path = `photos/${Date.now()}_${filename}`;
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, blob);
        
      if (uploadError) throw uploadError;
      
      // 2. Index (Thumbnail)
      const formData = new FormData();
      formData.append('file', thumb, 'thumb.jpg');
      formData.append('path', path);
      formData.append('metadata', JSON.stringify({
        original_name: filename,
        size: blob.size,
        created_at: new Date().toISOString()
      }));
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/index-photo`, {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) throw new Error('Indexing failed');
      
      const data = await res.json();

      // Update Cache (Synced)
      await import('../lib/db').then(m => m.db.photos.update(dbId, {
        status: 'synced',
        fullPath: path,
        backendId: data.id
      }));
      
      appendLog('Synced!');
    } catch (e: any) {
      console.error(e);
      appendLog(`Sync error: ${e.message}`);
      
      // Update Cache (Error)
      await import('../lib/db').then(m => m.db.photos.update(dbId, {
        status: 'error',
        errorDetails: e.message
      }));
    }
  };

  return { ...state, connect, disconnect, triggerCapture };
}
