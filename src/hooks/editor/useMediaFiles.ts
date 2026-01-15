import { useState, useRef, useEffect, useCallback } from 'react';
import { MediaFile, SUPPORTED_VIDEO_EXTENSIONS, generateId } from '@/lib/types';
import { saveFileToStorage, deleteFileFromStorage, loadFilesFromStorage } from '@/lib/storage';

export function useMediaFiles() {
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load saved files from IndexedDB
        loadFilesFromStorage('editor').then(async (storedFiles) => {
            const restoredFiles: MediaFile[] = storedFiles.map((sf) => ({
                id: sf.id,
                name: sf.name,
                size: sf.size,
                type: sf.name.match(/\.(mp4|webm|mkv|avi|mov|wmv|flv)$/i) ? 'video' : 'audio',
                originalFormat: sf.originalFormat,
                targetFormat: sf.targetFormat,
                status: sf.status === 'converting' ? 'processing' : sf.status,
                progress: 0,
                duration: sf.duration,
                url: sf.blob ? URL.createObjectURL(sf.blob) : undefined,
                file: sf.blob as File,
            }));
            setFiles(restoredFiles);
        }).catch(err => console.error('Failed to load files:', err));
    }, []);

    const detectFileType = (fileName: string): 'audio' | 'video' => {
        const ext = fileName.toLowerCase();
        if (SUPPORTED_VIDEO_EXTENSIONS.some(e => ext.endsWith(e))) {
            return 'video';
        }
        return 'audio';
    };

    const addFiles = useCallback(async (newFiles: File[]) => {
        for (const file of newFiles) {
            const fileType = detectFileType(file.name);
            const ext = file.name.split(".").pop()?.toUpperCase() || "MP3";
            const url = URL.createObjectURL(file);
            const id = generateId();

            // Get duration
            let duration = 0;
            if (fileType === 'audio') {
                const audio = new Audio(url);
                await new Promise<void>((resolve) => {
                    audio.onloadedmetadata = () => {
                        duration = audio.duration;
                        resolve();
                    };
                });
            } else {
                const video = document.createElement('video');
                video.src = url;
                await new Promise<void>((resolve) => {
                    video.onloadedmetadata = () => {
                        duration = video.duration;
                        resolve();
                    };
                });
            }

            const mediaFile: MediaFile = {
                id,
                name: file.name,
                size: file.size,
                type: fileType,
                originalFormat: ext,
                targetFormat: ext,
                status: "waiting",
                progress: 0,
                file: file,
                url: url,
                duration: duration,
            };

            // Save to IndexedDB
            try {
                await saveFileToStorage({
                    id,
                    name: file.name,
                    size: file.size,
                    originalFormat: ext,
                    targetFormat: ext,
                    status: "waiting",
                    blob: file,
                    duration: duration,
                    progress: 0,
                    timestamp: Date.now(),
                }, 'editor');
            } catch (e) {
                console.error('Failed to save to storage:', e);
            }

            setFiles(prev => [...prev, mediaFile]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const removeFile = useCallback(async (id: string, onRemoveFromTracks?: (id: string) => void) => {
        setFiles(prev => {
            const file = prev.find(f => f.id === id);
            if (file?.url) URL.revokeObjectURL(file.url);
            return prev.filter(f => f.id !== id);
        });

        // Let the parent handle track cleanups if needed
        if (onRemoveFromTracks) {
            onRemoveFromTracks(id);
        }

        // Delete from IndexedDB
        try {
            await deleteFileFromStorage(id, 'editor');
        } catch (e) {
            console.error('Failed to delete from storage:', e);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        addFiles(droppedFiles);
    }, [addFiles]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            addFiles(selectedFiles);
        }
    }, [addFiles]);

    return {
        files,
        isDragging,
        setIsDragging,
        fileInputRef,
        handleDrop,
        handleFileSelect,
        removeFile,
        addFiles
    };
}
