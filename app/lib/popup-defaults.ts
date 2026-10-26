// Shared between the admin UI and the server. The storefront receives fully
// resolved strings through the published metafield (see publishConfig).

export const LANGUAGES = ["en", "de", "fr", "es", "it", "nl", "pl", "sl", "hr", "ro"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  sl: "Slovenščina",
  hr: "Hrvatski",
  ro: "Română",
};

export const STRING_KEYS = [
  "introTitle",
  "introDesc",
  "startBtn",
  "formTitle",
  "namePlaceholder",
  "emailPlaceholder",
  "consentLabel",
  "formSubmit",
  "nameError",
  "emailError",
  "consentError",
  "playing",
  "fail",
  "retriesLeft",
  "noAttempts",
  "rewardIntro",
  "rewardTeaser",
  "copyBtn",
  "copied",
  "closeBtn",
  "teaser",
  "rewardValue",
  "expiresIn",
  "validUntil",
  "flipperHelp",
  "pongDesc",
  "pongHelp",
  "pongFail",
  "wheelDesc",
  "wheelHelp",
  "noneTitle",
  "noneDesc",
  "noneForm",
  "noneSubmit",
  "noneTeaser",
  "noneConsent",
  "titleUpTo",
  "titleWin",
  "noneTitleValue",
  "consolationIntro",
  "formWinTitle",
  "formConsTitle",
  "consentNote",
  "privacyLink",
  "doiNote",
  "alreadyClaimed",
  "alreadyWon",
] as const;
export type StringKey = (typeof STRING_KEYS)[number];
export type Strings = Record<StringKey, string>;
export type CustomStrings = Partial<Record<Language, Partial<Strings>>>;

export const STRING_LABELS: Record<StringKey, string> = {
  introTitle: "Intro title",
  introDesc: "Intro description ({seconds} = survive time)",
  startBtn: "Start button",
  formTitle: "Form title",
  namePlaceholder: "Name placeholder",
  emailPlaceholder: "Email placeholder",
  consentLabel: "Marketing consent label",
  formSubmit: "Form submit button",
  nameError: "Missing name error",
  emailError: "Invalid email error",
  consentError: "Missing consent error",
  playing: "Status while playing",
  fail: "Ball dropped message",
  retriesLeft: "Retry button ({n} = attempts left)",
  noAttempts: "No attempts left",
  rewardIntro: "Reward intro ({name} = visitor name)",
  rewardTeaser: "Reward teaser",
  copyBtn: "Copy button",
  copied: "Copied confirmation",
  closeBtn: "Close button",
  teaser: "Floating button to reopen the game",
  rewardValue: "Won value ({value} = e.g. 15%)",
  expiresIn: "Countdown ({time} = mm:ss)",
  validUntil: "Expiry date ({date})",
  flipperHelp: "Flipper instructions",
  pongDesc: "Pong: intro description",
  pongHelp: "Pong: status while playing",
  pongFail: "Pong: computer won message",
  wheelDesc: "Spin wheel: intro description",
  wheelHelp: "Spin wheel: status before spinning",
  noneTitle: "No game: intro title",
  noneDesc: "No game: intro description",
  noneForm: "No game: form title",
  noneSubmit: "No game: form button",
  noneTeaser: "No game: floating button",
  noneConsent: "No game: missing consent error",
  titleUpTo: "Headline with the best reward ({value})",
  titleWin: "Headline with the reward ({value})",
  noneTitleValue: "No game: headline with the reward ({value})",
  consolationIntro: "Consolation reward intro ({name})",
  formWinTitle: "Email after the game: form title after a win",
  formConsTitle: "Email after the game: form title for the consolation reward",
  consentNote: "Under the consent checkbox (unsubscribe note)",
  privacyLink: "Privacy policy link text",
  doiNote: "Double opt-in: check your inbox note",
  alreadyClaimed: "Email already got a code that has expired",
  alreadyWon: "Email already has a valid code (shown instead of the game)",
};

