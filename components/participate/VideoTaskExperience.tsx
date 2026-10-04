"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { MutableRefObject } from "react"
import { ChevronDown, ChevronUp, Play, ThumbsDown, ThumbsUp, Volume2, VolumeX } from "lucide-react"
import type Hls from "hls.js"
import {
  claimWarmVideo,
  isHlsUrl,
  lowQualityHlsUrl,
  posterFor,
  prefersNativeHls,
  prewarmVideoUrls,
  releaseWarmInterest,
  setWarmPlaybackInterest,
} from "@/lib/utils/videoPrewarm"
import { mediaSnapshot, videoClipLabel, videoDiag, videoDiagEnabled } from "@/lib/utils/videoDiag"

/** No progress for this long after play() was requested counts as a stall. */
const STALL_MS = 8000
const MAX_STALL_RECOVERIES = 2

function stripQuery(url: string) {
  return url.split("?")[0]
}

const SOUND_KEY = "video_reel_sound"
type VideoFit = "cover" | "contain"

function readSoundPref() {
  try {
    // Sound is on by default; retain an explicit participant mute choice.
    return sessionStorage.getItem(SOUND_KEY) !== "0"
  } catch {
    return true
  }
}

function writeSoundPref(on: boolean) {
  try {
    sessionStorage.setItem(SOUND_KEY, on ? "1" : "0")
  } catch {
    /* ignore */
  }
}

function useVisualViewportBox() {
  const [box, setBox] = useState(() => ({
    top: 0,
    left: 0,
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }))

  useEffect(() => {
    const apply = () => {
      const vv = window.visualViewport
      const width = vv?.width ?? window.innerWidth
      const height = vv?.height ?? window.innerHeight
      setBox((prev) => {
        // Prevent continuous state updates and re-renders during scrolling
        if (Math.abs(prev.width - width) < 2 && Math.abs(prev.height - height) < 2) {
          return prev
        }
        return {
          top: 0,
          left: 0,
          width,
          height,
        }
      })
    }
    apply()
    const vv = window.visualViewport
    vv?.addEventListener("resize", apply)
    window.addEventListener("resize", apply)
    window.addEventListener("orientationchange", apply)
    return () => {
      vv?.removeEventListener("resize", apply)
      window.removeEventListener("resize", apply)
      window.removeEventListener("orientationchange", apply)
    }
  }, [])

  return box
}

/**
 * One reel's media. Attached only while `mounted` so off-screen clips release
 * their decoders. Plays only when `shouldPlay` is true (after the snap settles).
 */
