"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
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
  ChevronDown,
  ChevronRight,
  Pin,
  Edit2,
  FolderPlus,
  Trash2,
  Search,
  Plus,
  Check,
  FolderKanban,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import EmptyState from "@/components/EmptyState";
import MemoryModal from "@/components/MemoryModal";
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
import { fetchMemories } from "@/services/memory";
import { fetchPersonas, PersonaItem } from "@/services/personas";
import { fetchProjects, createProject, ProjectItem } from "@/services/projects";

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

  // AI Model & Provider Gateway state
  const [selectedModel, setSelectedModel] = useState("auto");
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [localOnly, setLocalOnly] = useState(false);
  const [activePersona, setActivePersona] = useState<PersonaItem | null>(null);

  // Active conversation helper
  const activeConv = conversations.find((c) => c.id === activeConversationId);

  // Active session fallback state (for new chat before saving)
  const [sessionTitle, setSessionTitle] = useState("New Chat");
  const [sessionPinned, setSessionPinned] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const currentTitle = activeConv?.title || sessionTitle;
  const isPinned = Boolean(activeConv ? activeConv.pinned : sessionPinned);
  const currentProjectId = activeConv?.project_id || selectedProjectId;

  // Title Dropdown & Project Organization states
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isProjectSubmenuOpen, setIsProjectSubmenuOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [isCreatingProjectInline, setIsCreatingProjectInline] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Inline rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabled = useRef(true);
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

  const handleMessagesScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // User is considered at bottom if within 140px of bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 140;
    isAutoScrollEnabled.current = isNearBottom;
  };

  const scrollToBottom = useCallback((smooth = true) => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    if (smooth) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (!isAutoScrollEnabled.current && isStreaming) return;

    if (isStreaming) {
      // Use requestAnimationFrame for high-speed 120fps streaming without animation collision
      requestAnimationFrame(() => {
        if (messagesContainerRef.current && isAutoScrollEnabled.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    } else {
      scrollToBottom(true);
    }
  }, [messages, loading, isStreaming, scrollToBottom]);

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setErrorMessage(null);
    const detail = await fetchConversationDetail(id);
    if (detail) {
      setMessages(detail.messages);
      setSelectedProjectId(detail.project_id || null);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setErrorMessage(null);
    setSessionTitle("New Chat");
    setSessionPinned(false);
    setSelectedProjectId(null);
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

  const loadProjectsList = async () => {
    setLoadingProjects(true);
    try {
      const list = await fetchProjects();
      setProjects(list);
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const toggleHeaderMenu = () => {
    if (!isHeaderMenuOpen) {
      loadProjectsList();
      setIsProjectSubmenuOpen(false);
      setIsCreatingProjectInline(false);
      setProjectSearch("");
    }
    setIsHeaderMenuOpen((prev) => !prev);
  };

  const handleAssignProject = async (projectId: string) => {
    if (activeConv) {
      const newProjectId = activeConv.project_id === projectId ? "" : projectId;
      const updated = await updateConversation(activeConv.id, { project_id: newProjectId });
      if (updated) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConv.id ? { ...c, project_id: newProjectId } : c))
        );
      }
    } else {
      setSelectedProjectId((prev) => (prev === projectId ? null : projectId));
    }
    setIsHeaderMenuOpen(false);
    setIsProjectSubmenuOpen(false);
  };

  const handleCreateAndAssignProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const newProj = await createProject(newProjectName.trim());
    if (newProj) {
      setProjects((prev) => [newProj, ...prev]);
      if (activeConv) {
        const updated = await updateConversation(activeConv.id, { project_id: newProj.id });
        if (updated) {
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConv.id ? { ...c, project_id: newProj.id } : c))
          );
        }
      } else {
        setSelectedProjectId(newProj.id);
      }
      setNewProjectName("");
      setIsCreatingProjectInline(false);
      setIsHeaderMenuOpen(false);
      setIsProjectSubmenuOpen(false);
    }
  };

  const handleSaveRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = renameTitle.trim();
    if (clean) {
      if (activeConv) {
        handleRenameConversation(activeConv.id, clean);
      } else {
        setSessionTitle(clean);
      }
    }
    setIsRenaming(false);
  };

  const handleTogglePinAction = () => {
    if (activeConv) {
      handleTogglePin(activeConv.id, !activeConv.pinned);
    } else {
      setSessionPinned((prev) => !prev);
    }
    setIsHeaderMenuOpen(false);
  };

  const handleRenameAction = () => {
    setRenameTitle(currentTitle);
    setIsRenaming(true);
    setIsHeaderMenuOpen(false);
  };

  const handleDeleteAction = () => {
    if (activeConv) {
      handleDeleteConversation(activeConv.id);
    } else {
      handleNewChat();
    }
    setIsHeaderMenuOpen(false);
  };

  // Close header dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
        setIsProjectSubmenuOpen(false);
        setIsCreatingProjectInline(false);
      }
    };
    if (isHeaderMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isHeaderMenuOpen]);

  // Keyboard shortcuts when header dropdown is open (P: Pin, R: Rename, D: Delete, Esc: Close)
  useEffect(() => {
    if (!isHeaderMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "Escape") {
        setIsHeaderMenuOpen(false);
        setIsProjectSubmenuOpen(false);
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        handleTogglePinAction();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleRenameAction();
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        handleDeleteAction();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHeaderMenuOpen, activeConv, currentTitle, sessionPinned]);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

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
              if (sessionTitle !== "New Chat" || sessionPinned) {
                updateConversation(event.conversation_id, {
                  title: sessionTitle !== "New Chat" ? sessionTitle : undefined,
                  pinned: sessionPinned ? true : undefined,
                  project_id: currentProjectId || undefined,
                });
              }
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
        controller.signal,
        currentProjectId || undefined
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
            localOnly,
            currentProjectId || undefined
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



  const handleLogout = () => {
    removeToken();
    setUser(null);
    setConversations([]);
    setMemoryCount(0);
    handleNewChat();
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full text-white overflow-hidden font-sans" style={{ background: "#030307" }}>
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
      <main className="flex flex-1 flex-col h-full overflow-hidden relative min-w-0 w-full">
        {/* Ambient gradient layer */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 60% 0%, rgba(79,140,255,0.06) 0%, transparent 60%), " +
              "radial-gradient(ellipse 50% 50% at 80% 80%, rgba(124,92,252,0.04) 0%, transparent 55%)",
          }}
        />

        {/* Top Header — liquid glass bar */}
        <header
          className="relative flex items-center justify-between px-2.5 sm:px-6 py-2 sm:py-3 sticky top-0 z-20 gap-1.5 sm:gap-4 w-full"
          style={{
            background: "rgba(6, 6, 16, 0.72)",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          {/* Top specular bevel line */}
          <div
            className="absolute top-0 inset-x-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.10) 70%, transparent 100%)" }}
          />
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 touch-target shrink-0 flex items-center justify-center"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Conversation Title & Actions Dropdown (Claude-style header) */}
            <div className="relative min-w-0" ref={menuRef}>
              {isRenaming ? (
                <form onSubmit={handleSaveRenameSubmit} className="flex items-center gap-1.5">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setIsRenaming(false);
                    }}
                    autoFocus
                    className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRenaming(false)}
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  onClick={toggleHeaderMenu}
                  className="group flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-xl hover:bg-zinc-900/90 transition-colors text-left cursor-pointer min-w-0"
                  title="Conversation options"
                >
                  <span className="text-sm xs:text-base sm:text-lg font-bold text-zinc-100 max-w-[90px] xs:max-w-[130px] sm:max-w-xs md:max-w-md truncate">
                    {currentTitle}
                  </span>
                  {isPinned && (
                    <Pin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400/20 rotate-45 shrink-0" />
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-500 group-hover:text-zinc-300 transition-transform duration-150 shrink-0 ${
                      isHeaderMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}

              {/* Status Badges Row (Desktop/Tablet only to keep mobile header clean) */}
              <div className="hidden sm:flex items-center gap-1.5 pl-2.5 mt-0.5">
                {currentProjectId && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(59,130,246,0.12)",
                      border: "1px solid rgba(59,130,246,0.22)",
                      color: "rgba(147,197,253,1)",
                      backdropFilter: "blur(8px)",
                      boxShadow: "0 0 12px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
                    }}
                  >
                    <FolderKanban className="w-3 h-3" />
                    <span>{projects.find((p) => p.id === currentProjectId)?.name || "Project"}</span>
                  </span>
                )}
                {activePersona && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(79,140,255,0.10)",
                      border: "1px solid rgba(79,140,255,0.20)",
                      color: "rgba(147,197,253,1)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <Bot className="w-3 h-3" />
                    <span>{activePersona.name}</span>
                  </span>
                )}
                {localOnly && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(20,184,166,0.12)",
                      border: "1px solid rgba(20,184,166,0.22)",
                      color: "rgba(94,234,212,1)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <Shield className="w-3 h-3" />
                    <span>Local Mode</span>
                  </span>
                )}
                {memoryCount > 0 && !localOnly && (
                  <span
                    className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(124,92,252,0.10)",
                      border: "1px solid rgba(124,92,252,0.20)",
                      color: "rgba(196,181,253,1)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <Brain className="w-3 h-3" />
                    <span>{memoryCount} Learned</span>
                  </span>
                )}
              </div>

              {/* Dropdown Menu — liquid glass */}
              {isHeaderMenuOpen && (
                <div
                  className="absolute top-full left-0 mt-2 w-[calc(100vw-24px)] max-w-[240px] sm:w-56 rounded-2xl p-1 text-sm text-zinc-200 z-50 animate-glass-slide-down"
                  style={{
                    background: "rgba(10, 10, 22, 0.88)",
                    backdropFilter: "blur(32px) saturate(200%)",
                    WebkitBackdropFilter: "blur(32px) saturate(200%)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.65), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  {/* Pin */}
                  <button
                    onClick={handleTogglePinAction}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Pin className={`w-4 h-4 rotate-45 ${isPinned ? "text-amber-400" : "text-zinc-500"}`} />
                      <span>{isPinned ? "Unpin" : "Pin"}</span>
                    </div>
                    <span className="text-xs text-zinc-600 font-mono">P</span>
                  </button>

                  {/* Rename */}
                  <button
                    onClick={handleRenameAction}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Edit2 className="w-4 h-4 text-zinc-500" />
                      <span>Rename</span>
                    </div>
                    <span className="text-xs text-zinc-600 font-mono">R</span>
                  </button>

                  {/* Add to project > */}
                  <div
                    className="relative"
                    onMouseEnter={() => setIsProjectSubmenuOpen(true)}
                  >
                    <button
                      onClick={() => setIsProjectSubmenuOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-2.5">
                        <FolderPlus className="w-4 h-4 text-zinc-400" />
                        <span>Add to project</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    </button>

                    {/* Submenu Flyout — liquid glass */}
                    {isProjectSubmenuOpen && (
                      <div
                        className="absolute left-full top-0 ml-2 w-64 rounded-2xl p-2.5 text-xs text-zinc-200 z-50 animate-glass-slide-down"
                        style={{
                          background: "rgba(10, 10, 22, 0.92)",
                          backdropFilter: "blur(32px) saturate(200%)",
                          WebkitBackdropFilter: "blur(32px) saturate(200%)",
                          border: "1px solid rgba(255,255,255,0.10)",
                          boxShadow: "0 24px 64px rgba(0,0,0,0.70), 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
                        }}
                      >
                        {/* Search Input */}
                        <div className="relative mb-2">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500 pointer-events-none" />
                          <input
                            type="text"
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            placeholder="Search or create a project"
                            className="w-full pl-8 pr-2.5 py-1.5 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none transition-all"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          />
                        </div>

                        {/* Projects List */}
                        <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar py-1">
                          {loadingProjects ? (
                            <div className="px-2.5 py-2 text-zinc-500 text-xs">Loading...</div>
                          ) : filteredProjects.length === 0 ? (
                            <div className="px-2.5 py-2 text-zinc-500 text-xs">
                              {projectSearch ? "No matching projects" : "No projects yet"}
                            </div>
                          ) : (
                            filteredProjects.map((proj) => (
                              <button
                                key={proj.id}
                                onClick={() => handleAssignProject(proj.id)}
                                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-left cursor-pointer"
                              >
                                <span className="truncate font-medium">{proj.name}</span>
                                {currentProjectId === proj.id && (
                                  <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2" />
                                )}
                              </button>
                            ))
                          )}
                        </div>

                        <div className="border-t border-zinc-800 my-1.5" />

                        {/* + Start a new project */}
                        {isCreatingProjectInline ? (
                          <form onSubmit={handleCreateAndAssignProject} className="flex items-center gap-1.5 pt-1">
                            <input
                              type="text"
                              value={newProjectName}
                              onChange={(e) => setNewProjectName(e.target.value)}
                              placeholder="Project name..."
                              autoFocus
                              className="flex-1 px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                            />
                            <button
                              type="submit"
                              disabled={!newProjectName.trim()}
                              className="px-2.5 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
                            >
                              Add
                            </button>
                          </form>
                        ) : (
                          <button
                            onClick={() => setIsCreatingProjectInline(true)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-left font-medium cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Start a new project</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="my-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                  {/* Delete */}
                  <button
                    onClick={handleDeleteAction}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-red-400 hover:text-red-300 transition-all cursor-pointer hover:bg-red-500/8"
                  >
                    <div className="flex items-center gap-2.5">
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </div>
                    <span className="text-xs text-red-500/50 font-mono">D</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Model Selector & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Voice Mode */}
            <button
              onClick={() => setIsVoiceModeOpen(true)}
              className="glass-btn flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs text-zinc-300 hover:text-white font-medium cursor-pointer"
              title="Enter Full-Duplex Voice Mode"
              aria-label="Voice Mode"
            >
              <Mic className="w-3.5 h-3.5 text-blue-400 animate-liquid-pulse" />
              <span className="hidden sm:inline">Voice Mode</span>
            </button>

            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              localOnly={localOnly}
            />

            <button
              onClick={handleNewChat}
              className="glass-btn-primary flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs text-white font-medium cursor-pointer"
              title="Start New Chat"
              aria-label="New Chat"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </header>



        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-2.5 sm:mx-4 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between shadow-md">
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
        <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="relative z-10 flex-1 overflow-y-auto px-2.5 sm:px-6 py-3 sm:py-6 custom-scrollbar overscroll-contain gpu-smooth min-w-0 w-full">
          {messages.length === 0 ? (
            <EmptyState onSelectSuggestion={(prompt) => handleSendMessage(prompt)} />
          ) : (
            <div className="max-w-4xl mx-auto space-y-2 w-full min-w-0">
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

        {/* Input Composer — liquid glass footer */}
        <div
          className="relative z-10 pb-safe"
          style={{
            background: "rgba(6, 6, 16, 0.70)",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 -1px 0 rgba(255,255,255,0.03)",
          }}
        >
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
        <VoiceModeModal onClose={() => setIsVoiceModeOpen(false)} />
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
