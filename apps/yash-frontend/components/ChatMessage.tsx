"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot, Copy, Check, FileText } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  filePath?: string;
  createdAt?: string;
}

export default function ChatMessage({ role, content, filePath, createdAt }: ChatMessageProps) {
  const [copiedMessage, setCopiedMessage] = useState(false);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(content);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const isUser = role === "user";

  return (
    <div className={`flex w-full my-4 ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-start gap-3 max-w-3xl ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md ${
            isUser
              ? "bg-blue-600"
              : "bg-gradient-to-tr from-blue-600 to-indigo-500"
          }`}
        >
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Message Container */}
        <div
          className={`relative group rounded-2xl px-5 py-4 shadow-sm border text-sm leading-relaxed ${
            isUser
              ? "bg-blue-600/90 text-white border-blue-500/30 rounded-tr-xs"
              : "bg-zinc-900 text-zinc-100 border-zinc-800 rounded-tl-xs"
          }`}
        >
          {/* File Attachment Badge if present */}
          {filePath && (
            <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-black/20 border border-white/10 text-xs font-mono text-zinc-300">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span className="truncate max-w-[200px]">{filePath.split("/").pop()}</span>
            </div>
          )}

          {/* Content */}
          {isUser ? (
            <div className="whitespace-pre-wrap">{content}</div>
          ) : (
            <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");
                    
                    if (!inline && match) {
                      return (
                        <CodeBlock language={match[1]} value={codeString} />
                      );
                    } else if (!inline) {
                      return (
                        <CodeBlock language="text" value={codeString} />
                      );
                    }
                    return (
                      <code
                        className="bg-zinc-800 text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono border border-zinc-700/50"
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
            </div>
          )}

          {/* Footer Actions / Timestamp */}
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-800/50 text-[11px] text-zinc-400">
            {createdAt ? (
              <span>{new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            ) : (
              <span></span>
            )}

            {!isUser && (
              <button
                onClick={handleCopyMessage}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 hover:text-white px-2 py-0.5 rounded bg-zinc-800/60"
                title="Copy response"
              >
                {copiedMessage ? (
                  <>
                    <Check className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-800 text-xs text-zinc-400 font-mono">
        <span className="text-blue-400 font-semibold">{language.toUpperCase()}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400 font-sans">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="font-sans">Copy Code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-4 overflow-x-auto font-mono text-xs text-zinc-200 leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
}
