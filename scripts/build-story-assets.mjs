// One-off: convert the selected Web-Optimized PNG layers used by the landing
// "story" section into optimized webp under public/landing-page/story/.
//
// Run:  node scripts/build-story-assets.mjs
import { readdir, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const SRC = path.join(ROOT, "Web-Optimized")
const OUT = path.join(ROOT, "public", "landing-page", "story")

// Layer type -> list of asset names (without extension) we need as webp.
const NEEDED = {
  Bottle: ["mink", "sage", "periwinkle", "terracotta", "rosewood"],
  Element: ["flame", "leaf", "drop", "mineral", "ice"],
  Product: ["shampoo", "moisturiser", "bodywash", "handwash", "deodorant"],
  Proposition: ["revives", "nourishes", "hydrates", "protects", "freshens"],
  Pump: ["A-light"],
}

async function run() {
  for (const [type, names] of Object.entries(NEEDED)) {
    const outDir = path.join(OUT, type.toLowerCase())
    if (!existsSync(outDir)) await mkdir(outDir, { recursive: true })
    for (const name of names) {
      const src = path.join(SRC, type, `${name}.png`)
      if (!existsSync(src)) {
        console.error(`  MISSING: ${src}`)
        continue
      }
      const dest = path.join(outDir, `${name}.webp`)
      // Keep the full square canvas (no trim) so every layer stays perfectly
      // registered with the others when stacked.
      await sharp(src)
        .webp({ quality: 82, effort: 5 })
        .toFile(dest)
      console.log(`  ${type}/${name}.png -> story/${type.toLowerCase()}/${name}.webp`)
    }
  }
  console.log("Done.")
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
