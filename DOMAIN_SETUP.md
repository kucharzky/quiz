# Konfiguracja domeny Namecheap + GitHub Pages

Instrukcja krok po kroku: jak podpiąć kupioną domenę z Namecheap do quizu na GitHub Pages.

Zamień wszędzie przykładowe wartości na swoje:

| Symbol | Przykład | Twój wpis |
|--------|----------|-----------|
| `TWOJ-USERNAME` | `jan-kowalski` | nazwa użytkownika GitHub |
| `NAZWA-REPO` | `bsk-quiz` | nazwa repozytorium z quizem |
| `twoja-domena.pl` | `mojquiz.pl` | domena kupiona w Namecheap |

---

## Część A — Wrzuć quiz na GitHub Pages

### Krok 1: Repozytorium

1. Zaloguj się na [github.com](https://github.com)
2. **New repository** → nazwa np. `bsk-quiz`
3. Public, bez README
4. Utwórz repo

### Krok 2: Push plików

W folderze `github-pages` (ten katalog):

```bash
git init
git add .
git commit -m "Quiz BSK – GitHub Pages"
git branch -M main
git remote add origin https://github.com/TWOJ-USERNAME/NAZWA-REPO.git
git push -u origin main
```

### Krok 3: Włącz Pages

1. Repo → **Settings** → **Pages**
2. **Build and deployment** → Source: **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**
4. **Save**

Poczekaj 1–5 minut. Sprawdź czy działa:

`https://TWOJ-USERNAME.github.io/NAZWA-REPO/`

> **Tip:** Jeśli repo nazywa się dokładnie `TWOJ-USERNAME.github.io`, adres będzie krótszy: `https://TWOJ-USERNAME.github.io/`

---

## Część B — Podłącz domenę w GitHub

### Krok 4: Dodaj domenę w ustawieniach Pages

1. Repo → **Settings** → **Pages**
2. Sekcja **Custom domain**
3. Wpisz: `twoja-domena.pl` (bez `https://`, bez końcowego `/`)
4. Kliknij **Save**
5. Zaznacz **Enforce HTTPS** (może być dostępne dopiero po propagacji DNS — wróć za godzinę)

GitHub utworzy plik `CNAME` w repozytorium — to normalne.

### Krok 5: Zdecyduj, czy chcesz też `www`

Zalecane: obsłuż **oba** adresy:

- `https://twoja-domena.pl` (apex / root)
- `https://www.twoja-domena.pl` (subdomena www)

W GitHub Custom domain wpisz **apex**: `twoja-domena.pl`  
Subdomenę `www` skonfigurujesz w DNS (krok 7).

---

## Część C — DNS w Namecheap

### Krok 6: Wejdź w panel Namecheap

1. [namecheap.com](https://www.namecheap.com) → **Domain List**
2. Kliknij **Manage** przy swojej domenie
3. Zakładka **Advanced DNS**

### Krok 7: Usuń konfliktujące rekordy

Usuń lub wyłącz (jeśli są):

- rekordy **URL Redirect** na `@` lub `www` wskazujące gdzie indziej
- stary rekord **A** / **CNAME** dla `@` lub `www`, jeśli prowadził do innej usługi

Zostaw rekordy MX (poczta) — nie ruszaj ich, jeśli nie wiesz po co są.

### Krok 8: Dodaj rekordy A dla apex (`@`)

Dodaj **cztery** rekordy typu **A Record**:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | `@` | `185.199.108.153` | Automatic |
| A Record | `@` | `185.199.109.153` | Automatic |
| A Record | `@` | `185.199.110.153` | Automatic |
| A Record | `@` | `185.199.111.153` | Automatic |

To oficjalne adresy IP GitHub Pages (stan na 2025/2026).

### Krok 9: Dodaj CNAME dla `www`

| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME Record | `www` | `TWOJ-USERNAME.github.io` | Automatic |

**Uwaga:** W polu Value wpisz `TWOJ-USERNAME.github.io` — **bez** `https://` i **bez** ścieżki `/NAZWA-REPO`.

GitHub sam przekieruje ruch z domeny na właściwe repo (po kroku 4).

### Krok 10: (Opcjonalnie) przekierowanie www → apex

Jeśli chcesz, żeby `www` działało tak samo jak apex — rekord CNAME z kroku 9 wystarczy.

Jeśli wolisz, żeby `www` przekierowywało na apex bez `www`, możesz w Namecheap użyć **URL Redirect Record**:

| Type | Host | Value |
|------|------|-------|
| URL Redirect | `www` | `https://twoja-domena.pl` |

Wtedy **nie** dodawaj CNAME dla www — wybierz jedną metodę.

**Zalecenie:** zostaw CNAME `www` → `TWOJ-USERNAME.github.io` i w GitHub włącz HTTPS dla obu wariantów.

---

## Część D — Weryfikacja

### Krok 11: Poczekaj na propagację DNS

Zmiany DNS trwają zwykle **15 minut – 48 godzin** (często < 1 h).

Sprawdź status w repo → **Settings** → **Pages** → przy Custom domain powinno być zielone ✓ **DNS check successful**.

### Krok 12: Sprawdź w przeglądarce

Otwórz:

- `https://twoja-domena.pl`
- `https://www.twoja-domena.pl`

Quiz powinien się załadować tak samo jak na `github.io`.

### Krok 13: Włącz HTTPS

Gdy DNS jest OK:

1. **Settings** → **Pages**
2. Zaznacz **Enforce HTTPS**

Jeśli opcja jest wyszarzona — odczekaj i odśwież za 30–60 min.

---

## Rozwiązywanie problemów

### „DNS check unsuccessful” w GitHub

- Sprawdź, czy rekordy A mają dokładnie 4 adresy IP GitHub
- CNAME `www` musi wskazywać na `TWOJ-USERNAME.github.io` (nie na `twoja-domena.pl`)
- Poczekaj dłużej na propagację

### Strona 404 na własnej domenie

- Upewnij się, że GitHub Pages jest włączone (branch `main`, folder root)
- Sprawdź, czy w repo jest plik `index.html` w głównym katalogu
- Custom domain musi być ustawiona w **tym samym** repo, z którego deployujesz

### Strona działa na `github.io`, ale nie na domenie

- DNS jeszcze się nie rozpropagował — użyj [dnschecker.org](https://dnschecker.org) i sprawdź rekordy A dla `twoja-domena.pl`
- Wyczyść cache przeglądarki lub otwórz w trybie incognito

### Certyfikat HTTPS się nie generuje

- DNS musi być w pełni poprawny
- Wyłącz na chwilę **Enforce HTTPS**, poczekaj, włącz ponownie
- Nie używaj jednocześnie URL Redirect i CNAME na `www`

### Quiz nie ładuje pytań (błąd w konsoli)

- Otwórz DevTools (F12) → Console
- Upewnij się, że plik `data/questions.json` jest w repozytorium
- Na GitHub Pages ścieżki są względne — nie zmieniaj struktury folderów bez aktualizacji `app.js`

---

## Szybka checklista

- [ ] Pliki z folderu `github-pages` są w repo na GitHub
- [ ] GitHub Pages włączone (branch `main`, `/ root`)
- [ ] Strona działa pod `https://TWOJ-USERNAME.github.io/NAZWA-REPO/`
- [ ] Custom domain ustawiona w Settings → Pages
- [ ] 4 rekordy A na `@` w Namecheap
- [ ] CNAME `www` → `TWOJ-USERNAME.github.io`
- [ ] DNS check w GitHub = OK
- [ ] Enforce HTTPS włączone
- [ ] Quiz otwiera się na telefonie pod `https://twoja-domena.pl`

---

## Przydatne linki

- [GitHub Docs — Custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [GitHub Docs — Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Namecheap — DNS settings](https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/)