function ClipMedia({
  src,
  mounted,
  shouldPlay,
  wantSound,
  soundAttempt,
  isMobile,
  activeVideoRef,
  onFatal,
  onAutoplayBlocked,
}: {
  src: string
  mounted: boolean
  shouldPlay: boolean
  wantSound: boolean
  soundAttempt: number
  isMobile: boolean
  activeVideoRef: MutableRefObject<HTMLVideoElement | null>
  onFatal: () => void
  onAutoplayBlocked: () => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  // True while the native player is on the 360p playlist rather than the master.
  const usingLowRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [fit, setFit] = useState<VideoFit>("cover")
  // Autoplay was denied even muted (Low Power Mode, strict settings). Needs a tap.
  const [needsTap, setNeedsTap] = useState(false)
  const [debugLines, setDebugLines] = useState<string[]>([])
  const poster = posterFor(src)
  const clipId = useMemo(() => videoClipLabel(src), [src])
  const debug = videoDiagEnabled()

  const logRef = useRef<(event: string, data?: Record<string, unknown>) => void>(() => undefined)
  logRef.current = (event, data) => {
    const line = videoDiag(clipId, event, data)
    if (debug) setDebugLines((prev) => [...prev.slice(-5), line])
  }

  const fail = useCallback(
    (why: string, data?: Record<string, unknown>) => {
      logRef.current("fatal", { why, ...(data || {}) })
      onFatal()
    },
    [onFatal],
  )

  // Attach the media element. A parked player from the preloader is adopted
  // as-is so its buffer survives; otherwise a fresh element is created.
  useEffect(() => {
    if (!mounted) return
    const host = hostRef.current
    if (!host) return
    let claimed = claimWarmVideo(src)
    if (claimed && (claimed.error || claimed.networkState === HTMLMediaElement.NETWORK_NO_SOURCE)) {
      logRef.current("claim-discarded", { code: claimed.error?.code ?? null, ...mediaSnapshot(claimed) })
      try {
        claimed.removeAttribute("src")
        claimed.load()
        claimed.remove()
      } catch {
        /* noop */
      }
      claimed = null
    }
    const node = claimed ?? document.createElement("video")
    setWarmPlaybackInterest(src, true)
    node.playsInline = true
    node.loop = true
    node.preload = "auto"
    node.setAttribute("playsinline", "")
    // The scroll list must receive the drag. A playing video on Android
    // otherwise swallows the swipe, so only the arrow buttons can move it.
    node.style.pointerEvents = "none"
    if (poster) node.poster = poster
    node.className = "pointer-events-none h-full w-full object-cover"
    host.appendChild(node)
    mainRef.current = node

    let cancelled = false
    setReady(node.readyState >= 1)
    setNeedsTap(false)
    const onMeta = () => {
      if (cancelled) return
      setFit(node.videoWidth > node.videoHeight ? "contain" : "cover")
      setReady(true)
    }
    const onErr = () => {
      if (cancelled) return
      const err = node.error
      logRef.current("media-error", {
        code: err?.code ?? null,
        message: err?.message ? err.message.slice(0, 120) : undefined,
        low: usingLowRef.current,
        ...mediaSnapshot(node),
      })
      if (usingLowRef.current) {
        // 360p playlist failed; the master is the fallback.
        usingLowRef.current = false
        node.src = src
        node.load()
        return
      }
      fail("media-error", { code: err?.code ?? null })
    }
    const trace = (name: string) => () => {
      if (!cancelled) logRef.current(name, mediaSnapshot(node))
    }
    const traced: Array<[string, () => void]> = [
      ["playing", trace("playing")],
      ["waiting", trace("waiting")],
      ["stalled", trace("stalled")],
      ["ended", trace("ended")],
    ]
    traced.forEach(([name, fn]) => node.addEventListener(name, fn))
    node.addEventListener("loadedmetadata", onMeta)
    node.addEventListener("error", onErr)
    if (node.readyState >= 1) onMeta()

    const native = prefersNativeHls()
    if (claimed) {
      const current = stripQuery(node.currentSrc || node.src)
      usingLowRef.current = isHlsUrl(src) && current !== stripQuery(src)
      logRef.current("adopted-warm", { low: usingLowRef.current, ...mediaSnapshot(node) })
    } else if (!isHlsUrl(src) || native) {
      const low = native && isHlsUrl(src) ? lowQualityHlsUrl(src) : src
      usingLowRef.current = low !== src
      node.src = low
      logRef.current("created", { engine: native ? "native" : "file", low: usingLowRef.current })
    } else {
      usingLowRef.current = false
      void import("hls.js")
        .then(({ default: HlsLib }) => {
          if (cancelled || !mainRef.current) return
          if (!HlsLib.isSupported()) {
            node.src = src
            logRef.current("created", { engine: "file-fallback" })
            return
          }
          const hls = new HlsLib({
            // Start on the lowest rendition so the first frame appears instantly,
            // then let ABR climb. Buffer further ahead and keep a small back
            // buffer so an on-screen clip is ready the moment it is played.
            startLevel: 0,
            maxBufferLength: 20,
            maxMaxBufferLength: 40,
            backBufferLength: 10,
            startFragPrefetch: true,
          })
          hlsRef.current = hls
          let networkRecoveries = 0
          let mediaRecoveries = 0
          const seenNonFatal = new Set<string>()
          hls.on(HlsLib.Events.ERROR, (_event, data) => {
            if (cancelled) return
            const detail = { type: data.type, details: data.details, fatal: data.fatal, ...mediaSnapshot(node) }
            if (!data.fatal) {
              // Log each non-fatal kind once per clip; buffering nudges repeat a lot.
              if (!seenNonFatal.has(data.details)) {
                seenNonFatal.add(data.details)
                logRef.current("hls-error", detail)
              }
              return
            }
            logRef.current("hls-error", detail)
            if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR && networkRecoveries < 3) {
              networkRecoveries += 1
              hls.startLoad()
              return
            }
            if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 2) {
              mediaRecoveries += 1
              hls.recoverMediaError()
              return
            }
            fail("hls-fatal", { type: data.type, details: data.details })
          })
          hls.on(HlsLib.Events.MANIFEST_PARSED, (_event, data) => {
            if (!cancelled) logRef.current("created", { engine: "hls.js", levels: data.levels.length })
          })
          hls.loadSource(src)
          hls.attachMedia(mainRef.current)
        })
        .catch(() => {
          if (!cancelled) fail("hls-import")
        })
    }

    return () => {
      cancelled = true
      traced.forEach(([name, fn]) => node.removeEventListener(name, fn))
      node.removeEventListener("loadedmetadata", onMeta)
      node.removeEventListener("error", onErr)
      try {
        hlsRef.current?.destroy()
      } catch {
        /* noop */
      }
      hlsRef.current = null
      if (mainRef.current === node) mainRef.current = null
      if (activeVideoRef.current === node) activeVideoRef.current = null
      releaseWarmInterest(src)
      try {
        node.pause()
        node.removeAttribute("src")
        node.load()
        node.remove()
      } catch {
        /* noop */
      }
    }
  }, [mounted, src]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const node = mainRef.current
    if (!node || !mounted) return
    node.className = `pointer-events-none h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`
  }, [fit, mounted])

  // Playback for the active clip. Neighbours only buffer; nothing here ever
  // calls play() on a clip that is not active, so a preload cannot pause the
  // visible one.
  useEffect(() => {
    const node = mainRef.current
    if (!node || !mounted) return
    if (!shouldPlay) {
      if (activeVideoRef.current === node) activeVideoRef.current = null
      if (!node.paused) node.pause()
      return
    }
    activeVideoRef.current = node

    let cancelled = false
    let playPending = false
    let abortRetries = 0
    let sourceRetries = 0
    let stallRecoveries = 0
    let retryTimer: number | null = null
    let stallTimer: number | null = null

    const clearStall = () => {
      if (stallTimer !== null) window.clearTimeout(stallTimer)
      stallTimer = null
    }

    const scheduleStart = (delay: number) => {
      if (cancelled || retryTimer !== null) return
      retryTimer = window.setTimeout(() => {
        retryTimer = null
        void start()
      }, delay)
    }

    // If the clip makes no progress after play() was requested, reload once,
    // then drop to the master playlist, then give the participant a retry.
    const armStallWatch = (fromTime: number) => {
      clearStall()
      stallTimer = window.setTimeout(() => {
        stallTimer = null
        if (cancelled || node.ended) return
        if (node.currentTime > fromTime + 0.2 && !node.paused) return
        stallRecoveries += 1
        logRef.current("stall-recover", { attempt: stallRecoveries, low: usingLowRef.current, ...mediaSnapshot(node) })
        if (stallRecoveries > MAX_STALL_RECOVERIES) {
          fail("stalled", { attempts: stallRecoveries })
          return
        }
        if (hlsRef.current) {
          hlsRef.current.stopLoad()
          hlsRef.current.startLoad(Math.max(0, node.currentTime))
        } else if (stallRecoveries === 2 && usingLowRef.current) {
          usingLowRef.current = false
          node.src = src
          node.load()
        } else {
          node.load()
        }
        scheduleStart(300)
      }, STALL_MS)
    }

    const start = async () => {
      if (cancelled || playPending) return
      if (!node.paused && !node.ended) {
        // Muting is always allowed; unmuting without a tap would pause Safari.
        if (!wantSound && !node.muted) node.muted = true
        return
      }

      playPending = true
      node.muted = !wantSound
      const fromTime = node.currentTime
      logRef.current("play-attempt", mediaSnapshot(node))
      armStallWatch(fromTime)
      try {
        await node.play()
        if (cancelled) return
        abortRetries = 0
        sourceRetries = 0
        setNeedsTap(false)
        logRef.current("play-ok", { muted: node.muted })
      } catch (error) {
        if (cancelled) return
        const name = error instanceof Error ? error.name : "Error"
        logRef.current("play-rejected", { name, ...mediaSnapshot(node) })
        if (name === "NotAllowedError") {
          clearStall()
          if (!node.muted) {
            // Audible autoplay is blocked without a tap. Start muted so the
            // clip still plays and tell the viewer why.
            node.muted = true
            onAutoplayBlocked()
            try {
              await node.play()
              if (cancelled) return
              logRef.current("play-ok", { muted: true })
              armStallWatch(fromTime)
            } catch (second) {
              if (cancelled) return
              const secondName = second instanceof Error ? second.name : "Error"
              logRef.current("play-rejected", { name: secondName, muted: true })
              if (secondName === "AbortError") scheduleStart(300)
              else setNeedsTap(true)
            }
          } else {
            // Even muted playback was denied. Only a tap can start it.
            setNeedsTap(true)
          }
        } else if (name === "AbortError") {
          // Interrupted by load() or pause(); the clip is still playable.
          clearStall()
          abortRetries += 1
          if (abortRetries <= 6) scheduleStart(300)
          else fail("play-aborted", { attempts: abortRetries })
        } else {
          clearStall()
          sourceRetries += 1
          if (sourceRetries <= 2) {
            node.load()
            scheduleStart(500)
          } else {
            fail("play-failed", { name })
          }
        }
      } finally {
        playPending = false
      }
    }

    const onPlayable = () => void start()
    const onPlaying = () => clearStall()
    const onWaiting = () => {
      if (!cancelled && !node.paused) armStallWatch(node.currentTime)
    }
    const onUnexpectedPause = () => {
      // Safari pauses when something unmutes without a tap, and iOS pauses a
      // clip when another audible one starts. Resume unless we paused it.
      if (!cancelled && !node.ended) scheduleStart(150)
    }
    // HLS on Android often ignores the loop attribute and freezes on the last
    // frame. Start the same clip again from the beginning.
    const onEnded = () => {
      if (cancelled) return
      logRef.current("loop-restart", mediaSnapshot(node))
      try {
        if (hlsRef.current) hlsRef.current.startLoad(0)
        node.currentTime = 0
      } catch {
        /* seeking can throw before the first frame exists */
      }
      void node.play().catch(() => undefined)
    }
    node.addEventListener("loadeddata", onPlayable)
    node.addEventListener("canplay", onPlayable)
    node.addEventListener("playing", onPlaying)
    node.addEventListener("waiting", onWaiting)
    node.addEventListener("pause", onUnexpectedPause)
    node.addEventListener("ended", onEnded)
    void start()

    return () => {
      cancelled = true
      if (retryTimer !== null) window.clearTimeout(retryTimer)
      clearStall()
      node.removeEventListener("loadeddata", onPlayable)
      node.removeEventListener("canplay", onPlayable)
      node.removeEventListener("playing", onPlaying)
      node.removeEventListener("waiting", onWaiting)
      node.removeEventListener("pause", onUnexpectedPause)
      node.removeEventListener("ended", onEnded)
    }
  }, [shouldPlay, wantSound, mounted, soundAttempt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Runs inside the tap, which is the only context a browser that denied
  // autoplay will accept.
  const playFromTap = () => {
    const node = mainRef.current
    if (!node) return
    node.muted = !wantSound
    logRef.current("tap-play", mediaSnapshot(node))
    node
      .play()
      .then(() => setNeedsTap(false))
      .catch(() => {
        node.muted = true
        onAutoplayBlocked()
        node
          .play()
          .then(() => setNeedsTap(false))
          .catch((error: unknown) => fail("tap-play-failed", { name: error instanceof Error ? error.name : "Error" }))
      })
  }

  if (!mounted) {
    return poster ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster} alt="" className="pointer-events-none h-full w-full object-cover" />
    ) : (
      <div className="h-full w-full bg-black pointer-events-none" />
    )
  }

  return (
    <div
      className={`pointer-events-none relative h-full w-full overflow-hidden bg-black ${isMobile ? "" : "rounded-xl shadow-lg"}`}
    >
      <div ref={hostRef} className="pointer-events-none h-full w-full" />
      {!ready && shouldPlay && !poster && !needsTap && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
        </div>
      )}
      {needsTap && shouldPlay && (
        <button
          type="button"
          onClick={playFromTap}
          aria-label="Play video"
          className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/40 text-white"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg">
            <Play className="ml-1 h-8 w-8" />
          </span>
          <span className="text-sm font-medium drop-shadow">Tap to play</span>
        </button>
      )}
      {debug && shouldPlay && debugLines.length > 0 && (
        <pre className="pointer-events-none absolute bottom-24 left-2 right-16 z-30 max-h-32 overflow-hidden whitespace-pre-wrap break-all rounded bg-black/70 p-2 text-[10px] leading-snug text-green-200">
          {`${clipId}\n${debugLines.join("\n")}`}
        </pre>
      )}
    </div>
  )
}

