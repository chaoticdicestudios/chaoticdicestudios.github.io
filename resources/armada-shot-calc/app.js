/**
 * app.js
 *
 * Armada Shot Calc — application logic.
 * Depends on: questions.js (must be loaded first via index.html)
 *
 * Section index:
 *   1. Service Worker Registration
 *   2. State
 *   3. Question Helpers
 *   4. Formatting Helpers
 *   5. Calculation
 *   6. Transition
 *   7. Rendering — Question
 *   8. Rendering — Result
 *   9. Navigation
 *  10. Init
 */


/* ── 1. Service Worker Registration ──────────────────────── */
window.addEventListener('load', () => {

  // Allow scrollbars
  setTimeout(() => {
    document.body.classList.remove('no-scrollbars');
  }, 500);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .catch((error) => {
        console.error('ServiceWorker registration failed:', error);
      });
  }
});

/* ── 2. State ─────────────────────────────────────────────── */

/**
 * Central app state.
 *   answers  — map of { questionId: selectedValue }
 *   history  — ordered stack of answered question ids, used for Back navigation
 */
const state = {
  answers: {},
  history: [],
};


/* ── 3. Question Helpers ──────────────────────────────────── */

/**
 * Returns the first unanswered active question, or null if all are answered.
 * @returns {Question|null}
 */
function getNextQuestion() {
  return QUESTIONS.find((q) => state.answers[q.id] === undefined) ?? null;
}

/**
 * Returns the question object for a given id.
 * @param {string} id
 * @returns {Question}
 */
function getQuestionById(id) {
  return QUESTIONS.find((q) => q.id === id);
}


/* ── 4. Formatting Helpers ────────────────────────────────── */

/**
 * Formats a modifier number as a signed string.
 * Uses a proper Unicode minus sign (−) rather than a hyphen.
 * Examples: +2, −1, ±0
 * @param {number} n
 * @returns {string}
 */
function formatModifier(n) {
  if (n > 0) return `+${n}`;
  if (n < 0) return `\u2212${Math.abs(n)}`; // proper minus sign U+2212
  return '\u00b10';                           // ±0
}

/**
 * Returns the CSS modifier class for a value: mod-pos | mod-neg | mod-zero
 * Used on breakdown rows and the modifier pill.
 * @param {number} n
 * @returns {string}
 */
function modifierClass(n) {
  if (n > 0) return 'mod-pos';
  if (n < 0) return 'mod-neg';
  return 'mod-zero';
}

/**
 * Returns the CSS badge class for an option modifier: badge-pos | badge-neg | badge-zero
 * Used on option buttons.
 * @param {number} n
 * @returns {string}
 */
function badgeClass(n) {
  if (n > 0) return 'badge-pos';
  if (n < 0) return 'badge-neg';
  return 'badge-zero';
}


/* ── 5. Calculation ───────────────────────────────────────── */

/**
 * Calculates the shot result from the current state.answers.
 *
 * Returns an object containing:
 *   totalModifier  {number}   — sum of all applicable modifiers
 *   rawMinRoll     {number}   — 6 minus totalModifier (needed die face, before clamping)
 *   minRoll        {number}   — effective minimum roll (clamped; natural 1 always auto-misses)
 *   impossible     {boolean}  — true when rawMinRoll > 10 (exceeds d10 maximum)
 *   onlyTenHits    {boolean}  — true when only a natural 10 can score a hit
 *   tenScoresCrit  {boolean}  — true when a natural 10 produces a hit (and therefore a crit)
 *   nineScoresCrit {boolean}  — true when a natural 9 from indirect weapons produces a hit (and therefore a crit)
 *   breakdown      {array}    — non-zero { label, modifier } contributions, in application order
 *   isIndirect     {boolean}  — whether an Indirect Weapon was fired
 *
 * @returns {ShotResult}
 */
function calculateResult() {
  const breakdown = [];
  let modifierTotal = 0;

  // 1. Loop through the questions to build the total and breakdown
  QUESTIONS.forEach((q) => {
    const selectedValue = state.answers[q.id];
    if (selectedValue === undefined) return;

    // Find the option that matches the value AND is currently "visible"
    // (This handles the dual 'long' range options in questions.js)
    const option = q.options.find((opt) => 
      opt.value === selectedValue && 
      (!opt.hideIf || !opt.hideIf(state.answers))
    );

    if (option && option.modifier !== 0) {
      // Create a descriptive label (e.g., "Range: Point Blank")
      const displayLabel = q.id === 'weapon' ? option.label : `${q.label}: ${option.label}`;
      
      breakdown.push({ label: displayLabel, modifier: option.modifier });
      modifierTotal += option.modifier;
    }
  });

  // 2. Derive roll values
  const rawMinRoll = 6 - modifierTotal;
  const minRoll = Math.max(2, rawMinRoll);
  const impossible = rawMinRoll > 10;

  const isIndirect = state.answers.weapon === 'indirect';
  const tenScoresCrit = modifierTotal >= -4;
  const nineScoresCrit = isIndirect && modifierTotal >= -3;
  const onlyTenHits = rawMinRoll === 10 && !impossible;

  return {
    totalModifier: modifierTotal,
    rawMinRoll,
    minRoll,
    impossible,
    onlyTenHits,
    tenScoresCrit,
    nineScoresCrit,
    breakdown,
    isIndirect,
  };
}


