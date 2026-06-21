const STORAGE_KEY = "quiz_saves";
const CHALLENGE_PREF_KEY = "quiz_challenge_enabled";
const CHALLENGE_SECONDS = 90;

const state = {
  allQuestions: [],
  questions: [],
  wrong: [],
  round: 1,
  index: 0,
  correctCount: 0,
  currentOptions: [],
  answered: false,
  saveMode: false,
  saveName: null,
  challengeMode: false,
  examMode: false,
  examPreview: false,
  examAnswers: [],
  examReviewFilter: "all",
};

let timerInterval = null;
let timerRemaining = CHALLENGE_SECONDS;

function getPoolSize() {
  return state.allQuestions.length;
}

function parseQuestionCount(raw) {
  const value = String(raw ?? "").trim();
  if (!value) {
    return { count: getPoolSize() };
  }
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) {
    return { error: `Podaj liczbę od 1 do ${getPoolSize()}, lub zostaw puste dla wszystkich pytań.` };
  }
  return { count: Math.min(n, getPoolSize()) };
}

function pickQuestions(count) {
  return sample(state.allQuestions, count);
}

function updatePoolLabels() {
  const pool = getPoolSize();
  document.getElementById("pool-subtitle").innerHTML =
    `Wybierz tryb i liczbę pytań — dostępna pula: <strong>${pool}</strong>.`;
  document.getElementById("quick-pool-max").textContent = pool;
  document.getElementById("save-pool-max").textContent = pool;
  document.getElementById("exam-pool-max").textContent = pool;
}

const screens = [
  "screen-loading",
  "screen-start",
  "screen-quiz",
  "screen-result",
  "screen-exam-result",
];

function show(screenId) {
  screens.forEach((id) => {
    document.getElementById(id).classList.toggle("hidden", id !== screenId);
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

function escapeHtml(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

// —— Challenge timer ——

function syncChallengeFromUI() {
  state.challengeMode = document.getElementById("challenge-mode").checked;
}

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function stopChallengeTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  const timerEl = document.getElementById("challenge-timer");
  const display = document.getElementById("timer-display");
  if (!state.challengeMode) {
    timerEl.classList.add("hidden");
    return;
  }
  timerEl.classList.remove("hidden");
  display.textContent = formatTimer(timerRemaining);
  timerEl.classList.toggle("timer-warning", timerRemaining > 0 && timerRemaining <= 20);
  timerEl.classList.toggle("timer-critical", timerRemaining > 0 && timerRemaining <= 10);
}

function startChallengeTimer() {
  stopChallengeTimer();
  if (!state.challengeMode) {
    updateTimerDisplay();
    return;
  }

  timerRemaining = CHALLENGE_SECONDS;
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timerRemaining -= 1;
    updateTimerDisplay();

    if (timerRemaining <= 0) {
      stopChallengeTimer();
      if (state.examMode) {
        examAdvance();
      } else if (!state.answered) {
        checkAnswer();
      }
    }
  }, 1000);
}

function initChallengeToggle() {
  const checkbox = document.getElementById("challenge-mode");
  checkbox.checked = localStorage.getItem(CHALLENGE_PREF_KEY) === "1";
  checkbox.addEventListener("change", () => {
    localStorage.setItem(CHALLENGE_PREF_KEY, checkbox.checked ? "1" : "0");
  });
}

// —— localStorage ——

function readSaves() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSaves(saves) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
}

function getSaveNames() {
  return Object.keys(readSaves()).sort((a, b) => a.localeCompare(b, "pl"));
}

function deleteSave(name) {
  const saves = readSaves();
  delete saves[name];
  writeSaves(saves);
  refreshSaveList();
}

function buildSavePayload(indexOverride) {
  return {
    name: state.saveName,
    index: indexOverride !== undefined ? indexOverride : state.index,
    correctCount: state.correctCount,
    round: state.round,
    questions: state.questions,
    wrong: state.wrong,
  };
}

function persistSave(indexOverride) {
  if (!state.saveMode || !state.saveName) return;
  const saves = readSaves();
  saves[state.saveName] = buildSavePayload(indexOverride);
  writeSaves(saves);
  refreshSaveList();
}

