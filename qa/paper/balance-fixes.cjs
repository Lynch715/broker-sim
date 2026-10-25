// 2026-10-25：营业部上限、两支建设团队、两融利息与穿仓、挖人带资产
const fs=require('fs'),assert=require('assert');const {JSDOM,VirtualConsole}=require('jsdom');
const errors=[],v=new VirtualConsole();v.on('jsdomError',e=>{if(!e.message.includes('navigation'))errors.push(e.message)});
const dom=new JSDOM(fs.readFileSync(__dirname+'/../../index.html','utf8'),{url:'http://localhost:8799',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:v,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>null;}});
const w=dom.window,d=w.document;let count=0;function t(n,f){f();count++;console.log('PASS',n)}
const G=()=>w.BrokerGame,S=()=>G().getState();
const opts=()=>[...d.querySelectorAll('#mOpts button')];
const opt=re=>{const b=opts().find(x=>re.test(x.textContent));assert(b,'找不到选项 '+re);return b;};
const closeModal=()=>{for(let i=0;i<6&&d.querySelector('#mask.show');i++){const b=opts().pop();if(b)b.click();}};
const fresh=()=>{G().setHeadless(false);G().newGame('broker-fix',null,'steady',120);w.renderAll&&w.renderAll();closeModal();return S();};
setTimeout(()=>{try{
 t('营业部最多十二家，点位池够开满',()=>{
   const s=fresh();s.grade='A';s.cash=500000;
   assert.equal(G().BALANCE.outlet.maxCount,12);
   assert(G().OUTLET_POOL.length+s.outlets.length>=12,'点位不够开满');
   for(let i=0;i<9;i++){s.energy=3;w.actExpand();opt(/^开营业部/).click();opts().find(b=>!b.disabled&&!/返回/.test(b.textContent)).click();closeModal();}
   assert.equal(s.outlets.length,12);
   s.energy=3;w.actExpand();assert(opt(/^开营业部/).disabled,'满十二家后应禁用');closeModal();
 });
 t('两支建设团队可同时筹建，第三项要等',()=>{
   const s=fresh();s.month=25;s.cash=500000;s.lab=1;s.labStar=2;s.energy=3;
   assert(G().buildBusiness('advisory'));assert(G().buildBusiness('digital'));
   assert(!G().buildBusiness('institution'),'两队都忙时不能再开工');
   assert(!G().buildBusiness('advisory'),'同一项一次只升一级');
   assert.equal(s.business.builds.length,2);
   for(let i=0;i<5;i++)G().settleBusiness([]);
   assert.equal(s.business.levels.advisory,1);assert.equal(s.business.levels.digital,1);assert.equal(s.business.builds.length,0);
 });
 t('旧档的单个在建项目读进来并入队列',()=>{
   const s=fresh();s.business={levels:{},modes:{},changed:{},ledger:{},history:[],active:{id:'advisory',level:1,left:2},mandate:null};
   const c=G().businessState();assert.equal(c.active,null);assert.equal(c.builds.length,1);assert.equal(c.builds[0].id,'advisory');
 });
 t('十年任期里漏掉几个月也能把六项建满',()=>{
   // 每项一开放就排队，但每次完工后故意空两个月再开下一级
   const s=fresh();G().setHeadless(true);s.cash=9e6;const c=G().businessState();const idle={};
   for(let m=1;m<=119;m++){s.month=m;s.energy=3;s.grade='A';s.lab=1;
     for(const p of G().LONG_PROJECTS){if((idle[p.id]||0)>m)continue;if(G().buildBusiness(p.id))idle[p.id]=m+p.time+2;}
     G().settleBusiness([]);}
   G().LONG_PROJECTS.forEach(p=>assert.equal(c.levels[p.id],3,p.name+' 没建满'));
   G().setHeadless(false);
 });
 t('两融余额不超过可动用现金，没开业务也一样',()=>{
   const s=fresh();s.marginOn=false;s.mood=95;s.cash=G().BALANCE.cost.hq;  // 账上几乎没钱
   s.margin=50000;G().setHeadless(true);G().settleCore();G().setHeadless(false);
   assert.equal(s.margin,0,'没钱也在放贷');
 });
 t('穿仓按当月跌幅算并核销余额，温和下跌不穿仓',()=>{
   const s=fresh();G().setHeadless(true);s.cash=900000;s.marginOn=true;s.marginLv=1;
   s.cycle.rets[s.month]=-0.05;s.margin=100000;let h0=s.track.marginHole||0;G().settleCore();
   assert.equal((s.track.marginHole||0)-h0,0,'跌5%不该穿仓');
   s.cycle.rets[s.month]=-0.20;const before=s.margin;h0=s.track.marginHole||0;const c0=s.cash;G().settleCore();
   const hole=(s.track.marginHole||0)-h0;
   assert(hole>0&&hole<before*0.2,'跌20%穿仓应在两成以内，实际 '+hole+' / '+before);
   G().setHeadless(false);
 });
 t('两融弹窗不再显示 NaN',()=>{const s=fresh();s.month=12;s.grade='A';w.actMarginSet();assert(!d.querySelector('#mBody').textContent.includes('NaN'));closeModal();});
 t('挖人带来的资产与公司规模无关',()=>{
   const s=fresh();s.trust=100;s.cash=60000;s.aum=50000000;   // 五千亿
   s.rivals.forEach(r=>{r.heat=0;});
   const a0=s.aum;s.energy=3;w.actPoach();opts()[0].click();closeModal();
   const got=s.aum-a0;assert(got>0&&got<=60000,'带来 '+got+' 万');
 });
 t('防得紧时按加价后的价格判断钱够不够',()=>{
   const s=fresh();s.trust=40;s.rivals.forEach(r=>{r.heat=2;r.blown=false;});
   const cost=G().BALANCE.poach.cost[1];s.cash=cost+1;s.energy=3;w.actPoach();
   assert(opts()[0].disabled,'现金只够原价时应禁用');closeModal();
 });
 t('脚本无报错',()=>assert.deepEqual(errors,[]));console.log(count+' balance fix checks passed');dom.window.close();
}catch(e){console.error(e);process.exit(1);}},300);
