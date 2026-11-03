// Quiz CV — reportes de problemas nas perguntas.
// Colar numa Google Sheet (Extensões → Apps Script) e implementar como Web app
// (Execute as: Me · Who has access: Anyone). Pôr o URL /exec em config.js.
// Cada reporte entra na folha «reportes» como «pendente»; a revisão é manual.

const MOTIVOS = ["certa", "outra", "pergunta", "fonte", "traducao", "ofensivo"];
const LIMITE_HORA = 30; // reportes por pergunta por hora

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    const id = String(d.id || "");
    if (!/^[bh][a-z0-9]{1,14}$/.test(id)) return json_({ ok: false, erro: "id" });
    const motivos = (Array.isArray(d.motivos) ? d.motivos : []).map(String).filter((m) => MOTIVOS.indexOf(m) >= 0);
    if (!motivos.length) return json_({ ok: false, erro: "motivos" });
    const lang = d.lang === "en" ? "en" : "pt";

    const cache = CacheService.getScriptCache(), k = "rep_" + id, n = Number(cache.get(k) || 0);
    if (n >= LIMITE_HORA) return json_({ ok: false, erro: "limite" });
    cache.put(k, String(n + 1), 3600);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName("reportes") || criar_(ss);
    sh.appendRow([new Date(), id, motivos.join(", "), lang, "pendente"]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, erro: "interno" });
  }
}

function criar_(ss) {
  const sh = ss.insertSheet("reportes");
  sh.appendRow(["data", "id", "motivos", "lingua", "estado"]);
  sh.setFrozenRows(1);
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
