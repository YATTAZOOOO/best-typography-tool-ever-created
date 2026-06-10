// Quote protection.
//
// The remote Typograf service rewrites quotes (e.g. straight "…" -> «…», and
// it even HTML-decodes entity-encoded quotes like &ldquo; before doing so).
// We want every quote the user typed to come back exactly as-is, so before
// sending text to the service we swap each quote *token* for a private-use
// placeholder the service won't touch, and after processing we swap it back.
//
// A quote token is a literal quote character, a named quote entity, or a
// numeric (&#NN; / &#xNN;) entity whose code point is a quote. Each is
// preserved byte-for-byte.
//
// Placeholders are single U+E000-based Private Use Area characters: they are
// not &/</> (so they survive the SOAP XML escaping in typograf.js), they are
// not word characters (so they don't disturb the \b-based regexes in
// englishTypography.js), and being a single char with no digits the service's
// number typography can't mangle them.

// Literal quote characters and their code points.
const QUOTE_CHARS = [
  '"', // U+0022 quotation mark (straight double)
  "'", // U+0027 apostrophe (straight single)
  "«", "»", // U+00AB/00BB guillemets
  "“", "”", // U+201C/201D curly double
  "„", "‟", // U+201E/201F low/high reversed double
  "‘", "’", // U+2018/2019 curly single
  "‚", "‛", // U+201A/201B low/high reversed single
  "‹", "›", // U+2039/203A single guillemets
];
const QUOTE_CODEPOINTS = new Set(QUOTE_CHARS.map((c) => c.codePointAt(0)));

// Named HTML entities that resolve to a quote character.
const NAMED_QUOTE_ENTITIES = [
  "quot", "apos", "laquo", "raquo", "ldquo", "rdquo",
  "lsquo", "rsquo", "bdquo", "sbquo", "lsaquo", "rsaquo",
];

// One regex matching any quote token: a literal quote char, a named quote
// entity, or any numeric entity (membership checked in the callback).
const QUOTE_TOKEN_RE = new RegExp(
  "[" + QUOTE_CHARS.join("") + "]" +
    "|&(?:" + NAMED_QUOTE_ENTITIES.join("|") + ");" +
    "|&#\\d+;|&#x[0-9a-fA-F]+;",
  "g",
);

// Placeholders live in the Private Use Area, starting here.
const PLACEHOLDER_BASE = 0xe000;
const PLACEHOLDER_RE = /[-]/g;

// True if a matched token is a quote we should protect. Literal chars and named
// entities always are; numeric entities only when their code point is a quote.
function isQuoteToken(token) {
  if (!token.startsWith("&#")) return true; // literal char or named quote entity
  const hex = token[2] === "x" || token[2] === "X";
  const cp = parseInt(token.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
  return QUOTE_CODEPOINTS.has(cp);
}

// Replace each quote token with a unique placeholder. Returns the protected
// text plus a reverse map (placeholder -> original token) for restoreQuotes.
export function protectQuotes(text) {
  const toPlaceholder = new Map(); // token -> placeholder
  const reverse = new Map(); // placeholder -> token
  const protectedText = text.replace(QUOTE_TOKEN_RE, (token) => {
    if (!isQuoteToken(token)) return token; // non-quote numeric entity: leave it
    let ph = toPlaceholder.get(token);
    if (ph === undefined) {
      ph = String.fromCharCode(PLACEHOLDER_BASE + toPlaceholder.size);
      toPlaceholder.set(token, ph);
      reverse.set(ph, token);
    }
    return ph;
  });
  return [protectedText, reverse];
}

// Replace each placeholder back to its exact original quote token.
export function restoreQuotes(text, reverse) {
  if (!reverse || reverse.size === 0) return text;
  return text.replace(PLACEHOLDER_RE, (ph) =>
    reverse.has(ph) ? reverse.get(ph) : ph,
  );
}
