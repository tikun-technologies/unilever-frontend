"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { DashboardHeader } from "../../components/dashboard-header"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { useAuth } from "@/lib/auth/AuthContext"
import { checkIsSpecialCreator } from "@/lib/config/specialCreators"
import { updateStudyStatus, putUpdateStudy, StudyDetails, getStudyBasicDetails } from "@/lib/api/StudyAPI"
import { StudyAnalytics, downloadStudyResponsesCsv, subscribeStudyAnalytics } from "@/lib/api/ResponseAPI"
import { Pause, Play, CheckCircle, Share, Download, BarChart3, ArrowLeft, ChevronDown, LineChart, Bot, UserPlus } from "lucide-react"
import { ShareStudyModal } from "@/components/create-study/ShareStudyModal"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { StudyLaunchCongrats } from "@/components/onboarding/StudyLaunchCongrats"
import { getConfiguratorThumbnailUrl } from "@/lib/utils/configuratorImageUrls"

interface AccordionSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

const AccordionSection = ({ title, children, defaultOpen = false }: AccordionSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-lg shadow-sm border mb-6 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200 border-b group cursor-pointer"
        style={{ borderColor: '#e5e7eb' }}
      >
        <h3
          className="text-lg font-semibold transition-colors duration-200"
          style={{ color: '#2674BA' }}
        >
          {title}
        </h3>
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 pt-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const getQuestionKey = (question: any, index: number) =>
  String(question?.id || question?.question_id || index)

const getQuestionOptions = (question: any) =>
  Array.isArray(question?.answer_options) ? question.answer_options : []

const QuestionList = ({ questions }: { questions: any[] }) => (
  <div className="space-y-4">
    {questions.map((question: any, index: number) => (
      <div key={getQuestionKey(question, index)} className="border rounded-lg p-4 bg-white">
        <div className="flex items-start justify-between mb-2 gap-3">
          <div className="text-sm font-medium text-gray-800">{question.question_text}</div>
          <div className="text-xs text-gray-500 shrink-0">Q{index + 1}</div>
        </div>
        <div className="text-sm text-gray-600 mb-2">
          <div className="mb-1">Type: {String(question.question_type || "multiple_choice").replace('_', ' ').toUpperCase()}</div>
          <div className="mb-1">Required: {question.is_required ? 'Yes' : 'No'}</div>
        </div>
        {getQuestionOptions(question).length > 0 && (
          <div>
            <div className="text-sm text-gray-500 mb-2">Answer Options:</div>
            <div className="flex flex-wrap gap-2">
              {getQuestionOptions(question).map((option: any, optIndex: number) => (
                <span key={option.id || optIndex} className="px-3 py-1 bg-white border rounded text-sm">
                  {option.text}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
)

const getElementImageUrl = (element: any) => {
  if (!element) return ""
  if (String(element.element_type || "").toLowerCase() === "text") return ""
  return String(element.url || element.content || "")
}

const getElementText = (element: any) => {
  const isText = String(element?.element_type || "").toLowerCase() === "text"
  return String(
    element?.text_content ||
    element?.textContent ||
    (isText ? element?.content : "") ||
    (isText ? element?.name : "") ||
    ""
  )
}

const isTextElement = (element: any) => {
  if (String(element?.element_type || "").toLowerCase() === "text") return true
  if (getElementImageUrl(element)) return false
  return Boolean(getElementText(element) || element?.name)
}

const getStatementText = (element: any) => {
  const text = getElementText(element)
  if (text) return text
  return String(element?.name || element?.alt_text || "Untitled statement")
}

const TextStatementList = ({ elements }: { elements: any[] }) => (
  <div className="space-y-3 w-full">
    {elements.map((element, index) => (
      <div
        key={element.element_id || element.id || index}
        className="px-4 py-3 text-sm text-gray-800 break-words whitespace-pre-wrap"
        style={{ minHeight: "40px", display: "flex", alignItems: "center" }}
      >
        {getStatementText(element)}
      </div>
    ))}
  </div>
)

const ElementCard = ({ element }: { element: any }) => {
  const imageUrl = getElementImageUrl(element)
  const name = String(element?.name || element?.alt_text || "Untitled element")

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="relative h-28 bg-gray-50 border-b">
        <Image
          src={getConfiguratorThumbnailUrl(imageUrl)}
          alt={String(element?.alt_text || name)}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 160px"
          className="object-contain p-2"
          loading="lazy"
        />
      </div>
      <div className="p-3">
        <div className="text-sm font-medium text-gray-800 break-words">{name}</div>
        <div className="text-xs text-gray-500 mt-1 truncate" title={imageUrl}>
          Image thumbnail
        </div>
      </div>
    </div>
  )
}

const CategoryElementsDisplay = ({ elements, imageFirst = false }: { elements: any[]; imageFirst?: boolean }) => {
  const textElements = elements.filter(isTextElement)
  const imageElements = elements.filter((element) => !isTextElement(element))

  if (textElements.length === 0 && imageElements.length === 0) {
    return <div className="text-sm text-gray-500">No elements to display</div>
  }

  const imageGrid = imageElements.length > 0 && (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {imageElements.map((element: any, elementIndex: number) => (
        <ElementCard key={element.element_id || element.id || elementIndex} element={element} />
      ))}
    </div>
  )

  const textList = textElements.length > 0 && <TextStatementList elements={textElements} />

  if (imageFirst) {
    return (
      <>
        {imageGrid}
        {imageElements.length > 0 && textElements.length > 0 && textList && <div className="mt-4">{textList}</div>}
        {imageElements.length === 0 && textList}
      </>
    )
  }

  return (
    <>
      {textList}
      {textElements.length > 0 && imageElements.length > 0 && imageGrid && <div className="mt-4">{imageGrid}</div>}
      {textElements.length === 0 && imageGrid}
    </>
  )
}

export default function StudyManagementPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const studyId = params.id as string
  const projId = searchParams.get('proj_id') || searchParams.get('projectId')
  const projectQuery = projId ? `?proj_id=${encodeURIComponent(projId)}` : ''
  const homeHref = `/home${projectQuery}`
  const studySubpageHref = (subpage: string) => `/home/study/${studyId}/${subpage}${projectQuery}`
  const { user } = useAuth()
  const isSpecialCreator = checkIsSpecialCreator(user?.email ?? null)

  const [study, setStudy] = useState<StudyDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<StudyAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportStage, setExportStage] = useState(0)
  const exportLoadingMessages = [
    "Getting your responses...",
    "Crunching the numbers...",
    "Building your export...",
    "Creating your CSV...",
    "Almost there...",
  ]
  const [exportMessageIndex, setExportMessageIndex] = useState(0)
  const [showLaunchCongrats, setShowLaunchCongrats] = useState(false)
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false)

  // Cache keys
  const STUDY_CACHE_KEY = `study_details_cache_v2_${studyId}`
  const ANALYTICS_CACHE_KEY = `study_analytics_cache_${studyId}`

  // Hydrate from cache immediately, then fetch fresh in background
  useEffect(() => {
    if (!studyId) return
    try {
      const cachedStudy = localStorage.getItem(STUDY_CACHE_KEY)
      if (cachedStudy) {
        setStudy(JSON.parse(cachedStudy))
        setLoading(false)
      }
      const cachedAnalytics = localStorage.getItem(ANALYTICS_CACHE_KEY)
      if (cachedAnalytics) {
        setAnalytics(JSON.parse(cachedAnalytics))
        setAnalyticsLoading(false)
      }
    } catch { }
    loadStudyDetails()
  }, [studyId])

  // Cycle export CSV loading message while exporting
  useEffect(() => {
    if (!exporting) return
    const id = setInterval(() => {
      setExportMessageIndex((i) => (i + 1) % exportLoadingMessages.length)
    }, 2200)
    return () => clearInterval(id)
  }, [exporting])

  useEffect(() => {
    if (searchParams.get("launched") !== "1") return

    setShowLaunchCongrats(true)

    const params = new URLSearchParams(searchParams.toString())
    params.delete("launched")
    const nextQuery = params.toString()
    router.replace(`/home/study/${studyId}${nextQuery ? `?${nextQuery}` : ""}`)
  }, [searchParams, studyId, router])

  // Live analytics subscription (SSE with fallback)
  useEffect(() => {
    if (!studyId || !study) return
    setAnalyticsLoading(true)
    const unsubscribe = subscribeStudyAnalytics(
      studyId,
      (data) => {
        setAnalytics(data);
        setAnalyticsLoading(false);
        try { localStorage.setItem(ANALYTICS_CACHE_KEY, JSON.stringify(data)) } catch { }
      },
      () => { /* keep silent */ },
      5
    )
    return () => { unsubscribe() }
  }, [studyId, study])

  const loadStudyDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      // Use the new basic API endpoint that doesn't require authentication
      const studyData = await getStudyBasicDetails(studyId)
      setStudy(studyData)
      try { localStorage.setItem(STUDY_CACHE_KEY, JSON.stringify(studyData)) } catch { }
    } catch (err: unknown) {
      console.error("Failed to load study details:", err)
      if ((err as any)?.status === 403) {
        setError("You don't have permission to view this study")
        router.push('/home/studies')
      } else {
        setError((err as Error)?.message || "Failed to load study details")
      }
    } finally {
      setLoading(false)
    }
  }

  // const loadAnalytics = async () => {
  //   try {
  //     setAnalyticsLoading(true)
  //     const analyticsData = await getStudyAnalytics(studyId)
  //     setAnalytics(analyticsData)
  //   } catch (err: unknown) {
  //     console.error("Failed to load analytics:", err)
  //     // Don't show error to user, analytics is optional
  //   } finally {
  //     setAnalyticsLoading(false)
  //   }
  // }

  const handleStatusUpdate = async (newStatus: "active" | "paused" | "completed" | "draft") => {
    if (!study) return

    try {
      setUpdating(true)
      // Optimistic UI: update immediately
      const oldStatus = study.status
      setStudy({ ...study, status: newStatus })

      // Use PUT endpoint as requested for status changes (activate/pause)
      try {
        const updatedStudy = await putUpdateStudy(studyId, { status: newStatus }, 8)
        setStudy(updatedStudy)
      } catch (err: unknown) {
        // Fallback: some servers disallow PUT when active; try PATCH status update
        try {
          const patched = await updateStudyStatus(studyId, newStatus)
          setStudy(patched)
        } catch (err2: any) {
          console.error("PUT then PATCH status update failed:", err, err2)
          // Revert optimistic change on failure
          setStudy((prev) => (prev ? { ...prev, status: oldStatus } : prev))
          setError((err2 && (err2 as any).message) || ((err as any) && (err as any).message) || "Failed to update study status")
        }
        return
      }
    } catch (err: unknown) {
      console.error("Failed to update study status:", err)
      // Revert optimistic change on failure
      setStudy((prev) => (prev ? { ...prev, status: study.status } : prev))
      setError((err as Error)?.message || "Failed to update study status")
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "active": return "text-green-600"
      case "paused": return "text-orange-600"
      case "completed": return "text-blue-600"
      case "draft": return "text-gray-600"
      default: return "text-gray-600"
    }
  }

  const getStatusDisplay = (status: string | undefined) => {
    switch (status) {
      case "draft": return "Draft"
      case "active": return "Active"
      case "paused": return "Paused"
      case "completed": return "Completed"
      default: return status || "Unknown"
    }
  }

  const getActionButton = () => {
    if (!study) return null

    // const isDraftOrPaused = study.status === "draft" || study.status === "paused"
    const isActive = study.status === "active"
    const isCompleted = study.status === "completed"

    if (isCompleted) {
      return (
        <button
          disabled
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-500 rounded-md cursor-not-allowed shrink-0"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Study Completed
        </button>
      )
    }

    if (isActive) {
      return (
        <button
          onClick={() => handleStatusUpdate("draft")}
          disabled={updating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-md text-white rounded-md hover:opacity-90 disabled:opacity-50 shrink-0"
          style={{ backgroundColor: '#FF6B35' }}
        >
          <Pause className="w-3.5 h-3.5" />
          {updating ? "Updating..." : "Pause Study"}
        </button>
      )
    }

    return (
      <button
        onClick={() => handleStatusUpdate("active")}
        disabled={updating}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 shrink-0"
      >
        <Play className="w-3.5 h-3.5" />
        {updating ? "Updating..." : "Activate Study"}
      </button>
    )
  }

  const getCompletionRate = () => {
    if (analytics) {
      return analytics.completion_rate.toFixed(1) + "%"
    }
    // New API doesn't include response counts, so show analytics only
    return "0.0%"
  }

  // const getAbandonmentRate = () => {
  //   if (analytics) {
  //     return analytics.abandonment_rate.toFixed(1) + "%"
  //   }
  //   return "0.0%"
  // }

  const getAverageDuration = () => {
    if (analytics && analytics.average_duration > 0) {
      const minutes = Math.floor(analytics.average_duration / 60)
      const seconds = Math.floor(analytics.average_duration % 60)
      return `${minutes}m ${seconds}s`
    }
    return "0m 0s"
  }

  const buildCsvAndDownload = async () => {
    if (!analytics || (analytics.total_responses ?? 0) === 0) {
      alert('There are no responses to export yet.')
      return
    }

    try {
      setExporting(true)
      setExportStage(0)
      setExportMessageIndex(0)

      // Stage 1: Extracting data
      setExportStage(1)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Stage 2: Processing responses
      setExportStage(2)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Stage 3: Generating CSV
      setExportStage(3)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Actually download the CSV
      const blob = await downloadStudyResponsesCsv(studyId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${study?.title || 'study'}-responses.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export CSV failed:', e)
      alert('Failed to export CSV')
    } finally {
      setExporting(false)
      setExportStage(0)
    }
  }

  if (loading) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-gray-50">
          <DashboardHeader />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error || !study) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-gray-50">
          <DashboardHeader />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
              <p className="text-red-600">{error || "Study not found"}</p>
              <button
                onClick={() => router.push(homeHref)}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // Display helpers
  const createdDisplay = study.created_at ? new Date(study.created_at)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : 'N/A'
  const allClassificationQuestions = Array.isArray((study as any).classification_questions)
    ? (study as any).classification_questions
    : []
  const postClassificationQuestions = [
    ...(Array.isArray((study as any).post_classification_questions) ? (study as any).post_classification_questions : []),
    ...allClassificationQuestions.filter((question: any) => question?.optional_classification_question),
  ]
  const classificationQuestions = allClassificationQuestions.filter(
    (question: any) => !question?.optional_classification_question
  )
  const studyLayers = Array.isArray((study as any).layers) ? (study as any).layers : []
  const rawStudyCategories = Array.isArray((study as any).categories) ? (study as any).categories : []
  const isHybridStudy = study.study_type === "hybrid"
  const hybridPhaseOrder = Array.isArray((study as any).phase_order) ? (study as any).phase_order : ["grid", "text"]
  const getCategoryPhaseRank = (category: any) => {
    const phase = String(category?.phase_type || "grid").toLowerCase()
    const rank = hybridPhaseOrder.indexOf(phase)
    return rank === -1 ? hybridPhaseOrder.length : rank
  }
  const studyCategories = isHybridStudy
    ? [...rawStudyCategories].sort((a, b) => {
        const phaseDiff = getCategoryPhaseRank(a) - getCategoryPhaseRank(b)
        if (phaseDiff !== 0) return phaseDiff
        return Number(a?.order ?? 0) - Number(b?.order ?? 0)
      })
    : rawStudyCategories
  const hasElementDetails = studyLayers.length > 0 || studyCategories.length > 0

  const studyUserRole = (() => {
    const roleFromStudy = (study as StudyDetails & { user_role?: string }).user_role
    if (roleFromStudy) return roleFromStudy
    if (typeof window !== "undefined") {
      if (projId) return localStorage.getItem(`ps_role_${projId}`) || "viewer"
      return localStorage.getItem("user_role") || "admin"
    }
    return "admin"
  })()

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />

        {/* Header Section */}
        <div className="text-white" style={{ backgroundColor: '#2674BA' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Breadcrumbs */}
            <nav className="text-sm mb-2">
              <Link href={homeHref} className="text-blue-200"><span className="text-blue-200">Dashboard</span></Link>

              <span className="mx-2">/</span>
              <Link href={homeHref} className="text-blue-200"><span className="text-blue-200">Studies</span></Link>
              <span className="mx-2">/</span>
              <span className="text-white">{study.study_type === "grid" ? "Grid Study" : study.study_type === "hybrid" ? "Hybrid Study" : study.study_type === "text" ? "Text Study" : "Layer Study"}</span>
            </nav>

            {/* Title and Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <h1 className="text-2xl font-bold min-w-0 break-words flex-1">{study.title}</h1>
              <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                <button
                  onClick={() => (typeof window !== 'undefined' && window.history.length > 1) ? router.back() : router.push(homeHref)}
                  className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-md border rounded-md hover:opacity-80 shrink-0"
                  style={{ borderColor: '#FFFFFF', color: '#FFFFFF' }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <button
                  onClick={() => router.push(studySubpageHref('response'))}
                  className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-md bg-white rounded-md hover:opacity-90 font-medium whitespace-nowrap shrink-0"
                  style={{ color: '#2674BA' }}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  View All Response
                </button>

                <button
                  onClick={() => router.push(studySubpageHref('analytics'))}
                  className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-md bg-white rounded-md hover:opacity-90 font-medium whitespace-nowrap shrink-0"
                  style={{ color: '#2674BA' }}
                >
                  <LineChart className="w-3.5 h-3.5" />
                  Analytics
                </button>

                <button
                  onClick={buildCsvAndDownload}
                  disabled={exporting}
                  className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-md border rounded-md hover:opacity-80 disabled:opacity-60 whitespace-nowrap shrink-0"
                  style={{ borderColor: '#FFFFFF', color: '#FFFFFF' }}
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white shrink-0" />
                      <span>{exportLoadingMessages[exportMessageIndex]}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>Export CSV</span>
                    </>
                  )}
                </button>

                {getActionButton()}
                <button
                  onClick={() => handleStatusUpdate("completed")}
                  disabled={updating || study.status === "completed"}
                  className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-md bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 shrink-0"
                >
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  Complete Study
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Study Overview */}
          <div className="bg-white rounded-lg shadow-sm border p-0 mb-6 overflow-hidden">
            {/* Top row: title + actions */}
            <div className="px-4 sm:px-6 pt-4 pb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-base font-semibold shrink-0" style={{ color: '#2674BA' }}>
                {study.study_type === "layer" ? "Layer Study" : study.study_type === "text" ? "Text Study" : study.study_type === "hybrid" ? "Hybrid Study" : "Grid Study"}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsCollaboratorModalOpen(true)}
                  className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg border border-[rgba(38,116,186,0.35)] text-[rgba(38,116,186,1)] bg-[rgba(38,116,186,0.06)] hover:bg-[rgba(38,116,186,0.12)] transition-all duration-200 cursor-pointer min-w-0"
                  title="Add collaborator"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-sm sm:text-base truncate">
                    <span className="sm:hidden">Collaborator</span>
                    <span className="hidden sm:inline">Add Collaborator</span>
                  </span>
                </button>
                <button
                  onClick={() => study.status === 'active' && router.push(studySubpageHref('share'))}
                  disabled={study.status !== 'active'}
                  className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all duration-200 min-w-0 ${
                    study.status === 'active'
                      ? 'border-[rgba(38,116,186,0.35)] text-[rgba(38,116,186,1)] bg-[rgba(38,116,186,0.06)] hover:bg-[rgba(38,116,186,0.12)] cursor-pointer'
                      : 'border-gray-200 text-gray-400 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                  title={study.status !== 'active' ? 'Activate study to share' : 'Share study with participants'}
                >
                  <Share className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-sm sm:text-base">Share</span>
                </button>
              </div>
            </div>
            <div className="border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }} />
            {/* Meta row */}
            <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-700 shrink-0">Status :</span>
                <span className={getStatusColor(study.status)}>{getStatusDisplay(study.status)}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-700 shrink-0">Type :</span>
                <span className="text-gray-700">{study.study_type === 'layer' ? 'Layer - Based' : study.study_type === 'hybrid' ? 'Hybrid - Based' : study.study_type === 'text' ? 'Text - Based' : 'Grid - Based'}</span>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-700 shrink-0">Created :</span>
                  <span className="text-gray-700 whitespace-nowrap">{createdDisplay}</span>
                </div>
                <a
                  href={`/home/create-study/preview?studyId=${encodeURIComponent(studyId)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-[rgba(38,116,186,1)] hover:underline whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  Preview as Participant ↗
                </a>
              </div>
            </div>
             {/* AI agentic respondents CTA - commented out */}
            {study.status === "completed" ? (
              <div
                className="mx-4 sm:mx-6 mb-4 block rounded-xl p-3 sm:p-4 transition-all duration-300 border border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed"
                aria-disabled="true"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gray-200">
                    <Bot className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-500 text-sm">Don&apos;t have respondents? We&apos;ve got you.</p>
                    <p className="text-gray-400 text-xs mt-0.5">AI agentic respondents — not available for completed studies.</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-300 ml-auto -rotate-90 shrink-0" aria-hidden />
                </div>
              </div>
            ) : (
              <Link
                href={studySubpageHref('synthetic-respondent')}
                className="mx-4 sm:mx-6 mb-4 block rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-300 border hover:scale-[1.01] hover:shadow-md border-[#2674BA]/20 bg-gradient-to-br from-[#2674BA]/10 to-[#2674BA]/5 hover:border-[#2674BA]/50 hover:from-[#2674BA]/18 hover:to-[#2674BA]/10"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(38,116,186,0.15)' }}>
                    <Bot className="w-5 h-5" style={{ color: '#2674BA' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 text-sm">Don&apos;t have respondents? We&apos;ve got you.</p>
                    <p className="text-gray-600 text-xs mt-0.5">AI agentic respondents can complete your study at scale — no waiting for real users.</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 ml-auto -rotate-90 shrink-0" aria-hidden />
                </div>
              </Link>
            )}
            
          </div>

          {/* Response Statistics */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3
              className="text-lg font-semibold pb-2 mb-4"
              style={{ color: '#2674BA' }}
            >
              Response Statistics
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 border rounded-lg" style={{ borderColor: '#2674BA' }}>
                <div className="text-2xl font-bold" style={{ color: '#2674BA' }}>
                  {analyticsLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderColor: '#2674BA' }}></div>
                  ) : (
                    analytics?.total_responses ?? 0
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Responses</div>
              </div>
              <div className="text-center p-4 border rounded-lg" style={{ borderColor: '#2674BA' }}>
                <div className="text-2xl font-bold" style={{ color: '#2674BA' }}>
                  {analyticsLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderColor: '#2674BA' }}></div>
                  ) : (
                    analytics?.in_progress_responses ?? 0
                  )}
                </div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
              <div className="text-center p-4 border rounded-lg" style={{ borderColor: '#2674BA' }}>
                <div className="text-2xl font-bold" style={{ color: '#2674BA' }}>
                  {analyticsLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderColor: '#2674BA' }}></div>
                  ) : (
                    analytics?.completed_responses ?? 0
                  )}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center p-4 border rounded-lg" style={{ borderColor: '#2674BA' }}>
                <div className="text-2xl font-bold" style={{ color: '#2674BA' }}>
                  {analyticsLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderColor: '#2674BA' }}></div>
                  ) : (
                    analytics?.abandoned_responses ?? 0
                  )}
                </div>
                <div className="text-sm text-gray-600">Abandoned</div>
              </div>
              <div className="text-center p-4 border rounded-lg" style={{ borderColor: '#2674BA' }}>
                <div className="text-2xl font-bold" style={{ color: '#2674BA' }}>
                  {analyticsLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderColor: '#2674BA' }}></div>
                  ) : (
                    getCompletionRate()
                  )}
                </div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
              <div className="text-center p-4 border rounded-lg" style={{ borderColor: '#2674BA' }}>
                <div className="text-2xl font-bold" style={{ color: '#2674BA' }}>
                  {analyticsLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderColor: '#2674BA' }}></div>
                  ) : (
                    getAverageDuration()
                  )}
                </div>
                <div className="text-sm text-gray-600">Avg Duration</div>
              </div>
            </div>
          </div>

          {/* Study Configuration */}
          <AccordionSection title="Study Configuration">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Background</label>
                <div className="w-full py-2 bg-white text-gray-700 whitespace-pre-wrap break-words">
                  {study.background}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Main Question</label>
                <div className="w-full py-2 bg-white text-gray-700 whitespace-pre-wrap break-words">
                  {study.main_question || ''}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orientation Text</label>
                <div className="w-full py-2 bg-white text-gray-700 whitespace-pre-wrap break-words">
                  {study.orientation_text}
                </div>
              </div>
            </div>
          </AccordionSection>



          {/* Study Configuration Details */}
          <AccordionSection title="Study Metadata">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scale</label>
                <div className="w-full py-2 bg-white text-gray-700 whitespace-pre-wrap break-words">
                  {`${study.rating_scale.min_value} to ${study.rating_scale.max_value} ${study.rating_scale.min_label}-${study.rating_scale.max_label}`}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Study Elements Content</label>
                <div className="w-full py-2 bg-white text-gray-700 whitespace-pre-wrap break-words">
                  {`${(study as any).element_count || 0}`} Elements
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Classification Questions</label>
                <div className="w-full py-2 bg-white text-gray-700 whitespace-pre-wrap break-words">
                  {`${classificationQuestions.length} Question${classificationQuestions.length !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* Classification Questions */}
          {classificationQuestions.length > 0 && (
            <AccordionSection title="Classification Questions">
              <QuestionList questions={classificationQuestions} />
            </AccordionSection>
          )}

          {/* Post Classification Questions */}
          {postClassificationQuestions.length > 0 && (
            <AccordionSection title="Post Classification Questions">
              <QuestionList questions={postClassificationQuestions} />
            </AccordionSection>
          )}

          {/* Study Elements */}
          {hasElementDetails && (
            <AccordionSection title="Study Elements">
              <div className="space-y-6">
                {studyLayers.map((layer: any, layerIndex: number) => {
                  const elements = Array.isArray(layer.elements)
                    ? layer.elements
                    : Array.isArray(layer.images)
                      ? layer.images
                      : []
                  return (
                    <div key={layer.layer_id || layer.id || layerIndex} className="border rounded-xl p-4 bg-white">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-800 break-words">{layer.name || `Layer ${layerIndex + 1}`}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {elements.length} element{elements.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {layer.layer_type && (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-[#2674BA] w-fit">
                            {String(layer.layer_type).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {elements.map((element: any, elementIndex: number) => (
                          <ElementCard key={element.image_id || element.element_id || element.id || elementIndex} element={element} />
                        ))}
                      </div>
                    </div>
                  )
                })}

                {studyCategories.map((category: any, categoryIndex: number) => {
                  const elements = Array.isArray(category.elements) ? category.elements : []
                  return (
                    <div key={category.category_id || category.id || categoryIndex} className="border rounded-xl p-4 bg-white">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-800 break-words">{category.name || `Category ${categoryIndex + 1}`}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {elements.length} element{elements.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {category.phase_type && (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-[#2674BA] w-fit">
                            {String(category.phase_type).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <CategoryElementsDisplay elements={elements} imageFirst={isHybridStudy} />
                    </div>
                  )
                })}
              </div>
            </AccordionSection>
          )}

          {/* Audience Segmentation */}
          {(study as any).study_config && (
            <AccordionSection title="Audience Segmentation">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Country</label>
                  <div className="py-2 bg-white text-gray-700 whitespace-pre-wrap break-words">
                    {(study as any).study_config.country || 'Not specified'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Respondents</label>
                  <div className="py-2 bg-white text-gray-700 whitespace-pre-wrap break-words">
                    {(study as any).study_config.number_of_respondents || 0}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender Distribution</label>
                  <div className="space-y-2">
                    {Object.entries((study as any).study_config.gender_distribution || {}).map(([gender, percentage]: [string, any]) => (
                      percentage > 0 && (
                        <div key={gender} className="flex items-center gap-4 py-1">
                          <span className="text-sm text-gray-600 capitalize w-16">{gender}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${percentage}%`, backgroundColor: '#2674BA' }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-10 text-right">{percentage}%</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age Distribution</label>
                  <div className="space-y-1">
                    {Object.entries((study as any).study_config.age_distribution || {}).map(([ageGroup, percentage]: [string, any]) => (
                      percentage > 0 && (
                        <div key={ageGroup} className="flex items-center gap-4 py-1">
                          <span className="text-sm text-gray-600 w-16">{ageGroup}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${percentage}%`, backgroundColor: '#2674BA' }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-10 text-right">{percentage}%</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            </AccordionSection>
          )}

          {/* Orientation Text */}
          {study.orientation_text && (
            <AccordionSection title="Orientation Text">
              <div className="bg-white p-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{study.orientation_text}</p>
              </div>
            </AccordionSection>
          )}

          {/* Product Details - special creator only, when present in API response */}
          {isSpecialCreator && ((study as any).product_id || ((study as any).product_keys?.length ?? 0) > 0) && (
            <AccordionSection title="Product Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(study as any).product_id != null && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                    <div className="w-full py-2 bg-white text-gray-700 whitespace-pre-wrap break-words">
                      {(study as any).product_id}
                    </div>
                  </div>
                )}
                {((study as any).product_keys?.length ?? 0) > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Keys</label>
                    <div className="space-y-2">
                      {((study as any).product_keys as { name: string; percentage: number }[]).map((key: { name: string; percentage: number }, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 py-1">
                          <span className="text-sm text-gray-600 w-32">{key.name}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${key.percentage}%`, backgroundColor: '#2674BA' }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-10 text-right">{key.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AccordionSection>
          )}

          {/* Study Response */}
          {/* <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3
              className="text-lg font-semibold border-b pb-2 mb-4"
              style={{ color: '#2674BA', borderColor: '#2674BA' }}
            >
              Study Response
            </h3>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Total Response</span>
                <span
                  className="px-3 py-1 text-white rounded-full text-sm font-medium"
                  style={{ backgroundColor: '#2674BA' }}
                >
                  {analyticsLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    analytics?.total_responses ?? 0
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Completed</span>
                <span
                  className="px-3 py-1 text-white rounded-full text-sm font-medium"
                  style={{ backgroundColor: '#2674BA' }}
                >
                  {analyticsLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    analytics?.completed_responses ?? 0
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Abandoned</span>
                <span
                  className="px-3 py-1 text-white rounded-full text-sm font-medium"
                  style={{ backgroundColor: '#2674BA' }}
                >
                  {analyticsLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    analytics?.abandoned_responses ?? 0
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span
                  className="text-sm font-medium"
                  style={{ color: '#2674BA' }}
                >
                  {analyticsLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#2674BA' }}></div>
                  ) : (
                    getCompletionRate()
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Avg Duration</span>
                <span
                  className="text-sm font-medium"
                  style={{ color: '#2674BA' }}
                >
                  {analyticsLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#2674BA' }}></div>
                  ) : (
                    getAverageDuration()
                  )}
                </span>
              </div>
            </div>
          </div> */}
        </div>
      </div>

      <ShareStudyModal
        isOpen={isCollaboratorModalOpen}
        onClose={() => setIsCollaboratorModalOpen(false)}
        studyId={studyId}
        userRole={studyUserRole}
      />

      <StudyLaunchCongrats
        isOpen={showLaunchCongrats}
        studyId={studyId}
        projectQuery={projectQuery}
        onClose={() => setShowLaunchCongrats(false)}
      />
    </AuthGuard>
  )
}
