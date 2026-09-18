"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Wand2,
  Download,
  Layers,
  ChevronDown,
  RefreshCw,
  Lock,
  Unlock,
  AlertCircle,
  Clock,
  Brush,
  Maximize2,
  Sliders,
  ZoomIn,
  ZoomOut,
  Upload,
  Check,
  X,
  Copy,
  FolderPlus,
  Compass,
  Grid,
  Eye,
  Info,
  ChevronRight,
  Loader2
} from "lucide-react";
import MobileNav from "@/components/MobileNav";
import ImageMaskEditor from "@/components/ImageMaskEditor";
import {
  fetchAvailableModels,
  enhancePromptApi,
  generateImagesApi,
  editImageApi,
  outpaintImageApi,
  createVariationsApi,
  upscaleImageApi,
  fetchImageHistory,
  exportFormatBlob,
  ImageCapability,
  GeneratedImageItem,
  PromptDecomposition
} from "@/services/images";
import { fetchProjects, ProjectItem } from "@/services/projects";

const ASPECT_RATIOS = [
  { label: "1:1", value: "1:1", desc: "Square", icon: "■" },
  { label: "16:9", value: "16:9", desc: "Landscape", icon: "▬" },
  { label: "9:16", value: "9:16", desc: "Story / Portrait", icon: "▮" },
  { label: "4:3", value: "4:3", desc: "Standard", icon: "▭" },
  { label: "3:4", value: "3:4", desc: "Tall", icon: "▯" },
  { label: "21:9", value: "21:9", desc: "Cinematic Ultrawide", icon: "═" },
  { label: "3:2", value: "3:2", desc: "Photo", icon: "▭" },
];

const STYLES = [
  { id: "Photorealistic", name: "Photorealistic", preview: "📷", tag: "Natural 85mm Optics" },
  { id: "Cinematic", name: "Cinematic", preview: "🎬", tag: "Anamorphic & Haze" },
  { id: "Anime", name: "Anime", preview: "✨", tag: "Luminous Cel-shaded" },
  { id: "3D Render", name: "3D Render", preview: "🔮", tag: "Octane Subsurface" },
  { id: "Digital Art", name: "Digital Art", preview: "🎨", tag: "Expressive Brushwork" },
  { id: "Cyberpunk", name: "Cyberpunk", preview: "🌃", tag: "Neon & Rain Wet Streets" },
  { id: "Indian Traditional", name: "Indian Traditional", preview: "🪔", tag: "Zardozi & Temple Gold" },
  { id: "Luxury", name: "Luxury", preview: "💎", tag: "Editorial Minimalist" },
];

