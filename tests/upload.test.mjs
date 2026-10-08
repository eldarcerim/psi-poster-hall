import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readPosterFile,MAX_POSTER_BYTES} from '../poster-upload.js';
test('actual handler file reader accepts a PDF and preserves every byte',async()=>{
  const raw=Buffer.from('%PDF-1.7\nfixture');
  const result=await readPosterFile(new File([raw],'fixture.pdf',{type:'application/pdf'}));
  assert.equal(result.name,'fixture.pdf');assert.deepEqual(Buffer.from(result.base64,'base64'),raw);
});
test('PNG and JPEG upload reading preserve binary bytes',async()=>{
  for(const type of ['image/png','image/jpeg']){
    const raw=Uint8Array.from([0,1,128,255]);
    const r=await readPosterFile(new File([raw],'fixture',{type}));
    assert.deepEqual(Uint8Array.from(Buffer.from(r.base64,'base64')),raw);
  }
});
test('file reading rejects empty, oversize and active-document types before transport',async()=>{
  await assert.rejects(readPosterFile(new File([],'empty.pdf',{type:'application/pdf'})));
  await assert.rejects(readPosterFile({size:MAX_POSTER_BYTES+1,type:'application/pdf'}));
  await assert.rejects(readPosterFile(new File(['<svg/>'],'x.svg',{type:'image/svg+xml'})));
});
