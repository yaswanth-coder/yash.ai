import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yash.AI — Personal AI Assistant",
  description:
    "Yash.AI is a premium personal AI assistant powered by Gemini. Chat, code, analyze documents, and more.",
  keywords: ["AI assistant", "Gemini", "chat", "code", "Yash.AI"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
