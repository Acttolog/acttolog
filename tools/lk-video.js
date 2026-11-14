#!/usr/bin/env node
/*
 * Render the Loksewa Ghar orientation film: a deterministic motion-graphics
 * scene driven frame by frame (window.seek(t)), shot at 1280x720, then encoded
 * with the bundled ffmpeg. No stock footage, no fabricated classroom claims —
 * the film only visualises the numbers this site publishes.
 *
 *   node tools/lk-video.js            # ~1000 frames + encode
 *   LKV_KEEP=1 node tools/lk-video.js # keep the frames for inspection
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const puppeteer = require('puppeteer');

const data = require('../src/lib/content/loksewa.json');
const OUT_DIR = path.join(__dirname, '..', 'public', 'loksewa', 'dl');
const FRAMES = path.join(__dirname, '..', '.frames');
const FFMPEG = process.env.FFMPEG || 'C:/Users/acttolog/.qoder/skills/youtube/bin/ffmpeg.exe';
const FPS = 25;
const SECONDS = 40;
const TOTAL = FPS * SECONDS;

const W = 1280;
const H = 720;

const papers = data.papers;
const stages = [...data.stages].sort((a, b) => a.order - b.order);
const subjects = papers.reduce((a, p) => a + p.subjects.length, 0);
const folders = papers.reduce((a, p) => a + p.subjects.reduce((b, s) => b + s.units.length, 0), 0);
const points = papers.reduce(
  (a, p) => a + p.subjects.reduce((b, s) => b + s.units.reduce((c, u) => c + u.points.length, 0), 0),
  0,
);
const allMarks = stages.reduce((a, s) => a + s.marks, 0);

const NE_NUM = '०१२३४५६७८९';
const ne = (n) => String(n).replace(/\d/g, (d) => NE_NUM[+d]);

const html = `<!doctype html><html lang="ne"><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#04050a}
body{font-family:'Nirmala UI','Noto Sans Devanagari',sans-serif;color:#e8eeff;-webkit-font-smoothing:antialiased}
#stage{position:absolute;inset:0;perspective:1300px}
.aur{position:absolute;inset:-20%;opacity:var(--aur,0);
  background:radial-gradient(38% 30% at 22% 28%,rgba(53,224,255,.42),transparent 65%),
             radial-gradient(34% 34% at 74% 22%,rgba(124,92,255,.44),transparent 66%),
             radial-gradient(30% 26% at 58% 78%,rgba(255,78,205,.24),transparent 68%);
  filter:blur(28px);transform:translate3d(var(--ax,0),var(--ay,0),0) scale(var(--as,1))}
.vig{position:absolute;inset:0;background:radial-gradient(75% 65% at 50% 45%,transparent,rgba(2,3,8,.86) 100%)}
.grain{position:absolute;inset:0;opacity:.055;background-image:linear-gradient(0deg,rgba(255,255,255,.5) 1px,transparent 1px);
  background-size:100% 3px;transform:translateY(var(--scan,0px))}
.ly{position:absolute;inset:0;opacity:0}
.brand{top:52px;left:72px;font-family:'Segoe UI',sans-serif;font-size:15px;color:#8fa2c8;opacity:0}
.brand b{color:#35e0ff;font-weight:600;letter-spacing:.34em}
.brand i{font-style:normal;letter-spacing:0;color:#9fb0d4}
.title{top:250px;left:72px;font-size:88px;line-height:.98;font-weight:700;letter-spacing:-.03em;
  clip-path:inset(0 calc(100% - var(--tw,0%)) 0 0)}
.title em{display:block;font-style:normal;font-size:26px;letter-spacing:.02em;color:#9fb0d4;margin-top:16px;font-weight:500}
.sub{top:470px;left:74px;font-size:25px;color:#cdd8f0;opacity:0;transform:translateY(18px)}
.counters{top:560px;left:74px;display:flex;gap:52px;opacity:0}
.counters div{min-width:120px}
.counters b{display:block;font-size:52px;font-weight:700;letter-spacing:-.03em;color:#35e0ff}
.counters span{font-size:17px;color:#8fa2c8}
.pyr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:10px;padding-bottom:40px;transform-style:preserve-3d;opacity:0}
.slab{position:relative;transform-style:preserve-3d;
  width:var(--w);padding:12px 22px;border-radius:12px;
  border:1px solid rgba(140,170,255,.28);background:linear-gradient(180deg,rgba(15,22,44,.94),rgba(8,11,22,.94));
  display:flex;align-items:center;gap:16px;opacity:0;box-shadow:0 30px 60px -30px rgba(0,0,0,.9);white-space:nowrap}
.slab i{font-style:normal;font-size:15px;color:#6c7899;min-width:26px}
.slab u{text-decoration:none;font-size:20px;font-weight:600;flex:1}
.slab s{text-decoration:none;font-size:19px;color:#f5c26b;font-weight:700}
.total{position:absolute;right:76px;bottom:74px;text-align:right;opacity:0}
.total b{font-size:58px;color:#fff;letter-spacing:-.04em}
.total span{display:block;font-size:19px;color:#8fa2c8;letter-spacing:.1em}
.ring{position:absolute;inset:0;transform-style:preserve-3d;opacity:0}
.plate{position:absolute;left:50%;top:258px;width:250px;margin-left:-125px;padding:18px;border-radius:14px;
  border:1px solid color-mix(in srgb,var(--c) 45%,transparent);
  background:linear-gradient(165deg,color-mix(in srgb,var(--c) 22%,rgba(8,11,22,.95)),rgba(8,11,22,.95));
  transform-style:preserve-3d;opacity:0}
.plate b{display:block;font-size:22px;line-height:1.25}
.plate em{display:block;font-style:normal;font-size:14px;color:#9fb0d4;margin-top:6px}
.plate span{display:block;font-size:15px;color:#c9d6f2;margin-top:12px}
.neg{position:absolute;left:50%;top:300px;transform:translate(-50%,0) scale(.6);opacity:0;text-align:center}
.neg b{font-size:150px;font-weight:700;color:#ff5f7a;letter-spacing:-.05em}
.neg span{display:block;font-size:26px;color:#ffd0d8;margin-top:4px}
.steps{position:absolute;left:74px;top:180px;display:grid;gap:22px}
.step{display:flex;gap:18px;align-items:baseline;opacity:0;transform:translateX(-26px)}
.step i{font-style:normal;font-size:22px;color:#7c5cff;font-weight:700}
.step u{text-decoration:none;font-size:27px}
.end{position:absolute;inset:0;display:grid;place-content:center;text-align:center;gap:14px;opacity:0}
.end h{display:block;font-size:62px;font-weight:700;letter-spacing:-.03em}
.end p{font-size:24px;color:#cdd8f0}
.end .url{font-family:'Consolas',monospace;font-size:26px;color:#35e0ff;letter-spacing:.02em}
.badge{position:absolute;right:72px;top:52px;font-size:15px;letter-spacing:.03em;color:#7f8fb3;opacity:0}
</style></head><body><div id="stage">
<div class="aur"></div><div class="vig"></div><div class="grain"></div>
<div class="brand" id="brand"><b>ACTTOLOG</b> · लोकसेवा घर</div>
<div class="badge" id="badge">शाखा अधिकृत · ${ne(allMarks)} अङ्क</div>
<div class="ly title" id="title" style="opacity:1">लोकसेवा घर<em>Loksewa Ghar — the whole civil-service house</em></div>
<div class="ly sub" id="sub">एक परीक्षा, ${ne(stages.length)} चरण — बाँकी सबै यहीँबाट सुरु हुन्छ।</div>
<div class="ly counters" id="cnt">
  <div><b id="c1">${ne(papers.length)}</b><span>पेपर</span></div>
  <div><b id="c2">${ne(subjects)}</b><span>विषय</span></div>
  <div><b id="c3">${ne(folders)}</b><span>फोल्डर</span></div>
  <div><b id="c4">${ne(points)}</b><span>बुँदा</span></div>
</div>
<div class="pyr" id="pyr">${[...stages].reverse()
  .map(
    (s, i) =>
      `<div class="slab" data-i="${i}" style="--w:${Math.round(34 + i * 11)}%"><i>${ne(s.order)}</i><u>${s.title.ne}</u><s>${ne(s.marks)}</s></div>`,
  )
  .join('')}</div>
<div class="total" id="total"><b>${ne(allMarks)}</b><span>जम्मा अङ्क</span></div>
<div class="ring" id="ring">${papers
  .map(
    (p, i) =>
      `<div class="plate" data-i="${i}" style="--c:${
        { 'var(--cy)': '#35e0ff', 'var(--vi)': '#7c5cff', 'var(--mg)': '#ff4ecd', 'var(--gold)': '#f5c26b' }[p.color]
      }"><b>${p.title.ne}</b><em>${p.title.en}</em><span>${ne(p.subjects.length)} विषय · ${ne(
        p.subjects.reduce((a, s) => a + s.units.length, 0),
      )} फोल्डर</span></div>`,
  )
  .join('')}</div>
<div class="neg" id="neg"><b>−२०%</b><span>गलत उत्तरमा नकारात्मक घटाइ — अनुमानले घटाउँछ</span></div>
<div class="steps" id="steps">${data.method
  .map((m, i) => `<div class="step" data-i="${i}"><i>${ne(m.step)}</i><u>${m.title.ne}</u></div>`)
  .join('')}</div>
<div class="end" id="end"><h>लोकसेवा घर</h><p>पाठ्यक्रम नक्सा, चेकलिस्ट र अभ्यास — निःशुल्क</p><span class="url">acttolog.github.io/loksewa</span></div>
</div>
<script>
const ND='०१२३४५६७८९';
const ne=n=>String(n).replace(/[0-9]/g,d=>ND[+d]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const seg=(t,a,b)=>clamp((t-a)/(b-a),0,1);
const ease=t=>1-Math.pow(1-t,3);
const out=t=>t*t*(3-2*t);
const S={
 brand:[0.2,1.2], title:[0.5,2.6], sub:[2.4,3.3], cnt:[3.1,4.5],
 pyr:[5.6,12.6], total:[11.6,13.0], ring:[14.2,21.8], neg:[22.8,28.2],
 steps:[28.8,34.4], end:[35.2,40.0]
};
window.seek=function(t){
  const aur=clamp(seg(t,0,3),0,1)*0.9+0.1;
  document.documentElement.style.setProperty('--aur',aur.toFixed(3));
  document.documentElement.style.setProperty('--ax',(Math.sin(t*0.22)*46).toFixed(1)+'px');
  document.documentElement.style.setProperty('--ay',(Math.cos(t*0.17)*30).toFixed(1)+'px');
  document.documentElement.style.setProperty('--as',(1+0.05*Math.sin(t*0.3)).toFixed(4));
  document.querySelector('.grain').style.setProperty('--scan',((t*90)%6).toFixed(2)+'px');

  const b=ease(seg(t,...S.brand));
  document.getElementById('brand').style.opacity=b.toFixed(3);
  document.getElementById('badge').style.opacity=ease(seg(t,4.4,5.4)).toFixed(3);

  const tw=ease(seg(t,...S.title));
  document.getElementById('title').style.setProperty('--tw',(tw*100).toFixed(2)+'%');
  document.getElementById('title').style.opacity=(tw>0?1:0);
  document.getElementById('title').style.transform='translateY('+((1-tw)*26).toFixed(1)+'px)';

  const su=ease(seg(t,...S.sub));
  const sEl=document.getElementById('sub');
  sEl.style.opacity=su.toFixed(3); sEl.style.transform='translateY('+((1-su)*18).toFixed(1)+'px)';

  const c=ease(seg(t,...S.cnt));
  const cEl=document.getElementById('cnt');
  cEl.style.opacity=c.toFixed(3); cEl.style.transform='translateY('+((1-c)*20).toFixed(1)+'px)';
  ['c1','c2','c3','c4'].forEach((id,k)=>{
    const target=[${papers.length},${subjects},${folders},${points}][k];
    const p=clamp((t-S.cnt[0])/(S.cnt[1]-S.cnt[0])-k*0.06,0,1);
    document.getElementById(id).textContent=ne(Math.round(target*out(p)));
  });

  // pyramid: the objective gate lands first and the stack grows upward
  const pe=seg(t,...S.pyr);
  const pyrEl=document.getElementById('pyr');
  const slabs=pyrEl.children, n=slabs.length;
  for(let i=0;i<n;i++){
    const k=clamp((pe-(n-1-i)*0.07)/0.34,0,1), e=out(k);
    slabs[i].style.opacity=e.toFixed(3);
    slabs[i].style.transform='translate3d(0,'+((1-e)*-150).toFixed(1)+'px,'+((1-e)*520).toFixed(1)+'px) rotateX('+((1-e)*-28).toFixed(1)+'deg)';
  }
  const te=ease(seg(t,...S.total));
  const tEl=document.getElementById('total');
  tEl.style.opacity=te.toFixed(3); tEl.style.transform='scale('+(0.92+0.08*te).toFixed(3)+')';

  // papers orbit on a tilted disc: x, y and z all change, so plates never stack
  const re=seg(t,...S.ring);
  document.getElementById('ring').style.opacity=re>0.02?'1':'0';
  document.querySelectorAll('.plate').forEach((el,i)=>{
    const k=clamp((re-i*0.07)/0.42,0,1), e=out(k);
    const th=(i*90)+20+(t-S.ring[0])*6;
    const rad=th*Math.PI/180;
    const x=Math.sin(rad)*470;
    const y=-Math.cos(rad)*74;
    const z=(Math.cos(rad)*300-300)-(1-e)*560;
    const front=(Math.cos(rad)+1)/2;
    el.style.opacity=(e*(0.5+0.5*front)).toFixed(3);
    el.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,'+z.toFixed(1)+'px)';
  });

  const nEl=document.getElementById('neg');
  const nk=seg(t,S.neg[0],S.neg[0]+0.5), nd=1-seg(t,S.neg[1]-0.6,S.neg[1]);
  const ne2=Math.min(nk,nd);
  nEl.style.opacity=(ne2>0?out(ne2):0).toFixed(3);
  nEl.style.transform='translate(-50%,0) scale('+(0.6+0.4*out(nk)).toFixed(3)+')';

  document.querySelectorAll('.step').forEach((el,i)=>{
    const k=clamp((seg(t,...S.steps)-i*0.11)/0.34,0,1), e=out(k);
    el.style.opacity=e.toFixed(3); el.style.transform='translateX('+((1-e)*26).toFixed(1)+'px)';
  });

  const ee=ease(seg(t,...S.end));
  const eEl=document.getElementById('end');
  eEl.style.opacity=ee.toFixed(3);
  eEl.querySelectorAll('h,p,.url').forEach((n,i)=>{
    const k=clamp((seg(t,...S.end)-i*0.1)/0.5,0,1);
    n.style.opacity=k.toFixed(3); n.style.transform='translateY('+((1-out(k))*16).toFixed(1)+'px)';
  });

  // section hand-offs: each block gives the frame to the next one
  const fade=1-seg(t,4.8,5.5);
  document.getElementById('title').style.opacity=fade.toFixed(3);
  document.getElementById('sub').style.opacity=(su*fade).toFixed(3);
  document.getElementById('cnt').style.opacity=(c*(1-seg(t,13.2,14.0))).toFixed(3);
  pyrEl.style.opacity=(seg(t,S.pyr[0]-0.2,S.pyr[0]+0.4)*(1-seg(t,13.2,14.0))).toFixed(3);
  tEl.style.opacity=(te*(1-seg(t,13.2,14.0))).toFixed(3);
  document.getElementById('ring').style.opacity=(re*(1-seg(t,22.0,22.7))).toFixed(3);
  document.getElementById('steps').style.opacity=(1-seg(t,34.6,35.2)).toFixed(3);
};
window.seek(0);
</script></body></html>`;

/* ── capture ──────────────────────────────────────────────────── */

