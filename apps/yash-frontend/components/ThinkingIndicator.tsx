"use client";

import React from "react";
import { Bot } from "lucide-react";

export default function ThinkingIndicator() {
  return (
    <div className="flex justify-start my-4">
      <div className="flex items-start gap-3 max-w-3xl">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-md">
          <Bot className="w-4 h-4" />
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-3.5 flex items-center gap-3 text-zinc-300 shadow-sm">
          <span className="text-sm font-medium text-zinc-300">Yash.AI is thinking</span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
