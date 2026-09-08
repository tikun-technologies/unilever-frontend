"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Copy, Link2, Share2, Trash2, X } from "lucide-react"
import { buildAnalyticsShareUrl } from "@/lib/analyticsShare"

type DialogMode = "create" | "manage" | "confirm-revoke"

interface AnalyticsShareDialogProps {
  isOpen: boolean
  token: string | null
  isBusy?: boolean
  error?: string | null
  onClose: () => void
  onCreate: () => void | Promise<void>
  onRevoke: () => void | Promise<void>
}

export function AnalyticsShareDialog({
  isOpen,
  token,
  isBusy = false,
  error = null,
  onClose,
  onCreate,
  onRevoke,
}: AnalyticsShareDialogProps) {
  const [mode, setMode] = useState<DialogMode>(token ? "manage" : "create")
  const [copied, setCopied] = useState(false)
  const shareUrl = token ? buildAnalyticsShareUrl(token) : ""

  useEffect(() => {
    if (!isOpen) return
    setMode(token ? "manage" : "create")
    setCopied(false)
  }, [isOpen, token])

  useEffect(() => {
    if (!isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  const copyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt("Copy this shared analytics link:", shareUrl)
    }
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-black/40"
            onClick={isBusy ? undefined : onClose}
            aria-label="Close share dialog"
            disabled={isBusy}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-share-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2674BA]/10 text-[#2674BA]">
                  <Share2 className="h-4 w-4" />
                </span>
                <div>
                  <h2 id="analytics-share-title" className="text-base font-bold text-gray-900">
                    {mode === "confirm-revoke" ? "Revoke shared access" : "Share analytics"}
                  </h2>
                  <p className="text-xs text-gray-500">Anyone with the link can view this live dashboard.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="cursor-pointer rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {mode === "confirm-revoke" ? (
                <>
                  <p className="text-sm leading-relaxed text-gray-700">
                    Are you sure? All access shared with someone will be reverted. Anyone using this
                    link will lose access immediately — including mid-export.
                  </p>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setMode("manage")}
                      disabled={isBusy}
                      className="cursor-pointer rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Keep sharing
                    </button>
                    <button
                      type="button"
                      onClick={() => void onRevoke()}
                      disabled={isBusy}
                      className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isBusy ? "Revoking…" : "Delete"}
                    </button>
                  </div>
                </>
              ) : token ? (
                <>
                  <p className="text-sm leading-relaxed text-gray-600">
                    I’ll share this link with you — send it to colleagues. They can open the full
                    live analytics dashboard without signing in.
                  </p>
                  <div className="flex items-stretch gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                      <Link2 className="h-4 w-4 shrink-0 text-[#2674BA]" />
                      <input
                        readOnly
                        value={shareUrl}
                        className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none"
                        onFocus={(event) => event.currentTarget.select()}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyLink()}
                      className="cursor-pointer inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#2674BA] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#1f5f99]"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setMode("confirm-revoke")}
                      disabled={isBusy}
                      className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="cursor-pointer rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-gray-600">
                    Create a private link so colleagues can explore this live dashboard — filters,
                    prelim, configurator, compare, and export — without an account.
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-gray-500">
                    <li>One active link per study. Revoking kills the current link immediately.</li>
                    <li>They cannot change analysis settings, save reports, or use the assistant.</li>
                  </ul>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void onCreate()}
                      disabled={isBusy}
                      className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-[#2674BA] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1f5f99] disabled:opacity-60"
                    >
                      <Share2 className="h-4 w-4" />
                      {isBusy ? "Creating link…" : "Create share link"}
                    </button>
                  </div>
                </>
              )}

              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
