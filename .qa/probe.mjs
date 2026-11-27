// Driver CDP mínimo (sem dependências) para reproduzir o travamento no modo noite+caminhada.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = Number(process.env.CDP_PORT || 9333);
const BASE = process.env.BASE || 'http://localhost:8137/casa-3d.html';
const HEADLESS = process.env.HEADFUL ? false : true;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), 'edge-qa-'));
const args = [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
  '--mute-audio', '--hide-scrollbars', '--window-size=1280,800',
  '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
];
if (HEADLESS) args.unshift('--headless=new');
if (process.env.SWIFT) args.push('--enable-unsafe-swiftshader');
args.push('about:blank');

const edge = spawn(EDGE, args, { stdio: 'ignore', windowsHide: true });

async function waitDevtools(timeoutMs = 30000) {
  const t0 = Date.now();
  let lastErr;
  while (Date.now() - t0 < timeoutMs) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return await r.json();
    } catch (e) { lastErr = e; }
    await sleep(250);
  }
  throw new Error('devtools não respondeu: ' + (lastErr && lastErr.message));
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    const events = [];
    let seq = 0;
    ws.addEventListener('open', () => resolve({
      call(method, params = {}) {
        return new Promise((res, rej) => {
          const id = ++seq;
          pending.set(id, { res, rej });
          ws.send(JSON.stringify({ id, method, params }));
        });
      },
      events,
      close: () => { try { ws.close(); } catch {} },
    }));
    ws.addEventListener('error', e => reject(new Error('ws erro: ' + (e.message || 'falha'))));
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else if (msg.method) {
        events.push(msg);
      }
    });
  });
}