export const DEFAULT_STRINGS: Record<Language, Strings> = {
  de: {
    introTitle: "Spiel um einen geheimen Rabatt",
    introDesc: "Halte {seconds} Sekunden durch und schalte einen geheimen Rabatt frei.",
    startBtn: "Los geht's",
    formTitle: "Gib deine Daten ein, um zu spielen",
    namePlaceholder: "Dein Name",
    emailPlaceholder: "deine@email.de",
    consentLabel: "Ich möchte Neuigkeiten und Angebote per E-Mail erhalten.",
    formSubmit: "Spielen!",
    nameError: "Bitte gib deinen Namen ein.",
    emailError: "Bitte gib eine gültige E-Mail-Adresse ein.",
    consentError: "Bitte bestätige die Einwilligung, um zu spielen.",
    playing: "Lass den Ball nicht fallen!",
    fail: "Ball verloren!",
    retriesLeft: "Nochmal versuchen (verbleibende Versuche: {n})",
    noAttempts: "Keine Versuche mehr.",
    rewardIntro: "Super, {name}! Dein geheimer Code:",
    rewardTeaser: "Leg etwas in den Warenkorb und sieh, wie viel du sparst! 🎁",
    copyBtn: "Code kopieren",
    copied: "Kopiert!",
    closeBtn: "Schließen",
    teaser: "🎁 Spiel um Rabatt",
    rewardValue: "Du hast {value} Rabatt gewonnen!",
    expiresIn: "Code läuft ab in {time}",
    validUntil: "Code gültig bis {date}",
    flipperHelp: "Tippe links oder rechts, um die Flipper zu bewegen",
    pongDesc: "Erziele 3 Tore vor dem Computer und schalte einen geheimen Rabatt frei.",
    pongHelp: "Wer zuerst 3 Tore schießt, gewinnt!",
    pongFail: "Der Computer hat diese Runde gewonnen!",
    wheelDesc: "Dreh am Rad und gewinne einen Rabatt. Jedes Feld ist ein Gewinn!",
    wheelHelp: "Tippe auf das Rad, um es zu drehen!",
    noneTitle: "Hol dir einen geheimen Rabatt",
    noneDesc: "Melde dich an und erhalte sofort deinen Rabattcode.",
    noneForm: "Gib deine Daten ein, um deinen Code zu erhalten",
    noneSubmit: "Code holen",
    noneTeaser: "🎁 Rabatt holen",
    noneConsent: "Bitte bestätige die Einwilligung, um deinen Code zu erhalten.",
    titleUpTo: "Gewinne bis zu {value} Rabatt",
    titleWin: "Spiel und gewinne {value} Rabatt",
    noneTitleValue: "Hol dir {value} Rabatt",
    consolationIntro: "Diesmal nicht, {name}, aber hier ist ein Dankeschön-Code:",
    formWinTitle: "Gewonnen! Gib deine E-Mail ein, um deinen Code zu erhalten",
    formConsTitle: "Gib deine E-Mail ein und erhalte deinen Dankeschön-Code",
    consentNote: "Abmeldung jederzeit möglich.",
    privacyLink: "Datenschutzerklärung",
    doiNote: "Bitte bestätige deine Anmeldung in der E-Mail, die wir dir gerade geschickt haben.",
    alreadyClaimed: "Diese E-Mail-Adresse hat bereits einen Rabatt erhalten.",
    alreadyWon: "Du hast bereits einen Code:",
  },
  fr: {
    introTitle: "Jouez pour une remise mystère",
    introDesc: "Tenez {seconds} secondes et débloquez une remise mystère.",
    startBtn: "Commencer",
    formTitle: "Entrez vos coordonnées pour jouer",
    namePlaceholder: "Votre prénom",
    emailPlaceholder: "votre@email.fr",
    consentLabel: "J'accepte de recevoir des actualités et des offres par e-mail.",
    formSubmit: "Jouer\u00a0!",
    nameError: "Veuillez saisir votre prénom.",
    emailError: "Veuillez saisir un e-mail valide.",
    consentError: "Veuillez confirmer votre consentement pour jouer.",
    playing: "Ne laissez pas tomber la balle\u00a0!",
    fail: "Balle perdue\u00a0!",
    retriesLeft: "Réessayer (essais restants : {n})",
    noAttempts: "Plus d'essais disponibles.",
    rewardIntro: "Bravo, {name}\u00a0! Votre code mystère\u00a0:",
    rewardTeaser: "Ajoutez au panier et découvrez combien vous économisez\u00a0! 🎁",
    copyBtn: "Copier le code",
    copied: "Copié\u00a0!",
    closeBtn: "Fermer",
    teaser: "🎁 Jouez pour une remise",
    rewardValue: "Vous avez gagné {value} de remise\u00a0!",
    expiresIn: "Le code expire dans {time}",
    validUntil: "Code valable jusqu'au {date}",
    flipperHelp: "Touchez à gauche ou à droite pour actionner les flippers",
    pongDesc: "Marquez 3 buts avant l'ordinateur et débloquez une remise mystère.",
    pongHelp: "Le premier à 3 buts gagne !",
    pongFail: "L'ordinateur a gagné cette manche !",
    wheelDesc: "Faites tourner la roue et gagnez une réduction. Chaque case est gagnante !",
    wheelHelp: "Touchez la roue pour la faire tourner !",
    noneTitle: "Débloquez une réduction mystère",
    noneDesc: "Inscrivez-vous et recevez tout de suite votre code de réduction.",
    noneForm: "Entrez vos coordonnées pour recevoir votre code",
    noneSubmit: "Obtenir mon code",
    noneTeaser: "🎁 Obtenir une réduction",
    noneConsent: "Merci de confirmer votre consentement pour recevoir votre code.",
    titleUpTo: "Gagnez jusqu'à {value} de réduction",
    titleWin: "Jouez et gagnez {value} de réduction",
    noneTitleValue: "Obtenez {value} de réduction",
    consolationIntro: "Pas cette fois, {name}, mais voici un code de remerciement :",
    formWinTitle: "Gagné ! Entrez votre e-mail pour recevoir votre code",
    formConsTitle: "Entrez votre e-mail pour recevoir votre code de remerciement",
    consentNote: "Désinscription possible à tout moment.",
    privacyLink: "Politique de confidentialité",
    doiNote: "Confirmez votre inscription dans l'e-mail que nous venons de vous envoyer.",
    alreadyClaimed: "Cette adresse e-mail a déjà reçu une remise.",
    alreadyWon: "Vous avez déjà un code\u00a0:",
  },
  es: {
    introTitle: "Juega por un descuento sorpresa",
    introDesc: "Aguanta {seconds} segundos y desbloquea un descuento sorpresa.",
    startBtn: "Empezar",
    formTitle: "Introduce tus datos para jugar",
    namePlaceholder: "Tu nombre",
    emailPlaceholder: "tu@email.com",
    consentLabel: "Acepto recibir novedades y ofertas por email.",
    formSubmit: "¡Jugar!",
    nameError: "Introduce tu nombre.",
    emailError: "Introduce un email válido.",
    consentError: "Confirma tu consentimiento para jugar.",
    playing: "¡No dejes caer la pelota!",
    fail: "¡Se cayó la pelota!",
    retriesLeft: "Inténtalo de nuevo (intentos restantes: {n})",
    noAttempts: "No te quedan intentos.",
    rewardIntro: "¡Bien hecho, {name}! Tu código sorpresa:",
    rewardTeaser: "¡Añade al carrito y descubre cuánto ahorras! 🎁",
    copyBtn: "Copiar código",
    copied: "¡Copiado!",
    closeBtn: "Cerrar",
    teaser: "🎁 Juega por un descuento",
    rewardValue: "¡Has ganado un {value} de descuento!",
    expiresIn: "El código caduca en {time}",
    validUntil: "Código válido hasta el {date}",
    flipperHelp: "Toca a la izquierda o a la derecha para mover las palas",
    pongDesc: "Marca 3 goles antes que el ordenador y desbloquea un descuento sorpresa.",
    pongHelp: "¡Gana quien marque primero 3 goles!",
    pongFail: "¡El ordenador ganó esta ronda!",
    wheelDesc: "Gira la ruleta y gana un descuento. ¡Cada casilla es un premio!",
    wheelHelp: "¡Toca la ruleta para girarla!",
    noneTitle: "Desbloquea un descuento sorpresa",
    noneDesc: "Suscríbete y recibe tu código de descuento al instante.",
    noneForm: "Introduce tus datos para recibir tu código",
    noneSubmit: "Obtener mi código",
    noneTeaser: "🎁 Consigue un descuento",
    noneConsent: "Confirma tu consentimiento para recibir tu código.",
    titleUpTo: "Gana hasta {value} de descuento",
    titleWin: "Juega y gana {value} de descuento",
    noneTitleValue: "Consigue {value} de descuento",
    consolationIntro: "Esta vez no, {name}, pero aquí tienes un código de agradecimiento:",
    formWinTitle: "¡Has ganado! Introduce tu email para recibir tu código",
    formConsTitle: "Introduce tu email para recibir tu código de agradecimiento",
    consentNote: "Puedes darte de baja en cualquier momento.",
    privacyLink: "Política de privacidad",
    doiNote: "Confirma tu suscripción en el email que te acabamos de enviar.",
    alreadyClaimed: "Este email ya ha recibido un descuento.",
    alreadyWon: "Ya tienes un código:",
  },
  it: {
    introTitle: "Gioca per uno sconto misterioso",
    introDesc: "Resisti {seconds} secondi e sblocca uno sconto misterioso.",
    startBtn: "Inizia",
    formTitle: "Inserisci i tuoi dati per giocare",
    namePlaceholder: "Il tuo nome",
    emailPlaceholder: "tua@email.it",
    consentLabel: "Accetto di ricevere novità e offerte via email.",
    formSubmit: "Gioca!",
    nameError: "Inserisci il tuo nome.",
    emailError: "Inserisci un'email valida.",
    consentError: "Conferma il consenso per giocare.",
    playing: "Non far cadere la pallina!",
    fail: "La pallina è caduta!",
    retriesLeft: "Riprova (tentativi rimasti: {n})",
    noAttempts: "Non hai più tentativi.",
    rewardIntro: "Complimenti, {name}! Il tuo codice misterioso:",
    rewardTeaser: "Aggiungi al carrello e scopri quanto risparmi! 🎁",
    copyBtn: "Copia codice",
    copied: "Copiato!",
    closeBtn: "Chiudi",
    teaser: "🎁 Gioca per uno sconto",
    rewardValue: "Hai vinto {value} di sconto!",
    expiresIn: "Il codice scade tra {time}",
    validUntil: "Codice valido fino al {date}",
    flipperHelp: "Tocca a sinistra o a destra per azionare le palette",
    pongDesc: "Segna 3 gol prima del computer e sblocca uno sconto misterioso.",
    pongHelp: "Vince chi segna per primo 3 gol!",
    pongFail: "Il computer ha vinto questo round!",
    wheelDesc: "Gira la ruota e vinci uno sconto. Ogni spicchio è un premio!",
    wheelHelp: "Tocca la ruota per farla girare!",
    noneTitle: "Sblocca uno sconto misterioso",
    noneDesc: "Iscriviti e ricevi subito il tuo codice sconto.",
    noneForm: "Inserisci i tuoi dati per ricevere il codice",
    noneSubmit: "Ricevi il codice",
    noneTeaser: "🎁 Ottieni uno sconto",
    noneConsent: "Conferma il consenso per ricevere il codice.",
    titleUpTo: "Vinci fino a {value} di sconto",
    titleWin: "Gioca e vinci {value} di sconto",
    noneTitleValue: "Ottieni {value} di sconto",
    consolationIntro: "Non questa volta, {name}, ma ecco un codice di ringraziamento:",
    formWinTitle: "Hai vinto! Inserisci la tua email per ricevere il codice",
    formConsTitle: "Inserisci la tua email per ricevere il codice di ringraziamento",
    consentNote: "Puoi annullare l'iscrizione in qualsiasi momento.",
    privacyLink: "Informativa sulla privacy",
    doiNote: "Conferma l'iscrizione nell'email che ti abbiamo appena inviato.",
    alreadyClaimed: "Questa email ha già ricevuto uno sconto.",
    alreadyWon: "Hai già un codice:",
  },
  nl: {
    introTitle: "Speel voor een geheime korting",
    introDesc: "Hou het {seconds} seconden vol en ontgrendel een geheime korting.",
    startBtn: "Start",
    formTitle: "Vul je gegevens in om te spelen",
    namePlaceholder: "Je naam",
    emailPlaceholder: "jouw@email.nl",
    consentLabel: "Ik ontvang graag nieuws en aanbiedingen per e-mail.",
    formSubmit: "Spelen!",
    nameError: "Vul je naam in.",
    emailError: "Vul een geldig e-mailadres in.",
    consentError: "Bevestig je toestemming om te spelen.",
    playing: "Laat de bal niet vallen!",
    fail: "Bal gevallen!",
    retriesLeft: "Probeer opnieuw (resterende pogingen: {n})",
    noAttempts: "Geen pogingen meer.",
    rewardIntro: "Goed gedaan, {name}! Je geheime code:",
    rewardTeaser: "Voeg toe aan je winkelwagen en ontdek hoeveel je bespaart! 🎁",
    copyBtn: "Kopieer code",
    copied: "Gekopieerd!",
    closeBtn: "Sluiten",
    teaser: "🎁 Speel voor korting",
    rewardValue: "Je hebt {value} korting gewonnen!",
    expiresIn: "Code verloopt over {time}",
    validUntil: "Code geldig tot {date}",
    flipperHelp: "Tik links of rechts om de flippers te bewegen",
    pongDesc: "Scoor 3 goals vóór de computer en ontgrendel een geheime korting.",
    pongHelp: "Wie het eerst 3 goals scoort, wint!",
    pongFail: "De computer won deze ronde!",
    wheelDesc: "Draai aan het rad en win korting. Elk vak is een prijs!",
    wheelHelp: "Tik op het rad om te draaien!",
    noneTitle: "Ontgrendel een geheime korting",
    noneDesc: "Schrijf je in en ontvang meteen je kortingscode.",
    noneForm: "Vul je gegevens in om je code te ontvangen",
    noneSubmit: "Code ontvangen",
    noneTeaser: "🎁 Krijg korting",
    noneConsent: "Bevestig je toestemming om je code te ontvangen.",
    titleUpTo: "Win tot {value} korting",
    titleWin: "Speel en win {value} korting",
    noneTitleValue: "Krijg {value} korting",
    consolationIntro: "Deze keer niet, {name}, maar hier is een bedankcode:",
    formWinTitle: "Gewonnen! Vul je e-mail in om je code te ontvangen",
    formConsTitle: "Vul je e-mail in om je bedankcode te ontvangen",
    consentNote: "Je kunt je op elk moment afmelden.",
    privacyLink: "Privacybeleid",
    doiNote: "Bevestig je inschrijving in de e-mail die we je net hebben gestuurd.",
    alreadyClaimed: "Dit e-mailadres heeft al een korting ontvangen.",
    alreadyWon: "Je hebt al een code:",
  },
  pl: {
    introTitle: "Zagraj o tajemniczy rabat",
    introDesc: "Przetrwaj {seconds} sekund i odblokuj tajemniczy rabat.",
    startBtn: "Start",
    formTitle: "Podaj dane, aby zagrać",
    namePlaceholder: "Twoje imię",
    emailPlaceholder: "twoj@email.pl",
    consentLabel: "Zgadzam się na otrzymywanie nowości i ofert e-mailem.",
    formSubmit: "Graj!",
    nameError: "Podaj swoje imię.",
    emailError: "Podaj prawidłowy adres e-mail.",
    consentError: "Potwierdź zgodę, aby zagrać.",
    playing: "Nie upuść piłki!",
    fail: "Piłka spadła!",
    retriesLeft: "Spróbuj ponownie (pozostałe próby: {n})",
    noAttempts: "Nie masz więcej prób.",
    rewardIntro: "Brawo, {name}! Twój tajemniczy kod:",
    rewardTeaser: "Dodaj do koszyka i sprawdź, ile oszczędzasz! 🎁",
    copyBtn: "Kopiuj kod",
    copied: "Skopiowano!",
    closeBtn: "Zamknij",
    teaser: "🎁 Zagraj o rabat",
    rewardValue: "Twoja wygrana: {value} rabatu!",
    expiresIn: "Kod wygasa za {time}",
    validUntil: "Kod ważny do {date}",
    flipperHelp: "Dotknij lewej lub prawej strony, aby poruszyć łapkami",
    pongDesc: "Strzel 3 gole przed komputerem i odblokuj tajemniczy rabat.",
    pongHelp: "Wygrywa ten, kto pierwszy strzeli 3 gole!",
    pongFail: "Komputer wygrał tę rundę!",
    wheelDesc: "Zakręć kołem i wygraj rabat. Każde pole to nagroda!",
    wheelHelp: "Dotknij koła, aby nim zakręcić!",
    noneTitle: "Odblokuj tajemniczy rabat",
    noneDesc: "Zapisz się i od razu odbierz kod rabatowy.",
    noneForm: "Podaj swoje dane, aby otrzymać kod",
    noneSubmit: "Odbierz kod",
    noneTeaser: "🎁 Odbierz rabat",
    noneConsent: "Potwierdź zgodę, aby otrzymać kod.",
    titleUpTo: "Wygraj do {value} rabatu",
    titleWin: "Zagraj i wygraj {value} rabatu",
    noneTitleValue: "Odbierz {value} rabatu",
    consolationIntro: "Tym razem się nie udało, {name}, ale oto kod w podziękowaniu:",
    formWinTitle: "Wygrana! Podaj e-mail, aby otrzymać kod",
    formConsTitle: "Podaj e-mail, aby otrzymać kod w podziękowaniu",
    consentNote: "Możesz w każdej chwili zrezygnować z subskrypcji.",
    privacyLink: "Polityka prywatności",
    doiNote: "Potwierdź subskrypcję w e-mailu, który właśnie wysłaliśmy.",
    alreadyClaimed: "Ten adres e-mail otrzymał już rabat.",
    alreadyWon: "Masz już kod:",
  },
  sl: {
    introTitle: "Igraj za skrivnostni popust",
    introDesc: "Zdrži {seconds} sekund in odkleni skrivnostni popust.",
    startBtn: "Začni",
    formTitle: "Vpiši podatke in igraj",
    namePlaceholder: "Tvoje ime",
    emailPlaceholder: "tvoj@email.si",
    consentLabel: "Strinjam se s prejemanjem novic in ponudb po e-pošti.",
    formSubmit: "Igraj!",
    nameError: "Vpiši svoje ime.",
    emailError: "Vpiši veljaven e-poštni naslov.",
    consentError: "Za sodelovanje potrdi soglasje.",
    playing: "Ne izpusti žogice!",
    fail: "Žogica je padla!",
    retriesLeft: "Poskusi znova (preostali poskusi: {n})",
    noAttempts: "Nimaš več poskusov.",
    rewardIntro: "Bravo, {name}! Tvoja skrivnostna koda:",
    rewardTeaser: "Dodaj v košarico in poglej, koliko prihraniš! 🎁",
    copyBtn: "Kopiraj kodo",
    copied: "Kopirano!",
    closeBtn: "Zapri",
    teaser: "🎁 Igraj za popust",
    rewardValue: "Tvoj popust: {value}!",
    expiresIn: "Koda poteče čez {time}",
    validUntil: "Koda velja do {date}",
    flipperHelp: "Tapni levo ali desno za udarec s flipperjem",
    pongDesc: "Zabij 3 gole pred računalnikom in odkleni skrivnostni popust.",
    pongHelp: "Zmaga, kdor prvi zabije 3 gole!",
    pongFail: "Računalnik je dobil to rundo!",
    wheelDesc: "Zavrti kolo in osvoji popust. Vsako polje je nagrada!",
    wheelHelp: "Tapni kolo, da ga zavrtiš!",
    noneTitle: "Odkleni skrivni popust",
    noneDesc: "Prijavi se in takoj prejmi kodo za popust.",
    noneForm: "Vpiši svoje podatke in prejmi kodo",
    noneSubmit: "Prejmi kodo",
    noneTeaser: "🎁 Prejmi popust",
    noneConsent: "Potrdi soglasje, da prejmeš kodo.",
    titleUpTo: "Zadeni do {value} popusta",
    titleWin: "Igraj in osvoji {value} popusta",
    noneTitleValue: "Prejmi {value} popusta",
    consolationIntro: "Tokrat ne, {name}, a tukaj je koda v zahvalo:",
    formWinTitle: "Zmaga! Vpiši e-naslov in prejmi kodo",
    formConsTitle: "Vpiši e-naslov in prejmi kodo v zahvalo",
    consentNote: "Odjaviš se lahko kadar koli.",
    privacyLink: "Politika zasebnosti",
    doiNote: "Potrdi prijavo v e-poštnem sporočilu, ki smo ti ga pravkar poslali.",
    alreadyClaimed: "Ta e-naslov je popust že prejel.",
    alreadyWon: "Že imaš kodo:",
  },
  hr: {
    introTitle: "Igraj za tajni popust",
    introDesc: "Izdrži {seconds} sekundi i otključaj tajni popust.",
    startBtn: "Započni",
    formTitle: "Upiši podatke i igraj",
    namePlaceholder: "Tvoje ime",
    emailPlaceholder: "tvoj@email.hr",
    consentLabel: "Slažem se s primanjem novosti i ponuda e-poštom.",
    formSubmit: "Igraj!",
    nameError: "Upiši svoje ime.",
    emailError: "Upiši ispravnu e-mail adresu.",
    consentError: "Za sudjelovanje potvrdi suglasnost.",
    playing: "Ne ispusti lopticu!",
    fail: "Loptica je pala!",
    retriesLeft: "Pokušaj ponovo (preostali pokušaji: {n})",
    noAttempts: "Nemaš više pokušaja.",
    rewardIntro: "Bravo, {name}! Tvoj tajni kod:",
    rewardTeaser: "Dodaj u košaricu i pogledaj koliko štediš! 🎁",
    copyBtn: "Kopiraj kod",
    copied: "Kopirano!",
    closeBtn: "Zatvori",
    teaser: "🎁 Igraj za popust",
    rewardValue: "Tvoj popust: {value}!",
    expiresIn: "Kod istječe za {time}",
    validUntil: "Kod vrijedi do {date}",
    flipperHelp: "Dodirni lijevo ili desno za udarac fliperom",
    pongDesc: "Zabij 3 gola prije računala i otključaj tajni popust.",
    pongHelp: "Pobjeđuje tko prvi zabije 3 gola!",
    pongFail: "Računalo je osvojilo ovu rundu!",
    wheelDesc: "Zavrti kotač i osvoji popust. Svako polje je nagrada!",
    wheelHelp: "Dodirni kotač da ga zavrtiš!",
    noneTitle: "Otključaj tajni popust",
    noneDesc: "Prijavi se i odmah primi kod za popust.",
    noneForm: "Upiši svoje podatke i primi kod",
    noneSubmit: "Preuzmi kod",
    noneTeaser: "🎁 Preuzmi popust",
    noneConsent: "Potvrdi privolu da primiš kod.",
    titleUpTo: "Osvoji do {value} popusta",
    titleWin: "Igraj i osvoji {value} popusta",
    noneTitleValue: "Preuzmi {value} popusta",
    consolationIntro: "Ovaj put ne, {name}, ali evo koda kao zahvala:",
    formWinTitle: "Pobjeda! Upiši e-mail i primi kod",
    formConsTitle: "Upiši e-mail i primi kod kao zahvalu",
    consentNote: "Možeš se odjaviti u bilo kojem trenutku.",
    privacyLink: "Pravila privatnosti",
    doiNote: "Potvrdi prijavu u e-poruci koju smo ti upravo poslali.",
    alreadyClaimed: "Ova e-adresa već je dobila popust.",
    alreadyWon: "Već imaš kod:",
  },
  ro: {
    introTitle: "Joacă pentru o reducere surpriză",
    introDesc: "Rezistă {seconds} secunde și deblochează o reducere surpriză.",
    startBtn: "Începe",
    formTitle: "Completează datele și joacă",
    namePlaceholder: "Numele tău",
    emailPlaceholder: "email@tau.ro",
    consentLabel: "Sunt de acord să primesc noutăți și oferte pe e-mail.",
    formSubmit: "Joacă!",
    nameError: "Introdu numele tău.",
    emailError: "Introdu o adresă de e-mail validă.",
    consentError: "Confirmă acordul pentru a participa.",
    playing: "Nu scăpa mingea!",
    fail: "Mingea a căzut!",
    retriesLeft: "Încearcă din nou (încercări rămase: {n})",
    noAttempts: "Nu mai ai încercări.",
    rewardIntro: "Bravo, {name}! Codul tău surpriză:",
    rewardTeaser: "Adaugă în coș și descoperă cât economisești! 🎁",
    copyBtn: "Copiază codul",
    copied: "Copiat!",
    closeBtn: "Închide",
    teaser: "🎁 Joacă pentru reducere",
    rewardValue: "Ai câștigat o reducere de {value}!",
    expiresIn: "Codul expiră în {time}",
    validUntil: "Codul este valabil până la {date}",
    flipperHelp: "Atinge stânga sau dreapta pentru a acționa paletele",
    pongDesc: "Marchează 3 goluri înaintea calculatorului și deblochează o reducere surpriză.",
    pongHelp: "Câștigă cine marchează primul 3 goluri!",
    pongFail: "Calculatorul a câștigat această rundă!",
    wheelDesc: "Învârte roata și câștigă o reducere. Fiecare câmp este un premiu!",
    wheelHelp: "Atinge roata ca să o învârți!",
    noneTitle: "Deblochează o reducere surpriză",
    noneDesc: "Abonează-te și primește imediat codul de reducere.",
    noneForm: "Introdu datele tale pentru a primi codul",
    noneSubmit: "Primește codul",
    noneTeaser: "🎁 Primește o reducere",
    noneConsent: "Confirmă acordul pentru a primi codul.",
    titleUpTo: "Câștigă până la {value} reducere",
    titleWin: "Joacă și câștigă {value} reducere",
    noneTitleValue: "Primește {value} reducere",
    consolationIntro: "Nu de data asta, {name}, dar iată un cod de mulțumire:",
    formWinTitle: "Ai câștigat! Introdu e-mailul pentru a primi codul",
    formConsTitle: "Introdu e-mailul pentru a primi codul de mulțumire",
    consentNote: "Te poți dezabona oricând.",
    privacyLink: "Politica de confidențialitate",
    doiNote: "Confirmă abonarea din e-mailul pe care tocmai ți l-am trimis.",
    alreadyClaimed: "Această adresă de e-mail a primit deja o reducere.",
    alreadyWon: "Ai deja un cod:",
  },
  en: {
    introTitle: "Play for a mystery discount",
    introDesc: "Survive {seconds} seconds and unlock a mystery discount.",
    startBtn: "Start",
    formTitle: "Enter your details to play",
    namePlaceholder: "Your name",
    emailPlaceholder: "your@email.com",
    consentLabel: "I agree to receive news and offers by email.",
    formSubmit: "Play!",
    nameError: "Please enter your name.",
    emailError: "Please enter a valid email.",
    consentError: "Please confirm consent to play.",
    playing: "Don't drop the ball!",
    fail: "Ball dropped!",
    retriesLeft: "Try again (attempts left: {n})",
    noAttempts: "No more attempts.",
    rewardIntro: "Well done, {name}! Your mystery code:",
    rewardTeaser: "Add to cart and discover how much you save! 🎁",
    copyBtn: "Copy code",
    copied: "Copied!",
    closeBtn: "Close",
    teaser: "🎁 Play for a discount",
    rewardValue: "You won {value} off!",
    expiresIn: "Code expires in {time}",
    validUntil: "Code valid until {date}",
    flipperHelp: "Tap left or right to flip",
    pongDesc: "Score 3 goals before the computer does and unlock a mystery discount.",
    pongHelp: "First to 3 goals wins!",
    pongFail: "The computer won this round!",
    wheelDesc: "Spin the wheel and win a discount. Every segment is a prize!",
    wheelHelp: "Tap the wheel to spin!",
    noneTitle: "Unlock a mystery discount",
    noneDesc: "Sign up and get your discount code right away.",
    noneForm: "Enter your details to get your code",
    noneSubmit: "Get my code",
    noneTeaser: "🎁 Get a discount",
    noneConsent: "Please confirm consent to get your code.",
    titleUpTo: "Win up to {value} off",
    titleWin: "Play and win {value} off",
    noneTitleValue: "Get {value} off",
    consolationIntro: "Not this time, {name}, but here's a thank-you code:",
    formWinTitle: "You won! Enter your email to get your code",
    formConsTitle: "Enter your email to get your thank-you code",
    consentNote: "You can unsubscribe at any time.",
    privacyLink: "Privacy policy",
    doiNote: "Check your inbox to confirm your subscription.",
    alreadyClaimed: "This email has already received a discount.",
    alreadyWon: "You already have a code:",
  },
};

