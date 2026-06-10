"use client"

import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  completeCreateStudyOnboarding,
  CREATE_STUDY_GUIDE_SHOWN_UP_TO_KEY,
  CREATE_STUDY_ONBOARDING_ACTIVE_KEY,
  clearCreateStudyWalkthroughRestartFlag,
  skipCreateStudyOnboarding,
} from "@/lib/api/onboardingApi"

type StudyType = "grid" | "layer" | "text" | "hybrid"

const GUIDE_SHOWN_UP_TO_KEY = CREATE_STUDY_GUIDE_SHOWN_UP_TO_KEY
const ONBOARDING_ACTIVE_KEY = CREATE_STUDY_ONBOARDING_ACTIVE_KEY
const TOTAL_GUIDE_STEPS = 8

type GuideStepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

type CreateStudyOnboardingProps = {
  currentStep: number
  isSpecialCreator?: boolean
  studyType?: StudyType
  showCreateStudyOnboarding?: boolean
}

type GuideStep = {
  title: string
  description: string
  hint?: string
}

const STEP_GUIDES: Record<GuideStepNumber, GuideStep> = {
  1: {
    title: "Step 1: Basic Details",
    description:
      "Enter your study's basic details like Title, Description, and Language.",
  },
  2: {
    title: "Step 2: Study Type",
    description: "Choose how your study is structured — Grid, Layer, Text, or Hybrid.",
    hint: "Grid and Layer use images. Text uses statements. Hybrid combines both.",
  },
  3: {
    title: "Step 3: Rating Scale",
    description: "Set up how respondents will rate your study elements.",
    hint: "Add labels for the minimum and maximum values on your rating scale.",
  },
  4: {
    title: "Step 4: Classification Questions",
    description: "Add screening questions to classify and segment your participants.",
    hint: "Each question needs at least two answer options.",
  },
  5: {
    title: "Step 5: Study Structure",
    description: "Build your study by uploading and organizing elements for your chosen type.",
    hint: "Add categories, images, text, or layers depending on your study format.",
  },
  6: {
    title: "Step 6: Audience Segmentation",
    description: "Define your target audience — number of respondents, country, gender, and age.",
    hint: "Set how many people will take your study and their demographic breakdown.",
  },
  7: {
    title: "Step 7: Task Generation",
    description:
      "Generate tasks for your respondents based on your study configuration. Task generation can take time depending on the number of respondents.",
    hint: "Review the generated tasks before moving on to launch.",
  },
  8: {
    title: "Step 8: Launch Study",
    description:
      "Your study is set up. Preview it as a participant, review everything, and launch when ready.",
    hint: 'Use "Preview as Participant" to experience your study. If everything looks correct, launch the study.',
  },
}

function getStep5Guide(studyType: StudyType): GuideStep {
  switch (studyType) {
    case "grid":
      return {
        title: "Step 5: Study Structure",
        description: "Add categories and upload image elements into each category.",
        hint: "Create categories and add your study elements as images inside them.",
      }
    case "hybrid":
      return {
        title: "Step 5: Study Structure",
        description: "Add categories with images and categories with text statements.",
        hint: "Set up image categories and statement categories for your hybrid study.",
      }
    case "layer":
      return {
        title: "Step 5: Study Structure",
        description: "Add layers with images and arrange them the way you need.",
        hint: "Create layers, add images to each layer, and position them on your canvas.",
      }
    case "text":
      return {
        title: "Step 5: Study Structure",
        description: "Add categories and text statements within each category.",
        hint: "Group your text statements into categories for participants to review.",
      }
  }
}

function getGuideForStep(step: GuideStepNumber, studyType?: StudyType): GuideStep {
  if (step === 5 && studyType) return getStep5Guide(studyType)
  return STEP_GUIDES[step]
}

function getGuideStepForCurrentStep(
  currentStep: number,
  isSpecialCreator: boolean
): GuideStepNumber | null {
  if (currentStep >= 1 && currentStep <= 5) return currentStep as GuideStepNumber
  if (currentStep === 6 && isSpecialCreator) return 6
  if (currentStep === 7 && !isSpecialCreator) return 6
  if (currentStep === 8) return 7
  if (currentStep === 9) return 8
  return null
}

function getShownUpTo(): number {
  try {
    return Number(sessionStorage.getItem(GUIDE_SHOWN_UP_TO_KEY) || "0")
  } catch {
    return 0
  }
}

function setShownUpTo(step: number) {
  try {
    sessionStorage.setItem(GUIDE_SHOWN_UP_TO_KEY, String(step))
  } catch { }
}

function clearTourQueryParam(router: ReturnType<typeof useRouter>) {
  const currentUrl = new URL(window.location.href)
  if (!currentUrl.searchParams.has("tour")) return
  currentUrl.searchParams.delete("tour")
  router.replace(currentUrl.pathname + currentUrl.search)
}

