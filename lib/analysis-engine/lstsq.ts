import { inverse, Matrix, SVD } from "ml-matrix"

export interface LeastSquaresSolver {
  solve(y: number[]): number[]
}

/** R diagonals below this fraction of the largest one go through SVD, which handles rank deficiency like NumPy. */
const FULL_RANK_RATIO = 1e-7

function svdSolver(design: number[][], rows: number, cols: number): LeastSquaresSolver {
  const svd = new SVD(design, { autoTranspose: true })
  const u = svd.leftSingularVectors
  const v = svd.rightSingularVectors
  const s = svd.diagonal
  const cutoff = Number.EPSILON * Math.max(rows, cols) * (s[0] ?? 0)
  return {
    solve(y) {
      const x = new Float64Array(cols)
      for (let k = 0; k < s.length; k += 1) {
        if (!(s[k] > cutoff)) continue
        let projected = 0
        for (let r = 0; r < u.rows; r += 1) projected += u.get(r, k) * y[r]
        const scale = projected / s[k]
        for (let c = 0; c < cols; c += 1) x[c] += v.get(c, k) * scale
      }
      return Array.from(x)
    },
  }
}

/**
 * Householder QR, then back substitution. When R shows the design is rank deficient
 * the solver falls back to SVD of R, which has the same singular values as the design.
 */
function qrSolver(design: number[][], rows: number, cols: number): LeastSquaresSolver {
  const a: Float64Array[] = Array.from({ length: cols }, (_, c) => {
    const column = new Float64Array(rows)
    for (let r = 0; r < rows; r += 1) column[r] = design[r][c]
    return column
  })
  const reflectors: Float64Array[] = []
  const betas = new Float64Array(cols)
  const rDiag = new Float64Array(cols)

  for (let k = 0; k < cols; k += 1) {
    const column = a[k]
    let norm = 0
    for (let r = k; r < rows; r += 1) norm += column[r] * column[r]
    norm = Math.sqrt(norm)
    const v = new Float64Array(rows - k)
    if (norm === 0) {
      reflectors.push(v)
      betas[k] = 0
      rDiag[k] = 0
      continue
    }
    const alpha = column[k] > 0 ? -norm : norm
    for (let r = k; r < rows; r += 1) v[r - k] = column[r]
    v[0] -= alpha
    let vNorm = 0
    for (let i = 0; i < v.length; i += 1) vNorm += v[i] * v[i]
    const beta = vNorm === 0 ? 0 : 2 / vNorm
    reflectors.push(v)
    betas[k] = beta
    rDiag[k] = alpha
    column[k] = alpha
    for (let r = k + 1; r < rows; r += 1) column[r] = 0
    for (let j = k + 1; j < cols; j += 1) {
      const target = a[j]
      let dot = 0
      for (let i = 0; i < v.length; i += 1) dot += v[i] * target[k + i]
      const factor = beta * dot
      if (factor === 0) continue
      for (let i = 0; i < v.length; i += 1) target[k + i] -= factor * v[i]
    }
  }

  const applyQt = (y: number[]): Float64Array => {
    const z = Float64Array.from(y)
    for (let k = 0; k < cols; k += 1) {
      const v = reflectors[k]
      const beta = betas[k]
      if (beta === 0) continue
      let dot = 0
      for (let i = 0; i < v.length; i += 1) dot += v[i] * z[k + i]
      const factor = beta * dot
      for (let i = 0; i < v.length; i += 1) z[k + i] -= factor * v[i]
    }
    return z
  }

  let largest = 0
  let smallest = Infinity
  for (let k = 0; k < cols; k += 1) {
    const value = Math.abs(rDiag[k])
    if (value > largest) largest = value
    if (value < smallest) smallest = value
  }

  if (largest > 0 && smallest > largest * FULL_RANK_RATIO) {
    return {
      solve(y) {
        const z = applyQt(y)
        const x = new Float64Array(cols)
        for (let i = cols - 1; i >= 0; i -= 1) {
          let sum = z[i]
          for (let j = i + 1; j < cols; j += 1) sum -= a[j][i] * x[j]
          x[i] = sum / a[i][i]
        }
        return Array.from(x)
      },
    }
  }

  const r: number[][] = Array.from({ length: cols }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (j >= i ? a[j][i] : 0)),
  )
  const svd = new SVD(r, { autoTranspose: true })
  const u = svd.leftSingularVectors
  const v = svd.rightSingularVectors
  const s = svd.diagonal
  const cutoff = Number.EPSILON * Math.max(rows, cols) * (s[0] ?? 0)
  return {
    solve(y) {
      const z = applyQt(y)
      const x = new Float64Array(cols)
      for (let k = 0; k < s.length; k += 1) {
        if (!(s[k] > cutoff)) continue
        let projected = 0
        for (let i = 0; i < cols; i += 1) projected += u.get(i, k) * z[i]
        const scale = projected / s[k]
        for (let c = 0; c < cols; c += 1) x[c] += v.get(c, k) * scale
      }
      return Array.from(x)
    },
  }
}

