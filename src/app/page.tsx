"use client";

import React, { useState, useEffect } from "react";
import { Github, Music, Video, Zap, ChevronRight, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import AudioConverterSection from "@/components/AudioConverterSection";
import VideoExtractorSection from "@/components/VideoExtractorSection";
import MediaEditingSection from "@/components/MediaEditingSection";
import SettingsDialog from "@/components/SettingsDialog";
import { useTranslation } from "@/lib/LanguageContext";

type TabType = "audio" | "video" | "editing";

export default function AudioConvertor() {
    const [activeTab, setActiveTab] = useState<TabType>("audio");
    const { t } = useTranslation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Load saved tab from localStorage on mount (client-side only)
    useEffect(() => {
        const savedTab = localStorage.getItem('activeTab');
        if (savedTab && ['audio', 'video', 'editing'].includes(savedTab)) {
            setActiveTab(savedTab as TabType);
        }
    }, []);

    const getHeaderInfo = () => {
        switch (activeTab) {
            case "audio": return { title: t.audioConverter.title, subtitle: t.audioConverter.subtitle };
            case "video": return { title: t.videoExtractor.title, subtitle: t.videoExtractor.subtitle };
            case "editing": return { title: t.nav.editing, subtitle: t.nav.editingDesc };
        }
    };

    const headerInfo = getHeaderInfo();

    // Save active tab to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('activeTab', activeTab);
    }, [activeTab]);

    return (
        <div className="h-screen bg-zinc-950 text-white flex overflow-hidden">

            {/* Background Ambience */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[1000px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] -translate-y-1/2" />
                <div className="absolute bottom-0 right-1/4 w-[1000px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] translate-y-1/2" />

            </div>

            {/* ===== LEFT SIDEBAR ===== */}
            {!sidebarCollapsed && (
                <aside className="relative z-20 w-72 bg-zinc-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col shrink-0">

                    {/* Logo Section */}
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center gap-3 select-none cursor-default group">
                            <div className="relative w-11 h-11 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl shadow-lg ring-1 ring-white/10 group-hover:scale-105 transition-transform">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white tracking-tight leading-none group-hover:text-cyan-400 transition-colors">{t.appName}</h1>
                                <span className="text-[10px] font-bold tracking-[0.15em] text-cyan-500/80 uppercase">{t.professional}</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider px-3 mb-4">{t.nav.converters}</p>

                        {/* Audio Converter Button */}
                        <button
                            onClick={() => setActiveTab("audio")}
                            className={`
              w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all duration-200 group
              ${activeTab === "audio"
                                    ? "bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20 shadow-lg shadow-cyan-500/5"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-white"}
            `}
                        >
                            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${activeTab === "audio" ? "bg-cyan-500 text-black" : "bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700"}
            `}>
                                <Music className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <span className="font-semibold block">{t.nav.audioConverter}</span>
                                <span className="text-xs text-zinc-500">{t.nav.audioConverterDesc}</span>
                            </div>
                            {activeTab === "audio" && <ChevronRight className="w-4 h-4 text-cyan-400" />}
                        </button>

                        {/* Video Extractor Button */}
                        <button
                            onClick={() => setActiveTab("video")}
                            className={`
              w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all duration-200 group
              ${activeTab === "video"
                                    ? "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 shadow-lg shadow-purple-500/5"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-white"}
            `}
                        >
                            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${activeTab === "video" ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700"}
            `}>
                                <Video className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <span className="font-semibold block">{t.nav.videoToAudio}</span>
                                <span className="text-xs text-zinc-500">{t.nav.videoToAudioDesc}</span>
                            </div>
                            {activeTab === "video" && <ChevronRight className="w-4 h-4 text-purple-400" />}
                        </button>

                        {/* Divider */}
                        <div className="my-4 border-t border-white/5" />
                        <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider px-3 mb-4">{t.nav.extra}</p>

                        {/* Media Editing Button */}
                        <button
                            onClick={() => setActiveTab("editing")}
                            className={`
              w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all duration-200 group
              ${activeTab === "editing"
                                    ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-white"}
            `}
                        >
                            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${activeTab === "editing" ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700"}
            `}>
                                <Wrench className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <span className="font-semibold block">{t.nav.editing}</span>
                                <span className="text-xs text-zinc-500">{t.nav.editingDesc}</span>
                            </div>
                            {activeTab === "editing" && <ChevronRight className="w-4 h-4 text-emerald-400" />}
                        </button>
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-white/5 space-y-3">
                        <Button variant="ghost" size="sm" className="w-full justify-start text-zinc-500 hover:text-white gap-3" asChild>
                            <a href="https://github.com/ArdaGunal/Audio_Convertor" target="_blank" rel="noopener noreferrer">
                                <Github className="h-4 w-4" />
                                GitHub
                            </a>
                        </Button>
                        <div className="flex items-center justify-between">
                            <SettingsDialog />
                            <span className="text-[10px] text-zinc-600">v1.0.0</span>
                        </div>
                    </div>
                </aside>
            )}

            {/* Sidebar Toggle Button */}
            <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-r-lg p-2 transition-all"
                style={{ left: sidebarCollapsed ? '0' : '288px' }}
            >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {sidebarCollapsed ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    )}
                </svg>
            </button>

            {/* ===== MAIN CONTENT AREA ===== */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Top Bar (Minimal) */}
                <header className="relative z-10 h-16 border-b border-white/5 bg-zinc-950/30 backdrop-blur-md flex items-center px-8 shrink-0">
                    <h2 className="text-lg font-bold text-white">{headerInfo.title}</h2>
                    <div className="ml-4 px-3 py-1 rounded-full bg-zinc-800 text-xs text-zinc-400 font-medium">
                        {headerInfo.subtitle}
                    </div>
                </header>

                {/* Main Workspace */}
                <main className="relative z-10 flex-1 overflow-hidden">
                    <div className="h-full p-8 lg:p-12 overflow-y-auto">
                        {activeTab === "audio" && <AudioConverterSection />}
                        {activeTab === "video" && <VideoExtractorSection />}
                        {activeTab === "editing" && <MediaEditingSection />}
                    </div>
                </main>

                {/* Status Bar */}
                <div className="relative z-10 border-t border-white/5 bg-zinc-950/50 backdrop-blur-md py-2 px-8 text-xs text-white/30 flex justify-between shrink-0">
                    <span>{t.ready}</span>
                    <span>{t.appName} Studio</span>
                </div>
            </div>
        </div>
    );
}
