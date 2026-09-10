"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Layout,
  ArrowLeft,
  Sparkles,
  Square,
  Circle,
  Type,
  StickyNote,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Move,
  Wand2,
  Image as ImageIcon,
  Save,
  Download,
  Minus,
  Plus,
} from "lucide-react";

type NodeType = "note" | "rectangle" | "circle" | "text" | "image";

interface CanvasNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  imageUrl?: string;
}

interface Connection {
  from: string;
  to: string;
}

const COLOR_PRESETS = [
  "#1e293b", "#312e81", "#4c1d95", "#134e4a",
  "#422006", "#450a0a", "#fef08a", "#d1fae5",
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function VisualCanvasPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([
    {
      id: "starter-1",
      type: "note",
      x: 120, y: 140,
      width: 200, height: 130,
      content: "🎨 Start brainstorming your visual ideas here...",
      color: "#fef08a",
    },
    {
      id: "starter-2",
      type: "rectangle",
      x: 380, y: 140,
      width: 220, height: 140,
      content: "Hero Section Concept",
      color: "#312e81",
    },
  ]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [canvasId, setCanvasId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const getToken = () => typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";

  // Auto-save every 30 seconds
  useEffect(() => {
    const timer = setInterval(saveCanvas, 30000);
    return () => clearInterval(timer);
  }, [nodes, connections, canvasId]);

  const saveCanvas = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const payload = {
        project_id: "default",
        canvas_id: canvasId || undefined,
        title: "Infinite Canvas",
        nodes: nodes.map((n) => ({ ...n })),
        connections,
        viewport: { x: pan.x, y: pan.y, zoom },
      };
      const res = await fetch(`${API_BASE}/canvas/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (!canvasId) setCanvasId(data.canvas_id);
        setSavedAt(new Date().toLocaleTimeString());
      }
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  }, [nodes, connections, canvasId, pan, zoom]);

  const addNode = (type: NodeType) => {
    const id = Date.now().toString();
    const cx = (300 - pan.x) / zoom + nodes.length * 20;
    const cy = (200 - pan.y) / zoom + nodes.length * 20;
    const node: CanvasNode = {
      id, type,
      x: cx, y: cy,
      width: type === "circle" ? 120 : type === "text" ? 160 : 200,
      height: type === "circle" ? 120 : type === "text" ? 60 : 120,
      content: type === "note" ? "💡 New idea" : type === "text" ? "Double-click to edit" : type === "image" ? "" : "New Shape",
      color: type === "note" ? "#fef08a" : type === "rectangle" ? "#312e81" : type === "circle" ? "#134e4a" : "#1e293b",
    };
    setNodes((n) => [...n, node]);
    setSelectedId(id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setNodes((n) => n.filter((x) => x.id !== selectedId));
    setConnections((c) => c.filter((x) => x.from !== selectedId && x.to !== selectedId));
    setSelectedId(null);
  };

  const updateNodeContent = (id: string, content: string) => {
    setNodes((n) => n.map((x) => x.id === id ? { ...x, content } : x));
  };

  const updateNodeColor = (id: string, color: string) => {
    setNodes((n) => n.map((x) => x.id === id ? { ...x, color } : x));
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const node = nodes.find((n) => n.id === id)!;
    setDragging({
      id,
      ox: e.clientX / zoom - node.x,
      oy: e.clientY / zoom - node.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const nx = e.clientX / zoom - dragging.ox;
      const ny = e.clientY / zoom - dragging.oy;
      setNodes((nodes) =>
        nodes.map((n) => n.id === dragging.id ? { ...n, x: nx, y: ny } : n)
      );
    }
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setIsPanning(false);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedId(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleAiCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);

    const pl = aiPrompt.toLowerCase();
    setTimeout(() => {
      let generated: CanvasNode[] = [];

      if (pl.includes("landing") || pl.includes("page") || pl.includes("website")) {
        generated = [
          { id: `ai_nav_${Date.now()}`, type: "rectangle", x: 80, y: 60, width: 500, height: 60, content: "🧭 Navigation / Header Bar", color: "#1e293b" },
          { id: `ai_hero_${Date.now()}`, type: "rectangle", x: 80, y: 140, width: 500, height: 200, content: "🌟 Hero Section — Main Value Proposition + CTA", color: "#312e81" },
          { id: `ai_note1_${Date.now()}`, type: "note", x: 600, y: 140, width: 180, height: 120, content: "💡 AI Chat Panel — contextual suggestions on scroll", color: "#fef08a" },
          { id: `ai_features_${Date.now()}`, type: "rectangle", x: 80, y: 360, width: 500, height: 120, content: "✨ Feature Grid — 3 columns showcasing core tools", color: "#134e4a" },
          { id: `ai_footer_${Date.now()}`, type: "rectangle", x: 80, y: 500, width: 500, height: 60, content: "📄 Footer — Links, Social, Newsletter CTA", color: "#1e293b" },
        ];
      } else if (pl.includes("flowchart") || pl.includes("flow") || pl.includes("diagram")) {
        generated = [
          { id: `ai_start_${Date.now()}`, type: "circle", x: 260, y: 60, width: 100, height: 60, content: "Start", color: "#134e4a" },
          { id: `ai_step1_${Date.now()}`, type: "rectangle", x: 200, y: 150, width: 220, height: 80, content: "User Inputs Prompt", color: "#312e81" },
          { id: `ai_step2_${Date.now()}`, type: "rectangle", x: 200, y: 260, width: 220, height: 80, content: "AI Provider Routes Request", color: "#4c1d95" },
          { id: `ai_end_${Date.now()}`, type: "circle", x: 260, y: 370, width: 100, height: 60, content: "Output", color: "#134e4a" },
        ];
      } else {
        generated = [
          { id: `ai_g1_${Date.now()}`, type: "note", x: 120, y: 120, width: 200, height: 120, content: `💭 Concept: ${aiPrompt}`, color: "#fef08a" },
          { id: `ai_g2_${Date.now()}`, type: "rectangle", x: 360, y: 120, width: 200, height: 120, content: "🔗 Key Connection Point", color: "#312e81" },
          { id: `ai_g3_${Date.now()}`, type: "circle", x: 240, y: 280, width: 120, height: 120, content: "Core Idea", color: "#4c1d95" },
        ];
      }

      setNodes(generated);
      setAiPrompt("");
      setAiGenerating(false);
    }, 800);
  };

  const selectedNode = nodes.find((n) => n.id === selectedId);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none" style={{ cursor: isPanning ? "grabbing" : "default" }}>
      {/* Header */}
      <header className="h-14 border-b border-zinc-800/80 px-5 flex items-center justify-between bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/create" className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Layout className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-zinc-100">Yash.AI Infinite Canvas</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toolbox */}
          {[
            { icon: <StickyNote className="w-3.5 h-3.5" />, action: () => addNode("note"), label: "Note" },
            { icon: <Square className="w-3.5 h-3.5" />, action: () => addNode("rectangle"), label: "Rect" },
            { icon: <Circle className="w-3.5 h-3.5" />, action: () => addNode("circle"), label: "Circle" },
            { icon: <Type className="w-3.5 h-3.5" />, action: () => addNode("text"), label: "Text" },
          ].map((t, i) => (
            <button
              key={i}
              onClick={t.action}
              className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs hover:bg-zinc-800 hover:text-white transition-colors"
            >
              {t.icon} {t.label}
            </button>
          ))}

          <div className="w-px h-6 bg-zinc-800 mx-1" />

          {/* Zoom */}
          <button onClick={() => setZoom((z) => Math.min(z + 0.1, 2.5))} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-xs text-zinc-500 font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.max(z - 0.1, 0.3))} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors" title="Reset View">
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-zinc-800 mx-1" />

          <button
            onClick={saveCanvas}
            disabled={saving}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs hover:bg-violet-600/30 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden" style={{ height: "calc(100vh - 3.5rem)" }}>
        {/* Canvas Area */}
        <div
          className="lg:col-span-9 relative overflow-hidden bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.05)_1px,_transparent_0)] bg-[length:28px_28px]"
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Saved indicator */}
          {savedAt && (
            <div className="absolute top-3 left-3 text-[10px] text-zinc-600 z-10">
              Saved at {savedAt}
            </div>
          )}

          {/* Transform layer */}
          <div
            className="absolute"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {/* SVG Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
              {connections.map((c, i) => {
                const from = nodes.find((n) => n.id === c.from);
                const to = nodes.find((n) => n.id === c.to);
                if (!from || !to) return null;
                const x1 = from.x + from.width;
                const y1 = from.y + from.height / 2;
                const x2 = to.x;
                const y2 = to.y + to.height / 2;
                const mx = (x1 + x2) / 2;
                return (
                  <path
                    key={i}
                    d={`M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="1.5"
                    strokeDasharray="5 3"
                    opacity="0.6"
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`absolute rounded-xl border transition-shadow ${
                  selectedId === node.id
                    ? "ring-2 ring-violet-500 ring-offset-1 ring-offset-black shadow-lg shadow-violet-500/20"
                    : "hover:shadow-md hover:shadow-black/40"
                } ${node.type === "circle" ? "rounded-full" : ""}`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                  background: node.type === "note"
                    ? node.color
                    : `${node.color}dd`,
                  borderColor: node.type === "note"
                    ? `${node.color}aa`
                    : `${node.color}88`,
                  cursor: dragging?.id === node.id ? "grabbing" : "grab",
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              >
                {node.type === "image" && node.imageUrl ? (
                  <img src={node.imageUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateNodeContent(node.id, e.currentTarget.textContent || "")}
                    className={`w-full h-full p-3 text-xs leading-relaxed outline-none overflow-hidden break-words ${
                      node.type === "note" ? "text-zinc-800 font-medium" : "text-white"
                    }`}
                    style={{ wordBreak: "break-word" }}
                  >
                    {node.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel — Inspector + AI */}
        <aside className="lg:col-span-3 border-l border-zinc-800/80 bg-zinc-950/80 flex flex-col">
          {/* AI Generator */}
          <div className="p-4 border-b border-zinc-800">
            <p className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              AI Canvas Assistant
            </p>
            <form onSubmit={handleAiCommand} className="space-y-2">
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder='e.g. "landing page layout", "user flowchart"...'
                className="w-full p-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!aiPrompt.trim() || aiGenerating}
                className="w-full py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white disabled:opacity-40 hover:from-violet-500 hover:to-indigo-500 transition-all"
              >
                {aiGenerating ? "Generating..." : "Generate Layout"}
              </button>
            </form>
          </div>

          {/* Node Inspector */}
          {selectedNode ? (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <p className="text-xs font-bold text-zinc-300">
                Node Inspector
              </p>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">Position</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-2">
                    <span className="text-[10px] text-zinc-600">X</span>
                    <p className="text-xs text-zinc-300 font-mono">{Math.round(selectedNode.x)}</p>
                  </div>
                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-2">
                    <span className="text-[10px] text-zinc-600">Y</span>
                    <p className="text-xs text-zinc-300 font-mono">{Math.round(selectedNode.y)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">Fill Color</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateNodeColor(selectedId!, c)}
                      className={`h-7 rounded-lg border-2 transition-all ${
                        selectedNode.color === c ? "border-white scale-110" : "border-transparent hover:scale-105"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={deleteSelected}
                className="w-full py-2 text-xs font-semibold rounded-xl border border-red-500/30 bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Node
              </button>
            </div>
          ) : (
            <div className="flex-1 p-4 flex flex-col items-center justify-center text-center space-y-2">
              <Move className="w-8 h-8 text-zinc-700" />
              <p className="text-xs text-zinc-600">Click a node to inspect.<br />Drag to move. Middle-drag to pan.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