function RatingScale({
  ratingScaleValues,
  isSpecialCreator,
  scaleLabels,
  lastSelected,
  onSelect,
  onHover,
}: {
  ratingScaleValues: number[]
  isSpecialCreator: boolean
  scaleLabels: { left: string; right: string; middle: string }
  lastSelected: number | null
  onSelect: (n: number) => void
  onHover?: (n: number) => void
}) {
  return (
    <div className="w-full">
      {!isSpecialCreator && (scaleLabels.left || scaleLabels.right) && (
        <div className="mx-auto mb-3 flex w-full max-w-[360px] items-center justify-between px-2 text-xs font-medium text-gray-600 sm:text-sm">
          <span className="truncate pr-2">{scaleLabels.left}</span>
          <span className="truncate pl-2 text-right">{scaleLabels.right}</span>
        </div>
      )}
      <div className="flex items-center justify-center">
        {isSpecialCreator ? (
          <div className="flex items-center justify-center gap-4">
            {[1, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onSelect(n)}
                onMouseEnter={() => onHover?.(n)}
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors sm:h-14 sm:w-14 ${
                  lastSelected === n
                    ? "border-[rgba(38,116,186,1)] bg-[rgba(38,116,186,1)]"
                    : "border-gray-300 bg-white hover:border-[rgba(38,116,186,1)]"
                }`}
              >
                {n === 1 ? (
                  <ThumbsDown className={`h-6 w-6 sm:h-7 sm:w-7 ${lastSelected === n ? "text-white" : "text-[rgba(38,116,186,1)]"}`} />
                ) : (
                  <ThumbsUp className={`h-6 w-6 sm:h-7 sm:w-7 ${lastSelected === n ? "text-white" : "text-[rgba(38,116,186,1)]"}`} />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className={`flex items-center ${ratingScaleValues.length === 2 ? "justify-center gap-6" : "w-full max-w-[340px] justify-between"}`}>
            {ratingScaleValues.map((n) => {
              const selected = lastSelected === n
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onSelect(n)}
                  onMouseEnter={() => onHover?.(n)}
                  className={`h-11 w-11 flex-shrink-0 rounded-full border-2 text-sm font-semibold transition-colors sm:h-12 sm:w-12 sm:text-base ${
                    selected
                      ? "border-[rgba(38,116,186,1)] bg-[rgba(38,116,186,1)] text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {n}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export interface VideoTaskExperienceProps {
  urls: string[]
  mainQuestion: string
  taskNumber: number
  totalTasks: number
  progressPct: number
  ratingScaleValues: number[]
  isSpecialCreator: boolean
  scaleLabels: { left: string; right: string; middle: string }
  lastSelected: number | null
  onSelect: (n: number) => void
  onHover?: (n: number) => void
  ratingPrompt?: string
}

/**
 * Full-screen vertical reel for one video task.
 * Clips remain reviewable in both directions until the participant scrolls
 * into the rating step; rating replaces the reel so the task cannot be reopened.
 */
export function VideoTaskExperience({
  urls,
  mainQuestion,
  taskNumber,
  totalTasks,
  progressPct,
  ratingScaleValues,
  isSpecialCreator,
  scaleLabels,
  lastSelected,
  onSelect,
  onHover,
  ratingPrompt = "How appealing was this set of videos?",
}: VideoTaskExperienceProps) {
  const clips = urls.filter(Boolean)
  const box = useVisualViewportBox()
  const feedRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(0)
  const activeVideoRef = useRef<HTMLVideoElement | null>(null)
  const touchingRef = useRef(false)

  const [activeIndex, setActiveIndex] = useState(0)
  const [phase, setPhase] = useState<"watch" | "rate">(clips.length === 0 ? "rate" : "watch")
  const [failed, setFailed] = useState<Record<number, boolean>>({})
  const [retryCount, setRetryCount] = useState<Record<number, number>>({})
  const [wantSound, setWantSound] = useState(readSoundPref)
  const [soundHint, setSoundHint] = useState(false)
  const [soundAttempt, setSoundAttempt] = useState(0)

  const questionText = mainQuestion || `Question ${Math.min(taskNumber, totalTasks)}`
  const isMobile = !box.width || box.width < 768
  const clipKey = clips.join("\n")

  useEffect(() => {
    // The clip on screen and the next one are already mounted. Warm only the one after that.
    prewarmVideoUrls(clips.slice(activeIndex + 2, activeIndex + 3), true)
  }, [activeIndex, clipKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const feed = feedRef.current
    if (!feed) return
    const height = feed.clientHeight || 1
    // The final snap item is the rating step, so the participant can scroll
    // down after the last reel instead of getting stuck on it.
    const next = Math.max(0, Math.min(clips.length, index))
    feed.scrollTo({ top: next * height, behavior })
  }, [clips.length])

  useEffect(() => {
    const feed = feedRef.current
    if (!feed || phase !== "watch") return

    const handleIndexChange = (newIndex: number) => {
      if (newIndex === clips.length) {
        setPhase("rate")
        return
      }
      if (newIndex >= 0 && newIndex < clips.length && newIndex !== activeRef.current) {
        activeRef.current = newIndex
        setActiveIndex(newIndex)
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let bestEntry: IntersectionObserverEntry | null = null
        for (const entry of entries) {
          if (entry.isIntersecting && (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio)) {
            bestEntry = entry
          }
        }
        if (bestEntry && bestEntry.intersectionRatio >= 0.55) {
          const idx = Number((bestEntry.target as HTMLElement).dataset.index)
          if (!Number.isNaN(idx)) {
            handleIndexChange(idx)
          }
        }
      },
      {
        root: feed,
        threshold: [0.55],
      }
    )

    const sections = feed.querySelectorAll<HTMLElement>("section[data-index]")
    sections.forEach((sec) => observer.observe(sec))

    const onScrollEnd = () => {
      const height = feed.clientHeight || 1
      const settledIndex = Math.max(0, Math.min(clips.length, Math.round(feed.scrollTop / height)))
      handleIndexChange(settledIndex)
    }

    let scrollTimeout: number | null = null
    const onScroll = () => {
      if (touchingRef.current) return
      if (scrollTimeout) window.clearTimeout(scrollTimeout)
      scrollTimeout = window.setTimeout(onScrollEnd, 120)
    }

    const onTouchStart = () => {
      touchingRef.current = true
      if (scrollTimeout) window.clearTimeout(scrollTimeout)
    }

    const onTouchEnd = () => {
      touchingRef.current = false
      if (scrollTimeout) window.clearTimeout(scrollTimeout)
      scrollTimeout = window.setTimeout(onScrollEnd, 120)
    }

    const handleScrollEnd = () => {
      if (!touchingRef.current) onScrollEnd()
    }

    feed.addEventListener("scroll", onScroll, { passive: true })
    feed.addEventListener("scrollend", handleScrollEnd)
    feed.addEventListener("touchstart", onTouchStart, { passive: true })
    feed.addEventListener("touchend", onTouchEnd, { passive: true })
    feed.addEventListener("touchcancel", onTouchEnd, { passive: true })

    return () => {
      observer.disconnect()
      feed.removeEventListener("scroll", onScroll)
      feed.removeEventListener("scrollend", handleScrollEnd)
      feed.removeEventListener("touchstart", onTouchStart)
      feed.removeEventListener("touchend", onTouchEnd)
      feed.removeEventListener("touchcancel", onTouchEnd)
      if (scrollTimeout) window.clearTimeout(scrollTimeout)
    }
  }, [phase, clips.length])

  // Keep the snapped clip aligned only when rotating the device.
  useEffect(() => {
    if (phase !== "watch") return
    const onOrientation = () => {
      const feed = feedRef.current
      if (!feed) return
      const height = feed.clientHeight || 1
      feed.scrollTo({ top: activeRef.current * height, behavior: "auto" })
    }
    window.addEventListener("orientationchange", onOrientation)
    return () => window.removeEventListener("orientationchange", onOrientation)
  }, [phase])

  useEffect(() => {
    if (phase !== "watch") return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
      event.preventDefault()
      const dir = event.key === "ArrowDown" ? 1 : -1
      const target = activeRef.current + dir
      if (target < 0 || target > clips.length) return
      scrollToIndex(target)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phase, clips.length, scrollToIndex])

  const nudge = (dir: 1 | -1) => {
    const target = activeRef.current + dir
    if (target < 0 || target > clips.length) return
    scrollToIndex(target)
  }

  const toggleSound = () => {
    if (!wantSound || soundHint) {
      const video = activeVideoRef.current
      if (video) {
        video.muted = false
        video.play().catch(() => {
          video.muted = true
          setSoundHint(true)
        })
      }
      setWantSound(true)
      setSoundHint(false)
      writeSoundPref(true)
      setSoundAttempt((n) => n + 1)
      return
    }
    setWantSound(false)
    writeSoundPref(false)
  }

  const frameStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100dvh",
    zIndex: 30,
    display: "flex",
    flexDirection: "column",
  }

  const counter = clips.length > 0 ? `Video ${Math.min(activeIndex + 1, clips.length)} of ${clips.length}` : ""
  const canGoUp = activeIndex > 0
  const canGoDown = activeIndex < clips.length

  // Match the non-video desktop task header in both the reel and rating views.
  const desktopHeader = (
    <header className="flex-shrink-0 bg-white px-4 pb-2 pt-3 text-sm text-gray-600 sm:px-8 lg:px-10">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="line-clamp-2 max-w-[calc(100%-5rem)] flex-1 break-words text-lg font-semibold leading-tight text-gray-800 hyphens-auto">
          {questionText}
        </div>
      </div>
      <div className="h-1 overflow-hidden rounded bg-gray-200">
        <div className="h-full bg-[rgba(38,116,186,1)] transition-all" style={{ width: `${progressPct}%` }} />
      </div>
    </header>
  )

  const ratingPanel = (
    <div className="pointer-events-auto flex h-full w-full flex-col bg-white text-gray-900">
      {isMobile ? (
        <div
          className="flex-shrink-0 px-4 sm:px-8"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
        >
          <div className="mb-2 h-1 overflow-hidden rounded bg-gray-200">
            <div className="h-full bg-[rgba(38,116,186,1)] transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="mb-2 max-w-5xl break-words text-base font-semibold leading-snug text-gray-800 sm:text-lg">
            {questionText}
          </div>
        </div>
      ) : desktopHeader}
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-6"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <h2 className="mb-8 max-w-xl text-center text-lg font-semibold text-gray-900 sm:text-xl">{ratingPrompt}</h2>
        <RatingScale
          ratingScaleValues={ratingScaleValues}
          isSpecialCreator={isSpecialCreator}
          scaleLabels={scaleLabels}
          lastSelected={lastSelected}
          onSelect={onSelect}
          onHover={onHover}
        />
      </div>
    </div>
  )

  if (phase === "rate") {
    return <div style={frameStyle}>{ratingPanel}</div>
  }

  return (
    <div style={frameStyle} className={isMobile ? "bg-black text-white" : "bg-white text-white"}>
      {!isMobile && desktopHeader}
      <div
        ref={feedRef}
        className={`min-h-0 w-full flex-1 snap-y snap-mandatory overflow-y-scroll overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isMobile ? "" : "bg-white"}`}
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        {clips.map((src, index) => {
          const mounted = isMobile
            ? index === activeIndex || index === activeIndex + 1
            : Math.abs(index - activeIndex) <= 1
          const shouldPlay = index === activeIndex && !failed[index]
          return (
            <section
              key={`${src}-${index}`}
              data-index={index}
              className={`relative h-full w-full shrink-0 snap-start ${isMobile ? "" : "flex items-center justify-center bg-white"}`}
            >
              <div className={isMobile ? "h-full w-full pointer-events-none" : "h-full w-auto max-h-full max-w-full aspect-[9/16] pointer-events-none"}>
                <ClipMedia
                  key={`${src}-${index}-${retryCount[index] || 0}`}
                  src={src}
                  mounted={mounted}
                  shouldPlay={shouldPlay}
                  wantSound={wantSound}
                  soundAttempt={soundAttempt}
                  isMobile={isMobile}
                  activeVideoRef={activeVideoRef}
                  onFatal={() => setFailed((prev) => ({ ...prev, [index]: true }))}
                  onAutoplayBlocked={() => setSoundHint(true)}
                />
              </div>
              {failed[index] && index === activeIndex && (
                <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center">
                  <p className="text-sm text-white/90">This video could not be played.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFailed((prev) => {
                        const next = { ...prev }
                        delete next[index]
                        return next
                      })
                      setRetryCount((prev) => ({ ...prev, [index]: (prev[index] || 0) + 1 }))
                    }}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900"
                  >
                    Retry this video
                  </button>
                </div>
              )}
            </section>
          )
        })}
        <section
          key="rating"
          data-index={clips.length}
          className="h-full w-full shrink-0 snap-start"
        >
          {ratingPanel}
        </section>
      </div>

      {isMobile && <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/75 via-black/35 to-transparent px-4 pb-16 sm:px-8"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-white/45">
          <div className="h-full rounded-full bg-[rgba(38,116,186,1)] transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="max-w-3xl break-words text-sm font-semibold leading-snug text-white drop-shadow sm:text-base md:text-lg line-clamp-3">
          {questionText}
        </p>
      </div>}

      {isMobile && <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/55 to-transparent px-4 pt-12 text-center"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="text-sm font-medium text-white/90 drop-shadow">{counter}</div>
      </div>}

      <div
        className={`absolute top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 ${isMobile ? "right-3 sm:right-5" : ""}`}
        style={isMobile ? undefined : { left: "calc(50% + 28.125vh)", right: "auto" }}
      >
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={!canGoUp}
          aria-label="Previous video"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={!canGoDown}
          aria-label="Next video"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {activeIndex < clips.length && <div
        className={`absolute z-20 flex flex-col items-end gap-1 ${isMobile ? "bottom-4 right-3 sm:right-5" : "bottom-4 right-5"}`}
        style={{ bottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        {soundHint && (
          <span className="max-w-[170px] text-right text-[11px] leading-tight text-white/90 drop-shadow">
            Tap for sound. The browser blocked audio until you do.
          </span>
        )}
        <button
          type="button"
          onClick={toggleSound}
          aria-label={wantSound && !soundHint ? "Mute" : "Turn sound on"}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
        >
          {wantSound && !soundHint ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </div>}
    </div>
  )
}
