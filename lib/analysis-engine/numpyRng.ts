/**
 * NumPy Generator(PCG64) for the four seeds the analysis service actually uses.
 * The 128-bit state is the one NumPy's SeedSequence produces for that seed.
 * uniform() was checked against np.random.default_rng(seed).uniform.
 */

const ZERO = BigInt(0)
const ONE = BigInt(1)
const ELEVEN = BigInt(11)
const THIRTY_TWO = BigInt(32)
const SIXTY_THREE = BigInt(63)
const SIXTY_FOUR = BigInt(64)
const ONE_TWENTY_TWO = BigInt(122)
const MASK32 = BigInt("0xffffffff")
const MASK64 = (ONE << SIXTY_FOUR) - ONE
const MASK128 = (ONE << BigInt(128)) - ONE
const MULT = BigInt("0x2360ed051fc65da44385df649fccf645")

const SEEDS: Record<number, { state: bigint; inc: bigint }> = {
  123: {
    state: BigInt("160078363690744033601390112987726904141"),
    inc: BigInt("17686443629577124697969402389330893883"),
  },
  456: {
    state: BigInt("247657327053257868884743652982636763877"),
    inc: BigInt("246070390390441921778646289804763626967"),
  },
  101: {
    state: BigInt("203581970233268073252220818571676019237"),
    inc: BigInt("287896369054363243330570147588121237329"),
  },
  202: {
    state: BigInt("182071781866625486336463664382853514870"),
    inc: BigInt("115100037077895843562177524975652467207"),
  },
}

function rotateRight(value: bigint, rot: bigint): bigint {
  const shift = rot & SIXTY_THREE
  if (shift === ZERO) return value & MASK64
  return ((value >> shift) | (value << (SIXTY_FOUR - shift))) & MASK64
}

function pcgOutput(state: bigint): bigint {
  const high = (state >> SIXTY_FOUR) & MASK64
  const low = state & MASK64
  return rotateRight(high ^ low, state >> ONE_TWENTY_TWO)
}

export interface NumpyRng {
  uniform(low: number, high: number): number
  /** One draw from 0 .. n-1. Matches Generator.choice(n) and integers(0, n). */
  integer(n: number): number
  /** Sample `take` distinct indices from 0 .. population-1, in NumPy's shuffled order. */
  choice(population: number, take: number): number[]
}

export function createNumpyRng(seed: number): NumpyRng {
  const initial = SEEDS[seed]
  if (!initial) {
    throw new Error(`Analysis RNG only supports NumPy seeds ${Object.keys(SEEDS).join(", ")}`)
  }
  let state = initial.state
  const inc = initial.inc
  let hasUint32 = false
  let cachedUint32 = 0

  function nextUint64(): bigint {
    state = (state * MULT + inc) & MASK128
    return pcgOutput(state)
  }

  function nextUnitInterval(): number {
    return Number(nextUint64() >> ELEVEN) / 9007199254740992
  }

  // NumPy splits each uint64 into two uint32s, low half first.
  function nextUint32(): number {
    if (hasUint32) {
      hasUint32 = false
      return cachedUint32
    }
    const value = nextUint64()
    cachedUint32 = Number((value >> THIRTY_TWO) & MASK32)
    hasUint32 = true
    return Number(value & MASK32)
  }

  // Lemire's nearly-divisionless method, the one Generator.integers uses for a uint32 bound.
  function bounded(range: number): number {
    if (range <= 1) return 0
    const bound = BigInt(range)
    const threshold = ((ONE << THIRTY_TWO) - bound) % bound
    while (true) {
      const product = BigInt(nextUint32()) * bound
      const low = product & MASK32
      if (low >= bound || low >= threshold) return Number(product >> THIRTY_TWO)
    }
  }

  // Floyd's algorithm, then a Fisher-Yates shuffle of the sample. This is Generator.choice(..., replace=False).
  function choice(population: number, take: number): number[] {
    if (take < 0 || take > population) {
      throw new Error(`Cannot sample ${take} items from ${population} without replacement`)
    }
    const selected = new Set<number>()
    const result: number[] = []
    for (let upper = population - take; upper < population; upper += 1) {
      const pick = bounded(upper + 1)
      if (selected.has(pick)) {
        selected.add(upper)
        result.push(upper)
      } else {
        selected.add(pick)
        result.push(pick)
      }
    }
    for (let index = take - 1; index > 0; index -= 1) {
      const swapAt = bounded(index + 1)
      const current = result[index]
      result[index] = result[swapAt]
      result[swapAt] = current
    }
    return result
  }

  return {
    uniform(low: number, high: number) {
      return low + (high - low) * nextUnitInterval()
    },
    integer(n: number) {
      return bounded(n)
    },
    choice,
  }
}
