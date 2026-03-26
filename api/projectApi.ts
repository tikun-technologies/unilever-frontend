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

/**
 * Get all studies affiliated with a project
 * GET /api/v1/projects/{project_id}/studies
 */
export async function getProjectStudies(projectId: string): Promise<any[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/studies`, {
        method: "GET",
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to fetch project studies");
    }

    return res.json();
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
