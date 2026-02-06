"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Project } from "@/api/projectApi"

interface EditProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (projectId: string, name: string, description: string) => void;
    isSubmitting?: boolean;
    project: Project | null;
}

export function EditProjectModal({ isOpen, onClose, onUpdate, isSubmitting, project }: EditProjectModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (project) {
            setName(project.name || "");
            setDescription(project.description || "");
        }
    }, [project, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (project && name.trim() && !isSubmitting) {
            onUpdate(project.id, name, description);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150]"
                    />
                    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[160]">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 pointer-events-auto overflow-hidden relative"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Edit Project</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Project Name
                                    </label>
                                    <Input
                                        id="edit-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter project name..."
                                        required
                                        disabled={isSubmitting}
                                        className="w-full border-gray-200 focus:border-[rgba(38,116,186,1)] focus:ring-[rgba(38,116,186,0.1)]"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        disabled={isSubmitting}
                                        className="flex-1 py-2 text-gray-600 border-gray-200"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting || !name.trim() || (project && name === project.name)}
                                        className="flex-1 bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white py-2 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            "Save Changes"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
