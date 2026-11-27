// Verifica o painel recolhível em viewport de celular e de desktop (CDP, sem dependências).
// Uso: node .qa/panel-check.mjs        (exige `node .qa/server.mjs` em :8137)
// O loop de animação é bloqueado antes do módulo rodar: evita a compilação dos shaders
// (caríssima em software) durante as medidas, e a cena é desenhada uma vez, sob demanda.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = Number(process.env.CDP_PORT || 9444);
const BASE = process.env.BASE || 'http://localhost:8137/casa-3d.html';
const OUT = '.qa/shots/panel';
const sleep = ms => new Promise(r => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'edge-panel-'));
const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
  '--mute-audio', '--hide-scrollbars', '--window-size=1280,900', '--enable-unsafe-swiftshader',
  '--disable-dev-shm-usage', 'about:blank',
], { stdio: 'ignore', windowsHide: true });

// Segura o requestAnimationFrame antes de qualquer script da página: o loop do three.js
// fica em fila e nada compila shader durante as medidas. `__startFrames()` libera a fila
// depois, para as capturas com a cena (o app não expõe o renderer para desenhar à mão).
const RAF_HOLD = `(() => {
  const raf = window.requestAnimationFrame.bind(window);
  const caf = window.cancelAnimationFrame.bind(window);
  window.__raf = raf; window.__caf = caf; window.__frames = [];
  window.requestAnimationFrame = cb => { window.__frames.push(cb); return window.__frames.length; };
  window.cancelAnimationFrame = () => {};
  window.__startFrames = () => { const q = window.__frames.splice(0); q.forEach(cb => raf(cb)); return q.length; };
})();`;

async function waitDevtools(timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return r.json(); } catch {}
    await sleep(250);
  }
  throw new Error('devtools não respondeu');
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map(); const events = [];
    let seq = 0;
    const failAll = why => { for (const [, p] of pending) p.rej(new Error(why)); pending.clear(); };
    ws.addEventListener('open', () => resolve({
      events,
      call(method, params = {}, timeoutMs = 300000) {
        return new Promise((res, rej) => {
          const id = ++seq;
          const timer = setTimeout(() => { pending.delete(id); rej(new Error('timeout CDP ' + method)); }, timeoutMs);
          pending.set(id, { res: v => { clearTimeout(timer); res(v); }, rej: e => { clearTimeout(timer); rej(e); } });
          ws.send(JSON.stringify({ id, method, params }));
        });
      },
      close: () => { try { ws.close(); } catch {} },
    }));
    ws.addEventListener('close', () => failAll('navegador fechou (provavelmente crash do renderer)'));
    ws.addEventListener('error', e => { failAll('ws erro'); reject(new Error('ws: ' + (e.message || 'erro'))); });
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id); pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else if (msg.method) events.push(msg);
    });
  });
}

// Mede o painel, o botão, o D-pad e a área de sobreposição entre pílula minimizada e D-pad.
const PROBE = `(() => {
  const panel = document.getElementById('panel'), btn = document.getElementById('collapse');
  const body = document.getElementById('panel-body'), pad = document.getElementById('pad'), hud = document.getElementById('hud');
  const pr = panel.getBoundingClientRect(), br = btn.getBoundingClientRect();
  const cs = el => getComputedStyle(el);
  const padShown = cs(pad).display !== 'none';
  return {
    min: panel.classList.contains('min'),
    label: btn.textContent.replace(/\\s+/g, ' ').trim(),
    ariaExpanded: btn.getAttribute('aria-expanded'),
    ariaControls: btn.getAttribute('aria-controls'),
    title: btn.title,
    bodyDisplay: cs(body).display,
    btnVisible: cs(btn).display !== 'none' && br.width > 0 && br.height > 0,
    btnInsidePanel: br.top >= pr.top - 1 && br.bottom <= pr.top + Math.min(pr.height, innerHeight) + 1,
    panel: { x: Math.round(pr.x), y: Math.round(pr.y), w: Math.round(pr.width), h: Math.round(pr.height) },
    viewport: { w: innerWidth, h: innerHeight },
    pad: { display: cs(pad).display, bottom: Math.round(parseFloat(cs(pad).bottom)),
           x: Math.round(pad.getBoundingClientRect().x), w: Math.round(pad.getBoundingClientRect().width) },
    padOverlap: (() => {
      if (!padShown) return 0;
      const a = panel.getBoundingClientRect(), b = pad.getBoundingClientRect();
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      return ox > 0 && oy > 0 ? Math.round(ox * oy) : 0;
    })(),
    hudDisplay: cs(hud).display,
    stored: localStorage.getItem('casa3d:painel-min'),
    scrollbar: panel.scrollHeight > panel.clientHeight + 1,
  };
})()`;

