import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { RemoteTypograf } from "./typograf.js";
import { addEnglishNbsp } from "./englishNbsp.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(__dirname, "public", "index.html");
const PORT = parseInt(process.env.PORT ?? "5050", 10);

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
  const entityType = parseInt(payload.entityType ?? 4, 10);
  if (entityType === 1) rt.htmlEntities();
  else if (entityType === 2) rt.xmlEntities();
  else if (entityType === 3) rt.noEntities();
  else rt.mixedEntities();

  rt.br(payload.useBr ?? true);
  rt.p(payload.useP ?? true);
  rt.nobr(parseInt(payload.maxNobr ?? 3, 10));

  let result;
  try {
    result = await rt.processText(text);
  } catch (exc) {
    sendJson(res, 502, { error: exc.message });
    return;
  }

  if (payload.englishNbsp ?? true) {
    result = addEnglishNbsp(result);
  }

  sendJson(res, 200, { result });
}

async function handleIndex(_req, res) {
  const html = await readFile(INDEX_PATH);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": html.length,
  });
  res.end(html);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      await handleIndex(req, res);
    } else if (req.method === "POST" && req.url === "/process") {
      await handleProcess(req, res);
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
