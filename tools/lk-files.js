#!/usr/bin/env node
/*
 * Build the Loksewa Ghar PDF set: render each print route through headless
 * Chrome and save the real A4 document into public/loksewa/dl.
 *
 *   LK_BASE=http://127.0.0.1:3100 node tools/lk-files.js
 *
 * Sizes and page counts printed here are what the site later shows on its
 * download cards, so nothing on the page can claim a file that was not built.
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

const BASE = process.env.LK_BASE || 'http://127.0.0.1:3100';
const OUT = path.join(__dirname, '..', 'public', 'loksewa', 'dl');

const papers = require('../src/lib/content/loksewa.json').papers.map((p) => p.slug);
const DOCS = [...papers, 'full', 'planner', 'laws', 'practice'];

// Chrome paginates from the print stylesheet; A4 margins come from @page.
const FOOTER = `<div style="width:100%;font-size:7px;color:#777;text-align:center;
  font-family:monospace;">ACTTOLOG — लोकसेवा घर · <span class="currentPage"></span>/<span class="totalPages"></span></div>`;

const pdfPageCount = (buf) => {
  const text = buf.toString('latin1');
  let max = 0;
  for (const m of text.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g)) max = Math.max(max, +m[1]);
  if (max) return max;
  for (const m of text.matchAll(/\/Count\s+(\d+)/g)) max = Math.max(max, +m[1]);
  return max || null;
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-features=CalculateNativeWinOcclusion', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1200 });

  const report = [];
  for (const doc of DOCS) {
    const url = `${BASE}/loksewa/print/${doc}`;
    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 }).catch((e) => null);
    if (!res || !res.ok()) {
      report.push({ doc, error: `http ${res ? res.status() : 'no response'}` });
      continue;
    }
    // Devanagari comes from the self-hosted variable font; wait or the PDF shows boxes.
    await page.evaluateHandle(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 350));

    const file = path.join(OUT, `${doc}.pdf`);
    await page.pdf({
      path: file,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      // An empty header suppresses Chrome's default date/URL line.
      headerTemplate: '<div></div>',
      footerTemplate: FOOTER,
      margin: { top: '13mm', bottom: '15mm', left: '12mm', right: '12mm' },
    });
    const buf = fs.readFileSync(file);
    report.push({
      doc,
      bytes: buf.length,
      pages: pdfPageCount(buf),
      head: buf.subarray(0, 5).toString('latin1'),
    });
  }

  await browser.close();

  let total = 0;
  console.log('\n  doc            pages   size       header');
  for (const r of report) {
    if (r.error) {
      console.log(`  ${r.doc.padEnd(14)} FAILED — ${r.error}`);
      continue;
    }
    total += r.bytes;
    console.log(
      `  ${r.doc.padEnd(14)} ${String(r.pages ?? '?').padStart(5)}   ${((r.bytes / 1024) | 0)
        .toString()
        .padStart(7)} KB   ${r.head}`,
    );
  }
  console.log(`\n  ${report.filter((r) => !r.error).length} PDFs, ${(total / 1024 / 1024).toFixed(2)} MB total`);
  if (report.some((r) => r.error)) process.exitCode = 1;
})();
