/* ---------- Word graph ---------- */

const WORD_SET = new Set(WORDS);

function buildGraph(words) {
  const byPattern = new Map();
  for (const w of words) {
    for (let i = 0; i < w.length; i++) {
      const pattern = w.slice(0, i) + '_' + w.slice(i + 1);
      if (!byPattern.has(pattern)) byPattern.set(pattern, []);
      byPattern.get(pattern).push(w);
    }
  }
  const graph = new Map();
  for (const w of words) graph.set(w, new Set());
  for (const group of byPattern.values()) {
    if (group.length < 2) continue;
    for (const w1 of group) {
      for (const w2 of group) {
        if (w1 !== w2) graph.get(w1).add(w2);
      }
    }
  }
  return graph;
}

const GRAPH = buildGraph(WORDS);

function bfsAll(start) {
  const dist = new Map([[start, 0]]);
  const parent = new Map();
  const queue = [start];
  let qi = 0;
  while (qi < queue.length) {
    const w = queue[qi++];
    for (const nb of GRAPH.get(w)) {
      if (!dist.has(nb)) {
        dist.set(nb, dist.get(w) + 1);
        parent.set(nb, w);
        queue.push(nb);
      }
    }
  }
  return { dist, parent };
}

function reconstructPath(target, parent, start) {
  const path = [target];
  let cur = target;
  while (cur !== start) {
    cur = parent.get(cur);
    path.push(cur);
  }
  return path.reverse();
}

function letterDiffCount(a, b) {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

/* ---------- Seeded RNG ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ---------- Puzzle generation ---------- */

const CANDIDATE_STARTS = WORDS.filter(w => GRAPH.get(w).size >= 2);

function findPuzzle(rng) {
  const ranges = [[4, 6], [3, 7], [3, 8], [2, 10]];
  for (const [minPar, maxPar] of ranges) {
    for (let attempt = 0; attempt < 120; attempt++) {
      const start = CANDIDATE_STARTS[Math.floor(rng() * CANDIDATE_STARTS.length)];
      const { dist, parent } = bfsAll(start);
      const candidates = [];
      for (const [word, d] of dist) {
        if (d >= minPar && d <= maxPar) candidates.push(word);
      }
      if (candidates.length) {
        const target = candidates[Math.floor(rng() * candidates.length)];
        return { start, target, par: dist.get(target), parent };
      }
    }
  }
  // Should never happen with this dictionary, but guarantee a puzzle.
  const start = CANDIDATE_STARTS[0];
  const { dist, parent } = bfsAll(start);
  let best = start, bestD = 0;
  for (const [word, d] of dist) if (d > bestD) { best = word; bestD = d; }
  return { start, target: best, par: bestD, parent };
}

function getDailyPuzzle() {
  const key = todayKey();
  const rng = mulberry32(hashStringToSeed('wld-daily-' + key));
  return { ...findPuzzle(rng), key, isDaily: true };
}

function getRandomPuzzle() {
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const rng = mulberry32(seed);
  return { ...findPuzzle(rng), key: 'random-' + seed, isDaily: false };
}

/* ---------- Persistent stats ---------- */

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem('wordLadderDuel.stats')) || { streak: 0, lastPlayedDate: null, bestByDate: {} };
  } catch {
    return { streak: 0, lastPlayedDate: null, bestByDate: {} };
  }
}

function saveStats(stats) {
  try { localStorage.setItem('wordLadderDuel.stats', JSON.stringify(stats)); } catch {}
}

function recordDailyCompletion(dateKey, moves) {
  const stats = loadStats();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (stats.lastPlayedDate !== dateKey) {
    stats.streak = stats.lastPlayedDate === yKey ? stats.streak + 1 : 1;
    stats.lastPlayedDate = dateKey;
  }
  if (!stats.bestByDate[dateKey] || moves < stats.bestByDate[dateKey]) {
    stats.bestByDate[dateKey] = moves;
  }
  saveStats(stats);
  return stats;
}

/* ---------- DOM refs ---------- */

