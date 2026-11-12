// Gera o mapa.js (Mapa CV): ilhas, concelhos, freguesias, sedes de concelho e bandeiras, em traçados SVG já projetados.
// Uso: node scripts/gerar-mapa.js
// Precisa do pacote polygon-clipping (só para gerar; o site não o usa). Não há package.json no repositório, de propósito
// (a Vercel publica o site como estático): instalar fora e correr com NODE_PATH (a mensagem de erro mostra como).
// Fontes (em scripts/mapa-fontes/, versões simplificadas do geoBoundaries, build de dez. 2023):
//  - ADM0 (ilhas) e ADM1 (22 concelhos): OpenStreetMap / Wambacher, licença ODbL 1.0
//  - ADM2 (32 freguesias): OCHA ROWCA (data.humdata.org), licença CC BY 3.0 IGO; nomes sem acentos, corrigidos em FREG
//    a partir da lista da pt.wikipedia «Divisão administrativa de Cabo Verde»
//  - sedes de concelho: Wikidata (P36 + P625 de cada concelho; Pedra Badejo = Q490579)
//  - bandeiras: Wikimedia Commons (ver BANDEIRAS); a da Boa Vista ficou de fora (só existe uma fotografia)
// Santa Luzia, o Raso, o Branco e os ilhéus Secos aparecem como fundo, sem contar como resposta: as fontes não
// concordam sobre o concelho a que pertencem (OSM: Tarrafal de São Nicolau; OCHA e pt.wikipedia: São Vicente).
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..");
const FONTES = path.join(__dirname, "mapa-fontes");
const ler = (f) => JSON.parse(fs.readFileSync(path.join(FONTES, f), "utf8"));

// projeção equirretangular centrada em 16° N; 1 grau de latitude = K unidades
const K = 400, COS = Math.cos((16 * Math.PI) / 180), LON0 = -25.42, LAT1 = 17.26, M = 0;
const P = ([lon, lat]) => [(lon - LON0) * COS * K, (LAT1 - lat) * K];

