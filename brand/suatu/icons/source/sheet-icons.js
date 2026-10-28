const { chromium } = require('playwright'); const fs = require('fs');
const names = JSON.parse(fs.readFileSync('icons/icons.json'));
const cell = (n, size) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:92px">${fs.readFileSync('icons/svg/'+n+'.svg','utf8').replace('width="24" height="24"',`width="${size}" height="${size}"`)}<span style="font:11px sans-serif;opacity:.7">${n}</span></div>`;
const grid = (bg, fg, acc, size) => `<div style="background:${bg};color:${fg};--icon-accent:${acc};display:flex;flex-wrap:wrap;gap:14px 6px;padding:20px;width:1020px">${names.map(n=>cell(n,size)).join('')}</div>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1060,height:1200},deviceScaleFactor:1});
await p.setContent(`<body style="margin:0">${grid('#07231A','#EAF4EE','#C6F06A',32)}${grid('#EAF4EE','#07231A','#1E7A4F',24)}</body>`);
await p.screenshot({path:'icons/sheet.png',fullPage:true});await b.close();})();
