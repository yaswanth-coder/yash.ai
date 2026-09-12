"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  Sparkles,
  FolderKanban,
  Library as LibraryIcon,
  Settings as SettingsIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Create", href: "/create", icon: Sparkles },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Files", href: "/library", icon: LibraryIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40"
      style={{
        background: "rgba(7, 7, 18, 0.88)",
        backdropFilter: "blur(32px) saturate(190%)",
        WebkitBackdropFilter: "blur(32px) saturate(190%)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Top specular highlight line */}
      <div
        className="absolute top-0 inset-x-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 50%, transparent)",
        }}
      />

      <div className="flex items-center justify-around px-2 pt-1.5 pb-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/chat"
              ? pathname === "/chat"
              : pathname === item.href || (item.href !== "/chat" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onMouseEnter={() => router.prefetch(item.href)}
              onTouchStart={() => router.prefetch(item.href)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 touch-target ${
                isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {/* Active glow indicator */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-2xl -z-10"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(124,92,252,0.14))",
                    border: "1px solid rgba(147,197,253,0.22)",
                    boxShadow: "0 2px 12px rgba(59,130,246,0.25)",
                  }}
                />
              )}

              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? "text-blue-400 scale-105" : "text-zinc-400"
                }`}
              />
              <span
                className={`text-[10px] mt-1 font-medium tracking-tight ${
                  isActive ? "text-white font-semibold" : "text-zinc-400"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
