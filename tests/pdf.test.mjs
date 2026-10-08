import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import {pdfOptions} from '../pdf-options.js';

const modules=process.env.PSI_NODE_MODULES||'/data/platform/frontend/node_modules';
const require=createRequire(`${modules}/package.json`);
const canvasLib=require('@napi-rs/canvas');
globalThis.DOMMatrix=canvasLib.DOMMatrix;globalThis.Path2D=canvasLib.Path2D;
globalThis.ImageData=canvasLib.ImageData;
const {getDocument}=await import(pathToFileURL(`${modules}/pdfjs-dist/legacy/build/pdf.mjs`));
const {WorkerMessageHandler}=await import(pathToFileURL(`${modules}/pdfjs-dist/legacy/build/pdf.worker.mjs`));
globalThis.pdfjsWorker={WorkerMessageHandler};

export function syntheticPdf() {
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 2 /Kids [3 0 R 4 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 7 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> /Contents 6 0 R >>',
    null,null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const stream1='0.1 0.6 0.3 rg 20 20 160 160 re f BT /F1 12 Tf 30 100 Td (FICTIONAL PSI TEST) Tj ET';
  const stream2='0.1 0.2 0.8 rg 20 20 160 160 re f';
  objects[4]=`<< /Length ${stream1.length} >>\nstream\n${stream1}\nendstream`;
  objects[5]=`<< /Length ${stream2.length} >>\nstream\n${stream2}\nendstream`;
  let source='%PDF-1.7\n',offsets=[0];
  objects.forEach((o,i)=>{offsets.push(source.length);source+=`${i+1} 0 obj\n${o}\nendobj\n`});
  const xref=source.length;
  source+=`xref\n0 8\n0000000000 65535 f \n`+offsets.slice(1).map(o=>`${String(o).padStart(10,'0')} 00000 n \n`).join('');
  source+=`trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(Buffer.from(source));
}

test('same in-process PDF handler renders two real pages with local font resources',async()=>{
  const oldFetch=globalThis.fetch;
  const urls=[];
  globalThis.fetch=async url=>{
    urls.push(url);assert.ok(url.startsWith('/app-assets/by-id/11/pdf/'));
    const rel=url.slice('/app-assets/by-id/11/pdf/'.length);
    const bytes=await fs.readFile(new URL(`../assets/pdf/${rel}`,import.meta.url));
    return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  };
  const options=pdfOptions(syntheticPdf(),11);
  const task=getDocument({...options,CanvasFactory:class {
    create(w,h){const canvas=canvasLib.createCanvas(w,h);return{canvas,context:canvas.getContext('2d')}}
    reset(target,w,h){target.canvas.width=w;target.canvas.height=h}
    destroy(target){target.canvas.width=0;target.canvas.height=0;target.canvas=null;target.context=null}
  }});
  try {
    const doc=await task.promise;assert.equal(doc.numPages,2);
    for(const n of [1,2]){
      const page=await doc.getPage(n),canvas=canvasLib.createCanvas(400,400);
      await page.render({canvasContext:canvas.getContext('2d'),viewport:page.getViewport({scale:2})}).promise;
      const [r,g,b]=canvas.getContext('2d').getImageData(100,100,1,1).data;
      assert.ok(n===1?g>r&&g>b:b>r&&b>g);
    }
    assert.ok(urls.some(u=>u.includes('standard_fonts')));
  } finally {await task.destroy();globalThis.fetch=oldFetch}
});
test('malformed PDF fails instead of exposing browser embed or external actions',async()=>{
  const task=getDocument(pdfOptions(Uint8Array.from(Buffer.from('%PDF- broken')),11));
  await assert.rejects(task.promise);await task.destroy();
});
test('PDF options disallow active document features and arbitrary asset paths',async()=>{
  const options=pdfOptions(syntheticPdf(),11);
  assert.equal(options.enableXfa,false);assert.equal(options.isEvalSupported,false);
  assert.equal(options.useWorkerFetch,false);assert.equal(options.disableFontFace,true);
  const factory=new options.BinaryDataFactory();
  await assert.rejects(factory.fetch({kind:'cMapUrl',filename:'../../secret'}));
  await assert.rejects(factory.fetch({kind:'https://external.invalid',filename:'x'}));
});
