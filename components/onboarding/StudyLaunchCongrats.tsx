"use client"

import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, Share2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type StudyLaunchCongratsProps = {
  isOpen: boolean
  studyId: string
  projectQuery: string
  onClose: () => void
}

export function StudyLaunchCongrats({
  isOpen,
  studyId,
  projectQuery,
  onClose,
}: StudyLaunchCongratsProps) {
  const router = useRouter()
  const shareHref = `/home/study/${studyId}/share${projectQuery}`

  const handleShare = () => {
    onClose()
    router.push(shareHref)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
            className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-6 text-center shadow-[0_32px_90px_rgba(15,23,42,0.3)] sm:p-8"
          >
            <motion.div
              initial={{ scale: 0.7, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.08, type: "spring", stiffness: 260, damping: 18 }}
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"
            >
              <CheckCircle2 className="h-9 w-9" />
            </motion.div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Congratulations! 🎉
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your study is now live. Share it with participants so they can take part and
              start collecting responses.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Button
                onClick={handleShare}
                className="h-11 cursor-pointer rounded-xl bg-[#2674BA] px-6 text-white shadow-lg shadow-blue-500/20 hover:bg-[#1f66a5]"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share with Participants
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="h-11 cursor-pointer rounded-xl border-slate-200 px-5 text-slate-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
