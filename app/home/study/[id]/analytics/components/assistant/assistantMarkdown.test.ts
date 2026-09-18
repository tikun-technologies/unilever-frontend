import { describe, expect, it } from "vitest"
import { splitMarkdownBold } from "./assistantMarkdown"

describe("splitMarkdownBold", () => {
  it("turns **pairs** into bold segments without leftover stars", () => {
    const parts = splitMarkdownBold(
      "**B16 — HEADLINE - Visit Our Booth for 50 Off** — **26.0** [E1]"
    )
    expect(parts).toEqual([
      { bold: true, value: "B16 — HEADLINE - Visit Our Booth for 50 Off" },
      { bold: false, value: " — " },
      { bold: true, value: "26.0" },
      { bold: false, value: " [E1]" },
    ])
    expect(parts.some((part) => part.value.includes("*"))).toBe(false)
  })
})
