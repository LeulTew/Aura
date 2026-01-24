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

// Basic interface for Tethr camera to avoid any
interface TethrCamera {
    open(): Promise<void>;
    close(): Promise<void>;
    getModel(): Promise<string>;
    getBatteryLevel(): Promise<number | string>;
    takePhoto(options: { download: boolean }): Promise<{ status: string, value: any[] }>;
}

export function useCamera() {
  const [state, setState] = useState<CameraState>({
    status: 'disconnected',
    cameraName: null,
    batteryLevel: null,
    error: null,
    logs: [],
  });
  
  const cameraRef = useRef<TethrCamera | null>(null);

  const appendLog = (msg: string) => {
    setState(s => ({ ...s, logs: [...s.logs.slice(-4), msg] }));
  };

  const processAndUpload = useCallback(async (blob: Blob, filename: string) => {
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
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error(e);
      appendLog(`Sync error: ${errMsg}`);
      
      // Update Cache (Error)
      await import('../lib/db').then(m => m.db.photos.update(dbId, {
        status: 'error',
        errorDetails: errMsg
      }));
    }
  }, []);

  const connect = useCallback(async () => {
    setState(s => ({ ...s, status: 'connecting', error: null }));
    
    try {
      const manager = new TethrManager();
      // Library requires specific enum, 'default' is fallback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cam = await manager.requestCamera('default' as any) as unknown as TethrCamera;
      
      if (!cam) {
        throw new Error('No camera selected.');
      }
      
      await cam.open();
      // Safe cast to our interface
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

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to connect';
      console.error('Connection failed:', err);
      let displayMsg = errMsg;
      if (displayMsg.includes('claimed')) displayMsg = 'Camera busy. Close other apps.';
      setState(s => ({ ...s, status: 'error', error: displayMsg }));
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
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error(e);
      appendLog(`Error: ${errMsg}`);
    }
  }, [processAndUpload]);

  return { ...state, connect, disconnect, triggerCapture };
}
