"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, ChevronDown, Gauge, ImageIcon, Layers, RotateCcw, Sparkles, Type, X } from "lucide-react"

type Metric = "Top Down" | "Bottom Up" | "Response Time"

type ConfiguratorElement = {
  id: string
  name: string
  category: string
  value: number
  imageUrl?: string | null
  content?: string | null
  elementType?: string
  zIndex: number
  transform?: { x: number; y: number; width: number; height: number }
}

type ConfiguratorCategory = {
  name: string
  code?: string
  zIndex: number
  elements: ConfiguratorElement[]
}

type SegmentOption = {
  id: string
  label: string
  sectionKey: string
  valueKey?: string
}

const METRIC_OPTIONS: { value: Metric; label: string; description: string }[] = [
  { value: "Top Down", label: "Top Down", description: "Conscious preference" },
  { value: "Bottom Up", label: "Bottom Up", description: "Implicit lift" },
  { value: "Response Time", label: "Response Time", description: "Decision speed" },
]

const METRIC_KEYS: Record<Metric, string> = {
  "Top Down": "(T) Overall",
  "Bottom Up": "(B) Overall",
  "Response Time": "(R) Overall",
}

const METRIC_PREFIX: Record<Metric, string> = {
  "Top Down": "(T)",
  "Bottom Up": "(B)",
  "Response Time": "(R)",
}

const MAX_NON_LAYER_SELECTIONS = 4
const AGE_SEGMENTS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"]

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value)
}

function getBackgroundUrl(analysisData: any): string | null {
  const info = analysisData?.["Information Block"] || {}
  const candidates = [
    info["Study Background"],
    info.background_image_url,
    info.Background,
    info.metadata?.background_image_url,
    analysisData?.background_image_url,
    analysisData?.metadata?.background_image_url,
  ]
  return candidates.find(isHttpUrl) || null
}

function getElementKey(category: string, elementName: string): string {
  return `${category}::${elementName}`
}

function getSegmentId(sectionKey: string, valueKey?: string): string {
  return valueKey ? `${sectionKey}::${valueKey}` : sectionKey
}

function formatSegmentLabel(valueKey: string): string {
  const mindsetMatch = valueKey.match(/^Mindset_(\d+)_of_\d+$/)
  if (mindsetMatch) return `Mindset ${mindsetMatch[1]}`
  return valueKey.replace(/_/g, " ")
}

function addSegmentOption(options: SegmentOption[], option: Omit<SegmentOption, "id">) {
  const id = getSegmentId(option.sectionKey, option.valueKey)
  if (options.some((existing) => existing.id === id || existing.label === option.label)) return
  options.push({ ...option, id })
}

function getAvailableSegmentOptions(analysisData: any, metric: Metric): SegmentOption[] {
  const prefix = METRIC_PREFIX[metric]
  const options: SegmentOption[] = []

  addSegmentOption(options, {
    label: "Overall",
    sectionKey: `${prefix} Overall`,
  })

  const genderSection = analysisData?.[`${prefix} Gender`]
  for (const key of Object.keys(genderSection?.segments || {})) {
    addSegmentOption(options, {
      label: key,
      sectionKey: `${prefix} Gender`,
      valueKey: key,
    })
  }

  const ageSection = analysisData?.[`${prefix} Age`]
  const ageKeys = Array.from(new Set([...AGE_SEGMENTS, ...Object.keys(ageSection?.segments || {})])).sort((a, b) => {
    const aNum = Number.parseInt(a, 10)
    const bNum = Number.parseInt(b, 10)
    if (Number.isNaN(aNum) || Number.isNaN(bNum)) return a.localeCompare(b)
    return aNum - bNum
  })
  if (ageSection) {
    for (const key of ageKeys) {
      addSegmentOption(options, {
        label: key,
        sectionKey: `${prefix} Age`,
        valueKey: key,
      })
    }
  }

  const mindsetSection = analysisData?.[`${prefix} Mindsets`]
  const mindsetGroup = mindsetSection?.groups?.Mindset_3 || mindsetSection?.groups?.Mindset_2 || {}
  const mindsetKeys = Object.keys(mindsetGroup).sort()
  for (const key of mindsetKeys) {
    addSegmentOption(options, {
      label: formatSegmentLabel(key),
      sectionKey: `${prefix} Mindsets`,
      valueKey: key,
    })
  }

  return options
}

