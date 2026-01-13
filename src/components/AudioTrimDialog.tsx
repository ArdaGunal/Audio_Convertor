"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Scissors, Play, Pause, RotateCcw, Download, Loader2 } from "lucide-react";
import { AudioFile, formatAudioTime } from "@/lib/types";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { useTranslation } from "@/lib/LanguageContext";

interface AudioTrimDialogProps {
    isOpen: boolean;
    onClose: () => void;
    audioFile: AudioFile | null;
    onTrim: (fileId: string, startTime: number, endTime: number) => Promise<void>;
}

export default function AudioTrimDialog({ isOpen, onClose, audioFile, onTrim }: AudioTrimDialogProps) {
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isTrimming, setIsTrimming] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [waveformData, setWaveformData] = useState<number[]>([]);
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const { t } = useTranslation();

    // Load FFmpeg
    useEffect(() => {
        const loadFFmpeg = async () => {
            const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
            ffmpegRef.current = new FFmpeg();
            await ffmpegRef.current.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
            });
            setFfmpegLoaded(true);
        };
        loadFFmpeg();
    }, []);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize when dialog opens
    useEffect(() => {
        if (isOpen && audioFile) {
            setStartTime(0);
            setEndTime(audioFile.duration || 0);
            setCurrentTime(0);
            setIsPlaying(false);
            generateWaveform(audioFile.audioUrl!);
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [isOpen, audioFile]);

    // Generate simple waveform visualization
    const generateWaveform = async (audioUrl: string) => {
        try {
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const rawData = audioBuffer.getChannelData(0);
            const samples = 100; // Number of bars
            const blockSize = Math.floor(rawData.length / samples);
            const filteredData: number[] = [];

            for (let i = 0; i < samples; i++) {
                let sum = 0;
                for (let j = 0; j < blockSize; j++) {
                    sum += Math.abs(rawData[i * blockSize + j]);
                }
                filteredData.push(sum / blockSize);
            }

            // Normalize
            const maxVal = Math.max(...filteredData);
            const normalized = filteredData.map(val => val / maxVal);
            setWaveformData(normalized);
        } catch (error) {
            console.error("Waveform generation error:", error);
            // Fallback: generate random waveform
            const fallback = Array.from({ length: 100 }, () => Math.random() * 0.6 + 0.2);
            setWaveformData(fallback);
        }
    };

    // Play preview of selected range
    const playPreview = () => {
        if (!audioFile?.audioUrl) return;

        if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
            return;
        }

        const audio = new Audio(audioFile.audioUrl);
        audio.currentTime = startTime;

        audio.ontimeupdate = () => {
            setCurrentTime(audio.currentTime);
            if (audio.currentTime >= endTime) {
                audio.pause();
                setIsPlaying(false);
                setCurrentTime(startTime);
            }
        };

        audio.onended = () => {
            setIsPlaying(false);
            setCurrentTime(startTime);
        };

        audio.play();
        audioRef.current = audio;
        setIsPlaying(true);
    };

    // Handle waveform click to set position
    const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioFile?.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const clickTime = percentage * audioFile.duration;

        // Determine if we're setting start or end based on which is closer
        const distToStart = Math.abs(clickTime - startTime);
        const distToEnd = Math.abs(clickTime - endTime);

        if (distToStart < distToEnd) {
            setStartTime(Math.min(clickTime, endTime - 0.1));
        } else {
            setEndTime(Math.max(clickTime, startTime + 0.1));
        }
    };

    // Reset to full duration
    const resetSelection = () => {
        if (audioFile?.duration) {
            setStartTime(0);
            setEndTime(audioFile.duration);
        }
    };

    // Perform trim
    const handleTrim = async () => {
        if (!audioFile) return;
        setIsTrimming(true);
        try {
            await onTrim(audioFile.id, startTime, endTime);
            onClose();
        } catch (error) {
            console.error("Trim error:", error);
        } finally {
            setIsTrimming(false);
        }
    };

    // Trim and Download
    const handleDownloadTrimmed = async () => {
        if (!audioFile || !ffmpegLoaded || !ffmpegRef.current) return;
        setIsDownloading(true);

        const ffmpeg = ffmpegRef.current;
        const ext = audioFile.originalFormat.toLowerCase();
        const inputName = `input.${ext}`;
        const outputName = `trimmed.${ext}`;

        try {
            // Write file to FFmpeg FS
            const fileData = audioFile.convertedBlob || audioFile.file;
            if (fileData) {
                await ffmpeg.writeFile(inputName, await fetchFile(fileData));
            } else if (audioFile.audioUrl) {
                await ffmpeg.writeFile(inputName, await fetchFile(audioFile.audioUrl));
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
            const url = URL.createObjectURL(blob);

            // Download
            const a = document.createElement('a');
            a.href = url;
            const baseName = audioFile.name.replace(/\.[^/.]+$/, "");
            a.download = `${baseName}_trimmed.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Cleanup
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);
        } catch (error) {
            console.error("Download trim error:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    if (!audioFile) return null;

    const duration = audioFile.duration || 0;
    const selectedDuration = endTime - startTime;
    const startPercent = (startTime / duration) * 100;
    const endPercent = (endTime / duration) * 100;
    const currentPercent = (currentTime / duration) * 100;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Scissors className="w-5 h-5 text-cyan-400" />
                        {t.trim.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* File info */}
                    <div className="text-sm text-zinc-400">
                        <span className="font-medium text-white">{audioFile.name}</span>
                        <span className="mx-2">•</span>
                        <span>Toplam: {formatAudioTime(duration)}</span>
                    </div>

                    {/* Waveform visualization */}
                    <div
                        className="relative h-24 bg-zinc-900 rounded-xl overflow-hidden cursor-pointer border border-white/5"
                        onClick={handleWaveformClick}
                    >
                        {/* Waveform bars */}
                        <div className="absolute inset-0 flex items-center justify-center gap-[2px] px-2">
                            {waveformData.map((value, i) => {
                                const barPercent = (i / waveformData.length) * 100;
                                const isInRange = barPercent >= startPercent && barPercent <= endPercent;
                                return (
                                    <div
                                        key={i}
                                        className={`w-1 rounded-full transition-all ${isInRange ? 'bg-cyan-500' : 'bg-zinc-700'}`}
                                        style={{ height: `${value * 80}%` }}
                                    />
                                );
                            })}
                        </div>

                        {/* Selection overlay - left (trimmed) */}
                        <div
                            className="absolute top-0 bottom-0 left-0 bg-black/60"
                            style={{ width: `${startPercent}%` }}
                        />

                        {/* Selection overlay - right (trimmed) */}
                        <div
                            className="absolute top-0 bottom-0 right-0 bg-black/60"
                            style={{ width: `${100 - endPercent}%` }}
                        />

                        {/* Start handle */}
                        <div
                            className="absolute top-0 bottom-0 w-1 bg-green-500 cursor-ew-resize"
                            style={{ left: `${startPercent}%` }}
                        >
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-green-500 rounded text-[10px] font-bold text-black">
                                {formatAudioTime(startTime)}
                            </div>
                        </div>

                        {/* End handle */}
                        <div
                            className="absolute top-0 bottom-0 w-1 bg-red-500 cursor-ew-resize"
                            style={{ left: `${endPercent}%` }}
                        >
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 rounded text-[10px] font-bold text-white">
                                {formatAudioTime(endTime)}
                            </div>
                        </div>

                        {/* Playhead */}
                        {isPlaying && (
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-white"
                                style={{ left: `${currentPercent}%` }}
                            />
                        )}
                    </div>

                    {/* Time sliders */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-500 uppercase tracking-wider">{t.trim.start}</label>
                            <input
                                type="range"
                                min={0}
                                max={duration}
                                step={0.1}
                                value={startTime}
                                onChange={(e) => setStartTime(Math.min(parseFloat(e.target.value), endTime - 0.1))}
                                className="w-full accent-green-500"
                            />
                            <div className="text-center font-mono text-lg text-green-400">{formatAudioTime(startTime)}</div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-500 uppercase tracking-wider">{t.trim.end}</label>
                            <input
                                type="range"
                                min={0}
                                max={duration}
                                step={0.1}
                                value={endTime}
                                onChange={(e) => setEndTime(Math.max(parseFloat(e.target.value), startTime + 0.1))}
                                className="w-full accent-red-500"
                            />
                            <div className="text-center font-mono text-lg text-red-400">{formatAudioTime(endTime)}</div>
                        </div>
                    </div>

                    {/* Duration info */}
                    <div className="text-center p-3 bg-zinc-900/50 rounded-lg border border-white/5">
                        <span className="text-zinc-500">{t.trim.selectedDuration}: </span>
                        <span className="font-mono text-xl text-cyan-400">{formatAudioTime(selectedDuration)}</span>
                        <span className="text-zinc-600 ml-2">/ {formatAudioTime(duration)}</span>
                    </div>

                    {/* Preview controls */}
                    <div className="flex justify-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={playPreview}
                            className="border-white/10 bg-white/5 hover:bg-white/10 text-white gap-2"
                        >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {isPlaying ? t.trim.stop : t.trim.preview}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetSelection}
                            className="border-white/10 bg-white/5 hover:bg-white/10 text-white gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            {t.trim.reset}
                        </Button>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:justify-between">
                    <DialogClose asChild>
                        <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/10">
                            {t.trim.cancel}
                        </Button>
                    </DialogClose>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleDownloadTrimmed}
                            disabled={isDownloading || !ffmpegLoaded || selectedDuration < 0.1}
                            className="border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold gap-2"
                        >
                            {isDownloading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" />{t.trim.downloading}</>
                            ) : (
                                <><Download className="w-4 h-4" />{t.trim.download}</>
                            )}
                        </Button>
                        <Button
                            onClick={handleTrim}
                            disabled={isTrimming || selectedDuration < 0.1}
                            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold gap-2"
                        >
                            {isTrimming ? (
                                <>{t.trim.trimming}</>
                            ) : (
                                <>
                                    <Scissors className="w-4 h-4" />
                                    {t.trim.trim}
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
