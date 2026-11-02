import React from "react"
import { createRoot } from "react-dom/client"
import { EXPORT_IMAGE_TOKEN_PREFIX } from "@/lib/export/embedExportImages"
import { ExportConfiguratorRoot, type ExportConfiguratorPayload } from "@/lib/export/ExportConfiguratorRoot"

declare global {
  interface Window {
    __DESIGN_CONFIGURATOR_EXPORT__?: ExportConfiguratorPayload
  }
}

function dataUrlToBlobUrl(dataUrl: string): string {
  try {
    const comma = dataUrl.indexOf(",")
    if (comma < 0) return dataUrl
    const mime = /data:([^;,]+)/i.exec(dataUrl.slice(0, comma))?.[1] || "image/webp"
    const binary = atob(dataUrl.slice(comma + 1))
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return URL.createObjectURL(new Blob([bytes], { type: mime }))
  } catch {
    return dataUrl
  }
}

function hydrateImages(value: unknown, lookup: Map<string, string>): unknown {
  if (typeof value === "string") {
    if (!value.startsWith(EXPORT_IMAGE_TOKEN_PREFIX)) return value
    return lookup.get(value.slice(EXPORT_IMAGE_TOKEN_PREFIX.length)) || value
  }
  if (Array.isArray(value)) return value.map((item) => hydrateImages(item, lookup))
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      next[key] = hydrateImages(item, lookup)
    }
    return next
  }
  return value
}

function hydratePayload(payload: ExportConfiguratorPayload): ExportConfiguratorPayload {
  const table = payload.offline?.images
  if (!table || Object.keys(table).length === 0) return payload
  const lookup = new Map<string, string>()
  for (const [id, dataUrl] of Object.entries(table)) lookup.set(id, dataUrlToBlobUrl(dataUrl))
  const offline = payload.offline
  return {
    ...payload,
    analysisData: hydrateImages(payload.analysisData, lookup),
    studyLayers: hydrateImages(payload.studyLayers, lookup) as ExportConfiguratorPayload["studyLayers"],
    savedDesigns: hydrateImages(payload.savedDesigns, lookup) as ExportConfiguratorPayload["savedDesigns"],
    designCategories: hydrateImages(payload.designCategories, lookup) as ExportConfiguratorPayload["designCategories"],
    offline: offline
      ? {
          ...offline,
          study: hydrateImages(offline.study, lookup) as NonNullable<ExportConfiguratorPayload["offline"]>["study"],
          images: undefined,
        }
      : offline,
  }
}

function readPayload(): ExportConfiguratorPayload | null {
  const node = document.getElementById("export-data")
  if (node?.textContent) {
    return hydratePayload(JSON.parse(node.textContent) as ExportConfiguratorPayload)
  }
  return window.__DESIGN_CONFIGURATOR_EXPORT__ ? hydratePayload(window.__DESIGN_CONFIGURATOR_EXPORT__) : null
}

const mountNode = document.getElementById("export-root")
let payload: ExportConfiguratorPayload | null = null
try {
  payload = readPayload()
} catch {
  payload = null
}

if (!payload || !mountNode) {
  if (mountNode) {
    mountNode.innerHTML =
      '<div style="padding:24px;color:#991b1b;background:#fef2f2;border:1px solid #fecaca;border-radius:16px;">Failed to load analytics export payload.</div>'
  }
} else {
  createRoot(mountNode).render(
    <React.StrictMode>
      <ExportConfiguratorRoot payload={payload} />
    </React.StrictMode>
  )
}
