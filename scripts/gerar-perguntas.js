// Gera o perguntas.js: as perguntas escritas à mão (perguntas-base.js) mais perguntas tiradas dos registos
// verificados do Hoje CV (../hojecv/eventos.js), cada uma com a fonte do registo.
// Uso: node scripts/gerar-perguntas.js [caminho do eventos.js]
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..");
const EVENTOS = process.argv[2] || path.join(RAIZ, "..", "hojecv", "eventos.js");

global.window = {};
require(path.resolve(EVENTOS));
const D = window.HOJECV_DADOS || [];
const BASE = require(path.join(RAIZ, "perguntas-base.js"));
const KIDS = require(path.join(RAIZ, "perguntas-criancas.js")); // versão para crianças (só níveis 1 e 2)

const ILHAS = ["Santo Antão", "São Vicente", "São Nicolau", "Sal", "Boa Vista", "Maio", "Santiago", "Fogo", "Brava"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ANO_ATUAL = new Date().getFullYear();
const TEMAS = ["politica", "historia", "musica", "literatura", "artes", "desporto", "religiao", "sociedade", "catastrofe", "celebracao", "geografia"];

// hash djb2 em base 36 (igual ao do Hoje CV) para ids estáveis
const hash = (s) => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36); };
// gerador pseudoaleatório com semente, para o ficheiro não mudar entre execuções
const rng = (seed) => { let x = parseInt(hash(seed), 36) || 1; return () => ((x = (x * 1103515245 + 12345) >>> 0) / 4294967296); };
const anosErrados = (y, nivel, seed) => {
  const r = rng(seed), max = nivel === 3 ? 8 : 20, min = nivel === 3 ? 1 : 4, out = new Set();
  for (let i = 0; out.size < 3 && i < 200; i++) {
    const d = min + Math.floor(r() * (max - min + 1)), v = y + (r() < 0.5 ? -d : d);
    if (v !== y && v <= ANO_ATUAL && v > 1400) out.add(v);
  }
  return [...out].map(String);
};
const ilhasErradas = (ilha, seed) => {
  const r = rng(seed), outras = ILHAS.filter((i) => i !== ilha);
  for (let i = outras.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [outras[i], outras[j]] = [outras[j], outras[i]]; }
  return outras.slice(0, 3);
};

// Pista: contexto tirado da descrição do registo, sem revelar a resposta.
// Tiram-se as frases sobre o nascimento/morte (dizem o local) e, nas perguntas de ilha, os nomes de lugares.
const LUGARES = [...ILHAS, "Mindelo", "Praia", "São Filipe", "Assomada", "Ribeira Grande", "Espargos", "Sal Rei", "Porto Novo", "Tarrafal",
  "Santa Maria", "Cidade Velha", "Nova Sintra", "Pedra Badejo", "Calheta", "Vila do Maio", "Ribeira Brava", "Paul", "Caleijão", "São Domingos",
  "Santa Catarina", "Santa Cruz", "Picos", "Mosteiros", "Pombas", "Ponta do Sol"];
