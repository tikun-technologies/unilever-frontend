"""Profile the canonical report against a real exported HTML, with no network."""
import argparse
import base64
import cProfile
import json
from pathlib import Path
import pstats
import re
import sys
import tempfile
import time
from unittest.mock import patch

parser = argparse.ArgumentParser()
parser.add_argument("html")
parser.add_argument("--backend", required=True)
parser.add_argument("--work", required=True)
args = parser.parse_args()
sys.path.insert(0, args.backend)
work = Path(args.work)
work.mkdir(parents=True, exist_ok=True)
tempfile.tempdir = str(work)
payload = json.loads(re.search(r'id="export-data">([\s\S]*?)</script>', Path(args.html).read_text(encoding="utf-8")).group(1))
images = payload["offline"].get("images", {})
artwork = {}
def hydrate(value):
    if isinstance(value, str) and value.startswith("msimg:"):
        key = value.removeprefix("msimg:")
        if key in images:
            url = f"https://offline-artwork.invalid/{key}.png"
            artwork[url] = base64.b64decode(images[key].split(",", 1)[1])
            return url
    if isinstance(value, list):
        return [hydrate(item) for item in value]
    if isinstance(value, dict):
        return {key: hydrate(item) for key, item in value.items()}
    return value
analysis = hydrate(payload["analysisData"])
source = payload["offline"]["pptReport"]
if source.get("mainQuestion"):
    analysis.setdefault("Front Page", {})["Main Question"] = source["mainQuestion"]

from app.services.reportgen.default_report import create_default_report
from app.services.reportgen import build
from app.services.offline_ppt import report_files
(work / "report-source.json").write_text(json.dumps({**source, **report_files()}), encoding="utf-8")
for name in ["_inventory", "_build", "_build_low", "_build_compare", "_category_winner_slides", "_category_slides", "_lift_tables", "_asset_slides"]:
    original = getattr(build, name)
    def measured(*values, _name=name, _original=original, **options):
        start = time.perf_counter()
        print(f"start {_name}", flush=True)
        result = _original(*values, **options)
        print(f"done {_name} {time.perf_counter() - start:.2f}s", flush=True)
        return result
    setattr(build, name, measured)

def fetch_local(destination, url):
    if url not in artwork:
        raise ValueError("Unembedded source image")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(artwork[url])

start = time.perf_counter()
profile = cProfile.Profile()
with patch("app.services.reportgen.study.fetch_image", fetch_local):
    profile.enable()
    report = create_default_report(analysis, study=source.get("constraintStudy"), study_type=payload["studyType"], prepared_by=source.get("preparedBy"))
    profile.disable()
(work / "dove-live.pptx").write_bytes(report.content)
profile.dump_stats(str(work / "dove.prof"))
pstats.Stats(profile).sort_stats("cumulative").print_stats(40)
print(f"Total: {time.perf_counter() - start:.2f}s; bytes={len(report.content)}", flush=True)