// ilhas: [id, nome, lon, lat] (um ponto dentro de cada uma, para as reconhecer no ADM0)
const ILHAS = [
  ["santo-antao", "Santo Antão", -25.17, 17.07], ["sao-vicente", "São Vicente", -24.96, 16.85], ["santa-luzia", "Santa Luzia", -24.74, 16.77],
  ["sao-nicolau", "São Nicolau", -24.27, 16.6], ["sal", "Sal", -22.93, 16.73], ["boa-vista", "Boa Vista", -22.82, 16.09],
  ["maio", "Maio", -23.17, 15.22], ["santiago", "Santiago", -23.62, 15.08], ["fogo", "Fogo", -24.38, 14.93], ["brava", "Brava", -24.71, 14.85],
];
// concelho → [ilha, sede, lon, lat da sede] (Wikidata)
const CONC = {
  "Ribeira Grande": ["santo-antao", "Ponta do Sol", -25.091452777, 17.201755555],
  "Paul": ["santo-antao", "Pombas", -25.0125, 17.145833333],
  "Porto Novo": ["santo-antao", "Porto Novo", -25.066666666, 17.020833333],
  "São Vicente": ["sao-vicente", "Mindelo", -24.987983333, 16.891352777],
  "Ribeira Brava": ["sao-nicolau", "Ribeira Brava", -24.298347222, 16.615980555],
  "Tarrafal de São Nicolau": ["sao-nicolau", "Tarrafal de São Nicolau", -24.355555555, 16.566666666],
  "Sal": ["sal", "Espargos", -22.945277777, 16.754583333],
  "Boa Vista": ["boa-vista", "Sal Rei", -22.917077777, 16.176044444],
  "Maio": ["maio", "Vila do Maio", -23.208333333, 15.1375],
  "Tarrafal": ["santiago", "Tarrafal", -23.75, 15.266666666],
  "São Miguel": ["santiago", "Calheta de São Miguel", -23.591666666, 15.1875],
  "Santa Catarina": ["santiago", "Assomada", -23.665394444, 15.094880555],
  "São Salvador do Mundo": ["santiago", "Picos", -23.633333333, 15.083333333],
  "São Lourenço dos Órgãos": ["santiago", "João Teves", -23.591666666, 15.066666666],
  "Santa Cruz": ["santiago", "Pedra Badejo", -23.533333333, 15.1375],
  "São Domingos": ["santiago", "São Domingos", -23.5625, 15.025],
  "Praia": ["santiago", "Praia", -23.509155555, 14.917719444],
  "Ribeira Grande de Santiago": ["santiago", "Cidade Velha", -23.604166666, 14.916666666],
  "Mosteiros": ["fogo", "Mosteiros", -24.32532, 15.03433],
  "São Filipe": ["fogo", "São Filipe", -24.49549913, 14.89659863],
  "Santa Catarina do Fogo": ["fogo", "Cova Figueira", -24.293958333, 14.889902777],
  "Brava": ["brava", "Nova Sintra", -24.695833333, 14.870833333],
};
// freguesias: "nome OCHA|concelho" → nome certo (pt.wikipedia, «Divisão administrativa de Cabo Verde»)
const FREG = {
  "Nossa Senhora Do Rosario|Ribeira Grande": "Nossa Senhora do Rosário", "Nossa Senhora Do Livramento|Ribeira Grande": "Nossa Senhora do Livramento",
  "Santo Crucifixo|Ribeira Grande": "Santo Crucifixo", "Sao Pedro Apostolo|Ribeira Grande": "São Pedro Apóstolo",
  "Santo Antonio Das Pombas|Paul": "Santo António das Pombas", "Sao Joao Baptista|Porto Novo": "São João Baptista", "Santo Andre|Porto Novo": "Santo André",
  "Nossa Senhora Da Luz|São Vicente": "Nossa Senhora da Luz", "Nossa Senhora Da Lapa|Ribeira Brava": "Nossa Senhora da Lapa",
  "Nossa Senhora Do Rosario|Ribeira Brava": "Nossa Senhora do Rosário", "Sao Francisco De Assis|Tarrafal de São Nicolau": "São Francisco",
  "Nossa Senhora Das Dores|Sal": "Nossa Senhora das Dores", "Santa Isabel|Boa Vista": "Santa Isabel", "Sao Joao Baptista|Boa Vista": "São João Baptista",
  "Nossa Senhora Da Luz|Maio": "Nossa Senhora da Luz", "Nossa Senhora Da Graca|Praia": "Nossa Senhora da Graça",
  "Nossa Senhora Da Luz|São Domingos": "Nossa Senhora da Luz", "Sao Nicolau Tolentino|São Domingos": "São Nicolau Tolentino",
  "Santa Catarina|Santa Catarina": "Santa Catarina", "Sao Salvador Do Mundo|São Salvador do Mundo": "São Salvador do Mundo",
  "Santiago Maior|Santa Cruz": "Santiago Maior", "Sao Lourenco Dos Orgaos|São Lourenço dos Órgãos": "São Lourenço dos Órgãos",
  "Santissimo Nome De Jesus|Ribeira Grande de Santiago": "Santíssimo Nome de Jesus", "Sao Joao Baptista|Ribeira Grande de Santiago": "São João Baptista",
  "Sao Miguel Arcanjo|São Miguel": "São Miguel Arcanjo", "Santo Amaro Abade|Tarrafal": "Santo Amaro Abade",
  "Sao Lourenco|São Filipe": "São Lourenço", "Nossa Senhora Da Conceicao|São Filipe": "Nossa Senhora da Conceição",
  "Santa Catarina Do Fogo|Santa Catarina do Fogo": "Santa Catarina do Fogo", "Nossa Senhora Da Ajuda|Mosteiros": "Nossa Senhora da Ajuda",
  "Sao Joao Baptista|Brava": "São João Baptista", "Nossa Senhora Do Monte|Brava": "Nossa Senhora do Monte",
};
// bandeiras dos concelhos (Wikimedia Commons; desenhos a partir do Flags of the World)
const BANDEIRAS = [
  ["Porto Novo", "porto-novo.gif", "Conselho do município (CRW Flags)", "CC BY-SA 4.0", "Bandeira Porto Novo.gif"],
  ["São Filipe", "sao-filipe.gif", "Conselho do município (CRW Flags)", "CC BY-SA 4.0", "Bandeira São Filipe.gif"],
  ["Brava", "brava.gif", "Valentin Poposki", "CC BY-SA 4.0", "Flag of Brava municipality.gif"],
  ["Maio", "maio.gif", "Valentin Poposki", "CC BY-SA 4.0", "Flag of Maio municipality.gif"],
  ["Mosteiros", "mosteiros.svg", "Flagvisioner", "CC0", "Flag of Mosteiros, Cabo Verde.svg"],
  ["Paul", "paul.gif", "António Martins", "CC BY-SA 4.0", "Flag of Paul municipality.gif"],
  ["Ribeira Grande", "ribeira-grande.gif", "António Martins", "CC BY-SA 4.0", "Flag of Ribeira Grande municipality.gif"],
  ["Sal", "sal.gif", "Waldir", "CC BY-SA 4.0", "Flag of Sal municipality.gif"],
  ["Santa Catarina", "santa-catarina.gif", "António Martins", "CC BY-SA 4.0", "Flag of Santa Catarina municipality.gif"],
  ["São Miguel", "sao-miguel.gif", "António Martins", "CC BY-SA 4.0", "Flag of São Miguel municipality.gif"],
  ["São Vicente", "sao-vicente.gif", "Waldir e António Martins", "CC BY-SA 4.0", "Flag of São Vicente municipality.gif"],
  ["Tarrafal de São Nicolau", "tarrafal-de-sao-nicolau.gif", "António Martins", "CC BY-SA 4.0", "Flag of Tarrafal de São Nicolau municipality.gif"],
  ["Tarrafal", "tarrafal.gif", "António Martins", "CC BY-SA 4.0", "Flag of Tarrafal municipality.gif"],
  ["Ribeira Brava", "ribeira-brava.gif", "Tuvalkin", "CC0", "Ribeira Brava.gif"],
  ["Santa Catarina do Fogo", "santa-catarina-do-fogo.gif", "Tuvalkin", "CC0", "Santa Catarina do Fogo.gif"],
  ["Praia", "praia.svg", "Demon201x", "CC BY-SA 4.0", "Flag of Praia.svg"],
];

