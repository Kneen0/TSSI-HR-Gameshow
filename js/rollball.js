/* =====================================================================
   ROLL-A-BALL LANE (phone) — the fairground "flick the ball into the
   holes" mini-game used by The Fairground Derby.
   Coordinates are in "lane widths": x 0→1 across, y 0→H from the top.
   ===================================================================== */
window.RollBall = (function () {
  const H = 1.3;                       // lane height in widths
  const START = { x: 0.5, y: 1.17 };
  const BALL = 0.036;
  const FRICTION = 1.55;               // deceleration (lane widths / s²)
  const CAPTURE = 0.95;                // a ball slower than this drops into a hole
  const HOLES = [
    { x: 0.50, y: 0.15, r: 0.070, pts: 3 },
    { x: 0.27, y: 0.30, r: 0.085, pts: 2 }, { x: 0.73, y: 0.30, r: 0.085, pts: 2 },
    { x: 0.50, y: 0.46, r: 0.090, pts: 2 },
    { x: 0.18, y: 0.55, r: 0.095, pts: 1 }, { x: 0.82, y: 0.55, r: 0.095, pts: 1 },
    { x: 0.34, y: 0.72, r: 0.095, pts: 1 }, { x: 0.66, y: 0.72, r: 0.095, pts: 1 },
    { x: 0.50, y: 0.88, r: 0.085, pts: 1 }
  ];
  const COLORS = { 1: "#ffd166", 2: "#3aa0ff", 3: "#ef476f" };

  /* Simulates one roll. speed in lane-widths/s, angle in radians (0 = straight up).
     Returns { pts, path:[{x,y}], hole } */
  function simulate(speed, angle) {
    let x = START.x, y = START.y, vx = Math.sin(angle) * speed, vy = -Math.cos(angle) * speed;
    const dt = 1 / 120, path = [{ x, y }];
    for (let i = 0; i < 1200; i++) {
      const v = Math.hypot(vx, vy);
      if (v < 0.04) break;
      const nv = Math.max(0, v - FRICTION * dt), k = nv / v;
      vx *= k; vy *= k;
      x += vx * dt; y += vy * dt;
      if (x < BALL) { x = BALL; vx = Math.abs(vx) * 0.6; }
      if (x > 1 - BALL) { x = 1 - BALL; vx = -Math.abs(vx) * 0.6; }
      if (y < BALL) { y = BALL; vx += (Math.random() - 0.5) * 0.9 * Math.abs(vy); vy = Math.abs(vy) * 0.35; } // back wall: unpredictable bounce
      if (y > H - BALL) { y = H - BALL; vy = -Math.abs(vy) * 0.3; }
      if (i % 2 === 0) path.push({ x, y });
      for (const h of HOLES) {
        if (Math.hypot(x - h.x, y - h.y) < h.r * 0.92 && nv < CAPTURE) {
          path.push({ x: h.x, y: h.y });
          return { pts: h.pts, path, hole: h };
        }
      }
    }
    return { pts: 0, path, hole: null };
  }

  /* ---- drawing ---- */
  function draw(ctx, W, ball, glow) {
    const u = W, Hp = H * u;
    ctx.clearRect(0, 0, W, Hp);
    const g = ctx.createLinearGradient(0, 0, 0, Hp);
    g.addColorStop(0, "#0e5a46"); g.addColorStop(1, "#0a3d33");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hp);
    // lane stripes
    ctx.globalAlpha = 0.08; ctx.fillStyle = "#fff";
    for (let i = 0; i < 10; i++) ctx.fillRect(0, (i * Hp) / 10, W, Hp / 20);
    ctx.globalAlpha = 1;
    // rails
    ctx.fillStyle = "#c8243a"; ctx.fillRect(0, 0, 6, Hp); ctx.fillRect(W - 6, 0, 6, Hp); ctx.fillRect(0, 0, W, 6);
    // holes
    HOLES.forEach((h) => {
      const hx = h.x * u, hy = h.y * u, r = h.r * u;
      ctx.beginPath(); ctx.arc(hx, hy, r + 5, 0, Math.PI * 2); ctx.fillStyle = COLORS[h.pts]; ctx.fill();
      if (glow === h) { ctx.shadowColor = COLORS[h.pts]; ctx.shadowBlur = 30; ctx.fill(); ctx.shadowBlur = 0; }
      const hg = ctx.createRadialGradient(hx, hy - r * 0.3, r * 0.1, hx, hy, r);
      hg.addColorStop(0, "#000"); hg.addColorStop(1, "#1c1c2a");
      ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill();
      ctx.fillStyle = COLORS[h.pts]; ctx.font = `bold ${Math.round(r * 0.9)}px Bungee, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(h.pts, hx, hy + 1);
    });
    // launch zone
    ctx.strokeStyle = "#ffffff40"; ctx.setLineDash([6, 6]); ctx.beginPath();
    ctx.moveTo(10, (START.y - 0.09) * u); ctx.lineTo(W - 10, (START.y - 0.09) * u); ctx.stroke(); ctx.setLineDash([]);
    // ball
    if (ball) {
      const bx = ball.x * u, by = ball.y * u, br = BALL * u * (ball.s || 1);
      ctx.beginPath(); ctx.arc(bx + 2, by + 3, br, 0, Math.PI * 2); ctx.fillStyle = "#00000055"; ctx.fill();
      const bg = ctx.createRadialGradient(bx - br * 0.4, by - br * 0.4, br * 0.1, bx, by, br);
      bg.addColorStop(0, "#fff"); bg.addColorStop(1, "#d9d2c0");
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();
    }
  }

  /* Mounts an interactive lane on a canvas. onResult(pts) is called after every roll. */
  function mount(canvas, onResult) {
    const ctx = canvas.getContext("2d");
    let W = 0, enabled = false, busy = false, glow = null, ball = { ...START };
    function size() {
      const dpr = window.devicePixelRatio || 1;
      W = canvas.clientWidth || 300;
      canvas.width = W * dpr; canvas.height = W * H * dpr; canvas.style.height = W * H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, W, ball, glow);
    }
    size();
    const onResize = () => size();
    window.addEventListener("resize", onResize);

    let pts = [];
    canvas.addEventListener("pointerdown", (e) => {
      if (!enabled || busy) return;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      pts = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
      e.preventDefault();
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!pts.length) return;
      pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (pts.length > 12) pts.shift();
      e.preventDefault();
    });
    const release = (e) => {
      if (!pts.length) return;
      const last = { x: e.clientX, y: e.clientY, t: performance.now() };
      const first = pts.find((p) => last.t - p.t <= 120) || pts[0];
      pts = [];
      const dx = last.x - first.x, dy = last.y - first.y, dt = Math.max(16, last.t - first.t) / 1000;
      if (dy > -12) { api.onHint && api.onHint(); return; }      // not a flick upwards
      const raw = Math.hypot(dx, dy) / dt / W;                  // flick speed in lane widths per second
      // log curve: gentle flicks and hard flicks both stay controllable on any phone size
      const speed = Math.max(0.85, Math.min(3.0, 0.5 + 0.8 * Math.log(1 + raw)));
      let angle = Math.atan2(dx, -dy) + (Math.random() - 0.5) * 0.06;
      angle = Math.max(-0.6, Math.min(0.6, angle));
      roll(speed, angle);
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", () => (pts = []));

    function roll(speed, angle) {
      busy = true; glow = null;
      const res = simulate(speed, angle);
      let i = 0;
      const step = () => {
        i += 2;
        if (i < res.path.length) { ball = { ...res.path[i] }; draw(ctx, W, ball, glow); requestAnimationFrame(step); return; }
        if (res.hole) {           // drop into the hole
          let s = 1;
          const sink = () => { s -= 0.12; ball = { x: res.hole.x, y: res.hole.y, s: Math.max(0, s) }; glow = res.hole; draw(ctx, W, s > 0 ? ball : null, glow); if (s > 0) requestAnimationFrame(sink); else done(); };
          sink();
        } else {                  // rolls back down the lane
          const from = { ...ball }; let t = 0;
          const back = () => { t += 0.06; ball = { x: from.x + (START.x - from.x) * t, y: from.y + (START.y - from.y) * t }; draw(ctx, W, ball, null); if (t < 1) requestAnimationFrame(back); else done(); };
          back();
        }
      };
      const done = () => {
        onResult(res.pts);
        setTimeout(() => { ball = { ...START }; glow = null; busy = false; draw(ctx, W, ball, null); }, res.hole ? 250 : 0);
      };
      requestAnimationFrame(step);
    }

    const api = {
      enable(on) { enabled = on; canvas.classList.toggle("off", !on); },
      destroy() { window.removeEventListener("resize", onResize); },
      roll, onHint: null
    };
    return api;
  }

  return { simulate, mount, HOLES, H };
})();
