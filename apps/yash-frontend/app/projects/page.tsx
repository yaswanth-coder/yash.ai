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

  return (
    <div className="min-h-screen bg-black text-white p-6 sm:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-blue-400" />
                <span>Projects</span>
              </h1>
              <p className="text-xs text-zinc-400">
                Organize conversations, documents, and specialized instructions into dedicated workspaces.
              </p>
            </div>
          </div>
        </div>

        {/* Create Project Form */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Create New Project</span>
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project Name (e.g. Yash.AI Architecture)"
                className="px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description / Context (optional)"
                className="px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{creating ? "Creating..." : "Create Project"}</span>
            </button>
          </form>
        </div>

        {/* Project List */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-zinc-300">Your Projects ({projects.length})</h2>
          {loading ? (
            <div className="text-xs text-zinc-500">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="p-10 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-2">
              <FolderKanban className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">No projects created yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((p) => (
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
                        className="flex items-center gap-1 text-zinc-300 hover:text-white font-medium px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
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
          )}
        </div>
      </div>
    </div>
  );
}
