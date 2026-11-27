// Auditoria geométrica das tomadas da casa 3D contra ABNT NBR 5410:2004 e NBR 14136:2012.
// Lê os dados literais de casa-3d.html e confere:
//   - quantidade mínima por ambiente (NBR 5410 9.5.2.2.1 a..e)
//   - 2 tomadas acima da bancada da pia (9.5.2.2.1 b)
//   - potência mínima atribuível (9.5.2.2.2) e DR 30 mA (5.1.3.2.2)
//   - posição em parede, vãos de portas/janelas e móveis
//   - volumes 0..3 dos banheiros (9.1.2.1 / 9.1.4.3)
//   - TUEs de 20 A e distância à posição prevista do equipamento (4.2.1.2.3-d / 9.5.3.1)
//   - geometria dos furos no padrão NBR 14136 (Ø 4,3 / 5,0 mm; fases 19 mm; terra a 3 mm)
// Uso: node .qa/outlets-audit.mjs [caminho/casa-3d.html]
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = process.argv[2] || new URL('../casa-3d.html', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const html = readFileSync(SRC, 'utf8');

function extract(name, open) {
  const start = html.indexOf(`const ${name} = `);
  if (start < 0) throw new Error('não achei ' + name);
  const close = open === '[' ? ']' : '}';
  let i = html.indexOf(open, start), depth = 0, inStr = null, esc = false;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) return html.slice(html.indexOf(open, start), i + 1); }
  }
  throw new Error('não fechei ' + name);
}
const lit = (name, open) => eval('(' + extract(name, open) + ')');
const WALLS = lit('WALLS', '[');
const WINDOWS = lit('WINDOWS', '[');
const DOORS = lit('DOORS', '[');
const ROOMS = lit('ROOMS', '[');
const OUTLETS = lit('OUTLETS', '[');
const OUTLET_KINDS = lit('OUTLET_KINDS', '{');
const DOOR_TOP = 2.1;
// meia-parede do balcão (não está em WALLS; é feita com boxGeo em wallGeos)
const mcw = html.match(/const COUNTER_H = ([0-9.]+), COUNTER_WALL = \[([^\]]+)\]/);
const COUNTER = mcw ? { r: mcw[2].split(',').map(Number), top: +mcw[1] + 0.04 } : null;
if (COUNTER) WALLS.push(COUNTER.r);

const r2 = v => Math.round(v * 100) / 100;
const fails = [];
const fail = msg => { fails.push(msg); };

/* ---------- união exata de retângulos (área e perímetro) ---------- */
function unionGeom(rects) {
  const xs = [...new Set(rects.flatMap(r => [r[0], r[2]]))].sort((a, b) => a - b);
  const ys = [...new Set(rects.flatMap(r => [r[1], r[3]]))].sort((a, b) => a - b);
  const nx = xs.length - 1, ny = ys.length - 1;
  const inside = (i, j) => {
    const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
    return rects.some(r => cx > r[0] && cx < r[2] && cy > r[1] && cy < r[3]);
  };
  const grid = Array.from({ length: nx }, (_v, i) => Array.from({ length: ny }, (_w, j) => inside(i, j)));
  let area = 0, perim = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    if (!grid[i][j]) continue;
    const dx = xs[i + 1] - xs[i], dy = ys[j + 1] - ys[j];
    area += dx * dy;
    if (i === 0 || !grid[i - 1][j]) perim += dy;
    if (i === nx - 1 || !grid[i + 1][j]) perim += dy;
    if (j === 0 || !grid[i][j - 1]) perim += dx;
    if (j === ny - 1 || !grid[i][j + 1]) perim += dx;
  }
  return { area: r2(area), perim: r2(perim) };
}

const rooms = ROOMS.map(r => ({ ...r, geom: unionGeom(r.r) }));
const roomOf = (x, y) => rooms.find(r => r.r.some(q => x >= q[0] - 1e-9 && x <= q[2] + 1e-9 && y >= q[1] - 1e-9 && y <= q[3] + 1e-9));
const ROOM_ALIAS = { 'Sala': 'Sala de estar/jantar', 'Sala de jantar': 'Sala de estar/jantar', 'Área de serviço': 'A. Serviço', 'Circulação': 'Cozinha' };
const official = n => ROOM_ALIAS[n] || n;

