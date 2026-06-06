export type PlanTier = 'free' | 'pro' | 'enterprise'

/** Backend JWT / billing enum values */
export const PLAN_TIERS = ['free', 'pro', 'enterprise'] as const satisfies readonly PlanTier[]

export function isPlanTier(value: unknown): value is PlanTier {
  return typeof value === 'string' && (PLAN_TIERS as readonly string[]).includes(value)
}

/** Normalize API/JWT plan to the backend enum; unknown values default to `free`. */
export function normalizePlanTier(raw: unknown): PlanTier {
  if (typeof raw !== 'string') return 'free'
  const value = raw.toLowerCase().trim()
  if (value === 'pro') return 'pro'
  if (value === 'enterprise') return 'enterprise'
  return 'free'
}

export interface PlanLimits {
  maxCategories: number
  maxElementsPerCategory: number
  maxLayers: number
  maxElementsPerLayer: number
  maxAiRespondents: number | null
  price: number
  shareUnlockFee: number
}

function parseEnvInt(key: string, fallback: number): number {
  const raw = process.env[key]
  const parsed = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseEnvFloat(key: string, fallback: number): number {
  const raw = process.env[key]
  const parsed = Number.parseFloat(raw ?? '')
  return Number.isFinite(parsed) ? parsed : fallback
}

const FREE_LIMITS: PlanLimits = {
  maxCategories: parseEnvInt('NEXT_PUBLIC_FREE_MAX_CATEGORIES', 4),
  maxElementsPerCategory: parseEnvInt('NEXT_PUBLIC_FREE_MAX_ELEMENTS_PER_CATEGORY', 4),
  maxLayers: parseEnvInt('NEXT_PUBLIC_FREE_MAX_LAYERS', 4),
  maxElementsPerLayer: parseEnvInt('NEXT_PUBLIC_FREE_MAX_ELEMENTS_PER_LAYER', 4),
  maxAiRespondents: parseEnvInt('NEXT_PUBLIC_FREE_MAX_AI_RESPONDENTS', 50),
  price: parseEnvFloat('NEXT_PUBLIC_FREE_PRICE', 0),
  shareUnlockFee: parseEnvFloat('NEXT_PUBLIC_FREE_SHARE_UNLOCK_FEE', 10),
}

const PRO_LIMITS: PlanLimits = {
  maxCategories: parseEnvInt('NEXT_PUBLIC_PRO_MAX_CATEGORIES', 8),
  maxElementsPerCategory: parseEnvInt('NEXT_PUBLIC_PRO_MAX_ELEMENTS_PER_CATEGORY', 8),
  maxLayers: parseEnvInt('NEXT_PUBLIC_PRO_MAX_LAYERS', 8),
  maxElementsPerLayer: parseEnvInt('NEXT_PUBLIC_PRO_MAX_ELEMENTS_PER_LAYER', 8),
  maxAiRespondents: null,
  price: parseEnvFloat('NEXT_PUBLIC_PRO_PRICE', 99),
  shareUnlockFee: 0,
}

const ENTERPRISE_LIMITS: PlanLimits = {
  // Enterprise: full study design capacity (legacy app defaults, configurable via .env)
  maxCategories: parseEnvInt('NEXT_PUBLIC_ENTERPRISE_MAX_CATEGORIES', 15),
  maxElementsPerCategory: parseEnvInt('NEXT_PUBLIC_ENTERPRISE_MAX_ELEMENTS_PER_CATEGORY', 10),
  maxLayers: parseEnvInt('NEXT_PUBLIC_ENTERPRISE_MAX_LAYERS', 15),
  maxElementsPerLayer: parseEnvInt('NEXT_PUBLIC_ENTERPRISE_MAX_ELEMENTS_PER_LAYER', 10),
  maxAiRespondents: null,
  price: 0,
  shareUnlockFee: 0,
}

export function isEnterprisePlan(plan: unknown): boolean {
  return normalizePlanTier(plan) === 'enterprise'
}

export function hasUnlimitedAiRespondents(plan: unknown): boolean {
  const tier = normalizePlanTier(plan)
  return tier === 'pro' || tier === 'enterprise'
}

/** Team invite / collaborator sharing (study or project members). */
export function canCollaborateWithTeam(plan: unknown): boolean {
  const tier = normalizePlanTier(plan)
  return tier === 'pro' || tier === 'enterprise'
}

export function getPlanLimits(plan: PlanTier): PlanLimits {
  switch (plan) {
    case 'pro':
      return PRO_LIMITS
    case 'enterprise':
      return ENTERPRISE_LIMITS
    default:
      return FREE_LIMITS
  }
}

/** Whether copy link, embed, and QR should be shown for live participant sharing. */
export function canAccessLiveParticipantSharing(
  userPlan: unknown,
  liveParticipantsPaid: boolean | undefined
): boolean {
  const plan = normalizePlanTier(userPlan)
  if (plan === 'pro' || plan === 'enterprise') return true
  return liveParticipantsPaid === true
}

export function getShareUnlockFee(): number {
  return FREE_LIMITS.shareUnlockFee
}

export interface PricingPlanDisplay {
  id: PlanTier
  name: string
  priceLabel: string
  period: string
  description: string
  highlighted: boolean
  features: string[]
}

export function getPricingPlansDisplay(): PricingPlanDisplay[] {
  const free = FREE_LIMITS
  const pro = PRO_LIMITS
  const enterprise = ENTERPRISE_LIMITS

  return [
    {
      id: 'free',
      name: 'Free',
      priceLabel: `$${free.price}`,
      period: 'forever',
      description: 'Get started with AI-powered studies and pay only when you need live participants.',
      highlighted: false,
      features: [
        'Create and launch studies',
        `Up to ${free.maxAiRespondents ?? 50} AI respondents`,
        `$${free.shareUnlockFee} per study for live participants`,
        `Up to ${free.maxCategories} categories / ${free.maxLayers} layers`,
        `Up to ${free.maxElementsPerCategory} elements per category/layer`,
        'Basic export report',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      priceLabel: `$${pro.price}`,
      period: 'per month',
      description: 'For teams running regular studies with live panels and advanced analysis.',
      highlighted: true,
      features: [
        'Everything in Free',
        'No live participant unlock fee',
        'Share studies with your team',
        'Analysis & project exports',
        `Up to ${pro.maxCategories} categories / ${pro.maxLayers} layers`,
        `Up to ${pro.maxElementsPerCategory} elements per category/layer`,
        'Unlimited AI respondents',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      priceLabel: 'Contact Us',
      period: 'custom pricing',
      description: 'Custom limits, SSO, dedicated support, and contract billing for large organizations.',
      highlighted: false,
      features: [
        'Custom design limits',
        `Up to ${enterprise.maxCategories} categories / ${enterprise.maxLayers} layers`,
        `Up to ${enterprise.maxElementsPerCategory} elements per category/layer`,
        'Unlimited AI respondents',
        'SSO & seat management',
        'Dedicated support',
        'Custom exports & integrations',
        'Annual billing options',
      ],
    },
  ]
}
