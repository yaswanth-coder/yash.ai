"use client";

import React, { useMemo } from "react";
import { Plus, MessageSquare, Trash2, Sparkles, LogIn, LogOut, User as UserIcon, X } from "lucide-react";
import { ConversationItem } from "@/services/conversations";
import { User } from "@/services/auth";

interface SidebarProps {
  conversations: ConversationItem[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  user: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  user,
  onOpenLogin,
  onLogout,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  // Group conversations into Today, Yesterday, Older
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    const groups: { today: ConversationItem[]; yesterday: ConversationItem[]; older: ConversationItem[] } = {
      today: [],
      yesterday: [],
      older: [],
    };

    conversations.forEach((c) => {
      const time = new Date(c.updated_at || c.created_at).getTime();
      if (time >= today) {
        groups.today.push(c);
      } else if (time >= yesterday) {
        groups.yesterday.push(c);
      } else {
        groups.older.push(c);
      }
    });

    return groups;
  }, [conversations]);

  const content = (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 p-4 w-72 shrink-0 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent tracking-tight">
            Yash.AI
          </h1>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <button
        onClick={() => {
          onNewChat();
          if (onCloseMobile) onCloseMobile();
        }}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 shadow-lg shadow-blue-600/20 transition-all duration-200 mb-6 text-sm"
      >
        <Plus className="w-4 h-4" />
        <span>+ New Chat</span>
      </button>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500">
            No previous conversations.
          </div>
        ) : (
          <>
            {/* Today */}
            {groupedConversations.today.length > 0 && (
              <div>
                <h2 className="px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Today
                </h2>
                <div className="space-y-1">
                  {groupedConversations.today.map((c) => (
                    <ConversationRow
                      key={c.id}
                      item={c}
                      active={activeId === c.id}
                      onSelect={() => {
                        onSelectConversation(c.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      onDelete={() => onDeleteConversation(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Yesterday */}
            {groupedConversations.yesterday.length > 0 && (
              <div>
                <h2 className="px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Yesterday
                </h2>
                <div className="space-y-1">
                  {groupedConversations.yesterday.map((c) => (
                    <ConversationRow
                      key={c.id}
                      item={c}
                      active={activeId === c.id}
                      onSelect={() => {
                        onSelectConversation(c.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      onDelete={() => onDeleteConversation(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Older */}
            {groupedConversations.older.length > 0 && (
              <div>
                <h2 className="px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Previous 30 Days
                </h2>
                <div className="space-y-1">
                  {groupedConversations.older.map((c) => (
                    <ConversationRow
                      key={c.id}
                      item={c}
                      active={activeId === c.id}
                      onSelect={() => {
                        onSelectConversation(c.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      onDelete={() => onDeleteConversation(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Profile / Auth State */}
      <div className="pt-4 mt-auto border-t border-zinc-800/80">
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                {user.email[0].toUpperCase()}
              </div>
              <div className="overflow-hidden text-xs">
                <p className="font-semibold text-zinc-200 truncate">{user.full_name || "User"}</p>
                <p className="text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors text-xs font-medium"
          >
            <LogIn className="w-4 h-4 text-blue-400" />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block h-screen sticky top-0">{content}</aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}

function ConversationRow({
  item,
  active,
  onSelect,
  onDelete,
}: {
  item: ConversationItem;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-150 text-xs font-medium ${
        active
          ? "bg-zinc-800/90 text-white border border-zinc-700/60 shadow-xs"
          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${active ? "text-blue-400" : "text-zinc-500"}`} />
        <span className="truncate">{item.title}</span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700/60 rounded text-zinc-500 hover:text-red-400 transition-opacity"
        title="Delete conversation"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
