"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Menu,
  Sparkles,
  AlertCircle,
  Brain,
  Zap,
  Globe,
  Shield,
  Mic,
  Bot,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import EmptyState from "@/components/EmptyState";
import MemoryModal from "@/components/MemoryModal";
import TrainingBanner from "@/components/TrainingBanner";
import ModelSelector from "@/components/ModelSelector";
import VoiceModeModal from "@/components/VoiceModeModal";
import { sendMessage, streamMessage, StreamEvent } from "@/services/chat";
import {
  fetchConversations,
  fetchConversationDetail,
  deleteConversation,
  updateConversation,
  ConversationItem,
  MessageItem,
} from "@/services/conversations";
import { getMe, removeToken, User } from "@/services/auth";
import { fetchMemories, trainOnHistory } from "@/services/memory";
import { fetchPersonas, PersonaItem } from "@/services/personas";

function ChatPageContent() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingSuccessMsg, setTrainingSuccessMsg] = useState<string | null>(null);

  // AI Model & Provider Gateway state
  const [selectedModel, setSelectedModel] = useState("auto");
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [localOnly, setLocalOnly] = useState(false);
  const [activePersona, setActivePersona] = useState<PersonaItem | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load User, Conversations, Memory & Persona on mount
  useEffect(() => {
    async function loadData() {
      const currentUser = await getMe();
      setUser(currentUser);
      const list = await fetchConversations();
      setConversations(list);
      if (currentUser) {
        const memories = await fetchMemories();
        setMemoryCount(memories.length);
      }
      const savedLocalOnly = localStorage.getItem("yash_ai_local_only") === "true";
      setLocalOnly(savedLocalOnly);

      const personaId = searchParams.get("persona");
      if (personaId) {
        const personas = await fetchPersonas();
        const p = personas.find((x) => x.id === personaId);
        if (p) setActivePersona(p);
      }
    }
    loadData();
  }, [searchParams]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, isStreaming]);

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

  const handleRenameConversation = async (id: string, newTitle: string) => {
    const updated = await updateConversation(id, { title: newTitle });
    if (updated) {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
    }
  };

  const handleTogglePin = async (id: string, pinned: boolean) => {
    const updated = await updateConversation(id, { pinned });
    if (updated) {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, pinned } : c))
      );
    }
  };

  const handleToggleArchive = async (id: string, archived: boolean) => {
    const updated = await updateConversation(id, { archived });
    if (updated) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setLoading(false);
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

    // Setup streaming
    const tempAssistantId = (Date.now() + 1).toString();
    const tempAssistantMessage: MessageItem = {
      id: tempAssistantId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempAssistantMessage]);
    setLoading(true);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let accumulatedResponse = "";

      await streamMessage(
        content,
        activeConversationId || undefined,
        filePath,
        selectedModel,
        webSearchEnabled,
        localOnly,
        (event: StreamEvent) => {
          if (event.type === "init") {
            setLoading(false);
            if (event.conversation_id && event.conversation_id !== activeConversationId) {
              setActiveConversationId(event.conversation_id);
            }
            if (event.sources && event.sources.length > 0) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAssistantId ? { ...m, sources: event.sources } : m
                )
              );
            }
          } else if (event.type === "token") {
            setLoading(false);
            accumulatedResponse += event.token || "";
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId
                  ? { ...m, content: accumulatedResponse }
                  : m
              )
            );
          } else if (event.type === "meta") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId
                  ? {
                      ...m,
                      provider: event.provider,
                      model: event.model,
                    }
                  : m
              )
            );
          } else if (event.type === "done") {
            setIsStreaming(false);
          }
        },
        controller.signal
      );

      // Refresh sidebar list
      const list = await fetchConversations();
      setConversations(list);
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Generation stopped by user.");
      } else {
        console.error("Chat Error:", err);
        // Fallback standard call
        try {
          const fallbackRes = await sendMessage(
            content,
            activeConversationId || undefined,
            filePath,
            selectedModel,
            webSearchEnabled,
            localOnly
          );
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId
                ? {
                    ...m,
                    content: fallbackRes.response,
                    sources: fallbackRes.sources,
                    provider: fallbackRes.provider,
                    chart_images: fallbackRes.chart_images,
                  }
                : m
            )
          );
          const list = await fetchConversations();
          setConversations(list);
        } catch (fErr: any) {
          const errDetail =
            fErr?.response?.data?.detail || "Unable to connect to Yash.AI backend. Please check connection.";
          setErrorMessage(errDetail);
          setMessages((prev) => prev.filter((m) => m.id !== tempAssistantId));
        }
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      setMessages((prev) => prev.slice(0, -1));
      handleSendMessage(lastUserMsg.content, lastUserMsg.file_path);
    }
  };

  const handleEditUserMessage = (newContent: string) => {
    handleSendMessage(newContent);
  };

  const handleTrainOnHistoryQuick = async () => {
    setIsTraining(true);
    setTrainingSuccessMsg(null);
    try {
      const res = await trainOnHistory();
      if (res) {
        setMemoryCount(res.memories.length);
        setTrainingSuccessMsg(`✨ AI successfully trained! Learned ${res.extracted_count} personalized memories.`);
        setTimeout(() => setTrainingSuccessMsg(null), 6000);
      }
    } finally {
      setIsTraining(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    setUser(null);
    setConversations([]);
    setMemoryCount(0);
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
        onRenameConversation={handleRenameConversation}
        onTogglePin={handleTogglePin}
        onToggleArchive={handleToggleArchive}
        user={user}
        onOpenLogin={() => router.push("/login")}
        onLogout={handleLogout}
        onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
        memoryCount={memoryCount}
        isOpenMobile={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Chat Workspace */}
      <main className="flex flex-1 flex-col h-full overflow-hidden bg-gradient-to-b from-zinc-950 via-black to-black">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-zinc-800/80 px-4 sm:px-6 py-3 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                <span>Yash.AI</span>
                {activePersona && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
                    <Bot className="w-3 h-3" />
                    <span>{activePersona.name}</span>
                  </span>
                )}
                {localOnly && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    <Shield className="w-3 h-3" />
                    <span>Local Mode</span>
                  </span>
                )}
                {memoryCount > 0 && !localOnly && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    <Brain className="w-3 h-3" />
                    <span>{memoryCount} Learned</span>
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-zinc-500">
                {activeConversationId ? "Active Session" : "New Chat Session"}
              </p>
            </div>
          </div>

          {/* Model Selector & Actions */}
          <div className="flex items-center gap-2">
            {/* Full-Duplex Voice Mode Trigger */}
            <button
              onClick={() => setIsVoiceModeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white font-medium transition-colors cursor-pointer"
              title="Enter Full-Duplex Voice Mode"
            >
              <Mic className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span className="hidden sm:inline">Voice Mode</span>
            </button>

            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              localOnly={localOnly}
            />

            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium shadow-md shadow-blue-600/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ New Chat</span>
            </button>
          </div>
        </header>

        {/* Training Consent Banner */}
        {user && !localOnly && (
          <TrainingBanner
            onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
            onTrainNow={handleTrainOnHistoryQuick}
            isTraining={isTraining}
          />
        )}

        {/* Success Banner */}
        {trainingSuccessMsg && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between shadow-md animate-fadeIn">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-300" />
              <span>{trainingSuccessMsg}</span>
            </div>
            <button
              onClick={() => setTrainingSuccessMsg(null)}
              className="text-emerald-400 hover:text-white font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

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
                  id={msg.id}
                  role={msg.role}
                  content={msg.content}
                  filePath={msg.file_path}
                  provider={msg.provider}
                  model={msg.model}
                  sources={msg.sources}
                  chartImages={msg.chart_images}
                  createdAt={msg.created_at}
                  onRegenerate={index === messages.length - 1 && msg.role === "assistant" ? handleRegenerate : undefined}
                  onEditMessage={msg.role === "user" ? handleEditUserMessage : undefined}
                />
              ))}

              {loading && <ThinkingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Composer */}
        <div className="border-t border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={loading}
            isStreaming={isStreaming}
            onStopGeneration={handleStopGeneration}
            webSearchEnabled={webSearchEnabled}
            onToggleWebSearch={setWebSearchEnabled}
          />
        </div>
      </main>

      {/* AI Memory & Training Modal */}
      <MemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        onMemoriesUpdated={(count) => setMemoryCount(count)}
      />

      {/* Full-Duplex Voice Mode Modal */}
      {isVoiceModeOpen && (
        <VoiceModeModal
          onClose={() => setIsVoiceModeOpen(false)}
          onTranscript={(t) => {
            handleSendMessage(t);
            setIsVoiceModeOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center text-white">Loading Yash.AI...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
