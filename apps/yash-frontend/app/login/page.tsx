"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, AlertCircle, Zap, UserCheck } from "lucide-react";
import { login } from "@/services/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setError("");
      await login(email, password);
      router.push("/chat");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to sign in. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      setError("");
      setEmail("demo@yash.ai");
      setPassword("demo1234");
      await login("demo@yash.ai", "demo1234");
      router.push("/chat");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to sign in with demo user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-blue-500/5">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Welcome back to Yash.AI
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Sign in to access your personal AI assistant</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Demo Sign-In */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full mb-6 p-3 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-purple-950/60 border border-blue-500/30 hover:border-blue-400/50 text-white text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-400">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <div className="text-left">
              <span className="block font-bold text-zinc-100 group-hover:text-blue-300 transition-colors">
                One-Click Demo Account
              </span>
              <span className="text-[10px] text-zinc-400 font-normal">
                Includes chat history & personalized memory
              </span>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
            Instant Login
          </span>
        </button>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-zinc-800"></div>
          <span className="flex-shrink mx-4 text-[10px] text-zinc-500 uppercase tracking-widest">
            or sign in with email
          </span>
          <div className="flex-grow border-t border-zinc-800"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 mt-6 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? "Signing in..." : "Sign In"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <Link href="/chat" className="text-zinc-400 hover:text-white transition-colors">
            ← Continue as Guest
          </Link>
          <div>
            Don't have an account?{" "}
            <Link href="/register" className="text-blue-400 hover:underline font-semibold">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
