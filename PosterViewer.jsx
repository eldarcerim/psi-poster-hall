import React, { useEffect, useRef, useState } from 'react';
import {loadPosterDocument} from './pdf-runtime.js';

export const POSTER_CSS = `
.psi-view-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}
.psi-view-controls button{padding:9px 12px}.psi-view-controls span{font-size:12px}
.psi-view-scroll{height:57vh;min-height:250px;overflow:auto;background:#e8eddf;border-radius:14px;overscroll-behavior:contain;touch-action:pan-x pan-y}
.psi-view-scroll canvas,.psi-view-scroll img{display:block;margin:16px auto;background:white;max-width:none;box-shadow:0 5px 20px #20383020}
.psi-view-error{padding:20px;color:#813c26}.psi-view-loading{padding:20px}
@media(max-width:700px){.psi-view-scroll{height:48vh}}
`;
export default function PosterViewer({
  poster,
  appId,
  en,
  title
}) {
  const T = (bs, eng) => en ? eng : bs;
  const canvas = useRef(null),
    surface = useRef(null),
    pdf = useRef(null);
  const [page, setPage] = useState(1),
    [pages, setPages] = useState(0),
    [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true),
    [failure, setFailure] = useState(false),
    [revision, setRevision] = useState(0);
  const isPdf = poster.type === 'application/pdf';
  useEffect(() => {
    let disposed = false;
    setPage(1);
    setZoom(100);
    setFailure(false);
    setLoading(isPdf);
    setPages(0);
    if (!isPdf) return;
    const bytes = Uint8Array.from(atob(poster.base64), c => c.charCodeAt(0));
    const task = loadPosterDocument(bytes, appId);
    task.onPassword = () => {
      if (!disposed) {
        setFailure(true);
        setLoading(false);
      }
      task.destroy().catch(() => {});
    };
    task.promise.then(doc => {
      if (disposed) return;
      pdf.current = doc;
      setPages(doc.numPages);
      setRevision(v => v + 1);
    }).catch(() => {
      if (!disposed) {
        setFailure(true);
        setLoading(false);
      }
    });
    return () => {
      disposed = true;
      pdf.current = null;
      task.destroy().catch(() => {});
    };
  }, [poster, appId, isPdf]);
  useEffect(() => {
    if (!isPdf || !pdf.current) return;
    let cancelled = false,
      render = null;
    const doc = pdf.current;
    setLoading(true);
    setFailure(false);
    (async () => {
      const p = await doc.getPage(page);
      if (cancelled || !canvas.current) return;
      const natural = p.getViewport({
        scale: 1
      });
      const cssWidth = Math.min(760, Math.max(240, (surface.current?.clientWidth || 600) - 32)) * zoom / 100;
      const cssScale = cssWidth / natural.width;
      // Bound allocation regardless of declared PDF page size and zoom.
      const renderScale = Math.min(cssScale * Math.min(devicePixelRatio || 1, 2), Math.sqrt(8000000 / (natural.width * natural.height)), 4096 / Math.max(natural.width, natural.height));
      const viewport = p.getViewport({
        scale: renderScale
      });
      const c = canvas.current;
      c.width = Math.ceil(viewport.width);
      c.height = Math.ceil(viewport.height);
      c.style.width = `${cssWidth}px`;
      c.style.height = `${natural.height * cssScale}px`;
      render = p.render({
        canvasContext: c.getContext('2d'),
        viewport
      });
      await render.promise;
      if (!cancelled) setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setFailure(true);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      render?.cancel();
    };
  }, [page, zoom, revision, isPdf]);
  const changeZoom = delta => setZoom(z => Math.max(50, Math.min(300, z + delta)));
  return <div>
    <div className="psi-view-controls" aria-label={T('Pregled postera', 'Poster controls')}>
      <button onClick={() => changeZoom(-25)} disabled={zoom <= 50} aria-label={T('Smanji', 'Zoom out')}>−</button>
      <span>{zoom}%</span>
      <button onClick={() => changeZoom(25)} disabled={zoom >= 300} aria-label={T('Uvećaj', 'Zoom in')}>+</button>
      <button onClick={() => setZoom(100)}>{T('Vrati veličinu', 'Reset zoom')}</button>
      {isPdf && pages > 1 && <><button onClick={() => setPage(p => p - 1)} disabled={page <= 1}>{T('Prethodna', 'Previous')}</button><span>{page} / {pages}</span><button onClick={() => setPage(p => p + 1)} disabled={page >= pages}>{T('Sljedeća', 'Next')}</button></>}
    </div>
    <div className="psi-view-scroll" ref={surface} tabIndex={0} aria-label={T('Poster: pomjeri za pregled', 'Poster: scroll to explore')} onKeyDown={e => {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        changeZoom(25);
      }
      if (e.key === '-') {
        e.preventDefault();
        changeZoom(-25);
      }
    }}>
      {failure ? <p className="psi-view-error" role="alert">{T('Poster nije moguće prikazati. Ako je PDF zaključan ili oštećen, postavi otključan PDF ili sliku. Sažetak je dostupan uz poster.', 'This poster cannot be displayed. For a locked or damaged PDF, upload an unlocked PDF or image. The abstract remains available.')}</p> : isPdf ? <><canvas ref={canvas} role="img" aria-label={title} hidden={loading} />{loading && <p className="psi-view-loading" role="status">{T('Učitavam poster…', 'Loading poster…')}</p>}</> : <img src={`data:${poster.type};base64,${poster.base64}`} alt={title} style={{
        width: `${zoom}%`
      }} onError={() => setFailure(true)} />}
    </div>
    <p className="psi-note">{T('Uvećaj pa pomjeri poster. Prikazuje se ovdje; ne šalje se van sale.', 'Zoom, then scroll the poster. It is displayed here, never sent outside the hall.')}</p>
  </div>;
}
