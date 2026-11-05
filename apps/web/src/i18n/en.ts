import type { Copy } from "./types";

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** English copy. Must mirror pl.ts exactly (the Copy type enforces it). */
export const en: Copy = {
  appName: "Tint & Tell",
  tagline: "People and Grok try to hit the same shade using nothing but associations.",

  setup: {
    title: "New game",
    playersOnDevice: (count, local) =>
      `${n(count, "player", "players")} · ${local ? "one phone" : "own devices"}`,
    modes: {
      stol: { title: "Table", sub: "You take turns giving clues" },
      ty: { title: "You give clues", sub: "Grok only guesses" },
      grok: { title: "Grok gives clues", sub: "You only guess" },
    },
    addPlayer: "Add",
    playerPlaceholder: (i) => `Player ${i}`,
    rounds: (count) => n(count, "round", "rounds"),
    duration: (count) => `about ${Math.max(5, Math.round(count * 3.3))} min`,
    localToggle: { local: "One phone", online: "Own devices" },
    startLocal: (name) => `Draw a shade · ${name} starts`,
    startOnline: "Create room",
    demo: "Offline demo",
    modeGroup: "Game mode",
    playGroup: "How you play",
    fewerRounds: "Fewer rounds",
    moreRounds: "More rounds",
    playerName: (i) => `Player ${i} name`,
    removePlayer: (name) => `Remove ${name}`,
    needOne: "You need at least one player.",
    needTwo: "Table mode needs at least two players.",
  },

  join: {
    title: "Join a game",
    code: "Room code",
    name: "Your name",
    submit: "Join",
  },

  lobby: {
    code: "Room code",
    scan: "Scan with your phone or type the code",
    openInApp: "Open in the app",
    waiting: "Waiting for players…",
    start: "Let's play",
    onlyHost: "The host starts the game",
    openSeat: "open seat",
  },

  round: {
    header: (round, total) => `Round ${round} of ${total}`,
    onlyLooks: (name) => `only ${name} looks`,
    endOf: (round, total) => `End of round ${round} of ${total}`,
  },

  secret: {
    firstClue: "First clue, one word",
    secondClue: "Second clue, up to two words",
    rules: "No colour names and no positions on the board.",
    bothStonesInFrame: (count) =>
      count === 0 ? "No stones in view" : `${n(count, "stone", "stones")} in view`,
    was: (clue) => `Was: ${clue}`,
    send: "Send",
    unfoldToSend: "Unfold the phone on the table",
    unfoldToShow: "Unfold to show",
  },

  clueErrors: {
    empty: "Type a clue.",
    tooLong: (max) => `At most ${max} characters.`,
    letters: "Letters and spaces only.",
    oneWord: "The first clue is one word.",
    twoWords: "The second clue is at most two words.",
  },

  grok: {
    knows: "Grok knows the shade",
    quote: "“Got it. This will hurt, but briefly.”",
    noOneLooks: "Nobody needs to look. Unfold the phone, Grok will give the clue on the table.",
    thinking: "Grok is thinking…",
    says: (line) => `Grok: “${line}”`,
    degraded: "Grok is taking shortcuts",
  },

  handoff: {
    pass: (name) => `${name}, your turn`,
    passSub: "Hand over the phone. This person sees the shade, everyone else guesses.",
    iAm: (name) => `It's me, ${name}. Show the shade`,
    fold: (name) => `${name}, fold the phone`,
    foldSub: "The second clue is for your eyes only.",
    unfold: "Unfold the phone on the table",
    unfoldSub: "Everyone looks at the board.",
  },

  table: {
    clueOf: (name) => `Clue · ${name}`,
    firstStone: "first stone",
    secondStone: "second stone",
    yourTurn: (name) => `Your move, ${name}`,
    turnOf: (name) => `Turn: ${name}`,
    waitingForClue: (name) => `${name} is thinking of a clue…`,
    place: "Place",
    nextRound: "Next round",
    finish: "Results",
  },

  reveal: {
    shadeOf: (name) => `Shade · ${name}`,
    stonesHome: (count) => `${n(count, "stone", "stones")} home`,
    next: "Next",
  },

  pause: {
    title: "Paused",
    resume: "Resume",
    rules: "Clue rules",
    end: "End game",
    endConfirm: "End the game?",
  },

  rules: {
    title: "Clue rules",
    items: [
      "The first clue is one word, the second at most two.",
      "No colour names and no hints about where the shade is.",
      "Associations welcome: food, places, memories.",
      "Points: 3 for a hit, 2 for the next cell, 1 for two cells away.",
      "The clue giver scores a point for every stone in the house (3 × 3).",
    ],
  },

  gameOver: {
    title: "Game over",
    winner: (name) => `${name} wins`,
    tie: "It's a tie",
    newGame: "New game",
    rematch: "Rematch",
  },

  conn: {
    connecting: "Connecting…",
    reconnecting: "Reconnecting…",
    failed: "Couldn't connect.",
    retry: "Try again",
  },

  posture: {
    fold: "Fold",
    unfold: "Unfold",
    hint: "Press F to fold and unfold",
  },

  notFound: { title: "Page not found", back: "New game" },

  lang: { label: "Language", pl: "PL", en: "EN" },

  closed: {
    pauseLabel: "Pause",
    grokGives: "Grok gives the clue",
    foldedOnlyLooks: (name) => `folded, only ${name} looks`,
    clueLabel: "Clue",
    viewfinder: "Viewfinder: your shade inside the corners, its neighbours around it",
    lobby: {
      platform: { ios: "iPhone", web: "browser", grok: "bot" },
      online: "connected",
      offline: "disconnected",
      you: "You",
      host: "host",
      qrAlt: (code) => `QR code for room ${code}`,
      needPlayers: "You need at least two players",
    },
    roundCard: {
      nextSub: "Pass the phone on. The next shade is waiting.",
      lastSub: "That was the last round. Time for the scores.",
    },
    pause: {
      sub: (round, scores) => `${round} · ${scores}`,
      endYes: "Yes, end it",
      endNo: "Cancel",
    },
    rulesClose: "Back",
    gameOver: {
      scores: "Scores",
      history: "Rounds",
      roundN: (n) => `Round ${n}`,
    },
  },
};
