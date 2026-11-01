const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

function harness(overrides = {}) {
  const calls = { created: 0, terminated: 0, recognized: 0, assets: [], parameters: null };
  const worker = {
    async setParameters(parameters) { calls.parameters = parameters; },
    async recognize() { calls.recognized++; return { data: { text: '空 腹 血 糖 7.4 mmol / L 3.9-6.1', confidence: 88 } }; },
    async terminate() { calls.terminated++; }
  };
  const context = vm.createContext({
    window: { Tesseract: { async createWorker(languages, mode, options) {
      calls.created++; calls.languages = languages; calls.options = options; return worker;
    } } },
    Worker() {}, WebAssembly: {}, AbortController, setTimeout, clearTimeout,
    fetch: async (path, options) => { calls.assets.push({ path, options }); return { ok: true }; },
    ...overrides
  });
  vm.runInContext(readFileSync(join(__dirname, '..', 'ocr.js'), 'utf8'), context);
  return { ocr: context.window.MedicalOcr, context, calls, worker };
}

test('OCR normalization joins Chinese names and units without guessing digits', () => {
  const { ocr } = harness();
  const text = ocr.normalizeText('姓 名 : 测 试 患 者 年 龄 : 40\r\n空 腹 血 糖 ７.４ mmol / L 3.9—6.1\nGLU 7.O mmol/L');
  assert.match(text, /姓名：测试患者\n年龄：40/);
  assert.match(text, /空腹血糖 7.4 mmol\/L 3.9–6.1/);
  assert.match(text, /GLU 7.O mmol\/L/);
});

test('OCR raster dimensions cap both pixels and edges', () => {
  const { ocr } = harness();
  for (const [width, height] of [[600, 760], [12000, 4000], [3000, 3000]]) {
    const size = ocr.fitDimensions(width, height, 3);
    assert.ok(size.width * size.height <= ocr.limits.maxPixels);
    assert.ok(Math.max(size.width, size.height) <= ocr.limits.maxEdge);
    assert.ok(size.scale > 0);
  }
  assert.throws(() => ocr.fitDimensions(0, 10), /尺寸无效/);
});

test('one local worker handles multiple pages and closes once', async () => {
  const { ocr, calls } = harness();
  const session = ocr.createSession();
  const first = await session.recognize({});
  await session.recognize({});
  assert.equal(calls.created, 1);
  assert.equal(calls.recognized, 2);
  assert.equal(first.confidence, 88);
  assert.equal(calls.languages.join('+'), 'chi_sim+eng');
  assert.ok(calls.assets.every(({ path, options }) => path.startsWith('/vendor/ocr/') && options.method === 'HEAD'));
  assert.equal(calls.options.workerPath, '/vendor/ocr/worker.min.js');
  assert.equal(calls.options.langPath, '/vendor/ocr/lang');
  await session.close(); await session.close();
  assert.equal(calls.terminated, 1);
  await assert.rejects(session.recognize({}), { name: 'AbortError' });
});

test('cancellation rejects an in-flight recognition and terminates its worker', async () => {
  const { ocr, calls, worker } = harness();
  let started;
  const waiting = new Promise(resolve => { started = resolve; });
  worker.recognize = () => { started(); return new Promise(() => {}); };
  const session = ocr.createSession();
  const pending = session.recognize({});
  const rejection = assert.rejects(pending, { name: 'AbortError' });
  await waiting;
  await session.cancel();
  await rejection;
  assert.equal(calls.terminated, 1);
});

test('late initialization cannot keep a worker after cancellation', async () => {
  const { ocr, calls, context, worker } = harness();
  let finish, started;
  const waiting = new Promise(resolve => { started = resolve; });
  context.window.Tesseract.createWorker = () => { started(); return new Promise(resolve => { finish = resolve; }); };
  const session = ocr.createSession();
  const pending = session.recognize({});
  const rejection = assert.rejects(pending, { name: 'AbortError' });
  await waiting;
  await session.close();
  finish(worker);
  await rejection;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.terminated, 1);
});

test('missing vendor files fail clearly before starting a worker', async () => {
  const { ocr, calls } = harness({ fetch: async () => ({ ok: false }) });
  const session = ocr.createSession();
  await assert.rejects(session.recognize({}), /资源不完整/);
  assert.equal(calls.created, 0);
  await session.close();
});

test('worker failure is handled without leaking internal engine text', async () => {
  const { ocr, context } = harness();
  context.window.Tesseract.createWorker = async (languages, mode, options) => {
    options.errorHandler('internal stack with private data');
    return new Promise(() => {});
  };
  const session = ocr.createSession();
  await assert.rejects(session.recognize({}), error => error.name === 'OcrError' && !error.message.includes('private'));
  await session.close();
});

test('recognition timeout is a visible error, not a swallowed cancel', async () => {
  const { ocr, worker, calls } = harness({ setTimeout: (callback, ms) => setTimeout(callback, ms === 90000 ? 15 : ms) });
  worker.recognize = () => new Promise(() => {});
  const session = ocr.createSession();
  await assert.rejects(session.recognize({}), error => error.name === 'OcrError' && error.message.includes('超时'));
  assert.equal(calls.terminated, 1);
});