export const TARGETS = [
  { label: "All pages", value: "all" },
  { label: "Home page", value: "index" },
  { label: "Product pages", value: "product" },
  { label: "Collection pages", value: "collection" },
  { label: "Cart page", value: "cart" },
  { label: "Blog & article pages", value: "blog" },
  { label: "Content pages", value: "page" },
] as const;

export const GAMES = [
  { label: "Paddle & ball", value: "paddle" },
  { label: "Flipper", value: "flipper" },
  { label: "Pong vs computer (first to 3 goals)", value: "pong" },
  { label: "Spin wheel (every spin wins)", value: "wheel" },
  { label: "No game: sign-up form only (for A/B tests)", value: "none" },
] as const;
export type GameType = (typeof GAMES)[number]["value"];
export const isGameType = (v: unknown): v is GameType => GAMES.some((g) => g.value === v);

// Pong: how good the computer is.
export const DIFFICULTIES = [
  { label: "Easy", value: "easy" },
  { label: "Medium (recommended)", value: "medium" },
  { label: "Hard", value: "hard" },
] as const;

// Paddle game ball speed presets (pixels per 60 fps frame; the ball starts upwards).
export const BALL_SPEEDS = [
  { label: "Slow (more winners)", value: "slow", vx: 3.5, vy: -4 },
  { label: "Normal (recommended)", value: "normal", vx: 4.5, vy: -5 },
  { label: "Fast", value: "fast", vx: 5.5, vy: -6 },
  { label: "Very fast (fewer winners)", value: "veryfast", vx: 6.5, vy: -7 },
] as const;

