// Quiz CV — reportes de problemas nas perguntas.
// Colar numa Google Sheet (Extensões → Apps Script) e implementar como Web app
// (Execute as: Me · Who has access: Anyone). Pôr o URL /exec em config.js.
// Cada reporte entra na folha «reportes» como «pendente»; a revisão é manual.
// Contador público: POST {acao:"jogo", modo:"normal"|"kids"} soma 1 pessoa (o site só envia
// uma vez por browser e por versão); GET ?acao=contador devolve {ok, normal, kids}.
// Os totais ficam na folha «contador» (B2 = normal, B3 = crianças) e podem ser corrigidos à mão.

const MOTIVOS = ["certa", "outra", "pergunta", "fonte", "traducao", "ofensivo"];
const LIMITE_HORA = 30; // reportes por pergunta por hora
const LIMITE_JOGOS_HORA = 3000; // novas pessoas por hora, no total (trava abusos)

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.acao === "contador") {
    try { return json_(Object.assign({ ok: true }, conta_())); } catch (err) { return json_({ ok: false, erro: "interno" }); }
  }
  return json_({ ok: false, erro: "acao" });
}

function conta_() {
  const c = CacheService.getScriptCache(), v = c.get("conta");
  if (v) return JSON.parse(v);
  const r = folhaConta_().getRange("B2:B3").getValues();
  const o = { normal: Number(r[0][0]) || 0, kids: Number(r[1][0]) || 0 };
  c.put("conta", JSON.stringify(o), 60);
  return o;
}

function jogo_(d) {
  const modo = d.modo === "kids" ? "kids" : "normal";
  const cache = CacheService.getScriptCache(), n = Number(cache.get("jogos_h") || 0);
  if (n >= LIMITE_JOGOS_HORA) return json_(Object.assign({ ok: false, erro: "limite" }, conta_()));
  cache.put("jogos_h", String(n + 1), 3600);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cel = folhaConta_().getRange(modo === "kids" ? "B3" : "B2");
    cel.setValue((Number(cel.getValue()) || 0) + 1);
    SpreadsheetApp.flush();
    cache.remove("conta");
  } finally { lock.releaseLock(); }
  return json_(Object.assign({ ok: true }, conta_()));
}

function folhaConta_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("contador");
  if (!sh) {
    sh = ss.insertSheet("contador");
    sh.getRange("A1:B3").setValues([["versao", "pessoas"], ["normal", 0], ["kids", 0]]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    if (d.acao === "jogo") return jogo_(d);
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
