"use client"

import React, { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Filter, X } from "lucide-react"
import type { ClassificationQuestionPayload } from "@/lib/api/StudyAPI"
import type { SavedFilterReport, StudyFilterPayload } from "@/lib/api/ResponseAPI"
import { AnalyticsAdvancedFilterPanel } from "./AnalyticsAdvancedFilterPanel"

interface AnalyticsAdvancedFilterModalProps {
	studyId: string
	classificationQuestions?: ClassificationQuestionPayload[] | null
	initialFilters?: StudyFilterPayload["filters"] | null
	savedReports?: SavedFilterReport[]
	isOpen: boolean
	onClose: () => void
	onRunAnalysis: (filters: StudyFilterPayload["filters"]) => void
	onSaveAndRun?: (name: string, filters: StudyFilterPayload["filters"]) => void | Promise<void>
	isRunning?: boolean
	error?: string | null
	saveError?: string | null
}

export function AnalyticsAdvancedFilterModal({
	studyId,
	classificationQuestions,
	initialFilters = null,
	savedReports = [],
	isOpen,
	onClose,
	onRunAnalysis,
	onSaveAndRun,
	isRunning = false,
	error = null,
	saveError = null,
}: AnalyticsAdvancedFilterModalProps) {
	const [panelKey, setPanelKey] = useState(0)

	useEffect(() => {
		if (isOpen) setPanelKey((k) => k + 1)
	}, [isOpen])

	useEffect(() => {
		if (!isOpen) return
		const previousBodyOverflow = document.body.style.overflow
		document.body.style.overflow = "hidden"
		return () => {
			document.body.style.overflow = previousBodyOverflow
		}
	}, [isOpen])

	return (
		<AnimatePresence>
			{isOpen ? (
				<motion.div className="fixed inset-0 z-[110]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
					<button
						type="button"
						className="absolute inset-0 cursor-pointer bg-black/30"
						onClick={isRunning ? undefined : onClose}
						aria-label="Close filters"
						disabled={isRunning}
					/>

					<motion.aside
						initial={{ x: 24, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: 24, opacity: 0 }}
						transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
						className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-white shadow-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
							<div className="flex items-center gap-2">
								<Filter className="h-4 w-4 text-[#2674BA]" />
								<h2 className="text-base font-bold text-gray-900">Filters</h2>
							</div>
							<button
								type="button"
								onClick={onClose}
								disabled={isRunning}
								className="cursor-pointer rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
							<AnalyticsAdvancedFilterPanel
								key={panelKey}
								studyId={studyId}
								classificationQuestions={classificationQuestions}
								initialFilters={initialFilters}
								savedReports={savedReports}
								onRunAnalysis={onRunAnalysis}
								onSaveAndRun={onSaveAndRun}
								onCancel={onClose}
								isRunning={isRunning}
								error={error}
								saveError={saveError}
							/>
						</div>
					</motion.aside>
				</motion.div>
			) : null}
		</AnimatePresence>
	)
}
