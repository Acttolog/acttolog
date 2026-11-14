#!/usr/bin/env node
/*
 * Build the Loksewa Ghar teaching decks as real .pptx files.
 *
 * The package is written directly: a minimal but valid OOXML presentation
 * (16:9, one master, one layout, one theme) zipped with a hand-rolled
 * store/deflate writer, so no extra dependency is added to the site.
 *
 *   node tools/lk-pptx.js            -> public/loksewa/dl/slides-<paper>.pptx
 *
 * Every slide is generated from src/lib/content/loksewa.json, so a deck can
 * only contain syllabus points the site already publishes.
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const data = require('../src/lib/content/loksewa.json');
// Paid material is deliberately NOT written under public/: the Pages harvest
// copies public/ verbatim, and a paid file there is a free file.
const OUT = path.join(__dirname, '..', '.lk-paid');

/* ── zip writer ───────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function zip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const buf = Buffer.from(content, 'utf8');
    const deflated = zlib.deflateRawSync(buf, { level: 9 });
    const useDeflate = deflated.length < buf.length;
    const body = useDeflate ? deflated : buf;
    const crc = crc32(buf);
    const nameBuf = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(useDeflate ? 8 : 0, 8);
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0x2821, 12); // date 2000-01-01
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(buf.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, body);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0, 8);
    dir.writeUInt16LE(useDeflate ? 8 : 0, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(0x2821, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(body.length, 20);
    dir.writeUInt32LE(buf.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt16LE(0, 30);
    dir.writeUInt16LE(0, 32);
    dir.writeUInt16LE(0, 34);
    dir.writeUInt16LE(0, 36);
    dir.writeUInt32LE(0, 38);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, centralBuf, end]);
}

/* ── OOXML helpers ────────────────────────────────────────────── */

const EMU_IN = 914400;
const W = 12192000; // 13.333in
const H = 6858000; // 7.5in
const IN = (v) => Math.round(v * EMU_IN);

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** PowerPoint needs a complex-script face for Devanagari; Nirmala UI ships on Windows. */
const FONT = { latin: 'Segoe UI', cs: 'Nirmala UI' };

let idSeed = 1;
const nextId = () => idSeed++;

function run(text, o = {}) {
  const sz = Math.round((o.size ?? 18) * 100);
  const col = o.color ?? '1A1D24';
  return (
    `<a:r><a:rPr lang="${o.lang ?? 'ne-NP'}" altLang="en-US" sz="${sz}"${o.bold ? ' b="1"' : ''}${
      o.italic ? ' i="1"' : ''
    }><a:solidFill><a:srgbClr val="${col}"/></a:solidFill>` +
    `<a:latin typeface="${FONT.latin}"/><a:cs typeface="${FONT.cs}"/></a:rPr>` +
    `<a:t>${esc(text)}</a:t></a:r>`
  );
}

function para(text, o = {}) {
  const align = o.align ? ` algn="${o.align}"` : '';
  const bullet = o.bullet ? '<a:buChar char="•"/>' : '<a:buNone/>';
  const spc = o.spaceAfter ? `<a:spcAft><a:spcPts val="${o.spaceAfter * 100}"/></a:spcAft>` : '';
  return `<a:p><a:pPr${align}>${spc}${bullet}</a:pPr>${run(text, o)}</a:p>`;
}

function textbox(x, y, w, h, paras, o = {}) {
  const anchor = o.anchor ?? 't';
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${nextId()}" name="tb${idSeed}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>` +
    `<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="${anchor}">` +
    `<a:normAutofit fontScale="90000"/></a:bodyPr><a:lstStyle/>${paras.join('')}</p:txBody></p:sp>`
  );
}

function rect(x, y, w, h, color, o = {}) {
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${nextId()}" name="sh${idSeed}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>` +
    `<a:prstGeom prst="${o.prst ?? 'rect'}"><a:avLst/></a:prstGeom>` +
    `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>` +
    `<a:ln><a:noFill/></a:ln></p:spPr>` +
    `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></p:txBody></p:sp>`
  );
}

