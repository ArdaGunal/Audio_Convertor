"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { locales, Language, Translations, defaultLanguage, languageNames } from '@/locales';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
    languageNames: typeof languageNames;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'audio-convertor-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(defaultLanguage);

    // Load language from localStorage on mount
    useEffect(() => {
        const savedLang = localStorage.getItem(STORAGE_KEY) as Language | null;
        if (savedLang && savedLang in locales) {
            setLanguageState(savedLang);
        } else {
            // Auto-detect from browser
            const browserLang = navigator.language.toLowerCase();
            if (browserLang.startsWith('en')) {
                setLanguageState('en');
            }
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem(STORAGE_KEY, lang);
    };

    const t = locales[language];

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, languageNames }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

// Hook for getting translations
export function useTranslation() {
    const { t, language, setLanguage, languageNames } = useLanguage();
    return { t, language, setLanguage, languageNames };
}
