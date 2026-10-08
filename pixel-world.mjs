import {pixelText} from './pixel-text.mjs';
// Original PSI pixel world. World coordinates preserve the existing booth service contract.
export const SKINS=['#f3cda9','#deb184','#bd865c','#915d40','#633f35'];
export const HAIRS=['#332e38','#67442f','#af7044','#e6ba65','#d0cbd1','#7c5fb0'];
export const SHIRTS=['#428b86','#d57159','#6885c8','#ad7fb6','#d5a548','#639467','#e3ddc7','#4d536a'];
export const PANTS=['#36465e','#665047','#484756','#9d997d'];
export const DEFAULT_AVATAR=Object.freeze({skin:1,hair:0,style:0,shirt:0,pants:0});
export function normalizeAvatar(raw={}){
 const out={}; for(const [key,max] of Object.entries({skin:5,hair:6,style:4,shirt:8,pants:4})) out[key]=Number.isInteger(raw?.[key])&&raw[key]>=0&&raw[key]<max?raw[key]:DEFAULT_AVATAR[key]; return out;
}
export function worldObstacles(world){
 const g=world.geometry, r=[{x:0,y:0,w:g.width,h:46},{x:0,y:0,w:30,h:g.height},{x:g.width-30,y:0,w:30,h:g.height},{x:0,y:g.height-28,w:g.width,h:28}];
 for(const b of world.booths) r.push({x:b.x-77,y:b.y-63,w:154,h:67,kind:'poster'},{x:b.x+90,y:b.y-42,w:24,h:20,kind:'plant'});
 // Furniture stays in the entrance area, clear of every booth and the central doorway.
 r.push({x:70,y:g.height-112,w:146,h:38,kind:'sofa'},{x:260,y:g.height-102,w:42,h:40,kind:'table'},{x:g.width-168,y:g.height-110,w:54,h:55,kind:'arcade'});
 return r;
}
export function canStand(x,y,world,radius=9){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<radius||y<radius||x>world.geometry.width-radius||y>world.geometry.height-radius)return false;
 return !worldObstacles(world).some(r=>x+radius>r.x&&x-radius<r.x+r.w&&y+radius>r.y&&y-radius<r.y+r.h);
}
export function slideMove(p,dx,dy,world){
 let {x,y}=p; const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/5));
 for(let i=0;i<n;i++){if(canStand(x+dx/n,y,world))x+=dx/n;if(canStand(x,y+dy/n,world))y+=dy/n;} return {x,y};
}
export function nearestWalkable(p,world){
 if(canStand(p.x,p.y,world))return p;
 for(let r=8;r<200;r+=8) for(let i=0;i<16;i++){const a=i*Math.PI/8,q={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};if(canStand(q.x,q.y,world))return q;}
 return {x:world.geometry.width/2,y:world.geometry.height-70};
}
// A* with eight neighbours and no corner cutting. A click requests a path, never a teleport.
export function findPath(from,target,world){
 const step=16, cols=Math.ceil(world.geometry.width/step),rows=Math.ceil(world.geometry.height/step);
 const point=k=>({x:(k%cols)*step+8,y:Math.floor(k/cols)*step+8});
 const key=p=>Math.floor(p.y/step)*cols+Math.floor(p.x/step);
 const valid=k=>k>=0&&k<cols*rows&&canStand(point(k).x,point(k).y,world);
 const near=p=>{const k=key(p);if(valid(k))return k;for(let d=1;d<15;d++)for(let y=-d;y<=d;y++)for(let x=-d;x<=d;x++){const n=k+y*cols+x;if(valid(n)&&Math.abs(point(n).x-p.x)<250)return n;}return null;};
 const start=near(from),goal=near(nearestWalkable(target,world));if(start===null||goal===null)return [];
 const cost=new Map([[start,0]]), parent=new Map(),open=[start],closed=new Set();
 const h=k=>Math.hypot(point(k).x-point(goal).x,point(k).y-point(goal).y)/step;
 while(open.length&&closed.size<cols*rows){open.sort((a,b)=>(cost.get(b)+h(b))-(cost.get(a)+h(a)));const cur=open.pop();if(closed.has(cur))continue;
  if(cur===goal){const path=[];let n=goal;while(n!==start){path.push(point(n));n=parent.get(n);}return path.reverse();}closed.add(cur);
  for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]){const n=cur+dx+dy*cols;if(!valid(n)||closed.has(n)||Math.abs(point(n).x-point(cur).x)>step+1)continue;if(dx&&dy&&(!valid(cur+dx)||!valid(cur+dy*cols)))continue;
   const c=cost.get(cur)+Math.hypot(dx,dy);if(c<(cost.get(n)??Infinity)){cost.set(n,c);parent.set(n,cur);open.push(n);}}
 }return [];
}
export function directionFor(dx,dy,old='down'){return Math.abs(dx)+Math.abs(dy)<.01?old:Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}
export function drawAvatar(ctx,x,y,raw={},direction='down',phase=0,scale=2){
 const a=normalizeAvatar(raw),s=scale; x=Math.round(x/s)*s;y=Math.round(y/s)*s;
 const r=(px,py,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x+(px-8)*s,y+(py-24)*s,w*s,h*s);};
 r(2,23,12,2,'#29324635');const walk=phase?Math.floor(phase)%2:0;
 // Outline, shoes, alternating legs, jacket, neck, head and hand pixels.
 r(3,17,10,5,'#29303d');r(4,18,3,4-walk,PANTS[a.pants]);r(9,18+walk,3,4-walk,PANTS[a.pants]);
 r(3,22-walk,4,2,'#262a34');r(9,22,4,2,'#262a34');
 r(2,11,12,8,'#2c3443');r(3,11,10,7,SHIRTS[a.shirt]);r(4,11,2,7,'#ffffff18');
 r(1,13+walk,2,5,SHIRTS[a.shirt]);r(13,14-walk,2,5,SHIRTS[a.shirt]);r(1,18+walk,2,2,SKINS[a.skin]);r(13,19-walk,2,2,SKINS[a.skin]);
 r(6,9,4,3,SKINS[a.skin]);r(3,2,10,8,'#30313b');r(4,3,8,7,SKINS[a.skin]);r(3,5,1,3,SKINS[a.skin]);r(12,5,1,3,SKINS[a.skin]);
 r(4,1,8,3,HAIRS[a.hair]);r(3,3,2,3,HAIRS[a.hair]);r(11,3,2,2,HAIRS[a.hair]);
 if(a.style===1){r(2,3,2,9,HAIRS[a.hair]);r(12,3,2,9,HAIRS[a.hair]);r(3,1,10,2,HAIRS[a.hair]);}
 if(a.style===2){r(3,0,3,3,HAIRS[a.hair]);r(7,-1,3,3,HAIRS[a.hair]);r(11,1,3,4,HAIRS[a.hair]);r(2,5,2,4,HAIRS[a.hair]);}
 if(a.style===3){r(3,0,10,4,SHIRTS[a.shirt]);r(1,4,13,2,'#384055');}
 if(direction==='up'){r(4,3,8,7,HAIRS[a.hair]);r(5,10,6,1,HAIRS[a.hair]);}
 else if(direction==='left'){r(4,6,1,2,'#29303b');r(2,7,2,2,SKINS[a.skin]);r(10,4,2,5,HAIRS[a.hair]);}
 else if(direction==='right'){r(11,6,1,2,'#29303b');r(12,7,2,2,SKINS[a.skin]);r(4,4,2,5,HAIRS[a.hair]);}
 else{r(5,6,1,2,'#29303b');r(10,6,1,2,'#29303b');r(7,9,2,1,'#a25e55');}
}
function plant(c,x,y){const r=(a,b,w,h,k)=>{c.fillStyle=k;c.fillRect(x+a,y+b,w,h);};r(-10,-8,20,13,'#a76649');r(-12,-10,24,5,'#d29664');r(-2,-38,4,29,'#476549');r(-16,-32,15,10,'#578c64');r(1,-42,15,14,'#78a976');r(-13,-46,11,17,'#83b477');r(2,-26,14,9,'#3f7659');}
export function drawFloor(c,world){
 const {width:w,height:h}=world.geometry;c.imageSmoothingEnabled=false;c.fillStyle='#334150';c.fillRect(0,0,w,h);
 c.fillStyle='#d9be88';c.fillRect(28,44,w-56,h-72);
 for(let y=46;y<h-28;y+=24)for(let x=28;x<w-28;x+=64){c.fillStyle=(Math.floor(y/24)+Math.floor(x/64))%2?'#d6b781':'#dcc08d';c.fillRect(x,y,Math.min(62,w-28-x),Math.min(22,h-28-y));c.fillStyle='#c8a776';if(y+22<h-28)c.fillRect(x,y+22,Math.min(62,w-28-x),2);c.fillStyle='#e3cb9a';c.fillRect(x+5,y+4,Math.max(0,Math.min(40,w-33-x)),1);}
 // Brick back wall and warm skirting.
 c.fillStyle='#ebdfc4';c.fillRect(28,8,w-56,36);for(let y=8;y<44;y+=12)for(let x=28+(y%24?18:0);x<w-28;x+=36){c.fillStyle='#cfbea8';c.fillRect(x,y,1,12);c.fillRect(x,y+11,36,1);}c.fillStyle='#826d61';c.fillRect(28,42,w-56,8);c.fillRect(24,48,6,h-76);c.fillRect(w-30,48,6,h-76);
 for(const b of world.booths){const accent=SHIRTS[(b.number-1)%SHIRTS.length];
  c.fillStyle='#68594326';c.fillRect(b.x-98,b.y-15,200,95);c.fillStyle='#ece4cc';c.fillRect(b.x-102,b.y-19,200,95);c.fillStyle=accent;c.fillRect(b.x-98,b.y-15,192,4);c.fillRect(b.x-98,b.y+66,192,5);
  for(let x=b.x-90;x<b.x+94;x+=16){c.fillStyle='#d5c9b2';c.fillRect(x,b.y+58,8,3);}
  // Freestanding poster board, feet and pin corners.
  c.fillStyle='#403e4c';c.fillRect(b.x-78,b.y-76,156,70);c.fillStyle='#fdf7e5';c.fillRect(b.x-72,b.y-70,144,58);c.fillStyle=accent;c.fillRect(b.x-66,b.y-64,45,44);
  c.fillStyle='#fff6dd';c.fillRect(b.x-59,b.y-58,29,3);c.fillRect(b.x-59,b.y-50,20,14);c.fillRect(b.x-59,b.y-31,24,3);
  c.fillStyle='#bec7bd';for(let k=0;k<4;k++)c.fillRect(b.x-11,b.y-61+k*9,68-k*6,3);c.fillStyle='#c89a55';c.fillRect(b.x-68,b.y-7,8,12);c.fillRect(b.x+59,b.y-7,8,12);
  c.fillStyle='#343b50';c.fillRect(b.x-11,b.y-84,25,14);c.fillStyle='#fff5d8';c.font='bold 10px monospace';c.textAlign='center';pixelText(c,String(b.number).padStart(2,'0'),b.x+1,b.y-81,{color:'#fff5d8'});
  plant(c,b.x+102,b.y-32);
 }
 // Entry lounge and a clearly inactive future games corner.
 c.fillStyle='#315d62';c.fillRect(66,h-114,152,38);c.fillStyle='#5b9491';c.fillRect(72,h-111,140,25);c.fillStyle='#8fbbb0';c.fillRect(74,h-111,136,6);c.fillStyle='#487774';c.fillRect(138,h-103,4,23);
 c.fillStyle='#6e524b';c.fillRect(258,h-104,46,43);c.fillStyle='#b98c63';c.fillRect(261,h-105,40,33);c.fillStyle='#fff5df';c.fillRect(274,h-98,9,8);plant(c,52,h-55);
 c.fillStyle='#45415d';c.fillRect(w-168,h-111,54,58);c.fillStyle='#70658a';c.fillRect(w-172,h-111,60,10);c.fillStyle='#283445';c.fillRect(w-162,h-95,42,24);c.fillStyle='#759d85';c.fillRect(w-158,h-92,34,17);c.fillStyle='#cfa767';c.fillRect(w-148,h-88,14,3);c.fillRect(w-156,h-69,30,4);c.fillStyle='#e5cc93';c.fillRect(w-159,h-119,39,7);
 c.fillStyle='#526d7b';c.fillRect(w/2-112,h-96,224,60);c.fillStyle='#b8d3be';c.fillRect(w/2-108,h-92,216,4);c.fillRect(w/2-108,h-44,216,4);c.fillStyle='#e8eddb';c.font='bold 13px monospace';c.textAlign='center';pixelText(c,'PSI',w/2,h-72,{color:'#e8eddb',scale:3});
 plant(c,w-50,h-55);c.fillStyle='#4e5260';c.font='bold 13px monospace';pixelText(c,'PSI / POSTERI',w/2,20,{color:'#343b50'});
}