function applySavePayload(data) {
  state.saveMode = true;
  state.saveName = data.name;
  state.index = data.index;
  state.correctCount = data.correctCount;
  state.round = data.round;
  state.questions = data.questions;
  state.wrong = data.wrong || [];
  state.answered = false;
}

function updateSaveBadge() {
  const badge = document.getElementById("save-badge");
  if (state.saveMode && state.saveName && !state.examMode) {
    badge.textContent = `💾 ${state.saveName}`;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

function updateExamBadge() {
  const badge = document.getElementById("exam-badge");
  badge.classList.toggle("hidden", !state.examMode);
}

function refreshSaveList() {
  const names = getSaveNames();
  const select = document.getElementById("save-select");
  const loadBtn = document.getElementById("btn-load-save");
  const loadSection = document.getElementById("save-load-section");
  const loadBlock = document.getElementById("save-load-block");
  const emptyHint = document.getElementById("save-empty-hint");
  const saves = readSaves();

  select.innerHTML = "";

  if (names.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "— brak zapisów —";
    select.appendChild(opt);
    select.disabled = true;
    loadBtn.disabled = true;
    loadSection.classList.add("hidden");
    loadBlock.classList.add("hidden");
    emptyHint.classList.remove("hidden");
  } else {
    names.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      const save = saves[name];
      const total = save?.questions?.length ?? getPoolSize();
      const at = Math.min(save?.index ?? 0, total);
      const pts = save?.correctCount ?? 0;
      opt.textContent = `${name} (pyt. ${at}/${total}, ${pts} pkt)`;
      select.appendChild(opt);
    });
    select.disabled = false;
    loadBtn.disabled = false;
    loadSection.classList.remove("hidden");
    loadBlock.classList.remove("hidden");
    emptyHint.classList.add("hidden");
  }
}

// —— Ładowanie pytań ——

async function loadQuestions() {
  const path = new URL("data/questions.json", window.location.href).href;
  const res = await fetch(path);
  if (!res.ok) throw new Error("Nie udało się wczytać pytań");
  const data = await res.json();
  if (!data.length) {
    throw new Error("Brak pytań w bazie.");
  }
  state.allQuestions = data;
  updatePoolLabels();
}

// —— Start gry ——

function resetGameState() {
  state.questions = [];
  state.wrong = [];
  state.round = 1;
  state.index = 0;
  state.correctCount = 0;
  state.answered = false;
  state.examMode = false;
  state.examPreview = false;
  state.examAnswers = [];
  state.examReviewFilter = "all";
}

function evaluateAnswer(selected, options) {
  let isCorrect = true;
  options.forEach((opt, i) => {
    if (opt.correct && !selected.includes(i)) isCorrect = false;
    if (!opt.correct && selected.includes(i)) isCorrect = false;
  });
  return isCorrect;
}

function beginQuiz() {
  syncChallengeFromUI();
  show("screen-quiz");
  updateSaveBadge();
  updateExamBadge();
  if (state.index >= state.questions.length) {
    if (state.examMode) {
      showExamResult();
    } else {
      showRoundResult();
    }
  } else {
    showQuestion();
  }
}

function startExamQuiz() {
  const parsed = parseQuestionCount(document.getElementById("exam-count-input").value);
  if (parsed.error) {
    alert(parsed.error);
    return;
  }

  state.saveMode = false;
  state.saveName = null;
  resetGameState();
  state.examMode = true;
  state.examPreview = document.getElementById("exam-preview-mode").checked;
  state.questions = pickQuestions(parsed.count);
  beginQuiz();
}

function startQuickQuiz() {
  const parsed = parseQuestionCount(document.getElementById("quick-count-input").value);
  if (parsed.error) {
    alert(parsed.error);
    return;
  }

  state.saveMode = false;
  state.saveName = null;
  resetGameState();
  state.questions = pickQuestions(parsed.count);
  beginQuiz();
}

