"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    Upload,
    Trash2,
    CheckCircle,
    Loader2,
    FileAudio,
    Download,
    Archive,
    Play,
    Pause,
    Zap,
    ChevronRight,
    Music,
    Plus,
    LayoutGrid,
    List as ListIcon
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
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";


export default function AudioConverterSection() {
    const [files, setFiles] = useState<AudioFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [overallProgress, setOverallProgress] = useState(0);
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const messageRef = useRef<HTMLParagraphElement | null>(null);

    const load = async () => {
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
        ffmpegRef.current = new FFmpeg();
        const ffmpeg = ffmpegRef.current;
        ffmpeg.on("log", ({ message }) => {
            console.log(message);
        });

        // toBlobURL is used to bypass CORS issue, urls are fetched to blob url then loaded
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        });
        setFfmpegLoaded(true);
    };

    useEffect(() => {
        load();
        return () => {
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
        if (!ffmpegLoaded || !ffmpegRef.current) {
            console.error("FFmpeg not loaded yet");
            return;
        }

        setIsConverting(true);
        setOverallProgress(0);

        const ffmpeg = ffmpegRef.current;
        const waitingFiles = files.filter((f) => f.status === "waiting");

        for (let i = 0; i < waitingFiles.length; i++) {
            const file = waitingFiles[i];

            setFiles((prev) =>
                prev.map((f) =>
                    f.id === file.id ? { ...f, status: "converting", progress: 0 } : f
                )
            );

            try {
                const inputName = `input.${file.originalFormat.toLowerCase()}`;
                const outputName = `output.${file.targetFormat.toLowerCase()}`;

                // Write file to FFmpeg FS
                await ffmpeg.writeFile(inputName, await fetchFile(file.file ?? file.audioUrl!));

                // Track progress
                const onProgress = ({ progress }: { progress: number }) => {
                    const percent = Math.round(progress * 100);
                    setFiles((prev) =>
                        prev.map((f) => (f.id === file.id ? { ...f, progress: percent } : f))
                    );
                };
                ffmpeg.on('progress', onProgress);

                // Run FFmpeg command
                await ffmpeg.exec(['-i', inputName, outputName]);

                // Read result
                const data = await ffmpeg.readFile(outputName);
                const blob = new Blob([(data as any)], { type: `audio/${file.targetFormat.toLowerCase()}` });
                const url = URL.createObjectURL(blob);

                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === file.id
                            ? { ...f, status: "done", progress: 100, convertedBlob: blob, file: undefined, audioUrl: url } // Update audioUrl to the new file
                            : f
                    )
                );

                // Cleanup
                await ffmpeg.deleteFile(inputName);
                await ffmpeg.deleteFile(outputName);
                ffmpeg.off('progress', onProgress);

            } catch (error) {
                console.error("Conversion error", error);
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === file.id ? { ...f, status: "error", progress: 0 } : f
                    )
                );
            }

            setOverallProgress(((i + 1) / waitingFiles.length) * 100);
        }

        setIsConverting(false);
    };

    const completedFilesCount = files.filter(f => f.status === 'done').length;
    const waitingFilesCount = files.filter(f => f.status === 'waiting').length;

    // --- EMPTY STATE ---
    if (files.length === 0) {
        return (
            <div
                className={`w-full h-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all duration-300 relative overflow-hidden group ${isDragging
                    ? "border-cyan-500/50 bg-cyan-500/5"
                    : "border-white/5 bg-zinc-900/20 hover:border-white/10 hover:bg-zinc-900/40"
                    }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
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

                {/* Cinematic Background Elements */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[150px] transition-opacity duration-700 ${isDragging ? "opacity-40" : "opacity-0 group-hover:opacity-20"}`} />
                </div>

                <div className="relative z-10 flex flex-col items-center text-center p-12">
                    <div className={`mb-8 p-6 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl transition-all duration-300 ${isDragging ? "scale-110 border-cyan-500/50 shadow-cyan-500/20" : ""}`}>
                        <Upload className={`w-12 h-12 ${isDragging ? "text-cyan-400" : "text-white/50"}`} />
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Audio Studio</h2>
                    <p className="text-lg text-white/40 max-w-md mb-12">
                        Ses dosyalarınızı sürükleyip bırakarak profesyonel dönüştürme stüdyosunu başlatın.
                    </p>

                    <Button
                        size="lg"
                        className="h-14 px-8 rounded-full text-base bg-white text-black hover:bg-white/90 hover:scale-105 transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                        }}
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Dosya Seçin
                    </Button>

                    <div className="mt-12 flex gap-4 text-xs font-mono text-white/20 uppercase tracking-widest">
                        <span>MP3</span> • <span>WAV</span> • <span>FLAC</span> • <span>M4A</span> • <span>OGG</span>
                    </div>
                </div>
            </div>
        );
    }

    // --- ACTIVE DASHBOARD STATE ---
    return (
        <div className="h-full flex flex-col gap-6"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            {/* Hidden Input for Drag & Drop support overlay */}
            {isDragging && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <Upload className="w-24 h-24 text-cyan-400 mx-auto mb-4 animate-bounce" />
                        <h3 className="text-3xl font-bold text-white">Dosyaları Buraya Bırakın</h3>
                    </div>
                </div>
            )}

            {/* Dashboard Toolbar */}
            <div className="flex items-center justify-between p-1">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white">Dosya Listesi</h2>
                    <div className="h-6 w-px bg-white/10" />
                    <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-white/5">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                    <span className="text-sm text-white/40">{files.length} dosya</span>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Ekle
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={SUPPORTED_AUDIO_EXTENSIONS.join(",")}
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    {completedFilesCount > 0 && (
                        <Button
                            variant="ghost"
                            onClick={downloadAllAsZip}
                            disabled={isDownloadingAll}
                            className="text-white/60 hover:text-white"
                        >
                            {isDownloadingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                            ZIP
                        </Button>
                    )}

                    <Button
                        onClick={convertAll}
                        disabled={isConverting || waitingFilesCount === 0}
                        className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 min-w-[140px]"
                    >
                        {isConverting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />İşleniyor</> : <><Zap className="h-4 w-4 mr-2" />Çevir</>}
                    </Button>
                </div>
            </div>

            {/* Progress Bar (Full Width) */}
            {(isConverting || overallProgress > 0) && (
                <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300"
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
            )}

            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className={viewMode === 'list' ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}>
                    {files.map((file) => (
                        viewMode === 'list' ? (
                            // LIST VIEW ITEM
                            <div key={file.id} className="group flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 hover:border-white/10 transition-all">
                                <div className="p-3 rounded-lg bg-white/5 text-cyan-400">
                                    <FileAudio className="w-5 h-5" />
                                </div>

                                <div className="min-w-[200px]">
                                    <h4 className="font-medium text-white truncate max-w-[250px]">{file.name}</h4>
                                    <p className="text-xs text-white/40">{formatFileSize(file.size)}</p>
                                </div>

                                {/* Audio Controls */}
                                <div className="flex-1 flex items-center gap-3 px-4">
                                    <button
                                        onClick={() => playAudio(file)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${playingId === file.id ? "bg-cyan-500 text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
                                    >
                                        {playingId === file.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                                    </button>
                                    <div className="flex-1 h-8 flex items-center group/seek cursor-pointer" onClick={(e) => seekAudio(file.id, e)}>
                                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-cyan-500 transition-all" style={{ width: playingId === file.id && file.duration ? `${(currentTime / file.duration) * 100}%` : '0%' }} />
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-white/40 w-10 text-right">{formatAudioTime(file.duration || 0)}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Select value={file.targetFormat} onValueChange={(value) => updateTargetFormat(file.id, value)} disabled={file.status !== "waiting"}>
                                        <SelectTrigger className="w-20 h-8 text-xs bg-black/20 border-white/10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SUPPORTED_AUDIO_FORMATS.filter((f) => f !== file.originalFormat).map((format) => (
                                                <SelectItem key={format} value={format}>{format}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="w-24 flex justify-center">
                                        {file.status === 'converting' && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
                                        {file.status === 'done' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                                        {file.status === 'waiting' && <span className="text-xs text-white/20">Hazır</span>}
                                    </div>

                                    <div className="flex items-center gap-2 border-l border-white/5 pl-3">
                                        {file.status === 'done' && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/10" onClick={() => downloadFile(file)}>
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-white/5" onClick={() => removeFile(file.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // GRID VIEW ITEM
                            <div key={file.id} className="group relative p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 hover:border-white/10 hover:-translate-y-1 transition-all duration-300">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-full bg-white/5 text-cyan-400 group-hover:bg-cyan-500/10 transition-colors">
                                        <Music className="w-6 h-6" />
                                    </div>
                                    <div className="flex gap-1">
                                        {/* Mini Actions */}
                                        {file.status === 'done' && (
                                            <button className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors" onClick={() => downloadFile(file)}>
                                                <Download className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button className="p-1.5 text-white/20 hover:text-red-400 hover:bg-white/5 rounded transition-colors" onClick={() => removeFile(file.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <h4 className="font-semibold text-white truncate mb-1" title={file.name}>{file.name}</h4>
                                <div className="flex justify-between items-center text-xs text-white/40 mb-4">
                                    <span>{formatFileSize(file.size)}</span>
                                    <span>{file.originalFormat} → {file.targetFormat}</span>
                                </div>

                                <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                                    <button
                                        onClick={() => playAudio(file)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${playingId === file.id ? "bg-cyan-500 text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
                                    >
                                        {playingId === file.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                                    </button>

                                    {file.status === 'converting' ? (
                                        <div className="flex-1 flex items-center gap-2 text-cyan-400 text-xs">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            <span>%{file.progress}</span>
                                        </div>
                                    ) : file.status === 'done' ? (
                                        <div className="flex-1 text-right text-emerald-400 text-xs font-medium">Tamamlandı</div>
                                    ) : (
                                        <div className="flex-1 h-1 bg-white/10 rounded-full" />
                                    )}
                                </div>
                            </div>
                        )
                    ))}
                </div>
            </div>
        </div>
    );
}
