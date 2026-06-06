'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Crown, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import type { PlanTier } from '@/lib/config/planLimits'

const ENTERPRISE_MAILTO =
  'mailto:hello@mindsurve.com?subject=MindSurve%20Enterprise'

interface CollaborationUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  context: 'study' | 'project'
  currentPlan: PlanTier
}

export function CollaborationUpgradeModal({
  isOpen,
  onClose,
  context,
  currentPlan,
}: CollaborationUpgradeModalProps) {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)

  const title =
    context === 'study' ? 'Share study with your team' : 'Share project with your team'
  const description =
    context === 'study'
      ? 'Inviting collaborators to a study requires a Pro or Enterprise plan. Upgrade to add editors and viewers to your study.'
      : 'Inviting collaborators to a project requires a Pro or Enterprise plan. Upgrade to add team members to your project.'

  return (
    <>
      <AnimatePresence>
        {isOpen && !isUpgradeModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 16 }}
                className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>

                <div className="px-6 pb-6 pt-8 text-center sm:px-8">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(38,116,186,0.12)]">
                    <UserPlus className="h-7 w-7 text-[rgba(38,116,186,1)]" strokeWidth={2} />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{description}</p>

                  <div className="mt-6 space-y-3">
                    <Button
                      type="button"
                      onClick={() => setIsUpgradeModalOpen(true)}
                      className="w-full rounded-xl bg-[rgba(38,116,186,1)] py-2.5 text-white hover:bg-[#1a5f96]"
                    >
                      <Crown className="mr-2 h-4 w-4" />
                      Upgrade to Pro
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        window.location.href = ENTERPRISE_MAILTO
                      }}
                      className="w-full rounded-xl border-[rgba(38,116,186,0.35)] text-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.06)]"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      Contact for Enterprise
                    </Button>
                  </div>

                  <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                    <Crown className="h-3.5 w-3.5 text-[rgba(38,116,186,1)]" />
                    Free plan does not include team sharing
                  </p>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => {
          setIsUpgradeModalOpen(false)
          onClose()
        }}
        currentPlan={currentPlan}
      />
    </>
  )
}
