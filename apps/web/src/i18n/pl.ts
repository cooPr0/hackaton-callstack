import { pluralN } from "./plural";

/**
 * All UI copy. Components never hard-code strings — add them here.
 * Player names are user input and cannot be declined, so every string keeps the name in
 * the nominative ("Podpowiedź · Kuba", not "Podpowiedź Kuby").
 */
export const pl = {
  appName: "Tint & Tell",
  tagline: "Ludzie i Grok próbują trafić ten sam odcień samym językiem skojarzeń.",

  setup: {
    title: "Nowa partia",
    playersOnDevice: (n: number, local: boolean) =>
      `${pluralN(n, ["gracz", "graczy", "graczy"])} · ${local ? "telefon złożony" : "każdy na swoim"}`,
    modes: {
      stol: { title: "Stół", sub: "Podpowiadacie po kolei" },
      ty: { title: "Ty podpowiadasz", sub: "Grok tylko zgaduje" },
      grok: { title: "Grok podpowiada", sub: "Ty tylko zgadujesz" },
    },
    addPlayer: "Dodaj",
    playerPlaceholder: (i: number) => `Gracz ${i}`,
    rounds: (n: number) => `${pluralN(n, ["runda", "rundy", "rund"])}`,
    duration: (n: number) => `ok. ${Math.max(5, Math.round(n * 3.3))} min`,
    localToggle: { local: "Jeden telefon", online: "Każdy na swoim" },
    startLocal: (name: string) => `Losuj odcień · zaczyna ${name}`,
    startOnline: "Utwórz pokój",
    demo: "Wersja demo bez serwera",
    modeGroup: "Tryb gry",
    playGroup: "Sposób gry",
    fewerRounds: "Mniej rund",
    moreRounds: "Więcej rund",
    playerName: (i: number) => `Imię gracza ${i}`,
    removePlayer: (name: string) => `Usuń: ${name}`,
    needOne: "Potrzebny jest co najmniej jeden gracz.",
    needTwo: "Stół potrzebuje co najmniej dwóch graczy.",
  },

  join: {
    title: "Dołącz do gry",
    code: "Kod pokoju",
    name: "Twoje imię",
    submit: "Dołącz",
  },

  lobby: {
    code: "Kod pokoju",
    scan: "Zeskanuj telefonem albo wpisz kod",
    openInApp: "Otwórz w aplikacji",
    waiting: "Czekamy na graczy…",
    start: "Zaczynamy",
    onlyHost: "Grę zaczyna gospodarz",
    openSeat: "wolne miejsce",
  },

  round: {
    header: (round: number, total: number) => `Runda ${round} z ${total}`,
    onlyLooks: (name: string) => `patrzy tylko ${name}`,
    endOf: (round: number, total: number) => `Koniec rundy ${round} z ${total}`,
  },

  secret: {
    firstClue: "Pierwsza podpowiedź, jedno słowo",
    secondClue: "Druga podpowiedź, do dwóch słów",
    rules: "Bez nazw kolorów i bez pozycji na planszy.",
    bothStonesInFrame: (n: number) =>
      n === 0
        ? "Żadnego kamienia w kadrze"
        : `${pluralN(n, ["kamień", "kamienie", "kamieni"])} w kadrze`,
    was: (clue: string) => `Było: ${clue}`,
    send: "Wyślij",
    unfoldToSend: "Rozłóż telefon na stole",
    unfoldToShow: "Rozłóż, żeby pokazać",
  },

  clueErrors: {
    empty: "Wpisz podpowiedź.",
    tooLong: (max: number) => `Najwyżej ${max} znaków.`,
    letters: "Tylko litery i spacje.",
    oneWord: "Pierwsza podpowiedź to jedno słowo.",
    twoWords: "Druga podpowiedź to najwyżej dwa słowa.",
  },

  grok: {
    knows: "Grok zna odcień",
    quote: "„Mam. Będzie bolało, ale krótko.”",
    noOneLooks: "Nikt nie musi patrzeć. Rozłóż telefon, Grok poda podpowiedź na stole.",
    thinking: "Grok się zastanawia…",
    says: (line: string) => `Grok: „${line}”`,
    degraded: "Grok gra na skróty",
  },

  handoff: {
    pass: (name: string) => `${name}, teraz Ty`,
    passSub: "Podaj telefon. Ta osoba zobaczy odcień, reszta zgaduje.",
    iAm: (name: string) => `To ja, ${name}. Pokaż odcień`,
    fold: (name: string) => `${name}, złóż telefon`,
    foldSub: "Druga podpowiedź jest tylko dla Ciebie.",
    unfold: "Rozłóż telefon na stole",
    unfoldSub: "Wszyscy patrzą na planszę.",
  },

  table: {
    clueOf: (name: string) => `Podpowiedź · ${name}`,
    firstStone: "pierwszy kamień",
    secondStone: "drugi kamień",
    yourTurn: (name: string) => `Twój ruch, ${name}`,
    turnOf: (name: string) => `Ruch: ${name}`,
    waitingForClue: (name: string) => `${name} wymyśla podpowiedź…`,
    place: "Postaw",
    nextRound: "Następna runda",
    finish: "Wyniki",
  },

  reveal: {
    shadeOf: (name: string) => `Odcień · ${name}`,
    stonesHome: (n: number) => `${pluralN(n, ["kamień", "kamienie", "kamieni"])} w domu`,
    next: "Dalej",
  },

  pause: {
    title: "Pauza",
    resume: "Wznów grę",
    rules: "Zasady podpowiedzi",
    end: "Zakończ partię",
    endConfirm: "Na pewno zakończyć?",
  },

  rules: {
    title: "Zasady podpowiedzi",
    items: [
      "Pierwsza podpowiedź to jedno słowo, druga to najwyżej dwa.",
      "Nie wolno używać nazw kolorów ani mówić, gdzie jest odcień.",
      "Skojarzenia są mile widziane: jedzenie, miejsca, wspomnienia.",
      "Punkty: 3 za trafienie, 2 za kratkę obok, 1 za dwie kratki dalej.",
      "Podpowiadający dostaje punkt za każdy kamień w domu (3 × 3).",
    ],
  },

  gameOver: {
    title: "Koniec gry",
    winner: (name: string) => `Wygrywa ${name}`,
    tie: "Remis",
    newGame: "Nowa partia",
    rematch: "Rewanż",
  },

  conn: {
    connecting: "Łączenie…",
    reconnecting: "Łączymy ponownie…",
    failed: "Nie udało się połączyć.",
    retry: "Połącz ponownie",
  },

  posture: {
    fold: "Złóż",
    unfold: "Rozłóż",
    hint: "Klawisz F składa i rozkłada",
  },

  notFound: { title: "Nie ma takiej strony", back: "Nowa partia" },

  lang: { label: "Język", pl: "PL", en: "EN" },
} as const;
