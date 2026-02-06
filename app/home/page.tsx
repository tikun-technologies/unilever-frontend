"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { motion } from "framer-motion"
import { useSearchParams, useRouter } from "next/navigation"
import { DashboardHeader } from "./components/dashboard-header"
import { OverviewCards } from "./components/overview-cards"
import { StudyFilters } from "./components/study-filters"
import { StudyGrid } from "./components/study-grid"
import { AuthGuardDebug as AuthGuard } from "@/components/auth/AuthGuardDebug"
import { getStudies, StudyListItem } from "@/lib/api/StudyAPI"
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
  Project
} from "@/api/projectApi"
import { getStudyProjectMapping } from "@/lib/utils/projectUtils"

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

  // Check token validity BEFORE rendering anything
  useEffect(() => {
    const validateTokenBeforeRender = async () => {
      try {
        // Check if token exists in localStorage
        const storedTokens = localStorage.getItem('tokens')
        if (!storedTokens) {
          // No token, redirect immediately
          sessionStorage.setItem('auth_redirecting', 'true')
          localStorage.removeItem('user')
          localStorage.removeItem('tokens')
          localStorage.removeItem('auth_user')
          localStorage.removeItem('token')
          window.location.replace('/login')
          return
        }

        const tokens = JSON.parse(storedTokens)
        if (!tokens?.access_token) {
          // Invalid token format, redirect immediately
          sessionStorage.setItem('auth_redirecting', 'true')
          localStorage.removeItem('user')
          localStorage.removeItem('tokens')
          localStorage.removeItem('auth_user')
          localStorage.removeItem('token')
          window.location.replace('/login')
          return
        }

        // Make a lightweight API call to verify token is still valid
        // Use a minimal endpoint that requires auth
        const response = await fetch(`${API_BASE_URL}/studies?page=1&per_page=1`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.access_token}`
          },
        })

        // If token is invalid (401/403), redirect immediately
        if (response.status === 401 || response.status === 403) {
          sessionStorage.setItem('auth_redirecting', 'true')
          localStorage.removeItem('user')
          localStorage.removeItem('tokens')
          localStorage.removeItem('auth_user')
          localStorage.removeItem('token')
          window.location.replace('/login')
          return
        }

        // Token is valid, proceed with page rendering
        setIsValidatingToken(false)
      } catch (error) {
        // Network error or other issue - redirect to login to be safe
        console.error('Token validation error:', error)
        sessionStorage.setItem('auth_redirecting', 'true')
        localStorage.removeItem('user')
        localStorage.removeItem('tokens')
        localStorage.removeItem('auth_user')
        localStorage.removeItem('token')
        window.location.replace('/login')
      }
    }

    validateTokenBeforeRender()
  }, [])

  // Hydrate studies list from cache for instant render on refresh (only if token is valid)
  useEffect(() => {
    if (isValidatingToken) return // Wait for token validation

    try {
      const cached = localStorage.getItem('home_studies_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) {
          setStudies(parsed as StudyListItem[])
          setLoading(false)
        }
      }
    } catch { }

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
        console.error("Failed to fetch projects:", err);
      } finally {
        setProjectsLoading(false)
      }
    };
    fetchProjects();
    setStudyProjectMapping(getStudyProjectMapping())
  }, [isValidatingToken])

  // Separate sync effect for project selection from URL
  useEffect(() => {
    if (isValidatingToken) return

    // Load last selected project from URL, then session or storage
    if (urlProjId) {
      setSelectedProjectId(urlProjId)
    } else {
      const lastProject = sessionStorage.getItem('last_selected_project')
      if (lastProject) setSelectedProjectId(lastProject)
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

  // Fetch studies data (only if token is valid)
  useEffect(() => {
    if (isValidatingToken) return // Wait for token validation

    const fetchStudies = async () => {
      try {
        setLoading((prev) => prev && studies.length === 0)
        setError(null)
        const studiesArray = await getStudies(1, 200) // Get more studies for filtering

        // Ensure we have an array
        const safeStudiesArray = Array.isArray(studiesArray) ? studiesArray : []
        setStudies(safeStudiesArray)
        // Cache list for next load
        try { localStorage.setItem('home_studies_cache', JSON.stringify(safeStudiesArray)) } catch { }

        setCardsLoading(false)

        // Log for debugging
        // console.log(`Loaded ${total} studies: ${active} active, ${draft} draft, ${completed} completed`)
      } catch (err) {
        // Check if error is due to redirect (token expired)
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch studies'
        const isRedirecting = typeof window !== 'undefined' && (
          sessionStorage.getItem('auth_redirecting') === 'true' ||
          window.location.pathname === '/login' ||
          errorMessage === 'REDIRECTING' ||
          errorMessage.includes('204')
        )

        if (!isRedirecting) {
          console.error('Failed to fetch studies:', err)
          setError(errorMessage)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchStudies()
  }, [isValidatingToken, studies.length])

  const handleClearFilters = () => {
    setSearchQuery("")
    setSelectedType("All Types")
    setSelectedTime("All Time")
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

  // Don't render anything until token is validated
  if (isValidatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
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
          isLoading={projectsLoading}
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

            <StudyGrid
              studies={filteredStudies}
              activeTab={activeTab}
              searchQuery={searchQuery}
              selectedType={selectedType}
              selectedTime={selectedTime}
              loading={selectedProjectId ? projectStudiesLoading : loading}
              error={error}
              projects={projects}
              onMappingChange={() => setStudyProjectMapping(getStudyProjectMapping())}
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
    </AuthGuard>
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
