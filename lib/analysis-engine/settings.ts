import type { AnalysisSettings } from "@/lib/analysis-engine/types"

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  top: { hundred: [4, 5], zero: [1, 2, 3] },
  bottom: { hundred: [1, 2], zero: [3, 4, 5] },
  regression: { include_intercept: true },
  exclude_constant_raters: false,
}

export function defaultAnalysisSettings(maxRating = 5): AnalysisSettings {
  if (maxRating === 5) {
    return {
      top: { hundred: [...DEFAULT_ANALYSIS_SETTINGS.top.hundred], zero: [...DEFAULT_ANALYSIS_SETTINGS.top.zero] },
      bottom: {
        hundred: [...DEFAULT_ANALYSIS_SETTINGS.bottom.hundred],
        zero: [...DEFAULT_ANALYSIS_SETTINGS.bottom.zero],
      },
      regression: { include_intercept: true },
      exclude_constant_raters: false,
    }
  }
  const ratings = Array.from({ length: maxRating }, (_, index) => index + 1)
  const mid = Math.max(1, Math.floor(maxRating / 2))
  return {
    top: {
      hundred: ratings.filter((rating) => rating > mid),
      zero: ratings.filter((rating) => rating <= mid),
    },
    bottom: {
      hundred: ratings.filter((rating) => rating <= mid),
      zero: ratings.filter((rating) => rating > mid),
    },
    regression: { include_intercept: true },
    exclude_constant_raters: false,
  }
}

function normalizeRatingList(values: unknown): number[] {
  if (!Array.isArray(values)) return []
  const out: number[] = []
  for (const value of values) {
    const number = typeof value === "number" ? value : Number(value)
    if (Number.isFinite(number)) out.push(Math.trunc(number))
  }
  return [...new Set(out)].sort((a, b) => a - b)
}

function fillDefaults(
  hundred: number[],
  zero: number[],
  defaultHundred: number[],
  defaultZero: number[],
  valid: Set<number>,
): [number[], number[]] {
  let nextHundred = hundred.filter((rating) => valid.has(rating))
  let nextZero = zero.filter((rating) => valid.has(rating))
  if (nextHundred.length === 0 && nextZero.length === 0) {
    return [[...defaultHundred], [...defaultZero]]
  }
  const assigned = new Set([...nextHundred, ...nextZero])
  for (const rating of valid) {
    if (assigned.has(rating)) continue
    if (defaultHundred.includes(rating) && !nextHundred.includes(rating)) nextHundred.push(rating)
    else if (defaultZero.includes(rating) && !nextZero.includes(rating)) nextZero.push(rating)
    else nextZero.push(rating)
    assigned.add(rating)
  }
  const overlap = nextHundred.filter((rating) => nextZero.includes(rating))
  if (overlap.length) {
    const drop = new Set(overlap)
    nextZero = nextZero.filter((rating) => !drop.has(rating))
  }
  return [
    [...new Set(nextHundred)].sort((a, b) => a - b),
    [...new Set(nextZero)].sort((a, b) => a - b),
  ]
}

export function normalizeAnalysisSettings(
  raw?: Partial<AnalysisSettings> | Record<string, unknown> | null,
  maxRating = 5,
): AnalysisSettings {
  const base = defaultAnalysisSettings(maxRating)
  if (!raw) return base
  const top = (raw.top as { hundred?: unknown; zero?: unknown } | undefined) ?? {}
  const bottom = (raw.bottom as { hundred?: unknown; zero?: unknown } | undefined) ?? {}
  const regression = (raw.regression as { include_intercept?: unknown } | undefined) ?? {}
  const valid = new Set(Array.from({ length: maxRating }, (_, index) => index + 1))
  const [topHundred, topZero] = fillDefaults(
    normalizeRatingList(top.hundred),
    normalizeRatingList(top.zero),
    base.top.hundred,
    base.top.zero,
    valid,
  )
  const [bottomHundred, bottomZero] = fillDefaults(
    normalizeRatingList(bottom.hundred),
    normalizeRatingList(bottom.zero),
    base.bottom.hundred,
    base.bottom.zero,
    valid,
  )
  const includeIntercept =
    regression.include_intercept == null ? true : Boolean(regression.include_intercept)
  const excludeConstant =
    raw.exclude_constant_raters == null ? false : Boolean(raw.exclude_constant_raters)
  return {
    top: { hundred: topHundred, zero: topZero },
    bottom: { hundred: bottomHundred, zero: bottomZero },
    regression: { include_intercept: includeIntercept },
    exclude_constant_raters: excludeConstant,
  }
}
