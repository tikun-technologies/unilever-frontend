"use client"

import { useCallback, useEffect, useState } from "react"

type Updater<T> = T | ((prev: T) => T)

export type CommitOptions = {
  /** Apply to the present without creating an undo step. For UI-only state (a panel opening). */
  transient?: boolean
  /**
   * Apply the updater to every past/future snapshot as well as the present, without
   * creating an undo step. For background writes that fill in data the user did not
   * type — an upload finishing — so undo can never travel back to a pre-upload value.
   * Requires a functional updater, since it runs against arbitrary snapshots.
   */
  patchHistory?: boolean
  /**
   * Merge consecutive commits sharing this key into a single undo step, as long as they
   * land within the coalesce window. Keeps one keystroke from costing one undo.
   */
  coalesceKey?: string
}

export type UndoableState<T> = {
  state: T
  setState: (updater: Updater<T>, options?: CommitOptions) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  /** Replace the value and drop all history. For loading a different document. */
  reset: (next: T) => void
}

type History<T> = {
  past: T[]
  present: T
  future: T[]
  coalesceKey: string | null
  committedAt: number
}

const isFn = <T,>(u: Updater<T>): u is (prev: T) => T => typeof u === "function"

export function useUndoableState<T>(
  initializer: T | (() => T),
  { limit = 50, coalesceWindowMs = 600 }: { limit?: number; coalesceWindowMs?: number } = {}
): UndoableState<T> {
  const [history, setHistory] = useState<History<T>>(() => ({
    past: [],
    present: typeof initializer === "function" ? (initializer as () => T)() : initializer,
    future: [],
    coalesceKey: null,
    committedAt: 0,
  }))

  const setState = useCallback(
    (updater: Updater<T>, options?: CommitOptions) => {
      // Read the clock here rather than inside the state updater, so the updater stays a
      // pure function of its inputs and survives a double-invoke in StrictMode.
      const now = Date.now()

      setHistory((h) => {
        const next = isFn(updater) ? updater(h.present) : updater

        if (options?.patchHistory) {
          if (!isFn(updater)) {
            throw new Error("useUndoableState: patchHistory requires a functional updater")
          }
          return {
            ...h,
            past: h.past.map(updater),
            present: next,
            future: h.future.map(updater),
          }
        }

        if (Object.is(next, h.present)) return h
        if (options?.transient) return { ...h, present: next }

        const coalesce =
          options?.coalesceKey != null &&
          options.coalesceKey === h.coalesceKey &&
          now - h.committedAt < coalesceWindowMs

        return {
          past: coalesce ? h.past : [...h.past, h.present].slice(-limit),
          present: next,
          future: [],
          coalesceKey: options?.coalesceKey ?? null,
          committedAt: now,
        }
      })
    },
    [limit, coalesceWindowMs]
  )

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h
      return {
        past: h.past.slice(0, -1),
        present: h.past[h.past.length - 1],
        future: [h.present, ...h.future].slice(0, limit),
        coalesceKey: null,
        committedAt: 0,
      }
    })
  }, [limit])

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h
      return {
        past: [...h.past, h.present].slice(-limit),
        present: h.future[0],
        future: h.future.slice(1),
        coalesceKey: null,
        committedAt: 0,
      }
    })
  }, [limit])

  const reset = useCallback((next: T) => {
    setHistory({ past: [], present: next, future: [], coalesceKey: null, committedAt: 0 })
  }, [])

  return {
    state: history.present,
    setState,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    reset,
  }
}

const isTextEntryTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el) return false
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  )
}

/** Binds Ctrl/Cmd+Z to undo and Ctrl/Cmd+Shift+Z or Ctrl+Y to redo. */
export function useUndoRedoShortcuts({
  undo,
  redo,
  enabled = true,
}: {
  undo: () => void
  redo: () => void
  enabled?: boolean
}) {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return

      const key = e.key.toLowerCase()
      if (key !== "z" && key !== "y") return

      // Inside a text field these shortcuts belong to the browser's own text undo.
      if (isTextEntryTarget(e.target)) return

      e.preventDefault()
      if (key === "y" || e.shiftKey) redo()
      else undo()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [undo, redo, enabled])
}
