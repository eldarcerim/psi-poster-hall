// Offline DOM simulation of our own preview bundle. No browser/session or network.
import {Window} from 'happy-dom';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const w=new Window({url:'https://preview.invalid',settings:{disableJavaScriptEvaluation:false}});
let n=0,now=0;const frames=new Map();
w.requestAnimationFrame=fn=>{frames.set(++n,fn);return n};
w.cancelAnimationFrame=id=>frames.delete(id);
w.ResizeObserver=class{constructor(fn){this.fn=fn}observe(){this.fn([{contentRect:{width:640,height:480}}])}disconnect(){}};
const context=new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
w.HTMLCanvasElement.prototype.getContext=()=>context;
let networkCalls=0;w.fetch=()=>{networkCalls++;throw Error('Preview must not use network')};
w.document.body.innerHTML='<div id="psi-pixel-preview"></div>';
const html=await readFile(new URL('../../preview/PSI-pixel-preview.html',import.meta.url),'utf8');
w.eval(html.match(/<script>([\s\S]+)<\/script>/)[1]);
const flush=()=>new Promise(resolve=>setTimeout(resolve,10));
const button=text=>[...w.document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
await flush();
assert.ok(button('Uđi i prošetaj'));
button('Kapa').click();await flush();assert.equal(button('Kapa').getAttribute('aria-pressed'),'true');
button('Uđi i prošetaj').click();await flush();
assert.ok(w.document.querySelector('canvas[role=application]'));
button('01 · Voda u našem gradu').click();await flush();
for(let i=0;i<420;i++){now+=1000/60;const f=[...frames.values()];frames.clear();f.forEach(fn=>fn(now));if(i%15===0)await flush();}
await flush();
const c=w.document.querySelector('canvas[role=application]');
const x=Number(c.dataset.playerX),y=Number(c.dataset.playerY);
assert.ok(Math.abs(x-155)<105&&Math.abs(y-155)<82,`Walking did not arrive: ${x},${y}`);
const inspect=[...w.document.querySelectorAll('button')].find(b=>b.textContent.includes('Pogledaj poster'));
assert.ok(inspect);inspect.click();await flush();assert.ok(button('Vrati se u salu'));
button('Vrati se u salu').click();await flush();
c.focus();c.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
for(let i=0;i<20;i++){now+=1000/60;const f=[...frames.values()];frames.clear();f.forEach(fn=>fn(now));await flush();}
c.dispatchEvent(new w.KeyboardEvent('keyup',{key:'ArrowRight',bubbles:true}));
now+=1000/60;{const f=[...frames.values()];frames.clear();f.forEach(fn=>fn(now));}await flush();
const movedX=Number(c.dataset.playerX);assert.ok(movedX>x+25);
for(let i=0;i<25;i++){now+=1000/60;const f=[...frames.values()];frames.clear();f.forEach(fn=>fn(now));await flush();}
assert.equal(Number(c.dataset.playerX),movedX);
button('Moj lik').click();await flush();assert.equal(button('Kapa').getAttribute('aria-pressed'),'true');
assert.equal(networkCalls,0);
await w.happyDOM.abort();
console.log('PASS offline preview: appearance, entry, click path, nearby poster, held-key motion, release stops, editor retains choice; no network.');
