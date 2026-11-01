const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

// Lightweight DOM stand-ins for logic tests; actual layout is verified in a browser.
function harness() {
  const storage = new Map();
  const roots = new Map();
  const makeElement = id => ({
    id, innerHTML: '', dataset: {}, attributes: {}, controls: [],
    classList: {
      active: id === 'overview',
      contains(name) { return name === 'active' && this.active; },
      toggle(name, value) { if (name === 'active') this.active = value; }
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    addEventListener() {},
    insertAdjacentHTML() {},
    querySelector(selector) {
      if (selector === '#overview-breakdown' && this.innerHTML.includes('id="overview-breakdown"')) return makeElement('breakdown');
      if (selector === '.app-top' || selector === '.data-source-strip') return makeElement('header');
      return null;
    },
    querySelectorAll(selector) {
      if (selector !== '[data-overview-filter]') return [];
      this.controls = ['all', 'normal', 'abnormal'].map(filter => ({ dataset: { overviewFilter: filter } }));
      return this.controls;
    }
  });
  ['overview', 'upload', 'reports', 'report-detail', 'trends', 'ai-insights', 'profile'].forEach(id => roots.set(id, makeElement(id)));
  const document = {
    querySelectorAll: selector => selector === '.screen' ? [...roots.values()] : [],
    querySelector: selector => roots.get(selector.replace('#', '')) || (selector === '#trend-select' ? makeElement('trend-select') : null),
    getElementById: id => roots.get(id) || null,
    addEventListener() {}
  };
  const context = vm.createContext({
    document, window: {}, console: { log() {}, table() {} },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    AbortController, setTimeout, clearTimeout, TypeError, URL, Blob,
    confirm: () => false,
    fetch: async () => { throw new TypeError('Network unavailable'); }
  });
  vm.runInContext(readFileSync(join(__dirname, '..', 'ocr.js'), 'utf8'), context);
  vm.runInContext(readFileSync(join(__dirname, '..', 'app.js'), 'utf8'), context);
  return { context, app: context.window, roots, storage, run: code => vm.runInContext(code, context) };
}
function fixture(app) {
  return app.normalizeReport({ id: 'synthetic-test', patient: { name: '测试患者', age: 40, patientId: 'TEST' }, reportType: '生化检验', hospital: '测试机构', date: '2026-06-01', items: [{ name: 'GLU', value: 7.4, unit: 'mmol/L', refLow: 3.9, refHigh: 6.1, refSource: 'report' }] });
}

test('report file validation accepts supported PDF/images and rejects empty/oversized files', () => {
  const { app } = harness();
  for (const name of ['scan.pdf', 'report.PNG', 'report.jpeg', 'report.webp']) {
    assert.equal(app.validateReportFile({ name, size: 100, type: '' }), '');
  }
  assert.match(app.validateReportFile({ name: 'note.txt', size: 10 }), /请上传/);
  assert.match(app.validateReportFile({ name: 'scan.pdf', size: 0 }), /文件为空/);
  assert.match(app.validateReportFile({ name: 'scan.pdf', size: 21 * 1024 * 1024 }), /20MB/);
});

test('mixed PDF uses text extraction first, OCR only where needed and releases canvases', async () => {
  const { app, context } = harness();
  const counts = { ocr: 0, cleanup: 0, destroyed: 0 };
  const canvases = [];
  context.document.createElement = () => {
    const canvas = { width: 0, height: 0, getContext: () => ({}) };
    canvases.push(canvas); return canvas;
  };
  app.pdfjsLib = { GlobalWorkerOptions: {}, getDocument: options => {
    assert.equal(options.cMapUrl, '/vendor/pdfjs/cmaps/');
    return { promise: Promise.resolve({ numPages: 2, async destroy() { counts.destroyed++; },
      async getPage(number) { return {
        async getTextContent() { return { items: number === 1 ? [{ str: 'GLU 5.0 mmol/L 3.9-6.1', transform: [0, 0, 0, 0, 10, 700] }] : [] }; },
        getViewport: ({ scale }) => ({ width: 600 * scale, height: 760 * scale }),
        render: () => ({ promise: Promise.resolve() }), cleanup() { counts.cleanup++; }
      }; }
    }) };
  } };
  const extracted = await app.extractTextFromPdfFile({ name: 'mixed.pdf', arrayBuffer: async () => new ArrayBuffer(4) }, () => {}, {
    ocr: { async recognize() { counts.ocr++; return { text: 'LDL 3.7 mmol/L 0-3.4', confidence: 90 }; } }
  });
  assert.equal(counts.ocr, 1);
  assert.equal(counts.cleanup, 2);
  assert.equal(counts.destroyed, 1);
  assert.equal(extracted.pages[0].method, 'text');
  assert.equal(extracted.pages[1].method, 'ocr');
  assert.equal(extracted.ocr, true);
  assert.equal(app.buildReportFromParsedPdf(app.parsePdfReportText(extracted.text)).items.length, 2);
  assert.equal(canvases[0].width, 0);
  assert.equal(canvases[0].height, 0);
});

test('PDF limits reject the whole file rather than silently saving partial pages', async () => {
  const { app } = harness();
  let destroyed = false;
  app.pdfjsLib = { GlobalWorkerOptions: {}, getDocument: () => ({ promise: Promise.resolve({ numPages: 11, async destroy() { destroyed = true; } }) }) };
  const extracted = await app.extractTextFromPdfFile({ name: 'long.pdf', arrayBuffer: async () => new ArrayBuffer(1) });
  assert.equal(extracted.reason, 'page_limit');
  assert.equal(destroyed, true);
});

test('OCR preview requires explicit verification, which editing resets', async () => {
  const { app, context } = harness();
  let saved = 0;
  context.saveUploadedReport = async () => { saved++; };
  const verified = { checked: false, focus() {} };
  const submit = { disabled: false };
  const message = {};
  const nodes = { '[data-ocr-verified]': verified, '[data-pdf-save]': submit, '[data-pdf-message]': message, '[data-pdf-discard]': {} };
  const root = { querySelector: selector => nodes[selector] || null, querySelectorAll: () => [] };
  context.bindPdfPreviewEvents(root);
  await submit.onclick();
  assert.equal(saved, 0);
  assert.match(message.textContent, /勾选核对确认/);
  verified.checked = true;
  root.oninput({ target: {} });
  assert.equal(verified.checked, false);
});

test('parsed preview preserves original one-sided reference text until bounds change', () => {
  const { app } = harness();
  const row = entryRow({ pdfItemName: 'TC', pdfItemValue: 5.8, pdfItemUnit: 'mmol/L', pdfItemRefLow: 0, pdfItemRefHigh: 5.2 },
    { refSource: 'report', refText: '≤5.2', refLow: '0', refHigh: '5.2' });
  const fields = { pdfReportType: '生化检验', pdfHospital: '测试机构', pdfDate: '2026-11-02' };
  const root = {
    querySelector: selector => ({ value: fields[selector.match(/name="([^"]+)"/)[1]] || '' }),
    querySelectorAll: () => [row]
  };
  const result = app.collectParsedPdfPreview(root);
  assert.equal(result.errors.length, 0);
  assert.equal(result.report.items[0].refText, '≤5.2');
  assert.equal(result.report.items[0].status, 'high');
  row.inputs.pdfItemRefHigh.value = '6';
  row.dataset.refSource = 'manual';
  assert.equal(app.collectParsedPdfPreview(root).report.items[0].refText, '0–6');
});

test('overview starts collapsed and toggles the same stat closed', () => {
  const { roots, run } = harness();
  const root = roots.get('overview');
  assert.doesNotMatch(root.innerHTML, /id="overview-breakdown"/);
  root.controls[0].onclick();
  assert.match(root.innerHTML, /全部项目/);
  root.controls[0].onclick();
  assert.doesNotMatch(root.innerHTML, /id="overview-breakdown"/);
  assert.equal(run('overviewItemFilter'), null);
  assert.doesNotMatch(root.innerHTML, /健康评分|82分/);
});

test('local save, reload, clear and restore keep existing data semantics', async () => {
  const { app, storage } = harness();
  app.reportService.clearReports();
  assert.equal(app.getReports().length, 0);
  const saved = await app.saveUploadedReport(fixture(app));
  assert.equal(saved.items[0].name, '空腹血糖');
  assert.equal(saved.items[0].status, 'high');
  assert.equal(JSON.parse(storage.get('lab_reports_v2')).length, 1);
  assert.equal(app.getReports()[0].id, saved.id);
  app.reportService.restoreSampleReports();
  assert.ok(app.getReports().length > 1);
});

test('API saves reload the cache without overwriting local reports', async () => {
  const { context, app, storage } = harness();
  const localBefore = storage.get('lab_reports_v2');
  const record = fixture(app);
  const requests = [];
  context.fetch = async (url, options = {}) => {
    requests.push([url, options.method || 'GET']);
    return { ok: true, status: 200, json: async () => options.method === 'POST' ? record : [record] };
  };
  app.setDataMode('api');
  await app.saveUploadedReport(record);
  assert.equal(app.getReports()[0].id, record.id);
  assert.equal(requests[0][1], 'POST');
  assert.equal(requests[1][1], 'GET');
  assert.equal(storage.get('lab_reports_v2'), localBefore);
});

test('API failure has a visible recoverable state and leaves local data alone', async () => {
  const { app, storage, roots, run } = harness();
  const localBefore = storage.get('lab_reports_v2');
  app.setDataMode('api');
  await app.loadReportsToState();
  assert.ok(app.appState.error);
  assert.equal(app.appState.loading, false);
  run("render('overview')");
  assert.match(roots.get('overview').innerHTML, /重新加载/);
  assert.equal(storage.get('lab_reports_v2'), localBefore);
});

test('late API response cannot replace state after switching back to local', async () => {
  const { app, context } = harness();
  let resolve;
  context.fetch = () => new Promise(done => { resolve = done; });
  app.setDataMode('api');
  const pending = app.loadReportsToState();
  app.setDataMode('local');
  await app.loadReportsToState();
  const localCount = app.appState.reports.length;
  resolve({ ok: true, status: 200, json: async () => [] });
  await pending;
  assert.equal(app.appState.reports.length, localCount);
  assert.ok(localCount > 0);
});

test('backend errors do not expose raw response or database text', async () => {
  const { app, context } = harness();
  context.fetch = async () => ({ ok: false, status: 500, text: async () => 'private database traceback' });
  await assert.rejects(app.reportService.requestApi('/api/reports'), error => !error.message.includes('traceback') && error.message.includes('稍后重试'));
});

test('PDF parser regression and paste parsing still use the shared report shape', () => {
  const { app } = harness();
  const result = app.runPdfParserTests();
  assert.equal(result.passed, result.total);
  const parsed = app.parsePdfReportText('测试医院\n生化检验\n报告日期：2026-06-01\nGLU 7.4 mmol/L 3.9-6.1\nLDL 3.7 mmol/L 0-3.4\nCREA 115 umol/L 57-111');
  const report = app.buildReportFromParsedPdf(parsed);
  assert.equal(report.items.length, 3);
  assert.deepEqual(Array.from(report.items, item => item.name), ['空腹血糖', '低密度脂蛋白', '肌酐']);
});

test('AI cards keep latest expanded and historical cards collapsed', () => {
  const { app } = harness();
  const reports = app.getReports().sort((a, b) => b.date.localeCompare(a.date));
  const html = app.renderAiInsightCards(reports);
  assert.equal((html.match(/ai-report-card expanded/g) || []).length, 1);
  assert.equal((html.match(/ai-report-card collapsed/g) || []).length, reports.length - 1);
  assert.match(html, /不能替代医生诊断/);
});

test('detail explanation handler is replaced on re-render, not accumulated', () => {
  const { app, roots } = harness();
  const root = roots.get('report-detail');
  app.bindReportDetailEvents(root, fixture(app));
  const handler = root.onclick;
  app.bindReportDetailEvents(root, fixture(app));
  assert.equal(typeof root.onclick, 'function');
  assert.notEqual(root.onclick, handler);
});

test('chat prevents duplicate sends and falls back to local rules', async () => {
  const { app, context, run } = harness();
  app.reportService.saveAllReports([fixture(app)]);
  run('renderAi = () => {};');
  let finish;
  context.chatResponse = new Promise(resolve => { finish = resolve; });
  run('callAiChatApi = () => chatResponse;');
  const pending = context.sendChatQuestion('GLU 严重吗');
  await context.sendChatQuestion('GLU 严重吗');
  assert.equal(app.getChatHistory().length, 1);
  assert.equal(run('chatSending'), true);
  finish(null);
  await pending;
  const messages = app.getChatHistory();
  assert.equal(messages.length, 2);
  assert.match(messages[1].content, /7.4/);
  assert.match(messages[1].content, /不能替代医生诊断/);
  assert.equal(messages[1].source, 'mock');
  assert.equal(run('chatSending'), false);
});

test('legacy reports/chat and missing medical dictionary entries stay usable', () => {
  const { app, storage } = harness();
  const report = app.normalizeReport({ items: [{ name: 'GLU', value: 7.4, range: '3.9-6.1' }] });
  assert.ok(report.patient.name);
  assert.equal(report.items[0].name, '空腹血糖');
  assert.ok(app.explainLabItem({ name: '未收录项目', value: 1, status: 'normal' }).disclaimer);
  storage.set('lab_chat_v2', JSON.stringify([{ role: 'ai', text: '旧消息' }]));
  assert.equal(app.getChatHistory()[0].role, 'assistant');
  assert.equal(app.getChatHistory()[0].content, '旧消息');
});

test('overview normal and abnormal filters show their real item counts', () => {
  const { roots, app } = harness();
  const root = roots.get('overview');
  const report = app.getLatestReport();
  root.controls[1].onclick();
  assert.match(root.innerHTML, /正常项目/);
  assert.equal((root.innerHTML.match(/data-overview-explain=/g) || []).length, report.items.filter(item => item.status === 'normal').length);
  root.controls[2].onclick();
  assert.match(root.innerHTML, /异常项目/);
  assert.equal((root.innerHTML.match(/data-overview-explain=/g) || []).length, report.items.filter(item => item.status !== 'normal').length);
});

test('imported IDs, units and invalid reference sources cannot inject HTML', () => {
  const { app, roots, run } = harness();
  const report = fixture(app);
  report.id = '\" onclick=\"alert(1)';
  report.items[0].unit = '<img src=x onerror=alert(1)>';
  report.items[0].refSource = '\" onclick=\"alert(1)';
  app.reportService.saveAllReports([report]);
  run("render('reports'); render('overview');");
  assert.doesNotMatch(roots.get('reports').innerHTML, /data-report-id="" onclick=/);
  assert.doesNotMatch(roots.get('overview').innerHTML, /<img src=x/);
  assert.equal(app.getReports()[0].items[0].refSource, 'unknown');
});

test('one-point and zero-baseline trends never present an Infinity percentage', () => {
  const { app, roots, run } = harness();
  const report = fixture(app);
  app.reportService.saveAllReports([report]);
  run("render('trends')");
  assert.match(roots.get('trends').innerHTML, /暂无对比记录/);
  const previous = JSON.parse(JSON.stringify(report));
  previous.id = 'previous'; previous.date = '2026-05-01'; previous.items[0].value = 0;
  app.reportService.saveAllReports([report, previous]);
  run("render('trends')");
  assert.doesNotMatch(roots.get('trends').innerHTML, /Infinity|NaN/);
});

test('editing local data preserves the ID/patient and recalculates derived pages', async () => {
  const { app } = harness();
  const original = fixture(app);
  app.reportService.saveAllReports([original]);
  app.aiInterpretationState[original.id] = { source: 'ai', result: { summary: '旧 AI 解读' } };
  const updated = JSON.parse(JSON.stringify(original));
  updated.items[0].value = 5.4;
  updated.hospital = '修正后的测试医院';
  updated.patient.name = '不应覆盖患者';
  updated.id = '不应创建新报告';
  const saved = await app.saveEditedReport(updated, { report: original, mode: 'local' });
  assert.equal(saved.id, original.id);
  assert.equal(saved.patient.name, original.patient.name);
  assert.equal(saved.items[0].status, 'normal');
  assert.equal(app.getReports().length, 1);
  assert.equal(app.getOverviewStats().abnormal, 0);
  assert.equal(app.getTrendData('空腹血糖')[0].value, 5.4);
  assert.equal(app.aiInterpretationState[original.id].invalidated, true);
  const html = app.renderAiReportCard(saved, { expanded: true });
  assert.match(html, /旧 AI 解读已失效/);
  assert.doesNotMatch(html, /旧 AI 解读<|7\.4 mmol/);
  assert.match(app.generateMockChatReply('GLU是什么意思', saved), /5.4/);
});

test('API editing uses PUT, updates the cache, and keeps local storage separate', async () => {
  const { app, context, storage } = harness();
  const localBefore = storage.get('lab_reports_v2');
  const original = fixture(app);
  app.setDataMode('api');
  app.appState.reports = [original];
  app.appState.reportsLoaded = true;
  let request;
  context.fetch = async (url, options) => {
    request = { url, method: options.method, body: JSON.parse(options.body) };
    return { ok: true, status: 200, json: async () => request.body };
  };
  const updated = JSON.parse(JSON.stringify(original));
  updated.items[0].value = 4.8;
  await app.saveEditedReport(updated, { report: original, mode: 'api' });
  assert.equal(request.method, 'PUT');
  assert.ok(request.url.endsWith('/api/reports/synthetic-test'));
  assert.equal(app.getReports()[0].items[0].value, 4.8);
  assert.equal(app.getReports()[0].items[0].status, 'normal');
  assert.equal(storage.get('lab_reports_v2'), localBefore);
});

test('failed API edits do not mutate the report or invalidate the old interpretation', async () => {
  const { app, context } = harness();
  const original = fixture(app);
  app.setDataMode('api');
  app.appState.reports = [original];
  app.aiInterpretationState[original.id] = { source: 'ai', result: { summary: '旧解读' } };
  context.fetch = async () => ({ ok: false, status: 500 });
  const updated = JSON.parse(JSON.stringify(original));
  updated.hospital = '新医院';
  await assert.rejects(app.saveEditedReport(updated, { report: original, mode: 'api' }));
  assert.equal(app.getReports()[0].hospital, original.hospital);
  assert.equal(app.aiInterpretationState[original.id].source, 'ai');
});

test('editing an unchanged report is a no-op and does not discard an AI result', async () => {
  const { app } = harness();
  const original = fixture(app);
  app.reportService.saveAllReports([original]);
  app.aiInterpretationState[original.id] = { source: 'ai' };
  await app.saveEditedReport(original, { report: original, mode: 'local' });
  assert.equal(app.aiInterpretationState[original.id].source, 'ai');
});

test('invalid editing data and data-mode mismatches cannot write a report', async () => {
  const { app } = harness();
  const original = fixture(app);
  app.reportService.saveAllReports([original]);
  const invalid = JSON.parse(JSON.stringify(original));
  invalid.items[0].refLow = 9;
  invalid.items[0].refHigh = 1;
  await assert.rejects(app.saveEditedReport(invalid, { report: original, mode: 'local' }), /参考下限不能大于上限/);
  await assert.rejects(app.saveEditedReport(original, { report: original, mode: 'api' }), /数据来源已变化/);
  assert.equal(app.getReports()[0].items[0].refHigh, 6.1);
});

function entryRow(values, dataset = {}) {
  const inputs = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, { value: String(value) }]));
  const badge = {};
  return {
    dataset,
    inputs,
    querySelector(selector) {
      if (selector === '.ref-source-badge') return badge;
      return inputs[selector.match(/name="([^"]+)"/)[1]];
    }
  };
}
function entryRoot(row) {
  return {
    querySelector: () => ({ reportType: { value: '生化检验' }, hospital: { value: '测试医院' }, date: { value: '2026-06-01' } }),
    querySelectorAll: () => [row]
  };
}

