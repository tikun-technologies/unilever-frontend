"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Menu,
    X,
    Plus,
    Folder,
    LayoutGrid,
    Share2,
    Pencil,
    ChevronRight,
    ChevronDown,
    FileText,
    Copy
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Project } from "@/api/projectApi"
import { StudyListItem, copyStudy } from "@/lib/api/StudyAPI"

interface SidebarProps {
    projects: Project[];
    selectedProjectId: string | null;
    onSelectProject: (id: string | null) => void;
    onCreateProject: () => void;
    onShareProject?: (id: string) => void;
    onEditProject?: (project: Project) => void;
    onStudyClick?: (study: StudyListItem) => void;
    isLoading?: boolean;
    /** All studies from main studies API (used to group by project_id) */
    studies?: StudyListItem[];
    /** Fallback: fetch studies for a project when not in main list */
    fetchProjectStudies?: (projectId: string) => Promise<StudyListItem[]>;
    /** Called after copying a study from sidebar so parent can refetch studies */
    onStudyCopied?: () => void | Promise<void>;
}

export function Sidebar({
    projects,
    selectedProjectId,
    onSelectProject,
    onCreateProject,
    onShareProject,
    onEditProject,
    onStudyClick,
    isLoading,
    studies = [],
    fetchProjectStudies,
    onStudyCopied
}: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    /** Project ids whose accordion is expanded */
    const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set());
    /** Per-project studies when fallback API was used */
    const [fallbackStudiesByProject, setFallbackStudiesByProject] = useState<Record<string, StudyListItem[]>>({});
    /** Per-project loading when using fallback API */
    const [loadingProjectIds, setLoadingProjectIds] = useState<Set<string>>(new Set());
    /** Study id currently being copied (from sidebar) */
    const [copyLoadingStudyId, setCopyLoadingStudyId] = useState<string | null>(null);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const studiesByProjectId = useMemo(() => {
        const map: Record<string, StudyListItem[]> = {};
        for (const study of studies) {
            const pid = study.project_id ?? "";
            if (!map[pid]) map[pid] = [];
            map[pid].push(study);
        }
        return map;
    }, [studies]);

    const toggleProjectExpanded = useCallback((projectId: string) => {
        setExpandedProjectIds((prev) => {
            const next = new Set(prev);
            if (next.has(projectId)) next.delete(projectId);
            else next.add(projectId);
            return next;
        });
    }, []);

    const fetchStudiesForProjectIfNeeded = useCallback(
        async (projectId: string) => {
            const fromMain = studiesByProjectId[projectId] ?? [];
            if (fromMain.length > 0) return;
            if (fallbackStudiesByProject[projectId] != null) return;
            if (!fetchProjectStudies) return;
            setLoadingProjectIds((p) => new Set(p).add(projectId));
            try {
                const list = await fetchProjectStudies(projectId);
                setFallbackStudiesByProject((prev) => ({ ...prev, [projectId]: list }));
            } finally {
                setLoadingProjectIds((p) => {
                    const next = new Set(p);
                    next.delete(projectId);
                    return next;
                });
            }
        },
        [studiesByProjectId, fetchProjectStudies, fallbackStudiesByProject]
    );

    useEffect(() => {
        expandedProjectIds.forEach((projectId) => {
            const fromMain = studiesByProjectId[projectId] ?? [];
            if (fromMain.length > 0) return;
            if (fallbackStudiesByProject[projectId] != null) return;
            fetchStudiesForProjectIfNeeded(projectId);
        });
    }, [expandedProjectIds, studiesByProjectId, fallbackStudiesByProject, fetchStudiesForProjectIfNeeded]);

    const getStudiesForProjectDisplay = useCallback(
        (projectId: string): StudyListItem[] => {
            return studiesByProjectId[projectId] ?? fallbackStudiesByProject[projectId] ?? [];
        },
        [studiesByProjectId, fallbackStudiesByProject]
    );

    // If mobile and collapsed, we might want to hide it completely or show a trigger
    // For now, let's keep the user's "sidebar icon" request as the primary toggle.

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isMobile && !isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsCollapsed(true)}
                        className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm lg:hidden"
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={false}
                animate={{
                    width: isCollapsed ? (isMobile ? 0 : 80) : 280,
                    x: isMobile && isCollapsed ? -280 : 0
                }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                className={`bg-white border-r border-[rgba(209,223,235,1)] flex flex-col h-screen sticky top-0 shadow-sm overflow-hidden z-[101] 
                    ${isMobile ? "fixed left-0 top-0 bottom-0 shadow-2xl" : "sticky"}
                `}
            >
                {/* Header */}
                <div className="p-4 flex items-center justify-between border-b border-[rgba(209,223,235,1)] min-h-[64px]">
                    <AnimatePresence mode="wait">
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.1 }}
                                className="flex flex-col"
                            >

                                <div className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Folder className="w-5 h-5 text-[rgba(38,116,186,1)]" />
                                    <span>Projects</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hover:bg-gray-100 rounded-full text-gray-500 hover:text-[rgba(38,116,186,1)] transition-colors"
                    >
                        {isCollapsed ? <Menu className="w-5 h-5 transition-transform" /> : <X className="w-5 h-5 transition-transform hover:rotate-90" />}
                    </Button>
                </div>

                {/* Action Button */}
                <div className="p-4">
                    <Button
                        onClick={onCreateProject}
                        className={`w-full bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white flex items-center transition-all ${isCollapsed ? 'justify-center p-0 h-10 w-10 mx-auto rounded-full' : 'justify-center gap-2 h-11 rounded-lg'}`}
                    >
                        <Plus className="w-5 h-5" />
                        {!isCollapsed && <span>Create Project</span>}
                    </Button>
                </div>

                {/* Menu Sections */}
                <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
                    <div>
                        {!isCollapsed && (
                            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                General
                            </p>
                        )}
                        <div className="space-y-1">
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => onSelectProject(null)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onSelectProject(null);
                                    }
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group cursor-pointer ${selectedProjectId === null
                                    ? "bg-[rgba(38,116,186,0.1)] text-[rgba(38,116,186,1)]"
                                    : "text-gray-600 hover:bg-gray-50"
                                    }`}
                            >
                                <LayoutGrid className={`w-5 h-5 shrink-0 ${selectedProjectId === null ? "text-[rgba(38,116,186,1)]" : "text-gray-400 group-hover:text-gray-600"}`} />
                                {!isCollapsed && <span className="font-medium">All Studies</span>}
                            </div>
                        </div>
                    </div>

                    <div>
                        {!isCollapsed && (
                            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                My Projects
                            </p>
                        )}
                        <div className="space-y-0">
                            {isLoading ? (
                                <div className="px-4 py-8 flex flex-col items-center justify-center gap-3">
                                    <div className="w-6 h-6 border-2 border-[rgba(38,116,186,0.2)] border-t-[rgba(38,116,186,1)] rounded-full animate-spin" />
                                    {!isCollapsed && <p className="text-xs text-gray-400">Loading projects...</p>}
                                </div>
                            ) : projects.length === 0 ? (
                                !isCollapsed && <p className="px-4 py-4 text-sm text-gray-400 italic">No projects found</p>
                            ) : (
                                projects.map((project) => {
                                    const canEdit = project.role === 'admin' || project.role === 'owner';
                                    const isExpanded = expandedProjectIds.has(project.id);
                                    const projectStudies = getStudiesForProjectDisplay(project.id);
                                    const studiesLoading = loadingProjectIds.has(project.id);

                                    return (
                                        <div key={project.id} className="rounded-lg overflow-hidden">
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                    const target = e.target as HTMLElement;
                                                    if (target.closest('button[data-accordion-toggle]')) return;
                                                    onSelectProject(project.id);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        if ((e.target as HTMLElement).closest('button[data-accordion-toggle]')) {
                                                            toggleProjectExpanded(project.id);
                                                        } else {
                                                            onSelectProject(project.id);
                                                        }
                                                    }
                                                }}
                                                className={`w-full flex items-center gap-2 px-4 py-3 transition-colors group relative cursor-pointer ${selectedProjectId === project.id
                                                    ? "bg-[rgba(38,116,186,0.1)] text-[rgba(38,116,186,1)] border-l-4 border-[rgba(38,116,186,1)] rounded-l-none"
                                                    : "text-gray-600 hover:bg-gray-50"
                                                    }`}
                                            >
                                                {!isCollapsed && (
                                                    <button
                                                        type="button"
                                                        data-accordion-toggle
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleProjectExpanded(project.id);
                                                        }}
                                                        className="p-0.5 rounded hover:bg-gray-200/80 flex items-center justify-center shrink-0 text-gray-500"
                                                        aria-expanded={isExpanded}
                                                        title={isExpanded ? "Collapse" : "Expand"}
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                )}
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${selectedProjectId === project.id ? "bg-[rgba(38,116,186,1)]" : "bg-gray-300"}`} />
                                                {!isCollapsed && (
                                                    <div className="flex flex-col items-start overflow-hidden text-left flex-1 min-w-0">
                                                        <span className="font-medium truncate w-full pr-12">{project.name}</span>
                                                    </div>
                                                )}
                                                {!isCollapsed && (
                                                    <div className={`absolute right-2 flex items-center gap-1 transition-all ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                        {canEdit && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onEditProject?.(project);
                                                                }}
                                                                className="p-1.5 hover:bg-[rgba(38,116,186,0.1)] rounded-full"
                                                                title="Edit Project"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5 text-[rgba(38,116,186,1)]" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onShareProject?.(project.id);
                                                            }}
                                                            className="p-1.5 hover:bg-[rgba(38,116,186,0.1)] rounded-full"
                                                            title="Share Project"
                                                        >
                                                            <Share2 className="w-4 h-4 text-[rgba(38,116,186,1)]" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <AnimatePresence initial={false}>
                                                {!isCollapsed && isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="pl-6 pr-2 pb-2 pt-0 space-y-0.5 border-l-2 border-gray-100 ml-3">
                                                            {studiesLoading ? (
                                                                <div className="flex items-center gap-2 py-2 px-2 text-gray-400">
                                                                    <div className="w-4 h-4 border-2 border-[rgba(38,116,186,0.2)] border-t-[rgba(38,116,186,1)] rounded-full animate-spin shrink-0" />
                                                                    <span className="text-xs">Loading studies...</span>
                                                                </div>
                                                            ) : projectStudies.length === 0 ? (
                                                                <p className="py-2 px-2 text-xs text-gray-400 italic">No studies</p>
                                                            ) : (
                                                                projectStudies.map((study) => {
                                                                    const canCopyInProject = project.role === 'admin' || project.role === 'editor' || project.role === 'owner';
                                                                    const isCopying = copyLoadingStudyId === study.id;
                                                                    return (
                                                                        <div
                                                                            key={study.id}
                                                                            className="w-full flex items-center gap-2 py-2 px-2 rounded-md text-sm text-gray-600 hover:bg-[rgba(38,116,186,0.08)] group"
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    onStudyClick?.(study);
                                                                                }}
                                                                                className="flex items-center gap-2 flex-1 min-w-0 text-left hover:text-[rgba(38,116,186,1)] transition-colors"
                                                                            >
                                                                                <FileText className="w-4 h-4 shrink-0 text-gray-400" />
                                                                                <span className="truncate">{study.title || "Untitled"}</span>
                                                                            </button>
                                                                            {canCopyInProject && study.status !== "draft" && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={async (e) => {
                                                                                        e.stopPropagation();
                                                                                        if (copyLoadingStudyId) return;
                                                                                        setCopyLoadingStudyId(study.id);
                                                                                        try {
                                                                                            await copyStudy(study.id, project.id);
                                                                                            await onStudyCopied?.();
                                                                                        } finally {
                                                                                            setCopyLoadingStudyId(null);
                                                                                        }
                                                                                    }}
                                                                                    disabled={copyLoadingStudyId !== null}
                                                                                    className="p-1.5 rounded hover:bg-[rgba(38,116,186,0.15)] text-[rgba(38,116,186,1)] disabled:opacity-50 shrink-0"
                                                                                    title="Copy study"
                                                                                >
                                                                                    {isCopying ? (
                                                                                        <span className="inline-block w-3.5 h-3.5 border-2 border-[rgba(38,116,186,1)] border-t-transparent rounded-full animate-spin" />
                                                                                    ) : (
                                                                                        <Copy className="w-3.5 h-3.5" />
                                                                                    )}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </motion.aside>

            {/* Mobile Trigger Button when sidebar is hidden/collapsed */}
            <AnimatePresence>
                {isMobile && isCollapsed && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsCollapsed(false)}
                        className="fixed left-4 bottom-4 w-12 h-12 bg-[rgba(38,116,186,1)] text-white rounded-full shadow-lg flex items-center justify-center z-[110] lg:hidden hover:scale-110 active:scale-95 transition-transform"
                    >
                        <Menu className="w-6 h-6" />
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    )
}
