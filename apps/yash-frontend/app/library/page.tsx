"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  Library as LibraryIcon,
  Upload,
  FileText,
  Trash2,
  Search,
  ArrowLeft,
  FileCode,
  Image as ImageIcon,
} from "lucide-react";
import api from "@/lib/axios";

interface FileItem {
  id: string;
  filename: string;
  size: number;
  type: string;
  created_at: string;
}

export default function LibraryPage() {
  const [files, setFiles] = useState<FileItem[]>([
    { id: "1", filename: "architecture_specs.pdf", size: 1024 * 340, type: "pdf", created_at: new Date().toISOString() },
    { id: "2", filename: "system_prompt_v2.txt", size: 1024 * 12, type: "txt", created_at: new Date().toISOString() },
  ]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFiles((prev) => [
        {
          id: Date.now().toString(),
          filename: res.data.filename,
          size: file.size,
          type: file.name.split(".").pop() || "file",
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err) {
      alert("Failed to upload file to Library.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const filtered = files.filter((f) => f.filename.toLowerCase().includes(search.toLowerCase()));

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
                <LibraryIcon className="w-5 h-5 text-purple-400" />
                <span>Document & Knowledge Library</span>
              </h1>
              <p className="text-xs text-zinc-400">
                Uploaded PDFs, code files, and documents indexed for AI retrieval and RAG.
              </p>
            </div>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.csv,.json"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? "Uploading..." : "Upload Document"}</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by name..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Files Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((file) => (
            <div
              key={file.id}
              className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400 shrink-0">
                  {file.type === "pdf" ? (
                    <FileText className="w-5 h-5 text-red-400" />
                  ) : file.type === "txt" ? (
                    <FileText className="w-5 h-5 text-blue-400" />
                  ) : (
                    <FileCode className="w-5 h-5 text-purple-400" />
                  )}
                </div>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <h3 className="text-xs font-bold text-zinc-100 truncate">{file.filename}</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB • {file.type.toUpperCase()}
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Indexed
                </span>
                <span>{new Date(file.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
