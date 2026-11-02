"""Build golden analysis reports from the Python service for the TypeScript engine.

Run from the frontend repo:

    python scripts/analysis-engine-golden.py
"""

from __future__ import annotations

import json
import math
import random
from copy import deepcopy
import sys
import types
from pathlib import Path

config = types.ModuleType("app.core.config")
config.settings = types.SimpleNamespace(REDIS_URL=None, REDIS_MAX_CONNECTIONS=1)
sys.modules["app.core.config"] = config
sys.path.insert(0, r"D:\TikunTech\uniliverimagestudy")

import numpy as np
import pandas as pd

from app.services.analysis import StudyAnalysisService
from app.services.analysis_settings import default_analysis_settings

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "lib" / "analysis-engine" / "fixtures" / "golden.json"


def sanitize(value):
    if isinstance(value, dict):
        return {str(key): sanitize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [sanitize(item) for item in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        number = float(value)
        if math.isnan(number) or math.isinf(number):
            return None
        return number
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    return value


def grid_study():
    categories = [
        {"id": "scent", "name": "Scent", "order": 0},
        {"id": "bottle", "name": "Bottle", "order": 1},
        {"id": "claim", "name": "Claim", "order": 2},
    ]
    elements = []
    for category in categories:
        for index, label in enumerate(["Alpha", "Beta", "Gamma"]):
            elements.append(
                {
                    "id": f"{category['id']}-{index}",
                    "name": f"{category['name']} {label}",
                    "content": label,
                    "category_id": category["id"],
                    "category": {"name": category["name"], "order": category["order"]},
                }
            )
    questions = [
        {
            "question_id": "Q1",
            "question_text": "How often do you buy fragrance?",
            "optional_classification_question": False,
        },
        {
            "question_id": "Q2",
            "question_text": "Budget",
            "optional_classification_question": True,
        },
    ]
    study = {
        "title": "Grid scent study",
        "main_question": "How much do you like this?",
        "background": "Pilot",
        "language": "en",
        "launched_at": "2026-01-01T00:00:00",
        "aspect_ratio": "1:1",
        "study_type": "grid",
        "categories": categories,
        "elements": elements,
        "classification_questions": questions,
    }
    return study, elements


def grid_rows(seed=7, people=24, tasks=12):
    study, elements = grid_study()
    rng = random.Random(seed)
    utilities = {element["name"]: rng.uniform(-6, 6) for element in elements}
    ages = [16, 22, 29, 40, 50, 60, 70, "13-18", None, 12]
    genders = ["Female", "Male", "female ", "M", "Other", None, " Female"]
    often = ["Often", "Rarely", "Never"]
    budget = ["Low", "High"]
    rows = []
    element_keys = [f"{element['category']['name']}_{element['name']}" for element in elements]
    for person in range(1, people + 1):
        age = ages[(person - 1) % len(ages)]
        gender = genders[(person - 1) % len(genders)]
        answer = often[(person - 1) % len(often)]
        spend = budget[(person - 1) % len(budget)]
        for task in range(1, tasks + 1):
            row = {key: 0 for key in element_keys}
            shown = rng.sample(study["categories"], 2)
            score = 0.0
            for category in shown:
                options = [element for element in elements if element["category_id"] == category["id"]]
                pick = rng.choice(options)
                row[f"{category['name']}_{pick['name']}"] = 1
                score += utilities[pick["name"]]
            if person == people:
                rating = 3
            else:
                rating = int(max(1, min(5, round(3 + score / 8))))
            response = 0.15 + (person % 5) * 0.45
            if rating <= 2:
                response += 1.4
            if person == 2 and task == 1:
                response = 8.5
            row.update(
                {
                    "Panelist": person,
                    "Gender": gender,
                    "Age": age,
                    "Task": task,
                    "Rating": rating,
                    "ResponseTime": response,
                    "How often do you buy fragrance?": answer,
                    "Budget": spend,
                }
            )
            rows.append(row)
    return study, rows


def layer_case():
    rng = random.Random(11)
    categories = []
    elements = []
    for index, name in enumerate(["Cap", "Liquid", "Label"]):
        category_id = f"layer-{index}"
        categories.append(
            {
                "id": category_id,
                "name": name,
                "order": index,
                "z_index": index + 1,
                "transform": {"x": index, "y": 0, "width": 100, "height": 20},
            }
        )
        for image_index, label in enumerate(["Red", "Gold", "Clear"]):
            elements.append(
                {
                    "id": f"{name}-{label}",
                    "name": f"{name} {label}",
                    "content": f"https://example.com/{name}-{label}.png",
                    "category_id": category_id,
                    "category": {"name": name, "order": index, "z_index": index + 1},
                    "z_index": index + 1,
                    "transform": {"x": index, "y": 0, "width": 100, "height": 20},
                    "layer_name": name,
                    "layer_order": index,
                    "image_order": image_index,
                    "alt_text": label,
                }
            )
    utilities = {element["name"]: rng.uniform(-5, 5) for element in elements}
    rows = []
    keys = [f"{element['category']['name']}_{element['name']}" for element in elements]
    for person in range(1, 17):
        for task in range(1, 11):
            row = {key: 0 for key in keys}
            score = 0.0
            for category in categories:
                options = [element for element in elements if element["category_id"] == category["id"]]
                pick = rng.choice(options)
                row[f"{category['name']}_{pick['name']}"] = 1
                score += utilities[pick["name"]]
            rating = int(max(1, min(5, round(3 + score / 7))))
            row.update(
                {
                    "Panelist": person,
                    "Gender": "Female" if person % 2 == 0 else "Male",
                    "Age": 20 + (person % 40),
                    "Task": task,
                    "Rating": rating,
                    "ResponseTime": 0.4 + (task % 4) * 0.35,
                }
            )
            rows.append(row)
    study = {
        "title": "Layer bottle study",
        "main_question": "How appealing is this bottle?",
        "background": "Layer pilot",
        "language": "en",
        "launched_at": "2026-02-01",
        "aspect_ratio": "3:4",
        "study_type": "layer",
        "categories": categories,
        "elements": elements,
        "classification_questions": [],
    }
    return {"name": "layer-collinear", "maxRating": 5, "includeRawData": False, "analysisOptions": None, "filters": None, "study": study, "rows": rows}


def seven_point_case():
    rng = random.Random(19)
    categories = [{"id": "tone", "name": "Tone", "order": 0}, {"id": "pace", "name": "Pace", "order": 1}]
    elements = []
    for category in categories:
        for index, label in enumerate(["One", "Two", "Three"]):
            elements.append(
                {
                    "id": f"{category['id']}-{index}",
                    "name": f"{label}",
                    "content": label,
                    "category_id": category["id"],
                    "category": {"name": category["name"], "order": category["order"]},
                }
            )
    rows = []
    keys = [f"{element['category']['name']}_{element['name']}" for element in elements]
    for person in range(1, 13):
        for task in range(1, 9):
            row = {key: 0 for key in keys}
            for category in categories:
                options = [element for element in elements if element["category_id"] == category["id"]]
                if rng.random() < 0.75:
                    pick = rng.choice(options)
                    row[f"{category['name']}_{pick['name']}"] = 1
            row.update(
                {
                    "Panelist": person,
                    "Gender": "Female" if person % 2 else "Male",
                    "Age": 25 + person,
                    "Task": task,
                    "Rating": 1 + ((person + task) % 7),
                    "ResponseTime": 0.3 + (task % 3) * 0.4,
                }
            )
            rows.append(row)
    study = {
        "title": "Seven point",
        "main_question": "Rate this",
        "background": "",
        "language": "en",
        "launched_at": "",
        "aspect_ratio": None,
        "study_type": "grid",
        "categories": categories,
        "elements": elements,
        "classification_questions": [],
    }
    return {
        "name": "seven-point-settings",
        "maxRating": 5,
        "includeRawData": False,
        "analysisOptions": default_analysis_settings(7),
        "filters": None,
        "study": study,
        "rows": rows,
    }


def constant_only_case():
    study, elements = grid_study()
    keys = [f"{element['category']['name']}_{element['name']}" for element in elements]
    rows = []
    for person in range(1, 4):
        for task in range(1, 6):
            row = {key: 1 if task % 3 == index % 3 else 0 for index, key in enumerate(keys)}
            row.update(
                {
                    "Panelist": person,
                    "Gender": "Male",
                    "Age": 30,
                    "Task": task,
                    "Rating": 4,
                    "ResponseTime": 0.8,
                    "How often do you buy fragrance?": "Often",
                    "Budget": "Low",
                }
            )
            rows.append(row)
    return {
        "name": "all-constant-raters",
        "maxRating": 5,
        "includeRawData": False,
        "analysisOptions": {"exclude_constant_raters": True},
        "filters": None,
        "study": study,
        "rows": rows,
    }


def single_respondent_case():
    study, elements = grid_study()
    keys = [f"{element['category']['name']}_{element['name']}" for element in elements]
    rows = []
    for task in range(1, 9):
        row = {key: 1 if (task + index) % 4 == 0 else 0 for index, key in enumerate(keys)}
        row.update(
            {
                "Panelist": 1,
                "Gender": "Female",
                "Age": 33,
                "Task": task,
                "Rating": 2 + (task % 4),
                "ResponseTime": 0.5 + task * 0.05,
                "How often do you buy fragrance?": "Rarely",
                "Budget": "High",
            }
        )
        rows.append(row)
    return {
        "name": "single-respondent",
        "maxRating": 5,
        "includeRawData": True,
        "analysisOptions": None,
        "filters": None,
        "study": study,
        "rows": rows,
    }


def age_group_case():
    study, elements = grid_study()
    keys = [f"{element['category']['name']}_{element['name']}" for element in elements]
    rows = []
    for person, group in enumerate(["25-34", "18-24", "25-34"], start=1):
        for task in range(1, 6):
            row = {key: 1 if (person + task + index) % 5 == 0 else 0 for index, key in enumerate(keys)}
            row.update(
                {
                    "Panelist": person,
                    "Gender": "Female",
                    "Age": 99,
                    "AgeGroup": group,
                    "Task": task,
                    "Rating": 3 + (task % 3),
                    "ResponseTime": 0.6,
                    "How often do you buy fragrance?": "Often",
                    "Budget": "Low",
                }
            )
            rows.append(row)
    return {
        "name": "age-group-column",
        "maxRating": 5,
        "includeRawData": False,
        "analysisOptions": None,
        "filters": {"age_groups": ["25-34"], "genders": [], "classification_filters": {}},
        "study": study,
        "rows": rows,
    }


def study_type_cases():
    """Exercise every non-layer study type under full, filtered, and settings runs."""
    cases = []
    for offset, study_type in enumerate(["text", "hybrid", "video"], start=1):
        study, rows = grid_rows(seed=40 + offset, people=14, tasks=8)
        study = deepcopy(study)
        study["study_type"] = study_type
        study["title"] = f"{study_type.title()} analytics parity"
        if study_type == "video":
            for index, element in enumerate(study["elements"]):
                element["content"] = f"https://example.com/video-{index}.mp4"
        elif study_type == "hybrid":
            for index, element in enumerate(study["elements"]):
                element["content"] = (
                    f"https://example.com/hybrid-{index}.png" if index % 2 == 0 else element["content"]
                )

        common = {
            "maxRating": 5,
            "includeRawData": False,
            "study": study,
            "rows": rows,
        }
        cases.extend([
            {
                **common,
                "name": f"{study_type}-full",
                "analysisOptions": None,
                "filters": None,
            },
            {
                **common,
                "name": f"{study_type}-filter-cohort",
                "analysisOptions": None,
                "filters": {
                    "age_groups": [],
                    "genders": ["Female"],
                    "classification_filters": {"How often do you buy fragrance?": ["Often"]},
                },
            },
            {
                **common,
                "name": f"{study_type}-exclude-constant",
                "analysisOptions": {"exclude_constant_raters": True},
                "filters": None,
            },
        ])
    return cases


def layer_variants():
    base = layer_case()
    return [
        {
            **deepcopy(base),
            "name": "layer-filter-cohort",
            "filters": {"age_groups": ["18-24"], "genders": ["Female"], "classification_filters": {}},
        },
        {
            **deepcopy(base),
            "name": "layer-exclude-constant",
            "analysisOptions": {"exclude_constant_raters": True},
        },
    ]


def build_cases():
    study, rows = grid_rows()
    cases = [
        {
            "name": "grid-full",
            "maxRating": 5,
            "includeRawData": False,
            "analysisOptions": None,
            "filters": None,
            "study": study,
            "rows": rows,
        },
        {
            "name": "grid-no-intercept",
            "maxRating": 5,
            "includeRawData": False,
            "analysisOptions": {"regression": {"include_intercept": False}},
            "filters": None,
            "study": study,
            "rows": rows,
        },
        {
            "name": "grid-exclude-constant",
            "maxRating": 5,
            "includeRawData": False,
            "analysisOptions": {"exclude_constant_raters": True},
            "filters": None,
            "study": study,
            "rows": rows,
        },
        {
            "name": "grid-filter-cohort",
            "maxRating": 5,
            "includeRawData": False,
            "analysisOptions": None,
            "filters": {
                "age_groups": ["25-34", "13-18"],
                "genders": ["Female"],
                "classification_filters": {"How often do you buy fragrance?": ["Often"]},
            },
            "study": study,
            "rows": rows,
        },
        {
            "name": "grid-filter-nobody",
            "maxRating": 5,
            "includeRawData": False,
            "analysisOptions": None,
            "filters": {"age_groups": ["45-54"], "genders": ["Male"], "classification_filters": {"Budget": ["High"]}},
            "study": {
                **study,
                "title": "Nobody matches",
            },
            "rows": [
                {
                    **{key: 0 for key in rows[0] if key not in {"Panelist", "Gender", "Age", "Task", "Rating", "ResponseTime", "How often do you buy fragrance?", "Budget"}},
                    "Panelist": 1,
                    "Gender": "Female",
                    "Age": 22,
                    "Task": 1,
                    "Rating": 5,
                    "ResponseTime": 0.4,
                    "How often do you buy fragrance?": "Never",
                    "Budget": "Low",
                    **{f"{element['category']['name']}_{element['name']}": 1 if index == 0 else 0 for index, element in enumerate(study["elements"])},
                }
            ],
        },
        layer_case(),
        *layer_variants(),
        *study_type_cases(),
        seven_point_case(),
        constant_only_case(),
        single_respondent_case(),
        age_group_case(),
        {
            "name": "empty-rows",
            "maxRating": 5,
            "includeRawData": False,
            "analysisOptions": None,
            "filters": None,
            "study": study,
            "rows": [],
        },
    ]
    return cases


def main():
    payload = []
    for case in build_cases():
        # Each API request builds a new service, so the panel jitter starts at seed 123.
        service = StudyAnalysisService()
        frame = pd.DataFrame(case["rows"])
        try:
            report = service.generate_json_report(
                frame,
                case["study"],
                include_raw_data=bool(case["includeRawData"]),
                analysis_options=case["analysisOptions"],
                filters=case["filters"],
            )
            expected = sanitize(report)
            thrown = None
        except Exception as exc:
            expected = None
            thrown = f"{type(exc).__name__}: {exc}"
        payload.append({"name": case["name"], "input": case, "expected": expected, "throws": thrown})
        print(case["name"], "THROWS" if thrown else "ok", thrown or "")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes, {len(payload)} cases)")


if __name__ == "__main__":
    main()