function getInfoCategories(analysisData: any): any[] {
  const info = analysisData?.["Information Block"] || {}
  const candidates = [
    info.Categories,
    info.categories,
    info.Layers,
    info.layers,
    info["Study Layers"],
    info.study_layers,
    analysisData?.study_layers,
  ]
  const match = candidates.find((candidate) => Array.isArray(candidate) && candidate.length > 0)
  return Array.isArray(match) ? match : []
}

function getRawElements(category: any): any[] {
  const candidates = [
    category?.elements,
    category?.Elements,
    category?.images,
    category?.Images,
    category?.options,
  ]
  const match = candidates.find((candidate) => Array.isArray(candidate) && candidate.length > 0)
  return Array.isArray(match) ? match : []
}

function pickElementImage(element: any): string | null {
  const candidates = [
    element?.content,
    element?.url,
    element?.imageUrl,
    element?.imageLink,
    element?.image,
    element?.secureUrl,
    element?.previewUrl,
  ]
  return candidates.find(isHttpUrl) || null
}

function pickTransform(element: any): ConfiguratorElement["transform"] | undefined {
  const transform = element?.transform || element?.position || element?.metadata?.transform
  if (!transform || typeof transform !== "object") return undefined
  return {
    x: toNumber(transform.x, 0),
    y: toNumber(transform.y, 0),
    width: toNumber(transform.width, 100),
    height: toNumber(transform.height, 100),
  }
}

function getScoreMap(analysisData: any, metric: Metric, segment: SegmentOption): Map<string, { value: number; code?: string }> {
  const section = analysisData?.[segment?.sectionKey || METRIC_KEYS[metric]]
  const scoreMap = new Map<string, { value: number; code?: string }>()

  for (const category of section?.categories || []) {
    const categoryName = normalizeText(category?.name)
    for (const element of category?.elements || []) {
      const name = normalizeText(element?.name)
      if (!categoryName || !name) continue
      scoreMap.set(getElementKey(categoryName, name), {
        value: segment?.valueKey ? toNumber(element?.values?.[segment.valueKey], 0) : toNumber(element?.value, 0),
        code: normalizeText(element?.code) || undefined,
      })
    }
  }

  return scoreMap
}

