/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef, useState } from "react"
import { ProgressiveImage } from "@/components/shared/ProgressiveImage"
import {
  getConfiguratorThumbnailUrl,
  getConfiguratorResponsivePreviewUrl,
} from "@/lib/utils/configuratorImageUrls"

// Composites a background image + positioned layers inside an aspect-ratio box.
// Mirrors the background-fit logic used across the layer study preview/editor.
export function LayerPreview({
  background,
  layers,
  aspect,
  selectedImageIds = {},
  className = "",
  imageSizing = "preview",
}: {
  background: { secureUrl?: string; previewUrl?: string } | null
  layers: any[]
  aspect: 'portrait' | 'landscape' | 'square'
  selectedImageIds?: Record<string, string>
  className?: string
  /** How large images should be requested: tiny list thumbnail, inline preview, or fullscreen. */
  imageSizing?: 'thumbnail' | 'preview' | 'fullscreen'
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [fit, setFit] = useState<{ left: number; top: number; width: number; height: number }>({ left: 0, top: 0, width: 0, height: 0 })
  const aspectClass = aspect === 'portrait' ? 'aspect-[9/16]' : aspect === 'landscape' ? 'aspect-[16/9]' : 'aspect-square'

  const displayUrl = (rawUrl: string | undefined) =>
    imageSizing === 'thumbnail'
      ? getConfiguratorThumbnailUrl(rawUrl)
      : getConfiguratorResponsivePreviewUrl(rawUrl, imageSizing === 'fullscreen')

  const backgroundRawUrl = background?.secureUrl || background?.previewUrl
  const backgroundDisplayUrl = displayUrl(backgroundRawUrl)
  const backgroundThumbUrl = getConfiguratorThumbnailUrl(backgroundRawUrl)

  useEffect(() => {
    const compute = () => {
      const cw = containerRef.current?.offsetWidth || 0
      const ch = containerRef.current?.offsetHeight || 0
      if (!cw || !ch) return
      const iw = imgRef.current?.naturalWidth || cw
      const ih = imgRef.current?.naturalHeight || ch
      const scale = Math.min(cw / iw, ch / ih)
      const w = iw * scale
      const h = ih * scale
      const left = (cw - w) / 2
      const top = (ch - h) / 2
      setFit({ left, top, width: w, height: h })
    }
    compute()
    const ro = new ResizeObserver(compute)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [aspect, background?.secureUrl, background?.previewUrl, layers.length])

  return (
    <div className={`relative w-full ${aspectClass} max-h-[80vh] max-w-[90vw] mx-auto overflow-hidden bg-slate-50 rounded-lg border ${className}`} ref={containerRef}>
      {backgroundRawUrl && (
        <ProgressiveImage
          thumbUrl={backgroundThumbUrl}
          fullUrl={backgroundDisplayUrl}
          alt="Background"
          loading={imageSizing === 'thumbnail' ? 'lazy' : 'eager'}
          wrapperClassName="absolute inset-0"
          wrapperStyle={{ zIndex: 0 }}
          imgClassName="w-full h-full object-contain"
          imgRef={imgRef}
          onLoad={() => {
            const cw = containerRef.current?.offsetWidth || 0
            const ch = containerRef.current?.offsetHeight || 0
            const iw = imgRef.current?.naturalWidth || cw
            const ih = imgRef.current?.naturalHeight || ch
            const scale = Math.min(cw / iw, ch / ih)
            const w = iw * scale
            const h = ih * scale
            const left = (cw - w) / 2
            const top = (ch - h) / 2
            setFit({ left, top, width: w, height: h })
          }}
        />
      )}
      <div className="absolute overflow-hidden" style={{ left: fit.left, top: fit.top, width: fit.width || '100%', height: fit.height || '100%', zIndex: 1 }}>
        {layers.map((l: any) => {
          if (l.visible === false) return null
          const selectedImageId = selectedImageIds[l.id]
          if (!selectedImageId) return null
          const base = l.images?.find((img: any) => img.id === selectedImageId)

          if (!base) return null
          const widthPct = Math.max(1, Math.min(100, Number(base.width ?? 100)))
          const heightPct = Math.max(1, Math.min(100, Number(base.height ?? 100)))
          const leftPct = Math.max(0, Math.min(100 - widthPct, Number(base.x ?? 0)))
          const topPct = Math.max(0, Math.min(100 - heightPct, Number(base.y ?? 0)))
          const displayWidth = (widthPct / 100) * fit.width
          const displayHeight = (heightPct / 100) * fit.height
          const leftPx = (leftPct / 100) * fit.width
          const topPx = (topPct / 100) * fit.height
          const layerRawUrl = base.secureUrl || base.previewUrl
          return (
            <ProgressiveImage
              key={l.id}
              thumbUrl={getConfiguratorThumbnailUrl(layerRawUrl)}
              fullUrl={displayUrl(layerRawUrl)}
              alt={l.name}
              loading={imageSizing === 'thumbnail' ? 'lazy' : 'eager'}
              wrapperClassName="absolute"
              wrapperStyle={{
                zIndex: l.z ?? 0,
                top: topPx,
                left: leftPx,
                width: displayWidth,
                height: displayHeight,
              }}
              imgClassName="w-full h-full object-contain"
            />
          )
        })}
      </div>
    </div>
  )
}
