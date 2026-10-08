import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeAvatar,canStand,slideMove,findPath} from './pixel-world.mjs';
const world={geometry:{width:1120,height:670},booths:Array.from({length:6},(_,i)=>({number:i+1,x:155+i%4*270,y:155+Math.floor(i/4)*230}))};
test('untrusted appearance is reduced to bounded palette indices',()=>assert.deepEqual(normalizeAvatar({skin:-1,hair:99,shirt:3.5,pants:2,style:3,evil:'x'}),{skin:1,hair:0,shirt:0,pants:2,style:3}));
test('feet collide with poster desks and perimeter but can enter booth rugs',()=>{assert.equal(canStand(155,110,world),false);assert.equal(canStand(155,190,world),true);assert.equal(canStand(10,200,world),false);});
test('a long frame cannot tunnel through a poster',()=>{const p=slideMove({x:155,y:220},0,-180,world);assert.ok(p.y>=168);assert.ok(canStand(p.x,p.y,world));});
test('click path reaches every booth without crossing a desk',()=>{for(const b of world.booths){const path=findPath({x:560,y:585},{x:b.x,y:b.y+35},world);assert.ok(path.length);for(const p of path)assert.ok(canStand(p.x,p.y,world));assert.ok(Math.abs(path.at(-1).x-b.x)<20);assert.ok(Math.abs(path.at(-1).y-b.y-35)<20);}});
test('24-booth layout remains reachable',()=>{const w={geometry:{width:1120,height:1580},booths:Array.from({length:24},(_,i)=>({number:i+1,x:155+i%4*270,y:155+Math.floor(i/4)*230}))};for(const b of w.booths)assert.ok(findPath({x:560,y:1495},{x:b.x,y:b.y+35},w).length);});