const SCENARIO = `async (cfg) => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const D = window.__dbg;
  if (!D) return { error: 'window.__dbg ausente' };
  const q = s => document.querySelector(s);
  const vis = () => D.LIGHTS.filter(L => L.light.visible).length;
  const progs = () => D.renderer.info.programs.length;

  const gl = D.renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);

  // amostrador de intervalos de quadro, medido em performance.now()
  let gaps = [], last = null, running = true;
  const tick = () => {
    const t = performance.now();
    if (last !== null) gaps.push(t - last);
    last = t;
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const lt = [];
  let po = null;
  try {
    po = new PerformanceObserver(l => { for (const e of l.getEntries()) lt.push(Math.round(e.duration)); });
    po.observe({ type: 'longtask' });
  } catch (e) {}
  const reset = () => { gaps = []; last = null; lt.length = 0; };
  const stat = () => ({
    frames: gaps.length,
    worst: gaps.length ? Math.round(Math.max(...gaps)) : 0,
    over100: gaps.filter(x => x > 100).length,
    over500: gaps.filter(x => x > 500).length,
    longTasks: lt.length,
    longMax: lt.length ? Math.max(...lt) : 0,
    longTotal: lt.reduce((a, b) => a + b, 0),
  });

  await sleep(1200);
  reset();

  // 1) troca de horário — custo síncrono do clique + espera da compilação assíncrona
  const progBefore = progs(), litBefore = vis();
  const tSwitch = performance.now();
  q('[data-day="' + cfg.day + '"]').click();
  const switchMs = Math.round(performance.now() - tSwitch);
  const warmEl = document.getElementById('warm');
  let warmMs = 0;
  if (warmEl && !warmEl.hidden) {
    const tw = performance.now();
    while (!warmEl.hidden && performance.now() - tw < 180000) await sleep(100);
    warmMs = Math.round(performance.now() - tw);
  }
  const switchAfter = stat();
  const progAfterSwitch = progs();
  await sleep(300);

  // 2) entrar no modo + deslocamento
  reset();
  const progWalk0 = progs(), litWalk0 = vis();
  const tMode = performance.now();
  if (cfg.mode === 'walk') q('#v-walk').click();
  const modeMs = Math.round(performance.now() - tMode);
  await sleep(700);

  // estresse: troca horários e cenas várias vezes e confere se nada recompila
  if (cfg.mode === 'micro') {
    const D2 = window.__dbg;
    if (!D2.updateLightSet) return { error: 'updateLightSet não exposto' };
    D2.setMode('walk');
    const out = { setMs: [], renderAfter: [], renderPlain: [], progs: D2.renderer.info.programs.length };
    const pos = [[3.65, 17.6], [3.65, 15.2], [3.65, 13], [3.65, 10.6], [2.1, 9.2], [2.1, 7], [2.1, 4.9], [2.1, 1.8], [5.4, 6.9], [5.4, 11.9]];
    for (const [x, y] of pos) {
      Object.assign(D2.walker, { x, y });
      const t0 = performance.now();
      D2.updateLightSet();
      out.setMs.push(+(performance.now() - t0).toFixed(1));
      const t1 = performance.now();
      D2.renderer.render(D2.scene, D2.camera);
      out.renderAfter.push(+(performance.now() - t1).toFixed(1));
    }
    for (let i = 0; i < 6; i++) { const t = performance.now(); D2.renderer.render(D2.scene, D2.camera); out.renderPlain.push(+(performance.now() - t).toFixed(1)); }
    out.progsEnd = D2.renderer.info.programs.length;
    return { day: cfg.day, mode: 'micro', gpu, ...out };
  }

  if (cfg.mode === 'stress') {
    const days = ['manha', 'meiodia', 'tarde', 'entardecer', 'noite'];
    const scenes = ['all', 'visitas', 'relaxar', 'jantar', 'leitura', 'trabalho', 'limpeza', 'descanso', 'noturna', 'off'];
    const progS = progs();
    const ts = performance.now();
    for (let r = 0; r < 2; r++) {
      for (const d of days) { q('[data-day="' + d + '"]').click(); await sleep(120); }
      for (const s of scenes) {
        const sel = document.getElementById('l-scene');
        sel.value = s; sel.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(120);
      }
      // alterna modos: a escolha das luzes muda, a quantidade não
      for (let k = 0; k < 3; k++) {
        q('#v-walk').click(); await sleep(150);
        q('#v-orbit').click(); await sleep(150);
      }
    }
    return {
      day: cfg.day, mode: 'stress', gpu, stressMs: Math.round(performance.now() - ts),
      stressProgs: progs() - progS, stressCost: stat(),
      litEnd: vis(), programs: progs(),
    };
  }

  const trace = [];
  const iv = setInterval(() => trace.push(vis()), 100);
  const tMove = performance.now();
  if (cfg.mode === 'walk') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
  await sleep(cfg.moveMs);
  if (cfg.mode === 'walk') window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
  const moveWall = Math.round(performance.now() - tMove);
  clearInterval(iv);
  await sleep(400);
  running = false;
  try { if (po) po.disconnect(); } catch (e) {}

  let transitions = 0;
  for (let i = 1; i < trace.length; i++) if (trace[i] !== trace[i - 1]) transitions++;

  return {
    day: cfg.day, mode: cfg.mode, quality: cfg.quality || 'default', gpu,
    litBefore, litWalk0, litEnd: vis(), visMin: Math.min(...trace, vis()), visMax: Math.max(...trace, vis()),
    transitions,
    switchMs, switchProgs: progAfterSwitch - progBefore, switchCost: switchAfter, warmMs,
    modeMs, walkProgs: progs() - progWalk0, walkCost: stat(),
    moveExpectedMs: cfg.moveMs, moveWallMs: moveWall,
    walker: { x: +D.walker.x.toFixed(2), y: +D.walker.y.toFixed(2) },
  };
}`;

const ALL = [
  { name: 'noite+caminhada', day: 'noite', mode: 'walk', moveMs: 5000 },
  { name: 'tarde+caminhada', day: 'tarde', mode: 'walk', moveMs: 5000 },
  { name: 'noite+caminhada-alto', day: 'noite', mode: 'walk', moveMs: 5000, quality: 'alto' },
  { name: 'noite+orbita', day: 'noite', mode: 'orbit', moveMs: 2000 },
  { name: 'estresse-cenas', day: 'noite', mode: 'stress', moveMs: 0 },
  { name: 'micro-troca', day: 'noite', mode: 'micro', moveMs: 0 },
];

