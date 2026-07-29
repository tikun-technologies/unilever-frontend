"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronDown, Plus, LogOut, PlayCircle, Share2, Trash2, Eye, LayoutTemplate } from "lucide-react"
import { useAuth } from "@/lib/auth/AuthContext"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ShareStudyModal } from "@/components/create-study/ShareStudyModal"
import { ShareProjectModal } from "@/components/home/ShareProjectModal"
import { deleteStudy } from "@/lib/api/StudyAPI"
import { requestRestartWalkthrough } from "@/components/onboarding/MindSurveOnboarding"
import { prepareFreshCreateStudy, hasGeneratedTasks } from "@/lib/utils/createStudyStorage"
import { JobNotificationBell } from "@/components/notifications/JobNotificationBell"
import { fetchTemplatePermissions } from "@/lib/api/templateApi"
import { BrandLogo } from "@/components/brand/BrandLogo"

export function DashboardHeader() {
  const { user, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isProjectShareModalOpen, setIsProjectShareModalOpen] = useState(false)
  const [isDisposeModalOpen, setIsDisposeModalOpen] = useState(false)
  const [isDisposing, setIsDisposing] = useState(false)
  const [studyId, setStudyId] = useState<string | null>(null)
  const [tasksGenerated, setTasksGenerated] = useState(false)
  const [userRole, setUserRole] = useState<string>('viewer')
  const [canManageTemplates, setCanManageTemplates] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projId = searchParams.get('proj_id') || searchParams.get('projectId')
  const homeHref = projId ? `/home?proj_id=${encodeURIComponent(projId)}` : '/home'
  const isCreateStudyRoute = pathname?.startsWith('/home/create-study')

  // Effect to track cs_study_id, task generation, and user_role in localStorage
  useEffect(() => {
    const checkStudyInfo = () => {
      const storedId = localStorage.getItem('cs_study_id')

      // If we are in a project context, strictly use the project-specific role
      if (projId) {
        const projRole = localStorage.getItem(`ps_role_${projId}`)
        // If we have a project role, use it. Otherwise default to 'viewer' (safe)
        // We do NOT fall back to global 'user_role' here because project permissions are distinct
        setUserRole(projRole || 'viewer')
      } else {
        // Not in project context (or looking at a study), check global/study role.
        // If it's missing, default to 'admin' so that a user who can reach the
        // dashboard is not accidentally treated as a viewer everywhere.
        const role = localStorage.getItem('user_role')
        if (role) {
          setUserRole(role)
        } else {
          setUserRole('admin')
        }
      }

      if (storedId) {
        // Handle both plain string and JSON-stringified format
        try {
          const parsed = JSON.parse(storedId)
          if (typeof parsed === 'string') {
            setStudyId(parsed)
          } else {
            setStudyId(storedId)
          }
        } catch {
          setStudyId(storedId)
        }
      } else {
        setStudyId(null)
      }

      setTasksGenerated(hasGeneratedTasks())
    }

    const handleStudyInfoChange = () => checkStudyInfo()

    // Check periodically since Step 1 might update it
    const interval = setInterval(checkStudyInfo, 1000)
    checkStudyInfo() // Initial check

    window.addEventListener('stepDataChanged', handleStudyInfoChange)
    window.addEventListener('storage', handleStudyInfoChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('stepDataChanged', handleStudyInfoChange)
      window.removeEventListener('storage', handleStudyInfoChange)
    }
  }, [projId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const can = await fetchTemplatePermissions()
        if (!cancelled) setCanManageTemplates(can)
      } catch {
        if (!cancelled) setCanManageTemplates(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.email])

  const canViewStudyDetail = !!studyId && tasksGenerated

  const handleViewStudyDetail = () => {
    if (!canViewStudyDetail || !studyId) return
    const url = projId
      ? `/home/study/${studyId}?proj_id=${encodeURIComponent(projId)}`
      : `/home/study/${studyId}`
    router.push(url)
  }

  const handleCreateNewStudy = () => {
    prepareFreshCreateStudy()
    // Navigate to create-study page
    const url = projId ? `/home/create-study?proj_id=${projId}` : '/home/create-study'
    router.push(url)
  }

  const canDisposeStudy = userRole === 'admin' || userRole === 'editor'

  const handleDisposeStudyConfirm = async () => {
    if (!studyId) return
    setIsDisposing(true)
    try {
      await deleteStudy(studyId)
      setIsDisposeModalOpen(false)
      const homeUrl = projId ? `/home?proj_id=${projId}` : '/home'
      router.push(homeUrl)
    } catch (err) {
      console.error('Dispose study failed:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete study')
    } finally {
      setIsDisposing(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white border-b border-[rgba(209,223,235,1)] px-3 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-16 min-w-0">

          <Link href={homeHref} className="shrink-0">
            <div className="flex items-center">
              <motion.div whileHover={{ scale: 1.05 }} className="whitespace-nowrap">
                <BrandLogo className="text-lg sm:text-2xl" />
              </motion.div>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* View Detail + Share (Create Study Route Only) */}
            {isCreateStudyRoute && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 sm:gap-2"
              >
                <Button
                  onClick={handleViewStudyDetail}
                  disabled={!canViewStudyDetail}
                  variant="outline"
                  className={`${canViewStudyDetail
                    ? "border-blue-200 text-blue-600 hover:bg-blue-50"
                    : "opacity-50 cursor-not-allowed text-gray-400 border-gray-200"
                    } h-9 px-2 sm:px-3 md:px-4 py-2 rounded-lg flex items-center justify-center gap-1 sm:gap-2 transition-all shrink-0 text-xs sm:text-sm`}
                  title={
                    !studyId
                      ? "Create a study first to view details"
                      : !tasksGenerated
                        ? "Generate tasks to view study details"
                        : "View study details"
                  }
                >
                  <Eye className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">View Details</span>
                </Button>
                <Button
                  onClick={() => setIsShareModalOpen(true)}
                  disabled={!studyId || !userRole}
                  variant="outline"
                  className={`${studyId
                    ? "border-blue-200 text-blue-600 hover:bg-blue-50"
                    : "opacity-50 cursor-not-allowed text-gray-400 border-gray-200"
                    } h-9 w-9 sm:h-auto sm:w-auto p-0 sm:px-3 md:px-4 sm:py-2 rounded-lg flex items-center justify-center sm:space-x-2 transition-all shrink-0`}
                  title={!studyId ? "Create a study first to share" : "Share study"}
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">Share</span>
                </Button>
                {/* <Button
                  onClick={() => canDisposeStudy && setIsDisposeModalOpen(true)}
                  disabled={!studyId || !canDisposeStudy}
                  variant="outline"
                  className={`${studyId && canDisposeStudy
                    ? "border-red-200 text-red-600 hover:bg-red-50"
                    : "opacity-50 cursor-not-allowed text-gray-400 border-gray-200"
                    } px-4 py-2 rounded-lg flex items-center space-x-2 transition-all`}
                  title={!studyId ? "Create a study first" : !canDisposeStudy ? "Only editors and admins can dispose a study" : "Dispose study"}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Dispose Study</span>
                </Button> */}
              </motion.div>
            )}

            {!isCreateStudyRoute && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleCreateNewStudy}
                  disabled={!!projId && userRole === 'viewer'}
                  data-tour="create-study-header"
                  className={`bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white h-9 px-2.5 sm:px-4 py-2 rounded-lg flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap ${!!projId && userRole === 'viewer' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={!!projId && userRole === 'viewer' ? "Viewers cannot create studies" : "Create new study"}
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="sm:hidden">Create study</span>
                  <span className="hidden sm:inline">Create New Study</span>
                </Button>
              </motion.div>
            )}

            <JobNotificationBell />

            <div className="relative" ref={dropdownRef}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-1 sm:gap-2 cursor-pointer"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src="/professional-headshot.png" />
                  <AvatarFallback>
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium text-gray-700 max-w-[8rem] truncate">
                  {user?.name || 'User'}
                </span>
                <ChevronDown className="hidden sm:block w-4 h-4 text-gray-500 shrink-0" />
              </motion.div>

              {/* Dropdown Menu */}
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-50 bg-white rounded-md shadow-lg border border-gray-200 z-100"
                >
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                      <div className="font-medium">{user?.name || 'User'}</div>
                      <div className="text-gray-500 break-all whitespace-normal">{user?.email || ''}</div>
                    </div>
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        void requestRestartWalkthrough(homeHref, router)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Restart Walkthrough</span>
                    </button>
                    {canManageTemplates && (
                      <button
                        onClick={() => {
                          setShowDropdown(false)
                          router.push("/home/templates")
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
                      >
                        <LayoutTemplate className="w-4 h-4" />
                        <span>Manage Templates</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        logout()
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {isShareModalOpen && studyId && (
        <ShareStudyModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          studyId={studyId}
          userRole={userRole}
        />
      )}

      {isProjectShareModalOpen && projId && (
        <ShareProjectModal
          isOpen={isProjectShareModalOpen}
          onClose={() => setIsProjectShareModalOpen(false)}
          projectId={projId}
          userRole={userRole}
        />
      )}

      {/* Dispose Study confirmation modal */}
      {isDisposeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
            <p className="text-gray-800 text-lg font-medium mb-6">
              Are you sure you want to delete this?
            </p>
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => !isDisposing && setIsDisposeModalOpen(false)}
                disabled={isDisposing}
                className="px-4 py-2"
              >
                No
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisposeStudyConfirm}
                disabled={isDisposing}
                className="px-4 py-2"
              >
                {isDisposing ? "Deleting…" : "Yes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
