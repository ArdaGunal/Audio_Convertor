"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    Upload,
    Trash2,
    CheckCircle,
    Loader2,
    Download,
    Play,
    Pause,
    Video,
    Scissors,
    Plus,
    LayoutGrid,
    List as ListIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    VideoFile,
    SUPPORTED_VIDEO_EXTENSIONS,
    formatFileSize,
    generateId,
    formatAudioTime,
    getAudioFromVideoName,
} from "@/lib/types";

export default function VideoExtractorSection() {
    const [files, setFiles] = useState<VideoFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [overallProgress, setOverallProgress] = useState(0);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
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
            SUPPORTED_VIDEO_EXTENSIONS.some((ext) =>
                file.name.toLowerCase().endsWith(ext)
            )
        );

        addFiles(droppedFiles);
    }, []);

    const addFiles = (newFiles: File[]) => {
        const videoFiles: VideoFile[] = newFiles.map((file) => {
            const ext = file.name.split(".").pop()?.toUpperCase() || "MP4";
            const videoUrl = URL.createObjectURL(file);

            const video = document.createElement('video');
            video.src = videoUrl;
            video.onloadedmetadata = () => {
                setFiles(prev => prev.map(f =>
                    f.videoUrl === videoUrl ? { ...f, duration: video.duration } : f
                ));
            };

            return {
                id: generateId(),
                name: file.name,
                size: file.size,
                format: ext,
                status: "waiting",
                progress: 0,
                file: file,
                videoUrl: videoUrl,
                duration: 0,
            };
        });

        setFiles((prev) => [...prev, ...videoFiles]);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const selectedFiles = Array.from(e.target.files).filter((file) =>
            SUPPORTED_VIDEO_EXTENSIONS.some((ext) =>
                file.name.toLowerCase().endsWith(ext)
            )
        );
        addFiles(selectedFiles);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (id: string) => {
        const file = files.find(f => f.id === id);
        if (file?.videoUrl) URL.revokeObjectURL(file.videoUrl);
        if (file?.audioUrl) URL.revokeObjectURL(file.audioUrl);
        if (playingId === id) stopAudio();
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const playAudio = (videoFile: VideoFile) => {
        if (!videoFile.audioUrl) return;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (playingId === videoFile.id) {
            setPlayingId(null);
            setCurrentTime(0);
            return;
        }
        const audio = new Audio(videoFile.audioUrl);
        audio.onended = () => {
            setPlayingId(null);
            setCurrentTime(0);
            audioRef.current = null;
        };
        audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
        audio.play();
        audioRef.current = audio;
        setPlayingId(videoFile.id);
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
        if (!file || !file.duration || !file.audioUrl) return;
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

    const downloadAudio = (videoFile: VideoFile) => {
        if (!videoFile.audioBlob) return;
        const url = URL.createObjectURL(videoFile.audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getAudioFromVideoName(videoFile.name);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const extractAudio = async (videoFile: VideoFile): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = videoFile.videoUrl!;
            video.crossOrigin = 'anonymous';

            video.onloadedmetadata = async () => {
                try {
                    const audioContext = new AudioContext();
                    const response = await fetch(videoFile.videoUrl!);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    const wavBlob = audioBufferToWav(audioBuffer);
                    resolve(wavBlob);
                } catch {
                    try {
                        const blob = await extractAudioFallback(videoFile);
                        resolve(blob);
                    } catch (fallbackError) {
                        reject(fallbackError);
                    }
                }
            };

            video.onerror = () => reject(new Error('Video yüklenemedi'));
        });
    };

    const extractAudioFallback = (videoFile: VideoFile): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = videoFile.videoUrl!;
            video.muted = false;

            video.onloadedmetadata = () => {
                const audioContext = new AudioContext();
                const source = audioContext.createMediaElementSource(video);
                const destination = audioContext.createMediaStreamDestination();
                source.connect(destination);
                source.connect(audioContext.destination);

                const mediaRecorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm' });
                const chunks: Blob[] = [];
                mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
                mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
                mediaRecorder.onerror = () => reject(new Error('Kayıt hatası'));

                mediaRecorder.start();
                video.play();
                video.onended = () => { mediaRecorder.stop(); video.remove(); };
                video.playbackRate = 16;
            };

            video.onerror = () => reject(new Error('Video yüklenemedi'));
        });
    };

    const audioBufferToWav = (buffer: AudioBuffer): Blob => {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const bytesPerSample = 2;
        const blockAlign = numChannels * bytesPerSample;
        const dataLength = buffer.length * blockAlign;
        const bufferLength = 44 + dataLength;
        const arrayBuffer = new ArrayBuffer(bufferLength);
        const view = new DataView(arrayBuffer);

        const writeString = (offset: number, str: string) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };

        writeString(0, 'RIFF');
        view.setUint32(4, bufferLength - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, dataLength, true);

        const channels = [];
        for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));

        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                const sample = Math.max(-1, Math.min(1, channels[ch][i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    };

    const extractAll = async () => {
        if (files.length === 0 || isExtracting) return;
        setIsExtracting(true);
        setOverallProgress(0);

        const waitingFiles = files.filter((f) => f.status === "waiting");

        for (let i = 0; i < waitingFiles.length; i++) {
            const file = waitingFiles[i];
            setFiles((prev) =>
                prev.map((f) => f.id === file.id ? { ...f, status: "extracting", progress: 0 } : f)
            );

            try {
                for (let progress = 0; progress <= 80; progress += 20) {
                    await new Promise((resolve) => setTimeout(resolve, 150));
                    setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, progress } : f));
                }

                const audioBlob = await extractAudio(file);
                const audioUrl = URL.createObjectURL(audioBlob);

                setFiles((prev) =>
                    prev.map((f) => f.id === file.id ? { ...f, status: "done", progress: 100, audioBlob, audioUrl } : f)
                );
            } catch (error) {
                console.error('Çıkarma hatası:', error);
                setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: "error", progress: 0 } : f));
            }

            setOverallProgress(((i + 1) / waitingFiles.length) * 100);
        }

        setIsExtracting(false);
    };

    const completedFilesCount = files.filter(f => f.status === 'done').length;
    const waitingFilesCount = files.filter(f => f.status === 'waiting').length;

    if (files.length === 0) {
        return (
            <div
                className={`w-full h-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all duration-300 relative overflow-hidden group ${isDragging
                        ? "border-orange-500/50 bg-orange-500/5"
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
                    accept={SUPPORTED_VIDEO_EXTENSIONS.join(",")}
                    className="hidden"
                    onChange={handleFileSelect}
                />

                <div className="absolute inset-0 pointer-events-none">
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[150px] transition-opacity duration-700 ${isDragging ? "opacity-40" : "opacity-0 group-hover:opacity-20"}`} />
                </div>

                <div className="relative z-10 flex flex-col items-center text-center p-12">
                    <div className={`mb-8 p-6 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl transition-all duration-300 ${isDragging ? "scale-110 border-orange-500/50 shadow-orange-500/20" : ""}`}>
                        <Video className={`w-12 h-12 ${isDragging ? "text-orange-400" : "text-white/50"}`} />
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Video Extractor</h2>
                    <p className="text-lg text-white/40 max-w-md mb-12">
                        Video dosyalarınızdan yüksek kaliteli ses çıkarmak için dosyaları sürükleyin.
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
                        Video Seçin
                    </Button>

                    <div className="mt-12 flex gap-4 text-xs font-mono text-white/20 uppercase tracking-widest">
                        <span>MP4</span> • <span>MKV</span> • <span>MOV</span> • <span>WEBM</span> • <span>AVI</span>
                    </div>
                </div>
            </div>
        );
    }

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
                        <Upload className="w-24 h-24 text-orange-400 mx-auto mb-4 animate-bounce" />
                        <h3 className="text-3xl font-bold text-white">Videoları Buraya Bırakın</h3>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between p-1">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white">Video Listesi</h2>
                    <div className="h-6 w-px bg-white/10" />
                    <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-white/5">
                        <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>
                            <ListIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                    <span className="text-sm text-white/40">{files.length} video</span>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="border-white/10 bg-white/5 hover:bg-white/10 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Ekle
                    </Button>
                    <input ref={fileInputRef} type="file" multiple accept={SUPPORTED_VIDEO_EXTENSIONS.join(",")} className="hidden" onChange={handleFileSelect} />
                    <Button onClick={extractAll} disabled={isExtracting || waitingFilesCount === 0} className="bg-orange-500 hover:bg-orange-400 text-black font-semibold px-6 min-w-[140px]">
                        {isExtracting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Çıkarılıyor</> : <><Scissors className="h-4 w-4 mr-2" />Ses Çıkar</>}
                    </Button>
                </div>
            </div>

            {/* Progress Bar */}
            {(isExtracting || overallProgress > 0) && (
                <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-300" style={{ width: `${overallProgress}%` }} />
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className={viewMode === 'list' ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}>
                    {files.map((file) => (
                        viewMode === 'list' ? (
                            // LIST VIEW
                            <div key={file.id} className="group flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 hover:border-white/10 transition-all">
                                <div className="p-3 rounded-lg bg-white/5 text-orange-400">
                                    <Video className="w-5 h-5" />
                                </div>
                                <div className="min-w-[200px]">
                                    <h4 className="font-medium text-white truncate max-w-[250px]">{file.name}</h4>
                                    <p className="text-xs text-white/40">{formatFileSize(file.size)} • {file.format}</p>
                                </div>

                                {/* Audio Player */}
                                <div className="flex-1 flex items-center gap-3 px-4">
                                    {file.status === 'done' && file.audioUrl ? (
                                        <>
                                            <button
                                                onClick={() => playAudio(file)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${playingId === file.id ? "bg-orange-500 text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
                                            >
                                                {playingId === file.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                                            </button>
                                            <div className="flex-1 h-8 flex items-center group/seek cursor-pointer" onClick={(e) => seekAudio(file.id, e)}>
                                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-orange-500 transition-all" style={{ width: playingId === file.id && file.duration ? `${(currentTime / file.duration) * 100}%` : '0%' }} />
                                                </div>
                                            </div>
                                            <span className="text-xs font-mono text-white/40 w-10 text-right">{formatAudioTime(file.duration || 0)}</span>
                                        </>
                                    ) : (
                                        <div className="flex-1 text-center text-xs text-white/20 italic">
                                            {file.status === 'extracting' ? 'Ses çıkarılıyor...' : 'Ses bekleniyor'}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 border-l border-white/5 pl-3">
                                    {file.status === 'done' && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/10" onClick={() => downloadAudio(file)}>
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-white/5" onClick={() => removeFile(file.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // GRID VIEW
                            <div key={file.id} className="group relative p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 hover:border-white/10 hover:-translate-y-1 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-full bg-white/5 text-orange-400">
                                        <Video className="w-6 h-6" />
                                    </div>
                                    <button className="p-1.5 text-white/20 hover:text-red-400 hover:bg-white/5 rounded transition-colors" onClick={() => removeFile(file.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <h4 className="font-semibold text-white truncate mb-1" title={file.name}>{file.name}</h4>
                                <p className="text-xs text-white/40 mb-4">{formatFileSize(file.size)}</p>

                                <div className="pt-3 border-t border-white/5">
                                    {file.status === 'done' && file.audioUrl ? (
                                        <div className="flex items-center gap-2">
                                            <button className="w-8 h-8 rounded-full bg-orange-500 text-black flex items-center justify-center shrink-0 hover:scale-105 transition-transform" onClick={() => playAudio(file)}>
                                                {playingId === file.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                                            </button>
                                            <button className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white flex items-center justify-center gap-2 transition-colors" onClick={() => downloadAudio(file)}>
                                                <Download className="w-3 h-3" /> İndir
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center text-xs text-orange-400 py-2">
                                            {file.status === 'extracting' ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Çıkarılıyor</span> : 'Bekleniyor'}
                                        </div>
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