/* ---------- mínimos NBR 5410 9.5.2.2.1 ---------- */
const WET = ['Cozinha', 'A. Serviço'];
function ruleFor(r) {
  if (r.n === 'BWC social' || r.n === 'BWC suíte') return { min: 1, text: '9.5.2.2.1-a banheiro: 1 ponto junto ao lavatório (9.1)' };
  if (WET.includes(r.n)) return { min: Math.ceil(r.geom.perim / 3.5), text: `9.5.2.2.1-b ${r.geom.perim} m ÷ 3,5 m = ${Math.ceil(r.geom.perim / 3.5)} pontos, com ≥ 2 tomadas acima da bancada da pia` };
  if (r.n === 'Varanda') return { min: 1, text: '9.5.2.2.1-c varanda: 1 ponto' };
  if (['Sala de estar/jantar', 'Quarto 01', 'Quarto 02', 'Suíte'].includes(r.n)) return { min: Math.ceil(r.geom.perim / 5), text: `9.5.2.2.1-d ${r.geom.perim} m ÷ 5 m = ${Math.ceil(r.geom.perim / 5)} pontos` };
  if (r.geom.area <= 2.25) return { min: 1, text: '9.5.2.2.1-e área ≤ 2,25 m²: 1 ponto (pode ficar a ≤ 0,80 m da porta)' };
  if (r.geom.area <= 6) return { min: 1, text: '9.5.2.2.1-e área ≤ 6 m²: 1 ponto' };
  return { min: Math.ceil(r.geom.perim / 5), text: `9.5.2.2.1-e ${r.geom.perim} m ÷ 5 m = ${Math.ceil(r.geom.perim / 5)} pontos` };
}
const pointsByRoom = {};
for (const o of OUTLETS) { const n = official(o.room); pointsByRoom[n] = (pointsByRoom[n] || 0) + 1; }

const minRows = rooms.filter(r => r.n !== 'Garagem').map(r => {
  const rule = ruleFor(r), got = pointsByRoom[r.n] || 0;
  const ok = got >= rule.min;
  if (!ok) fail(`${r.n}: ${got} ponto(s) < mínimo ${rule.min}`);
  return { ambiente: r.n, area: r.geom.area, perimetro: r.geom.perim, minimo: rule.min, previstos: got, ok, regra: rule.text };
});
const garageRow = { ambiente: 'Garagem', area: rooms.find(r => r.n === 'Garagem')?.geom.area ?? null, perimetro: rooms.find(r => r.n === 'Garagem')?.geom.perim ?? null, minimo: 0, previstos: pointsByRoom['Garagem'] || 0, ok: true, regra: 'área externa descoberta (vaga): sem mínimo; DR 30 mA obrigatório (5.1.3.2.2-d)' };

/* ---------- cada tomada: parede, vãos, móveis, volumes ---------- */
const FURN_H = {
  createWardrobe: 2.15, createBed: 0.65, createDesk: 0.76, createBathroomVanity: 0.85, createRefrigerator: 1.80,
  createKitchenSinkCabinet: 0.92, createStove: 0.86, createBarCounter: 1.09, createLaundryTub: 0.88,
  createWashingMachine: 0.90, createSofa: 0.80, createDiningTable: 0.76, createEggChair: 1.00,
  createSideTable: 0.45, createOfficeChair: 0.95,
};
const placements = [...html.matchAll(/place\((create\w+)\([^)]*\),\s*\[([^\]]+)\],\s*'[NSEW]'/g)].map(m => {
  const r = m[2].split(',').map(Number);
  return { fn: m[1], r, h: FURN_H[m[1]] || 0, cx: (r[0] + r[2]) / 2, cy: (r[1] + r[3]) / 2 };
});

