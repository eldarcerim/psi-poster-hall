export function pdfOptions(bytes, appId) {
  const base = `/app-assets/by-id/${appId}/pdf/`;
  // Factory paths are selected by us, not by embedded PDF URLs.
  class LocalBinaryDataFactory {
    async fetch({
      kind,
      filename
    }) {
      const folders = {
        cMapUrl: 'cmaps',
        standardFontDataUrl: 'standard_fonts',
        wasmUrl: 'wasm'
      };
      if (!folders[kind] || !/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(filename)) throw new Error('PDF resource unavailable');
      const r = await fetch(`${base}${folders[kind]}/${filename}`, {
        credentials: 'omit'
      });
      if (!r.ok) throw new Error('PDF resource unavailable');
      return new Uint8Array(await r.arrayBuffer());
    }
  }
  return {
    data: bytes,
    BinaryDataFactory: LocalBinaryDataFactory,
    useWorkerFetch: false,
    cMapUrl: base + 'cmaps/',
    standardFontDataUrl: base + 'standard_fonts/',
    wasmUrl: base + 'wasm/',
    isEvalSupported: false,
    enableXfa: false,
    disableFontFace: true,
    useSystemFonts: false,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
    useWasm: false,
    maxImageSize: 16000000,
    canvasMaxAreaInBytes: 64000000,
    stopAtErrors: true,
    verbosity: 0
  };
}
