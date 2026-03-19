"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { FRAGRANCE_QUESTION_ID, FRAGRANCE_QUESTION_TEXT } from "@/lib/config/specialCreators"

export default function PreviewFragranceLikePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<"Yes" | "No" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleContinue = () => {
    if (selected === null) return
    setIsSubmitting(true)
    try {
      const existing = JSON.parse(localStorage.getItem("classification_answers") || "{}")
      existing[FRAGRANCE_QUESTION_ID] = selected
      localStorage.setItem("classification_answers", JSON.stringify(existing))
    } catch { }
    setTimeout(() => {
      router.push("/home/create-study/preview/classification-questions")
    }, 300)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-900">
          {FRAGRANCE_QUESTION_TEXT}
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please select one option and tap Continue. (Preview)
        </p>

        <div className="mt-8 bg-white border rounded-xl shadow-sm p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setSelected("Yes")}
              className={`min-h-12 rounded-md border text-sm font-medium transition-colors ${
                selected === "Yes"
                  ? "bg-[rgba(38,116,186,1)] text-white border-[rgba(38,116,186,1)]"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setSelected("No")}
              className={`min-h-12 rounded-md border text-sm font-medium transition-colors ${
                selected === "No"
                  ? "bg-[rgba(38,116,186,1)] text-white border-[rgba(38,116,186,1)]"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
              }`}
            >
              No
            </button>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={handleContinue}
              disabled={selected === null || isSubmitting}
              className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm transition-colors"
            >
              {isSubmitting ? "Continuing..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
