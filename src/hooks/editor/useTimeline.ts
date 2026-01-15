import { useState, useEffect, useCallback } from 'react';
import { TimelineTrack, TimelineClip, MediaFile, generateId } from '@/lib/types';

interface UseTimelineProps {
    files: MediaFile[];
    language: string;
}

export function useTimeline({ files, language }: UseTimelineProps) {
    // Helper to sanitize tracks and ensure unique IDs (fixes legacy data issues)
    const sanitizeTracks = (tracks: TimelineTrack[]): TimelineTrack[] => {
        const seenIds = new Set<string>();
        return tracks.map(track => ({
            ...track,
            clips: track.clips.map(clip => {
                let clipId = clip.id;
                if (seenIds.has(clipId)) {
                    // ID collision detected (likely from old bug), generate new ID
                    clipId = generateId();
                }
                seenIds.add(clipId);
                return { ...clip, id: clipId };
            })
        }));
    };

    const [tracks, setTracks] = useState<TimelineTrack[]>(() => {
        // Try to load saved tracks from localStorage
        if (typeof window !== 'undefined') {
            try {
                const savedTracks = localStorage.getItem('timeline_tracks');
                if (savedTracks) {
                    const parsed = JSON.parse(savedTracks);
                    return sanitizeTracks(parsed);
                }
            } catch (e) {
                console.error('Failed to load timeline tracks:', e);
            }
        }
        // Default tracks if nothing saved
        return [
            {
                id: 'video-track-1',
                type: 'video',
                name: 'Video Track 1',
                clips: [],
                muted: false,
                volume: 100,
                locked: false,
            },
            {
                id: 'audio-track-1',
                type: 'audio',
                name: 'Audio Track 1',
                clips: [],
                muted: false,
                volume: 100,
                locked: false,
            },
        ];
    });

    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [volume, setVolume] = useState(100);
    const [pixelsPerSecond, setPixelsPerSecond] = useState(50);
    const [clipboardClip, setClipboardClip] = useState<{ clip: TimelineClip, type: 'video' | 'audio' } | null>(null);

    // Calculate timeline duration
    const duration = Math.max(
        ...tracks.flatMap(track =>
            track.clips.map(clip => clip.startTime + clip.duration)
        ),
        10 // Minimum 10 seconds for empty timeline
    );

    // Save tracks to localStorage when they change
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

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isPlaying, duration]);


    const handleDropFile = useCallback((file: MediaFile, trackType: 'video' | 'audio', dropTime: number) => {
        // Use file's actual type, not the track type where it was dropped
        const correctTrackType = file.type;

        setTracks(prev => {
            // Find appropriate track based on file type
            const track = prev.find(t => t.type === correctTrackType && !t.locked);
            if (!track) {
                alert(language === 'tr'
                    ? `${correctTrackType === 'video' ? 'Video' : 'Ses'} track bulunamadı veya kilitli`
                    : `${correctTrackType === 'video' ? 'Video' : 'Audio'} track not found or locked`);
                return prev;
            }

            // Smart placement: Find the end of the last clip on this track
            let smartStartTime = 0;
            if (track.clips.length > 0) {
                // Sort clips by start time
                const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
                // Get the last clip's end time
                const lastClip = sortedClips[sortedClips.length - 1];
                smartStartTime = lastClip.startTime + lastClip.duration;
            }

            // Create new clip
            const newClip: TimelineClip = {
                id: generateId(),
                type: file.type,
                trackId: track.id,
                fileId: file.id,
                startTime: smartStartTime, // Place at the end of existing clips
                duration: file.duration || 5,
                trimStart: 0,
                trimEnd: 0,
                volume: 100,
                muted: false,
            };

            return prev.map(t =>
                t.id === track.id
                    ? { ...t, clips: [...t.clips, newClip] }
                    : t
            );
        });
    }, [language]); // Only depend on language

    const handleClipMove = useCallback((clipId: string, newStartTime: number) => {
        setTracks(prev => prev.map(track => ({
            ...track,
            clips: track.clips.map(clip =>
                clip.id === clipId ? { ...clip, startTime: newStartTime } : clip
            )
        })));
    }, []);

    const handleClipTrim = useCallback((clipId: string, newTrimStart: number, newTrimEnd: number) => {
        setTracks(prev => prev.map(track => ({
            ...track,
            clips: track.clips.map(clip => {
                if (clip.id === clipId) {
                    const file = files.find(f => f.id === clip.fileId); // Note: this creates dependency on files
                    // However, we can also pass files or use a ref if we want to avoid re-creating this callback often.
                    // For now, depending on files is acceptable for data integrity.

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
        })));
    }, [files]);

    const handleClipDelete = useCallback((clipId: string) => {
        setTracks(prev => prev.map(track => ({
            ...track,
            clips: track.clips.filter(clip => clip.id !== clipId)
        })));
        setSelectedClipId(prev => prev === clipId ? null : prev);
    }, []);

    const handleTrackMuteToggle = useCallback((trackId: string) => {
        setTracks(prev => prev.map(track =>
            track.id === trackId ? { ...track, muted: !track.muted } : track
        ));
    }, []);

    const handleTrackLockToggle = useCallback((trackId: string) => {
        setTracks(prev => prev.map(track =>
            track.id === trackId ? { ...track, locked: !track.locked } : track
        ));
    }, []);

    const handleSplitClip = useCallback(() => {
        if (!selectedClipId) return;

        setTracks(prev => {
            let clipToSplit: TimelineClip | null = null;
            let trackId: string | null = null;

            // Find the selected clip in the *latest* state
            for (const track of prev) {
                const clip = track.clips.find(c => c.id === selectedClipId);
                if (clip) {
                    clipToSplit = clip;
                    trackId = track.id;
                    break;
                }
            }

            if (!clipToSplit || !trackId) return prev;

            // Check boundaries
            const clipEnd = clipToSplit.startTime + clipToSplit.duration;
            if (currentTime <= clipToSplit.startTime || currentTime >= clipEnd) {
                // Alerting inside a setState callback is bad pattern, but for legacy support we keep it simple.
                // Better to move logic out, but here we need access to latest Tracks.
                // We'll skip alert here or handle it differently? 
                // Actually this logic was previously outside setTracks.
                // Let's refactor to read state first, but we need LATEST state.
                // Since we have `tracks` in scope, we can use it, but strictly `prev` is safer.
                return prev;
            }

            // Calculate split point
            const splitPoint = currentTime - clipToSplit.startTime;

            // Create two new clips
            const clip1: TimelineClip = {
                ...clipToSplit,
                id: generateId(),
                duration: splitPoint,
                trimEnd: clipToSplit.trimEnd + (clipToSplit.duration - splitPoint),
            };

            const clip2: TimelineClip = {
                ...clipToSplit,
                id: generateId(),
                startTime: currentTime,
                duration: clipToSplit.duration - splitPoint,
                trimStart: clipToSplit.trimStart + splitPoint,
            };

            // Select the first part
            // Side effect in reducer? No. We'll set selectedClipId outside/after.
            // We need a way to signal this. For now let's just do the mutation.

            return prev.map(track => {
                if (track.id === trackId) {
                    return {
                        ...track,
                        clips: track.clips
                            .filter(c => c.id !== selectedClipId)
                            .concat([clip1, clip2])
                            .sort((a, b) => a.startTime - b.startTime)
                    };
                }
                return track;
            });
        });

        // Note: selectedClipId update is slightly async from the track update above but acceptable.
        // To be perfectly precise, we'd need to know the new IDs here. 
        // We can't easily set selectedClipId to clip1.id here because clip1 is created inside the callback scope 
        // if we follow the pure functional pattern stricly. 

        // REVERTING TO SIMPLE LOGIC for Split to avoid complexity, but using tracks dependency.
        // See implementation below.
    }, [selectedClipId, currentTime]); // DEPENDS on tracks? See below rewrite.

    // Better Split Implementation that is cleaner
    const handleSplitClipRobust = useCallback(() => {
        if (!selectedClipId) return;

        // We need direct access to tracks to validate. 
        // Since `tracks` is in dependency, this callback updates when tracks change.
        let clipToSplit: TimelineClip | null = null;
        let trackId: string | null = null;

        for (const track of tracks) {
            const clip = track.clips.find(c => c.id === selectedClipId);
            if (clip) {
                clipToSplit = clip;
                trackId = track.id;
                break;
            }
        }

        if (!clipToSplit || !trackId) return;

        const clipEnd = clipToSplit.startTime + clipToSplit.duration;
        if (currentTime <= clipToSplit.startTime || currentTime >= clipEnd) {
            alert(language === 'tr'
                ? 'Playhead clip i\u00e7inde de\u011fil'
                : 'Playhead is not within the clip');
            return;
        }

        const splitPoint = currentTime - clipToSplit.startTime;
        const newId1 = generateId();
        const newId2 = generateId();

        const clip1: TimelineClip = {
            ...clipToSplit,
            id: newId1,
            duration: splitPoint,
            trimEnd: clipToSplit.trimEnd + (clipToSplit.duration - splitPoint),
        };

        const clip2: TimelineClip = {
            ...clipToSplit,
            id: newId2,
            startTime: currentTime,
            duration: clipToSplit.duration - splitPoint,
            trimStart: clipToSplit.trimStart + splitPoint,
        };

        setTracks(prev => prev.map(track => {
            if (track.id === trackId) {
                return {
                    ...track,
                    clips: track.clips
                        .filter(c => c.id !== selectedClipId)
                        .concat([clip1, clip2])
                        .sort((a, b) => a.startTime - b.startTime)
                };
            }
            return track;
        }));
        setSelectedClipId(newId1);

    }, [tracks, selectedClipId, currentTime, language]);


    const handleCopy = useCallback(() => {
        if (!selectedClipId) return;

        let foundClip: TimelineClip | undefined;
        let foundType: 'video' | 'audio' | undefined;

        for (const track of tracks) {
            const clip = track.clips.find(c => c.id === selectedClipId);
            if (clip) {
                foundClip = clip;
                foundType = track.type;
                break;
            }
        }

        if (foundClip && foundType) {
            setClipboardClip({ clip: { ...foundClip }, type: foundType });
        }
    }, [tracks, selectedClipId]);

    const handleCut = useCallback(() => {
        handleCopy();
        if (selectedClipId) {
            handleClipDelete(selectedClipId);
        }
    }, [handleCopy, handleClipDelete, selectedClipId]);

    const handlePaste = useCallback(() => {
        if (!clipboardClip) return;

        setTracks(prev => {
            // Use functional update to be safe
            // We need to find target track in current state
            const targetTrack = prev.find(t => t.type === clipboardClip.type && !t.locked);

            if (!targetTrack) return prev;

            const newClipId = generateId();
            const newClip = {
                ...clipboardClip.clip,
                id: newClipId,
                startTime: currentTime,
            };

            // Queue the selection update? We can't do it here easily.
            // Using a ref or Effect for selection could be cleaner, but for now:
            // We can't setSelectedClipId inside here safely if we want to be pure.
            // But we can just use the outer scope `setSelectedClipId` if we accept that it runs after render.
            // Actually, let's just do it outside.

            return prev.map(track => {
                if (track.id === targetTrack.id) {
                    return {
                        ...track,
                        clips: [...track.clips, newClip]
                    };
                }
                return track;
            });
        });

        // This is slightly tricky: specific new ID is generated inside the callback in my thought above, 
        // but needs to be known outside.
        // Solution: Generate ID outside the setState callback.

    }, [clipboardClip, currentTime]); // This version was incomplete logic-wise. 

    // Correct Handle Paste
    const handlePasteRobust = useCallback(() => {
        if (!clipboardClip) return;

        const newClipId = generateId();
        const newClip = {
            ...clipboardClip.clip,
            id: newClipId,
            startTime: currentTime,
        };

        setTracks(prev => {
            const targetTrack = prev.find(t => t.type === clipboardClip.type && !t.locked);
            if (!targetTrack) return prev;

            return prev.map(track => {
                if (track.id === targetTrack.id) {
                    return {
                        ...track,
                        clips: [...track.clips, newClip]
                    };
                }
                return track;
            });
        });
        setSelectedClipId(newClipId);
    }, [clipboardClip, currentTime]);


    // Helper to remove clips when file is deleted
    const removeClipsForFile = useCallback((fileId: string) => {
        setTracks(prev => prev.map(track => ({
            ...track,
            clips: track.clips.filter(clip => clip.fileId !== fileId)
        })));
    }, []);

    return {
        tracks,
        setTracks,
        currentTime,
        setCurrentTime,
        isPlaying,
        setIsPlaying,
        selectedClipId,
        setSelectedClipId,
        volume,
        setVolume,
        pixelsPerSecond,
        setPixelsPerSecond,
        clipboardClip,
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
        removeClipsForFile
    };
}
