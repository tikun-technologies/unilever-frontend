"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { X, UserPlus, Trash2, Loader2, Mail } from "lucide-react"
import {
    getProjectMembers,
    inviteProjectMember,
    updateProjectMemberRole,
    removeProjectMember,
    ProjectMember
} from "@/api/projectApi"
import { useAuth } from "@/lib/auth/AuthContext"

interface ShareProjectModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    userRole?: string
}

export function ShareProjectModal({ isOpen, onClose, projectId, userRole = 'viewer' }: ShareProjectModalProps) {
    const [email, setEmail] = useState("")
    const [role, setRole] = useState("viewer")
    const [members, setMembers] = useState<ProjectMember[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isActionLoading, setIsActionLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [effectiveRole, setEffectiveRole] = useState(userRole)
    const lastActionTimeRef = useRef<number>(0)
    const { user: authUser } = useAuth()

    const currentUser = authUser || (() => {
        if (typeof window !== 'undefined') {
            try {
                const ls = localStorage.getItem('user');
                return ls ? JSON.parse(ls) : null;
            } catch (e) { return null; }
        }
        return null;
    })();

    useEffect(() => {
        // Determine the effective role immediately from localStorage if available
        // to bypass any potential stale props
        if (projectId) {
            const storedRole = localStorage.getItem(`ps_role_${projectId}`)
            if (storedRole) {
                setEffectiveRole(storedRole)
            } else {
                setEffectiveRole(userRole)
            }
        }
    }, [projectId, userRole])

    useEffect(() => {
        if (projectId && (effectiveRole === 'admin' || effectiveRole === 'editor' || effectiveRole === 'owner')) {
            // Initial hydration from cache
            try {
                const cached = localStorage.getItem(`ps_members_${projectId}`)
                if (cached) {
                    setMembers(JSON.parse(cached))
                }
            } catch (e) { }
            fetchMembers()
        }
    }, [projectId, effectiveRole])

    // Helper to update state and cache simultaneously
    const setMembersAndCache = (newMembers: ProjectMember[] | ((prev: ProjectMember[]) => ProjectMember[])) => {
        setMembers(prev => {
            const resolvedMembers = typeof newMembers === 'function' ? newMembers(prev) : newMembers;
            if (projectId) {
                try {
                    localStorage.setItem(`ps_members_${projectId}`, JSON.stringify(resolvedMembers))
                } catch (e) {
                    console.error("Failed to update cache:", e)
                }
            }
            return resolvedMembers
        })
    }

    const fetchMembers = async () => {
        const fetchStartTime = Date.now()
        setIsLoading(true)
        setError(null)
        try {
            const data = await getProjectMembers(projectId)

            // Race Condition Check:
            // If the user performed an action (invite/update/delete) *after* this fetch started,
            // we must discard this stale read to prevent overwriting their optimistic changes.
            if (fetchStartTime < lastActionTimeRef.current) {
                console.log("Discarding stale fetch result due to recent user action")
                return
            }

            let finalMembers = [...data]

            if (userRole === 'admin' || userRole === 'owner') {
                let myEmail = currentUser?.email
                let myName = currentUser?.name

                if (myEmail) {
                    const normalizedMyEmail = myEmail.trim().toLowerCase()
                    const exists = finalMembers.some(m =>
                        (m.email || m.invited_email || '').trim().toLowerCase() === normalizedMyEmail
                    )

                    if (!exists) {
                        finalMembers.push({
                            id: 'current-admin-injection',
                            email: myEmail,
                            name: myName || '',
                            role: (userRole === 'owner' ? 'admin' : userRole) as any,
                            status: 'active'
                        })
                    }
                }
            }

            setMembersAndCache(finalMembers)
        } catch (err: any) {
            console.error("Failed to fetch members:", err)
            setError("Failed to load members")
        } finally {
            setIsLoading(false)
        }
    }

    const handleInvite = async () => {
        if (!email) return
        const inviteEmail = email.trim()
        const exists = members.some(m =>
            (m.email || m.invited_email || '').toLowerCase() === inviteEmail.toLowerCase()
        )
        if (exists) {
            setError("User is already a member")
            return
        }

        setIsActionLoading(true)
        setError(null)
        lastActionTimeRef.current = Date.now() // Mark action timestamp

        // Optimistic update
        const tempId = `temp-${Date.now()}`
        const newMember: ProjectMember = {
            id: tempId,
            email: inviteEmail,
            invited_email: inviteEmail,
            role: role as any,
            name: "",
            status: 'pending'
        }

        const previousMembers = [...members]
        setMembersAndCache(prev => [newMember, ...prev])
        setEmail("")

        try {
            const response = await inviteProjectMember(projectId, inviteEmail, role)

            // If the response contains the new member data, update our optimistic member with the real ID
            if (response && response.id) {
                setMembersAndCache(prev => prev.map(m =>
                    m.email === inviteEmail ? { ...m, ...response } : m
                ))
            }

            // Do NOT re-fetch members immediately as it might return stale data (eventual consistency)
            // causing the new member to "vanish"
        } catch (err: any) {
            console.error("Failed to invite member:", err)
            setError(err.message || "Failed to invite member")
            // Rollback
            setMembersAndCache(previousMembers)
            setEmail(inviteEmail)
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleUpdateRole = async (memberId: string, newRole: string) => {
        // Strict role check: Only Admin and Owner can update roles
        if (effectiveRole !== 'admin' && effectiveRole !== 'owner') return;

        setIsActionLoading(true)
        lastActionTimeRef.current = Date.now() // Mark action timestamp
        const previousMembers = [...members]

        // Optimistic update
        setMembersAndCache(prev => prev.map(m =>
            m.id === memberId ? { ...m, role: newRole as any } : m
        ))

        try {
            await updateProjectMemberRole(projectId, memberId, newRole)
            // No need to fetchMembers if we trust the API success
        } catch (err: any) {
            console.error("Failed to update role:", err)
            setError(err.message || "Failed to update role")
            // Rollback
            setMembersAndCache(previousMembers)
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        if (memberId === 'current-admin-injection') return
        // Strict role check: Only Admin and Owner can remove members
        if (effectiveRole !== 'admin' && effectiveRole !== 'owner') return;

        setIsActionLoading(true)
        lastActionTimeRef.current = Date.now() // Mark action timestamp
        const previousMembers = [...members]

        // Optimistic remove
        setMembersAndCache(prev => prev.filter(m => m.id !== memberId))

        try {
            await removeProjectMember(projectId, memberId)
            // No need to fetchMembers if we trust the API success
        } catch (err: any) {
            console.error("Failed to remove member:", err)
            setError(err.message || "Failed to remove member")
            // Rollback
            setMembersAndCache(previousMembers)
        } finally {
            setIsActionLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
                    />

                    <div className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <UserPlus className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800">Share Project</h3>
                                </div>
                                <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto">
                                {(effectiveRole === 'admin' || effectiveRole === 'owner' || effectiveRole === 'editor') && (
                                    <div className="space-y-4 bg-blue-50/30 p-4 rounded-lg border border-blue-100">
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <div className="flex-1">
                                                <Input
                                                    type="email"
                                                    placeholder="Enter email address"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="bg-white"
                                                />
                                            </div>
                                            <div className="w-full sm:w-32">
                                                <Select value={role} onValueChange={setRole}>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="editor">Editor</SelectItem>
                                                        <SelectItem value="viewer">Viewer</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Button
                                                onClick={handleInvite}
                                                disabled={!email || !email.includes("@") || isActionLoading}
                                                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                                            >
                                                Invite
                                            </Button>
                                        </div>
                                        {error && <p className="text-xs text-red-500">{error}</p>}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                                        <span>Members with access</span>
                                    </h4>

                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {[...members]
                                            .sort((a, b) => {
                                                const emailA = (a.email || a.invited_email || '').toLowerCase();
                                                const emailB = (b.email || b.invited_email || '').toLowerCase();
                                                const currentEmail = (currentUser?.email || '').toLowerCase();

                                                const isSelfA = currentUser && emailA === currentEmail;
                                                const isSelfB = currentUser && emailB === currentEmail;

                                                const roleA = (a.role || '').toLowerCase();
                                                const roleB = (b.role || '').toLowerCase();
                                                const isAdminA = roleA === 'admin';
                                                const isAdminB = roleB === 'admin';

                                                // Priority 1: Current User + Admin/Owner
                                                const isSelfAdminA = isSelfA && (isAdminA || effectiveRole === 'admin' || effectiveRole === 'owner');
                                                const isSelfAdminB = isSelfB && (isAdminB || effectiveRole === 'admin' || effectiveRole === 'owner');

                                                if (isSelfAdminA && !isSelfAdminB) return -1;
                                                if (!isAdminA && isAdminB) return 1;

                                                // Priority 2: Current user (even if not admin)
                                                if (isSelfA && !isSelfB) return -1;
                                                if (!isSelfA && isSelfB) return 1;

                                                return 0;
                                            })
                                            .map((member) => {
                                                const currentEmail = (currentUser?.email || '').toLowerCase();
                                                const memberEmail = (member.email || member.invited_email || '').toLowerCase();
                                                const isSelf = currentUser && memberEmail === currentEmail;

                                                // Determine "Admin" badge
                                                const rawRole = (member.role || '').toLowerCase();
                                                const showAdminBadge = rawRole === 'admin';

                                                return (
                                                    <div key={member.id} className="flex items-center justify-between group">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                                                {member.name ? (
                                                                    <span className="text-xs font-bold text-gray-600">{member.name.charAt(0).toUpperCase()}</span>
                                                                ) : (
                                                                    <Mail className="w-4 h-4 text-gray-400" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-800">
                                                                    {showAdminBadge ? (
                                                                        member.name || member.email || member.invited_email
                                                                    ) : (
                                                                        member.email || member.invited_email
                                                                    )}
                                                                    {isSelf && <span className="text-gray-400 ml-1">(you)</span>}
                                                                </p>
                                                                {(showAdminBadge || member.name) && (
                                                                    <p className="text-xs text-gray-500">
                                                                        {showAdminBadge ? (member.email || member.invited_email) : (member.name ? (member.email || member.invited_email) : null)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center space-x-2">
                                                            {showAdminBadge ? (
                                                                <span className="text-xs font-medium text-gray-400 px-2 py-1 bg-gray-50 rounded italic">Admin</span>
                                                            ) : (
                                                                <>
                                                                    <Select
                                                                        value={member.role}
                                                                        onValueChange={(val) => handleUpdateRole(member.id, val)}
                                                                        disabled={isActionLoading || (effectiveRole !== 'admin' && effectiveRole !== 'owner')}
                                                                    >
                                                                        <SelectTrigger className="h-8 border-transparent hover:bg-gray-100 transition-colors text-xs w-24">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="editor">Editor</SelectItem>
                                                                            <SelectItem value="viewer">Viewer</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    {(effectiveRole === 'admin' || effectiveRole === 'owner') && (
                                                                        <button
                                                                            onClick={() => handleRemoveMember(member.id)}
                                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        {members.length === 0 && !isLoading && (
                                            <p className="text-sm text-gray-500 text-center py-4">No members added yet.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
                                <Button variant="outline" onClick={onClose} className="text-gray-600 border-gray-200">Done</Button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