const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const polys = (g) => (g.type === "MultiPolygon" ? g.coordinates : [g.coordinates]);
const pip = ([x, y], ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [x1, y1] = ring[i], [x2, y2] = ring[j]; if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) c = !c; } return c; };
const centro = (ring) => { let a = 0, cx = 0, cy = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [x1, y1] = ring[j], [x2, y2] = ring[i], f = x1 * y2 - x2 * y1; a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f; } return [cx / (3 * a), cy / (3 * a)]; };
const bbox = (rings) => { let b = [1e9, 1e9, -1e9, -1e9]; rings.forEach((r) => r.forEach(([x, y]) => { b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]; })); return b; };
const dentro = ([x, y], b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];

// Douglas–Peucker, tolerância em unidades do mapa
function simplifica(pts, tol) {
  if (pts.length < 5) return pts;
  const d2 = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); const ex = a[0] + t * dx - p[0], ey = a[1] + t * dy - p[1]; return ex * ex + ey * ey; };
  const keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
  const st = [[0, pts.length - 1]];
  while (st.length) { const [i, j] = st.pop(); let m = -1, md = 0; for (let k = i + 1; k < j; k++) { const d = d2(pts[k], pts[i], pts[j]); if (d > md) { md = d; m = k; } } if (md > tol * tol) { keep[m] = true; st.push([i, m], [m, j]); } }
  const r = pts.filter((_, k) => keep[k]);
  return r.length >= 4 ? r : pts;
}
const TOL = 0.3;
const num = (v) => String(Math.round(v * 10) / 10);
// anel (lon/lat) → subtraçado SVG "Mx y x y …Z" (anéis interiores incluídos; fill-rule evenodd)
const caminho = (rings) => rings.map((r) => { const p = simplifica(r.map(P), TOL); return "M" + p.slice(0, -1).map(([x, y]) => num(x) + " " + num(y)).join(" ") + "Z"; }).join("");

const erros = [];
// ilhas (ADM0): as 10 + ilhéus
const a0 = ler("ADM0.geojson"), a1 = ler("ADM1.geojson"), a2 = ler("ADM2.geojson");
const ilhas = ILHAS.map(([id, n]) => ({ id, n, rings: [] })), ilheus = [];
for (const p of polys(a0.features[0].geometry)) {
  const b = bbox([p[0]]), i = ILHAS.findIndex(([, , lon, lat]) => dentro([lon, lat], b));
  if (i >= 0) ilhas[i].rings.push(...p); else ilheus.push(...p);
}
ilhas.forEach((x) => { if (!x.rings.length) erros.push("ilha sem traçado: " + x.n); x.bb = bbox(x.rings); });
const ilhaBB = Object.fromEntries(ilhas.map((x) => [x.id, x.bb]));

