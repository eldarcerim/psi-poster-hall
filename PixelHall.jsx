import {pixelText,labelLines} from './pixel-text.mjs';
import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {drawFloor,drawAvatar,normalizeAvatar,slideMove,nearestWalkable,findPath,directionFor} from './pixel-world.mjs';
export const PixelHall=forwardRef(function PixelHall({world,position,avatar,onMove,onInteract,disabled=false,en=false},ref){
 const host=useRef(null),canvas=useRef(null),floor=useRef(null),engine=useRef({pos:position,dir:'down',path:[],keys:new Set(),camera:null,moving:false,time:0,resolve:null,remote:new Map()}),props=useRef({});
 const [size,setSize]=useState({w:640,h:520}),[overview,setOverview]=useState(false),[walking,setWalking]=useState(false);
 props.current={world,position,avatar,onMove,onInteract,disabled,en,size,overview};const T=(b,e)=>en?e:b;
 function stop(){const e=engine.current;e.keys.clear();e.path=[];e.moving=false;if(e.resolve){e.resolve(false);e.resolve=null;}}
 function walkTo(x,y){stop();canvas.current?.focus();const e=engine.current;e.path=findPath(e.pos,{x,y},props.current.world);return new Promise(resolve=>{if(!e.path.length)resolve(false);else e.resolve=resolve;});}
 useImperativeHandle(ref,()=>({walkTo,stop,step:(dx,dy)=>{stop();const e=engine.current;e.path=findPath(e.pos,{x:e.pos.x+dx,y:e.pos.y+dy},props.current.world);}}));
 useEffect(()=>{const o=new ResizeObserver(([r])=>setSize({w:Math.max(240,Math.floor(r.contentRect.width)),h:Math.floor(Math.min(650,Math.max(300,Math.min(window.innerHeight*.62,r.contentRect.width*.9))))}));o.observe(host.current);return()=>o.disconnect();},[]);
 useEffect(()=>{const e=engine.current;e.pos=nearestWalkable(position,world);e.camera=null;e.path=[];props.current.onMove?.(e.pos,e.dir);return stop;},[world.self.id]);
 useEffect(()=>{const c=document.createElement('canvas');c.width=world.geometry.width;c.height=world.geometry.height;drawFloor(c.getContext('2d'),world);floor.current=c;},[world.event.id,world.booths.length]);
 useEffect(()=>{if(disabled)stop();},[disabled]);
 useEffect(()=>{
  const e=engine.current;for(const p of world.participants){if(p.id===world.self.id)continue;const old=e.remote.get(p.id);e.remote.set(p.id,{...old,target:{x:p.x,y:p.y},pos:old?.pos||{x:p.x,y:p.y},dir:p.direction||old?.dir||'down',data:p});}
  const ids=new Set(world.participants.map(p=>p.id));for(const id of e.remote.keys())if(!ids.has(id))e.remote.delete(id);
 },[world]);
 useEffect(()=>{
  const e=engine.current,keys={ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0],ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1]};
  const editable=t=>t?.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]');
  const down=ev=>{const p=props.current;if(p.disabled||editable(ev.target)||!host.current.contains(document.activeElement))return;const k=ev.key.length===1?ev.key.toLowerCase():ev.key;if(keys[k]){ev.preventDefault();e.path=[];if(e.resolve){e.resolve(false);e.resolve=null;}e.keys.add(k);}else if((k==='e'||k==='Enter')&&!ev.repeat){ev.preventDefault();p.onInteract?.();}};
  const up=ev=>e.keys.delete(ev.key.length===1?ev.key.toLowerCase():ev.key);
  const blur=()=>stop();window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);host.current.addEventListener('focusout',blur);document.addEventListener('visibilitychange',blur);
  let last=0,raf,lastEmit=0,wasMoving=false;const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  function tick(now){const p=props.current,dt=Math.min(.05,(now-last)/1000||0);last=now;e.time=now;
   if(p.disabled)e.keys.clear();let dx=0,dy=0,pathDistance=Infinity;for(const k of e.keys){dx+=keys[k]?.[0]||0;dy+=keys[k]?.[1]||0;}
   if(!p.disabled&&e.path.length&&!dx&&!dy){const t=e.path[0],d=Math.hypot(t.x-e.pos.x,t.y-e.pos.y);if(d<3){e.path.shift();if(!e.path.length&&e.resolve){e.resolve(true);e.resolve=null;}}else{pathDistance=d;dx=(t.x-e.pos.x)/d;dy=(t.y-e.pos.y)/d;}}
   const mag=Math.hypot(dx,dy);let moving=false;if(mag&&!p.disabled){const speed=Math.min(145*dt,pathDistance),q=slideMove(e.pos,dx/mag*speed,dy/mag*speed,p.world);moving=Math.hypot(q.x-e.pos.x,q.y-e.pos.y)>.01;e.dir=directionFor(q.x-e.pos.x,q.y-e.pos.y,e.dir);e.pos=q;if(!moving&&e.path.length){e.path=[];e.resolve?.(false);e.resolve=null;}}
   e.moving=moving;if(moving!==wasMoving){wasMoving=moving;setWalking(moving);}if((moving&&now-lastEmit>33)||(!moving&&lastEmit)){p.onMove?.({...e.pos},e.dir);lastEmit=moving?now:0;}
   draw(p,e,dt,reduced);raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(raf);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);host.current?.removeEventListener('focusout',blur);document.removeEventListener('visibilitychange',blur);stop();};
 },[]);
 function draw(p,e,dt,reduced){
  const c=canvas.current;if(!c||!floor.current)return;const ctx=c.getContext('2d'),{w,h}=p.size,g=p.world.geometry;
  const zoom=p.overview?Math.min(w/g.width,h/g.height):1;
  const target={x:Math.max(0,Math.min(g.width-w/zoom,e.pos.x-w/zoom/2)),y:Math.max(0,Math.min(g.height-h/zoom,e.pos.y-h/zoom/2))};
  if(g.width<w/zoom)target.x=(g.width-w/zoom)/2;if(g.height<h/zoom)target.y=(g.height-h/zoom)/2;
  if(!e.camera||reduced||p.overview)e.camera=target;else{e.camera.x+=(target.x-e.camera.x)*Math.min(1,dt*12);e.camera.y+=(target.y-e.camera.y)*Math.min(1,dt*12);}
  e.zoom=zoom;ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#273446';ctx.fillRect(0,0,c.width,c.height);ctx.scale(zoom,zoom);ctx.translate(-Math.round(e.camera.x/2)*2,-Math.round(e.camera.y/2)*2);ctx.drawImage(floor.current,0,0);
  ctx.textAlign='center';for(const b of p.world.booths){const lines=labelLines(b.title);const height=lines.length*22+6;ctx.fillStyle='#f8edd1';ctx.fillRect(b.x-102,b.y+79,204,height);for(let i=0;i<lines.length;i++)pixelText(ctx,lines[i],b.x,b.y+85+i*22,{color:'#243c49'});if(Math.abs(b.x-e.pos.x)<=105&&Math.abs(b.y-e.pos.y)<=82){ctx.strokeStyle='#fdf4be';ctx.lineWidth=3;ctx.strokeRect(b.x-100,b.y-17,196,91);}}
  const actors=[{pos:e.pos,dir:e.dir,moving:e.moving,avatar:p.avatar,name:p.world.self.name,self:true,hand:p.world.self.hand}];
  for(const r of e.remote.values()){const dx=r.target.x-r.pos.x,dy=r.target.y-r.pos.y;const move=Math.hypot(dx,dy)>1;r.dir=directionFor(dx,dy,r.dir);r.pos.x+=dx*Math.min(1,dt*5);r.pos.y+=dy*Math.min(1,dt*5);actors.push({pos:r.pos,dir:r.dir,moving:move,avatar:r.data.avatar||{shirt:r.data.color},name:r.data.name,hand:r.data.hand});}
  actors.sort((a,b)=>a.pos.y-b.pos.y);for(const a of actors){drawAvatar(ctx,a.pos.x,a.pos.y,a.avatar,a.dir,a.moving&&!reduced?Math.floor(e.time/120)%2+1:0);const label=(a.self?p.en?'YOU':'TI':a.name).slice(0,12),lw=Math.max(38,label.length*12+12);ctx.fillStyle=a.self?'#fbf3d7':'#314354';ctx.fillRect(Math.round(a.pos.x-lw/2),Math.round(a.pos.y-72),lw,24);ctx.fillStyle=a.self?'#375967':'#fff3d3';pixelText(ctx,label,a.pos.x,a.pos.y-68,{color:a.self?'#243c49':'#fff3d3'});if(a.hand){ctx.fillStyle='#f4cf72';ctx.fillRect(a.pos.x+19,a.pos.y-50,10,14);}}
  if(e.path.length){const t=e.path.at(-1);ctx.strokeStyle='#fff8d1';ctx.lineWidth=2;ctx.strokeRect(t.x-6,t.y-6,12,12);}ctx.fillStyle='#4e4a53';ctx.font='bold 10px monospace';pixelText(ctx,p.en?'GAMES SOON':'IGRICE USKORO',g.width-143,g.height-43,{color:'#343b50'});
 }
 function clicked(ev){if(disabled)return;canvas.current.focus();const rect=canvas.current.getBoundingClientRect(),e=engine.current;if(e.camera)walkTo((ev.clientX-rect.left)/e.zoom+e.camera.x,(ev.clientY-rect.top)/e.zoom+e.camera.y);}
 function held(key){return {onPointerDown:ev=>{ev.preventDefault();if(disabled)return;canvas.current.focus();ev.currentTarget.setPointerCapture(ev.pointerId);stop();engine.current.keys.add(key);},onPointerUp:()=>engine.current.keys.delete(key),onPointerCancel:()=>engine.current.keys.delete(key),onLostPointerCapture:()=>engine.current.keys.delete(key),onClick:ev=>{if(ev.detail===0){const d={ArrowUp:[0,-48],ArrowDown:[0,48],ArrowLeft:[-48,0],ArrowRight:[48,0]}[key];walkTo(engine.current.pos.x+d[0],engine.current.pos.y+d[1]);}}};}
 const active=world.booths.find(b=>Math.abs(b.x-position.x)<=105&&Math.abs(b.y-position.y)<=82);
 return <div className="psi-pixel-hall" ref={host}><div className="psi-world-stage" style={{height:size.h}}><canvas ref={canvas} width={size.w} height={size.h} style={{width:'100%',height:size.h,imageRendering:'pixelated'}} tabIndex={0} role="application" aria-label={T('Pixel sala. Strelice ili WASD za hodanje. E otvara obližnji poster.','Pixel hall. Arrows or WASD to walk. E opens a nearby poster.')} onClick={clicked} data-player-x={Math.round(position.x)} data-player-y={Math.round(position.y)} data-walking={walking}/><div className="psi-world-top"><span>PSI</span><button onClick={()=>setOverview(v=>!v)} aria-pressed={overview}>{overview?T('Prati lika','Follow avatar'):T('Cijela mapa','Full map')}</button></div>{active&&<button className="psi-interact" onClick={()=>onInteract?.()}><kbd>E</kbd><span>{T('Pogledaj poster','View poster')} <b>{String(active.number).padStart(2,'0')}</b></span></button>}<div className="psi-pixel-pad"><button aria-label={T('Hodaj gore','Walk up')} {...held('ArrowUp')}>↑</button><div><button aria-label={T('Hodaj lijevo','Walk left')} {...held('ArrowLeft')}>←</button><button aria-label={T('Hodaj dolje','Walk down')} {...held('ArrowDown')}>↓</button><button aria-label={T('Hodaj desno','Walk right')} {...held('ArrowRight')}>→</button></div></div></div><div className="psi-walk-hint"><span><kbd>W A S D</kbd> / <kbd>↑ ↓ ← →</kbd> {T('hodaj','walk')} · {T('ili klikni gdje želiš doći','or click a destination')}</span></div></div>;
});
export default PixelHall;
