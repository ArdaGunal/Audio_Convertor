
import { useEffect, useState } from 'react';

export type ShortcutAction = 'split' | 'delete' | 'playPause' | 'cut' | 'copy' | 'paste';

export interface ShortcutMap {
    split: string;
    delete: string;
    playPause: string;
    cut: string;
    copy: string;
    paste: string;
}

export const DEFAULT_SHORTCUTS: ShortcutMap = {
    split: 'Ctrl+B', // User requested Ctrl+B for split/cut (bölme)
    delete: 'Delete',
    playPause: 'Space',
    cut: 'Ctrl+X',
    copy: 'Ctrl+C',
    paste: 'Ctrl+V',
};

export const SHORTCUT_LABELS: Record<ShortcutAction, { tr: string, en: string }> = {
    split: { tr: 'Böl', en: 'Split' },
    delete: { tr: 'Sil', en: 'Delete' },
    playPause: { tr: 'Oynat/Duraklat', en: 'Play/Pause' },
    cut: { tr: 'Kes', en: 'Cut' },
    copy: { tr: 'Kopyala', en: 'Copy' },
    paste: { tr: 'Yapıştır', en: 'Paste' },
};

export function useShortcuts() {
    const [shortcuts, setShortcuts] = useState<ShortcutMap>(DEFAULT_SHORTCUTS);

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('editor_shortcuts');
                if (saved) {
                    setShortcuts({ ...DEFAULT_SHORTCUTS, ...JSON.parse(saved) });
                }
            } catch (e) {
                console.error('Failed to load shortcuts:', e);
            }
        }
    }, []);

    const saveShortcuts = (newShortcuts: ShortcutMap) => {
        setShortcuts(newShortcuts);
        if (typeof window !== 'undefined') {
            localStorage.setItem('editor_shortcuts', JSON.stringify(newShortcuts));
        }
    };

    const resetShortcuts = () => {
        saveShortcuts(DEFAULT_SHORTCUTS);
    };

    // Helper to check if event matches shortcut
    const matchesShortcut = (e: KeyboardEvent, action: ShortcutAction): boolean => {
        const shortcut = shortcuts[action];
        const parts = shortcut.split('+');
        const key = parts[parts.length - 1];
        const ctrl = parts.includes('Ctrl');
        const shift = parts.includes('Shift');
        const alt = parts.includes('Alt');

        // Handle specific keys mapping to event.code or event.key
        // Space is typically e.code === 'Space'
        // Letters are e.code === 'KeyX' or e.key === 'x'

        // Simple check for modifiers
        if (e.ctrlKey !== ctrl) return false;
        if (e.shiftKey !== shift) return false;
        if (e.altKey !== alt) return false;

        // Check key
        if (key === 'Space') return e.code === 'Space';
        if (key === 'Delete') return e.code === 'Delete' || e.code === 'Backspace';

        return e.key.toLowerCase() === key.toLowerCase() || e.code === `Key${key.toUpperCase()}`;
    };

    return { shortcuts, saveShortcuts, resetShortcuts, matchesShortcut };
}