/* ── 6. Transition ────────────────────────────────────────── */

/**
 * Animates the main content area out, calls the callback to update the DOM,
 * then animates the new content in.
 *
 * @param {'forward'|'backward'} direction
 * @param {function} callback  — DOM update to run between out and in animations
 */
function transition(direction, callback) {
  const el       = document.getElementById('mainContent');
  const outClass = direction === 'forward' ? 'slide-out-left'  : 'slide-out-right';
  const inClass  = direction === 'forward' ? 'slide-in-right'  : 'slide-in-left';

  el.classList.add(outClass);

  setTimeout(() => {
    el.classList.remove(outClass);
    callback();
    el.classList.add(inClass);
    // Remove the in-class once the animation completes so it can be re-triggered
    setTimeout(() => el.classList.remove(inClass), 260);
  }, 180);
}


/* ── 7. Rendering — Question ──────────────────────────────── */

/**
 * Builds the HTML for a single option button.
 * @param {Question} question
 * @param {Option}   option
 * @returns {string} HTML string
 */
function buildOptionHTML(question, option) {
  return `
    <li>
      <button
        class="option-btn"
        onclick="selectOption('${question.id}', '${option.value}')"
      >
        <span class="option-text-group">
          <span class="option-label">${option.label}</span>
          <span class="option-desc">${option.desc}</span>
        </span>
        <span class="option-badge ${badgeClass(option.modifier)}">
          ${formatModifier(option.modifier)}
        </span>
      </button>
    </li>
  `;
}

/**
 * Renders a question card into #mainContent and updates the progress bar.
 * @param {Question} question
 */
function renderQuestion(question) {
  const activeQuestions = QUESTIONS;
  const stepNumber      = activeQuestions.findIndex((q) => q.id === question.id) + 1;
  const totalSteps      = activeQuestions.length;
  const isFirstStep     = state.history.length === 0;

  // Update progress bar
  document.getElementById('progressContainer').classList.remove('hidden');
  document.getElementById('progressLabel').textContent = question.label;
  document.getElementById('progressCount').textContent = `${stepNumber} / ${totalSteps}`;
  document.getElementById('progressFill').style.width  = `${(stepNumber / totalSteps) * 100}%`;

  // Show Back and Reset only from step 2 onwards
  document.getElementById('backBtn').classList.toggle('hidden', isFirstStep);
  document.getElementById('resetBtn').classList.toggle('hidden', isFirstStep);

  const subtextHTML = question.subtext
    ? `<p class="q-subtext">${question.subtext}</p>`
    : '';

  const visibleOptions = question.options
  .filter((opt) => !opt.hideIf || !opt.hideIf(state.answers));

  const optionsHTML = visibleOptions
    .map((option) => buildOptionHTML(question, option))
    .join('');

  document.getElementById('mainContent').innerHTML = `
    <div class="card question-card">
      <p class="q-step-label">Step ${stepNumber} of ${totalSteps} — ${question.label}</p>
      <h2 class="q-text">${question.question}</h2>
      ${subtextHTML}
      <ul class="options-list">${optionsHTML}</ul>
    </div>
  `;
}


/* ── 8. Rendering — Result ────────────────────────────────── */

/**
 * Builds the roll display HTML (the large number at the top of the result card).
 * @param {ShotResult} result
 * @returns {string} HTML string
 */
function buildRollDisplayHTML(result) {
  if (result.impossible) {
    return `
      <div class="roll-display">
        <p class="roll-label">Minimum Roll Needed</p>
        <p class="roll-number impossible">—</p>
        <p class="roll-suffix impossible">No hits possible</p>
      </div>
    `;
  }

  const rollValue = result.onlyTenHits ? 10 : result.minRoll;
  const suffix    = result.onlyTenHits ? 'natural 10 only' : 'or higher to hit';

  return `
    <div class="roll-display">
      <p class="roll-label">Minimum Roll Needed</p>
      <p class="roll-number possible">${rollValue}</p>
      <p class="roll-suffix">${suffix}</p>
    </div>
  `;
}

/**
 * Builds the total modifier pill HTML.
 * @param {ShotResult} result
 * @returns {string} HTML string
 */
function buildModifierPillHTML(result) {
  return `
    <div class="modifier-pill-wrap">
      <span class="modifier-pill">
        <span class="pill-label">Total modifier</span>
        <span class="pill-value ${modifierClass(result.totalModifier)}">
          ${formatModifier(result.totalModifier)}
        </span>
      </span>
    </div>
  `;
}

/**
 * Builds the modifier breakdown table HTML.
 * @param {ShotResult} result
 * @returns {string} HTML string
 */