/** Cholesky of X'X is only trusted when the design is clearly full rank; anything close goes through QR. */
const CHOLESKY_RANK_RATIO = 1e-4

/**
 * Normal equations for very tall designs (the pooled regression). The Gram matrix of a 0/1 design
 * is exact, so this matches QR to well below report precision while costing a fraction of the time.
 */
function choleskySolver(design: number[][], gram: number[][], rows: number, cols: number): LeastSquaresSolver | null {
  const l: Float64Array[] = Array.from({ length: cols }, () => new Float64Array(cols))
  let largest = 0
  let smallest = Infinity
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = gram[i][j]
      for (let k = 0; k < j; k += 1) sum -= l[i][k] * l[j][k]
      if (i === j) {
        if (!(sum > 0)) return null
        const pivot = Math.sqrt(sum)
        l[i][i] = pivot
        if (pivot > largest) largest = pivot
        if (pivot < smallest) smallest = pivot
      } else {
        l[i][j] = sum / l[j][j]
      }
    }
  }
  if (!(smallest > largest * CHOLESKY_RANK_RATIO)) return null
  return {
    solve(y) {
      const rhs = new Float64Array(cols)
      for (let r = 0; r < rows; r += 1) {
        const value = y[r]
        if (value === 0) continue
        const line = design[r]
        for (let c = 0; c < cols; c += 1) rhs[c] += line[c] * value
      }
      const z = new Float64Array(cols)
      for (let i = 0; i < cols; i += 1) {
        let sum = rhs[i]
        for (let k = 0; k < i; k += 1) sum -= l[i][k] * z[k]
        z[i] = sum / l[i][i]
      }
      const x = new Float64Array(cols)
      for (let i = cols - 1; i >= 0; i -= 1) {
        let sum = z[i]
        for (let k = i + 1; k < cols; k += 1) sum -= l[k][i] * x[k]
        x[i] = sum / l[i][i]
      }
      return Array.from(x)
    },
  }
}

/**
 * NumPy np.linalg.lstsq(..., rcond=None): minimum-norm solution with singular values
 * at or below eps * max(m, n) * s[0] dropped. Factor once, then solve for several outcomes.
 * Pass the Gram matrix for tall designs to allow the faster normal-equation path.
 */
export function leastSquaresSolver(design: number[][], gram?: number[][]): LeastSquaresSolver {
  const rows = design.length
  const cols = design[0]?.length ?? 0
  if (rows === 0 || cols === 0) return { solve: () => Array(cols).fill(0) }
  const solver =
    (gram && rows >= cols * 20 ? choleskySolver(design, gram, rows, cols) : null) ??
    (rows >= cols ? qrSolver(design, rows, cols) : svdSolver(design, rows, cols))
  return {
    solve(y) {
      if (y.length !== rows) return Array(cols).fill(0)
      return solver.solve(y)
    },
  }
}

export function leastSquares(design: number[][], y: number[]): number[] {
  return leastSquaresSolver(design).solve(y)
}

/** NumPy np.linalg.inv. Returns null when the matrix is singular, which the service turns into t = 0. */
export function invertSquare(matrix: number[][]): number[][] | null {
  if (matrix.length === 0) return null
  try {
    const inverted = inverse(new Matrix(matrix)).to2DArray()
    for (const row of inverted) {
      for (const value of row) {
        if (!Number.isFinite(value)) return null
      }
    }
    return inverted
  } catch {
    return null
  }
}

export function matMulTranspose(design: number[][]): number[][] {
  const rows = design.length
  const cols = design[0]?.length ?? 0
  const columns: Float64Array[] = Array.from({ length: cols }, (_, c) => {
    const column = new Float64Array(rows)
    for (let r = 0; r < rows; r += 1) column[r] = design[r][c]
    return column
  })
  const gram: number[][] = Array.from({ length: cols }, () => Array(cols).fill(0))
  for (let i = 0; i < cols; i += 1) {
    const left = columns[i]
    for (let j = i; j < cols; j += 1) {
      const right = columns[j]
      let sum = 0
      for (let r = 0; r < rows; r += 1) sum += left[r] * right[r]
      gram[i][j] = sum
      gram[j][i] = sum
    }
  }
  return gram
}
