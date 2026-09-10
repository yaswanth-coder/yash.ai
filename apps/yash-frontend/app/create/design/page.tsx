"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  Square,
  Circle,
  Type,
  StickyNote,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Move,
  Layers,
  Wand2,
} from "lucide-react";

interface CanvasItem {
  id: string;
  type: "text" | "rectangle" | "circle" | "note";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
}

export default function VisualCanvasPage() {
  const [items, setItems] = useState<CanvasItem[]>([
    {
      id: "1",
      type: "note",
      x: 100,
      y: 100,
      width: 180,
      height: 120,
      content: "Yash.AI Canvas Brainstorming: Multi-modal creation space",
      color: "#fef08a",
    },
    {
      id: "2",
      type: "rectangle",
      x: 340,
      y: 100,
      width: 200,
      height: 140,
      content: "Hero Section Component",
      color: "#3b82f6",
    },
  ]);
  const [zoom, setZoom] = useState(100);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");

  const addShape = (type: "rectangle" | "circle" | "text" | "note") => {
    const newItem: CanvasItem = {
      id: Date.now().toString(),
      type,
      x: 150 + items.length * 20,
      y: 150 + items.length * 20,
      width: type === "circle" ? 120 : 160,
      height: type === "circle" ? 120 : 100,
      content: type === "text" ? "Double click to edit" : type === "note" ? "Sticky Note" : "New Shape",
      color: type === "note" ? "#fef08a" : type === "rectangle" ? "#6366f1" : "#10b981",
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedId(newItem.id);
  };

  const handleAiCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    // AI Canvas Command Generation
    const promptLower = aiPrompt.toLowerCase();
    if (promptLower.includes("landing page") || promptLower.includes("layout")) {
      const generated: CanvasItem[] = [
        { id: Date.now() + "1", type: "rectangle", x: 80, y: 80, width: 450, height: 80, content: "Header / Navigation", color: "#1e293b" },
        { id: Date.now() + "2", type: "rectangle", x: 80, y: 180, width: 450, height: 200, content: "Hero Showcase & Call to Action", color: "#3b82f6" },
        { id: Date.now() + "3", type: "note", x: 560, y: 180, width: 200, height: 140, content: "Key Feature: AI Workspace Switching", color: "#fef08a" },
      ];
      setItems(generated);
    } else {
      addShape("note");
    }
    setAiPrompt("");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none">
      {/* Canvas Top Bar */}
      <header className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/create"
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-zinc-100">Yash.AI Visual Canvas</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          <button
            onClick={() => addShape("rectangle")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Add Rectangle"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => addShape("circle")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Add Circle"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => addShape("note")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Add Sticky Note"
          >
            <StickyNote className="w-4 h-4" />
          </button>
          <button
            onClick={() => addShape("text")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Add Text"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <button
              onClick={() => setZoom((prev) => Math.max(prev - 10, 50))}
              className="p-1 text-zinc-400 hover:text-white rounded"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-zinc-400 font-mono text-[11px]">{zoom}%</span>
            <button
              onClick={() => setZoom((prev) => Math.min(prev + 10, 200))}
              className="p-1 text-zinc-400 hover:text-white rounded"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Infinite Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-radial from-zinc-950 via-zinc-950 to-black">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#3f3f46 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            transform: `scale(${zoom / 100})`,
          }}
        />

        {/* Canvas Items */}
        <div
          className="relative w-full h-full transition-transform duration-75"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              style={{
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
                backgroundColor: item.type === "note" ? item.color : `${item.color}20`,
                borderColor: item.color,
              }}
              className={`absolute p-3 rounded-2xl border cursor-move shadow-lg transition-shadow flex flex-col justify-between ${
                selectedId === item.id ? "ring-2 ring-blue-500 shadow-blue-500/20" : ""
              } ${item.type === "note" ? "text-zinc-900 font-medium" : "text-zinc-200"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  {item.type}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setItems((prev) => prev.filter((i) => i.id !== item.id));
                  }}
                  className="p-1 text-zinc-500 hover:text-red-500 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs leading-relaxed break-words">{item.content}</p>
            </div>
          ))}
        </div>

        {/* Floating AI Canvas Command Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-20">
          <form
            onSubmit={handleAiCommand}
            className="flex items-center gap-2 p-2 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-2xl backdrop-blur-md"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Wand2 className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask AI: 'Create a landing page concept', 'Arrange notes'..."
              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none px-2"
            />
            <button
              type="submit"
              disabled={!aiPrompt.trim()}
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
