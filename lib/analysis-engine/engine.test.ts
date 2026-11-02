import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { generateAnalysisReport } from "@/lib/analysis-engine/report"
import { localClassificationCohort, studyFromAnalysisReport } from "@/lib/export/offlineAnalysis"
import { leastSquares } from "@/lib/analysis-engine/lstsq"
import { createNumpyRng } from "@/lib/analysis-engine/numpyRng"
import { bankersRound, truncInt } from "@/lib/analysis-engine/round"
import { normalizeAnalysisSettings } from "@/lib/analysis-engine/settings"
import { constantRaterIds } from "@/lib/analysis-engine/rows"
import type { JsonValue } from "@/lib/analysis-engine/types"

interface GoldenCase {
  name: string
  input: {
    study: Record<string, unknown>
    rows: Array<Record<string, unknown>>
    filters?: Record<string, unknown> | null
    analysisOptions?: Record<string, unknown> | null
    includeRawData?: boolean
    maxRating?: number
  }
  expected: JsonValue | null
  throws: string | null
}

function numbersClose(actual: number, expected: number): boolean {
  if (Object.is(actual, expected)) return true
  if (Number.isInteger(expected) && Number.isInteger(actual)) return actual === expected
  const diff = Math.abs(actual - expected)
  const scale = Math.max(Math.abs(actual), Math.abs(expected), 1)
  return diff <= 1e-5 || diff / scale <= 1e-6
}

