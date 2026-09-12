"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, AlertCircle, Zap, Eye, EyeOff } from "lucide-react";
import { login, isAuthenticated } from "@/services/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // If already logged in, go straight to chat — no login screen needed
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/chat");
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setError("");
      await login(email, password);
      router.replace("/chat");
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          "Failed to sign in. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      setError("");
      await login("demo@yash.ai", "demo1234");
      router.replace("/chat");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Demo login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show nothing while checking stored auth (avoids flicker)
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-blue-500/5">
          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-4">
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Welcome back
            </h1>
            <p className="text-xs text-zinc-400 mt-1.5">
              Sign in to your Yash.AI account
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Demo Login */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full mb-6 p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-purple-950/60 border border-blue-500/30 hover:border-blue-400/60 hover:from-blue-950/80 text-white text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-300" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-zinc-100 group-hover:text-blue-200 transition-colors">
                  One-Click Demo Login
                </span>
                <span className="text-[10px] text-zinc-400 font-normal">
                  Try Yash.AI instantly — no setup needed
                </span>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0">
              Instant
            </span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center mb-5">
            <div className="flex-grow border-t border-zinc-800" />
            <span className="flex-shrink mx-4 text-[10px] text-zinc-500 uppercase tracking-widest">
              or sign in with email
            </span>
            <div className="flex-grow border-t border-zinc-800" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:opacity-50 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <span>{loading ? "Signing in..." : "Sign In"}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
            <Link
              href="/chat"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              ← Continue as Guest
            </Link>
            <div>
              No account?{" "}
              <Link
                href="/register"
                className="text-blue-400 hover:text-blue-300 hover:underline font-semibold transition-colors"
              >
                Create one
              </Link>
            </div>
          </div>
        </div>

        {/* Stay signed in note */}
        <p className="text-center text-[11px] text-zinc-600 mt-4">
          You stay signed in until you manually sign out.
        </p>
      </div>
    </div>
  );
}
