"use client";

import React, { useState, useMemo } from "react";
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

  // Filter conversations by search
  const filteredConvs = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    return conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  // Group conversations into Today, Yesterday, Previous 7 Days, Older
  const grouped = useMemo(() => {
    const today: ConversationItem[] = [];
    const yesterday: ConversationItem[] = [];
    const last7Days: ConversationItem[] = [];
    const older: ConversationItem[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;

    // Prioritize pinned conversations
    const sorted = [...filteredConvs].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    sorted.forEach((item) => {
      const itemTime = new Date(item.updated_at).getTime();
      if (itemTime >= todayStart) {
        today.push(item);
      } else if (itemTime >= yesterdayStart) {
        yesterday.push(item);
      } else if (itemTime >= weekStart) {
        last7Days.push(item);
      } else {
        older.push(item);
      }
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

  const primaryNavItems = [
    { label: "Chat", icon: MessageSquare, href: "/chat" },
    { label: "Projects", icon: FolderKanban, href: "/projects" },
    { label: "AI Tools", icon: Wrench, href: "/plugins" },
    { label: "Agents", icon: Bot, href: "/agents" },
    { label: "Files", icon: LibraryIcon, href: "/library" },
  ];

  const content = (
    <div
      className={`flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 p-3.5 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-72 sm:w-80"
      }`}
    >
      {/* Header / Brand */}
      <div className="flex items-center justify-between px-2 py-1 mb-3">
        <Link href="/chat" className="flex items-center gap-2.5 overflow-hidden group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
            Y
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
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
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
        className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer ${
          isCollapsed ? "px-0" : ""
        }`}
        title="Start New Conversation"
      >
        <Plus className="w-4 h-4 shrink-0" />
        {!isCollapsed && <span>+ New Chat</span>}
      </button>

      {/* Primary Navigation Sections */}
      {!isCollapsed ? (
        <div className="my-3 space-y-1 border-b border-zinc-800/80 pb-3">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? "bg-zinc-800/90 text-white font-semibold shadow-xs"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-400" : "text-zinc-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Expandable Create Suite */}
          <div className="pt-1">
            <div className="flex items-center justify-between px-2 py-1">
              <Link
                href="/create"
                className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                  pathname?.startsWith("/create") ? "text-blue-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Create Studio</span>
              </Link>
              <button
                type="button"
                onClick={() => setCreateExpanded(!createExpanded)}
                className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
                title={createExpanded ? "Collapse Create Studio" : "Expand Create Studio"}
              >
                {createExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {createExpanded && (
              <div className="pl-4 pr-1 space-y-0.5 mt-1 border-l border-zinc-800/80 ml-3">
                {createWorkspaces.map((ws) => {
                  const WsIcon = ws.icon;
                  const wsActive = pathname === ws.href;
                  return (
                    <Link
                      key={ws.href}
                      href={ws.href}
                      prefetch={true}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                        wsActive
                          ? "bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20"
                          : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <WsIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{ws.label}</span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
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
        <div className="my-3 flex flex-col items-center gap-2 border-b border-zinc-800/80 pb-3">
          <Link
            href="/chat"
            className={`p-2 rounded-xl text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all ${
              pathname === "/chat" ? "bg-blue-600/20 text-blue-400" : ""
            }`}
            title="Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </Link>
          <Link
            href="/create"
            className={`p-2 rounded-xl text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all ${
              pathname?.startsWith("/create") ? "bg-blue-600/20 text-blue-400" : ""
            }`}
            title="Create Studios"
          >
            <Sparkles className="w-4 h-4" />
          </Link>
          <Link
            href="/projects"
            className={`p-2 rounded-xl text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all ${
              pathname === "/projects" ? "bg-blue-600/20 text-blue-400" : ""
            }`}
            title="Projects"
          >
            <FolderKanban className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Search Input Filter */}
      {!isCollapsed && (
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900/80 border border-zinc-800/80 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      {/* Conversation History List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
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
          <div className="flex flex-col items-center gap-2 pt-2">
            {filteredConvs.slice(0, 8).map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelectConversation(c.id);
                  if (pathname !== "/chat") router.push("/chat");
                }}
                className={`p-2.5 rounded-xl transition-all ${
                  activeId === c.id
                    ? "bg-blue-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
                title={c.title}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AI Memory & Training Trigger Button */}
      {!isCollapsed && (
        <div className="py-2 border-t border-zinc-800/80">
          <button
            onClick={onOpenMemoryModal}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-zinc-900 to-indigo-950/40 hover:from-blue-900/50 hover:to-indigo-900/50 border border-blue-500/20 text-zinc-200 text-xs font-semibold shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>AI Memory & Training</span>
            </div>
            {memoryCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 font-bold">
                {memoryCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Settings & User Profile Footer */}
      <div className="pt-2 border-t border-zinc-800/80 space-y-1">
        {!isCollapsed && (
          <Link
            href="/settings"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              pathname === "/settings"
                ? "bg-zinc-800 text-white font-semibold"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <SettingsIcon className="w-4 h-4 text-zinc-400" />
            <span>Settings & AI Providers</span>
          </Link>
        )}

        {user ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/90 border border-zinc-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
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
                className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
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
              className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors text-xs font-medium"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-400" />
              <span>Sign In / Register</span>
            </button>
          )
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:block h-screen sticky top-0">{content}</aside>
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-10 h-full">{content}</div>
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
    <div className="space-y-1">
      <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{title}</p>
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
      className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all text-xs font-medium ${
        active
          ? "bg-zinc-800/90 text-white border border-zinc-700/60 shadow-xs"
          : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200"
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        {item.pinned ? (
          <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        ) : (
          <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${active ? "text-blue-400" : "text-zinc-500"}`} />
        )}

        {isEditing ? (
          <form onSubmit={handleSaveRename} onClick={(e) => e.stopPropagation()} className="flex-1">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveRename}
              autoFocus
              className="w-full px-1.5 py-0.5 text-xs bg-black border border-blue-500 rounded text-white focus:outline-none"
            />
          </form>
        ) : (
          <span className="truncate">{item.title}</span>
        )}
      </div>

      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700/60 rounded text-zinc-400 hover:text-white transition-opacity"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-6 w-36 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl z-50 p-1 space-y-0.5 animate-fadeIn">
            {onTogglePin && (
              <button
                onClick={() => {
                  onTogglePin(item.id, !item.pinned);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors"
              >
                <Pin className="w-3 h-3 text-amber-400" />
                <span>{item.pinned ? "Unpin" : "Pin"}</span>
              </button>
            )}

            {onRename && (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors"
              >
                <Edit2 className="w-3 h-3 text-blue-400" />
                <span>Rename</span>
              </button>
            )}

            {onToggleArchive && (
              <button
                onClick={() => {
                  onToggleArchive(item.id, !item.archived);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors"
              >
                <Archive className="w-3 h-3 text-purple-400" />
                <span>{item.archived ? "Unarchive" : "Archive"}</span>
              </button>
            )}

            <button
              onClick={() => {
                if (confirm(`Delete conversation "${item.title}"?`)) {
                  onDelete();
                }
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
