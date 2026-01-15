"use client";

import React from "react";
import { Music, Film, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaFile, formatFileSize, formatAudioTime } from "@/lib/types";
import { useTranslation } from "@/lib/LanguageContext";

interface MediaLibraryProps {
    files: MediaFile[];
    onAddFiles: () => void;
    onRemoveFile: (id: string) => void;
    onDragStart: (file: MediaFile) => void;
}

export default function MediaLibrary({ files, onAddFiles, onRemoveFile, onDragStart }: MediaLibraryProps) {
    const { language } = useTranslation();

    const handleDragStart = (e: React.DragEvent, file: MediaFile) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/json', JSON.stringify(file));
        onDragStart(file);
    };

    return (
        <div className="w-64 h-full bg-zinc-900/50 border-r border-white/5 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">
                        {language === 'tr' ? 'Medya Kütüphanesi' : 'Media Library'}
                    </h3>
                    <span className="text-xs text-zinc-500">{files.length}</span>
                </div>
                <Button
                    onClick={onAddFiles}
                    size="sm"
                    className="w-full bg-purple-500 hover:bg-purple-400 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {language === 'tr' ? 'Dosya Ekle' : 'Add Files'}
                </Button>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {files.length === 0 ? (
                    <div className="text-center text-zinc-500 text-sm mt-8 px-4">
                        {language === 'tr'
                            ? 'Henüz dosya yok. Ekle butonuna tıklayın.'
                            : 'No files yet. Click Add Files.'}
                    </div>
                ) : (
                    files.map((file) => (
                        <div
                            key={file.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, file)}
                            className="group p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 cursor-move transition-all"
                        >
                            <div className="flex items-start gap-2">
                                {/* Icon */}
                                <div className={`p-1.5 rounded ${file.type === 'video' ? 'bg-red-500/20' : 'bg-cyan-500/20'
                                    }`}>
                                    {file.type === 'video' ? (
                                        <Film className="w-3.5 h-3.5 text-red-400" />
                                    ) : (
                                        <Music className="w-3.5 h-3.5 text-cyan-400" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white truncate font-medium">
                                        {file.name}
                                    </p>
                                    <p className="text-[10px] text-zinc-500">
                                        {formatAudioTime(file.duration || 0)} • {formatFileSize(file.size)}
                                    </p>
                                </div>

                                {/* Delete */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveFile(file.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Drag hint */}
                            <div className="mt-1 text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                {language === 'tr' ? '↓ Timeline\'a sürükle' : '↓ Drag to timeline'}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
