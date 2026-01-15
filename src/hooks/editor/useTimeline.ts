
import { useState, useEffect, useCallback } from 'react';
import { TimelineTrack, TimelineClip, MediaFile, generateId } from '@/lib/types';

interface UseTimelineProps {
    files: MediaFile[];
    language: string;
}

export function useTimeline({ files, language }: UseTimelineProps) {
    // Helper to sanitize tracks
    const sanitizeTracks = (tracks: TimelineTrack[]): TimelineTrack[] => {
        const seenIds = new Set<string>();
        return tracks.map(track => ({
            ...track,
            clips: track.clips.map(clip => {
                let clipId = clip.id;
                if (seenIds.has(clipId)) {
                    clipId = generateId();
                }
                seenIds.add(clipId);
                return { ...clip, id: clipId };
            })
        }));
    };

    const [tracks, setTracks] = useState<TimelineTrack[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const savedTracks = localStorage.getItem('timeline_tracks');
                if (savedTracks) {
                    return sanitizeTracks(JSON.parse(savedTracks));
                }
            } catch (e) {
                console.error('Failed to load timeline tracks:', e);
            }
        }
        return [
            { id: 'video-track-1', type: 'video', name: 'Video Track 1', clips: [], muted: false, volume: 100, locked: false },
            { id: 'audio-track-1', type: 'audio', name: 'Audio Track 1', clips: [], muted: false, volume: 100, locked: false },
            { id: 'audio-track-2', type: 'audio', name: 'Audio Track 2', clips: [], muted: false, volume: 100, locked: false },
        ];
    });

    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
    const [volume, setVolume] = useState(100);
    const [pixelsPerSecond, setPixelsPerSecond] = useState(50);
    const [clipboardClips, setClipboardClips] = useState<TimelineClip[]>([]);

    // History State
    const [history, setHistory] = useState<TimelineTrack[][]>([]);
    const [future, setFuture] = useState<TimelineTrack[][]>([]);

    const pushToHistory = useCallback((currentTracks: TimelineTrack[]) => {
        setHistory(prev => {
            const newHistory = [...prev, currentTracks];
            if (newHistory.length > 50) return newHistory.slice(newHistory.length - 50);
            return newHistory;
        });
        setFuture([]);
    }, []);

    // Duration calculation
    const contentDuration = Math.max(0, ...tracks.flatMap(track => track.clips.map(clip => clip.startTime + clip.duration)));
    const duration = contentDuration > 0 ? contentDuration : 10;

    useEffect(() => {
        try {
            localStorage.setItem('timeline_tracks', JSON.stringify(tracks));
        } catch (e) {
            console.error('Failed to save timeline tracks:', e);
        }
    }, [tracks]);

    // Playback loop
    useEffect(() => {
        if (!isPlaying) return;
        let animationFrameId: number;
        let lastTime = Date.now();

        const tick = () => {
            const now = Date.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;
            setCurrentTime(prev => {
                const newTime = prev + delta;
                if (newTime >= duration) {
                    setIsPlaying(false);
                    return duration;
                }
                return newTime;
            });
            animationFrameId = requestAnimationFrame(tick);
        };
        animationFrameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying, duration]);

    // Undo/Redo
    const handleUndo = useCallback(() => {
        setHistory(prev => {
            if (prev.length === 0) return prev;
            const previousState = prev[prev.length - 1];
            setFuture(f => [tracks, ...f]);
            setTracks(previousState);
            return prev.slice(0, prev.length - 1);
        });
    }, [tracks]);

    const handleRedo = useCallback(() => {
        setFuture(prev => {
            if (prev.length === 0) return prev;
            const nextState = prev[0];
            setHistory(h => [...h, tracks]);
            setTracks(nextState);
            return prev.slice(1);
        });
    }, [tracks]);

    // Selection Logic
    const handleClipSelect = useCallback((clipId: string | null, isShiftPressed: boolean) => {
        if (clipId === null) {
            // Deselect all if clicked on empty space (unless shift is pressed? No, usually clicking empty space clears)
            // But if shift is pressed and we click empty space, maybe do nothing?
            // Standard behavior: Click empty -> clear selection.
            if (!isShiftPressed) {
                setSelectedClipIds([]);
            }
            return;
        }

        setSelectedClipIds(prev => {
            if (isShiftPressed) {
                // Toggle
                if (prev.includes(clipId)) {
                    return prev.filter(id => id !== clipId);
                } else {
                    return [...prev, clipId];
                }
            } else {
                // Exclusive select
                // If already selected and just clicking without shift, usually keeps it selected.
                // But if multiple selected and click one, usually deselects others.
                return [clipId];
            }
        });
    }, []);


    const handleDropFile = useCallback((file: MediaFile, trackType: 'video' | 'audio', dropTime: number) => {
        const correctTrackType = file.type;
        setTracks(prev => {
            const track = prev.find(t => t.type === correctTrackType && !t.locked);
            if (!track) {
                alert(language === 'tr' ? `${correctTrackType} kanalı bulunamadı` : `${correctTrackType} track not found`);
                return prev;
            }

            pushToHistory(prev);

            let smartStartTime = 0;
            if (track.clips.length > 0) {
                const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
                const lastClip = sortedClips[sortedClips.length - 1];
                smartStartTime = lastClip.startTime + lastClip.duration;
            }

            const newClip: TimelineClip = {
                id: generateId(),
                type: file.type,
                trackId: track.id,
                fileId: file.id,
                startTime: smartStartTime, // Append to end
                duration: file.duration || 5,
                trimStart: 0,
                trimEnd: 0,
                volume: 100,
                muted: false,
            };

            return prev.map(t => t.id === track.id ? { ...t, clips: [...t.clips, newClip] } : t);
        });
    }, [language, pushToHistory]);

    const handleClipMove = useCallback((clipId: string, newStartTime: number) => {
        setTracks(prev => {
            pushToHistory(prev);
            return prev.map(track => ({
                ...track,
                clips: track.clips.map(clip => clip.id === clipId ? { ...clip, startTime: newStartTime } : clip)
            }));
        });
    }, [pushToHistory]);

    const handleClipTrim = useCallback((clipId: string, newTrimStart: number, newTrimEnd: number) => {
        setTracks(prev => {
            pushToHistory(prev);
            return prev.map(track => ({
                ...track,
                clips: track.clips.map(clip => {
                    if (clip.id === clipId) {
                        const file = files.find(f => f.id === clip.fileId);
                        const maxDuration = (file?.duration || 0) - newTrimStart - newTrimEnd;
                        return {
                            ...clip,
                            trimStart: newTrimStart,
                            trimEnd: newTrimEnd,
                            duration: Math.max(0.1, maxDuration)
                        };
                    }
                    return clip;
                })
            }));
        });
    }, [files, pushToHistory]);

    const handleClipDelete = useCallback((input?: string | string[]) => {
        let targetIds: string[] = [];

        if (typeof input === 'string') {
            targetIds = [input];
        } else if (Array.isArray(input)) {
            targetIds = input;
        } else {
            targetIds = selectedClipIds;
        }

        if (targetIds.length === 0) return;

        setTracks(prev => {
            pushToHistory(prev);
            return prev.map(track => ({
                ...track,
                clips: track.clips.filter(clip => !targetIds.includes(clip.id))
            }));
        });
        setSelectedClipIds(prev => prev.filter(id => !targetIds.includes(id)));
    }, [selectedClipIds, pushToHistory]);

    const handleTrackMuteToggle = useCallback((trackId: string) => {
        setTracks(prev => {
            pushToHistory(prev);
            return prev.map(track => track.id === trackId ? { ...track, muted: !track.muted } : track);
        });
    }, [pushToHistory]);

    const handleTrackLockToggle = useCallback((trackId: string) => {
        setTracks(prev => prev.map(track => track.id === trackId ? { ...track, locked: !track.locked } : track));
    }, []);

    // Batch Split
    const handleSplitClipRobust = useCallback(() => {
        if (selectedClipIds.length === 0) return;

        setTracks(prev => {
            let hasSplit = false;
            const newTracks = prev.map(track => {
                const clipsToSplit = track.clips.filter(c => selectedClipIds.includes(c.id));
                if (clipsToSplit.length === 0) return track;

                // Process splits for this track
                const newClips = [...track.clips];

                clipsToSplit.forEach(clip => {
                    const clipEnd = clip.startTime + clip.duration;
                    // Check intersection: playhead must be strictly inside (not at edges)
                    if (currentTime > clip.startTime + 0.01 && currentTime < clipEnd - 0.01) {
                        hasSplit = true;

                        // Remove original
                        const idx = newClips.findIndex(c => c.id === clip.id);
                        if (idx !== -1) newClips.splice(idx, 1);

                        const splitPoint = currentTime - clip.startTime;
                        const newId1 = generateId();
                        const newId2 = generateId();

                        // Add new pieces
                        newClips.push({
                            ...clip,
                            id: newId1,
                            duration: splitPoint,
                            trimEnd: clip.trimEnd + (clip.duration - splitPoint)
                        });
                        newClips.push({
                            ...clip,
                            id: newId2,
                            startTime: currentTime,
                            duration: clip.duration - splitPoint,
                            trimStart: clip.trimStart + splitPoint
                        });
                    }
                });

                if (!hasSplit) return track; // Optimization if nothing changed on this track
                return { ...track, clips: newClips.sort((a, b) => a.startTime - b.startTime) };
            });

            if (hasSplit) {
                pushToHistory(prev);
                // Update selection? Usually we select the second parts or keep original selection?
                // For now, let's just clear selection to avoid confusion, or maybe select the new clips?
                // Clearing is safer.
                setSelectedClipIds([]);
                return newTracks;
            } else {
                // No split happened
                alert(language === 'tr' ? 'Kesilecek uygun klip bulunamadı (Playhead klip içinde olmalı)' : 'No suitable clips to split (Playhead must be inside)');
                return prev;
            }
        });
    }, [selectedClipIds, currentTime, language, pushToHistory]);

    const handleCopy = useCallback(() => {
        if (selectedClipIds.length === 0) return;
        const clipsToCopy: TimelineClip[] = [];
        tracks.forEach(track => {
            track.clips.forEach(clip => {
                if (selectedClipIds.includes(clip.id)) {
                    clipsToCopy.push({ ...clip });
                }
            });
        });
        if (clipsToCopy.length > 0) {
            setClipboardClips(clipsToCopy);
        }
    }, [tracks, selectedClipIds]);

    const handleCut = useCallback(() => {
        handleCopy();
        handleClipDelete();
    }, [handleCopy, handleClipDelete]);

    const handlePasteRobust = useCallback(() => {
        if (clipboardClips.length === 0) return;

        // Calculate offset (time difference) for each clip relative to the earliest start time
        const earliestStart = Math.min(...clipboardClips.map(c => c.startTime));

        setTracks(prev => {
            pushToHistory(prev);
            const nextTracks = [...prev];
            const newSelection: string[] = [];

            clipboardClips.forEach(clip => {
                const offset = clip.startTime - earliestStart;
                const pasteTime = currentTime + offset;

                const targetTrack = nextTracks.find(t => t.type === clip.type && !t.locked) || nextTracks.find(t => t.type === clip.type);

                if (targetTrack) {
                    const newId = generateId();
                    newSelection.push(newId);
                    const newClip = {
                        ...clip,
                        id: newId,
                        startTime: pasteTime,
                        trackId: targetTrack.id
                    };

                    // Mutate nextTracks for efficiency in loop
                    const trackIdx = nextTracks.findIndex(t => t.id === targetTrack.id);
                    nextTracks[trackIdx] = {
                        ...targetTrack,
                        clips: [...targetTrack.clips, newClip]
                    };
                }
            });

            setSelectedClipIds(newSelection);
            return nextTracks;
        });

    }, [clipboardClips, currentTime, pushToHistory]);

    const handleExtractAudio = useCallback(() => {
        if (selectedClipIds.length === 0) return;

        setTracks(prev => {
            const audioTrack = prev.find(t => t.type === 'audio' && !t.locked);
            if (!audioTrack) {
                alert(language === 'tr' ? 'Uygun ses kanalı bulunamadı' : 'No available audio track found');
                return prev;
            }

            let hasChanged = false;
            let alreadyExtractedCount = 0;

            const newTracks = prev.map(track => {
                if (track.type === 'video') {
                    const clipsToProcess = track.clips.filter(c => selectedClipIds.includes(c.id));
                    if (clipsToProcess.length === 0) return track;

                    // Modify clean check
                    const unextractedClips = clipsToProcess.filter(c => c.hasAudio !== false);
                    if (unextractedClips.length === 0) {
                        alreadyExtractedCount += clipsToProcess.length;
                        return track;
                    }

                    hasChanged = true;
                    return {
                        ...track,
                        clips: track.clips.map(c => {
                            if (selectedClipIds.includes(c.id) && c.hasAudio !== false) {
                                return { ...c, muted: true, hasAudio: false };
                            }
                            return c;
                        })
                    };
                }
                return track;
            });

            if (!hasChanged) {
                if (alreadyExtractedCount > 0) {
                    // alert(language === 'tr' ? 'Seçili videoların sesi zaten ayrılmış' : 'Audio already extracted from selected videos');
                }
                return prev;
            }

            // Now add audio clips
            // We need to find the video clips again to create audio counterparts
            // Simplification: We already marked them in newTracks. 
            // Ideally we should process everything in one pass, but React state setter needs pure function.
            // Let's iterate AGAIN over original tracks to find the valid clips to extract

            const clipsToExtract: TimelineClip[] = [];
            prev.forEach(track => {
                if (track.type === 'video') {
                    track.clips.forEach(c => {
                        if (selectedClipIds.includes(c.id) && c.hasAudio !== false) {
                            clipsToExtract.push(c);
                        }
                    });
                }
            });

            const newAudioClips = clipsToExtract.map(videoClip => ({
                ...videoClip,
                id: generateId(),
                type: 'audio' as const,
                trackId: audioTrack.id,
                fileId: videoClip.fileId,
                muted: false,
                volume: 100
            }));

            pushToHistory(prev);

            // Add audio clips to audio track
            return newTracks.map(track => {
                if (track.id === audioTrack.id) {
                    return { ...track, clips: [...track.clips, ...newAudioClips] };
                }
                return track;
            });
        });
    }, [selectedClipIds, language, pushToHistory]);

    const removeClipsForFile = useCallback((fileId: string) => {
        setTracks(prev => {
            const hasChanges = prev.some(t => t.clips.some(c => c.fileId === fileId));
            if (hasChanges) pushToHistory(prev);
            return prev.map(track => ({
                ...track,
                clips: track.clips.filter(clip => clip.fileId !== fileId)
            }));
        });
    }, [pushToHistory]);

    return {
        tracks, setTracks,
        currentTime, setCurrentTime,
        isPlaying, setIsPlaying,
        selectedClipIds,
        handleClipSelect, // NEW: Replaces setSelectedClipId
        volume, setVolume,
        pixelsPerSecond, setPixelsPerSecond,
        clipboardClips, // NEW
        duration,
        handleDropFile,
        handleClipMove,
        handleClipTrim,
        handleClipDelete,
        handleTrackMuteToggle,
        handleTrackLockToggle,
        handleSplitClip: handleSplitClipRobust,
        handleCopy,
        handleCut,
        handlePaste: handlePasteRobust,
        handleUndo,
        handleRedo,
        handleExtractAudio,
        removeClipsForFile,
        canUndo: history.length > 0,
        canRedo: future.length > 0
    };
}