async function main() {
  await waitDevtools();
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.call('Runtime.enable');
  await cdp.call('Page.enable');
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: RAF_HOLD });
  const errors = [];

  // O app pré-aquece os shaders de Noite e Entardecer no carregamento (render síncrono):
  // em SwiftShader isso leva minutos, então as esperas são generosas.
  const evalJs = async (expr, timeoutMs = 300000) => {
    const r = await cdp.call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true }, timeoutMs);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const probe = () => evalJs(PROBE);
  const shot = async name => {
    const r = await cdp.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
    console.log('SHOT', join(OUT, name + '.png'));
  };
  const ready = async (timeoutMs = 600000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const r = await cdp.call('Runtime.evaluate', {
        expression: `({ rs: document.readyState, panel: !!document.getElementById('panel'), dbg: !!window.__dbg })`,
        returnByValue: true,
      }, 300000);
      if (r.result.value.rs === 'complete' && r.result.value.panel) return r.result.value;
      await sleep(400);
    }
    throw new Error('página não carregou');
  };
  const viewport = (w, h, mobile) => cdp.call('Emulation.setDeviceMetricsOverride', {
    width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile, screenWidth: w, screenHeight: h,
  });
  // Espera a thread principal ficar livre (compilar shader em software bloqueia o evaluate).
  const waitMainThreadFree = async (timeoutMs = 300000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const s = Date.now();
      try {
        await cdp.call('Runtime.evaluate', { expression: 'performance.now()', returnByValue: true }, 6000);
        if (Date.now() - s < 1500) return true;
      } catch {}
      await sleep(1000);
    }
    return false;
  };

  const report = {}, failed = [];
  const step = async (name, fn) => {
    try { return await fn(); }
    catch (e) { failed.push(name + ': ' + (e && e.message || e)); console.log('FALHA', name, e && e.message || e); return null; }
  };
  const ensure = async min => {
    const s = await probe();
    if (s.min !== min) { await evalJs(`document.getElementById('collapse').click(); null`); await sleep(350); }
    return probe();
  };

  // estado limpo + celular 360x640
  await cdp.call('Storage.clearDataForOrigin', { origin: 'http://localhost:8137', storageTypes: 'local_storage' });
  await viewport(360, 640, true);
  const nav = await cdp.call('Page.navigate', { url: BASE });
  if (nav.errorText) throw new Error('navegação falhou: ' + nav.errorText + ' (o servidor do .qa está no ar?)');
  await ready();

  report.mobileExpanded = await step('celular aberto', async () => {
    const s = await ensure(false); await shot('01-celular-aberto'); return s;
  });

  report.mobileMin = await step('celular minimizado', async () => {
    const s = await ensure(true); await shot('02-celular-minimizado'); return s;
  });

  // atalho M
  report.mobileShortcut = await step('atalho M', async () => {
    await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true })); null`);
    await sleep(300);
    return probe();
  });

  // modo caminhar (D-pad visível) com painel minimizado e aberto: nada pode se sobrepor
  report.mobileWalkMin = await step('caminhar + minimizado', async () => {
    await ensure(true);
    await evalJs(`document.body.classList.add('walking'); document.getElementById('pad').hidden = false; null`);
    await sleep(350);
    const s = await probe(); await shot('03-celular-caminhar-minimizado'); return s;
  });
  report.mobileWalkExpanded = await step('caminhar + aberto', async () => {
    await ensure(false); await sleep(350);
    const out = await probe(); await shot('04-celular-caminhar-aberto'); return out;
  });

  // desktop
  report.desktopExpanded = await step('desktop aberto', async () => {
    await viewport(1280, 800, false);
    await sleep(700);
    await evalJs(`document.body.classList.remove('walking'); document.getElementById('pad').hidden = true; null`);
    const s = await ensure(false); await shot('05-desktop-aberto'); return s;
  });

  report.desktopScrolled = await step('desktop rolado', async () => {
    await evalJs(`document.getElementById('panel').scrollTop = 99999; null`);
    await sleep(400);
    const s = await probe(); await shot('06-desktop-rolado'); return s;
  });

  report.desktopMin = await step('desktop minimizado', async () => {
    await evalJs(`document.getElementById('panel').scrollTop = 0; null`);
    const s = await ensure(true); await shot('07-desktop-minimizado'); return s;
  });

  // fase visual: libera o loop para desenhar a cena e captura em desktop
  report.visual = await step('capturas com a cena', async () => {
    await viewport(1280, 800, false);
    await ensure(false);
    const started = await evalJs(`window.__startFrames()`);
    const livre = await waitMainThreadFree();
    await sleep(1200);
    await shot('09-desktop-cena-expandido');
    await ensure(true);
    await sleep(600);
    await shot('10-desktop-cena-minimizado');
    return { started, livre };
  });

  // persistência: recarrega (por último; rAF volta travado, então é rápido)
  report.mobileReloaded = await step('persistência após recarregar', async () => {
    await viewport(360, 640, true);
    await sleep(500);
    await cdp.call('Page.reload', { ignoreCache: false });
    await sleep(2500);
    await ready();
    const s = await probe(); await shot('08-celular-recarregado'); return s;
  });

  for (const ev of cdp.events) {
    if (ev.method === 'Runtime.exceptionThrown') errors.push(ev.params.exceptionDetails.exception?.description || ev.params.exceptionDetails.text);
    else if (ev.method === 'Runtime.consoleAPICalled' && ev.params.type === 'error') errors.push(ev.params.args.map(a => a.description || a.value).join(' '));
  }
  report.errors = errors.slice(0, 6);
  report.failed = failed;

  console.log('PANEL_REPORT ' + JSON.stringify(report, null, 2));
  cdp.close();

  const a = report;
  const checks = [
    ['celular aberto: botão visível', a.mobileExpanded && a.mobileExpanded.btnVisible],
    ['celular aberto: corpo visível', a.mobileExpanded && a.mobileExpanded.bodyDisplay === 'block'],
    ['celular aberto: folha inferior (<= 52%)', a.mobileExpanded && a.mobileExpanded.panel.h <= a.mobileExpanded.viewport.h * 0.52 + 4],
    ['celular minimizado: pílula pequena', a.mobileMin && a.mobileMin.panel.h <= 60],
    ['celular minimizado: corpo oculto', a.mobileMin && a.mobileMin.bodyDisplay === 'none'],
    ['celular minimizado: aria-expanded=false', a.mobileMin && a.mobileMin.ariaExpanded === 'false'],
    ['celular minimizado: lembra estado', a.mobileMin && a.mobileMin.stored === '1'],
    ['atalho M reabre', a.mobileShortcut && a.mobileShortcut.min === false],
    ['caminhar + minimizado: sem sobreposição no D-pad', a.mobileWalkMin && a.mobileWalkMin.padOverlap === 0],
    ['caminhar + aberto: sem sobreposição no D-pad', a.mobileWalkExpanded && a.mobileWalkExpanded.padOverlap === 0],
    ['desktop aberto: botão visível', a.desktopExpanded && a.desktopExpanded.btnVisible],
    ['desktop rolado: botão continua acessível', a.desktopScrolled && a.desktopScrolled.btnInsidePanel],
    ['desktop minimizado: pílula pequena', a.desktopMin && a.desktopMin.panel.h <= 60],
    ['desktop minimizado: corpo oculto', a.desktopMin && a.desktopMin.bodyDisplay === 'none'],
    ['recarregar mantém minimizado', a.mobileReloaded && a.mobileReloaded.min === true && a.mobileReloaded.label === 'Expandir'],
    ['cena desenhou para as capturas', !!(a.visual && a.visual.livre)],
    ['sem erros de console', !errors.length],
    ['todas as etapas rodaram', failed.length === 0],
  ];
  for (const [nome, ok] of checks) console.log((ok ? 'OK   ' : 'FALHA') + ' ' + nome);
  const ruins = checks.filter(c => !c[1]);
  if (ruins.length) { console.log('CHECKS_FAILED ' + ruins.length); process.exitCode = 1; }
  else console.log('CHECKS_OK ' + checks.length);
}

try {
  await main();
} catch (e) {
  console.error('FALHOU', e && e.stack || e);
  process.exitCode = 1;
} finally {
  edge.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
