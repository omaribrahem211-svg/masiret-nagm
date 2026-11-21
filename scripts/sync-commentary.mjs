import fs from 'node:fs';
const banks={};
for(const dial of ['eg','gulf']){
 const f='voice/lines_'+dial+'.json',data=JSON.parse(fs.readFileSync(f,'utf8')),extra=JSON.parse(fs.readFileSync('voice/extra_'+dial+'.json','utf8'));
 for(const [key,lines] of Object.entries(extra)){const spec=data[key]??={excited:/goal|shot|chance|save|counter/.test(key),lines:[]};spec.lines=[...new Set([...spec.lines,...lines])];}
 fs.writeFileSync(f,JSON.stringify(data,null,1)+'\n');banks[dial]=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.lines]));
 console.log(dial,Object.keys(data).length,'event types',Object.values(data).reduce((n,x)=>n+x.lines.length,0),'phrases');
}
fs.writeFileSync('www/js/commlines.js',"// Generated from voice/lines_*.json. Run node scripts/sync-commentary.mjs.\n'use strict';\nconst COMM_D="+JSON.stringify(banks)+';\n');
