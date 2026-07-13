"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LayoutTemplate, Plus, Search, Pencil, Trash2, Upload, FilePenLine } from "lucide-react"
import { DashboardHeader } from "@/app/home/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { LayerPreview } from "@/components/create-study/steps/LayerPreview"
import {
  deleteTemplate,
  fetchTemplatePermissions,
  listManagedTemplates,
  moveTemplateToDraft,
  publishTemplate,
  type TemplateRecord,
  type TemplateSort,
  type TemplateStatus,
} from "@/lib/api/templateApi"
import { templateToPreviewModel } from "@/lib/templates/layerTemplates"
import { apiTemplateToLayerTemplate } from "@/lib/templates/templateLayerJson"

function formatDate(value?: string | null) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function ManageTemplatesContent() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [items, setItems] = useState<TemplateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<TemplateStatus | "all">("all")
  const [sort, setSort] = useState<TemplateSort>("newest")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TemplateRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const can = await fetchTemplatePermissions()
      setAllowed(can)
      if (!can) {
        setItems([])
        return
      }
      const data = await listManagedTemplates({
        status,
        search: search.trim() || undefined,
        sort,
        per_page: 100,
      })
      setItems(data.items || [])
    } catch (e: any) {
      setError(e?.message || "Failed to load templates")
    } finally {
      setLoading(false)
    }
  }, [search, status, sort])

  useEffect(() => {
    void load()
  }, [load])

  const filteredHint = useMemo(() => {
    if (loading) return "Loading…"
    if (!items.length) return "No templates yet"
    return `${items.length} template${items.length === 1 ? "" : "s"}`
  }, [items.length, loading])

  const runAction = async (id: string, action: () => Promise<unknown>, okMessage: string) => {
    setBusyId(id)
    setError(null)
    setSuccess(null)
    try {
      await action()
      setSuccess(okMessage)
      await load()
    } catch (e: any) {
      setError(e?.message || "Action failed")
    } finally {
      setBusyId(null)
    }
  }

  if (allowed === false) {
    return (
      <div className="min-h-screen bg-slate-100">
        <DashboardHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <LayoutTemplate className="mx-auto mb-4 h-10 w-10 text-gray-400" />
          <h1 className="text-xl font-semibold text-gray-900">Access denied</h1>
          <p className="mt-2 text-sm text-gray-600">You do not have permission to manage templates.</p>
          <Button className="mt-6 cursor-pointer" variant="outline" onClick={() => router.push("/home")}>
            Back to Home
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Manage Templates</h1>
            <p className="mt-1 text-sm text-gray-600">Create, publish, and maintain layer templates for Create Study.</p>
          </div>
          <Button
            className="cursor-pointer bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)]"
            onClick={() => router.push("/home/templates/new")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Template
          </Button>
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by template title"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TemplateStatus | "all")}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as TemplateSort)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="a-z">A–Z</option>
          </select>
          <div className="text-xs text-gray-500 lg:ml-auto">{filteredHint}</div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
        )}

        {loading ? (
          <div className="rounded-xl border bg-white p-10 text-center text-sm text-gray-500">Loading templates…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-white px-6 py-16 text-center shadow-sm">
            <LayoutTemplate className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900">No templates yet</h2>
            <p className="mt-2 text-sm text-gray-600">Create your first layer template to use in Create Study.</p>
            <Button
              className="mt-6 cursor-pointer bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)]"
              onClick={() => router.push("/home/templates/new")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Template
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const layerTemplate = apiTemplateToLayerTemplate(item)
              const preview = templateToPreviewModel(layerTemplate)
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm md:flex-row md:items-center"
                >
                  <div className="mx-auto w-[100px] shrink-0 sm:mx-0 sm:w-[112px]">
                    <div className="overflow-hidden rounded-lg border bg-slate-50">
                      <LayerPreview
                        background={preview.background}
                        layers={preview.layers}
                        aspect={layerTemplate.aspect}
                        selectedImageIds={preview.selectedImageIds}
                        className="!max-h-none !max-w-none !rounded-none !border-0"
                      />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          item.status === "published"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {item.aspect_ratio}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-3 lg:grid-cols-4">
                      <div>
                        <span className="text-gray-400">Layers:</span> {item.layer_count}
                      </div>
                      <div>
                        <span className="text-gray-400">Elements:</span> {item.element_count}
                      </div>
                      <div className="truncate">
                        <span className="text-gray-400">Created by:</span>{" "}
                        {item.created_by?.name || item.created_by?.email || "—"}
                      </div>
                      <div>
                        <span className="text-gray-400">Updated:</span> {formatDate(item.updated_at)}
                      </div>
                      <div>
                        <span className="text-gray-400">Created:</span> {formatDate(item.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => router.push(`/home/templates/${item.id}/edit`)}
                      disabled={busyId === item.id}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {item.status === "published" ? (
                      <Button
                        variant="outline"
                        className="cursor-pointer"
                        disabled={busyId === item.id}
                        onClick={() =>
                          void runAction(item.id, () => moveTemplateToDraft(item.id), "Moved to draft")
                        }
                      >
                        <FilePenLine className="mr-1 h-3.5 w-3.5" />
                        Move to Draft
                      </Button>
                    ) : (
                      <Button
                        className="cursor-pointer bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)]"
                        disabled={busyId === item.id}
                        onClick={() =>
                          void runAction(item.id, () => publishTemplate(item.id), "Template published")
                        }
                      >
                        <Upload className="mr-1 h-3.5 w-3.5" />
                        Publish
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="cursor-pointer text-red-600 hover:bg-red-50"
                      disabled={busyId === item.id}
                      onClick={() => setConfirmDelete(item)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete template?</h3>
            <p className="mt-2 text-sm text-gray-600">
              “{confirmDelete.title}” will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" className="cursor-pointer" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                className="cursor-pointer bg-red-600 hover:bg-red-700"
                onClick={() => {
                  const id = confirmDelete.id
                  setConfirmDelete(null)
                  void runAction(id, () => deleteTemplate(id), "Template deleted")
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ManageTemplatesFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  )
}

export default function ManageTemplatesPage() {
  return (
    <Suspense fallback={<ManageTemplatesFallback />}>
      <ManageTemplatesContent />
    </Suspense>
  )
}

