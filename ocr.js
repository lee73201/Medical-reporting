(function () {
  'use strict';

  const limits = { maxFileBytes: 20 * 1024 * 1024, maxPages: 10, maxPixels: 6000000, maxImagePixels: 25000000, maxEdge: 3200 };
  let libraryPromise;

  function ocrError(message, name = 'OcrError') {
    const error = new Error(message);
    error.name = name;
    return error;
  }
  function fitDimensions(width, height, desiredScale = 1) {
    if (![width, height, desiredScale].every(value => Number.isFinite(value) && value > 0)) throw ocrError('图片尺寸无效，请更换文件。');
    const scale = Math.min(desiredScale, limits.maxEdge / Math.max(width, height), Math.sqrt(limits.maxPixels / (width * height)));
    return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)), scale };
  }
  function normalizeText(text) {
    return String(text || '').normalize('NFKC').replace(/\r\n?/g, '\n').replace(/[\u200b-\u200d\ufeff]/g, '')
      .replace(/([\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g, '$1')
      .replace(/(姓名|年龄|性别|患者[ \t]*ID|病历号|门诊号|体检号)[ \t]*[:：][ \t]*/gi, '\n$1：')
      .replace(/\b(mmol|[uμµ]mol|mg|g|IU|U)[ \t]*\/[ \t]*(dL|L)\b/gi, '$1/$2')
      .replace(/—/g, '–').split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');
  }
  function loadLibrary() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!libraryPromise) {
      libraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timer = setTimeout(() => { script.remove(); reject(ocrError('OCR 引擎加载超时，请重试。')); }, 20000);
        script.src = '/vendor/ocr/tesseract.min.js';
        script.onload = () => {
          clearTimeout(timer);
          if (window.Tesseract) resolve(window.Tesseract);
          else reject(ocrError('OCR 引擎不可用，请检查本地 vendor/ocr 资源。'));
        };
        script.onerror = () => { clearTimeout(timer); script.remove(); reject(ocrError('OCR 资源加载失败，请检查本地 vendor/ocr 目录。')); };
        document.head.append(script);
      }).catch(error => { libraryPromise = null; throw error; });
    }
    return libraryPromise;
  }

  function createSession(onProgress = () => {}) {
    let worker;
    let ready;
    let cancelled = false;
    let rejectClosed;
    let rejectEngine;
    const preflightAbort = new AbortController();
    const closed = new Promise((resolve, reject) => { rejectClosed = reject; });
    const engineFailed = new Promise((resolve, reject) => { rejectEngine = reject; });
    // Cancellation can happen before any OCR operation starts.
    closed.catch(() => {});
    engineFailed.catch(() => {});
    function check() { if (cancelled) throw ocrError('识别已取消。', 'AbortError'); }
    async function close() {
      if (cancelled) return;
      cancelled = true;
      preflightAbort.abort();
      rejectClosed(ocrError('识别已取消。', 'AbortError'));
      if (worker) { const previous = worker; worker = null; await previous.terminate().catch(() => {}); }
    }
    async function bounded(promise, ms = 90000) {
      let timer;
      try {
        return await Promise.race([promise, closed, engineFailed, new Promise((resolve, reject) => {
          timer = setTimeout(() => { reject(ocrError('OCR 识别超时，请取消后使用更清晰或更小的文件重试。')); void close(); }, ms);
        })]);
      } finally { clearTimeout(timer); }
    }
    async function getWorker() {
      check();
      if (!ready) ready = (async () => {
        if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') throw ocrError('当前浏览器不支持本地 OCR，请使用新版浏览器或手动录入。');
        const library = await bounded(loadLibrary(), 25000);
        check();
        const assets = ['worker.min.js', 'core/tesseract-core.wasm.js', 'core/tesseract-core-simd.wasm.js', 'core/tesseract-core-lstm.wasm.js', 'core/tesseract-core-simd-lstm.wasm.js', 'lang/chi_sim.traineddata.gz', 'lang/eng.traineddata.gz'];
        await bounded(Promise.all(assets.map(async path => {
          const response = await fetch(`/vendor/ocr/${path}`, { method: 'HEAD', signal: preflightAbort.signal });
          if (!response.ok) throw ocrError('OCR 本地资源不完整，请检查 vendor/ocr 目录后重试。');
        })), 20000);
        check();
        const creating = library.createWorker(['chi_sim', 'eng'], 1, {
          workerPath: '/vendor/ocr/worker.min.js', corePath: '/vendor/ocr/core', langPath: '/vendor/ocr/lang',
          workerBlobURL: false, gzip: true, cacheMethod: 'none',
          logger: event => { if (!cancelled) onProgress(event); },
          errorHandler: () => rejectEngine(ocrError('OCR 引擎运行失败，请检查资源文件或更换图片重试。'))
        });
        creating.then(candidate => { if (cancelled) void candidate.terminate().catch(() => {}); }).catch(() => {});
        worker = await bounded(creating, 120000);
        check();
        await bounded(worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1', user_defined_dpi: '300' }));
        return worker;
      })();
      return ready;
    }
    async function recognize(canvas) {
      check();
      const active = await getWorker();
      check();
      const result = await bounded(active.recognize(canvas));
      check();
      return { text: normalizeText(result.data?.text), confidence: Number.isFinite(result.data?.confidence) ? result.data.confidence : null };
    }
    return { recognize, close, cancel: close, check };
  }

  async function imageToCanvas(file, session) {
    session.check();
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(ocrError('图片读取超时，请换用 PNG 或 JPG 重试。')), 20000);
        image.onload = () => { clearTimeout(timer); resolve(); };
        image.onerror = () => { clearTimeout(timer); reject(ocrError('无法读取图片，请使用有效的 PNG、JPG 或 WebP 文件。')); };
        image.src = url;
      });
      session.check();
      if (image.naturalWidth * image.naturalHeight > limits.maxImagePixels) throw ocrError('图片尺寸过大，请缩小到 2500 万像素以内再试。');
      const size = fitDimensions(image.naturalWidth, image.naturalHeight, Math.max(1, 1800 / image.naturalWidth));
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext('2d');
      if (!context) throw ocrError('当前浏览器无法处理图片，请更换浏览器。');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size.width, size.height);
      context.drawImage(image, 0, 0, size.width, size.height);
      return canvas;
    } finally { URL.revokeObjectURL(url); }
  }

  window.MedicalOcr = { limits, fitDimensions, normalizeText, createSession, imageToCanvas };
})();
