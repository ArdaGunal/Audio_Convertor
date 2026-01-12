"use client";

import React, { useState } from "react";
import { Github, Settings, Headphones, Music, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import AudioConverterSection from "@/components/AudioConverterSection";
import VideoExtractorSection from "@/components/VideoExtractorSection";

type TabType = "audio" | "video";

export default function AudioForge() {
  const [activeTab, setActiveTab] = useState<TabType>("audio");

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Subtle Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Header - Clean & Minimal */}
      <header className="relative z-10 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600">
                <Headphones className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white">
                  AudioForge
                </h1>
                <p className="text-xs text-white/40">Audio Studio</p>
              </div>
            </div>

            {/* Icons */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/5 rounded-lg">
                <Github className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/5 rounded-lg">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation - Ferah ve Belirgin */}
      <nav className="relative z-10 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex gap-8 py-1">
            <button
              className={`relative py-4 text-sm font-medium transition-colors ${activeTab === "audio"
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
                }`}
              onClick={() => setActiveTab("audio")}
            >
              <div className="flex items-center gap-2.5">
                <Music className="h-4 w-4" />
                <span>Ses Dönüştürücü</span>
              </div>
              {activeTab === "audio" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
              )}
            </button>

            <button
              className={`relative py-4 text-sm font-medium transition-colors ${activeTab === "video"
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
                }`}
              onClick={() => setActiveTab("video")}
            >
              <div className="flex items-center gap-2.5">
                <Video className="h-4 w-4" />
                <span>Video → Ses</span>
              </div>
              {activeTab === "video" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content - Daha Ferah */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-8 py-12">
        {activeTab === "audio" ? (
          <AudioConverterSection />
        ) : (
          <VideoExtractorSection />
        )}
      </main>

      {/* Footer - Minimal */}
      <footer className="relative z-10 py-6">
        <div className="max-w-6xl mx-auto px-8">
          <p className="text-center text-white/20 text-sm">
            AudioForge © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
