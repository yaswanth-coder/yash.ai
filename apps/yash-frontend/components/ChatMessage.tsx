"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  User,
  Bot,
  Copy,
  Check,
  FileText,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Volume2,
  VolumeX,
  Edit2,
  Globe,
  ExternalLink,
  Cpu,
  Monitor,
  Image as ImageIcon,
} from "lucide-react";
import { submitMessageFeedback } from "@/services/feedback";
import dynamic from "next/dynamic";

const CanvasStudio = dynamic(() => import("./CanvasStudio"), { ssr: false });

interface ChatMessageProps {
  id?: string;
  role: "user" | "assistant";
  content: string;
  filePath?: string;
  provider?: string;
  model?: string;
  sources?: Array<{
    title: string;
    url: string;
    domain: string;
    snippet: string;
  }>;
  chartImages?: string[];
  createdAt?: string;
  onRegenerate?: () => void;
  onEditMessage?: (newContent: string) => void;
}

export default function ChatMessage({
  id,
  role,
  content,
  filePath,
  provider,
  model,
  sources,
  chartImages,
  createdAt,
  onRegenerate,
  onEditMessage,
}: ChatMessageProps) {
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [canvasCode, setCanvasCode] = useState<{ code: string; lang: string } | null>(null);

  const isUser = role === "user";

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(content);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleFeedback = async (type: "positive" | "negative") => {
    const target = type === "positive" ? "up" : "down";
    setFeedback(feedback === target ? null : target);
    if (id) {
      await submitMessageFeedback(id, type);
    }
  };

  // Speech Synthesis
  const handleToggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(content.replace(/[#*`_]/g, ""));
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editContent.trim() && onEditMessage) {
      onEditMessage(editContent.trim());
      setIsEditing(false);
    }
  };

  return (
    <>
      <div className={`flex w-full my-4 ${isUser ? "justify-end" : "justify-start"}`}>
        <div className={`flex items-start gap-3 max-w-3xl w-full ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          {/* Avatar */}
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md ${
              isUser
                ? "bg-blue-600 shadow-blue-600/20"
                : "bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-blue-500/20"
            }`}
          >
            {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>

          {/* Message Container */}
          <div
            className={`relative group rounded-2xl px-5 py-4 shadow-sm border text-sm leading-relaxed ${
              isUser
                ? "bg-blue-600 text-white border-blue-500/30 rounded-tr-xs"
                : "bg-zinc-900/90 text-zinc-100 border-zinc-800/90 rounded-tl-xs backdrop-blur-xs flex-1"
            }`}
          >
            {/* File Attachment Badge */}
            {filePath && (
              <div className="flex items-center gap-2 mb-3 p-2 rounded-xl bg-black/30 border border-white/10 text-xs font-mono text-zinc-300">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate max-w-[240px]">{filePath.split("/").pop()}</span>
              </div>
            )}

            {/* Web Search Sources Chips */}
            {!isUser && sources && sources.length > 0 && (
              <div className="mb-3 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5 animate-fadeIn">
                <div className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Web Sources ({sources.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sources.map((s, idx) => (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
                    >
                      <span className="truncate max-w-[150px]">{s.title || s.domain}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Message Content */}
            {isUser ? (
              isEditing ? (
                <form onSubmit={handleSaveEdit} className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full bg-zinc-950 text-white p-2.5 rounded-xl text-xs border border-blue-500 focus:outline-none resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-2.5 py-1 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg text-xs bg-blue-500 hover:bg-blue-400 text-white font-semibold"
                    >
                      Save & Resubmit
                    </button>
                  </div>
                </form>
              ) : (
                <div className="whitespace-pre-wrap font-sans">{content}</div>
              )
            ) : (
              <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-headings:text-zinc-100 prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-400 prose-code:text-blue-300">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Use div instead of p to prevent invalid nesting when CodeBlock
                    // (which renders a div/pre) appears inside a paragraph
                    p({ children, ...props }: any) {
                      return (
                        <div className="mb-3 last:mb-0 leading-relaxed" {...props}>
                          {children}
                        </div>
                      );
                    },
                    // Pass pre through — CodeBlock renders its own pre
                    pre({ children }: any) {
                      return <>{children}</>;
                    },
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");
                      const lang = match ? match[1] : "text";

                      if (!inline) {
                        return (
                          <CodeBlock
                            language={lang}
                            value={codeString}
                            onOpenCanvas={() => setCanvasCode({ code: codeString, lang })}
                          />
                        );
                      }
                      return (
                        <code
                          className="bg-zinc-800 text-blue-300 px-1.5 py-0.5 rounded-md text-xs font-mono border border-zinc-700/50"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>

                {/* Generated Visual Charts & Figures */}
                {!isUser && chartImages && chartImages.length > 0 && (
                  <div className="mt-4 space-y-3 pt-3 border-t border-zinc-800/80">
                    <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Generated Visualizations ({chartImages.length})</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {chartImages.map((imgSrc, idx) => (
                        <div key={idx} className="rounded-xl overflow-hidden border border-zinc-800 bg-black/40 p-2">
                          <img
                            src={imgSrc}
                            alt={`Generated Chart ${idx + 1}`}
                            className="w-full h-auto rounded-lg object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Actions & Metadata */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                {createdAt && (
                  <span>{new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                )}
                {provider && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-zinc-500">
                    <Cpu className="w-2.5 h-2.5" />
                    <span>{provider}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* User Edit */}
                {isUser && onEditMessage && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-blue-700 text-white/80 hover:text-white transition-opacity"
                    title="Edit message & resubmit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Assistant Vocal Playback */}
                {!isUser && (
                  <button
                    onClick={handleToggleSpeech}
                    className={`p-1 rounded-md hover:bg-zinc-800 transition-colors ${
                      isSpeaking ? "text-blue-400 bg-blue-500/10" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                    title={isSpeaking ? "Stop Speaking" : "Read Aloud"}
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                )}

                {/* Regenerate Assistant Response */}
                {!isUser && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                    title="Regenerate response"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Feedback Buttons */}
                {!isUser && (
                  <>
                    <button
                      onClick={() => handleFeedback("positive")}
                      className={`p-1 rounded-md hover:bg-zinc-800 transition-colors ${
                        feedback === "up" ? "text-blue-400 bg-blue-500/10" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                      title="Good response"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleFeedback("negative")}
                      className={`p-1 rounded-md hover:bg-zinc-800 transition-colors ${
                        feedback === "down" ? "text-amber-400 bg-amber-500/10" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                      title="Bad response"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {/* Copy Message */}
                <button
                  onClick={handleCopyMessage}
                  className="flex items-center gap-1 hover:text-white px-2 py-1 rounded-md bg-zinc-800/60 hover:bg-zinc-800 transition-all ml-1 text-zinc-400"
                  title="Copy full message"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 font-sans">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="font-sans">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Studio Modal */}
      {canvasCode && (
        <CanvasStudio
          initialCode={canvasCode.code}
          language={canvasCode.lang}
          onClose={() => setCanvasCode(null)}
        />
      )}
    </>
  );
}

function CodeBlock({
  language,
  value,
  onOpenCanvas,
}: {
  language: string;
  value: string;
  onOpenCanvas?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-zinc-800/90 bg-zinc-950 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-b border-zinc-800 text-xs text-zinc-400 font-mono">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/60 inline-block" />
          </div>
          <span className="text-blue-400 font-semibold uppercase text-[11px] ml-1">{language}</span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenCanvas && (
            <button
              onClick={onOpenCanvas}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors text-[11px] font-semibold"
              title="Open in Interactive Canvas Studio"
            >
              <Monitor className="w-3 h-3" />
              <span>Open in Canvas</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 font-sans text-[11px]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="font-sans text-[11px]">Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      <pre className="p-4 overflow-x-auto font-mono text-xs text-zinc-200 leading-relaxed custom-scrollbar">
        <code>{value}</code>
      </pre>
    </div>
  );
}
