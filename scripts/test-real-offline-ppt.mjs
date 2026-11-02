// Test an actual export, using the current backend source and worker, fully offline.
import fs from "node:fs/promises"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { pathToFileURL, fileURLToPath } from "node:url"
import esbuild from "esbuild"
import { chromium } from "playwright-core"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const [htmlPath, backend, directory, reference] = process.argv.slice(2)
const work = path.resolve(directory)
await fs.mkdir(work, { recursive: true })
const html = await fs.readFile(htmlPath, "utf8")
const payload = JSON.parse(html.match(/id="export-data">([\s\S]*?)<\/script>/)[1])
const sourceResult = spawnSync("python", ["-c", "import json; from app.services.offline_ppt import report_files; print(json.dumps(report_files()))"], { cwd: backend, encoding: "utf8" })
if (sourceResult.status) throw new Error(sourceResult.stderr)
payload.offline.pptReport = { ...payload.offline.pptReport, ...JSON.parse(sourceResult.stdout) }
const hydrate = value => {
  if (typeof value === "string" && value.startsWith("msimg:")) return payload.offline.images[value.slice(6)] || value
  if (Array.isArray(value)) return value.map(hydrate)
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, hydrate(item)]))
  return value
}
const input = { analysis: hydrate(payload.analysisData), studyType: payload.studyType, studyTitle: payload.studyTitle, reportSource: payload.offline.pptReport }
const runtime = html.match(/id="appeal-ppt-runtime">([\s\S]*?)<\/script>/)[1]
const worker = await esbuild.build({ entryPoints: [path.join(root, "lib/export/ppt-worker-entry.ts")], bundle: true, format: "iife", write: false })
const harness = await esbuild.build({
  stdin: { contents: 'import {buildOfflineAppealPpt} from "./lib/export/offlineAppealPpt"; window.runPpt=async input=>{ const result=await buildOfflineAppealPpt({...input,onProgress:message=>console.log(message)}); const bytes=new Uint8Array(await result.blob.arrayBuffer()); let value="";for(let i=0;i<bytes.length;i+=32768)value+=String.fromCharCode(...bytes.subarray(i,i+32768)); return {filename:result.filename,slides:result.slideCount,bytes:btoa(value)}; }', resolveDir: root },
  bundle: true, format: "iife", write: false, define: { __PPT_WORKER_SOURCE__: JSON.stringify(worker.outputFiles[0].text) },
})
await fs.writeFile(path.join(work, "harness.html"), `<!doctype html><script type="application/json" id="appeal-ppt-runtime">${runtime}</script><script>${harness.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}</script>`)
const browser = await chromium.launch({ channel: "chrome", headless: true })
try {
  const context = await browser.newContext({ offline: true })
  const page = await context.newPage()
  page.on("console", message => console.log(message.text()))
  const requests = []
  page.on("request", request => { if (/^https?:/.test(request.url())) requests.push(request.url()) })
  await page.goto(pathToFileURL(path.join(work, "harness.html")).href)
  for (const label of process.argv.includes("--repair-only") ? [] : ["cold", "warm"]) {
    const started = Date.now()
    const result = await page.evaluate(input => window.runPpt(input), input)
    await fs.writeFile(path.join(work, `dove-${label}-offline.pptx`), Buffer.from(result.bytes, "base64"))
    await fs.copyFile(reference, path.join(work, `dove-${label}-live.pptx`))
    console.log(JSON.stringify({ label, ms: Date.now() - started, slides: result.slides, filename: result.filename }))
  }
  if (requests.length) throw new Error(`Unexpected network requests: ${requests.join(",")}`)
  const compare = spawnSync("python", [path.join(root, "scripts/offline-ppt-parity.py"), "compare", "--backend", backend, "--work", work], { cwd: backend, encoding: "utf8" })
  process.stdout.write(compare.stdout)
  if (compare.status) throw new Error(compare.stderr)
  // Keep an updated copy ready for the user; only code/template files change.
  const bundle = await fs.readFile(path.join(root, "public/export-assets/configurator-bundle.js"), "utf8")
  let corrected = html.replace(/(id="export-data">)[\s\S]*?(<\/script>)/, (_, open, close) => open + JSON.stringify(payload).replace(/</g, "\\u003c") + close)
  const scripts = [...corrected.matchAll(/<script>[\s\S]*?<\/script>/g)]
  const lastScript = scripts[scripts.length - 1]
  const start = lastScript.index
  corrected = corrected.slice(0, start) + '<script>' + bundle.replace(/<\/script/gi, "<\\/script") + '</script>' + corrected.slice(start + lastScript[0].length)
  await fs.writeFile(path.join(work, "dove-fixed.html"), corrected)
  await page.goto(pathToFileURL(path.join(work, "dove-fixed.html")).href)
  await page.getByRole("button", { name: "Export analytics" }).click()
  if (!(await page.getByRole("menuitem", { name: /Export PPTX/ }).isEnabled())) throw new Error("Updated HTML did not enable PowerPoint")
  console.log("Updated actual HTML: loads successfully offline; PowerPoint enabled")
} finally { await browser.close() }