/** The preset matching a popup's vx/vy, or "custom" for hand-set values. */
export function ballSpeedOf(vx: number, vy: number): string {
  const p = BALL_SPEEDS.find((b) => Math.abs(b.vx - Math.abs(vx)) < 0.05 && Math.abs(b.vy - -Math.abs(vy)) < 0.05);
  return p ? p.value : "custom";
}

export const NAME_FIELDS = [
  { label: "Required", value: "required" },
  { label: "Optional", value: "optional" },
  { label: "Hidden (only email)", value: "hidden" },
] as const;
export type NameField = (typeof NAME_FIELDS)[number]["value"];
const isNameField = (v: unknown): v is NameField => NAME_FIELDS.some((f) => f.value === v);

export const TRIGGERS = [
  { label: "When they’re about to leave, or after the wait (recommended)", value: "both" },
  { label: "After the wait", value: "delay" },
  { label: "Only when they’re about to leave (phones: after the wait)", value: "exit" },
] as const;

export const FREQUENCIES = [
  { label: "Once per visit (recommended)", value: "session" },
  { label: "Only once per visitor", value: "once" },
  { label: "Once per day", value: "day" },
  { label: "Once per week", value: "week" },
  { label: "On every page until they close it", value: "always" },
] as const;

/** Spin wheel reward: the discount and its chance in % (all chances add up to 100). */
export interface WheelSegment {
  value: number;
  chance: number;
}
export const WHEEL_MAX_SEGMENTS = 8;
export const DEFAULT_WHEEL: WheelSegment[] = [
  { value: 5, chance: 50 },
  { value: 10, chance: 30 },
  { value: 20, chance: 20 },
];

