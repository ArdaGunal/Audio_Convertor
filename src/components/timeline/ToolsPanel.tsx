"use client";

import React from "react";
import { ZoomIn, ZoomOut, Scissors, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/LanguageContext";

interface ToolsPanelProps {
    zoom: number;
    onZoomChange: (zoom: number) => void;
    selectedClipId: string | null;
    onSplitClip: () => void;
    onExport: () => void;
    exportProgress?: number; // 0-100
    isExporting?: boolean;
}

export default function ToolsPanel({
    zoom,
    onZoomChange,
    selectedClipId,
    onSplitClip,
    onExport,
    exportProgress = 0,
    isExporting = false
}: ToolsPanelProps) {
    const { language } = useTranslation();

    return (
        <div className="w-64 bg-zinc-900/50 border-l border-white/5 p-4 flex flex-col gap-4">
            {/* Zoom Controls */}
            <div>
                <h3 className="text-xs font-semibold text-zinc-400 mb-2">
                    {language === 'tr' ? 'Yakınlaştırma' : 'Zoom'}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onZoomChange(Math.max(10, zoom - 10))}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                    >
                        <ZoomOut className="w-4 h-4 text-zinc-400" />
                    </button>
                    <div className="flex-1 text-center">
                        <span className="text-sm text-white">{zoom}px/s</span>
                    </div>
                    <button
                        onClick={() => onZoomChange(Math.min(200, zoom + 10))}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                    >
                        <ZoomIn className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>
                <input
                    type="range"
                    min="10"
                    max="200"
                    value={zoom}
                    onChange={(e) => onZoomChange(parseInt(e.target.value))}
                    className="w-full mt-2 accent-purple-500"
                />
            </div>

            {/* Clip Tools */}
            <div>
                <h3 className="text-xs font-semibold text-zinc-400 mb-2">
                    {language === 'tr' ? 'Clip Araçları' : 'Clip Tools'}
                </h3>
                <Button
                    onClick={onSplitClip}
                    disabled={!selectedClipId}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Scissors className="w-4 h-4 mr-2" />
                    {language === 'tr' ? 'Playhead\'de Böl' : 'Split at Playhead'}
                </Button>
            </div>

            {/* Export */}
            <div className="mt-auto">
                <Button
                    onClick={onExport}
                    disabled={isExporting}
                    className="w-full bg-purple-500 hover:bg-purple-400 disabled:opacity-50"
                >
                    <Download className="w-4 h-4 mr-2" />
                    {language === 'tr' ? 'Dışa Aktar' : 'Export'}
                </Button>

                {/* Export Progress */}
                {isExporting && (
                    <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">
                                {language === 'tr' ? 'İşleniyor...' : 'Processing...'}
                            </span>
                            <span className="text-purple-400 font-mono">{Math.round(exportProgress)}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-400 transition-all duration-300 ease-out"
                                style={{ width: `${exportProgress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Info */}
            {selectedClipId && (
                <div className="p-3 bg-zinc-800/50 rounded-lg border border-white/5">
                    <p className="text-xs text-zinc-400">
                        {language === 'tr' ? 'Clip seçildi' : 'Clip selected'}
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">
                        {language === 'tr'
                            ? 'Sürükle, boyutlandır veya böl'
                            : 'Drag, resize, or split'}
                    </p>
                </div>
            )}
        </div>
    );
}
