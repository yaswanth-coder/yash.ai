"use client";

import React, { useState, useEffect, useRef } from "react";
import { Code2, X, Copy, Check, Play, ExternalLink, Monitor, FileCode } from "lucide-react";

interface CanvasStudioProps {
  initialCode?: string;
  language?: string;
  onClose: () => void;
}

type PreviewMode = "html" | "js" | "react" | "markdown";

export default function CanvasStudio({ initialCode = "", language = "html", onClose }: CanvasStudioProps) {
  const [code, setCode] = useState(initialCode);
  const [previewSrc, setPreviewSrc] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const buildPreview = (src: string) => {
    if (language === "html" || language === "svg") {
      return src;
    }
    if (language === "javascript" || language === "js") {
      return `<!DOCTYPE html><html><body><script type="module">${src}<\/script></body></html>`;
    }
    if (language === "css") {
      return `<!DOCTYPE html><html><head><style>${src}</style></head><body><div class="preview">CSS Preview Active</div></body></html>`;
    }
    // Default wrapper for unknown languages
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { background: #0e0e10; color: #e4e4e7; font-family: monospace; padding: 20px; font-size: 13px; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
  </style>
</head>
<body><pre>${src.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body>
</html>`;
  };

  const handleRun = () => {
    const html = buildPreview(code);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setPreviewSrc(url);
    setActiveTab("preview");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = language === "javascript" ? "js" : language || "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yash_ai_canvas.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (initialCode) {
      handleRun();
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-7xl h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-zinc-900/90 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <Code2 className="w-4 h-4 text-blue-400" />
              <span>Canvas Studio</span>
              <span className="px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/25 text-[10px] uppercase font-bold">
                {language}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex rounded-xl overflow-hidden border border-zinc-800 text-xs">
              <button
                onClick={() => setActiveTab("editor")}
                className={`px-3 py-1.5 font-semibold transition-colors ${
                  activeTab === "editor"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 inline mr-1" />
                Editor
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 font-semibold transition-colors ${
                  activeTab === "preview"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Monitor className="w-3.5 h-3.5 inline mr-1" />
                Preview
              </button>
            </div>

            <button
              onClick={handleRun}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Preview
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Download
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Pane */}
        <div className="flex flex-1 overflow-hidden">
          {/* Code Editor */}
          <div className={`flex flex-col ${activeTab === "editor" ? "flex-1" : "hidden lg:flex lg:w-1/2"} border-r border-zinc-800`}>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 p-5 bg-zinc-950 text-zinc-200 font-mono text-sm resize-none focus:outline-none leading-relaxed custom-scrollbar"
              spellCheck={false}
              placeholder="Paste or write your code here..."
            />
          </div>

          {/* Live Preview */}
          <div className={`flex flex-col bg-white ${activeTab === "preview" ? "flex-1" : "hidden lg:flex lg:w-1/2"}`}>
            {previewSrc ? (
              <iframe
                ref={iframeRef}
                src={previewSrc}
                className="flex-1 w-full border-0"
                sandbox="allow-scripts allow-same-origin"
                title="Canvas Preview"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-500 text-sm flex-col gap-3">
                <Monitor className="w-10 h-10 text-zinc-700" />
                <span>Click <strong className="text-white">Run Preview</strong> to render your code here.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
