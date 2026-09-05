// Responsive/a11y acceptance gate for the CA hub.
// Runs the audit matrix from docs: 5 widths x 8 routes, asserting no document-level
// horizontal scroll, a minimum outer gutter, and that wide tables scroll only inside
// their own labelled wrapper.
//
// Usage: node scripts/check-responsive.mjs [baseUrl]        (default http://127.0.0.1:3100)
// ponytail: chromium only. The failures this catches (overflow, gutters) are layout
// math, not engine quirks; add firefox/webkit when a real cross-engine bug shows up.
import { chromium } from 'playwright';

const BASE = (process.argv[2] || 'http://127.0.0.1:3100').replace(/\/$/, '');
const WIDTHS = [320, 375, 768, 1024, 1440];
const MIN_GUTTER = 16;

const ROUTES = [
  '/',
  '/lookup/AAPL?eventType=cash-dividend&exDate=2026-09-30',
  '/settings',
  '/guide',
  '/upload',
  '/vendors',
  '/vendors/iso-taxonomy',
  '/vendors/event-extraction',
];

// Elements allowed to scroll horizontally inside themselves (wide reference tables).
const SCROLL_OK = '[data-wide-table], .overflow-x-auto, [role="region"][aria-label]';

let failures = 0;
let checks = 0;

const fail = (msg) => { failures++; console.log(`  FAIL ${msg}`); };
const pass = (msg) => { checks++; console.log(`  ok   ${msg}`); };

const browser = await chromium.launch();
// /upload and /api/ingest sit behind one Basic realm (src/middleware.ts). Supply the
// same credential the server was started with, so the gate measures the real page
// instead of the 401 challenge.
const cred = process.env.INGEST_BASIC_AUTH;
const [username, ...rest] = (cred || '').split(':');
const ctx = await browser.newContext(
  cred ? { httpCredentials: { username, password: rest.join(':') } } : {}
);
if (!cred) console.log('note: INGEST_BASIC_AUTH unset - /upload will answer 401 by design');

for (const route of ROUTES) {
  console.log(`\n${route}`);
  for (const width of WIDTHS) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width, height: 900 });
    let res;
    try {
      res = await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 });
    } catch (e) {
      fail(`${width}px navigation: ${e.message.split('\n')[0]}`);
      await page.close();
      continue;
    }
    if (!res || res.status() >= 400) {
      fail(`${width}px HTTP ${res ? res.status() : 'no response'}`);
      await page.close();
      continue;
    }

    const r = await page.evaluate((sel) => {
      const de = document.documentElement;
      const docScroll = de.scrollWidth - de.clientWidth;

      // Widest element that spills past the viewport, ignoring allowed scroll wrappers.
      const allowed = [...document.querySelectorAll(sel)];
      let worst = null;
      for (const el of document.querySelectorAll('body *')) {
        if (allowed.some((a) => a === el || a.contains(el))) continue;
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        const over = box.right - de.clientWidth;
        if (over > 1 && (!worst || over > worst.over)) {
          worst = { over: Math.round(over), tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 60) };
        }
      }

      // Outer gutter: leftmost edge of actual *content*, not of a full-bleed band.
      // Hero/section wrappers deliberately span the viewport (edge-to-edge borders and
      // tints); measuring them reports a 0px gutter for a correctly padded page.
      const main = document.querySelector('main') || document.body;
      const first = main.firstElementChild || main;
      let gutter = Infinity;
      for (const el of main.querySelectorAll('h1,h2,h3,p,li,label,button,a,input,td,th')) {
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        if (box.left >= 0) gutter = Math.min(gutter, Math.round(box.left));
      }
      if (!isFinite(gutter)) gutter = Math.round(first.getBoundingClientRect().left);

      // Header overlap: does the first content block start under a fixed/sticky header?
      const header = document.querySelector('header');
      let overlap = 0;
      if (header) {
        const pos = getComputedStyle(header).position;
        if (pos === 'fixed' || pos === 'sticky') {
          overlap = Math.round(header.getBoundingClientRect().bottom - first.getBoundingClientRect().top);
        }
      }
      return { docScroll, worst, gutter, overlap };
    }, SCROLL_OK);

    const tag = `${width}px`;
    if (r.docScroll > 1) fail(`${tag} document scrolls horizontally by ${r.docScroll}px` + (r.worst ? ` (widest: <${r.worst.tag} class="${r.worst.cls}"> +${r.worst.over}px)` : ''));
    else pass(`${tag} no document-level horizontal scroll`);

    if (width === 320) {
      if (r.gutter < MIN_GUTTER) fail(`${tag} outer gutter ${r.gutter}px < ${MIN_GUTTER}px`);
      else pass(`${tag} outer gutter ${r.gutter}px`);
    }

    if (r.overlap > 0) fail(`${tag} content clipped under sticky header by ${r.overlap}px`);

    await page.close();
  }
}

await browser.close();
console.log(`\n${checks} assertions passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
