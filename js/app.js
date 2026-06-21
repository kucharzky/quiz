const QUESTION_COUNT = 105;

const state = {
  allQuestions: [],
  questions: [],
  wrong: [],
  round: 1,
  index: 0,
  correctCount: 0,
  currentOptions: [],
  answered: false,
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

function startQuiz() {
  state.questions = sample(state.allQuestions, QUESTION_COUNT);
  state.wrong = [];
  state.round = 1;
  state.index = 0;
  state.correctCount = 0;
  show("screen-quiz");
  showQuestion();
}

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
    msg.innerHTML =
      '<div class="congrats">🎉 Gratulacje!\nOdpowiedziałeś poprawnie na wszystkie pytania!</div>';
    btn.textContent = "Zakończ";
    btn.className = "btn btn-end";
    btn.onclick = () => show("screen-start");
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
  show("screen-quiz");
  showQuestion();
}

function onAction() {
  if (!state.answered) {
    checkAnswer();
  } else {
    nextQuestion();
  }
}

document.getElementById("btn-start").addEventListener("click", startQuiz);
document.getElementById("action-btn").addEventListener("click", onAction);

loadQuestions()
  .then(() => show("screen-start"))
  .catch((err) => {
    document.getElementById("screen-loading").innerHTML =
      `<p class="loading" style="color:#c62828">Błąd: ${escapeHtml(err.message)}</p>`;
  });
