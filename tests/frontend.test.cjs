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
  vm.runInContext(readFileSync(join(__dirname, '..', 'app.js'), 'utf8'), context);
  return { context, app: context.window, roots, storage, run: code => vm.runInContext(code, context) };
}
function fixture(app) {
  return app.normalizeReport({ id: 'synthetic-test', patient: { name: '测试患者', age: 40, patientId: 'TEST' }, reportType: '生化检验', hospital: '测试机构', date: '2026-06-01', items: [{ name: 'GLU', value: 7.4, unit: 'mmol/L', refLow: 3.9, refHigh: 6.1, refSource: 'report' }] });
}

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
