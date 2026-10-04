"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { updateStudyAsync } from "@/lib/api/StudyAPI"
import {
  ensureGeneratedTasksTypeStamp,
  getGeneratedTasksStudyType,
  hasGeneratedTasks,
  isTaskGenerationInProgress,
  type CreateStudyType,
} from "@/lib/utils/createStudyStorage"

interface Step2StudyTypeProps {
  onNext: (selected: StudyType, mainQuestion: string, orientationText: string) => void
  onBack: () => void
  value?: StudyType
  onDataChange?: () => void
  isReadOnly?: boolean
}

type StudyType = CreateStudyType

// Visual preview for Text Study
export function TextStudy() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl p-2 sm:p-3 shadow-lg flex flex-col">
      {/* Title */}
      <div className="text-center mb-1.5 sm:mb-3">
        <h2 className="text-blue-700 font-semibold text-[11px] sm:text-xs lg:text-sm leading-tight">
          Text Study - Categorized
          <br />
          Statements
        </h2>
      </div>

      {/* List representation */}
      <div className="flex-1 flex flex-col justify-center gap-2 sm:gap-3 px-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
          <div className="h-1.5 flex-1 bg-blue-400/40 rounded-full"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
          <div className="h-1.5 w-4/5 bg-blue-400/40 rounded-full"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
          <div className="h-1.5 flex-1 bg-blue-400/40 rounded-full"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
          <div className="h-1.5 w-3/5 bg-blue-400/40 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}