const checks = OUTLETS.map(o => {
  const kind = OUTLET_KINDS[o.kind];
  const alongY = Math.abs(o.n[0]) > 0;                 // normal em X => parede no plano x, placa ao longo de Y
  const wallCoord = alongY ? o.at[0] : o.at[1];
  const span = alongY ? [o.at[1] - kind.w / 2, o.at[1] + kind.w / 2] : [o.at[0] - kind.w / 2, o.at[0] + kind.w / 2];
  const vspan = [o.h - kind.h / 2, o.h + kind.h / 2];
  const onPlane = (r) => {
    // r é retângulo fino (parede, janela, porta): descobre o eixo fino e testa o plano
    const thinX = Math.abs(r[2] - r[0]) <= Math.abs(r[3] - r[1]);
    return thinX ? Math.abs(wallCoord - r[0]) < 1e-6 || Math.abs(wallCoord - r[2]) < 1e-6
                 : Math.abs(wallCoord - r[1]) < 1e-6 || Math.abs(wallCoord - r[3]) < 1e-6;
  };
  const alongRange = (r) => {
    const thinX = Math.abs(r[2] - r[0]) <= Math.abs(r[3] - r[1]);
    return thinX ? [r[1], r[3]] : [r[0], r[2]];
  };
  const overlap = (a, b) => a[0] < b[1] && a[1] > b[0];

  // apoio: trecho de parede, parede sob janela ou acima de porta
  let support = null;
  for (const w of WALLS) {
    if (!onPlane(w)) continue;
    const ar = alongRange(w);
    if (!(o.at[alongY ? 1 : 0] >= ar[0] - 1e-9 && o.at[alongY ? 1 : 0] <= ar[1] + 1e-9)) continue;
    // face correta: normal deve apontar para fora do trecho
    const faceOk = alongY
      ? (o.n[0] > 0 ? Math.abs(o.at[0] - w[2]) < 1e-6 : Math.abs(o.at[0] - w[0]) < 1e-6)
      : (o.n[1] > 0 ? Math.abs(o.at[1] - w[3]) < 1e-6 : Math.abs(o.at[1] - w[1]) < 1e-6);
    if (faceOk) { support = { tipo: 'parede', ar }; break; }
  }
  for (const w of WINDOWS) {
    if (support) break;
    if (!onPlane(w.r)) continue;
    const ar = alongRange(w.r);
    if (!overlap(span, ar)) continue;
    if (vspan[1] <= w.sill + 1e-6) support = { tipo: 'parede sob janela ' + w.id, ar };
    else if (vspan[0] >= w.top - 1e-6) support = { tipo: 'parede sobre janela ' + w.id, ar };
  }
  if (!support) fail(`${o.id}: sem parede de apoio`);
  // vãos na mesma parede
  const openings = [];
  for (const w of WINDOWS) {
    if (!onPlane(w.r)) continue;
    const ar = alongRange(w.r);
    if (overlap(span, ar) && vspan[1] > w.sill && vspan[0] < w.top) openings.push(`janela ${w.id}`);
  }
  for (const d of DOORS) {
    if (!onPlane(d.r)) continue;
    const ar = alongRange(d.r);
    if (overlap(span, ar) && vspan[0] < DOOR_TOP) openings.push(`porta ${d.id}`);
  }
  if (openings.length) fail(`${o.id}: placa invade ${openings.join(', ')}`);
  // folga até vãos/pontas do trecho de parede
  let clearance = Infinity;
  for (const w of WINDOWS) {
    if (!onPlane(w.r)) continue;
    const ar = alongRange(w.r);
    clearance = Math.min(clearance, Math.max(0, ar[0] - span[1], span[0] - ar[1]));
  }
  for (const d of DOORS) {
    if (!onPlane(d.r)) continue;
    const ar = alongRange(d.r);
    clearance = Math.min(clearance, Math.max(0, ar[0] - span[1], span[0] - ar[1]));
  }
  if (support) clearance = Math.min(clearance, Math.max(0, Math.min(span[0] - support.ar[0], support.ar[1] - span[1])));
  // móveis encostados na mesma parede e à frente da tomada
  const blockers = placements.filter(p => {
    if (!p.h || p.h <= vspan[0]) return false;
    const touches = alongY
      ? Math.abs(wallCoord - p.r[0]) < 0.03 || Math.abs(wallCoord - p.r[2]) < 0.03
      : Math.abs(wallCoord - p.r[1]) < 0.03 || Math.abs(wallCoord - p.r[3]) < 0.03;
    if (!touches) return false;
    const ar = alongY ? [p.r[1], p.r[3]] : [p.r[0], p.r[2]];
    if (!overlap(span, ar)) return false;
    const dx = p.cx - o.at[0], dy = p.cy - o.at[1];
    return dx * o.n[0] + dy * o.n[1] > 0;          // móvel à frente da tomada
  });
  if (blockers.length) fail(`${o.id}: obstruída por ${blockers.map(b => b.fn).join(', ')}`);
  // banheiro: volumes 0..3 (box delimitado por vidro em x = 0,98 m)
  let volume = null, volOk = null;
  const room = roomOf(o.at[0], o.at[1]);
  if (room && (room.n === 'BWC social' || room.n === 'BWC suíte')) {
    volume = o.at[0] > 0.98 + 0.60 ? 3 : (o.at[0] > 0.98 ? 2 : 1);
    volOk = volume === 3 && vspan[1] <= 2.25;
    if (!volOk) fail(`${o.id}: banheiro em volume ${volume} (só é admitido volume 3, até 2,25 m)`);
  }
  return {
    id: o.id, tipo: kind.name, amp: kind.amp, ambiente: official(o.room), ambienteReal: room?.n || '?',
    at: o.at, n: o.n, h: o.h, use: o.use, apoio: support?.tipo || '—', vaos: openings,
    folga: Number.isFinite(clearance) ? r2(clearance) : null, volume, volumeOk: volOk, dr: null, va: null,
  };
});