function slideXml(elements, bg = 'FFFFFF') {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
    `<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${bg}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>` +
    `<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
    `<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>` +
    elements.join('') +
    `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`
  );
}

/* ── static parts ─────────────────────────────────────────────── */

const THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Loksewa Ghar">
<a:themeElements><a:clrScheme name="Loksewa"><a:dk1><a:srgbClr val="1A1D24"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="2F3646"/></a:dk2><a:lt2><a:srgbClr val="F4F6FA"/></a:lt2><a:accent1><a:srgbClr val="1D8FA8"/></a:accent1>
<a:accent2><a:srgbClr val="5B4BC4"/></a:accent2><a:accent3><a:srgbClr val="C2158C"/></a:accent3>
<a:accent4><a:srgbClr val="B07A16"/></a:accent4><a:accent5><a:srgbClr val="1F8A5B"/></a:accent5>
<a:accent6><a:srgbClr val="6C7899"/></a:accent6><a:hlink><a:srgbClr val="1D8FA8"/></a:hlink><a:folHlink><a:srgbClr val="5B4BC4"/></a:folHlink></a:clrScheme>
<a:fontScheme name="Loksewa"><a:majorFont><a:latin typeface="Segoe UI Semibold"/><a:ea typeface=""/><a:cs typeface="Nirmala UI"/></a:majorFont>
<a:minorFont><a:latin typeface="Segoe UI"/><a:ea typeface=""/><a:cs typeface="Nirmala UI"/></a:minorFont></a:fontScheme>
<a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
<a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
<a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst>
<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle>
<a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

const MASTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>
<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`;

const LAYOUT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">
<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;

const MASTER_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

const LAYOUT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

const SLIDE_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const CORE = (title) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(title)}</dc:title><dc:creator>ACTTOLOG</dc:creator>
<cp:lastModifiedBy>ACTTOLOG</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">2026-11-06T00:00:00Z</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">2026-11-06T00:00:00Z</dcterms:modified>
</cp:coreProperties>`;

const APP = (n) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>ACTTOLOG Loksewa Ghar</Application><Slides>${n}</Slides><Company>ACTTOLOG</Company>
</Properties>`;

