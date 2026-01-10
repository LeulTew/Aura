"use client";

import { useEffect, useState } from "react";

export default function StatusFooter() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const start = performance.now();
      try {
        const res = await fetch("/health");
        const data = await res.json();
        const end = performance.now();
        
        if (data.status === "ok") {
          setStatus("online");
          setLatency(Math.round((end - start) * 100) / 100);
        } else {
          setStatus("offline");
        }
      } catch {
        setStatus("offline");
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="fixed bottom-10 w-full flex justify-around font-mono text-[0.65rem] text-[var(--text-muted)] tracking-widest uppercase">
      <div className="flex flex-col gap-2 items-center">
        <span className="text-[var(--accent)]">Status</span>
        <span>
          {status === "checking" && "Connecting..."}
          {status === "online" && "Sensors Calibrated"}
          {status === "offline" && "Offline"}
        </span>
      </div>
      
      <div className="flex flex-col gap-2 items-center">
        <span className="text-[var(--accent)]">Latency</span>
        <span>{latency !== null ? `${latency}ms` : "---"}</span>
      </div>
      
      <div className="flex flex-col gap-2 items-center">
        <span className="text-[var(--accent)]">Engine</span>
        <span>Precision Core v1</span>
      </div>
    </footer>
  );
}
