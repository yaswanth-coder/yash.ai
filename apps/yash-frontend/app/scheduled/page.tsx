"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Plus, Trash2, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  ScheduledTaskItem,
  fetchScheduledTasks,
  createScheduledTask,
  deleteScheduledTask,
} from "@/services/scheduled";

export default function ScheduledPage() {
  const ready = useAuthGuard();
  const [tasks, setTasks] = useState<ScheduledTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [schedule, setSchedule] = useState("daily");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (ready) loadTasks();
  }, [ready]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const list = await fetchScheduledTasks();
      setTasks(list);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !prompt.trim()) return;

    setCreating(true);
    try {
      const created = await createScheduledTask(title.trim(), prompt.trim(), schedule);
      if (created) {
        setTasks((prev) => [created, ...prev]);
        setTitle("");
        setPrompt("");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteScheduledTask(id);
    if (success) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 sm:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
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
                <Clock className="w-5 h-5 text-amber-400" />
                <span>Scheduled AI Routines</span>
              </h1>
              <p className="text-xs text-zinc-400">
                Automate recurring AI tasks, daily briefings, research digests, and study reminders.
              </p>
            </div>
          </div>
        </div>

        {/* Create Task Form */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Schedule New AI Task</span>
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task Title (e.g. Daily AI News Summary)"
                className="px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="AI Prompt to execute"
                className="px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:border-amber-500"
              >
                <option value="daily">Every Morning (Daily)</option>
                <option value="hourly">Every Hour</option>
                <option value="weekly">Every Week</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creating || !title.trim() || !prompt.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-600/20 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{creating ? "Scheduling..." : "Schedule Task"}</span>
            </button>
          </form>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-300">Active Routines ({tasks.length})</h2>
          {loading ? (
            <div className="text-xs text-zinc-500">Loading routines...</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-center space-y-2">
              <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">No scheduled tasks yet.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-zinc-100">{task.title}</h3>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {task.schedule}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">Prompt: "{task.prompt}"</p>
                </div>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
