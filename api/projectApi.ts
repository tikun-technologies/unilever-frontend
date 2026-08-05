/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_BASE_URL } from "@/lib/api/LoginApi";
import { fetchWithAuth } from "@/lib/api/StudyAPI";

export interface Project {
    id: string;
    name: string;
    description?: string;
    created_at?: string;
    createdAt?: string;
    study_count?: number;
    role?: 'admin' | 'owner' | 'editor' | 'viewer';
}

export interface ProjectCreatePayload {
    name: string;
    description?: string;
}

export interface ProjectUpdatePayload {
    name?: string;
    description?: string;
}

export interface ProjectMember {
    id: string;
    email: string;
    invited_email?: string;
    name?: string;
    role: 'admin' | 'owner' | 'editor' | 'viewer';
    status: 'active' | 'pending';
}

/**
 * Create a new project
 * POST /api/v1/projects
 */
export async function createProject(payload: ProjectCreatePayload): Promise<Project> {
    const res = await fetchWithAuth(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create project");
    }

    return res.json();
}

/**
 * Get all projects for authenticated user with study counts
 * GET /api/v1/projects
 */
export async function getProjects(): Promise<Project[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/projects`, {
        method: "GET",
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to fetch projects");
    }

    return res.json();
}

/**
 * Get a single project with study count
 * GET /api/v1/projects/{project_id}
 */
export async function getProjectById(projectId: string): Promise<Project> {
    const res = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}`, {
        method: "GET",
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to fetch project details");
    }

    return res.json();
}

export type ProjectStudyStatus = "active" | "draft" | "completed" | "paused"
export type ProjectStudyType = "grid" | "layer" | "text" | "hybrid"
export type ProjectStudyTimeRange = "all" | "7d" | "30d" | "90d" | "365d"

export interface ProjectStudyListItem {
    id: string
    title: string
    study_type: ProjectStudyType
    status: ProjectStudyStatus
    created_at: string
    updated_at?: string
    total_responses: number
    completed_responses: number
    abandoned_responses?: number
    last_step?: number
    project_id?: string
    respondents_target?: number
    respondents_completed?: number
    product_id?: string | null
    user_role?: "admin" | "editor" | "viewer"
}

export interface ProjectStudiesResponse {
    items: ProjectStudyListItem[]
    total: number
    page: number
    per_page: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
    status_counts: {
        total: number
        active: number
        draft: number
        completed: number
        paused: number
    }
}

export interface GetProjectStudiesParams {
    page?: number
    per_page?: number
    search?: string
    status?: ProjectStudyStatus | "all"
    study_type?: ProjectStudyType | "all"
    time_range?: ProjectStudyTimeRange
}

function normalizeProjectStudiesResponse(data: unknown, page = 1, per_page = 10): ProjectStudiesResponse {
    if (Array.isArray(data)) {
        const items = data as ProjectStudyListItem[]
        return {
            items,
            total: items.length,
            page,
            per_page,
            total_pages: items.length > 0 ? 1 : 0,
            has_next: false,
            has_previous: false,
            status_counts: { total: items.length, active: 0, draft: 0, completed: 0, paused: 0 },
        }
    }

    const obj = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
    const items = Array.isArray(obj.items) ? (obj.items as ProjectStudyListItem[]) : []
    const total = Number(obj.total ?? items.length) || 0
    const resolvedPage = Number(obj.page ?? page) || 1
    const resolvedPerPage = Number(obj.per_page ?? per_page) || 10
    const totalPages = Number(obj.total_pages ?? (resolvedPerPage > 0 ? Math.ceil(total / resolvedPerPage) : 0)) || 0
    const counts = (obj.status_counts && typeof obj.status_counts === "object")
        ? obj.status_counts as ProjectStudiesResponse["status_counts"]
        : { total: 0, active: 0, draft: 0, completed: 0, paused: 0 }

    return {
        items,
        total,
        page: resolvedPage,
        per_page: resolvedPerPage,
        total_pages: totalPages,
        has_next: Boolean(obj.has_next ?? resolvedPage < totalPages),
        has_previous: Boolean(obj.has_previous ?? resolvedPage > 1),
        status_counts: {
            total: Number(counts.total || 0),
            active: Number(counts.active || 0),
            draft: Number(counts.draft || 0),
            completed: Number(counts.completed || 0),
            paused: Number(counts.paused || 0),
        },
    }
}

/**
 * Get paginated studies affiliated with a project
 * GET /api/v1/projects/{project_id}/studies
 */
