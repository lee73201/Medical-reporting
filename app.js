const screens = Array.from(document.querySelectorAll('.screen'));
const navButtons = Array.from(document.querySelectorAll('.bottom-nav button'));
const REPORTS_KEY = 'lab_reports_v2';
const CHAT_KEY = 'lab_chat_v2';
const SELECTED_REPORT_KEY = 'lab_selected_report_id';
const DATA_MODE_KEY = 'lab_data_mode';
const appConfig = {
  dataMode: getStoredDataMode(),
  apiBaseUrl: 'http://127.0.0.1:8000'
};
const appState = {
  reports: [],
  reportsLoaded: false,
  loading: false,
  error: null,
  apiHealth: 'unchecked'
};
const patient = { name: '王先生', age: 70, patientId: '123XXXX' };
let selectedReportId = getStoredSelectedReportId();
let selectedTrendItem = '空腹血糖';
let aiMode = 'insights';
let selectedAiReportId = '';
let expandedAiReportId = '';


const labReferenceDictionary = [
  { name: '空腹血糖', aliases: ['FPG', 'GLU', '葡萄糖', '血糖'], unit: 'mmol/L', refLow: 3.9, refHigh: 6.1, refText: '3.9–6.1' },
  { name: '低密度脂蛋白', aliases: ['LDL', 'LDL-C', '低密度胆固醇'], unit: 'mmol/L', refLow: 0, refHigh: 3.4, refText: '0–3.4' },
  { name: '总胆固醇', aliases: ['TC', 'CHOL', '胆固醇'], unit: 'mmol/L', refLow: 0, refHigh: 5.2, refText: '0–5.2' },
  { name: '甘油三酯', aliases: ['TG', 'TRIG'], unit: 'mmol/L', refLow: 0, refHigh: 1.7, refText: '0–1.7' },
  { name: '尿酸', aliases: ['UA', 'URIC'], unit: 'μmol/L', refLow: 208, refHigh: 428, refText: '208–428' },
  { name: '肌酐', aliases: ['CREA', 'CRE', 'Scr'], unit: 'μmol/L', refLow: 57, refHigh: 111, refText: '57–111' },
  { name: '尿素氮', aliases: ['BUN', 'UREA'], unit: 'mmol/L', refLow: 2.9, refHigh: 8.2, refText: '2.9–8.2' },
  { name: '白细胞', aliases: ['WBC', '白细胞计数'], unit: '10^9/L', refLow: 3.5, refHigh: 9.5, refText: '3.5–9.5' },
  { name: '红细胞', aliases: ['RBC', '红细胞计数'], unit: '10^12/L', refLow: 4.3, refHigh: 5.8, refText: '4.3–5.8' },
  { name: '血红蛋白', aliases: ['HGB', 'Hb'], unit: 'g/L', refLow: 130, refHigh: 175, refText: '130–175' },
  { name: '血小板', aliases: ['PLT', '血小板计数'], unit: '10^9/L', refLow: 125, refHigh: 350, refText: '125–350' }
];

const medicalItemDictionary = [
  { name: '空腹血糖', aliases: ['FPG', 'GLU', '葡萄糖', '血糖'], category: '糖代谢', meaning: '空腹血糖用于反映空腹状态下血液中的葡萄糖水平，常用于糖尿病筛查和血糖控制评估。', highMeaning: '偏高可能提示糖代谢异常、糖尿病风险、进食影响或应激状态，需要结合既往病史和其他指标判断。', lowMeaning: '偏低可能与进食不足、降糖药物影响或低血糖风险有关。', normalMeaning: '当前结果位于参考范围内，通常提示该指标暂无明显异常。', suggestion: '建议结合糖化血红蛋白、既往糖尿病史、用药情况和医生意见综合判断。' },
  { name: '低密度脂蛋白', aliases: ['LDL', 'LDL-C', '低密度胆固醇'], category: '血脂', meaning: '低密度脂蛋白常用于评估血脂水平和动脉粥样硬化相关风险。', highMeaning: '偏高可能与饮食结构、体重、运动不足或遗传因素有关，长期偏高会增加心血管风险。', lowMeaning: '偏低一般临床意义较小，但需结合营养状态和其他血脂指标判断。', normalMeaning: '当前结果位于参考范围内，提示该项血脂指标暂无明显异常。', suggestion: '建议结合总胆固醇、甘油三酯、高密度脂蛋白和医生意见综合判断。' },
  { name: '总胆固醇', aliases: ['TC', 'CHOL', '胆固醇'], category: '血脂', meaning: '总胆固醇反映血液中胆固醇总体水平，是血脂评估的重要项目。', highMeaning: '偏高可能与高脂饮食、体重增加、运动不足或代谢异常有关。', lowMeaning: '偏低可能与营养摄入不足、肝脏代谢状态等因素有关。', normalMeaning: '当前结果位于参考范围内，提示胆固醇总体水平较平稳。', suggestion: '建议结合低密度脂蛋白和心血管风险因素综合评估。' },
  { name: '甘油三酯', aliases: ['TG', 'TRIG'], category: '血脂', meaning: '甘油三酯是身体储存能量的一种脂类，可反映近期饮食和脂代谢状态。', highMeaning: '偏高常与高糖高脂饮食、饮酒、体重增加或代谢异常有关。', lowMeaning: '偏低可能与摄入不足或吸收状态有关，通常需结合整体营养判断。', normalMeaning: '当前结果位于参考范围内，通常提示甘油三酯暂无明显异常。', suggestion: '建议控制精制糖和油脂摄入，必要时复查空腹血脂。' },
  { name: '尿酸', aliases: ['UA', 'URIC'], category: '肾功能/代谢', meaning: '尿酸是嘌呤代谢产物，可用于观察尿酸代谢和痛风相关风险。', highMeaning: '偏高可能与高嘌呤饮食、饮水不足、肾排泄减少或代谢异常有关。', lowMeaning: '偏低较少见，需结合用药、营养和肾脏排泄情况判断。', normalMeaning: '当前结果位于参考范围内，提示尿酸水平相对平稳。', suggestion: '建议注意饮水、控制高嘌呤食物，持续异常时咨询医生。' },
  { name: '肌酐', aliases: ['CREA', 'CRE', 'Scr'], category: '肾功能', meaning: '肌酐常用于评估肾小球滤过功能，是肾功能观察的重要指标。', highMeaning: '偏高可能提示肾功能负担增加，也可能受肌肉量、运动、饮水状态影响。', lowMeaning: '偏低可能与肌肉量较少、营养状态等因素有关。', normalMeaning: '当前结果位于参考范围内，通常提示肌酐暂无明显异常。', suggestion: '建议结合尿素氮、尿常规、估算肾小球滤过率和医生意见判断。' },
  { name: '尿素氮', aliases: ['BUN', 'UREA'], category: '肾功能', meaning: '尿素氮反映蛋白代谢产物排泄情况，可辅助观察肾功能和水分状态。', highMeaning: '偏高可能与饮水不足、高蛋白摄入、肾功能异常等因素有关。', lowMeaning: '偏低可能与蛋白摄入不足或肝脏合成状态有关。', normalMeaning: '当前结果位于参考范围内，提示该项暂无明显异常。', suggestion: '建议结合肌酐、尿常规和饮水状态综合判断。' },
  { name: '白细胞', aliases: ['WBC', '白细胞计数'], category: '血常规', meaning: '白细胞用于反映免疫和炎症相关状态，是血常规的重要项目。', highMeaning: '偏高可能与感染、炎症、应激等情况有关。', lowMeaning: '偏低可能与病毒感染、药物影响或骨髓造血状态有关。', normalMeaning: '当前结果位于参考范围内，通常提示白细胞暂无明显异常。', suggestion: '建议结合症状、分类计数和医生意见综合判断。' },
  { name: '红细胞', aliases: ['RBC', '红细胞计数'], category: '血常规', meaning: '红细胞用于反映携氧细胞数量，可辅助评估贫血或血液浓缩状态。', highMeaning: '偏高可能与脱水、缺氧环境或血液浓缩有关。', lowMeaning: '偏低可能提示贫血风险，需要结合血红蛋白等指标判断。', normalMeaning: '当前结果位于参考范围内，提示红细胞计数较平稳。', suggestion: '建议结合血红蛋白、红细胞压积和临床症状判断。' },
  { name: '血红蛋白', aliases: ['HGB', 'Hb'], category: '血常规', meaning: '血红蛋白反映血液携氧能力，是评估贫血的重要指标。', highMeaning: '偏高可能与血液浓缩、缺氧或个体差异有关。', lowMeaning: '偏低可能提示贫血或失血风险，需要进一步明确原因。', normalMeaning: '当前结果位于参考范围内，通常提示携氧能力暂无明显异常。', suggestion: '建议结合红细胞、铁代谢指标和医生意见综合判断。' },
  { name: '血小板', aliases: ['PLT', '血小板计数'], category: '血常规', meaning: '血小板参与止血和凝血过程，是血常规的重要组成部分。', highMeaning: '偏高可能与炎症、感染、缺铁或骨髓相关因素有关。', lowMeaning: '偏低可能增加出血风险，需要结合症状和复查结果判断。', normalMeaning: '当前结果位于参考范围内，通常提示血小板暂无明显异常。', suggestion: '如有出血点、淤青或持续异常，建议咨询医生。' }
];

const sampleReports = [
  { id: 'r001', patient, reportType: '生化检验', hospital: '市第一人民医院', date: '2026-03-28', items: [
    { name: '空腹血糖', value: 7.4, unit: 'mmol/L', refLow: 3.9, refHigh: 6.1, status: 'high' },
    { name: '低密度胆固醇', value: 3.7, unit: 'mmol/L', refLow: 0, refHigh: 3.4, status: 'high' },
    { name: '尿酸', value: 420, unit: 'μmol/L', refLow: 208, refHigh: 428, status: 'normal' },
    { name: '肌酐', value: 115, unit: 'μmol/L', refLow: 57, refHigh: 111, status: 'high' },
    { name: '总胆固醇', value: 5.2, unit: 'mmol/L', refLow: 0, refHigh: 5.2, status: 'normal' },
    { name: '高密度脂蛋白', value: 1.2, unit: 'mmol/L', refLow: 1.0, refHigh: 1.6, status: 'normal' },
    { name: '甘油三酯', value: 1.6, unit: 'mmol/L', refLow: 0, refHigh: 1.7, status: 'normal' },
    { name: '白细胞计数', value: 6.1, unit: '10^9/L', refLow: 3.5, refHigh: 9.5, status: 'normal' },
    { name: '血红蛋白', value: 142, unit: 'g/L', refLow: 130, refHigh: 175, status: 'normal' },
    { name: '血小板计数', value: 218, unit: '10^9/L', refLow: 125, refHigh: 350, status: 'normal' },
    { name: '谷丙转氨酶', value: 28, unit: 'U/L', refLow: 0, refHigh: 40, status: 'normal' }
  ] },
  { id: 'r002', patient, reportType: '血常规', hospital: '社区卫生服务中心', date: '2026-02-18', items: [
    { name: '空腹血糖', value: 6.2, unit: 'mmol/L', refLow: 3.9, refHigh: 6.1, status: 'high' },
    { name: '白细胞计数', value: 5.8, unit: '10^9/L', refLow: 3.5, refHigh: 9.5, status: 'normal' },
    { name: '血红蛋白', value: 144, unit: 'g/L', refLow: 130, refHigh: 175, status: 'normal' }
  ] },
  { id: 'r003', patient, reportType: '尿常规', hospital: '市第一人民医院', date: '2026-01-12', items: [
    { name: '尿酸', value: 420, unit: 'μmol/L', refLow: 208, refHigh: 428, status: 'normal' },
    { name: '空腹血糖', value: 5.4, unit: 'mmol/L', refLow: 3.9, refHigh: 6.1, status: 'normal' }
  ] },
  { id: 'r004', patient, reportType: '生化检验', hospital: '市第一人民医院', date: '2025-12-05', items: [
    { name: '空腹血糖', value: 4.7, unit: 'mmol/L', refLow: 3.9, refHigh: 6.1, status: 'normal' },
    { name: '低密度胆固醇', value: 3.1, unit: 'mmol/L', refLow: 0, refHigh: 3.4, status: 'normal' }
  ] }
];

