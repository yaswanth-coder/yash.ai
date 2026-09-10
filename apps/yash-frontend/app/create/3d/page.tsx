"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Box,
  ArrowLeft,
  Sparkles,
  Layers,
  Sun,
  RotateCw,
  Download,
  Plus,
  Trash2,
  Maximize,
  Palette,
  Eye,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

// ───── Types ─────────────────────────────────────────────────────────────────

interface SceneObject {
  id: string;
  name: string;
  type: "Cube" | "Sphere" | "Cylinder" | "Torus" | "Cone" | "Plane";
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  metalness: number;
  roughness: number;
  wireframe: boolean;
}

type PrimitiveType = SceneObject["type"];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ───── Three.js Viewport (lazy-loaded) ───────────────────────────────────────

function ThreeViewport({
  objects,
  selectedId,
  autoRotate,
  onSelect,
}: {
  objects: SceneObject[];
  selectedId: string | null;
  autoRotate: boolean;
  onSelect: (id: string) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const meshMapRef = useRef<Map<string, any>>(new Map());
  const frameRef = useRef<number>(0);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const theta = useRef(30);
  const phi = useRef(60);
  const radius = useRef(8);

  useEffect(() => {
    let THREE: any;
    let renderer: any;

    async function init() {
      THREE = await import("three");

      if (!mountRef.current) return;
      const W = mountRef.current.clientWidth;
      const H = mountRef.current.clientHeight;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#0a0a12");
      scene.fog = new THREE.FogExp2("#0a0a12", 0.04);
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
      camera.position.set(5, 4, 7);
      camera.lookAt(0, 1, 0);
      cameraRef.current = camera;

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mountRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Grid
      const grid = new THREE.GridHelper(20, 20, "#1e1e2e", "#1e1e2e");
      scene.add(grid);

      // Lights
      const ambient = new THREE.AmbientLight("#ffffff", 0.5);
      scene.add(ambient);

      const dirLight = new THREE.DirectionalLight("#fff8f0", 1.5);
      dirLight.position.set(8, 14, 8);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(1024, 1024);
      scene.add(dirLight);

      const fillLight = new THREE.DirectionalLight("#b0c4ff", 0.4);
      fillLight.position.set(-6, 6, -4);
      scene.add(fillLight);

      // Shadow floor
      const floorGeo = new THREE.PlaneGeometry(20, 20);
      const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      buildMeshes(THREE, scene);
      animate(THREE, scene, camera, renderer);
    }

    function buildMeshes(THREE: any, scene: any) {
      // Clear old
      meshMapRef.current.forEach((m) => scene.remove(m));
      meshMapRef.current.clear();

      objects.forEach((obj) => {
        let geo: any;
        switch (obj.type) {
          case "Cube":     geo = new THREE.BoxGeometry(1, 1, 1); break;
          case "Sphere":   geo = new THREE.SphereGeometry(0.6, 32, 32); break;
          case "Cylinder": geo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 32); break;
          case "Torus":    geo = new THREE.TorusGeometry(0.5, 0.15, 16, 64); break;
          case "Cone":     geo = new THREE.ConeGeometry(0.5, 1.2, 32); break;
          case "Plane":    geo = new THREE.PlaneGeometry(1.5, 1.5); break;
          default:         geo = new THREE.BoxGeometry(1, 1, 1);
        }

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(obj.color),
          metalness: obj.metalness,
          roughness: obj.roughness,
          wireframe: obj.wireframe,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...obj.position);
        mesh.rotation.set(...obj.rotation);
        mesh.scale.set(...obj.scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.id = obj.id;

        scene.add(mesh);
        meshMapRef.current.set(obj.id, mesh);
      });
    }

    function updateCamera(camera: any) {
      const t = (theta.current * Math.PI) / 180;
      const p = (phi.current * Math.PI) / 180;
      const r = radius.current;
      camera.position.set(
        r * Math.sin(p) * Math.cos(t),
        r * Math.cos(p),
        r * Math.sin(p) * Math.sin(t)
      );
      camera.lookAt(0, 1, 0);
    }

    function animate(THREE: any, scene: any, camera: any, renderer: any) {
      const tick = () => {
        frameRef.current = requestAnimationFrame(tick);
        if (autoRotate) theta.current += 0.3;
        updateCamera(camera);
        renderer.render(scene, camera);
      };
      tick();
    }

    init();

    // Mouse controls
    const el = mountRef.current;
    const onDown = (e: MouseEvent) => {
      isDragging.current = true;
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      theta.current -= dx * 0.4;
      phi.current = Math.max(10, Math.min(170, phi.current + dy * 0.4));
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { isDragging.current = false; };
    const onWheel = (e: WheelEvent) => {
      radius.current = Math.max(2, Math.min(30, radius.current + e.deltaY * 0.02));
    };

    el?.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    el?.addEventListener("wheel", onWheel, { passive: true });

    const handleResize = () => {
      if (!mountRef.current || !renderer) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      renderer.setSize(w, h);
      if (cameraRef.current) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer?.dispose();
      if (mountRef.current && renderer?.domElement) {
        try { mountRef.current.removeChild(renderer.domElement); } catch { /* ignore */ }
      }
      el?.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      el?.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", handleResize);
    };
  }, [objects, autoRotate]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full bg-[#0a0a12]"
      style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
    />
  );
}

// ───── Main Page ─────────────────────────────────────────────────────────────

export default function ThreeDStudioPage() {
  const [objects, setObjects] = useState<SceneObject[]>([
    {
      id: "obj_1", name: "Prism Core", type: "Cube",
      position: [0, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
      color: "#6366f1", metalness: 0.6, roughness: 0.3, wireframe: false,
    },
    {
      id: "obj_2", name: "Float Orb", type: "Sphere",
      position: [1.8, 1.2, 0], rotation: [0, 0, 0], scale: [0.8, 0.8, 0.8],
      color: "#06b6d4", metalness: 0.85, roughness: 0.15, wireframe: true,
    },
  ]);
  const [selectedId, setSelectedId] = useState<string>("obj_1");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const getToken = () => typeof window !== "undefined" ? (localStorage.getItem("yash_ai_token") || localStorage.getItem("access_token") || "") : "";

  const selectedObj = objects.find((o) => o.id === selectedId);

  const addPrimitive = (type: PrimitiveType) => {
    const id = `obj_${Date.now()}`;
    const count = objects.length;
    setObjects((prev) => [
      ...prev,
      {
        id, name: `${type} ${count + 1}`, type,
        position: [(count % 3) * 2 - 2, 0.6, Math.floor(count / 3) * 2 - 1],
        rotation: [0, 0, 0], scale: [1, 1, 1],
        color: ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444"][count % 6],
        metalness: 0.5, roughness: 0.5, wireframe: false,
      },
    ]);
    setSelectedId(id);
  };

  const deleteObject = (id: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== id));
    if (selectedId === id) setSelectedId(objects[0]?.id ?? "");
  };

  const updateField = (id: string, field: keyof SceneObject, value: any) => {
    setObjects((prev) =>
      prev.map((o) => o.id === id ? { ...o, [field]: value } : o)
    );
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);

    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API_BASE}/tools/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tool_id: "3d.generate_scene", params: { prompt: aiPrompt } }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.objects?.length) {
            const objs: SceneObject[] = data.data.objects.map((o: any) => ({
              id: o.id || `ai_${Date.now()}_${Math.random()}`,
              name: o.name || "AI Object",
              type: o.type || "Cube",
              position: o.position || [0, 0.5, 0],
              rotation: o.rotation || [0, 0, 0],
              scale: o.scale || [1, 1, 1],
              color: o.color || "#6366f1",
              metalness: o.metalness ?? 0.5,
              roughness: o.roughness ?? 0.5,
              wireframe: o.wireframe ?? false,
            }));
            setObjects(objs);
            setSelectedId(objs[0].id);
            setAiPrompt("");
            return;
          }
        }
      }
    } catch { /* fallthrough */ }

    // Fallback local generation
    const pl = aiPrompt.toLowerCase();
    const generated: SceneObject[] = pl.includes("speeder") || pl.includes("vehicle") || pl.includes("ship")
      ? [
          { id: "g1", name: "Chassis Hull", type: "Cube", position: [0, 0.5, 0], rotation: [0, 0, 0], scale: [3, 0.5, 1.2], color: "#1e293b", metalness: 0.9, roughness: 0.2, wireframe: false },
          { id: "g2", name: "Cockpit Dome", type: "Sphere", position: [0.5, 0.9, 0], rotation: [0, 0, 0], scale: [1, 0.5, 0.8], color: "#38bdf8", metalness: 0.95, roughness: 0.05, wireframe: false },
          { id: "g3", name: "Left Thruster", type: "Cylinder", position: [-1.5, 0.5, 0.9], rotation: [0, 0, 1.57], scale: [0.3, 1.0, 0.3], color: "#ef4444", metalness: 0.7, roughness: 0.4, wireframe: true },
          { id: "g4", name: "Shield Ring", type: "Torus", position: [0, 0.5, 0], rotation: [1.57, 0, 0], scale: [1.8, 1.8, 0.15], color: "#6366f1", metalness: 0.9, roughness: 0.1, wireframe: true },
        ]
      : [
          { id: "g1", name: "Base Prism", type: "Cube", position: [0, 0.5, 0], rotation: [0, 0.4, 0], scale: [1.5, 1.5, 1.5], color: "#4f46e5", metalness: 0.7, roughness: 0.3, wireframe: false },
          { id: "g2", name: "Core Sphere", type: "Sphere", position: [0, 2.2, 0], rotation: [0, 0, 0], scale: [0.8, 0.8, 0.8], color: "#06b6d4", metalness: 0.9, roughness: 0.1, wireframe: true },
          { id: "g3", name: "Orbit Ring", type: "Torus", position: [0, 2.2, 0], rotation: [1.57, 0, 0], scale: [1.3, 1.3, 0.06], color: "#ec4899", metalness: 0.8, roughness: 0.2, wireframe: false },
        ];
    setObjects(generated);
    setSelectedId(generated[0].id);
    setAiPrompt("");
    setAiLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800/80 px-5 flex items-center justify-between bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/create" className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Box className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-zinc-100">Yash.AI 3D Studio</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
              Three.js WebGL
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRotate((v) => !v)}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl border text-xs font-medium transition-all ${
              autoRotate
                ? "bg-amber-600/20 border-amber-500/40 text-amber-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" /> {autoRotate ? "Turntable On" : "Turntable"}
          </button>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 3.5rem)" }}>
        {/* Left — Scene Hierarchy */}
        <aside className="w-52 border-r border-zinc-800/80 bg-zinc-950/80 flex flex-col">
          {/* Add Primitives */}
          <div className="p-3 border-b border-zinc-800">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Add Object</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(["Cube", "Sphere", "Cylinder", "Torus", "Cone", "Plane"] as PrimitiveType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => addPrimitive(t)}
                  className="py-1.5 text-xs font-medium rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> {t}
                </button>
              ))}
            </div>
          </div>

          {/* Object List */}
          <div className="flex-1 overflow-y-auto">
            {objects.map((obj) => (
              <div
                key={obj.id}
                onClick={() => setSelectedId(obj.id)}
                className={`px-3 py-2.5 border-b border-zinc-800/50 cursor-pointer flex items-center justify-between group transition-colors ${
                  selectedId === obj.id ? "bg-amber-600/10 border-l-2 border-l-amber-500" : "hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: obj.color }} />
                  <span className="text-xs text-zinc-300 truncate">{obj.name}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteObject(obj.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-zinc-600 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* AI Scene Generator */}
          <div className="p-3 border-t border-zinc-800">
            <form onSubmit={handleAiGenerate} className="space-y-2">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">AI Scene</p>
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. sci-fi speeder..."
                className="w-full p-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!aiPrompt.trim() || aiLoading}
                className="w-full py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white disabled:opacity-40 hover:from-amber-500 hover:to-orange-500 transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {aiLoading ? "Building..." : "Generate"}
              </button>
            </form>
          </div>
        </aside>

        {/* WebGL Viewport */}
        <main className="flex-1 relative overflow-hidden">
          <ThreeViewport
            objects={objects}
            selectedId={selectedId}
            autoRotate={autoRotate}
            onSelect={setSelectedId}
          />
          <div className="absolute bottom-4 left-4 text-xs text-zinc-600 pointer-events-none">
            Drag to orbit • Scroll to zoom
          </div>
        </main>

        {/* Right — Material Inspector */}
        {sidebarOpen && selectedObj && (
          <aside className="w-64 border-l border-zinc-800/80 bg-zinc-950/80 p-4 space-y-5 overflow-y-auto">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Selected Object</p>
              <p className="text-sm font-bold text-zinc-100">{selectedObj.name}</p>
              <p className="text-xs text-zinc-500">{selectedObj.type}</p>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                <Palette className="w-3 h-3" /> Color
              </label>
              <input
                type="color"
                value={selectedObj.color}
                onChange={(e) => updateField(selectedId!, "color", e.target.value)}
                className="w-full h-10 rounded-xl border border-zinc-800 bg-zinc-900 cursor-pointer"
              />
            </div>

            {/* Metalness */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Metalness — {Math.round(selectedObj.metalness * 100)}%
              </label>
              <input
                type="range" min="0" max="1" step="0.01"
                value={selectedObj.metalness}
                onChange={(e) => updateField(selectedId!, "metalness", parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Roughness */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Roughness — {Math.round(selectedObj.roughness * 100)}%
              </label>
              <input
                type="range" min="0" max="1" step="0.01"
                value={selectedObj.roughness}
                onChange={(e) => updateField(selectedId!, "roughness", parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Wireframe */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                <Eye className="w-3 h-3" /> Wireframe
              </label>
              <button
                onClick={() => updateField(selectedId!, "wireframe", !selectedObj.wireframe)}
                className={`w-12 h-6 rounded-full border transition-all ${
                  selectedObj.wireframe
                    ? "bg-amber-500 border-amber-400"
                    : "bg-zinc-800 border-zinc-700"
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${selectedObj.wireframe ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>

            {/* Position */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Position</label>
              {["x", "y", "z"].map((axis, i) => (
                <div key={axis} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 w-4">{axis.toUpperCase()}</span>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedObj.position[i].toFixed(1)}
                    onChange={(e) => {
                      const pos = [...selectedObj.position] as [number, number, number];
                      pos[i] = parseFloat(e.target.value) || 0;
                      updateField(selectedId!, "position", pos);
                    }}
                    className="flex-1 p-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              ))}
            </div>

            {/* Scale */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Scale</label>
              {["x", "y", "z"].map((axis, i) => (
                <div key={axis} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 w-4">{axis.toUpperCase()}</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={selectedObj.scale[i].toFixed(1)}
                    onChange={(e) => {
                      const sc = [...selectedObj.scale] as [number, number, number];
                      sc[i] = parseFloat(e.target.value) || 0.1;
                      updateField(selectedId!, "scale", sc);
                    }}
                    className="flex-1 p-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => deleteObject(selectedId!)}
              className="w-full py-2 text-xs font-semibold rounded-xl border border-red-500/30 bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Object
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