function startSaveQuiz(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    alert("Podaj nazwę zapisu.");
    return;
  }
  const parsed = parseQuestionCount(document.getElementById("save-count-input").value);
  if (parsed.error) {
    alert(parsed.error);
    return;
  }
  const saves = readSaves();
  if (saves[trimmed]) {
    alert("Zapis o tej nazwie już istnieje. Wybierz inną nazwę lub wczytaj istniejący zapis.");
    return;
  }

  state.saveMode = true;
  state.saveName = trimmed;
  resetGameState();
  state.questions = pickQuestions(parsed.count);
  persistSave();
  beginQuiz();
}

function loadSaveQuiz() {
  const select = document.getElementById("save-select");
  const name = select.value;
  if (!name) return;

  const saves = readSaves();
  const data = saves[name];
  if (!data) {
    alert("Nie znaleziono zapisu. Lista została odświeżona.");
    refreshSaveList();
    return;
  }

  applySavePayload(data);
  beginQuiz();
}

// —— Quiz ——

function showQuestion() {
  state.answered = false;
  const feedback = document.getElementById("feedback");
  feedback.textContent = "";
  feedback.className = "feedback";
  feedback.classList.toggle("hidden", state.examMode);

  const btn = document.getElementById("action-btn");
  const isLast = state.index === state.questions.length - 1;
  if (state.examMode) {
    btn.textContent = isLast ? "Zakończ egzamin" : "Następne pytanie";
    btn.className = isLast ? "btn btn-exam" : "btn btn-next";
  } else {
    btn.textContent = "Sprawdź odpowiedź";
    btn.className = "btn btn-check";
  }

  const item = state.questions[state.index];
  const correct = item.correct_answers || [];
  const incorrect = item.incorrect_answers || [];
  state.currentOptions = shuffle([
    ...correct.map((ans) => ({ text: ans, correct: true })),
    ...incorrect.map((ans) => ({ text: ans, correct: false })),
  ]);

  if (state.examMode) {
    document.getElementById("round-label").textContent = "Egzamin";
  } else {
    document.getElementById("round-label").textContent = `Runda ${state.round}`;
  }
  document.getElementById("progress-label").textContent =
    `Pytanie ${state.index + 1} z ${state.questions.length}`;
  document.getElementById("question-text").textContent = item.question;

  const container = document.getElementById("options");
  container.innerHTML = "";
  state.currentOptions.forEach((opt, i) => {
    const div = document.createElement("label");
    div.className = "option";
    div.innerHTML =
      `<input type="checkbox" data-idx="${i}"><span>${escapeHtml(opt.text)}</span>`;
    div.querySelector("input").addEventListener("change", (e) => {
      div.classList.toggle("selected", e.target.checked);
    });
    container.appendChild(div);
  });

  if (state.challengeMode) {
    startChallengeTimer();
  } else {
    stopChallengeTimer();
    updateTimerDisplay();
  }
}

function getSelected() {
  return [...document.querySelectorAll("#options input:checked")].map(
    (el) => +el.dataset.idx
  );
}

function checkAnswer() {
  if (state.answered) return;
  stopChallengeTimer();

  const selected = getSelected();
  const isCorrect = evaluateAnswer(selected, state.currentOptions);

  if (isCorrect) {
    state.correctCount += 1;
  } else {
    state.wrong.push(state.questions[state.index]);
  }

  state.answered = true;
  persistSave(state.index + 1);

  const feedback = document.getElementById("feedback");
  feedback.textContent = isCorrect
    ? "🎉 Poprawna odpowiedź!"
    : "❌ Błędna odpowiedź! Sprawdź poniżej właściwe opcje:";
  feedback.className = `feedback ${isCorrect ? "ok" : "bad"}`;

  document.querySelectorAll("#options .option").forEach((div, i) => {
    div.classList.add("disabled");
    const inp = div.querySelector("input");
    inp.disabled = true;
    if (state.currentOptions[i].correct) {
      div.classList.add("correct");
    } else if (selected.includes(i)) {
      div.classList.add("wrong");
    }
  });

  const btn = document.getElementById("action-btn");
  btn.textContent = "Następne pytanie";
  btn.className = "btn btn-next";
}

