"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Plus,
  MessageSquare,
  Trash2,
  Sparkles,
  LogIn,
  LogOut,
  User as UserIcon,
  X,
  Brain,
  FolderKanban,
  Library as LibraryIcon,
  Clock,
  Blocks,
  Code2,
  Settings as SettingsIcon,
  Search,
  Pin,
  Archive,
  MoreVertical,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bot,
  Palette,
  Video,
  Box,
  Music,
  FileText,
  Compass,
  Wrench,
} from "lucide-react";
import { ConversationItem } from "@/services/conversations";
import { User } from "@/services/auth";

interface SidebarProps {
  conversations: ConversationItem[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
  onToggleArchive?: (id: string, archived: boolean) => void;
  user: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenMemoryModal?: () => void;
  memoryCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onTogglePin,
  onToggleArchive,
  user,
  onOpenLogin,
  onLogout,
  onOpenMemoryModal,
  memoryCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const filteredConvs = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    return conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const grouped = useMemo(() => {
    const today: ConversationItem[] = [];
    const yesterday: ConversationItem[] = [];
    const last7Days: ConversationItem[] = [];
    const older: ConversationItem[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;

    const sorted = [...filteredConvs].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    sorted.forEach((item) => {
      const itemTime = new Date(item.updated_at).getTime();
      if (itemTime >= todayStart) today.push(item);
      else if (itemTime >= yesterdayStart) yesterday.push(item);
      else if (itemTime >= weekStart) last7Days.push(item);
      else older.push(item);
    });

    return { today, yesterday, last7Days, older };
  }, [filteredConvs]);

  const [createExpanded, setCreateExpanded] = useState(pathname?.startsWith("/create") ?? false);

  const createWorkspaces = [
    { label: "Image", icon: Palette, href: "/create/image", badge: "Studio" },
    { label: "Video", icon: Video, href: "/create/video", badge: "Studio" },
    { label: "Design", icon: Sparkles, href: "/create/design", badge: "Canvas" },
    { label: "3D", icon: Box, href: "/create/3d", badge: "Studio" },
    { label: "Code", icon: Code2, href: "/create/code", badge: "Studio" },
    { label: "Audio", icon: Music, href: "/create/audio", badge: "Studio" },
    { label: "Documents", icon: FileText, href: "/create/documents", badge: "Docs" },
    { label: "Research", icon: Compass, href: "/create/research", badge: "Synthesis" },
  ];

    // Pre-warm all primary routes for instant <10ms zero-latency opening
  useEffect(() => {
    const routes = [
      "/chat",
      "/projects",
      "/plugins",
      "/agents",
      "/library",
      "/create",
      "/create/image",
      "/create/video",
      "/create/code",
      "/settings",
    ];
    routes.forEach((r) => {
      try { router.prefetch(r); } catch {}
    });
  }, [router]);

  const primaryNavItems = [
    { label: "Chat", icon: MessageSquare, href: "/chat" },
    { label: "Projects", icon: FolderKanban, href: "/projects" },
    { label: "AI Tools", icon: Wrench, href: "/plugins" },
    { label: "Agents", icon: Bot, href: "/agents" },
    { label: "Files", icon: LibraryIcon, href: "/library" },
  ];

  const content = (
    <div
      className={`relative flex flex-col h-full transition-all duration-300 ${
        isCollapsed ? "w-[72px]" : "w-[85vw] max-w-[320px] sm:w-80"
      }`}
      style={{
        background: "rgba(5, 5, 14, 0.78)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* Top specular bevel */}
      <div
        className="absolute top-0 inset-x-0 h-px pointer-events-none z-10"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)" }}
      />

      {/* Ambient glow orb */}
      <div
        className="absolute top-0 left-0 w-48 h-48 pointer-events-none opacity-20 animate-iris"
        style={{
          background: "radial-gradient(circle, rgba(79,140,255,0.4) 0%, transparent 70%)",
          filter: "blur(30px)",
          transform: "translate(-20%, -20%)",
        }}
      />

      <div className="relative z-10 flex flex-col h-full p-3.5 pt-safe pb-safe">
        {/* Header / Brand */}
        <div className="flex items-center justify-between px-1.5 py-1 mb-3">
          <Link href="/chat" className="flex items-center gap-2.5 overflow-hidden group">
            {/* Logo mark — liquid glass orb */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 group-hover:scale-105 transition-transform relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(124,92,252,0.85), rgba(20,184,166,0.7))",
                boxShadow: "0 4px 16px rgba(79,140,255,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
                border: "1px solid rgba(255,255,255,0.20)",
              }}
            >
              <span className="relative z-10">Y</span>
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <span className="font-bold text-sm text-zinc-100 tracking-tight block">Yash.AI</span>
                <span className="text-[10px] text-zinc-500 font-medium block">Personal AI Platform</span>
              </div>
            )}
          </Link>

