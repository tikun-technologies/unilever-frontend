"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Filter, Loader2, Users, CalendarRange, HelpCircle, MessageSquareText } from "lucide-react"
import { getStudyDetails } from "@/lib/api/StudyAPI"
import type { ClassificationQuestionPayload } from "@/lib/api/StudyAPI"
import type { StudyFilterPayload } from "@/lib/api/ResponseAPI"
import { buildFilterPayload, filtersEqual } from "@/lib/utils/filterAnalysisMerge"

const FILTER_AGE_GROUPS = ["13-18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"]
const GENDERS = ["Male", "Female"]
const BRAND_BLUE = "#2674BA"

function isOpenTextQuestion(q: ClassificationQuestionPayload): boolean {
	const type = (q.question_type || "").toLowerCase()
	return type === "text" || type === "open_text" || type === "open"
}

function FilterChip({
	label,
	selected,
	onClick,
	delay = 0,
}: {
	label: string
	selected: boolean
	onClick: () => void
	delay?: number
}) {
	return (
		<motion.button
			type="button"
			onClick={onClick}
			initial={{ opacity: 0, scale: 0.92 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay, type: "spring", stiffness: 400, damping: 25 }}
			whileHover={{ scale: 1.03 }}
			whileTap={{ scale: 0.98 }}
			className={`cursor-pointer px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2674BA]/40 ${
				selected
					? "text-white border-transparent shadow-md"
					: "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
			}`}
			style={
				selected
					? { backgroundColor: BRAND_BLUE, boxShadow: `0 4px 14px ${BRAND_BLUE}40` }
					: undefined
			}
		>
			{label}
		</motion.button>
	)
}

function FilterSection({
	icon: Icon,
	title,
	subtitle,
	children,
	badge,
	headerAction,
}: {
	icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
	title: string
	subtitle: string
	children: React.ReactNode
	badge?: string
	headerAction?: React.ReactNode
}) {
	return (
		<div className="rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white to-gray-50/60 p-4 sm:p-5 shadow-sm">
			<div className="flex items-start gap-3 mb-4">
				<div
					className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
					style={{ backgroundColor: `${BRAND_BLUE}14` }}
				>
					<Icon className="w-5 h-5" style={{ color: BRAND_BLUE }} />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="text-base font-bold text-gray-900">{title}</h3>
								{badge ? (
									<span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
										{badge}
									</span>
								) : null}
							</div>
							<p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
						</div>
						{headerAction ? <div className="shrink-0">{headerAction}</div> : null}
					</div>
				</div>
			</div>
			{children}
		</div>
	)
}

function QuestionFilterActions({
	allSelected,
	someSelected,
	selectedCount,
	onSelectAll,
	onClearAll,
	disabled,
}: {
	allSelected: boolean
	someSelected: boolean
	selectedCount: number
	onSelectAll: () => void
	onClearAll: () => void
	disabled?: boolean
}) {
	return (
		<div className="flex flex-col items-end gap-1.5">
			<div className="flex items-center gap-3">
				<SelectAllCheckbox
					checked={allSelected}
					indeterminate={someSelected}
					onChange={onSelectAll}
					disabled={disabled}
				/>
				{selectedCount > 0 ? (
					<button
						type="button"
						onClick={onClearAll}
						disabled={disabled}
						className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Clear all
					</button>
				) : null}
			</div>
		</div>
	)
}

