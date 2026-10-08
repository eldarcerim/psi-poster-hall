// Local canvas probe for an explicitly supplied PDF; no output poster/image file.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {pdfOptions} from '../pdf-options.js';
const modules=process.env.PSI_NODE_MODULES||'/data/platform/frontend/node_modules';
const require=createRequire(`${modules}/package.json`),lib=require('@napi-rs/canvas');
Object.assign(globalThis,{DOMMatrix:lib.DOMMatrix,Path2D:lib.Path2D,ImageData:lib.ImageData});
const {getDocument}=await import(pathToFileURL(`${modules}/pdfjs-dist/legacy/build/pdf.mjs`));
const {WorkerMessageHandler}=await import(pathToFileURL(`${modules}/pdfjs-dist/legacy/build/pdf.worker.mjs`));
globalThis.pdfjsWorker={WorkerMessageHandler};
globalThis.fetch=async url=>{
 const prefix='/app-assets/by-id/11/pdf/';
 if(!url.startsWith(prefix))throw new Error('Nonlocal resource rejected');
 const b=await fs.readFile(new URL('../assets/pdf/'+url.slice(prefix.length),import.meta.url));
 return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
};
const bytes=await fs.readFile(process.argv[2]);
const task=getDocument({...pdfOptions(new Uint8Array(bytes),11),CanvasFactory:class{
 create(w,h){const canvas=lib.createCanvas(w,h);return{canvas,context:canvas.getContext('2d')}}
 reset(t,w,h){t.canvas.width=w;t.canvas.height=h}
 destroy(t){t.canvas.width=0;t.canvas.height=0;t.canvas=null;t.context=null}
}});
try{
 const doc=await task.promise;
 for(let n=1;n<=doc.numPages;n++){
  const page=await doc.getPage(n),natural=page.getViewport({scale:1});
  const v=page.getViewport({scale:Math.min(1200/natural.width,2000/natural.height)});
  const c=lib.createCanvas(Math.ceil(v.width),Math.ceil(v.height));
  await page.render({canvasContext:c.getContext('2d'),viewport:v}).promise;
  const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let ink=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<230||pixels[i+1]<230||pixels[i+2]<230)ink++;
  if(ink<100)throw new Error('Page appears empty');
 }
 console.log(`PASS: supplied PDF, ${bytes.length} bytes, ${doc.numPages} page(s) parsed and canvas-rendered locally; no external poster request or output file.`);
}finally{await task.destroy()}
