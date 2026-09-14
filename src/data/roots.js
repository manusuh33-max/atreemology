// Atreemology — Root Family data
// Every etymology below reflects standard, well-attested Latin derivations.
// Where a word's history is genuinely disputed or merely a spelling
// coincidence, it is left out rather than implied. See README for sourcing notes.
//
// `tier` follows the roots' own bridging structure, not a subjective sense
// of difficulty (see `difficulty` for that): Beginner is every root that
// forms no compound with another live root — a pure, standalone tree.
// Intermediate is a root that forms exactly one compound with another root
// in this file (e.g. dict + bene -> benediction) — the first roots where a
// learner actually meets a two-root word. Advanced is a root that's a real
// hub, bridging to two or more other roots (bene, graph/gram, spect, and
// especially tele, which alone bridges to four others) — the most
// "complex" roots in the sense that matters here: not that the root's own
// meaning is obscure, but that growing it visibly reshapes more than one
// tree in the forest. See state/selectors.js#allSharedWords /
// sharedWordRootIds for how a compound word's parent roots are found, and
// screens/forest.js for where those compounds render as literal branches
// connecting two trees.
//
// Below the main roots is a small block of *prefix* roots (in-into, ex,
// re, circum, per, retro) — a prototype of decomposing a compound word
// like "inspect" into its true constituent morphemes (in- + spect) rather
// than treating "inspect" as an indivisible connector word on the spect
// tree alone. See the comment above that block for scope and rationale.

/**
 * @typedef {Object} RootFamily
 * @property {string} id
 * @property {string} root            - the bare root, e.g. "scrib/script"
 * @property {string} displayRoot     - short label shown at the root system's convergence point, underground
 * @property {string} meaning         - core meaning of the root
 * @property {string} language        - origin language
 * @property {string} originNote      - one or two sentences of context
 * @property {string} [pronunciation] - rough pronunciation guide
 * @property {string} category        - thematic grouping for the Seed Library
 * @property {1|2|3} difficulty
 * @property {string[]} connectorWordIds
 * @property {string[]} commonWordIds
 * @property {string[]} advancedWordIds
 * @property {{title:string icon:string description:string}} reward
 */

