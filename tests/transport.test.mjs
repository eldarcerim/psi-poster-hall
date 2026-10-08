import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTransport} from '../transport.js';

test('all operations serialize and share a 1500ms budget; bearer only in header/body',async()=>{
  let clock=0;const calls=[];
  const transport=createTransport({appId:11,token:'scoped-fixture',now:()=>clock,
    sleep:async ms=>{clock+=ms},fetcher:async(url,opts)=>{
      calls.push({at:clock,url,opts});return{ok:true,json:async()=>({ok:true})};
    }});
  await Promise.all(['sync','sync','question','poster'].map(op=>transport.call(op,{session:'session-fixture'})));
  assert.deepEqual(calls.map(c=>c.at),[0,1500,3000,4500]);
  for(const c of calls){
    assert.equal(c.opts.credentials,'omit');assert.equal(c.opts.headers.Authorization,'Bearer scoped-fixture');
    assert.ok(!c.url.includes('fixture'));assert.equal(JSON.parse(c.opts.body).session,'session-fixture');
  }
});
test('429 backs off every subsequent operation for 60 seconds',async()=>{
  let clock=0,calls=0;const times=[];
  const t=createTransport({appId:11,token:'fixture',now:()=>clock,sleep:async ms=>clock+=ms,
    fetcher:async()=>{times.push(clock);return{ok:++calls>1,status:calls===1?429:200,json:async()=>({error:'wait'})}}});
  await assert.rejects(t.call('sync'),e=>e.status===429);
  await t.call('question');assert.deepEqual(times,[0,60000]);
});
test('failed call does not poison queue and close cancels queued work',async()=>{
  let calls=0;const t=createTransport({appId:11,token:'fixture',sleep:async()=>{},
    fetcher:async()=>{if(++calls===1)throw new Error('network');return{ok:true,json:async()=>({ok:true})}}});
  await assert.rejects(t.call('sync'));await t.call('sync');t.close();await assert.rejects(t.call('sync'));
  assert.equal(calls,2);
});
