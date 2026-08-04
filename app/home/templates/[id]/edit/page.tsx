"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardHeader } from "@/app/home/components/dashboard-header"
import { Step5StudyStructure } from "@/components/create-study/steps/Step5StudyStructure"
import { Button } from "@/components/ui/button"
import {
  createTemplate,
  getTemplate,
  updateTemplate,
  type TemplateAspectRatio,
} from "@/lib/api/templateApi"
import {
  TEMPLATE_STORAGE_PREFIX,
  clearTemplateEditorStorage,
  readTemplateEditorLayerJson,
  seedTemplateEditorStorage,
} from "@/lib/templates/templateLayerJson"
import { checkIsTemplateManager } from "@/lib/config/specialCreators"
import { useAuth } from "@/lib/auth/AuthContext"

type ConfirmKind = "draft" | "publish" | null

function TemplateEditorContent() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const params = useParams<{ id?: string }>()
  const isNew = !params?.id || params.id === "new"
  const templateId = isNew ? null : String(params.id)

  const allowed = authLoading ? null : checkIsTemplateManager(user?.email)
  const [ready, setReady] = useState(false)
  const [title, setTitle] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmKind>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (authLoading) return
        if (!checkIsTemplateManager(user?.email)) {
          setReady(false)
          return
        }

        clearTemplateEditorStorage()
        if (templateId) {
          const tpl = await getTemplate(templateId)
          if (cancelled) return
          setTitle(tpl.title)
          seedTemplateEditorStorage(tpl.layer_json || {})
        } else {
          localStorage.setItem(`${TEMPLATE_STORAGE_PREFIX}_layer`, JSON.stringify([]))
          localStorage.setItem(`${TEMPLATE_STORAGE_PREFIX}_layer_preview_aspect`, "portrait")
        }
        if (!cancelled) setReady(true)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to open editor")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [templateId, user?.email, authLoading])

  const persist = useCallback(
    async (status: "draft" | "published") => {
      setSaving(true)
      setError(null)
      try {
        // Allow the LayerMode persist effect to flush background add/remove to localStorage
        await new Promise((r) => setTimeout(r, 50))

        const layer_json = readTemplateEditorLayerJson()
        const aspect_ratio = (layer_json.aspect_ratio || "9:16") as TemplateAspectRatio
        layer_json.aspect_ratio = aspect_ratio

        // Normalize background: keep http(s) URL, or explicitly null when removed
        const bg = layer_json.background_image_url
        if (typeof bg === "string" && /^https?:\/\//i.test(bg)) {
          layer_json.background_image_url = bg
        } else {
          layer_json.background_image_url = null
        }

        // Guard against saving before a newly chosen background finishes uploading
        try {
          const rawBg = localStorage.getItem(`${TEMPLATE_STORAGE_PREFIX}_layer_background`)
          if (rawBg) {
            const parsed = JSON.parse(rawBg)
            const hasBlobOnly =
              parsed &&
              !parsed.secureUrl &&
              typeof parsed.previewUrl === "string" &&
              parsed.previewUrl.startsWith("blob:")
            if (hasBlobOnly) {
              throw new Error("Background image is still uploading. Please wait a moment and try again.")
            }
          }
        } catch (e: any) {
          if (e?.message?.includes("uploading")) throw e
        }

        if (!title.trim()) {
          throw new Error("Template title is required")
        }

        if (templateId) {
          await updateTemplate(templateId, {
            title: title.trim(),
            aspect_ratio,
            layer_json,
          })
          if (status === "published") {
            const { publishTemplate } = await import("@/lib/api/templateApi")
            await publishTemplate(templateId)
          } else {
            const { moveTemplateToDraft } = await import("@/lib/api/templateApi")
            await moveTemplateToDraft(templateId).catch(() => undefined)
          }
        } else {
          await createTemplate({
            title: title.trim(),
            aspect_ratio,
            status,
            layer_json,
          })
        }

        clearTemplateEditorStorage()
        router.push("/home/templates")
      } catch (e: any) {
        setError(e?.message || "Failed to save template")
      } finally {
        setSaving(false)
        setConfirm(null)
      }
    },
    [router, templateId, title]
  )

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (allowed === false) {
    return (
      <div className="min-h-screen bg-slate-100">
        <DashboardHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
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
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!ready ? (
          <div className="rounded-xl border bg-white p-10 text-center text-sm text-gray-500">Loading editor…</div>
        ) : (
          <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
            <Step5StudyStructure
              mode="layer"
              isActive
              editorVariant="template"
              storagePrefix={TEMPLATE_STORAGE_PREFIX}
              templateTitle={title}
              onTemplateTitleChange={setTitle}
              showTemplateTitleField={!isNew}
              isSaving={saving}
              onBack={() => {
                clearTemplateEditorStorage()
                router.push("/home/templates")
              }}
              onNext={() => undefined}
              onSaveDraft={() => setConfirm("draft")}
              onPublish={() => setConfirm("publish")}
            />
          </div>
        )}
      </main>

      {confirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {confirm === "publish" ? "Publish this template?" : "Save as draft?"}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {confirm === "publish"
                ? "Published templates appear in Create Study → Select from Templates. Validation rules will be enforced."
                : "Draft templates stay private to managers and will not appear in Create Study until published."}
            </p>

            {(isNew || !title.trim()) && (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Template Title
                </label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a unique template title"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  disabled={saving}
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" className="cursor-pointer" onClick={() => setConfirm(null)} disabled={saving}>
                Cancel
              </Button>
              <Button
                className="cursor-pointer bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)]"
                disabled={saving || !title.trim()}
                onClick={() => void persist(confirm === "publish" ? "published" : "draft")}
              >
                {saving ? "Saving…" : confirm === "publish" ? "Publish" : "Save Draft"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TemplateEditorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  )
}

export default function TemplateEditorPage() {
  return (
    <Suspense fallback={<TemplateEditorFallback />}>
      <TemplateEditorContent />
    </Suspense>
  )
}

