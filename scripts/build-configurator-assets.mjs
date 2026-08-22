// Convert every Web-Optimized PNG (including Background.png) into webp under
// public/landing-page/configurator/ for the design configurator.
//
// Run:  node scripts/build-configurator-assets.mjs
import { readdir, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const SRC = path.join(ROOT, "Web-Optimized")
const OUT = path.join(ROOT, "public", "landing-page", "configurator")

const FOLDERS = ["Bottle", "Element", "Product", "Proposition", "Pump"]

async function convertPng(src, dest) {
  await sharp(src).webp({ quality: 82, effort: 5 }).toFile(dest)
}

async function run() {
  if (!existsSync(OUT)) await mkdir(OUT, { recursive: true })

  const bgSrc = path.join(SRC, "Background.png")
  if (existsSync(bgSrc)) {
    const dest = path.join(OUT, "background.webp")
    await convertPng(bgSrc, dest)
    console.log(`  Background.png -> configurator/background.webp`)
  } else {
    console.error(`  MISSING: ${bgSrc}`)
  }

  for (const folder of FOLDERS) {
    const srcDir = path.join(SRC, folder)
    const outDir = path.join(OUT, folder.toLowerCase())
    if (!existsSync(srcDir)) {
      console.error(`  MISSING FOLDER: ${srcDir}`)
      continue
    }
    if (!existsSync(outDir)) await mkdir(outDir, { recursive: true })

    const files = (await readdir(srcDir)).filter((f) => f.toLowerCase().endsWith(".png"))
    for (const file of files) {
      const name = path.basename(file, ".png")
      const src = path.join(srcDir, file)
      const dest = path.join(outDir, `${name}.webp`)
      await convertPng(src, dest)
      console.log(`  ${folder}/${file} -> configurator/${folder.toLowerCase()}/${name}.webp`)
    }
  }

  console.log("Done.")
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
