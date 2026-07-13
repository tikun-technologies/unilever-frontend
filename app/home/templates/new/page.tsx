"use client"

import { Suspense } from "react"
import TemplateEditorPage from "../[id]/edit/page"

function NewTemplateFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  )
}

/** Dedicated /new route so create flow does not depend on [id] params during prerender. */
export default function NewTemplatePage() {
  return (
    <Suspense fallback={<NewTemplateFallback />}>
      <TemplateEditorPage />
    </Suspense>
  )
}
