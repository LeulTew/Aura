"use client";

import { useState, useEffect } from "react";
import VoidBackground from "@/components/VoidBackground";
import ScannerButton from "@/components/ScannerButton";
import StatusFooter from "@/components/StatusFooter";
import CameraView from "@/components/CameraView";
import GalleryView from "@/components/GalleryView";
import Link from 'next/link';
import { ArrowLeft } from "lucide-react";

type AppState = "landing" | "scanning" | "results";

interface SearchMatch {
    id: string;
    source_path: string;
    distance: number;
    photo_date: string;
    created_at: string;
}

export default function NeuralScanInstance() {
    const [appState, setAppState] = useState<AppState>("landing");
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    const handleBack = () => {
        setAppState("landing");
        setSearchResults([]);
        setError(null);
    };

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

            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const response = await fetch(`${backendUrl}/api/face-login`, {
              method: "POST",
              body: formData,
            });

            const data = await response.json();

            if (data.user_id && data.photos) {
              const matches = data.photos.map((photo: { id: string; path: string; created_at: string }) => ({
                id: photo.id,
                source_path: photo.path,
                distance: 0,
                photo_date: photo.created_at.split('T')[0],
                created_at: photo.created_at
              }));
              setSearchResults(matches);
              setAppState("results");
            } else if (data.error) {
              setError(data.error);
            } else {
              setError("No matches found");
            }
        } catch (err) {
            setError("Failed to connect to server");
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isHydrated) {
        return (
            <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#050505] text-white font-sans">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-mono text-xs text-gray-400 tracking-widest uppercase text-center">Calibrating Optics...</p>
            </main>
        );
    }

    if (appState === "scanning") {
        return (
            <CameraView
                onCapture={handleCapture}
                onBack={handleBack}
                isProcessing={isProcessing}
            />
        );
    }

    if (appState === "results") {
        return <GalleryView matches={searchResults} onBack={handleBack} />;
    }

    return (
        <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden font-sans bg-[#050505]">
            <VoidBackground />

            {/* Instance Navigation */}
            <nav className="fixed top-0 w-full p-8 flex justify-between items-center z-[200]">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-[var(--accent)]/50 transition-colors">
                        <ArrowLeft className="w-4 h-4 text-white/40 group-hover:text-white" />
                    </div>
                </Link>
                <div className="font-heading font-semibold tracking-[4px] uppercase text-xs text-white/20">
                    Studio Instance
                </div>
            </nav>

            {/* Neural Interface */}
            <div className="text-center z-10 px-6">
                <div className="mb-12 inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/5 bg-white/[0.02] backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Neural Link Active</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-extralight tracking-tight mb-4 text-white">
                    Find Your <span className="text-[var(--accent)] font-normal italic">Moments</span>
                </h1>
                <p className="text-white/30 text-xs font-mono uppercase tracking-[0.2em] mb-16 max-w-xs mx-auto leading-relaxed">
                    AI-Powered matching scoped to this studio instance
                </p>

                <ScannerButton onClick={handleScanClick} />

                {error && (
                    <div className="mt-8 p-3 rounded-lg border border-red-500/10 bg-red-500/5 text-red-500 text-[10px] font-mono tracking-widest uppercase">
                        {error}
                    </div>
                )}
            </div>

            <StatusFooter />
        </main>
    );
}
