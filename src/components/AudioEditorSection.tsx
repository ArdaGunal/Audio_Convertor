"use client";

import React, { useState } from "react";
import {
    Layers,
    AudioWaveform,
    Sparkles,
    Volume2,
    Clock,
    Music2,
    Sliders,
    Upload
} from "lucide-react";
import { useTranslation } from "@/lib/LanguageContext";

export default function AudioEditorSection() {
    const [isDragging, setIsDragging] = useState(false);
    const { t } = useTranslation();

    const upcomingFeatures = [
        {
            icon: <Layers className="w-5 h-5" />,
            name: t.editor.multiTrack,
            description: t.editor.multiTrackDesc
        },
        {
            icon: <AudioWaveform className="w-5 h-5" />,
            name: t.editor.timeline,
            description: t.editor.timelineDesc
        },
        {
            icon: <Volume2 className="w-5 h-5" />,
            name: t.editor.effects,
            description: t.editor.effectsDesc
        },
        {
            icon: <Sliders className="w-5 h-5" />,
            name: t.editor.equalizer,
            description: t.editor.equalizerDesc
        }
    ];

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    return (
        <div
            className="h-full flex flex-col items-center justify-center"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            {/* Full Screen Drag Overlay */}
            {isDragging && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <Upload className="w-20 h-20 text-purple-400 mx-auto mb-4 animate-bounce" />
                        <h3 className="text-2xl font-bold text-white">{t.editor.dropHint}</h3>
                        <p className="text-zinc-400 mt-2">{t.editor.dropDesc}</p>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="text-center max-w-2xl mx-auto">
                {/* Icon */}
                <div className="mb-8">
                    <div className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20">
                        <Music2 className="w-16 h-16 text-purple-400" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-white mb-4">
                    {t.editor.title}
                </h2>

                {/* Description */}
                <p className="text-lg text-zinc-400 mb-8">
                    {t.editor.description}
                </p>

                {/* Coming Soon Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 mb-12">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-medium">{t.editor.developing}</span>
                    <Clock className="w-4 h-4" />
                </div>

                {/* Upcoming Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    {upcomingFeatures.map((feature, index) => (
                        <div
                            key={index}
                            className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-purple-500/20 transition-colors"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                    {feature.icon}
                                </div>
                                <div>
                                    <h4 className="font-medium text-white mb-1">{feature.name}</h4>
                                    <p className="text-sm text-zinc-500">{feature.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
