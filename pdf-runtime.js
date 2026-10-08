import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {WorkerMessageHandler} from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
// Both sides are bundled from the same installed PDF.js version. The in-process
// handler avoids origin-bound worker startup without relaxing any boundary.
globalThis.pdfjsWorker={WorkerMessageHandler};
import {pdfOptions} from './pdf-options.js';
export function loadPosterDocument(bytes,appId){return getDocument(pdfOptions(bytes,appId));}