/**
 * Texts a game words its own way: the shown key → the default it takes, unless
 * the merchant wrote that text themselves. Keys used by no game are hidden in the editor.
 */
export const GAME_TEXTS: Record<GameType, Partial<Record<StringKey, StringKey>>> = {
  paddle: {},
  flipper: { playing: "flipperHelp" },
  pong: { introDesc: "pongDesc", playing: "pongHelp", fail: "pongFail" },
  wheel: { introDesc: "wheelDesc", playing: "wheelHelp" },
  none: {
    introTitle: "noneTitle",
    introDesc: "noneDesc",
    formTitle: "noneForm",
    formSubmit: "noneSubmit",
    teaser: "noneTeaser",
    consentError: "noneConsent",
  },
};
// Default-only keys (edited through the key they stand in for) and keys a game doesn't use.
// The reward headlines are templates for "Intro title" (edited through it).
const SOURCE_KEYS = new Set<StringKey>([
  ...Object.values(GAME_TEXTS).flatMap((m) => Object.values(m)),
  "titleUpTo",
  "titleWin",
  "noneTitleValue",
]);
const SKILL_ONLY: StringKey[] = ["fail", "retriesLeft", "noAttempts", "consolationIntro", "formWinTitle", "formConsTitle"];
const UNUSED: Partial<Record<GameType, StringKey[]>> = {
  wheel: SKILL_ONLY,
  none: ["playing", ...SKILL_ONLY],
};
/** The text fields the editor shows for a game, with the default each one falls back to. */
export function textFieldsFor(game: GameType): { key: StringKey; source: StringKey }[] {
  return STRING_KEYS.filter((k) => !SOURCE_KEYS.has(k) && !UNUSED[game]?.includes(k)).map((key) => ({
    key,
    source: GAME_TEXTS[game][key] ?? key,
  }));
}

