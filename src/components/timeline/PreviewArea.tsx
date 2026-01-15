"use client";

import React, { useRef, useEffect, useState } from "react";
import { Play, Pause, Square, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { formatAudioTime, TimelineTrack, MediaFile } from "@/lib/types";
import { useTranslation } from "@/lib/LanguageContext";

interface PreviewAreaProps {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    volume: number;
    tracks: TimelineTrack[];
    files: MediaFile[];
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
    onSeek: (time: number) => void;
    onVolumeChange: (volume: number) => void;
}

export default function PreviewArea({
    currentTime,
    duration,
    isPlaying,
    volume,
    tracks,
    files,
    onPlay,
    onPause,
    onStop,
    onSeek,
    onVolumeChange
}: PreviewAreaProps) {
    const { language } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentClipId, setCurrentClipId] = useState<string | null>(null);
    const [isVideoReady, setIsVideoReady] = useState(false);

    // Find active video clip at current time
    const getActiveVideoClip = () => {
        const videoTrack = tracks.find(t => t.type === 'video');
        if (!videoTrack) return null;

        for (const clip of videoTrack.clips) {
            if (currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration) {
                const file = files.find(f => f.id === clip.fileId);
                return { clip, file };
            }
        }
        return null;
    };

    const activeVideo = getActiveVideoClip();

    // Handle clip change
    useEffect(() => {
        if (!videoRef.current) return;

        const newClipId = activeVideo?.clip?.id || null;

        // Clip changed
        if (newClipId !== currentClipId) {
            setCurrentClipId(newClipId);
            setIsVideoReady(false);

            if (activeVideo?.file?.url) {
                // Load new video
                videoRef.current.src = activeVideo.file.url;
                videoRef.current.load();
            } else {
                // No active clip
                videoRef.current.src = '';
                videoRef.current.pause();
            }
        }
    }, [activeVideo?.clip?.id, activeVideo?.file?.url, currentClipId]);

    // Handle video loaded
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedData = () => {
            setIsVideoReady(true);

            // Set initial time
            if (activeVideo) {
                const clipTime = currentTime - activeVideo.clip.startTime + activeVideo.clip.trimStart;
                video.currentTime = Math.max(0, clipTime);
            }

            // Auto-play if needed
            if (isPlaying) {
                video.play().catch(() => { });
            }
        };

        video.addEventListener('loadeddata', handleLoadedData);
        return () => video.removeEventListener('loadeddata', handleLoadedData);
    }, [activeVideo?.clip?.id]);

    // Sync playback state
    useEffect(() => {
        if (!videoRef.current || !isVideoReady) return;

        if (isPlaying) {
            videoRef.current.play().catch(() => { });
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying, isVideoReady]);

    // Sync volume
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume / 100;
        }
    }, [volume]);

    // Sync time when seeking (not during playback)
    useEffect(() => {
        if (!videoRef.current || !activeVideo || !isVideoReady || isPlaying) return;

        const clipTime = currentTime - activeVideo.clip.startTime + activeVideo.clip.trimStart;
        const diff = Math.abs(videoRef.current.currentTime - clipTime);

        if (diff > 0.2) {
            videoRef.current.currentTime = Math.max(0, clipTime);
        }
    }, [currentTime, activeVideo?.clip?.id, isVideoReady, isPlaying]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSeek(parseFloat(e.target.value));
    };

    const hasVideo = activeVideo?.file?.url;

    return (
        <div className="bg-zinc-900/50 border-b border-white/5 p-4">
            {/* Video Preview */}
            <div className="bg-black rounded-xl overflow-hidden mb-4 relative">
                {hasVideo ? (
                    <video
                        ref={videoRef}
                        className="w-full h-auto max-h-[400px]"
                        playsInline
                    />
                ) : (
                    <div className="w-full h-[400px] flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-6xl mb-4">🎬</div>
                            <p className="text-zinc-500">
                                {language === 'tr'
                                    ? 'Timeline\'a video ekleyin'
                                    : 'Add video to timeline'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Timeline Scrubber */}
            <div className="mb-4">
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.01"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full accent-purple-500"
                />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
                {/* Playback */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={onStop}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                        onClick={isPlaying ? onPause : onPlay}
                        className="p-3 bg-purple-500 hover:bg-purple-400 text-white rounded-full transition-colors"
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <button
                        onClick={() => onSeek(Math.min(duration, currentTime + 5))}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <SkipForward className="w-4 h-4" />
                    </button>
                </div>

                {/* Time */}
                <div className="flex-1 text-center">
                    <span className="text-sm text-zinc-400">
                        {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
                    </span>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-zinc-500" />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                        className="w-24 accent-purple-500"
                    />
                    <span className="text-xs text-zinc-500 w-8">{volume}%</span>
                </div>
            </div>
        </div>
    );
}
