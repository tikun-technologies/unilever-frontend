import esbuild from "esbuild"
import postcss from "postcss"
import tailwindcss from "@tailwindcss/postcss"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const outDir = path.join(root, "lib", "export", "generated")
const publicOutDir = path.join(root, "public", "export-assets")

fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(publicOutDir, { recursive: true })

const worker = await esbuild.build({
  entryPoints: [path.join(root, "lib/export/analysis-worker-entry.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  write: false,
  minify: true,
  alias: {
    "@": root,
  },
  logLevel: "warning",
})
const workerSource = worker.outputFiles[0].text
const pptWorker = await esbuild.build({
  entryPoints: [path.join(root, "lib/export/ppt-worker-entry.ts")],
  bundle: true, format: "iife", platform: "browser", target: ["es2020"],
  write: false, minify: true, logLevel: "warning",
})
const runtimeFolder = path.join(root, "lib/export/ppt-runtime")
const runtimeManifest = JSON.parse(fs.readFileSync(path.join(runtimeFolder, "manifest.json"), "utf8"))
const runtimeFiles = {}
for (const name of ["pyodide.js", "pyodide.asm.js", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"]) {
  runtimeFiles[name] = fs.readFileSync(path.join(root, "node_modules/pyodide", name)).toString("base64")
}
for (const [name, expectedHash] of Object.entries(runtimeManifest.files)) {
  const bytes = fs.readFileSync(path.join(runtimeFolder, name))
  if (crypto.createHash("sha256").update(bytes).digest("hex") !== expectedHash) throw new Error(`PPT runtime integrity check failed: ${name}`)
  runtimeFiles[name] = bytes.toString("base64")
}
fs.writeFileSync(path.join(publicOutDir, "appeal-ppt-runtime.json"), JSON.stringify({ version: runtimeManifest.version, files: runtimeFiles }))

await esbuild.build({
  entryPoints: [path.join(root, "lib/export/export-configurator-entry.tsx")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  outfile: path.join(outDir, "configurator-bundle.js"),
  jsx: "automatic",
  minify: true,
  sourcemap: false,
  alias: {
    "@": root,
  },
  loader: {
    ".tsx": "tsx",
    ".ts": "ts",
  },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_BRAND_NAME": JSON.stringify(process.env.NEXT_PUBLIC_BRAND_NAME || "mindsurve"),
    __ANALYSIS_WORKER_SOURCE__: JSON.stringify(workerSource),
    __PPT_WORKER_SOURCE__: JSON.stringify(pptWorker.outputFiles[0].text),
  },
  banner: {
    js: "globalThis.process=globalThis.process||{env:{NODE_ENV:'production'}};",
  },
  logLevel: "info",
})

const cssInputPath = path.join(root, "lib/export/export-input.css")
const cssOutputPath = path.join(outDir, "export-styles.css")
const cssResult = await postcss([tailwindcss()]).process(fs.readFileSync(cssInputPath, "utf8"), {
  from: cssInputPath,
  to: cssOutputPath,
})
fs.writeFileSync(cssOutputPath, cssResult.css)

const bundlePath = path.join(outDir, "configurator-bundle.js")
const cssPath = cssOutputPath

fs.copyFileSync(bundlePath, path.join(publicOutDir, "configurator-bundle.js"))
fs.copyFileSync(cssPath, path.join(publicOutDir, "export-styles.css"))

console.log("Export configurator assets built.")