test('unchanged names retain report references; editing bounds becomes manual', () => {
  const { app, context } = harness();
  const row = entryRow({ itemName: 'GLU', itemValue: 5.4, itemUnit: 'mmol/L', itemRefLow: 3.8, itemRefHigh: 6.5 },
    { referenceName: '空腹血糖', refSource: 'report', refText: '3.8–6.5', initialRefLow: '3.8', initialRefHigh: '6.5' });
  context.applyReferenceDefaults(row, true);
  assert.equal(row.inputs.itemName.value, '空腹血糖');
  assert.equal(row.inputs.itemRefHigh.value, '6.5');
  assert.equal(app.collectUploadFormData(entryRoot(row)).report.items[0].refSource, 'report');
  row.inputs.itemRefHigh.value = '5.1';
  context.setRowRefSource(row, 'manual');
  const item = app.collectUploadFormData(entryRoot(row)).report.items[0];
  assert.equal(item.refSource, 'manual');
  assert.equal(item.refText, '3.8–5.1');
  assert.equal(item.status, 'high');
});

test('value-only changes retain one-sided reference text from the report', () => {
  const { app } = harness();
  const row = entryRow({ itemName: 'TC', itemValue: 4.4, itemUnit: 'mmol/L', itemRefLow: 0, itemRefHigh: 5.2 },
    { referenceName: '总胆固醇', refSource: 'report', refText: '<5.2', initialRefLow: '0', initialRefHigh: '5.2' });
  const item = app.collectUploadFormData(entryRoot(row)).report.items[0];
  assert.equal(item.refText, '<5.2');
  assert.equal(item.refSource, 'report');
});

