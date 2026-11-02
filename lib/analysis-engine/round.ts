/** Python 3 / NumPy half-to-even rounding. */
export function bankersRound(value: number): number {
  if (!Number.isFinite(value)) return value
  const sign = value < 0 ? -1 : 1
  const abs = Math.abs(value)
  const floor = Math.floor(abs)
  const fraction = abs - floor
  if (fraction > 0.5) return sign * (floor + 1)
  if (fraction < 0.5) return sign * floor
  return sign * (floor % 2 === 0 ? floor : floor + 1)
}

/** Python int() on a float: toward zero. Non-finite becomes 0 so a sheet can still render. */
export function truncInt(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.trunc(value)
}

export function roundedInt(value: number): number {
  return truncInt(bankersRound(value))
}
