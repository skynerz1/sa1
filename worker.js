// worker.js — عقدة سحب على Cloudflare Workers
// نشغل كل INTERVAL ثانية بدلا من cron لان CF لا يدعمه.

const PANEL   = (process.env.NODE_PANEL_URL || '').replace(/\/+$/, '');
const TOKEN   = process.env.NODE_TOKEN || '';
const NAME    = process.env.NODE_NAME || 'cf-node';
const BATCH   = Math.max(1, parseInt(process.env.NODE_BATCH || '20', 10));
const CONC    = Math.max(1, parseInt(process.env.NODE_CONCURRENCY || '6', 10));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
         + '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let stats = { cycles: 0, jobs: 0, errors: 0, startedAt: Date.now(), lastMs: 0 };

async function call(action, extra = {}, timeoutMs = 55000) {
  if (!PANEL || !TOKEN) throw new Error('NODE_PANEL_URL / NODE_TOKEN غير مضبوطين');
  const url = PANEL + '/api/node.php';
  const body = JSON.stringify({ action, token: TOKEN, node: NAME, ...extra });
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body, signal: ac.signal,
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error('رد غير صالح HTTP ' + res.status); }
    if (!res.ok || data.ok === false) throw new Error(data.error || 'HTTP ' + res.status);
    return data;
  } finally { clearTimeout(t); }
}

async function getHtml(url, { timeout = 25000, retries = 2 } = {}) {
  for (let i = 0; i <= retries; i++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ar,en-US;q=0.8,en;q=0.6',
        },
        signal: ac.signal, redirect: 'follow',
      });
      if (res.ok) return await res.text();
    } catch (_) {}
    finally { clearTimeout(t); }
    if (i < retries) await new Promise(r => setTimeout(r, 400 * (i + 1)));
  }
  throw new Error('فشل الجلب: ' + url);
}

function semaphore(n) {
  let active = 0, q = [];
  return {
    run(fn) {
      return new Promise((resolve, reject) => {
        const exec = async () => {
          active++;
          try { resolve(await fn()); }
          catch (e) { reject(e); }
          finally { active--; next(); }
        };
        if (active < n) exec(); else q.push(exec);
      });
    },
    next() { const f = q.shift(); if (f && active < n) f(); },
    async all(tasks) { return Promise.allSettled(tasks.map(t => this.run(t))); },
  };
}

async function cycle() {
  const t0 = Date.now();
  stats.cycles++;
  try {
    const h = await call('hello', {}, 15000);
    const limit = Math.min(BATCH, h.batch || BATCH);
    const { items = [] } = await call('batch', { limit });
    if (!items.length) { stats.lastMs = Date.now() - t0; return { handled: 0 }; }

    const sem = semaphore(CONC);
    let ok = 0;
    await sem.all(items.map(it => async () => {
      try {
        const html = await getHtml(it.url);
        await call('report', { url: it.url, ok: true, size: html.length });
        ok++;
      } catch (e) {
        await call('report', { url: it.url, ok: false, error: String(e.message || e) }).catch(() => {});
      }
    }));

    stats.jobs += ok;
    await call('beat', { stats: { ...stats, cycles: stats.cycles, jobs: stats.jobs, ms: Date.now() - t0 } }).catch(() => {});
    return { handled: ok };
  } catch (e) {
    stats.errors++;
    return { error: String(e.message || e) };
  } finally { stats.lastMs = Date.now() - t0; }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/api/cron' || url.searchParams.get('run') === '1') {
      const started = Date.now();
      const r = await cycle().catch(e => ({ error: String(e.message || e) }));
      return new Response(JSON.stringify({ ok: true, node: NAME, ...r, ms: Date.now() - started }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Not Found', { status: 404 });
  },
  async scheduled() {
    try { await cycle(); } catch (e) { console.error('[cf] cycle err:', e); }
  },
};