test('report search supports hospitals, types, item names, aliases and literal input', () => {
  const { app } = harness();
  const reports = app.getReports();
  const base = { search: '', reportType: '', status: '', startDate: '', endDate: '' };
  for (const search of ['市第一', '血常规', '空腹血糖', 'glu', 'LDL']) {
    assert.ok(app.filterReports(reports, { ...base, search }).length > 0, search);
  }
  assert.equal(app.filterReports(reports, { ...base, search: '不存在的医院' }).length, 0);
  assert.equal(app.filterReports(reports, { ...base, search: '.*[' }).length, 0);
  assert.equal(app.filterReports(reports, base).length, reports.length);
});

test('date/type/status filters combine, include boundary dates and sort newest first', () => {
  const { app } = harness();
  const reports = app.getReports();
  const filters = { search: '', reportType: '生化检验', status: 'abnormal', startDate: '2026-03-28', endDate: '2026-03-28' };
  const found = app.filterReports(reports, filters);
  assert.equal(found.length, 1);
  assert.equal(found[0].date, '2026-03-28');
  const normal = app.filterReports(reports, { ...filters, reportType: '', startDate: '', endDate: '', status: 'normal' });
  assert.ok(normal.length);
  assert.ok(normal.every(report => app.getAbnormalItems(report).length === 0));
  assert.equal(app.getReportFilterError({ ...filters, endDate: '2026-01-01' }), '开始日期不能晚于结束日期。');
  assert.ok(app.getReportFilterError({ ...filters, startDate: '2026-02-30' }));
});

