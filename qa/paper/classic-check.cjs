const fs=require('fs'),vm=require('vm'),assert=require('assert');
function game(file){const c={console,Math,Date};vm.createContext(c);vm.runInContext(fs.readFileSync(file,'utf8').match(/<script>([\s\S]*)<\/script>/)[1],c);return c.BrokerGame;}
if(!process.argv[2])throw Error('请传入改造前的HTML路径');
const before=game(process.argv[2]),after=game(__dirname+'/../../index.html');
for(let i=0;i<30;i++){const run=G=>{G.newGame('classic-'+i,null,'steady',36);let s=G.getState();for(let m=0;m<36&&!s.over;m++){s.energy=0;G.endMonth();}return {month:s.month,cash:s.cash,aum:s.aum,profit:s.profitCum,grade:s.grade,end:s.endTitle};};assert.deepEqual(run(before),run(after));}console.log('PASS 30 seeded classic games unchanged');
