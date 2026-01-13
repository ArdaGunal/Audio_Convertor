"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Scissors,
    Combine,
    Volume2,
    Upload,
    Music,
    Play,
    Pause,
    Trash2,
    Loader2,
    Download,
    GripVertical,
    ZoomIn,
    ZoomOut,
    Square,
    SkipBack,
    SkipForward,
    Plus,
    X,
    Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AudioFile,
    SUPPORTED_AUDIO_EXTENSIONS,
    generateId,
    formatAudioTime
} from "@/lib/types";
import { useTranslation } from "@/lib/LanguageContext";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { saveFileToStorage, loadFilesFromStorage, deleteFileFromStorage, updateFileInStorage } from "@/lib/storage";

export default function AudioToolsSection() {
    const { language } = useTranslation();

    // Files state
    const [files, setFiles] = useState<AudioFile[]>([]);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
    const [isDragging, setIsDragging] = useState(false);

    // Wavesurfer state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [zoom, setZoom] = useState(50);
    const [regionStart, setRegionStart] = useState<number | null>(null);
    const [regionEnd, setRegionEnd] = useState<number | null>(null);

    // Processing state
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState("");
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

    // Refs
    const waveformRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<any>(null);
    const regionRef = useRef<any>(null);
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load FFmpeg
    useEffect(() => {
        const loadFFmpeg = async () => {
            if (ffmpegRef.current) {
                setFfmpegLoaded(true);
                return;
            }
            try {
                const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
                const ffmpeg = new FFmpeg();
                await ffmpeg.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
                });
                ffmpegRef.current = ffmpeg;
                setFfmpegLoaded(true);
            } catch (error) {
                console.error("FFmpeg load error:", error);
            }
        };
        loadFFmpeg();

        // Load saved files from IndexedDB
        loadFilesFromStorage('editor').then(async (storedFiles) => {
            const restoredFiles: AudioFile[] = storedFiles.map((sf) => ({
                id: sf.id,
                name: sf.name,
                size: sf.size,
                originalFormat: sf.originalFormat,
                targetFormat: sf.targetFormat,
                status: sf.status,
                progress: 0,
                duration: sf.duration,
                audioUrl: sf.blob ? URL.createObjectURL(sf.blob) : undefined,
                convertedBlob: sf.blob,
            }));
            setFiles(restoredFiles);
            if (restoredFiles.length > 0) {
                setActiveFileId(restoredFiles[0].id);
            }
        }).catch(console.error);
    }, []);

    // Initialize WaveSurfer when active file changes
    useEffect(() => {
        if (!waveformRef.current) return;

        const activeFile = files.find(f => f.id === activeFileId);
        if (!activeFile?.audioUrl) {
            // Cleanup existing wavesurfer
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
                wavesurferRef.current = null;
            }
            return;
        }

        // Dynamic import of wavesurfer
        const initWaveSurfer = async () => {
            const WaveSurfer = (await import('wavesurfer.js')).default;
            const RegionsPlugin = (await import('wavesurfer.js/dist/plugins/regions.js')).default;
            const TimelinePlugin = (await import('wavesurfer.js/dist/plugins/timeline.js')).default;

            // Destroy previous instance
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
            }

            // Create regions plugin
            const regions = RegionsPlugin.create();

            // Create wavesurfer instance
            const ws = WaveSurfer.create({
                container: waveformRef.current!,
                waveColor: '#22d3ee',
                progressColor: '#a855f7',
                cursorColor: '#ffffff',
                cursorWidth: 2,
                height: 120,
                barWidth: 2,
                barGap: 1,
                barRadius: 2,
                plugins: [
                    regions,
                    TimelinePlugin.create({
                        container: timelineRef.current!,
                        timeInterval: 0.5,
                        primaryLabelInterval: 5,
                    }),
                ],
            });

            // Load audio - use blob if available, otherwise fetch from URL
            if (activeFile.convertedBlob) {
                ws.loadBlob(activeFile.convertedBlob);
            } else if (activeFile.file) {
                ws.loadBlob(activeFile.file);
            } else if (activeFile.audioUrl) {
                // For blob URLs, fetch and convert to blob first
                fetch(activeFile.audioUrl)
                    .then(res => res.blob())
                    .then(blob => ws.loadBlob(blob))
                    .catch(err => console.error('Audio load error:', err));
            }

            // Events
            ws.on('ready', () => {
                setDuration(ws.getDuration());
                setCurrentTime(0);
                setRegionStart(null);
                setRegionEnd(null);
                regionRef.current = null;
            });

            ws.on('timeupdate', (time: number) => {
                setCurrentTime(time);
            });

            ws.on('play', () => setIsPlaying(true));
            ws.on('pause', () => setIsPlaying(false));
            ws.on('finish', () => setIsPlaying(false));

            // Enable region creation on click-drag
            regions.enableDragSelection({
                color: 'rgba(168, 85, 247, 0.3)',
            });

            regions.on('region-created', (region: any) => {
                // Remove previous region
                if (regionRef.current && regionRef.current.id !== region.id) {
                    regionRef.current.remove();
                }
                regionRef.current = region;
                setRegionStart(region.start);
                setRegionEnd(region.end);
            });

            regions.on('region-updated', (region: any) => {
                setRegionStart(region.start);
                setRegionEnd(region.end);
            });

            wavesurferRef.current = ws;
        };

        initWaveSurfer();

        return () => {
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
                wavesurferRef.current = null;
            }
        };
    }, [activeFileId, files]);

    // Update zoom
    useEffect(() => {
        if (wavesurferRef.current) {
            wavesurferRef.current.zoom(zoom);
        }
    }, [zoom]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && wavesurferRef.current) {
                e.preventDefault();
                wavesurferRef.current.playPause();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // File handling
    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
            SUPPORTED_AUDIO_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
        );
        addFiles(droppedFiles);
    }, []);

    const addFiles = async (newFiles: File[]) => {
        for (const file of newFiles) {
            const ext = file.name.split(".").pop()?.toUpperCase() || "MP3";
            const audioUrl = URL.createObjectURL(file);
            const id = generateId();

            const audio = new Audio(audioUrl);
            audio.onloadedmetadata = async () => {
                const audioFile: AudioFile = {
                    id,
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

                try {
                    await saveFileToStorage({
                        id,
                        name: file.name,
                        size: file.size,
                        originalFormat: ext,
                        targetFormat: ext,
                        status: "waiting",
                        blob: file,
                        duration: audio.duration,
                        progress: 0,
                        timestamp: Date.now(),
                    }, 'editor');
                } catch (e) {
                    console.error('Failed to save to storage:', e);
                }

                setFiles(prev => {
                    const updated = [...prev, audioFile];
                    if (!activeFileId && updated.length === 1) {
                        setActiveFileId(audioFile.id);
                    }
                    return updated;
                });
            };
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        addFiles(Array.from(e.target.files));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = async (id: string) => {
        const file = files.find(f => f.id === id);
        if (file?.audioUrl) URL.revokeObjectURL(file.audioUrl);
        setFiles(prev => prev.filter(f => f.id !== id));
        setSelectedForMerge(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
        if (activeFileId === id) {
            const remaining = files.filter(f => f.id !== id);
            setActiveFileId(remaining.length > 0 ? remaining[0].id : null);
        }
        // Delete from IndexedDB
        try {
            await deleteFileFromStorage(id, 'editor');
        } catch (e) {
            console.error('Failed to delete from storage:', e);
        }
    };

    const selectFile = (id: string) => {
        if (wavesurferRef.current && isPlaying) {
            wavesurferRef.current.pause();
        }
        setActiveFileId(id);
    };

    // Move file in list (for merge order)
    const moveFile = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= files.length) return;
        const newFiles = [...files];
        const [moved] = newFiles.splice(fromIndex, 1);
        newFiles.splice(toIndex, 0, moved);
        setFiles(newFiles);
    };

    // Playback controls
    const togglePlay = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause();
        }
    };

    const stop = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.stop();
        }
    };

    const skipBack = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.setTime(Math.max(0, currentTime - 5));
        }
    };

    const skipForward = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.setTime(Math.min(duration, currentTime + 5));
        }
    };

    // Audio processing functions
    const processAudio = async (operation: 'crop' | 'cut' | 'fadeIn' | 'fadeOut' | 'normalize') => {
        const activeFile = files.find(f => f.id === activeFileId);
        if (!activeFile || !ffmpegLoaded || !ffmpegRef.current) return;

        if ((operation === 'crop' || operation === 'cut' || operation === 'fadeIn' || operation === 'fadeOut') &&
            (regionStart === null || regionEnd === null)) {
            alert(language === 'tr' ? 'Lütfen bir bölge seçin' : 'Please select a region');
            return;
        }

        setIsProcessing(true);
        setProcessingMessage(language === 'tr' ? 'İşleniyor...' : 'Processing...');

        const ffmpeg = ffmpegRef.current;
        const ext = activeFile.originalFormat.toLowerCase();
        const inputName = `input.${ext}`;
        const outputName = `output.${ext}`;

        try {
            // Write input file
            const fileData = activeFile.convertedBlob || activeFile.file;
            if (fileData) {
                await ffmpeg.writeFile(inputName, await fetchFile(fileData));
            } else if (activeFile.audioUrl) {
                await ffmpeg.writeFile(inputName, await fetchFile(activeFile.audioUrl));
            }

            // Execute operation
            switch (operation) {
                case 'crop':
                    await ffmpeg.exec([
                        '-i', inputName,
                        '-ss', regionStart!.toString(),
                        '-to', regionEnd!.toString(),
                        '-c', 'copy',
                        outputName
                    ]);
                    break;

                case 'cut':
                    // Cut removes the selected region and merges the rest
                    const beforeEnd = regionStart!;
                    const afterStart = regionEnd!;
                    await ffmpeg.exec([
                        '-i', inputName,
                        '-filter_complex',
                        `[0]atrim=0:${beforeEnd}[a];[0]atrim=${afterStart}[b];[a][b]concat=n=2:v=0:a=1[out]`,
                        '-map', '[out]',
                        outputName
                    ]);
                    break;

                case 'fadeIn':
                    const fadeInDuration = regionEnd! - regionStart!;
                    await ffmpeg.exec([
                        '-i', inputName,
                        '-af', `afade=t=in:st=${regionStart}:d=${fadeInDuration}`,
                        outputName
                    ]);
                    break;

                case 'fadeOut':
                    const fadeOutDuration = regionEnd! - regionStart!;
                    await ffmpeg.exec([
                        '-i', inputName,
                        '-af', `afade=t=out:st=${regionStart}:d=${fadeOutDuration}`,
                        outputName
                    ]);
                    break;

                case 'normalize':
                    await ffmpeg.exec([
                        '-i', inputName,
                        '-af', 'loudnorm=I=-16:LRA=11:TP=-1.5',
                        outputName
                    ]);
                    break;
            }

            // Read output and update file
            const data = await ffmpeg.readFile(outputName);
            const blob = new Blob([data as BlobPart], { type: `audio/${ext}` });
            const newUrl = URL.createObjectURL(blob);

            // Update file in state
            const audio = new Audio(newUrl);
            audio.onloadedmetadata = async () => {
                setFiles(prev => prev.map(f => {
                    if (f.id === activeFileId) {
                        if (f.audioUrl) URL.revokeObjectURL(f.audioUrl);
                        return {
                            ...f,
                            audioUrl: newUrl,
                            convertedBlob: blob,
                            duration: audio.duration,
                        };
                    }
                    return f;
                }));

                // Update in IndexedDB
                try {
                    await updateFileInStorage(activeFileId!, { blob, duration: audio.duration }, 'editor');
                } catch (e) {
                    console.error('Failed to update in storage:', e);
                }

                // Force reload waveform
                setActiveFileId(null);
                setTimeout(() => setActiveFileId(activeFileId), 100);
            };

            // Cleanup
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);

        } catch (error) {
            console.error(`${operation} error:`, error);
            alert(language === 'tr' ? 'İşlem sırasında hata oluştu' : 'Error during processing');
        } finally {
            setIsProcessing(false);
            setProcessingMessage("");
        }
    };

    // Toggle file selection for merge
    const toggleMergeSelect = (id: string) => {
        setSelectedForMerge(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Merge selected files in order
    const mergeFiles = async () => {
        const filesToMerge = files.filter(f => selectedForMerge.has(f.id));
        if (filesToMerge.length < 2 || !ffmpegLoaded || !ffmpegRef.current) return;

        setIsProcessing(true);
        setProcessingMessage(language === 'tr' ? 'Birleştiriliyor...' : 'Merging...');

        const ffmpeg = ffmpegRef.current;

        try {
            // Write selected files
            const inputNames: string[] = [];
            for (let i = 0; i < filesToMerge.length; i++) {
                const file = filesToMerge[i];
                const ext = file.originalFormat.toLowerCase();
                const inputName = `input${i}.${ext}`;
                inputNames.push(inputName);

                const fileData = file.convertedBlob || file.file;
                if (fileData) {
                    await ffmpeg.writeFile(inputName, await fetchFile(fileData));
                } else if (file.audioUrl) {
                    await ffmpeg.writeFile(inputName, await fetchFile(file.audioUrl));
                }
            }

            // Create concat list
            const concatList = inputNames.map(name => `file '${name}'`).join('\n');
            await ffmpeg.writeFile('concat.txt', concatList);

            const outputExt = filesToMerge[0].originalFormat.toLowerCase();
            const outputName = `merged.${outputExt}`;

            // Merge
            await ffmpeg.exec([
                '-f', 'concat',
                '-safe', '0',
                '-i', 'concat.txt',
                '-c', 'copy',
                outputName
            ]);

            // Read result
            const data = await ffmpeg.readFile(outputName);
            const blob = new Blob([data as BlobPart], { type: `audio/${outputExt}` });
            const newUrl = URL.createObjectURL(blob);

            // Create merged file object
            const audio = new Audio(newUrl);
            audio.onloadedmetadata = async () => {
                const mergedFile: AudioFile = {
                    id: generateId(),
                    name: language === 'tr' ? 'Birleştirilmiş.mp3' : 'Merged.mp3',
                    size: blob.size,
                    originalFormat: outputExt.toUpperCase(),
                    targetFormat: outputExt.toUpperCase(),
                    status: "done",
                    progress: 100,
                    audioUrl: newUrl,
                    convertedBlob: blob,
                    duration: audio.duration,
                };

                // Remove merged files, keep others, add merged result
                const mergedIds = new Set(filesToMerge.map(f => f.id));
                filesToMerge.forEach(f => {
                    if (f.audioUrl) URL.revokeObjectURL(f.audioUrl);
                });
                setFiles(prev => {
                    const remaining = prev.filter(f => !mergedIds.has(f.id));
                    return [...remaining, mergedFile];
                });
                setActiveFileId(mergedFile.id);
                setSelectedForMerge(new Set());

                // Update IndexedDB: delete merged files, save new merged file
                try {
                    for (const f of filesToMerge) {
                        await deleteFileFromStorage(f.id, 'editor');
                    }
                    await saveFileToStorage({
                        id: mergedFile.id,
                        name: mergedFile.name,
                        size: mergedFile.size,
                        originalFormat: mergedFile.originalFormat,
                        targetFormat: mergedFile.targetFormat,
                        status: "done",
                        blob: blob,
                        duration: audio.duration,
                        progress: 100,
                        timestamp: Date.now(),
                    }, 'editor');
                } catch (e) {
                    console.error('Failed to update storage after merge:', e);
                }
            };

            // Cleanup
            for (const name of inputNames) {
                await ffmpeg.deleteFile(name);
            }
            await ffmpeg.deleteFile('concat.txt');
            await ffmpeg.deleteFile(outputName);

        } catch (error) {
            console.error("Merge error:", error);
            alert(language === 'tr' ? 'Birleştirme hatası' : 'Merge error');
        } finally {
            setIsProcessing(false);
            setProcessingMessage("");
        }
    };

    // Export/Download active file
    const exportFile = () => {
        const activeFile = files.find(f => f.id === activeFileId);
        if (!activeFile) return;

        const blob = activeFile.convertedBlob || activeFile.file;
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const activeFile = files.find(f => f.id === activeFileId);
    const hasRegion = regionStart !== null && regionEnd !== null;

    return (
        <div
            className="h-full flex flex-col gap-4"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragging && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <Upload className="w-20 h-20 text-purple-400 mx-auto mb-4 animate-bounce" />
                        <h3 className="text-2xl font-bold text-white">{language === 'tr' ? 'Dosyaları Bırakın' : 'Drop Files'}</h3>
                    </div>
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={SUPPORTED_AUDIO_EXTENSIONS.join(",")}
                multiple
                className="hidden"
                onChange={handleFileSelect}
            />

            {/* Processing Overlay */}
            {isProcessing && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center">
                        <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
                        <p className="text-lg text-white">{processingMessage}</p>
                    </div>
                </div>
            )}

            {/* FFmpeg Loading */}
            {!ffmpegLoaded && (
                <div className="flex items-center justify-center gap-3 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    <span className="text-zinc-400">{language === 'tr' ? 'Ses işleyici yükleniyor...' : 'Loading audio processor...'}</span>
                </div>
            )}

            {/* Main Editor (when files exist) */}
            {files.length > 0 ? (
                <>
                    {/* ===== WAVEFORM PANEL ===== */}
                    <div className="shrink-0 bg-zinc-900/50 rounded-2xl border border-white/5 p-4">
                        {/* File Name */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Music className="w-4 h-4 text-purple-400" />
                                <span className="text-white font-medium truncate">{activeFile?.name || 'No file selected'}</span>
                            </div>
                            {hasRegion && (
                                <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                                    {language === 'tr' ? 'Seçim' : 'Selection'}: {formatAudioTime(regionStart!)} - {formatAudioTime(regionEnd!)}
                                </span>
                            )}
                        </div>

                        {/* Timeline */}
                        <div ref={timelineRef} className="h-6 mb-1" />

                        {/* Waveform */}
                        <div ref={waveformRef} className="bg-zinc-950 rounded-xl overflow-hidden" style={{ minHeight: 120 }} />

                        {/* Playback Controls */}
                        <div className="flex items-center gap-4 mt-4">
                            {/* Play/Pause */}
                            <div className="flex items-center gap-1">
                                <button onClick={skipBack} className="p-2 text-zinc-400 hover:text-white transition-colors">
                                    <SkipBack className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={togglePlay}
                                    className="p-3 bg-purple-500 hover:bg-purple-400 text-white rounded-full transition-colors"
                                >
                                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                                </button>
                                <button onClick={stop} className="p-2 text-zinc-400 hover:text-white transition-colors">
                                    <Square className="w-4 h-4" />
                                </button>
                                <button onClick={skipForward} className="p-2 text-zinc-400 hover:text-white transition-colors">
                                    <SkipForward className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Time Display */}
                            <div className="text-sm font-mono text-zinc-400 bg-zinc-800 px-3 py-1 rounded">
                                {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
                            </div>

                            {/* Zoom */}
                            <div className="flex items-center gap-2 ml-auto">
                                <ZoomOut className="w-4 h-4 text-zinc-500" />
                                <input
                                    type="range"
                                    min={10}
                                    max={200}
                                    value={zoom}
                                    onChange={(e) => setZoom(parseInt(e.target.value))}
                                    className="w-24 accent-purple-500"
                                />
                                <ZoomIn className="w-4 h-4 text-zinc-500" />
                            </div>
                        </div>
                    </div>

                    {/* ===== EDITING TOOLBAR ===== */}
                    <div className="shrink-0 flex flex-wrap gap-2 p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => processAudio('crop')}
                            disabled={!hasRegion || isProcessing}
                            className="text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-40"
                        >
                            <Scissors className="w-4 h-4 mr-2" />
                            {language === 'tr' ? 'Seçimi Kırp' : 'Crop Selection'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => processAudio('cut')}
                            disabled={!hasRegion || isProcessing}
                            className="text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {language === 'tr' ? 'Seçimi Sil' : 'Cut Selection'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => processAudio('fadeIn')}
                            disabled={!hasRegion || isProcessing}
                            className="text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40"
                        >
                            <span className="mr-2">📈</span>
                            Fade In
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => processAudio('fadeOut')}
                            disabled={!hasRegion || isProcessing}
                            className="text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40"
                        >
                            <span className="mr-2">📉</span>
                            Fade Out
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => processAudio('normalize')}
                            disabled={isProcessing}
                            className="text-purple-400 hover:bg-purple-500/10 disabled:opacity-40"
                        >
                            <Volume2 className="w-4 h-4 mr-2" />
                            {language === 'tr' ? 'Normalize' : 'Normalize'}
                        </Button>
                    </div>

                    {/* ===== FILE POOL ===== */}
                    <div className="flex-1 min-h-0 flex flex-col bg-zinc-900/50 rounded-2xl border border-white/5 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-zinc-400">
                                {language === 'tr' ? 'Dosya Havuzu' : 'File Pool'} ({files.length})
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-purple-400 hover:bg-purple-500/10"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                {language === 'tr' ? 'Ekle' : 'Add'}
                            </Button>
                        </div>

                        {/* File List */}
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {files.map((file, index) => (
                                <div
                                    key={file.id}
                                    onClick={() => selectFile(file.id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${file.id === activeFileId
                                        ? 'bg-purple-500/10 border border-purple-500/30 ring-1 ring-purple-500/20'
                                        : 'bg-zinc-800/50 border border-transparent hover:border-white/10'
                                        }`}
                                >
                                    {/* Checkbox for merge */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleMergeSelect(file.id); }}
                                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedForMerge.has(file.id)
                                            ? 'bg-purple-500 border-purple-500'
                                            : 'border-zinc-600 hover:border-zinc-400'
                                            }`}
                                    >
                                        {selectedForMerge.has(file.id) && <Check className="w-3 h-3 text-white" />}
                                    </button>

                                    {/* Drag Handle & Index */}
                                    <div className="flex items-center gap-2">
                                        <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab" />
                                        <span className="w-6 h-6 flex items-center justify-center rounded bg-zinc-700 text-xs font-bold text-zinc-300">
                                            {index + 1}
                                        </span>
                                    </div>

                                    {/* Active indicator */}
                                    {file.id === activeFileId && (
                                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                    )}

                                    {/* File info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{file.name}</p>
                                        <p className="text-xs text-zinc-500">{formatAudioTime(file.duration || 0)}</p>
                                    </div>

                                    {/* Quick actions - only show for active file with selection */}
                                    {file.id === activeFileId && hasRegion && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); processAudio('crop'); }}
                                                disabled={isProcessing}
                                                className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors disabled:opacity-40"
                                                title={language === 'tr' ? 'Seçimi Kırp' : 'Crop Selection'}
                                            >
                                                <Scissors className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); processAudio('cut'); }}
                                                disabled={isProcessing}
                                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-40"
                                                title={language === 'tr' ? 'Seçimi Sil' : 'Cut Selection'}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Move buttons */}
                                    <div className="flex gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); moveFile(index, index - 1); }}
                                            disabled={index === 0}
                                            className="p-1 text-zinc-500 hover:text-white disabled:opacity-30"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); moveFile(index, index + 1); }}
                                            disabled={index === files.length - 1}
                                            className="p-1 text-zinc-500 hover:text-white disabled:opacity-30"
                                        >
                                            ▼
                                        </button>
                                    </div>

                                    {/* Delete */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                                        className="p-1 text-zinc-500 hover:text-red-400"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
                            {selectedForMerge.size >= 2 && (
                                <Button
                                    onClick={mergeFiles}
                                    disabled={isProcessing}
                                    className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white"
                                >
                                    <Combine className="w-4 h-4 mr-2" />
                                    {language === 'tr' ? `Seçilenleri Birleştir (${selectedForMerge.size})` : `Merge Selected (${selectedForMerge.size})`}
                                </Button>
                            )}
                            <Button
                                onClick={exportFile}
                                disabled={!activeFile || isProcessing}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                {language === 'tr' ? 'Dışa Aktar' : 'Export'}
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                /* ===== EMPTY STATE ===== */
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
                >
                    <Music className="w-20 h-20 text-zinc-600 mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {language === 'tr' ? 'Ses Düzenleme Stüdyosu' : 'Audio Editing Studio'}
                    </h2>
                    <p className="text-zinc-500 mb-6">
                        {language === 'tr' ? 'Düzenlemek için ses dosyalarını sürükleyin veya tıklayın' : 'Drag audio files here or click to select'}
                    </p>
                    <Button className="bg-purple-500 hover:bg-purple-400 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        {language === 'tr' ? 'Dosya Seç' : 'Select Files'}
                    </Button>
                </div>
            )}
        </div>
    );
}
