"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Menu, Sparkles, AlertCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import EmptyState from "@/components/EmptyState";
import { sendMessage } from "@/services/chat";
import {
  fetchConversations,
  fetchConversationDetail,
  deleteConversation,
  ConversationItem,
  MessageItem,
} from "@/services/conversations";
import { getMe, removeToken, User } from "@/services/auth";

export default function ChatPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load User & Conversations on mount
  useEffect(() => {
    async function loadData() {
      const currentUser = await getMe();
      setUser(currentUser);
      const list = await fetchConversations();
      setConversations(list);
    }
    loadData();
  }, []);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load conversation details when active id changes
  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setErrorMessage(null);
    const detail = await fetchConversationDetail(id);
    if (detail) {
      setMessages(detail.messages);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setErrorMessage(null);
  };

  const handleDeleteConversation = async (id: string) => {
    const success = await deleteConversation(id);
    if (success) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    }
  };

  const handleSendMessage = async (content: string, filePath?: string) => {
    if (!content.trim() && !filePath) return;

    setErrorMessage(null);
    const tempUserMessage: MessageItem = {
      id: Date.now().toString(),
      role: "user",
      content,
      file_path: filePath,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      setLoading(true);
      const data = await sendMessage(content, activeConversationId || undefined, filePath);

      if (data.conversation_id && data.conversation_id !== activeConversationId) {
        setActiveConversationId(data.conversation_id);
      }

      const tempAssistantMessage: MessageItem = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempAssistantMessage]);

      // Refresh sidebar list
      const list = await fetchConversations();
      setConversations(list);
    } catch (err: any) {
      console.error("Chat Error:", err);
      const errDetail =
        err?.response?.data?.detail || "Unable to connect to Yash.AI backend. Please ensure backend server is running.";
      setErrorMessage(errDetail);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    setUser(null);
    setConversations([]);
    handleNewChat();
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        user={user}
        onOpenLogin={() => router.push("/login")}
        onLogout={handleLogout}
        isOpenMobile={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Chat Content */}
      <main className="flex flex-1 flex-col h-full overflow-hidden bg-gradient-to-b from-zinc-950 via-black to-black">
        {/* Top Navigation Header */}
        <header className="flex items-center justify-between border-b border-zinc-800/80 px-4 sm:px-6 py-3.5 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                <span>Yash.AI Assistant</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Gemini 2.5
                </span>
              </h1>
              <p className="text-xs text-zinc-500">
                {activeConversationId ? "Active Conversation" : "New Chat Session"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>New Chat</span>
            </button>
          </div>
        </header>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 custom-scrollbar">
          {messages.length === 0 ? (
            <EmptyState onSelectSuggestion={(prompt) => handleSendMessage(prompt)} />
          ) : (
            <div className="max-w-4xl mx-auto space-y-2">
              {messages.map((msg, index) => (
                <ChatMessage
                  key={msg.id || index}
                  role={msg.role}
                  content={msg.content}
                  filePath={msg.file_path}
                  createdAt={msg.created_at}
                />
              ))}

              {loading && <ThinkingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md">
          <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
        </div>
      </main>
    </div>
  );
}