const reL = new RegExp(String.raw`\s*,?\s*\b(?:[Nn]atural d[aoe]s?|native of|d[aoe]s?|em|n[ao]s?|from|in|of|on)\s+(?:${LUGARES.join("|")})(?![\wÀ-ú])`, "g");
const temLugar = (t) => LUGARES.some((l) => new RegExp(String.raw`(^|[^\wÀ-ú])${l}(?![\wÀ-ú])`).test(t));
function pista(desc, nome, { semLugar, semAno, semAnos }) {
  if (!desc) return "";
  let frases = desc.split(/(?<=[.!?])\s+/).map((f) => f.replace(/,?\s*\b(nasce|nasceu|nascid[ao]|morre|morreu|is born|was born|born|dies|died)\b.*$/i, ".").replace(/^\.$/, "")).filter(Boolean);
  // «Em que ano? «acontecimento»»: as frases com outros anos saem, porque dão a resposta por aproximação
  // (ex.: «Fica no cargo até 2026», «O 50.º aniversário foi em 2024»); nos nascimentos e mortes ficam, porque dizem quem é a pessoa
  if (semAnos) frases = frases.filter((f) => !/\b1[4-9]\d\d\b|\b20\d\d\b/.test(f));
  let t = frases.join(" ").trim();
  if (nome && t.startsWith(nome)) t = t.slice(nome.length).replace(/^,?\s*/, "");
  if (semLugar) { t = t.replace(reL, ""); if (temLugar(t)) return ""; }
  if (semAno && t.includes(String(semAno))) return "";
  t = t.replace(/\s+([,.])/g, "$1").replace(/^[\s,.;:]+/, "").trim();
  if (t.length < 12) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const OBSCUROS = /capit[ãa]o|assume o governo|governador|torna-se bispo|bispo de|takes office as governor|becomes captain/i;

const gen = [];
for (const r of D) {
  const [d, m, y, tit, desc, cat, ilha, dest, fonte, , , titEn, descEn, tema] = r;
  if (!fonte || /C.mara/.test(tit) || /Data tradicional/i.test(desc)) continue;
  const nivel = String(dest) === "1" ? 2 : 3;
  const dataPt = `${d} de ${MESES[m - 1]} de ${y}`, dataEn = `${d} ${MONTHS[m - 1]} ${y}`;
  const expPt = `${desc} (${dataPt})`, expEn = descEn ? `${descEn} (${dataEn})` : `${dataEn}.`;
  const t = TEMAS.includes(tema) ? tema : "historia";
  const key = `${y}-${m}-${d}-${tit}`;
  let nome = null, nomeEn = null;
  if (cat === "nascimento") { nome = tit.replace(/^Nasce /, ""); const x = /^(.+) is born$/.exec(titEn || ""); nomeEn = x ? x[1] : nome; }
  if (cat === "falecimento") { nome = tit.replace(/^Morre /, ""); const x = /^(.+) dies$/.exec(titEn || ""); nomeEn = x ? x[1] : nome; }
  if (nome && nome === tit) continue; // título fora do padrão «Nasce X» / «Morre X»
  if (!nome && OBSCUROS.test(tit + " " + (titEn || ""))) continue; // nomeações pouco conhecidas: difíceis de mais sem contexto
  if (nome && /preso político/i.test(desc)) continue; // presos mortos no Tarrafal: pouco conhecidos, difíceis de mais pelo nome
  const pAno = pista(desc, nome, { semAno: y, semAnos: !nome }), pAnoEn = pista(descEn, nomeEn, { semAno: y, semAnos: !nome });
  // 1) em que ano
  let q, qEn;
  if (cat === "nascimento") { q = `Em que ano nasceu ${nome}?`; qEn = `In which year was ${nomeEn} born?`; }
  else if (cat === "falecimento") { q = `Em que ano morreu ${nome}?`; qEn = `In which year did ${nomeEn} die?`; }
  else {
    if (/\b1[4-9]\d\d\b|\b20\d\d\b/.test(tit + " " + (titEn || ""))) continue; // o título já diz o ano
    q = `Em que ano? «${tit}»`; qEn = `In which year? “${titEn || tit}”`;
  }
  // atletas: o ano de nascimento de um jogador é difícil de mais só pelo nome; fica só «em que ilha nasceu», e só com pista
  const atleta = cat === "nascimento" && t === "desporto";
  const errados = atleta ? [] : anosErrados(y, nivel, key);
  if (errados.length === 3) gen.push(["h" + hash(key + "|ano"), nivel, t, q, [String(y), ...errados], expPt, fonte, qEn, [String(y), ...errados], expEn, pAno, pAno && pAnoEn ? pAnoEn : ""]);
  // 2) em que ilha nasceu (nível médio)
  const pIlha = pista(desc, nome, { semLugar: true }), pIlhaEn = pista(descEn, nomeEn, { semLugar: true });
  if (cat === "nascimento" && ILHAS.includes(ilha) && !(atleta && !pIlha)) {
    const e = ilhasErradas(ilha, key);
    // nível: médio para as pessoas em destaque, difícil para as outras (dá ao nível difícil perguntas que não são de data)
    gen.push(["h" + hash(key + "|ilha"), nivel, t, `Em que ilha nasceu ${nome}?`, [ilha, ...e], expPt, fonte,
      `On which island was ${nomeEn} born?`, [ilha, ...e], expEn, pIlha, pIlhaEn]);
  }
}

// validação
const todas = [...BASE, ...gen], ids = new Set(), erros = [];
for (const p of [...todas, ...KIDS]) {
  const [id, nivel, tema, q, o, x, f, qe, oe] = p;
  if (ids.has(id)) erros.push("id repetido: " + id); ids.add(id);
  if (![1, 2, 3].includes(nivel)) erros.push(id + ": nível inválido");
  if (!TEMAS.includes(tema)) erros.push(id + ": tema inválido " + tema);
  if (!q || !x || !f || !qe) erros.push(id + ": campo vazio");
  if (!Array.isArray(o) || o.length !== 4 || new Set(o).size !== 4) erros.push(id + ": opções inválidas");
  if (!Array.isArray(oe) || oe.length !== 4 || new Set(oe).size !== 4) erros.push(id + ": opções EN inválidas");
}
for (const p of KIDS) if (![1, 2].includes(p[1]) || p[2] === "catastrofe") erros.push(p[0] + ": crianças só com nível 1 ou 2 e sem catástrofes");
if (erros.length) { console.error(erros.join("\n")); process.exit(1); }

const n = [1, 2, 3].map((k) => todas.filter((p) => p[1] === k).length);
const agora = new Date(Date.now() - 3600e3).toISOString().slice(0, 16).replace("T", " "); // hora de Cabo Verde (UTC−1)
const out = `// Gerado por scripts/gerar-perguntas.js — não editar à mão (editar perguntas-base.js ou o Hoje CV).
// [id, nível, tema, pergunta, [certa, errada, errada, errada], explicação, fonte, pergunta_en, [opções_en], explicação_en, pista, pista_en]
// QUIZCV_CRIANCAS: perguntas da versão para crianças (perguntas-criancas.js), no mesmo formato
window.QUIZCV_ATUALIZADO = ${JSON.stringify(agora)};
window.QUIZCV_PERGUNTAS = [
${todas.map((p) => JSON.stringify(p)).join(",\n")}
];
window.QUIZCV_CRIANCAS = [
${KIDS.map((p) => JSON.stringify(p)).join(",\n")}
];
`;
fs.writeFileSync(path.join(RAIZ, "perguntas.js"), out);
console.log(`perguntas.js: ${todas.length} perguntas (${BASE.length} escritas à mão, ${gen.length} do Hoje CV) · fáceis ${n[0]} · médias ${n[1]} · difíceis ${n[2]} · crianças ${KIDS.length}`);
