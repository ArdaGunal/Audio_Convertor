// Common types used across components

export interface AudioFile {
    id: string;
    name: string;
    size: number;
    originalFormat: string;
    targetFormat: string;
    status: "waiting" | "converting" | "done" | "error";
    progress: number;
    file?: File;
    convertedBlob?: Blob;
    audioUrl?: string;
    duration?: number;
}

export interface VideoFile {
    id: string;
    name: string;
    size: number;
    format: string;
    status: "waiting" | "extracting" | "done" | "error";
    progress: number;
    file?: File;
    videoUrl?: string;
    audioBlob?: Blob;
    audioUrl?: string;
    duration?: number;
}

// Unified media file for editing (supports both audio and video)
export interface MediaFile {
    id: string;
    name: string;
    size: number;
    type: 'audio' | 'video';
    originalFormat: string;
    targetFormat: string;
    status: 'waiting' | 'processing' | 'done' | 'error';
    progress: number;
    file?: File;
    url?: string;
    convertedBlob?: Blob;
    duration?: number;
    // Video specific
    width?: number;
    height?: number;
    thumbnailUrl?: string;
}

// Timeline types for video editor
export interface TimelineClip {
    id: string;
    type: 'video' | 'audio';
    trackId: string;
    fileId: string;  // Reference to MediaFile
    startTime: number;  // Position on timeline (seconds)
    duration: number;   // Clip duration (seconds)
    trimStart: number;  // Trim from original start (seconds)
    trimEnd: number;    // Trim from original end (seconds)
    volume: number;     // 0-100
    muted: boolean;
    hasAudio?: boolean; // If false, treat as video-only (no volume controls)
}

export interface TimelineTrack {
    id: string;
    type: 'video' | 'audio';
    name: string;
    clips: TimelineClip[];
    muted: boolean;
    volume: number;  // 0-100
    locked: boolean;
}

export interface TimelineState {
    tracks: TimelineTrack[];
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    selectedClipIds: string[];
    zoom: number;  // Pixels per second
}

export const SUPPORTED_AUDIO_FORMATS = ["MP3", "WAV", "M4A", "FLAC", "OGG", "AAC", "WMA"];
export const SUPPORTED_AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac", ".wma"];
export const SUPPORTED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mkv", ".avi", ".mov", ".wmv", ".flv"];

// Utility functions
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const generateId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

export const formatAudioTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const getConvertedFileName = (originalName: string, targetFormat: string): string => {
    const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
    return `${baseName}.${targetFormat.toLowerCase()}`;
};

export const getAudioFromVideoName = (originalName: string): string => {
    const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
    return `${baseName}_audio.mp3`;
};
