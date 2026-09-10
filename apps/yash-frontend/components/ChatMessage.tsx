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
  Brain,
  ChevronDown,
  ChevronUp,
  Sparkles,
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
  const [useSerif, setUseSerif] = useState(true);
  const [showThinking, setShowThinking] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("yash_ai_font");
      if (saved) {
        setUseSerif(saved === "serif");
      }
    }
  }, []);

  const toggleFont = () => {
    const next = !useSerif;
    setUseSerif(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("yash_ai_font", next ? "serif" : "sans");
    }
  };

  const isUser = role === "user";

  // Parse out reasoning and thinking blocks (<think>...</think>)
  let thinkingContent: string | null = null;
  let displayContent = content;

  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    thinkingContent = thinkMatch[1].trim();
    displayContent = content.replace(/<think>[\s\S]*?<\/think>/i, "").trim();
  } else if (content.startsWith("<think>")) {
    thinkingContent = content.replace("<think>", "").trim();
    displayContent = "";
  }

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
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 relative overflow-hidden"
            style={isUser ? {
              background: "linear-gradient(135deg, rgba(59,130,246,0.90), rgba(79,70,229,0.85))",
              boxShadow: "0 4px 12px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.20)",
              border: "1px solid rgba(147,197,253,0.25)",
            } : {
              background: "linear-gradient(135deg, rgba(59,130,246,0.85), rgba(124,92,252,0.80), rgba(20,184,166,0.65))",
              boxShadow: "0 4px 16px rgba(79,140,255,0.35), inset 0 1px 0 rgba(255,255,255,0.22)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            {/* specular highlight on avatar */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl pointer-events-none" />
          </div>

          {/* Message Container — liquid glass for AI, solid for user */}
          <div
            className={`relative group rounded-2xl px-5 py-4 shadow-xs text-sm leading-relaxed transition-all ${
              isUser
                ? "text-white rounded-tr-xs"
                : "text-zinc-100 rounded-tl-xs flex-1"
            }`}
            style={isUser ? {
              background: "linear-gradient(135deg, rgba(59,130,246,0.85), rgba(79,70,229,0.80))",
              border: "1px solid rgba(147,197,253,0.25)",
              boxShadow: "0 4px 20px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
            } : {
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(20px) saturate(160%)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
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
                <div className="whitespace-pre-wrap font-sans text-white leading-relaxed">{content}</div>
              )
            ) : (
              <div
                className={`${
                  useSerif ? "font-serif text-[15.5px] sm:text-[16px] leading-[1.78]" : "font-sans text-sm sm:text-[14.5px] leading-relaxed"
                } text-zinc-200 tracking-normal selection:bg-blue-500/30 selection:text-white`}
              >
                {/* Collapsible Chain-of-Thought / Deep Reasoning Block */}
                {thinkingContent && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-violet-500/20 bg-violet-950/20 backdrop-blur-md animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => setShowThinking(!showThinking)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs text-violet-300 hover:bg-white/[0.03] transition-colors select-none"
                    >
                      <div className="flex items-center gap-2">
                        <Brain className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                        <span className="font-semibold tracking-wide text-zinc-200">Thought Process</span>
                        <span className="px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-[10px] text-violet-300">
                          Deep Reasoning
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                        <span>{showThinking ? "Hide thoughts" : "View reasoning"}</span>
                        {showThinking ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </button>
                    {showThinking && (
                      <div className="px-3.5 py-2.5 border-t border-violet-500/15 text-xs text-zinc-400 font-mono leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap custom-scrollbar bg-black/20">
                        {thinkingContent}
                      </div>
                    )}
                  </div>
                )}
                {!displayContent && !thinkingContent ? (
                  <div className="py-2 flex items-center gap-3 text-zinc-300 animate-fadeIn">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "4s" }} />
                      <span className="text-xs font-semibold text-zinc-200 tracking-wide">Thinking...</span>
                      <div className="flex items-center gap-1 ml-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" />
                      </div>
                    </div>
                    <span className="text-xs text-zinc-400 font-mono text-[11px] animate-pulse hidden sm:inline">
                      Formulating response...
                    </span>
                  </div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                  components={{
                    h1({ children }: any) {
                      return (
                        <h1 className="text-xl sm:text-2xl font-bold text-white mt-6 mb-3 tracking-tight font-serif">
                          {children}
                        </h1>
                      );
                    },
                    h2({ children }: any) {
                      return (
                        <h2 className="text-lg sm:text-xl font-bold text-white mt-5 mb-2.5 tracking-tight font-serif">
                          {children}
                        </h2>
                      );
                    },
                    h3({ children }: any) {
                      return (
                        <h3 className="text-base sm:text-lg font-semibold text-zinc-100 mt-4 mb-2 tracking-tight font-serif">
                          {children}
                        </h3>
                      );
                    },
                    p({ children, ...props }: any) {
                      return (
                        <div className="mb-4 last:mb-0 leading-[1.78]" {...props}>
                          {children}
                        </div>
                      );
                    },
                    strong({ children }: any) {
                      return (
                        <strong className="font-bold text-white tracking-wide">
                          {children}
                        </strong>
                      );
                    },
                    ul({ children }: any) {
                      return (
                        <ul className="list-disc pl-5 my-3.5 space-y-2 text-zinc-200">
                          {children}
                        </ul>
                      );
                    },
                    ol({ children }: any) {
                      return (
                        <ol className="list-decimal pl-5 my-3.5 space-y-2 text-zinc-200">
                          {children}
                        </ol>
                      );
                    },
                    li({ children }: any) {
                      return <li className="leading-[1.75] pl-1">{children}</li>;
                    },
                    blockquote({ children }: any) {
                      return (
                        <blockquote className="border-l-2 border-blue-500/50 bg-blue-500/5 pl-4 py-1.5 my-4 italic text-zinc-300 rounded-r-xl">
                          {children}
                        </blockquote>
                      );
                    },
                    hr() {
                      return <hr className="border-zinc-800/80 my-5" />;
                    },
                    table({ children }: any) {
                      return (
                        <div className="overflow-x-auto my-4 rounded-xl border border-zinc-800 bg-zinc-950/60 shadow-inner">
                          <table className="w-full text-xs text-left font-sans">{children}</table>
                        </div>
                      );
                    },
                    th({ children }: any) {
                      return (
                        <th className="px-3.5 py-2.5 bg-zinc-900/90 font-semibold text-zinc-200 border-b border-zinc-800">
                          {children}
                        </th>
                      );
                    },
                    td({ children }: any) {
                      return (
                        <td className="px-3.5 py-2.5 border-b border-zinc-800/60 text-zinc-300 font-mono text-[11px]">
                          {children}
                        </td>
                      );
                    },
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
                  {displayContent || (thinkingContent ? "*(Reasoning completed)*" : "")}
                  </ReactMarkdown>
                )}

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
            <div
              className="flex items-center justify-between mt-3 pt-2 text-[11px] text-zinc-400"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2">
                {createdAt && (
                  <span>{new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
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

                {/* Font Switcher (Editorial Serif vs Modern Sans) */}
                {!isUser && (
                  <button
                    onClick={toggleFont}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/40 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] font-medium transition-colors border border-zinc-800/80 cursor-pointer"
                    title={useSerif ? "Switch to Modern Sans font" : "Switch to Editorial Serif font"}
                  >
                    <span>{useSerif ? "Serif" : "Sans"}</span>
                  </button>
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
    <div className="my-4 rounded-xl overflow-hidden border shadow-lg"
      style={{
        background: "rgba(8, 8, 18, 0.80)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* Code block header */}
      <div
        className="flex items-center justify-between px-4 py-2 text-xs text-zinc-400 font-mono"
        style={{
          background: "rgba(255,255,255,0.03)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
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
