import { createNumpyRng } from "@/lib/analysis-engine/numpyRng"

/**
 * Pearson k-means used for mindsets. Centering, normalization, the starting
 * rows, and the update rule match StudyAnalysisService._custom_kmeans_pearson.
 */
export function pearsonKMeans(data: number[][], k: number, seed: number): number[] {
  const samples = data.length
  const width = data[0]?.length ?? 0
  if (samples < k || width === 0 || k <= 0) return Array(samples).fill(0)

  const normalized = data.map((row) => {
    let mean = 0
    for (const value of row) mean += value
    mean /= row.length
    const centered = row.map((value) => value - mean)
    let sumSquares = 0
    for (const value of centered) sumSquares += value * value
    const scale = sumSquares === 0 ? 1e-9 : Math.sqrt(sumSquares)
    return centered.map((value) => value / scale)
  })

  const rng = createNumpyRng(seed)
  let centroids = rng.choice(samples, k).map((index) => normalized[index].slice())
  let labels = Array(samples).fill(0)

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const next = Array(samples).fill(0)
    for (let row = 0; row < samples; row += 1) {
      let best = Number.NEGATIVE_INFINITY
      let bestIndex = 0
      const point = normalized[row]
      for (let cluster = 0; cluster < k; cluster += 1) {
        let dot = 0
        const centroid = centroids[cluster]
        for (let column = 0; column < width; column += 1) dot += point[column] * centroid[column]
        if (dot > best) {
          best = dot
          bestIndex = cluster
        }
      }
      next[row] = bestIndex
    }

    let same = true
    for (let row = 0; row < samples; row += 1) {
      if (next[row] !== labels[row]) {
        same = false
        break
      }
    }
    if (same) break
    labels = next

    const fresh: number[][] = []
    for (let cluster = 0; cluster < k; cluster += 1) {
      const mean = Array(width).fill(0)
      let members = 0
      for (let row = 0; row < samples; row += 1) {
        if (labels[row] !== cluster) continue
        members += 1
        const point = normalized[row]
        for (let column = 0; column < width; column += 1) mean[column] += point[column]
      }
      if (members === 0) {
        fresh.push(normalized[rng.integer(samples)].slice())
        continue
      }
      for (let column = 0; column < width; column += 1) mean[column] /= members
      let sumSquares = 0
      for (const value of mean) sumSquares += value * value
      const norm = Math.sqrt(sumSquares)
      fresh.push(norm > 1e-9 ? mean.map((value) => value / norm) : normalized[rng.integer(samples)].slice())
    }
    centroids = fresh
  }

  return labels
}
