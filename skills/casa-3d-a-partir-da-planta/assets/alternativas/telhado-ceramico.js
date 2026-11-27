/* =====================================================================
   COBERTURA: TELHADO CERÂMICO EM QUATRO ÁGUAS SOBRE LAJE DE FORRO
   Hipóteses (visuais, sem projeto estrutural): a planta não traz cortes nem cobertura, então adotei uma solução conceitual
   que não mexe em nenhuma parede:
     · laje maciça de 12 cm sobre as paredes (forro), com o telhado cerâmico apoiado acima dela;
     · telha cerâmica tipo portuguesa, inclinação de 32% (≈ 17,7°), as duas alas da casa com a mesma inclinação,
       o que gera cumeeiras, espigões e um rincão (vale) onde as alas se encontram;
     · beiral de 55 cm com forro de beiral e testeira pintados na cor da fachada;
     · calha de chapa em todo o perímetro e quatro condutores pluviais de PVC Ø 80 mm (dois em cada lateral), com desvio até a parede;
     · cumeeira e espigões com capas cerâmicas; rufo de chapa no rincão.
   Inclinação, espessuras e diâmetros são conceituais e precisam de validação por profissional habilitado.
   ===================================================================== */
const roofGroup = new THREE.Group(); scene.add(roofGroup);
const RT = H + 0.12, RS = 0.32, EY = H + 0.17;                    // topo da laje, inclinação e cota do beiral (borda da telha)
const RF = [{ x0: -0.55, x1: 4.84, y0: -0.55, y1: 14.501 }, { x0: 3.74, x1: 7.92, y0: 2.011, y1: 14.501 }];   // as duas alas, já com beiral
const rfH = (R, x, y) => Math.max(0, RS * Math.min(x - R.x0, R.x1 - x, y - R.y0, R.y1 - y));
const roofH = (x, y) => Math.max(rfH(RF[0], x, y), rfH(RF[1], x, y));
const roofTex = (bump) => texCanvas(512, (g, n) => {              // 4 telhas de largura × 3 fiadas por repetição (0,84 × 1,02 m)
  const r = rnd(bump ? 631 : 632), cols = 4, rows = 3, cw = n / cols, rh = n / rows;
  g.fillStyle = bump ? '#808080' : '#7a3a22'; g.fillRect(0, 0, n, n);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = i * cw, y = j * rh, off = (j % 2) * cw * 0.0;
    if (bump) {
      const gr = g.createLinearGradient(x, 0, x + cw, 0); gr.addColorStop(0, '#242424'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#242424');
      g.fillStyle = gr; g.fillRect(x, y, cw, rh);
      const gv = g.createLinearGradient(0, y, 0, y + rh); gv.addColorStop(0, 'rgba(0,0,0,0.0)'); gv.addColorStop(0.78, 'rgba(0,0,0,0.0)'); gv.addColorStop(1, 'rgba(0,0,0,0.75)');
      g.fillStyle = gv; g.fillRect(x, y, cw, rh);
    } else {
      const hh = 10 + r() * 9, ss = 52 + r() * 14, ll = 34 + r() * 14;
      const gr = g.createLinearGradient(x, 0, x + cw, 0);
      gr.addColorStop(0, `hsl(${hh},${ss}%,${ll * 0.55}%)`); gr.addColorStop(0.3, `hsl(${hh},${ss}%,${ll}%)`); gr.addColorStop(0.55, `hsl(${hh + 2},${ss}%,${ll * 1.12}%)`); gr.addColorStop(1, `hsl(${hh},${ss}%,${ll * 0.5}%)`);
      g.fillStyle = gr; g.fillRect(x, y, cw, rh);
      const gv = g.createLinearGradient(0, y, 0, y + rh); gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(0.72, 'rgba(0,0,0,0)'); gv.addColorStop(0.9, 'rgba(15,5,2,0.35)'); gv.addColorStop(1, 'rgba(10,3,1,0.65)');
      g.fillStyle = gv; g.fillRect(x, y, cw, rh);
      if (r() < 0.18) { g.fillStyle = `rgba(30,38,24,${0.1 + r() * 0.14})`; g.beginPath(); g.ellipse(x + cw * (0.2 + r() * 0.6), y + rh * (0.2 + r() * 0.5), cw * 0.2, rh * 0.12, 0, 0, 7); g.fill(); }   // manchas de mofo
    }
  }
  specks(g, n, r, bump ? 4000 : 9000, bump ? '170,170,170' : '210,150,110', bump ? '70,70,70' : '40,16,8', 0.25, 1.6);
}, [1, 1], !bump);
const RM = {
  paint: new MSM({ color: 0xf2f0eb, roughness: 0.92, envMapIntensity: 0.45 }),
  tile: new MSM({ color: 0xffffff, map: roofTex(false), bumpMap: roofTex(true), bumpScale: 2.6, roughness: 0.78, envMapIntensity: 0.55 }),
  cap: new MSM({ color: 0x9c452a, roughness: 0.74, bumpMap: TXW.concreteB, bumpScale: 1.0, envMapIntensity: 0.5 }),
  rufo: new MSM({ color: 0xb7bbbe, metalness: 0.85, roughness: 0.38, envMapIntensity: 1.0, side: THREE.DoubleSide }),
  pipe: new MSM({ color: 0xe6e4dd, roughness: 0.42, envMapIntensity: 0.6 }),
};
const rbox = (mat, X0, Y0, X1, Y1, h0, h1, cast = false) => roofGroup.add(mesh(boxGeo(X0, Y0, X1, Y1, h0, h1), mat, cast, true));
const rfix = a => [Math.min(a[0], a[1]), Math.max(a[0], a[1])];
function cylSeg(mat, r, p0, p1) {                                  // cilindro entre dois pontos [X, altura, Y]
  const a = new THREE.Vector3(wx(p0[0]), p0[1], wz(p0[2])), b = new THREE.Vector3(wx(p1[0]), p1[1], wz(p1[2]));
  const g = new THREE.CylinderGeometry(r, r, a.distanceTo(b), 14);
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()), new THREE.Vector3(1, 1, 1)));
  roofGroup.add(mesh(g, mat, false, true));
}
const ball = (mat, r, p) => { const g = new THREE.SphereGeometry(r, 12, 8); g.translate(wx(p[0]), p[1], wz(p[2])); roofGroup.add(mesh(g, mat, false, true)); };