/* ---------- potência (9.5.2.2.2) e DR (5.1.3.2.2) ---------- */
const wetTotal = OUTLETS.filter(o => ['BWC social', 'BWC suíte', 'Cozinha', 'A. Serviço'].includes(official(o.room))).length;
const lim = wetTotal > 6 ? 2 : 3;
const WET_SET = new Set(['BWC social', 'BWC suíte', 'Cozinha', 'A. Serviço']);
const DR_SET = new Set([...WET_SET, 'Garagem', 'Varanda']);
const wetSeq = {};
for (const c of checks) {
  const room = c.ambiente;
  c.dr = DR_SET.has(room);
  const o = OUTLETS.find(x => x.id === c.id);
  if (o.tue) { c.va = null; c.tue = true; continue; }
  if (WET_SET.has(room)) { wetSeq[room] = (wetSeq[room] || 0) + 1; c.va = wetSeq[room] <= lim ? 600 : 100; }
  else c.va = 100;
}

/* ---------- 2 tomadas acima da bancada da pia (9.5.2.2.1-b) ---------- */
const sinkModules = OUTLETS.filter(o => /bancada da pia/i.test(o.use)).reduce((s, o) => s + OUTLET_KINDS[o.kind].mods.length, 0);
const sinkOk = sinkModules >= 2;
if (!sinkOk) fail(`bancada da pia: ${sinkModules} tomada(s) acima (mínimo 2)`);

/* ---------- TUE (4.2.1.2.3 d / 9.5.3.1) ---------- */
const BAR = [5.249, 9.0, 6.39, 9.379];   // balcão da cozinha (equipamento do CZ-AMERICANA)
const tue = OUTLETS.filter(o => o.tue).map(o => {
  const kind = OUTLET_KINDS[o.kind];
  const eq = o.eq || (o.id === 'CZ-AMERICANA' ? [6.0, 9.19] : null);
  if (!eq) fail(`${o.id}: TUE sem a previsão de posição do equipamento (eq)`);
  const dist = eq ? Math.hypot(o.at[0] - eq[0], o.at[1] - eq[1]) : Infinity;
  const eqNoBalcao = eq && eq[0] >= BAR[0] && eq[0] <= BAR[2] && eq[1] >= BAR[1] && eq[1] <= BAR[3];
  const sobTampo = eqNoBalcao && o.h + kind.h / 2 <= 1.09; // tampo do balcão a 1,09 m
  if (kind.amp <= 10) fail(`${o.id}: TUE com tomada de ${kind.amp} A (equipamento > 10 A exige 20 A)`);
  if (dist > 1.5) fail(`${o.id}: TUE a ${r2(dist)} m do equipamento (máx. 1,5 m)`);
  if (sobTampo) fail(`${o.id}: TUE fica sob o tampo do balcão (h=${o.h} m) — inacessível para equipamento de bancada`);
  return { id: o.id, tomada: kind.name, at: o.at, h: o.h, eq, distEquip: r2(dist), sobTampo };
});

