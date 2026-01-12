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

    return (
        <div className="space-y-8">
            {/* Unified Drop Zone / File List */}
            <div
                className={`relative rounded-2xl transition-all duration-300 ${files.length === 0 ? "bg-zinc-900/40" : "bg-zinc-900/30"
                    } ${isDragging ? "ring-2 ring-orange-500/50 bg-orange-500/5" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                {/* Drop Zone Header */}
                <div
                    className={`cursor-pointer transition-all ${files.length === 0 ? "p-16" : "p-6 border-b border-white/5"}`}
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

                    <div className={`flex items-center ${files.length === 0 ? "flex-col text-center" : "gap-4"}`}>
                        <div className={`rounded-xl transition-all ${files.length === 0 ? "p-5 bg-white/5 mb-5" : "p-3 bg-white/5"
                            } ${isDragging ? "bg-orange-500/10" : ""}`}>
                            <Video className={`transition-all ${files.length === 0 ? "h-10 w-10" : "h-5 w-5"
                                } ${isDragging ? "text-orange-400" : "text-white/30"}`} />
                        </div>

                        <div className={files.length === 0 ? "" : "flex-1"}>
                            <p className={`font-medium ${files.length === 0 ? "text-lg text-white/80 mb-2" : "text-sm text-white/60"}`}>
                                {files.length === 0
                                    ? "Video dosyalarını sürükleyip bırakın"
                                    : "Daha fazla video eklemek için tıklayın veya sürükleyin"}
                            </p>
                            {files.length === 0 && (
                                <p className="text-sm text-white/40 mb-4">
                                    veya <span className="text-orange-400">dosya seçmek için tıklayın</span>
                                </p>
                            )}
                            <div className={`flex flex-wrap gap-1.5 ${files.length === 0 ? "justify-center" : ""}`}>
                                {["MP4", "WEBM", "MKV", "AVI", "MOV"].slice(0, files.length === 0 ? 5 : 3).map((format) => (
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
                                    {/* Video Info */}
                                    <div className="flex items-center gap-4 min-w-[280px]">
                                        <div className="p-2.5 rounded-lg bg-orange-500/10">
                                            <Video className="h-4 w-4 text-orange-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-white/90 truncate max-w-[200px]">{file.name}</p>
                                            <p className="text-xs text-white/40 mt-0.5">
                                                {formatFileSize(file.size)} • {formatAudioTime(file.duration || 0)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Audio Player (after extraction) */}
                                    <div className="flex-1 flex items-center gap-3 min-w-[200px]">
                                        {file.status === "done" && file.audioUrl ? (
                                            <>
                                                <button
                                                    className={`p-2 rounded-full transition-all ${playingId === file.id
                                                            ? "bg-orange-500 text-white"
                                                            : "bg-white/5 text-white/50 hover:bg-white/10"
                                                        }`}
                                                    onClick={() => playAudio(file)}
                                                >
                                                    {playingId === file.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                                </button>
                                                <div
                                                    className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer overflow-hidden"
                                                    onClick={(e) => seekAudio(file.id, e)}
                                                >
                                                    <div
                                                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
                                                        style={{
                                                            width: playingId === file.id && file.duration
                                                                ? `${(currentTime / file.duration) * 100}%`
                                                                : '0%'
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs text-white/30 font-mono">
                                                    {formatAudioTime(file.duration || 0)}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-sm text-white/20 italic">
                                                {file.status === "extracting" ? "Çıkarılıyor..." : "Ses bekleniyor"}
                                            </span>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className="w-24 text-center">
                                        {file.status === "waiting" && <span className="text-xs text-white/40">Bekliyor</span>}
                                        {file.status === "extracting" && (
                                            <span className="text-xs text-orange-400 flex items-center justify-center gap-1.5">
                                                <Loader2 className="h-3 w-3 animate-spin" />%{file.progress}
                                            </span>
                                        )}
                                        {file.status === "done" && (
                                            <span className="text-xs text-emerald-400 flex items-center justify-center gap-1">
                                                <CheckCircle className="h-3 w-3" />Tamam
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1">
                                        {file.status === "done" && (
                                            <button
                                                className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                                onClick={() => downloadAudio(file)}
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                        )}
                                        <button
                                            className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            onClick={() => removeFile(file.id)}
                                            disabled={file.status === "extracting"}
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

            {/* Action Bar */}
            {files.length > 0 && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm">
                        <span className="text-white/40">
                            <span className="text-white font-medium">{files.length}</span> video
                        </span>
                        {completedFilesCount > 0 && (
                            <span className="text-emerald-400/80">
                                <span className="font-medium">{completedFilesCount}</span> çıkarıldı
                            </span>
                        )}
                        {isExtracting && (
                            <div className="flex items-center gap-3">
                                <Progress value={overallProgress} className="w-32 h-1" />
                                <span className="text-white/40">{Math.round(overallProgress)}%</span>
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={extractAll}
                        disabled={isExtracting || waitingFilesCount === 0}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-0 px-6"
                    >
                        {isExtracting ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Çıkarılıyor</>
                        ) : (
                            <>
                                <Scissors className="h-4 w-4 mr-2" />
                                Ses Çıkar
                                {waitingFilesCount > 0 && (
                                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-white/20 rounded">{waitingFilesCount}</span>
                                )}
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
