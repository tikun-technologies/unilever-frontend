import React from "react"
import { createRoot } from "react-dom/client"
import { ExportConfiguratorRoot, type ExportConfiguratorPayload } from "@/lib/export/ExportConfiguratorRoot"

declare global {
  interface Window {
    __DESIGN_CONFIGURATOR_EXPORT__?: ExportConfiguratorPayload
  }
}

const payload = window.__DESIGN_CONFIGURATOR_EXPORT__
const mountNode = document.getElementById("export-root")

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
