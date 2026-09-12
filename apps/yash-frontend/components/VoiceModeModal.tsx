"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, MicOff, Sparkles, Volume2, VolumeX, Globe } from "lucide-react";
import { streamMessage, StreamEvent } from "@/services/chat";

interface VoiceModeModalProps {
  onClose: () => void;
  onTranscript?: (text: string) => void;
}

type VoiceState = "idle" | "listening" | "processing" | "speaking";
type LanguageMode = "auto" | "te-IN" | "en-US" | "hi-IN";
type ConcreteLang = "te-IN" | "en-US" | "hi-IN";

interface LangOption {
  id: LanguageMode;
  label: string;
  flag: string;
  recogLang: string;
  ttsLang: string;
  greeting: string;
  systemPrompt: string;
}

const LANG_OPTIONS: Record<LanguageMode, LangOption> = {
  auto: {
    id: "auto",
    label: "Auto Detect",
    flag: "⚡",
    recogLang: "en-IN",
    ttsLang: "en-US",
    greeting: "Hello! I'm Yash.AI. Speak in English, Telugu, or Hindi — I will automatically reply in your language!",
    systemPrompt:
      "You are Yash.AI in real-time Voice Mode. AUTO-DETECT the language and dialect the user is speaking (e.g. Telugu, English, Hindi, Telugish, Hinglish). Respond fluently, warmly, and naturally in the EXACT SAME LANGUAGE and DIALECT. Keep your reply concise in 1-3 spoken sentences. Avoid markdown, bullet points, asterisks, or code blocks.",
  },
  "te-IN": {
    id: "te-IN",
    label: "తెలుగు",
    flag: "🇮🇳",
    recogLang: "te-IN",
    ttsLang: "te-IN",
    greeting: "నమస్కారం! నేను Yash.AI. మీకు ఎలా సహాయం చేయగలను?",
    systemPrompt:
      "You are Yash.AI in Voice Mode. Respond strictly and fluently in spoken Telugu (తెలుగు) in a natural, polite, conversational tone in 1-3 short spoken sentences. Avoid markdown, bullet points, asterisks, or English words unless necessary.",
  },
  "en-US": {
    id: "en-US",
    label: "English",
    flag: "🇺🇸",
    recogLang: "en-US",
    ttsLang: "en-US",
    greeting: "Hello! I'm Yash.AI. How can I help you today?",
    systemPrompt:
      "You are Yash.AI in Voice Mode. Speak like a real, friendly human in 1-3 natural, concise spoken sentences. Avoid markdown, bullet points, asterisks, or code blocks.",
  },
  "hi-IN": {
    id: "hi-IN",
    label: "हिंदी",
    flag: "🇮🇳",
    recogLang: "hi-IN",
    ttsLang: "hi-IN",
    greeting: "नमस्ते! मैं Yash.AI हूँ। मैं आपकी क्या मदद कर सकता हूँ?",
    systemPrompt:
      "You are Yash.AI in Voice Mode. Respond fluently and politely in spoken Hindi (हिंदी) in a natural conversational tone in 1-3 short spoken sentences. Avoid markdown, bullet points, asterisks, or English words unless necessary.",
  },
};

// Detect language of text (Script-based + phonetic heuristics)
function detectLanguageFromText(text: string): ConcreteLang {
  // 1. Check Unicode script ranges
  if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN"; // Telugu script
  if (/[\u0900-\u097F]/.test(text)) return "hi-IN"; // Devanagari script

  // 2. Common romanized Telugu keywords (Telugish)
  const teluguPatterns =
    /\b(namaskaram|namaste|bagunnara|bagunnanu|ela\s*unnav|ela\s*unnaru|em\s*chesthunnav|cheppandi|cheppu|meeru|nenu|kavali|leka|eppudu|ekkada|avunu|ledu|chala|dhanyavadalu|enti|emiti|ra|andi|babu|anniya|akka)\b/i;
  if (teluguPatterns.test(text)) return "te-IN";

  // 3. Common romanized Hindi keywords (Hinglish)
  const hindiPatterns =
    /\b(namaste|kaise\s*ho|kya\s*hal|kya\s*hai|batao|dhanyawad|shukriya|aap|hum|theek\s*hai|bhai|kripya|bolo|samajh)\b/i;
  if (hindiPatterns.test(text)) return "hi-IN";

  return "en-US";
}

