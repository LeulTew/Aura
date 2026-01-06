"use client";

import { useEffect, useState } from "react";

export default function HealthCheck() {
  const [status, setStatus] = useState<string>("Checking...");

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status === "ok" ? "Connected 🟢" : "Error 🔴"))
      .catch(() => setStatus("Offline 🔴"));
  }, []);

  return (
    <div className="fixed bottom-4 right-4 p-3 rounded-full bg-card border border-card-border text-xs font-mono">
      Backend: {status}
    </div>
  );
}
