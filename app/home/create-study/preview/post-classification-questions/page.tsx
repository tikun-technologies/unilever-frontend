"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface ClassificationQuestion {
  id: string
  text: string
  options: Array<{ id: string; text: string }>
  selected: string | null
  required: boolean
}

interface DraftClassificationQuestion {
  id?: string
  question_id?: string
  title?: string
  text?: string
  required?: boolean
  options?: Array<{
    id?: string
    option_id?: string
    text?: string
  }>
}

export default function PreviewPostClassificationQuestions() {
  const router = useRouter()
  const [questions, setQuestions] = useState<ClassificationQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadQuestions = () => {
      try {
        const raw = localStorage.getItem("cs_step6_optional_classification")
        const arr = raw ? JSON.parse(raw) as DraftClassificationQuestion[] : []
        const mapped: ClassificationQuestion[] = Array.isArray(arr)
          ? arr
            .filter((q) => {
              const title = String(q?.title || q?.text || "").trim()
              const validOptions = Array.isArray(q?.options)
                ? q.options.filter((option) => String(option?.text || "").trim().length > 0)
                : []
              return title.length > 0 && validOptions.length > 0
            })
            .map((q) => ({
              id: q.id || q.question_id,
              text: q.title || q.text,
              required: q.required !== false,
              options: (q.options || [])
                .map((option) => ({ id: option.id || option.option_id, text: option.text || "" }))
                .filter((option: { id?: string; text?: string }) => option.id && option.text.trim().length > 0),
              selected: null,
            }))
          : []

        const storedAnswers = (() => {
          try {
            return JSON.parse(localStorage.getItem("preview_post_classification_answers") || "{}")
          } catch {
            return {}
          }
        })()

        const hydrated = mapped.map((question) => ({
          ...question,
          selected: storedAnswers[question.id] || null,
        }))

        setQuestions(hydrated)

        if (hydrated.length === 0) {
          router.replace("/home/create-study/preview/thank-you")
        }
      } catch {
        setQuestions([])
        router.replace("/home/create-study/preview/thank-you")
      } finally {
        setIsLoading(false)
      }
    }

    loadQuestions()
  }, [router])

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setQuestions((prev) => {
      const next = prev.map((question) => question.id === questionId ? { ...question, selected: optionId } : question)
      try {
        const answers: Record<string, string> = {}
        next.forEach((question) => {
          if (question.selected) answers[question.id] = question.selected
        })
        localStorage.setItem("preview_post_classification_answers", JSON.stringify(answers))
      } catch { }
      return next
    })
  }

  const handleContinue = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      router.push("/home/create-study/preview/thank-you")
    }, 500)
  }

  const canProceed = questions.length > 0 && questions.every((question) => !question.required || question.selected !== null)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgba(38,116,186,1)]"></div>
          </div>
        </div>
      </div>
    )
  }

  if (questions.length === 0) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-900">Final Questions</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please answer the following questions before finishing the study. (Preview)
        </p>

        <div className="mt-8 bg-white border rounded-xl shadow-sm p-4 sm:p-6 lg:p-8">
          <div className="mt-2 space-y-8">
            {questions.map((question) => (
              <div key={question.id} className="space-y-3">
                <label className="block text-sm font-semibold text-gray-800">
                  {question.text}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {question.options.map((option) => (
                    <Toggle
                      key={option.id}
                      value={option.id}
                      selected={question.selected}
                      onSelect={(value) => handleOptionSelect(question.id, value)}
                      label={option.text}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleContinue}
              disabled={!canProceed || isSubmitting}
              className="px-5 py-2 rounded-md bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm transition-colors flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Continuing...
                </>
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Toggle({
  value,
  selected,
  onSelect,
  label,
}: {
  value: string
  selected: string | null
  onSelect: (v: string) => void
  label: string
}) {
  const active = selected === value
  return (
    <button
      onClick={() => onSelect(value)}
      className={`w-full min-h-11 py-2.5 px-3 rounded-md border text-sm transition-colors whitespace-normal break-words text-center ${active
        ? "bg-[rgba(38,116,186,1)] text-white border-[rgba(38,116,186,1)]"
        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
        }`}
    >
      {label}
    </button>
  )
}