/* laje de forro (12 cm, beiral de 4 cm) */
rbox(RM.paint, -0.04, -0.04, 4.33, 13.991, H, RT);
rbox(RM.paint, 4.33, 2.521, 7.41, 13.991, H, RT);

/* superfície do telhado: malha alinhada às cumeeiras e espigões, com a textura girada em cada água */
{
  const brk = (pts, step) => { const o = [pts[0]]; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil((b - a) / step)); for (let k = 1; k <= n; k++) o.push(a + (b - a) * k / n); } return o; };
  const XS = brk([-0.55, 2.145, 3.74, 4.29, 4.84, 5.83, 7.92], 0.125), YS = brk([-0.55, 2.011, 2.145, 4.101, 11.806, 12.411, 13.951, 14.501], 0.125);
  const PW = 0.84, PH = 1.02, SL = Math.sqrt(1 + RS * RS), pos = [], uvs = [];
  const facet = (x, y) => {
    let best = null;
    for (const R of RF) { const d = [x - R.x0, R.x1 - x, y - R.y0, R.y1 - y], m = Math.min(...d); if (!best || m > best.m) best = { R, m, id: d.indexOf(m) }; }
    return best;
  };
  const uvOf = (f, x, y) => { const R = f.R; switch (f.id) { case 0: return [y / PW, (x - R.x0) * SL / PH]; case 1: return [y / PW, (R.x1 - x) * SL / PH]; case 2: return [x / PW, (y - R.y0) * SL / PH]; default: return [x / PW, (R.y1 - y) * SL / PH]; } };
  const put = (f, x, y) => { pos.push(wx(x), EY + roofH(x, y), wz(y)); uvs.push(...uvOf(f, x, y)); };
  for (let i = 0; i < XS.length - 1; i++) for (let j = 0; j < YS.length - 1; j++) {
    const x0 = XS[i], x1 = XS[i + 1], y0 = YS[j], y1 = YS[j + 1], cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (!RF.some(R => cx > R.x0 && cx < R.x1 && cy > R.y0 && cy < R.y1)) continue;
    const f = facet(cx, cy), hc = roofH(cx, cy);
    const e1 = Math.abs(hc - (roofH(x0, y0) + roofH(x1, y1)) / 2), e2 = Math.abs(hc - (roofH(x0, y1) + roofH(x1, y0)) / 2);
    const tri = e1 <= e2 ? [[x0, y0], [x1, y1], [x1, y0], [x0, y0], [x0, y1], [x1, y1]] : [[x0, y0], [x0, y1], [x1, y0], [x1, y0], [x0, y1], [x1, y1]];
    for (const [x, y] of tri) put(f, x, y);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.computeVertexNormals();
  roofGroup.add(mesh(g, RM.tile, true, true));
}

