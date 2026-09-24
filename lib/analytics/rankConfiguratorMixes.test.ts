import { describe, expect, it } from "vitest"
import { rankConfiguratorMixes, type MixCategory } from "./rankConfiguratorMixes"

function category(key: string, values: number[], zIndex = 0): MixCategory {
  return {
    key,
    name: key,
    zIndex,
    elements: values.map((value, index) => ({
      id: `${key}-${index}`,
      name: `${key}${index + 1}`,
      value,
    })),
  }
}

describe("rankConfiguratorMixes", () => {
  it("ranks the best grid mix first and the next swaps after it", () => {
    const mixes = rankConfiguratorMixes({
      isLayer: false,
      categories: [
        category("A", [50, 10]),
        category("B", [40]),
        category("C", [30]),
        category("D", [20]),
        category("E", [19]),
      ],
    })

    expect(mixes).toHaveLength(5)
    expect(mixes[0].score).toBe(140)
    expect(mixes[0].selection).toEqual({ A: "A-0", B: "B-0", C: "C-0", D: "D-0" })
    expect(mixes[1].score).toBe(139)
    expect(mixes[1].selection).toEqual({ A: "A-0", B: "B-0", C: "C-0", E: "E-0" })
    expect(mixes[2].score).toBe(129)
    expect(mixes[2].selection).toEqual({ A: "A-0", B: "B-0", D: "D-0", E: "E-0" })
    expect(mixes.map((mix) => mix.rank)).toEqual([1, 2, 3, 4, 5])
    expect(new Set(mixes.map((mix) => JSON.stringify(mix.selection))).size).toBe(5)
  })

  it("keeps every layer in an unconstrained stack and steps down one element", () => {
    const mixes = rankConfiguratorMixes({
      isLayer: true,
      categories: [
        category("L1", [20, 5], 1),
        category("L2", [15, 14], 2),
      ],
    })

    expect(mixes[0].selection).toEqual({ L1: "L1-0", L2: "L2-0" })
    expect(mixes[0].score).toBe(35)
    expect(mixes[1].score).toBe(34)
    expect(mixes[1].selection).toEqual({ L1: "L1-0", L2: "L2-1" })
  })

  it("skips blocked layer pairings when ranking the top mixes", () => {
    const mixes = rankConfiguratorMixes({
      isLayer: true,
      designConstraints: [
        {
          name: "block",
          anchors: [{ layer_id: "layer-1", image_id: "image-good" }],
          blocked: [{ layer_id: "layer-2", image_id: "image-blocked" }],
        },
      ],
      categories: [
        {
          key: "L1",
          name: "L1",
          zIndex: 0,
          elements: [
            { id: "good", name: "Good", value: 20, layerId: "layer-1", imageId: "image-good" },
            { id: "weak", name: "Weak", value: 1, layerId: "layer-1", imageId: "image-weak" },
          ],
        },
        {
          key: "L2",
          name: "L2",
          zIndex: 1,
          elements: [
            { id: "blocked", name: "Blocked", value: 100, layerId: "layer-2", imageId: "image-blocked" },
            { id: "ok", name: "Ok", value: 15, layerId: "layer-2", imageId: "image-ok" },
          ],
        },
      ],
    })

    expect(mixes[0].selection).toEqual({ L1: "weak", L2: "blocked" })
    expect(mixes[0].score).toBe(101)
    expect(mixes.some((mix) => mix.selection.L1 === "good" && mix.selection.L2 === "ok")).toBe(true)
    expect(mixes.some((mix) => mix.selection.L1 === "good" && mix.selection.L2 === "blocked")).toBe(false)
  })
})
