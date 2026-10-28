# 🎤 The Big HR Game Show
**TSSI HR · Monthly Global HR Social Connect** — a 45-minute live, multiplayer game show for colleagues in 🇬🇧 the UK, 🇺🇸 the US and 🇩🇪 Germany.

Everyone plays on their own phone or a spare browser tab. The host shares one "big screen" on Teams/Zoom with music and sound effects. Scores update live for everyone, plus a **Battle of the Nations**.

| # | Game | Style | Time |
|---|------|-------|------|
| 0 | Lobby & warm-up | Join by QR code / room code | 5 min |
| 1 | **Lost in Translation** | Quick-fire quiz on UK/US/German words, speed bonus | 8 min |
| 2 | **The Price is Bright** | *Price is Right* style — closest without going over | 9 min |
| 3 | **The Desk Derby** | Horse-racing: back a horse, mash CHEER to boost it | 10 min |
| 4 | **Global Fortunes** | *Family Fortunes* style — "We asked 100 colleagues…" | 10 min |
| 🏆 | Grand Finale | Podium, nation champions, awards | 3 min |

Every game opens with an **interactive intro**: animated title card, its own jingle, three-line rules, and a live warm-up vote on phones (e.g. *Biscuit, Cookie or Keks?*) worth 50 points.

All music is original and synthesised in the browser — no audio files, no licensing issues.

---

## 1. What's in the box

```
index.html        Landing page (Player / Host buttons)
host.html         Big screen — share this on the call
play.html         Player page — phones or browser tabs
js/content.js     ✏️ ALL questions, prices, horses, survey answers (edit me!)
js/config.js      ✏️ Your Supabase URL + key
js/host.js        Game engine, scoring, screens
js/play.js        Player app
js/music.js       Synth music + sound effects
js/transport.js   Realtime messaging (Supabase, or demo mode)
css/style.css     The studio look
supabase/schema.sql  Optional: saves each month's results
netlify.toml      Hosting config
```

No build step, no npm, no server code. It's a static website.

---

## 2. Try it in 2 minutes (demo mode — no accounts needed)

With `js/config.js` left blank the game runs in **demo mode**: host and players talk through the browser itself, so they must be **tabs in the same browser on the same computer**. Ideal for rehearsing.

1. In the project folder run `python3 -m http.server 8000` (or `npx serve`).
2. Open `http://localhost:8000/host.html` → **Open the studio doors**.
3. Open 2–3 more tabs at `http://localhost:8000/play.html?room=XXXX` (use the room code shown) and join as different people.
4. Press **Next ▶** (or Space) to move through the show.

> Opening the files by double-clicking (`file://`) won't work — use a local server or Netlify.

---

## 3. Go live: GitHub → Supabase → Netlify (about 20 minutes)

### Step 1 — GitHub (stores the code)
1. Sign in at github.com → **New repository** → name it `tssi-gameshow` → Private is fine → **Create**.
2. On the new repo page click **uploading an existing file**, drag in *everything* from this folder (keep the `js`, `css`, `supabase` folders) → **Commit changes**.

### Step 2 — Supabase (makes it real-time across countries)

> ✅ **Already done for TSSI.** The project exists and `js/config.js` is filled in:
>
> | | |
> |---|---|
> | Project URL | `https://dcmdevqwdeumqvjsnsia.supabase.co` |
> | Project ref | `dcmdevqwdeumqvjsnsia` |
> | Dashboard | https://supabase.com/dashboard/project/dcmdevqwdeumqvjsnsia |
> | Public (anon) key | in `js/config.js` — safe to publish |
> | Secret (service_role) key | **not stored anywhere in this repo — keep it that way** |
>
> Remaining one-off steps in the dashboard: check **Realtime → Settings → "Allow public access to channels"** is enabled, and run `supabase/schema.sql` in the **SQL Editor** if you want the monthly results saved.

⛔ **Never put the secret / service_role key in `config.js`, the README or anywhere on GitHub/Netlify.** Everything in this repo is downloaded by every player's browser, and that key bypasses all database security. The game doesn't need it. If it's ever been pasted somewhere public, rotate it in **Project Settings → API Keys**.

Setting up a *new* project (e.g. for another team):
1. Sign in at supabase.com → **New project** → pick a region near most players (e.g. London `eu-west-2`) → set a database password → create. Free plan is fine (see sizing below).
2. **Project Settings → API** (or **API Keys**). Copy:
   - the **Project URL** (`https://xxxx.supabase.co`)
   - the **anon / publishable** public key (*not* the secret / service_role key).
3. **Realtime → Settings**: make sure **"Allow public access to channels"** is **enabled** (it is by default).
4. *(Optional — keeps a monthly Hall of Fame)* **SQL Editor → New query** → paste `supabase/schema.sql` → **Run**.
5. Back on GitHub, open `js/config.js` → ✏️ edit → paste the URL and key between the quotes → **Commit**.

```js
SUPABASE_URL: "https://abcdefghijk.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi...or sb_publishable_...",
```

