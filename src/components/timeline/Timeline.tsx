"use client";

import React, { useRef } from "react";
import { TimelineTrack, TimelineClip, MediaFile, generateId } from "@/lib/types";
import ClipComponent from "./Clip";
import { useTranslation } from "@/lib/LanguageContext";
import { Volume2, VolumeX, Lock, Unlock } from "lucide-react";

interface TimelineProps {
    tracks: TimelineTrack[];
    files: MediaFile[];
    currentTime: number;
    selectedClipId: string | null;
    pixelsPerSecond: number;
    onClipSelect: (clipId: string) => void;
    onClipMove: (clipId: string, newStartTime: number) => void;
    onClipTrim: (clipId: string, newTrimStart: number, newTrimEnd: number) => void;
    onClipDelete: (clipId: string) => void;
    onTrackMuteToggle: (trackId: string) => void;
    onTrackLockToggle: (trackId: string) => void;
    onDropFile: (file: MediaFile, trackType: 'video' | 'audio', dropTime: number) => void;
    onClipContextMenu: (e: React.MouseEvent, clipId: string) => void;
    onTimelineContextMenu: (e: React.MouseEvent) => void;
}

export default function Timeline({
    tracks,
    files,
    currentTime,
    selectedClipId,
    pixelsPerSecond,
    onClipSelect,
    onClipMove,
    onClipTrim,
    onClipDelete,
    onTrackMuteToggle,
    onTrackLockToggle,
    onDropFile,
    onClipContextMenu,
    onTimelineContextMenu
}: TimelineProps) {
    const { language } = useTranslation();
    const timelineRef = useRef<HTMLDivElement>(null);

    // Calculate timeline duration
    const maxDuration = Math.max(
        ...tracks.flatMap(track =>
            track.clips.map(clip => clip.startTime + clip.duration)
        ),
        60 // Minimum 60 seconds
    );

    const timelineWidth = maxDuration * pixelsPerSecond;

    const handleDrop = (e: React.DragEvent, trackType: 'video' | 'audio') => {
        e.preventDefault();
        const fileData = e.dataTransfer.getData('application/json');
        if (!fileData) return;

        const file: MediaFile = JSON.parse(fileData);

        // Calculate drop time based on mouse position
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const dropTime = Math.max(0, x / pixelsPerSecond);

        onDropFile(file, trackType, dropTime);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    return (
        <div className="flex-1 bg-zinc-900/50 border-t border-white/5 overflow-hidden flex flex-col">
            {/* Timeline Header */}
            <div className="flex border-b border-white/5">
                <div className="w-32 p-2 border-r border-white/5 bg-zinc-900/70 flex items-center justify-center">
                    <span className="text-xs font-semibold text-zinc-400">
                        {language === 'tr' ? 'Track\'ler' : 'Tracks'}
                    </span>
                </div>
                <div className="flex-1 relative overflow-x-auto">
                    {/* Time ruler */}
                    <div className="h-8 relative" style={{ width: `${timelineWidth}px` }}>
                        {Array.from({ length: Math.ceil(maxDuration / 5) }).map((_, i) => {
                            const time = i * 5;
                            return (
                                <div
                                    key={i}
                                    className="absolute top-0 bottom-0 border-l border-white/10"
                                    style={{ left: `${time * pixelsPerSecond}px` }}
                                >
                                    <span className="text-[10px] text-zinc-500 ml-1">
                                        {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Tracks */}
            <div className="flex-1 overflow-y-auto">
                {tracks.map((track) => (
                    <div key={track.id} className="flex border-b border-white/5">
                        {/* Track header */}
                        <div className="w-32 p-2 border-r border-white/5 bg-zinc-900/70 flex flex-col gap-1">
                            <span className="text-xs font-medium text-white truncate">
                                {track.name}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => onTrackMuteToggle(track.id)}
                                    className={`p-1 rounded ${track.muted ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400'
                                        } hover:bg-opacity-80 transition-colors`}
                                >
                                    {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                </button>
                                <button
                                    onClick={() => onTrackLockToggle(track.id)}
                                    className={`p-1 rounded ${track.locked ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-800 text-zinc-400'
                                        } hover:bg-opacity-80 transition-colors`}
                                >
                                    {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>

                        {/* Track content */}
                        <div className="flex-1 relative overflow-x-auto">
                            <div
                                className="relative h-16 bg-zinc-950/50"
                                style={{ width: `${timelineWidth}px` }}
                                onDrop={(e) => handleDrop(e, track.type)}
                                onDragOver={handleDragOver}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    onTimelineContextMenu(e);
                                }}
                            >
                                {/* Grid lines */}
                                {Array.from({ length: Math.ceil(maxDuration) }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute top-0 bottom-0 border-l border-white/5"
                                        style={{ left: `${i * pixelsPerSecond}px` }}
                                    />
                                ))}

                                {/* Clips */}
                                {track.clips.map((clip) => {
                                    const file = files.find(f => f.id === clip.fileId);
                                    if (!file) return null;

                                    return (
                                        <ClipComponent
                                            key={clip.id}
                                            clip={clip}
                                            file={file}
                                            pixelsPerSecond={pixelsPerSecond}
                                            isSelected={clip.id === selectedClipId}
                                            onSelect={() => onClipSelect(clip.id)}
                                            onMove={(newStartTime) => onClipMove(clip.id, newStartTime)}
                                            onTrim={(trimStart, trimEnd) => onClipTrim(clip.id, trimStart, trimEnd)}
                                            onDelete={() => onClipDelete(clip.id)}
                                            onContextMenu={(e) => onClipContextMenu(e, clip.id)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Playhead */}
            <div
                className="absolute top-0 bottom-0 w-0.5 bg-purple-500 pointer-events-none z-50"
                style={{ left: `${132 + currentTime * pixelsPerSecond}px` }}
            >
                <div className="w-3 h-3 bg-purple-500 rounded-full -ml-1.5 -mt-1" />
            </div>
        </div>
    );
}
