const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(__dirname+'/../../index.html','utf8');
function boot(save){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('navigation'))errors.push(e.message);});
 const dom=new JSDOM(html,{url:'http://localhost:49371',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=()=>({matches:false,addEventListener(){}});w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>null;
  if(save)w.localStorage.setItem('yjzq_save',save);
 }});return {dom,w:dom.window,d:dom.window.document,errors};
}
const b=boot(),{w,d}=b,G=w.BrokerGame;let count=0;
const close=()=>{for(let i=0;i<8&&d.querySelector('#mask.show');i++){const opts=[...d.querySelectorAll('#mOpts button')];opts[opts.length-1].click();}};
const fresh=()=>{G.setHeadless(true);G.newGame('training-check',null,'steady',120);G.setHeadless(false);w.renderAll();close();return G.getState();};
const test=(name,fn)=>{fn();count++;console.log('PASS',name);};
const option=re=>{const e=[...d.querySelectorAll('#mOpts button')].find(x=>re.test(x.textContent));assert(e,'找不到选项 '+re);return e;};
test('一次培训扣实际报价和一点精力，恢复状态并保存方向进度',()=>{
 const s=fresh(),e=s.emps[1];e.fatigue=40;const cash=s.cash,morale=s.morale,salary=e.salary;
 assert(G.trainEmployee(e.id,'mk'));assert.equal(s.cash,cash-90);assert.equal(s.energy,2);
 assert.equal(e.training.mk,50);assert.equal(e.mk,3);assert.equal(e.fatigue,34);assert.equal(s.morale,morale+2);assert.equal(e.salary,salary);
});
test('同月跨方向重复调用、无效方向与不存在员工不扣款',()=>{
 const s=G.getState(),cash=s.cash;assert(!G.trainEmployee(1,'mg'));assert(!G.trainEmployee(1,'bad'));assert(!G.trainEmployee(999,'mk'));assert.equal(s.cash,cash);assert.equal(s.energy,2);
});
test('下月同向培训升星、正确增加工资并增强主任产出',()=>{
 const s=G.getState(),e=s.emps[1];s.month++;s.energy=3;const salary=e.salary,out=G.outletInflow(s.outlets[1]);
 assert(G.trainEmployee(e.id,'mk'));assert.equal(e.mk,4);assert.equal(e.training.mk,0);assert.equal(e.salary,+(salary+0.3).toFixed(1));assert(G.outletInflow(s.outlets[1])>out);
});
test('换方向保留已有进度，管理和风控均可培养',()=>{
 const s=fresh(),e=s.emps[2];assert(G.trainEmployee(e.id,'mg'));s.month++;assert(G.trainEmployee(e.id,'rk'));assert.equal(e.training.mg,50);assert.equal(e.training.rk,50);
 s.month++;s.energy=3;assert(G.trainEmployee(e.id,'mg'));assert.equal(e.mg,4);assert.equal(e.training.rk,50);
});
test('现金、精力、满星、结束与月末处理各自阻止培训',()=>{
 let s=fresh();s.cash=49;assert(!G.trainEmployee(0,'rk'));s.cash=500;s.energy=0;assert(!G.trainEmployee(0,'rk'));s.energy=3;assert(!G.trainEmployee(0,'mk'));
 s.over=true;assert(!G.trainEmployee(0,'rk'));s.over=false;
 w.endMonth();const cash=s.cash;assert(w.saveImportBusy());assert(!G.trainEmployee(0,'rk'));assert.equal(s.cash,cash);close();
});
test('培训回执显示真实扣款、能力进度，月内按钮禁用',()=>{
 const s=fresh();w.switchTab('team');d.querySelector('[onclick="showTraining(1)"]').click();option(/^营销实训/).click();
 assert(/决策结果/.test(d.querySelector('#mTitle').textContent));assert(/陈斌营销实训进度/.test(d.querySelector('#mBody').textContent));assert(/90/.test(d.querySelector('#mBody').textContent));close();
 assert(d.querySelector('[onclick="showTraining(1)"]').disabled);assert(/营销实训 50\/100/.test(d.querySelector('#panel').textContent));
});
test('抓内部和员工页均可进入培训，浏览菜单不消耗随机数',()=>{
 const s=fresh();w.save();const rng=s.rngState,cash=s.cash;
 w.actInternal();option(/^员工培训/).click();option(/^唐蕾/).click();assert(/唐蕾/.test(d.querySelector('#mTitle').textContent));option(/^← 返回员工培训/).click();option(/^← 返回/).click();w.save();
 assert.equal(s.cash,cash);assert.equal(s.energy,3);assert.equal(s.rngState,rng);
});
test('正常月份的倦怠增速明显放慢，管理星与天赋减轻负担',()=>{
 const s=fresh();assert.equal(G.monthlyFatigue(s.emps[0],0),1);assert.equal(G.monthlyFatigue(s.emps[1],0),4);assert.equal(G.monthlyFatigue(s.emps[2],0),0);
 s.flags.tough=true;assert.equal(G.monthlyFatigue(s.emps[1],0),2.8);s.flags.tough=false;s.emps.forEach(e=>e.mg=5);assert.equal(G.monthlyFatigue(s.emps[1],0),3);
 s.pushMonth=true;assert.equal(G.monthlyFatigue(s.emps[1],4),7);
});
test('轮休恢复24点且限月一次，产出折扣与额外减负生效',()=>{
 const s=fresh();s.emps.forEach(e=>e.fatigue=60);const before=G.outletInflow(s.outlets[1]),morale=s.morale;
 assert(G.arrangeTeamRest());assert.equal(s.emps[1].fatigue,36);assert.equal(s.morale,morale+6);assert.equal(s.energy,2);assert.equal(s.track.rest,1);
 const adjusted=G.outletInflow(s.outlets[1]);s.restMonth=false;const full=G.outletInflow(s.outlets[1]);s.restMonth=true;assert.equal(adjusted,full*0.75);
 assert(G.monthlyFatigue(s.emps[1],0)<0);assert(!G.arrangeTeamRest());assert.equal(s.energy,2);assert(before>0);
 s.energy=0;s.restMonth=false;assert(!G.arrangeTeamRest());
});
test('真实结算保留日常休息，正常士气不再迅速跌到四十',()=>{
 const s=fresh();G.setHeadless(true);s.cash=9e6;s.cycle.rets[s.month]=0;s.mood=30;const morale=s.morale;
 G.settleCore();assert.equal(s.emps[1].fatigue,9);assert(s.morale>=morale);assert(s.moraleBase>=60);G.setHeadless(false);
});
test('高士气自然回落每月最多2.5，负现金压力仍存在',()=>{
 const s=fresh();G.setHeadless(true);s.cash=9e6;s.morale=100;s.mood=30;s.cycle.rets[s.month]=0;G.settleCore();assert(s.morale>=97.5);
 s.cash=-100000;s.morale=80;G.settleCore();assert(s.morale<70);G.setHeadless(false);
});
test('连续36个月、每季度轮休可控制倦怠并维持士气',()=>{
 const s=fresh();G.setHeadless(true);s.cash=9e6;
 for(let month=1;month<=36;month++){s.month=month;s.energy=3;s.mood=30;s.cycle.rets[month]=0;if(month%3===0)G.arrangeTeamRest();G.settleCore();}
 assert.equal(s.emps.length,3);assert(s.emps.every(e=>e.fatigue<50));assert(s.morale>55);G.setHeadless(false);
 console.log('36个月状态',JSON.stringify({morale:s.morale,fatigue:s.emps.map(e=>e.fatigue)}));
});
test('培训进度、工资、月内限制及随机序列在重载后保留',()=>{
 const s=fresh();G.trainEmployee(1,'mg');w.save();const raw=w.localStorage.getItem('yjzq_save'),next=boot(raw),t=next.w.BrokerGame.getState();
 assert.equal(t.emps[1].training.mg,50);assert.equal(t.emps[1].training.lastMonth,1);assert.equal(t.emps[1].salary,s.emps[1].salary);assert.equal(t.rngState,s.rngState);assert(!next.w.BrokerGame.trainEmployee(1,'rk'));assert.deepEqual(next.errors,[]);next.dom.window.close();
});
test('无培训字段的第九年旧档补齐进度，金额、身份、能力原样保留',()=>{
 const s=fresh();s.month=97;s.cash=54321;s.emps.forEach(e=>delete e.training);const raw=JSON.stringify(s),next=boot(raw),t=next.w.BrokerGame.getState();
 assert.equal(t.month,97);assert.equal(t.cash,54321);assert.equal(t.emps[0].name,s.emps[0].name);assert.equal(t.emps[1].mk,s.emps[1].mk);assert.equal(t.emps[1].fatigue,s.emps[1].fatigue);assert.equal(t.emps[1].training.mk,0);
 assert(next.w.BrokerGame.trainEmployee(1,'mk'));assert.deepEqual(next.errors,[]);next.dom.window.close();
});
test('升至五星后不能继续，挖人溢价工资随升星保留',()=>{
 const s=fresh(),e=s.emps[1];e.mk=4;e.salary=6.5;
 assert(G.trainEmployee(e.id,'mk'));s.month++;assert(G.trainEmployee(e.id,'mk'));assert.equal(e.mk,5);assert.equal(e.salary,6.8);
 s.month++;s.energy=3;const cash=s.cash;assert(!G.trainEmployee(e.id,'mk'));assert.equal(s.cash,cash);assert.equal(s.energy,3);
});
test('新招聘员工立即可培训，打开列表不产生空回执',()=>{
 const s=fresh();w.showHire();d.querySelector('#mOpts button').click();close();const e=s.emps[s.emps.length-1];assert(e.training);assert.equal(e.training.lastMonth,0);
 w.actTraining();assert.equal(d.querySelector('#mTitle').textContent,'员工培训');close();assert(G.trainEmployee(e.id,'mk'));
});
test('已打开课程菜单后现金变少，点击仍会重新核对门槛',()=>{
 const s=fresh();w.showTraining(1);const button=option(/^营销实训/);assert(!button.disabled);s.cash=1;button.click();assert(button.disabled);assert.equal(s.energy,3);assert.equal(s.emps[1].training.mk,0);close();
});
test('培训弹窗无脚本错误，两个游戏入口内容一致',()=>{assert.deepEqual(b.errors,[]);assert.equal(html,fs.readFileSync(__dirname+'/../../模拟券商.html','utf8'));});
console.log(count+' training checks passed');b.dom.window.close();
