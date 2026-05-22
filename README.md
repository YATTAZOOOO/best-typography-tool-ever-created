# Typograf — local

A local web wrapper around the [Art. Lebedev Typograf](https://www.artlebedev.ru/typograf/) web service,
plus one extra rule the upstream service doesn't apply: in English text,
add `&nbsp;` after articles, coordinating conjunctions, and common short
prepositions (`a, an, the, for, and, nor, but, or, yet, so, in, on, at, of, to, by, with, from, as, is`)
so they stay attached to the following word — the same kind of binding
Typograf already does for Russian short words.

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

- `server.js` — HTTP server (Node built-in `http`, no dependencies).
- `typograf.js` — SOAP client for the Art. Lebedev Typograf web service.
- `englishNbsp.js` — English nbsp post-processor. Tag-safe: skips inside `<pre>`, `<code>`, `<script>`, `<style>`.
- `public/index.html` — single-page UI.
