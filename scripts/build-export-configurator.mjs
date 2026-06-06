import esbuild from "esbuild"
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const outDir = path.join(root, "lib", "export", "generated")
const publicOutDir = path.join(root, "public", "export-assets")

fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(publicOutDir, { recursive: true })

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
  },
  banner: {
    js: "globalThis.process=globalThis.process||{env:{NODE_ENV:'production'}};",
  },
  logLevel: "info",
})

execSync(
  `npx @tailwindcss/cli -i "${path.join(root, "lib/export/export-input.css")}" -o "${path.join(outDir, "export-styles.css")}"`,
  { cwd: root, stdio: "inherit" }
)

const bundlePath = path.join(outDir, "configurator-bundle.js")
const cssPath = path.join(outDir, "export-styles.css")

fs.copyFileSync(bundlePath, path.join(publicOutDir, "configurator-bundle.js"))
fs.copyFileSync(cssPath, path.join(publicOutDir, "export-styles.css"))

console.log("Export configurator assets built.")