function getCategoriesForMetric(analysisData: any, metric: Metric, segment: SegmentOption): ConfiguratorCategory[] {
  const infoCategories = getInfoCategories(analysisData)
  const scoreMap = getScoreMap(analysisData, metric, segment)

  if (!Array.isArray(infoCategories) || infoCategories.length === 0) {
    const section = analysisData?.[segment?.sectionKey || METRIC_KEYS[metric]]
    return (section?.categories || [])
      .map((category: any, categoryIndex: number) => {
        const categoryName = normalizeText(category?.name) || `Category ${categoryIndex + 1}`
        const zIndex = toNumber(category?.z_index ?? category?.z ?? categoryIndex + 1, categoryIndex + 1)
      const elements = getRawElements(category).map((element: any, elementIndex: number) => ({
          id: getElementKey(categoryName, normalizeText(element?.name) || `Element ${elementIndex + 1}`),
          name: normalizeText(element?.name) || `Element ${elementIndex + 1}`,
          category: categoryName,
          value: segment?.valueKey ? toNumber(element?.values?.[segment.valueKey], 0) : toNumber(element?.value, 0),
          imageUrl: pickElementImage(element),
          content: normalizeText(element?.content) || null,
          elementType: normalizeText(element?.element_type ?? element?.elementType),
          zIndex,
          transform: pickTransform(element),
        }))

        return { name: categoryName, code: normalizeText(category?.code) || undefined, zIndex, elements }
      })
      .filter((category: ConfiguratorCategory) => category.elements.length > 0)
  }

  return infoCategories
    .map((category: any, categoryIndex: number) => {
      const categoryName = normalizeText(category?.name) || normalizeText(category?.title) || `Category ${categoryIndex + 1}`
      const zIndex = toNumber(category?.z_index ?? category?.z ?? categoryIndex + 1, categoryIndex + 1)
      const elements = getRawElements(category).map((element: any, elementIndex: number) => {
        const name = normalizeText(element?.name) || normalizeText(element?.alt_text) || `Element ${elementIndex + 1}`
        const score = scoreMap.get(getElementKey(categoryName, name))
        const elementType = normalizeText(element?.element_type ?? element?.elementType)
        const imageUrl = elementType.toLowerCase() === "text" ? null : pickElementImage(element)

        return {
          id: getElementKey(categoryName, name),
          name,
          category: categoryName,
          value: score?.value ?? 0,
          imageUrl,
          content: normalizeText(element?.content) || null,
          elementType,
          zIndex: toNumber(element?.z_index ?? element?.z ?? category?.z_index ?? category?.z ?? zIndex, zIndex),
          transform: pickTransform(element),
        }
      })

      return {
        name: categoryName,
        code: normalizeText(category?.code) || undefined,
        zIndex,
        elements,
      }
    })
    .filter((category: ConfiguratorCategory) => category.elements.length > 0)
}

function buildDefaultSelection(categories: ConfiguratorCategory[], isLayerStudy: boolean): Record<string, string> {
  const selected: Record<string, string> = {}
  const rankedCategories = [...categories]
    .map((category) => ({
      category,
      best: [...category.elements].sort((a, b) => b.value - a.value)[0],
    }))
    .filter((item) => item.best)
    .sort((a, b) => {
      if (isLayerStudy) return a.category.zIndex - b.category.zIndex
      return b.best.value - a.best.value
    })

  const limit = isLayerStudy ? rankedCategories.length : MAX_NON_LAYER_SELECTIONS
  rankedCategories.slice(0, limit).forEach(({ category, best }) => {
    selected[category.name] = best.id
  })

  return selected
}