fs.rmSync(FRAMES, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-features=CalculateNativeWinOcclusion', '--force-color-profile=srgb'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluateHandle(() => document.fonts.ready);

  if (process.env.LKV_PREVIEW) {
    const shots = [1.2, 3.9, 9.5, 12.8, 16.2, 18.0, 20.4, 25.5, 31.0, 38.0];
    const dir = path.join(__dirname, '..', '.shots');
    fs.mkdirSync(dir, { recursive: true });
    for (const t of shots) {
      await page.evaluate((x) => window.seek(x), t);
      await page.screenshot({ path: path.join(dir, `lkv-${String(t).replace('.', '_')}.png`), type: 'png' });
    }
    await browser.close();
    console.log('preview frames written to .shots/lkv-*.png');
    process.exit(0);
  }

  const t0 = Date.now();
  for (let f = 0; f < TOTAL; f += 1) {
    await page.evaluate((t) => window.seek(t), f / FPS);
    await page.screenshot({ path: path.join(FRAMES, `f${String(f).padStart(4, '0')}.png`), type: 'png' });
    if (f % 200 === 0) console.log(`frame ${f}/${TOTAL}  ${(Date.now() - t0) / 1000}s`);
  }
  await browser.close();
  console.log(`captured ${TOTAL} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const mp4 = path.join(OUT_DIR, 'orientation.mp4');
  const jpg = path.join(OUT_DIR, 'orientation.jpg');

  // A quiet synthesised bed: three detuned partials, low-passed and faded.
  // It is generated here, not composed or recorded — the page says so too.
  const bed =
    `aevalsrc=0.5*sin(2*PI*110*t)+0.3*sin(2*PI*164.81*t)+0.12*sin(2*PI*220*t):s=44100:d=${SECONDS},` +
    `tremolo=f=0.16:d=0.4,lowpass=f=1000,volume=0.22,` +
    `afade=t=in:st=0:d=2.5,afade=t=out:st=${SECONDS - 3}:d=3`;
  const args = [
    '-y',
    '-framerate', String(FPS),
    '-i', path.join(FRAMES, 'f%04d.png'),
    '-f', 'lavfi', '-i', bed,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-g', '50', '-keyint_min', '25', '-sc_threshold', '40',
    '-c:a', 'aac', '-b:a', '96k', '-ar', '44100',
    '-movflags', '+faststart', '-shortest',
    mp4,
  ];
  execFileSync(FFMPEG, args, { stdio: ['ignore', 'ignore', 'inherit'] });

  // Poster from the pyramid beat, encoded through the same ffmpeg binary.
  execFileSync(FFMPEG, ['-y', '-ss', '11.6', '-i', mp4, '-frames:v', '1', '-q:v', '3', jpg], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  try {
    execFileSync(FFMPEG, ['-i', mp4, '-hide_banner'], { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    // ffmpeg exits non-zero with no output file; the banner on stderr is the report.
    console.log(String(e.stderr || e.message).split('\n').filter((l) => /Duration|Stream|Input/.test(l)).join('\n'));
  }
  const v = fs.statSync(mp4);
  const p = fs.statSync(jpg);
  console.log(`orientation.mp4  ${(v.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`orientation.jpg  ${(p.size / 1024).toFixed(0)} KB`);

  if (!process.env.LKV_KEEP) fs.rmSync(FRAMES, { recursive: true, force: true });
})();
