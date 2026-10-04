"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Play, Volume2, VolumeX } from "lucide-react"

/** Portrait clip with play/pause and a speaker. Sound is on until the user mutes it. */
export function PreviewVideoCard({ src, name }: { src: string; name?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const isHls = src.split("?")[0].toLowerCase().endsWith(".m3u8")
  const poster = isHls ? src.replace(/master\.m3u8(\?.*)?$/i, "poster.jpg$1") : undefined

  useEffect(() => {
    const node = ref.current
    if (!node || !src) return
    if (!isHls || node.canPlayType("application/vnd.apple.mpegurl")) {
      node.src = src
      return
    }
    let cancelled = false
    let hls: { destroy: () => void } | null = null
    void import("hls.js").then(({ default: HlsLib }) => {
      if (cancelled || !ref.current || !HlsLib.isSupported()) return
      const player = new HlsLib()
      hls = player
      player.loadSource(src)
      player.attachMedia(ref.current)
    })
    return () => {
      cancelled = true
      try {
        hls?.destroy()
      } catch {
        /* noop */
      }
    }
  }, [src, isHls])

  const togglePlay = () => {
    const node = ref.current
    if (!node) return
    if (node.paused) {
      document.querySelectorAll("video[data-preview-video]").forEach((el) => {
        if (el !== node) (el as HTMLVideoElement).pause()
      })
      node.muted = muted
      node.play().catch(() => setPlaying(false))
    } else {
      node.pause()
    }
  }

  if (!src) return null

  return (
    <div className="overflow-hidden rounded-md border bg-white shadow-sm">
      <div className="relative aspect-[9/16] bg-black">
        <video
          ref={ref}
          data-preview-video=""
          poster={poster}
          playsInline
          preload="metadata"
          muted={muted}
          className="h-full w-full object-contain"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-2">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-900"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMuted((current) => !current)}
            aria-label={muted ? "Unmute" : "Mute"}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-900"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {name && <div className="truncate px-2 py-1 text-xs text-gray-700">{name}</div>}
    </div>
  )
}
