"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    X,
    Combine,
    Loader2,
    Download,
    GripVertical,
    Trash2,
    Play,
    Pause,
    Plus,
    Music,
    ArrowUp,
    ArrowDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/LanguageContext";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { AudioFile, formatFileSize, formatAudioTime } from "@/lib/types";

interface AudioMergeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialFiles?: AudioFile[];
}

export default function AudioMergeDialog({ isOpen, onClose, initialFiles = [] }: AudioMergeDialogProps) {
    const { t, language } = useTranslation();
    const [files, setFiles] = useState<AudioFile[]>(initialFiles);
    const [isMerging, setIsMerging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

    const ffmpegRef = useRef<FFmpeg | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load FFmpeg
    useEffect(() => {
        if (!isOpen) return;

        const loadFFmpeg = async () => {
            if (ffmpegRef.current) {
                setFfmpegLoaded(true);
                return;
            }

            const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
            const ffmpeg = new FFmpeg();
            ffmpeg.on("progress", ({ progress }) => {
                setProgress(Math.round(progress * 100));
            });

            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
            });

            ffmpegRef.current = ffmpeg;
            setFfmpegLoaded(true);
        };

        loadFFmpeg().catch(console.error);
    }, [isOpen]);

    // Update files when initialFiles change
    useEffect(() => {
        if (initialFiles.length > 0) {
            setFiles(initialFiles);
        }
    }, [initialFiles]);

    // Cleanup on close
    useEffect(() => {
        if (!isOpen) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            setPlayingId(null);
            setProgress(0);
        }
    }, [isOpen]);

    const addFiles = (newFiles: File[]) => {
        const audioFiles: AudioFile[] = [];

        newFiles.forEach((file) => {
            const ext = file.name.split(".").pop()?.toUpperCase() || "MP3";
            const audioUrl = URL.createObjectURL(file);

            const audio = new Audio(audioUrl);
            audio.onloadedmetadata = () => {
                const audioFile: AudioFile = {
                    id: Math.random().toString(36).substring(2, 15),
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
                setFiles(prev => [...prev, audioFile]);
            };
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const selectedFiles = Array.from(e.target.files);
        addFiles(selectedFiles);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (id: string) => {
        const file = files.find(f => f.id === id);
        if (file?.audioUrl) {
            URL.revokeObjectURL(file.audioUrl);
        }
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const moveFile = (id: string, direction: 'up' | 'down') => {
        const index = files.findIndex(f => f.id === id);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= files.length) return;

        const newFiles = [...files];
        [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
        setFiles(newFiles);
    };

    const playAudio = (audioFile: AudioFile) => {
        if (playingId === audioFile.id) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }

        if (audioFile.audioUrl) {
            const audio = new Audio(audioFile.audioUrl);
            audio.onended = () => setPlayingId(null);
            audio.play();
            audioRef.current = audio;
            setPlayingId(audioFile.id);
        }
    };

    const handleMerge = async () => {
        if (files.length < 2 || !ffmpegLoaded || !ffmpegRef.current) return;

        setIsMerging(true);
        setProgress(0);

        const ffmpeg = ffmpegRef.current;

        try {
            // Write all files to FFmpeg FS
            const inputNames: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const inputName = `input${i}.${file.originalFormat.toLowerCase()}`;
                inputNames.push(inputName);

                const fileData = file.convertedBlob || file.file;
                if (fileData) {
                    await ffmpeg.writeFile(inputName, await fetchFile(fileData));
                } else if (file.audioUrl) {
                    await ffmpeg.writeFile(inputName, await fetchFile(file.audioUrl));
                }
            }

            // Create concat file list
            const concatList = inputNames.map(name => `file '${name}'`).join('\n');
            await ffmpeg.writeFile('concat.txt', concatList);

            // Determine output format (use first file's format)
            const outputFormat = files[0].originalFormat.toLowerCase();
            const outputName = `merged.${outputFormat}`;

            // Run FFmpeg concat command
            await ffmpeg.exec([
                '-f', 'concat',
                '-safe', '0',
                '-i', 'concat.txt',
                '-c', 'copy',
                outputName
            ]);

            // Read result and download
            const data = await ffmpeg.readFile(outputName);
            const blob = new Blob([data as BlobPart], { type: `audio/${outputFormat}` });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `merged_audio.${outputFormat}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Cleanup
            for (const name of inputNames) {
                await ffmpeg.deleteFile(name);
            }
            await ffmpeg.deleteFile('concat.txt');
            await ffmpeg.deleteFile(outputName);

            onClose();
        } catch (error) {
            console.error("Merge error:", error);
        } finally {
            setIsMerging(false);
            setProgress(0);
        }
    };

    const totalDuration = files.reduce((acc, f) => acc + (f.duration || 0), 0);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Combine className="w-5 h-5 text-purple-400" />
                        {language === 'tr' ? 'Ses Birleştir' : 'Merge Audio'}
                    </DialogTitle>
                </DialogHeader>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp3,.wav,.m4a,.flac,.ogg,.aac,.wma"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                />

                {/* Loading FFmpeg */}
                {!ffmpegLoaded && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        <span className="ml-3 text-zinc-400">
                            {language === 'tr' ? 'Ses işleyici yükleniyor...' : 'Loading audio processor...'}
                        </span>
                    </div>
                )}

                {ffmpegLoaded && (
                    <>
                        {/* File List */}
                        <div className="flex-1 overflow-y-auto space-y-2 py-4">
                            {files.length === 0 ? (
                                <div
                                    className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Music className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                    <p className="text-zinc-400">
                                        {language === 'tr' ? 'Birleştirmek için ses dosyaları ekleyin' : 'Add audio files to merge'}
                                    </p>
                                    <Button variant="secondary" className="mt-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20">
                                        <Plus className="w-4 h-4 mr-2" />
                                        {language === 'tr' ? 'Dosya Ekle' : 'Add Files'}
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {files.map((file, index) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors"
                                        >
                                            {/* Order number */}
                                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-sm">
                                                {index + 1}
                                            </div>

                                            {/* Play button */}
                                            <button
                                                onClick={() => playAudio(file)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${playingId === file.id ? "bg-purple-500 text-black" : "bg-zinc-800 text-white hover:bg-zinc-700"}`}
                                            >
                                                {playingId === file.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                                            </button>

                                            {/* File info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{file.name}</p>
                                                <p className="text-xs text-zinc-500">
                                                    {formatFileSize(file.size)} • {formatAudioTime(file.duration || 0)}
                                                </p>
                                            </div>

                                            {/* Move buttons */}
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => moveFile(file.id, 'up')}
                                                    disabled={index === 0}
                                                    className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                                                >
                                                    <ArrowUp className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => moveFile(file.id, 'down')}
                                                    disabled={index === files.length - 1}
                                                    className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                                                >
                                                    <ArrowDown className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Delete button */}
                                            <button
                                                onClick={() => removeFile(file.id)}
                                                className="p-1.5 text-zinc-500 hover:text-red-400 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Add more button */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full p-3 rounded-xl border border-dashed border-white/10 text-zinc-500 hover:text-purple-400 hover:border-purple-500/50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {language === 'tr' ? 'Daha Fazla Ekle' : 'Add More'}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        {files.length > 0 && (
                            <div className="shrink-0 pt-4 border-t border-white/5">
                                {/* Summary */}
                                <div className="flex items-center justify-between mb-4 text-sm text-zinc-400">
                                    <span>{files.length} {language === 'tr' ? 'dosya' : 'files'}</span>
                                    <span>{language === 'tr' ? 'Toplam süre:' : 'Total duration:'} {formatAudioTime(totalDuration)}</span>
                                </div>

                                {/* Progress */}
                                {isMerging && (
                                    <div className="mb-4">
                                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 transition-all duration-300"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-zinc-500 mt-1 text-center">{progress}%</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={onClose}
                                        className="flex-1"
                                        disabled={isMerging}
                                    >
                                        {language === 'tr' ? 'İptal' : 'Cancel'}
                                    </Button>
                                    <Button
                                        onClick={handleMerge}
                                        disabled={files.length < 2 || isMerging}
                                        className="flex-1 bg-purple-500 hover:bg-purple-400 text-white"
                                    >
                                        {isMerging ? (
                                            <><Loader2 className="w-4 h-4 animate-spin mr-2" />{language === 'tr' ? 'Birleştiriliyor...' : 'Merging...'}</>
                                        ) : (
                                            <><Download className="w-4 h-4 mr-2" />{language === 'tr' ? 'Birleştir ve İndir' : 'Merge & Download'}</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