/** Games where the visitor has to win (time, attempts, reward by attempt). */
export const SKILL_GAMES: readonly GameType[] = ["paddle", "flipper", "pong"];

/** Coerces stored or submitted wheel rewards; anything unreadable falls back. */
export function parseWheelSegments(raw: unknown, fallback: WheelSegment[] = DEFAULT_WHEEL): WheelSegment[] {
  if (!Array.isArray(raw) || !raw.length) return fallback.map((x) => ({ ...x }));
  return raw.slice(0, WHEEL_MAX_SEGMENTS).map((x) => {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    return { value: num(o.value, 0, 0, 1_000_000), chance: Math.round(num(o.chance, 0, 0, 100)) };
  });
}

/** What's wrong with a wheel's rewards, or null when it can be saved. */
export function wheelError(segs: WheelSegment[], discountType: "percentage" | "fixed"): string | null {
  if (!segs.length || segs.length > WHEEL_MAX_SEGMENTS) return `Add 1 to ${WHEEL_MAX_SEGMENTS} rewards.`;
  if (segs.some((x) => x.value <= 0 || (discountType === "percentage" && x.value > 100))) {
    return discountType === "percentage" ? "Each reward needs a percentage between 1 and 100." : "Each reward needs an amount greater than 0.";
  }
  if (new Set(segs.map((x) => x.value)).size !== segs.length) return "Each reward must be different.";
  if (segs.some((x) => x.chance < 1)) return "Each reward needs a chance of at least 1%: the wheel only shows rewards that can be won.";
  const total = segs.reduce((t, x) => t + x.chance, 0);
  if (total !== 100) return `The chances must add up to 100% (now ${total}%).`;
  return null;
}

export const DEFAULT_PRIMARY = "#830522";
export const DEFAULT_ACCENT = "#d9caa0";

/** What variant B of an A/B test changes; everything else is the same as A. */
export interface AbVariant {
  gameType: GameType;
  trigger: "both" | "delay" | "exit";
  delaySec: number;
  // Unique codes: B's discount (single value, or per attempt when tiered)
  discountValue: number;
  tierValues: [number, number, number];
  // Shared-code mode: B's code (empty = same code as A)
  discountCode: string;
  // Spin wheel rewards when B is the wheel
  wheelSegments: WheelSegment[];
  // Skill games: ask for the email after a win instead of before the game
  emailAfter: boolean;
  nameField: NameField;
  // Headline/description per language (empty = same as A)
  strings: Partial<Record<Language, { introTitle?: string; introDesc?: string }>>;
}

