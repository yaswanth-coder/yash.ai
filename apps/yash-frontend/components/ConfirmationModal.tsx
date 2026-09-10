"use client";

import React, { useState } from "react";
import { AlertTriangle, ShieldCheck, X, Check, Loader2 } from "lucide-react";
import api from "@/lib/axios";

interface ConfirmationModalProps {
  isOpen: boolean;
  ticketId: string;
  actionSummary: string;
  params: Record<string, any>;
  onClose: () => void;
  onConfirmed: (ticketId: string) => void;
}

export default function ConfirmationModal({
  isOpen,
  ticketId,
  actionSummary,
  params,
  onClose,
  onConfirmed,
}: ConfirmationModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/tools/confirm", {
        ticket_id: ticketId,
        approved: true,
      });
      onConfirmed(ticketId);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to confirm action. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      await api.post("/tools/confirm", {
        ticket_id: ticketId,
        approved: false,
      });
    } catch (err) {
      // Ignore rejection error
    } finally {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Security Approval Required</h2>
              <p className="text-xs text-zinc-400">Human-in-the-loop verification</p>
            </div>
          </div>
          <button
            onClick={handleReject}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action details */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2">
          <p className="text-xs font-semibold text-zinc-300">Requested Operation:</p>
          <p className="text-sm font-mono text-amber-200 break-words">{actionSummary}</p>

          {params && Object.keys(params).length > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-800/60">
              <p className="text-[11px] font-semibold text-zinc-400 mb-1">Parameters:</p>
              <pre className="text-[10px] text-zinc-300 font-mono bg-zinc-950 p-2 rounded-lg overflow-x-auto max-h-24">
                {JSON.stringify(params, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Warning banner */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          <ShieldCheck className="w-4 h-4 text-red-400 shrink-0" />
          <span>This action modifies or deletes persistent assets. Ensure you intend to proceed.</span>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/50">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleReject}
            disabled={submitting}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl shadow-lg shadow-red-600/25 transition-all flex items-center gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Approving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Approve & Execute</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
