# Quiz BSK – GitHub Pages

Statyczny quiz z **105 pytaniami** (HTML + JavaScript). Działa w przeglądarce bez serwera — idealny pod GitHub Pages.

## Szybki start

### 1. Utwórz repozytorium na GitHub

1. Wejdź na [github.com/new](https://github.com/new)
2. Nazwa np. `bsk-quiz` (lub `TWOJ-USERNAME.github.io` jeśli chcesz stronę główną profilu)
3. Zostaw repozytorium **public**
4. **Nie** zaznaczaj „Add a README” — wrzucimy pliki sami

### 2. Wgraj pliki z tego folderu

W terminalu (w katalogu `github-pages`):

```bash
git init
git add .
git commit -m "Quiz BSK – GitHub Pages"
git branch -M main
git remote add origin https://github.com/TWOJ-USERNAME/NAZWA-REPO.git
git push -u origin main
```

Zamień `TWOJ-USERNAME` i `NAZWA-REPO` na swoje dane.

### 3. Włącz GitHub Pages

1. Repo → **Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main` → folder **`/ (root)`**
4. Kliknij **Save**

Po 1–3 minutach quiz będzie pod adresem:

- `https://TWOJ-USERNAME.github.io/NAZWA-REPO/` (repo projektowe)
- lub `https://TWOJ-USERNAME.github.io/` (jeśli repo nazywa się `TWOJ-USERNAME.github.io`)

## Aktualizacja pytań

Jeśli edytujesz `app/questions.yaml` w głównym projekcie:

```bash
pip install pyyaml
python scripts/build_questions.py
git add data/questions.json
git commit -m "Aktualizacja pytań"
git push
```

Możesz też podać własną ścieżkę do YAML:

```bash
python scripts/build_questions.py ../app/questions.yaml
```

## Własna domena (Namecheap)

Szczegółowa instrukcja krok po kroku: **[DOMAIN_SETUP.md](DOMAIN_SETUP.md)**

## Struktura

```
github-pages/
├── index.html          # strona główna
├── css/style.css
├── js/app.js           # logika quizu
├── data/questions.json # 105 pytań
├── DOMAIN_SETUP.md     # konfiguracja domeny
└── scripts/            # narzędzie do przebudowy JSON
```
