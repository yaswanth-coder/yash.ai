"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Box,
  ArrowLeft,
  Sparkles,
  Layers,
  Sun,
  Eye,
  RotateCw,
  Download,
  Plus,
  Trash2,
  Maximize,
} from "lucide-react";

interface SceneObject {
  id: string;
  name: string;
  type: "Cube" | "Sphere" | "Cylinder" | "Torus";
  color: string;
  wireframe: boolean;
}

export default function ThreeDStudioPage() {
  const [objects, setObjects] = useState<SceneObject[]>([
    { id: "1", name: "Futuristic Chassis", type: "Cube", color: "#3b82f6", wireframe: false },
    { id: "2", name: "Core Orb", type: "Sphere", color: "#8b5cf6", wireframe: true },
  ]);
  const [selectedId, setSelectedId] = useState<string>("1");
  const [aiPrompt, setAiPrompt] = useState("");
  const [rotationSpeed, setRotationSpeed] = useState(1);

  const addObject = (type: "Cube" | "Sphere" | "Cylinder" | "Torus") => {
    const newObj: SceneObject = {
      id: Date.now().toString(),
      name: `${type} ${objects.length + 1}`,
      type,
      color: "#10b981",
      wireframe: false,
    };
    setObjects((prev) => [...prev, newObj]);
    setSelectedId(newObj.id);
  };

  const handleAiGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    // AI 3D scene synthesis simulation
    const generated: SceneObject[] = [
      { id: Date.now() + "1", name: "Cyberpunk Vehicle Hull", type: "Cube", color: "#ef4444", wireframe: false },
      { id: Date.now() + "2", name: "Front Sensor Turbine", type: "Cylinder", color: "#6366f1", wireframe: true },
      { id: Date.now() + "3", name: "Reactor Node", type: "Sphere", color: "#f59e0b", wireframe: false },
    ];
    setObjects(generated);
    setSelectedId(generated[0].id);
    setAiPrompt("");
  };

  const selectedObject = objects.find((o) => o.id === selectedId);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Studio Header */}
      <header className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/create"
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Box className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-zinc-100">Yash.AI 3D Studio</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
              Spatial
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert("GLTF/GLB scene exported.")}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GLTF</span>
          </button>
        </div>
      </header>

      {/* Main 3D Viewport & Inspector */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Scene Hierarchy & Primitives */}
        <div className="lg:col-span-3 border-r border-zinc-800/80 p-5 space-y-6 bg-zinc-950/50 overflow-y-auto">
          {/* AI Generator */}
          <form onSubmit={handleAiGenerate} className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI 3D Generator</span>
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. 'Low-poly futuristic vehicle'..."
                className="flex-1 p-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!aiPrompt.trim()}
                className="p-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white transition-colors"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Add Primitives */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-400">Add Primitive</p>
            <div className="grid grid-cols-2 gap-2">
              {(["Cube", "Sphere", "Cylinder", "Torus"] as const).map((prim) => (
                <button
                  key={prim}
                  onClick={() => addObject(prim)}
                  className="py-2 px-3 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>{prim}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scene Hierarchy */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-400">Scene Hierarchy</p>
            <div className="space-y-1">
              {objects.map((obj) => (
                <div
                  key={obj.id}
                  onClick={() => setSelectedId(obj.id)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                    selectedId === obj.id
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300 font-semibold"
                      : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: obj.color }}
                    />
                    <span>{obj.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setObjects((prev) => prev.filter((o) => o.id !== obj.id));
                    }}
                    className="text-zinc-600 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: 3D Viewport Canvas */}
        <div className="lg:col-span-6 p-6 flex flex-col items-center justify-center bg-black relative overflow-hidden">
          {/* Simulated 3D Viewport with Orbiting CSS 3D Mesh representation */}
          <div className="w-full h-full max-h-[70vh] rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-center relative overflow-hidden shadow-2xl">
            {/* Viewport grid */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: "linear-gradient(#3f3f46 1px, transparent 1px), linear-gradient(90deg, #3f3f46 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Visual 3D Representation */}
            <div className="relative flex items-center justify-center">
              {selectedObject && (
                <div
                  className="w-36 h-36 rounded-2xl border-2 shadow-2xl transition-all animate-pulse"
                  style={{
                    backgroundColor: selectedObject.wireframe ? "transparent" : `${selectedObject.color}40`,
                    borderColor: selectedObject.color,
                    borderRadius: selectedObject.type === "Sphere" ? "50%" : "16px",
                    transform: `rotateX(45deg) rotateZ(${rotationSpeed * 35}deg)`,
                  }}
                />
              )}
            </div>

            {/* Viewport Overlay Controls */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-400 font-mono text-[10px]">
                FPS: 60 • Viewport Active
              </span>
            </div>
          </div>
        </div>

        {/* Right: Object Inspector & Material Properties */}
        <div className="lg:col-span-3 border-l border-zinc-800/80 p-5 space-y-6 bg-zinc-950/50 overflow-y-auto">
          {selectedObject ? (
            <div className="space-y-5">
              <div className="border-b border-zinc-800 pb-3">
                <h3 className="text-xs font-bold text-zinc-200">Object Inspector</h3>
                <p className="text-[11px] text-zinc-500">{selectedObject.name}</p>
              </div>

              {/* Material Color */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300">Material Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {["#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#ffffff", "#000000"].map(
                    (c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setObjects((prev) =>
                            prev.map((o) => (o.id === selectedId ? { ...o, color: c } : o))
                          );
                        }}
                        className={`h-7 rounded-lg border transition-transform ${
                          selectedObject.color === c ? "scale-110 ring-2 ring-white" : ""
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Wireframe Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-xs font-semibold text-zinc-300">Wireframe Mode</span>
                <button
                  onClick={() => {
                    setObjects((prev) =>
                      prev.map((o) => (o.id === selectedId ? { ...o, wireframe: !o.wireframe } : o))
                    );
                  }}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                    selectedObject.wireframe ? "bg-amber-600" : "bg-zinc-800"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      selectedObject.wireframe ? "translate-x-4" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 text-center py-10">Select an object to inspect</p>
          )}
        </div>
      </div>
    </div>
  );
}