function recordExamAnswer() {
  const selected = getSelected();
  const isCorrect = evaluateAnswer(selected, state.currentOptions);
  state.examAnswers[state.index] = {
    question: state.questions[state.index].question,
    options: state.currentOptions.map((o) => ({ text: o.text, correct: o.correct })),
    selected,
    isCorrect,
  };
  return isCorrect;
}

function examAdvance() {
  if (state.answered) return;
  stopChallengeTimer();
  recordExamAnswer();
  state.index += 1;

  if (state.index < state.questions.length) {
    showQuestion();
  } else {
    showExamResult();
  }
}

function showExamResult() {
  stopChallengeTimer();

  state.correctCount = state.examAnswers.filter((a) => a?.isCorrect).length;
  const total = state.questions.length;
  const wrongCount = total - state.correctCount;
  const pct = total ? Math.round((state.correctCount / total) * 100) : 0;

  show("screen-exam-result");
  document.getElementById("exam-score-text").textContent =
    `Wynik: ${state.correctCount} / ${total} (${pct}%)`;
  document.getElementById("exam-result-note").textContent =
    wrongCount === 0
      ? "Doskonały wynik — wszystkie odpowiedzi poprawne!"
      : `Błędnych odpowiedzi: ${wrongCount}`;

  const reviewSection = document.getElementById("exam-review-section");
  if (state.examPreview) {
    reviewSection.classList.remove("hidden");
    state.examReviewFilter = "all";
    document.querySelectorAll(".exam-filter-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === "all");
    });
    refreshExamReviewList();
  } else {
    reviewSection.classList.add("hidden");
  }
}

function getFilteredExamAnswers() {
  return state.examAnswers
    .map((answer, index) => ({ ...answer, index }))
    .filter((answer) => {
      if (state.examReviewFilter === "correct") return answer.isCorrect;
      if (state.examReviewFilter === "wrong") return !answer.isCorrect;
      return true;
    });
}

function refreshExamReviewList() {
  const filtered = getFilteredExamAnswers();
  const select = document.getElementById("exam-review-select");
  select.innerHTML = "";

  if (!filtered.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "— brak pytań w tej kategorii —";
    select.appendChild(opt);
    select.disabled = true;
    document.getElementById("exam-review-detail").innerHTML =
      '<p class="field-hint" style="text-align:center;margin:0">Brak pytań do wyświetlenia.</p>';
    return;
  }

  filtered.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = String(item.index);
    const mark = item.isCorrect ? "✓" : "✗";
    const shortQ = item.question.length > 55
      ? `${item.question.slice(0, 55)}…`
      : item.question;
    opt.textContent = `${mark} Pyt. ${item.index + 1}: ${shortQ}`;
    select.appendChild(opt);
  });
  select.disabled = false;
  renderExamReviewDetail(+select.value);
}

function renderExamReviewDetail(questionIndex) {
  const answer = state.examAnswers[questionIndex];
  const detail = document.getElementById("exam-review-detail");
  if (!answer) {
    detail.innerHTML = "";
    return;
  }

  const statusClass = answer.isCorrect ? "ok" : "bad";
  const statusText = answer.isCorrect ? "Poprawna odpowiedź" : "Błędna odpowiedź";

  let optionsHtml = "";
  answer.options.forEach((opt, i) => {
    const classes = ["option", "disabled"];
    if (opt.correct) classes.push("correct");
    if (answer.selected.includes(i) && !opt.correct) classes.push("wrong");
    if (answer.selected.includes(i)) classes.push("user-pick");
    const checked = answer.selected.includes(i) ? "checked" : "";
    optionsHtml += `
      <label class="${classes.join(" ")}">
        <input type="checkbox" disabled ${checked}>
        <span>${escapeHtml(opt.text)}</span>
      </label>`;
  });

  detail.innerHTML = `
    <span class="exam-status-tag ${statusClass}">${statusText}</span>
    <div class="question-text">${escapeHtml(answer.question)}</div>
    ${optionsHtml}
  `;
}

