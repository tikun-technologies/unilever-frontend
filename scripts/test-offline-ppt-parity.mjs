// Usage: node scripts/test-offline-ppt-parity.mjs <backend> <work directory> <playwright-core path>
import fs from "node:fs/promises"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { pathToFileURL, fileURLToPath } from "node:url"
import esbuild from "esbuild"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const [backend, workArg, playwrightPath = "playwright-core"] = process.argv.slice(2)
const work = path.resolve(workArg)
await fs.mkdir(work, { recursive: true })
function references(mode) {
  const result = spawnSync("python", [path.join(root, "scripts/offline-ppt-parity.py"), mode, "--backend", backend, "--work", work], { cwd: backend, encoding: "utf8" })
  process.stdout.write(result.stdout)
  if (result.status !== 0) throw new Error(result.stderr)
}
if (!process.argv.includes("--reuse")) references("prepare")
const worker = await esbuild.build({ entryPoints: [path.join(root, "lib/export/ppt-worker-entry.ts")], bundle: true, format: "iife", write: false })
const harness = await esbuild.build({
  stdin: { contents: 'import {buildOfflineAppealPpt} from "./lib/export/offlineAppealPpt"; window.runPpt = async (input) => { const result=await buildOfflineAppealPpt({...input,onProgress: message => console.log(message)}); const bytes=new Uint8Array(await result.blob.arrayBuffer()); let binary=""; for(let i=0;i<bytes.length;i+=32768) binary+=String.fromCharCode(...bytes.subarray(i,i+32768)); return {filename:result.filename,slideCount:result.slideCount,bytes:btoa(binary)}; }', resolveDir: root },
  bundle: true, format: "iife", write: false,
  define: { __PPT_WORKER_SOURCE__: JSON.stringify(worker.outputFiles[0].text) },
})
const runtime = await fs.readFile(path.join(root, "public/export-assets/appeal-ppt-runtime.json"), "utf8")
const html = `<!doctype html><script type="application/json" id="appeal-ppt-runtime">${runtime}</script><script>${harness.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}</script>`
await fs.writeFile(path.join(work, "harness.html"), html)
const { chromium } = await import(path.isAbsolute(playwrightPath) ? pathToFileURL(path.join(playwrightPath, "index.mjs")).href : playwrightPath)
await fs.mkdir(path.join(work, "downloads"), { recursive: true })
const browser = await chromium.launch({ channel: "chrome", headless: true, downloadsPath: path.join(work, "downloads") })
try {
  const context = await browser.newContext({ offline: true })
  const page = await context.newPage()
  await page.addInitScript(() => {
    const original = URL.createObjectURL.bind(URL)
    window.downloadBlobs = new Map()
    URL.createObjectURL = blob => {
      const url = original(blob)
      window.downloadBlobs.set(url, blob)
      return url
    }
  })
  page.on("console", message => console.log(`browser: ${message.text()}`))
  page.on("pageerror", error => console.error(error))
  const requests = []
  page.on("request", request => { if (/^https?:/.test(request.url())) requests.push(request.url()) })
  await page.goto(pathToFileURL(path.join(work, "harness.html")).href)
  const fixtures = JSON.parse(await fs.readFile(path.join(work, "fixtures.json"), "utf8"))
  for (const fixture of process.argv.includes("--ui-only") ? [] : fixtures) {
    const started = Date.now()
    const result = await page.evaluate(input => window.runPpt(input), fixture)
    await fs.writeFile(path.join(work, `${fixture.name}-offline.pptx`), Buffer.from(result.bytes, "base64"))
    console.log(JSON.stringify({ name: fixture.name, slides: result.slideCount, ms: Date.now() - started }))
  }
  // Exercise the actual self-contained analytics UI and download button too.
  const fixture = fixtures[0]
  const settings = { top: { hundred: [4, 5], zero: [1, 2, 3] }, bottom: { hundred: [1, 2], zero: [3, 4, 5] }, regression: { include_intercept: true }, exclude_constant_raters: false }
  const payload = {
    studyId: "offline-parity", studyTitle: fixture.studyTitle, studyType: fixture.studyType,
    exportedAt: new Date().toISOString(), analysisData: fixture.analysis,
    savedDesigns: { configurator: [], input: [] }, designCategories: [],
    offline: { study: { title: fixture.studyTitle, study_type: fixture.studyType }, rows: [], settings,
      settingsSnapshot: { study_id: "offline-parity", settings, defaults: settings, is_default: true, max_rating: 5 },
      classificationQuestions: [], pptReport: fixture.reportSource },
  }
  const [bundle, css] = await Promise.all(["configurator-bundle.js", "export-styles.css"].map(name => fs.readFile(path.join(root, "public/export-assets", name), "utf8")))
  const uiHtml = `<!doctype html><style>${css}</style><div id="export-root"></div><script type="application/json" id="export-data">${JSON.stringify(payload).replace(/</g, "\\u003c")}</script><script type="application/json" id="appeal-ppt-runtime">${runtime}</script><script>${bundle.replace(/<\/script/gi, "<\\/script")}</script>`
  await fs.writeFile(path.join(work, "analytics.html"), uiHtml)
  await page.goto(pathToFileURL(path.join(work, "analytics.html")).href)
  await page.getByRole("button", { name: "Export analytics" }).click()
  const downloading = page.waitForEvent("download", { timeout: 180_000 })
  await page.getByRole("menuitem", { name: /Export PPTX/ }).click()
  const download = await downloading
  console.log(`Download: ${download.suggestedFilename()} (${download.url()})`)
  const failure = await download.failure()
  if (failure === "canceled") {
    // Some managed Windows environments cancel even a one-byte text download.
    // Verify the exact Blob handed to the native download in that environment.
    const bytes = await page.evaluate(async url => {
      const blob = window.downloadBlobs.get(url)
      if (blob?.type !== "application/vnd.openxmlformats-officedocument.presentationml.presentation") throw new Error("Missing native PPTX download Blob")
      const buffer = new Uint8Array(await blob.arrayBuffer())
      let text = ""
      for (let i = 0; i < buffer.length; i += 32768) text += String.fromCharCode(...buffer.subarray(i, i + 32768))
      return btoa(text)
    }, download.url())
    await fs.writeFile(path.join(work, "grid-ui-offline.pptx"), Buffer.from(bytes, "base64"))
    console.log("Managed browser canceled the disk write; verified the exact native download Blob instead")
  } else if (failure) throw new Error(`Production download failed: ${failure}`)
  else await download.saveAs(path.join(work, "grid-ui-offline.pptx"))
  await fs.copyFile(path.join(work, "grid-live.pptx"), path.join(work, "grid-ui-live.pptx"))
  console.log("Production HTML Export PPTX button: valid PPTX generated and handed to download while offline")
  if (requests.length) throw new Error(`Unexpected external requests: ${requests.join(", ")}`)
  references("compare")
} finally { await browser.close() }
