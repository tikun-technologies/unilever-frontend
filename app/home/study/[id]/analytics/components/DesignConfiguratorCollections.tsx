"use client"

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  Check,
  ChevronDown,
  Download,
  FolderPlus,
  Folders,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import type { DesignCategoryPayload } from "@/lib/api/StudyAPI"
import type { ComparisonBase } from "@/lib/analytics/reportComparison"

export function reportCombinationPrefix(metric: string): string | null {
  const key = metric.trim().toLowerCase()
  if (key === "top down") return "Top"
  if (key === "bottom up") return "Bottom Up"
  if (key === "response time") return "Fastest"
  return null
}

export function nextReportCombinationName(metric: string, usedNames: Iterable<string>): string | null {
  const prefix = reportCombinationPrefix(metric)
  if (!prefix) return null
  const used = new Set(Array.from(usedNames, (name) => name.trim().toLowerCase()))
  let number = 1
  while (used.has(`${prefix} #${number}`.toLowerCase())) number += 1
  return `${prefix} #${number}`
}

export function reportCombinationSuffix(prefix: string, name: string): string {
  const raw = (name || "").replace(/[\r\n]+/g, " ")
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = raw.match(new RegExp(`^${escaped}(?:[ \\t]+(.*))?$`, "i"))
  if (match) return match[1] ?? ""
  if (raw.trim().toLowerCase() === prefix.toLowerCase()) return ""
  return raw
}

const CHART_COLORS = ["#155E75", "#D4632A", "#0F766E", "#C45C26", "#1D4E89", "#B45309"]
const SAMPLE_HEIGHTS = [0.78, 0.46, 0.9, 0.58, 0.7, 0.4, 0.84, 0.52]

function chosenLegendSegments(bases: ComparisonBase[], selectedKeys: string[]) {
  const selected = new Set(selectedKeys)
  return bases.flatMap((base) => base.segments.filter((segment) => selected.has(segment.key)))
}

