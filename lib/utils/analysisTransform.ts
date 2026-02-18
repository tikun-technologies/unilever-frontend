/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Transforms analysis.json structure for use in Table, Heatmap, and Graph components.
 * analysis.json keys: (T) Overall, (B) Overall, (R) Overall, (T) Age, (B) Age, etc.
 * Metric: Top Down -> (T), Bottom Up -> (B), Response Time -> (R)
 * Tab: Overall, Age, Gender, Prelim, 2 Market Segments, 3 Market Segments
 */

const METRIC_KEYS: Record<string, string> = {
  "Top Down": "(T)",
  "Bottom Up": "(B)",
  "Response Time": "(R)",
}

const TAB_KEYS: Record<string, string> = {
  Overall: "Overall",
  Age: "Age",
  Gender: "Gender",
  Prelim: "Classification Questions",
  "2 Market Segments": "Mindsets",
  "3 Market Segments": "Mindsets",
}

export type TableRow = { response: string;[key: string]: string | number }
export type TableCategory = { title: string; data: TableRow[]; columns?: Column[] }
export type Column = { key: string; label: string; subLabel?: string; optionFullText?: string }

export interface TransformedAnalysis {
  categories: TableCategory[]
  columns: Column[]
}

function getAnalysisSection(analysis: any, metric: string, tab: string): any {
  const m = METRIC_KEYS[metric] || "(T)"
  const tabKey = TAB_KEYS[tab] || "Overall"
  const key = `${m} ${tabKey}`
  return analysis?.[key] ?? null
}

function formatValue(val: number, isResponseTime: boolean): number {
  if (typeof val !== "number") return 0
  if (isResponseTime && (val < 1 || val > -1)) {
    return Math.round(val * 1000) / 1000 // 3 decimal places for small decimals
  }
  return val
}

/** Extract columns and rows from analysis section */
export function transformAnalysisForView(
  analysis: any,
  metric: string,
  tab: string
): TransformedAnalysis {
  const section = getAnalysisSection(analysis, metric, tab)
  const isResponseTime = metric === "Response Time"

  const defaultResult: TransformedAnalysis = { categories: [], columns: [{ key: "total", label: "Total" }] }

  if (!section?.categories?.length) {
    return defaultResult
  }

  const categories: TableCategory[] = []
  let columns: Column[] = []

  // Overall: elements have single "value"
  if (tab === "Overall") {
    columns = [{ key: "total", label: "Total", optionFullText: "Total" }]
    for (const cat of section.categories) {
      const data: TableRow[] = (cat.elements || []).map((el: any) => ({
        response: el.name || "",
        total: formatValue(el.value, isResponseTime),
      }))
      if (data.length) categories.push({ title: cat.name || "", data })
    }
    return { categories, columns }
  }

  // Age, Gender: elements have "values" object, segment keys from "segments"
  if (tab === "Age" || tab === "Gender") {
    const segments = section.segments || {}
    const segKeys = Object.keys(segments).sort()
    columns = segKeys.map((k) => ({
      key: k,
      label: k,
      optionFullText: k,
      subLabel: `(${segments[k]?.base_size ?? 0})`,
    }))
    if (columns.length === 0) columns = [{ key: "total", label: "Total" }]

    for (const cat of section.categories) {
      const data: TableRow[] = (cat.elements || []).map((el: any) => {
        const row: TableRow = { response: el.name || "" }
        const vals = el.values || {}
        for (const k of segKeys) row[k] = formatValue(vals[k] ?? 0, isResponseTime)
        if (segKeys.length === 0 && typeof el.value === "number") row.total = formatValue(el.value, isResponseTime)
        return row
      })
      if (data.length) categories.push({ title: cat.name || "", data })
    }
    return { categories, columns }
  }

  // 2 Market Segments, 3 Market Segments: use Mindsets, values have Total, Mindset_1_of_2, etc.
  if (tab === "2 Market Segments" || tab === "3 Market Segments") {
    const count = tab === "2 Market Segments" ? 2 : 3
    const keys: string[] = ["Total"]
    for (let i = 1; i <= count; i++) keys.push(`Mindset_${i}_of_${count}`)

    const groups = section.groups || {}
    const mindsetGroup = groups["Mindset_" + count] || {}
    columns = keys.map((k) => ({
      key: k,
      label: k.replace(/_/g, " "),
      optionFullText: k.replace(/_/g, " "),
      subLabel: mindsetGroup[k]?.base_size != null ? `(${mindsetGroup[k].base_size})` : undefined,
    }))

    for (const cat of section.categories) {
      const data: TableRow[] = (cat.elements || []).map((el: any) => {
        const row: TableRow = { response: el.name || "" }
        const vals = el.values || {}
        for (const k of keys) row[k] = formatValue(vals[k] ?? 0, isResponseTime)
        return row
      })
      if (data.length) categories.push({ title: cat.name || "", data })
    }
    return { categories, columns }
  }

  // Prelim (Classification Questions): Group by Question -> Average per Category
  if (tab === "Prelim") {
    const questions = section.questions || []

    for (const q of questions) {
      // 1. Columns for this specific Question
      const segs = q.segments || {}
      const ansKeys = Object.keys(segs)
      const groupColumns: Column[] = ansKeys.map(ans => {
        // The key in the values object is usually "QuestionText::Answer"
        // But let's check how the data is stored.
        // Based on previous code: key = `${q.question_text}::${ans}`
        const fullKey = `${q.question_text}::${ans}`
        return {
          key: fullKey,
          label: ans,
          optionFullText: ans,
          subLabel: segs[ans]?.base_size != null ? `(${segs[ans].base_size})` : undefined
        }
      })

      if (groupColumns.length === 0) continue

      // 2. Data Rows: One per Category (Brand/Group), Averaged across its elements
      const groupData: TableRow[] = []

      for (const cat of section.categories) {
        const elements = cat.elements || []
        if (elements.length === 0) continue

        const row: TableRow = { response: cat.name || "" }

        // For each answer option (column), calculate average across all elements
        for (const col of groupColumns) {
          let sum = 0
          let count = 0

          for (const el of elements) {
            const vals = el.values || {}
            const v = vals[col.key]
            // Handle both raw number and object { value: number }
            const num = (typeof v === "object" && v && "value" in v) ? v.value : v

            if (typeof num === "number") {
              sum += num
              count++
            }
          }

          const avg = count > 0 ? sum / count : 0
          row[col.key] = formatValue(avg, isResponseTime)
        }

        groupData.push(row)
      }

      if (groupData.length > 0) {
        categories.push({
          title: q.question_text,
          data: groupData,
          columns: groupColumns // Attach specific columns to this group
        })
      }
    }

    // We don't really use the global 'columns' return for Prelim anymore, 
    // but we return it to satisfy type or fallback
    return { categories, columns: [] }
  }

  return defaultResult
}