export default function ImageStudioPage() {
  // Model Registry
  const [models, setModels] = useState<ImageCapability[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("gemini:imagen-3.0");
  const activeModel = models.find((m) => m.model_id === selectedModelId) || models[0];

  // Prompt Intelligence & Controls
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegative, setShowNegative] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [style, setStyle] = useState("Photorealistic");
  const [seed, setSeed] = useState<number | null>(null);
  const [seedLocked, setSeedLocked] = useState(false);
  const [batchCount, setBatchCount] = useState<number>(1);
  const [exportFormat, setExportFormat] = useState<"PNG" | "JPEG" | "WEBP">("PNG");

  // Reference Image (Img2Img)
  const [referenceImageB64, setReferenceImageB64] = useState<string | null>(null);
  const [referenceStrength, setReferenceStrength] = useState<number>(0.5);

  // Prompt Decomposition State
  const [decomposition, setDecomposition] = useState<PromptDecomposition | null>(null);

  // Generation Results & Selection
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageItem[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const activeImage = generatedImages[selectedImageIndex] || null;

  // History & Projects
  const [history, setHistory] = useState<GeneratedImageItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // UI State
  const [generating, setGenerating] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [actionProcessing, setActionProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [stagedProgress, setStagedProgress] = useState(0);

  // Inpainting & Canvas Editor Modal
  const [maskEditorOpen, setMaskEditorOpen] = useState(false);

  // Mobile View Switcher (Controls, Canvas, Inspector)
  const [mobileTab, setMobileTab] = useState<"controls" | "canvas" | "inspector">("controls");

  // Zoom / Pan View
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Models, Projects, and History on mount
  useEffect(() => {
    async function initStudio() {
      try {
        const [availModels, userProjects, hist] = await Promise.all([
          fetchAvailableModels(),
          fetchProjects().catch(() => []),
          fetchImageHistory().catch(() => [])
        ]);

        if (availModels && availModels.length > 0) {
          setModels(availModels);
          // Prefer Gemini AI or first available
          const preferred =
            availModels.find((m) => (m.model_id.includes("gemini") || m.model_id.includes("imagen")) && m.is_available) ||
            availModels.find((m) => m.is_available) ||
            availModels[0];
          setSelectedModelId(preferred.model_id);
        }

        if (userProjects && userProjects.length > 0) {
          setProjects(userProjects);
          setSelectedProjectId(userProjects[0].id);
        }

        if (hist && hist.length > 0) {
          setHistory(hist);
          // Pre-load latest history image if no current generation
          if (generatedImages.length === 0) {
            setGeneratedImages([hist[0]]);
            setSelectedImageIndex(0);
          }
        }
      } catch (e) {
        console.error("Error initializing image studio", e);
      }
    }
    initStudio();
  }, []);

  const randomSeed = () => Math.floor(Math.random() * 2147483647);

  // Prompt Intelligence Enhancement
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    setError(null);
    try {
      const res = await enhancePromptApi({
        prompt: prompt.trim(),
        style,
        aspect_ratio: aspectRatio,
        negative_prompt: showNegative ? negativePrompt : undefined
      });
      setPrompt(res.enhanced_prompt);
      if (res.decomposition) {
        setDecomposition(res.decomposition);
      }
      if (res.negative_prompt && !negativePrompt) {
        setNegativePrompt(res.negative_prompt);
        setShowNegative(true);
      }
      setStatusMessage("Prompt enhanced with cinematic & lighting specifications!");
      setTimeout(() => setStatusMessage(null), 4000);
      promptRef.current?.focus();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Prompt enhancement service temporarily unavailable.");
    } finally {
      setEnhancing(false);
    }
  };

  // Upload Reference Image
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImageB64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Primary Synthesize / Generate Execution
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || generating) return;

    setGenerating(true);
    setError(null);
    setStatusMessage("Initializing AI synthesis pipeline...");
    setStagedProgress(15);

    const usedSeed = seedLocked && seed !== null ? seed : randomSeed();
    if (!seedLocked) setSeed(usedSeed);

    const progTimer = setInterval(() => {
      setStagedProgress((p) => (p < 85 ? p + 12 : p));
    }, 450);

    try {
      const results = await generateImagesApi({
        prompt: prompt.trim(),
        negative_prompt: showNegative && negativePrompt.trim() ? negativePrompt.trim() : undefined,
        aspect_ratio: aspectRatio,
        style,
        seed: usedSeed,
        num_images: batchCount,
        model: selectedModelId,
        project_id: selectedProjectId || undefined,
        reference_image: referenceImageB64 || undefined,
        reference_strength: referenceImageB64 ? referenceStrength : undefined
      });

      clearInterval(progTimer);
      setStagedProgress(100);

      if (results && results.length > 0) {
        setGeneratedImages(results);
        setSelectedImageIndex(0);
        setHistory((prev) => [...results, ...prev]);
        setMobileTab("canvas");
        setStatusMessage(`Successfully synthesized ${results.length} image(s)!`);
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        throw new Error("No image returned from synthesis engine.");
      }
    } catch (err: any) {
      clearInterval(progTimer);
      console.error("Generation error:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to generate image. Please try another model.");
    } finally {
      setGenerating(false);
      setStagedProgress(0);
    }
  };

  // Super-resolution AI Upscale
  const handleUpscale = async (factor: 2 | 4) => {
    if (!activeImage) return;
    setActionProcessing(`upscale-${factor}x`);
    setError(null);
    try {
      const res = await upscaleImageApi({
        image: activeImage.url,
        scale_factor: factor,
        project_id: selectedProjectId || undefined
      });
      setGeneratedImages((prev) => [res, ...prev]);
      setSelectedImageIndex(0);
      setHistory((prev) => [res, ...prev]);
      setStatusMessage(`Crisp ${factor}x Super-Resolution complete!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Upscaling failed.");
    } finally {
      setActionProcessing(null);
    }
  };

  // Variations
  const handleVariations = async () => {
    if (!activeImage) return;
    setActionProcessing("variation");
    setError(null);
    try {
      const res = await createVariationsApi({
        image: activeImage.url,
        prompt: activeImage.prompt || prompt,
        num_variations: 4,
        project_id: selectedProjectId || undefined
      });
      setGeneratedImages(res);
      setSelectedImageIndex(0);
      setHistory((prev) => [...res, ...prev]);
      setStatusMessage("Generated 4 artistic variations!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Variations generation failed.");
    } finally {
      setActionProcessing(null);
    }
  };

  // Inpaint execution from ImageMaskEditor
  const handleApplyMaskEdit = async (
    maskB64: string,
    inpaintP: string,
    actionType: "inpaint" | "remove" | "replace"
  ) => {
    if (!activeImage) return;
    setActionProcessing("inpaint");
    setError(null);
    try {
      const res = await editImageApi({
        image: activeImage.url,
        mask: maskB64,
        prompt: inpaintP || prompt,
        action_type: actionType,
        project_id: selectedProjectId || undefined
      });
      setGeneratedImages((prev) => [res, ...prev]);
      setSelectedImageIndex(0);
      setHistory((prev) => [res, ...prev]);
      setMaskEditorOpen(false);
      setStatusMessage("Inpainting edit applied successfully!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Inpainting failed.");
    } finally {
      setActionProcessing(null);
    }
  };

  // Outpaint execution from ImageMaskEditor
  const handleApplyOutpaint = async (
    direction: "left" | "right" | "top" | "bottom" | "all",
    outpaintP: string
  ) => {
    if (!activeImage) return;
    setActionProcessing("outpaint");
    setError(null);
    try {
      const res = await outpaintImageApi({
        image: activeImage.url,
        direction,
        prompt: outpaintP || prompt,
        project_id: selectedProjectId || undefined
      });
      setGeneratedImages((prev) => [res, ...prev]);
      setSelectedImageIndex(0);
      setHistory((prev) => [res, ...prev]);
      setMaskEditorOpen(false);
      setStatusMessage(`Canvas expanded (${direction}) with new surroundings!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Outpaint synthesis failed.");
    } finally {
      setActionProcessing(null);
    }
  };

  // Direct Format Download
  const handleDownload = async (format: "PNG" | "JPEG" | "WEBP") => {
    if (!activeImage) return;
    try {
      // Download directly if already PNG, or convert via exportFormatBlob
      const filename = `yash_ai_${activeImage.model.replace(/[:/]/g, "_")}_${Date.now()}.${format.toLowerCase()}`;
      const response = await fetch(activeImage.url);
      const blob = await response.blob();

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Direct window open fallback
      window.open(activeImage.url, "_blank");
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + Enter to trigger generate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prompt, selectedModelId, aspectRatio, style, seed, seedLocked, batchCount, referenceImageB64]);

  return (
    <div className="min-h-screen bg-[#030307] text-[#f0f0f8] flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Top Studio Bar */}
      <header className="h-14 border-b border-white/10 bg-neutral-950/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/create"
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Back to Creations"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Yash.AI Image Studio
            </span>
            <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Pro Gen-AI
            </span>
          </div>
        </div>

        {/* Center: Model Selector pill */}
        <div className="relative flex items-center gap-2">
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="bg-neutral-900/90 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-neutral-200 font-medium appearance-none pr-8 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            {models.map((m) => (
              <option key={m.model_id} value={m.model_id}>
                {m.name} {m.provider !== "pollinations" && !m.is_available ? "(Key required)" : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 pointer-events-none" />
        </div>

        {/* Right Project Picker & Status */}
        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 bg-neutral-900/70 border border-white/10 px-2.5 py-1 rounded-xl text-xs text-neutral-300">
              <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-transparent border-none text-xs text-neutral-300 focus:outline-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Link
            href="/chat"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Chat Mode
          </Link>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex border-b border-white/10 bg-neutral-950 px-2 py-1 gap-1 sticky top-14 z-20">
        {[
          { id: "controls" as const, label: "Controls", icon: Sliders },
          { id: "canvas" as const, label: "Canvas", icon: Eye },
          { id: "inspector" as const, label: "Inspector", icon: Info },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              mobileTab === id
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Global Status / Alert Toasts */}
      {statusMessage && (
        <div className="bg-indigo-900/80 border-b border-indigo-500/30 px-4 py-2 text-xs text-indigo-200 flex items-center justify-between animate-fadeIn">
          <span className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            {statusMessage}
          </span>
          <button onClick={() => setStatusMessage(null)} className="text-indigo-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/80 border-b border-rose-500/30 px-4 py-2 text-xs text-rose-200 flex items-center justify-between animate-fadeIn">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            {error}
          </span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Staged Loading Bar */}
      {generating && (
        <div className="w-full bg-neutral-900 h-1 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full transition-all duration-300"
            style={{ width: `${stagedProgress}%` }}
          />
        </div>
      )}

      {/* 3-Panel Professional Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ========================================================================= */}
        {/* LEFT PANEL: Creation Controls & Prompt Intelligence                        */}
        {/* ========================================================================= */}
        <aside
          className={`w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 border-r border-white/10 bg-neutral-950/70 p-4 sm:p-5 overflow-y-auto space-y-5 ${
            mobileTab !== "controls" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Prompt Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400" /> Prompt Studio
              </label>
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={enhancing || !prompt.trim()}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors disabled:opacity-40 cursor-pointer"
              >
                {enhancing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3 h-3 text-indigo-400" />
                    Enhance with AI
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <textarea
                ref={promptRef}
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your vision (e.g. A majestic white peacock resting on marble palace pillars at sunset)..."
                className="w-full bg-neutral-900/90 border border-white/15 rounded-2xl p-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none shadow-inner"
              />
              <div className="absolute bottom-2.5 right-3 text-[10px] text-neutral-500 font-mono">
                {prompt.length} chars
              </div>
            </div>

            {/* Prompt Decomposition Chips if available */}
            {decomposition && (
              <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-1.5 text-xs">
                <div className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider">
                  Artistic Breakdown
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {decomposition.lighting && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-200 border border-indigo-500/20 text-[10px]">
                      💡 {decomposition.lighting.slice(0, 30)}...
                    </span>
                  )}
                  {decomposition.composition && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-200 border border-purple-500/20 text-[10px]">
                      📐 {decomposition.composition.slice(0, 30)}...
                    </span>
                  )}
                  {decomposition.style && (
                    <span className="px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-200 border border-pink-500/20 text-[10px]">
                      🎨 {decomposition.style.slice(0, 25)}...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reference Image Uploader (Img2Img) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Reference Image
              </span>
              {referenceImageB64 && (
                <button
                  onClick={() => setReferenceImageB64(null)}
                  className="text-neutral-400 hover:text-rose-400 text-xs font-normal"
                >
                  Remove
                </button>
              )}
            </div>

            {referenceImageB64 ? (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-900/80 border border-white/10">
                <img
                  src={referenceImageB64}
                  alt="Reference"
                  className="w-14 h-14 object-cover rounded-lg border border-white/10"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-xs text-neutral-300">
                    <span>Influence Strength</span>
                    <span className="font-mono text-indigo-400">{Math.round(referenceStrength * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    value={referenceStrength}
                    onChange={(e) => setReferenceStrength(Number(e.target.value))}
                    className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-white/15 hover:border-indigo-500/50 rounded-xl p-3 text-center cursor-pointer bg-neutral-900/40 hover:bg-neutral-900/70 transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleReferenceUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Upload className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                <span className="text-xs text-neutral-400">
                  Drop reference image or <span className="text-indigo-400">browse</span>
                </span>
              </div>
            )}
          </div>

          {/* Aspect Ratio Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300 block">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.value}
                  type="button"
                  onClick={() => setAspectRatio(ar.value)}
                  className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                    aspectRatio === ar.value
                      ? "bg-indigo-600/30 border-indigo-500 text-white font-semibold shadow-sm"
                      : "bg-neutral-900/60 border-white/10 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <div className="text-xs font-mono">{ar.value}</div>
                  <div className="text-[10px] text-neutral-500 truncate">{ar.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Style Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300 block">
              Artistic Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    style === s.id
                      ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm"
                      : "bg-neutral-900/50 border-white/10 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <span className="text-base">{s.preview}</span>
                  <div className="truncate">
                    <div className="text-xs font-medium leading-tight">{s.name}</div>
                    <div className="text-[9px] text-neutral-500 truncate">{s.tag}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Batch Count Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-300">
              <span>Batch Synthesis</span>
              <span className="text-neutral-400 text-[10px] lowercase">contact sheet</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setBatchCount(count)}
                  className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                    batchCount === count
                      ? "bg-indigo-600/30 border-indigo-500 text-white font-semibold"
                      : "bg-neutral-900/60 border-white/10 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {count} {count === 1 ? "Image" : "Images"}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Accordion */}
          <div className="border border-white/10 rounded-2xl p-3 bg-neutral-900/40 space-y-3">
            <button
              type="button"
              onClick={() => setShowNegative(!showNegative)}
              className="flex items-center justify-between w-full text-xs font-medium text-neutral-300 hover:text-white"
            >
              <span>Negative Prompt & Seed Controls</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showNegative ? "rotate-180" : ""}`} />
            </button>

            {showNegative && (
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                    Negative Prompt (What to exclude)
                  </label>
                  <textarea
                    rows={2}
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="blurry, distorted anatomy, cartoonish, low resolution..."
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl p-2.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-xs text-neutral-300">
                    <button
                      type="button"
                      onClick={() => setSeedLocked(!seedLocked)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        seedLocked ? "bg-indigo-600/30 border-indigo-500 text-indigo-300" : "border-white/10 text-neutral-400"
                      }`}
                    >
                      {seedLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>
                    <span>Seed: <span className="font-mono text-neutral-400">{seed ?? "Random"}</span></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSeed(randomSeed())}
                    className="p-1 text-neutral-400 hover:text-white"
                    title="Randomize Seed"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Primary Synthesize Button */}
          <div className="sticky bottom-0 pt-2 pb-1 bg-neutral-950/90 backdrop-blur-md">
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={generating || !prompt.trim()}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Synthesizing {batchCount > 1 ? `${batchCount} Images...` : "Image..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  Synthesize Masterwork
                  <span className="hidden sm:inline text-[10px] opacity-75 font-normal ml-1">(⌘ + ↵)</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* CENTER PANEL: Interactive Canvas & Multi-Image Contact Sheet              */}
        {/* ========================================================================= */}
        <main
          className={`flex-1 flex flex-col bg-neutral-950/40 relative overflow-hidden ${
            mobileTab !== "canvas" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Canvas Overlay Header */}
          <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between bg-neutral-950/60 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400" /> Interactive Canvas
              </span>
              {activeImage && (
                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 border border-white/10 px-2 py-0.5 rounded-md">
                  {activeImage.width} × {activeImage.height}px
                </span>
              )}
            </div>

            {/* Quick Canvas Toolbar */}
            {activeImage && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setMaskEditorOpen(true)}
                  disabled={actionProcessing !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-xl text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
                >
                  <Brush className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Inpaint / Mask</span>
                </button>

                <button
                  onClick={() => handleUpscale(2)}
                  disabled={actionProcessing !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-xl text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
                >
                  {actionProcessing === "upscale-2x" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span className="hidden sm:inline">Upscale 2x</span>
                </button>

                <button
                  onClick={handleVariations}
                  disabled={actionProcessing !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-xl text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
                >
                  {actionProcessing === "variation" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                  )}
                  <span className="hidden sm:inline">Variations (4x)</span>
                </button>

                <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5"
                  title="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5"
                  title="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Main Stage */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-auto relative">
            {generating ? (
              <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-sm">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <Sparkles className="w-8 h-8 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">Synthesizing High-Fidelity Pixels</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Sampling latent noise using {activeModel?.name || "Flux Engine"}...
                  </p>
                </div>
              </div>
            ) : activeImage ? (
              <div className="flex flex-col items-center justify-center w-full h-full">
                {/* Batch Contact Sheet bar if batch > 1 */}
                {generatedImages.length > 1 && (
                  <div className="flex items-center gap-2 mb-4 bg-neutral-900/80 border border-white/10 p-1.5 rounded-2xl backdrop-blur-md">
                    {generatedImages.map((img, idx) => (
                      <button
                        key={img.asset_id || idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                          selectedImageIndex === idx
                            ? "border-indigo-500 shadow-md shadow-indigo-500/30 scale-105"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={img.url} alt={`Variation ${idx + 1}`} className="w-12 h-12 object-cover" />
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-white/90 bg-black/60 px-1 rounded">
                          #{idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Focused Image on Canvas */}
                <div
                  className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-neutral-900/50 transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center" }}
                >
                  <img
                    src={activeImage.url}
                    alt={activeImage.prompt || "Generated artwork"}
                    className="max-h-[68vh] max-w-[85vw] lg:max-w-[55vw] object-contain block rounded-2xl select-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center space-y-3 max-w-sm text-neutral-400">
                <div className="w-16 h-16 rounded-2xl bg-neutral-900/80 border border-white/10 flex items-center justify-center text-indigo-400">
                  <Wand2 className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-sm text-white">Your Canvas is Primed</h3>
                <p className="text-xs text-neutral-500">
                  Enter a visual concept on the left and synthesize stunning images in seconds.
                </p>
              </div>
            )}
          </div>

          {/* Bottom History Filmstrip Carousel */}
          {history.length > 0 && (
            <div className="h-20 border-t border-white/10 bg-neutral-950/90 px-4 flex items-center gap-3 overflow-x-auto select-none">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex-shrink-0 flex items-center gap-1">
                <Clock className="w-3 h-3" /> History
              </span>
              <div className="flex items-center gap-2">
                {history.map((item, idx) => (
                  <button
                    key={item.asset_id || idx}
                    onClick={() => {
                      setGeneratedImages([item]);
                      setSelectedImageIndex(0);
                    }}
                    className={`relative rounded-xl overflow-hidden flex-shrink-0 w-14 h-14 border transition-all ${
                      activeImage?.url === item.url
                        ? "border-indigo-500 ring-2 ring-indigo-500/30 scale-105"
                        : "border-white/10 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={item.url} alt="History thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: Inspector & Actions                                          */}
        {/* ========================================================================= */}
        <aside
          className={`w-full lg:w-[320px] xl:w-[340px] flex-shrink-0 border-l border-white/10 bg-neutral-950/80 p-4 sm:p-5 overflow-y-auto space-y-5 ${
            mobileTab !== "inspector" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" /> Asset Inspector
            </h3>
            <p className="text-[11px] text-neutral-500">Metadata, formats, and studio actions</p>
          </div>

          {activeImage ? (
            <div className="space-y-4">
              {/* Metadata Card */}
              <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-neutral-300">
                  <span className="text-neutral-500">Model Engine</span>
                  <span className="font-semibold text-white">{activeImage.model}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-300">
                  <span className="text-neutral-500">Provider</span>
                  <span className="capitalize text-indigo-300">{activeImage.provider}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-300">
                  <span className="text-neutral-500">Dimensions</span>
                  <span className="font-mono text-neutral-200">
                    {activeImage.width} × {activeImage.height}
                  </span>
                </div>
                {activeImage.metadata?.seed !== undefined && (
                  <div className="flex justify-between items-center text-neutral-300">
                    <span className="text-neutral-500">Seed</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(String(activeImage.metadata?.seed))}
                      className="font-mono text-indigo-400 flex items-center gap-1 hover:text-white"
                      title="Click to copy seed"
                    >
                      {activeImage.metadata.seed}
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Prompt Review */}
              <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400">
                  <span>Prompt Used</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(activeImage.prompt)}
                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-white"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <p className="text-xs text-neutral-200 leading-relaxed max-h-32 overflow-y-auto">
                  {activeImage.prompt}
                </p>
              </div>

              {/* Export & Download Formats */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
                  Download Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["PNG", "JPEG", "WEBP"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => handleDownload(fmt)}
                      className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-neutral-900 border border-white/10 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-indigo-400" />
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Creative Operations */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
                  Studio Operations
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setMaskEditorOpen(true)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-white/10 hover:border-rose-500/40 text-xs font-medium text-neutral-200 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Brush className="w-4 h-4 text-rose-400" /> Inpainting & Object Mask
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                  </button>

                  <button
                    onClick={() => handleUpscale(4)}
                    disabled={actionProcessing !== null}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-white/10 hover:border-indigo-500/40 text-xs font-medium text-neutral-200 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" /> Super-Resolution 4x
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                  </button>

                  <button
                    onClick={handleVariations}
                    disabled={actionProcessing !== null}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-white/10 hover:border-purple-500/40 text-xs font-medium text-neutral-200 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" /> 4-Way Variations
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-6 border border-white/5 rounded-2xl bg-neutral-900/20 text-neutral-500 text-xs">
              Synthesize or select an image to inspect attributes and export.
            </div>
          )}
        </aside>
      </div>

      {/* Inpainting / Outpainting Mask Editor Modal */}
      {maskEditorOpen && activeImage && (
        <ImageMaskEditor
          imageUrl={activeImage.url}
          onClose={() => setMaskEditorOpen(false)}
          onApplyEdit={handleApplyMaskEdit}
          onApplyOutpaint={handleApplyOutpaint}
          isProcessing={actionProcessing === "inpaint" || actionProcessing === "outpaint"}
        />
      )}

      {/* Mobile Navigation bar */}
      <MobileNav />
    </div>
  );
}
