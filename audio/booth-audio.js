/** Run ONLY on a separately reviewed media origin, never in the opaque PSI frame.
 * The host imports Room/RoomEvent from its pinned livekit-client dependency.
 * fetchGrant redeems a one-use audio ticket in a POST body, not a URL or store.
 */
export function createBoothAudio({Room,RoomEvent,fetchGrant,onState,attachAudio,
  expectedRoom,allowedServer,opaqueOrigin=globalThis.location?.origin==='null'}) {
  if(opaqueOrigin) throw new Error('Live audio requires the approved media origin');
  let generation=0,current=null,microphone=false,canPublish=false;
  let attachments=[],off=[],controller=null;
  const state=(status,extra={})=>onState({status,microphone,...extra});
  const teardown=async()=>{
    controller?.abort();controller=null;
    microphone=false;canPublish=false;
    off.splice(0).forEach(f=>f());attachments.splice(0).forEach(f=>f());
    const room=current;current=null;
    if(room) await room.disconnect(true);
  };
  return {
    async enter(booth) {
      const mine=++generation;
      await teardown();
      if(mine!==generation)return;
      state('connecting');
      const abort=new AbortController();controller=abort;
      let room;
      try {
        const grant=await fetchGrant({booth,signal:abort.signal});
        if(mine!==generation)return;
        if(grant.room!==expectedRoom(booth)||grant.serverUrl!==allowedServer||
          !grant.token||grant.expiresAt<=Date.now()/1000) throw new Error('Invalid booth grant');
        room=new Room({adaptiveStream:true,dynacast:true});current=room;
        const listen=(event,fn)=>{room.on(event,fn);off.push(()=>room.off(event,fn))};
        listen(RoomEvent.TrackSubscribed,(track)=>{
          if(mine===generation&&track.kind==='audio')attachments.push(attachAudio(track));
        });
        listen(RoomEvent.Reconnecting,()=>{
          state('reconnecting');
          room.localParticipant.setMicrophoneEnabled(false).then(()=>{
            if(mine===generation){microphone=false;state('reconnecting')}
          }).catch(()=>{if(mine===generation)room.disconnect(true)});
        });
        // Do not silently re-enable a microphone after an interruption.
        listen(RoomEvent.Reconnected,()=>{
          room.localParticipant.setMicrophoneEnabled(false).then(()=>state('muted')).catch(()=>state('error'));
        });
        listen(RoomEvent.Disconnected,()=>{microphone=false;state('disconnected')});
        await room.connect(grant.serverUrl,grant.token);
        if(mine!==generation){await room.disconnect(true);return}
        canPublish=grant.canPublish===true;
        await room.startAudio(); // called from the media page's explicit join gesture
        if(mine===generation)state('muted',{canPublish});
      } catch(error) {
        if(mine!==generation){await room?.disconnect(true);return}
        await teardown();state('error',{reason:error.name==='NotAllowedError'?'permission':'connection'});
      }
    },
    async setMicrophone(enabled) {
      const room=current,mine=generation;
      if(!room||(!canPublish&&enabled))throw new Error('Publishing is not permitted in this booth');
      try {
        await room.localParticipant.setMicrophoneEnabled(enabled);
        if(mine!==generation){await room.disconnect(true);return}
        microphone=enabled;state(enabled?'connected':'muted');
      } catch(error){
        if(mine!==generation){await room.disconnect(true);return}
        microphone=false;state('error',{reason:'permission'});throw error;
      }
    },
    async leave() { ++generation;await teardown();state('disconnected'); },
  };
}
