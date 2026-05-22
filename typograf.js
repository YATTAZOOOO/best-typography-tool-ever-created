const SERVICE_URL = "http://typograf.artlebedev.ru/webservices/typograf.asmx";
const SOAP_ACTION = "http://typograf.artlebedev.ru/webservices/ProcessText";

const BARE_AMP_RE = /&(?!(?:amp|lt|gt|apos|quot|#\d+|#x[0-9a-fA-F]+);)/g;

export class RemoteTypograf {
  constructor(encoding = "UTF-8") {
    this._encoding = encoding;
    this._entityType = 4;
    this._useBr = 1;
    this._useP = 1;
    this._maxNobr = 3;
  }

  htmlEntities() { this._entityType = 1; }
  xmlEntities() { this._entityType = 2; }
  mixedEntities() { this._entityType = 4; }
  noEntities() { this._entityType = 3; }

  br(value) { this._useBr = value ? 1 : 0; }
  p(value) { this._useP = value ? 1 : 0; }
  nobr(value) { this._maxNobr = value ? value : 0; }

  async processText(text) {
    const escaped = text
      .replace(BARE_AMP_RE, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const body =
      `<?xml version="1.0" encoding="${this._encoding}"?>\n` +
      '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
      'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' +
      'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n' +
      '<soap:Body>\n' +
      ' <ProcessText xmlns="http://typograf.artlebedev.ru/webservices/">\n' +
      `  <text>${escaped}</text>\n` +
      `  <entityType>${this._entityType}</entityType>\n` +
      `  <useBr>${this._useBr}</useBr>\n` +
      `  <useP>${this._useP}</useP>\n` +
      `  <maxNobr>${this._maxNobr}</maxNobr>\n` +
      ' </ProcessText>\n' +
      '</soap:Body>\n' +
      '</soap:Envelope>\n';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch(SERVICE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "SOAPAction": `"${SOAP_ACTION}"`,
        },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`Typograf service returned HTTP ${response.status}`);
    }

    const raw = await response.text();
    const openTag = "<ProcessTextResult>";
    const closeTag = "</ProcessTextResult>";
    const start = raw.indexOf(openTag);
    const end = raw.indexOf(closeTag);
    if (start === -1 || end === -1) {
      throw new Error("Unexpected response from Typograf service");
    }
    const result = raw.slice(start + openTag.length, end);

    return result
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }
}
