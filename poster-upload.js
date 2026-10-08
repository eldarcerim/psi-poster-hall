export const MAX_POSTER_BYTES=4*1024*1024;
export async function readPosterFile(file) {
  if(!file||file.size===0||file.size>MAX_POSTER_BYTES)throw new Error('Poster: 0–4 MB.');
  if(!['application/pdf','image/png','image/jpeg'].includes(file.type))throw new Error('PDF, PNG ili JPEG.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(bytes.length!==file.size)throw new Error('Čitanje postera nije uspjelo.');
  let binary='';
  for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return {type:file.type,name:file.name,base64:btoa(binary)};
}
