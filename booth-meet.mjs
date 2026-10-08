// One offer per booth visit; closing a dialog must not reopen it every poll.
export function meetingArrival(previous, booth, serverBooth, blocked){
 const number=booth?.number??null;
 const state=previous?.number===number?{...previous}:{number,offered:false};
 const offer=Boolean(number&&booth.meet_url&&serverBooth===number&&!blocked&&!state.offered);
 if(offer)state.offered=true;
 return {state,offer};
}
