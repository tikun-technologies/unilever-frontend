"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { getPublicProjectStudies, PublicProjectStudiesResponse } from "@/api/projectApi"
import { Activity, ArrowRight, FolderOpen, Search } from "lucide-react"
import { setParticipateProjectReturnFromCurrentPage } from "@/lib/participate/projectReturnUrl"

export default function PublicProjectPage() {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [data, setData] = useState<PublicProjectStudiesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState("")

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
    if (!submittedSearchQuery.trim()) return data.studies

    const query = submittedSearchQuery.toLowerCase()
    return data.studies.filter((study) => {
      const displayId = ((study.product_id && study.product_id.trim()) || study.id).toLowerCase()
      return displayId.includes(query)
    })
  }, [data?.studies, submittedSearchQuery])

  const handleSearchSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    setSubmittedSearchQuery(searchQuery.trim())
  }

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

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <section className="space-y-3">
          {/* Compact hero strip — low height, horizontal layout */}
          <div className="relative overflow-hidden rounded-xl border border-[rgba(38,116,186,0.22)] bg-gradient-to-r from-[#1a5f96] via-[rgba(38,116,186,1)] to-[#2d87c4] shadow-sm ring-1 ring-black/5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_100%_-20%,rgba(255,255,255,0.18),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
            <div className="relative flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
              <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                <div className="min-w-0 pt-0.5 sm:pt-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65">
                    Products
                  </p>
                  <h1 className="mt-0.5 truncate text-lg font-semibold leading-tight tracking-tight text-white sm:text-xl">
                    {data.project_name}
                  </h1>
                  <p className="mt-1 hidden text-xs leading-snug text-white/75 sm:line-clamp-1 sm:block">
                    Choose a Product below to begin — quick access to each participant flow.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-stretch gap-2 sm:gap-2.5">
                <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/12 px-3 py-2 text-center backdrop-blur-[2px] sm:min-w-[5.5rem] sm:py-2.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-white/65">Available</span>
                  <span className="w-full text-center text-xl font-bold tabular-nums leading-none text-white sm:text-2xl">
                    {data.studies.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Search — slim rectangle below hero */}
          <form
            onSubmit={handleSearchSubmit}
            className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <div className="relative flex items-center gap-2">
              <div
                role="presentation"
                onClick={() => searchInputRef.current?.focus()}
                className="relative flex-1 cursor-text"
              >
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search Product ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="h-9 w-full rounded-lg border-0 bg-transparent pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-0 focus:ring-2 focus:ring-[rgba(38,116,186,0.2)]"
              />
              </div>
              <button
                type="submit"
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(38,116,186,1)] px-4 text-sm font-medium text-white transition hover:bg-[rgba(38,116,186,0.92)]"
              >
                Search
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 sm:mt-7">
          {filteredStudies.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FolderOpen className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">No studies found</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                {submittedSearchQuery
                  ? `No studies match "${submittedSearchQuery}". Try a different keyword.`
                  : "This project does not have active studies available yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {filteredStudies.map((study) => {
                const displayId = (study.product_id && study.product_id.trim()) || study.id

                return (
                  <button
                    key={study.id}
                    type="button"
                    title={displayId}
                    onClick={() => {
                      setParticipateProjectReturnFromCurrentPage(study.id)
                      router.push(`/participate/${study.id}`)
                    }}
                    className="group relative w-full cursor-pointer overflow-hidden rounded-[26px] border border-slate-200 bg-white p-0 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[rgba(38,116,186,0.35)] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[rgba(38,116,186,0.12)]"
                  >
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-[rgba(38,116,186,1)]" />
                    <div className="flex items-center justify-between gap-4 px-6 pb-6 pt-7">
                      <h2 className="min-w-0 flex-1 text-xl font-semibold leading-8 text-slate-900 transition-colors group-hover:text-[rgba(38,116,186,1)]">
                        Product ID:{" "}
                        <span className="font-medium text-slate-700 tabular-nums">{displayId}</span>
                      </h2>
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(38,116,186,0.12)] text-[rgba(38,116,186,1)] transition group-hover:bg-[rgba(38,116,186,0.2)] group-hover:translate-x-0.5"
                        aria-hidden
                      >
                        <ArrowRight className="h-6 w-6" strokeWidth={2.5} />
                      </span>
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
