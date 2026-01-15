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
    duration: number;
    selectedClipIds: string[];
    pixelsPerSecond: number;
    onClipSelect: (clipId: string | null, isShiftPressed: boolean) => void;
    onClipMove: (clipId: string, newStartTime: number) => void;
    onClipTrim: (clipId: string, newTrimStart: number, newTrimEnd: number) => void;
    onClipDelete: (clipId: string) => void;
    onTrackMuteToggle: (trackId: string) => void;
    onTrackLockToggle: (trackId: string) => void;
    onDropFile: (file: MediaFile, trackType: 'video' | 'audio', dropTime: number) => void;
    onClipContextMenu: (e: React.MouseEvent, clipId: string) => void;
    onTimelineContextMenu: (e: React.MouseEvent) => void;
    onTimeChange: (time: number) => void;
}

export default function Timeline({
    tracks,
    files,
    currentTime,
    duration,
    selectedClipIds,
    pixelsPerSecond,
    onClipSelect,
    onClipMove,
    onClipTrim,
    onClipDelete,
    onTrackMuteToggle,
    onTrackLockToggle,
    onDropFile,
    onClipContextMenu,
    onTimelineContextMenu,
    onTimeChange
}: TimelineProps) {

    const { language } = useTranslation();
    const timelineRef = useRef<HTMLDivElement>(null);
    const rulerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = React.useState(false);

    const timelineWidth = duration * pixelsPerSecond;
    const headerWidth = 132;

    const maxDuration = duration; // Alias for backward compatibility in render loops if needed

    const handleDrop = (e: React.DragEvent, trackType: 'video' | 'audio') => {
        e.preventDefault();
        const fileData = e.dataTransfer.getData('application/json');
        if (!fileData) return;

        const file: MediaFile = JSON.parse(fileData);

        // Calculate drop time based on mouse position
        // We need to account for horizontal scroll if implemented, currently simplified
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const dropTime = Math.max(0, x / pixelsPerSecond);

        onDropFile(file, trackType, dropTime);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    // Playhead Drag Logic
    const handleTimeDrag = React.useCallback((e: MouseEvent | React.MouseEvent) => {
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        // Calculate X relative to the timeline start (removing the sidebar width)
        // Ensure we don't go below 0
        const x = Math.max(0, e.clientX - rect.left - headerWidth);

        // Convert pixels to seconds
        // Add scroll logic here if we implement horizontal scrolling later
        const newTime = Math.max(0, Math.min(maxDuration, x / pixelsPerSecond));

        onTimeChange(newTime);
    }, [maxDuration, pixelsPerSecond, onTimeChange]);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only trigger on left click
        if (e.button !== 0) return;

        setIsDraggingPlayhead(true);
        handleTimeDrag(e);

        const handleMouseMove = (ev: MouseEvent) => {
            ev.preventDefault();
            handleTimeDrag(ev);
        };

        const handleMouseUp = () => {
            setIsDraggingPlayhead(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            ref={timelineRef}
            className="flex-1 bg-zinc-900/50 border-t border-white/5 overflow-hidden flex flex-col relative select-none"
        >
            {/* Timeline Header (Ruler) */}
            <div className="flex border-b border-white/5 h-8 shrink-0">
                <div className="w-[132px] p-2 border-r border-white/5 bg-zinc-900/70 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-zinc-400">
                        {language === 'tr' ? 'Track\'ler' : 'Tracks'}
                    </span>
                </div>

                {/* Ruler Area - Clickable */}
                <div
                    ref={rulerRef}
                    className="flex-1 relative overflow-hidden cursor-pointer"
                    onMouseDown={handleMouseDown}
                >
                    <div className="absolute top-0 bottom-0 left-0 h-full w-full pointer-events-none">
                        {/* Time Markers */}
                        {Array.from({ length: Math.ceil(maxDuration / 5) }).map((_, i) => {
                            const time = i * 5;
                            const left = time * pixelsPerSecond;
                            // Optimization: Only render visible markers if we had scroll
                            return (
                                <div
                                    key={i}
                                    className="absolute top-0 bottom-0 border-l border-white/10"
                                    style={{ left: `${left}px` }}
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

            {/* Tracks Container */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                {tracks.map((track) => (
                    <div key={track.id} className="flex border-b border-white/5 h-20 shrink-0">
                        {/* Track header */}
                        <div className="w-[132px] p-2 border-r border-white/5 bg-zinc-900/70 flex flex-col gap-1 shrink-0 z-10">
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
                        {/* Note: We removed per-track overflow-x to align with global timeline */}
                        <div className="flex-1 relative bg-zinc-950/20">
                            <div
                                className="absolute inset-0"
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
                                        className="absolute top-0 bottom-0 border-l border-white/5 pointer-events-none"
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
                                            isSelected={selectedClipIds.includes(clip.id)}
                                            onSelect={(e) => onClipSelect(clip.id, e.shiftKey)}
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

            {/* Playhead - Interactive */}
            <div
                className="absolute top-0 bottom-0 w-4 -ml-2 z-50 cursor-ew-resize group"
                style={{ left: `${headerWidth + currentTime * pixelsPerSecond}px` }}
                onMouseDown={handleMouseDown}
            >
                {/* Visual Line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-purple-500 group-hover:bg-purple-400 transition-colors pointer-events-none">
                    {/* Head Handle */}
                    <div className="w-3 h-3 bg-purple-500 group-hover:bg-purple-400 rounded-full -ml-1.5 -mt-1 shadow-lg" />
                </div>
            </div>
        </div>
    );
}
