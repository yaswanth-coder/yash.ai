"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Paperclip,
  X,
  FileText,
  Mic,
  MicOff,
  Globe,
  Square,
  Sparkles,
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

export default function ChatInput({
  onSendMessage,
  disabled,
  onStopGeneration,
  isStreaming = false,
  webSearchEnabled = true,
  onToggleWebSearch,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [fileAttachment, setFileAttachment] = useState<{ path: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = "en-US";

        recog.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        };

        recog.onerror = (e: any) => {
          console.warn("Speech recognition error:", e);
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recog;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Could not start speech recognition:", e);
      }
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
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
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    onSendMessage(message, fileAttachment?.path);
    setMessage("");
    setFileAttachment(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 20MB)
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

  return (
    <div className="max-w-4xl mx-auto w-full px-4 pb-4">
      {/* File Attachment Card */}
      {fileAttachment && (
        <div className="flex items-center gap-2 mb-2 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl w-fit text-xs text-zinc-200 animate-fadeIn">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="truncate max-w-[220px] font-medium">{fileAttachment.name}</span>
          <button
            onClick={() => setFileAttachment(null)}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Composer Box */}
      <div className="relative rounded-2xl bg-zinc-900/90 border border-zinc-800/90 shadow-xl focus-within:border-blue-500/60 transition-all p-2.5">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Listening... speak now" : "Ask Yash.AI anything (Shift + Enter for new line)..."}
          rows={1}
          disabled={disabled || isStreaming}
          className="w-full bg-transparent px-2.5 py-1 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none max-h-44 custom-scrollbar"
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
              title="Attach File / Document / Image"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Voice Input Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={disabled || isStreaming}
                className={`p-2 rounded-xl transition-colors ${
                  isListening
                    ? "bg-red-500/20 text-red-400 animate-pulse border border-red-500/30"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80"
                }`}
                title={isListening ? "Stop Voice Input" : "Voice Input (Microphone)"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            {/* Web Search Quick Toggle */}
            {onToggleWebSearch && (
              <button
                type="button"
                onClick={() => onToggleWebSearch(!webSearchEnabled)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs transition-colors ${
                  webSearchEnabled
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/25 font-semibold"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                }`}
                title="Toggle Web Search Tool"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Search: {webSearchEnabled ? "ON" : "OFF"}</span>
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
                disabled={(!message.trim() && !fileAttachment) || disabled || uploading}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 disabled:hover:bg-blue-600 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
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
