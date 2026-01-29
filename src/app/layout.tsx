import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { PT_Sans, Merriweather, Inconsolata } from 'next/font/google';
import { cn } from "@/lib/utils";
import { ClientToaster } from "@/components/client-toaster";
import { TaskProvider } from "@/contexts/task-context";
import { TaskProgressToast } from "@/components/task-progress-toast";
import { GlobalVerbResultListener } from "@/components/global-verb-result-listener";

export const metadata: Metadata = {
  title: "Vocaro",
  description: "Foto hochladen. Vokabeln lernen.",
  manifest: '/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
  icons: {
    icon: '/AppImages/ios/64.png',
    apple: '/AppImages/ios/180.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Vocaro",
  },
};

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-merriweather',
});

const inconsolata = Inconsolata({
  subsets: ['latin'],
  variable: '--font-inconsolata',
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="light">
      <body className={cn("antialiased min-h-screen font-body", ptSans.variable, merriweather.variable, inconsolata.variable)}>
        <FirebaseClientProvider>
          <TaskProvider>
            {children}
            <TaskProgressToast />
            <GlobalVerbResultListener />
          </TaskProvider>
        </FirebaseClientProvider>
        <ClientToaster />

        {/* --- HIER KOMMT DAS SKRIPT REIN --- */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registriert mit Scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker Registrierung fehlgeschlagen: ', err);
                  });
                });
              }
            `,
          }}
        />
        {/* ---------------------------------- */}
      </body>
    </html>
  );
}
