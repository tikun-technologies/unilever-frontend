"use client"

import { useEffect, useRef, useState } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildClassificationQuestionsPayloadFromLocalStorage, normalizeClassificationId, putUpdateStudyAsync } from "@/lib/api/StudyAPI"

interface Option {
	id: string
	option_id?: string
	text: string
	option_text?: string
}

interface QuestionCard {
	id: string
	question_id?: string
	question_text?: string
	title: string
	required: boolean
	is_required?: boolean
	options: Option[]
	answer_options?: Option[]
	isOpen?: boolean
	optional_classification_question?: boolean
	config?: Record<string, any>
}

interface Step4ClassificationQuestionsProps {
	onNext: () => void
	onBack: () => void
	onDataChange?: () => void
	isReadOnly?: boolean
	storageKey?: "cs_step4" | "cs_step6_optional_classification"
	completionKey?: string
	title?: string
	description?: string
	secondaryDescription?: string
	currentStepNumber?: number
	isOptionalStep?: boolean
}

export function Step4ClassificationQuestions({
	onNext,
	onBack,
	onDataChange,
	isReadOnly = false,
	storageKey = "cs_step4",
	completionKey,
	title = "Classification Questions",
	description = "Add demographic and classification questions to segment your respondents. These questions will be asked before the main study tasks.",
	secondaryDescription = "Age and Gender will be asked by default (no need to put them here).",
	currentStepNumber = 4,
	isOptionalStep = false,
}: Step4ClassificationQuestionsProps) {
	const createClassificationId = () => normalizeClassificationId(crypto.randomUUID(), "")

	const [questions, setQuestions] = useState<QuestionCard[]>(() => {
		try {
			const raw = localStorage.getItem(storageKey)
			if (raw) {
				const data = JSON.parse(raw) as QuestionCard[]
				if (Array.isArray(data) && data.length > 0) {
					return data.map((q, idx) => {
						const options = Array.isArray(q.options) && q.options.length > 0 ? q.options : q.answer_options

						return {
							id: normalizeClassificationId(q.question_id || q.id, createClassificationId()),
							title: q.title || q.question_text || "",
							required: typeof q.required === 'boolean' ? q.required : q.is_required !== false,
							options: Array.isArray(options) && options.length > 0 ? options.map(o => ({ id: normalizeClassificationId(o.id || o.option_id, createClassificationId()), text: o.text || o.option_text || "" })) : [
								{ id: createClassificationId(), text: "" },
								{ id: createClassificationId(), text: "" },
							],
							optional_classification_question: isOptionalStep || q.optional_classification_question === true || q.config?.optional_classification_question === true,
							isOpen: q.isOpen ?? (idx === 0),
						}
					})
				}
			}
		} catch { }
		return [{ id: createClassificationId(), title: "", required: true, options: [{ id: createClassificationId(), text: "" }, { id: createClassificationId(), text: "" }], optional_classification_question: isOptionalStep, isOpen: true }]
	})

	const [toggleShuffle, setToggleShuffle] = useState<boolean>(() => {
		try {
			return localStorage.getItem('cs_step4_shuffle') === 'true'
		} catch { return false }
	})

	const [dragIndex, setDragIndex] = useState<number | null>(null)
	const [overIndex, setOverIndex] = useState<number | null>(null)

	// Hydrate marker (kept for compatibility)
	const hasHydratedRef = useRef(true)

	// Persist on change
	useEffect(() => {
		if (typeof window === 'undefined') return
		localStorage.setItem(storageKey, JSON.stringify(questions))
		if (!isOptionalStep) {
			localStorage.setItem('cs_step4_shuffle', String(toggleShuffle))
		}
		onDataChange?.()
	}, [questions, toggleShuffle, onDataChange, storageKey, isOptionalStep])

	const addQuestion = () => {
		setQuestions((prev) => [
			...prev.map(q => ({ ...q, isOpen: false })),
			{
				id: createClassificationId(),
				title: "",
				required: true,
				optional_classification_question: isOptionalStep,
				options: [
					{ id: createClassificationId(), text: "" },
					{ id: createClassificationId(), text: "" },
				],
				isOpen: true,
			},
		])
	}

	const moveQuestion = (fromIdx: number, toIdx: number) => {
		setQuestions(prev => {
			const copy = [...prev]
			const [item] = copy.splice(fromIdx, 1)
			copy.splice(toIdx, 0, item)
			return copy
		})
	}

	const toggleQuestion = (id: string) => {
		setQuestions(prev => prev.map(q =>
			q.id === id ? { ...q, isOpen: !q.isOpen } : q
		))
	}

	const removeQuestion = (qid: string) => {
		setQuestions((prev) => {
			if (prev.length <= 1) return prev
			return prev.filter(q => q.id !== qid)
		})
	}

	const removeOption = (qid: string, oid: string) => {
		setQuestions((prev) => prev.map(q => {
			if (q.id === qid) {
				// Don't allow removing if there are only 2 options left
				if (q.options.length <= 2) return q
				return { ...q, options: q.options.filter(o => o.id !== oid) }
			}
			return q
		}))
	}

	const addOption = (qid: string) => {
		setQuestions((prev) => prev.map(q => q.id === qid ? { ...q, options: [...q.options, { id: createClassificationId(), text: "" }] } : q))
	}

	const updateQuestionTitle = (qid: string, title: string) => {
		setQuestions((prev) => prev.map(q => q.id === qid ? { ...q, title } : q))
	}

	const updateOptionText = (qid: string, oid: string, text: string) => {
		setQuestions((prev) => prev.map(q => q.id === qid ? { ...q, options: q.options.map(o => o.id === oid ? { ...o, text } : o) } : q))
	}

	const toggleRequired = (qid: string) => {
		setQuestions((prev) => prev.map(q => q.id === qid ? { ...q, required: !q.required } : q))
	}

	const normalizeText = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim()

	const duplicateTitles = new Set<string>()
	const seenTitles = new Set<string>()
	questions.forEach(q => {
		const normalized = normalizeText(q.title)
		if (normalized) {
			if (seenTitles.has(normalized)) {
				duplicateTitles.add(normalized)
			}
			seenTitles.add(normalized)
		}
	})

	const hasDuplicates = duplicateTitles.size > 0

	const isQuestionBlank = (q: QuestionCard) =>
		q.title.trim().length === 0 &&
		q.options.every(o => o.text.trim().length === 0)

	const activeQuestions = isOptionalStep ? questions.filter(q => !isQuestionBlank(q)) : questions
	const isSkippingOptionalStep = isOptionalStep && activeQuestions.length === 0

	const canProceed = isSkippingOptionalStep || (activeQuestions.every(q =>
		q.title.trim().length > 0 &&
		q.options.length >= 2 &&
		q.options.every(o => o.text.trim().length > 0)
	) && !hasDuplicates)

	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<div>
					<h3 className="text-lg font-semibold text-gray-800">{title}</h3>
					<p className="text-sm text-gray-600">{description}</p>
					{secondaryDescription && <p className="text-sm text-gray-600 mt-1">{secondaryDescription}</p>}
				</div>
				<div className="flex flex-col gap-2">
					{!isOptionalStep && (
					<div className="flex items-center gap-1 mb-2 px-4 py-2 rounded-full w-fit">
						<input
							type="checkbox"
							id="toggle-shuffle"
							checked={toggleShuffle}
							onChange={(e) => setToggleShuffle(e.target.checked)}
							disabled={isReadOnly}
							className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
						/>
						<label htmlFor="toggle-shuffle" className="text-sm font-bold text-blue-800 cursor-pointer select-none">
							Toggle Shuffle
						</label>
						<span className="relative group inline-flex cursor-pointer">
							<Info
								className="w-4 h-4 text-blue-600 cursor-help"
								aria-label="Shuffle information"
							/>
							<div className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg shadow-lg bg-gray-800 px-3 py-2 text-center text-xs text-white opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100">
								When enabled, classification questions are shown to participants in a random order.
								<div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
							</div>
						</span>
					</div>
					)}
					<Button
						className="bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)]"
						onClick={addQuestion}
						disabled={isReadOnly}
					>
						+ Add Question
					</Button>
				</div>
			</div>

			<div className={`space-y-4 ${isReadOnly ? "opacity-70 pointer-events-none" : ""}`}>
				{questions.map((q, idx) => (
					<div
						key={q.id}
						onDragOver={(e) => {
							e.preventDefault()
							e.dataTransfer.dropEffect = 'move'
							if (dragIndex === null) return
							const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
							const isBefore = e.clientY < rect.top + rect.height / 2
							let targetIndex = isBefore ? idx : idx + 1
							if (targetIndex < 0) targetIndex = 0
							if (targetIndex > questions.length) targetIndex = questions.length
							setOverIndex(targetIndex)
						}}
						onDrop={(e) => {
							e.preventDefault()
							if (dragIndex !== null && overIndex !== null) {
								let to = overIndex
								if (dragIndex < to) to = to - 1
								if (to !== dragIndex) moveQuestion(dragIndex, to)
							}
							setDragIndex(null)
							setOverIndex(null)
						}}
						onDragEnd={() => {
							setDragIndex(null)
							setOverIndex(null)
						}}
					>
						{overIndex === idx && (
							<div className="h-2 rounded bg-[rgba(38,116,186,0.3)] border border-[rgba(38,116,186,0.5)] mb-2" />
						)}
						<div className={`border rounded-xl bg-white overflow-hidden ${dragIndex === idx ? 'opacity-50' : ''}`}>
							{/* Header / Drag Handle */}
							<div
								className={`flex items-center justify-between px-5 py-3 bg-slate-50 ${isReadOnly ? "cursor-default" : "cursor-move"}`}
								draggable={!isReadOnly}
								onDragStart={(e) => {
									if (isReadOnly) return
									setDragIndex(idx)
									setOverIndex(idx)
									e.dataTransfer.effectAllowed = 'move'
									try { e.dataTransfer.setData('text/plain', String(idx)) } catch { }
								}}
								onClick={() => toggleQuestion(q.id)}
							>
								<div className="flex items-center gap-3 min-w-0">
									<div className="text-gray-400">
										<svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg">
											<circle cx="2" cy="2" r="2" fill="currentColor" />
											<circle cx="2" cy="9" r="2" fill="currentColor" />
											<circle cx="2" cy="16" r="2" fill="currentColor" />
											<circle cx="10" cy="2" r="2" fill="currentColor" />
											<circle cx="10" cy="9" r="2" fill="currentColor" />
											<circle cx="10" cy="16" r="2" fill="currentColor" />
										</svg>
									</div>
									<div className="truncate font-medium text-gray-800">
										Question {idx + 1}: {q.title || <span className="text-gray-400 italic">Untitled Question</span>}
										{!q.isOpen && duplicateTitles.has(normalizeText(q.title)) && (
											<span className="text-red-500 text-xs ml-2 font-normal">(Duplicate)</span>
										)}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={(e) => {
											e.stopPropagation()
											if (!isReadOnly) removeQuestion(q.id)
										}}
										onDragStart={(e) => {
											e.preventDefault()
											e.stopPropagation()
										}}
										onMouseDown={(e) => e.stopPropagation()}
										disabled={questions.length === 1 || isReadOnly}
										className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
									>
										Remove
									</Button>
									<div
										className={`transition-transform duration-200 ${q.isOpen ? 'rotate-180' : ''} cursor-pointer p-1 rounded hover:bg-gray-100`}
										onDragStart={(e) => {
											e.preventDefault()
											e.stopPropagation()
										}}
										onMouseDown={(e) => e.stopPropagation()}
										onClick={(e) => {
											e.stopPropagation()
											toggleQuestion(q.id)
										}}
									>
										<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
									</div>
								</div>
							</div>

							{q.isOpen && (
								<div className="p-5 border-t">
									<div className="mb-4">
										<label className="block text-sm font-semibold text-gray-800 mb-2">Question Title <span className="text-red-500">*</span></label>
										<input
											className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${
												duplicateTitles.has(normalizeText(q.title))
													? "border-red-500 focus:ring-red-200"
													: "border-gray-200 focus:ring-[rgba(38,116,186,0.3)]"
											}`}
											placeholder="e.g., Do you like deo?"
											value={q.title}
											onChange={(e) => updateQuestionTitle(q.id, e.target.value)}
											disabled={isReadOnly}
										/>
										{duplicateTitles.has(normalizeText(q.title)) && (
											<p className="text-red-500 text-xs mt-1">This question is a duplicate.</p>
										)}
									</div>

									<div className="mt-6">
										<div className="text-sm font-semibold text-gray-800 mb-2">Answer Options <span className="text-red-500">*</span></div>
										<div className="text-xs text-gray-500 mb-3">Minimum 2 options required</div>
										<div className="space-y-3">
											{q.options.map((o) => (
												<div key={o.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
													<input
														className="flex-1 rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[rgba(38,116,186,0.3)] disabled:bg-gray-50 disabled:text-gray-500"
														placeholder="e.g., Moderately important"
														value={o.text}
														onChange={(e) => updateOptionText(q.id, o.id, e.target.value)}
														disabled={isReadOnly}
													/>
													<Button
														variant="outline"
														onClick={() => !isReadOnly && removeOption(q.id, o.id)}
														disabled={q.options.length <= 2 || isReadOnly}
														className="sm:w-auto w-full disabled:opacity-50 disabled:cursor-not-allowed text-xs h-9"
													>
														Remove
													</Button>
												</div>
											))}
										</div>
										<div className="mt-4">
											<Button
												variant="outline"
												className="rounded-full w-full sm:w-auto text-xs h-9"
												onClick={() => !isReadOnly && addOption(q.id)}
												disabled={isReadOnly}
											>
												+ Add Options
											</Button>
										</div>
									</div>
								</div>
							)}
						</div>
						{idx === questions.length - 1 && overIndex === questions.length && (
							<div className="h-2 rounded bg-[rgba(38,116,186,0.3)] border border-[rgba(38,116,186,0.5)] mt-2" />
						)}
					</div>
				))}
			</div>

			{/* Add Question button at the bottom */}
			<div className="flex justify-center mt-6">
				<Button
					className="bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] rounded-full px-6"
					onClick={addQuestion}
					disabled={isReadOnly}
				>
					+ Add Question
				</Button>
			</div>

			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-10">
				<Button variant="outline" className="rounded-full cursor-pointer px-6 w-full sm:w-auto" onClick={onBack}>Back</Button>
				<Button
					className="rounded-full cursor-pointer px-6 bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)]"
					onClick={() => {
						if (canProceed) {
							if (isReadOnly) {
								onNext()
								return
							}

							const studyIdRaw = localStorage.getItem('cs_study_id')
							if (studyIdRaw) {
								// parse study id if stringified
								let studyId = studyIdRaw
								try {
									const parsed = JSON.parse(studyIdRaw)
									if (typeof parsed === 'string') studyId = parsed
								} catch { }

								const questionsToSave = isOptionalStep ? activeQuestions : questions
								localStorage.setItem(storageKey, JSON.stringify(questionsToSave))
								if (completionKey) {
									localStorage.setItem(completionKey, JSON.stringify({ completed: true, skipped: activeQuestions.length === 0, timestamp: Date.now() }))
								}

								// Build classification_questions payload from both classification steps.
								const classification_questions = buildClassificationQuestionsPayloadFromLocalStorage({
									storageKey,
									questions: questionsToSave,
								})

								// Include study_type and step metadata to help server
								let studyType = 'grid'
								try {
									const s2raw = localStorage.getItem('cs_step2')
									if (s2raw) studyType = JSON.parse(s2raw).type || 'grid'
								} catch { }

								const payload: any = {
									last_step: currentStepNumber,
									study_type: studyType,
									classification_questions: classification_questions.length > 0 ? classification_questions : undefined,
									...(!isOptionalStep ? { toggle_shuffle: toggleShuffle } : {})
								}

								// Fire background PUT update that includes classification_questions
								putUpdateStudyAsync(studyId, payload, currentStepNumber)
							}
							if (isOptionalStep && completionKey) {
								localStorage.setItem(completionKey, JSON.stringify({ completed: true, skipped: activeQuestions.length === 0, timestamp: Date.now() }))
							}
							onNext()
						}
					}}
					disabled={!canProceed}
				>
					{isSkippingOptionalStep ? "Skip & Next" : "Save & Next"}
				</Button>
			</div>
		</div>
	)
}


