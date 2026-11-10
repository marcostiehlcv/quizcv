// Quiz CV — reportes de problemas nas perguntas.
// Colar numa Google Sheet (Extensões → Apps Script) e implementar como Web app
// (Execute as: Me · Who has access: Anyone). Pôr o URL /exec em config.js.
// Cada reporte entra na folha «reportes» como «pendente»; a revisão é manual.
// Contador público: POST {acao:"jogo", modo:"normal"|"kids"} soma 1 jogo (o site envia
// um por cada ronda começada); GET ?acao=contador devolve {ok, normal, kids}.
// Os totais ficam na folha «contador» (B2 = normal, B3 = crianças) e podem ser corrigidos à mão.
// Ranking (só versão normal, sem dados pessoais): POST {acao:"inicio"} devolve um token de ronda;
// POST {acao:"pontos", token, jogador, nome, pontos} guarda o melhor resultado da semana desse jogador
// (o site envia sozinho no fim de cada ronda); POST {acao:"nome", jogador, nome} muda o nome em todas as linhas dele;
// GET ?acao=ranking&eu=<id> devolve o top 10 da semana, o de sempre e o total acumulado (e «meu» / «meuTotal» = a minha posição, se ficar fora do top 10). O nome é gerado pelo jogo a partir
// de ANIMAIS + ILHAS_N (iguais às do index.html) e o servidor recusa qualquer outro texto.
// Folha «ranking»: data | jogador (id aleatório do browser) | nome | pontos | semana. Uma linha pode ser apagada à mão.
// Folha «totais»: jogador | nome | total | rondas | data — uma linha por jogador, soma de todas as rondas (nunca é limpa).

const MOTIVOS = ["certa", "outra", "pergunta", "fonte", "traducao", "ofensivo"];
const LIMITE_HORA = 30; // reportes por pergunta por hora
const LIMITE_JOGOS_HORA = 3000; // jogos por hora, no total (trava abusos)
// ranking — listas iguais às do index.html (ANIMAIS / ILHAS_N); se mudarem, mudar nos dois sítios
const ANIMAIS = ["Cagarra", "Tartaruga", "Baleia", "Garoupa", "Golfinho", "Tubarão", "Calhandra", "Lagosta", "Polvo", "Garça", "Falcão", "Lagartixa", "Moreia", "Atum"];
const ILHAS_N = ["de Santo Antão", "de São Vicente", "de Santa Luzia", "de São Nicolau", "do Sal", "da Boa Vista", "do Maio", "de Santiago", "do Fogo", "da Brava"];
const RANK_MAX = 600;          // 5×10 + 5×20 + 5×30 + 15×20 de bónus
const RANK_MIN_MS = 60000;     // uma ronda verdadeira demora mais de 1 minuto
const RANK_TOKEN_S = 2700;     // o token da ronda vale 45 minutos
const RANK_JOGADOR_HORA = 20;  // envios por jogador por hora
const RANK_INICIOS_HORA = 6000;
const RANK_TOP = 10;
const RANK_SEMANAS = 8;        // linhas mais antigas (fora do top de sempre) são apagadas

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.acao === "ranking") {
    try { return json_(Object.assign({ ok: true }, ranking_(String(p.eu || "")))); } catch (err) { return json_({ ok: false, erro: "interno" }); }
  }
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
    if (d.acao === "inicio") return inicio_();
    if (d.acao === "pontos") return pontos_(d);
    if (d.acao === "nome") return nome_(d);
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

// ── ranking ──
// nome = animal + ilha + 2 dígitos, tudo junto (ex.: TartarugaDoFogo10), como no novoNome() do index.html
function junta_(a, i) {
  return a + i.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}
function nomeValido_(n) {
  const m = /^(.+)(\d{2})$/.exec(String(n || ""));
  if (!m) return false;
  for (let a = 0; a < ANIMAIS.length; a++) for (let i = 0; i < ILHAS_N.length; i++) if (junta_(ANIMAIS[a], ILHAS_N[i]) === m[1]) return true;
  return false;
}

