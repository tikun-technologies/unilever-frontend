"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Play, X } from "lucide-react"
import type Hls from "hls.js"
import { claimWarmVideo, lowQualityHlsUrl, prefersNativeHls, prewarmNativeVideoForPlayback, releaseWarmInterest, setWarmPlaybackInterest } from "@/lib/utils/videoPrewarm"

export function isVideoMediaUrl(url?: string | null): boolean {
  return Boolean(url && (/\.(mp4|m4v|mov|webm|m3u8)(?:$|[?#])/i.test(url) || /\/video\/upload\//i.test(url)))
}

export function AnalyticsVideoPlayer({
  src,
  muted = true,
  controls = false,
  autoPlay = false,
  loop = false,
  previewFrame = false,
  className = "",
  ariaLabel,
}: {
  src: string
  muted?: boolean
  controls?: boolean
  autoPlay?: boolean
  loop?: boolean
  /** Load and seek to an early frame so paused analytics tiles show a real thumbnail. */
  previewFrame?: boolean
  className?: string
  ariaLabel?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const autoPlayRef = useRef(autoPlay)
  useEffect(() => { autoPlayRef.current = autoPlay }, [autoPlay])
  const isHls = src.split("?")[0].toLowerCase().endsWith(".m3u8")
  const poster = isHls ? src.replace(/master\.m3u8(\?.*)?$/i, "poster.jpg$1") : undefined
  useEffect(() => {
    const node = ref.current
    if (!node || !src) return
    let cancelled = false
    let hls: { destroy: () => void } | null = null
    const play = () => { if (autoPlayRef.current) void node.play().catch(() => undefined) }
    const showPreviewFrame = () => {
      if (!previewFrame || autoPlayRef.current) return
      try {
        const duration = Number.isFinite(node.duration) ? node.duration : 0
        node.currentTime = duration > 0 ? Math.min(0.5, Math.max(0.05, duration / 20)) : 0.1
      } catch {
        /* The generated HLS poster remains available as a fallback. */
      }
    }
    node.addEventListener("loadedmetadata", showPreviewFrame)
    node.addEventListener("loadeddata", play)
    // A paused tile must not open a stream. Category grids used to attach one
    // player per video, which is what hung phones when Best Mix opened them.
    if (!autoPlay && !previewFrame) {
      return () => {
        node.removeEventListener("loadedmetadata", showPreviewFrame)
        node.removeEventListener("loadeddata", play)
      }
    }
    // Android Chrome reports native HLS support, then stalls. Only Apple's
    // player is trusted; everyone else uses hls.js, starting on the small rendition.
    const native = prefersNativeHls()
    if (!isHls || native) {
      node.src = native && isHls ? lowQualityHlsUrl(src) : src
      if (node.readyState >= 1) showPreviewFrame()
      if (node.readyState >= 2) play()
    } else {
      void import("hls.js").then(({ default: HlsLib }) => {
        if (cancelled || !ref.current || !HlsLib.isSupported()) return
        const player = new HlsLib({
          startLevel: 0,
          capLevelToPlayerSize: true,
          maxBufferLength: 8,
          maxMaxBufferLength: 12,
        })
        hls = player
        player.loadSource(src)
        player.attachMedia(node)
        player.on(HlsLib.Events.MANIFEST_PARSED, () => {
          showPreviewFrame()
          play()
        })
      }).catch(() => undefined)
    }
    return () => {
      cancelled = true
      node.removeEventListener("loadedmetadata", showPreviewFrame)
      node.removeEventListener("loadeddata", play)
      hls?.destroy()
    }
  }, [src, isHls, autoPlay, previewFrame])
  useEffect(() => {
    const node = ref.current
    if (!node) return
    node.muted = muted
    if (autoPlay) void node.play().catch(() => undefined)
    else node.pause()
  }, [muted, autoPlay, src])
  return <video ref={ref} poster={poster} controls={controls} muted={muted} playsInline loop={loop} preload={autoPlay || previewFrame ? "auto" : "none"} className={className} aria-label={ariaLabel} />
}

export function AnalyticsMediaTile({ url, name, isVideo = false, className = "" }: { url?: string | null; name: string; isVideo?: boolean; className?: string }) {
  if (!url) return null
  if (isVideo || isVideoMediaUrl(url)) {
    const poster = url.split("?")[0].toLowerCase().endsWith(".m3u8")
      ? url.replace(/master\.m3u8(\?.*)?$/i, "poster.jpg$1")
      : undefined
    return <div className={`relative overflow-hidden bg-black ${className}`}>
      {poster
        ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={poster} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
        : <div className="h-full w-full bg-black" />}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white"><Play className="ml-0.5 h-4 w-4 fill-current" /></span></span>
    </div>
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={name} loading="lazy" decoding="async" className={className} />
}

export function AnalyticsMediaLightbox({ src, alt, isOpen, onClose, isVideo = false }: { src: string | null; alt: string; isOpen: boolean; onClose: () => void; isVideo?: boolean }) {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onKeyDown)
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", onKeyDown) }
  }, [isOpen, onClose])
  if (!isOpen) return null
  const showVideo = isVideo || isVideoMediaUrl(src)
  return <div role="dialog" aria-modal="true" aria-label={`${showVideo ? "Video" : "Image"} preview: ${alt}`} className="fixed inset-0 z-[230] flex items-center justify-center bg-black/90 p-3 sm:p-6" onClick={onClose}>
    <button type="button" onClick={onClose} className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Close media preview"><X className="h-6 w-6" /></button>
    <div className="flex max-h-[92dvh] max-w-[94vw] flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
      {src ? showVideo ? (
        <div className="relative h-[min(84dvh,800px)] w-[min(94vw,60rem)] overflow-hidden rounded-xl bg-black">
          <AnalyticsReelPlayer src={src} ariaLabel={alt} loop={false} />
        </div>
      ) : /* eslint-disable-next-line @next/next/no-img-element */ <img src={src} alt={alt} className="max-h-[84dvh] max-w-[94vw] object-contain" /> : <div className="text-white">Loading preview…</div>}
      <p className="max-w-[90vw] text-center text-sm font-semibold text-white">{alt}</p>
    </div>
  </div>
}

/** Reel-only player used by the design configurator's mobile preview. */
export function AnalyticsReelPlayer({ src, ariaLabel, onPlaybackStarted, controls = true, loop = true }: { src: string; ariaLabel: string; onPlaybackStarted?: () => void; controls?: boolean; loop?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [preparedUrl, setPreparedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const isHls = src.split("?")[0].toLowerCase().endsWith(".m3u8")
  const poster = isHls ? src.replace(/master\.m3u8(\?.*)?$/i, "poster.jpg$1") : undefined
  const isPrepared = preparedUrl === src

  useEffect(() => {
    let cancelled = false
    void prewarmNativeVideoForPlayback(src).finally(() => {
      if (!cancelled) setPreparedUrl(src)
    })
    return () => { cancelled = true }
  }, [src])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !src || !isPrepared) return
    let cancelled = false
    let hls: Hls | null = null
    let usingLowQuality = false
    let networkRecoveries = 0
    let mediaRecoveries = 0
    let spinnerTimer: number | null = window.setTimeout(() => setLoading(true), 250)
    const native = isHls && prefersNativeHls()
    const claimed = native ? claimWarmVideo(src) : null
    const node = claimed ?? document.createElement("video")
    node.className = "h-full w-full bg-black object-contain"
    node.controls = controls
    node.playsInline = true
    node.setAttribute("playsinline", "")
    node.setAttribute("webkit-playsinline", "")
    node.loop = loop
    // HLS is buffered in small chunks by the player. For fallback MP4 links,
    // request metadata first so opening the configurator does not pull down
    // the entire source file before playback needs it.
    node.preload = isHls ? "auto" : "metadata"
    node.muted = false
    node.setAttribute("aria-label", ariaLabel)
    if (poster) node.poster = poster
    host.replaceChildren(node)
    setFailed(false)
    setWarmPlaybackInterest(src, true)

    const play = async () => {
      if (cancelled) return
      try {
        await node.play()
      } catch {
        if (cancelled) return
        // Mobile browsers can block audible autoplay after an async route or
        // scroll. Start the stream muted so the picture still plays.
        node.muted = true
        try {
          await node.play()
        } catch {
          if (!cancelled) setFailed(true)
        }
      }
    }
    const onPlaying = () => {
      if (spinnerTimer !== null) window.clearTimeout(spinnerTimer)
      spinnerTimer = null
      setLoading(false)
      setFailed(false)
      onPlaybackStarted?.()
    }
    const onWaiting = () => {
      if (spinnerTimer === null) spinnerTimer = window.setTimeout(() => setLoading(true), 250)
    }
    const onError = () => {
      if (cancelled) return
      if (usingLowQuality) {
        usingLowQuality = false
        node.src = src
        node.load()
        void play()
        return
      }
      setLoading(false)
      setFailed(true)
    }
    node.addEventListener("playing", onPlaying)
    node.addEventListener("waiting", onWaiting)
    node.addEventListener("stalled", onWaiting)
    node.addEventListener("error", onError)

    if (isHls && native) {
      if (!claimed) {
        usingLowQuality = true
        node.src = lowQualityHlsUrl(src)
        node.load()
      } else {
        usingLowQuality = node.src !== src
      }
      void play()
    } else if (isHls) {
      void import("hls.js").then(({ default: HlsLib }) => {
        if (cancelled) return
        if (!HlsLib.isSupported()) {
          setLoading(false)
          setFailed(true)
          return
        }
        const player = new HlsLib({
          startLevel: 0,
          capLevelToPlayerSize: true,
          maxBufferLength: 8,
          maxMaxBufferLength: 12,
          startFragPrefetch: true,
        })
        hls = player
        player.on(HlsLib.Events.MANIFEST_PARSED, () => void play())
        player.on(HlsLib.Events.ERROR, (_event, data) => {
          if (!data.fatal || cancelled) return
          if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR && networkRecoveries < 3) {
            networkRecoveries += 1
            player.startLoad()
            return
          }
          if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 2) {
            mediaRecoveries += 1
            player.recoverMediaError()
            return
          }
          console.warn("Analytics reel HLS error", { type: data.type, details: data.details })
          setLoading(false)
          setFailed(true)
        })
        player.loadSource(src)
        player.attachMedia(node)
      }).catch(() => {
        if (!cancelled) {
          setLoading(false)
          setFailed(true)
        }
      })
    } else {
      node.src = src
      node.load()
      void play()
    }

    return () => {
      cancelled = true
      if (spinnerTimer !== null) window.clearTimeout(spinnerTimer)
      node.removeEventListener("playing", onPlaying)
      node.removeEventListener("waiting", onWaiting)
      node.removeEventListener("stalled", onWaiting)
      node.removeEventListener("error", onError)
      hls?.destroy()
      releaseWarmInterest(src)
      setWarmPlaybackInterest(src, false)
      try {
        node.pause()
        node.removeAttribute("src")
        node.load()
        node.remove()
      } catch {
        /* The node may already have been removed during a retry. */
      }
    }
  }, [ariaLabel, controls, isHls, isPrepared, loop, onPlaybackStarted, poster, retryKey, src])

  return (
    <div className="absolute inset-0 h-full w-full bg-black">
      {poster && !isPrepared ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" loading="eager" decoding="async" fetchPriority="high" className="absolute inset-0 h-full w-full object-contain" />
      ) : null}
      <div ref={hostRef} className="h-full w-full" />
      {(!isPrepared || (loading && !failed)) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
          <Loader2 className="h-8 w-8 animate-spin text-white" aria-label={isPrepared ? "Loading video" : "Preparing video"} />
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
          <span className="text-sm">Video did not start.</span>
          <button type="button" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black" onClick={() => { setRetryKey((key) => key + 1); setLoading(true) }}>
            Retry video
          </button>
        </div>
      )}
    </div>
  )
}
