"use client"

import { useRef, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

/** A task-generation preview: one reel at a time, with free vertical review. */
export function VideoTaskPreview({ urls }: { urls: string[] }) {
  const clips = urls.filter(Boolean)
  const feedRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [fitByIndex, setFitByIndex] = useState<Record<number, "object-cover" | "object-contain">>({})

  const move = (direction: -1 | 1) => {
    const feed = feedRef.current
    if (!feed) return
    const next = Math.max(0, Math.min(clips.length - 1, activeIndex + direction))
    feed.scrollTo({ top: next * feed.clientHeight, behavior: "smooth" })
  }

  if (clips.length === 0) {
    return <div className="flex h-[min(70vh,520px)] items-center justify-center bg-gray-100 text-sm text-gray-500">No videos assigned to this task.</div>
  }

  return (
    <div className="relative flex justify-center overflow-hidden bg-gray-100 p-3 sm:p-4">
      <div className="relative h-[min(70vh,520px)] w-full max-w-[293px] overflow-hidden bg-black">
        <div
          ref={feedRef}
          onScroll={(event) => {
            const feed = event.currentTarget
            setActiveIndex(Math.max(0, Math.min(clips.length - 1, Math.round(feed.scrollTop / Math.max(feed.clientHeight, 1)))))
          }}
          className="h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-contain bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          aria-label="Video task preview. Scroll vertically to review this task’s videos."
        >
          {clips.map((url, index) => (
            <section key={`${url}-${index}`} className="flex h-full w-full snap-start snap-always items-center justify-center bg-black">
              {Math.abs(index - activeIndex) <= 1 ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={url}
                  controls
                  playsInline
                  preload={index === activeIndex ? "metadata" : "none"}
                  className={`h-full w-full ${fitByIndex[index] || "object-cover"}`}
                  onLoadedMetadata={(event) => {
                    const video = event.currentTarget
                    setFitByIndex((current) => ({
                      ...current,
                      [index]: video.videoWidth > video.videoHeight ? "object-contain" : "object-cover",
                    }))
                  }}
                />
              ) : (
                <div className="h-full w-full bg-black" aria-hidden="true" />
              )}
            </section>
          ))}
        </div>

        <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-2">
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={activeIndex === 0}
            aria-label="Previous video in task"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/55 text-white shadow disabled:opacity-35"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={activeIndex >= clips.length - 1}
            aria-label="Next video in task"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/55 text-white shadow disabled:opacity-35"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
          Video {activeIndex + 1} of {clips.length}
        </div>
      </div>
    </div>
  )
}
