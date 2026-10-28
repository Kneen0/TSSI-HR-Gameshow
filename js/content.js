/* =====================================================================
   TSSI HR Global Social Connect — GAME CONTENT
   Edit this file to change questions, prices, horses and survey answers.
   No code knowledge needed: keep the same shape, change the words.
   ===================================================================== */
window.CONTENT = {

  countries: [
    { id: "UK", flag: "🇬🇧", name: "UK" },
    { id: "US", flag: "🇺🇸", name: "US" },
    { id: "DE", flag: "🇩🇪", name: "Germany" },
    { id: "CR", flag: "🇨🇷", name: "Costa Rica" },
    { id: "XX", flag: "🌍", name: "Elsewhere" }
  ],

  /* ---------------------------------------------------------------
     GAME 1 — LOST IN TRANSLATION  (multiple choice, speed bonus)
     Points: 500 for correct + up to 500 speed bonus.
     --------------------------------------------------------------- */
  translate: {
    title: "Lost in Translation",
    tagline: "Four countries. One language. Allegedly.",
    jingle: "translate",
    rules: [
      "A word or phrase from 🇬🇧 🇺🇸 🇩🇪 or 🇨🇷 pops up",
      "Tap the right meaning on your phone",
      "Right answer = 500 pts, plus up to 500 for speed"
    ],
    poll: {
      q: "Settle this once and for all — what is this? 🍪",
      options: ["Biscuit 🇬🇧", "Cookie 🇺🇸", "Keks 🇩🇪", "Galleta 🇨🇷"]
    },
    seconds: 15,
    questions: [
      { q: "A German colleague says she'll call you on her “Handy”. What is it?",
        options: ["Her mobile phone", "Her toolbox", "Her bicycle", "Her desk diary"], answer: 0,
        fact: "Germans borrowed an English-sounding word that no English speaker actually uses!" },
      { q: "An American manager says “Let's table that”. What happens next?",
        options: ["We discuss it right now", "We postpone it", "We put it in a spreadsheet", "We book a meeting room"], answer: 1,
        fact: "In the UK, “tabling” an item means the OPPOSITE — putting it up for discussion now. Classic transatlantic meeting chaos." },
      { q: "A British colleague is “chuffed” about the new policy. How do they feel?",
        options: ["Furious", "Confused", "Really pleased", "Out of breath"], answer: 2,
        fact: "“Chuffed to bits” = very happy indeed." },
      { q: "What does the German word “Feierabend” mean?",
        options: ["The office Christmas party", "Clocking off at the end of the working day", "A fire drill", "An annual bonus"], answer: 1,
        fact: "Literally “celebration evening” — the sacred moment the working day ends." },
      { q: "A Costa Rican colleague answers “How are you?” with “¡Pura vida!”. What do they mean?",
        options: ["All good — life's great!", "I'm drinking pure juice", "I'm off on holiday", "The meeting's cancelled"], answer: 0,
        fact: "“Pure life” — Costa Rica's national motto. It means hello, goodbye, thanks and “all good” all at once." },
      { q: "A Brit books “a fortnight” of annual leave. How long are they away?",
        options: ["4 days", "A long weekend", "14 days", "40 nights"], answer: 2,
        fact: "From Old English “fourteen nights”. Most Americans have heard it — few say it." },
      { q: "German “Kummerspeck” translates literally as…",
        options: ["Grief bacon", "Worry sausage", "Sorrow soup", "Sad cheese"], answer: 0,
        fact: "The weight you put on from comfort eating. Every language needs this word." },
      { q: "A UK colleague says “I've spilt coffee on my pants!” Where's the coffee?",
        options: ["On their trousers", "On their underwear", "On their laptop bag", "On their shoes"], answer: 1,
        fact: "UK pants = underwear. US pants = trousers. Choose your words carefully on Teams." },
      { q: "A German colleague calls your plan a “Schnapsidee”. What do they think of it?",
        options: ["Brilliant and bold", "Crazy — the kind of idea you have after a few schnapps", "Expensive", "Very traditional"], answer: 1,
        fact: "A “schnapps idea” sounds great at midnight and terrible on Monday morning." }
    ]
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
      q: "Which nation has the best bargain hunters?",
      options: ["🇬🇧 The Brits", "🇺🇸 The Americans", "🇩🇪 The Germans", "🇨🇷 The Ticos"]
    },
    seconds: 25,
    items: [
      { emoji: "🎩", name: "The most expensive square on the Monopoly board",
        detail: "Mayfair 🇬🇧 · Boardwalk 🇺🇸 · Schlossallee 🇩🇪 — same price in £, $ and €!",
        currency: "", answer: 400, fact: "All three editions charge 400 for the top square." },
      { emoji: "🚗", name: "A brand-new Mini at its UK launch in 1959",
        detail: "Price in pounds sterling", currency: "£", answer: 497,
        fact: "The original Mini went on sale for around £497." },
      { emoji: "📱", name: "The very first iPhone (4GB) at its US launch in 2007",
        detail: "Price in US dollars", currency: "$", answer: 499,
        fact: "$499 — just two more than that 1959 Mini, in a different currency!" },
      { emoji: "🚙", name: "A brand-new VW Golf at its German launch in 1974",
        detail: "Price in Deutsche Mark", currency: "DM", answer: 7995,
        fact: "The first Golf cost about 7,995 DM." },
      { emoji: "🎟️", name: "Top-price ticket to see The Beatles at Shea Stadium, New York, 1965",
        detail: "Price in US dollars (decimals allowed)", currency: "$", answer: 5.65,
        fact: "The best seats were $5.65." },
      { emoji: "🚘", name: "A Ford Model T 'Runabout' in 1925",
        detail: "Price in US dollars", currency: "$", answer: 260,
        fact: "Mass production pushed the price down to about $260." }
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
      q: "Which is the greatest horse race on earth?",
      options: ["🇬🇧 Royal Ascot", "🇺🇸 Kentucky Derby", "🇩🇪 Deutsches Derby", "🇨🇷 El Tope, San José"]
    },
    pickSeconds: 20,
    races: 2,
    horses: [
      { name: "Tea Break",         color: "#e63946", odds: 2, pays: 600 },
      { name: "Casual Friday",     color: "#457b9d", odds: 3, pays: 800 },
      { name: "Feierabend Flyer",  color: "#f4a261", odds: 3, pays: 800 },
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
     GAME 4 — GLOBAL FORTUNES  ("We asked 100 colleagues…")
     Each player types up to 3 answers. You score 10 × the survey
     number for every answer that's on the board.
     TIP: run a 1-question MS Form in advance and replace these with
     your real numbers — it makes the reveal brilliant.
     'aliases' are the words/phrases that count as a match (English
     and German welcome). Matching is forgiving of small typos.
     --------------------------------------------------------------- */
  fortunes: {
    title: "Global Fortunes",
    tagline: "We asked 100 colleagues… Survey says!",
    jingle: "fortunes",
    rules: [
      "We surveyed colleagues across 🇬🇧 🇺🇸 🇩🇪 🇨🇷",
      "Type up to 3 answers — English, Deutsch or Español!",
      "Score 10 pts for every person who said it"
    ],
    poll: {
      q: "Survey says… what's the ultimate lunch?",
      options: ["🇬🇧 Fish & chips", "🇺🇸 Burger", "🇩🇪 Currywurst", "🇨🇷 Casado"]
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

  /* Running order. Remove or reorder games here. */
  order: ["translate", "price", "derby", "fortunes"]
};
