import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport:{width:1280,height:900} });
await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(1000);
// modo claro, para comprobar que sigue siendo legible
await p.evaluate(()=>document.documentElement.setAttribute('data-contrast','light'));
await p.waitForTimeout(400);
await p.screenshot({path:'/home/claude/modo-claro.png'});
await p.evaluate(()=>document.documentElement.removeAttribute('data-contrast'));
await p.waitForTimeout(300);
await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,90));}});
await p.evaluate(()=>window.scrollTo(0,2600)); await p.waitForTimeout(500);
await p.screenshot({path:'/home/claude/somos.png'});
const mob = await b.newPage({viewport:{width:390,height:844}});
await mob.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
await mob.waitForTimeout(900);
await mob.screenshot({path:'/home/claude/v3-mob.png'});
await b.close(); console.log('listo');