/* ---------- geometria NBR 14136 ---------- */
const g = html.match(/const big = K\.amp > 10, pr = big \? ([0-9.]+) : ([0-9.]+), dx = ([0-9.]+), ey = (-?[0-9.]+), py = (-?[0-9.]+)/);
const geo = g ? {
  furo10: r2(+g[2] * 2000), furo20: r2(+g[1] * 2000), fases: r2(+g[3] * 2000),
  terra: r2(Math.abs(+g[4] - +g[5]) * 1000),
} : null;
const NBR = { furo10: [4.3, 4.5], furo20: [5.0, 5.2], fases: [18.8, 19.2], terra: [2.85, 3.15] };
const geoOk = geo && geo.furo10 >= NBR.furo10[0] && geo.furo10 <= NBR.furo10[1]
  && geo.furo20 >= NBR.furo20[0] && geo.furo20 <= NBR.furo20[1]
  && geo.fases >= NBR.fases[0] && geo.fases <= NBR.fases[1]
  && geo.terra >= NBR.terra[0] && geo.terra <= NBR.terra[1];
if (!geoOk) fail('NBR 14136: geometria dos furos fora do padrão ' + JSON.stringify(geo));

/* ---------- relatório ---------- */
const rows = [...minRows, garageRow];
const out = {
  arquivo: SRC, geradoEm: new Date().toISOString(),
  totais: {
    pontos: OUTLETS.length,
    tomadas: OUTLETS.reduce((s, o) => s + OUTLET_KINDS[o.kind].mods.length, 0),
    ambientes: rooms.length,
    comDR: checks.filter(c => c.dr).length,
    tue: tue.length,
    acimaPia: sinkModules,
  },
  nbr5410: { minimos: rows, tue, dr: [...DR_SET], potencias: { totalMolhados: wetTotal, porAmbiente: lim, banheiros: '600 VA (1 ponto)', cozinha: '600 VA em 2 pontos + 100 VA nos demais', servico: '600 VA em 2 pontos' } },
  nbr14136: { geometria: geo, faixas: NBR, ok: geoOk },
  tomadas: checks,
  falhas: fails,
};
writeFileSync(new URL('./outlets-audit.json', import.meta.url), JSON.stringify(out, null, 2));

console.log('\n=== TOTAIS ===');
console.log(JSON.stringify(out.totais));
console.log('\n=== NBR 5410 — QUANTIDADE MÍNIMA POR AMBIENTE ===');
console.table(rows.map(r => ({ ambiente: r.ambiente, area_m2: r.area, perimetro: r.perimetro, minimo: r.minimo, previstos: r.previstos, ok: r.ok ? 'ok' : 'FALHA' })));
console.log('\n=== NBR 5410 — TUE / DR / POTÊNCIA ===');
console.log('TUE:', JSON.stringify(tue));
console.log('DR obrigatório:', [...DR_SET].join(', '));
console.log('2 tomadas acima da pia:', sinkModules, sinkOk ? 'ok' : 'FALHA');
console.log('\n=== NBR 14136 — GEOMETRIA DOS FUROS (mm) ===');
console.log({ medida: geo, faixa: NBR, ok: geoOk });
console.log('\n=== TOMADAS (posição) ===');
console.table(checks.map(c => ({ id: c.id, tipo: c.tipo, ambiente: c.ambiente, h: c.h, apoio: c.apoio, vãos: c.vaos.join('|') || '—', folga: c.folga, volume: c.volume ?? '', dr: c.dr ? 'sim' : '—', va: c.va ?? 'TUE' })));
console.log('\n=== FALHAS ===');
console.log(fails.length ? fails.join('\n') : 'nenhuma');
process.exitCode = fails.length ? 1 : 0;
