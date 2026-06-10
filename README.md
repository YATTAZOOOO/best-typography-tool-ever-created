# Typograf — local

A local web wrapper around the [Art. Lebedev Typograf](https://www.artlebedev.ru/typograf/) web service,
plus a set of English line-breaking rules the upstream service doesn't apply,
quotes preserved exactly as you typed them, and a preview that highlights what changed.

## English line-breaking rules

After the upstream service runs, English text is post-processed to insert
`&nbsp;` so short words aren't stranded at the end of a line. These rules are
**always on**. They are applied to text only — content inside `<pre>`,
`<code>`, `<script>` and `<style>` is left untouched.

- **Prepositions** — simple prepositions (`at, by, in, of, on, to, up, for, from, off, out, with, as`)
  bind to the following word; single-word and compound complex prepositions
  (`about, above, across, …, according to, in front of, on top of, …`) are kept
  together and tied to the following word.
- **Conjunctions** — simple conjunctions (`and, but, or, nor, for, yet, so, as, if`)
  bind to the following word; compound/complex conjunctions
  (`because, although, …, even though, as soon as, in order that, …`) are kept whole.
- **Particles** — simple particles (`up, down, off, out, back, on, in, away, over, through`)
  bind to the **preceding** word (the verb), e.g. `give&nbsp;up`.
- **Fixed expressions** (`right away, at once, as well, kind of, sort of, …`) are
  kept together but stay breakable after the phrase.

Note: HTML's only widely-supported non-break primitive is `&nbsp;`, so the
spec's *mandatory* ("must not end a line") and *preferable* ("better to carry
over") rules both render as a non-breaking space. Words that are both a
preposition and a particle (`up, on, in, off, out`) may bind on both sides
(e.g. `give&nbsp;up&nbsp;the`) — this is intentional.

## Quotes

Quotes are left **exactly as you typed them**. Whatever quote characters appear
in the input — straight `"` / `'`, guillemets `«»`, curly `“” ‘’`, low/high
`„‟ ‚‛`, single guillemets `‹›` — come back unchanged; the upstream service is
never given a chance to rewrite them (e.g. `"…"` is *not* turned into `«…»`).
This also means straight apostrophes stay straight (`don't`, not `don’t`).

## Highlight changes

The **Result (HTML)** pane shows the raw HTML you can copy. The **Preview**
pane renders it, and — with the *Highlight changes* switch on (default) — wraps
the typographic characters Typograf inserted (`&nbsp;`, dashes, ellipses,
`©/®/™`, `×`, `−`, …) in a pink highlight so you can see exactly what changed.
Quotes are preserved as-is, so they are never highlighted. Toggling the switch
re-renders the stored result without a re-request.

## Defaults

On launch: **HTML** entities are selected, and the `<p>` / `<br>` wrapping
options are **off**.

## Run

Requires Node.js 18 or newer (for the built-in `fetch`). No npm install needed.

```
node server.js
```

or

```
npm start
```

Then open http://localhost:5050.

To use a different port (e.g. if 5050 is taken):

```
PORT=8080 node server.js
```

On Windows PowerShell:

```
$env:PORT=8080; node server.js
```

Note: on macOS, port 5000 is reserved by AirPlay Receiver, which is why the
default here is 5050.

## Files

- `server.js` — HTTP server (Node built-in `http`, no dependencies). Serves the
  static files in `public/` and handles `POST /process`.
- `typograf.js` — SOAP client for the Art. Lebedev Typograf web service.
- `quotes.js` — hides quotes from the service and restores them, so they're kept verbatim.
- `englishTypography.js` — English line-breaking post-processor. Tag-safe: skips inside `<pre>`, `<code>`, `<script>`, `<style>`.
- `highlight.js` — wraps inserted typographic characters in `<mark>` for the preview.
- `public/index.html` — page markup.
- `public/styles.css` — styles.
- `public/app.js` — client-side logic.
