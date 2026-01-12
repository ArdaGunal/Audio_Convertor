"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    Upload,
    Trash2,
    CheckCircle,
    Loader2,
    Clock,
    FileAudio,
    Download,
    Archive,
    Play,
    Pause,
    Zap,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AudioFile,
    SUPPORTED_AUDIO_FORMATS,
    SUPPORTED_AUDIO_EXTENSIONS,
    formatFileSize,
    generateId,
    formatAudioTime,
    getConvertedFileName,
} from "@/lib/types";

export default function AudioConverterSection() {
    const [files, setFiles] = useState<AudioFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [overallProgress, setOverallProgress] = useState(0);
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
            SUPPORTED_AUDIO_EXTENSIONS.some((ext) =>
                file.name.toLowerCase().endsWith(ext)
            )
        );

        addFiles(droppedFiles);
    }, []);

    const addFiles = (newFiles: File[]) => {
        const audioFiles: AudioFile[] = newFiles.map((file) => {
            const ext = file.name.split(".").pop()?.toUpperCase() || "MP3";
            const audioUrl = URL.createObjectURL(file);

            const audio = new Audio(audioUrl);
            audio.onloadedmetadata = () => {
                setFiles(prev => prev.map(f =>
                    f.audioUrl === audioUrl ? { ...f, duration: audio.duration } : f
                ));
            };

            return {
                id: generateId(),
                name: file.name,
                size: file.size,
                originalFormat: ext,
                targetFormat: "MP3",
                status: "waiting",
                progress: 0,
                file: file,
                audioUrl: audioUrl,
                duration: 0,
            };
        });

        setFiles((prev) => [...prev, ...audioFiles]);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const selectedFiles = Array.from(e.target.files).filter((file) =>
            SUPPORTED_AUDIO_EXTENSIONS.some((ext) =>
                file.name.toLowerCase().endsWith(ext)
            )
        );
        addFiles(selectedFiles);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (id: string) => {
        const file = files.find(f => f.id === id);
        if (file?.audioUrl) URL.revokeObjectURL(file.audioUrl);
        if (playingId === id) stopAudio();
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const updateTargetFormat = (id: string, format: string) => {
        setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, targetFormat: format } : f))
        );
    };

    const playAudio = (audioFile: AudioFile) => {
        if (!audioFile.audioUrl) return;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (playingId === audioFile.id) {
            setPlayingId(null);
            setCurrentTime(0);
            return;
        }
        const audio = new Audio(audioFile.audioUrl);
        audio.onended = () => {
            setPlayingId(null);
            setCurrentTime(0);
            audioRef.current = null;
        };
        audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
        audio.play();
        audioRef.current = audio;
        setPlayingId(audioFile.id);
        setCurrentTime(0);
    };

    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setPlayingId(null);
        setCurrentTime(0);
    };

    const seekAudio = (fileId: string, e: React.MouseEvent<HTMLDivElement>) => {
        const file = files.find(f => f.id === fileId);
        if (!file || !file.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newTime = percentage * file.duration;

        if (playingId === fileId && audioRef.current) {
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        } else {
            if (audioRef.current) audioRef.current.pause();
            const audio = new Audio(file.audioUrl);
            audio.currentTime = newTime;
            audio.onended = () => {
                setPlayingId(null);
                setCurrentTime(0);
                audioRef.current = null;
            };
            audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
            audio.play();
            audioRef.current = audio;
            setPlayingId(fileId);
            setCurrentTime(newTime);
        }
    };

    const downloadFile = (audioFile: AudioFile) => {
        if (!audioFile.file) return;
        const blob = audioFile.convertedBlob || audioFile.file;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getConvertedFileName(audioFile.name, audioFile.targetFormat);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const downloadAllAsZip = async () => {
        const completedFiles = files.filter(f => f.status === 'done');
        if (completedFiles.length === 0) return;
        setIsDownloadingAll(true);
        try {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            for (const audioFile of completedFiles) {
                if (audioFile.file) {
                    const blob = audioFile.convertedBlob || audioFile.file;
                    const fileName = getConvertedFileName(audioFile.name, audioFile.targetFormat);
                    zip.file(fileName, blob);
                }
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'AudioForge_Converted.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('ZIP hatası:', error);
        } finally {
            setIsDownloadingAll(false);
        }
    };

    const convertAll = async () => {
        if (files.length === 0 || isConverting) return;
        setIsConverting(true);
        setOverallProgress(0);

        const waitingFiles = files.filter((f) => f.status === "waiting");

        for (let i = 0; i < waitingFiles.length; i++) {
            const file = waitingFiles[i];
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === file.id ? { ...f, status: "converting", progress: 0 } : f
                )
            );

            for (let progress = 0; progress <= 100; progress += 10) {
                await new Promise((resolve) => setTimeout(resolve, 80));
                setFiles((prev) =>
                    prev.map((f) => (f.id === file.id ? { ...f, progress } : f))
                );
            }

            setFiles((prev) =>
                prev.map((f) =>
                    f.id === file.id
                        ? { ...f, status: "done", progress: 100, convertedBlob: f.file }
                        : f
                )
            );

            setOverallProgress(((i + 1) / waitingFiles.length) * 100);
        }

        setIsConverting(false);
    };

    const completedFilesCount = files.filter(f => f.status === 'done').length;
    const waitingFilesCount = files.filter(f => f.status === 'waiting').length;

    return (
        <div className="space-y-8">
            {/* Unified Drop Zone / File List */}
            <div
                className={`relative rounded-2xl transition-all duration-300 ${files.length === 0
                        ? "bg-zinc-900/40"
                        : "bg-zinc-900/30"
                    } ${isDragging ? "ring-2 ring-cyan-500/50 bg-cyan-500/5" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                {/* Drop Zone - Shown when empty or always as header */}
                <div
                    className={`cursor-pointer transition-all ${files.length === 0 ? "p-16" : "p-6 border-b border-white/5"
                        }`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={SUPPORTED_AUDIO_EXTENSIONS.join(",")}
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    <div className={`flex items-center ${files.length === 0 ? "flex-col text-center" : "gap-4"}`}>
                        <div className={`rounded-xl transition-all ${files.length === 0
                                ? "p-5 bg-white/5 mb-5"
                                : "p-3 bg-white/5"
                            } ${isDragging ? "bg-cyan-500/10" : ""}`}>
                            <Upload className={`transition-all ${files.length === 0 ? "h-10 w-10" : "h-5 w-5"
                                } ${isDragging ? "text-cyan-400" : "text-white/30"}`} />
                        </div>

                        <div className={files.length === 0 ? "" : "flex-1"}>
                            <p className={`font-medium ${files.length === 0 ? "text-lg text-white/80 mb-2" : "text-sm text-white/60"}`}>
                                {files.length === 0
                                    ? "Ses dosyalarını sürükleyip bırakın"
                                    : "Daha fazla dosya eklemek için tıklayın veya sürükleyin"}
                            </p>
                            {files.length === 0 && (
                                <p className="text-sm text-white/40 mb-4">
                                    veya <span className="text-cyan-400">dosya seçmek için tıklayın</span>
                                </p>
                            )}
                            <div className={`flex flex-wrap gap-1.5 ${files.length === 0 ? "justify-center" : ""}`}>
                                {SUPPORTED_AUDIO_FORMATS.slice(0, files.length === 0 ? 7 : 4).map((format) => (
                                    <span key={format} className="px-2 py-0.5 rounded text-xs text-white/30 bg-white/5">
                                        {format}
                                    </span>
                                ))}
                                {files.length > 0 && <span className="text-xs text-white/20">...</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="divide-y divide-white/5">
                        {files.map((file) => (
                            <div key={file.id} className="p-5 hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-5">
                                    {/* Play Button & Info */}
                                    <div className="flex items-center gap-4 min-w-[280px]">
                                        <button
                                            className={`p-2.5 rounded-full transition-all ${playingId === file.id
                                                    ? "bg-cyan-500 text-white"
                                                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                                }`}
                                            onClick={() => playAudio(file)}
                                        >
                                            {playingId === file.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                        </button>
                                        <div className="min-w-0">
                                            <p className="font-medium text-white/90 truncate max-w-[200px]">{file.name}</p>
                                            <p className="text-xs text-white/40 mt-0.5">
                                                {formatFileSize(file.size)} • {formatAudioTime(file.duration || 0)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Audio Timeline */}
                                    <div className="flex-1 flex items-center gap-3 min-w-[200px]">
                                        <span className="text-xs text-white/30 font-mono w-10 text-right">
                                            {playingId === file.id ? formatAudioTime(currentTime) : "0:00"}
                                        </span>
                                        <div
                                            className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer overflow-hidden"
                                            onClick={(e) => seekAudio(file.id, e)}
                                        >
                                            <div
                                                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all"
                                                style={{
                                                    width: playingId === file.id && file.duration
                                                        ? `${(currentTime / file.duration) * 100}%`
                                                        : '0%'
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs text-white/30 font-mono w-10">
                                            {formatAudioTime(file.duration || 0)}
                                        </span>
                                    </div>

                                    {/* Format Selector */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-white/30 px-2 py-1 rounded bg-white/5">{file.originalFormat}</span>
                                        <ChevronRight className="h-3 w-3 text-white/20" />
                                        <Select
                                            value={file.targetFormat}
                                            onValueChange={(value) => updateTargetFormat(file.id, value)}
                                            disabled={file.status !== "waiting"}
                                        >
                                            <SelectTrigger className="w-20 h-7 text-xs bg-white/5 border-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SUPPORTED_AUDIO_FORMATS.filter((f) => f !== file.originalFormat).map((format) => (
                                                    <SelectItem key={format} value={format}>{format}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Status */}
                                    <div className="w-24 text-center">
                                        {file.status === "waiting" && (
                                            <span className="text-xs text-white/40">Bekliyor</span>
                                        )}
                                        {file.status === "converting" && (
                                            <span className="text-xs text-cyan-400 flex items-center justify-center gap-1.5">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                %{file.progress}
                                            </span>
                                        )}
                                        {file.status === "done" && (
                                            <span className="text-xs text-emerald-400 flex items-center justify-center gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Tamam
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1">
                                        {file.status === "done" && (
                                            <button
                                                className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                                onClick={() => downloadFile(file)}
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                        )}
                                        <button
                                            className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            onClick={() => removeFile(file.id)}
                                            disabled={file.status === "converting"}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Bar - Only when files exist */}
            {files.length > 0 && (
                <div className="flex items-center justify-between">
                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm">
                        <span className="text-white/40">
                            <span className="text-white font-medium">{files.length}</span> dosya
                        </span>
                        {completedFilesCount > 0 && (
                            <span className="text-emerald-400/80">
                                <span className="font-medium">{completedFilesCount}</span> tamamlandı
                            </span>
                        )}
                        {isConverting && (
                            <div className="flex items-center gap-3">
                                <Progress value={overallProgress} className="w-32 h-1" />
                                <span className="text-white/40">{Math.round(overallProgress)}%</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        {completedFilesCount > 0 && (
                            <Button
                                variant="ghost"
                                onClick={downloadAllAsZip}
                                disabled={isDownloadingAll}
                                className="text-white/60 hover:text-white hover:bg-white/5"
                            >
                                {isDownloadingAll ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Archive className="h-4 w-4 mr-2" />
                                )}
                                ZIP İndir
                            </Button>
                        )}

                        <Button
                            onClick={convertAll}
                            disabled={isConverting || waitingFilesCount === 0}
                            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 border-0 px-6"
                        >
                            {isConverting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Dönüştürülüyor
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4 mr-2" />
                                    Dönüştür
                                    {waitingFilesCount > 0 && (
                                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-white/20 rounded">
                                            {waitingFilesCount}
                                        </span>
                                    )}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
