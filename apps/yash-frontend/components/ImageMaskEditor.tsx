"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  X,
  Brush,
  RotateCcw,
  Sparkles,
  Maximize2,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Layers,
  Check,
  Loader2,
  Trash2
} from "lucide-react";

interface ImageMaskEditorProps {
  imageUrl: string;
  onClose: () => void;
  onApplyEdit: (maskBase64: string, prompt: string, actionType: "inpaint" | "remove" | "replace") => Promise<void>;
  onApplyOutpaint: (direction: "left" | "right" | "top" | "bottom" | "all", prompt: string) => Promise<void>;
  isProcessing: boolean;
}

export default function ImageMaskEditor({
  imageUrl,
  onClose,
  onApplyEdit,
  onApplyOutpaint,
  isProcessing
}: ImageMaskEditorProps) {
  const [mode, setMode] = useState<"inpaint" | "outpaint">("inpaint");
  const [brushSize, setBrushSize] = useState<number>(28);
  const [inpaintPrompt, setInpaintPrompt] = useState<string>("");
  const [actionType, setActionType] = useState<"inpaint" | "remove" | "replace">("inpaint");
  const [outpaintDirection, setOutpaintDirection] = useState<"left" | "right" | "top" | "bottom" | "all">("right");
  const [outpaintPrompt, setOutpaintPrompt] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dimensions, setDimensions] = useState<{ w: number; h: number }>({ w: 800, h: 800 });

  // Load image onto main canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      // Calculate responsive display size preserving aspect ratio
      const maxW = typeof window !== "undefined" ? Math.min(window.innerWidth - 64, 800) : 800;
      const maxH = typeof window !== "undefined" ? Math.min(window.innerHeight - 240, 700) : 700;

      let renderW = img.naturalWidth;
      let renderH = img.naturalHeight;
      const aspect = renderW / renderH;

      if (renderW > maxW) {
        renderW = maxW;
        renderH = renderW / aspect;
      }
      if (renderH > maxH) {
        renderH = maxH;
        renderW = renderH * aspect;
      }

      setDimensions({ w: Math.round(renderW), h: Math.round(renderH) });

      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !maskCanvas) return;

      canvas.width = Math.round(renderW);
      canvas.height = Math.round(renderH);
      maskCanvas.width = Math.round(renderW);
      maskCanvas.height = Math.round(renderH);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, renderW, renderH);
      }

      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        maskCtx.clearRect(0, 0, renderW, renderH);
      }

      setImageLoaded(true);
    };
  }, [imageUrl]);

  const saveState = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;
    const imgData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    setHistory((prev) => [...prev.slice(-10), imgData]);
  }, []);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (mode !== "inpaint") return;
    saveState();
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== "mousedown" && e.type !== "touchstart") return;
    if (mode !== "inpaint") return;

    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    ctx.fillStyle = "rgba(244, 63, 94, 0.65)"; // Vibrant neon rose overlay
    ctx.strokeStyle = "rgba(244, 63, 94, 0.65)";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    const prev = history[history.length - 1];
    maskCtx.putImageData(prev, 0, 0);
    setHistory((prevHist) => prevHist.slice(0, -1));
  };

  const handleClearMask = () => {
    saveState();
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const maskCtx = maskCanvas.getContext("2d");
    if (maskCtx) {
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
  };

  const exportMaskAsBase64 = (): string => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return "";

    // Create export canvas where masked areas are white (255) and unmasked are black (0)
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = maskCanvas.width;
    exportCanvas.height = maskCanvas.height;
    const expCtx = exportCanvas.getContext("2d");
    if (!expCtx) return "";

    // Fill black
    expCtx.fillStyle = "#000000";
    expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Read mask data
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return "";
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const expData = expCtx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);

    for (let i = 0; i < maskData.data.length; i += 4) {
      const alpha = maskData.data[i + 3];
      if (alpha > 20) {
        expData.data[i] = 255;
        expData.data[i + 1] = 255;
        expData.data[i + 2] = 255;
        expData.data[i + 3] = 255;
      }
    }
    expCtx.putImageData(expData, 0, 0);
    return exportCanvas.toDataURL("image/png");
  };

  const handleApply = async () => {
    if (mode === "inpaint") {
      const maskB64 = exportMaskAsBase64();
      await onApplyEdit(maskB64, inpaintPrompt, actionType);
    } else {
      await onApplyOutpaint(outpaintDirection, outpaintPrompt);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-neutral-950/80">
        <div className="flex items-center gap-3">
          <div className="flex bg-neutral-900 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setMode("inpaint")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === "inpaint"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Brush className="w-3.5 h-3.5" />
              Inpaint & Mask
            </button>
            <button
              onClick={() => setMode("outpaint")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === "outpaint"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Canvas Outpaint
            </button>
          </div>

          <span className="text-xs text-neutral-400 hidden sm:inline">
            {mode === "inpaint"
              ? "Paint directly over areas you want to replace, modify, or erase."
              : "Expand canvas boundaries to generate extended scene environment."}
          </span>
        </div>

        <button
          onClick={onClose}
          disabled={isProcessing}
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 relative flex items-center justify-center p-4 bg-neutral-950/50 overflow-auto select-none">
          <div
            className="relative shadow-2xl rounded-xl overflow-hidden border border-white/15 bg-neutral-900/60"
            style={{ width: dimensions.w, height: dimensions.h }}
          >
            {/* Base Image Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 block w-full h-full object-contain pointer-events-none"
            />

            {/* Inpainting Mask Canvas */}
            <canvas
              ref={maskCanvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className={`absolute inset-0 block w-full h-full ${
                mode === "inpaint" ? "cursor-crosshair" : "pointer-events-none"
              }`}
            />

            {/* Outpaint visual guide frame */}
            {mode === "outpaint" && (
              <div
                className={`absolute border-2 border-dashed border-indigo-400/80 bg-indigo-500/10 pointer-events-none transition-all duration-300 ${
                  outpaintDirection === "right"
                    ? "top-0 right-0 bottom-0 w-1/3"
                    : outpaintDirection === "left"
                    ? "top-0 left-0 bottom-0 w-1/3"
                    : outpaintDirection === "top"
                    ? "top-0 left-0 right-0 h-1/3"
                    : outpaintDirection === "bottom"
                    ? "bottom-0 left-0 right-0 h-1/3"
                    : "inset-0 border-indigo-400 bg-indigo-500/15"
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-semibold text-indigo-300 uppercase tracking-wider bg-black/40">
                  New Canvas Zone
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls Sidebar */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-white/10 bg-neutral-950/90 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto max-h-[45vh] lg:max-h-full">
          <div className="space-y-5">
            {mode === "inpaint" ? (
              <>
                {/* Action Type */}
                <div>
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2">
                    Action Type
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["inpaint", "remove", "replace"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setActionType(type)}
                        className={`py-2 px-2 text-xs font-medium rounded-lg border transition-all capitalize ${
                          actionType === type
                            ? "bg-indigo-600/30 border-indigo-500 text-white font-semibold"
                            : "border-white/10 bg-neutral-900/60 text-neutral-400 hover:text-neutral-200"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brush Size Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Brush className="w-3.5 h-3.5 text-neutral-400" /> Brush Diameter
                    </span>
                    <span className="font-mono text-indigo-400">{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={90}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleUndo}
                      disabled={history.length === 0}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-neutral-900 border border-white/10 rounded-lg text-xs text-neutral-300 hover:text-white disabled:opacity-40 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Undo
                    </button>
                    <button
                      onClick={handleClearMask}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-neutral-900 border border-white/10 rounded-lg text-xs text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear Mask
                    </button>
                  </div>
                </div>

                {/* Prompt */}
                <div>
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2">
                    Inpainting Prompt
                  </label>
                  <textarea
                    rows={3}
                    value={inpaintPrompt}
                    onChange={(e) => setInpaintPrompt(e.target.value)}
                    placeholder="Describe what should appear in the painted mask (e.g. golden headphones, cyberpunk neon visor, smooth background)..."
                    className="w-full bg-neutral-900/90 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Outpaint Direction */}
                <div>
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2">
                    Expand Direction
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { dir: "left" as const, label: "Left", icon: ArrowLeft },
                      { dir: "top" as const, label: "Top", icon: ArrowUp },
                      { dir: "right" as const, label: "Right", icon: ArrowRight },
                      { dir: "bottom" as const, label: "Bottom", icon: ArrowDown },
                      { dir: "all" as const, label: "All Sides", icon: Maximize2 },
                    ].map(({ dir, label, icon: Icon }) => (
                      <button
                        key={dir}
                        onClick={() => setOutpaintDirection(dir)}
                        className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
                          outpaintDirection === dir
                            ? "bg-indigo-600/30 border-indigo-500 text-white"
                            : "bg-neutral-900/60 border-white/10 text-neutral-400 hover:text-neutral-200"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Outpaint Prompt */}
                <div>
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2">
                    Surroundings Prompt
                  </label>
                  <textarea
                    rows={3}
                    value={outpaintPrompt}
                    onChange={(e) => setOutpaintPrompt(e.target.value)}
                    placeholder="Describe what to extend around the current image (e.g. wide cinematic landscape, neon city skyline, lush pine forest)..."
                    className="w-full bg-neutral-900/90 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-white/10 flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={isProcessing || !imageLoaded}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Synthesizing Canvas...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {mode === "inpaint" ? "Apply Inpainting" : "Synthesize Expansion"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
