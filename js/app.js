const QUESTION_COUNT = 105;
const STORAGE_KEY = "quiz_saves";

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
};

const screens = ["screen-loading", "screen-start", "screen-quiz", "screen-result"];

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
  if (state.saveMode && state.saveName) {
    badge.textContent = `💾 ${state.saveName}`;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
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
      const total = save?.questions?.length ?? QUESTION_COUNT;
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
  if (data.length < QUESTION_COUNT) {
    throw new Error(`Za mało pytań (${data.length}), wymagane: ${QUESTION_COUNT}`);
  }
  state.allQuestions = data;
}

// —— Start gry ——

function resetGameState() {
  state.questions = [];
  state.wrong = [];
  state.round = 1;
  state.index = 0;
  state.correctCount = 0;
  state.answered = false;
}

function beginQuiz() {
  show("screen-quiz");
  updateSaveBadge();
  if (state.index >= state.questions.length) {
    showRoundResult();
  } else {
    showQuestion();
  }
}

function startQuickQuiz() {
  state.saveMode = false;
  state.saveName = null;
  resetGameState();
  state.questions = sample(state.allQuestions, QUESTION_COUNT);
  beginQuiz();
}

function startSaveQuiz(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    alert("Podaj nazwę zapisu.");
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
  state.questions = sample(state.allQuestions, QUESTION_COUNT);
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

  const btn = document.getElementById("action-btn");
  btn.textContent = "Sprawdź odpowiedź";
  btn.className = "btn btn-check";

  const item = state.questions[state.index];
  const correct = item.correct_answers || [];
  const incorrect = item.incorrect_answers || [];
  state.currentOptions = shuffle([
    ...correct.map((ans) => ({ text: ans, correct: true })),
    ...incorrect.map((ans) => ({ text: ans, correct: false })),
  ]);

  document.getElementById("round-label").textContent = `Runda ${state.round}`;
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
}

function getSelected() {
  return [...document.querySelectorAll("#options input:checked")].map(
    (el) => +el.dataset.idx
  );
}

function checkAnswer() {
  const selected = getSelected();
  if (!selected.length) {
    alert("Proszę zaznaczyć przynajmniej jedną odpowiedź!");
    return;
  }

  let isCorrect = true;
  state.currentOptions.forEach((opt, i) => {
    if (opt.correct && !selected.includes(i)) isCorrect = false;
    if (!opt.correct && selected.includes(i)) isCorrect = false;
  });

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
  if (!state.answered) {
    checkAnswer();
  } else {
    nextQuestion();
  }
}

// —— Menu ——

function showStartScreen() {
  state.saveMode = false;
  state.saveName = null;
  updateSaveBadge();
  refreshSaveList();
  document.getElementById("save-name-input").value = "";
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
document.getElementById("action-btn").addEventListener("click", onAction);

loadQuestions()
  .then(() => {
    refreshSaveList();
    showStartScreen();
  })
  .catch((err) => {
    document.getElementById("screen-loading").innerHTML =
      `<p class="loading" style="color:#c62828">Błąd: ${escapeHtml(err.message)}</p>`;
  });
