"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react"
import { postAnalyticsAssistantQuery } from "@/lib/api/AnalyticsAssistantAPI"
import type {
  AssistantAction,
  AssistantChatMessage,
  AssistantFollowUpContext,
  AssistantQueryResponse,
} from "@/lib/types/analyticsAssistant"

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const STARTER_PROMPTS = [
  "Show study overview",
  "Show the best design overall",
  "Show the best elements overall",
  "Why is the best design better?",
  "How many answered each classification question?",
  "What should we use or avoid?",
  "Explain Mindset 1",
  "Show response time summary",
]

function welcomeMessage(): AssistantChatMessage {
  return {
    id: newId(),
    role: "assistant",
    text: "Welcome! Ask me anything about this study’s analytics, designs, elements, segments, or responses.",
    createdAt: new Date().toISOString(),
  }
}

export function useAnalyticsAssistant(options: {
  studyId: string
  studyType?: string
  activeFilters?: Record<string, any> | null
  isFilterActive?: boolean
  onAction?: (action: AssistantAction, response?: AssistantQueryResponse) => void | Promise<void>
}) {
  const {
    studyId,
    activeFilters = null,
    isFilterActive = false,
    onAction,
  } = options

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AssistantChatMessage[]>(() => [welcomeMessage()])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState<AssistantFollowUpContext | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const conversationIdRef = useRef<string>(newId())

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const starters = STARTER_PROMPTS

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim()
      if (!message || !studyId || loading) return

      setError(null)
      setLoading(true)
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const userMsg: AssistantChatMessage = {
        id: newId(),
        role: "user",
        text: message,
        createdAt: new Date().toISOString(),
      }
      const pendingId = newId()
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: pendingId,
          role: "assistant",
          text: "Computing a verified answer…",
          createdAt: new Date().toISOString(),
          pending: true,
        },
      ])
      setInput("")

      try {
        const response = await postAnalyticsAssistantQuery(
          studyId,
          {
            message,
            use_active_filters: Boolean(isFilterActive),
            filters: isFilterActive ? activeFilters : null,
            follow_up: followUp,
            conversation_id: conversationIdRef.current,
          },
          controller.signal
        )

        if (response.follow_up_context) {
          setFollowUp(response.follow_up_context)
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === pendingId
              ? {
                  id: pendingId,
                  role: "assistant",
                  text: response.answer_text,
                  createdAt: new Date().toISOString(),
                  response,
                  pending: false,
                }
              : msg
          )
        )
      } catch (e: any) {
        if (e?.name === "AbortError") return
        const errText = e?.message || "Assistant request failed"
        setError(errText)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === pendingId
              ? {
                  ...msg,
                  pending: false,
                  text: "I could not complete that verified query.",
                  error: errText,
                }
              : msg
          )
        )
      } finally {
        setLoading(false)
      }
    },
    [studyId, loading, isFilterActive, activeFilters, followUp]
  )

  const retryLast = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")
    if (lastUser) void sendMessage(lastUser.text)
  }, [messages, sendMessage])

  const clearChat = useCallback(() => {
    abortRef.current?.abort()
    setMessages([welcomeMessage()])
    setFollowUp(null)
    setError(null)
    conversationIdRef.current = newId()
  }, [])

  const runAction = useCallback(
    async (action: AssistantAction, response?: AssistantQueryResponse) => {
      if (onAction) await onAction(action, response)
    },
    [onAction]
  )

  return {
    open,
    setOpen,
    messages,
    input,
    setInput,
    loading,
    error,
    starters,
    followUp,
    sendMessage,
    retryLast,
    clearChat,
    runAction,
  }
}