async function openPage(url) {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${url}`, { method: 'PUT' });
  if (!r.ok) throw new Error('json/new falhou: ' + r.status);
  return await r.json();
}

const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);

async function main() {
  const only = process.argv.slice(2);
  await waitDevtools();
  log('devtools ok');

  if (process.env.SHOTS) {
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync('.qa/shots', { recursive: true });
    const target = await openPage(BASE);
    const cdp = await connect(target.webSocketDebuggerUrl);
    await cdp.call('Runtime.enable');
    await cdp.call('Page.enable');
    const started = Date.now();
    let ready = null;
    while (Date.now() - started < 240000) {
      const r = await cdp.call('Runtime.evaluate', {
        expression: `({ rs: document.readyState, dbg: !!window.__dbg, loading: !!document.getElementById('loading') })`,
        returnByValue: true,
      });
      ready = r.result.value;
      if (ready.rs === 'complete' && ready.dbg && !ready.loading) break;
      await sleep(400);
    }
    log('pronto em', Math.round((Date.now() - started) / 1000) + 's');
    const evalJs = async (expr) => {
      const r = await cdp.call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const shot = async (name) => {
      const r = await cdp.call('Page.captureScreenshot', { format: 'png' });
      writeFileSync(`.qa/shots/${name}.png`, Buffer.from(r.data, 'base64'));
      log('shot', name);
    };
    // quais luzes entram no shader
    log('luzes no shader:', JSON.stringify(await evalJs(`window.__dbg.LIGHTS.filter(L => L.light.visible).map(L => L.zone + ':' + L.type + ':' + L.lm)`)));
    await evalJs(`document.querySelector('[data-day="tarde"]').click()`); await sleep(800);
    await shot('01-tarde');
    await evalJs(`document.querySelector('[data-day="noite"]').click()`); await sleep(800);
    await shot('02-noite-geral');
    // pontos reclamados: quarto/suíte e frente do muro, no modo caminhar
    const pose = async (x, y, yaw, name) => {
      await evalJs(`(() => { const w = window.__dbg.walker; w.x = ${x}; w.y = ${y}; w.yaw = ${yaw}; w.pitch = -0.05; return null; })()`);
      await sleep(900);
      await shot(name);
      log(name, 'luzes:', JSON.stringify(await evalJs(`window.__dbg.LIGHTS.filter(L => L.light.visible).map(L => L.zone + ':' + L.type)`)));
      log(name, 'cômodo:', await evalJs(`document.getElementById('hud-room').textContent`));
    };
    await evalJs(`document.querySelector('#v-walk').click()`);
    await sleep(500);
    await pose(3.45, 11.55, 0.35, '03-noite-suite');
    await pose(2.2, 21.0, 0, '04-noite-fachada');
    await pose(6.6, 12.2, -0.9, '05-noite-sala');
    await pose(6.3, 6.4, -1.2, '06-noite-cozinha');
    await pose(2.9, 2.75, 0.4, '07-noite-quarto02');
    await evalJs(`document.querySelector('#v-orbit').click()`); await sleep(1200);
    await shot('07-noite-orbita');
    await evalJs(`document.querySelector('[data-day="tarde"]').click()`); await sleep(900);
    await shot('08-tarde-final');
    cdp.close();
    edge.kill();
    return;
  }

  if (process.env.DOORS) {
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync('.qa/shots', { recursive: true });
    const target = await openPage(BASE);
    const cdp = await connect(target.webSocketDebuggerUrl);
    await cdp.call('Runtime.enable');
    await cdp.call('Page.enable');
    const started = Date.now();
    let ready = null;
    while (Date.now() - started < 240000) {
      const r = await cdp.call('Runtime.evaluate', {
        expression: `({ rs: document.readyState, dbg: !!window.__dbg, loading: !!document.getElementById('loading') })`,
        returnByValue: true,
      });
      ready = r.result.value;
      if (ready.rs === 'complete' && ready.dbg && !ready.loading) break;
      await sleep(400);
    }
    log('pronto em', Math.round((Date.now() - started) / 1000) + 's');
    const evalJs = async (expr) => {
      const r = await cdp.call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const shot = async (name) => {
      const r = await cdp.call('Page.captureScreenshot', { format: 'png' });
      writeFileSync(`.qa/shots/${name}.png`, Buffer.from(r.data, 'base64'));
      log('shot', name);
    };
    log('portas:', JSON.stringify(await evalJs(`window.__dbg.doors.map(d => ({ n: d.name, c: d.center.map(v => +v.toFixed(2)), h: [d.frame.position.x + 3.685, d.frame.position.z + 9.225].map(v => +v.toFixed(2)) }))`)));
    // painel fora da imagem, rótulos desligados, parede inteira visível
    await evalJs(`(() => {
      document.getElementById('panel').style.display = 'none';
      const l = document.getElementById('t-labels'); if (l.checked) l.click();
      const cut = document.getElementById('cut'); cut.value = cut.max; cut.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-day="tarde"]').click();
      return null; })()`);
    await sleep(700);
    // vista geral das portas dos quartos, parecida com a captura do relato (antes dos experimentos)
    await evalJs(`(() => {
      const D = window.__dbg;
      const l = document.getElementById('t-labels'); if (!l.checked) l.click();
      D.camera.position.set(6.6 - 3.685, 7.2, 8.4 - 9.225);
      D.controls.target.set(2.2 - 3.685, 0.9, 5.4 - 9.225);
      D.camera.fov = 40; D.camera.updateProjectionMatrix();
      D.controls.update(); D.invalidate(6); return null; })()`);
    await sleep(1200);
    await shot('geral-portas');
    // no modo caminhar, no corredor olhando as portas
    await evalJs(`(() => {
      const D = window.__dbg;
      document.querySelector('#v-walk').click();
      Object.assign(D.walker, { x: 3.45, y: 8.6, yaw: 2.7, pitch: -0.12 });
      D.invalidate(6); return null; })()`);
    await sleep(1200);
    await shot('caminhar-portas');
    await evalJs(`(() => { document.querySelector('#v-orbit').click(); return null; })()`);
    await sleep(900);
    // close-ups: câmera a ~1,4 m de cada porta, de frente
    const views = [['Quarto 01']];
    // portas fechadas: a moldura aparece inteira
    await evalJs(`(() => { for (const d of window.__dbg.doors) { d.t = 0; d.target = 0; d.v = 0; d.pivot.rotation.y = 0; } window.__dbg.invalidate(4); return null; })()`);
    await sleep(600);
    const frameCam = (name) => `(() => {
        const d = window.__dbg.doors.find(x => x.name === ${JSON.stringify(name)});
        const D = window.__dbg, c = d.center, e = d.frame.matrixWorld.elements;
        const cx = c[0] - 3.685, cz = c[1] - 9.225;
        let nx = e[8], nz = e[10]; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
        let tx = e[0], tz = e[2]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        D.camera.position.set(cx + nx * 2.3 + tx * 0.55, 1.55, cz + nz * 2.3 + tz * 0.55);
        D.controls.target.set(cx, 1.35, cz);
        D.camera.fov = 38; D.camera.updateProjectionMatrix();
        D.controls.update(); D.invalidate(4); return null; })()`;
    for (const [name] of views) {
      await evalJs(frameCam(name));
      await sleep(900);
      await shot('moldura-' + name.toLowerCase().replace(/ /g, '-'));
      // só a moldura, pintada: mostra a silhueta real da geometria
      await evalJs(`(() => {
        const D = window.__dbg, d = D.doors.find(x => x.name === ${JSON.stringify(name)});
        D.scene.traverse(o => { if (o.isMesh) o.visible = false; });
        d.frame.visible = true;
        d.frame.traverse(o => { if (!o.isMesh) return; const m = new D.THREE.MeshBasicMaterial({ color: 0xff0000, side: 2 }); o.material = m; o.visible = true; });
        D.scene.background = new D.THREE.Color(0x101010);
        D.invalidate(4); return null; })()`);
      await sleep(1500);
      await shot('moldura-isolada');
      // experimento: mesma geometria com face dupla — a face de frente existe?
      await evalJs(`(() => {
        const d = window.__dbg.doors.find(x => x.name === ${JSON.stringify(name)});
        const seen = new Set();
        d.frame.traverse(o => { if (!o.isMesh || !o.material || seen.has(o.material)) return; seen.add(o.material);
          const m = o.material.clone(); m.side = 2; m.needsUpdate = true; o.material = m; });
        window.__dbg.invalidate(4); return null; })()`);
      await sleep(1500);
      await shot('moldura-face-dupla');
      // experimento: mesma geometria, sem textura — separa z-fighting de UV/moiré
      await evalJs(`(() => {
        const d = window.__dbg.doors.find(x => x.name === ${JSON.stringify(name)});
        const seen = new Set();
        d.frame.traverse(o => { if (!o.isMesh || !o.material || seen.has(o.material)) return; seen.add(o.material);
          const m = o.material.clone(); m.map = null; m.bumpMap = null; m.roughnessMap = null; m.color.set(0xd9b98a); m.needsUpdate = true; o.material = m; });
        window.__dbg.invalidate(4); return null; })()`);
      await sleep(1500);
      await shot('moldura-sem-textura');
      // experimento: bias da sombra do sol (se o padrão mudar, é acne de sombra)
      await evalJs(`(() => {
        const D = window.__dbg;
        const sun = D.scene.children.find(o => o.isDirectionalLight) || D.scene.getObjectByProperty('isDirectionalLight', true);
        if (!sun) return 'sem sol';
        sun.shadow.bias = -0.01; sun.shadow.normalBias = 0.25;
        D.renderer.shadowMap.needsUpdate = true; D.invalidate(4);
        return 'bias alterado'; })()`).then(v => log('sombra:', v));
      await sleep(1200);
      await shot('moldura-bias-alto');
      // experimento: esconde o grupo do batente/guarnição — a faixa pertence a ele?
      log('frame:', JSON.stringify(await evalJs(`(() => {
        const d = window.__dbg.doors.find(x => x.name === 'Quarto 01');
        const out = [];
        d.frame.traverse(o => { if (o.isMesh) out.push({ n: o.name || '', tris: o.geometry.attributes.position.count / 3, mat: o.material.name || o.material.type, col: o.material.color ? o.material.color.getHexString() : '-', maps: [!!o.material.map, !!o.material.bumpMap] }); });
        return out; })()`)));
      await evalJs(`(() => { const d = window.__dbg.doors.find(x => x.name === 'Quarto 01'); d.frame.visible = false; window.__dbg.invalidate(4); return null; })()`);
      await sleep(900);
      await shot('sem-moldura');
      await evalJs(`(() => { const d = window.__dbg.doors.find(x => x.name === 'Quarto 01'); d.frame.visible = true; window.__dbg.invalidate(4); return null; })()`);
      log('cena:', JSON.stringify(await evalJs(`window.__dbg.scene.children.map(c => ({ t: c.type, n: c.name || '-', kids: c.children.length, vis: c.visible }))`)));
      // raycast nas duas faixas listradas: quem está ali?
      log('parede-oculta:', JSON.stringify(await evalJs(`(() => {
        const D = window.__dbg; let n = 0;
        D.scene.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === 'f2f0eb') { o.visible = false; n++; } });
        D.invalidate(4); return n; })()`)));
      await sleep(900);
      await shot('sem-parede');
      log('todos-ocultos:', JSON.stringify(await evalJs(`(() => {
        const D = window.__dbg; let n = 0;
        D.scene.traverse(o => { if (o.isMesh && o.material && o.material.isMeshPhysicalMaterial && o.material.map && o.material.bumpMap) { o.visible = false; n++; } });
        D.invalidate(4); return n; })()`)));
      await sleep(900);
      await shot('sem-madeira');
      for (const gi of [3, 1]) {
        await evalJs(`(() => { window.__dbg.scene.children[${gi}].visible = false; window.__dbg.invalidate(4); return null; })()`);
        await sleep(800);
        await shot('sem-grupo-' + gi);
        await evalJs(`(() => { window.__dbg.scene.children[${gi}].visible = true; window.__dbg.invalidate(4); return null; })()`);
      }
      await evalJs(`(() => { window.__dbg.invalidate(4); return null; })()`);
    }
    for (const [name] of views) {
      const ok = await evalJs(frameCam(name));
      await sleep(800);
      await shot('porta-' + name.toLowerCase().replace(/ /g, '-'));
      if (ok !== 'ok') log('aviso', name, ok);
      // detalhe: bem perto da guarnição esquerda
      await evalJs(`(() => {
        const d = window.__dbg.doors.find(x => x.name === ${JSON.stringify(name)});
        const D = window.__dbg, c = d.center, e = d.frame.matrixWorld.elements;
        const cx = c[0] - 3.685, cz = c[1] - 9.225;
        let nx = e[8], nz = e[10]; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
        let tx = e[0], tz = e[2]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        D.camera.position.set(cx + nx * 0.55 + tx * 0.42, 1.55, cz + nz * 0.55 + tz * 0.42);
        D.controls.target.set(cx + tx * 0.43, 1.5, cz + tz * 0.43);
        D.camera.fov = 26; D.camera.updateProjectionMatrix();
        D.controls.update(); D.invalidate(4); return null;
      })()`);
      await sleep(800);
      await shot('detalhe-' + name.toLowerCase().replace(/ /g, '-'));
      if (name === 'Quarto 01') {
        // experimento: mesma geometria, sem textura — separa z-fighting de UV/moiré
        await evalJs(`(() => {
          const d = window.__dbg.doors.find(x => x.name === 'Quarto 01');
          const seen = new Set();
          d.frame.traverse(o => { if (!o.isMesh || !o.material || seen.has(o.material)) return; seen.add(o.material);
            const m = o.material.clone(); m.map = null; m.bumpMap = null; m.roughnessMap = null; m.needsUpdate = true; o.material = m; });
          window.__dbg.invalidate(4); return null; })()`);
        await sleep(1200);
        await shot('sem-textura-quarto-01');
      }
    }
    cdp.close();
    edge.kill();
    return;
  }

  if (process.env.QUICK) {
    const target = await openPage(BASE);
    const cdp = await connect(target.webSocketDebuggerUrl);
    await cdp.call('Runtime.enable');
    const t0 = Date.now();
    let ready = null;
    while (Date.now() - t0 < 180000) {
      const r = await cdp.call('Runtime.evaluate', {
        expression: `({ rs: document.readyState, dbg: !!window.__dbg, loading: !!document.getElementById('loading') })`,
        returnByValue: true,
      });
      ready = r.result.value;
      if (ready.rs === 'complete' && ready.dbg && !ready.loading) break;
      await sleep(500);
    }
    const r = await cdp.call('Runtime.evaluate', {
      expression: `(() => { const D = window.__dbg; if (!D) return { info: 'sem __dbg' };
        const gl = D.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info');
        const walk = D.LIGHTS.filter(L => Number.isFinite(D.Q.cull));
        return { gpu: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
                 vendor: e ? gl.getParameter(e.UNMASKED_VENDOR_WEBGL) : '?',
                 lights: D.LIGHTS.length, visible: D.LIGHTS.filter(L => L.light.visible).length,
                 shadows: D.LIGHTS.filter(L => L.light.castShadow).length,
                 cull: String(D.Q.cull), quality: D.Q.name, dpr: D.Q.dpr,
                 programs: D.renderer.info.programs.length,
                 parallelCompile: D.renderer.extensions.has('KHR_parallel_shader_compile'),
                 cores: navigator.hardwareConcurrency, mem: navigator.deviceMemory || null }; })()`,
      returnByValue: true,
    });
    log('QUICK', JSON.stringify({ ready, loadMs: Date.now() - t0, ...r.result.value }));
    cdp.close();
    edge.kill();
    return;
  }

  const results = [];
  for (const sc of ALL) {
    if (only.length && !only.some(o => sc.name.includes(o))) continue;
    const target = await openPage(BASE);
    const cdp = await connect(target.webSocketDebuggerUrl);
    try {
      await cdp.call('Runtime.enable');
      await cdp.call('Page.enable');
      const t0 = Date.now();
      let ready = null;
      while (Date.now() - t0 < 180000) {
        const r = await cdp.call('Runtime.evaluate', {
          expression: `({ rs: document.readyState, dbg: !!window.__dbg, loading: !!document.getElementById('loading'), webgl: (()=>{try{return !!document.createElement('canvas').getContext('webgl2')}catch(e){return false}})() })`,
          returnByValue: true,
        });
        ready = r.result.value;
        if (ready.rs === 'complete' && ready.dbg && !ready.loading) break;
        await sleep(400);
      }
      if (!ready || !ready.dbg) {
        results.push({ scenario: sc.name, error: 'não inicializou', ready });
        console.log('RESULT', JSON.stringify(results.at(-1)));
        continue;
      }
      log('iniciando cenário', sc.name, 'ready em', Math.round((Date.now() - t0) / 1000) + 's');
      const r = await cdp.call('Runtime.evaluate', {
        expression: `(${SCENARIO})(${JSON.stringify({ day: sc.day, mode: sc.mode, moveMs: sc.moveMs, quality: sc.quality })})`,
        awaitPromise: true, returnByValue: true, userGesture: true, timeout: 600000,
      });
      if (r.exceptionDetails) {
        results.push({ scenario: sc.name, error: r.exceptionDetails.exception?.description || r.exceptionDetails.text });
      } else {
        results.push({ scenario: sc.name, webgl: ready.webgl, ...r.result.value });
      }
      const errs = [];
      for (const ev of cdp.events) {
        if (ev.method === 'Runtime.exceptionThrown') errs.push(ev.params.exceptionDetails.exception?.description || ev.params.exceptionDetails.text);
        else if (ev.method === 'Runtime.consoleAPICalled' && ev.params.type === 'error') errs.push(ev.params.args.map(a => a.description || a.value).join(' '));
      }
      if (errs.length) results.at(-1).errors = errs.slice(0, 6);
      console.log('RESULT', JSON.stringify(results.at(-1)));
    } catch (e) {
      results.push({ scenario: sc.name, error: String(e && e.message || e) });
      console.log('RESULT', JSON.stringify(results.at(-1)));
    } finally {
      cdp.close();
      try { await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`); } catch {}
    }
  }

  console.log('\nJSON_RESULTS ' + JSON.stringify(results));
}

try { await main(); } finally {
  edge.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
