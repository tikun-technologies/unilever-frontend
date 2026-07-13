"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Eye, EyeOff, LayoutTemplate, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LayerPreview } from "@/components/create-study/steps/LayerPreview"
import {
  aspectLabel,
  templateToPreviewModel,
  type LayerTemplate,
  type TemplatePreviewModel,
} from "@/lib/templates/layerTemplates"
import { listPublishedTemplates } from "@/lib/api/templateApi"
import { apiTemplateToLayerTemplate } from "@/lib/templates/templateLayerJson"
import { getConfiguratorThumbnailUrl } from "@/lib/utils/configuratorImageUrls"
import { imageCacheManager } from "@/lib/utils/imageCacheManager"

type Stage = "select" | "preview"

/** Thumbnail URLs for whatever would actually render in a list row (background + each layer's default image). */
function collectTemplateThumbnailUrls(templates: LayerTemplate[]): string[] {
  const urls = new Set<string>()
  templates.forEach((template) => {
    const model = templateToPreviewModel(template)
    const bg = model.background?.secureUrl
    if (bg) urls.add(getConfiguratorThumbnailUrl(bg))
    model.layers.forEach((layer) => {
      const active = layer.images.find((img) => img.id === model.selectedImageIds[layer.id])
      if (active?.secureUrl) urls.add(getConfiguratorThumbnailUrl(active.secureUrl))
    })
  })
  return [...urls]
}

/** Mounts children only once the wrapper scrolls near the viewport, and keeps them mounted after. */
function useInViewOnce(rootMargin = "600px 0px") {
  const ref = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (inView) return
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView, rootMargin])

  return { ref, inView }
}

interface TemplatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  hasExistingLayers: boolean
  onApply: (template: LayerTemplate, mode: "replace" | "append") => void
}

