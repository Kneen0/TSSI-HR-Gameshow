/* =====================================================================
   OFF THE WALL — the pegboard ("The Wall") shared by host and phones.
   Ball paths are a seeded "bean machine": at every row of pegs the ball
   bounces one half-slot left or right. The same seed gives the same
   path on every device, so a phone can replay exactly the drop the
   host scored.
   ===================================================================== */
window.Wall = (function () {
  const SLOTS = 15, ZONES = 7, ROWS = 16;
  const ZONE_SLOT = 4;                 // zone 1 sits above slot 5 (index 4) … zone 7 above slot 11
  const FALL_MS = 3600;                // how long one ball takes to reach the bottom

  /* seeded random numbers */
  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* path of a ball dropped from zone (0–6). Positions are in half-slots (0 … 28). */
  function path(zone, seedStr, values) {
    const r = rng(hash(seedStr));
    let h = 2 * (ZONE_SLOT + zone);
    const steps = [h];
    for (let i = 0; i < ROWS; i++) {
      h += r() < 0.5 ? -1 : 1;
      if (h < 0) h = 1; if (h > 2 * (SLOTS - 1)) h = 2 * (SLOTS - 1) - 1;   // bounce off the sides
      steps.push(h);
    }
    const slot = h / 2;
    return { zone, steps, slot, value: values ? values[slot] : 0 };
  }

  /* ---------- drawing ---------- */
  const fmtV = (v) => (v >= 1000 ? (v / 1000).toLocaleString("en-GB") + "k" : String(v));
  function geom(W, H) {
    const top = H * 0.09, bottom = H * 0.84, sw = W / SLOTS;
    return { sw, top, bottom, rowH: (bottom - top) / ROWS, xh: (h) => (h / 2 + 0.5) * sw };
  }
  /* where a ball is, t = ms since its drop started */
  function ballPos(b, t, W, H) {
    const g = geom(W, H);
    const p = Math.max(0, t) / FALL_MS;                    // 0 … 1 (and beyond = landed)
    const rowF = Math.min(ROWS + 1, Math.pow(Math.min(p, 1), 1.25) * (ROWS + 1));
    if (rowF <= 0.0001) return { x: g.xh(b.steps[0]), y: g.top * 0.55, landed: false };
    const k = Math.min(ROWS, Math.floor(rowF)), f = rowF - Math.floor(rowF);
    if (rowF >= ROWS + 1 - 1e-9 || k >= ROWS) {
      const x = g.xh(b.steps[ROWS]);
      const y = g.bottom + (H - g.bottom) * Math.min(0.8, (rowF - ROWS) * 0.6 + 0.35);
      return { x, y, landed: p >= 1 };
    }
    const h0 = b.steps[k], h1 = b.steps[k + 1];
    const x = g.xh(h0) + (g.xh(h1) - g.xh(h0)) * f;
    const y = g.top + g.rowH * (k + f) - Math.sin(f * Math.PI) * g.rowH * 0.35;  // little hop over each peg
    return { x, y, landed: false };
  }
  /* balls: [{steps, start (ms timestamp), color, label}] ; lit: {slotIndex: color} */
  /* the background + pegs never change, so they're drawn once into an off-screen canvas */
  let cache = null;
  function staticLayer(W, H, dpr) {
    const key = W + "x" + H + "@" + dpr;
    if (cache && cache.key === key) return cache.canvas;
    const g = geom(W, H), cv = document.createElement("canvas");
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0b1d4d"); bg.addColorStop(1, "#06102c");
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = "#7fb2ff";
    for (let r = 0; r < ROWS; r++) {
      const y = g.top + g.rowH * (r + 0.5);
      for (let h = r % 2 ? 0 : 1; h <= 2 * (SLOTS - 1); h += 2) { c.beginPath(); c.arc(g.xh(h), y, Math.max(1.5, g.sw * 0.06), 0, Math.PI * 2); c.fill(); }
    }
    cache = { key, canvas: cv };
    return cv;
  }
  function draw(ctx, W, H, values, balls, now, opts) {
    opts = opts || {};
    const g = geom(W, H), dpr = ctx.getTransform ? ctx.getTransform().a : 1;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(staticLayer(W, H, dpr), 0, 0, W, H);
    // zone numbers
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let z = 0; z < ZONES; z++) {
      const x = g.xh(2 * (ZONE_SLOT + z)), sel = opts.zone === z, cnt = opts.zoneCounts ? opts.zoneCounts[z] : 0;
      ctx.fillStyle = sel ? "#ffd166" : "#1d3f8f";
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - g.sw * 0.42, g.top * 0.12, g.sw * 0.84, g.top * 0.62, 6) : ctx.rect(x - g.sw * 0.42, g.top * 0.12, g.sw * 0.84, g.top * 0.62); ctx.fill();
      ctx.fillStyle = sel ? "#2a1a00" : "#9fd0ff"; ctx.font = `bold ${Math.round(g.top * 0.38)}px Bungee, sans-serif`;
      ctx.fillText(z + 1, x, g.top * 0.44);
      if (cnt) { ctx.fillStyle = "#ffd166"; ctx.font = `bold ${Math.round(g.top * 0.26)}px Figtree, sans-serif`; ctx.fillText("×" + cnt, x, g.top * 0.92); }
    }
    // slots
    const sh = H - g.bottom;
    for (let i = 0; i < SLOTS; i++) {
      const x = i * g.sw, v = values[i], big = v >= 400, lit = opts.lit && opts.lit[i];
      ctx.fillStyle = lit ? lit : big ? "#16357f" : "#0e2259";
      ctx.fillRect(x + 1, g.bottom + 2, g.sw - 2, sh - 4);
      if (lit) { ctx.globalAlpha = 0.35; ctx.fillRect(x - 2, g.bottom - 6, g.sw + 4, sh + 6); ctx.globalAlpha = 1; }   // cheap glow
      ctx.save(); ctx.translate(x + g.sw / 2, g.bottom + sh * 0.4); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = lit ? "#111" : big ? "#ffd166" : "#9fb4e6";
      ctx.font = `bold ${Math.round(Math.min(g.sw * 0.55, sh * 0.2))}px Bungee, sans-serif`;
      ctx.fillText(fmtV(v), 0, 0); ctx.restore();
    }
    // balls
    const br = Math.max(4, g.sw * 0.36);
    (balls || []).forEach((b) => {
      const t = now - b.start; if (t < -50) return;
      const p = ballPos(b, t, W, H);
      ctx.beginPath(); ctx.arc(p.x, p.y, br, 0, Math.PI * 2); ctx.fillStyle = b.color; ctx.fill();
      if (b.mine) { ctx.lineWidth = 3; ctx.strokeStyle = "#ffd166"; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(p.x - br * 0.35, p.y - br * 0.38, br * 0.28, 0, Math.PI * 2); ctx.fillStyle = "#ffffffb0"; ctx.fill();   // shine
      if (b.label) { ctx.fillStyle = "#081226"; ctx.font = `bold ${Math.round(br * 0.95)}px Figtree, sans-serif`; ctx.fillText(b.label, p.x, p.y + 1); }
    });
  }
  /* true when every ball has landed */
  const allLanded = (balls, now) => (balls || []).every((b) => now - b.start >= FALL_MS);

  return { SLOTS, ZONES, ROWS, FALL_MS, hash, path, draw, ballPos, allLanded, fmtV };
})();
