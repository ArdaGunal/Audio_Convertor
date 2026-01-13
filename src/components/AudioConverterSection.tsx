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
    List as ListIcon,
    Scissors
} from "lucide-react";
import AudioTrimDialog from "./AudioTrimDialog";
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
import {
    saveFileToStorage,
    loadFilesFromStorage,
    deleteFileFromStorage,
    updateFileInStorage,
    StoredFile
} from "@/lib/storage";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { useTranslation } from "@/lib/LanguageContext";


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
    const [trimDialogOpen, setTrimDialogOpen] = useState(false);
    const [trimTargetFile, setTrimTargetFile] = useState<AudioFile | null>(null);
    const { t } = useTranslation();

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

        // Load saved files from IndexedDB
        loadFilesFromStorage('audio').then(async (storedFiles) => {
            const restoredFiles: AudioFile[] = storedFiles.map((sf) => ({
                id: sf.id,
                name: sf.name,
                size: sf.size,
                originalFormat: sf.originalFormat,
                targetFormat: sf.targetFormat,
                status: sf.status === 'converting' ? 'waiting' : sf.status, // Reset converting state
                progress: sf.status === 'done' ? 100 : 0,
                duration: sf.duration,
                audioUrl: sf.blob ? URL.createObjectURL(sf.blob) : undefined,
                convertedBlob: sf.blob,
            }));
            setFiles(restoredFiles);
        }).catch(console.error);

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

    const addFiles = async (newFiles: File[]) => {
        const audioFiles: AudioFile[] = [];

        for (const file of newFiles) {
            const ext = file.name.split(".").pop()?.toUpperCase() || "MP3";
            const audioUrl = URL.createObjectURL(file);
            const id = generateId();

            const audioFile: AudioFile = {
                id,
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

            audioFiles.push(audioFile);

            // Save to IndexedDB
            try {
                await saveFileToStorage({
                    id,
                    name: file.name,
                    size: file.size,
                    originalFormat: ext,
                    targetFormat: "MP3",
                    status: "waiting",
                    progress: 0,
                    blob: file,
                    timestamp: Date.now(),
                }, 'audio');
            } catch (e) {
                console.error('Failed to save to IndexedDB:', e);
            }

            // Get duration async
            const audio = new Audio(audioUrl);
            audio.onloadedmetadata = () => {
                setFiles(prev => prev.map(f =>
                    f.id === id ? { ...f, duration: audio.duration } : f
                ));
                // Update duration in storage
                updateFileInStorage(id, { duration: audio.duration }, 'audio').catch(console.error);
            };
        }

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
        // Remove from IndexedDB
        deleteFileFromStorage(id, 'audio').catch(console.error);
    };

    const updateTargetFormat = (id: string, format: string) => {
        setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, targetFormat: format } : f))
        );
        // Update in storage
        updateFileInStorage(id, { targetFormat: format }, 'audio').catch(console.error);
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
        const blob = audioFile.convertedBlob || audioFile.file;
        if (!blob) return;
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
                const blob = audioFile.convertedBlob || audioFile.file;
                if (blob) {
                    const fileName = getConvertedFileName(audioFile.name, audioFile.targetFormat);
                    zip.file(fileName, blob);
                }
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Audio Convertor_Converted.zip';
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

    // Open trim dialog for a specific file
    const openTrimDialog = (file: AudioFile) => {
        setTrimTargetFile(file);
        setTrimDialogOpen(true);
    };

    // Trim audio using FFmpeg
    const trimAudio = async (fileId: string, startTime: number, endTime: number) => {
        if (!ffmpegLoaded || !ffmpegRef.current) {
            console.error("FFmpeg not loaded yet");
            return;
        }

        const file = files.find(f => f.id === fileId);
        if (!file) return;

        const ffmpeg = ffmpegRef.current;
        const ext = file.originalFormat.toLowerCase();
        const inputName = `input.${ext}`;
        const outputName = `trimmed.${ext}`;

        try {
            // Write file to FFmpeg FS
            const fileData = file.convertedBlob || file.file;
            if (fileData) {
                await ffmpeg.writeFile(inputName, await fetchFile(fileData));
            } else if (file.audioUrl) {
                await ffmpeg.writeFile(inputName, await fetchFile(file.audioUrl));
            }

            // Run FFmpeg trim command
            await ffmpeg.exec([
                '-i', inputName,
                '-ss', startTime.toString(),
                '-to', endTime.toString(),
                '-c', 'copy',
                outputName
            ]);

            // Read result
            const data = await ffmpeg.readFile(outputName);
            const blob = new Blob([(data as any)], { type: `audio/${ext}` });
            const newUrl = URL.createObjectURL(blob);

            // Update file in state
            if (file.audioUrl) URL.revokeObjectURL(file.audioUrl);

            setFiles(prev => prev.map(f =>
                f.id === fileId
                    ? {
                        ...f,
                        audioUrl: newUrl,
                        convertedBlob: blob,
                        duration: endTime - startTime,
                        file: undefined
                    }
                    : f
            ));

            // Cleanup
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);

            console.log(`Trimmed ${file.name}: ${startTime}s - ${endTime}s`);
        } catch (error) {
            console.error("Trim error:", error);
            throw error;
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

                // Save converted file to IndexedDB
                updateFileInStorage(file.id, {
                    status: "done",
                    progress: 100,
                    blob: blob,
                    targetFormat: file.targetFormat
                }, 'audio').catch(console.error);

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

    const handleClearAll = async () => {
        if (confirm(t.audioConverter.confirmClearAll)) {
            for (const file of files) {
                await deleteFileFromStorage(file.id);
            }
            setFiles([]);
            setOverallProgress(0);
        }
    };

    const completedFilesCount = files.filter(f => f.status === 'done').length;
    const waitingFilesCount = files.filter(f => f.status === 'waiting').length;

    return (
        <div className="h-full flex flex-col gap-4"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            {/* Full Screen Drag Overlay */}
            {isDragging && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <Upload className="w-20 h-20 text-cyan-400 mx-auto mb-4 animate-bounce" />
                        <h3 className="text-2xl font-bold text-white">Dosyaları Buraya Bırakın</h3>
                    </div>
                </div>
            )}

            {/* ===== TOP SECTION: Drop Zone + Toolbar (FIXED) ===== */}
            <div className="shrink-0 flex items-stretch gap-6 mb-8">

                {/* Compact Drop Zone */}
                <div
                    className={`
                        flex-1 flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                        ${isDragging
                            ? "border-cyan-500/50 bg-cyan-500/10"
                            : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"}
                    `}
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

                    <div className={`p-3 rounded-xl transition-colors ${isDragging ? "bg-cyan-500/20" : "bg-zinc-800"}`}>
                        <Upload className={`w-6 h-6 ${isDragging ? "text-cyan-400" : "text-zinc-500"}`} />
                    </div>

                    <div className="flex-1">
                        <p className="font-medium text-white">{t.audioConverter.addFiles}</p>
                        <p className="text-sm text-zinc-500">{t.audioConverter.dropHint} • {t.audioConverter.formats}</p>
                    </div>

                    <div className="text-sm text-zinc-600 font-medium px-3 py-1.5 bg-zinc-900 rounded-lg border border-white/5">
                        {files.length} {t.audioConverter.files}
                    </div>
                </div>

                {/* Toolbar Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-zinc-900 p-1.5 rounded-lg border border-white/5 h-full">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            {(isConverting || overallProgress > 0) && (
                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden shrink-0">
                    <div
                        className="h-full bg-cyan-500 transition-all duration-300"
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
            )}

            {/* ===== FILE LIST (SCROLLABLE) ===== */}
            {files.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-zinc-600">
                    <p>{t.audioConverter.noFiles}</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className={viewMode === 'list' ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}>
                        {files.map((file) => (
                            viewMode === 'list' ? (
                                // LIST VIEW ITEM
                                <div key={file.id} className="group flex items-center gap-6 p-5 rounded-2xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 hover:border-white/10 transition-all hover:shadow-xl hover:shadow-cyan-500/5 hover:-translate-y-0.5">
                                    <div className="p-3 rounded-lg bg-zinc-950 border border-white/5 text-cyan-500">
                                        <FileAudio className="w-5 h-5" />
                                    </div>

                                    <div className="w-[180px] shrink-0">
                                        <h4 className="font-medium text-white truncate text-sm" title={file.name}>{file.name}</h4>
                                        <p className="text-xs text-zinc-500">{formatFileSize(file.size)} • {file.originalFormat}</p>
                                    </div>

                                    {/* Player */}
                                    <div className="flex-1 flex items-center gap-3 px-3 py-2 bg-zinc-950/50 rounded-lg border border-white/5">
                                        <button
                                            onClick={() => playAudio(file)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${playingId === file.id ? "bg-cyan-500 text-black" : "bg-zinc-800 text-white hover:bg-zinc-700"}`}
                                        >
                                            {playingId === file.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                                        </button>
                                        <div className="flex-1 h-8 flex items-center cursor-pointer" onClick={(e) => seekAudio(file.id, e)}>
                                            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-cyan-500" style={{ width: playingId === file.id && file.duration ? `${(currentTime / file.duration) * 100}%` : '0%' }} />
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono text-zinc-500 w-10">{formatAudioTime(file.duration || 0)}</span>
                                    </div>

                                    {/* Format & Status */}
                                    <div className="flex items-center gap-2">
                                        <Select value={file.targetFormat} onValueChange={(value) => updateTargetFormat(file.id, value)} disabled={file.status !== "waiting"}>
                                            <SelectTrigger className="w-20 h-8 text-xs bg-zinc-900 border-white/5">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SUPPORTED_AUDIO_FORMATS.filter((f) => f !== file.originalFormat).map((format) => (
                                                    <SelectItem key={format} value={format}>{format}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <div className="w-20 text-center">
                                            {file.status === 'converting' && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin mx-auto" />}
                                            {file.status === 'done' && <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />}
                                            {file.status === 'error' && <span className="text-xs text-red-400">Hata</span>}
                                            {file.status === 'waiting' && <span className="text-xs text-zinc-600">Bekliyor</span>}
                                        </div>

                                        {file.status === 'done' && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/10" onClick={() => downloadFile(file)}>
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-cyan-400 hover:bg-cyan-500/10" onClick={() => openTrimDialog(file)} title="Ses Kırp">
                                            <Scissors className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => removeFile(file.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                // GRID VIEW ITEM
                                <div key={file.id} className="group p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 hover:border-white/10 transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2.5 rounded-lg bg-zinc-950 text-cyan-500">
                                            <Music className="w-5 h-5" />
                                        </div>
                                        <div className="flex gap-1">
                                            <button className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors" onClick={() => openTrimDialog(file)} title="Ses Kırp">
                                                <Scissors className="w-4 h-4" />
                                            </button>
                                            <button className="p-1.5 text-zinc-500 hover:text-red-400 rounded transition-colors" onClick={() => removeFile(file.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <h4 className="font-medium text-white truncate text-sm mb-1" title={file.name}>{file.name}</h4>
                                    <p className="text-xs text-zinc-500 mb-3">{formatFileSize(file.size)} • {file.originalFormat} → {file.targetFormat}</p>
                                    <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                                        <button
                                            onClick={() => playAudio(file)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${playingId === file.id ? "bg-cyan-500 text-black" : "bg-zinc-800 text-white hover:bg-zinc-700"}`}
                                        >
                                            {playingId === file.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                                        </button>
                                        <div className="flex-1 text-right text-xs">
                                            {file.status === 'converting' && <span className="text-cyan-400">%{file.progress}</span>}
                                            {file.status === 'done' && (
                                                <button className="text-emerald-400 hover:underline" onClick={() => downloadFile(file)}>İndir</button>
                                            )}
                                            {file.status === 'waiting' && <span className="text-zinc-600">Bekliyor</span>}
                                        </div>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>

                    {files.length > 0 && (
                        <div className="shrink-0 flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/5">
                            <Button
                                variant="ghost"
                                onClick={handleClearAll}
                                className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                {t.audioConverter.clearAll}
                            </Button>

                            <div className="flex-1"></div>

                            {completedFilesCount > 0 && (
                                <Button
                                    variant="secondary"
                                    onClick={downloadAllAsZip}
                                    disabled={isDownloadingAll}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/5 gap-2 px-6"
                                >
                                    {isDownloadingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                                    {t.audioConverter.downloadAll}
                                </Button>
                            )}

                            <Button
                                onClick={convertAll}
                                disabled={isConverting || waitingFilesCount === 0}
                                className="bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-bold shadow-lg shadow-cyan-500/25 border-0 gap-2 px-8"
                            >
                                {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                {isConverting ? t.audioConverter.processing : t.audioConverter.convert}
                                {waitingFilesCount > 0 && !isConverting && ` (${waitingFilesCount})`}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Audio Trim Dialog */}
            <AudioTrimDialog
                isOpen={trimDialogOpen}
                onClose={() => {
                    setTrimDialogOpen(false);
                    setTrimTargetFile(null);
                }}
                audioFile={trimTargetFile}
                onTrim={trimAudio}
            />
        </div>
    );
}
