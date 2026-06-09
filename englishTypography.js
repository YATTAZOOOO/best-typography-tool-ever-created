// English line-breaking rules.
//
// Inserts &nbsp; so that short prepositions, conjunctions, particles and
// fixed expressions are not stranded at the end of a line (or split across
// lines). HTML has only one widely-supported non-break primitive (&nbsp;),
// so the spec's "mandatory" and "preferable" rules both collapse to it —
// the desired outcome (keep words together / carry them over) points the
// same direction in every case.
//
// Passes are applied, in order, only to text outside markup:
//   A. multi-word phrases (longest first)
//   B. single-word forward binders  (bind to the FOLLOWING word)
//   C. backward-binding particles    (bind to the PRECEDING word)

const TAG_SPLIT_RE = /(<[^>]+>)/;
const TAG_NAME_RE = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)/;
const SKIP_TAGS = new Set(["pre", "code", "script", "style"]);

// ---- Pass A: multi-word phrases ----------------------------------------

// Forward-binding phrases: glue the phrase together AND tie it to the
// following word (when one follows).
const FORWARD_PHRASES = [
  // compound prepositions
  "according to", "because of", "due to", "instead of",
  "in front of", "in spite of", "on top of",
  // compound conjunctions
  "even though", "even if", "as soon as", "so that",
  "in order that", "provided that",
];

// Fixed expressions: glue the phrase together, but leave the following
// space breakable.
const FIXED_PHRASES = [
  "right away", "at once", "by chance", "for sure", "on time",
  "in vain", "as well", "kind of", "sort of",
];

// ---- Pass B: single-word forward binders -------------------------------

const FORWARD_WORDS = [
  // simple prepositions (mandatory)
  "at", "by", "in", "of", "on", "to", "up", "for", "from", "off", "out", "with", "as",
  // simple conjunctions (mandatory) — for/as/so handled once below
  "and", "but", "or", "nor", "yet", "so", "if",
  // single-word complex prepositions (preferable)
  "about", "above", "across", "along", "among", "around", "before", "behind",
  "below", "beneath", "beside", "between", "beyond", "inside", "outside",
  "without", "within",
  // single-word complex conjunctions (preferable)
  "because", "although", "since", "unless", "whereas", "while",
];

// ---- Pass C: backward-binding particles --------------------------------

const PARTICLES = [
  "up", "down", "off", "out", "back", "on", "in", "away", "over", "through",
];

// ---- Rule compilation --------------------------------------------------

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Compile one phrase into a {re, replacement} rule. Tokens are matched
// case-insensitively and original case is preserved via backreferences.
function buildPhraseRule(phrase, forward) {
  const tokens = phrase.split(/\s+/).map(escapeRe);
  const n = tokens.length;
  // Tokens may already be separated by an upstream-inserted &nbsp; (the
  // service binds short words on its own), so accept either separator and
  // normalise them all to &nbsp;.
  let pattern = "\\b(" + tokens.join(")(?:\\s|&nbsp;)+(") + ")\\b";
  if (forward) {
    // Optionally consume the trailing space so the phrase ties to the next
    // word — but only when a real word follows.
    pattern += "(?:( +)(?=[A-Za-z]))?";
  }
  const re = new RegExp(pattern, "gi");
  const replacement = (...args) => {
    const groups = args.slice(1, 1 + n);
    let res = groups.join("&nbsp;");
    if (forward && args[1 + n]) res += "&nbsp;"; // trailing space matched
    return res;
  };
  return { re, replacement };
}

const PHRASE_RULES = [
  ...FORWARD_PHRASES.map((phrase) => ({ phrase, forward: true })),
  ...FIXED_PHRASES.map((phrase) => ({ phrase, forward: false })),
]
  .sort((a, b) => b.phrase.split(/\s+/).length - a.phrase.split(/\s+/).length)
  .map(({ phrase, forward }) => buildPhraseRule(phrase, forward));

// Forward words: alternation sorted longest-first; skip a word that is
// already glued to its left (e.g. the tail of a fixed expression) so we
// don't undo "leave the following space breakable".
const FORWARD_ALT = [...FORWARD_WORDS].sort((a, b) => b.length - a.length).map(escapeRe).join("|");
const FORWARD_WORDS_RE = new RegExp(`(?<!&nbsp;)\\b(${FORWARD_ALT})( +)(?=[A-Za-z])`, "gi");

const PARTICLE_ALT = [...PARTICLES].sort((a, b) => b.length - a.length).map(escapeRe).join("|");
const PARTICLES_RE = new RegExp(`\\b(\\w[\\w-]*)( +)(${PARTICLE_ALT})\\b`, "gi");

function transform(text) {
  let out = text;
  for (const { re, replacement } of PHRASE_RULES) {
    out = out.replace(re, replacement);
  }
  out = out.replace(FORWARD_WORDS_RE, (_m, word) => `${word}&nbsp;`);
  out = out.replace(PARTICLES_RE, (_m, prev, _sp, particle) => `${prev}&nbsp;${particle}`);
  return out;
}

// Apply the rules to HTML, leaving tags and the contents of
// <pre>/<code>/<script>/<style> untouched.
export function applyEnglishTypography(html) {
  const parts = html.split(TAG_SPLIT_RE);
  let skipDepth = 0;
  const out = [];
  for (const part of parts) {
    if (part.startsWith("<") && part.endsWith(">")) {
      const m = part.match(TAG_NAME_RE);
      if (m) {
        const closing = m[1];
        const name = m[2].toLowerCase();
        if (SKIP_TAGS.has(name)) {
          if (closing) skipDepth = Math.max(0, skipDepth - 1);
          else skipDepth += 1;
        }
      }
      out.push(part);
    } else {
      out.push(skipDepth > 0 ? part : transform(part));
    }
  }
  return out.join("");
}
