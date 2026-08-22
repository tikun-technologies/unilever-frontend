"use client"

import React, { useState, useMemo, useEffect } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { ChevronDown, RefreshCw, X, Layers } from "lucide-react"

type Metric = "Top Down" | "Bottom Up" | "Response Time"

const METRICS: Metric[] = ["Top Down", "Bottom Up", "Response Time"]
const SEGMENTS = ["Overall", "Male", "Female", "13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"]

type LayerOption = {
  id: string
  name: string
  image: string
}

type Layer = {
  id: string
  name: string
  zIndex: number
  options: LayerOption[]
}

const CONFIG_BASE = "/landing-page/configurator"

/** Winning mink pack from the story — used by Best Mix. */
const BEST_MIX: Record<string, string> = {
  bottle: "bottle-mink",
  element: "element-flame",
  product: "product-shampoo",
  proposition: "proposition-revives",
  pump: "pump-A-light",
}

function titleCase(name: string) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function optionsFor(folder: string, names: string[]): LayerOption[] {
  return names.map((name) => ({
    id: `${folder}-${name}`,
    name: titleCase(name),
    image: `${CONFIG_BASE}/${folder}/${name}.webp`,
  }))
}

const LAYERS: Layer[] = [
  {
    id: "bottle",
    name: "Bottle",
    zIndex: 1,
    options: optionsFor("bottle", [
      "blush",
      "chalk",
      "clear",
      "hazy",
      "honey",
      "ivory",
      "khaki",
      "light-teal",
      "Lilac",
      "mauve",
      "mink",
      "parrot",
      "periwinkle",
      "powder",
      "rosewood",
      "sage",
      "slate",
      "steel",
      "taupe",
      "teal",
      "terracotta",
    ]),
  },
  {
    id: "element",
    name: "Element",
    zIndex: 2,
    options: optionsFor("element", [
      "air",
      "branch",
      "clock",
      "diamond",
      "drop",
      "flame",
      "gear",
      "hourglass",
      "ice",
      "leaf",
      "leaves",
      "mineral",
      "mountain",
      "polaris",
      "shine",
      "splash",
      "waves",
      "wind",
    ]),
  },
  {
    id: "product",
    name: "Product",
    zIndex: 3,
    options: optionsFor("product", ["bodywash", "deodorant", "handwash", "moisturiser", "shampoo"]),
  },
  {
    id: "proposition",
    name: "Proposition",
    zIndex: 4,
    options: optionsFor("proposition", [
      "adapts",
      "biohacks",
      "cares",
      "cleanses",
      "comforts",
      "ferments",
      "freshens",
      "hydrates",
      "lasts",
      "nourishes",
      "personalises",
      "protects",
      "rebalances",
      "recalibrates",
      "regenerates",
      "renews",
      "repairs",
      "reprograms",
      "restores",
      "revives",
      "softens",
      "soothes",
      "synchronises",
      "uplifts",
    ]),
  },
  {
    id: "pump",
    name: "Pump",
    zIndex: 5,
    options: optionsFor("pump", [
      "A-dark",
      "A-light",
      "A-neutral",
      "B-dark",
      "B-light",
      "B-neutral",
      "C-dark",
      "C-light",
      "C-neutral",
      "D-dark",
      "D-light",
      "D-neutral",
      "E-dark",
      "E-light",
      "E-neutral",
      "F-dark",
      "F-light",
      "F-neutral",
      "G-dark",
      "G-light",
      "G-neutral",
      "G-neutral-wide",
    ]),
  },
]

