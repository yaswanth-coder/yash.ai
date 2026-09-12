"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowUp,
  Paperclip,
  X,
  FileText,
  Mic,
  MicOff,
  Globe,
  Square,
} from "lucide-react";
import api from "@/lib/axios";

interface ChatInputProps {
  onSendMessage: (content: string, filePath?: string) => void;
  disabled?: boolean;
  onStopGeneration?: () => void;
  isStreaming?: boolean;
  webSearchEnabled?: boolean;
  onToggleWebSearch?: (enabled: boolean) => void;
}

// Tiny animated waveform shown beside the mic while listening
function VoiceWaveform() {
  return (
    <div className="flex items-center gap-[2px] h-4">
      {[0.8, 1.4, 1.0, 1.8, 1.2, 1.6, 0.9].map((h, i) => (
        <div
          key={i}
          className="w-[2.5px] rounded-full bg-red-400"
          style={{
            height: `${h * 4}px`,
            animation: `voicePulse ${0.45 + i * 0.07}s ease-in-out infinite alternate`,
            animationDelay: `${i * 55}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes voicePulse {
          from { transform: scaleY(0.5); opacity: 0.5; }
          to   { transform: scaleY(1.3); opacity: 1.0; }
        }
      `}</style>
    </div>
  );
}

export default function ChatInput({
  onSendMessage,
  disabled,
  onStopGeneration,
  isStreaming = false,
  webSearchEnabled = true,
  onToggleWebSearch,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [fileAttachment, setFileAttachment] = useState<{
    path: string;
    name: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // interimText = words being recognized right now (not yet final)
  const [interimText, setInterimText] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  // Tracks the confirmed (final) spoken text accumulated in this voice session
  const confirmedRef = useRef("");
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Speech API setup ───────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSpeechSupported(true);

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true; // stream words as they're spoken
    recog.lang = "en-US";
    recog.maxAlternatives = 1;

    recog.onstart = () => {
      confirmedRef.current = "";
      setInterimText("");
    };

    recog.onresult = (event: any) => {
      let finalPart = "";
      let interimPart = "";

      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          finalPart += r[0].transcript;
        } else {
          interimPart += r[0].transcript;
        }
      }

      // Update confirmed text and show it in the textarea
      if (finalPart) {
        confirmedRef.current = finalPart.trim();
        // Write confirmed text to the textarea immediately
        setMessage(confirmedRef.current);
        setInterimText("");

        // Focus textarea so user can see/edit
        textareaRef.current?.focus();

        // Auto-send after 1.8 s of silence
        if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = setTimeout(() => {
          if (confirmedRef.current.trim()) sendVoiceMessage();
        }, 1800);
      }

      // Show interim words live in the textarea (combined confirmed + interim)
      // so the user sees words typing out in real-time
      const combined = confirmedRef.current
        ? confirmedRef.current + (interimPart ? " " + interimPart : "")
        : interimPart;

      setMessage(combined);
      setInterimText(interimPart); // track separately for styling hint
    };

    recog.onerror = (e: any) => {
      if (e.error !== "no-speech") console.warn("Speech error:", e.error);
      setIsListening(false);
      setInterimText("");
    };

    recog.onend = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognitionRef.current = recog;
  }, []);

  const sendVoiceMessage = useCallback(() => {
    const text = confirmedRef.current.trim() || message.trim();
    if (!text) return;
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
    setInterimText("");
    confirmedRef.current = "";
    onSendMessage(text, fileAttachment?.path || undefined);
    setMessage("");
    setFileAttachment(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [message, onSendMessage, fileAttachment]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
      setInterimText("");
    } else {
      // Clear previous voice session, keep any manually typed text
      confirmedRef.current = message.trim(); // start from what's already typed
      setInterimText("");
      try {
        recognitionRef.current.start();
        setIsListening(true);
        textareaRef.current?.focus();
      } catch (e) {
        console.error("Could not start speech recognition:", e);
      }
    }
  };

  // ── Textarea auto-resize ───────────────────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [message]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!message.trim() && !fileAttachment) || disabled || uploading) return;
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
      setInterimText("");
    }
    onSendMessage(message, fileAttachment?.path);
    setMessage("");
    setFileAttachment(null);
    confirmedRef.current = "";
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("File size exceeds 20MB limit.");
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFileAttachment({
        path: response.data.file_path,
        name: response.data.filename,
      });
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto w-full px-2.5 sm:px-4 pb-2 sm:pb-4">
      {/* File Attachment Card */}
      {fileAttachment && (
        <div className="flex items-center gap-2 mb-2 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl w-fit text-xs text-zinc-200">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="truncate max-w-[220px] font-medium">
            {fileAttachment.name}
          </span>
          <button
            onClick={() => setFileAttachment(null)}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Voice status strip — only visible while listening */}
      {isListening && (
        <div className="flex items-center gap-2 mb-1.5 px-3">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
            Listening
          </span>
          <VoiceWaveform />
          {interimText ? (
            <span className="text-[10px] text-zinc-500 italic truncate max-w-[200px]">
              "{interimText}"
            </span>
          ) : null}
          <span className="ml-auto text-[10px] text-zinc-600">
            Pause 1.8 s → auto-send &nbsp;|&nbsp; or press ↵
          </span>
        </div>
      )}

      {/* Main Composer Box */}
      <div
        className={`relative rounded-2xl bg-zinc-900/90 border shadow-xl transition-all duration-200 p-2.5 ${
          isListening
            ? "border-red-500/40 ring-1 ring-red-500/10"
            : "border-zinc-800/90 focus-within:border-blue-500/60"
        }`}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            // If the user manually edits, sync the confirmed ref
            confirmedRef.current = e.target.value;
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? "Speak now — words will appear here..."
              : "Ask Yash.AI anything (Shift + Enter for new line)..."
          }
          rows={1}
          disabled={disabled || isStreaming}
          className={`w-full bg-transparent px-2.5 py-1 text-base sm:text-sm focus:outline-none resize-none max-h-44 custom-scrollbar transition-colors ${
            isListening && interimText && !confirmedRef.current
              ? "text-zinc-400" // interim-only text appears slightly greyed
              : "text-zinc-100"
          } placeholder-zinc-500`}
        />

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between pt-2 px-1 text-xs">
          <div className="flex items-center gap-2">
            {/* File Attachment */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.csv,.json"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading || isStreaming}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors disabled:opacity-40"
              title="Attach File"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Mic Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={disabled || isStreaming}
                className={`relative p-2 rounded-xl transition-all disabled:opacity-40 ${
                  isListening
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80"
                }`}
                title={
                  isListening
                    ? "Stop voice input"
                    : "Voice input — words type into the box as you speak"
                }
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                {isListening && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            )}

            {/* Web Search Toggle */}
            {onToggleWebSearch && (
              <button
                type="button"
                onClick={() => onToggleWebSearch(!webSearchEnabled)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs transition-colors ${
                  webSearchEnabled
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/25 font-semibold"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                }`}
                title="Toggle Web Search"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  Search: {webSearchEnabled ? "ON" : "OFF"}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isStreaming && onStopGeneration ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-md shadow-red-600/20 transition-all cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  (!message.trim() && !fileAttachment) || disabled || uploading
                }
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                title="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
