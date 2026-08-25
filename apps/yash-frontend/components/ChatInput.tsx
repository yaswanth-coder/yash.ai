"use client";

import React, { useState, useRef } from "react";
import { Paperclip, Mic, MicOff, Send, X, FileText } from "lucide-react";
import { uploadFile } from "@/services/chat";

interface ChatInputProps {
  onSendMessage: (message: string, filePath?: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ filename: string; file_path: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((!inputMessage.trim() && !attachedFile) || disabled || isUploading) return;
    onSendMessage(inputMessage, attachedFile?.file_path);
    setInputMessage("");
    setAttachedFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await uploadFile(file);
      setAttachedFile({
        filename: res.filename,
        file_path: res.file_path,
      });
    } catch (err) {
      console.error("File upload error:", err);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-3 sm:p-4">
      {/* File Attachment Chip */}
      {attachedFile && (
        <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-zinc-200">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="font-mono truncate max-w-[250px]">{attachedFile.filename}</span>
          <button
            onClick={() => setAttachedFile(null)}
            className="p-0.5 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Input Box */}
      <div className="relative flex items-center gap-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-2 sm:p-3 shadow-lg focus-within:border-blue-500/50 transition-all">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
        />

        {/* Attachment Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors shrink-0 disabled:opacity-50"
          title="Attach PDF or Image"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={isUploading ? "Uploading file..." : "Ask Yash.AI anything..."}
          className="flex-1 bg-transparent text-sm sm:text-base text-zinc-100 placeholder-zinc-500 outline-none px-2"
        />

        {/* Speech Dictation Button */}
        <button
          onClick={toggleSpeechRecognition}
          disabled={disabled}
          className={`p-2 rounded-xl transition-colors shrink-0 ${
            isListening
              ? "bg-red-600/20 text-red-400 border border-red-500/50 animate-pulse"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          }`}
          title={isListening ? "Listening... click to stop" : "Speak to Yash.AI"}
        >
          {isListening ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!inputMessage.trim() && !attachedFile) || disabled || isUploading}
          className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-md disabled:opacity-40 disabled:hover:bg-blue-600 shrink-0"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
