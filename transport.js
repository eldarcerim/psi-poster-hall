// Every operation shares this budget; movement is coalesced separately.
// Two private frames: <=80 service calls/min, leaving room below Mobius' 120/min.
export function createTransport({appId, token, fetcher=fetch, now=Date.now,
  sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)), minGap=1500}) {
  let tail=Promise.resolve(), nextAt=0, stopped=false;
  const active=new Set();
  return {
    async call(operation, body={}) {
      const job=tail.catch(()=>{}).then(async()=>{
        if(stopped) throw new Error('PSI_CLOSED');
        await sleep(Math.max(0,nextAt-now()));
        if(stopped) throw new Error('PSI_CLOSED');
        if(!appId||!token) throw new Error('PSI_INSTALL');
        const controller=new AbortController(); active.add(controller);
        const timeout=setTimeout(()=>controller.abort(),15000);
        nextAt=now()+minGap;
        try {
          const response=await fetcher(`/api/apps/${appId}/service/${operation}`,{
            method:'POST', credentials:'omit', cache:'no-store', signal:controller.signal,
            headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
            body:JSON.stringify(body),
          });
          if(response.status===429) nextAt=now()+60000;
          const data=await response.json();
          if(!response.ok) {
            const error=new Error(data.error||data.detail||'PSI_REQUEST');
            error.status=response.status; throw error;
          }
          return data;
        } finally { clearTimeout(timeout); active.delete(controller); }
      });
      tail=job;
      return job;
    },
    close() { stopped=true; for(const controller of active) controller.abort(); },
  };
}
