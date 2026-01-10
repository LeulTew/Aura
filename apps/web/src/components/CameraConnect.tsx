/* eslint-disable */ 
'use client';
import { useCamera } from '../hooks/useCamera';
import { Camera, Battery, AlertTriangle, Loader2 } from 'lucide-react';

export default function CameraConnect() {
  const { status, cameraName, batteryLevel, error, logs, connect, disconnect, triggerCapture } = useCamera();

  if (status === 'connected') {
    return (
      <>
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-green-50 border-green-200">
          <Camera className="w-6 h-6 text-green-700" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-900">{cameraName}</h3>
            <div className="flex items-center gap-2 text-sm text-green-700">
               <Battery className="w-4 h-4" />
               <span>{batteryLevel !== null ? `${batteryLevel}%` : 'Unknown'}</span>
            </div>
          </div>
          <div className="flex gap-2">
             <button
               onClick={triggerCapture}
               className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
             >
               Capture & Sync
             </button>
             <button 
               onClick={disconnect}
               className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50"
             >
               Disconnect
             </button>
          </div>
        </div>
        
        {logs.length > 0 && (
           <div className="mt-4 p-3 bg-gray-900 text-gray-200 rounded-lg text-xs font-mono">
              {logs.map((L, i) => <div key={i}>{L}</div>)}
           </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="p-4 bg-white rounded-full shadow-sm">
           <Camera className="w-8 h-8 text-gray-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium">Connect Camera</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
             Connect your camera via USB. Ensure it is powered on and "PC Remote" mode is active (if applicable).
          </p>
        </div>
        
        <button
          onClick={connect}
          disabled={status === 'connecting'}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {status === 'connecting' ? (
             <>
               <Loader2 className="w-4 h-4 animate-spin" />
               Connecting...
             </>
          ) : (
            'Connect via USB'
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-800">
           <AlertTriangle className="w-5 h-5 shrink-0" />
           <p>{error}</p>
        </div>
      )}
    </div>
  );
}