function formatValue(value: number, metric: Metric): string {
  if (!Number.isFinite(value)) return "0"
  if (metric === "Response Time") return Math.abs(value) < 1 ? value.toFixed(3) : value.toFixed(1)
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function SelectionPreview({
  selectedElements,
  studyType,
  backgroundUrl,
}: {
  selectedElements: ConfiguratorElement[]
  studyType: string
  backgroundUrl: string | null
}) {
  const isLayerStudy = studyType === "layer"

  if (selectedElements.length === 0 && (!isLayerStudy || !backgroundUrl)) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center">
        <div className="px-6">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-[#2674BA]/50" />
          <p className="text-sm font-semibold text-gray-700">Choose elements to build a preview</p>
          <p className="mt-1 text-xs text-gray-500">Your combined coefficient will update live.</p>
        </div>
      </div>
    )
  }

  if (isLayerStudy) {
    const sorted = [...selectedElements].sort((a, b) => a.zIndex - b.zIndex)
    return (
      <div className="relative mx-auto aspect-square min-h-[320px] w-full max-w-xl overflow-hidden rounded-2xl border border-gray-100 bg-[radial-gradient(circle_at_top,#eef6ff,transparent_55%),#f8fafc] shadow-inner">
        {backgroundUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundUrl}
            alt="Background"
            className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
            style={{ zIndex: 0 }}
            onError={(event) => {
              event.currentTarget.style.display = "none"
            }}
          />
        ) : (
          <div className="absolute inset-6 rounded-xl border border-dashed border-blue-100 bg-white/50" />
        )}
        <div className="absolute inset-0 overflow-hidden">
          {sorted.map((element) => {
            const transform = element.transform || { x: 0, y: 0, width: 100, height: 100 }
            const widthPct = Math.max(1, Math.min(100, transform.width))
            const heightPct = Math.max(1, Math.min(100, transform.height))
            const leftPct = Math.max(0, Math.min(100 - widthPct, transform.x))
            const topPct = Math.max(0, Math.min(100 - heightPct, transform.y))

            if (!element.imageUrl) {
              return (
                <div
                  key={element.id}
                  className="absolute flex items-center justify-center rounded-lg border border-white/70 bg-white/80 p-3 text-center text-xs font-semibold text-gray-700 shadow-sm"
                  style={{
                    zIndex: Math.max(1, element.zIndex),
                    top: `${topPct}%`,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                  }}
                >
                  {element.name}
                </div>
              )
            }

            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={element.id}
                src={element.imageUrl}
                alt={element.name}
                className="absolute object-contain drop-shadow-sm"
                style={{
                  zIndex: Math.max(1, element.zIndex),
                  top: `${topPct}%`,
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
                onError={(event) => {
                  event.currentTarget.style.display = "none"
                }}
              />
            )
          })}
        </div>
      </div>
    )
  }

  const count = selectedElements.length
  const gridClass =
    count === 1
      ? "grid-cols-1"
      : count === 2
        ? "grid-cols-2"
        : "grid-cols-2"

  return (
    <div className="relative mx-auto flex min-h-[320px] w-full max-w-xl items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-[radial-gradient(circle_at_top,#eef6ff,transparent_55%),#ffffff] p-4 shadow-inner">
      {backgroundUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundUrl}
          alt="Background"
          className="absolute inset-0 h-full w-full object-contain opacity-20"
          onError={(event) => {
            event.currentTarget.style.display = "none"
          }}
        />
      )}
      <div className={`relative grid w-full max-w-md ${gridClass} gap-3`}>
        {selectedElements.map((element, index) => {
          const isText = !element.imageUrl || element.elementType?.toLowerCase() === "text"
          return (
            <div
              key={element.id}
              className={`flex min-h-[128px] items-center justify-center overflow-hidden rounded-xl border border-white bg-white/90 p-3 shadow-sm ${
                count === 3 && index === 2 ? "col-span-2 mx-auto w-[calc(50%-0.375rem)]" : ""
              }`}
            >
              {isText ? (
                <div className="text-center">
                  <Type className="mx-auto mb-2 h-5 w-5 text-[#2674BA]" />
                  <p className="text-sm font-semibold leading-snug text-gray-800">{element.content || element.name}</p>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={element.imageUrl || ""}
                  alt={element.name}
                  className="max-h-44 w-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none"
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface AnalyticsDesignConfiguratorProps {
  analysisData: any
  studyType?: string
}

export function AnalyticsDesignConfigurator({
  analysisData,
  studyType = "grid",
}: AnalyticsDesignConfiguratorProps) {
  const normalizedStudyType = (studyType || "grid").toLowerCase()
  const isLayerStudy = normalizedStudyType === "layer"
  const [activeMetric, setActiveMetric] = useState<Metric>("Top Down")
  const segmentOptions = useMemo(
    () => getAvailableSegmentOptions(analysisData || {}, activeMetric),
    [analysisData, activeMetric]
  )
  const [activeSegmentId, setActiveSegmentId] = useState<string>("")
  const activeSegment = useMemo(
    () => segmentOptions.find((segment) => segment.id === activeSegmentId) ?? segmentOptions[0],
    [segmentOptions, activeSegmentId]
  )
  const categories = useMemo(
    () => getCategoriesForMetric(analysisData || {}, activeMetric, activeSegment),
    [analysisData, activeMetric, activeSegment]
  )
  const backgroundUrl = useMemo(() => getBackgroundUrl(analysisData || {}), [analysisData])
  const [selectedByCategory, setSelectedByCategory] = useState<Record<string, string>>({})
  const [showLayerBackground, setShowLayerBackground] = useState(false)

  useEffect(() => {
    if (segmentOptions.length === 0) return
    if (!segmentOptions.some((segment) => segment.id === activeSegmentId)) {
      setActiveSegmentId(segmentOptions[0].id)
    }
  }, [segmentOptions, activeSegmentId])

  const selectedElements = useMemo(
    () =>
      categories
        .map((category) => category.elements.find((element) => element.id === selectedByCategory[category.name]))
        .filter((element): element is ConfiguratorElement => Boolean(element)),
    [categories, selectedByCategory]
  )

  const totalCoefficient = selectedElements.reduce((sum, element) => sum + element.value, 0)
  const selectedCount = selectedElements.length
  const maxSelections = isLayerStudy ? categories.length : MAX_NON_LAYER_SELECTIONS

  const handleSelect = (category: ConfiguratorCategory, element: ConfiguratorElement) => {
    setSelectedByCategory((current) => {
      const next = { ...current }
      const alreadySelected = next[category.name] === element.id

      if (alreadySelected) {
        delete next[category.name]
        return next
      }

      const currentCount = Object.keys(next).length
      if (!isLayerStudy && !next[category.name] && currentCount >= MAX_NON_LAYER_SELECTIONS) {
        return next
      }

      next[category.name] = element.id
      return next
    })
  }

  if (!analysisData || categories.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-8 w-1.5 rounded-full bg-[#2674BA]" />
            <h2 className="text-xl font-bold text-gray-800" style={{ color: "#2674BA" }}>
              Design configurator
            </h2>
          </div>
          <p className="ml-5 text-sm text-gray-500">
            Combine winning {isLayerStudy ? "layer assets" : "elements"} and preview the total coefficient.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-wrap gap-2">
            {METRIC_OPTIONS.map((metric) => (
              <button
                key={metric.value}
                type="button"
                onClick={() => setActiveMetric(metric.value)}
                className={`rounded-xl border px-4 py-2 text-left transition-all ${
                  activeMetric === metric.value
                    ? "border-[#2674BA] bg-[#2674BA] text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-[#2674BA]/40 hover:bg-blue-50"
                }`}
              >
                <span className="block text-sm font-bold">{metric.label}</span>
                <span className={`block text-[11px] ${activeMetric === metric.value ? "text-blue-100" : "text-gray-400"}`}>
                  {metric.description}
                </span>
              </button>
            ))}
          </div>

          <div className="relative min-w-[180px]">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Segment
            </label>
            <select
              value={activeSegment?.id || ""}
              onChange={(event) => setActiveSegmentId(event.target.value)}
              className="h-[46px] w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm font-bold text-gray-800 shadow-sm outline-none transition-colors hover:border-[#2674BA]/50 focus:border-[#2674BA] focus:ring-2 focus:ring-[#2674BA]/15"
            >
              {segmentOptions.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute bottom-3.5 right-3 h-4 w-4 text-gray-500" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.35fr]">
          <div className="border-b border-gray-100 bg-gradient-to-br from-blue-50 via-white to-white p-5 xl:border-b-0 xl:border-r">
            <div className="sticky top-4 space-y-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                {isLayerStudy && (
                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowLayerBackground((current) => !current)}
                      disabled={!backgroundUrl}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                        showLayerBackground
                          ? "border-[#2674BA] bg-[#2674BA] text-white"
                          : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      }`}
                      aria-pressed={showLayerBackground}
                    >
                      <ImageIcon className="h-4 w-4" />
                      Background Image
                    </button>
                  </div>
                )}
                <SelectionPreview
                  selectedElements={selectedElements}
                  studyType={normalizedStudyType}
                  backgroundUrl={isLayerStudy ? (showLayerBackground ? backgroundUrl : null) : backgroundUrl}
                />
              </div>

              <details className="group rounded-xl border border-gray-100 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Selected elements
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-gray-900">
                      {selectedElements.length > 0
                        ? `${selectedElements.length} selected for ${activeSegment?.label || "Overall"}`
                        : "No elements selected"}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-gray-100 px-4 py-3">
                  {selectedElements.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      Pick elements from the category cards to see them here.
                    </p>
                  ) : (
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {selectedElements.map((element) => (
                        <div
                          key={`selected-${element.id}`}
                          className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-gray-800">{element.name}</p>
                            <p className="truncate text-xs text-gray-500">{element.category}</p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-black tabular-nums ${
                              element.value >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            }`}
                          >
                            {element.value >= 0 ? "+" : ""}
                            {formatValue(element.value, activeMetric)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedByCategory((current) => {
                                const next = { ...current }
                                delete next[element.category]
                                return next
                              })
                            }
                            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white hover:text-red-500"
                            aria-label={`Remove ${element.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </details>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <Gauge className="h-4 w-4 text-[#2674BA]" />
                    Total coefficient
                  </div>
                  <p className="mt-2 text-3xl font-black tabular-nums text-gray-900">
                    {formatValue(totalCoefficient, activeMetric)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Selected</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {selectedCount}
                    <span className="text-sm font-semibold text-gray-400"> / {maxSelections || 0}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedByCategory(buildDefaultSelection(categories, isLayerStudy))}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset best mix
                </button>
              </div>

              {!isLayerStudy && selectedCount >= MAX_NON_LAYER_SELECTIONS && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                  Maximum 4 elements can be selected. Remove one to add another category.
                </div>
              )}
            </div>
          </div>

          <div className="max-h-none space-y-4 p-5 xl:max-h-[780px] xl:overflow-y-auto">
            <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {isLayerStudy ? "Select one element per layer" : "Select one element per category"}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {isLayerStudy
                    ? "All selected layers stack by z-index in the preview."
                    : "Grid, text, and hybrid studies support up to 4 selected categories."}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#2674BA] shadow-sm">
                {isLayerStudy ? <Layers className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                {activeMetric}
              </div>
            </div>

            {categories.map((category) => {
              const selectedId = selectedByCategory[category.name]
              return (
                <div key={category.name} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-black text-gray-900">
                        {isLayerStudy ? "Layer" : "Category"}: {category.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {category.elements.length} option{category.elements.length === 1 ? "" : "s"}
                        {isLayerStudy ? ` · z-index ${category.zIndex}` : ""}
                      </p>
                    </div>
                    {selectedId && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Selected
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                    {[...category.elements]
                      .sort((a, b) => b.value - a.value)
                      .map((element) => {
                        const isSelected = selectedId === element.id
                        const disabled =
                          !isLayerStudy &&
                          !isSelected &&
                          !selectedId &&
                          selectedCount >= MAX_NON_LAYER_SELECTIONS
                        const isText = !element.imageUrl || element.elementType?.toLowerCase() === "text"

                        return (
                          <button
                            key={element.id}
                            type="button"
                            onClick={() => handleSelect(category, element)}
                            disabled={disabled}
                            className={`group flex min-h-[116px] gap-3 rounded-xl border p-3 text-left transition-all ${
                              isSelected
                                ? "border-[#2674BA] bg-blue-50 shadow-sm ring-2 ring-[#2674BA]/10"
                                : disabled
                                  ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-55"
                                  : "border-gray-100 bg-white hover:-translate-y-0.5 hover:border-[#2674BA]/40 hover:shadow-md"
                            }`}
                          >
                            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-100">
                              {isText ? (
                                <Type className="h-6 w-6 text-[#2674BA]" />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={element.imageUrl || ""}
                                  alt={element.name}
                                  className="h-full w-full object-contain p-1"
                                  onError={(event) => {
                                    event.currentTarget.style.display = "none"
                                  }}
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="line-clamp-3 text-sm font-bold leading-snug text-gray-800">
                                  {element.name}
                                </p>
                                <span
                                  className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-black tabular-nums ${
                                    element.value >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {element.value >= 0 ? "+" : ""}
                                  {formatValue(element.value, activeMetric)}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-gray-500">
                                {isLayerStudy
                                  ? `Layer stack ${element.zIndex}`
                                  : isText
                                    ? "Text element"
                                    : "Image element"}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.section>
  )
}
