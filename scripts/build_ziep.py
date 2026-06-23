"""Generuje data/ziep_questions.json i data/ziep_explanations.json z plików markdown."""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
QUESTIONS_MD = ROOT / "ziep_closed.md"
ANSWERS_MD = ROOT / "ziep_closed_answers.md"
OUT_QUESTIONS = Path(__file__).resolve().parent.parent / "data" / "ziep_questions.json"
OUT_EXPLANATIONS = Path(__file__).resolve().parent.parent / "data" / "ziep_explanations.json"

QUESTION_RE = re.compile(r"^\*\*(\d+)\)\s*(.+?)\*\*\s*$")
OPTION_RE = re.compile(r"^\*\s+([a-d])\.\s+(.+)$")
ANSWER_SECTION_RE = re.compile(r"^##\s+(\d+)\)\s+(.+)$")
ANSWER_LINE_RE = re.compile(r"^\*\*Odpowiedź:\s*([a-d])\)\s*(.+?)\*\*\s*$")


def parse_questions_md(path: Path) -> list[dict]:
    lines = path.read_text(encoding="utf-8").splitlines()
    questions: list[dict] = []
    current: dict | None = None

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        header = QUESTION_RE.match(line)
        if header:
            if current is not None:
                _finalize_question(current, questions)
            current = {
                "id": int(header.group(1)),
                "question": header.group(2).strip(),
                "options": {},
            }
            continue

        if current is None:
            continue

        opt = OPTION_RE.match(line)
        if opt:
            current["options"][opt.group(1)] = opt.group(2).strip()

    if current is not None:
        _finalize_question(current, questions)

    questions.sort(key=lambda q: q["id"])
    return questions


def _finalize_question(current: dict, questions: list[dict]) -> None:
    qid = current["id"]
    options = current["options"]
    if len(options) != 4:
        raise ValueError(f"Pytanie {qid}: oczekiwano 4 opcji, znaleziono {len(options)}")
    questions.append(current)


def parse_answers_md(path: Path) -> dict[str, dict]:
    text = path.read_text(encoding="utf-8")
    sections = re.split(r"\n---\n", text.strip())
    explanations: dict[str, dict] = {}

    for section in sections:
        lines = [line.rstrip() for line in section.splitlines()]
        qid = None
        answer_letter = None
        answer_text = None
        body_lines: list[str] = []

        for line in lines:
            section_match = ANSWER_SECTION_RE.match(line)
            if section_match:
                qid = section_match.group(1)
                continue

            answer_match = ANSWER_LINE_RE.match(line)
            if answer_match:
                answer_letter = answer_match.group(1)
                answer_text = answer_match.group(2).strip()
                continue

            if line.strip() and qid is not None and answer_letter is not None:
                body_lines.append(line.strip())

        if qid is None or answer_letter is None:
            continue

        explanation = "\n\n".join(body_lines).strip()
        explanations[qid] = {
            "correct": answer_letter,
            "correct_text": answer_text,
            "explanation": explanation,
        }

    return explanations


def build_questions_json(questions: list[dict], explanations: dict[str, dict]) -> list[dict]:
    result: list[dict] = []

    for item in questions:
        qid = str(item["id"])
        exp = explanations.get(qid)
        if not exp:
            raise ValueError(f"Brak wyjaśnienia dla pytania {qid}")

        correct_letter = exp["correct"]
        options = item["options"]
        if correct_letter not in options:
            raise ValueError(f"Pytanie {qid}: brak opcji '{correct_letter}'")

        correct_answers = [options[correct_letter]]
        incorrect_answers = [text for letter, text in sorted(options.items()) if letter != correct_letter]

        result.append(
            {
                "id": item["id"],
                "question": item["question"],
                "correct_answers": correct_answers,
                "incorrect_answers": incorrect_answers,
            }
        )

    return result


def main() -> None:
    questions_md = Path(sys.argv[1]) if len(sys.argv) > 1 else QUESTIONS_MD
    answers_md = Path(sys.argv[2]) if len(sys.argv) > 2 else ANSWERS_MD

    raw_questions = parse_questions_md(questions_md)
    explanations = parse_answers_md(answers_md)
    questions = build_questions_json(raw_questions, explanations)

    OUT_QUESTIONS.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_QUESTIONS, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    with open(OUT_EXPLANATIONS, "w", encoding="utf-8") as f:
        json.dump(explanations, f, ensure_ascii=False, indent=2)

    print(f"Zapisano {len(questions)} pytan do {OUT_QUESTIONS}")
    print(f"Zapisano {len(explanations)} wyjasnien do {OUT_EXPLANATIONS}")


if __name__ == "__main__":
    main()