// semana ISO (segunda a domingo) na hora de Cabo Verde (UTC−1), ex.: "2026-W46"
function semana_(d) {
  const t = new Date(d.getTime() - 3600000);
  const u = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
  const dia = u.getUTCDay() || 7;
  u.setUTCDate(u.getUTCDate() + 4 - dia);
  const y = u.getUTCFullYear(), w = Math.ceil(((u - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return y + "-W" + (w < 10 ? "0" : "") + w;
}

// valida um envio de pontos; devolve "" se estiver bem ou o código do erro
function validaPontos_(d, inicioMs, agoraMs) {
  if (!inicioMs) return "token";
  if (agoraMs - inicioMs < RANK_MIN_MS) return "rapido";
  if (!/^[a-f0-9]{16}$/.test(String(d.jogador || ""))) return "jogador";
  if (!nomeValido_(d.nome)) return "nome";
  const p = d.pontos;
  if (typeof p !== "number" || p !== Math.floor(p) || p < 0 || p > RANK_MAX) return "pontos";
  return "";
}

function inicio_() {
  const cache = CacheService.getScriptCache(), n = Number(cache.get("inicios_h") || 0);
  if (n >= RANK_INICIOS_HORA) return json_({ ok: false, erro: "limite" });
  cache.put("inicios_h", String(n + 1), 3600);
  const token = Utilities.getUuid().replace(/-/g, "");
  cache.put("tk_" + token, String(Date.now()), RANK_TOKEN_S);
  return json_({ ok: true, token: token });
}

function pontos_(d) {
  const cache = CacheService.getScriptCache();
  const token = String(d.token || "").replace(/[^a-f0-9]/g, "").slice(0, 40);
  const ini = token ? Number(cache.get("tk_" + token) || 0) : 0;
  if (ini) cache.remove("tk_" + token); // cada token só serve uma vez
  const erro = validaPontos_(d, ini, Date.now());
  if (erro) return json_({ ok: false, erro: erro });
  const kj = "rk_" + d.jogador, nj = Number(cache.get(kj) || 0);
  if (nj >= RANK_JOGADOR_HORA) return json_({ ok: false, erro: "limite" });
  cache.put(kj, String(nj + 1), 3600);

  const sem = semana_(new Date());
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let melhor = d.pontos;
  try {
    const sh = folhaRank_(), n = sh.getLastRow() - 1;
    const rows = n > 0 ? sh.getRange(2, 1, n, 5).getValues() : [];
    let linha = -1;
    rows.forEach((r, i) => {
      if (String(r[1]) !== d.jogador) return;
      if (r[2] !== d.nome) sh.getRange(i + 2, 3).setValue(d.nome); // «Outro nome» passa a todas as linhas
      if (String(r[4]) === sem) linha = i;
    });
    if (linha < 0) sh.appendRow([new Date(), d.jogador, d.nome, d.pontos, sem]);
    else if (d.pontos > Number(rows[linha][3])) sh.getRange(linha + 2, 1, 1, 5).setValues([[new Date(), d.jogador, d.nome, d.pontos, sem]]);
    else melhor = Number(rows[linha][3]);
    somaTotal_(d.jogador, d.nome, d.pontos);
    SpreadsheetApp.flush();
    if (n > 1500) limpaRank_(sh);
    cache.remove("rank");
  } finally { lock.releaseLock(); }
  const r = dadosRank_();
  const pos = r.semanaTodos.findIndex((x) => x.jogador === d.jogador) + 1;
  return json_({ ok: true, pos: pos, melhor: melhor });
}

// «Outro nome»: muda o nome em todas as linhas do jogador (o id só existe no browser dele)
function nome_(d) {
  if (!/^[a-f0-9]{16}$/.test(String(d.jogador || ""))) return json_({ ok: false, erro: "jogador" });
  if (!nomeValido_(d.nome)) return json_({ ok: false, erro: "nome" });
  const cache = CacheService.getScriptCache(), kj = "rn_" + d.jogador, nj = Number(cache.get(kj) || 0);
  if (nj >= RANK_JOGADOR_HORA) return json_({ ok: false, erro: "limite" });
  cache.put(kj, String(nj + 1), 3600);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = folhaRank_(), n = sh.getLastRow() - 1;
    const rows = n > 0 ? sh.getRange(2, 2, n, 2).getValues() : [];
    rows.forEach((r, i) => { if (String(r[0]) === d.jogador && r[1] !== d.nome) sh.getRange(i + 2, 3).setValue(d.nome); });
    const st = folhaTotais_(), nt = st.getLastRow() - 1;
    const tr = nt > 0 ? st.getRange(2, 1, nt, 2).getValues() : [];
    tr.forEach((r, i) => { if (String(r[0]) === d.jogador && r[1] !== d.nome) st.getRange(i + 2, 2).setValue(d.nome); });
    SpreadsheetApp.flush();
    cache.remove("rank");
  } finally { lock.releaseLock(); }
  return json_({ ok: true });
}

// lê a folha e calcula o ranking (com cache de 60 s); os ids nunca saem do servidor
function dadosRank_() {
  const cache = CacheService.getScriptCache(), v = cache.get("rank");
  if (v) return JSON.parse(v);
  const sh = folhaRank_(), n = sh.getLastRow() - 1, sem = semana_(new Date());
  const rows = n > 0 ? sh.getRange(2, 1, n, 5).getValues() : [];
  const ord = (a, b) => b.pontos - a.pontos || a.t - b.t; // empate: ganha quem chegou primeiro
  const todas = rows.filter((r) => r[1] && r[2]).map((r) => ({ jogador: String(r[1]), nome: String(r[2]), pontos: Number(r[3]) || 0, semana: String(r[4]), t: new Date(r[0]).getTime() || 0 }));
  const semanaTodos = todas.filter((x) => x.semana === sem).sort(ord);
  const best = {};
  todas.forEach((x) => { const b = best[x.jogador]; if (!b || ord(x, b) < 0) best[x.jogador] = x; });
  const st = folhaTotais_(), nt = st.getLastRow() - 1;
  const totalTodos = (nt > 0 ? st.getRange(2, 1, nt, 5).getValues() : []).filter((r) => r[0] && r[1])
    .map((r) => ({ jogador: String(r[0]), nome: String(r[1]), pontos: Number(r[2]) || 0, t: new Date(r[4]).getTime() || 0 })).sort(ord)
    .map((x) => ({ jogador: x.jogador, nome: x.nome, pontos: x.pontos }));
  const o = { totalTodos: totalTodos, semanaTodos: semanaTodos.map((x) => ({ jogador: x.jogador, nome: x.nome, pontos: x.pontos })), sempre: Object.keys(best).map((k) => best[k]).sort(ord).slice(0, RANK_TOP).map((x) => ({ jogador: x.jogador, nome: x.nome, pontos: x.pontos })) };
  try { cache.put("rank", JSON.stringify(o), 60); } catch (err) {}
  return o;
}

function ranking_(eu) {
  const r = dadosRank_(), pub = (x) => ({ nome: x.nome, pontos: x.pontos, eu: !!eu && x.jogador === eu });
  const tt = r.totalTodos || [];
  const o = { semana: r.semanaTodos.slice(0, RANK_TOP).map(pub), sempre: r.sempre.map(pub), total: tt.slice(0, RANK_TOP).map(pub) };
  const i = eu ? r.semanaTodos.findIndex((x) => x.jogador === eu) : -1;
  if (i >= RANK_TOP) o.meu = { pos: i + 1, nome: r.semanaTodos[i].nome, pontos: r.semanaTodos[i].pontos };
  const k = eu ? tt.findIndex((x) => x.jogador === eu) : -1;
  if (k >= RANK_TOP) o.meuTotal = { pos: k + 1, nome: tt[k].nome, pontos: tt[k].pontos };
  return o;
}

// apaga linhas com mais de RANK_SEMANAS semanas, menos as do top de sempre
function limpaRank_(sh) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const rows = sh.getRange(2, 1, n, 5).getValues(), limite = Date.now() - RANK_SEMANAS * 7 * 864e5;
  CacheService.getScriptCache().remove("rank");
  const topo = {};
  dadosRank_().sempre.forEach((x) => { topo[x.jogador + "|" + x.pontos] = 1; });
  const ficam = rows.filter((r) => new Date(r[0]).getTime() >= limite || topo[String(r[1]) + "|" + Number(r[3])]);
  if (ficam.length === rows.length) return;
  sh.getRange(2, 1, n, 5).clearContent();
  if (ficam.length) sh.getRange(2, 1, ficam.length, 5).setValues(ficam);
}

// soma os pontos da ronda ao total acumulado do jogador (chamada dentro do lock de pontos_)
function somaTotal_(jogador, nome, pontos) {
  const st = folhaTotais_(), n = st.getLastRow() - 1;
  const ids = n > 0 ? st.getRange(2, 1, n, 1).getValues() : [];
  const i = ids.findIndex((r) => String(r[0]) === jogador);
  if (i < 0) { st.appendRow([jogador, nome, pontos, 1, new Date()]); return; }
  const c = st.getRange(i + 2, 1, 1, 5), v = c.getValues()[0];
  c.setValues([[jogador, nome, (Number(v[2]) || 0) + pontos, (Number(v[3]) || 0) + 1, new Date()]]);
}

function folhaTotais_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("totais");
  if (!sh) {
    sh = ss.insertSheet("totais");
    sh.appendRow(["jogador", "nome", "total", "rondas", "data"]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function folhaRank_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("ranking");
  if (!sh) {
    sh = ss.insertSheet("ranking");
    sh.appendRow(["data", "jogador", "nome", "pontos", "semana"]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
