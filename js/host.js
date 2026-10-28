/* =====================================================================
   HOST (big screen) — the "brain" of the game.
   Holds all state, scores everything, broadcasts to players.
   Share THIS window on Teams/Zoom with "include computer sound" ON.
   ===================================================================== */
(function () {
  const C = window.CONTENT, CFG = window.TSSI_CONFIG || {};
  const { esc, $, flag, fmt, num, ranked, countryBars, matchSurvey } = U;
  const stage = $("#stage");
  const PLAN = { lobby: 5, cards: 8, translate: 8, price: 9, derby: 10, fortunes: 10, final: 3 }; // minutes (45 total)
  const RACE_LEN = 1300;
  const FINAL_REVEAL_MS = 8700;

  /* ---------------- state ---------------- */
  let S = null, T = null, steps = [];
  let lastPub = 0, pubTimer = null, saveTimer = null, raceTimer = null, autoTimer = null, lastSec = -1;

  /* every timeout a screen schedules goes through later(), so leaving the
     screen cancels them (no stray drumrolls/flips on the next screen) */
  const timers = new Set();
  function later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; }
  function clearLater() { timers.forEach(clearTimeout); timers.clear(); clearTimeout(autoTimer); autoTimer = null; clearInterval(raceTimer); raceTimer = null; document.querySelectorAll(".confetti").forEach((c) => c.remove()); }

  function buildSteps() {
    const s = [{ k: "lobby" }];
    C.order.forEach((g) => {
      s.push({ k: "intro", g });
      if (g === "cards") for (let i = 0; i < C.cards.rows * (C.cards.perRow - 1); i++) s.push({ k: "q", g, i }, { k: "reveal", g, i });
      if (g === "translate") C.translate.questions.forEach((_, i) => s.push({ k: "q", g, i }, { k: "reveal", g, i }));
      if (g === "price") C.price.items.forEach((_, i) => s.push({ k: "q", g, i }, { k: "reveal", g, i }));
      if (g === "derby") for (let r = 0; r < C.derby.races; r++) s.push({ k: "pick", g, i: r }, { k: "race", g, i: r }, { k: "result", g, i: r });
      if (g === "fortunes") C.fortunes.questions.forEach((_, i) => s.push({ k: "q", g, i }, { k: "reveal", g, i }));
      s.push({ k: "board", g });
    });
    s.push({ k: "final" });
    return s;
  }

  function fresh(room) {
    return { room, step: 0, players: {}, kicked: {}, ans: {}, poll: {}, paid: {}, picks: {}, cheers: {}, race: null,
      deltas: {}, scored: {}, snap: {}, deadline: 0, showStart: 0, holdUntil: 0, created: Date.now() };
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem("tssi-host-" + S.room, JSON.stringify(S)); localStorage.setItem("tssi-host-last", S.room); } catch (e) {}
    }, 300);
  }
  const cur = () => steps[S.step];
  const game = () => C[cur().g];
  const qCount = (g) => (g === "price" ? C.price.items.length : g === "cards" ? C.cards.rows * (C.cards.perRow - 1) : C[g].questions.length);
  /* cards: step index → [row, position of the current card in that row] */
  const cardPos = (i) => [Math.floor(i / (C.cards.perRow - 1)), i % (C.cards.perRow - 1)];
  const ensureDeck = () => { if (!S.deck) { S.deck = U.deal(C.cards.rows, C.cards.perRow); S.streak = {}; } };
  const pname = (id) => (S.players[id] ? S.players[id].name : "");
  const pflag = (id) => flag(S.players[id] && S.players[id].country);

  /* ---------------- messaging ---------------- */
  function onMsg(m) {
    if (!m || !m.t || !S || typeof m.id !== "string") return;
    const st = cur();
    if (m.t === "join") {
      if (S.kicked[m.id]) return pubSoon();
      const name = String(m.name || "Player").replace(/\s+/g, " ").trim().slice(0, 18) || "Player";
      const country = C.countries.some((c) => c.id === m.country) ? m.country : "XX";
      if (!S.players[m.id]) {
        const taken = new Set(Object.values(S.players).map((p) => p.name.toLowerCase()));
        let n = name, k = 2; while (taken.has(n.toLowerCase())) n = name.slice(0, 15) + " " + k++;
        S.players[m.id] = { name: n, country, score: 0, g: {} };
        Music.sfx("pop");
        if (st.k === "lobby") addChip(m.id);
      } else S.players[m.id].country = country;
      updateCounts(); save(); pubSoon(); return; // throttled: a burst of joins = one broadcast
    }
    const p = S.players[m.id]; if (!p || m.step !== S.step) return;
    const open = Date.now() <= S.deadline + 1500;
    if (m.t === "vote" && st.k === "intro") {
      const v = +m.v; if (!(v >= 0 && v < game().poll.options.length)) return;
      const key = S.step + ":" + m.id;
      if (!S.paid[key]) { S.paid[key] = 1; addPoints(m.id, 50, st.g); } // once per player, even if the host goes back
      S.poll[m.id] = v; updatePoll(); save(); pubSoon();
    }
    if (m.t === "answer" && st.k === "q" && open && !S.scored[S.step + 1]) {
      if (st.g === "cards" && !S.ans[m.id]) { const v = +m.v; if (v === 0 || v === 1) S.ans[m.id] = { v, at: Date.now() }; }
      if (st.g === "translate" && !S.ans[m.id]) {
        const v = +m.v; if (v >= 0 && v < 4) S.ans[m.id] = { v, at: Date.now() };
      }
      if (st.g === "price") { const v = U.parseNum(m.v); if (isFinite(v)) S.ans[m.id] = { v, at: Date.now() }; }
      if (st.g === "fortunes") {
        const a = S.ans[m.id] || { list: [], done: false };
        if (m.done) a.done = true;
        const txt = String(m.v || "").trim().slice(0, 40);
        if (txt && a.list.length < C.fortunes.maxAnswers && !a.list.some((x) => U.norm(x) === U.norm(txt))) a.list.push(txt);
        if (a.list.length >= C.fortunes.maxAnswers) a.done = true;
        S.ans[m.id] = a;
      }
      updateCounts(); save(); pubSoon(); checkAllIn();
    }
    if (m.t === "pick" && st.k === "pick" && open) {
      const v = +m.v; if (!(v >= 0 && v < C.derby.horses.length)) return;
      S.picks[m.id] = v; updatePicks(); save(); pubSoon();
    }
    if (m.t === "cheer" && st.k === "race" && S.race && !S.race.done) {
      const h = S.picks[m.id]; if (h == null) return;
      const n = Math.max(0, Math.min(40, +m.n || 0));
      S.race.cheerNow[h] = (S.race.cheerNow[h] || 0) + n;
      S.cheers[m.id] = (S.cheers[m.id] || 0) + n;
    }
  }

  function publicState() {
    const st = cur(), g = st.g ? C[st.g] : null;
    let view = {};
    if (st.k === "intro") view = { title: g.title, tagline: g.tagline, rules: g.rules, poll: g.poll, counts: pollCounts() };
    if (st.k === "q" || st.k === "reveal") {
      if (st.g === "translate") { const q = g.questions[st.i]; view = { q: q.q, options: q.options }; if (st.k === "reveal") Object.assign(view, { answer: q.answer, fact: q.fact }); }
      if (st.g === "price") { const it = g.items[st.i]; view = { emoji: it.emoji, name: it.name, detail: it.detail, currency: it.currency }; if (st.k === "reveal") Object.assign(view, { answer: it.answer, fact: it.fact }); }
      if (st.g === "fortunes") { const q = g.questions[st.i]; view = { q: q.q, max: g.maxAnswers }; if (st.k === "reveal") view.answers = q.answers.map((a) => ({ text: a.text, pts: a.pts })); }
      if (st.g === "cards") {
        ensureDeck();
        const [r, c] = cardPos(st.i), row = S.deck[r];
        view = { row: r + 1, rows: g.rows, call: c + 1, calls: g.perRow - 1, cur: row[c], shown: row.slice(0, c + 1) };
        if (st.k === "q") view.split = cardSplit();
        if (st.k === "reveal") { const sn = S.snap[S.step] || {}; Object.assign(view, { next: row[c + 1], res: sn.res, split: sn.counts, streak: sn.streaks || {} }); }
      }
      view.n = st.i + 1; view.of = qCount(st.g);
    }
    if (st.k === "pick" || st.k === "race" || st.k === "result") {
      view = { horses: g.horses.map((h) => ({ name: h.name, color: h.color, odds: h.odds, pays: h.pays })), race: st.i + 1, of: g.races };
      if (st.k === "result") { const sn = S.snap[S.step] || {}; view.order = sn.order || []; view.abandoned = !!sn.abandoned; }
    }
    return {
      t: "state", room: S.room, step: S.step, k: st.k, g: st.g || null, i: st.i == null ? null : st.i,
      gameTitle: g ? g.title : null, view,
      rem: S.deadline ? Math.max(0, S.deadline - Date.now()) : 0,
      hold: Math.max(0, (S.holdUntil || 0) - Date.now()),   // phones wait this long so they don't spoil the big reveal
      lb: ranked(S.players).map((p) => [p.id, p.name, p.country, p.score]),
      deltas: S.deltas, kicked: Object.keys(S.kicked), ts: Date.now(),
      got: gotMap(st)
    };
  }
  /* which players' inputs the host has received this step — phones resend if theirs is missing */
  function gotMap(st) {
    const m = {};
    if (st.k === "intro") Object.keys(S.poll).forEach((id) => (m[id] = 1));
    if (st.k === "pick") Object.keys(S.picks).forEach((id) => (m[id] = 1));
    if (st.k === "q") Object.entries(S.ans).forEach(([id, a]) => (m[id] = a.list ? a.list.length + (a.done ? 100 : 0) : 1));
    return m;
  }
  function pub(force) {
    if (!T) return;
    const now = Date.now();
    if (!force && now - lastPub < 1500) return pubSoon();
    clearTimeout(pubTimer); pubTimer = null;
    lastPub = now; T.send(publicState());
  }
  function pubSoon() { if (!pubTimer) pubTimer = setTimeout(() => { pubTimer = null; pub(true); }, Math.max(250, 1500 - (Date.now() - lastPub))); }

  function addPoints(id, pts, g) {
    const p = S.players[id]; if (!p || !pts) return;
    p.score += pts; p.g[g] = (p.g[g] || 0) + pts;
    S.deltas[id] = (S.deltas[id] || 0) + pts;
  }

  /* ---------------- navigation ---------------- */
  /* An answer/betting/race step that has already been scored can't be replayed
     (it would double-count points), so landing on one shows its reveal instead. */
  function resolve(idx, dir) {
    idx = Math.max(0, Math.min(steps.length - 1, idx));
    const s = steps[idx];
    const resultOf = s.k === "q" ? idx + 1 : s.k === "pick" ? idx + 2 : s.k === "race" ? idx + 1 : -1;
    if (resultOf > 0 && S.scored[resultOf]) return dir < 0 ? resolve(idx - 1, -1) : resultOf;
    return idx;
  }
  function go(idx, dir) {
    // jumping from a running race straight to its result: finish the race instantly instead of abandoning it
    if (S.step < steps.length && cur().k === "race" && idx === S.step + 1 && !(S.race && S.race.done)) {
      if (!S.race) S.race = newRace();
      let guard = 0; while (S.race.order.length < C.derby.horses.length && guard++ < 5000) raceTick(S.race);
      S.race.done = true;
    }
    clearLater();
    S.step = resolve(idx, dir || 1);
    const st = cur();
    S.deadline = 0; S.holdUntil = 0; S.allIn = false; lastSec = -1;
    S.deltas = (S.snap[S.step] && S.snap[S.step].deltas) || {};
    if (st.k === "intro") S.poll = {};
    if (st.g === "cards") ensureDeck();
    if (st.k === "q") { S.ans = {}; S.qStart = Date.now(); S.deadline = S.qStart + game().seconds * 1000; }
    if (st.k === "pick") { S.picks = {}; S.cheers = {}; S.race = null; S.deadline = Date.now() + C.derby.pickSeconds * 1000; }
    if (st.k === "reveal" && st.g === "cards") S.holdUntil = Date.now() + 1100;
    if (st.k === "reveal" && st.g === "price") S.holdUntil = Date.now() + 2400;
    if (st.k === "reveal" && st.g === "fortunes") S.holdUntil = Date.now() + 1200 + game().questions[st.i].answers.length * 900;
    if (st.k === "final") S.holdUntil = Date.now() + FINAL_REVEAL_MS + 300;
    if (!S.showStart && st.k !== "lobby") S.showStart = Date.now();
    enter(); save(); pub(true); syncJump();
  }
  function next() {
    const st = cur();
    if (st.k === "race" && !(S.race && S.race.done)) { finishRaceNow(); return; } // first press: photo-finish, second press: result
    if (S.step < steps.length - 1) go(S.step + 1, 1);
  }
  const back = () => go(S.step - 1, -1);

  function checkAllIn() {
    const st = cur(); if (st.k !== "q") return;
    const ids = Object.keys(S.players); if (!ids.length) return;
    const done = ids.every((id) => S.ans[id] && (st.g !== "fortunes" || S.ans[id].done));
    if (done && S.deadline - Date.now() > 2500) { S.allIn = true; S.deadline = Date.now() + 2000; pub(true); }
  }

  /* ---------------- screens ---------------- */
  function enter() {
    const st = cur();
    stage.className = "stage k-" + st.k + (st.g ? " g-" + st.g : "");
    ({ lobby: vLobby, intro: vIntro, q: vQuestion, reveal: vReveal, pick: vPick, race: vRace, result: vResult, board: vBoard, final: vFinal })[st.k]();
    updateCounts();
    fitStage();
  }

  /* Shrinks the stage text until everything fits — works for any window size or crowd size. */
  function fitStage() {
    stage.style.fontSize = "";
    let size = parseFloat(getComputedStyle(stage).fontSize), n = 0;
    while ((stage.scrollHeight > stage.clientHeight + 1 || stage.scrollWidth > stage.clientWidth + 1) && size > 9 && n++ < 30) {
      size *= 0.95; stage.style.fontSize = size + "px";
    }
  }

  function joinUrl() {
    // resolve next to the host page, so /host, /host.html and sub-folders all work
    const u = new URL("play.html", location.href);
    u.search = "?room=" + S.room;
    return u.href;
  }

  function vLobby() {
    Music.play("lobby", true);
    stage.innerHTML = `
      <div class="lobby">
        <div class="lobby-left">
          <div class="marquee-title"><span>${esc(CFG.EVENT_TITLE || "Global HR Social Connect")}</span></div>
          <h1 class="show-name">THE BIG <em>HR</em> GAME SHOW</h1>
          <p class="hello">Hello 🇬🇧 · Howdy 🇺🇸 · Hallo 🇩🇪 · ¡Hola! 🇨🇷 — grab your phone (or open a new browser tab)!</p>
          <div class="join-box">
            <div id="qr" class="qr"></div>
            <div class="join-info">
              <div class="join-label">Go to</div>
              <div class="join-url">${esc(joinUrl().replace(/^https?:\/\//, "").replace(/\?room=.*/, ""))}</div>
              <div class="join-label">Room code</div>
              <div class="room-code">${esc(S.room)}</div>
            </div>
          </div>
        </div>
        <div class="lobby-right">
          <div class="lobby-count"><b id="pcount">0</b> <span id="pword">players</span> in the studio</div>
          <div id="nationCount" class="nation-count"></div>
          <div id="chips" class="chips"><p class="empty-chips">Waiting for the first contestant…</p></div>
          <div id="chipMore" class="chip-more"></div>
          <p class="hint">Click a name to remove it</p>
        </div>
      </div>`;
    const qr = $("#qr");
    try { new QRCode(qr, { text: joinUrl(), width: 180, height: 180, colorDark: "#14123a", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M }); }
    catch (e) { qr.remove(); stage.querySelector(".join-box").classList.add("no-qr"); }
    Object.keys(S.players).forEach(addChip);
  }
  function addChip(id) {
    const box = $("#chips"); if (!box || box.querySelector(`[data-id="${id}"]`)) return;
    const p = S.players[id];
    const empty = box.querySelector(".empty-chips"); if (empty) empty.remove();
    const el = document.createElement("button");
    el.className = "chip"; el.dataset.id = id; el.title = "Remove " + p.name;
    el.innerHTML = `${flag(p.country)} ${esc(p.name)}`;
    el.onclick = () => {
      if (!confirm("Remove " + p.name + " from the game?")) return;
      S.kicked[id] = true; delete S.players[id]; el.remove(); updateCounts(); save(); pub(true);
    };
    box.prepend(el); // newest first, so new arrivals are always visible
    updateChipMore();
  }
  function updateChipMore() {
    const box = $("#chips"), more = $("#chipMore"); if (!box || !more) return;
    const limit = box.clientHeight;
    let hidden = 0;
    [...box.children].forEach((c) => {
      // offsetTop ignores the pop-in animation's transform; hide half-visible rows completely
      const clipped = c.offsetTop + c.offsetHeight > limit + 1;
      c.classList.toggle("clip", clipped); if (clipped) hidden++;
    });
    more.textContent = hidden ? `+ ${hidden} more` : "";
  }

  function vIntro() {
    const g = game(), st = cur();
    const num_ = C.order.indexOf(st.g) + 1;
    Music.sfx("whoosh");
    later(() => Music.play(g.jingle, false, "lobby"), 250);
    stage.innerHTML = `
      <div class="intro">
        <div class="round-badge">ROUND ${num_} of ${C.order.length}</div>
        <h1 class="intro-title">${esc(g.title)}</h1>
        <p class="intro-tag">${esc(g.tagline)}</p>
        <div class="intro-grid">
          <ol class="rules">${g.rules.map((r) => `<li>${esc(r)}</li>`).join("")}</ol>
          <div class="poll card">
            <div class="poll-q"><span class="poll-tag">📱 Warm-up vote</span>${esc(g.poll.q)}</div>
            <div id="pollBars">${g.poll.options.map((o, i) => `<div class="pbar"><span>${esc(o)}</span><span class="ptrack"><i data-i="${i}"></i></span><b data-c="${i}">0</b></div>`).join("")}</div>
            <div class="poll-note">+50 pts just for voting!</div>
          </div>
        </div>
      </div>`;
    updatePoll();
  }
  function pollCounts() {
    const n = game().poll.options.length, c = new Array(n).fill(0);
    Object.values(S.poll).forEach((v) => { if (v >= 0 && v < n) c[v]++; });
    return c;
  }
  function updatePoll() {
    if (cur().k !== "intro") return;
    const c = pollCounts(), max = Math.max(1, ...c);
    c.forEach((v, i) => {
      const bar = stage.querySelector(`#pollBars i[data-i="${i}"]`), lab = stage.querySelector(`#pollBars b[data-c="${i}"]`);
      if (bar) { bar.style.width = (v / max) * 100 + "%"; bar.classList.toggle("lead", v === max && v > 0); }
      if (lab) lab.textContent = v;
    });
  }

  function timerHtml() { return `<div class="timer"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44"/><circle id="tring" cx="50" cy="50" r="44"/></svg><span id="tnum"></span></div>`; }
  const head = (label, right) => `<div class="qhead"><span class="qnum">${label}</span>${right || ""}</div>`;
  const answered = (word) => `${timerHtml()}<span class="answered"><b id="acount">0</b>/<span id="pcount2">0</span> ${word}</span>`;

  function vQuestion() {
    const st = cur(), g = game();
    Music.play("think", true);
    let body = "";
    if (st.g === "cards") {
      const [r, c] = cardPos(st.i), row = S.deck[r];
      body = `<div class="cardrow">${row.map((cd, j) => (j <= c ? U.cardHtml(cd, j === c ? "cur" : "done") : U.cardHtml(null, j === c + 1 ? "next" : ""))).join("")}</div>
        <h2 class="qtext">Higher or lower than the <b class="hl-card">${esc(U.RANK_NAMES[row[c][0]])}</b>?</h2>
        <div class="hl">
          <div class="hlbox higher"><b>⬆ HIGHER</b><span class="hlbar"><i id="hiBar"></i></span><span id="hiN" class="hln">0</span></div>
          <div class="hlbox lower"><b>⬇ LOWER</b><span class="hlbar"><i id="loBar"></i></span><span id="loN" class="hln">0</span></div>
        </div>`;
      later(() => Music.sfx("whoosh"), 50);
    }
    if (st.g === "translate") {
      const q = g.questions[st.i];
      body = `<h2 class="qtext">${esc(q.q)}</h2><div class="opts">${q.options.map((o, i) => `<div class="opt o${i}"><span class="ol">${"ABCD"[i]}</span><span class="otext">${esc(o)}</span></div>`).join("")}</div>`;
    }
    if (st.g === "price") {
      const it = g.items[st.i];
      body = `<div class="price-item"><div class="big-emoji">${it.emoji}</div><h2 class="qtext">${esc(it.name)}</h2><p class="detail">${esc(it.detail)}</p>
        <div class="price-tag">${esc(it.currency)} ???</div><p class="detail">Closest <b>without going over</b> wins!</p></div>`;
    }
    if (st.g === "fortunes") {
      const q = g.questions[st.i];
      body = `<div class="survey-intro">We asked 100 colleagues across 🇬🇧 🇺🇸 🇩🇪 🇨🇷…</div><h2 class="qtext big">${esc(q.q)}</h2>
        <div class="fboard">${q.answers.map((_, i) => `<div class="fslot hidden"><span class="fnum">${i + 1}</span><span class="ftext"></span><span class="fpts"></span></div>`).join("")}</div>
        <p class="detail center">Type up to ${g.maxAnswers} answers on your phone — English, Deutsch or Español!</p>`;
    }
    stage.innerHTML = `<div class="question">${head(`${esc(g.title)} · ${st.i + 1}/${qCount(st.g)}`, answered("in"))}${body}</div>`;
  }

  function vReveal() {
    const st = cur(), g = game();
    Music.stop(0.3);
    if (!S.scored[S.step]) { S.scored[S.step] = true; S.deltas = {}; S.snap[S.step] = scoreStep(st); S.snap[S.step].deltas = S.deltas; save(); }
    const sn = S.snap[S.step] || { deltas: {} }; // (older saves may lack a snapshot)
    const label = `${esc(g.title)} · ${st.i + 1}/${qCount(st.g)}`;
    if (st.g === "cards") {
      const [r, c] = cardPos(st.i), row = S.deck[r], res = sn.res;
      const lo = (sn.counts || [0, 0])[0], hi = (sn.counts || [0, 0])[1], tot = Math.max(1, lo + hi);
      const verdict = res === 1 ? "⬆ HIGHER!" : res === 0 ? "⬇ LOWER!" : "🫰 SNAP! Same value — the house wins!";
      const fire = Object.entries(sn.streaks || {}).filter(([id, n]) => n >= 3 && S.players[id]).sort((a, b) => b[1] - a[1]).slice(0, 4);
      stage.innerHTML = `<div class="question">${head(`${esc(g.title)} · Row ${r + 1}, card ${c + 2}`)}
        <div class="cardrow">${row.map((cd, j) => (j <= c ? U.cardHtml(cd, j === c ? "cur" : "done") : j === c + 1 ? `<div class="flipper" id="flipper">${U.cardHtml(null, "next")}</div>` : U.cardHtml(null, ""))).join("")}</div>
        <div id="cres" class="cres hidden">
          <div class="verdict-big ${res === 1 ? "up" : res === 0 ? "down" : "snap"}">${verdict}</div>
          <div class="hl small">
            <div class="hlbox higher ${res === 1 ? "win" : ""}"><b>⬆ HIGHER</b><span class="hlbar"><i style="width:${(hi / tot) * 100}%"></i></span><span class="hln">${hi}</span></div>
            <div class="hlbox lower ${res === 0 ? "win" : ""}"><b>⬇ LOWER</b><span class="hlbar"><i style="width:${(lo / tot) * 100}%"></i></span><span class="hln">${lo}</span></div>
          </div>
          ${fire.length ? `<div class="shout">🔥 On fire: ${fire.map(([id, n]) => `${pflag(id)} <b>${esc(pname(id))}</b> (${n} in a row)`).join(" · ")}</div>` : ""}
          ${miniBoard()}
        </div></div>`;
      Music.sfx("drumroll");
      later(() => {
        const f = $("#flipper"); if (f) { f.innerHTML = U.cardHtml(row[c + 1], "flip reveal"); }
        const cr = $("#cres"); if (cr) cr.classList.remove("hidden");
        Music.sfx(res === -1 ? "buzz" : "ding"); if (res !== -1) Music.sfx("applause");
      }, 1000);
    }
    if (st.g === "translate") {
      const q = g.questions[st.i], c = sn.counts || [0, 0, 0, 0], max = Math.max(1, ...c);
      stage.innerHTML = `<div class="question">${head(label)}
        <h2 class="qtext">${esc(q.q)}</h2>
        <div class="opts">${q.options.map((o, i) => `<div class="opt o${i} ${i === q.answer ? "right" : "wrong"}"><span class="ol">${i === q.answer ? "✓" : "ABCD"[i]}</span><span class="otext">${esc(o)}</span><span class="ocount"><span class="obar"><i style="width:${(c[i] / max) * 100}%"></i></span>${c[i]}</span></div>`).join("")}</div>
        <div class="fact">💡 ${esc(q.fact)}</div>
        ${sn.fastest && S.players[sn.fastest] ? `<div class="shout">⚡ Fastest finger: ${pflag(sn.fastest)} <b>${esc(pname(sn.fastest))}</b></div>` : ""}
        ${miniBoard()}</div>`;
      Music.sfx("ding");
    }
    if (st.g === "price") {
      const it = g.items[st.i], rows = sn.rows || [];
      stage.innerHTML = `<div class="question">${head(label)}
        <div class="price-item"><div class="big-emoji">${it.emoji}</div><h2 class="qtext">${esc(it.name)}</h2>
        <div class="price-tag" id="ptag">${esc(it.currency)} ???</div></div>
        <div id="pres" class="pres hidden">
          <div class="fact">💡 ${esc(it.fact)}</div>
          ${rows.length ? `<div class="guesses">${rows.map((r, i) => `<div class="guess ${r.over ? "over" : ""}"><span class="grank">${i + 1}</span><span class="gname">${pflag(r.id)} ${esc(pname(r.id) || "?")}</span><b>${esc(it.currency)}${num(r.v)}</b>${r.over ? "<em>OVER!</em>" : `<em>+${fmt((sn.deltas || {})[r.id] || 0)}</em>`}</div>`).join("")}</div>` : `<p class="center">No guesses this time!</p>`}
        </div></div>`;
      Music.sfx("drumroll");
      later(() => {
        const t = $("#ptag"); if (t) { t.textContent = it.currency + num(it.answer); t.classList.add("pop"); }
        const pr = $("#pres"); if (pr) pr.classList.remove("hidden");
        Music.sfx("ding"); Music.sfx("applause");
      }, 2100);
    }
    if (st.g === "fortunes") {
      const q = g.questions[st.i], hits = sn.hits || [], misses = sn.miss || [];
      stage.innerHTML = `<div class="question">${head(label)}
        <h2 class="qtext">${esc(q.q)}</h2>
        <div class="fboard">${q.answers.map((a, i) => `<div class="fslot hidden" data-i="${i}"><span class="fnum">${i + 1}</span><span class="ftext">${esc(a.text)} <small>${hits[i] || 0} of you</small></span><span class="fpts">${a.pts}</span></div>`).join("")}</div>
        <div id="fmiss" class="fmiss hidden">${misses.length ? `<span class="bigx">✖</span> Not on the board: <b>“${esc(misses[0][0])}”</b> (${misses[0][1]} ${misses[0][1] === 1 ? "person" : "people"})` : "&nbsp;"}</div>
        <div id="fmini" class="hidden">${miniBoard() || "&nbsp;"}</div></div>`;
      const order = q.answers.map((_, i) => i).reverse();
      order.forEach((idx, n) => later(() => {
        const el = stage.querySelector(`.fslot[data-i="${idx}"]`); if (!el) return;
        el.classList.remove("hidden"); el.classList.add("flip"); Music.sfx("reveal");
      }, 600 + n * 900));
      later(() => {
        const fm = $("#fmiss"); if (fm) { fm.classList.remove("hidden"); if (misses.length) Music.sfx("buzz"); }
        const mini = $("#fmini"); if (mini) mini.classList.remove("hidden");
      }, 900 + order.length * 900);
    }
  }

  /* Scores the question just closed and returns a snapshot for the reveal screen. */
  function scoreStep(st) {
    const g = game(), sn = {};
    if (st.g === "translate") {
      const q = g.questions[st.i], total = g.seconds * 1000, start = S.qStart || (S.deadline - total);
      const counts = [0, 0, 0, 0];
      let best = null;
      Object.entries(S.ans).forEach(([id, a]) => {
        counts[a.v] = (counts[a.v] || 0) + 1;
        if (a.v !== q.answer) return;
        const frac = Math.max(0, Math.min(1, 1 - (a.at - start) / total));
        addPoints(id, 500 + Math.round(500 * frac), st.g);
        if (!best || a.at < best.at) best = { id, at: a.at };
      });
      sn.counts = counts; sn.fastest = best && best.id;
    }
    if (st.g === "cards") {
      ensureDeck();
      const [r, c] = cardPos(st.i), row = S.deck[r];
      const res = row[c + 1][0] > row[c][0] ? 1 : row[c + 1][0] < row[c][0] ? 0 : -1;
      if (c === 0) S.streak = {};                       // streaks restart with each new row
      const counts = [0, 0];
      Object.keys(S.players).forEach((id) => {
        const a = S.ans[id];
        if (a) counts[a.v]++;
        if (res >= 0 && a && a.v === res) { S.streak[id] = (S.streak[id] || 0) + 1; addPoints(id, 400 + 100 * S.streak[id], st.g); }
        else S.streak[id] = 0;
      });
      sn.res = res; sn.counts = counts;
      sn.streaks = Object.fromEntries(Object.entries(S.streak).filter(([, n]) => n >= 2));
    }
    if (st.g === "price") {
      const ans = g.items[st.i].answer;
      const under = Object.entries(S.ans).filter(([, a]) => a.v <= ans).sort((a, b) => b[1].v - a[1].v);
      const prizes = [1000, 600, 400];
      let place = 0, lastD = null;
      under.forEach(([id, a], idx) => {
        const d = ans - a.v;
        if (lastD === null || d !== lastD) place = idx; lastD = d;          // ties share a place
        if (Math.abs(d) < 1e-9) addPoints(id, 2000, st.g);
        else if (place < 3) addPoints(id, prizes[place], st.g);
        else if (d <= ans * 0.25) addPoints(id, 200, st.g);
      });
      if (!under.length && Object.keys(S.ans).length) { // everyone over → consolation for the closest
        const best = Object.entries(S.ans).sort((a, b) => a[1].v - b[1].v)[0];
        addPoints(best[0], 300, st.g);
      }
      sn.rows = Object.entries(S.ans).map(([id, a]) => ({ id, v: a.v, over: a.v > ans, d: Math.abs(ans - a.v) }))
        .sort((a, b) => (a.over - b.over) || a.d - b.d).slice(0, 6);
    }
    if (st.g === "fortunes") {
      const q = g.questions[st.i], hits = new Array(q.answers.length).fill(0), missMap = {};
      Object.entries(S.ans).forEach(([id, a]) => {
        const got = new Set();
        (a.list || []).forEach((txt) => {
          const k = matchSurvey(txt, q.answers);
          if (k >= 0) got.add(k);
          else { const n = U.norm(txt); if (n) { missMap[n] = missMap[n] || [txt, 0]; missMap[n][1]++; } }
        });
        got.forEach((k) => { hits[k]++; addPoints(id, q.answers[k].pts * 10, st.g); });
      });
      sn.hits = hits;
      sn.miss = Object.values(missMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
    }
    return sn;
  }

  function miniBoard() {
    const top = Object.entries(S.deltas).sort((a, b) => b[1] - a[1]).slice(0, 3).filter(([, v]) => v > 0);
    if (!top.length) return "";
    return `<div class="mini"><span class="mini-label">This round:</span>${top.map(([id, v]) => `<span>${pflag(id)} ${esc(pname(id))} <b>+${fmt(v)}</b></span>`).join("")}</div>`;
  }

  /* ---------------- Desk Derby ---------------- */
  function vPick() {
    const g = C.derby, st = cur();
    Music.play("lobby", true);
    stage.innerHTML = `<div class="question">${head(`${esc(g.title)} · Race ${st.i + 1}/${g.races}`, answered("backed"))}
      <h2 class="qtext">Place your bets! Pick a horse on your phone 🏇</h2>
      <div class="runners">${g.horses.map((h, i) => `<div class="runner" style="--c:${h.color}"><span class="silk">${i + 1}</span><b>${esc(h.name)}</b><span class="odds">${h.odds}/1 · wins ${fmt(h.pays)}</span><span class="backers" data-h="${i}">0 backers</span></div>`).join("")}</div></div>`;
    updatePicks();
  }
  function updatePicks() {
    if (cur().k !== "pick") return;
    const c = {}; Object.values(S.picks).forEach((h) => (c[h] = (c[h] || 0) + 1));
    stage.querySelectorAll(".backers").forEach((el) => { const n = c[el.dataset.h] || 0; el.textContent = n + (n === 1 ? " backer" : " backers"); });
    updateCounts();
  }

  function vRace() {
    const g = C.derby, st = cur();
    stage.innerHTML = `<div class="race">${head(`${esc(g.title)} · Race ${st.i + 1}/${g.races}`, `<span class="answered">📣 CHEER on your phone!</span>`)}
      <div class="track">${g.horses.map((h, i) => `<div class="lane" style="--c:${h.color}"><span class="lname"><span class="silk">${i + 1}</span>${esc(h.name)}</span><span class="cheerbar" id="cb${i}"></span><span class="horse" id="hz${i}">🏇</span><span class="place-badge" id="pb${i}"></span></div>`).join("")}<div class="finish"></div></div>
      <div class="commentary" id="comm">Under starter's orders…</div><div id="countdown" class="countdown"></div></div>`;
    if (S.race && S.race.done) { drawRace(); comm("Race over — press Next for the result"); return; }
    S.race = null;
    Music.play("derby");
    let c = 3; const cd = $("#countdown");
    const tick = () => {
      if (c > 0) { cd.textContent = c; cd.classList.remove("beat"); void cd.offsetWidth; cd.classList.add("beat"); Music.sfx("tock"); c--; later(tick, 900); }
      else { cd.textContent = "GO!"; Music.sfx("gun"); later(() => (cd.textContent = ""), 700); startRace(); }
    };
    later(tick, 3800);
  }
  function newRace() {
    const g = C.derby, N = g.horses.length;
    // each horse gets a random "form" for this race (favourites slightly better) — tuned so
    // win rates roughly match the odds: 2/1 ≈ 27%, 8/1 ≈ 6% (before cheering)
    const form = g.horses.map((h) => (Math.random() - 0.5) * 1.6 + (8 - h.odds) * 0.07);
    return { pos: new Array(N).fill(0), order: [], cheerNow: {}, cheerShow: new Array(N).fill(0), done: false, t: 0, form, mom: new Array(N).fill(0) };
  }
  /* one 100ms tick of the race; returns index of a horse that just won, or -1 */
  function raceTick(R) {
    const N = R.pos.length; R.t++;
    const b = {}; Object.values(S.picks).forEach((h) => (b[h] = (b[h] || 0) + 1));
    let winner = -1;
    for (let i = 0; i < N; i++) {
      if (R.order.includes(i)) continue;
      if (R.t % 20 === 1) R.mom[i] = Math.random() * 2.2 - 1; // changes of pace every 2s
      let v = 6.2 + R.form[i] + R.mom[i] + Math.random() * 3;
      if (Math.random() < 0.03) v += 5;                 // surge!
      const rate = (R.cheerNow[i] || 0) / Math.max(1, b[i] || 0); // cheers per backer this second
      v += Math.min(0.6, rate * 0.06);                  // cheering helps, but can't buy the race
      R.cheerShow[i] = R.cheerShow[i] * 0.85 + rate;
      R.pos[i] = Math.min(RACE_LEN, R.pos[i] + Math.max(0.5, v));
      if (R.pos[i] >= RACE_LEN) { R.order.push(i); if (R.order.length === 1) winner = i; }
    }
    if (R.t % 10 === 0) R.cheerNow = {};
    return winner;
  }
  function startRace() {
    const g = C.derby, N = g.horses.length;
    S.race = newRace();
    Music.play("gallop", true);
    comm(g.commentary[0]);
    let nextComm = 25;
    raceTimer = setInterval(() => {
      const R = S.race;
      const w = raceTick(R);
      if (w >= 0) { comm(`🏆 ${g.horses[w].name} WINS IT!`); Music.sfx("bell"); Music.sfx("applause"); }
      if (R.t >= nextComm && R.order.length === 0) {
        nextComm = R.t + 22 + Math.floor(Math.random() * 10);
        const lead = R.pos.indexOf(Math.max(...R.pos));
        const pick = Math.random() < 0.5 ? lead : Math.floor(Math.random() * N);
        const lines = g.commentary.slice(1, -1);
        const line = Math.max(...R.pos) > RACE_LEN * 0.8 ? g.commentary[g.commentary.length - 1] : lines[Math.floor(Math.random() * lines.length)];
        comm(line.replace("{h}", g.horses[pick].name));
      }
      drawRace();
      if (R.order.length === N) endRace();
    }, 100);
  }
  function endRace() {
    clearInterval(raceTimer); raceTimer = null;
    S.race.done = true; save(); drawRace();
    Music.play("board"); later(() => Music.stop(1), 2500);
    later(() => { if (cur().k === "race") next(); }, 2600);
  }
  /* Host pressed Next mid-race (or before the off): run the rest instantly. */
  function finishRaceNow() {
    clearLater();
    const g = C.derby;
    if (!S.race) { S.race = newRace(); comm("They're off… and it's a photo finish!"); }
    let w = -1, guard = 0;
    while (S.race.order.length < g.horses.length && guard++ < 5000) { const x = raceTick(S.race); if (x >= 0) w = x; }
    if (w >= 0) comm(`🏆 ${g.horses[w].name} WINS IT!`);
    const cd = $("#countdown"); if (cd) cd.textContent = "";
    Music.sfx("bell");
    endRace();
  }
  function drawRace() {
    const R = S.race; if (!R) return;
    R.pos.forEach((p, i) => {
      const el = $("#hz" + i); if (el) el.style.setProperty("--x", (p / RACE_LEN).toFixed(4));
      const cb = $("#cb" + i); if (cb) cb.style.opacity = Math.min(0.85, R.cheerShow[i] / 40).toFixed(2);
      const pb = $("#pb" + i), place = R.order.indexOf(i);
      if (pb && place >= 0 && place < 3 && !pb.textContent) pb.textContent = ["🥇", "🥈", "🥉"][place];
    });
  }
  function comm(t) { const el = $("#comm"); if (el) { el.textContent = t; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); } }

  function vResult() {
    const g = C.derby, st = cur();
    if (!S.scored[S.step]) {
      S.scored[S.step] = true; S.deltas = {};
      const R = S.race;
      const sn = { order: R && R.done ? R.order.slice() : [], abandoned: !(R && R.done) };
      if (!sn.abandoned) {
        Object.entries(S.picks).forEach(([id, h]) => {
          if (h === sn.order[0]) addPoints(id, g.horses[h].pays, "derby");
          else if (h === sn.order[1]) addPoints(id, 200, "derby");
        });
        sn.winners = Object.entries(S.picks).filter(([, h]) => h === sn.order[0]).map(([id]) => id);
        const topCheer = Object.entries(S.cheers).sort((a, b) => b[1] - a[1])[0];
        sn.cheer = topCheer && topCheer[1] > 0 ? topCheer : null;
      }
      sn.deltas = S.deltas; S.snap[S.step] = sn; save();
    }
    const sn = S.snap[S.step] || { abandoned: true };
    if (sn.abandoned) {
      stage.innerHTML = `<div class="question">${head(`${esc(g.title)} · Race ${st.i + 1} result`)}<div class="fact">🚩 This race was abandoned — no points awarded.</div></div>`;
      return;
    }
    const W = sn.winners || [];
    Music.sfx("fanfare");
    stage.innerHTML = `<div class="question">${head(`${esc(g.title)} · Race ${st.i + 1} result`)}
      <div class="podium-race">${[1, 0, 2].map((i) => { const h = sn.order[i]; return h == null ? "" : `<div class="pr p${i + 1}" style="--c:${g.horses[h].color}"><span class="medal">${["🥇", "🥈", "🥉"][i]}</span><b>${esc(g.horses[h].name)}</b><span>${g.horses[h].odds}/1</span></div>`; }).join("")}</div>
      <div class="fact">${W.length ? `🎉 ${W.length} ${W.length === 1 ? "punter" : "punters"} backed the winner and collect <b>${fmt(g.horses[sn.order[0]].pays)}</b>: ${W.slice(0, 8).map((id) => esc(pname(id))).join(", ")}${W.length > 8 ? ` +${W.length - 8} more` : ""}` : "😱 Nobody backed the winner! The bookies are delighted."}</div>
      ${sn.cheer && S.players[sn.cheer[0]] ? `<div class="shout">📣 Loudest in the grandstand: ${pflag(sn.cheer[0])} <b>${esc(pname(sn.cheer[0]))}</b> (${fmt(sn.cheer[1])} cheers)</div>` : ""}
      ${miniBoard()}</div>`;
  }

  /* ---------------- leaderboard & finale ---------------- */
  function vBoard() {
    const st = cur(), r = ranked(S.players);
    Music.play("board", false, "lobby");
    const nextG = C.order[C.order.indexOf(st.g) + 1];
    const show = r.slice(0, 10);
    stage.innerHTML = `<div class="board">
      <h1 class="board-title">Leaderboard <small>after ${esc(C[st.g].title)}</small></h1>
      <div class="board-grid">
        <div>
          <ol class="lb">${show.map((p, i) => `<li style="animation-delay:${(show.length - 1 - i) * 0.12}s"><span class="rk">${i + 1}</span><span class="nm">${flag(p.country)} ${esc(p.name)}</span><span class="gain">${p.g[st.g] ? "+" + fmt(p.g[st.g]) : ""}</span><b>${fmt(p.score)}</b></li>`).join("") || `<li class="lb-empty">No players yet</li>`}</ol>
          ${r.length > show.length ? `<p class="lb-more">+ ${r.length - show.length} more — see the full table on your phone 🏆</p>` : ""}
        </div>
        <div class="card"><h3>🌍 Battle of the Nations</h3>${countryBars(S.players)}</div>
      </div>
      <p class="next-up">${nextG ? `Next up: <b>${esc(C[nextG].title)}</b>` : "Next up: <b>The Grand Finale</b> 🏆"}</p></div>`;
  }

  function vFinal() {
    const r = ranked(S.players), top = r.slice(0, 3);
    Music.stop(0.2);
    const award = (g, label, icon) => {
      const best = r.slice().sort((a, b) => (b.g[g] || 0) - (a.g[g] || 0))[0];
      return best && best.g[g] ? `<div class="award"><span class="aicon">${icon}</span><span class="alabel">${label}</span><b>${flag(best.country)} ${esc(best.name)}</b></div>` : "";
    };
    const nations = U.countryTable(S.players);
    const champ = nations.length > 1 && nations[0].avg > 0 && C.countries.find((c) => c.id === nations[0].id);
    stage.innerHTML = `<div class="final">
      <h1 class="board-title">🏆 The Grand Finale 🏆</h1>
      <div class="podium">
        ${[1, 0, 2].map((i) => top[i] ? `<div class="pod p${i + 1} hidden" data-r="${i}"><div class="pname">${flag(top[i].country)} ${esc(top[i].name)}</div><div class="podscore">${fmt(top[i].score)}</div><div class="block">${i + 1}</div></div>` : "").join("")}
      </div>
      <div id="finalExtra" class="hidden">
        ${champ ? `<div class="champ">Nation champions: ${champ.flag} <b>${esc(champ.name)}</b>!</div>` : ""}
        <div class="awards">${C.order.map((g) => award(g, ...({ cards: ["Card Sharp", "🃏"], translate: ["Polyglot Prize", "🗣️"], price: ["Bargain Hunter", "🏷️"], derby: ["Lucky Punter", "🏇"], fortunes: ["Survey Whisperer", "📋"] }[g] || [C[g].title, "⭐"]))).join("")}</div>
        <p class="thanks">Thank you · Danke · ¡Gracias! · Thanks y'all! 👋</p>
      </div></div>`;
    const show = (i, d) => later(() => { const el = stage.querySelector(`.pod[data-r="${i}"]`); if (el) { el.classList.remove("hidden"); Music.sfx("ding"); } }, d);
    Music.sfx("drumroll"); show(2, 2100);
    later(() => Music.sfx("drumroll"), 3200); show(1, 5300);
    later(() => Music.sfx("drumroll"), 6600);
    later(() => {
      const el = stage.querySelector('.pod[data-r="0"]'); if (el) el.classList.remove("hidden");
      const fx = $("#finalExtra"); if (fx) fx.classList.remove("hidden");
      Music.play("victory", false, "lobby"); Music.sfx("applause"); confetti();
    }, FINAL_REVEAL_MS);
    saveResults(r);
  }

  async function saveResults(r) {
    if (!CFG.SAVE_RESULTS || !window.TSSI_LIVE || S.resultsSaved || !r.length) return;
    S.resultsSaved = true; save();
    try {
      const rows = r.map((p, i) => ({ room: S.room, player_name: p.name, country: p.country, score: p.score, rank: i + 1, breakdown: p.g }));
      const { error } = await window.TSSI_DB.from("game_results").insert(rows);
      if (error) console.warn("Results not saved:", error.message);
    } catch (e) { console.warn(e); }
  }

  function confetti() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = document.createElement("canvas"); cv.className = "confetti"; document.body.appendChild(cv);
    const ctx = cv.getContext("2d"); cv.width = innerWidth; cv.height = innerHeight;
    const cols = ["#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#ffffff", "#e63946"];
    const P = Array.from({ length: 220 }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height, vx: Math.random() * 2 - 1, vy: 2 + Math.random() * 3, r: Math.random() * 6.28, c: cols[Math.floor(Math.random() * cols.length)], s: 6 + Math.random() * 6 }));
    let f = 0;
    (function loop() {
      if (!cv.isConnected) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      P.forEach((p) => { p.x += p.vx; p.y += p.vy; p.r += 0.1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
      if (++f < 420) requestAnimationFrame(loop); else cv.remove();
    })();
  }

  /* ---------------- live bits: timer, counts, clock ---------------- */
  function cardSplit() { const c = [0, 0]; Object.values(S.ans).forEach((a) => { if (a.v === 0 || a.v === 1) c[a.v]++; }); return c; }
  function updateCounts() {
    const n = Object.keys(S.players).length;
    document.querySelectorAll("#pcount,#pcount2,#ctlPlayers").forEach((el) => (el.textContent = n));
    const pw = $("#pword"); if (pw) pw.textContent = n === 1 ? "player" : "players";
    const st = cur();
    const ac = $("#acount");
    if (ac) ac.textContent = st.k === "pick" ? Object.keys(S.picks).length : Object.keys(S.ans).length;
    if (st.k === "q" && st.g === "cards") {
      const [lo, hi] = cardSplit(), tot = Math.max(1, lo + hi);
      const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
      set("#hiN", hi); set("#loN", lo);
      const hb = $("#hiBar"), lb = $("#loBar");
      if (hb) hb.style.width = (hi / tot) * 100 + "%"; if (lb) lb.style.width = (lo / tot) * 100 + "%";
    }
    const nc = $("#nationCount");
    if (nc) {
      const t = {}; Object.values(S.players).forEach((p) => (t[p.country] = (t[p.country] || 0) + 1));
      nc.innerHTML = C.countries.filter((c) => t[c.id]).map((c) => `<span>${c.flag} ${t[c.id]}</span>`).join("");
    }
  }
  function tick() {
    if (!S) return;
    const st = cur();
    if (S.deadline && (st.k === "q" || st.k === "pick")) {
      const total = (st.k === "pick" ? C.derby.pickSeconds : game().seconds) * 1000;
      const rem = Math.max(0, S.deadline - Date.now()), sec = Math.ceil(rem / 1000);
      const tn = $("#tnum"), ring = $("#tring");
      if (tn) tn.textContent = sec;
      if (ring) { ring.style.strokeDashoffset = (276.5 * (1 - Math.min(1, rem / total))).toFixed(1); ring.classList.toggle("hot", sec <= 5); }
      if (sec !== lastSec) { lastSec = sec; if (sec <= 5 && sec > 0 && !S.allIn) Music.sfx("tick"); }
      if (rem <= 0 && st.k === "q" && !autoTimer) {
        Music.stop(0.2); Music.sfx(S.allIn ? "reveal" : "buzz");   // buzzer only when time actually ran out
        autoTimer = setTimeout(() => { autoTimer = null; if (cur().k === "q") next(); }, 1300);
      }
      if (rem <= 0 && st.k === "pick" && !autoTimer) { autoTimer = setTimeout(() => { autoTimer = null; if (cur().k === "pick") next(); }, 800); }
    }
    // show clock
    const ck = $("#ctlClock");
    if (ck) {
      const el = S.showStart ? (Date.now() - S.showStart) / 60000 : 0;
      let state = "";
      if (st.k !== "lobby") {
        let due = 0;
        if (st.k === "final") due = 40;
        else for (const g of C.order) { due += PLAN[g]; if (g === st.g) break; }
        const diff = el - due;
        state = diff > 1 ? ` ⚠️ ${Math.round(diff)}m behind` : " ✅";
      }
      ck.textContent = `⏱ ${Math.floor(el)}:${String(Math.floor((el % 1) * 60)).padStart(2, "0")}${state}`;
      ck.title = "Show time vs the 40-minute plan";
    }
  }

  /* ---------------- controls ---------------- */
  function syncJump() {
    const sel = $("#ctlJump"); if (!sel) return;
    sel.value = String(S.step);
    $("#ctlPrev").disabled = S.step === 0;
    $("#ctlNext").disabled = S.step === steps.length - 1;
  }
  function buildControls() {
    const sel = $("#ctlJump");
    sel.innerHTML = steps.map((s, i) => {
      const g = s.g ? C[s.g].title : "";
      const lbl = { lobby: "Lobby", intro: "▶ " + g, q: s.g === "cards" ? `    Row ${cardPos(s.i)[0] + 1} · card ${cardPos(s.i)[1] + 1}` : `    Q${s.i + 1}`, reveal: s.g === "cards" ? `    Row ${cardPos(s.i)[0] + 1} · flip ${cardPos(s.i)[1] + 2}` : `    Q${s.i + 1} reveal`, pick: `    Race ${s.i + 1} betting`, race: `    Race ${s.i + 1}`, result: `    Race ${s.i + 1} result`, board: "    ★ Leaderboard", final: "🏆 Grand finale" }[s.k];
      return `<option value="${i}">${esc(lbl)}</option>`;
    }).join("");
    const unfocus = () => document.activeElement && document.activeElement.blur && document.activeElement.blur();
    sel.onchange = () => { go(+sel.value, +sel.value >= S.step ? 1 : -1); unfocus(); };
    $("#ctlNext").onclick = () => { Music.init(); next(); unfocus(); };
    $("#ctlPrev").onclick = () => { back(); unfocus(); };
    $("#ctlVol").oninput = (e) => Music.setVolume(+e.target.value);
    $("#ctlVol").onchange = unfocus;
    $("#ctlMute").onclick = () => { $("#ctlMute").textContent = Music.toggleMute() ? "🔇" : "🔊"; unfocus(); };
    $("#ctlLink").onclick = () => {
      const done = (ok) => { $("#ctlLink").textContent = ok ? "✓ Copied" : "Copy failed"; setTimeout(() => ($("#ctlLink").textContent = "🔗 Join link"), 1500); };
      try { navigator.clipboard.writeText(joinUrl()).then(() => done(true), () => done(false)); } catch (e) { done(false); }
      unfocus();
    };
    const mode = $("#ctlMode");
    mode.textContent = window.TSSI_LIVE ? "🟢 Live" : window.TSSI_LIBFAIL ? "🔴 Offline" : "🟡 Demo";
    mode.title = window.TSSI_LIVE ? "Connected to Supabase — players can join from anywhere" : window.TSSI_LIBFAIL ? "Supabase script blocked — players can't connect" : "Demo mode: players must be tabs in this same browser";
    document.addEventListener("keydown", (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" && e.target.type !== "range") return;
      if (e.key === " " || e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); next(); unfocus(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); back(); unfocus(); }
      else if (e.key === "m" || e.key === "M") $("#ctlMute").click();
      else if (e.key === "h" || e.key === "H") { document.body.classList.toggle("hide-ctl"); requestAnimationFrame(fitStage); }
      else if (e.key === "f" || e.key === "F") (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
    });
    let rz = null;
    window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { fitStage(); updateChipMore(); }, 120); });
  }

  /* ---------------- boot ---------------- */
  function start(room, resume) {
    steps = buildSteps();
    S = Object.assign(fresh(room), resume || {});
    S.step = Math.min(S.step, steps.length - 1);
    history.replaceState(null, "", "?room=" + S.room);
    $("#ctlRoom").textContent = S.room;
    T = createTransport(S.room, "host");
    T.onMessage(onMsg);
    T.onStatus((s) => { $("#ctlConn").textContent = s === "SUBSCRIBED" ? "" : "⚠️ " + s.toLowerCase().replace(/_/g, " "); if (s === "SUBSCRIBED") pub(true); });
    buildControls();
    $("#splash").remove();
    document.body.classList.add("running");
    // a resumed race can't continue mid-run — restart from its betting step
    if (cur().k === "race" && !(S.race && S.race.done)) S.step--;
    S.deadline = 0;
    go(S.step, 1);
    setInterval(tick, 200);
    setInterval(() => pub(true), 8000); // heartbeat so late/rejoining phones catch up
  }

  function splash() {
    const params = new URLSearchParams(location.search);
    const want = (params.get("room") || "").toUpperCase();
    const last = want || localStorage.getItem("tssi-host-last");
    let saved = null;
    try { saved = last && JSON.parse(localStorage.getItem("tssi-host-" + last)); } catch (e) {}
    if (saved && Date.now() - saved.created > 12 * 3600 * 1000) saved = null;
    $("#splashTitle").textContent = CFG.EVENT_TITLE || "Global HR Social Connect";
    $("#btnNew").onclick = () => { Music.init(); start(want && !saved ? want : U.roomCode()); };
    if (saved) {
      const b = $("#btnResume");
      b.hidden = false; b.textContent = `↻ Resume room ${saved.room} (${Object.keys(saved.players).length} players)`;
      b.onclick = () => { Music.init(); start(saved.room, saved); };
    }
    $("#splashMode").innerHTML = window.TSSI_LIBFAIL
      ? "🔴 <b>Supabase is configured but its script couldn't load</b> (blocked network or VPN?). Players won't connect. Try another network/browser."
      : window.TSSI_LIVE
      ? "🟢 Connected to Supabase — players can join from anywhere."
      : "🟡 <b>Demo mode</b>: Supabase isn't configured in <code>js/config.js</code>, so players must be other tabs in this same browser. Perfect for a rehearsal.";
  }
  splash();
})();
