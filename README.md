# Quiz – GitHub Pages

Statyczny quiz z pytaniami z wielu kategorii (HTML + JavaScript).

## Kategorie

| ID | Nazwa | Plik pytań | Plik wyjaśnień |
|----|-------|------------|----------------|
| `bsk` | Bezpieczeństwo Sieci Korporacyjnych | `data/bsk_questions.json` | — |
| `ziep` | Zarządzanie i Ekonomia Projektów | `data/ziep_questions.json` | `data/ziep_explanations.json` |

Konfiguracja kategorii: `data/categories.json`.

## Struktura

```
quiz/
├── index.html
├── css/style.css
├── js/app.js
├── data/
│   ├── categories.json
│   ├── bsk_questions.json
│   ├── ziep_questions.json
│   └── ziep_explanations.json
└── scripts/
    ├── build_questions.py   # BSK z YAML
    └── build_ziep.py        # ZiEP z markdown
```

## Przebudowa pytań

**BSK** (z YAML w katalogu `app/`):

```bash
python scripts/build_questions.py
```

**ZiEP** (z `ziep_closed.md` i `ziep_closed_answers.md` w katalogu nadrzędnym):

```bash
python scripts/build_ziep.py
```

## Uruchomienie lokalne

Serwuj katalog `quiz/` przez dowolny serwer HTTP (np. `python -m http.server` w katalogu `quiz/`).
