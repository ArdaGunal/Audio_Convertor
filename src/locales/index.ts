// Locales index - Add new languages here
// Yeni dil eklemek için bu dosyayı güncelleyin

import tr from './tr';
import en from './en';

export const locales = {
    tr,
    en,
};

// Add new language codes here
export type Language = 'tr' | 'en';

// Language display names
export const languageNames: Record<Language, string> = {
    tr: '🇹🇷 Türkçe',
    en: '🇬🇧 English',
};

// Default language
export const defaultLanguage: Language = 'en';

// Type inference from translations
export type Translations = typeof tr;
