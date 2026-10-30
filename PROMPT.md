# Prompt: Build "The Big HR Game Show"

Copy everything below the line into Claude (or another AI coding assistant) to recreate, extend or re-theme the game. It describes exactly what was built in this repository.

---

You are a senior front-end developer and live-event game designer. Build a complete, ready-to-deploy interactive game show for the **TSSI HR Monthly Global HR Social Connect**, a 45-minute virtual social for HR colleagues around the world, held over Teams/Zoom.

## Goals
- Every individual participates from their own phone or browser tab; nobody just watches.
- Everyone can see everyone's scores, live, to create friendly competition.
- Several distinct games inspired by TV classics (*The Price is Right*, a horse-race derby, *Family Fortunes*), plus a quick-fire office-jargon quiz.
- Each game has a fun, **interactive intro**: animated title card, its own music jingle, three-line rules, and a quick warm-up vote on phones worth a few points.
- Music and sound effects woven throughout. All music must be **original**, generated with the Web Audio API — no audio files, no copyrighted tunes, no real show names or logos (use parody names).
- Inclusive humour: light, work-safe, no stereotypes that punch down; **no question depends on which country someone lives in** — use general knowledge, office life and universal topics so nobody has a home advantage.

## Tech constraints
- Static site only (HTML/CSS/vanilla JS, no build step) hosted on **Netlify**, code in **GitHub**, real-time messaging via **Supabase Realtime broadcast** (anon/publishable key in a `config.js`).
- Host browser is authoritative: it holds all state, runs timers, scores answers and broadcasts state. Players send inputs only.
- Use two channels per room — `<room>-down` (host → players) and `<room>-up` (players → host, sent via REST without subscribing) — so players never receive each other's messages. Throttle host broadcasts (≥1.5 s apart, 8 s heartbeat), batch cheer taps, and include a "received" map so phones resend lost inputs. Stay within the Supabase Free plan (100 msgs/s) for ~80 players.
- **Demo mode** when `config.js` is blank: use `BroadcastChannel` so host + player tabs in one browser work for rehearsal (per-tab player identity via sessionStorage).
- Host state persists in localStorage with a "Resume room" option; players are remembered per device and rejoin automatically.
- Optional Supabase table `game_results` (RLS: anon insert only) storing each month's final leaderboard, plus a `hall_of_fame` view.
- All editable content (questions, prices, horses, survey answers, running order) in a single `content.js` that a non-developer can edit.

## Screens
**Host big screen (`host.html`)** — 16:9, readable when screen-shared: lobby with QR code, join URL and 4-letter room code, players popping in by name; game screens; leaderboards with per-game gains; finale. A slim control bar: Next/Back, jump-to menu, volume/mute, copy join link, connection status, and a show clock against the 40-minute plan (✅ on time / ⚠️ behind). Keys: Space/→, ←, M, H (hide bar), F (fullscreen).

**Player (`play.html`)** — mobile-first: join with room code and name only (no country or flag); sticky header with score and rank; big tappable controls; countdown bar; result + points after every reveal; a 🏆 button for the full live leaderboard at any time.

## Running order (45 min)
1. **Lobby (5 min)** — join, lobby music loop.
2. **Play Your Cards Bright (8 min)** — *Play Your Cards Right*-style higher-or-lower: two rows of 7 giant playing cards shuffled fresh each show; 10 s per call; everyone taps HIGHER or LOWER; live split shown before a drumroll flip. 500 pts per right call, +100 for every consecutive right call; same value = nobody scores. Warm-up vote: *best poker face?*
3. **Off the Wall (9 min)** — inspired by BBC's *The Wall* (parody name): a 15-slot pegboard (values 1/200/40/800/5/400/1/1000/1/400/5/800/40/200/1) with 7 drop zones over the middle slots. 5 questions × 3 options (15 s). Everyone who answers right picks a zone on their phone (8 s, random if they don't) and a green ball falls — paths are a seeded bean machine so phones replay exactly the drop the host scored. Wrong/no answer earns a red ball. Then THE CONTRACT: each player secretly signs (250 pts per right answer, guaranteed) or tears it up (keep the bank). Red balls (1 + one per two wrong answers, max 3) then drop and subtract; reveal table shows who signed, bank before → after and payout. Warm-up vote: *who'd survive behind the Wall?*
4. **Work Family Fortunes (10 min)** — "We asked 100 colleagues…": 4 survey questions, 40 s, up to 3 typed answers each (other languages accepted via aliases), fuzzy matching with aliases and typo tolerance. 10 pts per survey person. Board flips from #6 to #1 with counts of players who matched, then the most common miss with a big ✖ buzzer. Warm-up vote: *Fish & chips / Burger / Currywurst / Casado?*
5. **The Fairground Derby (8 min)** — fairground roll-a-ball race: everyone gets their own horse; on their phone they flick a ball up a lane (canvas physics: friction, back-wall bounce, capture when slow over a hole) into holes worth 1/2/3. Each point moves their horse. Big screen shows the leading 8 lanes re-ordering live with a ticker of big rolls; phones show their own progress and rank. Phones send their running total ~1/s (loss-tolerant; host checks ≤3 pts per roll and a sensible roll rate). First 3 to 40 win 1,500/1,000/700; everyone gets 10 pts per step; race ends at 3 finishers or 75 s. Warm-up vote: *best fairground treat?*
6. **Grand Finale (3 min)** — drumroll podium reveal 3-2-1, victory fanfare, confetti, and awards for the top scorer in each game.
Leaderboard after every game.

**Backup games** — **The Desk Derby** (6 HR-themed horses, bet then cheer, 2 races) plus the two below (not in the running order; host picks one from a "Backup games" section of the Jump menu, it plays as a BONUS ROUND, and Next after its leaderboard returns to where the show left off): **The Price is Bright** — 6 items (Monopoly prices and famous gadget launch prices in US dollars), closest without going over (1000/600/400, exact 2000, within 25% 200, all-over consolation 300), drumroll reveal; **Jargon Buster** — what does that office jargon really mean? Multiple choice with speed bonus.

**Desk Derby visuals:** bobbing crowd that roars when people cheer, scrolling turf, horses that gallop faster as they speed up, live position badges, a glowing leader, "📣 Name" bubbles floating up from a horse whenever its backers cheer, a FINAL FURLONG banner, a photo-finish flash for close finishes, and a live mini-race with "your horse is running 3rd" on every phone.

## Music & SFX (Web Audio synth)
Lobby loop, thinking loop, one distinct jingle per game (quirky xylophone, brassy showtime, bugle call + gallop loop, dramatic game-show build), leaderboard sting, victory fanfare; SFX: tick, buzzer, ding, pop, whoosh, drumroll, applause, starting bell/gun, reveal.

## Deliverables
1. Full source: `index.html`, `host.html`, `play.html`, `css/style.css`, `js/{config,content,common,music,transport,host,play}.js`, `supabase/schema.sql`, `netlify.toml`.
2. `README.md` — demo mode in 2 minutes; step-by-step GitHub → Supabase → Netlify; screen-sharing with sound in Teams/Zoom/Meet; troubleshooting; how to edit content; scoring table; privacy notes.
3. `RUNSHEET.md` — minute-by-minute host script with bilingual banter and music cues.
4. Test the whole show end-to-end in demo mode with several player tabs before handing over.

## Style
Evening TV studio: deep indigo background with spotlights, gold and hot-pink accents, a bold display font for titles (e.g. Bungee) with a friendly sans for text (e.g. Figtree), marquee-bulb badges, pop-in and flip animations. Big, high-contrast text that survives video compression.
