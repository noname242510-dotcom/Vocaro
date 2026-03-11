import type { Metadata } from "next";
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Inter, Outfit } from 'next/font/google';
import { cn } from "@/lib/utils";
import { ClientToaster } from "@/components/client-toaster";

export const metadata: Metadata = {
  title: "Vocaro",
  description: "Foto hochladen. Vokabeln lernen.",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
  icons: {
    icon: '/AppImages/ios/64.png',
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
    <html lang="de" className="light" suppressHydrationWarning>
      <body className={cn("antialiased min-h-screen font-body", inter.variable, outfit.variable)} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
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
