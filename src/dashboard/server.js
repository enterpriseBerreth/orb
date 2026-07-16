import http from 'node:http';
import { calculateMetrics } from '../analytics/metrics.js';
export function createServer({ bot, broker, journal, persistence }) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    // Status must never make a broker outage take down the HTTP process. The
    // broker exposes its most recent account and explicit health state instead.
    if (req.url === '/status' && broker.isAvailable?.()) await broker.account().catch(() => {});
    const body = req.url === '/health' ? { status: 'ok' }
      : req.url === '/status' ? { bot: 'running', paperTrading: true, broker: broker.status(), metrics: calculateMetrics(broker.orders), candidates: bot.lastScan, events: journal.recent(20) }
      : url.pathname === '/history/summary' ? { summary: await persistence.summarizeTradingDate(url.searchParams.get('date')) }
      : url.pathname === '/history' ? { events: url.searchParams.get('date') ? await persistence.eventsForTradingDate(url.searchParams.get('date')) : await persistence.recentEvents(200) }
      : null;
    if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(dashboardHtml); }
    if (!body) { res.writeHead(404); return res.end(JSON.stringify({ error: 'not found' })); }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(body));
  });
}
const dashboardHtml = `<!doctype html><html><head><title>ORB Bot</title><style>body{font:15px system-ui;margin:2rem;background:#101827;color:#e5e7eb}pre{background:#1f2937;padding:1rem;border-radius:8px;overflow:auto}h1{color:#34d399}</style></head><body><h1>ORB Futures Bot — Paper Trading</h1><p>Live status updates every 5 seconds.</p><pre id="status">Loading…</pre><script>async function load(){const r=await fetch('/status');document.querySelector('#status').textContent=JSON.stringify(await r.json(),null,2)}load();setInterval(load,5000)</script></body></html>`;
