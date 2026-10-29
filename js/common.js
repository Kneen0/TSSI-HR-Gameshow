/* Shared helpers for host and player pages. */
window.U = (function () {
  const C = window.CONTENT;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (sel, root) => (root || document).querySelector(sel);
  const OTHER = () => C.countries.find((c) => c.id === "XX") || C.countries[C.countries.length - 1];
  const flag = (id) => (C.countries.find((c) => c.id === id) || OTHER()).flag;
  const fmt = (n) => Math.round(n).toLocaleString("en-GB");
  /* number with up to 2 decimals, e.g. 7,995 or 5.65 */
  const num = (v) => (Math.round(v * 100) / 100).toLocaleString("en-GB", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  /* reads prices typed the UK/US way (7,995.50) or the German way (7.995,50 · 5,65) */
  function parseNum(raw) {
    let s = String(raw == null ? "" : raw).replace(/[^\d.,]/g, "");
    if (!s) return NaN;
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, "");           // 7.995 / 1,500 → thousands
    else if (s.includes(".") && s.includes(",")) {                           // both: the last one is the decimal mark
      const dec = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
      s = s.split(dec === "." ? "," : ".").join("").replace(",", ".");
    } else s = s.replace(",", ".");
    const v = parseFloat(s);
    return isFinite(v) && v >= 0 && v < 1e9 ? v : NaN;   // ignore absurd values
  }
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const roomCode = () => { const L = "ABCDEFGHJKLMNPQRSTUVWXYZ"; let s = ""; for (let i = 0; i < 4; i++) s += L[Math.floor(Math.random() * L.length)]; return s; };

  /* ---- fuzzy answer matching for Global Fortunes ---- */
  function norm(s) {
    return String(s || "").toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length; if (!m || !n) return m || n;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  const tol = (len) => (len <= 3 ? 0 : len <= 6 ? 1 : 2);
  /* returns index of the matching survey answer, or -1 */
  function matchSurvey(input, answers) {
    const a = norm(input); if (!a) return -1;
    const words = a.split(" ");
    let best = -1, bestScore = 99;
    answers.forEach((ans, idx) => {
      [ans.text].concat(ans.aliases || []).forEach((alias) => {
        const al = norm(alias); if (!al) return;
        let score = 99;
        if (a === al) score = 0;
        else if ((" " + a + " ").includes(" " + al + " ")) score = 1;          // alias phrase inside answer
        else if (al.includes(" ") && al.includes(a) && a.length >= 4) score = 2; // answer inside multi-word alias
        else {
          const d = lev(a, al); if (d <= tol(al.length)) score = 2 + d;
          else if (!al.includes(" ")) words.forEach((w) => { const dw = lev(w, al); if (w.length >= 4 && dw <= tol(al.length)) score = Math.min(score, 3 + dw); });
        }
        if (score < bestScore) { bestScore = score; best = idx; }
      });
    });
    return bestScore < 99 ? best : -1;
  }

  /* ---- leaderboard / country battle ---- */
  function ranked(players) {
    return Object.entries(players).map(([id, p]) => Object.assign({ id }, p))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }
  function countryTable(players) {
    const t = {};
    Object.values(players).forEach((p) => {
      const k = p.country || "XX";
      t[k] = t[k] || { id: k, total: 0, n: 0 };
      t[k].total += p.score; t[k].n++;
    });
    return Object.values(t).map((c) => Object.assign(c, { avg: c.n ? c.total / c.n : 0 }))
      .sort((a, b) => b.avg - a.avg);
  }
  function countryBars(players) {
    const rows = countryTable(players);
    const max = Math.max(1, ...rows.map((r) => r.avg));
    return '<div class="nations">' + rows.map((r) => {
      const c = C.countries.find((x) => x.id === r.id) || OTHER();
      return `<div class="nation"><span class="nflag">${c.flag}</span><span class="nname">${esc(c.name)} <small>(${r.n})</small></span>
        <span class="nbar"><i style="width:${Math.max(4, (r.avg / max) * 100)}%"></i></span><b>${fmt(r.avg)}</b></div>`;
    }).join("") + '<div class="nnote">Average points per player — so every nation can win</div></div>';
  }

  /* ---- playing cards (Play Your Cards Bright) ---- */
  const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const RANK_NAMES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King", "Ace"];
  const SUITS = ["♠", "♥", "♦", "♣"];
  /* deals `rows` rows of `per` cards from one shuffled 52-card deck; a card is [rank 0-12, suit 0-3] */
  function deal(rows, per) {
    const d = [];
    for (let r = 0; r < 13; r++) for (let s = 0; s < 4; s++) d.push([r, s]);
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return Array.from({ length: rows }, (_, r) => d.slice(r * per, r * per + per));
  }
  const cardName = (c) => RANK_NAMES[c[0]] + " of " + ["Spades", "Hearts", "Diamonds", "Clubs"][c[1]];
  function cardHtml(c, cls) {
    if (!c) return `<div class="pcard back ${cls || ""}"><i></i></div>`;
    const red = c[1] === 1 || c[1] === 2;
    return `<div class="pcard face ${red ? "red" : ""} ${cls || ""}" aria-label="${cardName(c)}"><span class="cr">${RANKS[c[0]]}<br>${SUITS[c[1]]}</span><span class="cs">${SUITS[c[1]]}</span><span class="cr cr2">${RANKS[c[0]]}<br>${SUITS[c[1]]}</span></div>`;
  }

  return { esc, $, flag, fmt, num, parseNum, uid, deal, cardHtml, cardName, RANK_NAMES, roomCode, norm, matchSurvey, ranked, countryTable, countryBars };
})();