function contentTypes(slideCount) {
  let overrides = '';
  for (let i = 1; i <= slideCount; i += 1) {
    overrides += `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
${overrides}</Types>`;
}

const PRES_RELS = (slideCount) => {
  let rels = '';
  for (let i = 1; i <= slideCount; i += 1) {
    rels += `<Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>`;
  }
  rels += `<Relationship Id="rId${slideCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>`;
  rels += `<Relationship Id="rId${slideCount + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
};

/* ── slide builders ───────────────────────────────────────────── */

const M = IN(0.72);
const CW = W - M * 2;

/** The site stores accents as CSS variables; OOXML needs literal colours. */
const ACCENT = {
  'var(--cy)': { bar: '35E0FF', ink: '0E7C93' },
  'var(--vi)': { bar: '7C5CFF', ink: '4B36C9' },
  'var(--mg)': { bar: 'FF4ECD', ink: 'B3127F' },
  'var(--gold)': { bar: 'F5C26B', ink: '8A5E12' },
};
const accentOf = (color) => ACCENT[color] ?? { bar: '35E0FF', ink: '0E7C93' };

function titleSlide(p, marks, negative) {
  const { bar: accent, ink } = accentOf(p.color);
  return slideXml([
    rect(0, 0, W, IN(0.34), accent),
    rect(M, IN(1.5), IN(0.1), IN(2.5), accent),
    textbox(M + IN(0.4), IN(1.35), CW - IN(0.4), IN(1.05), [
      para(p.title.ne, { size: 40, bold: true, color: '14161C' }),
    ]),
    textbox(M + IN(0.4), IN(2.5), CW - IN(0.4), IN(0.6), [para(p.title.en, { size: 20, color: '5A6376' })]),
    textbox(M + IN(0.4), IN(3.25), CW - IN(0.6), IN(1.1), [
      para(p.short.ne, { size: 15, color: '2F3646' }),
      para(`${marks} अङ्क${negative > 0 ? ` · ${Math.round(negative * 100)}% नकारात्मक घटाइ` : ''}`, {
        size: 14,
        bold: true,
        color: ink,
      }),
    ]),
    textbox(M, IN(6.3), CW, IN(0.5), [
      para('लोकसेवा घर — पेपर प्याक · ACTTOLOG · acttolog.github.io/loksewa', { size: 11, color: '6C7899' }),
    ]),
  ]);
}

function overviewSlide(p) {
  const { bar: accent, ink } = accentOf(p.color);
  return slideXml([
    rect(0, 0, W, IN(0.1), accent),
    textbox(M, IN(0.5), CW, IN(0.6), [para('यो पेपर के हो', { size: 26, bold: true, color: '14161C' })]),
    textbox(M, IN(1.35), CW, IN(1.6), [para(p.intro.ne, { size: 16, color: '2F3646' }), para(p.intro.en, { size: 12, color: '6C7899' })]),
    rect(M, IN(3.2), CW, IN(0.02), 'C9CFDD'),
    textbox(M, IN(3.4), CW, IN(0.5), [para('पढाईको रणनीति', { size: 18, bold: true, color: ink })]),
    textbox(M, IN(3.95), CW, IN(1.9), [para(p.strategy.ne, { size: 15, color: '2F3646' }), para(p.strategy.en, { size: 12, color: '6C7899' })]),
  ]);
}

function subjectMapSlide(p, s, i) {
  const { bar: accent, ink } = accentOf(p.color);
  const lines = s.units.map(
    (u, k) =>
      para(`${String(k + 1).padStart(2, '0')}  ${u.title.ne}  ·  ${u.points.length} बुँदा`, {
        size: 15,
        color: '2F3646',
        spaceAfter: 6,
      }),
  );
  return slideXml([
    rect(0, 0, IN(0.1), H, accent),
    textbox(M, IN(0.42), CW, IN(0.5), [
      para(`विषय ${String(i + 1).padStart(2, '0')} — ${s.title.ne}`, { size: 24, bold: true, color: '14161C' }),
    ]),
    textbox(M, IN(1.02), CW, IN(0.4), [para(s.title.en, { size: 13, color: '6C7899' })]),
    textbox(M, IN(1.7), CW, IN(4.6), lines),
  ]);
}

function folderSlide(p, s, u, idx, total) {
  const { bar: accent, ink } = accentOf(p.color);
  const bullets = u.points.map((pt) => para(pt, { size: 17, color: '2F3646', bullet: true, spaceAfter: 9 }));
  return slideXml([
    rect(0, 0, W, IN(0.08), accent),
    textbox(M, IN(0.36), CW, IN(0.5), [para(u.title.ne, { size: 25, bold: true, color: '14161C' })]),
    textbox(M, IN(0.96), CW, IN(0.4), [
      para(`${s.title.en} · ${u.title.en} — पढ्नुपर्ने बुँदा ${idx}/${total}`, { size: 12, color: '6C7899' }),
    ]),
    rect(M, IN(1.5), CW, IN(0.02), 'C9CFDD'),
    textbox(M, IN(1.75), CW, IN(4.5), bullets),
    textbox(M, IN(6.5), CW, IN(0.4), [
      para('पढिसकेपछि: किताब बन्द गरेर यी बुँदा बाटोमा फुट्काएर भन्नुहोस्।', { size: 11, italic: true, color: ink }),
    ]),
  ]);
}

function questionsSlide(p, qs, from) {
  const { bar: accent, ink } = accentOf(p.color);
  const els = [
    rect(0, 0, W, IN(0.08), accent),
    textbox(M, IN(0.36), CW, IN(0.5), [
      para(`अभ्यास प्रश्न ${from + 1}–${from + qs.length}`, { size: 24, bold: true, color: '14161C' }),
    ]),
  ];
  let y = 1.1;
  for (const q of qs) {
    els.push(textbox(M, IN(y), CW, IN(0.42), [para(`${q.n}. ${q.q.ne}`, { size: 15, bold: true, color: '14161C' })]));
    y += 0.5;
    const opts = q.options.map((o, k) => `(${String.fromCharCode(97 + k)}) ${o.ne}`).join('   ');
    const lines = Math.max(1, Math.ceil(opts.length / 68));
    els.push(textbox(M + IN(0.25), IN(y), CW - IN(0.25), IN(0.3 * lines), [para(opts, { size: 13, color: '2F3646' })]));
    y += 0.3 * lines + 0.42;
  }
  return slideXml(els);
}

function keySlide(p, rows) {
  const { bar: accent, ink } = accentOf(p.color);
  const bullets = rows.map((r) =>
    para(`${r.n}. ${String.fromCharCode(97 + r.answer)} — ${r.explain.ne}`, {
      size: 13,
      color: '2F3646',
      spaceAfter: 7,
    }),
  );
  return slideXml([
    rect(0, 0, W, IN(0.08), accent),
    textbox(M, IN(0.36), CW, IN(0.5), [para('उत्तर कुञ्जी र व्याख्या', { size: 24, bold: true, color: '14161C' })]),
    textbox(M, IN(1.1), CW, IN(5.4), bullets),
  ]);
}

function closingSlide(p, sources) {
  const { bar: accent, ink } = accentOf(p.color);
  return slideXml([
    rect(0, 0, W, IN(0.34), accent),
    textbox(M, IN(0.9), CW, IN(0.7), [
      para('स्रोत र स्पष्टीकरण', { size: 26, bold: true, color: '14161C' }),
    ]),
    ...sources.map((s, i) =>
      textbox(M, IN(1.9 + i * 0.62), CW, IN(0.6), [
        para(`${s.name.ne} — ${s.url}`, { size: 14, color: '2F3646' }),
      ]),
    ),
    textbox(M, IN(4.6), CW, IN(1.6), [
      para(data.meta.disclaimer.ne, { size: 12, color: '6C7899' }),
      para('यो स्लाइड प्याक ACTTOLOG ले सार्वजनिक विषसूचीबाट बनाएको पढाइ सामग्री हो, आयोगको आधिकारिक प्रकाशन होइन।', {
        size: 11,
        color: '6C7899',
      }),
    ]),
  ]);
}

/* ── build ────────────────────────────────────────────────────── */

function buildDeck(paper) {
  const stage = data.stages.find((s) => s.title.en === paper.title.en || s.title.ne === paper.title.ne);
  const marks = stage ? stage.marks : 100;
  const negative = stage ? stage.negative : 0;
  const slides = [titleSlide(paper, marks, negative), overviewSlide(paper)];

  for (const s of paper.subjects) {
    slides.push(subjectMapSlide(paper, s, paper.subjects.indexOf(s)));
    const total = s.units.length;
    s.units.forEach((u, i) => slides.push(folderSlide(paper, s, u, i + 1, total)));
  }

  const qs = data.practice
    .filter((q) => q.paper === paper.slug)
    .map((q, i) => ({ ...q, n: i + 1 }));
  for (let i = 0; i < qs.length; i += 4) {
    slides.push(questionsSlide(paper, qs.slice(i, i + 4), i));
  }
  if (qs.length) slides.push(keySlide(paper, qs));
  slides.push(closingSlide(paper, data.sources));

  idSeed = 1;
  const entries = [
    ['[Content_Types].xml', contentTypes(slides.length)],
    ['_rels/.rels', ROOT_RELS],
    ['ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId${slides.length + 1}"/></p:sldMasterIdLst>
<p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('')}</p:sldIdLst>
<p:sldSz cx="${W}" cy="${H}" type="screen16x9"/><p:notesSz cx="${H}" cy="${W}"/>
</p:presentation>`],
    ['ppt/_rels/presentation.xml.rels', PRES_RELS(slides.length)],
    ['ppt/theme/theme1.xml', THEME],
    ['ppt/slideMasters/slideMaster1.xml', MASTER],
    ['ppt/slideMasters/_rels/slideMaster1.xml.rels', MASTER_RELS],
    ['ppt/slideLayouts/slideLayout1.xml', LAYOUT],
    ['ppt/slideLayouts/_rels/slideLayout1.xml.rels', LAYOUT_RELS],
    ['docProps/core.xml', CORE(`${paper.title.ne} — लोकसेवा घर पेपर प्याक`)],
    ['docProps/app.xml', APP(slides.length)],
  ];
  slides.forEach((xml, i) => {
    entries.push([`ppt/slides/slide${i + 1}.xml`, xml]);
    entries.push([`ppt/slides/_rels/slide${i + 1}.xml.rels`, SLIDE_RELS]);
  });

  return { buf: zip(entries), count: slides.length };
}

fs.mkdirSync(OUT, { recursive: true });
for (const paper of data.papers) {
  const { buf, count } = buildDeck(paper);
  const file = path.join(OUT, `slides-${paper.slug}.pptx`);
  fs.writeFileSync(file, buf);
  const folders = paper.subjects.reduce((a, s) => a + s.units.length, 0);
  console.log(
    `${path.basename(file).padEnd(28)} ${String(count).padStart(3)} slides · ${paper.subjects.length} विषय · ${folders} फोल्डर · ${(
      buf.length / 1024
    )
      .toFixed(0)
      .padStart(6)} KB`,
  );
}
console.log(`\nwrote to ${OUT} (outside public/, so nothing here is downloadable until the owner sends it)`);
