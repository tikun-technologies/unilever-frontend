"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { motion } from "framer-motion"
import { useSearchParams, useRouter } from "next/navigation"
import { DashboardHeader } from "./components/dashboard-header"
import { OverviewCards } from "./components/overview-cards"
import { StudyFilters } from "./components/study-filters"
import { StudyGrid } from "./components/study-grid"
import { AuthGuardDebug as AuthGuard } from "@/components/auth/AuthGuardDebug"
import { getStudies, StudyListItem, fetchWithAuth } from "@/lib/api/StudyAPI"
import { API_BASE_URL } from "@/lib/api/LoginApi"
import { Sidebar } from "./components/sidebar"
import { CreateProjectModal } from "./components/create-project-modal"
import { EditProjectModal } from "./components/edit-project-modal"
import { ShareProjectModal } from "@/components/home/ShareProjectModal"
import {
  getProjects as getProjectsApi,
  createProject as createProjectApi,
  updateProject as updateProjectApi,
  getProjectStudies as getProjectStudiesApi,
  getProjectMembers as getProjectMembersApi,
  downloadProjectCsv,
  startProjectZipExport,
  exportCompletedPanelists,
  Project
} from "@/api/projectApi"
import { getStudyProjectMapping } from "@/lib/utils/projectUtils"
import { useAuth } from "@/lib/auth/AuthContext"
import { checkIsSpecialCreator } from "@/lib/config/specialCreators"
import { FileDown, Link } from "lucide-react"

// Redirect to login without showing error when auth fails (token expired, not authenticated, etc.)
function redirectToLoginOnAuthError() {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('auth_redirecting', 'true')
  localStorage.removeItem('user')
  localStorage.removeItem('tokens')
  localStorage.removeItem('auth_user')
  localStorage.removeItem('token')
  window.location.replace('/login')
}

