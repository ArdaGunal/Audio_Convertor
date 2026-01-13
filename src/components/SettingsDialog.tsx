"use client";

import React, { useState } from "react";
import {
    X,
    Settings,
    Globe,
    Moon,
    RotateCcw,
    Github,
    Laptop
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useTranslation } from "@/lib/LanguageContext";
import { clearAllFilesFromStorage } from "@/lib/storage";

export default function SettingsDialog() {
    const { t, language, setLanguage, languageNames } = useTranslation();
    const [theme, setTheme] = useState("dark");

    const handleClearData = async () => {
        if (confirm(language === 'tr' ? 'Tüm dosyalar silinecek. Emin misiniz?' : 'All files will be deleted. Are you sure?')) {
            await clearAllFilesFromStorage('audio');
            await clearAllFilesFromStorage('video');
            window.location.reload();
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white/40 hover:text-white">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Settings className="w-5 h-5 text-cyan-400" />
                        {t.settings.title}
                    </DialogTitle>
                    <DialogDescription className="text-white/40">
                        {t.settings.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">

                    {/* Language Setting */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-white/40" />
                            {t.settings.language}
                        </label>
                        <Select value={language} onValueChange={(val) => setLanguage(val as any)}>
                            <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                {Object.entries(languageNames).map(([code, name]) => (
                                    <SelectItem key={code} value={code}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Theme Setting */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                            <Laptop className="w-4 h-4 text-white/40" />
                            {t.settings.theme}
                        </label>
                        <Select value={theme} onValueChange={setTheme}>
                            <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="w-4 h-4" /> {t.settings.dark}</div></SelectItem>
                                <SelectItem value="system"><div className="flex items-center gap-2"><Laptop className="w-4 h-4" /> {t.settings.system}</div></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Reset */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <div className="text-sm text-red-200/60">
                            {language === 'tr' ? 'Tüm verileri temizle' : 'Clear all data'}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8"
                            onClick={handleClearData}
                        >
                            <RotateCcw className="w-3 h-3 mr-2" />
                            {language === 'tr' ? 'Sıfırla' : 'Reset'}
                        </Button>
                    </div>

                </div>

                <DialogFooter className="sm:justify-between items-center border-t border-white/5 pt-4">
                    <a href="https://github.com/ArdaGunal/Audio_Convertor" target="_blank" rel="noreferrer" className="text-xs text-white/30 hover:text-white flex items-center gap-1 transition-colors">
                        <Github className="w-3 h-3" />
                        ArdaGunal/Audio_Convertor
                    </a>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" className="bg-white text-black hover:bg-white/90">
                            {t.settings.close}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
