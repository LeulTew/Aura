"use client";

import { useState } from "react";
import VoidBackground from "@/components/VoidBackground";
import ScannerButton from "@/components/ScannerButton";
import StatusFooter from "@/components/StatusFooter";
import CameraView from "@/components/CameraView";
import GalleryView from "@/components/GalleryView";

type AppState = "landing" | "scanning" | "results";

interface SearchMatch {
  id: string;
  source_path: string;
  distance: number;
  created_at: string;
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleScanClick = () => {
    setAppState("scanning");
    setError(null);
  };

  const handleCapture = async (imageBlob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", imageBlob, "selfie.jpg");

      const response = await fetch("/api/search", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.matches) {
        setSearchResults(data.matches);
        setAppState("results");
      } else {
        setError(data.error || "No faces found");
      }
    } catch (err) {
      setError("Failed to connect to server");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    setAppState("landing");
    setSearchResults([]);
    setError(null);
  };

  // Camera View
  if (appState === "scanning") {
    return (
      <CameraView
        onCapture={handleCapture}
        onBack={handleBack}
        isProcessing={isProcessing}
      />
    );
  }

  // Gallery/Results View
  if (appState === "results") {
    return <GalleryView matches={searchResults} onBack={handleBack} />;
  }

  // Landing View
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <VoidBackground />

      {/* Hero Image Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0">
        <img 
          src="/aura-hero.png" 
          alt="Aura Neural Mesh" 
          className="w-[800px] h-auto max-w-[150%] animate-pulse-slow"
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full p-10 flex justify-between items-center z-50">
        <div className="font-heading font-semibold tracking-[4px] uppercase text-sm">
          Aura
        </div>
        <div className="relative">
          <div className="w-5 h-0.5 bg-[var(--accent)]" />
          <div className="w-3 h-0.5 bg-[var(--accent)] absolute top-1.5 right-0" />
        </div>
      </nav>

      {/* Hero Content */}
      <div className="text-center z-10">
        <h1 className="text-5xl md:text-6xl font-extralight tracking-tight mb-16 animate-reveal">
          Your Photos,{" "}
          <span className="block text-[var(--accent)] font-normal">
            Instantly
          </span>
        </h1>

        <ScannerButton onClick={handleScanClick} />

        {error && (
          <p className="mt-8 text-red-400 text-sm">{error}</p>
        )}
      </div>

      <StatusFooter />
    </main>
  );
}


