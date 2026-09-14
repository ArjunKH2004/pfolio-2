import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[]; const results={};
for (const vp of [{name:'desktop',width:1280,height:900},{name:'mobile',width:390,height:844},{name:'short',width:390,height:667}]){
 const page=await browser.newPage({viewport:{width:vp.width,height:vp.height}});page.on('console',m=>m.type()==='error'&&errors.push(`${vp.name}: ${m.text()}`));page.on('pageerror',e=>errors.push(`${vp.name}: ${e.message}`));
 const routes=['/','/work','/process','/archive','/about','/contact','/work/ksrtc-workflow']; results[vp.name]={};
 for(const route of routes){await page.goto('http://127.0.0.1:4173'+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);results[vp.name][route]=await page.evaluate(()=>({vw:innerWidth,vh:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,bw:document.body.scrollWidth,bh:document.body.scrollHeight,overflowX:getComputedStyle(document.body).overflowX,overflowY:getComputedStyle(document.body).overflowY}));}
 if(vp.name==='desktop'){await page.goto('http://127.0.0.1:4173/work',{waitUntil:'networkidle'});await page.screenshot({path:'/tmp/mfg-app-preview/arjun-anti-portfolio/no-scroll-desktop.png'});await page.locator('.pager > button').last().focus();await page.keyboard.press('Enter');results.desktop.keyboardProject=await page.locator('.project-copy h1').innerText();await page.goto('http://127.0.0.1:4173/work/ksrtc-workflow',{waitUntil:'networkidle'});await page.locator('.case-pager > button').last().focus();await page.keyboard.press('Enter');results.desktop.casePage=new URL(page.url()).searchParams.get('page');}
 if(vp.name==='mobile'){await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});await page.screenshot({path:'/tmp/mfg-app-preview/arjun-anti-portfolio/no-scroll-mobile.png'});await page.locator('.menu-button').click();results.mobile.menuVisible=await page.locator('.menu-sheet').isVisible();}
 await page.close();
}
console.log(JSON.stringify({results,errors},null,2));await browser.close();