"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FolderKanban,
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  Image as ImageIcon,
  Video,
  Music,
  Box,
  FileText,
  Code2,
  Layers,
  Sparkles,
  ExternalLink,
  Upload,
} from "lucide-react";
import api from "@/lib/axios";
import { AssetItem, fetchProjectAssets, deleteAsset, uploadAsset } from "@/services/assets";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function ProjectDetailPage() {
  const ready = useAuthGuard();
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (ready && projectId) {
      loadProjectDetails();
    }
  }, [ready, projectId]);

  const loadProjectDetails = async () => {
    setLoading(true);
    try {
      const projRes = await api.get(`/projects/${projectId}`);
      setProject(projRes.data);

      const assetsList = await fetchProjectAssets(projectId);
      setAssets(assetsList);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        router.replace("/projects");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      const type = file.type.startsWith("image/")
        ? "IMAGE"
        : file.type.startsWith("video/")
        ? "VIDEO"
        : file.type.startsWith("audio/")
        ? "AUDIO"
        : "DOCUMENT";

      const created = await uploadAsset(projectId, file.name, type, file);
      if (created) {
        setAssets((prev) => [created, ...prev]);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (confirm("Are you sure you want to delete this asset from project storage?")) {
      const ok = await deleteAsset(assetId);
      if (ok) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
      }
    }
  };

  const filteredAssets = activeTab === "ALL" ? assets : assets.filter((a) => a.type === activeTab);

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "IMAGE": return ImageIcon;
      case "VIDEO": return Video;
      case "AUDIO": return Music;
      case "MODEL_3D": return Box;
      case "CODE": return Code2;
      default: return FileText;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 sm:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-blue-400">
                  Project Workspace
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-xs text-zinc-400">{assets.length} Total Assets</span>
              </div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-0.5">
                <FolderKanban className="w-6 h-6 text-blue-400" />
                <span>{project?.name || "Loading Project..."}</span>
              </h1>
              {project?.description && (
                <p className="text-xs text-zinc-400 mt-1">{project.description}</p>
              )}
            </div>
          </div>

          {/* Quick launch & Upload */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 py-2 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>{uploading ? "Uploading..." : "Upload Asset"}</span>
              <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>
            <Link
              href="/create"
              className="flex items-center gap-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open Studio</span>
            </Link>
          </div>
        </div>

        {/* Asset Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-900">
          {["ALL", "IMAGE", "VIDEO", "AUDIO", "MODEL_3D", "DOCUMENT", "CODE"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-xs"
                  : "bg-zinc-950 text-zinc-400 border border-zinc-800/80 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Assets Grid */}
        {filteredAssets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAssets.map((asset) => {
              const Icon = getAssetIcon(asset.type);
              return (
                <div
                  key={asset.id}
                  className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between group space-y-3"
                >
                  <div className="space-y-3">
                    {/* Media preview thumbnail */}
                    {asset.type === "IMAGE" && asset.url ? (
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 relative">
                        <img
                          src={asset.url}
                          alt={asset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video w-full rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-500">
                        <Icon className="w-8 h-8 text-blue-400/80" />
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 block mb-0.5">
                        {asset.type}
                      </span>
                      <h3 className="text-xs font-bold text-zinc-200 truncate" title={asset.name}>
                        {asset.name}
                      </h3>
                      {asset.prompt && (
                        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 italic">
                          "{asset.prompt}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-500">
                    <span className="text-[10px] font-mono">
                      {asset.size_bytes > 0 ? `${(asset.size_bytes / 1024).toFixed(0)} KB` : asset.provider}
                    </span>
                    <div className="flex items-center gap-1">
                      {asset.url && (
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                          title="Download Asset"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
                        title="Delete Asset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 p-8 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-200">No Assets in This Project Yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Upload existing files or launch an AI Creation Studio to generate images, videos, 3D meshes, and documents.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
