import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBoothAudio} from '../audio/booth-audio.js';

function fixture(options={}) {
  const log=[],states=[];
  class Room {
    constructor(){this.localParticipant={setMicrophoneEnabled:async value=>log.push(['mic',value])}}
    on(){}off(){}async connect(url,token){log.push(['connect',token])}
    async startAudio(){log.push(['listen'])}async disconnect(){log.push(['disconnect'])}
  }
  const audio=createBoothAudio({Room,RoomEvent:{},opaqueOrigin:false,
    fetchGrant:async({booth})=>({room:`booth-${booth}`,serverUrl:'wss://approved.invalid',
      token:`fixture-${booth}`,canPublish:false,expiresAt:Date.now()/1000+30}),
    onState:s=>states.push(s),attachAudio:()=>()=>{},expectedRoom:b=>`booth-${b}`,
    allowedServer:'wss://approved.invalid',...options});
  return {audio,log,states};
}
test('joining starts muted; participant cannot publish',async()=>{
  const {audio,log,states}=fixture();await audio.enter(1);
  assert.equal(states.at(-1).status,'muted');assert.equal(states.at(-1).microphone,false);
  assert.ok(!log.some(x=>x[0]==='mic'));await assert.rejects(audio.setMicrophone(true));await audio.leave();
});
test('old booth disconnects before another booth connects',async()=>{
  const {audio,log}=fixture();await audio.enter(1);await audio.enter(2);
  assert.ok(log.findIndex(x=>x[0]==='disconnect')<log.findIndex(x=>x[1]==='fixture-2'));await audio.leave();
});
test('late grant after leaving never connects',async()=>{
  let resolve;const {audio,log}=fixture({fetchGrant:()=>new Promise(r=>resolve=r)});
  const entering=audio.enter(1);await new Promise(r=>setImmediate(r));await audio.leave();
  resolve({token:'late'});await entering;assert.ok(!log.some(x=>x[0]==='connect'));
});
test('wrong room and opaque origin are refused',async()=>{
  const {audio,log,states}=fixture({fetchGrant:async()=>({room:'other'})});await audio.enter(1);
  assert.ok(!log.some(x=>x[0]==='connect'));assert.equal(states.at(-1).status,'error');
  assert.throws(()=>fixture({opaqueOrigin:true}));
});