export interface PopupSettings {
  name: string;
  active: boolean;
  discountCode: string;
  delaySec: number;
  surviveSec: number;
  vx: number;
  vy: number;
  maxAttempts: number;
  primaryColor: string;
  accentColor: string;
  // Popup size in % of the default (limits in SIZE_LIMITS)
  sizeDesktop: number;
  sizeMobile: number;
  target: string;
  requireConsent: boolean;
  // Subscribe through the storefront newsletter form so Shopify sends its confirmation email
  doubleOptIn: boolean;
  nameField: NameField;
  autoApply: boolean;
  codeMode: "static" | "unique";
  discountType: "percentage" | "fixed";
  discountValue: number;
  codePrefix: string;
  codeExpiryDays: number;
  gameType: GameType;
  difficulty: "easy" | "medium" | "hard";
  trigger: "both" | "delay" | "exit";
  // How often the popup may open by itself; the floating button always works.
  frequency: "session" | "once" | "day" | "week" | "always";
  // Don't open by itself for shoppers with something in the cart
  noCart: boolean;
  // Save each winner's code on the Shopify customer (for a reminder email)
  saveCode: boolean;
  teaser: boolean;
  tiered: boolean;
  // Best → worst: won on 1st, 2nd, 3rd+ attempt
  tierValues: [number, number, number];
  // >0: unique codes expire this many minutes after winning (shown as a countdown)
  urgencyMinutes: number;
  // Spin wheel rewards and their chances
  wheelSegments: WheelSegment[];
  // Headline names the reward ("Win up to 20% off") unless the merchant wrote their own
  showValue: boolean;
  // Skill games: a smaller code when all attempts are lost
  consolation: boolean;
  consolationValue: number;
  // Skill games: ask for the email after a win instead of before the game
  emailAfter: boolean;
  strings: CustomStrings;
  abEnabled: boolean;
  ab: AbVariant;
}

/** Starting point for variant B: a copy of A with the other game. */
export function abFromSettings(s: PopupSettings): AbVariant {
  return {
    gameType: s.gameType === "paddle" ? "flipper" : "paddle",
    trigger: s.trigger,
    delaySec: s.delaySec,
    discountValue: s.discountValue,
    tierValues: [...s.tierValues],
    discountCode: s.discountCode,
    wheelSegments: s.wheelSegments.map((x) => ({ ...x })),
    emailAfter: s.emailAfter,
    nameField: s.nameField,
    strings: {},
  };
}

/** Settings after adopting variant B as the popup (ends the test). */
export function applyVariantB(s: PopupSettings): PopupSettings {
  const b = s.ab;
  const strings: CustomStrings = { ...s.strings };
  for (const [lang, over] of Object.entries(b.strings) as [Language, AbVariant["strings"][Language]][]) {
    const clean = Object.fromEntries(Object.entries(over ?? {}).filter(([, v]) => v));
    if (Object.keys(clean).length) strings[lang] = { ...strings[lang], ...clean };
  }
  return {
    ...s,
    gameType: b.gameType,
    trigger: b.trigger,
    delaySec: b.delaySec,
    discountValue: b.discountValue,
    tierValues: [...b.tierValues],
    discountCode: b.discountCode || s.discountCode,
    wheelSegments: b.wheelSegments.map((x) => ({ ...x })),
    emailAfter: b.emailAfter,
    nameField: b.nameField,
    strings,
    abEnabled: false,
  };
}

export const DEFAULT_SETTINGS: PopupSettings = {
  name: "Mystery discount game",
  active: false,
  discountCode: "",
  delaySec: 15,
  surviveSec: 15,
  vx: 4.5,
  vy: -5.0,
  maxAttempts: 3,
  primaryColor: DEFAULT_PRIMARY,
  accentColor: DEFAULT_ACCENT,
  sizeDesktop: 100,
  sizeMobile: 100,
  target: "all",
  requireConsent: true,
  doubleOptIn: false,
  nameField: "hidden",
  autoApply: true,
  codeMode: "unique",
  discountType: "percentage",
  discountValue: 10,
  codePrefix: "WIN",
  codeExpiryDays: 7,
  gameType: "paddle",
  difficulty: "medium",
  trigger: "both",
  frequency: "session",
  teaser: true,
  noCart: true,
  saveCode: false,
  tiered: false,
  tierValues: [15, 10, 5],
  urgencyMinutes: 0,
  wheelSegments: DEFAULT_WHEEL,
  showValue: true,
  consolation: false,
  consolationValue: 5,
  emailAfter: false,
  strings: {},
  abEnabled: false,
  ab: {
    gameType: "flipper",
    trigger: "both",
    delaySec: 15,
    discountValue: 10,
    tierValues: [15, 10, 5],
    discountCode: "",
    wheelSegments: DEFAULT_WHEEL,
    emailAfter: false,
    nameField: "hidden",
    strings: {},
  },
};

export function parseAbJson(raw: string) {
  try {
    return parseAbVariant(JSON.parse(raw || "{}"));
  } catch {
    return parseAbVariant({});
  }
}

/** Parses a stored/submitted variant B, falling back to the defaults field by field. */
export function parseAbVariant(input: unknown, fallback: AbVariant = DEFAULT_SETTINGS.ab): AbVariant {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const tiers = Array.isArray(o.tierValues) ? o.tierValues : fallback.tierValues;
  const strings: AbVariant["strings"] = {};
  const rawStrings = (o.strings && typeof o.strings === "object" ? o.strings : {}) as Record<string, unknown>;
  for (const lang of LANGUAGES) {
    const src = (rawStrings[lang] ?? {}) as Record<string, unknown>;
    const out: { introTitle?: string; introDesc?: string } = {};
    for (const key of ["introTitle", "introDesc"] as const) {
      const val = typeof src[key] === "string" ? (src[key] as string).trim().slice(0, 300) : "";
      if (val) out[key] = val;
    }
    if (Object.keys(out).length) strings[lang] = out;
  }
  return {
    gameType: isGameType(o.gameType) ? o.gameType : fallback.gameType,
    trigger: o.trigger === "delay" || o.trigger === "exit" || o.trigger === "both" ? o.trigger : fallback.trigger,
    delaySec: Math.round(num(o.delaySec, fallback.delaySec, 0, 600)),
    discountValue: num(o.discountValue, fallback.discountValue, 0.01, 100000),
    tierValues: [0, 1, 2].map((i) => num(tiers[i], fallback.tierValues[i], 0.01, 100000)) as [number, number, number],
    discountCode: String(o.discountCode ?? "").trim().slice(0, 255),
    wheelSegments: parseWheelSegments(o.wheelSegments, fallback.wheelSegments),
    emailAfter: o.emailAfter === true || o.emailAfter === "true",
    nameField: isNameField(o.nameField) ? o.nameField : fallback.nameField,
    strings,
  };
}

// Min/max popup size in % of the default. Phones get less headroom: the
// popup already spans the screen width there.
export const SIZE_LIMITS = {
  desktop: { min: 70, max: 140 },
  mobile: { min: 70, max: 120 },
} as const;

const HEX = /^#[0-9a-fA-F]{6}$/;
const WHEEL_NEEDS_UNIQUE = "The spin wheel gives each winner their own code: set the discount code type to unique codes.";
const CODE = /^[A-Za-z0-9_-]{1,255}$/;

