// Quote protection.
//
// The remote Typograf service rewrites quotes (e.g. straight "…" -> «…»).
// We want every quote the user typed to come back exactly as-is, so before
// sending text to the service we swap each quote character for a private-use
// placeholder the service won't touch, and after processing we swap it back.
//
// Placeholders are U+E000-based Private Use Area characters: they are not
// &/</> (so they survive the SOAP XML escaping in typograf.js) and are not
// word characters (so they don't disturb the \b-based regexes in
// englishTypography.js).

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

const PLACEHOLDER_BASE = 0xe000;

const toPlaceholder = new Map();
const fromPlaceholder = new Map();
QUOTE_CHARS.forEach((ch, i) => {
  const ph = String.fromCharCode(PLACEHOLDER_BASE + i);
  toPlaceholder.set(ch, ph);
  fromPlaceholder.set(ph, ch);
});

const QUOTE_RE = new RegExp(`[${QUOTE_CHARS.join("")}]`, "g");
const PLACEHOLDER_RE = new RegExp(
  `[${String.fromCharCode(PLACEHOLDER_BASE)}-${String.fromCharCode(
    PLACEHOLDER_BASE + QUOTE_CHARS.length - 1,
  )}]`,
  "g",
);

// Replace each quote character with its placeholder.
export function protectQuotes(text) {
  return text.replace(QUOTE_RE, (ch) => toPlaceholder.get(ch));
}

// Replace each placeholder back to its original quote character.
export function restoreQuotes(text) {
  return text.replace(PLACEHOLDER_RE, (ph) => fromPlaceholder.get(ph));
}