function buildBreakdownHTML(result) {
  if (result.breakdown.length === 0) {
    return `
      <div class="breakdown-section">
        <p class="section-title">Modifier Breakdown</p>
        <p class="no-modifiers">No modifiers apply — base target of 6.</p>
      </div>
    `;
  }

  const rowsHTML = result.breakdown
    .map((row) => `
      <li class="breakdown-row">
        <span class="breakdown-row-label">${row.label}</span>
        <span class="breakdown-row-mod ${modifierClass(row.modifier)}">
          ${formatModifier(row.modifier)}
        </span>
      </li>
    `)
    .join('');

  return `
    <div class="breakdown-section">
      <p class="section-title">Modifier Breakdown</p>
      <ul class="breakdown-list">${rowsHTML}</ul>
      <div class="breakdown-total-row">
        <span class="total-label">Total modifier</span>
        <span class="total-value ${modifierClass(result.totalModifier)}">
          ${formatModifier(result.totalModifier)}
        </span>
      </div>
    </div>
  `;
}

/**
 * Builds the notes / reminders section HTML.
 * Each note is { cls: CSS class string, text: HTML string }.
 * @param {ShotResult} result
 * @returns {string} HTML string
 */
function buildNotesHTML(result) {
  const notes = [];

  if (result.impossible) {
    notes.push({
      cls:  'note-danger',
      text: '<strong>No shots can hit.</strong> The required roll exceeds 10 — the maximum on a D10. Reposition or wait for better conditions.',
    });
  } else if (result.onlyTenHits) {
    notes.push({
      cls:  'note-warn',
      text: '<strong>Only a natural 10 can hit,</strong> which automatically scores a Critical Hit.',
    });
  } else {
    notes.push({
      cls:  'note-white',
      text: 'A natural roll of <strong>1</strong> always misses, regardless of modifiers.',
    });
    if (result.nineScoresCrit) {
      notes.push({ cls: 'note-white', text: 'Indirect weapon: natural rolls of <strong>9 or 10</strong> score a Critical Hit (provided they hit).' });
    } else if (result.tenScoresCrit) {
      notes.push({ cls: 'note-white', text: 'A natural roll of <strong>10</strong> scores a Critical Hit (provided it hits).' });
    } else {
      notes.push({ cls: 'note-warn',  text: 'Even a natural <strong>10</strong> does not score a hit — no Critical Hits are possible with this modifier.' });
    }
  }

  if (result.isIndirect) {
    notes.push({
      cls:  'note-info',
      text: '<strong>Indirect Deviation:</strong> On a miss, roll D6+2 inches in the direction the d10 shot die is pointing (measured from the target base centre). If this still hits the original target or the firing ship, the shot is a dud.',
    });
  }

  const notesHTML = notes
    .map((note) => `<div class="note ${note.cls}">${note.text}</div>`)
    .join('');

  return `<div class="notes-section">${notesHTML}</div>`;
}

/**
 * Renders the result card into #mainContent.
 * Hides the progress bar and nav buttons (the result card has its own restart button).
 */
function renderResult() {
  const result = calculateResult();

  // Hide navigation elements — the result card has its own "Calculate Another Shot" button
  document.getElementById('progressContainer').classList.add('hidden');
  document.getElementById('backBtn').classList.add('hidden');
  document.getElementById('resetBtn').classList.add('hidden');

  document.getElementById('mainContent').innerHTML = `
    <div class="card result-card">
      <p class="result-heading">Shot Result</p>
      ${buildRollDisplayHTML(result)}
      ${buildModifierPillHTML(result)}
      ${buildBreakdownHTML(result)}
      ${buildNotesHTML(result)}
      <button class="btn-restart" onclick="restart()">Calculate Another Shot</button>
    </div>
  `;
}


/* ── 9. Navigation ────────────────────────────────────────── */

/**
 * Called when the user selects an option.
 * Stores the answer, advances to the next question, or shows the result.
 * @param {string} questionId
 * @param {string} value
 */
function selectOption(questionId, value) {
  state.answers[questionId] = value;
  state.history.push(questionId);

  transition('forward', () => {
    const nextQuestion = getNextQuestion();
    if (nextQuestion) renderQuestion(nextQuestion);
    else              renderResult();
  });
}

/**
 * Called when the user taps Back.
 * Removes the most recent answer and re-renders that question.
 */
function goBack() {
  if (state.history.length === 0) return;

  const previousQuestionId = state.history.pop();
  delete state.answers[previousQuestionId];

  transition('backward', () => {
    renderQuestion(getQuestionById(previousQuestionId));
  });
}

/**
 * Called when the user taps Reset (or "Calculate Another Shot" on the result screen).
 * Clears all answers and returns to the first question.
 */
function restart() {
  state.answers = {};
  state.history = [];

  transition('backward', () => {
    document.getElementById('progressContainer').classList.remove('hidden');
    renderQuestion(QUESTIONS[0]);
  });
}


/* ── 10. Init ─────────────────────────────────────────────── */

/**
 * Entry point — renders the first question on page load.
 */
(function init() {
  renderQuestion(QUESTIONS[0]);
}());
