"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2, Radio, Music, Tv, Youtube, Sliders } from "lucide-react";
import { AudioFile } from "@/lib/types";
import { useTranslation } from "@/lib/LanguageContext";

interface NormalizeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    files: AudioFile[];
    onNormalize: (fileIds: string[], targetLUFS: number, truePeak: number) => Promise<void>;
}

type NormalizePreset = {
    id: string;
    name: string;
    description: string;
    lufs: number;
    icon: React.ReactNode;
    color: string;
};

export default function NormalizeDialog({ isOpen, onClose, files, onNormalize }: NormalizeDialogProps) {
    const { language } = useTranslation();
    const [selectedPreset, setSelectedPreset] = useState<string>("podcast");
    const [customLUFS, setCustomLUFS] = useState(-16);
    const [truePeak, setTruePeak] = useState(-1.0);
    const [isProcessing, setIsProcessing] = useState(false);

    const presets: NormalizePreset[] = [
        {
            id: "podcast",
            name: language === 'tr' ? "Podcast" : "Podcast",
            description: language === 'tr' ? "Konuşma ve podcast için ideal" : "Ideal for speech and podcasts",
            lufs: -16,
            icon: <Radio className="w-5 h-5" />,
            color: "from-purple-500 to-pink-500"
        },
        {
            id: "music",
            name: language === 'tr' ? "Müzik" : "Music",
            description: language === 'tr' ? "Müzik prodüksiyonu için" : "For music production",
            lufs: -14,
            icon: <Music className="w-5 h-5" />,
            color: "from-cyan-500 to-blue-500"
        },
        {
            id: "broadcast",
            name: language === 'tr' ? "Yayın (EBU R128)" : "Broadcast (EBU R128)",
            description: language === 'tr' ? "TV ve radyo standardı" : "TV and radio standard",
            lufs: -23,
            icon: <Tv className="w-5 h-5" />,
            color: "from-orange-500 to-red-500"
        },
        {
            id: "youtube",
            name: "YouTube",
            description: language === 'tr' ? "YouTube ve sosyal medya" : "YouTube and social media",
            lufs: -14,
            icon: <Youtube className="w-5 h-5" />,
            color: "from-red-500 to-pink-500"
        },
        {
            id: "custom",
            name: language === 'tr' ? "Özel" : "Custom",
            description: language === 'tr' ? "Kendi değerini belirle" : "Set your own value",
            lufs: customLUFS,
            icon: <Sliders className="w-5 h-5" />,
            color: "from-zinc-500 to-zinc-600"
        }
    ];

    const selectedPresetData = presets.find(p => p.id === selectedPreset);
    const targetLUFS = selectedPreset === "custom" ? customLUFS : selectedPresetData?.lufs || -16;

    const handleNormalize = async () => {
        setIsProcessing(true);
        try {
            const fileIds = files.map(f => f.id);
            await onNormalize(fileIds, targetLUFS, truePeak);
            onClose();
        } catch (error) {
            console.error("Normalize error:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Volume2 className="w-5 h-5 text-cyan-400" />
                        {language === 'tr' ? 'Ses Normalizasyonu' : 'Audio Normalization'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* File info */}
                    <div className="text-sm text-zinc-400">
                        <span className="font-medium text-white">
                            {files.length === 1 ? files[0].name : `${files.length} ${language === 'tr' ? 'dosya' : 'files'}`}
                        </span>
                    </div>

                    {/* Preset selection */}
                    <div className="space-y-3">
                        <label className="text-sm text-zinc-400 uppercase tracking-wider">
                            {language === 'tr' ? 'Preset Seç' : 'Select Preset'}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {presets.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => setSelectedPreset(preset.id)}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${selectedPreset === preset.id
                                            ? 'border-cyan-500 bg-cyan-500/10'
                                            : 'border-white/10 bg-zinc-900/50 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg bg-gradient-to-br ${preset.color}`}>
                                            {preset.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-white">{preset.name}</div>
                                            <div className="text-xs text-zinc-500 mt-0.5">{preset.description}</div>
                                            <div className="text-sm text-cyan-400 font-mono mt-1">{preset.lufs} LUFS</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom LUFS input */}
                    {selectedPreset === "custom" && (
                        <div className="space-y-2">
                            <label className="text-sm text-zinc-400 uppercase tracking-wider">
                                {language === 'tr' ? 'Hedef LUFS' : 'Target LUFS'}
                            </label>
                            <input
                                type="number"
                                min={-30}
                                max={-5}
                                step={0.1}
                                value={customLUFS}
                                onChange={(e) => setCustomLUFS(parseFloat(e.target.value))}
                                className="w-full px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                            />
                            <p className="text-xs text-zinc-500">
                                {language === 'tr'
                                    ? 'Tipik değerler: -23 (Yayın), -16 (Podcast), -14 (Müzik/YouTube)'
                                    : 'Typical values: -23 (Broadcast), -16 (Podcast), -14 (Music/YouTube)'}
                            </p>
                        </div>
                    )}

                    {/* Advanced settings */}
                    <div className="space-y-2">
                        <label className="text-sm text-zinc-400 uppercase tracking-wider">
                            {language === 'tr' ? 'True Peak Limiter (dB)' : 'True Peak Limiter (dB)'}
                        </label>
                        <input
                            type="number"
                            min={-3}
                            max={0}
                            step={0.1}
                            value={truePeak}
                            onChange={(e) => setTruePeak(parseFloat(e.target.value))}
                            className="w-full px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                        />
                        <p className="text-xs text-zinc-500">
                            {language === 'tr'
                                ? 'Maksimum tepe seviyesi (distorsiyonu önler)'
                                : 'Maximum peak level (prevents distortion)'}
                        </p>
                    </div>

                    {/* Info box */}
                    <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                        <p className="text-sm text-cyan-300">
                            <strong>{language === 'tr' ? 'Normalizasyon nedir?' : 'What is normalization?'}</strong>
                            <br />
                            {language === 'tr'
                                ? 'Ses seviyesini standart bir düzeye getirir. Çok sessiz kısımları yükseltir, çok yüksek kısımları sınırlar. Birden fazla dosyayı aynı ses seviyesine getirir.'
                                : 'Brings audio level to a standard. Raises quiet parts, limits loud parts. Makes multiple files the same loudness.'}
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/10">
                            {language === 'tr' ? 'İptal' : 'Cancel'}
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handleNormalize}
                        disabled={isProcessing}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {language === 'tr' ? 'İşleniyor...' : 'Processing...'}
                            </>
                        ) : (
                            <>
                                <Volume2 className="w-4 h-4" />
                                {language === 'tr' ? 'Normalize Et' : 'Normalize'}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