function num(v: unknown, fallback: number, min: number, max: number) {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export type ValidationErrors = Partial<Record<keyof PopupSettings, string>>;

/** Coerce untrusted input into valid settings; returns field errors for anything the merchant must fix. */
export function parseSettings(input: Record<string, unknown>): {
  settings: PopupSettings;
  errors: ValidationErrors;
} {
  const errors: ValidationErrors = {};
  const d = DEFAULT_SETTINGS;

  const name = String(input.name ?? "").trim().slice(0, 80) || d.name;
  const codeMode = input.codeMode === "unique" ? "unique" : "static";
  const discountCode = String(input.discountCode ?? "").trim();
  // In unique mode the shared code is optional (fallback if Pro lapses).
  if ((codeMode === "static" || discountCode) && !CODE.test(discountCode)) {
    errors.discountCode =
      "Enter the discount code exactly as created in Shopify (letters, numbers, - and _).";
  }

  const discountType = input.discountType === "fixed" ? "fixed" : "percentage";
  const discountValue = num(input.discountValue, 0, 0, 1_000_000);
  if (
    codeMode === "unique" &&
    (discountValue <= 0 || (discountType === "percentage" && discountValue > 100))
  ) {
    errors.discountValue =
      discountType === "percentage"
        ? "Enter a percentage between 1 and 100."
        : "Enter an amount greater than 0.";
  }
  const codePrefix = String(input.codePrefix ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{0,12}$/.test(codePrefix)) {
    errors.codePrefix = "Prefix: up to 12 letters, numbers or dashes.";
  }

  const tiered = codeMode === "unique" && (input.tiered === true || input.tiered === "true");
  const rawTiers = Array.isArray(input.tierValues) ? input.tierValues : d.tierValues;
  const tierValues = [0, 1, 2].map((i) => num(rawTiers[i], d.tierValues[i], 0, 1_000_000)) as [
    number,
    number,
    number,
  ];
  if (
    tiered &&
    tierValues.some((v) => v <= 0 || (discountType === "percentage" && v > 100))
  ) {
    errors.tierValues = "Each tier needs a value greater than 0 (percentages up to 100).";
  }

  const gameType = isGameType(input.gameType) ? input.gameType : "paddle";
  const wheelSegments = parseWheelSegments(input.wheelSegments);
  if (gameType === "wheel") {
    const err = codeMode !== "unique" ? WHEEL_NEEDS_UNIQUE : wheelError(wheelSegments, discountType);
    if (err) errors.wheelSegments = err;
  }

  const consolation = codeMode === "unique" && (input.consolation === true || input.consolation === "true");
  const consolationValue = num(input.consolationValue, d.consolationValue, 0, 1_000_000);
  if (consolation && (consolationValue <= 0 || (discountType === "percentage" && consolationValue > 100))) {
    errors.consolationValue = "The consolation reward needs a value greater than 0 (percentages up to 100).";
  }

  const abEnabled = input.abEnabled === true || input.abEnabled === "true";
  const ab = parseAbVariant(input.ab);
  if (abEnabled) {
    const pct = (v: number) => discountType === "percentage" && v > 100;
    const wheelErr = ab.gameType === "wheel" && (codeMode !== "unique" ? WHEEL_NEEDS_UNIQUE : wheelError(ab.wheelSegments, discountType));
    if (wheelErr) {
      errors.ab = `Variant B: ${wheelErr}`;
    } else if (codeMode === "unique" && (pct(ab.discountValue) || ab.tierValues.some(pct))) {
      errors.ab = "Variant B: percentages must be between 1 and 100.";
    } else if (ab.discountCode && !CODE.test(ab.discountCode)) {
      errors.ab = "Variant B: enter the discount code exactly as created in Shopify (letters, numbers, - and _).";
    }
  }

  const primaryColor = String(input.primaryColor ?? d.primaryColor);
  const accentColor = String(input.accentColor ?? d.accentColor);
  if (!HEX.test(primaryColor)) errors.primaryColor = "Use a hex color like #830522.";
  if (!HEX.test(accentColor)) errors.accentColor = "Use a hex color like #d9caa0.";

  const target = TARGETS.some((t) => t.value === input.target)
    ? String(input.target)
    : d.target;

  const vx = num(input.vx, d.vx, -15, 15);
  const vy = num(input.vy, d.vy, -15, 15);
  if (Math.abs(vx) < 0.5 || Math.abs(vy) < 0.5) {
    errors.vx = "Each ball speed component must be at least 0.5 away from 0.";
  }

  const strings: CustomStrings = {};
  const rawStrings = (input.strings ?? {}) as Record<string, unknown>;
  for (const lang of LANGUAGES) {
    const src = (rawStrings[lang] ?? {}) as Record<string, unknown>;
    const out: Partial<Strings> = {};
    for (const key of STRING_KEYS) {
      const val = typeof src[key] === "string" ? (src[key] as string).trim() : "";
      if (val) out[key] = val.slice(0, 300);
    }
    if (Object.keys(out).length) strings[lang] = out;
  }

  return {
    errors,
    settings: {
      name,
      active: input.active === true || input.active === "true",
      discountCode,
      delaySec: Math.round(num(input.delaySec, d.delaySec, 0, 600)),
      surviveSec: Math.round(num(input.surviveSec, d.surviveSec, 3, 120)),
      vx,
      vy,
      maxAttempts: Math.round(num(input.maxAttempts, d.maxAttempts, 1, 20)),
      primaryColor,
      accentColor,
      sizeDesktop: Math.round(num(input.sizeDesktop, d.sizeDesktop, SIZE_LIMITS.desktop.min, SIZE_LIMITS.desktop.max)),
      sizeMobile: Math.round(num(input.sizeMobile, d.sizeMobile, SIZE_LIMITS.mobile.min, SIZE_LIMITS.mobile.max)),
      target,
      requireConsent: input.requireConsent !== false && input.requireConsent !== "false",
      doubleOptIn: input.doubleOptIn === true || input.doubleOptIn === "true",
      nameField: isNameField(input.nameField) ? input.nameField : "required",
      autoApply: input.autoApply !== false && input.autoApply !== "false",
      codeMode,
      discountType,
      discountValue,
      codePrefix,
      codeExpiryDays: Math.round(num(input.codeExpiryDays, d.codeExpiryDays, 0, 365)),
      gameType,
      difficulty: DIFFICULTIES.some((x) => x.value === input.difficulty)
        ? (input.difficulty as PopupSettings["difficulty"])
        : "medium",
      trigger: input.trigger === "delay" || input.trigger === "exit" ? input.trigger : "both",
      frequency: FREQUENCIES.some((f) => f.value === input.frequency)
        ? (input.frequency as PopupSettings["frequency"])
        : "session",
      teaser: input.teaser !== false && input.teaser !== "false",
      noCart: input.noCart === true || input.noCart === "true",
      saveCode: codeMode === "unique" && (input.saveCode === true || input.saveCode === "true"),
      tiered,
      tierValues,
      urgencyMinutes: Math.round(num(input.urgencyMinutes, 0, 0, 1440)),
      wheelSegments,
      showValue: input.showValue === true || input.showValue === "true",
      consolation,
      consolationValue,
      emailAfter: input.emailAfter === true || input.emailAfter === "true",
      strings,
      abEnabled,
      ab,
    },
  };
}
