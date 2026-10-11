const fs=require('fs'),assert=require('assert');const {JSDOM,VirtualConsole}=require('jsdom');
const errors=[],v=new VirtualConsole();v.on('jsdomError',e=>{if(!e.message.includes('navigation'))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(__dirname+'/../../index.html','utf8'),{url:'http://localhost:8788',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:v,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:s=>({width:s.length*8}),createLinearGradient:()=>({addColorStop(){}})},{get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>(t[k]=v,true)});}});
const w=dom.window,d=w.document;function click(sel){const x=d.querySelector(sel);assert(x,sel);x.click();}let count=0;function t(n,f){f();count++;console.log('PASS',n)}
setTimeout(()=>{try{
 t('十年新局到经营主界面',()=>{click('#guide .start');click('#mOpts button');click('#mOpts button');assert.equal(w.BrokerGame.endM(),120);});
 t('联系信息',()=>{w.showSettings();assert(d.querySelector('#mBody').textContent.includes('Lynchrrr'));click('#mOpts button:last-child');});
 t('经营页建设扣款并显示在建',()=>{click('[data-tab="business"]');const cash=w.BrokerGame.getState().cash;w.buildBusiness('advisory');assert.equal(w.BrokerGame.getState().cash,cash-1800);assert(d.querySelector('#panel').textContent.includes('筹建中'));});
 t('普通和夜读主题',()=>{w.setSkin('ink');assert.equal(d.body.dataset.theme,'dark');w.setSkin('paper');assert.equal(d.body.dataset.theme,'light');});
 t('策略按钮接真实状态',()=>{const s=w.BrokerGame.getState();s.business.active=null;s.business.levels.advisory=1;s.energy=3;w.switchTab('business');w.chooseOperatingMode('advisory');click('#mOpts button:nth-child(2)');assert.equal(s.business.modes.advisory,'growth');assert.equal(s.energy,2);assert(d.querySelector('#panel').textContent.includes('拓展客户'));});
 t('存档保存长期业务',()=>{const s=JSON.parse(w.localStorage.getItem('yjzq_save'));assert.equal(s.business.modes.advisory,'growth');assert.equal(s.maxMonth,120)});
 t('无原始图标或公式字符串泄漏',()=>{assert(!d.querySelector('#app').textContent.includes('[icon:'));w.actProp();assert(!d.querySelector('#mBody').textContent.includes('<svg'));});
 t('脚本无报错',()=>assert.deepEqual(errors,[]));console.log(count+' UI checks passed');dom.window.close();
}catch(e){console.error(e);dom.window.close();process.exitCode=1;}},50);