export function TemplatePickerModal({
  isOpen,
  onClose,
  hasExistingLayers,
  onApply,
}: TemplatePickerModalProps) {
  const [stage, setStage] = useState<Stage>("select")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openLayers, setOpenLayers] = useState<Record<string, boolean>>({})
  const [hiddenLayers, setHiddenLayers] = useState<Record<string, boolean>>({})
  const [selectedImageIds, setSelectedImageIds] = useState<Record<string, string>>({})
  const [showFullPreview, setShowFullPreview] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [templates, setTemplates] = useState<LayerTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [selectedId, templates]
  )

  const previewModel = useMemo(() => {
    if (!selected) return null
    const model = templateToPreviewModel(selected)
    return {
      ...model,
      selectedImageIds: { ...model.selectedImageIds, ...selectedImageIds },
      layers: model.layers.map((l) => ({
        ...l,
        visible: !hiddenLayers[l.id],
      })),
    }
  }, [selected, hiddenLayers, selectedImageIds])

  // Reset ephemeral UI when the modal opens/closes
  useEffect(() => {
    if (!isOpen) return
    setStage("select")
    setSelectedId(null)
    setConfirmReplace(false)
    setShowFullPreview(false)
    setOpenLayers({})
    setHiddenLayers({})
    setSelectedImageIds({})
    setLoadError(null)
    setLoadingTemplates(true)
    ;(async () => {
      try {
        const data = await listPublishedTemplates({ sort: "newest", per_page: 100 })
        const parsed = (data.items || []).map(apiTemplateToLayerTemplate)
        setTemplates(parsed)
        // Warm the browser HTTP cache with tiny thumbnails only (not full-res
        // originals) so list rows paint instantly as they scroll into view,
        // without holding decoded bitmaps in memory up front.
        void imageCacheManager.prewarmUrls(collectTemplateThumbnailUrls(parsed), "low", 6)
      } catch (e: any) {
        setLoadError(e?.message || "Failed to load templates")
        setTemplates([])
      } finally {
        setLoadingTemplates(false)
      }
    })()
  }, [isOpen])

  useEffect(() => {
    if (!selected) return
    const model = templateToPreviewModel(selected)
    setSelectedImageIds(model.selectedImageIds)
    setOpenLayers({})
    setHiddenLayers({})
  }, [selected])

  // Lock Step 5 / page scroll while the modal is open (prevents background scroll chaining)
  useEffect(() => {
    if (!isOpen) return
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [isOpen])

  const handleClose = () => {
    setConfirmReplace(false)
    setShowFullPreview(false)
    onClose()
  }

  const handlePickTemplate = (template: LayerTemplate) => {
    setSelectedId(template.id)
    setStage("preview")
  }

  const handleBackToSelect = () => {
    setStage("select")
    setConfirmReplace(false)
    setShowFullPreview(false)
  }

  const handleUseTemplate = () => {
    if (!selected) return
    if (hasExistingLayers) {
      setConfirmReplace(true)
      return
    }
    onApply(selected, "replace")
  }

  const handleConfirmContinue = () => {
    if (!selected) return
    onApply(selected, "replace")
    setConfirmReplace(false)
  }

  const toggleLayerOpen = (layerId: string) => {
    setOpenLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }))
  }

  const toggleLayerVisible = (layerId: string) => {
    setHiddenLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }))
  }

  const selectLayerElement = (layerId: string, imageId: string) => {
    setSelectedImageIds((prev) => ({ ...prev, [layerId]: imageId }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
          />

          <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none p-2 sm:p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 16 }}
              className="pointer-events-auto flex h-[min(92vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="template-picker-title"
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50/60 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  {stage === "preview" && (
                    <button
                      type="button"
                      onClick={handleBackToSelect}
                      className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-200 cursor-pointer"
                      aria-label="Back to templates"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  )}
                  <div className="rounded-lg bg-blue-100 p-2">
                    <LayoutTemplate className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      id="template-picker-title"
                      className="truncate text-base font-semibold text-gray-800 sm:text-lg"
                    >
                      {stage === "select"
                        ? "Select a Template"
                        : selected?.name ?? "Template Preview"}
                    </h3>
                    <p className="hidden text-xs text-gray-500 sm:block">
                      {stage === "select"
                        ? "Choose a starting layout for your layer study"
                        : "Inspect layers, then apply this template"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full p-1.5 transition-colors hover:bg-gray-200 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  {stage === "select" ? (
                    <motion.div
                      key="select"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }}
                      className="h-full overflow-y-auto overscroll-contain"
                    >
                      <TemplateSelectionList
                        templates={templates}
                        loading={loadingTemplates}
                        error={loadError}
                        onSelect={handlePickTemplate}
                      />
                    </motion.div>
                  ) : selected && previewModel ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-full min-h-0 flex-col"
                    >
                      <TemplatePreviewStage
                        template={selected}
                        previewModel={previewModel}
                        openLayers={openLayers}
                        onToggleOpen={toggleLayerOpen}
                        onToggleVisible={toggleLayerVisible}
                        onSelectElement={selectLayerElement}
                        onOpenFullPreview={() => setShowFullPreview(true)}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* Footer — stage 2 only */}
              {stage === "preview" && selected && (
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-3 sm:px-6 sm:py-4">
                  <Button variant="outline" className="cursor-pointer" onClick={handleBackToSelect}>
                    Back
                  </Button>
                  <Button
                    className="bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] cursor-pointer"
                    onClick={handleUseTemplate}
                  >
                    Use This Template
                  </Button>
                </div>
              )}
            </motion.div>
          </div>

          {/* Existing-layers confirmation */}
          <AnimatePresence>
            {confirmReplace && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[110] bg-black/40"
                  onClick={() => setConfirmReplace(false)}
                />
                <div className="fixed inset-0 z-[111] flex items-center justify-center pointer-events-none p-4">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="pointer-events-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                    role="alertdialog"
                    aria-labelledby="replace-layers-title"
                    aria-describedby="replace-layers-desc"
                  >
                    <h4 id="replace-layers-title" className="text-lg font-semibold text-gray-900">
                      Replace current layers?
                    </h4>
                    <p id="replace-layers-desc" className="mt-2 text-sm text-gray-600">
                      Applying this template will replace your current layer configuration. Any
                      existing layer setup will be lost.
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => setConfirmReplace(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] cursor-pointer"
                        onClick={handleConfirmContinue}
                      >
                        Continue
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>

          {/* Fullscreen preview (matches Step 5) */}
          <AnimatePresence>
            {showFullPreview && selected && previewModel && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] flex items-center justify-center p-4"
              >
                <div
                  className="absolute inset-0 bg-black/70"
                  onClick={() => setShowFullPreview(false)}
                />
                <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-800">Preview</div>
                    <Button
                      variant="outline"
                      onClick={() => setShowFullPreview(false)}
                      className="cursor-pointer"
                    >
                      Close
                    </Button>
                  </div>
                  <LayerPreview
                    background={previewModel.background}
                    layers={previewModel.layers}
                    aspect={selected.aspect}
                    selectedImageIds={previewModel.selectedImageIds}
                    imageSizing="fullscreen"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )
}