// Data access currently uses localStorage. Later this service can swap internals to fetch('/api/reports') without changing page code.
const reportService = {
  listReports() {
    const stored = readJson(REPORTS_KEY, null);
    const sourceReports = Array.isArray(stored) ? stored : sampleReports;
    const normalized = normalizeReports(sourceReports);
    if (!Array.isArray(stored) || JSON.stringify(stored) !== JSON.stringify(normalized)) {
      this.saveAllReports(normalized);
    }
    return normalized;
  },
  getReportById(id) {
    return this.listReports().find(report => report.id === id) || null;
  },
  getLatestReport() {
    return [...this.listReports()].sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  },
  createReport(report) {
    const next = normalizeReport({ ...report, id: report?.id || `r${Date.now()}`, patient: report?.patient || patient });
    this.saveAllReports([next, ...this.listReports()]);
    return next;
  },
  updateReport(id, updatedReport) {
    const reports = this.listReports();
    const next = reports.map(report => report.id === id ? normalizeReport({ ...report, ...updatedReport, id }) : report);
    this.saveAllReports(next);
    return next.find(report => report.id === id) || null;
  },
  deleteReport(id) {
    const next = this.listReports().filter(report => report.id !== id);
    this.saveAllReports(next);
    return next;
  },
  saveAllReports(reports) {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(normalizeReports(reports)));
    return normalizeReports(reports);
  },
  clearReports() {
    localStorage.setItem(REPORTS_KEY, JSON.stringify([]));
    return [];
  },
  restoreSampleReports() {
    return this.saveAllReports(sampleReports);
  },
  exportReports() {
    return this.listReports();
  },
  importReports(reports) {
    if (!Array.isArray(reports)) throw new Error('reports 必须是数组');
    return this.saveAllReports(reports);
  },
  async requestApi(path, options = {}) {
    const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
    return response.status === 204 ? null : response.json();
  },
  async listReportsAsync() {
    if (appConfig.dataMode === 'local') return this.listReports();
    return normalizeReports(await this.requestApi('/api/reports'));
  },
  async getReportByIdAsync(id) {
    if (appConfig.dataMode === 'local') return this.getReportById(id);
    return normalizeReport(await this.requestApi(`/api/reports/${encodeURIComponent(id)}`));
  },
  async createReportAsync(report) {
    const normalized = normalizeReport({ ...report, id: report?.id || `r${Date.now()}` });
    if (appConfig.dataMode === 'local') return this.createReport(normalized);
    return normalizeReport(await this.requestApi('/api/reports', { method: 'POST', body: JSON.stringify(normalized) }));
  },
  async updateReportAsync(id, report) {
    const normalized = normalizeReport({ ...report, id });
    if (appConfig.dataMode === 'local') return this.updateReport(id, normalized);
    return normalizeReport(await this.requestApi(`/api/reports/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(normalized) }));
  },
  async deleteReportAsync(id) {
    if (appConfig.dataMode === 'local') return this.deleteReport(id);
    return this.requestApi(`/api/reports/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async clearReportsAsync() {
    if (appConfig.dataMode === 'local') return this.clearReports();
    return this.requestApi('/api/reports', { method: 'DELETE' });
  },
  async importReportsAsync(reports) {
    if (!Array.isArray(reports)) throw new Error('reports 必须是数组');
    const normalized = normalizeReports(reports);
    if (appConfig.dataMode === 'local') {
      this.importReports(normalized);
      return { imported: normalized.length };
    }
    return this.requestApi('/api/reports/import', { method: 'POST', body: JSON.stringify(normalized) });
  },
  async exportReportsAsync() {
    return this.listReportsAsync();
  }
};
function getStoredSelectedReportId() { try { return localStorage.getItem(SELECTED_REPORT_KEY) || ''; } catch { return ''; } }
function setStoredSelectedReportId(id) { try { localStorage.setItem(SELECTED_REPORT_KEY, id || ''); } catch {} return id || ''; }
function clearStoredSelectedReportId() { return setStoredSelectedReportId(''); }
function getStoredDataMode() {
  try {
    return localStorage.getItem(DATA_MODE_KEY) === 'api' ? 'api' : 'local';
  } catch {
    return 'local';
  }
}
function setDataMode(mode) {
  appConfig.dataMode = mode === 'api' ? 'api' : 'local';
  try { localStorage.setItem(DATA_MODE_KEY, appConfig.dataMode); } catch {}
  appState.reportsLoaded = false;
  appState.error = null;
  return appConfig.dataMode;
}
async function loadReportsToState() {
  appState.loading = true;
  appState.error = null;
  try {
    appState.reports = appConfig.dataMode === 'api'
      ? normalizeReports(await reportService.listReportsAsync())
      : reportService.listReports();
    appState.reportsLoaded = true;
    return appState.reports;
  } catch (error) {
    appState.error = error;
    appState.reports = [];
    appState.reportsLoaded = false;
    return [];
  } finally {
    appState.loading = false;
  }
}
async function refreshReportsAndRender(targetScreen = getActiveScreenId()) {
  await loadReportsToState();
  render(targetScreen);
}
function getActiveScreenId() {
  return screens.find(screen => screen.classList.contains('active'))?.id || 'overview';
}
function getReports() {
  if (appConfig.dataMode === 'api') return normalizeReports(appState.reports || []);
  return reportService.listReports();
}
function saveReports(reports) {
  if (appConfig.dataMode === 'api') {
    return reportService.importReportsAsync(reports).then(async result => {
      await loadReportsToState();
      return result;
    });
  }
  return reportService.saveAllReports(reports);
}
function addReport(report) {
  if (appConfig.dataMode === 'api') {
    return reportService.createReportAsync(report).then(async saved => {
      await loadReportsToState();
      return saved;
    });
  }
  return reportService.createReport(report);
}
function normalizeReport(report) {
  const normalizedReport = {
    id: report?.id || `r${Date.now()}`,
    patient: report?.patient || patient,
    reportType: report?.reportType || '检验报告',
    hospital: report?.hospital || '',
    date: report?.date || new Date().toISOString().slice(0, 10),
    items: Array.isArray(report?.items) ? report.items.map(normalizeLabItem) : []
  };
  normalizedReport.patient = {
    name: normalizedReport.patient.name || patient.name,
    age: Number(normalizedReport.patient.age ?? patient.age),
    patientId: normalizedReport.patient.patientId || patient.patientId
  };
  return normalizedReport;
}
function normalizeReports(reports) { return (Array.isArray(reports) ? reports : []).map(normalizeReport); }
function normalizeLabItem(item) {
  const canonicalName = normalizeLabItemName(item?.name || item?.itemName || '');
  const defaults = getDefaultReferenceRange(canonicalName || item?.name);
  const parsedRange = parseReferenceRange(item?.range || item?.refText || item?.referenceRange || item?.reference_range || '');
  const rawRefLow = Number(item?.refLow ?? parsedRange?.refLow ?? defaults?.refLow);
  const rawRefHigh = Number(item?.refHigh ?? parsedRange?.refHigh ?? defaults?.refHigh);
  const refLow = Number.isFinite(rawRefLow) ? rawRefLow : 0;
  const refHigh = Number.isFinite(rawRefHigh) ? rawRefHigh : 0;
  const unit = item?.unit || defaults?.unit || '';
  const value = Number(item?.value ?? item?.result ?? 0);
  const refText = item?.refText || parsedRange?.refText || defaults?.refText || (Number.isFinite(refLow) && Number.isFinite(refHigh) ? `${refLow}–${refHigh}` : '');
  return {
    name: canonicalName || item?.name || '',
    value,
    unit,
    refLow,
    refHigh,
    refText,
    refSource: item?.refSource || (defaults ? 'dictionary' : 'manual'),
    status: item?.status && Number.isFinite(refLow) && Number.isFinite(refHigh) ? calculateItemStatus(value, refLow, refHigh) : (item?.status || calculateItemStatus(value, refLow, refHigh))
  };
}
function parseReferenceRange(rangeText) {
  const match = String(rangeText || '').replace(/[—－~～至]/g, '-').match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { refLow: Number(match[1]), refHigh: Number(match[2]), refText: `${match[1]}–${match[2]}` };
}
function normalizeLabItemName(itemName) {
  const normalized = String(itemName || '').trim().toLowerCase();
  if (!normalized) return '';
  const found = labReferenceDictionary.find(entry => {
    const names = [entry.name, ...(entry.aliases || [])].map(name => String(name).trim().toLowerCase());
    return names.includes(normalized) || names.some(name => normalized.includes(name) || name.includes(normalized));
  });
  return found ? found.name : String(itemName || '').trim();
}
function getDefaultReferenceRange(itemName) {
  const normalizedName = normalizeLabItemName(itemName);
  const found = labReferenceDictionary.find(entry => entry.name === normalizedName);
  return found ? { unit: found.unit, refLow: found.refLow, refHigh: found.refHigh, refText: found.refText, refSource: 'dictionary' } : null;
}
function calculateItemStatus(value, refLow, refHigh) {
  const v = Number(value);
  const low = Number(refLow);
  const high = Number(refHigh);
  if (Number.isFinite(low) && v < low) return 'low';
  if (Number.isFinite(high) && v > high) return 'high';
  return 'normal';
}
function getLatestReport() { return [...getReports()].sort((a,b) => b.date.localeCompare(a.date))[0] || null; }
function getAbnormalItems(report) { return (report?.items || []).filter(item => item.status !== 'normal'); }
function getOverviewStats() { const report = getLatestReport(); const total = report?.items?.length || 0; const abnormal = getAbnormalItems(report).length; return { report, total, normal: total - abnormal, abnormal }; }
function getTrendData(itemName) { return getReports().flatMap(r => r.items.filter(i => i.name === itemName).map(i => ({...i, date: r.date, reportId: r.id}))).sort((a,b) => a.date.localeCompare(b.date)); }
function generateAiInterpretation(report) {
  const normalizedReport = normalizeReport(report);
  const total = normalizedReport.items.length;
  const abnormal = getAbnormalItems(normalizedReport);
  const normal = total - abnormal.length;
  return {
    summary: `本次${normalizedReport.reportType}共有 ${total} 个检验项目，其中 ${normal} 项正常，${abnormal.length} 项异常。${abnormal.length ? '异常项目建议结合既往病史、复查结果和医生意见重点关注。' : '未发现明显异常指标，建议继续保持规律复查。'}`,
    abnormalItems: abnormal.map(item => {
      const info = explainLabItem(item);
      return {
        name: item.name,
        valueText: formatValue(item),
        referenceText: formatRange(item),
        statusText: statusText(item.status),
        category: info.category,
        explanation: info.currentExplanation,
        suggestion: info.suggestion
      };
    }),
    normalNote: abnormal.length ? '' : '未发现明显异常指标。当前结果仅代表本次报告数据，仍建议结合个人症状、既往病史和医生意见综合判断。',
    recommendations: abnormal.length ? [
      '建议结合既往病史和复查结果综合判断。',
      '如指标持续异常或伴随不适，请咨询医生。',
      '保持规律作息、清淡饮食和适量运动，避免自行用药。'
    ] : [
      '建议继续保持规律体检和健康生活方式。',
      '如后续出现不适或指标变化，请及时复查。',
      '参考范围以原报告为准，系统解读仅用于辅助理解。'
    ],
    disclaimer: '内容仅供参考，不能替代医生诊断。'
  };
}
function aiInterpretationToText(interpretation) {
  if (typeof interpretation === 'string') return interpretation;
  const abnormalText = interpretation.abnormalItems?.length
    ? interpretation.abnormalItems.map(item => `${item.name}${item.statusText}：${item.explanation}`).join('；')
    : interpretation.normalNote;
  return `${interpretation.summary}${abnormalText ? ` ${abnormalText}` : ''} ${interpretation.recommendations.join(' ')} ${interpretation.disclaimer}`;
}
function generateAiInterpretationText(report) {
  return aiInterpretationToText(generateAiInterpretation(report));
}
function generateMockChatReply(question, report) {
  const q = String(question || '');
  const normalizedReport = report ? normalizeReport(report) : getLatestReport();
  if (!normalizedReport) return withDisclaimer('暂无报告数据，请先上传或录入一份检验报告。');
  if (isMedicalAdviceQuestion(q)) return withDisclaimer('关于用药、诊断或治疗方案，需要由医生结合症状、病史、体检和复查结果判断。我可以帮助你理解报告指标，但不能给出确定诊断或开药建议。');
  if (isReportSummaryQuestion(q)) return buildReportSummaryReply(normalizedReport);
  const matched = findMatchedLabItem(q, normalizedReport);
  if (matched?.item) return buildItemExplanationReply(matched.item, q);
  if (matched?.knownName) return withDisclaimer(`当前报告中没有找到“${matched.knownName}”这个项目。你可以上传包含该项目的报告后再询问，或查看报告原文确认是否使用了其他名称。`);
  const bad = getAbnormalItems(normalizedReport);
  if (bad.length) return withDisclaimer(`本次报告中有 ${bad.length} 项异常：${bad.map(item => `${item.name}${statusText(item.status)}（${formatValue(item)}）`).join('、')}。你可以继续问：${bad[0].name}是什么意思？或者${bad[0].name}${statusText(bad[0].status)}怎么办？`);
  return withDisclaimer('本次报告未发现明显异常指标。你可以询问某个具体指标的含义，例如：空腹血糖是什么意思？白细胞正常代表什么？');
}
function getCurrentChatReport() {
  const reports = getReports();
  return reports.find(report => report.id === selectedAiReportId) || reports.find(report => report.id === selectedReportId) || getLatestReport();
}
function normalizeChatMessage(message) {
  return {
    role: message.role === 'assistant' || message.role === 'ai' ? 'assistant' : 'user',
    content: message.content ?? message.text ?? '',
    time: message.time || formatDateTime(new Date())
  };
}
const chatService = {
  listMessages() {
    return readJson(CHAT_KEY, []).map(normalizeChatMessage).filter(message => message.content);
  },
  saveMessages(messages) {
    const normalized = (Array.isArray(messages) ? messages : []).map(normalizeChatMessage).filter(message => message.content);
    localStorage.setItem(CHAT_KEY, JSON.stringify(normalized));
    return normalized;
  },
  addMessage(role, content) {
    return this.saveMessages([...this.listMessages(), { role, content, time: formatDateTime(new Date()) }]);
  },
  clearMessages() {
    localStorage.setItem(CHAT_KEY, JSON.stringify([]));
    return [];
  }
};
function getChatHistory() { return chatService.listMessages(); }
function saveChatHistory(messages) { return chatService.saveMessages(messages); }
function clearChatHistory() { return chatService.clearMessages(); }
function addChatMessage(role, content) { return chatService.addMessage(role, content); }
async function callAiChatApi(question, report, chatHistory) {
  return null;
}
function findMatchedLabItem(question, report) {
  const q = String(question || '').trim().toLowerCase();
  const items = normalizeReport(report).items;
  const dictionaryMatch = labReferenceDictionary.find(entry => [entry.name, ...(entry.aliases || [])].some(name => q.includes(String(name).toLowerCase())));
  const candidates = items.map(item => {
    const canonical = normalizeLabItemName(item.name);
    const dict = labReferenceDictionary.find(entry => entry.name === canonical);
    return { item, names: [item.name, canonical, ...(dict?.aliases || [])].map(name => String(name).toLowerCase()).filter(Boolean) };
  });
  const exact = candidates.find(candidate => candidate.names.some(name => q.includes(name)));
  if (exact) return { item: exact.item };
  const partial = candidates.find(candidate => candidate.names.some(name => name.length >= 2 && (q.includes(name.slice(0, 2)) || name.includes(q))));
  if (partial && q.length >= 2) return { item: partial.item };
  return dictionaryMatch ? { knownName: dictionaryMatch.name } : null;
}
function buildReportSummaryReply(report) {
  const normalizedReport = normalizeReport(report);
  const total = normalizedReport.items.length;
  const bad = getAbnormalItems(normalizedReport);
  const normal = total - bad.length;
  const detail = bad.length ? `异常项目包括：${bad.map(item => `${item.name} ${formatValue(item)}，${statusText(item.status)}`).join('；')}。` : '本次报告未发现明显异常指标。';
  return withDisclaimer(`这份${normalizedReport.reportType}共有 ${total} 个项目，其中 ${normal} 项正常，${bad.length} 项异常。${detail}建议结合症状、既往病史和复查结果综合判断。`);
}
function buildItemExplanationReply(item, question = '') {
  const info = explainLabItem(item);
  const seriousNote = /严重|危险|要紧|严重吗/.test(question) ? '关于严重程度，不能只凭单个数值直接判断，需要结合症状、既往病史、复查结果和医生判断。' : '';
  return withDisclaimer(`${item.name}当前值为 ${formatValue(item)}，参考范围为 ${formatRange(item)}，当前状态为${statusText(item.status)}。指标类别：${info.category}。${info.currentExplanation}${seriousNote ? ` ${seriousNote}` : ''} 建议：${info.suggestion}`);
}
function isReportSummaryQuestion(question) { return /报告.*(怎么样|如何|问题|异常)|有没有问题|哪些异常|异常项目|有什么异常|需要复查/.test(question); }
function isMedicalAdviceQuestion(question) { return /吃药|用药|开药|药物|诊断|治疗|治愈|处方|手术/.test(question); }
function withDisclaimer(text) { return `${text} 内容仅供参考，不能替代医生诊断。`; }
function formatDateTime(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function showScreen(rawId) {
  const id = rawId === 'upload' ? 'upload' : rawId;
  screens.forEach(s => { s.classList.toggle('active', s.id === id); if (s.id === id) s.scrollTop = 0; });
  navButtons.forEach(btn => {
    const target = btn.dataset.go;
    const active = target === id || (target === 'reports' && ['upload','report-detail'].includes(id)) || (target === 'ai-insights' && id === 'ai-insights');
    btn.classList.toggle('active', active);
  });
  if (appConfig.dataMode === 'api' && !appState.reportsLoaded && !['upload'].includes(id)) {
    renderAppStatus(id, 'loading');
    await loadReportsToState();
  }
  render(id);
}

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-go]');
  if (!trigger) return;
  if (trigger.dataset.reportId) {
    selectedReportId = trigger.dataset.reportId;
    setStoredSelectedReportId(selectedReportId);
  }
  if (trigger.dataset.itemName) selectedTrendItem = trigger.dataset.itemName;
  if (trigger.dataset.go === 'ai-insights') {
    aiMode = 'insights';
    selectedAiReportId = trigger.dataset.reportId || '';
    expandedAiReportId = trigger.dataset.reportId || '';
  }
  showScreen(trigger.dataset.go);
});

