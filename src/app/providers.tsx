"use client";

import { LanguageProvider } from "@/lib/LanguageContext";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <LanguageProvider>
            {children}
        </LanguageProvider>
    );
}
