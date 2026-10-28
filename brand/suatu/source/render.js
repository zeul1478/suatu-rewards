const { chromium } = require('playwright');
const fs = require('fs');
const S = f => fs.readFileSync('out/svg/' + f, 'utf8');
const jobs = [
  ['favicon-16.png','favicon.svg',16,1,true],['favicon-32.png','favicon.svg',32,1,true],['favicon-48.png','favicon.svg',48,1,true],
  ['apple-touch-icon.png','app-icon.svg',180,1,false],['icon-192.png','app-icon.svg',192,1,false],['icon-512.png','app-icon.svg',512,1,false],
  ['icon-maskable-192.png','app-icon-maskable.svg',192,1,false],['icon-maskable-512.png','app-icon-maskable.svg',512,1,false],
  ['og-image.png','og-image.svg',null,1,false],
  ['wordmark-dark@2x.png','wordmark-dark.svg',null,2,true],['wordmark-light@2x.png','wordmark-light.svg',null,2,true],
  ['lockup-dark@2x.png','lockup-dark.svg',null,2,true],['lockup-light@2x.png','lockup-light.svg',null,2,true],
];
(async () => {
  fs.mkdirSync('out/png', { recursive: true });
  const b = await chromium.launch();
  for (const [out, src, size, dpr, transparent] of jobs) {
    let svg = S(src); const m = svg.match(/width="([\d.]+)" height="([\d.]+)"/);
    const W = size || Math.ceil(+m[1]), H = size || Math.ceil(+m[2]);
    svg = svg.replace(/width="[\d.]+" height="[\d.]+"/, `width="${W}" height="${H}"`);
    const ctx = await b.newContext({ deviceScaleFactor: dpr, viewport: { width: W, height: H } });
    const p = await ctx.newPage();
    await p.setContent(`<html><body style="margin:0;background:transparent;line-height:0">${svg}</body></html>`);
    await p.screenshot({ path: 'out/png/' + out, omitBackground: transparent, clip: { x: 0, y: 0, width: W, height: H } });
    await ctx.close();
  }
  await b.close();
})();