function diffJson(actual: unknown, expected: unknown, pathName: string, mismatches: string[]) {
  if (mismatches.length > 25) return
  if (typeof expected === "number" && typeof actual === "number") {
    if (!numbersClose(actual, expected)) mismatches.push(`${pathName}: expected ${expected}, got ${actual}`)
    return
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      mismatches.push(`${pathName}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
      return
    }
    if (expected.length !== actual.length) {
      mismatches.push(`${pathName}: length expected ${expected.length}, got ${actual.length}`)
    }
    const count = Math.min(expected.length, actual.length)
    for (let index = 0; index < count; index += 1) diffJson(actual[index], expected[index], `${pathName}[${index}]`, mismatches)
    return
  }
  if (expected && actual && typeof expected === "object" && typeof actual === "object") {
    const expectedRecord = expected as Record<string, unknown>
    const actualRecord = actual as Record<string, unknown>
    const keys = new Set([...Object.keys(expectedRecord), ...Object.keys(actualRecord)])
    for (const key of keys) {
      if (!(key in expectedRecord)) mismatches.push(`${pathName}.${key}: unexpected`)
      else if (!(key in actualRecord)) mismatches.push(`${pathName}.${key}: missing`)
      else diffJson(actualRecord[key], expectedRecord[key], `${pathName}.${key}`, mismatches)
    }
    return
  }
  if (actual !== expected) mismatches.push(`${pathName}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

describe("analysis engine basics", () => {
  it("matches NumPy half-to-even rounding and truncation", () => {
    expect(bankersRound(0.5)).toBe(0)
    expect(bankersRound(1.5)).toBe(2)
    expect(bankersRound(2.5)).toBe(2)
    expect(bankersRound(-1.5)).toBe(-2)
    expect(truncInt(-1.9)).toBe(-1)
    expect(truncInt(1.9)).toBe(1)
  })

  it("matches NumPy least squares, including a collinear design", () => {
    const full = leastSquares(
      [
        [1, 0],
        [0, 1],
        [1, 1],
      ],
      [1, 2, 4],
    )
    expect(full[0]).toBeCloseTo(1.3333333333333333, 10)
    expect(full[1]).toBeCloseTo(2.333333333333334, 10)
    const singular = leastSquares(
      [
        [1, 1, 0],
        [1, 0, 1],
        [1, 1, 0],
        [1, 0, 1],
      ],
      [1, 0, 1, 1],
    )
    expect(singular[0]).toBeCloseTo(0.5, 10)
    expect(singular[1]).toBeCloseTo(0.5, 10)
    expect(Math.abs(singular[2])).toBeLessThan(1e-8)
  })

  it("reproduces the NumPy PCG64 uniform stream for seed 123", () => {
    const rng = createNumpyRng(123)
    const values = Array.from({ length: 6 }, () => rng.uniform(-0.5, 0.5))
    expect(values[0]).toBeCloseTo(0.18235186324814345, 12)
    expect(values[1]).toBeCloseTo(-0.4461789811977773, 12)
    expect(values[5]).toBeCloseTo(0.31209450665577365, 12)
  })

  it("reproduces NumPy choice and integers on the same stream", () => {
    const rng = createNumpyRng(101)
    expect(rng.choice(20, 3)).toEqual([13, 5, 17])
    expect([rng.integer(20), rng.integer(20), rng.integer(20), rng.integer(20)]).toEqual([15, 7, 11, 12])
    const full = createNumpyRng(101)
    expect(full.choice(5, 5)).toEqual([4, 2, 1, 3, 0])
    expect(full.integer(9)).toBe(5)
    const wide = createNumpyRng(101)
    const draws = Array.from({ length: 400 }, () => wide.integer(1_000_000_000))
    expect(draws[0]).toBe(310265984)
    expect(draws[9]).toBe(365568171)
    expect(draws[399]).toBe(262997802)
  })

  it("normalizes a partial 7-point map the way the service does at max rating 5", () => {
    const settings = normalizeAnalysisSettings(
      { top: { hundred: [4, 5, 6, 7], zero: [1, 2, 3] }, bottom: { hundred: [1, 2, 3], zero: [4, 5, 6, 7] } },
      5,
    )
    expect(settings.top.hundred).toEqual([4, 5])
    expect(settings.top.zero).toEqual([1, 2, 3])
    expect(settings.bottom.hundred).toEqual([1, 2, 3])
  })

  it("rebuilds a study from its report and returns the same analysis", () => {
    const fixturePath = path.join(__dirname, "fixtures", "golden.json")
    const cases = JSON.parse(readFileSync(fixturePath, "utf8")) as GoldenCase[]
    const item = cases.find((entry) => entry.name === "grid-full")
    if (!item?.expected) throw new Error("grid-full fixture missing")
    const first = generateAnalysisReport({
      study: item.input.study,
      rows: item.input.rows,
      filters: item.input.filters as never,
      analysisOptions: item.input.analysisOptions,
      includeRawData: item.input.includeRawData,
      maxRating: item.input.maxRating,
    })
    const second = generateAnalysisReport({
      study: studyFromAnalysisReport(first),
      rows: item.input.rows,
      filters: item.input.filters as never,
      analysisOptions: item.input.analysisOptions,
      includeRawData: item.input.includeRawData,
      maxRating: item.input.maxRating,
    })
    const mismatches: string[] = []
    diffJson(second, first, "round-trip", mismatches)
    expect(mismatches, mismatches.join("\n")).toEqual([])
  })

  it("builds a classification cohort from the response rows", () => {
    const rows = [
      { Panelist: 1, Gender: "Female", Age: 30, Task: 1, Rating: 5, "How often?": "Often" },
      { Panelist: 1, Gender: "Female", Age: 30, Task: 2, Rating: 4, "How often?": "Often" },
      { Panelist: 2, Gender: "Male", Age: 22, Task: 1, Rating: 2, "How often?": "Rarely" },
      { Panelist: 3, Gender: "Female", Age: 40, Task: 1, Rating: 5, "How often?": "Often" },
    ]
    const cohort = localClassificationCohort({
      rows,
      questions: [{
        question_id: "q1",
        question_text: "How often?",
        question_type: "multiple_choice",
        is_required: true,
        order: 0,
        answer_options: [{ id: "often", text: "Often" }, { id: "rarely", text: "Rarely" }],
      }],
      filters: { genders: ["Female"] },
      questionText: "How often?",
      answer: "Often",
    })
    expect(cohort.meta.cohort_size).toBe(2)
    expect(cohort.respondents.map((person) => person.id)).toEqual(["1", "3"])
    expect(cohort.demographic_breakdown?.age_group).toEqual({ "25-34": 1, "35-44": 1 })
  })

  it("builds a 322-person cohort from 83,000 rows without repeatedly scanning the dataset", () => {
    const rows = Array.from({ length: 644 }, (_, panelistIndex) =>
      Array.from({ length: 129 }, (_, taskIndex) => ({
        Panelist: panelistIndex + 1,
        Gender: panelistIndex % 2 === 0 ? "Female" : "Male",
        Age: 20 + (panelistIndex % 45),
        Task: taskIndex + 1,
        Rating: (taskIndex % 5) + 1,
        "Do you currently use dove?": panelistIndex % 2 === 0 ? "Yes" : "No",
        Region: panelistIndex % 3 === 0 ? "North" : "South",
      })),
    ).flat()
    const cohort = localClassificationCohort({
      rows,
      questions: [
        {
          question_id: "prelim",
          question_text: "Do you currently use dove?",
          question_type: "multiple_choice",
          is_required: true,
          order: 0,
          answer_options: [{ id: "yes", text: "Yes" }, { id: "no", text: "No" }],
        },
        {
          question_id: "region",
          question_text: "Region",
          question_type: "multiple_choice",
          is_required: true,
          order: 1,
          answer_options: [{ id: "north", text: "North" }, { id: "south", text: "South" }],
        },
      ],
      questionText: "Do you currently use dove?",
      answer: "Yes",
      limit: 120,
    })
    expect(rows).toHaveLength(83_076)
    expect(cohort.meta.cohort_size).toBe(322)
    expect(cohort.meta.has_more).toBe(true)
    expect(cohort.respondents).toHaveLength(120)
    expect(cohort.cross_tabs.Region).toEqual({ South: 214, North: 108 })
  })

  it("drops only respondents who gave the same score at least twice", () => {
    const dropped = constantRaterIds([
      { Panelist: 1, Rating: 5 },
      { Panelist: 1, Rating: "5" },
      { Panelist: 2, Rating: 5 },
      { Panelist: 3, Rating: 4 },
      { Panelist: 3, Rating: 5 },
      { Panelist: 4, Rating: null },
      { Panelist: 4, Rating: null },
    ])
    expect([...dropped]).toEqual([1])
  })

  it("can remove exported filters and constant-rater exclusion to restore every respondent", () => {
    const fixturePath = path.join(__dirname, "fixtures", "golden.json")
    const cases = JSON.parse(readFileSync(fixturePath, "utf8")) as GoldenCase[]
    const item = cases.find((entry) => entry.name === "grid-full")
    if (!item) throw new Error("grid-full fixture missing")
    const allRespondents = new Set(item.input.rows.map((row) => row.Panelist)).size

    const initiallyRestricted = generateAnalysisReport({
      study: item.input.study,
      rows: item.input.rows,
      filters: { genders: ["Female"] },
      analysisOptions: { exclude_constant_raters: true },
      includeRawData: false,
      maxRating: 5,
    })
    const unrestricted = generateAnalysisReport({
      study: item.input.study,
      rows: item.input.rows,
      filters: null,
      analysisOptions: { exclude_constant_raters: false },
      includeRawData: false,
      maxRating: 5,
    })

    const initiallyRestrictedOverall = initiallyRestricted["(T) Overall"] as Record<string, unknown>
    const unrestrictedOverall = unrestricted["(T) Overall"] as Record<string, unknown>
    expect(Number(initiallyRestrictedOverall?.base_size)).toBeLessThan(allRespondents)
    expect(Number(unrestrictedOverall?.base_size)).toBe(allRespondents)
  })
})

describe("analysis engine against the Python service", () => {
  const fixturePath = path.join(__dirname, "fixtures", "golden.json")
  const cases = JSON.parse(readFileSync(fixturePath, "utf8")) as GoldenCase[]

  it.each(cases.map((item) => [item.name, item] as const))("%s", (_name, item) => {
    const actual = generateAnalysisReport({
      study: item.input.study,
      rows: item.input.rows,
      filters: item.input.filters as never,
      analysisOptions: item.input.analysisOptions,
      includeRawData: item.input.includeRawData,
      maxRating: item.input.maxRating,
    })
    if (item.throws) {
      expect(actual.filter_meta && typeof actual.filter_meta === "object" && "error" in actual.filter_meta).toBe(true)
      return
    }
    const mismatches: string[] = []
    diffJson(actual, item.expected, item.name, mismatches)
    expect(mismatches, mismatches.join("\n")).toEqual([])
  })
})
