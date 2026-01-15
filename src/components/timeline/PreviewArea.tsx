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

    // Find active video clip
    const getActiveVideoClip = () => {
        const videoTrack = tracks.find(t => t.type === 'video');
        if (!videoTrack) return null;

        return {
            clip: videoTrack.clips.find(clip =>
                currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration
            ),
            track: videoTrack
        };
    };

    const activeVideoData = getActiveVideoClip();
    const activeClip = activeVideoData?.clip;
    const activeVideoTrack = activeVideoData?.track;
    const activeFile = activeClip ? files.find(f => f.id === activeClip.fileId) : null;
    const hasVideo = !!(activeFile?.url);

    // Find active audio clips
    const activeAudioClips = tracks
        .filter(t => t.type === 'audio')
        .map(track => {
            const clip = track.clips.find(c =>
                currentTime >= c.startTime && currentTime < c.startTime + c.duration
            );
            if (!clip) return null;
            const file = files.find(f => f.id === clip.fileId);
            if (!file) return null;
            return { clip, track, file };
        })
        .filter((item): item is NonNullable<typeof item> => !!item);

    // Sync Ref with video element
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !activeClip || !activeFile) return;

        // Calculate relative time within the clip
        const clipRelativeTime = currentTime - activeClip.startTime + activeClip.trimStart;

        // Sync time if drift is too large
        const timeDiff = Math.abs(video.currentTime - clipRelativeTime);
        if (timeDiff > 0.3) {
            video.currentTime = clipRelativeTime;
        }

        // Sync playback state
        if (isPlaying && video.paused) {
            video.play().catch(e => console.warn("Play failed:", e));
        } else if (!isPlaying && !video.paused) {
            video.pause();
        }

        // Calculate effective volume for video
        const isMuted = activeClip.hasAudio === false || activeClip.muted || activeVideoTrack?.muted;
        const clipVolume = (activeClip.volume ?? 100) / 100;
        const trackVolume = (activeVideoTrack?.volume ?? 100) / 100;

        video.volume = isMuted ? 0 : (volume / 100) * clipVolume * trackVolume;


    }, [currentTime, isPlaying, volume, activeClip, activeFile, activeVideoTrack]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSeek(parseFloat(e.target.value));
    };

    return (
        <div className="bg-zinc-900/50 border-b border-white/5 p-4">
            {/* Audio Players for Audio Tracks */}
            {activeAudioClips.map(({ clip, track, file }) => (
                <audio
                    key={clip.id}
                    src={file.url}
                    ref={(el) => {
                        if (el) {
                            const clipRelativeTime = currentTime - clip.startTime + clip.trimStart;
                            const timeDiff = Math.abs(el.currentTime - clipRelativeTime);

                            if (timeDiff > 0.3) {
                                el.currentTime = clipRelativeTime;
                            }

                            if (isPlaying && el.paused) {
                                el.play().catch(() => { });
                            } else if (!isPlaying && !el.paused) {
                                el.pause();
                            }

                            const isMuted = clip.muted || track.muted;
                            const clipVolume = (clip.volume ?? 100) / 100;
                            const trackVolume = (track.volume ?? 100) / 100;
                            el.volume = isMuted ? 0 : (volume / 100) * clipVolume * trackVolume;
                        }
                    }}
                />
            ))}

            {/* Video Preview */}
            <div className="bg-black rounded-xl overflow-hidden mb-4 relative flex items-center justify-center p-1">
                {/* Fixed aspect ratio container could be added here */}
                {hasVideo ? (
                    <video
                        key={activeClip?.id} // Force remount when clip changes
                        ref={videoRef}
                        src={activeFile?.url}
                        className="w-full h-auto max-h-[400px] object-contain mx-auto"
                        playsInline
                        onLoadedMetadata={(e) => {
                            const video = e.currentTarget;
                            if (activeClip) {
                                video.currentTime = currentTime - activeClip.startTime + activeClip.trimStart;
                            }
                            if (isPlaying) video.play().catch(() => { });
                        }}
                    />
                ) : (
                    <div className="w-full h-[400px] flex items-center justify-center bg-zinc-950">
                        <div className="text-center">
                            <div className="text-6xl mb-4 grayscale opacity-50">🎬</div>
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
                    className="w-full accent-purple-500 cursor-pointer"
                />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
                {/* Playback */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={onStop}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                        title="Stop"
                    >
                        <Square className="w-4 h-4 fill-current" />
                    </button>
                    <button
                        onClick={isPlaying ? onPause : onPlay}
                        className="p-3 bg-purple-500 hover:bg-purple-400 text-white rounded-full transition-colors shadow-lg shadow-purple-500/20"
                    >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
                    </button>
                    <button
                        onClick={() => onSeek(Math.min(duration, currentTime + 5))}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <SkipForward className="w-4 h-4" />
                    </button>
                </div>

                {/* Time */}
                <div className="flex-1 text-center font-mono text-zinc-400 text-sm">
                    {formatAudioTime(currentTime)} <span className="text-zinc-600">/</span> {formatAudioTime(duration)}
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2 group">
                    <button
                        onClick={() => onVolumeChange(volume === 0 ? 100 : 0)}
                        className="visited:text-zinc-500 hover:text-purple-400 transition-colors"
                    >
                        <Volume2 className={`w-4 h-4 ${volume === 0 ? 'text-zinc-600' : 'text-zinc-400'}`} />
                    </button>
                    <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                        <div
                            className="absolute top-0 bottom-0 left-0 bg-purple-500 group-hover:bg-purple-400 transition-colors"
                            style={{ width: `${volume}%` }}
                        />
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume}
                            onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                    <span className="text-xs text-zinc-500 w-8 text-right tabular-nums">{volume}%</span>
                </div>
            </div>
        </div>
    );
}
