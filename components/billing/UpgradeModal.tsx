'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Check, Loader2, Sparkles, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSubscriptionCheckout } from '@/lib/api/BillingAPI'
import { ApiError } from '@/lib/api/LoginApi'
import { getPricingPlansDisplay, type PlanTier } from '@/lib/config/planLimits'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan: PlanTier
}

const ENTERPRISE_MAILTO =
  'mailto:hello@mindsurve.com?subject=MindSurve%20Enterprise'

function PlanIcon({ planId, highlighted }: { planId: PlanTier; highlighted: boolean }) {
  const className = `h-6 w-6 ${highlighted ? 'text-white' : 'text-[rgba(38,116,186,1)]'}`

  if (planId === 'enterprise') {
    return <Building2 className={className} strokeWidth={2} />
  }
  if (planId === 'pro') {
    return <Sparkles className={className} strokeWidth={2} />
  }
  return <Zap className={className} strokeWidth={2} />
}

function buildSubscriptionReturnUrl(outcome: 'success' | 'cancelled') {
  const params = new URLSearchParams(window.location.search)
  params.delete('subscription')
  params.set('subscription', outcome)
  const query = params.toString()
  return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`
}

export function UpgradeModal({ isOpen, onClose, currentPlan }: UpgradeModalProps) {
  const pricingPlans = getPricingPlansDisplay()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const handlePlanAction = async (planId: PlanTier) => {
    if (planId === currentPlan) return

    if (planId === 'enterprise') {
      window.location.href = ENTERPRISE_MAILTO
      return
    }

    if (planId === 'free') {
      return
    }

    if (typeof window === 'undefined') return

    setIsCheckingOut(true)
    setCheckoutError(null)

    try {
      const checkout = await createSubscriptionCheckout({
        success_url: buildSubscriptionReturnUrl('success'),
        cancel_url: buildSubscriptionReturnUrl('cancelled'),
      })

      if (!checkout.checkout_url) {
        throw new Error('Stripe checkout URL was not returned by the server.')
      }

      window.location.href = checkout.checkout_url
    } catch (e: unknown) {
      console.error('Subscription checkout failed:', e)
      const message =
        e instanceof ApiError
          ? e.message
          : (e as Error)?.message || 'Failed to start checkout. Please try again.'
      setCheckoutError(message)
      setIsCheckingOut(false)
    }
  }

  const handleClose = () => {
    if (isCheckingOut) return
    setCheckoutError(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="pointer-events-auto relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 sm:px-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Choose your plan</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    You are currently on the{' '}
                    <span className="font-semibold capitalize text-[rgba(38,116,186,1)]">
                      {currentPlan}
                    </span>{' '}
                    plan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isCheckingOut}
                  className="rounded-full p-2 transition-colors hover:bg-gray-100 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-6 sm:px-8">
                {checkoutError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {checkoutError}
                  </div>
                )}

                <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
                  {pricingPlans.map((plan) => {
                    const isCurrent = plan.id === currentPlan
                    const isHighlighted = plan.highlighted && !isCurrent
                    const isProCheckout = plan.id === 'pro' && isCheckingOut

                    return (
                      <div
                        key={plan.id}
                        className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all ${
                          isCurrent
                            ? 'border-green-500 ring-2 ring-green-100'
                            : isHighlighted
                              ? 'border-[rgba(38,116,186,1)] ring-2 ring-[rgba(38,116,186,0.15)]'
                              : 'border-gray-100'
                        }`}
                      >
                        {isCurrent && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                            Current plan
                          </div>
                        )}
                        {!isCurrent && isHighlighted && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[rgba(38,116,186,1)] px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                            Most popular
                          </div>
                        )}

                        <div className="mb-4 flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                              isHighlighted || isCurrent
                                ? 'bg-[rgba(38,116,186,1)]'
                                : 'bg-[rgba(38,116,186,0.12)]'
                            }`}
                          >
                            <PlanIcon planId={plan.id} highlighted={isHighlighted || isCurrent} />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                        </div>

                        <div className="mb-3">
                          <span className="text-3xl font-extrabold tracking-tight text-gray-900">
                            {plan.priceLabel}
                          </span>
                          {plan.id !== 'enterprise' && (
                            <span className="ml-2 text-sm font-medium text-gray-500">
                              / {plan.period}
                            </span>
                          )}
                          {plan.id === 'enterprise' && (
                            <p className="mt-1 text-sm font-medium text-gray-500">{plan.period}</p>
                          )}
                        </div>

                        <p className="mb-5 min-h-[3.5rem] text-sm text-gray-600">{plan.description}</p>

                        <ul className="mb-6 flex-1 space-y-2.5">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-700">
                              <Check
                                className="mt-0.5 h-4 w-4 shrink-0 text-[rgba(38,116,186,1)]"
                                strokeWidth={2.5}
                              />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <Button
                          type="button"
                          disabled={isCurrent || isCheckingOut || plan.id === 'free'}
                          onClick={() => handlePlanAction(plan.id)}
                          className={`w-full rounded-full py-2.5 ${
                            isCurrent || plan.id === 'free'
                              ? 'cursor-default bg-gray-100 text-gray-500 hover:bg-gray-100'
                              : isHighlighted
                                ? 'bg-[rgba(38,116,186,1)] text-white hover:bg-[#1a5f96]'
                                : 'border-2 border-[rgba(38,116,186,1)] bg-white text-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.06)]'
                          }`}
                          variant={isCurrent || plan.id === 'free' ? 'secondary' : isHighlighted ? 'default' : 'outline'}
                        >
                          {isProCheckout ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Redirecting to checkout…
                            </>
                          ) : isCurrent ? (
                            'Current plan'
                          ) : plan.id === 'enterprise' ? (
                            'Contact us'
                          ) : plan.id === 'pro' ? (
                            'Upgrade to Pro'
                          ) : (
                            'Included'
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>

                <p className="mt-6 text-center text-xs text-gray-500">
                  Pro is billed monthly via Stripe. Live participant studies on the Free plan require a
                  one-time unlock fee per study; Pro includes unlimited live access.
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
