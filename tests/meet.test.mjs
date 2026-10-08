import test from 'node:test';
import assert from 'node:assert/strict';
import {meetingArrival} from '../booth-meet.mjs';
import {pixelText,pixelWidth,labelLines} from '../pixel-text.mjs';
test('arrival offers once, only after server confirms booth; closes stay closed',()=>{
 const b={number:4,meet_url:'https://meet.google.com/abc-defg-hij'};
 let r=meetingArrival(null,b,null,false);assert.equal(r.offer,false);
 r=meetingArrival(r.state,b,4,true);assert.equal(r.offer,false);
 r=meetingArrival(r.state,b,4,false);assert.equal(r.offer,true);
 r=meetingArrival(r.state,b,4,false);assert.equal(r.offer,false);
 r=meetingArrival(r.state,null,null,false);
 assert.equal(meetingArrival(r.state,b,4,false).offer,true);
});
test('unconfigured booth never offers a fabricated call',()=>assert.equal(meetingArrival(null,{number:1,meet_url:''},1,false).offer,false));
test('original pixel letters support Bosnian accents with integer blocks',()=>{
 const rects=[];pixelText({set fillStyle(v){},fillRect(...a){rects.push(a)}},'ČĆŠŽĐ 04',120,20);
 assert.ok(rects.length>80);assert.ok(rects.every(a=>a.every(Number.isInteger)));
 assert.equal(pixelWidth('PSI'),34);assert.ok(labelLines('Vrlo dugačak naslov istraživanja za poster').every(s=>s.length<=16));
});
