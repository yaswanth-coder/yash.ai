"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Mic, MicOff, Sparkles, Volume2 } from "lucide-react";

interface VoiceModeModalProps {
  onClose: () => void;
  onTranscript: (text: string) => void;
}

type VoiceState = "idle" | "listening" | "processing" | "speaking";

export default function VoiceModeModal({ onClose, onTranscript }: VoiceModeModalProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [statusText, setStatusText] = useState("Tap or hold the glowing orb to speak");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioLevelRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // Particles for atmospheric animation
  const particlesRef = useRef<Array<{ x: number; y: number; radius: number; speed: number; angle: number; dist: number }>>([]);

  useEffect(() => {
    // Initialize 60 ambient orbital particles
    particlesRef.current = Array.from({ length: 60 }).map(() => ({
      x: 0,
      y: 0,
      radius: Math.random() * 2.5 + 0.8,
      speed: (Math.random() * 0.02 + 0.008) * (Math.random() > 0.5 ? 1 : -1),
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * 120 + 40,
    }));
  }, []);

  // Canvas Animational Art Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = 380);
    let height = (canvas.height = 380);
    const centerX = width / 2;
    const centerY = height / 2;

    const render = () => {
      timeRef.current += 0.03;
      const t = timeRef.current;
      const currentLevel = audioLevelRef.current;

      ctx.clearRect(0, 0, width, height);

      // Base radius calculation reacting to voice input
      const baseRadius = 55 + (voiceState === "listening" ? currentLevel * 45 : voiceState === "speaking" ? Math.sin(t * 4) * 8 + 65 : 55);

      // Dynamic color palettes
      let color1 = "rgba(59, 130, 246, 0.8)";   // Blue
      let color2 = "rgba(147, 51, 234, 0.8)";   // Purple
      let color3 = "rgba(6, 182, 212, 0.8)";    // Cyan

      if (voiceState === "listening") {
        color1 = "rgba(6, 182, 212, 0.9)";     // Electric Cyan
        color2 = "rgba(59, 130, 246, 0.9)";    // Royal Blue
        color3 = "rgba(168, 85, 247, 0.9)";    // Neon Purple
      } else if (voiceState === "processing") {
        color1 = "rgba(236, 72, 153, 0.9)";    // Pink
        color2 = "rgba(168, 85, 247, 0.9)";    // Purple
        color3 = "rgba(99, 102, 241, 0.9)";    // Indigo
      } else if (voiceState === "speaking") {
        color1 = "rgba(16, 185, 129, 0.9)";    // Emerald
        color2 = "rgba(6, 182, 212, 0.9)";     // Cyan
        color3 = "rgba(245, 158, 11, 0.9)";    // Gold
      }

      // 1. Draw outer ambient aura glow
      const auraGradient = ctx.createRadialGradient(
        centerX, centerY, baseRadius * 0.4,
        centerX, centerY, baseRadius * 2.2
      );
      auraGradient.addColorStop(0, color1);
      auraGradient.addColorStop(0.5, color2);
      auraGradient.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw 3 Fluid Deforming Organic Blob Layers
      const layers = [
        { count: 6, offset: 0, scale: 1.0, alpha: 0.7, color: color1 },
        { count: 7, offset: 2.1, scale: 1.15, alpha: 0.5, color: color2 },
        { count: 5, offset: 4.2, scale: 0.85, alpha: 0.85, color: color3 },
      ];

      layers.forEach((layer) => {
        ctx.beginPath();
        const pts = 64;
        for (let i = 0; i <= pts; i++) {
          const theta = (i / pts) * Math.PI * 2;
          // Organic fluid wave formula with harmonic frequencies
          const wave =
            Math.sin(theta * layer.count + t * 2 + layer.offset) * (8 + currentLevel * 20) +
            Math.cos(theta * 3 - t * 1.5) * (6 + currentLevel * 15);
          const r = (baseRadius + wave) * layer.scale;
          const x = centerX + Math.cos(theta) * r;
          const y = centerY + Math.sin(theta) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = layer.color;
        ctx.globalAlpha = layer.alpha;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // 3. Draw Concentric Pulsating Sound Waves
      if (voiceState === "listening" || voiceState === "speaking") {
        for (let ring = 1; ring <= 3; ring++) {
          ctx.beginPath();
          const ringRadius = baseRadius + ((t * 30 * ring) % 90);
          const ringAlpha = Math.max(0, 1 - (ringRadius - baseRadius) / 90);
          ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = color3;
          ctx.globalAlpha = ringAlpha * 0.4;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }

      // 4. Draw Floating Orbital Stardust Particles
      particlesRef.current.forEach((p) => {
        p.angle += p.speed;
        const currentDist = p.dist + (voiceState === "listening" ? currentLevel * 30 : 0);
        const px = centerX + Math.cos(p.angle) * currentDist;
        const py = centerY + Math.sin(p.angle) * currentDist;

        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.shadowColor = color1;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 5. Core Center Highlight
      const coreGradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.2, centerY - baseRadius * 0.2, 0,
        centerX, centerY, baseRadius * 0.8
      );
      coreGradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      coreGradient.addColorStop(0.3, color3);
      coreGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [voiceState]);

  const stopMic = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    audioLevelRef.current = 0;
  };

  const startListening = async () => {
    setVoiceState("listening");
    setStatusText("Listening... speak your prompt");
    setTranscript("");

    // Audio context for dynamic visualizer feedback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 64;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const sum = data.reduce((a, b) => a + b, 0);
        const avg = sum / data.length;
        audioLevelRef.current = Math.min(1.0, avg / 80);
        if (micStreamRef.current) {
          requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();
    } catch {}

    // Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = true;
      recog.lang = "en-US";
      recognitionRef.current = recog;

      recog.onresult = (event: any) => {
        let t = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          t += event.results[i][0].transcript;
        }
        setTranscript(t);
      };

      recog.onend = () => {
        stopMic();
        setVoiceState("processing");
        setStatusText("Synthesizing response...");
        setTimeout(() => {
          if (transcript) {
            onTranscript(transcript);
          }
          setVoiceState("idle");
          setStatusText("Tap or hold the glowing orb to speak");
          setTranscript("");
        }, 500);
      };

      recog.onerror = () => {
        stopMic();
        setVoiceState("idle");
        setStatusText("Microphone idle — tap to speak");
      };

      recog.start();
    } else {
      setStatusText("Speech recognition not supported in this browser.");
      setVoiceState("idle");
      stopMic();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    stopMic();
  };

  const toggleListen = () => {
    if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "idle") {
      startListening();
    }
  };

  useEffect(() => {
    return () => {
      stopMic();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800/90 shadow-2xl bg-zinc-950/95 overflow-hidden p-8 flex flex-col items-center gap-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-wide">Yash.AI Live Voice</h2>
          </div>
          <p className="text-xs text-zinc-500">Conversational Real-Time AI</p>
        </div>

        {/* Dynamic Animational Art Canvas (Glowing Orb Visualizer) */}
        <div
          onClick={toggleListen}
          className="relative cursor-pointer group flex items-center justify-center"
        >
          <canvas
            ref={canvasRef}
            className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute flex flex-col items-center pointer-events-none">
            {voiceState === "listening" ? (
              <MicOff className="w-6 h-6 text-white animate-pulse drop-shadow-md" />
            ) : (
              <Mic className="w-6 h-6 text-white drop-shadow-md" />
            )}
          </div>
        </div>

        {/* Transcript Box */}
        {transcript && (
          <div className="w-full p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-200 text-center min-h-12 leading-relaxed italic animate-fadeIn shadow-inner">
            "{transcript}"
          </div>
        )}

        {/* Status Text & Controls */}
        <div className="text-center space-y-3">
          <p className="text-xs text-zinc-400 font-medium tracking-tight">
            {statusText}
          </p>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={toggleListen}
              className={`px-5 py-2 rounded-full text-xs font-semibold shadow-lg transition-all ${
                voiceState === "listening"
                  ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
                  : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white"
              }`}
            >
              {voiceState === "listening" ? "Stop Listening" : "Tap to Speak"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