// Visual preview for Layer Study (as provided)
export function LayerStudy() {
  return (
    <div className="w-full h-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl p-2 sm:p-3 flex flex-col">
      <div className="text-center shrink-0">
        <h2 className="text-blue-700 font-semibold text-[11px] sm:text-xs lg:text-sm leading-tight">
          Layer Study -
          <br />
          Categorized Elements
        </h2>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="relative w-11 h-14 sm:w-14 sm:h-[76px] lg:w-16 lg:h-20">
          {/* Large square background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-11 h-11 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-2 border-blue-600 rounded-lg bg-blue-200/50"></div>
          {/* Horizontal rounded rectangle */}
          <div className="absolute top-7 sm:top-9 lg:top-10 left-1/2 -translate-x-1/2 w-9 h-2.5 sm:w-12 sm:h-3.5 lg:w-14 lg:h-4 bg-blue-400 rounded-full border-2 border-blue-600"></div>
          {/* Vertical rectangle */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-8 sm:w-6 sm:h-10 lg:w-7 lg:h-12 bg-blue-500 rounded-lg border-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  )
}

// Visual preview for Grid Study (as provided)
export function GridStudy() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl p-2 sm:p-3 shadow-lg flex flex-col">
      {/* Title */}
      <div className="text-center mb-1.5 sm:mb-3">
        <h2 className="text-blue-700 font-semibold text-[11px] sm:text-xs lg:text-sm leading-tight">
          Grid Study - Image/Text
          <br />
          Elements
        </h2>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-1 sm:gap-2 lg:gap-3 flex-1 mb-2 sm:mb-4">
        <div className="bg-blue-400/60 rounded-lg sm:rounded-xl border-2 border-blue-500/30"></div>
        <div className="bg-blue-400/60 rounded-lg sm:rounded-xl border-2 border-blue-500/30"></div>
        <div className="bg-blue-400/60 rounded-lg sm:rounded-xl border-2 border-blue-500/30"></div>
        <div className="bg-blue-400/60 rounded-lg sm:rounded-xl border-2 border-blue-500/30"></div>
      </div>

      <div className="flex justify-center space-x-1 sm:space-x-2 flex-shrink-0">
        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400/70 rounded-full"></div>
        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400/70 rounded-full"></div>
        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400/70 rounded-full"></div>
        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400/70 rounded-full"></div>
        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400/70 rounded-full"></div>
        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400/70 rounded-full"></div>
      </div>
    </div>
  )
}
// Visual preview for Hybrid Study
export function VideoStudy() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 p-2 sm:p-3">
      <div className="shrink-0 text-center">
        <h2 className="text-blue-700 font-semibold text-[11px] sm:text-xs lg:text-sm leading-tight">
          Video Study
          <br />
          Combined clips
        </h2>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center pt-1">
        <div className="relative h-[82%] max-h-full aspect-[9/16] rounded-xl border-2 border-blue-600 bg-blue-500/85">
          <div className="absolute inset-x-1.5 top-1.5 h-0.5 rounded-full bg-white/80" />
          <div className="absolute left-1/2 top-[42%] h-0 w-0 -translate-x-1/2 border-y-[6px] border-y-transparent border-l-[10px] border-l-white sm:border-y-[7px] sm:border-l-[12px]" />
          <div className="absolute bottom-5 right-1 flex flex-col gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-white/90" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/70" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/70" />
          </div>
          <div className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-white/30">
            <div className="h-full w-2/3 rounded-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function HybridStudy() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl p-2 sm:p-3 lg:p-4 shadow-lg flex flex-col">
      {/* Title */}
      <div className="text-center mb-1.5 sm:mb-2">
        <h2 className="text-blue-700 font-semibold text-[11px] sm:text-xs lg:text-sm leading-tight">Hybrid Study</h2>
        <p className="text-[9px] sm:text-[10px] text-blue-700/80 font-medium mt-0.5">Grid + Text elements</p>
      </div>

      <div className="flex-1 flex flex-col gap-1 sm:gap-2 lg:gap-3">
        {/* Grid preview (top) */}
        <div className="flex-1 bg-white/60 rounded-lg sm:rounded-xl lg:rounded-2xl border border-blue-200/70 p-1 sm:p-2">
          <div className="grid grid-cols-2 gap-1 sm:gap-2 h-full">
            <div className="bg-blue-400/55 rounded-lg sm:rounded-xl border border-blue-500/20" />
            <div className="bg-blue-400/55 rounded-lg sm:rounded-xl border border-blue-500/20" />
            <div className="bg-blue-400/55 rounded-lg sm:rounded-xl border border-blue-500/20" />
            <div className="bg-blue-400/55 rounded-lg sm:rounded-xl border border-blue-500/20" />
          </div>
        </div>

        {/* Text preview (bottom) */}
        <div className="h-12 sm:h-14 lg:h-16 bg-white/60 rounded-lg sm:rounded-xl lg:rounded-2xl border border-blue-200/70 px-2 sm:px-3 py-1 sm:py-2 flex flex-col justify-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <div className="h-1 sm:h-2 flex-1 bg-blue-400/25 rounded" />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <div className="h-1 sm:h-2 w-4/5 bg-blue-400/25 rounded" />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <div className="h-1 sm:h-2 w-3/5 bg-blue-400/25 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function Step2StudyType({ onNext, onBack, value, onDataChange, isReadOnly = false }: Step2StudyTypeProps) {
  const [type, setType] = useState<StudyType | null>(() => {
    try { const v = localStorage.getItem('cs_step2'); if (v) { const o = JSON.parse(v); return (o.type === 'layer' || o.type === 'grid' || o.type === 'text' || o.type === 'hybrid' || o.type === 'video') ? o.type : (value ?? 'grid') } } catch { }
    return value ?? 'grid'
  })
  const [mainQuestion, setMainQuestion] = useState(() => {
    try { const v = localStorage.getItem('cs_step2'); if (v) { const o = JSON.parse(v); return o.mainQuestion || "" } } catch { }
    return ""
  })
  const [orientationText, setOrientationText] = useState(() => {
    try { const v = localStorage.getItem('cs_step2'); if (v) { const o = JSON.parse(v); return o.orientationText || "Welcome to the study!" } } catch { }
    return "Welcome to the study!"
  })
  const [pendingType, setPendingType] = useState<StudyType | null>(null)
  const [blockTypeChangeReason, setBlockTypeChangeReason] = useState<string | null>(null)

  useEffect(() => { }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('cs_step2', JSON.stringify({ type, mainQuestion, orientationText }))
    onDataChange?.()
  }, [type, mainQuestion, orientationText, onDataChange])

  // Leaving layer studies: drop local BG so it cannot leak into grid/text/hybrid.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (type === 'layer' || type == null) return
    try {
      localStorage.removeItem('cs_step5_layer_background')
    } catch { /* ignore */ }
  }, [type])

  const requestTypeChange = (next: StudyType) => {
    if (isReadOnly || !next || next === type) return

    if (isTaskGenerationInProgress()) {
      setBlockTypeChangeReason(
        "Tasks are currently being generated. Please wait for generation to finish before changing the study type."
      )
      return
    }

    if (hasGeneratedTasks()) {
      // Stamp only when missing (legacy drafts). Do this from the current type before leaving it.
      if (type) ensureGeneratedTasksTypeStamp(type)

      // Switching back to the type tasks were generated for — no regen warning needed.
      const generatedFor = getGeneratedTasksStudyType()
      if (generatedFor && generatedFor === next) {
        setType(next)
        return
      }

      setPendingType(next)
      return
    }

    setType(next)
  }

  const confirmTypeChange = () => {
    if (!pendingType) return
    setType(pendingType)
    setPendingType(null)
  }

  return (
    <div>
      <div className={`space-y-6 ${isReadOnly ? "opacity-70 pointer-events-none" : ""}`}>
        <div
          data-tour="step2-study-types"
          className="rounded-2xl p-1 sm:p-2"
        >
          <label className="block text-sm font-semibold text-gray-800 mb-2">Study Type <span className="text-red-500">*</span></label>
          <p className="text-xs text-gray-500 mb-4">Choose whether your study will use images, text, or video</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5 xl:gap-3 items-stretch">
            <button
              type="button"
              onClick={() => requestTypeChange("grid")}
              disabled={isReadOnly}
              className={`overflow-hidden border-2 cursor-pointer rounded-3xl aspect-[4/5] sm:aspect-square w-full min-w-0 flex items-center justify-center text-left transition-all ${type === "grid" ? "border-[rgba(38,116,186,1)] ring-2 ring-[rgba(38,116,186,0.2)] bg-[rgba(38,116,186,0.05)] opacity-100" : "border-gray-200 bg-white opacity-50 hover:opacity-100"}`}
            >
              <div className="w-full h-full p-1.5 sm:p-2 lg:p-3">
                <GridStudy />
              </div>
            </button>

            <button
              type="button"
              onClick={() => requestTypeChange("layer")}
              disabled={isReadOnly}
              className={`overflow-hidden border-2 cursor-pointer rounded-3xl aspect-[4/5] sm:aspect-square w-full min-w-0 flex items-center justify-center text-left transition-all ${type === "layer" ? "border-[rgba(38,116,186,1)] ring-2 ring-[rgba(38,116,186,0.2)] bg-[rgba(38,116,186,0.05)] opacity-100" : "border-gray-200 bg-white opacity-50 hover:opacity-100"}`}
            >
              <div className="w-full h-full p-1.5 sm:p-2 lg:p-3">
                <LayerStudy />
              </div>
            </button>

            <button
              type="button"
              onClick={() => requestTypeChange("text")}
              disabled={isReadOnly}
              className={`overflow-hidden border-2 cursor-pointer rounded-3xl aspect-[4/5] sm:aspect-square w-full min-w-0 flex items-center justify-center text-left transition-all ${type === "text" ? "border-[rgba(38,116,186,1)] ring-2 ring-[rgba(38,116,186,0.2)] bg-[rgba(38,116,186,0.05)] opacity-100" : "border-gray-200 bg-white opacity-50 hover:opacity-100"}`}
            >
              <div className="w-full h-full p-1.5 sm:p-2 lg:p-3">
                <TextStudy />
              </div>
            </button>

            <button
              type="button"
              onClick={() => requestTypeChange("hybrid")}
              disabled={isReadOnly}
              className={`overflow-hidden border-2 cursor-pointer rounded-3xl aspect-[4/5] sm:aspect-square w-full min-w-0 flex items-center justify-center text-left transition-all ${type === "hybrid" ? "border-[rgba(38,116,186,1)] ring-2 ring-[rgba(38,116,186,0.2)] bg-[rgba(38,116,186,0.05)] opacity-100" : "border-gray-200 bg-white opacity-50 hover:opacity-100"}`}
            >
              <div className="w-full h-full p-1.5 sm:p-2 lg:p-3">
                <HybridStudy />
              </div>
            </button>

            <button
              type="button"
              onClick={() => requestTypeChange("video")}
              disabled={isReadOnly}
              className={`overflow-hidden border-2 cursor-pointer rounded-3xl aspect-[4/5] sm:aspect-square w-full min-w-0 flex items-center justify-center text-left transition-all ${type === "video" ? "border-[rgba(38,116,186,1)] ring-2 ring-[rgba(38,116,186,0.2)] bg-[rgba(38,116,186,0.05)] opacity-100" : "border-gray-200 bg-white opacity-50 hover:opacity-100"}`}
            >
              <div className="w-full h-full p-1.5 sm:p-2 lg:p-3">
                <VideoStudy />
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Main Research Question <span className="text-red-500">*</span></label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[rgba(38,116,186,0.3)] disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="What is the main question respondents will answer?"
            value={mainQuestion}
            onChange={(e) => setMainQuestion(e.target.value)}
            disabled={isReadOnly}
          />
          <p className="mt-2 text-xs text-gray-500">This question will be displayed to respondents during each task</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Orientation Text for Respondents <span className="text-red-500">*</span></label>
          <textarea
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[rgba(38,116,186,0.3)] resize-none min-h-[120px] max-h-[300px] overflow-y-auto disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Enter the welcome message for respondents"
            value={orientationText}
            onChange={(e) => setOrientationText(e.target.value)}
            rows={4}
            disabled={isReadOnly}
            style={{
              height: 'auto',
              minHeight: '120px',
              maxHeight: '300px',
              overflowY: orientationText.length > 200 ? 'auto' : 'hidden'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 300) + 'px';
            }}
          />
          <p className="mt-2 text-xs text-gray-500">This text will be displayed to respondents at the start of the study</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-10">
        <Button variant="outline" className="rounded-full px-6 w-full sm:w-auto cursor-pointer bg-transparent" onClick={onBack}>Back</Button>
        <Button
          className="rounded-full px-6 bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] w-full sm:w-auto cursor-pointer"
          onClick={() => {
            if (type && mainQuestion && orientationText) {
              // If read-only, skip API call
              if (isReadOnly) {
                onNext(type as any, mainQuestion, orientationText)
                return
              }

              const studyId = localStorage.getItem('cs_study_id')
              if (studyId) {
                // Fire API in background and redirect immediately
                updateStudyAsync(studyId, {
                  last_step: 2,
                  type: type!,
                  main_question: mainQuestion,
                  orientation_text: orientationText,
                  // Clear DB background when leaving layer (or any non-layer save from Step 2)
                  ...(type !== 'layer' ? { background_image_url: null } : {}),
                })
              }
              onNext(type as any, mainQuestion, orientationText)
            }
          }}
          disabled={!type || !mainQuestion || !orientationText}
        >
          Save & Next
        </Button>
      </div>

      {pendingType && (
        <>
          <div
            className="fixed inset-0 z-[110] bg-black/40"
            onClick={() => setPendingType(null)}
          />
          <div className="fixed inset-0 z-[111] flex items-center justify-center pointer-events-none p-4">
            <div
              className="pointer-events-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              role="alertdialog"
              aria-labelledby="change-study-type-title"
              aria-describedby="change-study-type-desc"
            >
              <h4 id="change-study-type-title" className="text-lg font-semibold text-gray-900">
                Change study type?
              </h4>
              <p id="change-study-type-desc" className="mt-2 text-sm text-gray-600">
                Tasks have already been generated for this study. Changing the study type will require
                regenerating tasks after you update the study structure. Your previous task preview will
                be kept until you open Task Generation and regenerate. If you switch back to the previous
                type before regenerating, those tasks will become valid again.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => setPendingType(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] cursor-pointer"
                  onClick={confirmTypeChange}
                >
                  Change type
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {blockTypeChangeReason && (
        <>
          <div
            className="fixed inset-0 z-[110] bg-black/40"
            onClick={() => setBlockTypeChangeReason(null)}
          />
          <div className="fixed inset-0 z-[111] flex items-center justify-center pointer-events-none p-4">
            <div
              className="pointer-events-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              role="alertdialog"
              aria-labelledby="block-type-change-title"
              aria-describedby="block-type-change-desc"
            >
              <h4 id="block-type-change-title" className="text-lg font-semibold text-gray-900">
                Cannot change study type
              </h4>
              <p id="block-type-change-desc" className="mt-2 text-sm text-gray-600">
                {blockTypeChangeReason}
              </p>
              <div className="mt-6 flex justify-end">
                <Button
                  className="bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] cursor-pointer"
                  onClick={() => setBlockTypeChangeReason(null)}
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