// concelhos (ADM1): só os polígonos que ficam na ilha do concelho (tira Santa Luzia, Raso, Branco, ilhéus Secos)
const concelhos = a1.features.map((f) => {
  const n = f.properties.shapeName.normalize("NFC"), c = CONC[n];
  if (!c) { erros.push("concelho desconhecido: " + n); return null; }
  const ps = polys(f.geometry).filter((p) => dentro(centro(p[0]), ilhaBB[c[0]]));
  const sede = [c[2], c[3]];
  return { id: slug(n), n, ilha: c[0], sede: c[1], ps, sp: sede };
}).filter(Boolean);
// cada sede tem de ficar dentro do seu concelho ou, se estiver na costa, a menos de ~1 km dele e mais perto dele do que de outro
const distAnel = ([x, y], r) => Math.min(...r.map(([x1, y1], i) => { const [x2, y2] = r[(i + 1) % r.length], dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; let t = l ? ((x - x1) * dx + (y - y1) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(x1 + t * dx - x, y1 + t * dy - y); }));
const distConc = (pt, c) => (c.ps.some((p) => pip(pt, p[0])) ? 0 : Math.min(...c.ps.map((p) => distAnel(pt, p[0]))));
concelhos.forEach((c) => { const d = distConc(c.sp, c), outro = concelhos.find((k) => k !== c && distConc(c.sp, k) < d);
  if (d > 0.01 || outro) erros.push(`a sede ${c.sede} não fica no concelho ${c.n}` + (outro ? ` (fica mais perto de ${outro.n})` : ` (a ${(d * 111).toFixed(1)} km)`)); });
if (concelhos.length !== 22) erros.push("concelhos: " + concelhos.length);
for (const n of Object.keys(CONC)) if (!concelhos.some((c) => c.n === n)) erros.push("falta o concelho " + n);

// freguesias (ADM2): concelho pelo centro do maior polígono
const freguesias = a2.features.map((f) => {
  const ps0 = polys(f.geometry), big = ps0.reduce((a, b) => (b[0].length > a[0].length ? b : a));
  const c = concelhos.find((k) => k.ps.some((p) => pip(centro(big[0]), p[0])));
  if (!c) { erros.push("freguesia sem concelho: " + f.properties.shapeName); return null; }
  const n = FREG[f.properties.shapeName + "|" + c.n];
  if (!n) { erros.push("freguesia sem nome certo: " + f.properties.shapeName + "|" + c.n); return null; }
  return { id: slug(n + "-" + c.n), n, conc: c.n, ilha: c.ilha, ps: ps0.filter((p) => dentro(centro(p[0]), ilhaBB[c.ilha])) };
}).filter(Boolean);
if (freguesias.length !== 32) erros.push("freguesias: " + freguesias.length);
// As fronteiras da OCHA não coincidem com as dos concelhos do OSM. Para o mapa ficar coerente:
// - concelho com uma só freguesia: a freguesia é o próprio concelho;
// - concelho com várias: cada freguesia é recortada pelo concelho (OCHA ∩ OSM) e os bocados do concelho que nenhuma
//   cobre vão para a freguesia mais próxima. Precisa do polygon-clipping (ver o início do ficheiro).
let pc;
try { pc = require("polygon-clipping"); } catch (e) {
  console.error("Falta o polygon-clipping. Instalar fora do repositório e correr com NODE_PATH, ex.:\n  npm i --prefix /tmp/pc polygon-clipping@0.15.7\n  NODE_PATH=/tmp/pc/node_modules node scripts/gerar-mapa.js"); process.exit(1);
}
const cxRing = (r) => r.reduce((a, [x, y]) => [a[0] + x / r.length, a[1] + y / r.length], [0, 0]);
for (const c of concelhos) {
  const fs_ = freguesias.filter((f) => f.conc === c.n);
  if (fs_.length === 1) { fs_[0].ps = c.ps; continue; }
  fs_.forEach((f) => { f.ps = pc.intersection(c.ps, f.ps); });
  const resto = pc.difference(c.ps, ...fs_.map((f) => f.ps).filter((g) => g.length));
  for (const r of resto) {
    const ce = cxRing(r[0]);
    const alvo = fs_.reduce((a, f) => { const d = f.ps.length ? Math.min(...f.ps.map((p) => distAnel(ce, p[0]))) : 1e9; return d < a.d ? { f, d } : a; }, { f: null, d: 1e9 }).f;
    alvo.ps = alvo.ps.length ? pc.union(alvo.ps, [r]) : [r];
  }
  fs_.forEach((f) => { if (!f.ps.length) erros.push("freguesia vazia depois do recorte: " + f.n); });
}
if (new Set(freguesias.map((f) => f.id)).size !== freguesias.length) erros.push("ids de freguesias repetidos");
// nome a mostrar: com o concelho entre parênteses quando há outra freguesia com o mesmo nome
const conta = {}; freguesias.forEach((f) => { conta[f.n] = (conta[f.n] || 0) + 1; });

const bandeiras = BANDEIRAS.map(([conc, img, autor, lic, fich]) => {
  if (!concelhos.some((c) => c.n === conc)) erros.push("bandeira de concelho desconhecido: " + conc);
  if (!fs.existsSync(path.join(RAIZ, "img", "bandeiras", img))) erros.push("falta a imagem " + img);
  return { conc: slug(conc), img: "img/bandeiras/" + img, autor, lic, url: "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(fich.replace(/ /g, "_")) };
});

// MTOT (index.html) tem de ter os números do mapa; cada categoria precisa de pelo menos MR elementos;
// MR (index.html) = MAPA_RONDA (Code.gs): o servidor valida os pontos com ele
{
  const n = { ilhas: ilhas.length, concelhos: concelhos.length, sedes: concelhos.length, freguesias: freguesias.length, bandeiras: bandeiras.length };
  const idx = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8"), gs = fs.readFileSync(path.join(RAIZ, "Code.gs"), "utf8");
  const mt = /MTOT=\{([^}]+)\}/.exec(idx), mr = /,MR=(\d+);/.exec(idx), ronda = /MAPA_RONDA = (\d+);/.exec(gs);
  const tot = mt ? Object.fromEntries(mt[1].split(",").map((x) => x.split(":").map((y) => y.trim())).map(([k, v]) => [k, Number(v)])) : {};
  for (const k of Object.keys(n)) { if (tot[k] !== n[k]) erros.push(`MTOT no index.html: ${k} = ${tot[k]}, mas o mapa tem ${n[k]}`); if (mr && n[k] < +mr[1]) erros.push(`${k}: só ${n[k]} elementos, menos do que uma ronda (${mr[1]})`); }
  if (!mr || !ronda || mr[1] !== ronda[1]) erros.push(`MR no index.html (${mr && mr[1]}) e MAPA_RONDA no Code.gs (${ronda && ronda[1]}) têm de ser iguais`);
}
if (erros.length) { console.error("ERROS:\n - " + erros.join("\n - ")); process.exit(1); }

// tamanho do mapa: caixa de todas as ilhas, com margem
const tudo = bbox([...ilhas.flatMap((x) => x.rings), ...ilheus].map((r) => r.map(P)));
const MG = 14, W = Math.ceil(tudo[2] + MG), H = Math.ceil(tudo[3] + MG);
const bbP = (rings) => { const b = bbox(rings.map((r) => r.map(P))); return b.map((v) => Math.round(v)); };
const out = {
  w: W, h: H,
  ilhas: ilhas.map((x) => ({ id: x.id, n: x.n, bb: bbP(x.rings), d: caminho(x.rings) })),
  ilheus: caminho(ilheus),
  concelhos: concelhos.map((c) => ({ id: c.id, n: c.n, ilha: c.ilha, sede: c.sede, d: caminho(c.ps.flat()) })),
  freguesias: freguesias.map((f) => ({ id: f.id, n: f.n, q: conta[f.n] > 1 ? `${f.n} (${f.conc})` : f.n, conc: slug(f.conc), ilha: f.ilha, d: caminho(f.ps.flat()) })),
  sedes: concelhos.map((c) => { const [x, y] = P([CONC[c.n][2], CONC[c.n][3]]); return { id: slug(c.sede + "-" + c.n), n: c.sede, conc: c.id, ilha: c.ilha, x: +num(x), y: +num(y) }; }),
  bandeiras,
};
// nota: c.ps.flat() junta os anéis de todos os polígonos do concelho (exterior e buracos)
const js = "// Gerado por scripts/gerar-mapa.js — não editar à mão.\n" +
  "// Mapa: OpenStreetMap / geoBoundaries (ODbL); freguesias: OCHA (CC BY 3.0 IGO); sedes: Wikidata; bandeiras: Wikimedia Commons.\n" +
  "window.QUIZCV_MAPA = " + JSON.stringify(out) + ";\n";
fs.writeFileSync(path.join(RAIZ, "mapa.js"), js);
console.log(`mapa.js: ${W}×${H}, ${out.ilhas.length} ilhas, ${out.concelhos.length} concelhos, ${out.freguesias.length} freguesias, ${out.sedes.length} sedes, ${out.bandeiras.length} bandeiras, ${(js.length / 1024).toFixed(0)} KB`);