function topBar(title, back = '', right = '') {
  return `<header class="app-top"><button class="icon-btn" ${back ? `data-go="${back}"` : ''}>${back ? '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>' : ''}</button><h1>${title}</h1><button class="icon-btn">${right}</button></header>`;
}
function renderEmptyState(message, actionText = '', actionTarget = '') {
  return `<article class="card empty-state"><p>${esc(message)}</p>${actionText ? `<button class="primary-btn" data-go="${esc(actionTarget)}">${esc(actionText)}</button>` : ''}</article>`;
}
function render(id) {
  if (appConfig.dataMode === 'api' && appState.error && !['upload', 'profile'].includes(id)) {
    renderAppStatus(id, 'error');
    return;
  }
  if (id === 'overview') renderOverview();
  if (id === 'upload') renderUpload();
  if (id === 'reports') renderReports();
  if (id === 'report-detail') renderDetail();
  if (id === 'trends') renderTrends();
  if (id === 'ai-insights') renderAi();
  if (id === 'profile') renderProfile();
}
function renderAppStatus(id, type) {
  const root = document.querySelector(`#${id}`);
  if (!root) return;
  const loading = type === 'loading';
  const message = loading ? '正在从后端加载报告数据…' : '后端连接失败，请确认 FastAPI 服务已启动。';
  root.innerHTML = `${topBar(root.dataset.title || '加载数据', 'overview')}<article class="card app-state-card ${type}"><strong>${esc(message)}</strong>${appState.error ? `<p>${esc(appState.error.message)}</p>` : ''}<button class="outline-btn" data-go="profile">前往数据模式设置</button></article>`;
}
function renderOverview() {
  const root = document.querySelector('#overview');
  const { report, total, normal, abnormal } = getOverviewStats();
  const trend = getTrendData('空腹血糖');
  const latest = trend.at(-1);
  const bad = getAbnormalItems(report).slice(0, 3);
  root.innerHTML = `${topBar('检验概览', '', '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>')}
    <section class="daily-hero">
      <div><p>Good Evening</p><h2>今天身体状态如何？</h2></div>
      <button class="hero-filter" data-go="upload"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
    </section>
    <article class="card patient-card rich-card"><div class="avatar">👨🏻‍🦳</div><div><div class="patient-name">${patient.name}<span class="age-pill">${patient.age}岁</span></div><div class="patient-id">ID: ${patient.patientId}</div></div><div class="score-ring"><span>健康评分<br>82分</span></div></article>
    <div class="stats"><article class="card stat-card"><strong>${total}</strong><span>总项目</span></article><article class="card stat-card"><strong>${normal}</strong><span>正常</span></article><article class="card stat-card"><strong class="red">${abnormal}</strong><span>异常</span></article></div>
    <article class="card section-card trend-summary-card"><div class="section-head"><h2>趋势摘要</h2><button data-go="trends" data-item-name="空腹血糖">全部指标 ></button></div><div class="trend-summary-top"><div><div class="metric-label">空腹血糖 (mmol/L)</div><div class="metric-value"><strong>${latest?.value ?? '-'}</strong><span class="badge ${latest?.status || 'normal'}">${statusText(latest?.status || 'normal')}</span></div></div><div class="range-pill">参考 ${latest ? `${latest.refLow}-${latest.refHigh}` : '3.9-6.1'}</div></div>${renderOverviewChart(trend)}</article>
    ${report ? `<article class="card section-card"><div class="section-head"><h2>近期异常指标</h2><button data-go="reports">查看全部 ></button></div><div class="abnormal-list">${bad.length ? bad.map(i => `<button class="abnormal-row" data-go="trends" data-item-name="${esc(i.name)}"><strong>${esc(i.name)}</strong><span>${formatValue(i)}</span><small class="badge ${i.status}">${statusText(i.status)}</small></button>`).join('') : '<div class="empty-state compact">当前最新报告未发现明显异常指标。</div>'}</div><button class="primary-btn" style="margin-top:16px" data-go="upload">＋ 上传新报告</button></article>` : renderEmptyState('暂无报告数据，请先上传或录入一份检验报告。', '上传新报告', 'upload')}`;
}
function renderUpload() {
  const root = document.querySelector('#upload');
  const today = new Date().toISOString().slice(0, 10);
  root.innerHTML = `${topBar('上传报告', 'reports')}
    <article class="card upload-hero pdf-upload-card"><div><div class="cloud"><svg viewBox="0 0 24 24"><path d="M12 19V9M8 13l4-4 4 4M20 17.5A4.5 4.5 0 0 0 15.5 13h-.7A6 6 0 1 0 5 17.5"/></svg></div><h2>上传报告文件</h2><p>支持文本型 PDF；扫描件和图片型 PDF 暂不支持</p><button class="primary-btn" id="choose-file" type="button" style="width:118px;min-height:38px">选择 PDF</button><input id="pdf-file-input" type="file" accept="application/pdf,.pdf" hidden><p style="margin-top:14px">PDF 仅在浏览器本地解析，不上传服务器。OCR 解析将在后续版本加入。</p></div></article>
    <article class="card paste-parse-card"><h2>粘贴报告文本解析</h2><p>可把文本型 PDF 中复制出的报告内容粘贴到这里，使用同一套解析规则生成预览。</p><textarea id="paste-report-text" rows="7" placeholder="例如：GLU 7.4 mmol/L 3.9-6.1"></textarea><button class="outline-btn" id="parse-pasted-text" type="button">解析粘贴文本</button><div class="form-message" id="paste-parse-message" aria-live="polite"></div></article>
    <section id="pdf-preview-root"></section>
    <form id="report-form" novalidate><article class="card form-card"><h2>报告基本信息</h2><div class="field-row"><label>报告类型</label><span class="input-wrap"><select name="reportType"><option>生化检验</option><option>血常规</option><option>尿常规</option></select></span></div><div class="field-row"><label>医院名称</label><span class="input-wrap"><input name="hospital" value="市第一人民医院"></span></div><div class="field-row"><label>报告日期</label><span class="input-wrap"><input name="date" type="date" value="${today}"></span></div></article>
    <article class="card form-card"><div class="section-head"><h2>检验项目</h2><button id="add-item" type="button">添加项目 ></button></div><p class="reference-note upload-note">参考范围以原报告为准，系统默认值仅用于辅助录入。</p><table class="item-table upload-item-table"><thead><tr><th>项目名称</th><th>数值</th><th>单位</th><th>参考下限</th><th>参考上限</th><th>来源</th><th>操作</th></tr></thead><tbody id="item-body"></tbody></table><button class="outline-btn" id="add-item-wide" type="button" style="width:100%;margin-top:12px">＋ 添加检验项目</button><div class="form-message" id="upload-message" aria-live="polite"></div></article><button class="primary-btn" type="submit" style="margin-top:14px">保存报告</button></form>`;
  const body = root.querySelector('#item-body');
  body.append(createEmptyLabItemForm());
  bindUploadEvents(root);
}
function createEmptyLabItemForm(item = {}) {
  const defaults = getDefaultReferenceRange(item.name);
  const refLow = item.refLow ?? defaults?.refLow ?? '';
  const refHigh = item.refHigh ?? defaults?.refHigh ?? '';
  const refSource = item.refSource || (defaults ? 'dictionary' : 'unknown');
  const tr = document.createElement('tr');
  tr.className = 'upload-item-row';
  tr.dataset.refSource = refSource;
  tr.innerHTML = `<td><input name="itemName" value="${esc(item.name || '')}" placeholder="项目/缩写"></td><td><input name="itemValue" value="${esc(item.value ?? '')}" type="number" step="0.01" placeholder="数值"></td><td><input name="itemUnit" value="${esc(item.unit || defaults?.unit || '')}" placeholder="单位"></td><td><input name="itemRefLow" value="${esc(refLow)}" type="number" step="0.01" placeholder="下限"></td><td><input name="itemRefHigh" value="${esc(refHigh)}" type="number" step="0.01" placeholder="上限"></td><td><span class="ref-source-badge ${refSource}">${refSourceText(refSource)}</span></td><td><button class="trash" type="button" data-upload-action="delete-item">⌫</button></td>`;
  return tr;
}
function bindUploadEvents(root) {
  const body = root.querySelector('#item-body');
  const message = root.querySelector('#upload-message');
  const addRow = () => body.append(createEmptyLabItemForm());
  root.querySelector('#choose-file').onclick = () => root.querySelector('#pdf-file-input').click();
  root.querySelector('#pdf-file-input').onchange = event => {
    const file = event.target.files?.[0];
    if (file) handlePdfUpload(file, root);
    event.target.value = '';
  };
  root.querySelector('#parse-pasted-text').onclick = () => handlePastedTextParse(root);
  root.querySelector('#add-item').onclick = addRow;
  root.querySelector('#add-item-wide').onclick = addRow;
  body.addEventListener('input', (event) => {
    const input = event.target;
    const row = input.closest('tr');
    if (!row) return;
    if (input.name === 'itemName') applyReferenceDefaults(row, false);
    if (['itemUnit', 'itemRefLow', 'itemRefHigh'].includes(input.name)) setRowRefSource(row, 'manual');
  });
  body.addEventListener('blur', (event) => {
    const input = event.target;
    if (input.name === 'itemName') applyReferenceDefaults(input.closest('tr'), true);
  }, true);
  body.addEventListener('click', (event) => {
    if (!event.target.matches('[data-upload-action="delete-item"]')) return;
    const rows = body.querySelectorAll('tr');
    if (rows.length > 1) event.target.closest('tr').remove();
    else body.replaceChildren(createEmptyLabItemForm());
  });
  root.querySelector('#report-form').onsubmit = async (event) => {
    event.preventDefault();
    const result = collectUploadFormData(root);
    if (result.errors.length) {
      showUploadMessage(message, result.errors[0], 'error');
      return;
    }
    try {
      const saved = await saveUploadedReport(result.report);
      selectedReportId = saved.id;
      setStoredSelectedReportId(selectedReportId);
      selectedTrendItem = saved.items[0]?.name || selectedTrendItem;
      showUploadMessage(message, '报告保存成功', 'success');
      setTimeout(() => showScreen('overview'), 600);
    } catch (error) {
      showUploadMessage(message, `保存失败：${error.message}`, 'error');
    }
  };
}
function applyReferenceDefaults(row, shouldNormalize) {
  if (!row) return;
  const nameInput = row.querySelector('[name="itemName"]');
  const unitInput = row.querySelector('[name="itemUnit"]');
  const lowInput = row.querySelector('[name="itemRefLow"]');
  const highInput = row.querySelector('[name="itemRefHigh"]');
  const defaults = getDefaultReferenceRange(nameInput.value);
  if (!defaults) {
    setRowRefSource(row, 'unknown');
    return;
  }
  if (shouldNormalize) nameInput.value = normalizeLabItemName(nameInput.value);
  unitInput.value = defaults.unit;
  lowInput.value = defaults.refLow;
  highInput.value = defaults.refHigh;
  setRowRefSource(row, 'dictionary');
}
function setRowRefSource(row, source) {
  row.dataset.refSource = source;
  const badge = row.querySelector('.ref-source-badge');
  if (!badge) return;
  badge.className = `ref-source-badge ${source}`;
  badge.textContent = refSourceText(source);
}
function refSourceText(source) {
  if (source === 'dictionary') return '系统默认';
  if (source === 'manual') return '手动修改';
  if (source === 'report') return '报告原文';
  return '未知';
}
function collectUploadFormData(root = document.querySelector('#upload')) {
  const form = root.querySelector('#report-form');
  const rows = Array.from(root.querySelectorAll('#item-body tr'));
  const errors = [];
  const items = rows.map((row, index) => {
    const nameRaw = row.querySelector('[name="itemName"]').value.trim();
    const valueRaw = row.querySelector('[name="itemValue"]').value.trim();
    const unit = row.querySelector('[name="itemUnit"]').value.trim();
    const lowRaw = row.querySelector('[name="itemRefLow"]').value.trim();
    const highRaw = row.querySelector('[name="itemRefHigh"]').value.trim();
    const hasAny = [nameRaw, valueRaw, unit, lowRaw, highRaw].some(Boolean);
    if (!hasAny) return null;
    if (![nameRaw, valueRaw, unit, lowRaw, highRaw].every(Boolean)) {
      errors.push(`第 ${index + 1} 个检验项目未填写完整`);
      return null;
    }
    const value = Number(valueRaw);
    const refLow = Number(lowRaw);
    const refHigh = Number(highRaw);
    if (![value, refLow, refHigh].every(Number.isFinite)) {
      errors.push(`第 ${index + 1} 个检验项目的数值或参考范围格式不正确`);
      return null;
    }
    const source = row.dataset.refSource === 'dictionary' ? 'dictionary' : 'manual';
    return { name: normalizeLabItemName(nameRaw), value, unit, refLow, refHigh, refText: `${refLow}–${refHigh}`, refSource: source, status: calculateItemStatus(value, refLow, refHigh) };
  }).filter(Boolean);
  const report = { id: `r${Date.now()}`, patient, reportType: form.reportType.value.trim(), hospital: form.hospital.value.trim(), date: form.date.value, items };
  errors.push(...validateUploadForm(report));
  return { report, errors };
}
function validateUploadForm(report) {
  const errors = [];
  if (!report.reportType) errors.push('请填写报告类型');
  if (!report.hospital) errors.push('请填写医院名称');
  if (!report.date) errors.push('请选择报告日期');
  if (!report.items.length) errors.push('请至少填写一个完整检验项目');
  report.items.forEach((item, index) => {
    if (!item.name || !item.unit || !Number.isFinite(item.value) || !Number.isFinite(item.refLow) || !Number.isFinite(item.refHigh)) errors.push(`第 ${index + 1} 个检验项目未填写完整`);
    if (Number.isFinite(item.refLow) && Number.isFinite(item.refHigh) && item.refLow > item.refHigh) errors.push(`第 ${index + 1} 个检验项目参考下限不能大于上限`);
  });
  return errors;
}
async function saveUploadedReport(report) {
  const saved = appConfig.dataMode === 'api'
    ? await reportService.createReportAsync(report)
    : reportService.createReport(report);
  if (appConfig.dataMode === 'api') await loadReportsToState();
  return saved;
}
function showUploadMessage(target, text, type = 'info') {
  target.textContent = text;
  target.className = `form-message ${type}`;
}
async function handlePdfUpload(file, root = document.querySelector('#upload')) {
  const previewRoot = root.querySelector('#pdf-preview-root');
  try {
    if (!isPdfFile(file)) {
      renderPdfError(previewRoot, '请上传 PDF 文件。');
      return;
    }
    if (file.size > 10 * 1024 * 1024 && !confirm('文件较大，浏览器解析可能较慢。是否继续？')) return;
    renderPdfStatus(previewRoot, '正在读取 PDF');
    const extracted = await extractTextFromPdfFile(file, status => renderPdfStatus(previewRoot, status));
    if (!extracted.ok) {
      renderPdfError(previewRoot, extracted.message || 'PDF 解析失败，请尝试手动录入。');
      return;
    }
    renderPdfStatus(previewRoot, '正在解析检验项目');
    const parsed = parsePdfReportText(extracted.text);
    parsed.source = extracted;
    parsed.confidence = calculatePdfParseConfidence(parsed);
    if (!parsed.items.length) {
      renderPdfError(previewRoot, '未能自动识别检验项目，请手动录入。');
      return;
    }
    renderPdfPreview(previewRoot, parsed);
  } catch (error) {
    console.error('PDF 解析异常', error);
    renderPdfError(previewRoot, 'PDF 解析失败，请尝试手动录入。');
  }
}
function handlePastedTextParse(root = document.querySelector('#upload')) {
  const previewRoot = root.querySelector('#pdf-preview-root');
  const message = root.querySelector('#paste-parse-message');
  const text = root.querySelector('#paste-report-text')?.value || '';
  if (!text.trim()) {
    showUploadMessage(message, '请先粘贴报告文本。', 'error');
    return;
  }
  const parsed = parsePdfReportText(text);
  parsed.source = {
    ok: true,
    type: 'paste',
    text: parsed.rawText,
    pages: [],
    pageCount: 0
  };
  parsed.confidence = calculatePdfParseConfidence(parsed);
  if (!parsed.items.length) {
    renderPdfError(previewRoot, '未能自动识别检验项目，请手动录入。');
    showUploadMessage(message, '未能识别检验项目，请检查文本格式或改为手动录入。', 'error');
    return;
  }
  showUploadMessage(message, `已解析 ${parsed.items.length} 个检验项目，请在预览区核对。`, 'success');
  renderPdfPreview(previewRoot, parsed);
}
function isPdfFile(file) {
  return file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '');
}
async function loadPdfJsIfNeeded() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js';
    return window.pdfjsLib;
  }
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/vendor/pdfjs/pdf.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
  if (!window.pdfjsLib) throw new Error('PDF.js 加载失败');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js';
  return window.pdfjsLib;
}
async function extractTextFromPdfFile(file, onStatus = () => {}) {
  if (!isPdfFile(file)) return { ok: false, reason: 'not_pdf', message: '请上传 PDF 文件。' };
  onStatus('正在提取文本');
  const pdfjsLib = await loadPdfJsIfNeeded();
  const data = await file.arrayBuffer();
  const pdfDocumentOptions = {
    cMapUrl: '/vendor/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/vendor/pdfjs/standard_fonts/'
  };
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ ...pdfDocumentOptions, data: data.slice(0) }).promise;
  } catch (error) {
    console.warn('PDF.js worker 解析失败，切换到本地无 worker 模式。', error);
    try {
      pdf = await pdfjsLib.getDocument({ ...pdfDocumentOptions, data: data.slice(0), disableWorker: true }).promise;
    } catch (fallbackError) {
      console.warn('PDF 字体映射资源加载失败，继续尝试提取已有文本。', fallbackError);
      onStatus('PDF 字体映射资源加载失败，正在尝试提取已有文本');
      pdf = await pdfjsLib.getDocument({ data: data.slice(0), disableWorker: true }).promise;
    }
  }
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = groupTextItemsIntoLines(textContent.items);
    pages.push({ pageNumber, text });
  }
  const text = normalizePdfText(pages.map(page => page.text).join('\n'));
  if (!text.trim()) {
    return { ok: false, reason: 'no_text', message: '当前 PDF 可能是扫描件或图片型 PDF，纯文本解析无法识别。请使用手动录入，或后续接入 OCR。' };
  }
  return { ok: true, text, pages, pageCount: pdf.numPages };
}
function groupTextItemsIntoLines(textItems = []) {
  const rows = [];
  textItems.forEach(item => {
    const text = String(item.str || '').trim();
    if (!text) return;
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    let row = rows.find(line => Math.abs(line.y - y) <= 4);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, text });
  });
  return rows
    .sort((a, b) => b.y - a.y)
    .map(row => row.parts.sort((a, b) => a.x - b.x).map(part => part.text).join(' '))
    .join('\n');
}
function normalizePdfText(rawText) {
  return String(rawText || '').replace(/\u00a0/g, ' ').split(/\n+/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}
function parsePdfReportText(text) {
  const normalizedText = normalizePdfText(text);
  const meta = parseReportMetaFromText(normalizedText);
  const parsedItems = parseLabItemsFromText(normalizedText);
  return { ...meta, items: parsedItems.items, unmatchedLines: parsedItems.unmatchedLines, rawText: normalizedText };
}
function parseReportMetaFromText(text) {
  const lines = normalizePdfText(text).split('\n');
  const today = new Date().toISOString().slice(0, 10);
  const hospital = lines.find(line => /医院|体检中心|医学检验|检验中心/.test(line)) || '未知机构';
  const joined = lines.join(' ');
  const reportType = /生化/.test(joined) ? '生化检验' : /血常规/.test(joined) ? '血常规' : /尿常规/.test(joined) ? '尿常规' : /检验报告/.test(joined) ? '检验报告' : '检验报告';
  const dateMatch = joined.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/);
  const date = dateMatch ? `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}` : today;
  const nameMatch = joined.match(/姓名[:：\s]+([\u4e00-\u9fa5A-Za-z]{1,12})/);
  const ageMatch = joined.match(/年龄[:：\s]+(\d{1,3})/);
  const idMatch = joined.match(/(?:患者\s*ID|ID|病历号|门诊号|体检号)[:：\s]+([A-Za-z0-9\-_/]+)/i);
  return {
    hospital,
    reportType,
    date,
    patient: {
      name: nameMatch?.[1] || patient.name,
      age: Number(ageMatch?.[1] || patient.age),
      patientId: idMatch?.[1] || patient.patientId
    }
  };
}
function parseLabItemsFromText(text) {
  const unmatchedLines = [];
  const items = [];
  normalizePdfText(text).split('\n').forEach(line => {
    if (/姓名|年龄|日期|报告|医院|病历|门诊|体检|患者\s*ID|\bID\b/i.test(line)) return;
    const item = parseLabLine(line);
    if (item) items.push(item);
    else if (/\d/.test(line)) unmatchedLines.push(line);
  });
  return { items, unmatchedLines };
}
function parseLabLine(line) {
  const sourceLine = String(line || '').trim();
  if (!sourceLine || !/\d/.test(sourceLine)) return null;
  const range = parsePdfReferenceRange(sourceLine);
  const beforeRange = range?.raw ? sourceLine.replace(range.raw, ' ') : sourceLine;
  const valueMatch = beforeRange
    .replace(/[：:|,，;；（）()]/g, ' ')
    .match(/^\s*(.{1,36}?)\s+(-?\d+(?:\.\d+)?)\s*(?:H|L|↑|↓|偏高|偏低|HIGH|LOW)?\s*([A-Za-zμµ%/\\^0-9.\-×x*]+)?(?:\s|$)/i);
  if (!valueMatch) return null;
  const rawName = valueMatch[1].replace(/[|:：,，;；（）()]/g, ' ').trim().split(/\s+/).filter(Boolean).join(' ');
  const value = Number(valueMatch[2]);
  if (!rawName || !Number.isFinite(value)) return null;
  const normalizedName = normalizeLabItemName(rawName);
  const defaults = getDefaultReferenceRange(normalizedName);
  if (!defaults && rawName.length > 16 && !labReferenceDictionary.some(entry => [entry.name, ...entry.aliases].some(alias => sourceLine.toLowerCase().includes(String(alias).toLowerCase())))) return null;
  const unit = normalizeParsedUnit(valueMatch[3] || defaults?.unit || '');
  const refLow = range?.refLow ?? defaults?.refLow ?? 0;
  const refHigh = range?.refHigh ?? defaults?.refHigh ?? 0;
  const refText = range?.refText || defaults?.refText || `${refLow}–${refHigh}`;
  const refSource = range ? 'report' : defaults ? 'dictionary' : 'unknown';
  return { name: normalizedName, value, unit, refLow, refHigh, refText, refSource, status: calculateItemStatus(value, refLow, refHigh) };
}
function normalizeParsedUnit(unit) {
  return String(unit || '').trim().replace(/^x/i, 'x').replace('umol/L', 'μmol/L').replace('µmol/L', 'μmol/L');
}
function parsePdfReferenceRange(line) {
  const twoSide = line.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|~|～|至)\s*(-?\d+(?:\.\d+)?)/);
  if (twoSide) return { raw: twoSide[0], refLow: Number(twoSide[1]), refHigh: Number(twoSide[2]), refText: `${twoSide[1]}–${twoSide[2]}` };
  const upper = line.match(/(?:<|≤|<=)\s*(-?\d+(?:\.\d+)?)/);
  if (upper) return { raw: upper[0], refLow: 0, refHigh: Number(upper[1]), refText: `≤${upper[1]}` };
  const lower = line.match(/(?:>|≥|>=)\s*(-?\d+(?:\.\d+)?)/);
  if (lower) return { raw: lower[0], refLow: Number(lower[1]), refHigh: Number.MAX_SAFE_INTEGER, refText: `≥${lower[1]}` };
  return null;
}
function buildReportFromParsedPdf(parsedResult) {
  return normalizeReport({
    id: `r${Date.now()}`,
    patient: parsedResult.patient || patient,
    reportType: parsedResult.reportType || '检验报告',
    hospital: parsedResult.hospital || '未知机构',
    date: parsedResult.date || new Date().toISOString().slice(0, 10),
    items: parsedResult.items || []
  });
}
function calculatePdfParseConfidence(parsed) {
  let score = 0;
  if (parsed.hospital && parsed.hospital !== '未知机构') score += 0.15;
  if (parsed.date) score += 0.12;
  if (parsed.reportType && parsed.reportType !== '检验报告') score += 0.1;
  if (parsed.items?.length) score += 0.25;
  const complete = (parsed.items || []).filter(item => item.name && Number.isFinite(item.value) && item.unit && item.refText).length;
  score += Math.min(0.3, complete * 0.06);
  const unmatchedPenalty = Math.min(0.2, (parsed.unmatchedLines?.length || 0) * 0.02);
  score = Math.max(0, Math.min(1, score - unmatchedPenalty));
  const level = score >= 0.72 ? 'high' : score >= 0.45 ? 'medium' : 'low';
  const message = level === 'high' ? '解析质量较高，请核对后保存。' : level === 'medium' ? '部分字段可能需要修改。' : '解析质量较低，建议手动录入。';
  return { score, level, message };
}
const pdfParserTestCases = [
  { line: 'GLU 7.4 mmol/L 3.9-6.1', expectedName: '空腹血糖', expectedStatus: 'high', expectedRefSource: 'report' },
  { line: 'LDL 3.7 mmol/L 0-3.4', expectedName: '低密度脂蛋白', expectedStatus: 'high', expectedRefSource: 'report' },
  { line: 'CREA 115 umol/L 57-111', expectedName: '肌酐', expectedStatus: 'high', expectedRefSource: 'report' },
  { line: 'TC 5.8 mmol/L <5.2', expectedName: '总胆固醇', expectedStatus: 'high', expectedRefSource: 'report' },
  { line: 'UA 480 umol/L 208~428', expectedName: '尿酸', expectedStatus: 'high', expectedRefSource: 'report' },
  { line: 'CREA 115 umol/L 57 至 111', expectedName: '肌酐', expectedStatus: 'high', expectedRefSource: 'report' },
  { line: 'GLU 7.4 H mmol/L 3.9-6.1', expectedName: '空腹血糖', expectedStatus: 'high', expectedRefSource: 'report' },
  { line: 'WBC 2.9 L 10^9/L 3.5-9.5', expectedName: '白细胞', expectedStatus: 'low', expectedRefSource: 'report' },
  { line: 'GLU 7.4 ↑ mmol/L 3.9-6.1', expectedName: '空腹血糖', expectedStatus: 'high', expectedRefSource: 'report' },
  { line: 'WBC 2.9 ↓ 10^9/L 3.5-9.5', expectedName: '白细胞', expectedStatus: 'low', expectedRefSource: 'report' },
  { line: 'LDL 3.7 偏高 mmol/L 0-3.4', expectedName: '低密度脂蛋白', expectedStatus: 'high', expectedRefSource: 'report' },
  { line: 'WBC 2.9 偏低 10^9/L 3.5-9.5', expectedName: '白细胞', expectedStatus: 'low', expectedRefSource: 'report' },
  { line: '甘油三酯 0.8 mmol/L >1.0', expectedName: '甘油三酯', expectedStatus: 'low', expectedRefSource: 'report' },
  { line: '血小板 400 10^9/L ≥125', expectedName: '血小板', expectedStatus: 'normal', expectedRefSource: 'report' }
];
function runPdfParserTests() {
  const results = pdfParserTestCases.map(test => {
    const item = parseLabLine(test.line);
    const passed = Boolean(item)
      && item.name === test.expectedName
      && item.status === test.expectedStatus
      && item.refSource === test.expectedRefSource;
    return {
      passed,
      line: test.line,
      expectedName: test.expectedName,
      actualName: item?.name || '',
      expectedStatus: test.expectedStatus,
      actualStatus: item?.status || '',
      expectedRefSource: test.expectedRefSource,
      actualRefSource: item?.refSource || '',
      unit: item?.unit || '',
      refText: item?.refText || ''
    };
  });
  const passedCount = results.filter(result => result.passed).length;
  console.table(results);
  console.log(`PDF parser tests: ${passedCount}/${results.length} passed`);
  return { passed: passedCount, total: results.length, results };
}
function renderPdfStatus(root, message) {
  if (!root) return;
  root.innerHTML = `<article class="card pdf-parse-status"><span class="pdf-spinner"></span><p>${esc(message)}</p></article>`;
}
function renderPdfError(root, message) {
  if (!root) return;
  root.innerHTML = `<article class="card pdf-error-message"><strong>解析失败</strong><p>${esc(message)}</p><button class="outline-btn" type="button" data-pdf-clear>改为手动录入</button></article>`;
  root.querySelector('[data-pdf-clear]').onclick = () => root.replaceChildren();
}
function renderPdfPreview(root, parsed) {
  if (!root) return;
  const confidence = parsed.confidence || calculatePdfParseConfidence(parsed);
  const rows = (parsed.items || []).map((item, index) => `<tr class="parsed-item-row" data-ref-source="${esc(item.refSource || 'unknown')}">
    <td><input name="pdfItemName" value="${esc(item.name)}" aria-label="项目名称 ${index + 1}"></td>
    <td><input name="pdfItemValue" type="number" step="0.01" value="${esc(item.value)}" aria-label="数值 ${index + 1}"></td>
    <td><input name="pdfItemUnit" value="${esc(item.unit || '')}" aria-label="单位 ${index + 1}"></td>
    <td><input name="pdfItemRefLow" type="number" step="0.01" value="${esc(item.refLow)}" aria-label="参考下限 ${index + 1}"></td>
    <td><input name="pdfItemRefHigh" type="number" step="0.01" value="${esc(item.refHigh)}" aria-label="参考上限 ${index + 1}"></td>
    <td><span class="ref-source-badge ${esc(item.refSource || 'unknown')}">${refSourceText(item.refSource || 'unknown')}</span></td>
  </tr>`).join('');
  root.innerHTML = `<article class="card pdf-preview-card">
    <div class="pdf-preview-head">
      <div><h2>PDF 解析结果预览</h2><p>请核对并编辑解析结果，确认后才会保存到报告列表。</p></div>
      <span class="pdf-confidence-badge ${confidence.level}">${Math.round(confidence.score * 100)}% · ${confidence.message}</span>
    </div>
    <div class="pdf-meta-grid">
      <label>报告类型<input name="pdfReportType" value="${esc(parsed.reportType || '检验报告')}"></label>
      <label>医院名称<input name="pdfHospital" value="${esc(parsed.hospital || '未知机构')}"></label>
      <label>报告日期<input name="pdfDate" type="date" value="${esc(parsed.date || new Date().toISOString().slice(0, 10))}"></label>
      <label>患者姓名<input name="pdfPatientName" value="${esc(parsed.patient?.name || patient.name)}"></label>
      <label>患者年龄<input name="pdfPatientAge" type="number" value="${esc(parsed.patient?.age ?? patient.age)}"></label>
      <label>患者 ID<input name="pdfPatientId" value="${esc(parsed.patient?.patientId || patient.patientId)}"></label>
    </div>
    <p class="reference-note">参考范围以原报告为准，系统默认值仅用于辅助录入。</p>
    <div class="pdf-preview-table-wrap"><table class="pdf-preview-table"><thead><tr><th>项目</th><th>数值</th><th>单位</th><th>下限</th><th>上限</th><th>来源</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${renderParseDebugDetails(parsed, confidence)}
    ${parsed.unmatchedLines?.length ? `<details class="pdf-unmatched-lines"><summary>未识别文本 ${parsed.unmatchedLines.length} 行</summary><pre>${esc(parsed.unmatchedLines.slice(0, 40).join('\n'))}</pre></details>` : ''}
    <div class="pdf-preview-actions"><button class="outline-btn" type="button" data-pdf-discard>放弃解析结果，改为手动录入</button><button class="primary-btn" type="button" data-pdf-save>确认保存解析结果</button></div>
    <div class="form-message" data-pdf-message aria-live="polite"></div>
  </article>`;
  bindPdfPreviewEvents(root);
}
function renderParseDebugDetails(parsed, confidence = calculatePdfParseConfidence(parsed)) {
  const rawText = parsed.rawText || parsed.source?.text || '';
  const lines = normalizePdfText(rawText).split('\n').filter(Boolean);
  const items = parsed.items || [];
  const countBySource = source => items.filter(item => item.refSource === source).length;
  const sourceLabel = parsed.source?.type === 'paste' ? '粘贴文本' : `PDF ${parsed.source?.pageCount || 0} 页`;
  return `<details class="pdf-debug-details">
    <summary>查看解析详情</summary>
    <div class="pdf-debug-grid">
      <span>来源</span><strong>${esc(sourceLabel)}</strong>
      <span>提取文本字符数</span><strong>${rawText.length}</strong>
      <span>识别行数</span><strong>${lines.length}</strong>
      <span>成功解析项目数</span><strong>${items.length}</strong>
      <span>未识别行数</span><strong>${parsed.unmatchedLines?.length || 0}</strong>
      <span>报告原文范围</span><strong>${countBySource('report')}</strong>
      <span>系统默认范围</span><strong>${countBySource('dictionary')}</strong>
      <span>未知范围</span><strong>${countBySource('unknown')}</strong>
      <span>置信度</span><strong>${Math.round(confidence.score * 100)}% / ${esc(confidence.level)}</strong>
    </div>
    <div class="pdf-debug-lines"><strong>unmatchedLines</strong><pre>${esc((parsed.unmatchedLines || []).join('\n') || '无')}</pre></div>
  </details>`;
}
function bindPdfPreviewEvents(root) {
  root.querySelectorAll('[name="pdfItemUnit"], [name="pdfItemRefLow"], [name="pdfItemRefHigh"]').forEach(input => {
    input.addEventListener('input', () => {
      const row = input.closest('tr');
      row.dataset.refSource = 'manual';
      const badge = row.querySelector('.ref-source-badge');
      badge.className = 'ref-source-badge manual';
      badge.textContent = refSourceText('manual');
    });
  });
  root.querySelectorAll('[name="pdfItemName"]').forEach(input => {
    input.addEventListener('blur', () => {
      input.value = normalizeLabItemName(input.value);
    });
  });
  root.querySelector('[data-pdf-discard]').onclick = () => root.replaceChildren();
  root.querySelector('[data-pdf-save]').onclick = async () => {
    const message = root.querySelector('[data-pdf-message]');
    const result = collectParsedPdfPreview(root);
    if (result.errors.length) {
      showUploadMessage(message, result.errors[0], 'error');
      return;
    }
    try {
      const saved = await saveUploadedReport(result.report);
      selectedReportId = saved.id;
      selectedTrendItem = saved.items[0]?.name || selectedTrendItem;
      setStoredSelectedReportId(selectedReportId);
      showUploadMessage(message, '报告保存成功', 'success');
      setTimeout(() => showScreen('overview'), 600);
    } catch (error) {
      showUploadMessage(message, `保存失败：${error.message}`, 'error');
    }
  };
}
function collectParsedPdfPreview(root) {
  const errors = [];
  const valueOf = name => root.querySelector(`[name="${name}"]`)?.value.trim() || '';
  const items = Array.from(root.querySelectorAll('.parsed-item-row')).map((row, index) => {
    const nameRaw = row.querySelector('[name="pdfItemName"]').value.trim();
    const valueRaw = row.querySelector('[name="pdfItemValue"]').value.trim();
    const unit = row.querySelector('[name="pdfItemUnit"]').value.trim();
    const lowRaw = row.querySelector('[name="pdfItemRefLow"]').value.trim();
    const highRaw = row.querySelector('[name="pdfItemRefHigh"]').value.trim();
    if (![nameRaw, valueRaw, unit, lowRaw, highRaw].every(Boolean)) {
      errors.push(`PDF 预览第 ${index + 1} 个检验项目未填写完整`);
      return null;
    }
    const value = Number(valueRaw);
    const refLow = Number(lowRaw);
    const refHigh = Number(highRaw);
    if (![value, refLow, refHigh].every(Number.isFinite)) {
      errors.push(`PDF 预览第 ${index + 1} 个检验项目的数值或参考范围格式不正确`);
      return null;
    }
    if (refLow > refHigh) errors.push(`PDF 预览第 ${index + 1} 个检验项目参考下限不能大于上限`);
    const name = normalizeLabItemName(nameRaw);
    const refSource = row.dataset.refSource || 'unknown';
    return { name, value, unit, refLow, refHigh, refText: `${refLow}–${refHigh}`, refSource, status: calculateItemStatus(value, refLow, refHigh) };
  }).filter(Boolean);
  const report = {
    id: `r${Date.now()}`,
    patient: { name: valueOf('pdfPatientName') || patient.name, age: Number(valueOf('pdfPatientAge') || patient.age), patientId: valueOf('pdfPatientId') || patient.patientId },
    reportType: valueOf('pdfReportType'),
    hospital: valueOf('pdfHospital'),
    date: valueOf('pdfDate'),
    items
  };
  errors.push(...validateUploadForm(report));
  return { report: normalizeReport(report), errors };
}
function renderReports() {
  const root = document.querySelector('#reports');
  const reports = [...getReports()].sort((a,b)=>b.date.localeCompare(a.date));
  root.innerHTML = `${topBar('报告列表', '', '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>')}${reports.length ? `<div class="report-list">${reports.map(r => `<article class="card report-card"><div class="report-title"><div class="flask-icon">⚗</div><div><h2>${esc(r.reportType)}</h2><p>${esc(r.hospital)}</p></div><div class="report-date">${esc(r.date)}</div></div><div class="report-alert">总项目 ${r.items.length} 项 · 异常项目 ${getAbnormalItems(r).length} 项</div><div class="report-actions"><button class="outline-btn" data-go="report-detail" data-report-id="${r.id}">查看详情</button><button class="outline-btn" data-go="ai-insights" data-report-id="${r.id}">AI 解读</button><button class="outline-btn" data-go="trends" data-item-name="${esc(r.items[0]?.name || '')}">趋势分析</button></div></article>`).join('')}</div>` : renderEmptyState('暂无报告数据，请先上传或录入一份检验报告。', '上传新报告', 'upload')}<button class="float-add" data-go="upload">＋</button>`;
}
function renderDetail() { renderReportDetail(); }
function renderReportDetail() {
  const r = getReports().find(x=>x.id===selectedReportId) || getLatestReport();
  if (!r) {
    document.querySelector('#report-detail').innerHTML = `${topBar('报告详情', 'reports')}${renderEmptyState('暂无报告数据，请先上传或录入一份检验报告。', '上传新报告', 'upload')}`;
    return;
  }
  const bad = getAbnormalItems(r);
  selectedReportId = r.id;
  const root = document.querySelector('#report-detail');
  setStoredSelectedReportId(selectedReportId);
  root.innerHTML = `${topBar('报告详情', 'reports')}<article class="card detail-summary"><div class="detail-title"><div><h2>⚗ ${esc(r.reportType)}</h2><p>${esc(r.hospital)}</p></div><span class="report-date">${esc(r.date)}</span></div><div class="patient-meta"><span>${esc(r.patient.name)}</span><span>${esc(r.patient.age)}岁</span><span>ID: ${esc(r.patient.patientId)}</span></div><div class="detail-stats"><div><strong>${r.items.length}</strong><span>总项目</span></div><div><strong class="green">${r.items.length-bad.length}</strong><span>正常</span></div><div><strong class="red">${bad.length}</strong><span>异常</span></div></div></article><section class="lab-item-list"><div class="section-head detail-section-head"><h2>检验项目</h2><span>${r.items.length} 项</span></div>${r.items.map((item, index) => renderLabItemCard(item, index)).join('')}</section>`;
  bindReportDetailEvents(root, r);
}
function renderLabItemCard(item, index) {
  const rangeText = item.refText || `${item.refLow}–${item.refHigh}`;
  return `<article class="card lab-item-card" data-item-index="${index}">
    <div class="lab-item-header"><div><h3>${esc(item.name)}</h3><p>${esc(formatRange(item))}</p></div><span class="status-badge ${item.status}">${statusText(item.status)}</span></div>
    <div class="lab-value-row"><div><small>结果</small><strong class="${item.status === 'normal' ? '' : 'red'}">${esc(item.value)} <span>${esc(item.unit)}</span></strong></div><div><small>参考范围</small><strong>${esc(rangeText)}</strong></div></div>
    <div class="lab-item-meta"><span class="ref-source-badge ${item.refSource || 'unknown'}">${refSourceText(item.refSource || 'unknown')}</span><button class="outline-btn explanation-toggle" type="button" data-explain-index="${index}">查看解释</button></div>
    <div class="explanation-panel" hidden></div>
  </article>`;
}
function bindReportDetailEvents(root, report) {
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-explain-index]');
    if (!button) return;
    const index = Number(button.dataset.explainIndex);
    const item = report.items[index];
    const card = button.closest('.lab-item-card');
    const panel = card.querySelector('.explanation-panel');
    if (!item || !panel) return;
    const willOpen = panel.hidden;
    if (willOpen && !panel.dataset.loaded) {
      panel.innerHTML = renderExplanationPanel(explainLabItem(item));
      panel.dataset.loaded = '1';
    }
    panel.hidden = !willOpen;
    button.textContent = willOpen ? '收起解释' : '查看解释';
  });
}
function renderExplanationPanel(info) {
  return `<div class="explanation-title"><strong>${esc(info.title)}</strong><span>${esc(info.category)}</span></div>
    <div class="explanation-section"><h4>指标含义</h4><p>${esc(info.meaning)}</p></div>
    <div class="explanation-section"><h4>当前解释</h4><p>${esc(info.currentExplanation)}</p></div>
    <div class="explanation-section"><h4>建议</h4><p>${esc(info.suggestion)}</p></div>
    <div class="explanation-disclaimer"><strong>安全提示</strong><p>${esc(info.disclaimer)}</p></div>`;
}
function renderTrends() {
  const names = [...new Set(getReports().flatMap(r=>r.items.map(i=>i.name)))];
  if (!names.length) {
    document.querySelector('#trends').innerHTML = `${topBar('趋势分析', 'reports')}${renderEmptyState('暂无报告数据，请先上传或录入一份检验报告。', '上传新报告', 'upload')}`;
    return;
  }
  if (!names.includes(selectedTrendItem)) selectedTrendItem = names[0];
  const data = getTrendData(selectedTrendItem);
  if (!data.length) {
    document.querySelector('#trends').innerHTML = `${topBar('趋势分析', 'reports')}${renderEmptyState('当前指标历史数据不足，暂无法判断趋势。', '添加数据', 'upload')}`;
    return;
  }
  const latest = data.at(-1);
  const previous = data.at(-2);
  const delta = previous ? latest.value - previous.value : 0;
  const pct = previous && previous.value ? (delta / previous.value * 100) : 0;
  const meta = getTrendMeta(selectedTrendItem, latest);
  document.querySelector('#trends').innerHTML = `${topBar('趋势分析', 'reports')}
    <section class="trend-hero-panel ${latest?.status === 'normal' ? 'ok' : 'warn'}">
      <div class="trend-hero-head"><button class="ghost-back" data-go="reports">‹</button><label class="hero-metric-select"><select id="trend-select">${names.map(n=>`<option ${n===selectedTrendItem?'selected':''}>${esc(n)}</option>`).join('')}</select></label><button class="ghost-more">•••</button></div>
      <div class="trend-number-row"><div><strong>${latest?.value ?? '-'}</strong><span>${esc(latest?.unit || '')}</span><p>${latest?.date || ''}</p></div><div class="trend-delta"><b>${delta >= 0 ? '↑' : '↓'} ${Math.abs(pct).toFixed(2)}%</b><small>较上次</small></div></div>
      <article class="card trend-chart-card"><div class="chart-period"><button>‹</button><span>${data[0]?.date.replaceAll('-', '') || ''} – ${latest?.date.replaceAll('-', '') || ''}</span><button>›</button></div>${renderChart(data, true)}</article>
    </section>
    <div class="trend-tabs"><button class="active">名词解释</button><button>异常分析</button><button>历史记录</button></div>
    <article class="card risk-card"><h2>状态评估</h2><p>正常范围区间 <strong>${latest ? `${latest.refLow}~${latest.refHigh} ${latest.unit}` : '-'}</strong></p>${renderRiskScale(latest)}<div class="risk-labels"><span>理想</span><span>低风险</span><span>中风险</span><span>高风险</span></div></article>
    <article class="card explain-card"><h2>医学解释</h2><p>${esc(meta.explain)}</p><ul>${meta.points.map(point => `<li>${esc(point)}</li>`).join('')}</ul></article>
    <button class="primary-btn add-data-btn" data-go="upload">添加数据</button>`;
  document.querySelector('#trend-select').onchange = e => { selectedTrendItem = e.target.value; renderTrends(); };
}
function renderAi() {
  const reports = [...getReports()].sort((a,b)=>b.date.localeCompare(a.date));
  const latest = reports[0] || getLatestReport();
  const chatReport = getCurrentChatReport();
  const messages = getChatHistory();
  const root = document.querySelector('#ai-insights');
  root.innerHTML = `${topBar('AI 解读', 'overview')}<div class="ai-tabs"><button class="${aiMode==='insights'?'active':''}" id="tab-insights">AI 解读</button><button class="${aiMode==='chat'?'active':''}" id="tab-chat">AI 对话</button></div>${aiMode==='insights' ? renderAiInsightCards(reports) : renderChatPanel(chatReport, messages)}`;
  document.querySelector('#tab-insights').onclick = () => { aiMode = 'insights'; selectedAiReportId = ''; expandedAiReportId = ''; renderAi(); };
  document.querySelector('#tab-chat').onclick = () => { aiMode = 'chat'; renderAi(); };
  root.querySelectorAll('[data-ai-toggle]').forEach(button => {
    button.onclick = () => {
      expandedAiReportId = expandedAiReportId === button.dataset.aiToggle ? '' : button.dataset.aiToggle;
      selectedAiReportId = '';
      renderAi();
    };
  });
  const form = document.querySelector('#chat-form');
  root.querySelectorAll('[data-quick-question]').forEach(button => {
    button.onclick = () => sendChatQuestion(button.dataset.quickQuestion);
  });
  const clearButton = root.querySelector('#clear-chat');
  if (clearButton) clearButton.onclick = () => { clearChatHistory(); renderAi(); };
  if (form) form.onsubmit = e => { e.preventDefault(); sendChatQuestion(form.question.value); };
}
async function sendChatQuestion(rawQuestion) {
  const question = String(rawQuestion || '').trim();
  if (!question) return;
  const report = getCurrentChatReport();
  addChatMessage('user', question);
  const history = getChatHistory();
  const apiReply = await callAiChatApi(question, report, history);
  addChatMessage('assistant', apiReply || generateMockChatReply(question, report));
  renderAi();
}
function renderChatPanel(report, messages) {
  if (!report) return '<article class="card ai-empty-state chat-empty-state">暂无报告数据，请先上传或录入一份检验报告。</article>';
  return `${renderChatContextCard(report)}${renderQuickQuestions()}<div class="chat-head-row"><h2>对话记录</h2><button class="chat-clear-btn" id="clear-chat" type="button">清空聊天</button></div>${renderChatMessages(messages)}<form class="chat-input" id="chat-form"><input placeholder="可以问我某个指标是什么意思，例如：空腹血糖严重吗？" name="question" autocomplete="off"><button>发送</button></form>`;
}
function renderChatContextCard(report) {
  const normalizedReport = normalizeReport(report);
  const bad = getAbnormalItems(normalizedReport);
  return `<article class="card chat-context-card"><div><h2>当前参考报告</h2><p>${esc(normalizedReport.reportType)} · ${esc(normalizedReport.hospital)}</p><small>${esc(normalizedReport.date)} · ${esc(normalizedReport.patient.name)}</small></div><div class="chat-context-grid"><span><strong>${normalizedReport.items.length}</strong>总项目</span><span><strong>${bad.length}</strong>异常</span></div></article>`;
}
function renderQuickQuestions() {
  const questions = ['这份报告有什么异常？', '我的空腹血糖严重吗？', '低密度脂蛋白是什么意思？', '我需要复查吗？'];
  return `<div class="quick-question-row">${questions.map(question => `<button type="button" data-quick-question="${esc(question)}">${esc(question)}</button>`).join('')}</div>`;
}
function renderChatMessages(messages) {
  if (!messages.length) return '<div class="chat-thread"><div class="chat-empty-state">还没有对话。你可以直接提问，或点击上方快捷问题。</div></div>';
  return `<div class="chat-thread">${messages.map(message => `<div class="message ${message.role === 'user' ? 'user' : 'assistant'}">${message.role === 'assistant' ? '<div class="robot" style="width:28px;height:28px;font-size:16px">🤖</div>' : ''}<div><div class="bubble">${esc(message.content)}</div><div class="msg-time">${esc(message.time)}</div></div></div>`).join('')}</div>`;
}
function renderAiInsightCards(reports) {
  if (!reports.length) return '<article class="card ai-empty-state">暂无报告数据，请先上传或录入一份检验报告。</article>';
  const latestId = reports[0]?.id || '';
  const selected = selectedAiReportId && reports.some(report => report.id === selectedAiReportId) ? selectedAiReportId : '';
  const ordered = selected ? [...reports].sort((a, b) => (a.id === selected ? -1 : b.id === selected ? 1 : b.date.localeCompare(a.date))) : reports;
  return `<div class="ai-report-list">${ordered.map(report => {
    const isLatest = report.id === latestId;
    const highlighted = Boolean(selected && report.id === selected);
    const expanded = highlighted || (!selected && isLatest) || (!isLatest && expandedAiReportId === report.id);
    return renderAiReportCard(report, { expanded, highlighted, isLatest, isSelected: highlighted, canToggle: !isLatest && !highlighted });
  }).join('')}</div>`;
}
function renderAiReportCard(report, options = {}) {
  const { expanded = false, highlighted = false, isLatest = false, isSelected = false, canToggle = false } = options;
  const normalizedReport = normalizeReport(report);
  const bad = getAbnormalItems(normalizedReport);
  const normal = normalizedReport.items.length - bad.length;
  const abnormalNames = bad.slice(0, 3).map(item => item.name);
  return `<article class="card ai-report-card ${expanded ? 'expanded' : 'collapsed'} ${highlighted ? 'highlighted' : ''}">
    <div class="ai-card-header"><div><h3>${esc(normalizedReport.reportType)}</h3><p>${esc(normalizedReport.hospital)} · ${esc(normalizedReport.patient.name)}</p><div class="ai-card-tags">${isLatest ? '<span>最新报告</span>' : ''}${isSelected ? '<span>当前查看</span>' : ''}</div></div><div><span class="report-date">${esc(normalizedReport.date)}</span><small class="status-badge ${bad.length ? 'high' : 'normal'}">异常 ${bad.length} 项</small></div></div>
    <div class="ai-summary-grid"><div><strong>${normalizedReport.items.length}</strong><span>总项目</span></div><div><strong>${normal}</strong><span>正常</span></div><div><strong class="${bad.length ? 'red' : 'green'}">${bad.length}</strong><span>异常</span></div></div>
    ${expanded ? renderAiInterpretation(generateAiInterpretation(normalizedReport)) : `<div class="ai-report-summary"><div><strong>主要异常</strong><p>${abnormalNames.length ? abnormalNames.map(esc).join('、') : '未发现明显异常指标'}</p></div>${canToggle ? `<button class="outline-btn ai-expand-button" type="button" data-ai-toggle="${esc(normalizedReport.id)}">查看完整解读</button>` : ''}</div>`}
    ${expanded && canToggle ? `<button class="outline-btn ai-expand-button collapse" type="button" data-ai-toggle="${esc(normalizedReport.id)}">收起解读</button>` : ''}
  </article>`;
}
function renderAiInterpretation(interpretation) {
  return `<section class="ai-summary-box"><h4>整体评估</h4><p>${esc(interpretation.summary)}</p></section>
    <section class="ai-abnormal-list"><h4>异常指标分析</h4>${interpretation.abnormalItems.length ? interpretation.abnormalItems.map(item => `<article class="ai-abnormal-item"><div class="ai-abnormal-head"><strong>${esc(item.name)}</strong><span class="status-badge ${item.statusText === '偏高' ? 'high' : item.statusText === '偏低' ? 'low' : 'normal'}">${esc(item.statusText)}</span></div><div class="ai-abnormal-meta"><span>${esc(item.valueText)}</span><span>参考 ${esc(item.referenceText)}</span><span>${esc(item.category)}</span></div><p>${esc(item.explanation)}</p><small>${esc(item.suggestion)}</small></article>`).join('') : `<div class="ai-empty-state">${esc(interpretation.normalNote)}</div>`}</section>
    <section class="ai-recommendation-list"><h4>综合建议</h4><ul>${interpretation.recommendations.map(item => `<li>${esc(item)}</li>`).join('')}</ul></section>
    <section class="ai-disclaimer">${esc(interpretation.disclaimer)}</section>`;
}
function renderProfile() {
  const root = document.querySelector('#profile');
  root.innerHTML = `${topBar('我的', 'overview')}<article class="card profile-empty">个人中心模块待接入账号系统。</article>${renderDevTools()}`;
  bindProfileEvents(root);
}
function renderDevTools() {
  const reports = getReports();
  const latest = getLatestReport();
  const bad = getAbnormalItems(latest).length;
  const clearLabel = appConfig.dataMode === 'api' ? '清空后端报告' : '清空本地报告';
  return `<article class="card dev-tools-card"><h2>开发者调试工具</h2><p class="dev-warning">该区域仅用于当前 MVP 本地测试，生产环境不应使用 localStorage 保存敏感医疗数据。</p>
    <section class="data-mode-panel">
      <div class="data-mode-row"><span>当前使用</span><strong class="mode-badge ${appConfig.dataMode}">${appConfig.dataMode === 'api' ? 'API 模式' : '本地模式'}</strong></div>
      <div class="data-mode-row"><span>API 地址</span><strong>${esc(appConfig.apiBaseUrl)}</strong></div>
      <div class="data-mode-row"><span>API 健康状态</span><strong>${apiHealthText(appState.apiHealth)}</strong></div>
      <div class="dev-actions mode-actions">
        <button class="outline-btn" type="button" id="check-api-health">检测后端连接</button>
        <button class="outline-btn" type="button" id="switch-api-mode">切换到 API 模式</button>
        <button class="outline-btn" type="button" id="switch-local-mode">切换到本地模式</button>
      </div>
    </section>
    <div class="dev-stats">
      <div><strong>${reports.length}</strong><span>reports 数量</span></div>
      <div><strong>${getChatCount()}</strong><span>聊天记录</span></div>
      <div><strong>${latest?.date || '-'}</strong><span>最新报告日期</span></div>
      <div><strong>${latest ? bad : 0}</strong><span>最新异常</span></div>
    </div>
    <div class="storage-keys"><span>${REPORTS_KEY}</span><span>${CHAT_KEY}</span><span>${SELECTED_REPORT_KEY}</span><span>${DATA_MODE_KEY}</span></div>
    <div class="dev-actions">
      <button class="outline-btn danger-soft" type="button" id="clear-reports">${clearLabel}</button>
      <button class="outline-btn" type="button" id="restore-sample">恢复示例报告</button>
      <button class="outline-btn" type="button" id="export-reports">导出报告 JSON</button>
      <label class="outline-btn import-label">导入 reports JSON<input id="import-reports" type="file" accept="application/json,.json"></label>
      <button class="outline-btn" type="button" id="sync-local-to-api">同步本地报告到后端</button>
      <button class="outline-btn" type="button" id="pull-api-to-local">从后端拉取报告</button>
      <button class="outline-btn danger-soft" type="button" id="clear-chat">清空聊天记录</button>
    </div>
    <div class="form-message" id="profile-message" aria-live="polite"></div>
  </article>`;
}
function bindProfileEvents(root) {
  root.querySelector('#clear-reports')?.addEventListener('click', async () => {
    const sourceText = appConfig.dataMode === 'api' ? '后端报告数据' : '本地报告数据';
    if (!confirm(`确认清空${sourceText}？该操作不会恢复示例报告。`)) return;
    await clearReportsData();
    renderProfile();
    showProfileMessage(appConfig.dataMode === 'api' ? '后端报告已清空' : '本地报告已清空', 'success');
  });
  root.querySelector('#restore-sample')?.addEventListener('click', async () => {
    const sourceText = appConfig.dataMode === 'api' ? '后端报告数据' : '本地报告数据';
    if (!confirm(`确认恢复示例报告？这会覆盖当前${sourceText}。`)) return;
    await resetReportsToSample();
    renderProfile();
    showProfileMessage('示例报告已恢复', 'success');
  });
  root.querySelector('#export-reports')?.addEventListener('click', exportReportsJson);
  root.querySelector('#import-reports')?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) importReportsJson(file);
    event.target.value = '';
  });
  root.querySelector('#clear-chat')?.addEventListener('click', () => {
    if (!confirm('确认清空聊天记录？')) return;
    clearChatHistory();
    renderProfile();
    showProfileMessage('聊天记录已清空', 'success');
  });
  root.querySelector('#sync-local-to-api')?.addEventListener('click', syncLocalReportsToApi);
  root.querySelector('#pull-api-to-local')?.addEventListener('click', pullApiReportsToLocal);
  root.querySelector('#check-api-health')?.addEventListener('click', checkApiHealth);
  root.querySelector('#switch-api-mode')?.addEventListener('click', switchToApiMode);
  root.querySelector('#switch-local-mode')?.addEventListener('click', switchToLocalMode);
}
function getReportsCount() { return getReports().length; }
function getChatCount() { return getChatHistory().length; }
function apiHealthText(status) {
  if (status === 'ok') return '正常';
  if (status === 'failed') return '失败';
  return '未检测';
}
async function checkApiHealth() {
  try {
    const result = await reportService.requestApi('/api/health');
    appState.apiHealth = result?.ok ? 'ok' : 'failed';
    renderProfile();
    showProfileMessage(appState.apiHealth === 'ok' ? '后端连接正常' : '后端连接失败', appState.apiHealth === 'ok' ? 'success' : 'error');
  } catch (error) {
    appState.apiHealth = 'failed';
    renderProfile();
    showProfileMessage(`后端连接失败：${error.message}`, 'error');
  }
}
async function switchToApiMode() {
  setDataMode('api');
  renderProfile();
  showProfileMessage('正在切换到 API 模式…', 'info');
  await loadReportsToState();
  renderProfile();
  showProfileMessage(appState.error ? `API 模式加载失败：${appState.error.message}` : '已切换到 API 模式', appState.error ? 'error' : 'success');
}
async function switchToLocalMode() {
  setDataMode('local');
  await loadReportsToState();
  renderProfile();
  showProfileMessage('已切换到本地模式', 'success');
}
async function clearReportsData() {
  if (appConfig.dataMode === 'api') await reportService.clearReportsAsync();
  else reportService.clearReports();
  refreshAfterDataChange();
  await loadReportsToState();
}
async function resetReportsToSample() {
  if (appConfig.dataMode === 'api') await reportService.importReportsAsync(sampleReports);
  else reportService.restoreSampleReports();
  refreshAfterDataChange();
  await loadReportsToState();
}
function exportReportsJson() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const blob = new Blob([JSON.stringify(getReports(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lab-reports-export-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showProfileMessage('报告 JSON 已导出', 'success');
}
function importReportsJson(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(String(reader.result || ''));
      if (!Array.isArray(parsed)) throw new Error('JSON 顶层必须是数组');
      const normalized = normalizeReports(parsed);
      const sourceText = appConfig.dataMode === 'api' ? '后端报告数据' : '本地报告数据';
      if (!confirm(`确认导入 ${normalized.length} 份报告？这会覆盖当前${sourceText}。`)) return;
      if (appConfig.dataMode === 'api') await reportService.importReportsAsync(normalized);
      else reportService.importReports(normalized);
      refreshAfterDataChange();
      await loadReportsToState();
      renderProfile();
      showProfileMessage('报告 JSON 已导入', 'success');
    } catch (error) {
      showProfileMessage(`导入失败：${error.message}`, 'error');
    }
  };
  reader.onerror = () => showProfileMessage('导入失败：无法读取文件', 'error');
  reader.readAsText(file);
}
async function syncLocalReportsToApi() {
  try {
    const reports = reportService.exportReports();
    const result = await reportService.requestApi('/api/reports/import', { method: 'POST', body: JSON.stringify(reports) });
    showProfileMessage(`已同步 ${result.imported ?? reports.length} 份本地报告到后端`, 'success');
  } catch (error) {
    showProfileMessage(`同步失败：${error.message}`, 'error');
  }
}
async function pullApiReportsToLocal() {
  try {
    const reports = normalizeReports(await reportService.requestApi('/api/reports'));
    if (!confirm(`确认从后端拉取 ${reports.length} 份报告并覆盖本地数据？`)) return;
    reportService.importReports(reports);
    refreshAfterDataChange();
    renderProfile();
    showProfileMessage(`已从后端拉取 ${reports.length} 份报告`, 'success');
  } catch (error) {
    showProfileMessage(`拉取失败：${error.message}`, 'error');
  }
}
function refreshAfterDataChange() {
  selectedReportId = '';
  selectedAiReportId = '';
  expandedAiReportId = '';
  selectedTrendItem = '空腹血糖';
  clearStoredSelectedReportId();
}
function showProfileMessage(message, type = 'info') {
  const target = document.querySelector('#profile-message');
  if (!target) return;
  target.textContent = message;
  target.className = `form-message ${type}`;
}
function renderChart(data, large) {
  if (!data.length) return '<p>暂无数据</p>';
  const w = 320;
  const h = large ? 180 : 132;
  const l = 34;
  const r = 292;
  const t = large ? 22 : 18;
  const b = large ? 140 : 94;
  const vals = data.flatMap(d => [d.value, d.refLow, d.refHigh]);
  const min = Math.min(...vals) * 0.88;
  const max = Math.max(...vals) * 1.08;
  const x = i => data.length === 1 ? (l + r) / 2 : l + (r - l) * i / (data.length - 1);
  const y = v => b - (v - min) / (max - min || 1) * (b - t);
  const latest = data.at(-1);
  const points = data.map((d, i) => [x(i), y(d.value)]);
  const path = data.length === 1 ? `M${points[0][0]} ${points[0][1]}` : smoothPath(points);
  const area = data.length > 1 ? `${path} L${x(data.length - 1)} ${b} L${x(0)} ${b} Z` : '';
  const lineClass = latest.status === 'normal' ? 'line-teal' : 'line-coral';
  return `<svg class="chart ${large ? 'detail-chart' : ''}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0fb79f" stop-opacity=".18"/><stop offset="1" stop-color="#0fb79f" stop-opacity="0"/></linearGradient></defs>
    <rect class="normal-zone" x="${l}" y="${y(latest.refHigh)}" width="${r-l}" height="${Math.max(2, y(latest.refLow)-y(latest.refHigh))}" rx="6"/>
    <path class="grid-line" d="M${l} ${t}H${r}M${l} ${(t+b)/2}H${r}M${l} ${b}H${r}"/>
    ${area ? `<path class="area-fill" d="${area}"/>` : ''}
    <path class="${lineClass}" d="${path}"/>
    ${data.map((d,i)=>`<circle class="${d.status==='normal'?'dot-teal':'dot-coral'}" cx="${x(i)}" cy="${y(d.value)}" r="${large ? 4.2 : 3.5}"/>`).join('')}
    ${data.map((d,i)=>`<text x="${x(i)-12}" y="${h-9}">${d.date.slice(5).replace('-','/')}</text>`).join('')}
    ${large?`<text class="range-mark" x="${r+2}" y="${y(latest.refHigh)}">上限 ${latest.refHigh}</text><text class="range-mark" x="${r+2}" y="${y(latest.refLow)}">下限 ${latest.refLow}</text>`:''}
  </svg>`;
}

function renderOverviewChart(data) {
  return `<div class="overview-chart-shell">${renderChart(data, false)}<div class="chart-footnote"><span>12/20</span><span>01/20</span><span>02/18</span><span>03/28</span></div></div>`;
}
function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mx = (x0 + x1) / 2;
    d += ` C${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}
function renderRiskScale(item) {
  if (!item) return '';
  const pos = item.status === 'normal' ? 18 : item.status === 'low' ? 42 : item.status === 'high' ? 82 : 66;
  return `<div class="risk-scale"><span class="ideal"></span><span class="low-risk"></span><span class="mid-risk"></span><span class="high-risk"></span><i style="left:${pos}%"></i></div>`;
}
function getMedicalItemInfo(itemName) {
  const normalizedName = normalizeLabItemName(itemName);
  return medicalItemDictionary.find(entry => entry.name === normalizedName) || null;
}
function explainLabItem(item) {
  const info = getMedicalItemInfo(item?.name);
  const status = item?.status || 'normal';
  if (!info) {
    const title = `${item?.name || '该项目'}${statusText(status)}`;
    return {
      title,
      category: '未分类',
      meaning: '该项目暂未收录，可结合报告原文、复查结果或咨询医生。',
      currentExplanation: '该项目暂未收录，可结合报告原文、复查结果或咨询医生。',
      suggestion: '建议以原报告参考范围为准，并咨询医生进行专业判断。',
      disclaimer: '内容仅供参考，不能替代医生诊断。'
    };
  }
  const currentExplanation = status === 'high' ? info.highMeaning : status === 'low' ? info.lowMeaning : info.normalMeaning;
  return {
    title: `${info.name}${statusText(status)}`,
    category: info.category,
    meaning: info.meaning,
    currentExplanation,
    suggestion: info.suggestion,
    disclaimer: '内容仅供参考，不能替代医生诊断。'
  };
}
function getTrendMeta(name, latest) {
  const explanation = explainLabItem(latest || { name, status: 'normal' });
  return {
    explain: explanation.meaning,
    points: [explanation.currentExplanation, explanation.suggestion]
  };
}

function trendStatus(data) { if (data.length < 2) return '数据不足'; const first=data[0].value,last=data.at(-1).value; if (data.every(d=>d.status!=='normal')) return '持续异常'; if (last>first) return '逐步升高'; if (last<first) return '逐步降低'; return data.some(d=>d.status!=='normal')?'波动异常':'正常'; }
function statusText(s) { return s === 'high' ? '偏高' : s === 'low' ? '偏低' : '正常'; }
function formatValue(i) { return `${i.value} ${i.unit || ''}`.trim(); }
function formatRange(i) { return `${i.refLow}-${i.refHigh} ${i.unit || ''}`.trim(); }
function esc(v) { return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
window.appConfig=appConfig; window.appState=appState; window.reportService=reportService; window.chatService=chatService; window.setDataMode=setDataMode; window.loadReportsToState=loadReportsToState; window.refreshReportsAndRender=refreshReportsAndRender; window.checkApiHealth=checkApiHealth; window.switchToApiMode=switchToApiMode; window.switchToLocalMode=switchToLocalMode; window.apiHealthText=apiHealthText; window.labReferenceDictionary=labReferenceDictionary; window.medicalItemDictionary=medicalItemDictionary; window.normalizeReport=normalizeReport; window.normalizeReports=normalizeReports; window.normalizeLabItemName=normalizeLabItemName; window.getDefaultReferenceRange=getDefaultReferenceRange; window.getMedicalItemInfo=getMedicalItemInfo; window.explainLabItem=explainLabItem; window.getReports=getReports; window.saveReports=saveReports; window.addReport=addReport; window.calculateItemStatus=calculateItemStatus; window.getLatestReport=getLatestReport; window.getAbnormalItems=getAbnormalItems; window.getOverviewStats=getOverviewStats; window.getTrendData=getTrendData; window.trendStatus=trendStatus; window.statusText=statusText; window.formatValue=formatValue; window.formatRange=formatRange; window.generateAiInterpretation=generateAiInterpretation; window.aiInterpretationToText=aiInterpretationToText; window.generateAiInterpretationText=generateAiInterpretationText; window.generateMockChatReply=generateMockChatReply; window.getCurrentChatReport=getCurrentChatReport; window.getChatHistory=getChatHistory; window.saveChatHistory=saveChatHistory; window.clearChatHistory=clearChatHistory; window.addChatMessage=addChatMessage; window.callAiChatApi=callAiChatApi; window.findMatchedLabItem=findMatchedLabItem; window.buildReportSummaryReply=buildReportSummaryReply; window.buildItemExplanationReply=buildItemExplanationReply; window.isMedicalAdviceQuestion=isMedicalAdviceQuestion; window.renderChatPanel=renderChatPanel; window.renderChatContextCard=renderChatContextCard; window.renderChatMessages=renderChatMessages; window.renderQuickQuestions=renderQuickQuestions; window.loadPdfJsIfNeeded=loadPdfJsIfNeeded; window.extractTextFromPdfFile=extractTextFromPdfFile; window.groupTextItemsIntoLines=groupTextItemsIntoLines; window.normalizePdfText=normalizePdfText; window.parsePdfReportText=parsePdfReportText; window.parseReportMetaFromText=parseReportMetaFromText; window.parseLabItemsFromText=parseLabItemsFromText; window.parseLabLine=parseLabLine; window.parsePdfReferenceRange=parsePdfReferenceRange; window.normalizeParsedUnit=normalizeParsedUnit; window.buildReportFromParsedPdf=buildReportFromParsedPdf; window.calculatePdfParseConfidence=calculatePdfParseConfidence; window.pdfParserTestCases=pdfParserTestCases; window.runPdfParserTests=runPdfParserTests; window.renderPdfStatus=renderPdfStatus; window.renderPdfError=renderPdfError; window.renderPdfPreview=renderPdfPreview; window.renderParseDebugDetails=renderParseDebugDetails; window.collectParsedPdfPreview=collectParsedPdfPreview; window.handlePastedTextParse=handlePastedTextParse; window.renderOverview=renderOverview; window.renderReports=renderReports; window.renderTrends=renderTrends; window.renderAi=renderAi; window.renderProfile=renderProfile; window.renderUpload=renderUpload; window.bindUploadEvents=bindUploadEvents; window.createEmptyLabItemForm=createEmptyLabItemForm; window.collectUploadFormData=collectUploadFormData; window.validateUploadForm=validateUploadForm; window.saveUploadedReport=saveUploadedReport; window.renderReportDetail=renderReportDetail; window.renderLabItemCard=renderLabItemCard; window.bindReportDetailEvents=bindReportDetailEvents; window.renderExplanationPanel=renderExplanationPanel; window.renderAiInsightCards=renderAiInsightCards; window.renderAiReportCard=renderAiReportCard; window.renderAiInterpretation=renderAiInterpretation; window.renderDevTools=renderDevTools; window.getReportsCount=getReportsCount; window.getChatCount=getChatCount; window.resetReportsToSample=resetReportsToSample; window.clearReportsData=clearReportsData; window.exportReportsJson=exportReportsJson; window.importReportsJson=importReportsJson; window.syncLocalReportsToApi=syncLocalReportsToApi; window.pullApiReportsToLocal=pullApiReportsToLocal; window.refreshAfterDataChange=refreshAfterDataChange;
showScreen('overview');