The anon/publishable key is designed to be public, so it's safe in this file. The game only uses Realtime broadcast; the optional results table only allows *inserts* from the public key.

**Check the key works:** open the Netlify site's `host.html` and start a room. The control bar should show **🟢 Live** with no ⚠️ warning next to the room code, and a phone joining from mobile data should pop into the lobby. If you see ⚠️ or players get stuck on "Connecting…", re-copy the anon key from the dashboard into `config.js` — one mistyped character breaks it.

### Step 3 — Netlify (puts it on the web)
1. Sign in at netlify.com → **Add new site → Import an existing project → GitHub** → choose `tssi-gameshow`.
2. Leave the build command empty, publish directory `.` (the included `netlify.toml` sets this) → **Deploy**.
3. **Site configuration → Change site name** → e.g. `tssi-gameshow` → your links become:
   - Host: `https://tssi-gameshow.netlify.app/host.html`
   - Players: `https://tssi-gameshow.netlify.app/play.html` (the QR code on screen includes the room code)

Every future edit on GitHub (new questions next month!) redeploys automatically in about a minute.

### Sizing (Supabase Free plan)
Supabase Free allows 200 concurrent connections and 100 Realtime messages per second. The game is built to stay well under that: phones only receive host updates (at most every 1.5 s, plus an 8 s heartbeat) and send answers without hearing each other, and cheer taps are batched — more slowly in bigger rooms. That's comfortable for **up to ~80 players**. For a bigger all-hands, switch the project to the Pro plan for the day.

---

## 4. Running the show

**Before (day of):**
- Open `host.html` on the computer you'll share from. Click **Open the studio doors** — this also unlocks audio.
- Put the join link in the meeting chat (**🔗 Join link** in the control bar).
- Share the **browser window/tab** with **sound on**:
  - **Teams:** Share → turn on **Include sound**.
  - **Zoom:** Share Screen → tick **Share sound**.
  - **Google Meet:** share a **Chrome tab** and keep **Also share tab audio** on.
- Press **F** for fullscreen and **H** to hide the control bar (H again to bring it back).

**Controls:** `Space` / `→` next · `←` back · `M` mute · `H` hide controls · `F` fullscreen. The **Jump to** menu skips straight to any game if you're short on time. The clock shows ✅ on time or ⚠️ minutes behind the 40-minute plan. The big screen automatically resizes its text to fit whatever window you share.

**Things that happen automatically:** question timers close themselves and reveal (early, if everyone has answered); betting closes and the race starts; the race result shows when every horse is home. Pressing **Next** mid-race fast-forwards to a photo finish. Phones wait for the big screen's drumroll before showing answers, so nobody's spoiled.

**Going back is safe:** a question that has already been scored can't be replayed by accident — Back/Jump take you to its reveal instead, and no bonus is paid twice.

**If something goes wrong:**
- *Host browser refreshed / crashed* → reopen `host.html` → **↻ Resume room XXXX**. Scores and players are kept on that computer.
- *A player's phone dropped* → they reopen the link; they're remembered on that device and rejoin with their score.
- *Silly name* → click it in the lobby to remove it.
- *German-style prices* → players can type `7.995`, `5,65` or `1.234,56`; the phone shows how it was read before they lock in.
- *Player sees "Connecting…" forever* → check `config.js` has the URL and key, and the host screen is open.

Full minute-by-minute host script with bilingual banter: **RUNSHEET.md**.

---

## 5. Making it yours (monthly refresh)

Everything editable lives in **`js/content.js`** — plain text in a fixed shape:
- **Lost in Translation:** `q`, four `options`, `answer` (0 = first option), and a `fact` for the reveal.
- **Price is Bright:** `name`, `currency`, `answer`, `fact`. The defaults are historical launch prices (1959 Mini £497, 2007 iPhone $499, 1974 VW Golf 7,995 DM, etc.) — **double-check them**, or swap in your own: office snacks, company swag, local coffee.
- **Desk Derby:** horse names, colours, odds and payouts. Win rates are tuned to roughly match the odds.
- **Global Fortunes:** the survey numbers are illustrative. For the best reveal, send a one-question Microsoft Form to colleagues the week before and put the real counts in. Add likely spellings and German words to `aliases`; small typos are already forgiven.
- **Running order:** `order: ["translate", "price", "derby", "fortunes"]` — reorder or drop games.

**Scoring at a glance:** warm-up vote 50 · quiz 500 + up to 500 speed · price 1000/600/400 for the three closest under, 2000 for exact, 200 for anyone else within 25% · derby pays the horse's listed amount, 200 for second · survey 10 pts per person who gave each answer. Country battle uses **average** score per player so a small office can beat a big one.

---

## 6. Privacy notes
- Players enter only a display name and a flag. Nothing else is collected.
- Live game messages pass through Supabase Realtime and aren't stored.
- If `SAVE_RESULTS` is on and the table exists, the final leaderboard (names, flags, scores) is saved to your Supabase project; it can't be read back with the public key. Turn it off in `config.js` if your policy prefers.