const el = {
  dateLabel: document.getElementById('dateLabel'),
  setupScreen: document.getElementById('setupScreen'),
  gameScreen: document.getElementById('gameScreen'),
  resultScreen: document.getElementById('resultScreen'),
  modeBtns: document.querySelectorAll('.mode-btn'),
  duelNames: document.getElementById('duelNames'),
  p1Name: document.getElementById('p1Name'),
  p2Name: document.getElementById('p2Name'),
  playDailyBtn: document.getElementById('playDailyBtn'),
  playRandomBtn: document.getElementById('playRandomBtn'),
  statsRow: document.getElementById('statsRow'),
  turnBanner: document.getElementById('turnBanner'),
  moveCount: document.getElementById('moveCount'),
  parCount: document.getElementById('parCount'),
  timeCount: document.getElementById('timeCount'),
  ladder: document.getElementById('ladder'),
  targetRow: document.getElementById('targetRow'),
  guessForm: document.getElementById('guessForm'),
  guessInput: document.getElementById('guessInput'),
  feedback: document.getElementById('feedback'),
  undoBtn: document.getElementById('undoBtn'),
  hintBtn: document.getElementById('hintBtn'),
  giveUpBtn: document.getElementById('giveUpBtn'),
  quitBtn: document.getElementById('quitBtn'),
  resultCard: document.getElementById('resultCard'),
  playAgainBtn: document.getElementById('playAgainBtn'),
  tryAnotherBtn: document.getElementById('tryAnotherBtn'),
};

/* ---------- Session state ---------- */

let session = null; // { mode, puzzle, players: [...], currentPlayerIndex }
let selectedMode = 'solo';
let tickInterval = null;

function newPlayer(name) {
  return { name, chain: [session.puzzle.start], elapsedMs: 0, startTs: null, finished: false, hintsUsed: 0, gaveUp: false };
}

function movesOf(p) {
  return p.chain.length - 1;
}

function currentPlayer() {
  return session.players[session.currentPlayerIndex];
}

/* ---------- Screens ---------- */

function showScreen(name) {
  el.setupScreen.classList.toggle('hidden', name !== 'setup');
  el.gameScreen.classList.toggle('hidden', name !== 'game');
  el.resultScreen.classList.toggle('hidden', name !== 'result');
}

function renderSetupStats() {
  const stats = loadStats();
  const key = todayKey();
  const best = stats.bestByDate[key];
  const parts = [`🔥 ${stats.streak} day streak`];
  if (best) parts.push(`Today's best: ${best} moves`);
  el.statsRow.textContent = parts.join(' · ');
}

/* ---------- Setup interactions ---------- */

el.modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedMode = btn.dataset.mode;
    el.modeBtns.forEach(b => b.classList.toggle('active', b === btn));
    el.duelNames.classList.toggle('hidden', selectedMode !== 'duel');
  });
});

el.playDailyBtn.addEventListener('click', () => startSession(getDailyPuzzle()));
el.playRandomBtn.addEventListener('click', () => startSession(getRandomPuzzle()));

function startSession(puzzle) {
  const p1 = (el.p1Name.value.trim() || 'Player 1');
  const p2 = (el.p2Name.value.trim() || 'Player 2');
  session = {
    mode: selectedMode,
    puzzle,
    players: [],
    currentPlayerIndex: 0,
  };
  session.players.push(newPlayer(selectedMode === 'duel' ? p1 : 'You'));
  if (selectedMode === 'duel') session.players.push(newPlayer(p2));

  beginTurn();
  showScreen('game');
}

/* ---------- Turn / round management ---------- */

function beginTurn() {
  const p = currentPlayer();
  p.startTs = performance.now();
  p.elapsedMs = 0;

  if (session.mode === 'duel') {
    el.turnBanner.classList.remove('hidden');
    el.turnBanner.textContent = `${p.name}'s turn`;
    el.turnBanner.className = 'turn-banner ' + (session.currentPlayerIndex === 0 ? 'p1' : 'p2');
  } else {
    el.turnBanner.classList.add('hidden');
  }

  el.parCount.textContent = session.puzzle.par;
  el.feedback.textContent = '';
  el.feedback.className = 'feedback';
  el.guessInput.value = '';
  renderGame();
  startTicker();
  el.guessInput.focus();
}

function startTicker() {
  stopTicker();
  tickInterval = setInterval(() => {
    const p = currentPlayer();
    if (!p || p.finished) return;
    const ms = performance.now() - p.startTs;
    el.timeCount.textContent = formatTime(ms);
  }, 250);
}