export async function getProjectStudies(
    projectId: string,
    params: GetProjectStudiesParams = {}
): Promise<ProjectStudiesResponse> {
    const qs = new URLSearchParams()
    const page = params.page ?? 1
    const perPage = params.per_page ?? 10
    qs.set("page", String(page))
    qs.set("per_page", String(perPage))
    if (params.search?.trim()) qs.set("search", params.search.trim())
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.study_type && params.study_type !== "all") qs.set("study_type", params.study_type)
    if (params.time_range && params.time_range !== "all") qs.set("time_range", params.time_range)

    const res = await fetchWithAuth(
        `${API_BASE_URL}/projects/${projectId}/studies?${qs.toString()}`,
        { method: "GET" }
    )

    if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to fetch project studies")
    }

    const data = await res.json()
    return normalizeProjectStudiesResponse(data, page, perPage)
}

/**
 * Download flattened project CSV (all studies in project).
 * GET /projects/{project_id}/flattened-project-csv (base URL without /api/v1) 
 */
export async function downloadProjectCsv(projectId: string): Promise<Blob> {
    const base = API_BASE_URL
    const res = await fetchWithAuth(`${base}/projects/${projectId}/flattened-project-csv`, {
        method: "POST",
        headers: { Accept: "text/csv" },
    });
    if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Failed to export project CSV: ${res.status} ${errorText}`);
    }
    return res.blob();
}

/**
 * Start a background job to export project as ZIP
 * POST /api/v1/projects/{project_id}/export-zip
 * Returns immediately - user will receive email when export is ready
 */
export async function startProjectZipExport(projectId: string): Promise<{ job_id: string; status: string; message: string }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/export-zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Failed to start project ZIP export: ${res.status} ${errorText}`);
    }
    return res.json();
}

/**
 * Update a project
 * PUT /api/v1/projects/{project_id}
 */
export async function updateProject(projectId: string, payload: ProjectUpdatePayload): Promise<Project> {
    const res = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to update project");
    }

    return res.json();
}

/**
 * Invite user to project by email
 * POST /api/v1/projects/{project_id}/members/invite
 */
export async function inviteProjectMember(projectId: string, email: string, role: string): Promise<any> {
    const res = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/members/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to invite member to project");
    }

    return res.json();
}

/**
 * List all project members
 * GET /api/v1/projects/{project_id}/members
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/members`, {
        method: "GET",
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to fetch project members");
    }

    return res.json();
}

/**
 * Update member's role
 * PATCH /api/v1/projects/{project_id}/members/{member_id}
 */
export async function updateProjectMemberRole(projectId: string, memberId: string, role: string): Promise<any> {
    const res = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to update member role");
    }

    return res.json();
}

/**
 * Remove member from project
 * DELETE /api/v1/projects/{project_id}/members/{member_id}
 */
export async function removeProjectMember(projectId: string, memberId: string): Promise<any> {
    const res = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/members/${memberId}`, {
        method: "DELETE",
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to remove member from project");
    }

    return res.ok;
}

export interface ValidateProductPayload {
    study_id?: string;
    product_id?: string;
    product_keys: { name: string; percentage: number }[];
}

export interface ValidateProductResponse {
    valid: boolean;
    product_id_taken: boolean;
    key_combination_taken: boolean;
}

/**
 * Assign a study to a project
 * POST /api/v1/projects/{project_id}/assign-study
 */
export async function assignStudyToProject(projectId: string, studyId: string): Promise<void> {
    const res = await fetchWithAuth(
        `${API_BASE_URL}/projects/${projectId}/assign-study`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ study_id: studyId }),
        }
    );

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data?.detail ?? data?.error ?? data?.message ?? "Failed to assign study to project";
        throw new Error(typeof message === "string" ? message : JSON.stringify(message));
    }
}

/**
 * Validate product ID and key combination for a project
 * POST /api/v1/projects/validate-product
 */
export async function validateProduct(
    payload: ValidateProductPayload
): Promise<ValidateProductResponse> {
    const res = await fetchWithAuth(
        `${API_BASE_URL}/projects/validate-product`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }
    );

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Validation request failed");
    }

    return res.json();
}

export interface PublicProjectStudy {
    id: string;
    title: string;
    study_type: string;
    product_id?: string | null;
}

export interface PublicProjectStudiesResponse {
    project_name: string;
    creator_email?: string;
    studies: PublicProjectStudy[];
}

/**
 * Get public studies for a project
 * GET /api/v1/projects/public/{project_id}/studies
 */
export async function getPublicProjectStudies(projectId: string): Promise<PublicProjectStudiesResponse> {
    const res = await fetch(`${API_BASE_URL}/projects/public/${projectId}/studies`, {
        method: "GET",
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to fetch public project studies");
    }

    return res.json();
}

/**
 * Export completed panelists for a project after a specific UTC timestamp
 * POST /api/v1/projects/{project_id}/export-completed-panelists
 */
export async function exportCompletedPanelists(
    projectId: string, 
    afterUtc: string
): Promise<Blob> {
    const res = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/export-completed-panelists`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            Accept: "text/csv" 
        },
        body: JSON.stringify({ after_utc: afterUtc }),
    });

    if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Failed to export completed panelists: ${res.status} ${errorText}`);
    }

    return res.blob();
}
