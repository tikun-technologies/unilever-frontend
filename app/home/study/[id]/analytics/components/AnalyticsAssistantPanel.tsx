"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  RefreshCw,
  SendHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { AssistantAnswerCard } from "./assistant/AssistantAnswerCard"
import type { AssistantAction, AssistantChatMessage, AssistantQueryResponse } from "@/lib/types/analyticsAssistant"

const ASSISTANT_WIDTH_STORAGE_KEY = "analytics-assistant-width"
const DEFAULT_PANEL_WIDTH = 420
const MIN_PANEL_WIDTH = 320
/** Keep at least this much analytics content visible while resizing. */
const MIN_MAIN_CONTENT_WIDTH = 280
/** Hard cap: assistant panel may not exceed 40% of the viewport. */
const MAX_PANEL_WIDTH_RATIO = 0.4

function clampPanelWidth(width: number, viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280) {
  const maxByRatio = Math.floor(viewportWidth * MAX_PANEL_WIDTH_RATIO)
  const max = Math.max(
    MIN_PANEL_WIDTH,
    Math.min(maxByRatio, viewportWidth - MIN_MAIN_CONTENT_WIDTH)
  )
  return Math.max(MIN_PANEL_WIDTH, Math.min(max, Math.round(width)))
}

export function AnalyticsAssistantPanel({
  open,
  onOpenChange,
  messages,
  input,
  setInput,
  loading,
  error,
  starters,
  studyType,
  sendMessage,
  retryLast,
  clearChat,
  runAction,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  messages: AssistantChatMessage[]
  input: string
  setInput: (value: string) => void
  loading: boolean
  error: string | null
  starters: string[]
  studyType?: string
  sendMessage: (message: string) => void | Promise<void>
  retryLast: () => void
  clearChat: () => void
  runAction: (action: AssistantAction, response?: AssistantQueryResponse) => void | Promise<void>
}) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(ASSISTANT_WIDTH_STORAGE_KEY))
    if (Number.isFinite(saved)) {
      setPanelWidth(clampPanelWidth(saved))
    }
  }, [])

  useEffect(() => {
    const syncWidth = () => {
      setPanelWidth((current) => clampPanelWidth(current))
    }
    window.addEventListener("resize", syncWidth)
    return () => window.removeEventListener("resize", syncWidth)
  }, [])

  useEffect(() => {
    if (!open) return
    const node = listRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, open, loading])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const handleSubmit = () => {
    if (!input.trim() || loading) return
    void sendMessage(input)
  }

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const move = (pointerEvent: PointerEvent) => {
      const next = clampPanelWidth(window.innerWidth - pointerEvent.clientX)
      setPanelWidth(next)
    }
    const stop = () => {
      document.removeEventListener("pointermove", move)
      document.removeEventListener("pointerup", stop)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      setPanelWidth((current) => {
        const clamped = clampPanelWidth(current)
        window.localStorage.setItem(ASSISTANT_WIDTH_STORAGE_KEY, String(clamped))
        return clamped
      })
    }
    document.addEventListener("pointermove", move)
    document.addEventListener("pointerup", stop)
  }

  return (
    <>
      {/* Floating launcher — always visible, responsive */}
      {!open ? (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="fixed bottom-4 right-4 z-[102] inline-flex items-center gap-2 rounded-full bg-[#2674BA] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#2674BA]/30 transition hover:bg-[#1f5f99] active:scale-95 sm:bottom-6 sm:right-6"
          aria-label="Open analytics assistant"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Ask Analytics</span>
        </button>
      ) : null}

      {/* Mobile backdrop */}
      <AnimatePresence>
        {open ? (
          <motion.button
            type="button"
            aria-label="Close assistant backdrop"
            className="fixed inset-0 z-[102] bg-black/30 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.aside
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative flex h-full shrink-0 flex-col border-l border-gray-200 bg-white shadow-2xl max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-[103] max-lg:w-full max-lg:max-w-none lg:z-[102] lg:w-[var(--assistant-panel-width)] lg:max-w-[40vw] lg:shadow-none"
            aria-label="Verified analytics assistant"
            style={{ "--assistant-panel-width": `${panelWidth}px` } as CSSProperties}
          >
            <button
              type="button"
              onPointerDown={beginResize}
              className="absolute inset-y-0 -left-2 z-20 flex w-4 cursor-col-resize touch-none items-center justify-center max-lg:hidden"
              aria-label="Resize analytics assistant"
              title="Drag to resize"
            >
              <span className="h-24 w-1 rounded-full bg-gray-300 shadow-sm transition-colors group-hover:bg-[#2674BA] hover:bg-[#2674BA]" />
            </button>
            <button
              type="button"
              onPointerDown={beginResize}
              className="absolute inset-y-0 left-0 z-20 w-3 cursor-col-resize touch-none lg:hidden"
              aria-label="Resize analytics assistant"
              title="Drag to resize"
            />
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2674BA]/10 text-[#2674BA]">
                    <MessageSquareText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">Analytics Copilot</p>
                    <p className="truncate text-[11px] text-gray-500">
                      Verified study intelligence · {studyType || "study"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={clearChat}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  title="Clear chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#2674BA]/25 bg-[#2674BA]/5 p-4">
                  <p className="text-sm font-bold text-[#2674BA]">Ask anything about this study</p>
                  <p className="mt-1 text-xs text-gray-600">
                    I compute rankings, designs, and counts from your analysis. Ambiguous questions get
                    clarification — never guessed numbers.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {starters.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        className="rounded-full border border-[#2674BA]/20 bg-white px-3 py-1.5 text-left text-[11px] font-semibold text-[#2674BA] hover:bg-[#2674BA]/5"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[95%] rounded-2xl px-3 py-2 text-sm sm:max-w-[92%] ${
                      message.role === "user"
                        ? "bg-[#2674BA] text-white"
                        : "border border-gray-100 bg-gray-50 text-gray-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>

                    {message.pending ? (
                      <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Verifying with study data…
                      </div>
                    ) : null}

                    {message.error ? (
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-700">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{message.error}</span>
                      </div>
                    ) : null}

                    {message.response ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {message.response.applied_context?.verified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Verified
                            </span>
                          ) : null}
                          {message.response.applied_context?.metric ? (
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 ring-1 ring-gray-200">
                              {message.response.applied_context.metric}
                            </span>
                          ) : null}
                          {message.response.applied_context?.segment_label ? (
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 ring-1 ring-gray-200">
                              {message.response.applied_context.segment_label}
                            </span>
                          ) : null}
                          {message.response.applied_context?.base_size != null ? (
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 ring-1 ring-gray-200">
                              n={message.response.applied_context.base_size}
                            </span>
                          ) : null}
                        </div>

                        {(message.response.blocks || []).map((block, idx) => (
                          <AssistantAnswerCard key={`${message.id}-block-${idx}`} block={block} />
                        ))}

                        {message.response.status === "needs_clarification" &&
                        message.response.clarification_options?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {message.response.clarification_options.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => void sendMessage(option)}
                                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#2674BA] ring-1 ring-[#2674BA]/25 hover:bg-[#2674BA]/5"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {message.response.actions?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {message.response.actions.map((action, idx) => (
                              <button
                                key={`${action.type}-${idx}`}
                                type="button"
                                onClick={() => void runAction(action, message.response)}
                                className="rounded-lg bg-[#2674BA] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#1f5f99]"
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {message.response.follow_ups?.length ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {message.response.follow_ups.map((followUp) => (
                              <button
                                key={followUp}
                                type="button"
                                onClick={() => void sendMessage(followUp)}
                                className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                              >
                                {followUp}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {message.response.evidence?.length ? (
                          <details className="rounded-lg bg-white/70 px-2 py-1.5 text-[11px] text-gray-500">
                            <summary className="cursor-pointer font-semibold">Evidence citations</summary>
                            <ul className="mt-1 space-y-1">
                              {message.response.evidence.map((fact) => (
                                <li key={fact.fact_id}>
                                  <span className="font-bold text-gray-700">[{fact.fact_id}]</span>{" "}
                                  {fact.label}
                                  {fact.value != null ? `: ${fact.value}` : ""}
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {error ? (
              <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 sm:mx-4">
                <span className="min-w-0 break-words">{error}</span>
                <button
                  type="button"
                  onClick={retryLast}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2 py-1 font-semibold ring-1 ring-rose-200"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </button>
              </div>
            ) : null}

            <div className="border-t border-gray-100 p-3 sm:p-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-[#2674BA]/25">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                  rows={2}
                  placeholder="Ask about elements, designs, classification counts…"
                  className="max-h-32 min-h-[56px] w-full resize-y bg-transparent px-2 py-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  disabled={loading}
                />
                <div className="flex items-center justify-between gap-2 px-1 pb-1">
                  <p className="text-[10px] text-gray-400">Enter to send · Shift+Enter for newline</p>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || !input.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#2674BA] px-3 py-2 text-xs font-bold text-white hover:bg-[#1f5f99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="h-3.5 w-3.5" />}
                    Ask
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  )
}
