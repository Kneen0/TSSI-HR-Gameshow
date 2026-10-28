# Prompt: Build "The Big HR Game Show"

Copy everything below the line into Claude (or another AI coding assistant) to recreate, extend or re-theme the game. It describes exactly what was built in this repository.

---

You are a senior front-end developer and live-event game designer. Build a complete, ready-to-deploy interactive game show for the **TSSI HR Monthly Global HR Social Connect**, a 45-minute virtual social for HR colleagues in the **UK, US and Germany**, held over Teams/Zoom.

## Goals
- Every individual participates from their own phone or browser tab; nobody just watches.
- Everyone can see everyone's scores, live, to create friendly competition — individually and as countries ("Battle of the Nations", using **average** score per player so a small office can win).
- Several distinct games inspired by TV classics (*The Price is Right*, a horse-race derby, *Family Fortunes*), plus a cross-cultural quiz suited to a mixed UK/US/German audience.
- Each game has a fun, **interactive intro**: animated title card, its own music jingle, three-line rules, and a quick warm-up vote on phones worth a few points.
- Music and sound effects woven throughout. All music must be **original**, generated with the Web Audio API — no audio files, no copyrighted tunes, no real show names or logos (use parody names).
- Inclusive humour: light, work-safe, no stereotypes that punch down; mix of UK, US and German references so no country has a home-advantage every round.

## Tech constraints
- Static site only (HTML/CSS/vanilla JS, no build step) hosted on **Netlify**, code in **GitHub**, real-time messaging via **Supabase Realtime broadcast** (anon/publishable key in a `config.js`).
- Host browser is authoritative: it holds all state, runs timers, scores answers and broadcasts state. Players send inputs only.
- Use two channels per room — `<room>-down` (host → players) and `<room>-up` (players → host, sent via REST without subscribing) — so players never receive each other's messages. Throttle host broadcasts (≥1.5 s apart, 8 s heartbeat), batch cheer taps, and include a "received" map so phones resend lost inputs. Stay within the Supabase Free plan (100 msgs/s) for ~80 players.
- **Demo mode** when `config.js` is blank: use `BroadcastChannel` so host + player tabs in one browser work for rehearsal (per-tab player identity via sessionStorage).
- Host state persists in localStorage with a "Resume room" option; players are remembered per device and rejoin automatically.
- Optional Supabase table `game_results` (RLS: anon insert only) storing each month's final leaderboard, plus a `hall_of_fame` view.
- All editable content (questions, prices, horses, survey answers, running order) in a single `content.js` that a non-developer can edit.

## Screens
**Host big screen (`host.html`)** — 16:9, readable when screen-shared: lobby with QR code, join URL and 4-letter room code, players popping in with flags; game screens; leaderboards with per-game gains and nation bars; finale. A slim control bar: Next/Back, jump-to menu, volume/mute, copy join link, connection status, and a show clock against the 40-minute plan (✅ on time / ⚠️ behind). Keys: Space/→, ←, M, H (hide bar), F (fullscreen).

**Player (`play.html`)** — mobile-first: join with room code, name and flag (🇬🇧 🇺🇸 🇩🇪 🌍); sticky header with score and rank; big tappable controls; countdown bar; result + points after every reveal; a 🏆 button for the full live leaderboard at any time.

## Running order (45 min)
1. **Lobby (5 min)** — join, lobby music loop.
2. **Lost in Translation (8 min)** — 8 multiple-choice questions on UK/US/German words (e.g. *Handy*, "table that", *chuffed*, *Feierabend*, *Kummerspeck*). 15 s each. 500 pts + up to 500 speed bonus. Reveal shows answer counts, a fun fact and the fastest finger. Warm-up vote: *Biscuit / Cookie / Keks?*
3. **The Price is Bright (9 min)** — 6 items with a mix of £, $ and DM historical launch prices. 25 s each. Closest without going over: 1000/600/400, exact = 2000, others under and within 25% = 200, all-over = 300 consolation for closest. Drumroll reveal. Warm-up vote: *best bargain hunters?*
4. **The Desk Derby (10 min)** — 6 HR-themed horses (Tea Break, Casual Friday, Feierabend Flyer, Annual Leave, Probation Pony, Payroll Thunder) with odds and payouts. 2 races: 20 s betting, 3-2-1 + starting gun, ~15 s animated race with live commentary; players mash CHEER for a small, capped boost averaged per backer. Win rates tuned to roughly match the odds. Winner's backers get the payout, 2nd gets 200, "loudest in the grandstand" shout-out. Warm-up vote: *Ascot / Kentucky / Deutsches Derby?*
5. **Global Fortunes (10 min)** — "We asked 100 colleagues…": 4 survey questions, 40 s, up to 3 typed answers each (English or German), fuzzy matching with aliases and typo tolerance. 10 pts per survey person. Board flips from #6 to #1 with counts of players who matched, then the most common miss with a big ✖ buzzer. Warm-up vote: *Fish & chips / Burger / Currywurst?*
6. **Grand Finale (3 min)** — drumroll podium reveal 3-2-1, victory fanfare, confetti, Nation Champions, and awards for the top scorer in each game.
Leaderboard after every game.

## Music & SFX (Web Audio synth)
Lobby loop, thinking loop, one distinct jingle per game (quirky xylophone, brassy showtime, bugle call + gallop loop, dramatic game-show build), leaderboard sting, victory fanfare; SFX: tick, buzzer, ding, pop, whoosh, drumroll, applause, starting bell/gun, reveal.

## Deliverables
1. Full source: `index.html`, `host.html`, `play.html`, `css/style.css`, `js/{config,content,common,music,transport,host,play}.js`, `supabase/schema.sql`, `netlify.toml`.
2. `README.md` — demo mode in 2 minutes; step-by-step GitHub → Supabase → Netlify; screen-sharing with sound in Teams/Zoom/Meet; troubleshooting; how to edit content; scoring table; privacy notes.
3. `RUNSHEET.md` — minute-by-minute host script with bilingual banter and music cues.
4. Test the whole show end-to-end in demo mode with several player tabs before handing over.

## Style
Evening TV studio: deep indigo background with spotlights, gold and hot-pink accents, a bold display font for titles (e.g. Bungee) with a friendly sans for text (e.g. Figtree), marquee-bulb badges, pop-in and flip animations. Big, high-contrast text that survives video compression.
