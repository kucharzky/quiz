"""Regeneruje data/questions.json z pliku YAML (uruchom z katalogu github-pages)."""

import json
import sys
from pathlib import Path

import yaml

YAML_PATH = Path(__file__).resolve().parent.parent.parent / "app" / "questions.yaml"
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "questions.json"


def main() -> None:
    yaml_file = Path(sys.argv[1]) if len(sys.argv) > 1 else YAML_PATH
    with open(yaml_file, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    questions = data.get("questions", [])
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"Zapisano {len(questions)} pytan do {OUT_PATH}")


if __name__ == "__main__":
    main()
