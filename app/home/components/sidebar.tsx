"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Menu,
    X,
    Plus,
    Folder,
    LayoutGrid,
    Circle,
    Share2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Project } from "@/api/projectApi"

interface SidebarProps {
    projects: Project[];
    selectedProjectId: string | null;
    onSelectProject: (id: string | null) => void;
    onCreateProject: () => void;
    onShareProject?: (id: string) => void;
    isLoading?: boolean;
}

export function Sidebar({
    projects,
    selectedProjectId,
    onSelectProject,
    onCreateProject,
    onShareProject,
    isLoading
}: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
                className={`bg-white border-r border-[rgba(209,223,235,1)] flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out shadow-sm overflow-hidden z-[101] 
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
                        <div className="space-y-1">
                            {isLoading ? (
                                <div className="px-4 py-8 flex flex-col items-center justify-center gap-3">
                                    <div className="w-6 h-6 border-2 border-[rgba(38,116,186,0.2)] border-t-[rgba(38,116,186,1)] rounded-full animate-spin" />
                                    {!isCollapsed && <p className="text-xs text-gray-400">Loading projects...</p>}
                                </div>
                            ) : projects.length === 0 ? (
                                !isCollapsed && <p className="px-4 py-4 text-sm text-gray-400 italic">No projects found</p>
                            ) : (
                                projects.map((project) => (
                                    <div
                                        key={project.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => onSelectProject(project.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onSelectProject(project.id);
                                            }
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group relative cursor-pointer ${selectedProjectId === project.id
                                            ? "bg-[rgba(38,116,186,0.1)] text-[rgba(38,116,186,1)] border-l-4 border-[rgba(38,116,186,1)] rounded-l-none"
                                            : "text-gray-600 hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${selectedProjectId === project.id ? "bg-[rgba(38,116,186,1)]" : "bg-gray-300"}`} />
                                        {!isCollapsed && (
                                            <div className="flex flex-col items-start overflow-hidden text-left flex-1">
                                                <span className="font-medium truncate w-full pr-6">{project.name}</span>
                                            </div>
                                        )}
                                        {!isCollapsed && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onShareProject?.(project.id);
                                                }}
                                                className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[rgba(38,116,186,0.1)] rounded-full transition-all"
                                                title="Share Project"
                                            >
                                                <Share2 className="w-4 h-4 text-[rgba(38,116,186,1)]" />
                                            </button>
                                        )}
                                    </div>
                                ))
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
