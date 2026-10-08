import {build} from 'esbuild';
import {Window} from 'happy-dom';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('../',import.meta.url));
const result=await build({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';import App from './index.jsx';createRoot(document.getElementById('root')).render(<App appId={11} token='scoped-fixture'/>);",loader:'jsx',resolveDir:directory},bundle:true,write:false,minify:true,format:'iife',platform:'browser',nodePaths:[process.env.PSI_NODE_MODULES||'/data/platform/frontend/node_modules'],define:{'process.env.NODE_ENV':'"production"'}});
for(const width of[360,800]){
 const w=new Window({url:'https://test.invalid',width,height:740,settings:{disableJavaScriptEvaluation:false}});
 w.ResizeObserver=class{constructor(fn){this.fn=fn}observe(){this.fn([{contentRect:{width}}])}disconnect(){}};
 w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
 const ctx=new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});w.HTMLCanvasElement.prototype.getContext=()=>ctx;
 const requests=[];const booth={number:1,x:155,y:155,title:'Čitljiv poster',presenter:'Fiktivni test',topic:'Test',abstract:'Fixture only',fictional:1,hasPoster:false,meet_url:'https://meet.google.com/abc-defg-hij'};
 const world={event:{id:'fixture',name:'Fiktivna UI provjera',count:1,is_open:1},geometry:{width:1120,height:670},self:{id:'self-fixture',name:'Test',role:'organizer',color:0,avatar:{skin:1,hair:0,style:0,shirt:0,pants:0},x:155,y:190,booth:1,hand:0},participants:[],questions:[]};world.booths=[booth];world.participants=[world.self];
 w.fetch=async(url,opts)=>{assert.ok(url.startsWith('/api/apps/11/service/'),'External request');requests.push(url);const op=url.split('/').at(-1);return{ok:true,status:200,json:async()=>op==='events'?{events:[world.event]}:op==='manage'?{session:'session-fixture',participantId:world.self.id,eventId:'fixture',role:'organizer'}:world};};
 w.document.body.innerHTML='<div id="root"></div>';w.eval(result.outputFiles[0].text);
 const button=text=>[...w.document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
 const waitFor=async(fn)=>{const end=Date.now()+8000;while(!fn()){if(Date.now()>end)throw Error('DOM state timeout');await new Promise(r=>setTimeout(r,25));}};
 await waitFor(()=>button('Upravljaj'));button('Upravljaj').click();await waitFor(()=>w.document.querySelector('[role=dialog] form'));
 const input=w.document.querySelector('[role=dialog] input');Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(input,'Test');input.dispatchEvent(new w.Event('input',{bubbles:true}));
 w.document.querySelector('[role=dialog] form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await waitFor(()=>w.document.querySelector('a.psi-meet-link'));
 const link=w.document.querySelector('a.psi-meet-link');assert.equal(link.href,booth.meet_url);assert.equal(link.target,'_blank');assert.ok(link.rel.includes('noreferrer'));assert.ok(link.textContent.includes('Pridruži se'));
 button('Samo poster').click();await waitFor(()=>w.document.querySelector('.psi-demo-poster'));button('Zatvori').click();await waitFor(()=>!w.document.querySelector('[role=dialog]'));
 await new Promise(r=>setTimeout(r,150));assert.equal(w.document.querySelector('a.psi-meet-link'),null,'Prompt reopened after dismiss');
 const c=w.document.querySelector('canvas[role=application]');assert.equal(c.width,width);assert.ok(w.document.querySelector('style').textContent.includes('width:52px'));
 assert.ok(!w.document.body.textContent.includes('Uđi u pixel salu'));await w.happyDOM.abort();
 console.log(`PASS actual App DOM at${width}px: manage/editor, automatic Meet arrival, external-only anchor, poster-only, dismissal, full-resolution canvas and mobile control declarations; no external request.`);
}
