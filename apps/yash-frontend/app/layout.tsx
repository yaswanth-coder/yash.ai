import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaProvider } from "@/context/PwaContext";
import InstallPrompt from "@/components/InstallPrompt";
import IosInstallModal from "@/components/IosInstallModal";
import OfflineNotice from "@/components/OfflineNotice";

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Yash.AI",
  description:
    "Yash.AI is an intelligent AI workspace for chat, research, image and video creation, coding, agents, files, and productivity.",
  keywords: ["AI assistant", "Gemini", "chat", "code", "Yash.AI", "workspace"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Yash.AI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Yash.AI" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="min-h-full flex flex-col font-sans select-none sm:select-auto" suppressHydrationWarning>
        <PwaProvider>
          <OfflineNotice />
          {children}
          <InstallPrompt />
          <IosInstallModal />
        </PwaProvider>
      </body>
    </html>
  );
}
