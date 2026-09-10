"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Plus,
  Trash2,
  MessageSquare,
  FileText,
  Sparkles,
  ArrowLeft,
  Search,
  ArrowUpDown,
  X,
} from "lucide-react";
import { ProjectItem, fetchProjects, createProject, deleteProject } from "@/services/projects";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function ProjectsPage() {
  const ready = useAuthGuard();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (ready) loadProjects();
  }, [ready]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const list = await fetchProjects();
      setProjects(list);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const created = await createProject(name.trim(), description.trim());
      if (created) {
        setProjects((prev) => [created, ...prev]);
        setName("");
        setDescription("");
        setIsModalOpen(false);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      const success = await deleteProject(id);
      if (success) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      }
    }
  };

  const filteredProjects = projects
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortAsc) return a.name.localeCompare(b.name);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  return (
    <div className="min-h-screen bg-black text-white p-6 sm:p-12 font-sans flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Header matching Claude reference */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-normal text-zinc-100 font-serif">
              Projects
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {showSearch ? (
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-2.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter projects..."
                  autoFocus
                  className="pl-8 pr-7 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 w-44 sm:w-60"
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                  }}
                  className="absolute right-2 text-zinc-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                title="Search projects"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setSortAsc((prev) => !prev)}
              className={`p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors ${
                sortAsc ? "text-blue-400" : ""
              }`}
              title="Toggle sort order"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-1.5 bg-white text-black hover:bg-zinc-200 text-xs font-semibold rounded-full shadow-xs transition-colors cursor-pointer"
            >
              New project
            </button>
          </div>
        </div>

        {/* Create Modal Dialog */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Create New Project</span>
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Yash.AI Architecture"
                    autoFocus
                    className="w-full px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Description / Context (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide goals, specialized instructions, or topics for this workspace..."
                    className="w-full px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !name.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{creating ? "Creating..." : "Create Project"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content Body */}
        {loading ? (
          <div className="text-center py-20 text-xs text-zinc-500">Loading projects...</div>
        ) : projects.length === 0 ? (
          /* Empty State matching Claude Image 2 */
          <div className="py-24 sm:py-32 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto animate-in fade-in duration-200">
            {/* 4-Tile Grid Icon with Hand Cursor */}
            <div className="w-16 h-16 relative flex items-center justify-center text-zinc-400 mb-2">
              <svg
                className="w-14 h-14 text-zinc-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z" />
                <path d="M17 12v3" />
                <path d="M15 14h4" />
              </svg>
            </div>

            <h2 className="text-base font-medium text-zinc-200">Looking to start a project?</h2>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              Upload materials, set custom instructions, and organize conversations in one space.
            </p>

            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              New project
            </button>
          </div>
        ) : (
          /* Project List Grid */
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-zinc-400">Your Workspaces ({filteredProjects.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProjects.map((p) => (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100">{p.name}</h3>
                      {p.description && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{p.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-zinc-400" />
                      <span>{p.files?.length || 0} files</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/projects/${p.id}`}
                        className="flex items-center gap-1 text-zinc-300 hover:text-white font-medium px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                      >
                        <FolderKanban className="w-3 h-3 text-blue-400" />
                        <span>Assets & Studio</span>
                      </Link>
                      <Link
                        href={`/chat?project=${p.id}`}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold px-2 py-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Chat →</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
