"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { getPublicProjectStudies, PublicProjectStudiesResponse } from "@/api/projectApi"
import {
  Activity,
  ArrowRight,
  FolderOpen,
  LayoutGrid,
  Layers,
  Search,
  Sparkles,
  Type,
} from "lucide-react"
import { setParticipateProjectReturnFromCurrentPage } from "@/lib/participate/projectReturnUrl"

function getStudyTypeMeta(type: string) {
  switch (type) {
    case "grid":
      return {
        label: "Grid Study",
        icon: <LayoutGrid className="h-4 w-4" />,
      }
    case "layer":
      return {
        label: "Layer Study",
        icon: <Layers className="h-4 w-4" />,
      }
    case "text":
      return {
        label: "Text Study",
        icon: <Type className="h-4 w-4" />,
      }
    default:
      return {
        label: "Study",
        icon: <Activity className="h-4 w-4" />,
      }
  }
}

export default function PublicProjectPage() {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [data, setData] = useState<PublicProjectStudiesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      if (!params?.projectId) return

      try {
        setIsLoading(true)
        setError(null)
        const result = await getPublicProjectStudies(params.projectId)
        setData(result)
      } catch (err) {
        console.error("Failed to fetch project studies:", err)
        setError(err instanceof Error ? err.message : "Failed to load project studies")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params?.projectId])

  const filteredStudies = useMemo(() => {
    if (!data?.studies) return []
    if (!searchQuery.trim()) return data.studies

    const query = searchQuery.toLowerCase()
    return data.studies.filter((study) => study.title.toLowerCase().includes(query))
  }, [data?.studies, searchQuery])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white/90 px-10 py-10 shadow-sm backdrop-blur">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[rgba(38,116,186,1)]" />
            <div className="text-center">
              <p className="text-base font-semibold text-slate-900">Loading project studies</p>
              <p className="text-sm text-slate-500">Preparing the participant experience.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="h-2 bg-[rgba(38,116,186,1)]" />
            <div className="px-6 py-12 text-center sm:px-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <Activity className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Project not available</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
                {error || "This project could not be opened right now. Please check the link or try again later."}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-white border-b border-[rgba(209,223,235,1)] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center h-16">
          <Link href="/home" className="inline-flex items-center cursor-pointer">
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                <span className="text-green-600">Mind</span>
                <span className="text-gray-800">Surve</span>
              </div>
            </div>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section
          onClick={() => searchInputRef.current?.focus()}
          className="relative cursor-pointer overflow-hidden rounded-[32px] border border-[rgba(38,116,186,0.18)] bg-[rgba(38,116,186,1)] px-6 py-8 text-white shadow-xl sm:px-8 sm:py-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(12,74,140,0.28),transparent_40%)]" />
          <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                  Project Studies
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {data.project_name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                  Choose a study below to begin the participant flow. Everything here is organized for quick access and a smooth start.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:w-auto">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/80">Available</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{data.studies.length}</p>
                  <p className="text-xs text-white/75">Active studies</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/80">Showing</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{filteredStudies.length}</p>
                  <p className="text-xs text-white/75">Matching results</p>
                </div>
              </div>
            </div>

            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search studies by name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="h-14 w-full rounded-2xl border border-white/10 bg-white pl-12 pr-4 text-sm text-slate-900 shadow-lg outline-none transition focus:border-white focus:ring-4 focus:ring-white/20"
              />
            </div>
          </div>
        </section>

        <section className="mt-8">
          {filteredStudies.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FolderOpen className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">No studies found</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                {searchQuery
                  ? `No studies match "${searchQuery}". Try a different keyword.`
                  : "This project does not have active studies available yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:gap-6">
              {filteredStudies.map((study) => {
                const studyType = getStudyTypeMeta(study.study_type)

                return (
                  <button
                    key={study.id}
                    type="button"
                    onClick={() => {
                      setParticipateProjectReturnFromCurrentPage(study.id)
                      router.push(`/participate/${study.id}`)
                    }}
                    className="group relative cursor-pointer overflow-hidden rounded-[26px] border border-slate-200 bg-white p-0 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[rgba(38,116,186,0.35)] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[rgba(38,116,186,0.12)]"
                  >
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-[rgba(38,116,186,1)]" />
                    <div className="flex h-full flex-col px-6 pb-6 pt-7">
                      <div className="flex items-start justify-between gap-4">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                          {studyType.icon}
                          <span>{studyType.label}</span>
                        </div>
                        <div className="rounded-full bg-[rgba(38,116,186,0.08)] px-3 py-1 text-xs font-medium text-[rgba(38,116,186,1)]">
                          Ready to start
                        </div>
                      </div>

                      <div className="mt-5 flex-1">
                        <h2 className="text-xl font-semibold leading-8 text-slate-900 transition-colors group-hover:text-[rgba(38,116,186,1)]">
                          {study.title}
                        </h2>
                        {study.product_id ? (
                          <p className="mt-2 text-sm font-medium text-[rgba(38,116,186,1)]">
                            Product ID: <span className="text-slate-600">{study.product_id}</span>
                          </p>
                        ) : null}
                        <p className="mt-3 text-sm leading-6 text-slate-500">
                          Open this study to continue to the standard participant start flow.
                        </p>
                      </div>

                      <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-sm font-semibold text-slate-900">Start study</span>
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-[rgba(38,116,186,1)]">
                          Continue
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
