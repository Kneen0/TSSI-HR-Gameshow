/* Game-show music & sound effects.
   • Built-in: original tunes synthesised live with the Web Audio API — no files,
     no licensing worries.
   • Your own tracks: put MP3s in the /audio folder named after a slot
     (lobby.mp3, think.mp3, cards.mp3 …, see README) and they replace the
     built-in tune for that slot automatically.
   • Music modes (talk-friendly): "stings" · "timer" (default) · "full".
   Music.init() must be called from a click (browser autoplay rules). */
window.Music = (function () {
  let ctx = null, master = null, musicBus = null, sfxBus = null;
  let current = null; // {gain, timer, name, src}
  let volume = 0.7, muted = false;

  /* ---- music modes ----
     stings : jingles & sound effects only — silence whenever the host talks
     timer  : + quiet music in the lobby, while a countdown clock runs, and during the race
     full   : music almost all the time (the original behaviour) */
  const MODES = ["timer", "stings", "full"];
  let mode = "timer";
  try { const m = localStorage.getItem("tssi-music-mode"); if (MODES.includes(m)) mode = m; } catch (e) {}
  const LOOP_LEVEL = { stings: 0, timer: 0.4, full: 0.75 };   // background loops sit under your voice
  /* the longest a one-off jingle may run before fading (keeps long MP3s short) */
  const MAX_STING = { cards: 9, price: 9, derby: 9, fortunes: 9, translate: 9, board: 6, victory: 20 };
  const SLOTS = ["lobby", "think", "cards", "price", "derby", "gallop", "fortunes", "board", "victory", "translate"];
  const FILES = {};      // slot → decoded AudioBuffer from /audio/<slot>.mp3

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(n) {
    if (typeof n === "number") return n;
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
    if (!m) return null;
    let v = NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
    return v + (parseInt(m[3], 10) + 1) * 12;
  }
  const hz = (n) => 440 * Math.pow(2, (midi(n) - 69) / 12);

  /* iPhone/iPad: by default Safari silences web-page sound when the ring/silent
     switch is on. Declaring "playback" audio (Safari 17+) and looping a tiny silent
     <audio> clip (older iOS) moves the page onto the media channel, like a video. */
  const SILENT_WAV = "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";
  let unlockEl = null;
  function unlockIOS() {
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    try {
      if (!unlockEl) {
        unlockEl = document.createElement("audio");
        unlockEl.src = SILENT_WAV; unlockEl.loop = true; unlockEl.setAttribute("playsinline", "");
        unlockEl.setAttribute("x-webkit-airplay", "deny");
      }
      const p = unlockEl.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }
  function init() {
    unlockIOS();
    if (ctx) { if (ctx.state !== "running") ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    // a touch of "studio" reverb makes the built-in tunes sound less like a ringtone
    try {
      const len = Math.floor(ctx.sampleRate * 1.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      const verb = ctx.createConvolver(), wet = ctx.createGain();
      verb.buffer = ir; wet.gain.value = 0.22;
      musicBus.connect(verb); verb.connect(wet); wet.connect(master);
    } catch (e) {}
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    applyVol();
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    // browsers can suspend audio (tab switched, phone locked, call started): any tap brings it back
    const wake = () => { if (ctx && ctx.state !== "running") { ctx.resume().catch(() => {}); unlockIOS(); } };
    ["pointerdown", "keydown", "touchend"].forEach((ev) => document.addEventListener(ev, wake, { passive: true }));
    document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });
  }
  function applyVol() { if (master) master.gain.value = muted ? 0 : volume; }

  /* ---------- instruments ---------- */
  function tone(dest, t, note, dur, o) {
    o = o || {};
    if (note == null) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || "square";
    osc.frequency.setValueAtTime(hz(note), t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(hz(o.slide), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const vol = o.vol == null ? 0.15 : o.vol;
    const a = o.attack || 0.008, r = o.release || 0.06;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, Math.max(t + a, t + dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(dest, t, dur, o) {
    o = o || {};
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.ftype || "highpass"; f.frequency.value = o.freq || 6000;
    const g = ctx.createGain();
    const vol = o.vol || 0.12;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t); s.stop(t + dur + 0.02);
  }
  function kick(dest, t, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(vol || 0.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.25);
  }
  const snare = (d, t, v) => noise(d, t, 0.14, { freq: 1500, vol: v || 0.25 });
  const hat = (d, t, v) => noise(d, t, 0.04, { freq: 8000, vol: v || 0.07 });

  /* Plays a melody given as "C5:1 E5:0.5 -:0.5 ..." (beats). Returns length in s. */
  function line(dest, t0, bpm, str, o) {
    const beat = 60 / bpm; let t = t0;
    str.trim().split(/\s+/).forEach((tok) => {
      const [n, b] = tok.split(":");
      const d = parseFloat(b || "1") * beat;
      if (n !== "-") n.split("+").forEach((nn) => tone(dest, t, nn, d * (o && o.gate || 0.9), o));
      t += d;
    });
    return t - t0;
  }
  function drums(dest, t0, bpm, pattern, bars, vol) {
    // pattern: 16 steps per bar e.g. "k...s...k.k.s..." (k kick, s snare, h hat, x snare+hat)
    const step = 60 / bpm / 4;
    for (let b = 0; b < bars; b++) {
      for (let i = 0; i < 16; i++) {
        const c = pattern[i % pattern.length], t = t0 + (b * 16 + i) * step;
        if (c === "k") kick(dest, t, 0.5 * (vol || 1));
        if (c === "s" || c === "x") snare(dest, t, 0.2 * (vol || 1));
        if (c === "h" || c === "x") hat(dest, t, 0.06 * (vol || 1));
      }
    }
    return bars * 16 * step;
  }

  /* ---------- songs (each schedules from t, returns length) ---------- */
  const SONGS = {
    lobby(d, t) {
      const bpm = 108;
      line(d, t, bpm, "C3:1 C3:0.5 G2:0.5 A2:1 A2:0.5 E2:0.5 D3:1 D3:0.5 A2:0.5 G2:1 G2:0.5 B2:0.5", { type: "triangle", vol: 0.3 });
      line(d, t, bpm, "C4+E4+G4+B4:4 A3+C4+E4+G4:4", { type: "sine", vol: 0.05, attack: 0.2, release: 0.5, gate: 1 });
      line(d, t + 8 * 60 / bpm, bpm, "D4+F4+A4+C5:2 G3+B3+D4+F4:2", { type: "sine", vol: 0.05, attack: 0.2, release: 0.4, gate: 1 });
      line(d, t, bpm, "-:2 E5:0.5 G5:0.5 A5:1 -:2 G5:0.5 E5:0.5 C5:1 -:2 F5:0.5 A5:0.5 C6:1 B5:0.5 A5:0.5 G5:1 -:1", { type: "triangle", vol: 0.09 });
      drums(d, t, bpm, "k.h.s.h.k.k.s.h.", 4, 0.8);
      return 16 * 60 / bpm;
    },
    think(d, t) {
      const bpm = 120;
      line(d, t, bpm, "A2:0.5 -:0.5 E3:0.5 -:0.5 A2:0.5 -:0.5 E3:0.5 -:0.5 F2:0.5 -:0.5 C3:0.5 -:0.5 G2:0.5 -:0.5 D3:0.5 -:0.5", { type: "triangle", vol: 0.25 });
      line(d, t, bpm, "E5:0.25 -:0.75 C5:0.25 -:0.75 E5:0.25 -:0.75 A5:0.25 -:0.75 F5:0.25 -:0.75 C5:0.25 -:0.75 D5:0.25 -:0.75 B4:0.25 -:0.75", { type: "sine", vol: 0.08 });
      drums(d, t, bpm, "h...h...h...h.h.", 2, 0.6);
      return 8 * 60 / bpm;
    },
    translate(d, t) { // quirky xylophone
      const bpm = 150;
      line(d, t, bpm, "F5:0.5 A5:0.5 C6:0.5 A5:0.5 Bb5:0.5 G5:0.5 E5:0.5 C5:0.5 D5:0.5 F5:0.5 A5:0.5 F5:0.5 G5:1 -:0.5 C5:0.5 F5:0.5 A5:0.5 C6:0.5 F6:0.5 E6:0.5 C6:0.5 G5:0.5 E5:0.5 F5:2", { type: "triangle", vol: 0.22, gate: 0.4 });
      line(d, t, bpm, "F3:1 C3:1 C3:1 G2:1 Bb2:1 F2:1 C3:1 C3:1 F3:1 C3:1 C3:1 C3:1 F2:2", { type: "square", vol: 0.08, gate: 0.3, lp: 900 });
      drums(d, t, bpm, "k...s...k.k.s...", 3, 0.7);
      return 14 * 60 / bpm;
    },
    cards(d, t) { // swinging Saturday-night big band
      const bpm = 168, sw = { type: "sawtooth", vol: 0.07, lp: 2800 };
      line(d, t, bpm, "C3:1 E3:1 G3:1 A3:1 Bb3:1 A3:1 G3:1 E3:1 F3:1 A3:1 C4:1 D4:1 C3:1 G2:1 C3:2", { type: "triangle", vol: 0.3 });
      line(d, t, bpm, "-:0.66 E5+G5+C6:0.34 -:1 -:0.66 E5+G5+C6:0.34 -:1 -:0.66 E5+G5+Bb5:0.34 -:1 -:0.66 E5+G5+Bb5:0.34 -:1 -:0.66 F5+A5+C6:0.34 -:1 -:0.66 F5+A5+D6:0.34 -:1 G5+C6+E6:0.66 G5+B5+D6:0.34 C5+E5+G5+C6:2", sw);
      line(d, t, bpm, "G5:0.66 A5:0.34 C6:1 A5:0.66 G5:0.34 E5:1 G5:0.66 A5:0.34 Bb5:1 A5:0.66 G5:0.34 E5:1 F5:0.66 G5:0.34 A5:1 C6:0.66 D6:0.34 E6:1 D6:0.66 B5:0.34 C6:3", { type: "square", vol: 0.06, lp: 3200 });
      drums(d, t, bpm, "k..hs..hk..hs.hh", 4, 0.9);
      return 16 * 60 / bpm;
    },
    price(d, t) { // brassy showtime
      const bpm = 140, o = { type: "sawtooth", vol: 0.07, lp: 2600 };
      line(d, t, bpm, "C4:0.25 D4:0.25 E4:0.25 F4:0.25 G4:0.25 A4:0.25 B4:0.25 C5:0.25 E5+G5+C6:1.5 -:0.5 D5+F5+Bb5:0.5 E5+G5+C6:0.5 -:0.5 F5+A5+D6:1 E5+G5+C6:0.5 D5+G5+B5:0.5 E5+G5+C6:3", o);
      line(d, t, bpm, "C3:2 C3:1.5 Bb2:0.5 C3:0.5 -:0.5 F2:1 G2:1 C3:3", { type: "square", vol: 0.12, lp: 800 });
      drums(d, t, bpm, "k.h.x.h.k.hhx.hh", 3, 1);
      return 12 * 60 / bpm;
    },
    derby(d, t) { // original bugle-style call
      const bpm = 132, o = { type: "sawtooth", vol: 0.1, lp: 1800, attack: 0.02 };
      line(d, t, bpm, "G4:0.5 C5:0.5 E5:0.5 G5:1 E5:0.5 G5:0.5 E5:0.5 C5:1 G4:0.5 C5:0.5 E5:0.5 G5:0.5 G5:0.5 G5:0.5 E5:0.5 C5:0.5 E5:0.5 G5:0.5 C6:3", o);
      return 12 * 60 / bpm;
    },
    gallop(d, t) { // race loop
      const bpm = 156;
      drums(d, t, bpm, "k.kh s.kh k.kh s.kh".replace(/ /g, ""), 2, 1);
      line(d, t, bpm, "D3:0.5 D3:0.25 D3:0.25 A2:0.5 D3:0.5 C3:0.5 C3:0.25 C3:0.25 G2:0.5 C3:0.5 Bb2:0.5 Bb2:0.25 Bb2:0.25 F2:0.5 Bb2:0.5 A2:0.5 A2:0.25 A2:0.25 E3:0.5 A2:0.5", { type: "square", vol: 0.1, lp: 900 });
      line(d, t, bpm, "D5:0.5 F5:0.5 A5:1 C6:0.5 A5:0.5 G5:1 F5:0.5 D5:0.5 F5:1 E5:0.5 C#5:0.5 A4:1", { type: "triangle", vol: 0.12 });
      return 8 * 60 / bpm;
    },
    fortunes(d, t) { // dramatic
      const bpm = 120, o = { type: "sawtooth", vol: 0.06, lp: 2200 };
      line(d, t, bpm, "A3+C4+E4:1 A3+C4+E4:0.5 A3+C4+E4:0.5 F3+A3+C4:1 G3+B3+D4:1 A3+C4+E4:0.5 C4+E4+G4:0.5 D4+F4+A4:0.5 E4+G#4+B4:0.5 A4+C5+E5:3", o);
      line(d, t, bpm, "A5:1 A5:0.5 A5:0.5 C6:1 B5:1 C6:0.5 D6:0.5 E6:0.5 G#5:0.5 A5:3", { type: "square", vol: 0.07, lp: 3000 });
      line(d, t, bpm, "A2:1 A2:1 F2:1 G2:1 A2:0.5 C3:0.5 D3:0.5 E3:0.5 A2:3", { type: "triangle", vol: 0.3 });
      drums(d, t, bpm, "k...s...k...s.ss", 3, 1);
      return 10 * 60 / bpm;
    },
    board(d, t) { // leaderboard sting
      const bpm = 150;
      line(d, t, bpm, "C5:0.5 E5:0.5 G5:0.5 C6:1.5 A5:0.5 C6:0.5 E6:2", { type: "square", vol: 0.08, lp: 3500 });
      line(d, t, bpm, "C4+E4+G4:2 F4+A4+C5:1 C4+E4+G4:3", { type: "sawtooth", vol: 0.04, lp: 2000 });
      drums(d, t, bpm, "k.h.s.h.k.h.sss.", 2, 0.9);
      return 6 * 60 / bpm;
    },
    victory(d, t) {
      const bpm = 120, o = { type: "sawtooth", vol: 0.07, lp: 3000 };
      line(d, t, bpm, "G4:0.33 G4:0.33 G4:0.34 C5+E5+G5:2 Bb4+D5+F5:1 C5+E5+G5:0.5 -:0.25 F5:0.25 C5+E5+G5:1 D5+F5+A5:1 E5+G5+C6:4", o);
      line(d, t, bpm, "C3:1 C3:2 Bb2:1 C3:1 F2:1 G2:1 C3:4", { type: "triangle", vol: 0.3 });
      drums(d, t, bpm, "k.h.s.h.k.h.s.hh", 4, 1);
      return 11 * 60 / bpm;
    }
  };

  /* ---------- sound effects ---------- */
  const SFX = {
    tick() { tone(sfxBus, ctx.currentTime, "E6", 0.04, { type: "square", vol: 0.08 }); },
    tock() { tone(sfxBus, ctx.currentTime, "A6", 0.07, { type: "square", vol: 0.12 }); },
    ding() { const t = ctx.currentTime; tone(sfxBus, t, "E6", 0.6, { type: "sine", vol: 0.25, release: 0.5 }); tone(sfxBus, t + 0.1, "B6", 0.8, { type: "sine", vol: 0.2, release: 0.7 }); },
    buzz() { const t = ctx.currentTime; tone(sfxBus, t, "C3", 0.7, { type: "sawtooth", vol: 0.25, lp: 1200 }); tone(sfxBus, t, "C#3", 0.7, { type: "square", vol: 0.15, lp: 1000 }); },
    pop() { tone(sfxBus, ctx.currentTime, "C5", 0.08, { type: "sine", vol: 0.2, slide: "C6" }); },
    whoosh() { noise(sfxBus, ctx.currentTime, 0.5, { ftype: "bandpass", freq: 1200, vol: 0.25 }); },
    bell() { const t = ctx.currentTime; for (let i = 0; i < 6; i++) tone(sfxBus, t + i * 0.12, "A5", 0.1, { type: "square", vol: 0.12 }); },
    gun() { noise(sfxBus, ctx.currentTime, 0.4, { ftype: "lowpass", freq: 3000, vol: 0.5 }); kick(sfxBus, ctx.currentTime, 0.8); },
    reveal() { const t = ctx.currentTime; tone(sfxBus, t, "G5", 0.12, { type: "square", vol: 0.12 }); tone(sfxBus, t + 0.1, "C6", 0.4, { type: "square", vol: 0.12 }); },
    drumroll() { const t = ctx.currentTime; for (let i = 0; i < 40; i++) snare(sfxBus, t + i * 0.05, 0.05 + i * 0.004); kick(sfxBus, t + 2, 0.8); noise(sfxBus, t + 2, 1.2, { freq: 5000, vol: 0.2 }); },
    applause() { const t = ctx.currentTime; for (let i = 0; i < 90; i++) noise(sfxBus, t + Math.random() * 2.5, 0.05, { ftype: "bandpass", freq: 1500 + Math.random() * 3000, vol: 0.12 }); },
    fanfare() { const t = ctx.currentTime; line(sfxBus, t, 160, "C5:0.5 E5:0.5 G5:0.5 C6:2", { type: "sawtooth", vol: 0.08, lp: 3500 }); }
  };

  /* ---------- public API ---------- */
  function stop(fade) {
    if (!current || !ctx) return;
    const c = current; current = null;
    clearTimeout(c.timer); clearTimeout(c.fadeTimer);
    const now = ctx.currentTime, f = fade == null ? 0.4 : fade;
    c.gain.gain.cancelScheduledValues(now);
    c.gain.gain.setValueAtTime(c.gain.gain.value, now);
    c.gain.gain.linearRampToValueAtTime(0, now + f);
    setTimeout(() => { try { if (c.src) c.src.stop(); c.gain.disconnect(); } catch (e) {} }, f * 1000 + 300);
  }
  /* play(name, loop, then): a loop is background music (obeys the music mode and sits
     quieter); a non-loop is a jingle/sting (always plays). `then` = loop to follow it,
     only used in "full" mode so the room goes quiet after a jingle. */
  function play(name, loop, then) {
    if (!ctx || !(SONGS[name] || FILES[name])) return 0;
    if (loop && mode === "stings") { stop(0.6); return 0; }
    if (then && mode !== "full") then = null;
    stop(0.25);
    const g = ctx.createGain(); g.connect(musicBus);
    const level = loop ? LOOP_LEVEL[mode] : 1;
    const c = { gain: g, timer: null, name, loop: !!loop };
    current = c;
    let t = ctx.currentTime + 0.08;
    if (FILES[name]) {                                   // your own MP3 for this slot
      const src = ctx.createBufferSource(); src.buffer = FILES[name]; src.loop = !!loop; c.src = src;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + 0.15);
      src.connect(g); src.start(t);
      let len = FILES[name].duration;
      if (!loop) {
        const max = MAX_STING[name];
        if (max && len > max) {                          // long track used as a jingle → fade it out
          len = max;
          c.fadeTimer = setTimeout(() => { if (current === c) stop(1.2); }, (max - 1.2) * 1000);
        }
        c.timer = setTimeout(() => { if (current !== c) return; if (then) play(then, true); else current = null; }, len * 1000 + 150);
      }
      return len;
    }
    g.gain.value = level;
    const len = SONGS[name](g, t);
    if (loop) {
      const sched = () => {
        if (current !== c) return;
        t += len; SONGS[name](g, t);
        c.timer = setTimeout(sched, (t - ctx.currentTime) * 1000 - 300);
      };
      c.timer = setTimeout(sched, len * 1000 - 300);
    } else {
      // when a jingle ends: start the follow-on loop ("full" mode) or mark the music as finished
      c.timer = setTimeout(() => { if (current !== c) return; if (then) play(then, true); else current = null; }, len * 1000 + 150);
    }
    return len;
  }

  return {
    init,
    play,                       // play(name, loop?, thenLoopName?)
    stop,
    // skip (rather than queue up) sounds while the browser still has audio locked
    sfx(name) { if (!ctx || !SFX[name]) return; if (ctx.state !== "running") { ctx.resume(); return; } SFX[name](); },
    setVolume(v) { volume = v; applyVol(); },
    getVolume() { return volume; },
    toggleMute() { muted = !muted; applyVol(); return muted; },
    get ready() { return !!ctx && ctx.state === "running"; },
    get muted() { return muted; },
    songs: Object.keys(SONGS),
    /* music mode */
    get mode() { return mode; },
    modes: MODES,
    setMode(m) {
      if (!MODES.includes(m)) return;
      mode = m; try { localStorage.setItem("tssi-music-mode", m); } catch (e) {}
      if (current && current.loop) {               // apply straight away to anything looping now
        if (m === "stings") stop(0.6);
        else if (ctx) current.gain.gain.linearRampToValueAtTime(LOOP_LEVEL[m], ctx.currentTime + 0.4);
      }
    },
    get playing() { return !!current; },
    /* looks for /audio/<slot>.mp3 files and uses any it finds; returns the slots found */
    async loadFiles(base) {
      if (!ctx) return [];
      const found = [];
      await Promise.all(SLOTS.map(async (slot) => {
        try {
          const res = await fetch((base || "audio/") + slot + ".mp3", { cache: "no-cache" });
          const type = res.headers.get("content-type") || "";
          if (!res.ok || /html/i.test(type)) return;      // missing file (Netlify serves an HTML 404)
          const buf = await res.arrayBuffer();
          FILES[slot] = await new Promise((ok, bad) => ctx.decodeAudioData(buf, ok, bad));
          found.push(slot);
        } catch (e) { console.warn("Couldn't use audio/" + slot + ".mp3", e); }
      }));
      return found.sort();
    },
    get customSlots() { return Object.keys(FILES).sort(); }
  };
})();