function stopTicker() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = null;
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ---------- Rendering ---------- */

function makeTiles(word, prevWord) {
  const tiles = document.createElement('div');
  tiles.className = 'tiles';
  for (let i = 0; i < word.length; i++) {
    const t = document.createElement('div');
    t.className = 'tile';
    if (prevWord && prevWord[i] !== word[i]) t.classList.add('changed');
    t.textContent = word[i];
    tiles.appendChild(t);
  }
  return tiles;
}

function renderGame() {
  const p = currentPlayer();
  const { chain } = p;
  const target = session.puzzle.target;

  el.ladder.innerHTML = '';
  chain.forEach((word, i) => {
    const row = document.createElement('div');
    row.className = 'ladder-row' + (i === 0 ? ' start' : '');
    const label = document.createElement('span');
    label.className = 'row-label';
    label.textContent = i === 0 ? 'Start' : String(i);
    row.appendChild(label);
    row.appendChild(makeTiles(word, i === 0 ? null : chain[i - 1]));
    el.ladder.appendChild(row);
  });

  el.targetRow.innerHTML = '';
  const targetLabel = document.createElement('span');
  targetLabel.className = 'row-label';
  targetLabel.textContent = 'Target';
  el.targetRow.appendChild(targetLabel);
  el.targetRow.appendChild(makeTiles(target, null));
  el.targetRow.classList.toggle('reached', chain[chain.length - 1] === target);

  el.moveCount.textContent = movesOf(p);
  el.undoBtn.disabled = chain.length <= 1;
}

/* ---------- Guessing ---------- */

el.guessForm.addEventListener('submit', (e) => {
  e.preventDefault();
  submitGuess();
});

function submitGuess() {
  const p = currentPlayer();
  if (p.finished) return;
  const raw = el.guessInput.value.trim().toLowerCase();
  el.guessInput.value = '';

  if (raw.length !== 4) {
    return setFeedback('Word must be 4 letters.', false);
  }
  if (!WORD_SET.has(raw)) {
    return setFeedback(`"${raw.toUpperCase()}" isn't in the dictionary.`, false);
  }
  const last = p.chain[p.chain.length - 1];
  if (letterDiffCount(last, raw) !== 1) {
    return setFeedback('Change exactly one letter from the last word.', false);
  }
  if (p.chain.includes(raw)) {
    return setFeedback('You already used that word.', false);
  }

  p.chain.push(raw);
  setFeedback('', true);
  renderGame();

  if (raw === session.puzzle.target) {
    finishTurn(false);
  }
}

function setFeedback(msg, ok) {
  el.feedback.textContent = msg;
  el.feedback.className = 'feedback' + (ok ? ' ok' : '');
}

el.undoBtn.addEventListener('click', () => {
  const p = currentPlayer();
  if (p.finished || p.chain.length <= 1) return;
  p.chain.pop();
  renderGame();
});

el.hintBtn.addEventListener('click', () => {
  const p = currentPlayer();
  if (p.finished) return;
  const last = p.chain[p.chain.length - 1];
  const { parent } = bfsAll(last);
  if (!parent.has(session.puzzle.target)) return;
  const path = reconstructPath(session.puzzle.target, parent, last);
  const next = path[1];
  if (!next) return;
  if (p.chain.includes(next)) {
    return setFeedback('No forward hint from here — try Undo to backtrack.', false);
  }
  p.chain.push(next);
  p.hintsUsed++;
  setFeedback(`Hint used: ${next.toUpperCase()}`, true);
  renderGame();
  if (next === session.puzzle.target) finishTurn(false);
});

el.giveUpBtn.addEventListener('click', () => {
  const p = currentPlayer();
  if (p.finished) return;
  const { parent } = bfsAll(session.puzzle.start);
  const path = reconstructPath(session.puzzle.target, parent, session.puzzle.start);
  p.chain = path;
  p.gaveUp = true;
  renderGame();
  finishTurn(true);
});

el.quitBtn.addEventListener('click', () => {
  stopTicker();
  showScreen('setup');
  renderSetupStats();
});

/* ---------- Finishing ---------- */

