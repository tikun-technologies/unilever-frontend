import { Project } from "@/api/projectApi";
export type { Project };

const PROJECTS_KEY = 'ut_projects';
const MAPPING_KEY = 'ut_study_project_mapping';

export const getProjects = (): Project[] => {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(PROJECTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

export const saveProject = (project: Project) => {
    if (typeof window === 'undefined') return;
    const projects = getProjects();
    projects.push(project);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
};

export const getStudyProjectMapping = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    try {
        const data = localStorage.getItem(MAPPING_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
};

export const mapStudyToProject = (studyId: string, projectId: string) => {
    if (typeof window === 'undefined') return;
    const mapping = getStudyProjectMapping();
    mapping[studyId] = projectId;
    localStorage.setItem(MAPPING_KEY, JSON.stringify(mapping));
};

export const unmapStudyFromProject = (studyId: string) => {
    if (typeof window === 'undefined') return;
    const mapping = getStudyProjectMapping();
    delete mapping[studyId];
    localStorage.setItem(MAPPING_KEY, JSON.stringify(mapping));
};