          {isOpenMobile ? (
            <button
              onClick={onCloseMobile}
              className="glass-btn p-2 rounded-xl text-zinc-400 hover:text-white transition-all flex items-center justify-center min-w-[36px] min-h-[36px]"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex glass-btn p-1.5 rounded-lg text-zinc-400 hover:text-white transition-all"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* New Chat Button */}
        <button
          onClick={() => {
            onNewChat();
            if (pathname !== "/chat") router.push("/chat");
          }}
          className={`glass-btn-primary w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-white font-semibold text-xs cursor-pointer mb-3 ${
            isCollapsed ? "px-0" : ""
          }`}
          title="Start New Conversation"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>New Chat</span>}
        </button>

        {/* Primary Navigation */}
        {!isCollapsed ? (
          <div className="mb-2 space-y-0.5">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onMouseEnter={() => router.prefetch(item.href)}
                  onTouchStart={() => router.prefetch(item.href)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? "text-white"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                  style={active ? {
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
                  } : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-400" : "text-zinc-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Expandable Create Suite */}
            <div>
              <div className="flex items-center justify-between px-2 py-1.5 mt-1">
                <Link
                  href="/create"
                  className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                    pathname?.startsWith("/create") ? "text-blue-400" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-liquid-pulse" />
                  <span>Create Studio</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setCreateExpanded(!createExpanded)}
                  className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
                >
                  {createExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {createExpanded && (
                <div className="pl-4 pr-1 space-y-0.5 mt-1 ml-3 border-l border-white/[0.06]">
                  {createWorkspaces.map((ws) => {
                    const WsIcon = ws.icon;
                    const wsActive = pathname === ws.href;
                    return (
                      <Link
                        key={ws.href}
                        href={ws.href}
                        prefetch={true}
                        onMouseEnter={() => router.prefetch(ws.href)}
                        onTouchStart={() => router.prefetch(ws.href)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          wsActive
                            ? "text-blue-300 font-semibold"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                        style={wsActive ? {
                          background: "rgba(59,130,246,0.12)",
                          border: "1px solid rgba(59,130,246,0.20)",
                        } : undefined}
                      >
                        <div className="flex items-center gap-2">
                          <WsIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{ws.label}</span>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider text-zinc-600 font-semibold">
                          {ws.badge}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-2 flex flex-col items-center gap-1.5">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-2.5 rounded-xl transition-all ${
                    active ? "text-blue-400" : "text-zinc-400 hover:text-white"
                  }`}
                  style={active ? {
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  } : undefined}
                  title={item.label}
                >
                  <Icon className="w-4 h-4" />
                </Link>
              );
            })}
          </div>
        )}

        {/* Divider */}
        <div className="h-px mx-1 mb-2" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Search */}
        {!isCollapsed && (
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 rounded-xl focus:outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              }}
            />
          </div>
        )}

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 custom-scrollbar">
          {!isCollapsed ? (
            <>
              {filteredConvs.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-xs">
                  {searchQuery ? "No matching chats" : "No recent chats"}
                </div>
              ) : (
                <>
                  {grouped.today.length > 0 && (
                    <GroupSection
                      title="Today"
                      items={grouped.today}
                      activeId={activeId}
                      onSelect={(id) => {
                        onSelectConversation(id);
                        if (pathname !== "/chat") router.push("/chat");
                      }}
                      onDelete={onDeleteConversation}
                      onRename={onRenameConversation}
                      onTogglePin={onTogglePin}
                      onToggleArchive={onToggleArchive}
                    />
                  )}
                  {grouped.yesterday.length > 0 && (
                    <GroupSection
                      title="Yesterday"
                      items={grouped.yesterday}
                      activeId={activeId}
                      onSelect={(id) => {
                        onSelectConversation(id);
                        if (pathname !== "/chat") router.push("/chat");
                      }}
                      onDelete={onDeleteConversation}
                      onRename={onRenameConversation}
                      onTogglePin={onTogglePin}
                      onToggleArchive={onToggleArchive}
                    />
                  )}
                  {grouped.last7Days.length > 0 && (
                    <GroupSection
                      title="Previous 7 Days"
                      items={grouped.last7Days}
                      activeId={activeId}
                      onSelect={(id) => {
                        onSelectConversation(id);
                        if (pathname !== "/chat") router.push("/chat");
                      }}
                      onDelete={onDeleteConversation}
                      onRename={onRenameConversation}
                      onTogglePin={onTogglePin}
                      onToggleArchive={onToggleArchive}
                    />
                  )}
                  {grouped.older.length > 0 && (
                    <GroupSection
                      title="Older"
                      items={grouped.older}
                      activeId={activeId}
                      onSelect={(id) => {
                        onSelectConversation(id);
                        if (pathname !== "/chat") router.push("/chat");
                      }}
                      onDelete={onDeleteConversation}
                      onRename={onRenameConversation}
                      onTogglePin={onTogglePin}
                      onToggleArchive={onToggleArchive}
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5 pt-1">
              {filteredConvs.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectConversation(c.id);
                    if (pathname !== "/chat") router.push("/chat");
                  }}
                  className={`p-2.5 rounded-xl transition-all ${
                    activeId === c.id ? "text-white" : "text-zinc-400 hover:text-white"
                  }`}
                  style={activeId === c.id ? {
                    background: "rgba(59,130,246,0.20)",
                    border: "1px solid rgba(59,130,246,0.30)",
                  } : undefined}
                  title={c.title}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Memory */}
        {!isCollapsed && (
          <div className="mt-2">
            <button
              onClick={onOpenMemoryModal}
              className="w-full flex items-center justify-between p-2.5 rounded-xl cursor-pointer group transition-all shimmer-effect"
              style={{
                background: "linear-gradient(135deg, rgba(124,92,252,0.12), rgba(79,140,255,0.08), rgba(20,184,166,0.06))",
                border: "1px solid rgba(124,92,252,0.20)",
                boxShadow: "0 2px 16px rgba(124,92,252,0.10), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-zinc-200">AI Memory & Training</span>
              </div>
              {memoryCount > 0 && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold text-violet-300"
                  style={{
                    background: "rgba(124,92,252,0.20)",
                    border: "1px solid rgba(124,92,252,0.30)",
                  }}
                >
                  {memoryCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="h-px mx-1 my-2" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Footer */}
        <div className="space-y-1">
          {!isCollapsed && (
            <Link
              href="/settings"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                pathname === "/settings" ? "text-white" : "text-zinc-400 hover:text-zinc-100"
              }`}
              style={pathname === "/settings" ? {
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.09)",
              } : undefined}
            >
              <SettingsIcon className="w-4 h-4 text-zinc-400" />
              <span>Settings & AI Providers</span>
            </Link>
          )}

          {user ? (
            <div
              className="flex items-center justify-between p-2.5 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-300 font-bold text-xs shrink-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(124,92,252,0.20))",
                    border: "1px solid rgba(59,130,246,0.30)",
                  }}
                >
                  {user.email[0].toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div className="overflow-hidden text-xs">
                    <p className="font-semibold text-zinc-200 truncate">{user.full_name || "User"}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <button
                  onClick={onLogout}
                  className="p-1 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            !isCollapsed && (
              <button
                onClick={onOpenLogin}
                className="glass-btn w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-zinc-300 hover:text-white transition-all text-xs font-medium cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span>Sign In / Register</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:block h-[100dvh] max-h-[100dvh] sticky top-0 z-30">{content}</aside>
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-fadeIn">
          <div
            className="fixed inset-0"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-[100dvh] max-h-[100dvh] max-w-[85vw] shadow-2xl animate-glass-slide-down">
            {content}
          </div>
        </div>
      )}
    </>
  );
}

function GroupSection({
  title,
  items,
  activeId,
  onSelect,
  onDelete,
  onRename,
  onTogglePin,
  onToggleArchive,
}: {
  title: string;
  items: ConversationItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
  onToggleArchive?: (id: string, archived: boolean) => void;
}) {
  return (
    <div className="space-y-0.5">
      <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">{title}</p>
      {items.map((item) => (
        <ConversationRow
          key={item.id}
          item={item}
          active={activeId === item.id}
          onSelect={() => onSelect(item.id)}
          onDelete={() => onDelete(item.id)}
          onRename={onRename}
          onTogglePin={onTogglePin}
          onToggleArchive={onToggleArchive}
        />
      ))}
    </div>
  );
}

function ConversationRow({
  item,
  active,
  onSelect,
  onDelete,
  onRename,
  onTogglePin,
  onToggleArchive,
}: {
  item: ConversationItem;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename?: (id: string, newTitle: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
  onToggleArchive?: (id: string, archived: boolean) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim() && onRename) {
      onRename(item.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      onClick={onSelect}
      className="group relative flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition-all text-xs font-medium"
      style={active ? {
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
      } : {
        color: "rgba(161,161,170,1)",
        border: "1px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          e.currentTarget.style.color = "rgba(228,228,231,1)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "rgba(161,161,170,1)";
        }
      }}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        {item.pinned ? (
          <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        ) : (
          <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${active ? "text-blue-400" : "text-zinc-600"}`} />
        )}

        {isEditing ? (
          <form onSubmit={handleSaveRename} onClick={(e) => e.stopPropagation()} className="flex-1">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveRename}
              autoFocus
              className="w-full px-1.5 py-0.5 text-xs rounded text-white focus:outline-none"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(59,130,246,0.60)",
              }}
            />
          </form>
        ) : (
          <span className="truncate">{item.title}</span>
        )}
      </div>

      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-500 hover:text-white transition-all"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-6 w-36 rounded-xl z-50 p-1 space-y-0.5 animate-glass-slide-down"
            style={{
              background: "rgba(12, 12, 22, 0.92)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {onTogglePin && (
              <button
                onClick={() => { onTogglePin(item.id, !item.pinned); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs text-zinc-300 hover:text-white rounded-lg transition-colors hover:bg-white/5"
              >
                <Pin className="w-3 h-3 text-amber-400" />
                <span>{item.pinned ? "Unpin" : "Pin"}</span>
              </button>
            )}
            {onRename && (
              <button
                onClick={() => { setIsEditing(true); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs text-zinc-300 hover:text-white rounded-lg transition-colors hover:bg-white/5"
              >
                <Edit2 className="w-3 h-3 text-blue-400" />
                <span>Rename</span>
              </button>
            )}
            {onToggleArchive && (
              <button
                onClick={() => { onToggleArchive(item.id, !item.archived); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs text-zinc-300 hover:text-white rounded-lg transition-colors hover:bg-white/5"
              >
                <Archive className="w-3 h-3 text-violet-400" />
                <span>{item.archived ? "Unarchive" : "Archive"}</span>
              </button>
            )}
            <button
              onClick={() => {
                if (confirm(`Delete "${item.title}"?`)) onDelete();
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs text-red-400 hover:text-red-300 rounded-lg transition-colors hover:bg-red-500/8"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
