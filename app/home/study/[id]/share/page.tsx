"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/app/home/components/dashboard-header"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { getPublicShareDetails, type StudyShareDetails } from "@/lib/api/StudyAPI"
import {
  createStudyCheckout,
  waitForStudyLiveAccess,
} from "@/lib/api/BillingAPI"
import { ApiError } from "@/lib/api/LoginApi"
import {
  canAccessLiveParticipantSharing,
  getShareUnlockFee,
} from "@/lib/config/planLimits"
import { Copy, Download, ArrowLeft, Lock } from "lucide-react"

const BRAND = "#2674BA"

export default function StudySharePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const studyId = params.id as string
  const projId = searchParams.get('proj_id') || searchParams.get('projectId')
  const projectQuery = projId ? `?proj_id=${encodeURIComponent(projId)}` : ''
  const homeHref = `/home${projectQuery}`
  const shareUnlockFee = getShareUnlockFee()

  const [shareDetails, setShareDetails] = useState<StudyShareDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<"link" | "embed" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  const paymentStatus = searchParams.get("payment")

  const buildShareReturnUrl = (payment: "success" | "cancelled") => {
    const params = new URLSearchParams()
    if (projId) params.set("proj_id", projId)
    params.set("payment", payment)
    const query = params.toString()
    return `${window.location.origin}/home/study/${studyId}/share${query ? `?${query}` : ""}`
  }

  const loadShareDetails = async () => {
    const details = await getPublicShareDetails(studyId)
    setShareDetails(details)
    return details
  }

  useEffect(() => {
    if (!studyId) return

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        setSuccessMessage(null)

        if (paymentStatus === "success") {
          setIsConfirmingPayment(true)
          await waitForStudyLiveAccess(studyId)
          setSuccessMessage("Payment confirmed. Your study is now live for participants.")
        }

        await loadShareDetails()
      } catch (e: unknown) {
        console.error("Error loading share page:", e)
        if (paymentStatus === "success") {
          setError(
            "Payment received. Unlock confirmation is still processing — refresh in a moment if sharing is not available yet."
          )
          try {
            await loadShareDetails()
          } catch {
            // keep primary error
          }
        } else {
          setError((e as Error)?.message || "Failed to load study")
        }
      } finally {
        setLoading(false)
        setIsConfirmingPayment(false)
      }
    }

    loadData()
  }, [studyId, paymentStatus])

  const canShareLive = useMemo(
    () =>
      canAccessLiveParticipantSharing(
        shareDetails?.user_plan,
        shareDetails?.live_participants_paid
      ),
    [shareDetails?.user_plan, shareDetails?.live_participants_paid]
  )

  const shareUrl = useMemo(() => {
    if (!studyId || !canShareLive) return ""
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/participate/${studyId}`
    }
    return ""
  }, [studyId, canShareLive])

  const embedCode = useMemo(() => {
    const url = shareUrl || ""
    return `<iframe src="${url}" width="100%" height="600" frameborder="0"></iframe>`
  }, [shareUrl])

  const qrSrc = useMemo(() => {
    const url = shareUrl || ""
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`
  }, [shareUrl])

  const handleCopy = async (text: string, which: "link" | "embed") => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(null), 1500)
    } catch { }
  }

  const handlePayToUnlock = async () => {
    if (typeof window === "undefined") return

    setIsPaying(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const checkout = await createStudyCheckout({
        study_id: studyId,
        success_url: buildShareReturnUrl("success"),
        cancel_url: buildShareReturnUrl("cancelled"),
      })

      if (!checkout.checkout_url) {
        throw new Error("Stripe checkout URL was not returned by the server.")
      }

      window.location.href = checkout.checkout_url
    } catch (e: unknown) {
      console.error("Study unlock checkout failed:", e)
      const message =
        e instanceof ApiError
          ? e.message
          : (e as Error)?.message || "Failed to start payment. Please try again."
      setError(message)
      setIsPaying(false)
    }
  }

  const studyTypeLabel =
    shareDetails?.study_type === "layer"
      ? "Layer - Based Study"
      : shareDetails?.study_type === "text"
        ? "Text - Based Study"
        : shareDetails?.study_type === "hybrid"
          ? "Hybrid - Based Study"
          : "Grid - Based Study"

  if (loading) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-gray-50">
          <DashboardHeader />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: BRAND }}></div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-gray-50">
          <DashboardHeader />
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-5 sm:px-8 py-5 border-b flex items-center justify-between" style={{ borderColor: "#E5EEF6" }}>
              <h1 className="text-xl font-semibold" style={{ color: BRAND }}>
                Share Study{shareDetails?.title ? `: ${shareDetails.title}` : ''}
              </h1>
              <button
                onClick={() => window.history.length > 1 ? window.history.back() : router.push(homeHref)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: BRAND, color: BRAND }}
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>

            <div className="px-5 sm:px-8 py-6 space-y-6">
              {successMessage && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {successMessage}
                </div>
              )}

              {paymentStatus === "cancelled" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Payment was cancelled. You can try again when you are ready.
                </div>
              )}

              {isConfirmingPayment && (
                <div className="rounded-xl border border-[#E5EEF6] bg-[#F6FAFF] px-4 py-3 text-sm text-gray-700">
                  Confirming your payment…
                </div>
              )}

              {!canShareLive ? (
                <section className="rounded-2xl border border-[#E5EEF6] bg-gradient-to-br from-[#F6FAFF] to-white p-6 sm:p-10">
                  <div className="mx-auto max-w-xl text-center">
                    <div
                      className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: "rgba(38,116,186,0.12)" }}
                    >
                      <Lock className="h-8 w-8" style={{ color: BRAND }} strokeWidth={2} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
                      Unlock live participants
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
                      Your study is created, but the participant link is locked on the Free plan.
                      Pay a one-time fee of{" "}
                      <span className="font-semibold text-gray-800">${shareUnlockFee}</span> to share
                      your study with real participants.
                    </p>

                    <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handlePayToUnlock}
                        disabled={isPaying}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-60"
                        style={{ backgroundColor: BRAND }}
                      >
                        
                        {isPaying ? "Processing…" : `Pay $${shareUnlockFee} to go live`}
                      </button>
                    </div>

                    <p className="mt-5 text-xs text-gray-500">
                      Pro and Enterprise plans include live participant sharing at no extra cost per study.
                    </p>
                  </div>
                </section>
              ) : (
                <>
                  <section>
                    <div className="text-sm font-semibold mb-2" style={{ color: BRAND }}>Study Link</div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        readOnly
                        value={shareUrl}
                        className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-gray-700"
                      />
                      <button
                        onClick={() => handleCopy(shareUrl, "link")}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border"
                        style={{ borderColor: BRAND, color: BRAND }}
                      >
                        <Copy className="w-4 h-4" />
                        {copied === "link" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Anyone with this link can participate in your study</p>
                  </section>

                  <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex gap-4">
                      <img src={qrSrc} alt="QR Code" className="w-36 h-36 rounded-md border" />
                      <div>
                        <div className="text-sm font-semibold" style={{ color: BRAND }}>QR Code</div>
                        <p className="text-xs text-gray-500 mb-3">
                          Scan to participate
                          <br />
                          Perfect for in-person studies or printed materials
                        </p>
                        <a
                          href={qrSrc}
                          download={`study-${studyId}-qr.png`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                          style={{ backgroundColor: BRAND }}
                        >
                          <Download className="w-4 h-4" />
                          Download QR Code
                        </a>
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="text-sm font-semibold mb-2" style={{ color: BRAND }}>Embed Link</div>
                    <textarea
                      readOnly
                      value={embedCode}
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700 h-28"
                    />
                    <div className="mt-3">
                      <button
                        onClick={() => handleCopy(embedCode, "embed")}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border"
                        style={{ borderColor: BRAND, color: BRAND }}
                      >
                        <Copy className="w-4 h-4" />
                        {copied === "embed" ? "Copied Embed Code" : "Copy Embed Code"}
                      </button>
                    </div>
                  </section>
                </>
              )}

              <section>
                <div className="text-sm font-semibold mb-2" style={{ color: BRAND }}>Study Status</div>
                <div className="border rounded-xl overflow-hidden">
                  <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Study Title</div>
                      <div className="text-sm text-gray-800">{shareDetails?.title || "—"}</div>
                    </div>
                    <div className="sm:text-right">
                      <div className="text-xs text-gray-500 mb-1">&nbsp;</div>
                      <div className="text-sm font-medium" style={{ color: "#0BA84F" }}>{shareDetails?.status || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Study Type</div>
                      <div className="text-sm text-gray-800">{studyTypeLabel}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Expected Duration</div>
                      <div className="text-sm text-gray-800">2 - 5 Minutes</div>
                    </div>
                  </div>
                  <div
                    className="px-4 sm:px-6 py-3 text-center text-xs"
                    style={{ color: BRAND, background: "#F6FAFF" }}
                  >
                    {canShareLive
                      ? "Your study is live and ready for participants"
                      : "This study is not yet live for participants. Unlock sharing to collect responses."}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
