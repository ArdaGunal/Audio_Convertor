"use client";

import React, { useState } from "react";
import { Github, Settings, Headphones, Music, Video, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import AudioConverterSection from "@/components/AudioConverterSection";
import VideoExtractorSection from "@/components/VideoExtractorSection";
import SettingsDialog from "@/components/SettingsDialog";

type TabType = "audio" | "video";

export default function AudioForge() {
  const [activeTab, setActiveTab] = useState<TabType>("audio");

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[1000px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-[1000px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] translate-y-1/2" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-zinc-950/50 backdrop-blur-md shrink-0">
        <div className="container-fluid px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg blur opacity-40 group-hover:opacity-75 transition-opacity" />
                <div className="relative bg-zinc-900 border border-white/10 p-2.5 rounded-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white leading-none">
                  AudioForge
                </h1>
                <p className="text-[10px] text-white/40 font-medium tracking-wider uppercase mt-1">Professional Studio</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-white/10 mx-2" />

            {/* Tab Navigation - Integrated in Header */}
            <nav className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("audio")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "audio"
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5"
                  : "text-white/40 hover:text-white hover:bg-white/5"
                  }`}
              >
                <Music className="h-4 w-4" />
                Ses Dönüştürücü
              </button>
              <button
                onClick={() => setActiveTab("video")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "video"
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5"
                  : "text-white/40 hover:text-white hover:bg-white/5"
                  }`}
              >
                <Video className="h-4 w-4" />
                Video → Ses
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white/40 hover:text-white gap-2" asChild>
              <a href="https://github.com/ArdaGunal/Audio_Convertor" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </Button>
            <SettingsDialog />
          </div>
        </div>
      </header>

      {/* Main Workspace - Full Height */}
      <main className="relative z-10 flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 w-full h-full p-6 lg:p-8">
          {activeTab === "audio" ? (
            <AudioConverterSection />
          ) : (
            <VideoExtractorSection />
          )}
        </div>
      </main>

      {/* Status Bar */}
      <div className="relative z-10 border-t border-white/5 bg-zinc-950/50 backdrop-blur-md py-2 px-8 text-xs text-white/30 flex justify-between shrink-0">
        <span>Ready</span>
        <span>AudioForge v1.0.0</span>
      </div>
    </div>
  );
}