function TemplateSelectionList({
  templates,
  loading,
  error,
  onSelect,
}: {
  templates: LayerTemplate[]
  loading: boolean
  error: string | null
  onSelect: (template: LayerTemplate) => void
}) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-gray-500">
        Loading templates…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-gray-500">
        <p>{error}</p>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-gray-500">
        No published templates available yet.
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {templates.map((template, index) => (
        <button
          key={template.id}
          type="button"
          onClick={() => onSelect(template)}
          className="group flex w-full cursor-pointer flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-5 sm:px-6 sm:py-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-gray-900 sm:text-lg">
              {index + 1}. {template.name}
            </p>
            {template.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{template.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 font-medium">
                {aspectLabel(template.aspect)}
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 font-medium">
                {template.layers.length} layers
              </span>
            </div>
          </div>

          <div className="mx-auto w-[112px] shrink-0 sm:mx-0 sm:w-[128px]">
            <TemplateRowThumbnail template={template} />
          </div>
        </button>
      ))}
    </div>
  )
}

/**
 * Renders a template's composited thumbnail only once the row scrolls near
 * the viewport (IntersectionObserver), so opening the picker with many
 * published templates doesn't mount dozens of image-heavy previews at once.
 */
function TemplateRowThumbnail({ template }: { template: LayerTemplate }) {
  const { ref, inView } = useInViewOnce()
  const model = useMemo(() => templateToPreviewModel(template), [template])
  const aspectClass =
    template.aspect === "portrait" ? "aspect-[9/16]" : template.aspect === "landscape" ? "aspect-[16/9]" : "aspect-square"

  return (
    <div ref={ref} className="pointer-events-none overflow-hidden rounded-lg border border-gray-200 bg-slate-50 shadow-sm transition-shadow group-hover:shadow-md">
      {inView ? (
        <LayerPreview
          background={model.background}
          layers={model.layers}
          aspect={template.aspect}
          selectedImageIds={model.selectedImageIds}
          imageSizing="thumbnail"
          className="!max-h-none !max-w-none !rounded-none !border-0"
        />
      ) : (
        <div className={`w-full ${aspectClass}`} />
      )}
    </div>
  )
}