function isAuthRelatedError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  const status = (err as { status?: number })?.status
  if (status === 401 || status === 403) return true
  const authTerms = ['not authenticated', 'unauthorized', 'forbidden', 'token expired', 'token invalid', 'authentication required', '401', '403']
  return authTerms.some((term) => msg.includes(term))
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlProjId = searchParams.get('proj_id')

  const [activeTab, setActiveTab] = useState("All Studies")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("All Types")
  const [selectedTime, setSelectedTime] = useState("All Time")
  const [studies, setStudies] = useState<StudyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [cardsLoading, setCardsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isValidatingToken, setIsValidatingToken] = useState(true)
  const [isInitialDataLoading, setIsInitialDataLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    draft: 0,
    completed: 0
  })

  // Project state
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [studyProjectMapping, setStudyProjectMapping] = useState<Record<string, string>>({})
  const [projectStudies, setProjectStudies] = useState<StudyListItem[]>([])
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isUpdatingProject, setIsUpdatingProject] = useState(false)
  const [projectStudiesLoading, setProjectStudiesLoading] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [sharingProjectId, setSharingProjectId] = useState<string | null>(null)
  const latestProjectRequestId = useRef<string | null>(null)
  const [exportingProjectCsv, setExportingProjectCsv] = useState(false)
  const [exportCsvStatus, setExportCsvStatus] = useState("Getting data...")
  const [exportingProjectZip, setExportingProjectZip] = useState(false)
  const [exportZipStatus, setExportZipStatus] = useState("Getting data...")
  const [isCopied, setIsCopied] = useState(false)
  const [isPanelistModalOpen, setIsPanelistModalOpen] = useState(false)
  const [exportingPanelist, setExportingPanelist] = useState(false)
  const [panelistExportStatus, setPanelistExportStatus] = useState("Getting data...")

  const { user } = useAuth()
  const isSpecialCreator = checkIsSpecialCreator(user?.email ?? null)

  // Validate token AND fetch initial studies in one flow - redirect before showing any content
  useEffect(() => {
    const validateAndLoad = async () => {
      try {
        const storedTokens = localStorage.getItem('tokens')
        if (!storedTokens) {
          redirectToLoginOnAuthError()
          return
        }
        const tokens = JSON.parse(storedTokens)
        if (!tokens?.access_token) {
          redirectToLoginOnAuthError()
          return
        }

        // 1. Validate token via auth API
        const res = await fetch(`${API_BASE_URL}/auth/validate-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || undefined,
          }),
        })
        const text = await res.text().catch(() => '')
        let data: { valid?: boolean; access_token?: string } = {}
        try { data = text ? JSON.parse(text) : {} } catch { /* invalid or empty */ }
        if (data?.valid !== true) {
          redirectToLoginOnAuthError()
          return
        }

        // Update tokens if refresh returned new access_token
        if (data.access_token) {
          try {
            const newTokens = { ...tokens, access_token: data.access_token }
            localStorage.setItem('tokens', JSON.stringify(newTokens))
          } catch { /* ignore */ }
        }

        // 2. Fetch studies to confirm auth works - redirect if 204/401/403 (auth failed)
        const studiesRes = await fetchWithAuth(`${API_BASE_URL}/studies?page=1&per_page=200`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (studiesRes.status === 204 || studiesRes.status === 401 || studiesRes.status === 403) {
          redirectToLoginOnAuthError()
          return
        }
        if (!studiesRes.ok) {
          const errData = await studiesRes.json().catch(() => ({}))
          throw new Error((errData as { detail?: string })?.detail || `Failed to load studies: ${studiesRes.status}`)
        }
        const studiesText = await studiesRes.text().catch(() => '')
        let studiesData: unknown = []
        try { studiesData = studiesText?.trim() ? JSON.parse(studiesText) : [] } catch { }
        const safeStudiesArray = Array.isArray(studiesData) ? studiesData as StudyListItem[]
          : (studiesData && typeof studiesData === 'object' && 'studies' in studiesData && Array.isArray((studiesData as { studies: unknown }).studies))
            ? ((studiesData as { studies: StudyListItem[] }).studies) : []
        setStudies(safeStudiesArray)
        try { localStorage.setItem('home_studies_cache', JSON.stringify(safeStudiesArray)) } catch { }
        setCardsLoading(false)

        setIsValidatingToken(false)
        setIsInitialDataLoading(false)
      } catch (err) {
        if (isAuthRelatedError(err)) {
          redirectToLoginOnAuthError()
          return
        }
        setError(err instanceof Error ? err.message : 'Failed to load')
        setIsValidatingToken(false)
        setIsInitialDataLoading(false)
      } finally {
        setLoading(false)
      }
    }
    validateAndLoad()
  }, [])

  // Load projects and mappings (don't hydrate studies from cache - keep spinner until API confirms auth)
  useEffect(() => {
    if (isValidatingToken) return // Wait for token validation

    // Load projects and mappings
    const fetchProjects = async () => {
      try {
        // Try to hydrate from cache first for instant paint
        const cached = localStorage.getItem('home_projects_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) {
            setProjects(parsed)
            setProjectsLoading(false)
          }
        }
      } catch { }

      setProjectsLoading(prev => prev && projects.length === 0)
      try {
        const data = await getProjectsApi();
        setProjects(data);
        // Cache for next time
        try { localStorage.setItem('home_projects_cache', JSON.stringify(data)) } catch { }

        // Pre-fetch members and store role for each project
        data.forEach(async (project) => {
          try {
            // Store user role for this project
            if (project.role) {
              localStorage.setItem(`ps_role_${project.id}`, project.role);
            }

            const members = await getProjectMembersApi(project.id);
            localStorage.setItem(`ps_members_${project.id}`, JSON.stringify(members));
          } catch (err) {
            console.error(`Failed to pre-fetch members/role for project ${project.id}:`, err);
          }
        });
      } catch (err) {
        if (isAuthRelatedError(err)) {
          redirectToLoginOnAuthError()
          return
        }
        console.error("Failed to fetch projects:", err);
      } finally {
        setProjectsLoading(false)
      }
    };
    fetchProjects();
    setStudyProjectMapping(getStudyProjectMapping())
  }, [isValidatingToken])

  // Sync project selection from URL only. No query param = All Studies (no project).
  useEffect(() => {
    if (isValidatingToken) return

    if (urlProjId) {
      setSelectedProjectId(urlProjId)
    } else {
      // No proj_id in URL: always show All Studies (do not restore from sessionStorage)
      setSelectedProjectId(null)
    }
  }, [isValidatingToken, urlProjId])

  // Hydrate cards from cache immediately for instant paint (only if token is valid)
  useEffect(() => {
    if (isValidatingToken) return // Wait for token validation

    try {
      const cached = localStorage.getItem('home_stats_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed && typeof parsed === 'object') {
          setStats({
            total: Number(parsed.total || 0),
            active: Number(parsed.active || 0),
            draft: Number(parsed.draft || 0),
            completed: Number(parsed.completed || 0),
          })
          setCardsLoading(false)
        }
      }
    } catch { }
  }, [isValidatingToken])

  const handleClearFilters = () => {
    setSearchQuery("")
    setSelectedType("All Types")
    setSelectedTime("All Time")
  }

  useEffect(() => {
    if (!exportingProjectCsv) return
    const messages = ["Getting data...", "Cooking your data...", "Almost there...", "Preparing your file..."]
    const interval = setInterval(() => {
      setExportCsvStatus((prev) => {
        const idx = messages.indexOf(prev)
        return messages[(idx + 1) % messages.length]
      })
    }, 1500)
    return () => clearInterval(interval)
  }, [exportingProjectCsv])

  useEffect(() => {
    if (!exportingProjectZip) return
    const messages = ["Getting data...", "Cooking your data...", "Almost there...", "Preparing your file..."]
    const interval = setInterval(() => {
      setExportZipStatus((prev) => {
        const idx = messages.indexOf(prev)
        return messages[(idx + 1) % messages.length]
      })
    }, 1500)
    return () => clearInterval(interval)
  }, [exportingProjectZip])

  useEffect(() => {
    if (!exportingPanelist) return
    const messages = ["Getting data...", "Cooking your data...", "Almost there...", "Preparing your file..."]
    const interval = setInterval(() => {
      setPanelistExportStatus((prev) => {
        const idx = messages.indexOf(prev)
        return messages[(idx + 1) % messages.length]
      })
    }, 1500)
    return () => clearInterval(interval)
  }, [exportingPanelist])

  const handleExportProjectCsv = async () => {
    if (!selectedProjectId || exportingProjectCsv) return
    const project = projects.find((p) => p.id === selectedProjectId)
    const projectName = project?.name ?? "project"
    setExportingProjectCsv(true)
    setExportCsvStatus("Getting data...")
    try {
      const blob = await downloadProjectCsv(selectedProjectId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${projectName.replace(/[^a-zA-Z0-9-_]/g, "_")}_studies.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export project CSV failed:", err)
      alert(err instanceof Error ? err.message : "Failed to export project CSV.")
    } finally {
      setExportingProjectCsv(false)
    }
  }

  const handleExportProjectZip = async () => {
    if (!selectedProjectId || exportingProjectZip) return
    setExportingProjectZip(true)
    setExportZipStatus("Starting export...")
    
    try {
      // Start background export job - returns immediately
      await startProjectZipExport(selectedProjectId)
      
      // Show success message - user will receive email when ready
      setExportZipStatus("Export started!")
      alert("Export started! You'll receive an email with the download link when it's ready.")
    } catch (err) {
      console.error("Export project ZIP failed:", err)
      alert(err instanceof Error ? err.message : "Failed to start export.")
    } finally {
      setExportingProjectZip(false)
    }
  }

  const handleExportPanelist = async (afterUtc: string) => {
    if (!selectedProjectId || exportingPanelist) return
    const project = projects.find((p) => p.id === selectedProjectId)
    const projectName = project?.name ?? "project"
    setExportingPanelist(true)
    setPanelistExportStatus("Getting data...")
    try {
      const blob = await exportCompletedPanelists(selectedProjectId, afterUtc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${projectName.replace(/[^a-zA-Z0-9-_]/g, "_")}_completed_panelists.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setIsPanelistModalOpen(false)
    } catch (err) {
      console.error("Export panelist failed:", err)
      alert(err instanceof Error ? err.message : "Failed to export completed panelists.")
    } finally {
      setExportingPanelist(false)
    }
  }

  const handleStudyClickFromSidebar = (study: StudyListItem) => {
    if (study.status === "draft") {
      let lastStep = study.last_step ?? 1
      try {
        const cached = localStorage.getItem("home_studies_cache")
        if (cached) {
          const parsed = JSON.parse(cached) as StudyListItem[]
          const cachedStudy = parsed.find((s) => s.id === study.id)
          if (cachedStudy?.last_step) lastStep = cachedStudy.last_step
        }
      } catch { /* ignore */ }
      localStorage.setItem("cs_study_id", study.id)
      localStorage.setItem("cs_current_step", String(lastStep))
      localStorage.setItem("cs_resuming_draft", "true")
      localStorage.removeItem("cs_is_fresh_start")
      localStorage.removeItem("cs_step8")
      const url = selectedProjectId
        ? `/home/create-study?proj_id=${selectedProjectId}`
        : "/home/create-study"
      router.push(url)
    } else {
      const url = selectedProjectId
        ? `/home/study/${study.id}?proj_id=${selectedProjectId}`
        : `/home/study/${study.id}`
      router.push(url)
    }
  }

  const refetchStudies = async () => {
    try {
      const studiesArray = await getStudies(1, 200)
      const safeStudiesArray = Array.isArray(studiesArray) ? studiesArray : []
      setStudies(safeStudiesArray)
      try { localStorage.setItem('home_studies_cache', JSON.stringify(safeStudiesArray)) } catch { }
    } catch (err) {
      if (isAuthRelatedError(err)) { redirectToLoginOnAuthError(); return }
      console.error("Failed to refetch studies:", err)
    }
    if (selectedProjectId) {
      try {
        const data = await getProjectStudiesApi(selectedProjectId)
        setProjectStudies(data)
        try { localStorage.setItem(`ps_cache_${selectedProjectId}`, JSON.stringify(data)) } catch { }
      } catch (err) {
        if (isAuthRelatedError(err)) { redirectToLoginOnAuthError(); return }
        console.error("Failed to refetch project studies:", err)
      }
    }
  }

  const handleStudyDeleted = async (studyId: string) => {
    setStudies((prev) => {
      const next = prev.filter((study) => study.id !== studyId)
      try { localStorage.setItem('home_studies_cache', JSON.stringify(next)) } catch { }
      return next
    })

    setProjectStudies((prev) => {
      const next = prev.filter((study) => study.id !== studyId)
      if (selectedProjectId) {
        try { localStorage.setItem(`ps_cache_${selectedProjectId}`, JSON.stringify(next)) } catch { }
      }
      return next
    })

    await refetchStudies()
  }

  const handleCreateProject = async (name: string, description: string) => {
    setIsCreatingProject(true)
    try {
      const newProject = await createProjectApi({ name, description });
      const data = await getProjectsApi();
      setProjects(data);
      // Update cache
      try { localStorage.setItem('home_projects_cache', JSON.stringify(data)) } catch { }

      setIsProjectModalOpen(false) // Close modal on success

      // Auto-select the newly created project
      if (newProject && newProject.id) {
        // The creator should never be treated as a viewer for their new project.
        // If backend doesn't immediately include `role` in list responses, we persist
        // a sensible default so UI permissions (e.g. Create Study) work correctly.
        try {
          localStorage.setItem(`ps_role_${newProject.id}`, newProject.role || 'owner')
        } catch { }
        handleSelectProject(newProject.id)
      } else {
        // Fallback: finding the project by name if ID isn't directly returned
        const found = data.find(p => p.name === name);
        if (found) {
          try {
            localStorage.setItem(`ps_role_${found.id}`, found.role || 'owner')
          } catch { }
          handleSelectProject(found.id);
        }
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setIsCreatingProject(false)
    }
  }

  const handleUpdateProject = async (id: string, name: string, description: string) => {
    setIsUpdatingProject(true)
    try {
      await updateProjectApi(id, { name, description });
      const data = await getProjectsApi();
      setProjects(data);
      // Update cache
      try { localStorage.setItem('home_projects_cache', JSON.stringify(data)) } catch { }
      setIsEditModalOpen(false)
      setEditingProject(null)
    } catch (err) {
      console.error("Failed to update project:", err);
    } finally {
      setIsUpdatingProject(false)
    }
  }

  const handleSelectProject = (id: string | null) => {
    // If clicking the same project again, do nothing — avoids infinite loading
    // (we would set loading true but the fetch effect wouldn't re-run to clear it).
    if (id === selectedProjectId) return

    setSelectedProjectId(id)

    // Immediately show a loading state when switching projects so we don't briefly
    // render an empty state for the newly selected project while data hydrates.
    if (id) {
      setProjectStudiesLoading(true)
    } else {
      setProjectStudiesLoading(false)
    }

    const params = new URLSearchParams(searchParams.toString())
    if (id) {
      sessionStorage.setItem('last_selected_project', id)
      params.set('proj_id', id)
    } else {
      sessionStorage.removeItem('last_selected_project')
      params.delete('proj_id')
    }
    router.replace(`/home?${params.toString()}`)
  }

  // Fetch project studies when project changes
  useEffect(() => {
    if (selectedProjectId) {
      const currentProjectId = selectedProjectId
      latestProjectRequestId.current = currentProjectId

      let isHydrated = false
      // Try to hydrate from cache first
      try {
        const cached = localStorage.getItem(`ps_cache_${currentProjectId}`)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) {
            // Ignore stale cache if user has already switched projects
            if (latestProjectRequestId.current !== currentProjectId) return
            setProjectStudies(parsed)
            isHydrated = true
            // If we have cached studies, we can set loading to false early
            setProjectStudiesLoading(false)
          }
        }
      } catch { }

      // If not hydrated, clear current project studies and show loading
      if (!isHydrated) {
        setProjectStudies([])
        setProjectStudiesLoading(true)
      }

      const fetchProjectStudies = async () => {
        try {
          const data = await getProjectStudiesApi(currentProjectId);
          // If while we were fetching the user switched to another project,
          // don't override the studies for the new selection.
          if (latestProjectRequestId.current !== currentProjectId) return
          setProjectStudies(data);
          // Cache for next time
          try {
            localStorage.setItem(`ps_cache_${currentProjectId}`, JSON.stringify(data))
          } catch { }
        } catch (err) {
          if (isAuthRelatedError(err)) {
            redirectToLoginOnAuthError()
            return
          }
          console.error("Failed to fetch project studies:", err);
          if (latestProjectRequestId.current === currentProjectId) {
            setProjectStudies([]);
            setError("Failed to load project studies. Please try again.");
          }
        } finally {
          if (latestProjectRequestId.current === currentProjectId) {
            setProjectStudiesLoading(false)
          }
        }
      };
      fetchProjectStudies();
    } else {
      latestProjectRequestId.current = null
      setProjectStudiesLoading(false)
      setProjectStudies([]);
    }
  }, [selectedProjectId]);

  // Filter studies based on selected project
  const filteredStudies = selectedProjectId ? projectStudies : studies;

  // New effect to update stats when filtered studies change
  useEffect(() => {
    const total = filteredStudies.length
    const active = filteredStudies.filter(s => s.status === 'active').length
    const draft = filteredStudies.filter(s => s.status === 'draft').length
    const completed = filteredStudies.filter(s => s.status === 'completed').length

    const nextStats = { total, active, draft, completed }
    setStats(nextStats)

    // Only cache global stats
    if (!selectedProjectId) {
      try { localStorage.setItem('home_stats_cache', JSON.stringify(nextStats)) } catch { }
    }
  }, [filteredStudies, selectedProjectId])

  // Keep loading spinner until token is validated AND initial data fetch completes (or redirects)
  if (isValidatingToken || isInitialDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const handleShareProjectToParticipant = () => {
    if (!selectedProjectId) return
    const url = `${window.location.origin}/participate/project/${selectedProjectId}`
    navigator.clipboard.writeText(url)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="flex min-h-screen bg-slate-100 font-sans">
        <Sidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          onCreateProject={() => setIsProjectModalOpen(true)}
          onShareProject={(id) => {
            setSharingProjectId(id)
            setIsShareModalOpen(true)
          }}
          onEditProject={(project) => {
            setEditingProject(project)
            setIsEditModalOpen(true)
          }}
          onStudyClick={handleStudyClickFromSidebar}
          isLoading={projectsLoading}
          studies={studies}
          fetchProjectStudies={async (projectId) => {
            const data = await getProjectStudiesApi(projectId)
            return Array.isArray(data) ? (data as StudyListItem[]) : []
          }}
          onStudyCopied={refetchStudies}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-1 overflow-auto"
        >
          <DashboardHeader />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <OverviewCards stats={stats} loading={cardsLoading} />

            <StudyFilters
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              onClearFilters={handleClearFilters}
              stats={stats}
            />

            {isSpecialCreator && selectedProjectId && (
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportProjectCsv}
                  disabled={exportingProjectCsv || projectStudies.length === 0}
                  className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  {exportingProjectCsv ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>{exportCsvStatus}</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4" />
                      <span>Export projects CSV</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPanelistModalOpen(true)}
                  disabled={projectStudies.length === 0}
                  className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export project panelist</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportProjectZip}
                  disabled={exportingProjectZip || projectStudies.length === 0}
                  className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  {exportingProjectZip ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>{exportZipStatus}</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4" />
                      <span>Export ZIP</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleShareProjectToParticipant}
                  className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white transition-colors"
                >
                  <Link className="w-4 h-4" />
                  <span>{isCopied ? "Copied!" : "Share Project to Participant"}</span>
                </button>
              </div>
            )}

            <StudyGrid
              studies={filteredStudies}
              isAllStudiesView={!selectedProjectId}
              activeTab={activeTab}
              searchQuery={searchQuery}
              selectedType={selectedType}
              selectedTime={selectedTime}
              loading={selectedProjectId ? projectStudiesLoading : loading}
              error={error}
              projects={projects}
              onMappingChange={() => setStudyProjectMapping(getStudyProjectMapping())}
              onStudyCopied={refetchStudies}
              onStudyDeleted={handleStudyDeleted}
              onStudyAssigned={refetchStudies}
            />
          </div>
        </motion.div>
      </div>

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreate={handleCreateProject}
        isSubmitting={isCreatingProject}
      />

      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingProject(null)
        }}
        onUpdate={handleUpdateProject}
        project={editingProject}
        isSubmitting={isUpdatingProject}
      />

      {sharingProjectId && (
        <ShareProjectModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false)
            setSharingProjectId(null)
          }}
          projectId={sharingProjectId}
          userRole="admin" // Defaulting to admin so we can see the management UI, real backend should verify
        />
      )}

      {isPanelistModalOpen && (
        <ExportPanelistModal
          isOpen={isPanelistModalOpen}
          onClose={() => setIsPanelistModalOpen(false)}
          onExport={handleExportPanelist}
          isExporting={exportingPanelist}
          exportStatus={panelistExportStatus}
        />
      )}
    </AuthGuard>
  )
}

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC", offset: "+00:00" },
  { value: "IST", label: "IST (India Standard Time)", offset: "+05:30" },
  { value: "EST", label: "EST (Eastern Standard Time)", offset: "-05:00" },
  { value: "CST", label: "CST (Central Standard Time)", offset: "-06:00" },
  { value: "MST", label: "MST (Mountain Standard Time)", offset: "-07:00" },
  { value: "PST", label: "PST (Pacific Standard Time)", offset: "-08:00" },
  { value: "GMT", label: "GMT (Greenwich Mean Time)", offset: "+00:00" },
  { value: "CET", label: "CET (Central European Time)", offset: "+01:00" },
  { value: "JST", label: "JST (Japan Standard Time)", offset: "+09:00" },
  { value: "AEST", label: "AEST (Australian Eastern Standard Time)", offset: "+10:00" },
  { value: "SGT", label: "SGT (Singapore Time)", offset: "+08:00" },
  { value: "HKT", label: "HKT (Hong Kong Time)", offset: "+08:00" },
]

function ExportPanelistModal({
  isOpen,
  onClose,
  onExport,
  isExporting,
  exportStatus
}: {
  isOpen: boolean
  onClose: () => void
  onExport: (afterUtc: string) => void
  isExporting: boolean
  exportStatus: string
}) {
  const [selectedTimezone, setSelectedTimezone] = useState("UTC")
  const [utcInput, setUtcInput] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")

  const handleExport = () => {
    let afterUtc: string

    if (selectedTimezone === "UTC") {
      if (!utcInput.trim()) {
        alert("Please enter a valid UTC datetime")
        return
      }
      afterUtc = utcInput.trim()
    } else {
      if (!selectedDate || !selectedTime) {
        alert("Please select both date and time")
        return
      }
      const tz = TIMEZONE_OPTIONS.find(t => t.value === selectedTimezone)
      const offset = tz?.offset || "+00:00"
      const localDatetime = `${selectedDate}T${selectedTime}:00${offset}`
      
      const date = new Date(localDatetime)
      if (isNaN(date.getTime())) {
        alert("Invalid date/time selection")
        return
      }
      afterUtc = date.toISOString().replace("Z", "+00:00")
    }

    onExport(afterUtc)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            Export Project Panelist
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={selectedTimezone}
              onChange={(e) => {
                setSelectedTimezone(e.target.value)
                setUtcInput("")
                setSelectedDate("")
                setSelectedTime("")
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgba(38,116,186,0.5)] focus:border-[rgba(38,116,186,1)] outline-none transition-colors"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-md">
            Export project panelist after:
          </div>

          {selectedTimezone === "UTC" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                UTC Datetime
              </label>
              <input
                type="text"
                value={utcInput}
                onChange={(e) => setUtcInput(e.target.value)}
                placeholder="2026-04-02T11:30:00+00:00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgba(38,116,186,0.5)] focus:border-[rgba(38,116,186,1)] outline-none transition-colors font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: YYYY-MM-DDTHH:MM:SS+00:00
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgba(38,116,186,0.5)] focus:border-[rgba(38,116,186,1)] outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgba(38,116,186,0.5)] focus:border-[rgba(38,116,186,1)] outline-none transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>{exportStatus}</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>Export</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
