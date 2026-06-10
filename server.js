import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname, sep } from "node:path";

import { RemoteTypograf } from "./typograf.js";
import { applyEnglishTypography } from "./englishTypography.js";
import { highlightChanges } from "./highlight.js";
import { protectQuotes, restoreQuotes } from "./quotes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const PORT = parseInt(process.env.PORT ?? "5050", 10);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleProcess(req, res) {
  const raw = await readBody(req);
  let payload = {};
  if (raw) {
    try { payload = JSON.parse(raw); } catch { payload = {}; }
  }

  const text = typeof payload.text === "string" ? payload.text : "";

  const rt = new RemoteTypograf();
  const entityType = parseInt(payload.entityType ?? 1, 10);
  if (entityType === 1) rt.htmlEntities();
  else if (entityType === 2) rt.xmlEntities();
  else if (entityType === 3) rt.noEntities();
  else rt.mixedEntities();

  rt.br(payload.useBr ?? false);
  rt.p(payload.useP ?? false);
  rt.nobr(parseInt(payload.maxNobr ?? 3, 10));

  const [protectedText, restoreMap] = protectQuotes(text);

  let result;
  try {
    result = await rt.processText(protectedText);
  } catch (exc) {
    sendJson(res, 502, { error: exc.message });
    return;
  }

  result = applyEnglishTypography(result);

  // Restore quotes after highlighting, so placeholders (plain text to
  // highlightChanges) keep the user's quotes out of the change markup.
  const preview = restoreQuotes(highlightChanges(result), restoreMap);
  result = restoreQuotes(result, restoreMap);

  sendJson(res, 200, { result, preview });
}

async function handleStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = normalize(join(PUBLIC_DIR, urlPath));
  // Keep requests inside PUBLIC_DIR (no path traversal).
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + sep)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  let data;
  try {
    data = await readFile(filePath);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream",
    "Content-Length": data.length,
  });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/process") {
      await handleProcess(req, res);
    } else if (req.method === "GET") {
      await handleStatic(req, res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Typograf running at http://localhost:${PORT}`);
});