/* cumeeiras e espigões (capas cerâmicas), só nos trechos que aparecem na superfície; rufo no rincão */
{
  const lines = [], A = RF[0], B = RF[1];
  const RA = [[2.145, 2.145], [2.145, 11.806]];
  lines.push([[2.145, 2.145], [2.145, 11.806], 0], [[A.x0, A.y0], [2.145, 2.145], 0], [[A.x1, A.y0], [2.145, 2.145], 0], [[A.x0, A.y1], [2.145, 11.806], 0], [[A.x1, A.y1], [2.145, 11.806], 0]);
  lines.push([[5.83, 4.101], [5.83, 12.411], 1], [[B.x0, B.y0], [5.83, 4.101], 1], [[B.x1, B.y0], [5.83, 4.101], 1], [[B.x0, B.y1], [5.83, 12.411], 1], [[B.x1, B.y1], [5.83, 12.411], 1]);
  for (const [p, q, own] of lines) {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(2, Math.ceil(len / 0.1)); let run = null; const runs = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t, mine = rfH(RF[own], x, y), other = rfH(RF[1 - own], x, y), vis = mine >= other - 0.004 && mine > 0.001 || (k === 0 && mine >= other - 0.004);
      if (vis) { if (!run) runs.push(run = []); run.push([x, y]); } else run = null;
    }
    for (const r of runs) if (r.length > 1) { const a = r[0], b = r[r.length - 1]; cylSeg(RM.cap, 0.085, [a[0], EY + roofH(a[0], a[1]) + 0.02, a[1]], [b[0], EY + roofH(b[0], b[1]) + 0.02, b[1]]); }
  }
  for (const [x, y] of [[2.145, 2.145], [2.145, 11.806], [5.83, 4.101], [5.83, 12.411]]) ball(RM.cap, 0.095, [x, EY + roofH(x, y) + 0.02, y]);
  // rufo do rincão (vale) entre as duas alas: duas abas que acompanham as águas
  const va = 2.561, vb = 13.951, vg = new THREE.BufferGeometry(), vp = [];
  for (const [xa, xb] of [[4.13, 4.29], [4.29, 4.45]]) { const P = [[xa, va], [xb, va], [xb, vb], [xa, vb]]; for (const k of [0, 1, 2, 0, 2, 3]) { const [x, y] = P[k]; vp.push(wx(x), EY + roofH(x, y) + 0.006, wz(y)); } }
  vg.setAttribute('position', new THREE.Float32BufferAttribute(vp, 3)); vg.computeVertexNormals(); roofGroup.add(mesh(vg, RM.rufo, false, true));
}