// Pick the best available TTS voice for a concrete language
function pickVoice(lang: ConcreteLang): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const voices = window.speechSynthesis.getVoices();

  if (lang === "te-IN") {
    // 1. Direct Telugu language or voice name
    const teluguVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("te") ||
        v.lang.toLowerCase().includes("te-in") ||
        v.name.toLowerCase().includes("telugu") ||
        v.name.toLowerCase().includes("mohan") ||
        v.name.toLowerCase().includes("shruti")
    );
    if (teluguVoice) return teluguVoice;

    // 2. Fallback to Indian voice (Indian English/Hindi) for accurate phonetics
    const indianVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().includes("in") ||
        v.name.toLowerCase().includes("india") ||
        v.name.toLowerCase().includes("hindi") ||
        v.name.toLowerCase().includes("heera") ||
        v.name.toLowerCase().includes("neerja") ||
        v.name.toLowerCase().includes("swara")
    );
    if (indianVoice) return indianVoice;
  } else if (lang === "hi-IN") {
    const hindiVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("hi") ||
        v.name.toLowerCase().includes("hindi") ||
        v.name.toLowerCase().includes("swara") ||
        v.name.toLowerCase().includes("madhur") ||
        v.name.toLowerCase().includes("kalpana")
    );
    if (hindiVoice) return hindiVoice;

    const indianVoice = voices.find(
      (v) => v.lang.toLowerCase().includes("in") || v.name.toLowerCase().includes("india")
    );
    if (indianVoice) return indianVoice;
  } else {
    // English
    const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
    const naturalKeywords = ["natural", "neural", "premium", "google", "jenny", "guy", "aria", "samantha", "karen"];
    const naturalVoice = enVoices.find((v) =>
      naturalKeywords.some((k) => v.name.toLowerCase().includes(k))
    );
    if (naturalVoice) return naturalVoice;
    if (enVoices.length > 0) return enVoices[0];
  }

  return voices[0] || null;
}

