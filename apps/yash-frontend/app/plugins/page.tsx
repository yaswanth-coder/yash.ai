"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Blocks,
  Globe,
  Folder,
  HardDrive,
  Calendar,
  MessageSquare,
  BookOpen,
  Search,
  Settings,
  ShieldCheck,
  Check,
  X,
  Loader2,
  Lock,
  ExternalLink,
  Filter,
  Sparkles,
  Trash2,
  Key,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import api from "@/lib/axios";
import MobileNav from "@/components/MobileNav";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface PluginTool {
  id: string;
  name: string;
  description: string;
  permission: string;
  permission_tier: string;
  requires_confirmation: boolean;
}

interface PluginItem {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  category: string;
  permissions: string[];
  granted_permissions?: string[];
  auth_type: string;
  config_schema?: Record<string, any>;
  documentation_url?: string;
  is_first_party: boolean;
  is_installed: boolean;
  is_enabled: boolean;
  status: string; // "CONNECTED", "AUTH_REQUIRED", "AVAILABLE", "DISABLED"
  tools_count?: number;
}

const CATEGORIES = [
  "All",
  "Productivity",
  "Developer Tools",
  "Communication",
  "Storage",
  "Research",
  "Finance",
  "Education",
  "Automation",
  "Data",
  "AI",
  "Business",
];

