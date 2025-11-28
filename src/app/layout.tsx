// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { RouteProvider } from "@/providers/route-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { ClientLayoutWrapper } from './client-layout-wrapper';

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
  title: 'SMS Collections Console',
  description: 'Collections SMS Reminder Management System',
};

export const viewport: Viewport = {
    colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <RouteProvider>
          <ThemeProvider>
            <AuthProvider>
              <ClientLayoutWrapper>
                {children}
              </ClientLayoutWrapper>
            </AuthProvider>
          </ThemeProvider>
        </RouteProvider>
      </body>
    </html>
  );
}