export default function VoiceModeModal({ onClose, onTranscript }: VoiceModeModalProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [languageMode, setLanguageMode] = useState<LanguageMode>("auto");
  const [detectedLang, setDetectedLang] = useState<ConcreteLang>("en-US");
  const [transcript, setTranscript] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [statusText, setStatusText] = useState("Tap the orb to start talking");
  const [isMuted, setIsMuted] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioLevelRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const historyRef = useRef<Array<{ role: string; content: string }>>([]);
  const isSpeakingRef = useRef(false);
  const shouldContinueRef = useRef(false);
  const transcriptRef = useRef("");
  const particlesRef = useRef<Array<{ x: number; y: number; radius: number; speed: number; angle: number; dist: number }>>([]);

  // Load voices
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoicesReady(true);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Init visualizer particles
  useEffect(() => {
    particlesRef.current = Array.from({ length: 70 }).map(() => ({
      x: 0,
      y: 0,
      radius: Math.random() * 2.5 + 0.6,
      speed: (Math.random() * 0.018 + 0.006) * (Math.random() > 0.5 ? 1 : -1),
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * 130 + 35,
    }));
  }, []);

  // Canvas visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 360;
    canvas.height = 360;
    const cx = 180,
      cy = 180;

    const render = () => {
      timeRef.current += 0.025;
      const t = timeRef.current;
      const lvl = audioLevelRef.current;
      ctx.clearRect(0, 0, 360, 360);

      const base =
        voiceState === "listening"
          ? 60 + lvl * 50
          : voiceState === "speaking"
          ? 58 + Math.sin(t * 5) * 10 + lvl * 20
          : voiceState === "processing"
          ? 52 + Math.sin(t * 8) * 6
          : 50;

      const [c1, c2, c3] =
        voiceState === "listening"
          ? ["rgba(6,182,212,0.9)", "rgba(59,130,246,0.9)", "rgba(168,85,247,0.9)"]
          : voiceState === "processing"
          ? ["rgba(236,72,153,0.9)", "rgba(168,85,247,0.9)", "rgba(99,102,241,0.9)"]
          : voiceState === "speaking"
          ? ["rgba(16,185,129,0.9)", "rgba(6,182,212,0.9)", "rgba(245,158,11,0.9)"]
          : ["rgba(59,130,246,0.7)", "rgba(124,92,252,0.7)", "rgba(6,182,212,0.6)"];

      // Outer aura
      const aura = ctx.createRadialGradient(cx, cy, base * 0.3, cx, cy, base * 2.5);
      aura.addColorStop(0, c1);
      aura.addColorStop(0.5, c2);
      aura.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, base * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // 3 fluid blob layers
      [
        { n: 6, off: 0, scale: 1.0, alpha: 0.75, color: c1 },
        { n: 7, off: 2.1, scale: 1.18, alpha: 0.5, color: c2 },
        { n: 5, off: 4.2, scale: 0.85, alpha: 0.88, color: c3 },
      ].forEach(({ n, off, scale, alpha, color }) => {
        ctx.beginPath();
        for (let i = 0; i <= 72; i++) {
          const θ = (i / 72) * Math.PI * 2;
          const wave =
            Math.sin(θ * n + t * 2.5 + off) * (9 + lvl * 22) +
            Math.cos(θ * 3 - t * 1.8) * (6 + lvl * 16);
          const r = (base + wave) * scale;
          const x = cx + Math.cos(θ) * r;
          const y = cy + Math.sin(θ) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Sound rings
      if (voiceState === "listening" || voiceState === "speaking") {
        for (let ring = 1; ring <= 4; ring++) {
          const rr = base + ((t * 28 * ring) % 100);
          const ra = Math.max(0, 1 - (rr - base) / 100);
          ctx.beginPath();
          ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.strokeStyle = c3;
          ctx.globalAlpha = ra * 0.45;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // Orbital stardust
      particlesRef.current.forEach((p) => {
        p.angle += p.speed;
        const d = p.dist + (voiceState !== "idle" ? lvl * 28 : 0);
        const px = cx + Math.cos(p.angle) * d;
        const py = cy + Math.sin(p.angle) * d;
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.shadowColor = c1;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Core glint
      const core = ctx.createRadialGradient(cx - base * 0.22, cy - base * 0.22, 0, cx, cy, base * 0.85);
      core.addColorStop(0, "rgba(255,255,255,0.98)");
      core.addColorStop(0.3, c3);
      core.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, base * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [voiceState]);

  const stopMic = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    audioLevelRef.current = 0;
  }, []);

  // Speak AI reply with natural TTS in the target language
  const speak = useCallback(
    (text: string, lang: ConcreteLang, onDone?: () => void) => {
      if (isMuted || !text.trim()) {
        onDone?.();
        return;
      }

      window.speechSynthesis.cancel();
      isSpeakingRef.current = true;
      setVoiceState("speaking");

      // Clean text for speech
      const clean = text
        .replace(/#{1,6}\s*/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`{1,3}[^`]*`{1,3}/g, "code snippet")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[-*+]\s/g, "")
        .replace(/\n{2,}/g, ". ")
        .replace(/\n/g, " ")
        .trim();

      // Split into natural sentences
      const sentences = clean.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g) || [clean];
      let idx = 0;

      const speakNext = () => {
        if (idx >= sentences.length || !isSpeakingRef.current) {
          isSpeakingRef.current = false;
          onDone?.();
          return;
        }

        const utt = new SpeechSynthesisUtterance(sentences[idx++].trim());
        const voice = pickVoice(lang);
        if (voice) utt.voice = voice;
        utt.lang = lang;
        utt.rate = 1.0;
        utt.pitch = 1.0;
        utt.volume = 1.0;

        utt.onend = speakNext;
        utt.onerror = () => {
          isSpeakingRef.current = false;
          onDone?.();
        };

        window.speechSynthesis.speak(utt);
      };

      speakNext();
    },
    [isMuted]
  );

  // Full AI call — sends user message, detects language, streams response, speaks back
  const callAI = useCallback(
    async (userText: string) => {
      setVoiceState("processing");
      setStatusText(
        languageMode === "te-IN"
          ? "ఆలోచిస్తున్నాను..."
          : languageMode === "hi-IN"
          ? "सोच रहा हूँ..."
          : "Thinking..."
      );
      setAiReply("");

      // Detect language from user's utterance if in auto mode
      let targetLang: ConcreteLang =
        languageMode === "auto" ? detectLanguageFromText(userText) : languageMode;
      setDetectedLang(targetLang);

      historyRef.current.push({ role: "user", content: userText });

      const currentConfig = LANG_OPTIONS[languageMode];
      const promptPayload = `[Instruction: ${currentConfig.systemPrompt}]\nUser: ${userText}`;

      let fullReply = "";
      try {
        await streamMessage(
          promptPayload,
          undefined,
          undefined,
          "auto",
          false,
          false,
          (event: StreamEvent) => {
            if (event.type === "token") {
              fullReply += event.token || "";
              setAiReply(fullReply);
            }
          }
        );
      } catch {
        fullReply =
          targetLang === "te-IN"
            ? "క్షమించండి, నేను అర్థం చేసుకోలేదు. దయచేసి మళ్ళీ చెప్పండి."
            : targetLang === "hi-IN"
            ? "क्षमा करें, मुझे समझ नहीं आया। कृपया पुनः प्रयास करें।"
            : "Sorry, I couldn't process that. Please try again.";
        setAiReply(fullReply);
      }

      // Re-detect language on reply in case AI switched into Telugu/Hindi
      if (languageMode === "auto") {
        const replyLang = detectLanguageFromText(fullReply);
        targetLang = replyLang;
        setDetectedLang(replyLang);
      }

      historyRef.current.push({ role: "assistant", content: fullReply });

      speak(fullReply, targetLang, () => {
        setVoiceState("idle");
        setStatusText(
          targetLang === "te-IN"
            ? "మాట్లాడడానికి నొక్కండి"
            : targetLang === "hi-IN"
            ? "बोलने के लिए टैप करें"
            : "Tap the orb to talk"
        );
        // Auto-resume listening in continuous mode
        if (shouldContinueRef.current) {
          setTimeout(() => startListening(), 400);
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [languageMode, speak]
  );

  const startListening = useCallback(async () => {
    if (voiceState === "speaking") {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    }

    setVoiceState("listening");
    transcriptRef.current = "";
    setTranscript("");
    setAiReply("");
    setStatusText(
      languageMode === "te-IN"
        ? "వింటున్నాను... మాట్లాడండి"
        : languageMode === "hi-IN"
        ? "सुन रहा हूँ... बोलिए"
        : "Listening... speak now"
    );

    // Microphone audio analyser for visualizer
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const actx = new AudioContext();
      audioCtxRef.current = actx;
      const analyser = actx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 64;
      actx.createMediaStreamSource(stream).connect(analyser);

      const tick = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        audioLevelRef.current = Math.min(1, data.reduce((a, b) => a + b, 0) / data.length / 75);
        if (micStreamRef.current) requestAnimationFrame(tick);
      };
      tick();
    } catch {}

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setStatusText("Speech recognition not supported. Please use Chrome browser.");
      setVoiceState("idle");
      stopMic();
      return;
    }

    const recog = new SR();
    recognitionRef.current = recog;
    recog.continuous = false;
    recog.interimResults = true;
    recog.lang = LANG_OPTIONS[languageMode].recogLang;

    recog.onresult = (e: any) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
      }
      transcriptRef.current = t;
      setTranscript(t);

      // In auto mode, show live auto-detected language tag
      if (languageMode === "auto" && t.trim()) {
        const liveLang = detectLanguageFromText(t);
        setDetectedLang(liveLang);
      }
    };

    recog.onend = () => {
      stopMic();
      const said = transcriptRef.current.trim();
      if (said) {
        callAI(said);
        onTranscript?.(said);
      } else {
        setVoiceState("idle");
        setStatusText(
          languageMode === "te-IN"
            ? "మాట్లాడడానికి నొక్కండి"
            : languageMode === "hi-IN"
            ? "बोलने के लिए टैप करें"
            : "Tap to speak"
        );
      }
    };

    recog.onerror = (e: any) => {
      stopMic();
      setVoiceState("idle");
      setStatusText(
        e.error === "no-speech"
          ? languageMode === "te-IN"
            ? "మాట్లాడటం వినిపించలేదు — మళ్ళీ ప్రయత్నించండి"
            : languageMode === "hi-IN"
            ? "कोई आवाज़ नहीं मिली — पुनः प्रयास करें"
            : "No speech detected — tap to try again"
          : `Error: ${e.error}`
      );
    };

    recog.start();
  }, [languageMode, voiceState, callAI, stopMic, onTranscript]);

  const handleOrbClick = () => {
    if (voiceState === "listening") {
      recognitionRef.current?.stop();
      stopMic();
      setVoiceState("idle");
      setStatusText(
        languageMode === "te-IN"
          ? "మాట్లాడడానికి నొక్కండి"
          : languageMode === "hi-IN"
          ? "बोलने के लिए टैप करें"
          : "Tap to speak"
      );
    } else if (voiceState === "speaking") {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
      if (shouldContinueRef.current) {
        startListening();
      } else {
        setVoiceState("idle");
      }
    } else if (voiceState === "idle") {
      startListening();
    }
  };

  const toggleContinuous = () => {
    const next = !conversationActive;
    shouldContinueRef.current = next;
    setConversationActive(next);
    if (next && voiceState === "idle") {
      startListening();
    }
  };

  // Greet on open
  useEffect(() => {
    if (voicesReady) {
      const greeting = LANG_OPTIONS[languageMode].greeting;
      const initialLang: ConcreteLang = languageMode === "auto" ? "en-US" : languageMode;
      setAiReply(greeting);
      setStatusText(
        languageMode === "te-IN"
          ? "మాట్లాడడానికి నొక్కండి"
          : languageMode === "hi-IN"
          ? "बोलने के लिए टैप करें"
          : "Tap the orb to start talking"
      );
      setTimeout(() => {
        speak(greeting, initialLang, () => {
          setVoiceState("idle");
        });
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voicesReady]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      shouldContinueRef.current = false;
      isSpeakingRef.current = false;
      window.speechSynthesis.cancel();
      stopMic();
      try {
        recognitionRef.current?.abort();
      } catch {}
    },
    [stopMic]
  );

  const toggleMute = () => {
    setIsMuted((m) => {
      if (!m) window.speechSynthesis.cancel();
      return !m;
    });
  };

  const switchLanguageMode = (mode: LanguageMode) => {
    window.speechSynthesis.cancel();
    recognitionRef.current?.abort();
    stopMic();
    setLanguageMode(mode);
    setDetectedLang(mode === "auto" ? "en-US" : mode);
    setVoiceState("idle");
    setTranscript("");
    setAiReply("");
    setStatusText(
      mode === "te-IN"
        ? "మాట్లాడడానికి నొక్కండి"
        : mode === "hi-IN"
        ? "बोलने के लिए टैప करें"
        : "Tap to speak"
    );
  };

  const detectedLangLabel: Record<ConcreteLang, string> = {
    "te-IN": "Telugu (తెలుగు 🇮🇳)",
    "hi-IN": "Hindi (हिंदी 🇮🇳)",
    "en-US": "English 🇺🇸",
  };

  const stateLabel: Record<VoiceState, string> = {
    idle: languageMode === "te-IN" ? "సిద్ధంగా ఉంది" : languageMode === "hi-IN" ? "तैयार" : "Ready",
    listening:
      languageMode === "te-IN"
        ? "వింటున్నాను..."
        : languageMode === "hi-IN"
        ? "सुन रहा हूँ..."
        : "Listening...",
    processing:
      languageMode === "te-IN"
        ? "ఆలోచిస్తున్నాను..."
        : languageMode === "hi-IN"
        ? "सोच रहा हूँ..."
        : "Thinking...",
    speaking:
      languageMode === "te-IN"
        ? "మాట్లాడుతున్నాను..."
        : languageMode === "hi-IN"
        ? "बोल रहा हूँ..."
        : "Speaking...",
  };

  const stateColor: Record<VoiceState, string> = {
    idle: "text-zinc-400",
    listening: "text-cyan-400",
    processing: "text-pink-400",
    speaking: "text-emerald-400",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(24px)" }}
    >
      <div
        className="relative w-full max-w-[94vw] sm:max-w-md max-h-[92dvh] overflow-y-auto custom-scrollbar rounded-3xl p-4 sm:p-7 flex flex-col items-center gap-3.5 sm:gap-4"
        style={{
          background: "rgba(8,8,20,0.90)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.80), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        {/* Top specular bevel */}
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
        />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-500 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 pt-1">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-liquid-pulse" />
            <h2 className="text-base font-bold text-white tracking-wide">Yash.AI Voice</h2>
          </div>
          <div className={`text-xs font-semibold tracking-wide ${stateColor[voiceState]}`}>
            {stateLabel[voiceState]}
          </div>
        </div>

        {/* Language selector tabs */}
        <div
          className="flex items-center gap-1 rounded-full p-1 max-w-full overflow-x-auto custom-scrollbar"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {(Object.keys(LANG_OPTIONS) as LanguageMode[]).map((mode) => {
            const opt = LANG_OPTIONS[mode];
            const isSelected = languageMode === mode;
            return (
              <button
                key={mode}
                onClick={() => switchLanguageMode(mode)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 whitespace-nowrap"
                style={
                  isSelected
                    ? {
                        background: "linear-gradient(135deg, rgba(59,130,246,0.80), rgba(124,92,252,0.75))",
                        color: "white",
                        boxShadow: "0 2px 8px rgba(59,130,246,0.30)",
                      }
                    : { color: "rgba(161,161,170,1)" }
                }
              >
                <span>{opt.flag}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Auto-detected language badge */}
        {languageMode === "auto" && (
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 animate-fadeIn">
            <Globe className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: "12s" }} />
            <span>Auto-Switching: <strong className="text-white">{detectedLangLabel[detectedLang]}</strong></span>
          </div>
        )}

        {/* Orb canvas visualizer */}
        <div
          onClick={handleOrbClick}
          className="relative cursor-pointer group flex items-center justify-center select-none my-1"
          title={voiceState === "listening" ? "Tap to stop" : "Tap to speak"}
        >
          <canvas
            ref={canvasRef}
            className="w-[200px] h-[200px] xs:w-[240px] xs:h-[240px] sm:w-[260px] sm:h-[260px] transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute flex flex-col items-center pointer-events-none gap-1">
            {voiceState === "listening" ? (
              <MicOff className="w-7 h-7 text-white drop-shadow-lg" />
            ) : voiceState === "speaking" ? (
              <Volume2 className="w-7 h-7 text-white animate-liquid-pulse drop-shadow-lg" />
            ) : (
              <Mic className="w-7 h-7 text-white drop-shadow-lg" />
            )}
            <span className="text-[10px] text-white/60 font-medium">
              {voiceState === "listening"
                ? "tap to stop"
                : voiceState === "speaking"
                ? "speaking..."
                : "tap to talk"}
            </span>
          </div>
        </div>

        {/* Live conversation bubble */}
        {(transcript || aiReply) && (
          <div
            className="w-full rounded-2xl p-3.5 space-y-2 animate-fadeIn"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              maxHeight: "110px",
              overflowY: "auto",
            }}
          >
            {transcript && (
              <p className="text-xs text-cyan-300 italic leading-relaxed">
                <span className="text-zinc-500 not-italic font-semibold mr-1">You:</span>
                {transcript}
              </p>
            )}
            {aiReply && (
              <p className="text-xs text-zinc-200 leading-relaxed line-clamp-3">
                <span className="text-violet-400 font-semibold mr-1">Yash.AI:</span>
                {aiReply}
              </p>
            )}
          </div>
        )}

        {/* Status */}
        <p className="text-xs text-zinc-500 text-center">{statusText}</p>

        {/* Controls footer */}
        <div className="flex items-center justify-center gap-3 w-full">
          {/* Continuous conversation toggle */}
          <button
            onClick={toggleContinuous}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all"
            style={
              conversationActive
                ? {
                    background: "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,182,212,0.20))",
                    border: "1px solid rgba(16,185,129,0.35)",
                    color: "rgba(110,231,183,1)",
                  }
                : {
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(161,161,170,1)",
                  }
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                conversationActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
              }`}
            />
            {conversationActive
              ? languageMode === "te-IN"
                ? "సంభాషణ నడుస్తోంది"
                : "Conversation On"
              : languageMode === "te-IN"
              ? "స్వయంచాలక సంభాషణ"
              : "Auto Converse"}
          </button>

          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-full transition-all"
            style={{
              background: isMuted ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${isMuted ? "rgba(239,68,68,0.30)" : "rgba(255,255,255,0.08)"}`,
              color: isMuted ? "rgba(252,165,165,1)" : "rgba(161,161,170,1)",
            }}
            title={isMuted ? "Unmute voice" : "Mute voice"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
