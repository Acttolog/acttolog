const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--enable-unsafe-swiftshader','--use-angle=swiftshader'] });
  const p = await browser.newPage();
  await p.evaluateOnNewDocument(() => { localStorage.setItem('act_welcomed','1'); localStorage.setItem('act_consent', JSON.stringify({necessary:true,analytics:false,personalization:false})); });
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('http://127.0.0.1:8140/', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(4000); // let WebGL globe spin up
  const info = await p.evaluate(() => ({
    canvas: [...document.querySelectorAll('#hero canvas')].map(c => ({ w: c.width, h: c.height })),
    heroH: document.querySelector('#hero')?.getBoundingClientRect().height,
  }));
  console.log('HERO', JSON.stringify(info));
  await p.screenshot({ path: 'C:/Users/acttolog/AppData/Local/arcadeqa/deck/hero-now.png' });
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
