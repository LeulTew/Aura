/* eslint-disable */
'use client';
import { useCamera } from '../hooks/useCamera';
import { Camera, Battery, AlertTriangle, Loader2, Zap, WifiOff } from 'lucide-react';

export default function CameraConnect() {
  const { status, cameraName, batteryLevel, error, logs, connect, disconnect, triggerCapture } = useCamera();

  if (status === 'connected') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-6 p-6 border border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="w-12 h-12 rounded bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/30">
            <Camera className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-white tracking-tight">{cameraName}</h3>
            <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-white/40 mt-1">
               <span className="flex items-center gap-1">
                 <Battery className="w-3 h-3 text-[var(--accent)]" />
                 {batteryLevel !== null ? `${batteryLevel}%` : '---'}
               </span>
               <span className="w-1 h-1 bg-white/20 rounded-full" />
               <span className="text-green-500">Live Port 01</span>
            </div>
          </div>
          <div className="flex gap-3">
             <button
               onClick={triggerCapture}
               className="h-10 px-5 bg-[var(--accent)] text-black font-mono text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all active:scale-95"
             >
               Trigger
             </button>
             <button 
               onClick={disconnect}
               className="h-10 px-5 border border-white/10 text-white/40 hover:text-white hover:bg-white/5 font-mono text-[10px] uppercase tracking-widest transition-all"
             >
               Eject
             </button>
          </div>
        </div>
        
        {logs.length > 0 && (
           <div className="p-4 bg-black/40 border border-white/5 text-white/30 text-[9px] font-mono tracking-tighter uppercase max-h-32 overflow-y-auto">
              <div className="border-b border-white/5 pb-2 mb-2 text-white/10 tracking-[0.3em]">System Output</div>
              {logs.map((L, i) => (
                <div key={i} className="mb-1">
                  <span className="text-[var(--accent)]/40 mr-2">[{new Date().toLocaleTimeString()}]</span>
                  {L}
                </div>
              ))}
           </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="p-10 border border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-6 group hover:border-[var(--accent)]/30 transition-all">
        <div className="w-16 h-16 rounded bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-[var(--accent)]/20 transition-all">
           <Zap className="w-8 h-8 text-white/10 group-hover:text-[var(--accent)]/40 transition-all" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-sm font-heading font-light text-white uppercase tracking-widest">Connect Hub</h3>
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest max-w-[200px] leading-relaxed">
             Sync precision optics via physical USB interface.
          </p>
        </div>
        
        <button
          onClick={connect}
          disabled={status === 'connecting'}
          className="h-14 px-10 bg-[var(--accent)] text-black font-mono text-[11px] font-bold uppercase tracking-[0.2em] transition-all hover:opacity-90 active:scale-95 disabled:opacity-20 flex items-center gap-3"
        >
          {status === 'connecting' ? (
             <>
               <Loader2 className="w-4 h-4 animate-spin" />
               Searching...
             </>
          ) : (
            'Establish Link'
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/5 border border-red-500/20 flex items-start gap-4 text-[10px] font-mono text-red-400 uppercase tracking-widest">
           <WifiOff className="w-4 h-4 shrink-0" />
           <p className="leading-relaxed">{error}</p>
        </div>
      )}
    </div>
  );
}
