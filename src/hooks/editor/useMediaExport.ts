import { useState, useRef, useEffect, useCallback } from 'react';
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";
import { TimelineTrack, MediaFile } from '@/lib/types';

interface UseMediaExportProps {
    tracks: TimelineTrack[];
    files: MediaFile[];
    language: string;
}

export function useMediaExport({ tracks, files, language }: UseMediaExportProps) {
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportSuccessOpen, setExportSuccessOpen] = useState(false);
    const [exportedFileName, setExportedFileName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState("");
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

    const ffmpegRef = useRef<FFmpeg | null>(null);

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
    }, []);

    const handleExport = useCallback(() => {
        setExportDialogOpen(true);
    }, []);

    const handleExportConfirm = useCallback(async (format: string, quality: string) => {
        setIsExporting(true);
        setExportProgress(0);
        setExportDialogOpen(false);
        setProcessingMessage(language === 'tr' ? 'Dışa aktarılıyor... Lütfen bekleyin.' : 'Exporting... Please wait.');

        try {
            const ffmpeg = ffmpegRef.current;
            if (!ffmpeg) throw new Error('FFmpeg not loaded');

            // Setup progress listener
            const progressHandler = ({ progress }: { progress: number }) => {
                setExportProgress(Math.min(99, Math.max(0, progress * 100)));
            };
            ffmpeg.on('progress', progressHandler);

            const videoTrack = tracks.find(t => t.type === 'video');
            if (!videoTrack || videoTrack.clips.length === 0) {
                throw new Error(language === 'tr' ? 'Video clip bulunamadı' : 'No video clips found');
            }

            // Sort clips by start time
            const sortedClips = [...videoTrack.clips].sort((a, b) => a.startTime - b.startTime);

            // Write all input files
            const inputFiles: string[] = [];
            for (let i = 0; i < sortedClips.length; i++) {
                const clip = sortedClips[i];
                const file = files.find(f => f.id === clip.fileId);
                if (!file?.file) continue;

                const inputName = `input${i}.mp4`;
                await ffmpeg.writeFile(inputName, await fetchFile(file.file));
                inputFiles.push(inputName);
            }

            if (inputFiles.length === 0) {
                throw new Error(language === 'tr' ? 'İşlenecek dosya bulunamadı' : 'No files to process');
            }

            const timestamp = Date.now();
            let outputFile = '';
            let ffmpegArgs: string[] = [];

            // For single clip, just transcode
            if (inputFiles.length === 1) {
                if (format === 'mp4') {
                    outputFile = `export_${timestamp}.mp4`;
                    ffmpegArgs = ['-i', inputFiles[0], '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', outputFile];
                } else if (format === 'webm') {
                    outputFile = `export_${timestamp}.webm`;
                    ffmpegArgs = ['-i', inputFiles[0], '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-crf', '35', outputFile];
                } else if (format === 'mp3') {
                    outputFile = `export_${timestamp}.mp3`;
                    ffmpegArgs = ['-i', inputFiles[0], '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', outputFile];
                } else if (format === 'wav') {
                    outputFile = `export_${timestamp}.wav`;
                    ffmpegArgs = ['-i', inputFiles[0], '-vn', '-c:a', 'pcm_s16le', outputFile];
                }
            } else {
                // Multiple clips - create concat file
                const concatList = inputFiles.map(f => `file '${f}'`).join('\n');
                await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(concatList));

                if (format === 'mp4') {
                    outputFile = `export_${timestamp}.mp4`;
                    ffmpegArgs = ['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', outputFile];
                } else if (format === 'webm') {
                    outputFile = `export_${timestamp}.webm`;
                    ffmpegArgs = ['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-crf', '35', outputFile];
                } else if (format === 'mp3') {
                    outputFile = `export_${timestamp}.mp3`;
                    ffmpegArgs = ['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-vn', '-c:a', 'libmp3lame', '-q:a', '4', outputFile];
                } else if (format === 'wav') {
                    outputFile = `export_${timestamp}.wav`;
                    ffmpegArgs = ['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-vn', '-c:a', 'pcm_s16le', outputFile];
                }
            }

            await ffmpeg.exec(ffmpegArgs);
            // Remove listener
            // ffmpeg.off('progress', progressHandler); // Note: ffmpeg.off might not be available in all versions, but safe to ignore for now.

            // Complete progress
            setExportProgress(100);

            const data = await ffmpeg.readFile(outputFile) as Uint8Array;
            const blob = new Blob([data.buffer as ArrayBuffer], { type: `video/${format}` });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = outputFile;
            a.click();
            URL.revokeObjectURL(url);

            // Cleanup
            for (const inputFile of inputFiles) {
                await ffmpeg.deleteFile(inputFile);
            }
            if (inputFiles.length > 1) {
                await ffmpeg.deleteFile('concat.txt');
            }
            await ffmpeg.deleteFile(outputFile);

            setExportedFileName(outputFile);
            setExportSuccessOpen(true);
        } catch (error) {
            console.error('Export error:', error);
            alert(language === 'tr' ? 'Export hatası: ' + (error as Error).message : 'Export error: ' + (error as Error).message);
        } finally {
            setIsExporting(false);
            setProcessingMessage("");
        }
    }, [tracks, files, language]);

    return {
        exportDialogOpen,
        setExportDialogOpen,
        isExporting,
        exportProgress,
        exportSuccessOpen,
        setExportSuccessOpen,
        exportedFileName,
        isProcessing,
        processingMessage,
        ffmpegLoaded,
        handleExport,
        handleExportConfirm
    };
}