function TemplatePreviewStage({
  template,
  previewModel,
  openLayers,
  onToggleOpen,
  onToggleVisible,
  onSelectElement,
  onOpenFullPreview,
}: {
  template: LayerTemplate
  previewModel: TemplatePreviewModel
  openLayers: Record<string, boolean>
  onToggleOpen: (layerId: string) => void
  onToggleVisible: (layerId: string) => void
  onSelectElement: (layerId: string, imageId: string) => void
  onOpenFullPreview: () => void
}) {
  const maxHeightClass =
    template.aspect === "portrait"
      ? "max-h-[48vh] md:max-h-[min(55vh,520px)]"
      : template.aspect === "landscape"
        ? "max-h-[40vh] md:max-h-[min(45vh,420px)]"
        : "max-h-[44vh] md:max-h-[min(50vh,480px)]"

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto overscroll-contain p-4 md:grid-cols-5 md:items-stretch md:overflow-hidden md:p-6">
      {/* Left — preview (Step 5 style) */}
      <div className="flex min-h-0 flex-col rounded-xl bg-white md:col-span-2">
        <LayerPreview
          background={previewModel.background}
          layers={previewModel.layers}
          aspect={template.aspect}
          selectedImageIds={previewModel.selectedImageIds}
          className={maxHeightClass}
        />

        <div className="mt-3 flex w-full items-center justify-between gap-2">
          <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
            {aspectLabel(template.aspect)}
          </span>
          <Button
            variant="outline"
            className="cursor-pointer rounded-full px-4 py-1"
            onClick={onOpenFullPreview}
          >
            Preview
          </Button>
        </div>
      </div>

      {/* Right — read-only accordion; height matches left column on desktop */}
      <div className="flex min-h-0 flex-col md:col-span-3 md:h-full">
        <div className="mb-2 text-xs text-gray-600">
          {template.layers.length} layers · read-only preview · {aspectLabel(template.aspect)}
        </div>
        <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 md:pr-2">
          {template.background && (
            <div className="mb-2 rounded-xl border bg-white p-2">
              <div className="mb-2 text-sm font-semibold text-gray-800">Background (Optional)</div>
              <div className="flex items-center gap-2">
                <div className="h-20 w-20 overflow-hidden rounded-md border bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getConfiguratorThumbnailUrl(template.background.secureUrl)}
                    alt="Background"
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="text-xs text-gray-600">Rendered behind all layers.</div>
              </div>
            </div>
          )}

          {previewModel.layers.map((layer, idx) => {
            const isOpen = Boolean(openLayers[layer.id])
            const isVisible = layer.visible !== false
            const activeImage =
              layer.images.find((img) => img.id === previewModel.selectedImageIds[layer.id]) ??
              layer.images[0]

            return (
              <div key={layer.id} className="rounded-xl border bg-white">
                <div className="flex items-start justify-between gap-2 rounded-t-xl bg-slate-50 px-4 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-gray-700">
                      <span>{layer.name || `Layer ${idx + 1}`}</span>
                      {isVisible && activeImage && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                          <span className="h-4 w-4 flex-shrink-0 overflow-hidden rounded-full border border-blue-100 bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getConfiguratorThumbnailUrl(activeImage.secureUrl)}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-contain"
                            />
                          </span>
                          <span className="max-w-[140px] truncate">{activeImage.name || "Active"}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {layer.images.length} element{layer.images.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleVisible(layer.id)}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border text-gray-600 hover:bg-gray-50"
                      title={isVisible ? "Hide layer" : "Show layer"}
                    >
                      {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      aria-label="Toggle layer"
                      onClick={() => onToggleOpen(layer.id)}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border"
                    >
                      <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>﹀</span>
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="space-y-3 p-4">
                    <div className="text-sm font-medium text-gray-700">
                      Elements ({layer.images.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {layer.images.map((img) => {
                        const isActive = previewModel.selectedImageIds[layer.id] === img.id
                        return (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => onSelectElement(layer.id, img.id)}
                            className={`relative h-14 w-14 cursor-pointer rounded-md border-2 bg-gray-50 transition-colors hover:border-blue-300 ${
                              isActive ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
                            }`}
                            title={img.name}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getConfiguratorThumbnailUrl(img.secureUrl)}
                              alt={img.name}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full rounded-md object-contain"
                            />
                            <div className="absolute inset-x-0 bottom-0 truncate rounded-b-md bg-black/50 px-1 py-0.5 text-center text-[8px] text-white">
                              {img.name}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