function hashSeed(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function getCoefficient(optionId: string, metric: Metric, segment: string): number {
  const seed = hashSeed(`${optionId}|${metric}|${segment}`)
  if (metric === "Response Time") {
    return (seed % 1001) / 1000
  }
  return (seed % 12) - 2
}

function formatCoefficient(value: number, metric: Metric): string {
  if (metric === "Response Time") return value.toFixed(3)
  return value > 0 ? `+${value}` : `${value}`
}

function formatTotal(value: number, metric: Metric): string {
  if (metric === "Response Time") return value.toFixed(3)
  return value > 0 ? `+${value}` : `${value}`
}

function MetricSegmentControls({
  activeMetric,
  activeSegment,
  onMetricChange,
  onSegmentChange,
}: {
  activeMetric: Metric
  activeSegment: string
  onMetricChange: (metric: Metric) => void
  onSegmentChange: (segment: string) => void
}) {
  return (
    <>
      <div className="flex bg-slate-100/80 p-1 rounded-xl">
        {METRICS.map((metric) => (
          <button
            key={metric}
            type="button"
            onClick={() => onMetricChange(metric)}
            className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeMetric === metric
                ? "bg-white text-[#1a5f96] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {metric}
          </button>
        ))}
      </div>

      <div className="relative">
        <select
          value={activeSegment}
          onChange={(e) => onSegmentChange(e.target.value)}
          className="appearance-none cursor-pointer bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1a5f96]/20 shadow-sm"
        >
          {SEGMENTS.map((seg) => (
            <option key={seg} value={seg}>
              {seg}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
    </>
  )
}

function LayersPanel({
  activeMetric,
  activeSegment,
  selections,
  expandedLayer,
  onToggleLayer,
  onSelect,
}: {
  activeMetric: Metric
  activeSegment: string
  selections: Record<string, string>
  expandedLayer: string | null
  onToggleLayer: (layerId: string) => void
  onSelect: (layerId: string, optionId: string) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
      {LAYERS.map((layer) => {
        const isExpanded = expandedLayer === layer.id
        const selectedOptionId = selections[layer.id]
        const selectedOption = layer.options.find((o) => o.id === selectedOptionId)

        return (
          <div key={layer.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white transition-all">
            <button
              type="button"
              onClick={() => onToggleLayer(layer.id)}
              className="w-full flex cursor-pointer items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col items-start">
                <span className="font-semibold text-slate-900">{layer.name}</span>
                <span className="text-xs text-slate-500 mt-0.5">
                  {layer.options.length} options • z-index {layer.zIndex}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {selectedOption && (
                  <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                    Selected
                  </span>
                )}
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/30">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                  {layer.options.map((option) => {
                    const isSelected = selectedOptionId === option.id
                    const coefficient = getCoefficient(option.id, activeMetric, activeSegment)
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onSelect(layer.id, option.id)}
                        className={`relative flex cursor-pointer flex-col items-center p-3 rounded-xl border transition-all ${
                          isSelected
                            ? "border-[#1a5f96] bg-[#1a5f96]/5 ring-1 ring-[#1a5f96]/20"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="relative w-full aspect-square mb-3 bg-slate-100/50 rounded-lg overflow-hidden">
                          <Image src={option.image} alt={option.name} fill className="object-contain p-2" />
                        </div>
                        <span className="text-xs font-medium text-slate-700 text-center line-clamp-1 w-full">
                          {option.name}
                        </span>
                        <span
                          className={`text-[10px] font-semibold mt-1 tabular-nums ${
                            coefficient > 0
                              ? "text-emerald-600"
                              : coefficient < 0
                                ? "text-rose-600"
                                : "text-slate-500"
                          }`}
                        >
                          {formatCoefficient(coefficient, activeMetric)}
                        </span>
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
  )
}

export function LandingDesignConfigurator() {
  const [activeMetric, setActiveMetric] = useState<Metric>("Top Down")
  const [activeSegment, setActiveSegment] = useState("Overall")
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [expandedLayer, setExpandedLayer] = useState<string | null>("bottle")
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!isMobileDrawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [isMobileDrawerOpen])

  const handleSelect = (layerId: string, optionId: string) => {
    setSelections((prev) => ({
      ...prev,
      [layerId]: prev[layerId] === optionId ? "" : optionId,
    }))
  }

  const handleToggleLayer = (layerId: string) => {
    setExpandedLayer((current) => (current === layerId ? null : layerId))
  }

  const handleClear = () => {
    setSelections({})
  }

  const handleBestMix = () => {
    setSelections({ ...BEST_MIX })
  }

  const totalCoefficient = useMemo(() => {
    let total = 0
    Object.entries(selections).forEach(([layerId, optionId]) => {
      if (!optionId) return
      const layer = LAYERS.find((l) => l.id === layerId)
      const option = layer?.options.find((o) => o.id === optionId)
      if (option) {
        total += getCoefficient(option.id, activeMetric, activeSegment)
      }
    })
    return total
  }, [selections, activeMetric, activeSegment])

  const selectedCount = Object.values(selections).filter(Boolean).length

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      {/* Desktop header */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-x-8 lg:mb-8">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-8 bg-[#1a5f96] rounded-full" />
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Play with our design configurator</h2>
          </div>
          <p className="text-slate-500 max-w-xl">
            Combine winning layer assets and preview the total coefficient.
          </p>
        </div>

        <div className="lg:col-span-7 flex flex-wrap items-end justify-end gap-3 self-end pb-1">
          <MetricSegmentControls
            activeMetric={activeMetric}
            activeSegment={activeSegment}
            onMetricChange={setActiveMetric}
            onSegmentChange={setActiveSegment}
          />
        </div>
      </div>

      {/* Mobile header */}
      <div className="mb-10 lg:hidden">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1.5 h-8 bg-[#1a5f96] rounded-full" />
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Play with our design configurator</h2>
        </div>
        <p className="text-slate-500 max-w-xl mb-6">
          Combine winning layer assets and preview the total coefficient.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <MetricSegmentControls
            activeMetric={activeMetric}
            activeSegment={activeSegment}
            onMetricChange={setActiveMetric}
            onSegmentChange={setActiveSegment}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Preview */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="inline-flex h-11 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#1a5f96] px-4 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:bg-[#155a8a] active:scale-[0.98] lg:hidden"
          >
            <Layers className="h-4 w-4" />
            Select Elements
          </button>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[600px]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="text-sm font-medium text-slate-500">Preview</div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleBestMix}
                  className="cursor-pointer text-sm font-medium text-[#1a5f96] hover:text-[#155a8a] flex items-center gap-1.5"
                >
                  <SparklesIcon className="h-4 w-4" /> Best Mix
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
                >
                  <RefreshCw className="h-4 w-4" /> Clear
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-slate-50/30 flex items-center justify-center overflow-hidden p-8">
              <div className="relative w-full h-full max-w-[300px]">
                <Image
                  src={`${CONFIG_BASE}/background.webp`}
                  alt="Background"
                  fill
                  className="object-contain"
                  priority
                />
                {LAYERS.map((layer) => {
                  const selectedId = selections[layer.id]
                  if (!selectedId) return null
                  const option = layer.options.find((o) => o.id === selectedId)
                  if (!option) return null

                  return (
                    <Image
                      key={layer.id}
                      src={option.image}
                      alt={option.name}
                      fill
                      className="object-contain"
                      style={{ zIndex: layer.zIndex }}
                    />
                  )
                })}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white flex items-end justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Total Coefficient
                </div>
                <div className="text-sm font-medium text-slate-600">
                  {activeMetric} · {activeSegment}
                </div>
              </div>
              <div className="text-4xl font-bold text-slate-900 tabular-nums">
                {formatTotal(totalCoefficient, activeMetric)}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop layers panel */}
        <div className="hidden lg:block lg:col-span-7">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">Layers</h3>
            </div>
            <LayersPanel
              activeMetric={activeMetric}
              activeSegment={activeSegment}
              selections={selections}
              expandedLayer={expandedLayer}
              onToggleLayer={handleToggleLayer}
              onSelect={handleSelect}
            />
          </div>
        </div>
      </div>

      {/* Mobile slide-in drawer */}
      {mounted && isMobileDrawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-[210] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 cursor-pointer bg-black/35"
              aria-label="Close element selector"
              onClick={() => setIsMobileDrawerOpen(false)}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Select design elements"
              className="absolute right-0 top-0 flex h-full w-[min(92vw,420px)] flex-col overflow-hidden rounded-l-3xl bg-white shadow-2xl"
            >
              <div className="border-b border-slate-100 bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Select Elements</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {selectedCount} selected · {LAYERS.length} layers
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                    aria-label="Close element selector"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <LayersPanel
                activeMetric={activeMetric}
                activeSegment={activeSegment}
                selections={selections}
                expandedLayer={expandedLayer}
                onToggleLayer={handleToggleLayer}
                onSelect={handleSelect}
              />

              <div className="border-t border-slate-100 bg-white p-4">
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#1a5f96] text-sm font-bold text-white"
                >
                  Done
                </button>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </div>
  )
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  )
}
