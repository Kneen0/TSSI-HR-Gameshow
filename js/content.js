/* =====================================================================
   TSSI HR Global Social Connect — GAME CONTENT
   Edit this file to change questions, prices, horses and survey answers.
   No code knowledge needed: keep the same shape, change the words.
   ===================================================================== */
window.CONTENT = {

  /* ---------------------------------------------------------------
     GAME 1 — LOST IN TRANSLATION  (multiple choice, speed bonus)
     Points: 500 for correct + up to 500 speed bonus.
     --------------------------------------------------------------- */
  translate: {
    title: "Jargon Buster",
    tagline: "Corporate speak, decoded.",
    jingle: "translate",
    rules: [
      "A piece of office jargon pops up",
      "Tap what it REALLY means on your phone",
      "Right answer = 500 pts, plus up to 500 for speed"
    ],
    poll: {
      q: "Most overused phrase in meetings?",
      options: ["“Circle back”", "“Quick question”", "“You're on mute”", "“Let's take this offline”"]
    },
    seconds: 15,
    questions: [
      { q: "Someone says “Let's take this offline”. What do they mean?",
        options: ["Switch off the Wi-Fi", "Talk about it later, outside this meeting", "Print it out", "Cancel the project"], answer: 1,
        fact: "Translation: “please stop talking about this in front of everyone”." },
      { q: "“We're not trying to boil the ocean here.” Meaning?",
        options: ["Don't try to do everything at once", "Save energy in the kitchen", "Stay calm under pressure", "Book a team trip to the beach"], answer: 0,
        fact: "Boiling the ocean = an impossibly huge task. Pick something smaller!" },
      { q: "Your manager wants to go after the “low-hanging fruit”. What's that?",
        options: ["The healthy snack basket", "The easiest wins", "The newest starters", "Anything overdue"], answer: 1,
        fact: "Easy to reach, quick to pick — the quick wins." },
      { q: "“I don't have the bandwidth for that.” What's missing?",
        options: ["A faster internet connection", "A bigger budget", "Time or capacity", "A second monitor"], answer: 2,
        fact: "Borrowed from networking. Humans also have limited bandwidth." },
      { q: "A new starter says they're “drinking from a firehose”. How are they feeling?",
        options: ["Overwhelmed with information", "Really thirsty", "Ready to put out fires", "Bored"], answer: 0,
        fact: "Every first week, everywhere. Be kind to your new starters!" },
      { q: "What does it mean to “move the needle”?",
        options: ["Fix the office sewing kit", "Make a noticeable difference", "Change a deadline", "Reorganise the filing"], answer: 1,
        fact: "From the needle on a dial — if it doesn't move, nothing changed." },
      { q: "Someone suggests some “blue-sky thinking”. What do they want?",
        options: ["A meeting outside", "Worst-case planning", "Big, creative ideas with no limits", "A weather update"], answer: 2,
        fact: "No constraints, no budgets… until the next meeting." },
      { q: "“Let's circle back on this.” What happens now?",
        options: ["We come back to it later", "We vote on it", "We go round the room", "We start again from scratch"], answer: 0,
        fact: "Also known as: we may never speak of this again." },
      { q: "What's a “hard stop”?",
        options: ["A difficult conversation", "A meeting that must end on time", "A firm no", "A broken office chair"], answer: 1,
        fact: "“I've got a hard stop at 3” = I'm leaving at 3, whatever happens." }
    ]
  },

  /* ---------------------------------------------------------------
     GAME — PLAY YOUR CARDS BRIGHT  (higher or lower)
     Cards are shuffled fresh for every show — nothing to prepare.
     Points: 500 for a right call, +100 more for every call in a row
     (500, 600, 700…). Same card value = "Snap!" — nobody scores.
     --------------------------------------------------------------- */
  cards: {
    title: "Play Your Cards Bright",
    tagline: "Higher! Lower! You decide!",
    jingle: "cards",
    rules: [
      "A giant card is turned over on the big screen",
      "Tap ⬆ HIGHER or ⬇ LOWER for the next card",
      "Right = 500 pts, +100 for every call in a row 🔥"
    ],
    poll: {
      q: "Who has the best poker face? 🃏",
      options: ["Me, obviously 😐", "My manager", "The finance team", "Nobody — my face says everything"]
    },
    seconds: 10,
    rows: 2,          // two rows ("hands") of cards
    perRow: 7         // 7 cards = 6 calls per row
  },

  /* ---------------------------------------------------------------
     GAME 2 — THE PRICE IS BRIGHT  (closest without going over)
     Points: closest 1000, 2nd 600, 3rd 400; exact = 2000;
     anyone else under & within 25% = 200.
     ⚠️ Prices below are historical launch prices — check them before
     the event, or swap in your own (company swag, office snacks…).
     --------------------------------------------------------------- */
  price: {
    title: "The Price is Bright",
    tagline: "Come on down! Closest without going over wins.",
    jingle: "price",
    rules: [
      "See the item, type your price",
      "Closest WITHOUT going over wins 1000 pts",
      "Bang on the exact price? 2000 pts!"
    ],
    poll: {
      q: "Who's the best bargain hunter?",
      options: ["Me, obviously", "My manager", "The finance team", "Whoever finds the free snacks"]
    },
    seconds: 25,
    items: [
      { emoji: "🎩", name: "The most expensive square on the Monopoly board",
        detail: "The dark blue square just before GO",
        currency: "", answer: 400, fact: "400 — the priciest square in the classic game." },
      { emoji: "📱", name: "The very first iPhone (4GB) at launch in 2007",
        detail: "Launch price in US dollars", currency: "$", answer: 499,
        fact: "$499 — and people thought that was a lot for a phone!" },
      { emoji: "🎮", name: "The original Nintendo Game Boy at launch in 1989",
        detail: "Launch price in US dollars (decimals allowed)", currency: "$", answer: 89.99,
        fact: "$89.99 — with Tetris in the box." },
      { emoji: "🎧", name: "The first Apple iPod (5GB) at launch in 2001",
        detail: "Launch price in US dollars", currency: "$", answer: 399,
        fact: "$399 for “1,000 songs in your pocket”." },
      { emoji: "🕹️", name: "The original Sony PlayStation at launch in 1995",
        detail: "Launch price in US dollars", currency: "$", answer: 299,
        fact: "Sony announced $299 in a famous one-word keynote: “299”." },
      { emoji: "💵", name: "How much you collect for passing GO in Monopoly",
        detail: "Classic edition", currency: "", answer: 200,
        fact: "200 — the most reliable pay rise in the history of board games." }
    ]
  },

  /* ---------------------------------------------------------------
     GAME 3 — DESK DERBY  (pick a horse, cheer it home)
     Points if your horse wins: by odds. 2nd place pays 200.
     Cheering gives YOUR horse a small boost (averaged per backer,
     so a popular horse doesn't automatically win).
     --------------------------------------------------------------- */
  derby: {
    title: "The Desk Derby",
    tagline: "They're under starter's orders…",
    jingle: "derby",
    rules: [
      "Back a horse — longer odds pay out more",
      "During the race, MASH the cheer button",
      "Your horse wins = big points. 2nd place = 200"
    ],
    poll: {
      q: "Best racehorse name in today's field?",
      options: ["Tea Break", "Payroll Thunder", "Annual Leave", "Home Time Hero"]
    },
    pickSeconds: 20,
    races: 2,
    horses: [
      { name: "Tea Break",         color: "#e63946", odds: 2, pays: 600 },
      { name: "Casual Friday",     color: "#457b9d", odds: 3, pays: 800 },
      { name: "Home Time Hero"  ,  color: "#f4a261", odds: 3, pays: 800 },
      { name: "Annual Leave",      color: "#2a9d8f", odds: 4, pays: 1000 },
      { name: "Probation Pony",    color: "#9b5de5", odds: 6, pays: 1400 },
      { name: "Payroll Thunder",   color: "#ffd166", odds: 8, pays: 1800 }
    ],
    commentary: [
      "And they're off!",
      "{h} breaks well from the stalls!",
      "{h} is making a move on the rails!",
      "{h} is going like the clappers!",
      "{h} has found another gear!",
      "Ooh — {h} is fading…",
      "{h} is right in the mix!",
      "Here comes {h}! Listen to that crowd!",
      "It's neck and neck down the home straight!"
    ]
  },

  /* ---------------------------------------------------------------
     WORK FAMILY FORTUNES  ("We asked 100 colleagues… our survey said!")
     Each player types up to 3 answers. You score 10 × the survey
     number for every answer that's on the board.
     TIP: run a 1-question MS Form in advance and replace these with
     your real numbers — it makes the reveal brilliant.
     'aliases' are the words/phrases that count as a match (any
     language welcome). Matching is forgiving of small typos.
     --------------------------------------------------------------- */
  fortunes: {
    title: "Work Family Fortunes",
    tagline: "We asked 100 colleagues… our survey said!",
    jingle: "fortunes",
    rules: [
      "We asked 100 colleagues — the top 6 answers are on the board",
      "Type up to 3 answers on your phone",
      "Score 10 pts for every person who said it"
    ],
    poll: {
      q: "Survey says… what's the ultimate lunch?",
      options: ["🥪 Sandwich", "🍕 Pizza", "🥗 Salad", "🍱 Last night's leftovers"]
    },
    seconds: 40,
    maxAnswers: 3,
    questions: [
      { q: "Name something people do on their lunch break",
        answers: [
          { text: "Eat", pts: 28, aliases: ["eat", "eating", "lunch", "food", "sandwich", "essen", "mittagessen", "snack", "comer", "almuerzo", "almorzar"] },
          { text: "Scroll their phone", pts: 20, aliases: ["phone", "scroll", "social media", "instagram", "tiktok", "handy", "browse", "internet", "celular", "telefono"] },
          { text: "Go for a walk", pts: 16, aliases: ["walk", "walking", "stroll", "fresh air", "spazieren", "spaziergang", "outside", "caminar", "paseo", "caminata"] },
          { text: "Exercise / gym", pts: 12, aliases: ["gym", "exercise", "run", "running", "workout", "sport", "yoga", "fitness", "gimnasio", "ejercicio", "correr"] },
          { text: "Keep working", pts: 10, aliases: ["work", "working", "emails", "email", "keep working", "arbeiten", "desk", "trabajar", "correos"] },
          { text: "Nap", pts: 6, aliases: ["nap", "sleep", "snooze", "rest", "schlafen", "power nap", "siesta", "dormir"] }
        ] },
      { q: "Name a reason a meeting runs over",
        answers: [
          { text: "Tech problems", pts: 25, aliases: ["tech", "technology", "it", "wifi", "internet", "audio", "mute", "teams", "zoom", "connection", "laptop", "technik", "tecnologia", "problemas tecnicos"] },
          { text: "Someone talks too much", pts: 22, aliases: ["talk", "talking", "talks too much", "waffle", "rambling", "chatty", "long winded", "monologue", "reden", "hablar mucho", "hablan mucho"] },
          { text: "Started late", pts: 18, aliases: ["late", "started late", "late start", "lateness", "people late", "spaet", "verspaetung", "tarde", "llegar tarde"] },
          { text: "No agenda", pts: 14, aliases: ["agenda", "no agenda", "no plan", "unprepared", "disorganised", "disorganized", "tagesordnung", "sin agenda"] },
          { text: "Going off topic", pts: 11, aliases: ["off topic", "tangent", "distracted", "small talk", "chit chat", "sidetracked"] },
          { text: "Too many people", pts: 5, aliases: ["too many people", "too many attendees", "big group", "everyone invited"] }
        ] },
      { q: "Name something you'd find on every office desk",
        answers: [
          { text: "Computer / laptop", pts: 30, aliases: ["computer", "laptop", "pc", "monitor", "screen", "keyboard", "mouse", "rechner", "bildschirm", "computadora", "ordenador", "portatil", "pantalla"] },
          { text: "Mug / cup", pts: 24, aliases: ["mug", "cup", "coffee", "tea", "tasse", "kaffee", "becher", "water bottle", "bottle", "taza", "botella"] },
          { text: "Pen", pts: 15, aliases: ["pen", "pencil", "biro", "stift", "kuli", "kugelschreiber", "lapicero", "boligrafo", "pluma", "lapiz"] },
          { text: "Notepad", pts: 12, aliases: ["notepad", "notebook", "paper", "post it", "post its", "sticky notes", "notizblock", "block", "pad", "cuaderno", "libreta", "papel"] },
          { text: "Phone", pts: 8, aliases: ["phone", "telephone", "mobile", "handy", "telefon", "headset", "celular", "telefono"] },
          { text: "Plant", pts: 6, aliases: ["plant", "plants", "cactus", "pflanze", "flower", "succulent", "planta"] }
        ] },
      { q: "Name a word HR people say all the time",
        answers: [
          { text: "Policy", pts: 26, aliases: ["policy", "policies", "richtlinie", "procedure", "politica"] },
          { text: "Wellbeing", pts: 20, aliases: ["wellbeing", "well being", "wellness", "mental health", "self care", "bienestar"] },
          { text: "Engagement", pts: 16, aliases: ["engagement", "engaged", "employee engagement", "compromiso"] },
          { text: "Process", pts: 12, aliases: ["process", "processes", "prozess", "workflow", "proceso"] },
          { text: "Onboarding", pts: 9, aliases: ["onboarding", "on boarding", "induction", "new starter", "new hire", "incorporacion", "induccion"] },
          { text: "Stakeholder", pts: 7, aliases: ["stakeholder", "stakeholders", "alignment", "align", "synergy"] }
        ] }
    ]
  },

  /* ---------------------------------------------------------------
     THE FAIRGROUND DERBY  (roll-a-ball horse race)
     Everyone gets their own horse. Flick a ball up the lane on your
     phone: holes score 1, 2 or 3 and every point moves your horse.
     First 3 past the post win prizes; everyone also scores 10 pts per
     step their horse moved. Race ends when 3 horses finish or time's up.
     --------------------------------------------------------------- */
  rollball: {
    title: "The Fairground Derby",
    tagline: "Roll up, roll up! Roll the ball, race your horse!",
    jingle: "fair",
    rules: [
      "Everyone gets their own horse 🏇",
      "Flick the ball up the lane — holes score 1, 2 or 3",
      "Every point moves your horse. First past the post wins!"
    ],
    poll: {
      q: "Best fairground treat?",
      options: ["🍭 Candyfloss", "🍎 Toffee apple", "🌭 Hot dog", "🍩 Doughnuts"]
    },
    finish: 40,        // points needed to reach the finishing post
    seconds: 75,       // the race stops after this, even if nobody has finished
    races: 1,
    prizes: [1500, 1000, 700],   // 1st, 2nd, 3rd past the post
    perPoint: 10                 // everyone: points for every step their horse moved
  },

  /* ---------------------------------------------------------------
     OFF THE WALL  (inspired by "The Wall")
     Answer right → pick a drop zone and a GREEN ball falls down the
     wall into a slot (adds to your bank). Wrong/no answer → you owe a
     RED ball. Before the reds drop, everyone secretly signs the
     CONTRACT (guaranteed points per correct answer) or tears it up
     (keep the bank, minus what the red balls take).
     --------------------------------------------------------------- */
  wall: {
    title: "Off the Wall",
    tagline: "Answer right, drop the ball… and pray!",
    jingle: "wall",
    rules: [
      "Answer right → pick a zone and drop a GREEN ball down the Wall",
      "Wrong answers earn RED balls — they fall at the end and take points away",
      "The Contract: sign for guaranteed points, or tear it up and keep your bank?"
    ],
    poll: {
      q: "Who'd survive best behind the Wall?",
      options: ["Me, obviously 💪", "My manager", "Whoever's always on mute", "Nobody — it's brutal"]
    },
    seconds: 15,        // time to answer each question
    zoneSeconds: 8,     // time to pick a drop zone
    contractSeconds: 20,
    perCorrect: 250,    // the contract: guaranteed points for each correct answer
    // the 15 slots at the bottom of the Wall (left → right). Big values sit right next to tiny ones!
    values: [1, 200, 40, 800, 5, 400, 1, 1000, 1, 400, 5, 800, 40, 200, 1],
    questions: [
      { q: "How many keys are on a standard piano?", options: ["76", "88", "96"], answer: 1 },
      { q: "How many minutes are there in a day?", options: ["1,240", "1,440", "1,640"], answer: 1 },
      { q: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Pacific"], answer: 2 },
      { q: "How many bones are in the adult human body?", options: ["186", "206", "226"], answer: 1 },
      { q: "In an email, what did “CC” originally stand for?", options: ["Carbon copy", "Company contact", "Central copy"], answer: 0 }
    ]
  },

  /* Running order of the main show. Remove or reorder games here. */
  order: ["cards", "wall", "fortunes", "rollball"],

  /* Backup games: not played unless you pick one from the host's Jump menu
     ("Backup games" at the bottom). After a backup game's leaderboard,
     Next takes you back to where you left the show. */
  backups: ["derby", "price", "translate"]
};
