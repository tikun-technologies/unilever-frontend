"use client"

import { useEffect, useRef } from "react"
import type Hls from "hls.js"
import { isHlsUrl, lowQualityHlsUrl, posterFor, prefersNativeHls, prewarmVideoUrls } from "@/lib/utils/videoPrewarm"

export { prewarmVideoUrls }

function AutoVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    node.muted = true
    let hls: Hls | null = null
    let cancelled = false

    const play = () => {
      node.play().catch(() => undefined)
    }

    const native = prefersNativeHls()
    if (!isHlsUrl(src) || native) {
      node.src = native && isHlsUrl(src) ? lowQualityHlsUrl(src) : src
      if (node.readyState >= 2) play()
      else node.addEventListener("loadeddata", play, { once: true })
    } else {
      void import("hls.js").then(({ default: HlsLib }) => {
        if (cancelled || !ref.current || !HlsLib.isSupported()) return
        hls = new HlsLib()
        hls.loadSource(src)
        hls.attachMedia(ref.current)
        hls.on(HlsLib.Events.MANIFEST_PARSED, play)
      })
    }

    return () => {
      cancelled = true
      node.removeEventListener("loadeddata", play)
      hls?.destroy()
    }
  }, [src])

  return (
    <video
      ref={ref}
      poster={posterFor(src)}
      muted
      playsInline
      loop
      autoPlay
      preload="auto"
      className="h-full w-full object-contain bg-black"
    />
  )
}

/** Combined 1–4 videos in one task, same layout idea as the image grid. */
export function VideoTaskGrid({ urls }: { urls: string[] }) {
  const items = urls.filter(Boolean).slice(0, 4)
  if (items.length === 0) return null

  if (items.length === 3) {
    return (
      <div className="grid h-full w-full max-h-full grid-cols-2 grid-rows-2 gap-2">
        {items.slice(0, 2).map((url, index) => (
          <div key={`${url}-${index}`} className="min-h-0 overflow-hidden rounded-md">
            <AutoVideo src={url} />
          </div>
        ))}
        <div className="col-span-2 flex min-h-0 justify-center">
          <div className="h-full w-1/2 min-h-0 overflow-hidden rounded-md">
            <AutoVideo src={items[2]} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`grid h-full w-full max-h-full gap-2 ${items.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {items.map((url, index) => (
        <div key={`${url}-${index}`} className="min-h-0 overflow-hidden rounded-md">
          <AutoVideo src={url} />
        </div>
      ))}
    </div>
  )
}