const ICON_MAP: Record<string, any> = {
  Globe: Globe,
  Folder: Folder,
  Github: GithubIcon,
  HardDrive: HardDrive,
  Calendar: Calendar,
  MessageSquare: MessageSquare,
  BookOpen: BookOpen,
  Blocks: Blocks,
};

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"marketplace" | "installed" | "custom">("marketplace");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modals state
  const [selectedPlugin, setSelectedPlugin] = useState<PluginItem | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Form input state for credentials
  const [credValue, setCredValue] = useState("");
  const [savingCred, setSavingCred] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchPlugins = async () => {
    try {
      setLoading(true);
      const res = await api.get("/plugins");
      setPlugins(res.data);
    } catch (err) {
      console.error("Failed to load plugins:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.get("/plugins/audit/logs");
      setAuditLogs(res.data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  useEffect(() => {
    if (activeTab === "custom") {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const handleInstall = async (pluginId: string) => {
    try {
      setActionError(null);
      await api.post(`/plugins/${pluginId}/install`);
      setActionSuccess(`Plugin installed successfully.`);
      await fetchPlugins();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || "Failed to install plugin.");
    }
  };

  const handleToggle = async (plugin: PluginItem) => {
    try {
      setActionError(null);
      const endpoint = plugin.is_enabled ? `/plugins/${plugin.id}/disable` : `/plugins/${plugin.id}/enable`;
      await api.post(endpoint);
      setPlugins((prev) =>
        prev.map((p) => (p.id === plugin.id ? { ...p, is_enabled: !p.is_enabled } : p))
      );
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || "Failed to update plugin state.");
    }
  };

  const handleUninstall = async (pluginId: string) => {
    if (!confirm("Are you sure you want to uninstall this plugin? All saved credentials will be securely wiped.")) {
      return;
    }
    try {
      setActionError(null);
      await api.delete(`/plugins/${pluginId}`);
      setActionSuccess(`Plugin uninstalled.`);
      await fetchPlugins();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || "Failed to uninstall plugin.");
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedPlugin) return;
    try {
      setSavingCred(true);
      setActionError(null);
      const credPayload: Record<string, string> = {};
      if (selectedPlugin.id === "github") credPayload.token = credValue;
      else if (selectedPlugin.id === "slack") credPayload.token = credValue;
      else if (selectedPlugin.id === "notion") credPayload.token = credValue;
      else credPayload.api_key = credValue;

      await api.post(`/plugins/${selectedPlugin.id}/configure`, {
        credentials: credPayload,
      });

      setActionSuccess(`Credentials for ${selectedPlugin.name} securely saved and encrypted.`);
      setConfigModalOpen(false);
      setCredValue("");
      await fetchPlugins();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || "Failed to save configuration.");
    } finally {
      setSavingCred(false);
    }
  };

  // Filter plugins
  const filteredPlugins = useMemo(() => {
    return plugins.filter((p) => {
      // Tab filter
      if (activeTab === "installed" && !p.is_installed) return false;
      // Category filter
      if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [plugins, activeTab, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-black text-white p-3.5 sm:p-6 md:p-10 font-sans pb-24 md:pb-12">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 sm:pb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0"
              title="Return to Chat"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center text-black">
                  <Blocks className="w-4 h-4" />
                </div>
                <span>Yash.AI Plugins & Tools</span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Extend Yash.AI with verified external tools, secure credentials, and human-in-the-loop controls.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPlugins}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5 transition-colors"
              title="Refresh Registry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-2 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab("marketplace")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "marketplace"
                  ? "bg-zinc-800 text-white shadow-md shadow-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              Marketplace
            </button>
            <button
              onClick={() => setActiveTab("installed")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "installed"
                  ? "bg-zinc-800 text-white shadow-md shadow-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <span>Installed</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-900 text-zinc-300">
                {plugins.filter((p) => p.is_installed).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("custom")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "custom"
                  ? "bg-zinc-800 text-white shadow-md shadow-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <span>Activity & Audit</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[200px] sm:min-w-[280px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plugins and tools..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
        </div>

        {/* Category Pill Filters (Marketplace & Installed only) */}
        {activeTab !== "custom" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-semibold"
                    : "bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Tab 1 & 2: Plugin Cards Grid */}
        {activeTab !== "custom" && (
          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-zinc-500 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                <p className="text-xs">Loading plugins registry...</p>
              </div>
            ) : filteredPlugins.length === 0 ? (
              <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-800 p-8 space-y-3">
                <Blocks className="w-8 h-8 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-semibold text-zinc-300">No plugins found</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  {activeTab === "installed"
                    ? "You haven't installed any plugins in this category yet. Check the Marketplace tab to discover tools!"
                    : "No plugins matched your search criteria. Try a different query or category."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlugins.map((plugin) => {
                  const Icon = ICON_MAP[plugin.icon] || Blocks;
                  return (
                    <div
                      key={plugin.id}
                      className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between space-y-4 relative group shadow-lg shadow-black/40"
                    >
                      {/* Top row: Icon + Badges + Toggle */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-inner">
                            <Icon className="w-5 h-5" />
                          </div>

                          <div className="flex items-center gap-2">
                            {plugin.status === "CONNECTED" && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Connected
                              </span>
                            )}
                            {plugin.status === "AUTH_REQUIRED" && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                <Key className="w-3 h-3" />
                                Auth Required
                              </span>
                            )}

                            {plugin.is_installed && (
                              <button
                                onClick={() => handleToggle(plugin)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                  plugin.is_enabled ? "bg-emerald-600" : "bg-zinc-800"
                                }`}
                                title={plugin.is_enabled ? "Disable plugin" : "Enable plugin"}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    plugin.is_enabled ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                              {plugin.name}
                            </h3>
                            <span className="text-[10px] font-medium text-zinc-500">v{plugin.version}</span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                            {plugin.description}
                          </p>
                        </div>
                      </div>

                      {/* Permissions tags */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {plugin.permissions.slice(0, 2).map((perm) => (
                            <span
                              key={perm}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800/80 text-zinc-400"
                            >
                              {perm}
                            </span>
                          ))}
                          {plugin.permissions.length > 2 && (
                            <span className="text-[10px] text-zinc-500">
                              +{plugin.permissions.length - 2} more
                            </span>
                          )}
                        </div>

                        {/* Footer action buttons */}
                        <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-xs">
                          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                            {plugin.category}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {plugin.is_installed ? (
                              <>
                                {plugin.auth_type !== "none" && (
                                  <button
                                    onClick={() => {
                                      setSelectedPlugin(plugin);
                                      setConfigModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                    title="Configure Credentials"
                                  >
                                    <Settings className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setSelectedPlugin(plugin);
                                    setPermissionsModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                  title="View Permissions"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </button>

                                {!["web_search", "files"].includes(plugin.id) && (
                                  <button
                                    onClick={() => handleUninstall(plugin.id)}
                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                                    title="Uninstall Plugin"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => handleInstall(plugin.id)}
                                className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-md shadow-emerald-950"
                              >
                                <span>Install</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Activity & Audit Logs */}
        {activeTab === "custom" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Tool Execution Audit Trail</h3>
                <p className="text-xs text-zinc-400">
                  Every tool call is strictly validated, rate limited, and recorded for security verification.
                </p>
              </div>
              <button
                onClick={fetchAuditLogs}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingLogs ? (
              <div className="py-20 text-center text-zinc-500 text-xs">Loading audit records...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs">
                No tool calls recorded for your account yet. Ask Yash.AI to perform a search or file inspection in chat to see real-time logs.
              </div>
            ) : (
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                <div className="divide-y divide-zinc-900 text-xs">
                  {auditLogs.map((log) => (
                    <div key={log._id || log.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            log.status === "COMPLETED"
                              ? "bg-emerald-400"
                              : log.status === "CONFIRMATION_REQUIRED"
                              ? "bg-amber-400"
                              : "bg-red-400"
                          }`}
                        />
                        <div>
                          <p className="font-mono font-bold text-zinc-200">{log.tool_id}</p>
                          <p className="text-[10px] text-zinc-500">{new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-zinc-500 font-mono">{log.duration_ms}ms</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === "COMPLETED"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : log.status === "CONFIRMATION_REQUIRED"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                              : "bg-red-500/15 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Configure Credentials Modal */}
        {configModalOpen && selectedPlugin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">Configure {selectedPlugin.name}</h3>
                    <p className="text-[11px] text-zinc-500">Encrypted credential storage</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfigModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] leading-relaxed">
                    Credentials are encrypted with authenticated Fernet AES keys. Plaintext secrets are never stored or exposed to LLMs.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    {selectedPlugin.id === "github" && "GitHub Personal Access Token"}
                    {selectedPlugin.id === "slack" && "Slack Bot User Token (xoxb-...)"}
                    {selectedPlugin.id === "notion" && "Notion Integration Secret"}
                    {!["github", "slack", "notion"].includes(selectedPlugin.id) && "API Key or Access Token"}
                  </label>
                  <input
                    type="password"
                    value={credValue}
                    onChange={(e) => setCredValue(e.target.value)}
                    placeholder="Paste secret token here..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {selectedPlugin.documentation_url && (
                  <a
                    href={selectedPlugin.documentation_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>View official documentation on creating tokens</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfigModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={savingCred || !credValue.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  {savingCred ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save & Encrypt</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permissions Inspector Modal */}
        {permissionsModalOpen && selectedPlugin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">{selectedPlugin.name} Permissions</h3>
                    <p className="text-[11px] text-zinc-500">Declared security scopes</p>
                  </div>
                </div>
                <button
                  onClick={() => setPermissionsModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <p className="text-zinc-400 text-[11px]">
                  This plugin requests the following granular permissions. Yash.AI enforces separate READ and WRITE tiers with confirmation checkpoints:
                </p>

                <div className="space-y-2">
                  {selectedPlugin.permissions.map((perm) => {
                    const isWrite = perm.includes("write") || perm.includes("send") || perm.includes("delete");
                    return (
                      <div
                        key={perm}
                        className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between"
                      >
                        <span className="font-mono text-zinc-200">{perm}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isWrite
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {isWrite ? "WRITE (Requires Confirmation)" : "SAFE READ"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setPermissionsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
