"use client";

import React, { useState, useRef, useCallback } from "react";
import {
    Scissors,
    Combine,
    Volume2,
    Upload,
    FileAudio,
    ArrowRight,
    Clock,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AudioTrimDialog from "./AudioTrimDialog";
import {
    AudioFile,
    SUPPORTED_AUDIO_EXTENSIONS,
    generateId,
} from "@/lib/types";
import { useTranslation } from "@/lib/LanguageContext";

interface Tool {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    available: boolean;
}

export default function AudioToolsSection() {
    const [selectedTool, setSelectedTool] = useState<string | null>("trim");
    const [trimDialogOpen, setTrimDialogOpen] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<AudioFile | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const { t } = useTranslation();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const tools: Tool[] = [
        {
            id: "trim",
            name: t.tools.trim,
            description: t.tools.trimDesc,
            icon: <Scissors className="w-8 h-8" />,
            color: "cyan",
            available: true
        },
        {
            id: "merge",
            name: t.tools.merge,
            description: t.tools.mergeDesc,
            icon: <Combine className="w-8 h-8" />,
            color: "purple",
            available: false
        },
        {
            id: "normalize",
            name: t.tools.normalize,
            description: t.tools.normalizeDesc,
            icon: <Volume2 className="w-8 h-8" />,
            color: "emerald",
            available: false
        }
    ];

    const processFile = (file: File, toolId: string) => {
        const ext = file.name.split(".").pop()?.toUpperCase() || "MP3";
        const audioUrl = URL.createObjectURL(file);

        const audio = new Audio(audioUrl);
        audio.onloadedmetadata = () => {
            const audioFile: AudioFile = {
                id: generateId(),
                name: file.name,
                size: file.size,
                originalFormat: ext,
                targetFormat: ext,
                status: "waiting",
                progress: 0,
                file: file,
                audioUrl: audioUrl,
                duration: audio.duration,
            };

            setUploadedFile(audioFile);

            if (toolId === "trim") {
                setTrimDialogOpen(true);
            }
        };
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, toolId: string) => {
        if (!e.target.files || e.target.files.length === 0) return;
        processFile(e.target.files[0], toolId);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
            SUPPORTED_AUDIO_EXTENSIONS.some((ext) =>
                file.name.toLowerCase().endsWith(ext)
            )
        );

        if (droppedFiles.length > 0) {
            processFile(droppedFiles[0], selectedTool || "trim");
        }
    }, [selectedTool]);

    const handleToolClick = (tool: Tool) => {
        if (!tool.available) return;
        setSelectedTool(tool.id);
        fileInputRef.current?.click();
    };

    const handleTrim = async (fileId: string, startTime: number, endTime: number) => {
        console.log(`Trimming ${fileId}: ${startTime}s - ${endTime}s`);
        if (uploadedFile?.audioUrl) {
            URL.revokeObjectURL(uploadedFile.audioUrl);
        }
        setUploadedFile(null);
    };

    const getColorClasses = (color: string, available: boolean) => {
        if (!available) return "border-zinc-800 bg-zinc-900/30 opacity-50 cursor-not-allowed";

        const colors: Record<string, string> = {
            cyan: "border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/40 hover:bg-cyan-500/10",
            purple: "border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40 hover:bg-purple-500/10",
            emerald: "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10",
        };
        return colors[color] || colors.cyan;
    };

    const getIconColorClass = (color: string) => {
        const colors: Record<string, string> = {
            cyan: "text-cyan-400",
            purple: "text-purple-400",
            emerald: "text-emerald-400",
        };
        return colors[color] || colors.cyan;
    };

    return (
        <div
            className="h-full flex flex-col gap-6"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            {/* Full Screen Drag Overlay */}
            {isDragging && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <Upload className="w-20 h-20 text-emerald-400 mx-auto mb-4 animate-bounce" />
                        <h3 className="text-2xl font-bold text-white">{t.tools.dropAudio}</h3>
                        <p className="text-zinc-400 mt-2">{t.tools.dropAudioDesc}</p>
                    </div>
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={SUPPORTED_AUDIO_EXTENSIONS.join(",")}
                className="hidden"
                onChange={(e) => handleFileSelect(e, selectedTool || "trim")}
            />

            {/* Header */}
            <div className="shrink-0">
                <h2 className="text-2xl font-bold text-white mb-2">{t.tools.title}</h2>
                <p className="text-zinc-500">{t.tools.subtitle} • {t.tools.dropHint}</p>
            </div>

            {/* Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.map((tool) => (
                    <div
                        key={tool.id}
                        onClick={() => handleToolClick(tool)}
                        className={`
                            relative p-6 rounded-2xl border transition-all duration-200 cursor-pointer
                            ${getColorClasses(tool.color, tool.available)}
                        `}
                    >
                        {/* Coming Soon Badge */}
                        {!tool.available && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-full text-xs text-zinc-500">
                                <Clock className="w-3 h-3" />
                                {t.tools.comingSoon}
                            </div>
                        )}

                        {/* Icon */}
                        <div className={`mb-4 ${getIconColorClass(tool.color)}`}>
                            {tool.icon}
                        </div>

                        {/* Content */}
                        <h3 className="text-lg font-semibold text-white mb-2">{tool.name}</h3>
                        <p className="text-sm text-zinc-400 mb-4">{tool.description}</p>

                        {/* Action */}
                        {tool.available ? (
                            <div className="flex items-center gap-2 text-sm font-medium text-cyan-400">
                                <Upload className="w-4 h-4" />
                                {t.tools.selectFile}
                                <ArrowRight className="w-4 h-4 ml-auto" />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-zinc-600">
                                <Sparkles className="w-4 h-4" />
                                {t.tools.developing}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Info Card */}
            <div className="mt-auto p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                        <FileAudio className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-medium text-white mb-1">{t.tools.howItWorks}</h4>
                        <p className="text-sm text-zinc-500">
                            {t.tools.howItWorksDesc}
                        </p>
                    </div>
                </div>
            </div>

            {/* Trim Dialog */}
            <AudioTrimDialog
                isOpen={trimDialogOpen}
                onClose={() => {
                    setTrimDialogOpen(false);
                    if (uploadedFile?.audioUrl) {
                        URL.revokeObjectURL(uploadedFile.audioUrl);
                    }
                    setUploadedFile(null);
                }}
                audioFile={uploadedFile}
                onTrim={handleTrim}
            />
        </div>
    );
}