function StepGuideModal({
  step,
  studyType,
  onOk,
  onSkip,
}: {
  step: GuideStepNumber
  studyType?: StudyType
  onOk: () => void
  onSkip: () => void
}) {
  const guide = getGuideForStep(step, studyType)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.3)]"
      >
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -bottom-20 -left-14 h-44 w-44 rounded-full bg-cyan-100/80 blur-3xl" />

        <div className="relative p-6 sm:p-8">
          <div className="mb-3 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2674BA]">
            Step {step} of {TOTAL_GUIDE_STEPS}
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {guide.title}
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-600">{guide.description}</p>

          {guide.hint && (
            <p className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-[#2674BA]">
              {guide.hint}
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              onClick={onSkip}
              variant="outline"
              className="h-11 cursor-pointer rounded-xl border-slate-200 px-6 text-slate-600 hover:bg-slate-50"
            >
              Skip
            </Button>
            <Button
              onClick={onOk}
              className="h-11 cursor-pointer rounded-xl bg-[#2674BA] px-6 text-white shadow-lg shadow-blue-500/20 hover:bg-[#1f66a5]"
            >
              Ok
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function CreateStudyOnboarding({
  currentStep,
  isSpecialCreator = false,
  studyType = "grid",
  showCreateStudyOnboarding = true,
}: CreateStudyOnboardingProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeGuideStep, setActiveGuideStep] = useState<GuideStepNumber | null>(null)
  const [guidesEnabled, setGuidesEnabled] = useState(showCreateStudyOnboarding)

  useEffect(() => {
    setGuidesEnabled(showCreateStudyOnboarding)
  }, [showCreateStudyOnboarding])

  // Re-enable guides when arriving via ?tour=step1 after a walkthrough restart
  useEffect(() => {
    if (searchParams.get("tour") !== "step1") return
    if (!showCreateStudyOnboarding) return
    setGuidesEnabled(true)
  }, [searchParams, showCreateStudyOnboarding])

  const closeGuide = useCallback(() => {
    setActiveGuideStep(null)
  }, [])

  const finishOnboarding = useCallback(async (skipped: boolean) => {
    try {
      if (skipped) {
        await skipCreateStudyOnboarding()
      } else {
        await completeCreateStudyOnboarding()
      }
    } catch (error) {
      console.error("Failed to save create-study onboarding status:", error)
    }

    clearTourQueryParam(router)
    setGuidesEnabled(false)
    clearCreateStudyWalkthroughRestartFlag()

    try {
      sessionStorage.removeItem(GUIDE_SHOWN_UP_TO_KEY)
      sessionStorage.removeItem(ONBOARDING_ACTIVE_KEY)
    } catch { }
    closeGuide()
  }, [closeGuide, router])

  const dismissGuide = useCallback(
    (step: GuideStepNumber) => {
      setShownUpTo(step)

      if (step === 1) {
        clearTourQueryParam(router)
      }

      if (step === TOTAL_GUIDE_STEPS) {
        void finishOnboarding(false)
        return
      }

      closeGuide()
    },
    [closeGuide, finishOnboarding, router]
  )

  const handleOk = useCallback(() => {
    if (!activeGuideStep) return
    dismissGuide(activeGuideStep)
  }, [activeGuideStep, dismissGuide])

  const handleSkip = useCallback(() => {
    if (!activeGuideStep) return
    void finishOnboarding(true)
  }, [activeGuideStep, finishOnboarding])

  // Step 1: triggered from ?tour=step1 after dashboard onboarding
  useEffect(() => {
    if (!guidesEnabled) return
    if (searchParams.get("tour") !== "step1") return

    try {
      sessionStorage.setItem(ONBOARDING_ACTIVE_KEY, "true")
      sessionStorage.setItem(GUIDE_SHOWN_UP_TO_KEY, "0")
    } catch { }

    const timer = window.setTimeout(() => setActiveGuideStep(1), 400)
    return () => window.clearTimeout(timer)
  }, [searchParams, guidesEnabled])

  // Steps 2–8: auto-start when user navigates to the matching create-study step
  useEffect(() => {
    if (!guidesEnabled) return
    if (activeGuideStep !== null) return

    const guideStep = getGuideStepForCurrentStep(currentStep, isSpecialCreator)
    if (!guideStep || guideStep === 1) return

    try {
      const isActive = sessionStorage.getItem(ONBOARDING_ACTIVE_KEY) === "true"
      if (!isActive) return
    } catch {
      return
    }

    const shownUpTo = getShownUpTo()
    if (guideStep <= shownUpTo) return

    const timer = window.setTimeout(() => setActiveGuideStep(guideStep), 400)
    return () => window.clearTimeout(timer)
  }, [currentStep, activeGuideStep, isSpecialCreator, guidesEnabled])

  return (
    <AnimatePresence>
      {activeGuideStep && (
        <StepGuideModal
          key={`${activeGuideStep}-${studyType}`}
          step={activeGuideStep}
          studyType={studyType}
          onOk={handleOk}
          onSkip={handleSkip}
        />
      )}
    </AnimatePresence>
  )
}
