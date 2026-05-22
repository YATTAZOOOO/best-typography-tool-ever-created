const SHORT_WORDS = [
  "a", "an", "the",
  "for", "and", "nor", "but", "or", "yet", "so",
  "in", "on", "at", "of", "to", "by", "with", "from", "as", "is",
];

const WORD_RE = new RegExp(`\\b(${SHORT_WORDS.join("|")})\\b( +)`, "gi");
const TAG_SPLIT_RE = /(<[^>]+>)/;
const TAG_NAME_RE = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)/;
const SKIP_TAGS = new Set(["pre", "code", "script", "style"]);

function bind(text) {
  return text.replace(WORD_RE, (_match, word) => `${word}&nbsp;`);
}

export function addEnglishNbsp(html) {
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
      out.push(skipDepth > 0 ? part : bind(part));
    }
  }
  return out.join("");
}