function ChartPreview({
  name,
  series,
}: {
  name: string
  series: Array<{ key: string; label: string; base_size: number }>
}) {
  const plotted = series.length >= 1 ? series : []
  const items = plotted.length
    ? plotted.map((segment, index) => ({
        ...segment,
        color: CHART_COLORS[index % CHART_COLORS.length],
        height: SAMPLE_HEIGHTS[index % SAMPLE_HEIGHTS.length],
      }))
    : [{ key: "overall", label: "Overall", base_size: 0, color: CHART_COLORS[0], height: 0.62 }]

  const plotLeft = 28
  const plotRight = 8
  const plotTop = 10
  const plotBottom = 26
  const width = 320
  const height = 188
  const innerW = width - plotLeft - plotRight
  const innerH = height - plotTop - plotBottom
  const gap = items.length > 6 ? 5 : 8
  const barW = Math.min(34, Math.max(10, (innerW * 0.78 - gap * (items.length - 1)) / items.length))
  const groupW = items.length * barW + (items.length - 1) * gap
  const originX = plotLeft + (innerW - groupW) / 2
  const axisLabel = (name || "Combination").trim() || "Combination"

  return (
    <section className="flex min-h-[240px] flex-1 flex-col rounded-2xl border border-[#E7D5DE] bg-[#FFF6F8] p-4" aria-label="Chart preview">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-semibold text-[#1E2D44]">Chart preview</h4>
        <span className="text-xs font-medium text-[#617086]">Sample bars</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-1 min-h-0 w-full flex-1" role="img" aria-label="Preview of the report column chart">
        {[0, 1, 2, 3, 4].map((step) => {
          const y = plotTop + (innerH / 4) * step
          return <line key={step} x1={plotLeft} x2={width - plotRight} y1={y} y2={y} stroke="#E2E2E2" strokeWidth="1" />
        })}
        <line x1={plotLeft} x2={plotLeft} y1={plotTop} y2={plotTop + innerH} stroke="#B9C1CA" />
        <line x1={plotLeft} x2={width - plotRight} y1={plotTop + innerH} y2={plotTop + innerH} stroke="#B9C1CA" />
        <text
          transform={`translate(11 ${plotTop + innerH / 2}) rotate(-90)`}
          textAnchor="middle"
          fill="#1E2D44"
          fontSize="9"
          fontWeight="700"
        >
          Lift above baseline
        </text>
        {items.map((item, index) => {
          const barHeight = Math.max(8, innerH * item.height)
          const x = originX + index * (barW + gap)
          const y = plotTop + innerH - barHeight
          return <rect key={item.key} x={x} y={y} width={barW} height={barHeight} rx="3" fill={item.color} />
        })}
        <text x={plotLeft + innerW / 2} y={height - 6} textAnchor="middle" fill="#617086" fontSize="11" fontWeight="600">
          {axisLabel.length > 28 ? `${axisLabel.slice(0, 27)}…` : axisLabel}
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
        {items.map((item) => (
          <span key={item.key} className="inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-[#1E2D44]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="truncate">{item.label}{item.base_size ? ` (n=${item.base_size})` : ""}</span>
          </span>
        ))}
      </div>
      <p className={`mt-2 text-center text-xs leading-5 ${series.length === 1 ? "font-medium text-amber-700" : "text-[#617086]"}`}>
        {series.length >= 2
          ? "Each selected option is one bar and one legend entry."
          : series.length === 1
            ? "Add one more option to split this into a legend."
            : "Overall is a single bar. Tick two or more options to add a legend."}
      </p>
    </section>
  )
}

function LegendPicker({
  bases,
  selectedKeys,
  onChange,
}: {
  bases: ComparisonBase[]
  selectedKeys: string[]
  onChange: (keys: string[]) => void
}) {
  const selected = new Set(selectedKeys)
  const chosen = chosenLegendSegments(bases, selectedKeys)

  const toggle = (key: string) => {
    onChange(selected.has(key) ? selectedKeys.filter((item) => item !== key) : [...selectedKeys, key])
  }

  const toggleGroup = (base: ComparisonBase) => {
    const keys = base.segments.map((segment) => segment.key)
    const allOn = keys.length > 0 && keys.every((key) => selected.has(key))
    if (allOn) {
      onChange(selectedKeys.filter((key) => !keys.includes(key)))
      return
    }
    onChange([...selectedKeys.filter((key) => !keys.includes(key)), ...keys])
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-4" aria-label="Legend">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Legend</h4>
          <p className="mt-1 text-sm leading-5 text-gray-600">
            Tick every option that should appear in the chart legend. A legend needs at least two.
          </p>
        </div>
        {selectedKeys.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="h-10 shrink-0 cursor-pointer rounded-lg px-3 text-sm font-semibold text-gray-600 hover:bg-white"
          >
            Clear
          </button>
        )}
      </div>

      <button
        type="button"
        aria-pressed={selectedKeys.length === 0}
        onClick={() => onChange([])}
        className={`mt-4 flex h-11 w-full shrink-0 cursor-pointer items-center gap-3 rounded-xl border px-3 text-left ${
          selectedKeys.length === 0 ? "border-blue-600 bg-white" : "border-transparent bg-white/70 hover:bg-white"
        }`}
      >
          <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${selectedKeys.length === 0 ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white"}`}>
            {selectedKeys.length === 0 && <Check className="h-3 w-3" />}
          </span>
          <span className="text-sm font-semibold text-gray-900">Overall only</span>
          <span className="text-sm text-gray-500">No legend</span>
        </button>

      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {bases.map((base) => {
          const keys = base.segments.map((segment) => segment.key)
          const picked = keys.filter((key) => selected.has(key)).length
          const allOn = keys.length > 0 && picked === keys.length
          return (
            <div key={base.id} className={`rounded-xl border bg-white p-3 ${base.available ? "border-gray-200" : "border-gray-100 opacity-70"}`}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!base.available}
                  aria-pressed={allOn}
                  onClick={() => toggleGroup(base)}
                  className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 text-left disabled:cursor-not-allowed"
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${allOn ? "border-blue-600 bg-blue-600 text-white" : picked ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-300"}`}>
                    {allOn && <Check className="h-3 w-3" />}
                    {!allOn && picked > 0 && <span className="h-2 w-2 rounded-sm bg-blue-600" />}
                  </span>
                  <span className="truncate text-sm font-semibold text-gray-900">{base.title}</span>
                </button>
                {base.available && (
                  <span className="shrink-0 text-xs font-medium text-gray-500">{picked} of {keys.length}</span>
                )}
              </div>
              {base.lockedReason ? (
                <p className="mt-2 pl-8 text-sm leading-5 text-gray-500">{base.lockedReason}</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2 pl-8">
                  {base.segments.map((segment) => {
                    const on = selected.has(segment.key)
                    return (
                      <button
                        key={segment.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(segment.key)}
                        className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                          on ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                        }`}
                      >
                        {segment.label}
                        {segment.base_size > 0 && (
                          <span className={on ? "font-medium text-blue-100" : "font-medium text-gray-400"}>n={segment.base_size}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className={`mt-3 shrink-0 text-sm leading-5 ${chosen.length === 1 ? "font-medium text-amber-700" : "text-gray-600"}`}>
        {chosen.length >= 2
          ? `${chosen.length} legend series`
          : chosen.length === 1
            ? "Select one more option."
            : "Legend: Overall"}
      </p>
    </section>
  )
}

function comparisonLegend(item: DesignCategoryPayload["items"][number]): string | null {
  const comparison = item.configuration?.comparison
  if (!comparison || comparison.source === "overall") return null
  const labels = (comparison.segments || []).map((segment) => segment.label).filter(Boolean)
  if (labels.length >= 2) return labels.join(" / ")
  return comparison.question || null
}

export function composeReportCombinationName(prefix: string, value: string): string {
  const rest = reportCombinationSuffix(prefix, value)
  return rest ? `${prefix} ${rest}` : prefix
}

function ReportNameField({
  prefix,
  name,
  onChange,
  autoFocus,
}: {
  prefix: string
  name: string
  onChange: (value: string) => void
  autoFocus?: boolean
}) {
  const suffix = reportCombinationSuffix(prefix, name)
  return (
    <div>
      <span className="text-sm font-semibold text-gray-700">Combination name</span>
      <div className="mt-2 flex min-h-11 overflow-hidden rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
        <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-500">{prefix}</span>
        <input
          value={suffix}
          maxLength={Math.max(1, 255 - prefix.length - 1)}
          onChange={(event) => onChange(composeReportCombinationName(prefix, event.target.value))}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-gray-900 outline-none"
          placeholder="#1"
          aria-label={`${prefix} combination name`}
          autoFocus={autoFocus}
        />
      </div>
      <p className="mt-1.5 text-xs leading-5 text-gray-500">
        {prefix} stays fixed. You can delete #1, add spaces, and type any label.
      </p>
    </div>
  )
}

function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || typeof document === "undefined") return null
  return createPortal(children, document.body)
}

export type TopMixView = {
  rank: number
  scoreLabel: string
  summary: string
  active: boolean
  onSelect: () => void
  onAdd?: () => void
}

export function TopMixesCollection({
  mixes,
  isOpen,
  onToggle,
}: {
  mixes: TopMixView[]
  isOpen: boolean
  onToggle: () => void
}) {
  if (mixes.length <= 1) return null
  const alternatives = mixes.length - 1
  const active = mixes.find((mix) => mix.active)
  const subtitle = active
    ? `${active.rank === 1 ? "Best mix" : `Mix ${active.rank}`} in the preview · ${alternatives} more`
    : `Best mix plus ${alternatives} more`

  return (
    <div className="flex-shrink-0">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-gray-50 active:bg-gray-100"
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-gray-900">Top mixes</span>
            <span className="block truncate text-xs text-gray-500">{subtitle}</span>
          </span>
          <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="max-h-64 space-y-2 overflow-y-auto border-t border-gray-100 px-3 py-3 sm:px-4">
            {mixes.map((mix) => {
              const mixLabel = mix.rank === 1 ? "Best mix" : `Mix ${mix.rank}`
              return (
              <div
                key={mix.rank}
                className={`flex w-full items-center gap-2 rounded-2xl border px-2 py-2 ${
                  mix.active
                    ? "border-blue-500 bg-blue-50/80 shadow-sm"
                    : "border-gray-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={mix.onSelect}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl px-1 py-0.5 text-left transition hover:bg-white/60 active:scale-[0.99]"
                >
                  <span
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      mix.rank === 1 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {mix.rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{mixLabel}</span>
                      {mix.active && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Preview
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-gray-500">{mix.summary}</span>
                  </span>
                </button>
                <span className="flex-shrink-0 tabular-nums text-sm font-black text-gray-900">{mix.scoreLabel}</span>
                {mix.onAdd && (
                  <button
                    type="button"
                    onClick={mix.onAdd}
                    title="Add to report builder"
                    aria-label={`Add ${mixLabel} to report builder`}
                    className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-blue-600 transition hover:bg-blue-50 active:scale-95"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function AddToCategoryDialog({
  isOpen,
  title,
  description,
  designName,
  onDesignNameChange,
  namePrefix,
  showDesignName,
  savedDesignLabel,
  comparisonBases = [],
  categories,
  disabledCategoryIds,
  isSaving,
  error,
  onClose,
  onSubmit,
}: {
  isOpen: boolean
  title: string
  description: string
  designName: string
  onDesignNameChange: (value: string) => void
  namePrefix?: string | null
  showDesignName: boolean
  savedDesignLabel?: string | null
  comparisonBases?: ComparisonBase[]
  categories: DesignCategoryPayload[]
  disabledCategoryIds: string[]
  isSaving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (input: { categoryId?: string; categoryName?: string; comparisonKeys?: string[] }) => void
}) {
  const [mode, setMode] = useState<"existing" | "new">(categories.length === 0 ? "new" : "existing")
  const [selectedId, setSelectedId] = useState<string>("")
  const [categoryName, setCategoryName] = useState("")
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const showComparison = showDesignName && comparisonBases.some((base) => base.source !== "overall")
  const legendBases = comparisonBases.filter((base) => base.source !== "overall")

  useEffect(() => {
    if (!isOpen) return
    setMode(categories.length === 0 ? "new" : "existing")
    const first = categories.find((category) => !disabledCategoryIds.includes(category.id))
    setSelectedId(first?.id || "")
    setCategoryName("")
    setSelectedKeys([])
    // Reset only when the dialog opens. Category data is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const creating = mode === "new" || categories.length === 0
  const legendReady = !showComparison || selectedKeys.length !== 1
  const canSubmit = legendReady && (creating
    ? categoryName.trim().length > 0 && (!showDesignName || designName.trim().length > 0)
    : Boolean(selectedId) && !disabledCategoryIds.includes(selectedId) && (!showDesignName || designName.trim().length > 0))

  return (
    <BodyPortal>
    <div className="fixed inset-0 z-[220] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/45" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 flex w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${showComparison ? "h-[min(860px,92vh)] max-w-4xl" : "max-h-[92vh] max-w-lg"}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`min-h-0 flex-1 px-5 py-5 sm:px-6 ${showComparison ? "grid grid-cols-1 items-stretch gap-5 overflow-y-auto md:grid-cols-2 md:overflow-hidden" : "space-y-5 overflow-y-auto"}`}>
          <div className={`flex min-h-0 flex-col gap-4 ${showComparison ? "overflow-hidden" : ""}`}>
          <div className="shrink-0 space-y-4">
          {savedDesignLabel && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Already saved as <span className="font-bold">{savedDesignLabel}</span>
            </div>
          )}

          {showDesignName && (
            namePrefix ? (
              <ReportNameField prefix={namePrefix} name={designName} onChange={onDesignNameChange} autoFocus />
            ) : (
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Combination name</span>
                <input
                  value={designName}
                  onChange={(event) => onDesignNameChange(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Combination name"
                  autoFocus
                />
              </label>
            )
          )}

          <div>
            <p className="text-sm font-semibold text-gray-700">Category</p>
            {categories.length === 0 ? (
              <p className="mt-1 text-xs text-gray-500">No categories yet for this study. Name one to save this combination.</p>
            ) : (
              <div className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
                {categories.map((category) => {
                  const disabled = disabledCategoryIds.includes(category.id)
                  const selected = mode === "existing" && selectedId === category.id
                  return (
                    <button
                      key={category.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setMode("existing")
                        setSelectedId(category.id)
                      }}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-left transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
                        selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-200"
                      }`}
                    >
                      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"}`}>
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-gray-900">{category.name}</span>
                        <span className="text-xs text-gray-500">
                          {category.items.length} combination{category.items.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      {disabled && <span className="text-xs font-bold text-emerald-600">Added</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {categories.length > 0 && (
              <button
                type="button"
                onClick={() => setMode("new")}
                className={`mt-2 flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-left transition active:scale-[0.99] ${
                  creating ? "border-blue-500 bg-blue-50" : "border-dashed border-gray-300 hover:border-blue-300 hover:bg-blue-50/40"
                }`}
              >
                <FolderPlus className="h-4 w-4 flex-shrink-0 text-blue-600" />
                <span className="text-sm font-bold text-gray-900">New category</span>
              </button>
            )}

            {creating && (
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Category name"
                autoFocus={categories.length === 0 && !showDesignName}
              />
            )}
          </div>
          </div>

          {error && <p className="shrink-0 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}
          {showComparison && (
            <ChartPreview
              name={designName}
              series={chosenLegendSegments(legendBases, selectedKeys)}
            />
          )}
          </div>

          {showComparison && (
            <div className="min-h-[280px] md:h-full md:min-h-0">
              <LegendPicker
                bases={legendBases}
                selectedKeys={selectedKeys}
                onChange={setSelectedKeys}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 cursor-pointer rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit || isSaving}
            onClick={() => onSubmit({
              ...(creating ? { categoryName: categoryName.trim() } : { categoryId: selectedId }),
              comparisonKeys: showComparison ? selectedKeys : [],
            })}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {creating && categories.length === 0 ? "Create category" : "Add to report builder"}
          </button>
        </div>
      </div>
    </div>
    </BodyPortal>
  )
}

export function DesignCategoryDrawer({
  isOpen,
  categories,
  isLoading,
  error,
  canEdit,
  activeDesignId,
  focusCategoryId,
  onClose,
  onOpenItem,
  onDownloadCategory,
  downloadingCategoryId,
  downloadMessage,
  downloadError,
  onDismissDownloadError,
  downloadsEnabled = true,
  downloadHint,
  onRename,
  onRenameItem,
  onDeleteCategory,
  onRemoveItem,
}: {
  isOpen: boolean
  categories: DesignCategoryPayload[]
  isLoading: boolean
  error: string | null
  canEdit: boolean
  activeDesignId?: string | null
  focusCategoryId?: string | null
  onClose: () => void
  onOpenItem: (savedDesignId: string) => void
  onDownloadCategory: (categoryId: string) => void
  downloadingCategoryId?: string | null
  downloadMessage?: string
  downloadError?: string | null
  onDismissDownloadError?: () => void
  downloadsEnabled?: boolean
  downloadHint?: string | null
  onRename: (categoryId: string, name: string) => Promise<void> | void
  onRenameItem: (savedDesignId: string, name: string) => Promise<void> | void
  onDeleteCategory: (categoryId: string) => void
  onRemoveItem: (categoryId: string, savedDesignId: string) => void
}) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState("")
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [itemDraftName, setItemDraftName] = useState("")

  useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!focusCategoryId) return
    setOpenIds((current) => ({ ...current, [focusCategoryId]: true }))
  }, [focusCategoryId])

  if (!isOpen) return null

  return (
    <BodyPortal>
    <div className="fixed inset-0 z-[206]">
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Report builder"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Folders className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Report builder</h3>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Categories of saved combinations. Open one to preview it, or download its PowerPoint.
            </p>
            {downloadHint ? <p className="mt-2 text-xs leading-5 text-amber-700">{downloadHint}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(downloadingCategoryId)}
            className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close report builder"
            title={downloadingCategoryId ? "The report is still downloading" : "Close"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {downloadingCategoryId ? (
            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs font-medium leading-5 text-blue-800" role="status">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              <span>{downloadMessage || "Exporting…"}</span>
            </div>
          ) : null}
          {downloadError ? (
            <div className="mb-3 flex items-start justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800" role="alert">
              <p className="min-w-0 text-xs leading-5">{downloadError}</p>
              {onDismissDownloadError ? (
                <button
                  type="button"
                  onClick={onDismissDownloadError}
                  className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-amber-700 transition hover:bg-amber-100"
                  aria-label="Dismiss download message"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm font-medium text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 px-6 py-10 text-center">
              <FolderPlus className="mx-auto mb-3 h-8 w-8 text-blue-300" />
              <p className="text-sm font-bold text-gray-800">No categories yet</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Open a combination and use Add to report builder. You can also select saved designs in Compare and add them together.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => {
                const expanded = openIds[category.id] ?? false
                const editing = editingId === category.id
                const downloading = downloadingCategoryId === category.id
                const itemCount = category.items?.length ?? 0
                const locked = Boolean(downloadingCategoryId)
                const canDownload = downloadsEnabled && itemCount > 0 && !locked
                const downloadTitle = !downloadsEnabled
                  ? downloadHint || "Download is not available for this category yet"
                  : itemCount === 0
                    ? "Add a combination first"
                    : locked
                      ? downloading
                        ? "Downloading…"
                        : "Another report is downloading"
                      : "Download PowerPoint"
                return (
                  <div key={category.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
                    <div className="flex items-center gap-1 pr-2">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setOpenIds((current) => ({ ...current, [category.id]: !expanded }))}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition hover:bg-gray-50"
                      >
                        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : "-rotate-90"}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-gray-900">{category.name}</span>
                          <span className="block text-xs leading-5 text-gray-500" aria-live="polite">
                            {downloading
                              ? downloadMessage || "Exporting…"
                              : `${itemCount} combination${itemCount === 1 ? "" : "s"}`}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownloadCategory(category.id)}
                        disabled={!canDownload}
                        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#2674BA] transition hover:bg-[#2674BA]/10 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={itemCount === 0 ? `Add a combination before downloading ${category.name}` : `Download ${category.name} PowerPoint`}
                        title={downloadTitle}
                      >
                        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </button>
                      {canEdit && (
                        <div className="flex flex-shrink-0 items-center pr-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(category.id)
                              setDraftName(category.name)
                              setOpenIds((current) => ({ ...current, [category.id]: true }))
                            }}
                            disabled={locked}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Rename ${category.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCategory(category.id)}
                            disabled={locked}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Delete ${category.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {expanded && (
                      <div className="space-y-2 border-t border-gray-100 px-3 py-3">
                        {editing && (
                          <form
                            className="flex gap-2"
                            onSubmit={(event) => {
                              event.preventDefault()
                              const next = draftName.trim()
                              setEditingId(null)
                              if (!next || next === category.name) return
                              void Promise.resolve(onRename(category.id, next)).catch(() => undefined)
                            }}
                          >
                            <input
                              value={draftName}
                              onChange={(event) => setDraftName(event.target.value)}
                              className="h-10 min-w-0 flex-1 rounded-xl border border-gray-200 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                              autoFocus
                            />
                            <button type="submit" className="h-10 cursor-pointer rounded-xl bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700">
                              Save
                            </button>
                          </form>
                        )}
                        {category.items.length === 0 ? (
                          <p className="px-2 py-3 text-xs font-medium text-gray-500">No combinations in this category yet.</p>
                        ) : (
                          category.items.map((item) => {
                            const active = item.saved_design_id === activeDesignId
                            const score = item.total_coefficient
                            const scoreLabel = score == null
                              ? ""
                              : Number.isInteger(score)
                                ? String(score)
                                : score.toFixed(1)
                            const editingItem = editingItemId === item.id
                            return (
                              <div
                                key={item.id}
                                className={`flex items-center gap-2 rounded-2xl border px-2 py-2 ${
                                  active ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                                }`}
                              >
                                {editingItem ? (
                                  <form
                                    className="flex min-w-0 flex-1 items-center gap-2"
                                    onSubmit={(event) => {
                                      event.preventDefault()
                                      const prefix = item.design_type === "input" ? null : reportCombinationPrefix(item.metric)
                                      const next = prefix
                                        ? composeReportCombinationName(prefix, itemDraftName).replace(/\s+/g, " ").trim()
                                        : itemDraftName.replace(/\s+/g, " ").trim()
                                      if (!next || next === item.name) {
                                        if (next) setEditingItemId(null)
                                        return
                                      }
                                      setEditingItemId(null)
                                      void Promise.resolve(onRenameItem(item.saved_design_id, next)).catch(() => undefined)
                                    }}
                                  >
                                    {item.design_type !== "input" && reportCombinationPrefix(item.metric) ? (
                                      <div className="flex h-10 min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                                        <span className="flex items-center border-r border-gray-200 bg-gray-50 px-2.5 text-xs font-semibold text-gray-500">
                                          {reportCombinationPrefix(item.metric)}
                                        </span>
                                        <input
                                          value={itemDraftName}
                                          maxLength={Math.max(1, 255 - (reportCombinationPrefix(item.metric)?.length || 0) - 1)}
                                          onChange={(event) => setItemDraftName(event.target.value)}
                                          className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm font-medium outline-none"
                                          placeholder="#1"
                                          aria-label={`Rename ${item.name}`}
                                          autoFocus
                                        />
                                      </div>
                                    ) : (
                                      <input
                                        value={itemDraftName}
                                        onChange={(event) => setItemDraftName(event.target.value)}
                                        className="h-10 min-w-0 flex-1 rounded-xl border border-gray-200 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        aria-label={`Rename ${item.name}`}
                                        autoFocus
                                      />
                                    )}
                                    <button type="submit" className="h-10 cursor-pointer rounded-xl bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700">
                                      Save
                                    </button>
                                  </form>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onOpenItem(item.saved_design_id)}
                                      className="min-w-0 flex-1 cursor-pointer rounded-xl px-2 py-1.5 text-left transition hover:bg-white/70 active:scale-[0.99]"
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="truncate text-sm font-bold text-gray-900">{item.name}</span>
                                        {item.design_type === "input" && (
                                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                            Input
                                          </span>
                                        )}
                                      </span>
                                      <span className="mt-0.5 block truncate text-xs text-gray-500">
                                        {item.design_type === "input"
                                          ? `${item.selection_count} selected`
                                          : [item.metric, item.segment_label || "Overall", comparisonLegend(item)].filter(Boolean).join(" · ")}
                                      </span>
                                    </button>
                                    {item.design_type !== "input" && scoreLabel && (
                                      <span className="flex-shrink-0 tabular-nums text-sm font-black text-gray-900">{scoreLabel}</span>
                                    )}
                                    {canEdit && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const prefix = item.design_type === "input" ? null : reportCombinationPrefix(item.metric)
                                            setEditingItemId(item.id)
                                            setItemDraftName(prefix ? reportCombinationSuffix(prefix, item.name) : item.name)
                                          }}
                                          disabled={locked}
                                          className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                                          aria-label={`Rename ${item.name}`}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onRemoveItem(category.id, item.saved_design_id)}
                                          disabled={locked}
                                          className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                                          aria-label={`Remove ${item.name} from ${category.name}`}
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}
        </div>
      </aside>
    </div>
    </BodyPortal>
  )
}
