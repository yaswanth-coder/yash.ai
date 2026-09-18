"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Code2,
  X,
  Copy,
  Check,
  Play,
  ExternalLink,
  Monitor,
  FileCode,
  Smartphone,
  Tablet,
  Laptop,
  RotateCcw,
  Terminal,
  Trash2,
  AlertCircle,
  Info,
  Maximize2,
} from "lucide-react";

interface CanvasStudioProps {
  initialCode?: string;
  language?: string;
  onClose: () => void;
}

interface ConsoleLog {
  id: string;
  level: "info" | "warn" | "error";
  text: string;
  time: string;
}

type DeviceMode = "desktop" | "tablet" | "mobile";

export default function CanvasStudio({
  initialCode = "",
  language = "html",
  onClose,
}: CanvasStudioProps) {
  const [code, setCode] = useState(initialCode);
  const [previewHtml, setPreviewHtml] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("preview");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [runKey, setRunKey] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [showConsole, setShowConsole] = useState(false);

  const langNormalized = (language || "html").toLowerCase().trim();

  // Listen for console logs emitted by the sandboxed iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "CANVAS_CONSOLE") {
        const newLog: ConsoleLog = {
          id: `${Date.now()}-${Math.random()}`,
          level: event.data.level || "info",
          text: event.data.text || "",
          time: new Date().toLocaleTimeString(),
        };
        setConsoleLogs((prev) => [...prev.slice(-99), newLog]);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const buildPreview = (src: string, lang: string) => {
    const l = (lang || "").toLowerCase().trim();

    // Script to inject for capturing logs & uncaught errors
    const consoleBridge = `
      <script>
        (function() {
          function post(level, ...args) {
            try {
              const text = args.map(a => {
                if (a instanceof Error) return a.stack || a.message;
                if (typeof a === 'object') {
                  try { return JSON.stringify(a, null, 2); } catch (_) { return String(a); }
                }
                return String(a);
              }).join(' ');
              window.parent.postMessage({ type: 'CANVAS_CONSOLE', level, text }, '*');
            } catch (_) {}
          }
          const _log = console.log, _warn = console.warn, _err = console.error;
          console.log = function(...a) { _log.apply(console, a); post('info', ...a); };
          console.warn = function(...a) { _warn.apply(console, a); post('warn', ...a); };
          console.error = function(...a) { _err.apply(console, a); post('error', ...a); };
          window.addEventListener('error', function(e) {
            post('error', e.message + (e.filename ? ' (' + e.filename + ':' + e.lineno + ')' : ''));
          });
        })();
      </script>
    `;

    if (["html", "htm", "xhtml", "xml"].includes(l)) {
      if (/<!doctype/i.test(src) || /<html/i.test(src)) {
        // Inject console bridge into <head> or right before </body>
        if (/<head[^>]*>/i.test(src)) {
          return src.replace(/<head[^>]*>/i, `$&${consoleBridge}`);
        }
        return `${consoleBridge}${src}`;
      }
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Canvas Preview</title>
  ${consoleBridge}
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #18181b;
      background: #ffffff;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  ${src}
</body>
</html>`;
    }

    if (l === "svg") {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${consoleBridge}
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #09090b;
      padding: 24px;
    }
    svg { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${src}
</body>
</html>`;
    }

    if (["javascript", "js", "typescript", "ts"].includes(l)) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JS Runtime</title>
  ${consoleBridge}
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: #0a0a0f;
      color: #f4f4f5;
      font-size: 13px;
    }
    #app-output {
      padding: 16px;
      border-radius: 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div id="app-output"></div>
  <script type="module">
    try {
      ${src}
    } catch (err) {
      console.error(err);
    }
  </script>
</body>
</html>`;
    }

    if (l === "css") {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${consoleBridge}
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #09090b;
      color: #f4f4f5;
    }
    .preview-demo {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 600px;
      margin: 0 auto;
    }
    ${src}
  </style>
</head>
<body>
  <div class="preview-demo">
    <h2>CSS Stylesheet Preview</h2>
    <p>Components rendered with your custom CSS styles applied:</p>
    <button class="btn button primary">Interactive Button</button>
    <div class="card box panel">
      <h3>Sample Card</h3>
      <p>Card content rendered live inside the preview viewport.</p>
    </div>
  </div>
</body>
</html>`;
    }

    // Generic fallback: displays code formatted with pre
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      background: #09090b;
      color: #e4e4e7;
      font-family: monospace;
      padding: 20px;
      font-size: 13px;
      margin: 0;
    }
    pre { white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <pre>${src.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;
  };

  const handleRun = () => {
    setConsoleLogs([]);
    const html = buildPreview(code, langNormalized);
    setPreviewHtml(html);
    setRunKey((k) => k + 1);
    setActiveTab("preview");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext =
      langNormalized === "javascript" || langNormalized === "js"
        ? "js"
        : langNormalized === "css"
        ? "css"
        : ["html", "htm"].includes(langNormalized)
        ? "html"
        : "txt";
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yash_ai_project.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    handleRun();
  }, []);

  const deviceWidthClass = useMemo(() => {
    switch (deviceMode) {
      case "mobile":
        return "max-w-[375px] my-auto shadow-2xl border-x border-zinc-800 rounded-3xl overflow-hidden h-[94%]";
      case "tablet":
        return "max-w-[768px] my-auto shadow-2xl border-x border-zinc-800 rounded-2xl overflow-hidden h-[96%]";
      case "desktop":
      default:
        return "w-full h-full";
    }
  }, [deviceMode]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
      style={{
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="w-full max-w-7xl h-[95vh] bg-[#0c0d14] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-zinc-900/90 border-b border-white/10 gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="hidden sm:flex gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 min-w-0">
              <Code2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate">Canvas Studio</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] uppercase font-bold shrink-0">
                {langNormalized}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Mode Tabs (Mobile / Tablet toggle) */}
            <div className="flex rounded-xl overflow-hidden border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("editor")}
                className={`px-2.5 sm:px-3 py-1.5 font-semibold transition-colors touch-target ${
                  activeTab === "editor"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 inline sm:mr-1" />
                <span className="hidden sm:inline">Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-2.5 sm:px-3 py-1.5 font-semibold transition-colors touch-target ${
                  activeTab === "preview"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Monitor className="w-3.5 h-3.5 inline sm:mr-1" />
                <span className="hidden sm:inline">Live Preview</span>
              </button>
            </div>

            {/* Run Preview Button */}
            <button
              type="button"
              onClick={handleRun}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all touch-target cursor-pointer"
              title="Run code in sandbox (Ctrl+Enter)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Run Code</span>
              <span className="sm:hidden">Run</span>
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors touch-target cursor-pointer"
              title="Copy Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
            </button>

            {/* Export / Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors touch-target cursor-pointer"
              title="Download Code File"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Download</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors touch-target cursor-pointer ml-1"
              title="Close Canvas (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Workspace (Editor + Live Preview) */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Code Editor Pane */}
          <div
            className={`flex flex-col ${
              activeTab === "editor" ? "flex-1" : "hidden lg:flex lg:w-1/2"
            } border-r border-zinc-800/80 bg-zinc-950`}
          >
            <div className="px-4 py-2 border-b border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-950/60">
              <span className="font-mono">Editable Source Code</span>
              <span className="text-zinc-600">Changes reflect on Run Code</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleRun();
                }
              }}
              className="flex-1 p-4 bg-zinc-950 text-zinc-100 font-mono text-sm sm:text-xs resize-none focus:outline-none leading-relaxed custom-scrollbar selection:bg-blue-600 selection:text-white"
              spellCheck={false}
              placeholder="Type or paste code here..."
            />
          </div>

          {/* Live Preview Pane */}
          <div
            className={`flex flex-col bg-[#12131a] ${
              activeTab === "preview" ? "flex-1" : "hidden lg:flex lg:w-1/2"
            } relative overflow-hidden`}
          >
            {/* Sub-toolbar on Preview */}
            <div className="px-3 py-1.5 border-b border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/60 shrink-0">
              {/* Device switcher */}
              <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setDeviceMode("desktop")}
                  className={`p-1 rounded transition-colors ${
                    deviceMode === "desktop"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  title="Desktop View (100%)"
                >
                  <Laptop className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode("tablet")}
                  className={`p-1 rounded transition-colors ${
                    deviceMode === "tablet"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  title="Tablet View (768px)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode("mobile")}
                  className={`p-1 rounded transition-colors ${
                    deviceMode === "mobile"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  title="Mobile View (375px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Reload button */}
                <button
                  type="button"
                  onClick={handleRun}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] transition-colors cursor-pointer"
                  title="Refresh Sandbox"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                {/* Console toggle button */}
                <button
                  type="button"
                  onClick={() => setShowConsole((v) => !v)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-mono transition-colors cursor-pointer ${
                    showConsole
                      ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                  title="Toggle Execution Console"
                >
                  <Terminal className="w-3 h-3" />
                  <span>Console</span>
                  {consoleLogs.length > 0 && (
                    <span className="ml-0.5 px-1 rounded-full bg-blue-500 text-white text-[9px]">
                      {consoleLogs.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Iframe Container */}
            <div className="flex-1 w-full h-full flex items-center justify-center p-2 overflow-auto bg-zinc-950/40">
              <div className={`w-full transition-all duration-200 ${deviceWidthClass} bg-white flex flex-col`}>
                <iframe
                  key={runKey}
                  srcDoc={previewHtml}
                  className="w-full flex-1 border-0 bg-white"
                  sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                  title="Canvas Live Execution"
                />
              </div>
            </div>

            {/* In-Studio Console Drawer */}
            {showConsole && (
              <div className="h-44 border-t border-zinc-800 bg-[#09090e] flex flex-col text-xs font-mono shrink-0 animate-fadeIn">
                <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold text-zinc-200">Runtime Console Output</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConsoleLogs([])}
                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2.5 space-y-1 custom-scrollbar text-[11px]">
                  {consoleLogs.length === 0 ? (
                    <div className="text-zinc-600 italic py-2">
                      No logs or runtime errors captured. Output from console.log() will appear here.
                    </div>
                  ) : (
                    consoleLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`flex items-start gap-2 py-0.5 leading-relaxed ${
                          log.level === "error"
                            ? "text-red-400"
                            : log.level === "warn"
                            ? "text-amber-400"
                            : "text-zinc-300"
                        }`}
                      >
                        <span className="text-zinc-600 text-[10px] shrink-0 font-sans">{log.time}</span>
                        <span
                          className={`text-[9px] uppercase px-1 rounded font-bold shrink-0 ${
                            log.level === "error"
                              ? "bg-red-500/20 text-red-400"
                              : log.level === "warn"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="break-all whitespace-pre-wrap">{log.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
