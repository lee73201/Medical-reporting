# Local OCR Assets

These assets run in the browser. Original report files are not sent to an OCR service. Keep this directory under the HTTP document root; paths start with `/vendor/ocr/`.

## Versions And Sources

- Tesseract.js **6.0.1**: `tesseract.min.js`, `worker.min.js` and bundled license notices, from the official npm package's `dist/` directory. Apache-2.0; see `LICENSE.md` and `*.LICENSE.txt`.
  - Package: https://registry.npmjs.org/tesseract.js/-/tesseract.js-6.0.1.tgz
  - npm SHA-512 integrity: `/sPvMvrCtgxnNRCjbTYbr7BRu0yfWDsMZQ2a/T5aN/L1t8wUQN6tTWv6p6FwzpoEBA0jrN2UD2SX4QQFRdoDbA==`
- tesseract.js-core **6.0.0**: four `core/tesseract-core*.wasm.js` variants and license, from the official npm package. Apache-2.0; see `core/LICENSE`.
  - Package: https://registry.npmjs.org/tesseract.js-core/-/tesseract.js-core-6.0.0.tgz
  - npm SHA-512 integrity: `1Qncm/9oKM7xgrQXZXNB+NRh19qiXGhxlrR8EwFbK5SaUbPZnS5OMtP/ghtqfd23hsr1ZvZbZjeuAGcMxd/ooA==`
- Simplified Chinese and English `tessdata_fast` models at pinned commit **87416418657359cb625c412a48b6e1d6d41c29bd**. Apache-2.0; see `lang/LICENSE`.
  - https://github.com/tesseract-ocr/tessdata_fast/tree/87416418657359cb625c412a48b6e1d6d41c29bd
  - Files: `chi_sim.traineddata`, `eng.traineddata`, compressed locally with `gzip -n` as `lang/*.traineddata.gz`.

The `.wasm.js` distributions embed their WASM payload; separate `.wasm` files are not required by this build. All four variants are retained so Tesseract can select a SIMD/LSTM-compatible core. Total vendor directory size is about 20MB, not all of which is loaded for one recognition session.

## Runtime Configuration

`ocr.js` lazily loads the main script and configures:

```js
Tesseract.createWorker(['chi_sim', 'eng'], 1, {
  workerPath: '/vendor/ocr/worker.min.js',
  corePath: '/vendor/ocr/core',
  langPath: '/vendor/ocr/lang',
  workerBlobURL: false,
  gzip: true,
  cacheMethod: 'none'
});
```

Use HTTP (for example `python -m http.server 8088 --bind 127.0.0.1`), not `file://`. Serve the directory at the site root. No npm install or external OCR CDN is required at runtime. On a missing resource the app shows a retry/manual-entry error; it does not silently fall back to a remote service.

PDF.js renders PDF pages into images; Tesseract does not directly read PDF files. See official [local installation](https://github.com/naptha/tesseract.js/blob/v6.0.1/docs/local-installation.md) and [API docs](https://github.com/naptha/tesseract.js/blob/v6.0.1/docs/api.md).
