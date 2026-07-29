"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Award,
  BarChart3,
  Filter,
  Layers3,
  Scale,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

const FINDING_ICONS: LucideIcon[] = [Award, Layers3, Scale, Filter, Sparkles, BarChart3]

const ACCENTS = [
  { ring: "ring-[#2674BA]/20", bg: "bg-[#2674BA]/10", text: "text-[#2674BA]", bar: "bg-[#2674BA]" },
  { ring: "ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" },
  { ring: "ring-amber-200", bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-500" },
  { ring: "ring-teal-200", bg: "bg-teal-50", text: "text-teal-700", bar: "bg-teal-500" },
  { ring: "ring-rose-200", bg: "bg-rose-50", text: "text-rose-700", bar: "bg-rose-500" },
]

export function ExecutiveSummaryCard({ title, data }: { title?: string | null; data: any }) {
  const bullets = Array.isArray(data?.bullets) ? data.bullets : []
  if (!bullets.length) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gradient-to-br from-[#2674BA]/10 via-white to-emerald-50/60 px-3 py-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2674BA] text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 sm:text-sm">
              {title || "Executive summary"}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">
              {data?.study_title
                ? `Top verified findings for ${data.study_title}`
                : "Top verified findings from this study"}
            </p>
          </div>
        </div>
      </div>

      <ol className="space-y-2 p-2.5 sm:p-3">
        {bullets.map((bullet: any, index: number) => {
          const accent = ACCENTS[index % ACCENTS.length]
          const Icon = FINDING_ICONS[index % FINDING_ICONS.length]
          const rank = bullet.rank ?? index + 1
          return (
            <li
              key={bullet.fact_id || `finding-${index}`}
              className={`relative overflow-hidden rounded-xl bg-white p-2.5 ring-1 ${accent.ring}`}
            >
              <div className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`} />
              <div className="flex items-start gap-2.5 pl-1.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent.bg} ${accent.text}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${accent.bg} ${accent.text}`}
                    >
                      {rank}
                    </span>
                    <p className="truncate text-xs font-bold text-gray-900">
                      {bullet.title || `Finding ${rank}`}
                    </p>
                    {bullet.fact_id ? (
                      <span className="ml-auto shrink-0 text-[10px] font-semibold text-gray-400">
                        [{bullet.fact_id}]
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[12px] leading-relaxed text-gray-600 sm:text-[13px]">
                    {bullet.text}
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
