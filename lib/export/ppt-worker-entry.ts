// The embedded registry is the ONLY source of runtime files. Network access is
// deliberately disabled, including implicit package downloads inside Pyodide.
const scope = globalThis as any
let python: any
let requestId = 0
const progress = (message: string) => scope.postMessage({ id: requestId, progress: message })

function decode(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

const BRIDGE = `
import json, shutil, re, inspect
from pathlib import Path
from app.services.reportgen import study as _study
from app.services.reportgen.default_report import create_default_report
from io import BytesIO
from zipfile import ZipFile
from js import offlinePptProgress

_offline_artwork = {}
_original_http_url = _study._http_url
def _local_url(value):
    return value if isinstance(value, str) and value in _offline_artwork else _original_http_url(value)
_study._http_url = _local_url

def _local_assets(study, background_url, cache):
    cache.mkdir(parents=True, exist_ok=True)
    background = _offline_artwork.get(background_url)
    if background:
        study.background_path = cache / 'background.png'
        if not study.background_path.exists() or study.background_path.read_bytes() != background.read_bytes():
            shutil.copyfile(background, study.background_path)
    for category in study.categories:
        for element in category.elements:
            source = _offline_artwork.get(element.image_url)
            if source:
                safe = re.sub(r'[^A-Za-z0-9._-]+', '_', element.name) or element.code
                element.image_path = cache / (safe + '.png')
                if not element.image_path.exists() or element.image_path.read_bytes() != source.read_bytes():
                    shutil.copyfile(source, element.image_path)
_study._download_assets = _local_assets

def _build_offline_report():
    global _offline_artwork
    request = json.loads(Path('/request/input.json').read_text())
    _offline_artwork = {url: Path(path) for url, path in request['artwork'].items()}
    options = {}
    if 'progress' in inspect.signature(create_default_report).parameters:
        options['progress'] = offlinePptProgress
    report = create_default_report(
        request['analysis'], study=request.get('constraintStudy'),
        study_type=request.get('studyType'), prepared_by=request.get('preparedBy'),
        download_images=True,
        cache_dir='/artwork-cache/elements',
        **options,
    )
    Path('/request/report.pptx').write_bytes(report.content)
    with ZipFile(BytesIO(report.content)) as archive:
        count = sum(bool(re.fullmatch(r'ppt/slides/slide[0-9]+[.]xml', name)) for name in archive.namelist())
    return json.dumps({'filename': report.filename, 'slideCount': count})

_combo_ready = False
def _ensure_combination():
    global _combo_ready
    if _combo_ready:
        return
    from app.services.reportgen import combinations as combos
    def _local_download(groups, cache):
        cache.mkdir(parents=True, exist_ok=True)
        saved = {}
        counter = 0
        def place(url):
            nonlocal counter
            if not url:
                return None
            if url in saved:
                return saved[url]
            source = _offline_artwork.get(url)
            if source is None:
                saved[url] = None
                return None
            counter += 1
            dest = cache / ('asset-%s.png' % counter)
            if not dest.exists() or dest.read_bytes() != source.read_bytes():
                shutil.copyfile(source, dest)
            saved[url] = dest
            return dest
        for group in groups:
            for build in group.builds:
                if build.background_url:
                    build.background_path = place(build.background_url)
                for element in build.elements:
                    if element.image_url:
                        element.image_path = place(element.image_url)
    combos._download = _local_download
    _combo_ready = True

def _build_offline_combination():
    global _offline_artwork
    request = json.loads(Path('/request/input.json').read_text())
    _offline_artwork = {url: Path(path) for url, path in request['artwork'].items()}
    try:
        _ensure_combination()
        from app.services.reportgen.combinations import build_combination_readout
    except ImportError as exc:
        raise RuntimeError('This file does not contain the combination PowerPoint. Export the HTML again from the updated website.') from exc
    study = request.get('study') or {}
    Path('/request/saved_combinations.json').write_text(json.dumps([request['category']]), encoding='utf-8')
    Path('/request/study_data.json').write_text(json.dumps(study), encoding='utf-8')
    analysis = request.get('analysis')
    analysis_path = None
    if isinstance(analysis, dict) and analysis:
        if isinstance(analysis.get('analysis'), dict):
            payload = dict(analysis)
            payload.setdefault('study_id', study.get('id') or '')
        else:
            payload = {'study_id': study.get('id') or '', 'analysis': analysis}
        Path('/request/analysis_data.json').write_text(json.dumps(payload), encoding='utf-8')
        analysis_path = '/request/analysis_data.json'
    build_combination_readout(
        '/request/saved_combinations.json',
        '/request/study_data.json',
        '/request/report.pptx',
        analysis_path=analysis_path,
        download_images=True,
        study_type=request.get('studyType'),
        cache_dir='/artwork-cache/combinations',
        prepared_by=request.get('preparedBy') or None,
    )
    name = str((request.get('category') or {}).get('name') or 'Category').strip() or 'Category'
    cleaned = re.sub(r'[^\\w\\s.\\-]+', '', name, flags=re.UNICODE).strip()
    cleaned = re.sub(r'\\s+', ' ', cleaned)[:80] or 'Category'
    filename = cleaned + ' Combination Readout.pptx'
    content = Path('/request/report.pptx').read_bytes()
    with ZipFile(BytesIO(content)) as archive:
        count = sum(bool(re.fullmatch(r'ppt/slides/slide[0-9]+[.]xml', item)) for item in archive.namelist())
    return json.dumps({'filename': filename, 'slideCount': count})
`

async function initialize(runtimeText: string, files: Record<string, string>) {
  progress("Loading PowerPoint engine…")
  const runtime = JSON.parse(runtimeText)
  const blobs = new Map<string, string>()
  const entries = new Map<string, Uint8Array>()
  for (const [name, data] of Object.entries(runtime.files)) entries.set(name, decode(data as string))
  const nameOf = (url: any) => String(typeof url === "string" ? url : url?.url || url).split("/").pop()!.split("?")[0]
  const blobFor = (name: string) => {
    if (!entries.has(name)) throw new Error(`Offline PowerPoint asset is missing: ${name}`)
    if (!blobs.has(name)) blobs.set(name, URL.createObjectURL(new Blob([entries.get(name)! as BlobPart], { type: "text/javascript" })))
    return blobs.get(name)!
  }
  const nativeImport = scope.importScripts.bind(scope)
  scope.importScripts = (...urls: string[]) => nativeImport(...urls.map((url) => blobFor(nameOf(url))))
  scope.fetch = async (url: any) => {
    const name = nameOf(url)
    const data = entries.get(name)
    if (!data) throw new Error(`Offline PowerPoint blocked an external request: ${name}`)
    return new Response(data as BlobPart, { headers: { "Content-Type": name.endsWith(".wasm") ? "application/wasm" : "application/octet-stream" } })
  }
  nativeImport(blobFor("pyodide.js"))
  python = await scope.loadPyodide({ indexURL: "https://offline-ppt.invalid/", packages: ["pillow", "lxml"], stdout: () => {}, stderr: () => {} })
  for (const [name, bytes] of entries) {
    if (/^(python_pptx|xlsxwriter|typing_extensions)-.*\.whl$/i.test(name)) python.unpackArchive(bytes, "zip", { extractDir: "/home/pyodide/deps" })
  }
  python.FS.mkdirTree("/home/pyodide/app/services/reportgen")
  for (const path of ["app/__init__.py", "app/services/__init__.py"]) python.FS.writeFile(`/home/pyodide/${path}`, "")
  for (const [name, data] of Object.entries(files)) {
    const target = `/home/pyodide/app/services/reportgen/${name}`
    python.FS.mkdirTree(target.slice(0, target.lastIndexOf("/")))
    python.FS.writeFile(target, decode(data))
  }
  python.runPython("import sys; sys.path.insert(0, '/home/pyodide'); sys.path.insert(0, '/home/pyodide/deps')")
  scope.offlinePptProgress = (message: string) => progress(message)
  python.runPython(BRIDGE)
  for (const url of blobs.values()) URL.revokeObjectURL(url)
  entries.clear()
}

scope.onmessage = async ({ data }: any) => {
  requestId = data.id
  try {
    if (data.type === "initialize") {
      await initialize(data.runtime, data.files)
      scope.postMessage({ id: requestId })
    } else if (data.type === "build") {
      progress("Creating your PowerPoint…")
      python.runPython("shutil.rmtree('/request', ignore_errors=True)")
      python.FS.mkdirTree("/request/artwork")
      const artwork: Record<string, string> = {}
      data.input.artwork.forEach((image: any, index: number) => {
        const target = `/request/artwork/${index}.png`
        python.FS.writeFile(target, image.bytes)
        artwork[image.url] = target
      })
      python.FS.writeFile("/request/input.json", JSON.stringify({ ...data.input, artwork }))
      const result = JSON.parse(python.runPython("_build_offline_report()"))
      const bytes = python.FS.readFile("/request/report.pptx").slice()
      scope.postMessage({ id: requestId, ...result, bytes: bytes.buffer }, [bytes.buffer])
      python.runPython("shutil.rmtree('/request', ignore_errors=True)")
    } else if (data.type === "combination") {
      progress("Building combination slides…")
      python.runPython("shutil.rmtree('/request', ignore_errors=True)")
      python.FS.mkdirTree("/request/artwork")
      const artwork: Record<string, string> = {}
      data.input.artwork.forEach((image: any, index: number) => {
        const target = `/request/artwork/${index}.png`
        python.FS.writeFile(target, image.bytes)
        artwork[image.url] = target
      })
      python.FS.writeFile("/request/input.json", JSON.stringify({ ...data.input, artwork }))
      const result = JSON.parse(python.runPython("_build_offline_combination()"))
      const bytes = python.FS.readFile("/request/report.pptx").slice()
      scope.postMessage({ id: requestId, ...result, bytes: bytes.buffer }, [bytes.buffer])
      python.runPython("shutil.rmtree('/request', ignore_errors=True)")
    }
  } catch (error: any) {
    scope.postMessage({ id: requestId, error: error?.message || String(error) })
  }
}

export {}
