
import React, { useRef, useEffect } from 'react';
import { Scissors, Copy, Clipboard, Trash2, SplitSquareHorizontal } from 'lucide-react';
import { useTranslation } from "@/lib/LanguageContext";

export type ContextMenuAction = 'split' | 'cut' | 'copy' | 'paste' | 'delete';

interface ContextMenuProps {
    x: number;
    y: number;
    onAction: (action: ContextMenuAction) => void;
    onClose: () => void;
    canPaste: boolean;
    isClipContext: boolean;
}

export default function ContextMenu({ x, y, onAction, onClose, canPaste, isClipContext }: ContextMenuProps) {
    const { language } = useTranslation();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        // Delay adding event listener to avoid immediate closing if triggered by click
        // setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        // }, 0);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const items = [
        { id: 'split', icon: SplitSquareHorizontal, label: language === 'tr' ? 'Böl' : 'Split', shortcut: 'Ctrl+B', disabled: !isClipContext },
        { id: 'cut', icon: Scissors, label: language === 'tr' ? 'Kes' : 'Cut', shortcut: 'Ctrl+X', disabled: !isClipContext },
        { id: 'copy', icon: Copy, label: language === 'tr' ? 'Kopyala' : 'Copy', shortcut: 'Ctrl+C', disabled: !isClipContext },
        { id: 'paste', icon: Clipboard, label: language === 'tr' ? 'Yapıştır' : 'Paste', shortcut: 'Ctrl+V', disabled: !canPaste },
        { id: 'delete', icon: Trash2, label: language === 'tr' ? 'Sil' : 'Delete', shortcut: 'Del', danger: true, disabled: !isClipContext },
    ];

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-xl py-1 overflow-hidden"
            style={{ left: x, top: y }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {items.map((item) => (
                <button
                    key={item.id}
                    onClick={() => {
                        if (item.disabled) return;
                        onAction(item.id as ContextMenuAction);
                        onClose();
                    }}
                    disabled={item.disabled}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                        ${item.disabled
                            ? 'opacity-50 cursor-not-allowed text-zinc-500'
                            : item.danger
                                ? 'text-red-400 hover:bg-red-500/10'
                                : 'text-zinc-200 hover:bg-white/10'
                        }`}
                >
                    <item.icon className="w-4 h-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                        <span className="text-xs text-zinc-500 font-mono">{item.shortcut}</span>
                    )}
                </button>
            ))}
        </div>
    );
}