function SelectAllCheckbox({
	checked,
	indeterminate,
	onChange,
	disabled,
}: {
	checked: boolean
	indeterminate: boolean
	onChange: () => void
	disabled?: boolean
}) {
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.indeterminate = indeterminate
		}
	}, [indeterminate])

	return (
		<label
			className={`inline-flex items-center gap-2 cursor-pointer select-none ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
		>
			<input
				ref={inputRef}
				type="checkbox"
				checked={checked}
				onChange={onChange}
				disabled={disabled}
				className="h-4 w-4 rounded border-gray-300 text-[#2674BA] focus:ring-[#2674BA]/40 cursor-pointer disabled:cursor-not-allowed"
			/>
			<span className="text-xs font-semibold text-[#2674BA] whitespace-nowrap">Select all</span>
		</label>
	)
}

interface AnalyticsAdvancedFilterPanelProps {
	studyId: string
	classificationQuestions?: ClassificationQuestionPayload[] | null
	initialFilters?: StudyFilterPayload["filters"] | null
	onRunAnalysis: (filters: StudyFilterPayload["filters"]) => void
	isRunning?: boolean
	error?: string | null
}

function applyInitialFilters(initialFilters?: StudyFilterPayload["filters"] | null) {
	return {
		ageGroups: [...(initialFilters?.age_groups ?? [])],
		genders: [...(initialFilters?.genders ?? [])],
		classificationFilters: { ...(initialFilters?.classification_filters ?? {}) },
	}
}

export function AnalyticsAdvancedFilterPanel({
	studyId,
	classificationQuestions: classificationQuestionsProp,
	initialFilters = null,
	onRunAnalysis,
	isRunning = false,
	error = null,
}: AnalyticsAdvancedFilterPanelProps) {
	const [classificationQuestionsFetched, setClassificationQuestionsFetched] = useState<
		ClassificationQuestionPayload[]
	>([])
	const hasProp = classificationQuestionsProp != null
	const [loadingStudy, setLoadingStudy] = useState(hasProp === false)
	const classificationQuestions = hasProp ? classificationQuestionsProp : classificationQuestionsFetched

	const [ageGroups, setAgeGroups] = useState<string[]>(() => applyInitialFilters(initialFilters).ageGroups)
	const [genders, setGenders] = useState<string[]>(() => applyInitialFilters(initialFilters).genders)
	const [classificationFilters, setClassificationFilters] = useState<Record<string, string[]>>(
		() => applyInitialFilters(initialFilters).classificationFilters
	)

	useEffect(() => {
		if (!studyId || hasProp) return
		setLoadingStudy(true)
		getStudyDetails(studyId)
			.then((study) => {
				setClassificationQuestionsFetched(study?.classification_questions ?? [])
			})
			.catch(() => setClassificationQuestionsFetched([]))
			.finally(() => setLoadingStudy(false))
	}, [studyId, hasProp])

	const toggleAge = (age: string) => {
		setAgeGroups((prev) => (prev.includes(age) ? prev.filter((a) => a !== age) : [...prev, age]))
	}
	const toggleGender = (g: string) => {
		setGenders((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
	}
	const toggleClassificationOption = (questionText: string, optionText: string) => {
		setClassificationFilters((prev) => {
			const arr = prev[questionText] ?? []
			const next = arr.includes(optionText)
				? arr.filter((x) => x !== optionText)
				: [...arr, optionText]
			if (next.length === 0) {
				const { [questionText]: _, ...rest } = prev
				return rest
			}
			return { ...prev, [questionText]: next }
		})
	}

	const toggleSelectAllForQuestion = (questionText: string, optionTexts: string[]) => {
		setClassificationFilters((prev) => {
			const current = prev[questionText] ?? []
			const allSelected =
				optionTexts.length > 0 && optionTexts.every((text) => current.includes(text))
			if (allSelected) {
				const { [questionText]: _, ...rest } = prev
				return rest
			}
			return { ...prev, [questionText]: [...optionTexts] }
		})
	}

	const clearQuestionSelections = (questionText: string) => {
		setClassificationFilters((prev) => {
			const { [questionText]: _, ...rest } = prev
			return rest
		})
	}

	const handleClearAllFilters = () => {
		setAgeGroups([])
		setGenders([])
		setClassificationFilters({})
	}

	const handleRunAnalysis = useCallback(() => {
		onRunAnalysis(buildFilterPayload(ageGroups, genders, classificationFilters))
	}, [ageGroups, genders, classificationFilters, onRunAnalysis])

	const draftFilters = useMemo(
		() => buildFilterPayload(ageGroups, genders, classificationFilters),
		[ageGroups, genders, classificationFilters]
	)

	const filtersUnchanged = useMemo(
		() => filtersEqual(draftFilters, initialFilters),
		[draftFilters, initialFilters]
	)

	const activeFilterCount =
		genders.length +
		ageGroups.length +
		Object.values(classificationFilters).reduce((sum, arr) => sum + arr.length, 0)

	if (loadingStudy) {
		return (
			<div className="flex items-center justify-center gap-3 text-gray-500 py-12">
				<Loader2 className="w-5 h-5 animate-spin" style={{ color: BRAND_BLUE }} />
				<span className="text-sm font-medium">Loading study questions…</span>
			</div>
		)
	}

	return (
		<div className="space-y-5">
			<div className="max-h-[min(52vh,520px)] overflow-y-auto pr-1 sm:pr-2 -mr-1 sm:-mr-2">
				<div className="space-y-4">
					<FilterSection
						icon={Users}
						title="Gender"
						subtitle="Choose who to include in your segment. Leave empty to include all."
					>
						<div className="flex flex-wrap gap-2">
							{GENDERS.map((g, i) => (
								<FilterChip
									key={g}
									label={g}
									selected={genders.includes(g)}
									onClick={() => toggleGender(g)}
									delay={i * 0.03}
								/>
							))}
						</div>
					</FilterSection>

					<FilterSection
						icon={CalendarRange}
						title="Age Group"
						subtitle="Select one or more age ranges. Leave empty to include all ages."
					>
						<div className="flex flex-wrap gap-2">
							{FILTER_AGE_GROUPS.map((age, i) => (
								<FilterChip
									key={age}
									label={age}
									selected={ageGroups.includes(age)}
									onClick={() => toggleAge(age)}
									delay={i * 0.02}
								/>
							))}
						</div>
					</FilterSection>

					{classificationQuestions.length > 0 ? (
						classificationQuestions.map((q, qIdx) => {
							const isOpen = isOpenTextQuestion(q)
							const options = q.answer_options ?? []
							const optionTexts = options.map((opt) => opt.text)
							const selected = classificationFilters[q.question_text] ?? []
							const allSelected =
								optionTexts.length > 0 && optionTexts.every((text) => selected.includes(text))
							const someSelected = selected.length > 0 && !allSelected
							return (
								<FilterSection
									key={q.question_id}
									icon={isOpen ? MessageSquareText : HelpCircle}
									title={q.question_text}
									subtitle={
										isOpen
											? "Open-ended response — shown for context; filter by choice-based answers below."
											: optionTexts.length > 0
												? `${selected.length} of ${optionTexts.length} selected · Select one or more answers to narrow your segment.`
												: "Select one or more answers to narrow your segment."
									}
									badge={isOpen ? "Open question" : undefined}
									headerAction={
										!isOpen && optionTexts.length > 0 ? (
											<QuestionFilterActions
												allSelected={allSelected}
												someSelected={someSelected}
												selectedCount={selected.length}
												onSelectAll={() => toggleSelectAllForQuestion(q.question_text, optionTexts)}
												onClearAll={() => clearQuestionSelections(q.question_text)}
												disabled={isRunning}
											/>
										) : undefined
									}
								>
									{isOpen ? (
										<div className="rounded-xl border border-dashed border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-500">
											Responses to this question are free text and are not used as filter criteria.
										</div>
									) : options.length > 0 ? (
										<div className="flex flex-wrap gap-2">
											{options.map((opt, oIdx) => (
												<FilterChip
													key={opt.id}
													label={opt.text}
													selected={selected.includes(opt.text)}
													onClick={() => toggleClassificationOption(q.question_text, opt.text)}
													delay={qIdx * 0.02 + oIdx * 0.02}
												/>
											))}
										</div>
									) : (
										<p className="text-sm text-gray-500">No answer options configured.</p>
									)}
								</FilterSection>
							)
						})
					) : (
						<FilterSection
							icon={HelpCircle}
							title="Classification Questions"
							subtitle="No classification questions are configured for this study."
						>
							<p className="text-sm text-gray-500">
								Add classification questions in study setup to filter by them here.
							</p>
						</FilterSection>
					)}
				</div>
			</div>

			<div className="sticky bottom-0 pt-2 border-t border-gray-100 bg-white/95 backdrop-blur-sm">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3">
					<p className="text-xs text-gray-500">
						{activeFilterCount > 0
							? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} selected`
							: "No filters selected — all respondents will be included"}
					</p>
					<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={handleClearAllFilters}
							disabled={isRunning || activeFilterCount === 0}
							className="cursor-pointer inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 rounded-xl font-semibold text-sm text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
						>
							Clear all filters
						</button>
						<motion.button
							type="button"
							onClick={handleRunAnalysis}
							disabled={isRunning || filtersUnchanged}
							whileHover={!isRunning && !filtersUnchanged ? { scale: 1.02 } : undefined}
							whileTap={!isRunning && !filtersUnchanged ? { scale: 0.98 } : undefined}
							className="cursor-pointer inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-80 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2674BA]/40"
							style={{
								backgroundColor: BRAND_BLUE,
								boxShadow: filtersUnchanged ? undefined : `0 8px 28px ${BRAND_BLUE}45`,
							}}
						>
							{isRunning ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Filter className="w-4 h-4" />
							)}
							{filtersUnchanged && !isRunning ? "Already applied" : "Run Analysis"}
						</motion.button>
					</div>
				</div>
				{error ? (
					<p className="text-sm text-red-600 mt-2" role="alert">
						{error}
					</p>
				) : null}
			</div>
		</div>
	)
}
