"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { submitClassificationAnswers } from "@/lib/api/ResponseAPI"

interface ClassificationQuestion {
  id: string
  text: string
  options: Array<{ id: string; text: string }>
  selected: string | null
  required: boolean
}

interface ApiClassificationQuestion {
  id?: string
  question_id?: string
  text?: string
  question_text?: string
  is_required?: boolean | string
  optional_classification_question?: boolean
  config?: { optional_classification_question?: boolean }
  answer_options?: Array<{ id?: string; option_id?: string; text?: string; option_text?: string }>
  options?: Array<{ id?: string; option_id?: string; text?: string; option_text?: string }>
}

const isOptionalClassificationQuestion = (question: ApiClassificationQuestion) =>
  question?.optional_classification_question === true || question?.config?.optional_classification_question === true

export default function PostClassificationQuestionsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [questions, setQuestions] = useState<ClassificationQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const pageStartRef = useRef<number>(Date.now())
  const questionStartRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault()
      router.push(`/participate/${params.id}/post-classification-questions`)
    }

    window.addEventListener("popstate", handlePopState)

    try {
      const detailsRaw = localStorage.getItem("current_study_details")
      const study = detailsRaw ? JSON.parse(detailsRaw) : null
      const allQuestions = Array.isArray(study?.classification_questions)
        ? study.classification_questions as ApiClassificationQuestion[]
        : []
      const formattedQuestions = allQuestions
        .filter((question) => isOptionalClassificationQuestion(question))
        .map((question) => ({
          id: question.question_id || question.id,
          text: question.question_text || question.text || "",
          options: (question.answer_options || question.options || []).map((option) => ({
            id: option.id || option.option_id,
            text: option.text || option.option_text || "",
          })).filter((option: { id?: string; text?: string }) => option.id && option.text),
          selected: null,
          required: question.is_required === "Y" || question.is_required === true || question.is_required === "true",
        }))
        .filter((question: ClassificationQuestion) => question.id && question.text && question.options.length > 0)

      const storedAnswers = (() => {
        try {
          return JSON.parse(localStorage.getItem("post_classification_answers") || "{}")
        } catch {
          return {}
        }
      })()

      const hydratedQuestions = formattedQuestions.map((question: ClassificationQuestion) => ({
        ...question,
        selected: storedAnswers[question.id] || null,
      }))

      setQuestions(hydratedQuestions)
      const timers: Record<string, number> = {}
      hydratedQuestions.forEach((question: ClassificationQuestion) => {
        timers[question.id] = Date.now()
      })
      questionStartRef.current = timers

      if (hydratedQuestions.length === 0) {
        router.replace(`/participate/${params.id}/thank-you`)
      }
    } catch (error) {
      console.error("Failed to load post classification questions:", error)
      router.replace(`/participate/${params.id}/thank-you`)
    } finally {
      setIsLoading(false)
    }

    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [params.id, router])

  const getSessionId = (): string | null => {
    try {
      const sessionData = localStorage.getItem("study_session")
      if (!sessionData) return null
      const { sessionId } = JSON.parse(sessionData)
      return sessionId ? String(sessionId) : null
    } catch {
      return null
    }
  }

  const buildAnswerPayload = (question: ClassificationQuestion, answer: string, timeSpentSeconds?: number) => ({
    question_id: question.id,
    question_text: question.text,
    answer,
    answer_timestamp: new Date().toISOString(),
    time_spent_seconds: timeSpentSeconds ?? Math.max(0, Math.round((Date.now() - (questionStartRef.current[question.id] || Date.now())) / 1000)),
  })

  const submitSingleAnswer = (question: ClassificationQuestion, answer: string) => {
    const sessionId = getSessionId()
    if (!sessionId) return
    const payload = { answers: [buildAnswerPayload(question, answer)] }
    submitClassificationAnswers(sessionId, payload).catch((error) => {
      console.warn("Post classification per-option submit failed; final submit will retry.", error)
    })
    questionStartRef.current[question.id] = Date.now()
  }

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setSubmitError(null)
    setQuestions((prev) => {
      const next = prev.map((question) => question.id === questionId ? { ...question, selected: optionId } : question)
      try {
        const answers: Record<string, string> = {}
        next.forEach((question) => {
          if (question.selected) answers[question.id] = question.selected
        })
        localStorage.setItem("post_classification_answers", JSON.stringify(answers))
        const existing = JSON.parse(localStorage.getItem("classification_answers") || "{}")
        localStorage.setItem("classification_answers", JSON.stringify({ ...existing, ...answers }))
      } catch { }

      const selectedQuestion = next.find((question) => question.id === questionId)
      if (selectedQuestion) {
        submitSingleAnswer(selectedQuestion, optionId)
      }
      return next
    })
  }

  const handleContinue = async () => {
    const sessionId = getSessionId()
    if (!sessionId) {
      router.replace(`/participate/${params.id}`)
      return
    }

    const selectedQuestions = questions.filter((question) => question.selected)
    if (selectedQuestions.length !== questions.length) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const elapsed = Math.round((Date.now() - pageStartRef.current) / 1000)
      const metrics = JSON.parse(localStorage.getItem("session_metrics") || "{}")
      metrics.post_classification_page_time = elapsed
      localStorage.setItem("session_metrics", JSON.stringify(metrics))
    } catch { }

    const answers = selectedQuestions.map((question) => buildAnswerPayload(question, question.selected!, 0))

    let success = false
    for (let attempt = 0; attempt < 4 && !success; attempt++) {
      try {
        await submitClassificationAnswers(sessionId, { answers, finalize_response: true })
        success = true
      } catch (error) {
        console.error(`Post classification final submit attempt ${attempt + 1} failed:`, error)
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }

    if (!success) {
      setSubmitError("Failed to save your answers. Please try again.")
      setIsSubmitting(false)
      return
    }

    try {
      const stored = JSON.parse(localStorage.getItem("classification_answers") || "{}")
      const finalAnswers = { ...stored }
      selectedQuestions.forEach((question) => {
        finalAnswers[question.id] = question.selected
      })
      localStorage.setItem("classification_answers", JSON.stringify(finalAnswers))
      localStorage.setItem("post_classification_completed", params.id)
    } catch { }

    router.push(`/participate/${params.id}/thank-you`)
  }

  const canProceed = questions.length > 0 && questions.every((question) => question.selected !== null)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgba(38,116,186,1)]" />
      </div>
    )
  }

  if (questions.length === 0) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-900">Final Questions</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please answer the following questions before finishing the study.
        </p>

        <div className="mt-8 bg-white border rounded-xl shadow-sm p-4 sm:p-6 lg:p-8">
          <div className="mt-2 space-y-8">
            {questions.map((question) => (
              <div key={question.id} className="space-y-3">
                <label className="block text-sm font-semibold text-gray-800">{question.text}</label>
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

          {submitError && (
            <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleContinue}
              disabled={!canProceed || isSubmitting}
              className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm transition-colors"
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
