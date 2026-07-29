"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { EventData, Joyride, STATUS, Step, TooltipRenderProps, EVENTS, ACTIONS } from "react-joyride"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ArrowRight, CheckCircle2, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth/AuthContext"
import { prepareFreshCreateStudy } from "@/lib/utils/createStudyStorage"
import { BrandLogo } from "@/components/brand/BrandLogo"
import {
  completeDashboardOnboarding,
  clearLegacyOnboardingPendingFlags,
  persistDashboardOnboardingDismissed,
  prepareWalkthroughRestart,
  skipDashboardOnboarding,
} from "@/lib/api/onboardingApi"

const ONBOARDING_EVENT = "mindsurve:start-onboarding"
const RESTART_WALKTHROUGH_KEY = "mindsurve_restart_walkthrough"

type MindSurveOnboardingProps = {
  showDashboardOnboarding?: boolean
  onDashboardOnboardingChange?: (show: boolean) => void
  onTourActiveChange?: (isActive: boolean) => void
  onTourStepChange?: (stepIndex: number | null) => void
}

function TourTooltip({
  index,
  size,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
}: TooltipRenderProps) {
  const isLastStep = index + 1 === size

  return (
    <div
      {...tooltipProps}
      className="w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
    >
      <div className="bg-gradient-to-br from-[#2674BA] via-[#2f83cb] to-[#75b7ee] px-5 py-4 text-white">
        <div className="mb-2 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
          Step {index + 1} of {size}
        </div>
        <h3 className="text-lg font-semibold leading-tight">{step.title}</h3>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div className="text-sm leading-6 text-slate-600">{step.content}</div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            {...skipProps}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                {...backProps}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <button
              {...primaryProps}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#2674BA] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-[#1f66a5]"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MindSurveOnboarding({
  showDashboardOnboarding = false,
  onDashboardOnboardingChange,
  onTourActiveChange,
  onTourStepChange,
}: MindSurveOnboardingProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [showWelcome, setShowWelcome] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [runTour, setRunTour] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const steps = useMemo<Step[]>(
    () => [
      {
        target: '[data-tour="create-study-header"]',
        title: "Create Your First Study",
        content: (
          <div className="space-y-3">
            <p>
              Start by creating a study. This is where you will build surveys, collect responses, and
              generate insights from participants.
            </p>
            <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-[#2674BA]">
              Click here in the navbar to create a study.
            </p>
          </div>
        ),
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: '[data-tour="create-project"]',
        title: "Organize Everything with Projects",
        content: (
          <div className="space-y-3">
            <p>
              Projects help you organize multiple studies, surveys, and research initiatives in one
              place.
            </p>
            <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-[#2674BA]">
              {isMobile
                ? "Click here to create or manage projects."
                : "Click the plus icon in the sidebar to create a project."}
            </p>
          </div>
        ),
        placement: isMobile ? "bottom" : "right",
        skipBeacon: true,
      },
    ],
    [isMobile]
  )

  const stripOnboardingWelcomeParam = useCallback(() => {
    if (typeof window === "undefined") return
    const currentUrl = new URL(window.location.href)
    if (!currentUrl.searchParams.has("onboarding")) return
    currentUrl.searchParams.delete("onboarding")
    router.replace(currentUrl.pathname + currentUrl.search)
  }, [router])

  const markDashboardComplete = useCallback(async () => {
    try {
      await completeDashboardOnboarding()
    } catch (error) {
      console.error("Failed to save dashboard onboarding completion:", error)
      persistDashboardOnboardingDismissed(false)
    } finally {
      clearLegacyOnboardingPendingFlags()
      stripOnboardingWelcomeParam()
      onDashboardOnboardingChange?.(false)
    }
  }, [onDashboardOnboardingChange, stripOnboardingWelcomeParam])

  const markDashboardSkipped = useCallback(async () => {
    try {
      await skipDashboardOnboarding()
    } catch (error) {
      console.error("Failed to save dashboard onboarding skip:", error)
      persistDashboardOnboardingDismissed(true)
    } finally {
      clearLegacyOnboardingPendingFlags()
      stripOnboardingWelcomeParam()
      onDashboardOnboardingChange?.(false)
    }
  }, [onDashboardOnboardingChange, stripOnboardingWelcomeParam])

  const openWelcome = useCallback(() => {
    setRunTour(false)
    setShowSuccess(false)
    setShowWelcome(true)
  }, [])

  useEffect(() => {
    if (!user || !showDashboardOnboarding) return

    const timer = window.setTimeout(() => setShowWelcome(true), 500)
    return () => window.clearTimeout(timer)
  }, [showDashboardOnboarding, user])

  useEffect(() => {
    const restartTour = () => openWelcome()
    window.addEventListener(ONBOARDING_EVENT, restartTour)
    return () => window.removeEventListener(ONBOARDING_EVENT, restartTour)
  }, [openWelcome])

  useEffect(() => {
    try {
      if (sessionStorage.getItem(RESTART_WALKTHROUGH_KEY) !== "true") return
      sessionStorage.removeItem(RESTART_WALKTHROUGH_KEY)
      openWelcome()
    } catch { }
  }, [openWelcome])

  useEffect(() => {
    onTourActiveChange?.(runTour)
  }, [onTourActiveChange, runTour])

  const startTour = () => {
    setShowWelcome(false)
    setShowSuccess(false)
    setStepIndex(0)
    onTourStepChange?.(0)
    setRunTour(true)
  }

  const skipTour = () => {
    void markDashboardSkipped()
    setShowWelcome(false)
    setRunTour(false)
    setStepIndex(0)
    onTourStepChange?.(null)
  }

  const handleJoyrideEvent = (data: EventData) => {
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED]
    const { action, index, status, type } = data

    if (type === EVENTS.STEP_BEFORE) {
      onTourStepChange?.(index)
    }

    if (finishedStatuses.includes(status)) {
      setRunTour(false)
      setStepIndex(0)
      onTourStepChange?.(null)

      if (status === STATUS.SKIPPED) {
        void markDashboardSkipped()
      } else {
        void markDashboardComplete()
        setShowSuccess(true)
      }
      return
    }

    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        if (index === 0 && isMobile) {
          onTourStepChange?.(1)
          setRunTour(false)
          window.setTimeout(() => {
            setStepIndex(1)
            setRunTour(true)
          }, 350)
          return
        }
        setStepIndex(index + 1)
      } else if (action === ACTIONS.PREV) {
        if (index === 1 && isMobile) {
          onTourStepChange?.(0)
        }
        setStepIndex(index - 1)
      }
    }
  }

  const createFirstStudy = () => {
    setShowSuccess(false)
    prepareFreshCreateStudy()

    const projId = searchParams.get("proj_id")
    const url = projId
      ? `/home/create-study?proj_id=${projId}&tour=step1`
      : "/home/create-study?tour=step1"
    router.push(url)
  }

  const EmptyLoader = () => null

  return (
    <>
      <Joyride
        onEvent={handleJoyrideEvent}
        continuous
        locale={{ back: "Back", close: "Close", last: "Next", next: "Next", skip: "Skip" }}
        loaderComponent={EmptyLoader}
        options={{
          arrowColor: "#ffffff",
          backgroundColor: "#ffffff",
          blockTargetInteraction: true,
          buttons: ["back", "skip", "primary"],
          dismissKeyAction: "next",
          overlayClickAction: false,
          overlayColor: "rgba(15, 23, 42, 0.66)",
          primaryColor: "#2674BA",
          scrollDuration: 450,
          scrollOffset: 96,
          showProgress: true,
          skipScroll: false,
          spotlightPadding: 10,
          spotlightRadius: 16,
          textColor: "#334155",
          zIndex: 130,
        }}
        run={runTour}
        scrollToFirstStep
        stepIndex={stepIndex}
        steps={steps}
        tooltipComponent={TourTooltip}
        styles={{
          spotlight: {
            filter: "drop-shadow(0 0 0 rgba(38,116,186,0.26))",
          },
        }}
      />

      <AnimatePresence>
        {showWelcome && (
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
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.3)]"
            >
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-200/50 blur-3xl" />
              <div className="absolute -bottom-20 -left-14 h-44 w-44 rounded-full bg-cyan-100/80 blur-3xl" />

              <div className="relative p-6 sm:p-8">
                <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Welcome to <BrandLogo className="inline text-2xl sm:text-3xl" /> 👋
                </h2>
                <p className="mt-4 text-center text-sm leading-6 text-slate-600">
                  Let&apos;s take a quick tour so you know where to create studies and organize them
                  into projects.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Button
                    onClick={startTour}
                    className="h-11 cursor-pointer rounded-xl bg-[#2674BA] px-6 text-white shadow-lg shadow-blue-500/20 hover:bg-[#1f66a5]"
                  >
                    Start Tour
                  </Button>
                  <Button
                    onClick={skipTour}
                    variant="outline"
                    className="h-11 cursor-pointer rounded-xl border-slate-200 px-6 text-slate-600 hover:bg-slate-50"
                  >
                    Skip Tour
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
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

              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Basics Completed! 🎉</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Okay, so you have completed the two basics. Now let&apos;s go and create a new study.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Button
                  onClick={createFirstStudy}
                  className="h-11 cursor-pointer rounded-xl bg-[#2674BA] px-6 text-white shadow-lg shadow-blue-500/20 hover:bg-[#1f66a5]"
                >
                  Create a New Study
                </Button>
                <Button
                  onClick={() => setShowSuccess(false)}
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
    </>
  )
}

export function startMindSurveOnboarding() {
  window.dispatchEvent(new CustomEvent(ONBOARDING_EVENT))
}

export async function requestRestartWalkthrough(
  homeHref: string,
  router: { push: (href: string) => void }
) {
  try {
    await prepareWalkthroughRestart()
  } catch (error) {
    console.error("Failed to reset onboarding for walkthrough restart:", error)
  }

  try {
    sessionStorage.setItem(RESTART_WALKTHROUGH_KEY, "true")
  } catch { }

  const onHome =
    typeof window !== "undefined" &&
    (window.location.pathname === "/home" || window.location.pathname === "/home/")

  if (onHome) {
    try {
      sessionStorage.removeItem(RESTART_WALKTHROUGH_KEY)
    } catch { }
    startMindSurveOnboarding()
    return
  }

  router.push(homeHref)
}
