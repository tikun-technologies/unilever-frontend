"""Reference generation and structural/pixel comparison for browser PPT tests."""
import argparse
import base64
from copy import deepcopy
from io import BytesIO
import json
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch
from zipfile import ZipFile

parser = argparse.ArgumentParser()
parser.add_argument("mode", choices=["prepare", "compare"])
parser.add_argument("--backend", required=True)
parser.add_argument("--work", required=True)
args = parser.parse_args()
sys.path.insert(0, args.backend)
work = Path(args.work)
work.mkdir(parents=True, exist_ok=True)
tempfile.tempdir = str(work)

if args.mode == "prepare":
    from app.services.offline_ppt import report_files
    from app.services.reportgen.default_report import create_default_report
    fixtures = json.loads((Path(__file__).parent.parent / "lib/analysis-engine/fixtures/golden.json").read_text())
    selected = []
    for kind in ["grid", "layer", "text", "hybrid", "video"]:
        case = next(item for item in fixtures if item["input"]["study"]["study_type"] == kind and (item.get("expected") or {}).get("(T) Overall", {}).get("categories"))
        selected.append((kind, case, False))
    selected.append(("layer-artwork-constraints", selected[1][1], True))
    selected.append(("grid-artwork", selected[0][1], True))
    # Include a recomputed cohort/settings case rather than a full-base-only test.
    filtered = next(item for item in fixtures if item["input"].get("filters") and (item.get("expected") or {}).get("(T) Overall", {}).get("categories"))
    selected.append(("filtered-settings", filtered, False))
    source = report_files()
    image_bytes = (Path(args.backend) / "app/services/reportgen/template_assets/mga_logo.png").read_bytes()
    image_data = "data:image/png;base64," + base64.b64encode(image_bytes).decode()
    outputs = []
    for name, case, artwork in selected:
        analysis = deepcopy(case["expected"])
        kind = case["input"]["study"]["study_type"]
        constraint = None
        if artwork:
            for category in analysis["Information Block"]["Categories"]:
                for element in category["elements"]:
                    element["content"] = "https://parity.invalid/asset.png"
            analysis["Information Block"]["Study Background"] = "https://parity.invalid/background.png"
            analysis["Front Page"]["Background"] = "https://parity.invalid/background.png"
            cats = analysis["(T) Overall"]["categories"]
            layers = [{"images": [{"image_id": element["code"], "name": element["name"]} for element in category["elements"]]} for category in cats]
            constraint = {"layers": layers, "design_constraints": [{"anchors": [{"image_id": cats[0]["elements"][0]["code"]}], "blocked": [{"image_id": cats[1]["elements"][0]["code"]}]}]}
        def fetch_local(dest, url):
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(image_bytes)
        with patch("app.services.reportgen.study.fetch_image", fetch_local):
            report = create_default_report(analysis, study=constraint, study_type=kind, prepared_by="Analyst | analyst@example.test", download_images=artwork)
        (work / f"{name}-live.pptx").write_bytes(report.content)
        if artwork:
            for category in analysis["Information Block"]["Categories"]:
                for element in category["elements"]:
                    element["content"] = image_data
            analysis["Information Block"]["Study Background"] = image_data
            analysis["Front Page"]["Background"] = image_data
        outputs.append({"name": name, "analysis": analysis, "studyTitle": case["input"]["study"]["title"], "studyType": kind, "reportSource": {**source, "preparedBy": "Analyst | analyst@example.test", "constraintStudy": constraint}})
    (work / "fixtures.json").write_text(json.dumps(outputs), encoding="utf-8")
    print(json.dumps({"prepared": len(outputs), "sourceHash": source["sha256"]}))
else:
    from lxml import etree
    from PIL import Image, ImageChops
    results = []
    for path in sorted(work.glob("*-live.pptx")):
        name = path.name.removesuffix("-live.pptx")
        offline = work / f"{name}-offline.pptx"
        if not offline.exists():
            raise AssertionError(f"Missing browser deck: {name}")
        with ZipFile(path) as live, ZipFile(offline) as browser:
            expected = {entry for entry in live.namelist() if entry.startswith("ppt/") and entry.endswith((".xml", ".rels"))}
            actual = {entry for entry in browser.namelist() if entry.startswith("ppt/") and entry.endswith((".xml", ".rels"))}
            assert expected == actual, f"{name}: package parts differ"
            for entry in sorted(expected):
                left = etree.tostring(etree.fromstring(live.read(entry)), method="c14n")
                right = etree.tostring(etree.fromstring(browser.read(entry)), method="c14n")
                if left != right:
                    (work / "difference-live.xml").write_bytes(left)
                    (work / "difference-offline.xml").write_bytes(right)
                    raise AssertionError(f"{name}: differs in {entry}")
            media = [entry for entry in live.namelist() if entry.startswith("ppt/media/")]
            for entry in media:
                left = Image.open(BytesIO(live.read(entry))).convert("RGBA")
                right = Image.open(BytesIO(browser.read(entry))).convert("RGBA")
                assert left.size == right.size and left.tobytes() == right.tobytes(), f"{name}: image pixels differ: {entry}"
            slides = sum(1 for entry in expected if entry.startswith("ppt/slides/slide") and entry.endswith(".xml"))
            results.append({"name": name, "slides": slides, "xmlParts": len(expected), "images": len(media), "identical": True})
    print(json.dumps(results, indent=2))