function setExamReviewFilter(filter) {
  state.examReviewFilter = filter;
  document.querySelectorAll(".exam-filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  refreshExamReviewList();
}

function nextQuestion() {
  state.index += 1;
  persistSave();

  if (state.index < state.questions.length) {
    showQuestion();
  } else {
    showRoundResult();
  }
}

function showRoundResult() {
  stopChallengeTimer();
  show("screen-result");
  document.getElementById("result-title").textContent = `Koniec Rundy ${state.round}`;
  document.getElementById("score-text").textContent =
    `Twój wynik: ${state.correctCount} / ${state.questions.length}`;

  const msg = document.getElementById("result-message");
  const btn = document.getElementById("result-btn");
  btn.classList.remove("hidden");

  if (state.wrong.length === 0) {
    if (state.saveMode && state.saveName) {
      deleteSave(state.saveName);
      state.saveMode = false;
      state.saveName = null;
    }

    msg.innerHTML =
      '<div class="congrats">🎉 Gratulacje!\nOdpowiedziałeś poprawnie na wszystkie pytania!</div>';
    btn.textContent = "Zakończ";
    btn.className = "btn btn-end";
    btn.onclick = () => {
      showStartScreen();
    };
  } else {
    msg.innerHTML =
      `<p class="result-warn">Do poprawy: ${state.wrong.length} pytań.</p>`;
    btn.textContent = "Popraw błędy";
    btn.className = "btn btn-retry";
    btn.onclick = retryWrong;
  }
}

function retryWrong() {
  state.questions = shuffle(state.wrong);
  state.wrong = [];
  state.index = 0;
  state.correctCount = 0;
  state.round += 1;
  persistSave();
  show("screen-quiz");
  updateSaveBadge();
  showQuestion();
}

function onAction() {
  if (state.examMode) {
    examAdvance();
    return;
  }
  if (!state.answered) {
    checkAnswer();
  } else {
    nextQuestion();
  }
}

// —— Menu ——

function showStartScreen() {
  stopChallengeTimer();
  state.saveMode = false;
  state.saveName = null;
  state.challengeMode = false;
  state.examMode = false;
  state.examPreview = false;
  state.examAnswers = [];
  updateSaveBadge();
  updateExamBadge();
  refreshSaveList();
  document.getElementById("save-name-input").value = "";
  document.getElementById("feedback").classList.remove("hidden");
  show("screen-start");
}

function toggleSavePanel() {
  const panel = document.getElementById("save-panel");
  const toggle = document.getElementById("btn-toggle-save-mode");
  const isOpen = !panel.classList.contains("hidden");
  panel.classList.toggle("hidden", isOpen);
  toggle.setAttribute("aria-expanded", String(!isOpen));
}

// —— Init ——

document.getElementById("btn-quick-start").addEventListener("click", startQuickQuiz);
document.getElementById("btn-exam-start").addEventListener("click", startExamQuiz);
document.getElementById("btn-exam-finish").addEventListener("click", showStartScreen);
document.getElementById("exam-review-select").addEventListener("change", (e) => {
  renderExamReviewDetail(+e.target.value);
});
document.querySelectorAll(".exam-filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => setExamReviewFilter(btn.dataset.filter));
});
document.getElementById("btn-toggle-save-mode").addEventListener("click", toggleSavePanel);
document.getElementById("btn-create-save").addEventListener("click", () => {
  startSaveQuiz(document.getElementById("save-name-input").value);
});
document.getElementById("btn-load-save").addEventListener("click", loadSaveQuiz);
document.getElementById("save-name-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    startSaveQuiz(e.target.value);
  }
});
document.getElementById("quick-count-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") startQuickQuiz();
});
document.getElementById("save-count-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    startSaveQuiz(document.getElementById("save-name-input").value);
  }
});
document.getElementById("exam-count-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") startExamQuiz();
});
document.getElementById("action-btn").addEventListener("click", onAction);

loadQuestions()
  .then(() => {
    initChallengeToggle();
    refreshSaveList();
    showStartScreen();
  })
  .catch((err) => {
    document.getElementById("screen-loading").innerHTML =
      `<p class="loading" style="color:#c62828">Błąd: ${escapeHtml(err.message)}</p>`;
  });
