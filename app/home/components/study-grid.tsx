"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Calendar, Share2, Eye, Folder, Circle, FolderPlus, Copy, Trash2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { StudyListItem, copyStudy, deleteStudy } from "@/lib/api/StudyAPI"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import { Project } from "@/api/projectApi"
import { mapStudyToProject, unmapStudyFromProject, getStudyProjectMapping } from "@/lib/utils/projectUtils"

interface StudyGridProps {
  studies: StudyListItem[]
  activeTab: string
  searchQuery: string
  selectedType: string
  selectedTime: string
  loading: boolean
  error: string | null
  projects: Project[]
  onMappingChange?: () => void
  onStudyCopied?: () => void | Promise<void>
  onStudyDeleted?: () => void | Promise<void>
}

export function StudyGrid({
  studies,
  activeTab,
  searchQuery,
  selectedType,
  selectedTime,
  loading,
  error,
  projects,
  onMappingChange,
  onStudyCopied,
  onStudyDeleted
}: StudyGridProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projId = searchParams.get('proj_id')
  const [loadingStudyId, setLoadingStudyId] = useState<string | null>(null)
  const [studyProjectMapping, setStudyProjectMapping] = useState<Record<string, string>>({})
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [copyLoadingStudyId, setCopyLoadingStudyId] = useState<string | null>(null)
  const [copyErrorStudyId, setCopyErrorStudyId] = useState<string | null>(null)
  const [copyErrorMessage, setCopyErrorMessage] = useState<string>("")
  const [canCopyStudies, setCanCopyStudies] = useState(true)
  const [deleteConfirmStudy, setDeleteConfirmStudy] = useState<StudyListItem | null>(null)
  const [deleteLoadingStudyId, setDeleteLoadingStudyId] = useState<string | null>(null)

  useEffect(() => {
    setStudyProjectMapping(getStudyProjectMapping())
  }, [])

  // Role-based visibility: hide Copy when inside a project and user is Viewer
  useEffect(() => {
    if (projId) {
      const role = typeof window !== "undefined" ? localStorage.getItem(`ps_role_${projId}`) : null
      setCanCopyStudies(role !== "viewer")
    } else {
      setCanCopyStudies(true)
    }
  }, [projId])

  const handleMapStudy = (studyId: string, projectId: string | null) => {
    if (projectId) {
      mapStudyToProject(studyId, projectId)
    } else {
      unmapStudyFromProject(studyId)
    }
    setStudyProjectMapping(getStudyProjectMapping())
    if (onMappingChange) onMappingChange()
    setActiveMenuId(null)
  }

  const clearCreateStudyLocalStorage = () => {
    // Clear all create-study related localStorage items to start fresh from Step 1
    const keysToRemove = [
      'cs_step1',
      'cs_step2',
      'cs_step3',
      'cs_step4',
      'cs_step5_grid',
      'cs_step5_text',
      'cs_step5_hybrid',
      'cs_step5_hybrid_grid',
      'cs_step5_hybrid_text',
      'cs_step5_hybrid_phase_order',
      'cs_step5_layer',
      'cs_step5_layer_background',
      'cs_step5_layer_preview_aspect',
      'cs_step6',
      'cs_step7_tasks',
      'cs_step7_matrix',
      'cs_step7_job_state',
      'cs_step7_timer_state',
      'cs_current_step',
      'cs_backup_steps',
      'cs_flash_message',
      'cs_resuming_draft',
      'cs_study_id',
      'cs_is_fresh_start',
      'cs_step8'
    ]

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch { }
    })

    // Set flag to indicate this is a fresh start (no resuming)
    try {
      localStorage.setItem('cs_is_fresh_start', 'true')
    } catch { }
  }

  const handleViewDetails = (study: StudyListItem) => {
    // If study is draft, redirect to create-study page with last_step
    if (study.status === 'draft') {
      setLoadingStudyId(study.id)

      // Get last_step from study object or from cache
      let lastStep = study.last_step || 1

      // Try to get from cache if not in study object
      if (!study.last_step) {
        try {
          const cached = localStorage.getItem('home_studies_cache')
          if (cached) {
            const studies = JSON.parse(cached) as StudyListItem[]
            const cachedStudy = studies.find(s => s.id === study.id)
            if (cachedStudy?.last_step) {
              lastStep = cachedStudy.last_step
            }
          }
        } catch { }
      }

      // Store study_id and flag for create-study page to load data
      localStorage.setItem('cs_study_id', study.id)
      localStorage.setItem('cs_current_step', String(lastStep))
      localStorage.setItem('cs_resuming_draft', 'true')
      // Clear the fresh start flag to allow normal resuming
      localStorage.removeItem('cs_is_fresh_start')
      // Also clear Step 8 status so it's re-evaluated
      localStorage.removeItem('cs_step8')

      // Navigate to create-study page
      const url = projId ? `/home/create-study?proj_id=${projId}` : '/home/create-study'
      router.push(url)
    } else {
      const url = projId ? `/home/study/${study.id}?proj_id=${projId}` : `/home/study/${study.id}`
      router.push(url)
    }
  }

  const handleCreateNewStudy = () => {
    // Clear all create-study localStorage to start fresh from Step 1
    clearCreateStudyLocalStorage()
    // Navigate to create-study page
    const url = projId ? `/home/create-study?proj_id=${projId}` : '/home/create-study'
    router.push(url)
  }

  const handleShare = (studyId: string) => {
    const url = projId ? `/home/study/${studyId}/share?proj_id=${projId}` : `/home/study/${studyId}/share`
    router.push(url)
  }

  const handleCopyStudy = async (studyId: string) => {
    if (copyLoadingStudyId) return
    setCopyLoadingStudyId(studyId)
    setCopyErrorStudyId(null)
    setCopyErrorMessage("")
    try {
      // When user is in a project, send project_id so the copied study is added to that project; in All Studies send nothing
      await copyStudy(studyId, projId || undefined)
      await onStudyCopied?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to copy study"
      setCopyErrorStudyId(studyId)
      setCopyErrorMessage(message)
    } finally {
      setCopyLoadingStudyId(null)
    }
  }

  const handleDeleteStudyClick = (study: StudyListItem) => {
    setDeleteConfirmStudy(study)
  }

  const handleDeleteStudyConfirm = async (confirmed: boolean) => {
    if (!deleteConfirmStudy) {
      setDeleteConfirmStudy(null)
      return
    }
    if (!confirmed) {
      setDeleteConfirmStudy(null)
      return
    }
    const studyId = deleteConfirmStudy.id
    setDeleteLoadingStudyId(studyId)
    setCopyErrorStudyId(null)
    setCopyErrorMessage("")
    try {
      await deleteStudy(studyId)
      setDeleteConfirmStudy(null)
      await onStudyDeleted?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete study"
      setCopyErrorStudyId(studyId)
      setCopyErrorMessage(message)
    } finally {
      setDeleteLoadingStudyId(null)
    }
  }

  // Filter studies based on active tab, search query, and filters
  const filteredStudies = studies.filter((study) => {
    // Tab filtering
    if (activeTab === "Active Studies" && study.status !== "active") return false
    if (activeTab === "Draft Studies" && study.status !== "draft") return false
    if (activeTab === "Complete" && study.status !== "completed") return false

    // Search filtering
    if (searchQuery && !study.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Type filtering
    if (selectedType !== "All Types") {
      if (selectedType === "Grid" && study.study_type !== "grid") return false
      if (selectedType === "Layer" && study.study_type !== "layer") return false
      if (selectedType === "Hybrid" && study.study_type !== "hybrid") return false
      if (selectedType === "Text" && study.study_type !== "text") return false
    }

    // Time filtering (simplified - you can implement more sophisticated date filtering)
    if (selectedTime !== "All Time") {
      const studyDate = new Date(study.created_at)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - studyDate.getTime()) / (1000 * 60 * 60 * 24))

      switch (selectedTime) {
        case "Last 7 days":
          if (daysDiff > 7) return false
          break
        case "Last 30 days":
          if (daysDiff > 30) return false
          break
        case "Last 3 months":
          if (daysDiff > 90) return false
          break
        case "Last year":
          if (daysDiff > 365) return false
          break
      }
    }

    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600"
      case "draft":
        return "text-yellow-600"
      case "completed":
        return "text-blue-600"
      case "paused":
        return "text-gray-600"
      default:
        return "text-gray-600"
    }
  }

  const getCompletionRate = (study: StudyListItem) => {
    if (study.total_responses === 0) return 0
    return Math.round((study.completed_responses / study.total_responses) * 100)
  }

  // const getAbandonmentRate = (study: StudyListItem) => {
  //   if (study.total_responses === 0) return 0
  //   return Math.round((study.abandoned_responses / study.total_responses) * 100)
  // }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border-2 border-[rgba(209,223,235,1)] p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
              <div className="flex justify-between">
                <div className="h-8 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-8"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading studies: {error}</div>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  if (filteredStudies.length === 0) {
    // Check if there are no studies at all vs no studies matching filters
    const hasFilters = searchQuery || selectedType !== "All Types" || selectedTime !== "All Time" || activeTab !== "All Studies"

    return (
      <div className="text-center py-12">
        {studies.length === 0 ? (
          // No studies at all
          <div className="max-w-md mx-auto">
            <div className="text-gray-500 mb-4">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Studies Yet</h3>
              <p className="text-sm text-gray-500 mb-6">
                You haven&apos;t created any studies yet. Create your first study to get started with research and data collection.
              </p>
            </div>
            <Button
              onClick={handleCreateNewStudy}
              className="bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white px-6 py-2 rounded-lg"
            >
              Create Your First Study
            </Button>
          </div>
        ) : (
          // Studies exist but don't match filters
          <div className="max-w-md mx-auto">
            <div className="text-gray-500 mb-4">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Studies Found</h3>
              <p className="text-sm text-gray-500 mb-6">
                {hasFilters
                  ? "No studies match your current filters. Try adjusting your search criteria or clearing the filters."
                  : "No studies found in this category."
                }
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              {hasFilters && (
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2"
                >
                  Clear Filters
                </Button>
              )}
              <Button
                onClick={handleCreateNewStudy}
                className="bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white px-4 py-2 rounded-lg"
              >
                Create New Study
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {filteredStudies.map((study, index) => (
        <motion.div
          key={study.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="bg-white rounded-lg shadow-sm border-2 border-[rgba(209,223,235,1)] p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm font-medium ${getStatusColor(study.status)}`}>
              {study.status.charAt(0).toUpperCase() + study.status.slice(1)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[rgba(38,116,186,1)] text-sm font-medium">
                {study.study_type.charAt(0).toUpperCase() + study.study_type.slice(1)}
              </span>

              <div className="relative">
                {/* <button
                  onClick={() => setActiveMenuId(activeMenuId === study.id ? null : study.id)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  title="Manage Project"
                >
                  <FolderPlus className="w-4 h-4 text-gray-400 hover:text-[rgba(38,116,186,1)]" />
                </button> */}

                {activeMenuId === study.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setActiveMenuId(null)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-20">
                      <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase">
                        Assign to Project
                      </p>
                      <button
                        onClick={() => handleMapStudy(study.id, null)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${!studyProjectMapping[study.id] ? 'text-[rgba(38,116,186,1)] font-medium bg-[rgba(38,116,186,0.05)]' : 'text-gray-700'}`}
                      >
                        <Circle className={`w-2 h-2 ${!studyProjectMapping[study.id] ? 'fill-current' : ''}`} />
                        No Project
                      </button>
                      {projects.map(project => (
                        <button
                          key={project.id}
                          onClick={() => handleMapStudy(study.id, project.id)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${studyProjectMapping[study.id] === project.id ? 'text-[rgba(38,116,186,1)] font-medium bg-[rgba(38,116,186,0.05)]' : 'text-gray-700'}`}
                        >
                          <Circle className={`w-2 h-2 ${studyProjectMapping[study.id] === project.id ? 'fill-current' : ''}`} />
                          {project.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Project Tag */}
          {studyProjectMapping[study.id] && (
            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-[rgba(38,116,186,1)] mb-2">
              <Folder className="w-3 h-3 mr-1" />
              {projects.find(p => p.id === studyProjectMapping[study.id])?.name || 'Project'}
            </div>
          )}

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{study.title}</h3>

          {/* Date */}
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Calendar className="w-4 h-4 mr-1" />
            {format(new Date(study.created_at), 'dd MMM yyyy - h:mm a')}
          </div>

          {/* Description */}
          {/* <p className="text-sm text-gray-600 mb-4">this is to se what type...</p> */}

          {/* Three metric cards in a row */}
          <div className="flex gap-6 mb-6 flex-wrap">
            {/* Total Response */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[rgba(38,116,186,1)] rounded flex items-center justify-center text-white text-xs font-medium">
                {study.total_responses}
              </div>
              <span className="text-sm text-gray-600">Total Response</span>
            </div>

            {/* Completed */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[rgba(38,116,186,1)] rounded flex items-center justify-center text-white text-xs font-medium">
                {study.completed_responses}
              </div>
              <span className="text-sm text-gray-600">Completed</span>
            </div>

            {/* Success Rate */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-8 bg-[rgba(38,116,186,1)] rounded flex items-center justify-center text-white text-xs font-medium px-2">
                {getCompletionRate(study)}%
              </div>
              <span className="text-sm text-gray-600">Total Response</span>
            </div>

            {/* Study Complete (%) using respondents_completed/respondents_target */}
            {typeof (study as StudyListItem & { respondents_target?: number; respondents_completed?: number }).respondents_target !== 'undefined' && typeof (study as StudyListItem & { respondents_target?: number; respondents_completed?: number }).respondents_completed !== 'undefined' && (
              <div className="flex items-center space-x-3">
                <div className="w-12 h-8 bg-[rgba(38,116,186,1)] rounded flex items-center justify-center text-white text-xs font-medium px-3">
                  {(() => {
                    const target = Number((study as StudyListItem & { respondents_target?: number; respondents_completed?: number }).respondents_target || 0)
                    const done = Number((study as StudyListItem & { respondents_target?: number; respondents_completed?: number }).respondents_completed || 0)
                    if (target <= 0) return '0%'
                    const pct = Math.round((done / target) * 100)
                    return `${pct}%`
                  })()}
                </div>
                <span className="text-sm text-gray-600">Study Complete</span>
              </div>
            )}
          </div>

          {/* Copy error feedback */}
          {copyErrorStudyId === study.id && copyErrorMessage && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {copyErrorMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => handleViewDetails(study)}
                disabled={study.status === 'draft' && loadingStudyId === study.id}
                className="bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white px-6 py-2 rounded-lg flex items-center space-x-2 flex-1 mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingStudyId === study.id && study.status === 'draft' ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="cursor-pointer">Loading...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span className="cursor-pointer">{study.status === 'draft' ? 'Continue Editing' : 'View Details'}</span>
                  </>
                )}
              </Button>
            </motion.div>

            <div className="flex items-center gap-2">
              {canCopyStudies && study.user_role !== "viewer" && study.status !== "draft" && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleCopyStudy(study.id)}
                  disabled={copyLoadingStudyId !== null}
                  className="w-10 h-10 bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Copy study"
                >
                  {copyLoadingStudyId === study.id ? (
                    <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Copy className="w-5 h-5 text-white cursor-pointer" />
                  )}
                </motion.button>
              )}
              {study.user_role === "admin" && study.status === "draft" && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDeleteStudyClick(study)}
                  disabled={deleteLoadingStudyId !== null}
                  className="w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete study"
                >
                  {deleteLoadingStudyId === study.id ? (
                    <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5 text-white cursor-pointer" />
                  )}
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleShare(study.id)}
                className="w-10 h-10 bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] rounded-full flex items-center justify-center transition-colors"
                title="Share study"
              >
                <Share2 className="w-5 h-5 text-white cursor-pointer" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>

    {/* Delete study confirmation modal */}
    {deleteConfirmStudy && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
          <p className="text-gray-800 font-medium mb-6">Do you want to delete this study?</p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleDeleteStudyConfirm(false)}
              disabled={deleteLoadingStudyId !== null}
              className="px-4 py-2"
            >
              No
            </Button>
            <Button
              onClick={() => handleDeleteStudyConfirm(true)}
              disabled={deleteLoadingStudyId !== null}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteLoadingStudyId === deleteConfirmStudy.id ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Yes"
              )}
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
