// Wraps the typographic changes in a processed HTML string with
// <mark class="tg-change"> so the preview can show what Typograf inserted.
//
// Typograf's job is to replace ordinary characters with typographic ones:
// non-breaking spaces, em/en dashes, guillemets, curly quotes, ellipses,
// (c)/(r)/(tm) etc. With HTML entities enabled these all surface as named
// entities; with other modes some surface as literal glyphs. We mark both.
// This is O(n), dependency-free, and never wraps a tag, so the output stays
// valid HTML.

const ENTITY_RE = /^&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/;

// Literal typographic glyphs Typograf may emit (entity modes aside).
const GLYPHS = new Set([
  " ", // nbsp
  " ", // thin space
  " ", // narrow nbsp
  "—", // — em dash
  "–", // – en dash
  "«", "»", // « »
  "“", "”", "„", // “ ” „
  "‘", "’", // ‘ ’
  "…", // … ellipsis
  "©", "®", "™", // © ® ™
  "×", // × multiplication sign
  "−", // − minus sign
]);

export function highlightChanges(html) {
  const out = [];
  let mark = ""; // buffer of consecutive changed tokens
  const flush = () => {
    if (mark) {
      out.push(`<mark class="tg-change">${mark}</mark>`);
      mark = "";
    }
  };

  let i = 0;
  while (i < html.length) {
    const ch = html[i];

    // Tags pass through verbatim and break any open highlight run.
    if (ch === "<") {
      const end = html.indexOf(">", i);
      if (end !== -1) {
        flush();
        out.push(html.slice(i, end + 1));
        i = end + 1;
        continue;
      }
    }

    // HTML entities — typographic ones are the change we highlight.
    if (ch === "&") {
      const m = html.slice(i).match(ENTITY_RE);
      if (m) {
        mark += m[0];
        i += m[0].length;
        continue;
      }
    }

    // Literal typographic glyphs.
    if (GLYPHS.has(ch)) {
      mark += ch;
      i += 1;
      continue;
    }

    // Ordinary text.
    flush();
    out.push(ch);
    i += 1;
  }
  flush();
  return out.join("");
}