function finishTurn(gaveUp) {
  const p = currentPlayer();
  p.finished = true;
  p.elapsedMs = performance.now() - p.startTs;
  stopTicker();

  if (session.puzzle.isDaily && !gaveUp) {
    recordDailyCompletion(session.puzzle.key, movesOf(p));
  }

  if (session.mode === 'duel' && session.currentPlayerIndex === 0) {
    showHandoff();
  } else {
    showResult();
  }
}

function showHandoff() {
  session.currentPlayerIndex = 1;
  showScreen('result');
  const p0 = session.players[0];
  el.resultCard.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'result-title';
  title.textContent = `${p0.name} finished!`;
  const sub = document.createElement('div');
  sub.className = 'result-sub';
  sub.textContent = p0.gaveUp
    ? `Gave up · ${movesOf(p0)} moves shown`
    : `${movesOf(p0)} moves in ${formatTime(p0.elapsedMs)} (par ${session.puzzle.par})`;
  const note = document.createElement('div');
  note.className = 'result-sub';
  note.textContent = 'Pass the device to the next player.';

  el.resultCard.appendChild(title);
  el.resultCard.appendChild(sub);
  el.resultCard.appendChild(note);

  el.playAgainBtn.textContent = `Start ${session.players[1].name}'s turn`;
  el.playAgainBtn.onclick = () => {
    el.playAgainBtn.textContent = 'Back to Menu';
    el.playAgainBtn.onclick = backToMenu;
    beginTurn();
    showScreen('game');
  };
  el.tryAnotherBtn.classList.add('hidden');
}

function showResult() {
  showScreen('result');
  el.resultCard.innerHTML = '';
  el.tryAnotherBtn.classList.remove('hidden');
  el.playAgainBtn.textContent = 'Back to Menu';
  el.playAgainBtn.onclick = backToMenu;

  if (session.mode === 'solo') {
    const p = session.players[0];
    const title = document.createElement('div');
    title.className = 'result-title';
    title.textContent = p.gaveUp ? 'Puzzle revealed' : 'Solved!';
    el.resultCard.appendChild(title);

    const sub = document.createElement('div');
    sub.className = 'result-sub';
    sub.textContent = p.gaveUp
      ? `The path took ${movesOf(p)} moves.`
      : `${movesOf(p)} moves in ${formatTime(p.elapsedMs)} · par ${session.puzzle.par}${p.hintsUsed ? ` · ${p.hintsUsed} hint(s)` : ''}`;
    el.resultCard.appendChild(sub);
  } else {
    const [p0, p1] = session.players;
    const title = document.createElement('div');
    title.className = 'result-title';

    let winner = null;
    if (!p0.gaveUp && !p1.gaveUp) {
      if (movesOf(p0) !== movesOf(p1)) winner = movesOf(p0) < movesOf(p1) ? p0 : p1;
      else winner = p0.elapsedMs <= p1.elapsedMs ? p0 : p1;
    } else if (!p0.gaveUp && p1.gaveUp) {
      winner = p0;
    } else if (p0.gaveUp && !p1.gaveUp) {
      winner = p1;
    }
    title.textContent = winner ? `${winner.name} wins!` : "It's a tie!";
    el.resultCard.appendChild(title);

    [p0, p1].forEach(p => {
      const line = document.createElement('div');
      line.className = 'result-line' + (winner === p ? ' winner' : '');
      const label = document.createElement('span');
      label.textContent = p.name;
      const val = document.createElement('span');
      val.textContent = p.gaveUp ? 'Gave up' : `${movesOf(p)} moves · ${formatTime(p.elapsedMs)}`;
      line.appendChild(label);
      line.appendChild(val);
      el.resultCard.appendChild(line);
    });

    const parLine = document.createElement('div');
    parLine.className = 'result-sub';
    parLine.textContent = `Par was ${session.puzzle.par} moves`;
    el.resultCard.appendChild(parLine);
  }
}

function backToMenu() {
  showScreen('setup');
  renderSetupStats();
}

el.playAgainBtn.onclick = backToMenu;
el.tryAnotherBtn.addEventListener('click', () => startSession(getRandomPuzzle()));

/* ---------- Init ---------- */

function updateDateLabel() {
  const d = new Date();
  el.dateLabel.textContent = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

updateDateLabel();
renderSetupStats();
showScreen('setup');
