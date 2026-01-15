"use client";

import React, { useState, useEffect } from "react";
import { Upload, Loader2 } from "lucide-react";
import { SUPPORTED_AUDIO_EXTENSIONS, SUPPORTED_VIDEO_EXTENSIONS } from "@/lib/types";
import { useTranslation } from "@/lib/LanguageContext";
import MediaLibrary from "./timeline/MediaLibrary";
import PreviewArea from "./timeline/PreviewArea";
import Timeline from "./timeline/Timeline";
import ToolsPanel from "./timeline/ToolsPanel";
import ExportDialog from "./timeline/ExportDialog";
import ExportSuccessDialog from "./timeline/ExportSuccessDialog";
import ContextMenu, { ContextMenuAction } from "./timeline/ContextMenu";
import { useShortcuts } from "@/lib/shortcuts";

// Hooks
import { useMediaFiles } from "@/hooks/editor/useMediaFiles";
import { useTimeline } from "@/hooks/editor/useTimeline";
import { useMediaExport } from "@/hooks/editor/useMediaExport";

export default function MediaEditingSection() {
    const { language } = useTranslation();

    // Custom Hooks
    const {
        files,
        isDragging,
        setIsDragging,
        fileInputRef,
        handleDrop,
        handleFileSelect,
        removeFile,
        addFiles
    } = useMediaFiles();

    const {
        tracks,
        currentTime,
        setCurrentTime,
        isPlaying,
        setIsPlaying,
        selectedClipIds,
        handleClipSelect,
        volume,
        setVolume,
        pixelsPerSecond,
        setPixelsPerSecond,
        clipboardClips,
        duration,
        handleDropFile,
        handleClipMove,
        handleClipTrim,
        handleClipDelete,
        handleTrackMuteToggle,
        handleTrackLockToggle,
        handleSplitClip,
        handleCopy,
        handleCut,
        handlePaste,
        handleUndo,
        handleRedo,
        handleExtractAudio,
        removeClipsForFile,
    } = useTimeline({ files, language });

    const {
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
    } = useMediaExport({ tracks, files, language });

    const { matchesShortcut } = useShortcuts();

    // UI state
    const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
    const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
    const [contextMenuState, setContextMenuState] = useState<{
        visible: boolean;
        x: number;
        y: number;
        clipId: string | null;
    }>({ visible: false, x: 0, y: 0, clipId: null });

    // Helper to remove file and cleanup clips
    const handleRemoveFile = (id: string) => {
        removeFile(id, removeClipsForFile);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (matchesShortcut(e, 'playPause') && !e.repeat) {
                e.preventDefault();
                setIsPlaying(prev => !prev);
            }
            if (matchesShortcut(e, 'delete') && selectedClipIds.length > 0) {
                e.preventDefault();
                handleClipDelete(); // No args means delete selected
            }
            if (matchesShortcut(e, 'split') && selectedClipIds.length > 0) {
                e.preventDefault();
                handleSplitClip();
            }
            if (matchesShortcut(e, 'copy') && selectedClipIds.length > 0) {
                e.preventDefault();
                handleCopy();
            }
            if (matchesShortcut(e, 'cut') && selectedClipIds.length > 0) {
                e.preventDefault();
                handleCut();
            }
            if (matchesShortcut(e, 'paste')) {
                e.preventDefault();
                handlePaste();
            }
            if (matchesShortcut(e, 'undo')) {
                e.preventDefault();
                handleUndo();
            }
            if (matchesShortcut(e, 'redo')) {
                e.preventDefault();
                handleRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedClipIds, currentTime, isPlaying, matchesShortcut, handleClipDelete, handleSplitClip, handleCopy, handleCut, handlePaste, handleUndo, handleRedo]);

    // Context Menu Handlers
    const handleClipContextMenu = (e: React.MouseEvent, clipId: string) => {
        e.preventDefault();
        e.stopPropagation();

        // If the right-clicked clip is NOT in the current selection, select ONLY it
        if (!selectedClipIds.includes(clipId)) {
            handleClipSelect(clipId, false);
        }
        // If it IS in selection, keep selection as is so we can apply action to all

        setContextMenuState({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            clipId: clipId
        });
    };

    const handleTimelineContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenuState({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            clipId: null
        });
    };

    const handleContextMenuAction = (action: any) => {
        switch (action) {
            case 'split':
                handleSplitClip();
                break;
            case 'cut':
                handleCut();
                break;
            case 'copy':
                handleCopy();
                break;
            case 'paste':
                handlePaste();
                break;
            case 'delete':
                handleClipDelete();
                break;
            case 'extractAudio':
                handleExtractAudio();
                break;
        }
    };

    return (
        <div className="h-full flex overflow-hidden">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={[...SUPPORTED_AUDIO_EXTENSIONS, ...SUPPORTED_VIDEO_EXTENSIONS].join(",")}
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
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-white/10 shadow-lg">
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-sm text-zinc-400">{language === 'tr' ? 'Medya işleyici yükleniyor...' : 'Loading media processor...'}</span>
                </div>
            )}

            {/* Media Library (Left Sidebar) */}
            {!leftSidebarCollapsed && (
                <MediaLibrary
                    files={files}
                    onAddFiles={() => fileInputRef.current?.click()}
                    onRemoveFile={handleRemoveFile}
                    onDragStart={() => { }}
                />
            )}

            {/* Left Sidebar Toggle */}
            <button
                onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-r-lg p-2 transition-colors"
                style={{ left: leftSidebarCollapsed ? '0' : '256px' }}
            >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {leftSidebarCollapsed ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    )}
                </svg>
            </button>

            {/* Main Timeline Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <PreviewArea
                    currentTime={currentTime}
                    duration={duration}
                    isPlaying={isPlaying}
                    volume={volume}
                    tracks={tracks}
                    files={files}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onStop={() => { setIsPlaying(false); setCurrentTime(0); }}
                    onSeek={setCurrentTime}
                    onVolumeChange={setVolume}
                />

                <div
                    className="relative"
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    {isDragging && (
                        <div className="absolute inset-0 z-50 bg-purple-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                            <div className="bg-zinc-900 border-2 border-dashed border-purple-500 rounded-2xl p-8">
                                <Upload className="w-16 h-16 text-purple-400 mx-auto mb-3 animate-bounce" />
                                <h3 className="text-xl font-bold text-white">{language === 'tr' ? 'Timeline\'a Bırakın' : 'Drop to Timeline'}</h3>
                            </div>
                        </div>
                    )}

                    <Timeline
                        tracks={tracks}
                        files={files}
                        currentTime={currentTime}
                        duration={duration}
                        selectedClipIds={selectedClipIds}
                        pixelsPerSecond={pixelsPerSecond}
                        onClipSelect={handleClipSelect}
                        onClipMove={handleClipMove}
                        onClipTrim={handleClipTrim}
                        onClipDelete={handleClipDelete}
                        onTrackMuteToggle={handleTrackMuteToggle}
                        onTrackLockToggle={handleTrackLockToggle}
                        onDropFile={handleDropFile}
                        onClipContextMenu={handleClipContextMenu}
                        onTimelineContextMenu={handleTimelineContextMenu}
                        onTimeChange={setCurrentTime}
                    />
                </div>
            </div>

            {/* Tools Panel (Right Sidebar) */}
            {!rightSidebarCollapsed && (
                <ToolsPanel
                    zoom={pixelsPerSecond}
                    onZoomChange={setPixelsPerSecond}
                    selectedClipIds={selectedClipIds}
                    onSplitClip={handleSplitClip}
                    onExport={handleExport}
                    exportProgress={exportProgress}
                    isExporting={isExporting}
                />
            )}

            {/* Right Sidebar Toggle */}
            <button
                onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-50 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-l-lg p-2 transition-colors"
                style={{ right: rightSidebarCollapsed ? '0' : '256px' }}
            >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {rightSidebarCollapsed ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    )}
                </svg>
            </button>

            {/* Context Menu */}
            {contextMenuState.visible && (
                <ContextMenu
                    x={contextMenuState.x}
                    y={contextMenuState.y}
                    onAction={handleContextMenuAction}
                    onClose={() => setContextMenuState(prev => ({ ...prev, visible: false }))}
                    canPaste={!!clipboardClips.length}
                    isClipContext={!!contextMenuState.clipId}
                    clipHasAudio={(() => {
                        // Check if the RIGHT CLICKED clip has audio. 
                        // If it's part of selection, check others? No, usually checking the target is enough OR check all selected.
                        // For safety, let's check the context ID clip specifically as that's what the menu is "on".
                        if (!contextMenuState.clipId) return false;
                        const clip = tracks.flatMap(t => t.clips).find(c => c.id === contextMenuState.clipId);
                        return clip?.hasAudio !== false;
                    })()}
                />
            )}

            {/* Export Dialog */}
            <ExportDialog
                isOpen={exportDialogOpen}
                onClose={() => setExportDialogOpen(false)}
                onExport={handleExportConfirm}
                isExporting={isExporting}
            />

            {/* Export Success Dialog */}
            <ExportSuccessDialog
                isOpen={exportSuccessOpen}
                fileName={exportedFileName}
                onClose={() => setExportSuccessOpen(false)}
            />
        </div>
    );
}
