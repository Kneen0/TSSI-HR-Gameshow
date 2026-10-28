/* =====================================================================
   PLAYER (phone or browser tab). Receives state from the host, sends
   answers, shows your score and everyone else's.
   ===================================================================== */
(function () {
  const C = window.CONTENT;
  const { esc, $, flag, fmt, num } = U;
  const app = $("#app");
  const params = new URLSearchParams(location.search);

  let me = null;           // {id, name, country, room}
  let T = null, S = null;  // transport, latest host state
  let deadline = 0, lastStep = -1, lastJoin = 0;
  let local = {};          // what I've done this step: {step, v, list, done, pick}
  let cheers = 0, cheerTimer = null, sound = true, showBoard = false;
  let holdUntil = 0, holdTimer = null, shownLb = [], shownDeltas = {};
  // live: remember the player on this device; demo: each tab is its own player
  const store = window.TSSI_LIVE ? localStorage : sessionStorage;

  try { me = JSON.parse(store.getItem("tssi-player") || "null"); } catch (e) {}
  const urlRoom = (params.get("room") || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  if (me && urlRoom && me.room !== urlRoom) me = Object.assign({}, me, { room: urlRoom, id: U.uid() });

  /* ---------- tiny sound for the phone ---------- */
  function beep(kind) {
    if (navigator.vibrate) try { navigator.vibrate(kind === "buzz" ? 120 : 15); } catch (e) {}
    if (!sound) return;
    try { Music.init(); Music.sfx(kind); } catch (e) {}
  }

  /* ---------- join ---------- */
  function joinScreen(msg) {
    app.innerHTML = `
      <form class="join card" id="joinForm" autocomplete="off">
        <div class="join-logo">🎤</div>
        <h1>THE BIG <em>HR</em> GAME SHOW</h1>
        <p class="sub">${esc((window.TSSI_CONFIG || {}).EVENT_TITLE || "")}</p>
        ${msg ? `<p class="warn">${esc(msg)}</p>` : ""}
        <label>Room code<input id="jRoom" maxlength="4" autocapitalize="characters" autocorrect="off" spellcheck="false" value="${esc(urlRoom || (me && me.room) || "")}" placeholder="ABCD"></label>
        <label>Your name<input id="jName" maxlength="18" autocorrect="off" value="${esc(me ? me.name : "")}" placeholder="First name + initial"></label>
        <div class="label">Where are you joining from?</div>
        <div class="flags">${C.countries.map((c) => `<button type="button" class="flagbtn${me && me.country === c.id ? " on" : ""}" data-c="${c.id}" aria-pressed="${me && me.country === c.id}"><span>${c.flag}</span>${esc(c.name)}</button>`).join("")}</div>
        <p id="jErr" class="warn" hidden></p>
        <button id="jGo" type="submit" class="btn big">Let's play! · Los geht's!</button>
        ${window.TSSI_LIBFAIL ? '<p class="warn">Can\'t reach the game server from this network — try mobile data instead of office Wi-Fi/VPN.</p>' : window.TSSI_LIVE ? "" : '<p class="hint center">Demo mode — this tab must be in the same browser as the host screen.</p>'}
      </form>`;
    let country = me ? me.country : null;
    app.querySelectorAll(".flagbtn").forEach((b) => (b.onclick = () => {
      country = b.dataset.c;
      app.querySelectorAll(".flagbtn").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
    }));
    $("#jRoom").oninput = (e) => (e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
    const err = (t) => { const e = $("#jErr"); e.textContent = t; e.hidden = false; };
    $("#joinForm").onsubmit = (e) => {
      e.preventDefault();
      const room = $("#jRoom").value.trim().toUpperCase(), name = $("#jName").value.replace(/\s+/g, " ").trim();
      if (room.length !== 4) return err("Enter the 4-letter room code from the big screen.");
      if (!name) return err("Please enter your name.");
      if (!country) return err("Pick a flag — it's for the Battle of the Nations!");
      Music.init();
      me = { id: me && me.room === room ? me.id : U.uid(), name, country, room };
      store.setItem("tssi-player", JSON.stringify(me));
      history.replaceState(null, "", "?room=" + room);
      connect();
    };
    if (!$("#jRoom").value) $("#jRoom").focus();
  }

  let ticker = null;
  function connect() {
    if (T) return sendJoin();
    T = createTransport(me.room, "player");
    T.onMessage(onState);
    T.onStatus((s) => { const el = $("#conn"); if (el) el.textContent = s === "SUBSCRIBED" ? "" : "Reconnecting…"; if (s === "SUBSCRIBED") sendJoin(); });
    app.innerHTML = `<div class="wait card"><div class="spinner"></div><p>Connecting to room <b>${esc(me.room)}</b>…</p>
      <p class="hint">Make sure the host's screen is open.</p><button class="btn ghost small" id="changeRoom">Wrong room or name?</button></div>`;
    $("#changeRoom").onclick = () => { store.removeItem("tssi-player"); location.href = location.pathname; };
    if (!ticker) ticker = setInterval(timerTick, 250);
  }
  function sendJoin() { lastJoin = Date.now(); T.send({ t: "join", id: me.id, name: me.name, country: me.country }); }
  const send = (m) => T.send(Object.assign({ id: me.id, step: S ? S.step : -1 }, m));

  /* ---------- state from host ---------- */
  function onState(s) {
    if (!me || !s || s.t !== "state" || s.room !== me.room) return;
    if (s.kicked && s.kicked.includes(me.id)) {
      store.removeItem("tssi-player"); me = null; T = null;
      return joinScreen("The host removed that name — please rejoin with a different one.");
    }
    const inGame = s.lb.some((r) => r[0] === me.id);
    if (!inGame && Date.now() - lastJoin > 2500) sendJoin();
    const stepChanged = s.step !== lastStep;
    S = s;
    deadline = s.rem ? Date.now() + s.rem : 0;

    // Hold back reveal results so phones don't spoil the big screen's drumroll
    const wasHolding = Date.now() < holdUntil;
    if (s.hold > 300) {
      holdUntil = Date.now() + s.hold;
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => { holdUntil = 0; release(); }, s.hold);
    } else if (stepChanged) { holdUntil = 0; clearTimeout(holdTimer); }
    const holding = Date.now() < holdUntil;
    if (!holding) { shownLb = s.lb; shownDeltas = s.deltas; }

    if (stepChanged) {
      lastStep = s.step;
      const prev = local;
      local = loadLocal(s.step);
      // reveal/race/result screens need what I did on the step before (my answer, my horse)
      if (["reveal", "race", "result"].includes(s.k) && !local.carried && prev && prev.step === s.step - 1) {
        local.prev = { v: prev.v, list: prev.list };
        local.pick = prev.pick; local.carried = true; saveLocal();
      }
      if (["intro", "q", "pick", "race"].includes(s.k)) showBoard = false; // never hide a live question behind the scoreboard
      clearInterval(cheerTimer); cheerTimer = null;
      render();
      if (!holding) resultBeep();
    } else if (!(holding && wasHolding)) {
      updateHeader(); resendIfMissing();
      if (showBoard || ["lobby", "board", "final", "intro"].includes(s.k)) renderBody();
    } else resendIfMissing();
  }
  function release() { shownLb = S.lb; shownDeltas = S.deltas; render(); resultBeep(); }
  function resultBeep() {
    if (!S || !["reveal", "result"].includes(S.k)) return;
    beep((S.deltas[me.id] || 0) > 0 ? "ding" : "buzz");
  }

  function loadLocal(step) {
    try { const l = JSON.parse(store.getItem("tssi-local") || "{}"); if (l.step === step && l.room === me.room) return l; } catch (e) {}
    return { step, room: me.room };
  }
  function saveLocal() { try { store.setItem("tssi-local", JSON.stringify(local)); } catch (e) {} }

  function resendIfMissing() {
    if (!S || !S.got) return;
    if ((S.k === "q" || S.k === "pick") && Date.now() > deadline - 300) return;
    const g = S.got[me.id] || 0;
    if (S.k === "intro" && local.v != null && !g) send({ t: "vote", v: local.v });
    if (S.k === "pick" && local.pick != null && !g) send({ t: "pick", v: local.pick });
    if (S.k === "q") {
      if (S.g === "fortunes") {
        const list = local.list || [];
        if ((g % 100) < list.length) list.forEach((v) => send({ t: "answer", v }));
        if (local.done && g < 100) send({ t: "answer", v: "", done: true });
      } else if (local.v != null && !g) send({ t: "answer", v: local.v });
    }
  }

  /* ---------- rendering ---------- */
  function myRank() {
    const lb = shownLb.length ? shownLb : S.lb;
    const i = lb.findIndex((r) => r[0] === me.id);
    return { rank: i + 1, of: lb.length, score: i >= 0 ? lb[i][3] : 0 };
  }
  function header() {
    const r = myRank();
    return `<header class="phead">
      <span class="pme">${flag(me.country)} ${esc(me.name)}</span>
      <span class="pscore"><b id="hScore">${fmt(r.score)}</b> pts <span id="hRank">${r.rank ? "· #" + r.rank + "/" + r.of : ""}</span></span>
      <button id="lbBtn" class="iconbtn${showBoard ? " on" : ""}" aria-label="Leaderboard" title="Leaderboard">🏆</button>
      <button id="sndBtn" class="iconbtn" aria-label="Sound on/off" title="Sound">${sound ? "🔔" : "🔕"}</button>
    </header><div id="conn" class="conn"></div>`;
  }
  function updateHeader() {
    const r = myRank();
    const hs = $("#hScore"), hr = $("#hRank");
    if (hs) hs.textContent = fmt(r.score);
    if (hr) hr.textContent = r.rank ? "· #" + r.rank + "/" + r.of : "";
  }
  function render() {
    app.innerHTML = header() + `<main id="pbody" class="pbody"></main>`;
    $("#lbBtn").onclick = () => { showBoard = !showBoard; $("#lbBtn").classList.toggle("on", showBoard); renderBody(); window.scrollTo(0, 0); };
    $("#sndBtn").onclick = () => { sound = !sound; $("#sndBtn").textContent = sound ? "🔔" : "🔕"; };
    renderBody();
  }
  function timerBar() { return `<div class="ptimer" role="timer"><i id="ptbar"></i><span id="ptnum"></span></div>`; }
  function timerTick() {
    const bar = $("#ptbar"), num_ = $("#ptnum"); if (!bar || !S) return;
    const total = S.k === "pick" ? C.derby.pickSeconds * 1000 : ((C[S.g] && C[S.g].seconds) || 20) * 1000;
    const rem = Math.max(0, deadline - Date.now());
    bar.style.width = Math.min(100, (rem / total) * 100) + "%";
    bar.classList.toggle("hot", rem <= 5000);
    num_.textContent = rem > 0 ? Math.ceil(rem / 1000) + "s" : "⏰ Time's up!";
    if (rem <= 0) {
      app.querySelectorAll(".lockable").forEach((b) => (b.disabled = true));
      const lm = $("#lockMsg");
      if (lm && !lm.dataset.final) { lm.dataset.final = 1; if (local.v == null && !(local.list && local.list.length) && local.pick == null) lm.textContent = "⏰ Time's up — catch the next one!"; }
    }
  }

  function boardHtml() {
    const lb = shownLb.length ? shownLb : S.lb;
    return `<h2>🏆 Live leaderboard</h2>
      <ol class="plb">${lb.map((r, i) => `<li class="${r[0] === me.id ? "me" : ""}"><span class="prk">${i + 1}</span><span class="pnm">${flag(r[2])} ${esc(r[1])}</span>${shownDeltas[r[0]] ? `<em>+${fmt(shownDeltas[r[0]])}</em>` : ""}<b>${fmt(r[3])}</b></li>`).join("")}</ol>
      <h3>🌍 Battle of the Nations</h3>${U.countryBars(Object.fromEntries(lb.map((r) => [r[0], { name: r[1], country: r[2], score: r[3] }])))}`;
  }

  function renderBody() {
    const b = $("#pbody"); if (!b || !S) return;
    if (showBoard) {
      b.innerHTML = `<div class="card">${boardHtml()}<button class="btn big" id="lbClose">Back to the game</button></div>`;
      $("#lbClose").onclick = () => { showBoard = false; $("#lbBtn").classList.remove("on"); renderBody(); };
      const meRow = b.querySelector(".plb .me"); if (meRow && meRow.offsetTop > innerHeight * 0.6) meRow.scrollIntoView({ block: "center" });
      return;
    }
    const v = S.view || {}, k = S.k, g = S.g;
    if (Date.now() < holdUntil) {
      b.innerHTML = `<div class="card center hold"><div class="big">👀</div><h2>Eyes on the big screen…</h2><p class="hint">${k === "final" ? "Drumroll please! 🥁" : "The answer's being revealed now."}</p><div class="dots"><i></i><i></i><i></i></div></div>`;
      return;
    }
    const d = S.deltas[me.id] || 0;
    const deltaHtml = `<div class="pdelta ${d > 0 ? "plus" : "zero"}">${d > 0 ? "+" + fmt(d) + " pts" : "No points this time"}</div>`;

    if (k === "lobby") {
      const others = S.lb.filter((r) => r[0] !== me.id);
      b.innerHTML = `<div class="card center"><div class="big">🎉</div><h2>You're in, ${esc(me.name)}!</h2><p>Watch the big screen — the show starts soon.</p></div>
        <div class="card"><div class="tag">${S.lb.length} in the studio</div>
        <div class="who">${others.slice(0, 40).map((r) => `<span>${flag(r[2])} ${esc(r[1])}</span>`).join("")}${others.length > 40 ? `<span>+${others.length - 40} more</span>` : ""}${others.length ? "" : '<span class="hint">You\'re the first one here!</span>'}</div></div>`;
    }
    else if (k === "intro") {
      const counts = v.counts || [], max = Math.max(1, ...counts), voted = local.v != null;
      b.innerHTML = `<div class="card center"><div class="tag">Next game</div><h2 class="gtitle">${esc(v.title)}</h2><p>${esc(v.tagline)}</p>
        <ol class="prules">${v.rules.map((r) => `<li>${esc(r)}</li>`).join("")}</ol></div>
        <div class="card"><div class="tag">Warm-up vote · +50 pts</div><h3>${esc(v.poll.q)}</h3>
        <div class="choices">${v.poll.options.map((o, i) => `<button class="choice${local.v === i ? " on" : ""}" data-i="${i}" aria-pressed="${local.v === i}">
          <span class="ctext">${esc(o)}</span>${voted ? `<span class="cbar" style="width:${((counts[i] || 0) / max) * 100}%"></span><b class="ccount">${counts[i] || 0}</b>` : ""}</button>`).join("")}</div>
        <p class="hint center">${voted ? "✅ +50 pts! You can change your vote." : "Tap to vote"}</p></div>`;
      b.querySelectorAll(".choice").forEach((btn) => (btn.onclick = () => {
        local.v = +btn.dataset.i; saveLocal(); send({ t: "vote", v: local.v }); beep("pop");
        renderBody();
      }));
    }
    else if (k === "q" && g === "translate") {
      b.innerHTML = `${timerBar()}<div class="card"><div class="tag">Question ${v.n}/${v.of}</div><h3>${esc(v.q)}</h3></div>
        <div class="abcd">${v.options.map((o, i) => `<button class="abtn a${i} lockable${local.v === i ? " on" : ""}" data-i="${i}" ${local.v != null ? "disabled" : ""}><b>${"ABCD"[i]}</b><span>${esc(o)}</span></button>`).join("")}</div>
        <p class="hint center" id="lockMsg">${local.v != null ? "🔒 Locked in! Fingers crossed…" : "Faster = more points!"}</p>`;
      b.querySelectorAll(".abtn").forEach((btn) => (btn.onclick = () => {
        if (local.v != null) return;
        local.v = +btn.dataset.i; saveLocal(); send({ t: "answer", v: local.v }); beep("pop");
        b.querySelectorAll(".abtn").forEach((x) => { x.disabled = true; x.classList.toggle("on", x === btn); });
        $("#lockMsg").textContent = "🔒 Locked in! Fingers crossed…";
      }));
    }
    else if (k === "q" && g === "price") {
      const cur = v.currency || "";
      b.innerHTML = `${timerBar()}<div class="card center"><div class="tag">Item ${v.n}/${v.of}</div><div class="big">${v.emoji}</div><h3>${esc(v.name)}</h3><p class="hint">${esc(v.detail)}</p></div>
        <form class="card" id="pForm"><label class="pricebox" for="pIn">${cur ? `<span>${esc(cur)}</span>` : ""}<input id="pIn" class="lockable" type="text" inputmode="decimal" autocomplete="off" placeholder="Your price" value="${local.v != null ? local.v : ""}"></label>
        <button id="pGo" type="submit" class="btn big lockable">${local.v != null ? "Update my guess" : "Lock in my price"}</button>
        <p class="hint center" id="lockMsg">${local.v != null ? `🔒 Your guess: ${esc(cur)}${num(local.v)}` : "Closest WITHOUT going over wins!"}</p></form>`;
      $("#pForm").onsubmit = (e) => {
        e.preventDefault();
        const val = U.parseNum($("#pIn").value);
        if (!isFinite(val)) { $("#lockMsg").textContent = "⚠️ Please type a number, e.g. 450 or 5,65"; return; }
        local.v = val; saveLocal(); send({ t: "answer", v: val }); beep("pop");
        $("#lockMsg").textContent = `🔒 Your guess: ${cur}${num(val)}`; $("#pGo").textContent = "Update my guess";
        $("#pIn").blur();
      };
    }
    else if (k === "q" && g === "fortunes") {
      const list = local.list || [];
      const full = list.length >= v.max || local.done;
      b.innerHTML = `${timerBar()}<div class="card"><div class="tag">We asked 100 colleagues… (${v.n}/${v.of})</div><h3>${esc(v.q)}</h3></div>
        <div class="card"><div class="mylist">${list.map((a, i) => `<div class="mine">${i + 1}. ${esc(a)}</div>`).join("")}</div>
        ${full ? `<p class="center" id="lockMsg">🔒 Answers locked in! Wait for the reveal…</p>` : `
        <form id="fForm"><input id="fIn" class="lockable" maxlength="40" placeholder="Answer ${list.length + 1} of ${v.max}" autocomplete="off" enterkeyhint="send">
        <div class="row"><button id="fGo" type="submit" class="btn lockable">Add answer</button>${list.length ? `<button id="fDone" type="button" class="btn ghost lockable">I'm done</button>` : ""}</div></form>
        <p class="hint" id="lockMsg">English or Deutsch — small typos are OK.</p>`}</div>`;
      if (!full) {
        $("#fForm").onsubmit = (e) => {
          e.preventDefault();
          const t = $("#fIn").value.trim(); if (!t) return;
          if (list.some((x) => U.norm(x) === U.norm(t))) { $("#lockMsg").textContent = "You've already said that one!"; return; }
          local.list = list.concat([t]); saveLocal(); send({ t: "answer", v: t }); beep("pop"); renderBody();
          const inp = $("#fIn"); if (inp) inp.focus();
        };
        const fd = $("#fDone"); if (fd) fd.onclick = () => { local.done = true; saveLocal(); send({ t: "answer", v: "", done: true }); renderBody(); };
      }
    }
    else if (k === "reveal") {
      let inner = "";
      const my = local.prev || {};
      if (g === "translate") inner = `<div class="tag">Question ${v.n}/${v.of}</div><h3>${esc(v.q)}</h3><div class="answer">✅ ${esc(v.options[v.answer])}</div>
        <p class="verdict">${my.v == null ? "You didn't answer." : my.v === v.answer ? "You got it! 🎉" : "❌ You said: " + esc(v.options[my.v])}</p><p class="hint">💡 ${esc(v.fact)}</p>`;
      if (g === "price") inner = `<div class="tag">Item ${v.n}/${v.of}</div><div class="big">${v.emoji}</div><h3>${esc(v.name)}</h3><div class="answer">${esc(v.currency)}${num(v.answer)}</div>
        <p class="verdict">${my.v == null ? "You didn't guess." : `You guessed ${esc(v.currency)}${num(my.v)}${my.v > v.answer ? " — OVER! 😬" : ""}`}</p>`;
      if (g === "fortunes") {
        const q = C.fortunes.questions[v.n - 1];
        const mine = (my.list || []).map((t) => ({ t, k: q ? U.matchSurvey(t, q.answers) : -1 }));
        const hit = new Set(mine.map((m) => m.k));
        inner = `<div class="tag">Survey ${v.n}/${v.of}</div><h3>${esc(v.q)}</h3><ol class="fmini">${v.answers.map((a, i) => `<li class="${hit.has(i) ? "got" : ""}"><span>${hit.has(i) ? "✅ " : ""}${esc(a.text)}</span><b>${a.pts}</b></li>`).join("")}</ol>
          <div class="mine-res">${mine.length ? mine.map((m) => `<span class="${m.k >= 0 ? "ok" : "no"}">${m.k >= 0 ? "✓" : "✗"} ${esc(m.t)}</span>`).join("") : '<span class="hint">You didn\'t answer.</span>'}</div>`;
      }
      b.innerHTML = `<div class="card center">${inner}${deltaHtml}</div>`;
    }
    else if (k === "pick") {
      b.innerHTML = `${timerBar()}<div class="card"><div class="tag">Race ${v.race}/${v.of} · Place your bet</div><h3>Pick your horse 🏇</h3></div>
        <div class="horses">${v.horses.map((h, i) => `<button class="hbtn lockable${local.pick === i ? " on" : ""}" data-i="${i}" style="--c:${h.color}" aria-pressed="${local.pick === i}"><span class="silk">${i + 1}</span><b>${esc(h.name)}</b><small>${h.odds}/1 · wins ${fmt(h.pays)}</small></button>`).join("")}</div>
        <p class="hint center" id="lockMsg">${local.pick != null ? `✅ You're backing ${esc(v.horses[local.pick].name)} — tap another to switch` : "You can change your mind until the stalls open."}</p>`;
      b.querySelectorAll(".hbtn").forEach((btn) => (btn.onclick = () => {
        local.pick = +btn.dataset.i; saveLocal(); send({ t: "pick", v: local.pick }); beep("pop");
        b.querySelectorAll(".hbtn").forEach((x) => { x.classList.toggle("on", x === btn); x.setAttribute("aria-pressed", x === btn); });
        $("#lockMsg").textContent = `✅ You're backing ${v.horses[local.pick].name} — tap another to switch`;
      }));
    }
    else if (k === "race") {
      clearInterval(cheerTimer); cheerTimer = null;
      const h = local.pick != null ? v.horses[local.pick] : null;
      b.innerHTML = `<div class="card center">${h ? `<div class="tag">You backed</div><h2 class="backed" style="color:${h.color}">${esc(h.name)}</h2>` : "<h3>You didn't back a horse this time — enjoy the race!</h3>"}
        <button id="cheer" class="cheer" style="--c:${h ? h.color : "#ffd166"}" ${h ? "" : "disabled"}>📣<br>CHEER!</button>
        <p class="hint">${h ? "Tap tap tap! Your cheers give your horse a boost." : "Back a horse in the next race to cheer it on."}</p><div id="cc" class="cc">${local.c ? fmt(local.c) : ""}</div></div>`;
      if (h) {
        const btn = $("#cheer");
        // pointerdown is snappier than click for rapid tapping on phones
        btn.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          cheers++; local.c = (local.c || 0) + 1; $("#cc").textContent = fmt(local.c);
          if (navigator.vibrate) try { navigator.vibrate(8); } catch (x) {}
          btn.classList.remove("thump"); void btn.offsetWidth; btn.classList.add("thump");
        });
        btn.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); btn.dispatchEvent(new PointerEvent("pointerdown")); } });
        // batch taps; bigger rooms send less often to stay inside Supabase's message quota
        const every = Math.max(1000, S.lb.length * 25);
        cheerTimer = setInterval(() => { if (cheers > 0) send({ t: "cheer", n: Math.min(40, cheers) }); cheers = 0; saveLocal(); }, every);
      }
    }
    else if (k === "result") {
      const o = v.order || [];
      b.innerHTML = v.abandoned ? `<div class="card center"><div class="tag">Race ${v.race}</div><h3>🚩 Race abandoned — no points.</h3></div>`
        : `<div class="card center"><div class="tag">Race ${v.race} result</div>
        ${o.slice(0, 3).map((h, i) => `<div class="place${local.pick === h ? " mine" : ""}" style="--c:${v.horses[h].color}">${["🥇", "🥈", "🥉"][i]} ${esc(v.horses[h].name)}${local.pick === h ? " <small>← yours!</small>" : ""}</div>`).join("")}
        ${local.pick != null && !o.slice(0, 3).includes(local.pick) ? `<p class="hint">Your horse ${esc(v.horses[local.pick].name)} finished #${o.indexOf(local.pick) + 1}.</p>` : ""}
        ${deltaHtml}</div>`;
    }
    else if (k === "board" || k === "final") {
      const r = myRank();
      b.innerHTML = `<div class="card center">${k === "final" ? "<h2>🏆 Final results!</h2>" : `<div class="tag">After ${esc(S.gameTitle || "")}</div>`}
        <div class="myrank">#${r.rank}<small> of ${r.of}</small></div><p>${fmt(r.score)} points</p></div><div class="card">${boardHtml()}</div>
        ${k === "final" ? '<p class="center thanks-p">Thank you · Danke · Thanks y\'all! 👋</p>' : ""}`;
    }
    timerTick();
  }

  /* ---------- boot ---------- */
  if (me && me.name && me.country && me.room) connect();
  else joinScreen();
})();
