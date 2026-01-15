"use client";

import React, { useRef, useState } from "react";
import { TimelineClip, MediaFile, formatAudioTime } from "@/lib/types";
import { Music, Film, Volume2, VolumeX } from "lucide-react";

interface ClipComponentProps {
    clip: TimelineClip;
    file: MediaFile;
    pixelsPerSecond: number;
    isSelected: boolean;
    onSelect: () => void;
    onMove: (newStartTime: number) => void;
    onTrim: (newTrimStart: number, newTrimEnd: number) => void;
    onDelete: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

export default function ClipComponent({
    clip,
    file,
    pixelsPerSecond,
    isSelected,
    onSelect,
    onMove,
    onTrim,
    onDelete,
    onContextMenu
}: ClipComponentProps) {
    const clipRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);

    const clipWidth = clip.duration * pixelsPerSecond;
    const clipLeft = clip.startTime * pixelsPerSecond;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click
        e.stopPropagation();
        onSelect();
        setIsDragging(true);

        const startX = e.clientX;
        const startTime = clip.startTime;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaTime = deltaX / pixelsPerSecond;
            const newStartTime = Math.max(0, startTime + deltaTime);
            onMove(newStartTime);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleResizeLeft = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing('left');

        const startX = e.clientX;
        const startTrimStart = clip.trimStart;
        const startStartTime = clip.startTime;
        const startDuration = clip.duration;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaTime = deltaX / pixelsPerSecond;

            const newTrimStart = Math.max(0, startTrimStart + deltaTime);
            const newStartTime = startStartTime + deltaTime;
            const newDuration = startDuration - deltaTime;

            if (newDuration > 0.1) {
                onTrim(newTrimStart, clip.trimEnd);
                onMove(newStartTime);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleResizeRight = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing('right');

        const startX = e.clientX;
        const startTrimEnd = clip.trimEnd;
        const startDuration = clip.duration;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaTime = deltaX / pixelsPerSecond;

            const newTrimEnd = Math.max(0, startTrimEnd - deltaTime);
            const newDuration = startDuration + deltaTime;

            if (newDuration > 0.1) {
                onTrim(clip.trimStart, newTrimEnd);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            ref={clipRef}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            className={`absolute top-1 bottom-1 rounded overflow-hidden cursor-move select-none transition-all ${isSelected
                ? 'ring-2 ring-purple-500 z-10'
                : 'ring-1 ring-white/10'
                } ${clip.type === 'video'
                    ? 'bg-gradient-to-r from-red-600 to-red-500'
                    : 'bg-gradient-to-r from-cyan-600 to-cyan-500'
                } ${isDragging ? 'opacity-70' : ''}`}
            style={{
                left: `${clipLeft}px`,
                width: `${clipWidth}px`,
            }}
        >
            {/* Resize handles */}
            <div
                onMouseDown={handleResizeLeft}
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-20"
            />
            <div
                onMouseDown={handleResizeRight}
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-20"
            />

            {/* Content */}
            <div className="px-2 py-1 h-full flex items-center gap-2">
                {/* Icon */}
                {clip.type === 'video' ? (
                    <Film className="w-3 h-3 text-white flex-shrink-0" />
                ) : (
                    <Music className="w-3 h-3 text-white flex-shrink-0" />
                )}

                {/* Name */}
                <span className="text-xs text-white font-medium truncate flex-1">
                    {file.name}
                </span>

                {/* Mute indicator */}
                {clip.muted && (
                    <VolumeX className="w-3 h-3 text-white/70 flex-shrink-0" />
                )}
            </div>

            {/* Waveform placeholder (for audio clips) */}
            {clip.type === 'audio' && (
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    {/* Simple waveform visualization - placeholder */}
                    <div className="h-full flex items-center gap-px px-1">
                        {Array.from({ length: Math.floor(clipWidth / 3) }).map((_, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-white rounded-full"
                                style={{ height: `${30 + Math.random() * 70}%` }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
