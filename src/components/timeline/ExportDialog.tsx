"use client";

import React, { useState } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/LanguageContext";

interface ExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: string, quality: string) => void;
    isExporting: boolean;
}

export default function ExportDialog({ isOpen, onClose, onExport, isExporting }: ExportDialogProps) {
    const { language } = useTranslation();
    const [format, setFormat] = useState('mp4');
    const [quality, setQuality] = useState('high');

    if (!isOpen) return null;

    const handleExport = () => {
        onExport(format, quality);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">
                        {language === 'tr' ? 'Dışa Aktar' : 'Export'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                        disabled={isExporting}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Format Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        {language === 'tr' ? 'Format' : 'Format'}
                    </label>
                    <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value)}
                        disabled={isExporting}
                        className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="mp4">MP4 (H.264)</option>
                        <option value="webm">WebM (VP9)</option>
                        <option value="mp3">MP3 (Audio Only)</option>
                        <option value="wav">WAV (Audio Only)</option>
                    </select>
                </div>

                {/* Quality Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        {language === 'tr' ? 'Kalite' : 'Quality'}
                    </label>
                    <select
                        value={quality}
                        onChange={(e) => setQuality(e.target.value)}
                        disabled={isExporting}
                        className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="low">{language === 'tr' ? 'Düşük' : 'Low'} (720p)</option>
                        <option value="medium">{language === 'tr' ? 'Orta' : 'Medium'} (1080p)</option>
                        <option value="high">{language === 'tr' ? 'Yüksek' : 'High'} (1080p 60fps)</option>
                    </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="flex-1"
                        disabled={isExporting}
                    >
                        {language === 'tr' ? 'İptal' : 'Cancel'}
                    </Button>
                    <Button
                        onClick={handleExport}
                        className="flex-1 bg-purple-500 hover:bg-purple-400"
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {language === 'tr' ? 'Dışa Aktarılıyor...' : 'Exporting...'}
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                {language === 'tr' ? 'Dışa Aktar' : 'Export'}
                            </>
                        )}
                    </Button>
                </div>

                {/* Info */}
                {isExporting && (
                    <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <p className="text-xs text-purple-400">
                            {language === 'tr'
                                ? 'Bu işlem birkaç dakika sürebilir...'
                                : 'This may take a few minutes...'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