/** @type {RootFamily[]} */
export const ROOTS = [
  {
    id: 'scrib-script',
    tier: 'Beginner',
    root: 'scrib / script',
    displayRoot: 'scrib·script',
    meaning: 'to write',
    language: 'Latin',
    originNote:
      'From the Latin verb scribere ("to write"), past participle scriptus. One of the most productive roots in English — it shows up any time writing, marking, or recording is involved.',
    pronunciation: 'SKRY-buh / SKRIPT',
    category: 'Communication',
    difficulty: 1,
    connectorWordIds: ['scribe', 'script'],
    commonWordIds: ['describe', 'inscribe', 'manuscript', 'subscribe'],
    advancedWordIds: ['circumscribe', 'proscription', 'transcript'],
    reward: {
      title: 'Inkwell Bloom',
      icon: '🪶',
      description:
        'Your scrib·script tree grows quill-shaped leaves that shimmer faintly, like ink still wet on the page.',
    },
  },
  {
    id: 'spect',
    tier: 'Advanced',
    root: 'spect',
    displayRoot: 'spect',
    meaning: 'to look, to watch',
    language: 'Latin',
    originNote:
      'From specere / spectare ("to look at, to watch"). A root about vision and attention — literal sight, and the figurative kind (perspective, respect).',
    pronunciation: 'SPEKT',
    category: 'Perception',
    difficulty: 1,
    connectorWordIds: ['expect', 'inspect'],
    commonWordIds: ['respect', 'spectacle', 'spectator'],
    advancedWordIds: ['circumspect', 'perspective', 'retrospective'],
    reward: {
      title: 'Lookout Lantern',
      icon: '🏮',
      description: 'A lantern-shaped fruit ripens on the branch, glowing softly so your tree can be spotted from across the forest at dusk.',
    },
  },
  {
    id: 'port',
    tier: 'Intermediate',
    root: 'port',
    displayRoot: 'port',
    meaning: 'to carry',
    language: 'Latin',
    originNote:
      'From portare ("to carry"). A road-and-cargo root — think of everything that moves things from one place to another, literally or in an argument.',
    pronunciation: 'PORT',
    category: 'Movement',
    difficulty: 1,
    connectorWordIds: ['transport', 'import'],
    commonWordIds: ['export', 'report', 'support'],
    advancedWordIds: ['portable', 'deport', 'portfolio', 'teleportation'],
    reward: {
      title: "Wanderer's Satchel",
      icon: '🎒',
      description: 'Small satchel-shaped seed pods appear along the trunk, ready to carry seeds to the next patch of forest.',
    },
  },
  {
    id: 'dict',
    tier: 'Intermediate',
    root: 'dict',
    displayRoot: 'dict',
    meaning: 'to say, to speak',
    language: 'Latin',
    originNote:
      'From dicere ("to say"). Governs anything spoken, declared, or written down as an official statement — including one word that also grows on the bene tree.',
    pronunciation: 'DIKT',
    category: 'Communication',
    difficulty: 2,
    connectorWordIds: ['predict', 'dictionary'],
    commonWordIds: ['contradict', 'dictate', 'verdict'],
    advancedWordIds: ['edict', 'indict', 'benediction'],
    reward: {
      title: "Town Crier's Bell",
      icon: '🔔',
      description: 'Bell-shaped flowers open along the branches. Tap one and it gives a small, satisfying chime.',
    },
  },
  {
    id: 'aud',
    tier: 'Beginner',
    root: 'aud',
    displayRoot: 'aud',
    meaning: 'to hear',
    language: 'Latin',
    originNote:
      'From audire ("to hear"). Covers hearing in the literal sense (audio, audible) and the formal sense of "being heard" (an audience, an audit).',
    pronunciation: 'AWD',
    category: 'Perception',
    difficulty: 2,
    connectorWordIds: ['audio', 'audience'],
    commonWordIds: ['audible', 'auditorium', 'audition'],
    advancedWordIds: ['inaudible', 'auditory', 'audit'],
    reward: {
      title: 'Windchime Canopy',
      icon: '🎐',
      description: 'The leaves thin into little windchimes that stir — silently, for you — whenever a breeze passes through the forest.',
    },
  },
  {
    id: 'vid-vis',
    tier: 'Intermediate',
    root: 'vid / vis',
    displayRoot: 'vid·vis',
    meaning: 'to see',
    language: 'Latin',
    originNote:
      'From videre ("to see"), past participle visus. One of the few roots common enough that you already use several of its words every day without a second thought.',
    pronunciation: 'VID / VIZ',
    category: 'Perception',
    difficulty: 1,
    connectorWordIds: ['video', 'visit'],
    commonWordIds: ['vision', 'visible', 'television'],
    advancedWordIds: ['supervise', 'evident', 'revise'],
    reward: {
      title: 'Clearsight Dew',
      icon: '💧',
      description: 'Every leaf holds one perfectly round dewdrop that acts like a tiny lens, sharpening the view of the whole forest.',
    },
  },
  {
    id: 'tract',
    tier: 'Beginner',
    root: 'tract',
    displayRoot: 'tract',
    meaning: 'to pull, to draw',
    language: 'Latin',
    originNote:
      'From trahere ("to pull, to drag"), past participle tractus. A root about force and motion — pulling things toward you, apart, or out.',
    pronunciation: 'TRAKT',
    category: 'Movement',
    difficulty: 2,
    connectorWordIds: ['tractor', 'attract'],
    commonWordIds: ['subtract', 'extract', 'contract'],
    advancedWordIds: ['distract', 'retract', 'protract'],
    reward: {
      title: "Puller's Vine",
      icon: '🪢',
      description: 'A tendril of extra vine grows around the trunk, always leaning and pulling gently toward the brightest patch of sun.',
    },
  },
  {
    id: 'bene',
    tier: 'Advanced',
    root: 'bene',
    displayRoot: 'bene',
    meaning: 'well, good',
    language: 'Latin',
    originNote:
      'From the Latin adverb bene ("well"), related to bonus ("good"). A root of good will and good outcomes — benefit, kindness, blessing.',
    pronunciation: 'BEH-neh',
    category: 'Character',
    difficulty: 2,
    connectorWordIds: ['benefit', 'benign'],
    commonWordIds: ['beneficial', 'benevolent', 'benefactor'],
    advancedWordIds: ['benediction', 'benevolence', 'beneficiary'],
    reward: {
      title: 'Golden Fig of Goodwill',
      icon: '✨',
      description: 'One golden fruit ripens at the crown of the tree — rare, and only ever given, never taken.',
    },
  },

  // ---- The remaining roots, in their original authoring order. Their
  // `tier` field (not their position in this file) is what actually
  // determines Beginner/Intermediate/Advanced grouping — see the note at
  // the top of this file. ----
  {
    id: 'bio',
    tier: 'Intermediate',
    root: 'bio',
    displayRoot: 'bio',
    meaning: 'life',
    language: 'Greek',
    originNote:
      'From bios ("life") in Greek. The root behind every "life science" word — biology, biography, and anything that grows, breathes, or reproduces.',
    pronunciation: 'BY-oh',
    category: 'Life Sciences',
    difficulty: 1,
    connectorWordIds: ['biology', 'biography'],
    commonWordIds: ['biodegradable', 'antibiotic', 'biopsy'],
    advancedWordIds: ['symbiosis', 'biodiversity', 'microbiology'],
    reward: {
      title: 'Sporebright Moss',
      icon: '🍄',
      description: 'A patch of faintly glowing moss spreads at the base of the trunk, alive with its own tiny ecosystem.',
    },
  },
  {
    id: 'chron',
    tier: 'Beginner',
    root: 'chron',
    displayRoot: 'chron',
    meaning: 'time',
    language: 'Greek',
    originNote:
      'From khronos ("time") in Greek. Governs anything about sequence, duration, or when something happens.',
    pronunciation: 'KRON',
    category: 'Time',
    difficulty: 2,
    connectorWordIds: ['chronic', 'chronicle'],
    commonWordIds: ['chronology', 'synchronize', 'chronometer'],
    advancedWordIds: ['anachronism', 'synchronous', 'asynchronous'],
    reward: {
      title: 'Hourglass Sap',
      icon: '⏳',
      description: 'The sap inside this trunk runs in slow, visible grains, like sand through an hourglass.',
    },
  },
  {
    id: 'dem',
    tier: 'Beginner',
    root: 'dem',
    displayRoot: 'dem',
    meaning: 'people',
    language: 'Greek',
    originNote:
      'From demos ("the people, a district") in Greek. The root of anything about populations, the public, or common people.',
    pronunciation: 'DEM',
    category: 'Society',
    difficulty: 2,
    connectorWordIds: ['democracy', 'epidemic'],
    commonWordIds: ['demographic', 'pandemic', 'endemic'],
    advancedWordIds: ['demagogue', 'epidemiology', 'demotic'],
    reward: {
      title: "Town Square Roots",
      icon: '🏛️',
      description: 'The root system fans out into a wide, shared network, like paths through a village square.',
    },
  },
  {
    id: 'phon',
    tier: 'Intermediate',
    root: 'phon',
    displayRoot: 'phon',
    meaning: 'sound, voice',
    language: 'Greek',
    originNote:
      'From phone ("sound, voice") in Greek. Anything about hearing a sound produced, from telephones to symphonies.',
    pronunciation: 'FOHN',
    category: 'Perception',
    difficulty: 2,
    connectorWordIds: ['telephone', 'microphone'],
    commonWordIds: ['symphony', 'phonics', 'saxophone'],
    advancedWordIds: ['cacophony', 'homophone', 'phonetic'],
    reward: {
      title: 'Resonant Bark',
      icon: '🎼',
      description: 'Knock on this trunk and it rings back a clean, musical note.',
    },
  },
  {
    id: 'duc-duct',
    tier: 'Beginner',
    root: 'duc / duct',
    displayRoot: 'duc·duct',
    meaning: 'to lead',
    language: 'Latin',
    originNote:
      'From ducere ("to lead"), past participle ductus, in Latin. A root about guiding, directing, and bringing something into being by leading it there.',
    pronunciation: 'DUKT',
    category: 'Movement',
    difficulty: 2,
    connectorWordIds: ['conduct', 'produce'],
    commonWordIds: ['introduce', 'reduce', 'educate'],
    advancedWordIds: ['aqueduct', 'deduce', 'induction'],
    reward: {
      title: "Channeled Roots",
      icon: '🛤️',
      description: 'The roots below ground braid into a single guided channel, leading water exactly where the tree needs it.',
    },
  },
  {
    id: 'fac-fact',
    tier: 'Intermediate',
    root: 'fac / fact',
    displayRoot: 'fac·fact',
    meaning: 'to make, to do',
    language: 'Latin',
    originNote:
      'From facere ("to make, to do"), past participle factus, in Latin. One of the most productive roots in English for anything built, made, or accomplished.',
    pronunciation: 'FAKT',
    category: 'Creation',
    difficulty: 2,
    connectorWordIds: ['factory', 'fact'],
    commonWordIds: ['manufacture', 'artificial', 'benefit'],
    advancedWordIds: ['efficient', 'deficient', 'facilitate'],
    reward: {
      title: "Workshop Burl",
      icon: '🔨',
      description: 'A smooth, tool-marked burl grows on the trunk, as if it were shaped rather than grown.',
    },
  },

  {
    id: 'graph-gram',
    tier: 'Advanced',
    root: 'graph / gram',
    displayRoot: 'graph·gram',
    meaning: 'to write, to draw',
    language: 'Greek',
    originNote:
      'From graphein ("to write, to draw") and gramma ("that which is written"), both Greek. Covers writing, recording, and drawing of every kind — and overlaps neatly with the Latin scrib·script root.',
    pronunciation: 'GRAF',
    category: 'Communication',
    difficulty: 3,
    connectorWordIds: ['graph', 'autograph'],
    commonWordIds: ['photograph', 'paragraph', 'grammar'],
    advancedWordIds: ['biography', 'telegraph', 'diagram'],
    reward: {
      title: 'Etched Rings',
      icon: '📜',
      description: 'Slice-smooth rings inside the trunk show faint markings, like a diagram of the tree explaining itself.',
    },
  },
  {
    id: 'cred',
    tier: 'Beginner',
    root: 'cred',
    displayRoot: 'cred',
    meaning: 'to believe, to trust',
    language: 'Latin',
    originNote:
      'From credere ("to believe, to trust") in Latin. Anything about belief, trustworthiness, or being worthy of confidence.',
    pronunciation: 'KRED',
    category: 'Character',
    difficulty: 3,
    connectorWordIds: ['credit', 'credible'],
    commonWordIds: ['credentials', 'discredit', 'incredible'],
    advancedWordIds: ['credo', 'creed', 'accreditation'],
    reward: {
      title: 'Steadfast Heartwood',
      icon: '🛡️',
      description: 'The heartwood at the center of the trunk is unusually dense — the part everything else can rely on.',
    },
  },
  {
    id: 'ject',
    tier: 'Beginner',
    root: 'ject',
    displayRoot: 'ject',
    meaning: 'to throw',
    language: 'Latin',
    originNote:
      'From jacere ("to throw"), past participle jactus, in Latin. A root of force and motion, always about sending something outward, inward, or along a path.',
    pronunciation: 'JEKT',
    category: 'Movement',
    difficulty: 3,
    connectorWordIds: ['reject', 'inject'],
    commonWordIds: ['project', 'object', 'eject'],
    advancedWordIds: ['trajectory', 'dejected', 'conjecture'],
    reward: {
      title: 'Seed-Casting Pods',
      icon: '💥',
      description: 'Ripe pods along the branches pop and cast their seeds outward in a small, satisfying burst.',
    },
  },
  {
    id: 'mort',
    tier: 'Beginner',
    root: 'mort',
    displayRoot: 'mort',
    meaning: 'death',
    language: 'Latin',
    originNote:
      'From mors, mortis ("death") in Latin. A sobering root, but a genuinely useful one — it explains words far beyond the obvious.',
    pronunciation: 'MORT',
    category: 'Life & Death',
    difficulty: 3,
    connectorWordIds: ['mortal', 'immortal'],
    commonWordIds: ['mortuary', 'mortify', 'mortgage'],
    advancedWordIds: ['postmortem', 'mortician', 'amortize'],
    reward: {
      title: 'Evergreen Heartwood',
      icon: '🕯️',
      description: "A single branch stays green through every season, refusing to match the rest of the tree's cycle.",
    },
  },
  {
    id: 'struct',
    tier: 'Beginner',
    root: 'struct',
    displayRoot: 'struct',
    meaning: 'to build',
    language: 'Latin',
    originNote:
      'From struere ("to build"), past participle structus, in Latin. The root behind everything assembled, organized, or built up from parts.',
    pronunciation: 'STRUKT',
    category: 'Creation',
    difficulty: 3,
    connectorWordIds: ['construct', 'structure'],
    commonWordIds: ['instruct', 'obstruct', 'destruction'],
    advancedWordIds: ['infrastructure', 'reconstruct', 'superstructure'],
    reward: {
      title: 'Scaffold Branches',
      icon: '🏗️',
      description: 'The branch structure is so orderly it looks scaffolded — built, not grown, and yet very much alive.',
    },
  },
  {
    id: 'tele',
    tier: 'Advanced',
    root: 'tele',
    displayRoot: 'tele',
    meaning: 'far, distant',
    language: 'Greek',
    originNote:
      'From tele ("far off, at a distance") in Greek. Almost always paired with another root — it tells you something is happening across a distance.',
    pronunciation: 'TEL-eh',
    category: 'Distance',
    difficulty: 3,
    connectorWordIds: ['telephone', 'television'],
    commonWordIds: ['telescope', 'telegraph', 'telepathy'],
    advancedWordIds: ['telecommunication', 'teleportation', 'telemetry'],
    reward: {
      title: 'Far-Seeing Canopy',
      icon: '🔭',
      description: "The topmost leaves seem to catch light from farther away than the rest of the forest's canopy.",
    },
  },

  // ---- Prefix roots (prototype) ----------------------------------------
  // A prototype of a deeper decomposition: some "connector" words on other
  // trees aren't themselves indivisible roots — "inspect" is really the
  // bound prefix in- ("into") plus the true root spect ("to look"), the
  // same way "benediction" is bene + dict. Each prefix below gets its own
  // small tree, and the shared word (already listed on spect's own tree)
  // is simply added to that prefix's connectorWordIds too — the exact same
  // bridging mechanism as benediction, no new data concept required. This
  // first pass is scoped to the spect family only (spect -> expect,
  // inspect, respect, circumspect, perspective, retrospective), which is
  // why every prefix here has exactly one connector word and an empty
  // common/advanced tier; a prefix root has no "complex vocabulary" tier
  // of its own in this prototype, only the bridge it forms. Rolling the
  // same decomposition out across the rest of the dataset (export, reduce,
  // inject, and so on) is deliberately left for a future pass — see
  // README.
  {
    id: 'in-into',
    tier: 'Intermediate',
    root: 'in-',
    displayRoot: 'in-',
    meaning: 'into, in, on',
    language: 'Latin',
    originNote:
      'From the Latin preposition in ("into, in, on"), the directional sense. This is a different, older prefix from the negative in-/im- ("not") seen in words like incredible or immortal — same spelling, unrelated history, so it is kept separate rather than merged with it.',
    pronunciation: 'in-',
    category: 'Prefixes',
    difficulty: 2,
    connectorWordIds: ['inspect'],
    commonWordIds: [],
    advancedWordIds: [],
    reward: {
      title: 'Threshold Roots',
      icon: '🚪',
      description: 'A small archway of roots forms at the base of the trunk, marking the point where everything on this tree steps inward.',
    },
  },
  {
    id: 'ex',
    tier: 'Intermediate',
    root: 'ex-',
    displayRoot: 'ex-',
    meaning: 'out, out of',
    language: 'Latin',
    originNote:
      'From the Latin preposition ex ("out, out of"). Marks something moving, being sent, or being brought out of somewhere.',
    pronunciation: 'eks-',
    category: 'Prefixes',
    difficulty: 2,
    connectorWordIds: ['expect'],
    commonWordIds: [],
    advancedWordIds: [],
    reward: {
      title: 'Outbound Bud',
      icon: '🌬️',
      description: 'A cluster of wind-carried seeds forms at the tips of the branches, always ready to be sent outward.',
    },
  },
  {
    id: 're',
    tier: 'Intermediate',
    root: 're-',
    displayRoot: 're-',
    meaning: 'back, again',
    language: 'Latin',
    originNote:
      'From the Latin prefix re- ("back, again"). One of the most productive prefixes in English — repetition, or a return to an earlier state or position.',
    pronunciation: 'ree-',
    category: 'Prefixes',
    difficulty: 2,
    connectorWordIds: ['respect'],
    commonWordIds: [],
    advancedWordIds: [],
    reward: {
      title: 'Echoing Ring',
      icon: '🔁',
      description: 'A faint second ring appears inside every growth ring of the trunk, as if the tree remembers doing this before.',
    },
  },
  {
    id: 'circum',
    tier: 'Intermediate',
    root: 'circum-',
    displayRoot: 'circum-',
    meaning: 'around, about',
    language: 'Latin',
    originNote:
      'From the Latin preposition circum ("around, about"). A directional prefix for anything that surrounds, or moves around, its target.',
    pronunciation: 'SUR-kum-',
    category: 'Prefixes',
    difficulty: 2,
    connectorWordIds: ['circumspect'],
    commonWordIds: [],
    advancedWordIds: [],
    reward: {
      title: 'Encircling Vine',
      icon: '🌀',
      description: 'A single vine spirals all the way around the trunk without ever crossing itself.',
    },
  },
  {
    id: 'per',
    tier: 'Intermediate',
    root: 'per-',
    displayRoot: 'per-',
    meaning: 'through, thoroughly',
    language: 'Latin',
    originNote:
      'From the Latin preposition per ("through, thoroughly"). Marks something happening all the way through, or done completely.',
    pronunciation: 'per-',
    category: 'Prefixes',
    difficulty: 2,
    connectorWordIds: ['perspective'],
    commonWordIds: [],
    advancedWordIds: [],
    reward: {
      title: 'Sunbeam Channel',
      icon: '🔆',
      description: 'A shaft of light seems to pass clean through the canopy to the roots below, undimmed the whole way.',
    },
  },
  {
    id: 'retro',
    tier: 'Intermediate',
    root: 'retro-',
    displayRoot: 'retro-',
    meaning: 'backward, behind',
    language: 'Latin',
    originNote:
      'From the Latin adverb retro ("backward, behind"). A prefix of reversal — looking or moving back toward an earlier point.',
    pronunciation: 'RET-roh-',
    category: 'Prefixes',
    difficulty: 2,
    connectorWordIds: ['retrospective'],
    commonWordIds: [],
    advancedWordIds: [],
    reward: {
      title: 'Backward Ring',
      icon: '⏮️',
      description: 'One growth ring near the center curls the wrong way, as if briefly growing back toward the seed it started from.',
    },
  },
];

export const ROOTS_BY_ID = Object.fromEntries(ROOTS.map((r) => [r.id, r]));

export function getRoot(id) {
  return ROOTS_BY_ID[id];
}

/** All word ids that belong to a root, in learning order. */
export function rootWordOrder(root) {
  return [...root.connectorWordIds, ...root.commonWordIds, ...root.advancedWordIds];
}
