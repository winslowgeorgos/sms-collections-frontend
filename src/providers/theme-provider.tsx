"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import { type PropsWithChildren } from "react";

export function ThemeProvider({ children }: PropsWithChildren) {
    return (
        <NextThemeProvider 
            disableTransitionOnChange 
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            value={{ light: "light-mode" }}  // Only light theme mapped
        >
            {children}
        </NextThemeProvider>
    );
}