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
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
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
      </body>
    </html>
  );
}
