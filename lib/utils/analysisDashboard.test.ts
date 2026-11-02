import { describe, expect, it } from "vitest"
import { getElementImageUrl, getTopBottomPerformers, isViewableImageUrl } from "@/lib/utils/analysisDashboard"

describe("offline analytics artwork", () => {
  it("treats hydrated blob URLs as viewable images", () => {
    expect(isViewableImageUrl("blob:file:///offline-artwork")).toBe(true)
  })

  it("resolves hydrated artwork for performer charts and persona blueprints", () => {
    const artwork = "blob:file:///offline-artwork"
    const analysis = {
      "Information Block": {
        Categories: [{ name: "Imagery", elements: [{ name: "Splash High", content: artwork }] }],
      },
      "(T) Overall": {
        categories: [{ name: "Imagery", elements: [{ name: "Splash High", value: 24 }] }],
      },
    }
    expect(getElementImageUrl(analysis, "Imagery", "Splash High")).toBe(artwork)
    expect(getTopBottomPerformers(analysis, "Top Down", 1).top[0].imageUrl).toBe(artwork)
  })
})