test('no search results and no reports have distinct empty states', () => {
  const { roots, run } = harness();
  run("reportListFilters.search = '不存在的医院'; renderReports();");
  assert.match(roots.get('reports').innerHTML, /没有匹配的报告/);
  assert.match(roots.get('reports').innerHTML, /重置搜索与筛选/);
  run('reportService.clearReports(); renderReports();');
  assert.match(roots.get('reports').innerHTML, /暂无报告数据/);
  assert.doesNotMatch(roots.get('reports').innerHTML, /没有匹配的报告/);
});

test('dirty editors can cancel navigation, discard explicitly, and block while saving', () => {
  const { context, roots, run } = harness();
  const input = { name: 'hospital', value: '原医院' };
  roots.get('upload').querySelectorAll = () => [input];
  run("screens.forEach(screen => screen.classList.toggle('active', screen.id === 'upload')); reportEditSession = { snapshot: getReportFormSnapshot(), saving: false };");
  input.value = '未保存医院';
  context.confirm = () => false;
  assert.equal(context.canLeaveReportEditor('reports'), false);
  assert.ok(run('reportEditSession'));
  run('reportEditSession.saving = true;');
  assert.equal(context.canLeaveReportEditor('reports'), false);
  run('reportEditSession.saving = false;');
  context.confirm = () => true;
  assert.equal(context.canLeaveReportEditor('reports'), true);
  assert.equal(run('reportEditSession'), null);
});

