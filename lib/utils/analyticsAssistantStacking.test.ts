import { describe, expect, it } from "vitest"
import type { DesignElementSnapshot } from "../types/analyticsAssistant"

function sortByZIndex(elements: DesignElementSnapshot[]) {
  return [...elements].sort(
    (a, b) =>
      (a.z_index || 0) - (b.z_index || 0) ||
      String(a.category_name || "").localeCompare(String(b.category_name || "")) ||
      String(a.name || "").localeCompare(String(b.name || ""))
  )
}

describe("assistant design stacking", () => {
  it("orders layer elements by ascending z-index", () => {
    const sorted = sortByZIndex([
      {
        element_id: "2",
        category_key: "b",
        category_name: "B",
        name: "Top layer",
        value: 1,
        z_index: 5,
      },
      {
        element_id: "1",
        category_key: "a",
        category_name: "A",
        name: "Bottom layer",
        value: 2,
        z_index: 1,
      },
    ])
    expect(sorted.map((el) => el.name)).toEqual(["Bottom layer", "Top layer"])
  })
})
