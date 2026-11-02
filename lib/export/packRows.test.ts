import { describe, expect, it } from "vitest"
import { packRows, unpackRows } from "@/lib/export/packRows"

describe("packRows", () => {
  it("reads the backend's columns-v1 response", () => {
    expect(unpackRows({
      format: "columns-v1", count: 3, columns: [
        { name: "A", values: [null, 1, 0], bits: 2, data: "GQ==" },
        { name: "Gender", values: [null, "F", "M"], bits: 2, data: "GQ==" },
      ],
    })).toEqual([{ A: 1, Gender: "F" }, { A: 0, Gender: "M" }, { A: 1, Gender: "F" }])
  })
  it("round-trips values, types and missing cells", () => {
    const rows = [
      { Panelist: "s1", Age: 30, Gender: "female", Task: 1, A: 0, B: 1, Rating: 5, ResponseTime: 3.25 },
      { Panelist: "s1", Age: 30, Gender: "female", Task: 2, A: 1, B: 0, Rating: 2, ResponseTime: 7.9 },
      { Panelist: 2, Gender: "Male", Task: 1, A: 1, B: 1, Rating: "4", ResponseTime: 1.5, Flag: true },
    ]
    expect(unpackRows(packRows(rows))).toEqual(rows)
  })

  it("handles more than 65,536 distinct values", () => {
    const rows = Array.from({ length: 70_000 }, (_, index) => ({ ResponseTime: index + 0.5, A: index % 2 }))
    const unpacked = unpackRows(packRows(rows))
    expect(unpacked[69_999]).toEqual({ ResponseTime: 69_999.5, A: 1 })
    expect(unpacked[12_345]).toEqual(rows[12_345])
  })
})