test('an AI interpretation started before an edit cannot overwrite fresh rule results', async () => {
  const { app, context, run } = harness();
  const original = fixture(app);
  app.reportService.saveAllReports([original]);
  run('renderAi = () => {};');
  let finish;
  context.aiResponse = new Promise(resolve => { finish = resolve; });
  run('callAiInterpretApi = () => aiResponse;');
  const pending = app.requestAiInterpretation(original.id);
  const updated = JSON.parse(JSON.stringify(original));
  updated.items[0].value = 5.4;
  await app.saveEditedReport(updated, { report: original, mode: 'local' });
  finish({ summary: '旧的7.4解读' });
  await pending;
  assert.equal(app.aiInterpretationState[original.id].source, 'mock');
  assert.equal(app.aiInterpretationState[original.id].invalidated, true);
  assert.equal(app.aiInterpretationState[original.id].result.abnormalItems.length, 0);
});

test('chat replies based on a pre-edit report are not appended after saving', async () => {
  const { app, context, run } = harness();
  const original = fixture(app);
  app.reportService.saveAllReports([original]);
  run('renderAi = () => {};');
  let finish;
  context.chatResponse = new Promise(resolve => { finish = resolve; });
  run('callAiChatApi = () => chatResponse;');
  const pending = context.sendChatQuestion('GLU是什么意思');
  const updated = JSON.parse(JSON.stringify(original));
  updated.items[0].value = 5.4;
  await app.saveEditedReport(updated, { report: original, mode: 'local' });
  finish('旧报告的7.4回复');
  await pending;
  assert.equal(app.getChatHistory().length, 1);
  assert.equal(run('chatSending'), false);
});

test('late list refreshes cannot replace a report just updated through the API', async () => {
  const { app, context } = harness();
  const original = fixture(app);
  app.setDataMode('api');
  app.appState.reports = [original];
  let finish;
  context.fetch = async (url, options = {}) => options.method === 'PUT'
    ? { ok: true, status: 200, json: async () => JSON.parse(options.body) }
    : new Promise(resolve => { finish = resolve; });
  const pending = app.loadReportsToState();
  const updated = JSON.parse(JSON.stringify(original));
  updated.items[0].value = 5.4;
  await app.saveEditedReport(updated, { report: original, mode: 'api' });
  finish({ ok: true, status: 200, json: async () => [original] });
  await pending;
  assert.equal(app.getReports()[0].items[0].value, 5.4);
  assert.equal(app.appState.loading, false);
});
