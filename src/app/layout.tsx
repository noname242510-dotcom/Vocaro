import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Inter, Outfit } from 'next/font/google';
import { cn } from "@/lib/utils";
import { ClientToaster } from "@/components/client-toaster";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "Vocaro",
  description: "Foto hochladen. Vokabeln lernen.",
  icons: {
    icon: '/icon.png',
  },
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={cn("antialiased min-h-screen font-body", inter.variable, outfit.variable)} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange={true}
        >
          <FirebaseClientProvider>
            {children}
          </FirebaseClientProvider>
          <ClientToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
