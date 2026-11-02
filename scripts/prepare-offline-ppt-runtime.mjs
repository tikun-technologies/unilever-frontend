// One-time dependency preparation. Normal builds and exported HTML never use a CDN.
import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const target = path.join(root, "lib/export/ppt-runtime")
const version = "0.29.0"
const lock = JSON.parse(await fs.readFile(path.join(root, "node_modules/pyodide/pyodide-lock.json"), "utf8"))
await fs.mkdir(target, { recursive: true })
const manifest = { version, files: {} }
async function save(name, url, expectedHash) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Cannot prepare ${name}: ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const digest = crypto.createHash("sha256").update(bytes).digest("hex")
  if (digest !== expectedHash) throw new Error(`Integrity check failed: ${name}`)
  await fs.writeFile(path.join(target, name), bytes)
  manifest.files[name] = digest
}
for (const name of ["pillow", "lxml"]) {
  const entry = lock.packages[name]
  await save(entry.file_name, `https://cdn.jsdelivr.net/pyodide/v${version}/full/${entry.file_name}`, entry.sha256)
}
for (const [name, version] of [["python-pptx", "1.0.2"], ["XlsxWriter", "3.2.9"], ["typing_extensions", "4.15.0"]]) {
  const metadata = await (await fetch(`https://pypi.org/pypi/${name}/${version}/json`)).json()
  const wheel = metadata.urls.find((file) => file.filename.endsWith("none-any.whl"))
  if (!wheel) throw new Error(`Missing pure Python wheel for ${name}`)
  await save(wheel.filename, wheel.url, wheel.digests.sha256)
}
await fs.writeFile(path.join(target, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n")
console.log(`Prepared pinned offline PPT runtime in ${target}`)
