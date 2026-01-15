"use client";

import React from "react";
import { CheckCircle2, FolderOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/LanguageContext";

interface ExportSuccessDialogProps {
    isOpen: boolean;
    fileName: string;
    onClose: () => void;
}

export default function ExportSuccessDialog({ isOpen, onClose, fileName }: ExportSuccessDialogProps) {
    const { language } = useTranslation();

    if (!isOpen) return null;

    const handleOpenFolder = () => {
        // Browser can't open folders directly, but we can show a helpful message
        alert(language === 'tr'
            ? 'Dosya indirilenler klasörünüze kaydedildi!'
            : 'File saved to your downloads folder!');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl">
                {/* Success Icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"></div>
                        <div className="relative bg-green-500/10 p-4 rounded-full border border-green-500/20">
                            <CheckCircle2 className="w-16 h-16 text-green-400" />
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white text-center mb-2">
                    {language === 'tr' ? 'Aktarıldı!' : 'Exported!'}
                </h2>

                {/* File Name */}
                <p className="text-sm text-zinc-400 text-center mb-6">
                    <span className="text-zinc-500">{language === 'tr' ? 'Dosya:' : 'File:'}</span>
                    <br />
                    <span className="text-white font-mono">{fileName}</span>
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={handleOpenFolder}
                        className="w-full bg-purple-500 hover:bg-purple-400 text-white"
                    >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        {language === 'tr' ? 'Klasörü Aç' : 'Open Folder'}
                    </Button>
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="w-full text-zinc-400 hover:text-white"
                    >
                        {language === 'tr' ? 'Kapat' : 'Close'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