/* forro de beiral, testeira e calha de chapa em todo o perímetro */
for (const s of [[-0.55, -0.04, -0.55, 14.501], [-0.04, 4.84, -0.55, -0.04], [4.33, 4.84, -0.04, 2.521], [4.84, 7.92, 2.011, 2.521], [7.41, 7.92, 2.011, 14.501], [-0.04, 7.41, 13.991, 14.501]]) rbox(RM.paint, s[0], s[2], s[1], s[3], H + 0.03, H + 0.05);
const EDGES = [[[-0.55, -0.55], [-0.55, 14.501], [-1, 0]], [[-0.55, -0.55], [4.84, -0.55], [0, -1]], [[4.84, -0.55], [4.84, 2.011], [1, 0]], [[4.84, 2.011], [7.92, 2.011], [0, -1]], [[7.92, 2.011], [7.92, 14.501], [1, 0]], [[-0.55, 14.501], [7.92, 14.501], [0, 1]]];
function edgeBox(mat, a, b, n, o0, o1, h0, h1, ext) {
  if (a[0] === b[0]) { const [x0, x1] = rfix([a[0] + n[0] * o0, a[0] + n[0] * o1]), [y0, y1] = rfix([a[1], b[1]]); rbox(mat, x0, y0 - ext, x1, y1 + ext, h0, h1); }
  else { const [y0, y1] = rfix([a[1] + n[1] * o0, a[1] + n[1] * o1]), [x0, x1] = rfix([a[0], b[0]]); rbox(mat, x0 - ext, y0, x1 + ext, y1, h0, h1); }
}
for (const [a, b, n] of EDGES) {
  edgeBox(RM.paint, a, b, n, 0, 0.03, H + 0.03, H + 0.21, 0.03);                 // testeira
  edgeBox(RM.rufo, a, b, n, 0.03, 0.13, H + 0.04, H + 0.05, 0.1);                // fundo da calha
  edgeBox(RM.rufo, a, b, n, 0.12, 0.13, H + 0.04, H + 0.15, 0.1);                // aba externa da calha
}
/* condutores pluviais (nenhum cruza janelas): saem da calha, desviam até a parede e descem até o chão */
for (const [xg, xw, dir, ys, wallX] of [[-0.625, -0.13, -1, [0.62, 12.7], 0], [8.0, 7.5, 1, [3.5, 13.0], 7.37]]) for (const Y of ys) {
  const P = [[xg, H + 0.04, Y], [xg, H - 0.3, Y], [xw, H - 0.8, Y], [xw, -0.1, Y], [xw + dir * 0.25, -0.1, Y]];
  for (let k = 0; k < P.length - 1; k++) cylSeg(RM.pipe, 0.04, P[k], P[k + 1]);
  for (const k of [1, 2, 3]) ball(RM.pipe, 0.046, P[k]);
  for (const h of [0.35, 1.35, 2.2]) { cylSeg(RM.rufo, 0.05, [xw, h, Y], [xw, h + 0.03, Y]); rbox(RM.rufo, Math.min(xw, wallX), Y - 0.015, Math.max(xw, wallX), Y + 0.015, h, h + 0.03); }
  obstacles.push([xw - 0.06, Y - 0.06, xw + 0.06, Y + 0.06]);
}
/* visibilidade: a cobertura some ao baixar o corte das paredes, na vista de planta e quando a camada é desligada */
roofVis = () => { roofGroup.visible = document.getElementById('t-roof').checked && clipPlane.constant >= H + 0.0005 && mode !== 'top'; invalidate(); renderer.shadowMap.needsUpdate = true; syncLabels(); };
document.getElementById('t-roof').addEventListener('change', () => roofVis());
function roofOff() { const cb = document.getElementById('t-roof'); if (cb.checked) { cb.checked = false; roofVis(); } }   // ao ir para um cômodo, o interior precisa ficar visível
syncLabels();
