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
  apiHealth: 'unchecked',
  aiHealth: null
};
const patient = { name: '王先生', age: 70, patientId: '123XXXX' };
let selectedReportId = getStoredSelectedReportId();
let selectedTrendItem = '空腹血糖';
let selectedTrendPointKey = '';
let trendDetailTab = 'explain';
let overviewItemFilter = null;
let aiMode = 'insights';
let selectedAiReportId = '';
let expandedAiReportId = '';
const aiInterpretationState = {};
let chatSending = false;
let chatDraft = '';
let chatRequestVersion = 0;
let reportsLoadVersion = 0;
let profileToolsOpen = false;
let profileBusy = false;
let reportEditSession = null;
let reportListFilters = createReportFilters();
let activeReportImport = null;

function createReportFilters() {
  return { search: '', reportType: '', status: '', startDate: '', endDate: '' };
}


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

addDictionaryEntries();

function addDictionaryEntries() {
  const references = [
    ['糖化血红蛋白', ['HbA1c', 'HBA1C', '糖化'], '%', 4.0, 6.0, '4.0–6.0'],
    ['高密度脂蛋白', ['HDL', 'HDL-C', '高密度胆固醇'], 'mmol/L', 1.0, 1.6, '1.0–1.6'],
    ['估算肾小球滤过率', ['eGFR', 'GFR'], 'mL/min/1.73m²', 90, 120, '90–120'],
    ['谷丙转氨酶', ['ALT', '丙氨酸氨基转移酶'], 'U/L', 0, 40, '0–40'],
    ['谷草转氨酶', ['AST', '天门冬氨酸氨基转移酶'], 'U/L', 0, 40, '0–40'],
    ['碱性磷酸酶', ['ALP', 'AKP'], 'U/L', 45, 125, '45–125'],
    ['γ-谷氨酰转肽酶', ['GGT', 'γ-GT', '谷氨酰转肽酶'], 'U/L', 0, 60, '0–60'],
    ['总胆红素', ['TBIL', 'T-BIL'], 'μmol/L', 3.4, 20.5, '3.4–20.5'],
    ['直接胆红素', ['DBIL', 'D-BIL'], 'μmol/L', 0, 6.8, '0–6.8'],
    ['间接胆红素', ['IBIL', 'I-BIL'], 'μmol/L', 1.7, 17.1, '1.7–17.1'],
    ['白蛋白', ['ALB'], 'g/L', 40, 55, '40–55'],
    ['总蛋白', ['TP'], 'g/L', 65, 85, '65–85'],
    ['红细胞压积', ['HCT', '红细胞比容'], '%', 40, 50, '40–50'],
    ['中性粒细胞百分比', ['NEUT%', 'NEU%', '中性粒百分比'], '%', 40, 75, '40–75'],
    ['淋巴细胞百分比', ['LYMPH%', 'LYM%', '淋巴百分比'], '%', 20, 50, '20–50'],
    ['中性粒细胞绝对值', ['NEUT#', 'NEU#', '中性粒细胞数'], '10^9/L', 1.8, 6.3, '1.8–6.3'],
    ['淋巴细胞绝对值', ['LYMPH#', 'LYM#', '淋巴细胞数'], '10^9/L', 1.1, 3.2, '1.1–3.2'],
    ['钾', ['K', 'K+'], 'mmol/L', 3.5, 5.3, '3.5–5.3'],
    ['钠', ['Na', 'Na+'], 'mmol/L', 137, 147, '137–147'],
    ['氯', ['Cl', 'Cl-'], 'mmol/L', 99, 110, '99–110'],
    ['钙', ['Ca', 'Ca2+'], 'mmol/L', 2.11, 2.52, '2.11–2.52'],
    ['镁', ['Mg', 'Mg2+'], 'mmol/L', 0.75, 1.02, '0.75–1.02'],
    ['磷', ['P', 'PHOS'], 'mmol/L', 0.85, 1.51, '0.85–1.51'],
    ['C反应蛋白', ['CRP'], 'mg/L', 0, 10, '0–10'],
    ['超敏C反应蛋白', ['hs-CRP', 'hsCRP'], 'mg/L', 0, 3, '0–3'],
    ['尿蛋白', ['PRO', '尿PRO'], 'mg/L', 0, 150, '0–150'],
    ['尿糖', ['GLU-U', '尿糖GLU'], 'mmol/L', 0, 0.8, '0–0.8'],
    ['尿酮体', ['KET'], 'mmol/L', 0, 0.5, '0–0.5'],
    ['尿潜血', ['BLD', 'OB'], 'cells/μL', 0, 10, '0–10'],
    ['尿白细胞', ['LEU'], 'cells/μL', 0, 25, '0–25'],
    ['尿亚硝酸盐', ['NIT'], '', 0, 0, '阴性'],
    ['尿比重', ['SG'], '', 1.005, 1.030, '1.005–1.030'],
    ['尿pH', ['pH-U', '尿PH'], '', 5.0, 8.0, '5.0–8.0'],
    ['促甲状腺激素', ['TSH'], 'mIU/L', 0.27, 4.2, '0.27–4.2'],
    ['游离甲状腺素', ['FT4'], 'pmol/L', 12, 22, '12–22'],
    ['游离三碘甲状腺原氨酸', ['FT3'], 'pmol/L', 3.1, 6.8, '3.1–6.8']
  ];
  references.forEach(([name, aliases, unit, refLow, refHigh, refText]) => {
    if (!labReferenceDictionary.some(entry => entry.name === name)) labReferenceDictionary.push({ name, aliases, unit, refLow, refHigh, refText });
  });
  const medicalEntries = [
    ['糖化血红蛋白', ['HbA1c', 'HBA1C', '糖化'], '糖代谢', '糖化血红蛋白反映近 2–3 个月平均血糖水平，常用于糖尿病风险评估和血糖控制观察。', '偏高可能提示近期平均血糖偏高或糖代谢控制不佳。', '偏低较少见，可能与低血糖风险、贫血或检测因素有关。', '建议结合空腹血糖、餐后血糖、用药情况和医生意见综合判断。'],
    ['高密度脂蛋白', ['HDL', 'HDL-C', '高密度胆固醇'], '血脂', '高密度脂蛋白常被用于评估血脂代谢和心血管风险保护因素。', '偏高通常临床风险较低，但仍需结合整体血脂情况判断。', '偏低可能与运动不足、体重、吸烟或代谢异常有关。', '建议结合低密度脂蛋白、总胆固醇和整体心血管风险评估。'],
    ['估算肾小球滤过率', ['eGFR', 'GFR'], '肾功能', 'eGFR 用于估算肾小球滤过能力，是观察肾功能的重要指标。', '偏高多需结合年龄、体型和检测背景判断。', '偏低可能提示肾小球滤过功能下降，需要结合肌酐、尿常规和复查结果。', '建议结合医生评估和连续复查观察变化。'],
    ['谷丙转氨酶', ['ALT', '丙氨酸氨基转移酶'], '肝功能', '谷丙转氨酶主要用于观察肝细胞损伤相关情况。', '偏高可能与肝细胞损伤、脂肪肝、饮酒、药物或剧烈运动等因素有关。', '偏低通常临床意义较小。', '建议结合谷草转氨酶、胆红素、用药和医生意见判断。'],
    ['谷草转氨酶', ['AST', '天门冬氨酸氨基转移酶'], '肝功能', '谷草转氨酶可反映肝脏、肌肉等组织相关酶学变化。', '偏高可能与肝细胞损伤、肌肉损伤、饮酒或药物影响有关。', '偏低通常临床意义较小。', '建议结合 ALT、GGT、肌酸激酶和医生意见综合判断。'],
    ['碱性磷酸酶', ['ALP', 'AKP'], '肝胆/骨代谢', '碱性磷酸酶与肝胆系统和骨代谢相关。', '偏高可能与胆汁淤积、骨代谢活跃或生理因素有关。', '偏低较少见，需结合营养和其他指标判断。', '建议结合 GGT、胆红素、年龄和医生意见判断。'],
    ['γ-谷氨酰转肽酶', ['GGT', 'γ-GT', '谷氨酰转肽酶'], '肝胆功能', 'GGT 常用于观察肝胆系统和酒精、药物相关影响。', '偏高可能与胆汁淤积、饮酒、脂肪肝或药物影响有关。', '偏低通常临床意义较小。', '建议结合 ALT、AST、ALP 和生活方式综合评估。'],
    ['总胆红素', ['TBIL', 'T-BIL'], '肝胆功能', '总胆红素反映胆红素代谢总体情况。', '偏高可能与胆红素代谢、肝胆排泄或溶血相关因素有关。', '偏低通常临床意义较小。', '建议结合直接/间接胆红素和医生意见判断。'],
    ['直接胆红素', ['DBIL', 'D-BIL'], '肝胆功能', '直接胆红素用于观察结合胆红素水平和胆汁排泄情况。', '偏高可能与胆汁排泄受阻或肝胆系统异常有关。', '偏低通常临床意义较小。', '建议结合总胆红素、ALP、GGT 判断。'],
    ['间接胆红素', ['IBIL', 'I-BIL'], '肝胆/血液', '间接胆红素用于观察未结合胆红素水平。', '偏高可能与溶血、胆红素代谢或肝脏摄取处理相关因素有关。', '偏低通常临床意义较小。', '建议结合血常规、直接胆红素和医生意见判断。'],
    ['白蛋白', ['ALB'], '肝功能/营养', '白蛋白反映蛋白营养、肝合成能力和体液状态。', '偏高可能与脱水或血液浓缩有关。', '偏低可能与营养不足、肝合成下降或蛋白丢失有关。', '建议结合总蛋白、肝肾功能和营养状态判断。'],
    ['总蛋白', ['TP'], '肝功能/营养', '总蛋白反映血清蛋白总体水平。', '偏高可能与脱水、慢性炎症或免疫球蛋白变化有关。', '偏低可能与营养不足、肝合成下降或蛋白丢失有关。', '建议结合白蛋白、球蛋白和医生意见判断。'],
    ['红细胞压积', ['HCT', '红细胞比容'], '血常规', '红细胞压积反映红细胞在血液中的体积分数。', '偏高可能与脱水、血液浓缩或缺氧相关因素有关。', '偏低可能与贫血、失血或稀释状态有关。', '建议结合红细胞和血红蛋白综合判断。'],
    ['中性粒细胞百分比', ['NEUT%', 'NEU%', '中性粒百分比'], '血常规', '中性粒细胞百分比用于观察白细胞分类构成。', '偏高可能与细菌感染、炎症或应激有关。', '偏低可能与病毒感染、药物或骨髓造血相关因素有关。', '建议结合白细胞总数、绝对值和症状判断。'],
    ['淋巴细胞百分比', ['LYMPH%', 'LYM%', '淋巴百分比'], '血常规', '淋巴细胞百分比用于观察免疫细胞分类构成。', '偏高可能与病毒感染恢复期或免疫相关变化有关。', '偏低可能与应激、感染或药物影响有关。', '建议结合白细胞总数和临床症状判断。'],
    ['中性粒细胞绝对值', ['NEUT#', 'NEU#', '中性粒细胞数'], '血常规', '中性粒细胞绝对值反映中性粒细胞实际数量。', '偏高可能与感染、炎症或应激有关。', '偏低可能增加感染风险，需要结合症状和复查结果。', '建议结合白细胞总数和医生意见判断。'],
    ['淋巴细胞绝对值', ['LYMPH#', 'LYM#', '淋巴细胞数'], '血常规', '淋巴细胞绝对值反映淋巴细胞实际数量。', '偏高可能与病毒感染或免疫相关变化有关。', '偏低可能与感染、药物或免疫状态有关。', '建议结合分类百分比和症状判断。'],
    ['钾', ['K', 'K+'], '电解质', '钾是维持神经肌肉和心脏电活动的重要电解质。', '偏高可能与肾排泄减少、标本溶血或用药有关。', '偏低可能与摄入不足、丢失增加或用药有关。', '钾异常需重视，建议结合症状、心电图和医生意见判断。'],
    ['钠', ['Na', 'Na+'], '电解质', '钠反映体液平衡和渗透压状态。', '偏高可能与脱水或水分摄入不足有关。', '偏低可能与水钠平衡异常、药物或内分泌因素有关。', '建议结合症状、饮水和医生意见判断。'],
    ['氯', ['Cl', 'Cl-'], '电解质', '氯与酸碱平衡和体液状态相关。', '偏高或偏低都需结合钠、钾和酸碱状态判断。', '偏低可能与呕吐、利尿剂或酸碱平衡变化有关。', '建议结合其他电解质综合判断。'],
    ['钙', ['Ca', 'Ca2+'], '电解质/骨代谢', '钙与骨代谢、肌肉收缩和神经传导相关。', '偏高可能与甲状旁腺、骨代谢或用药相关因素有关。', '偏低可能与维生素D、白蛋白或甲状旁腺相关因素有关。', '建议结合白蛋白、维生素D和医生意见判断。'],
    ['镁', ['Mg', 'Mg2+'], '电解质', '镁参与神经肌肉和多种酶反应。', '偏高可能与肾排泄减少或补充过量有关。', '偏低可能与摄入不足、胃肠丢失或用药有关。', '建议结合症状和其他电解质判断。'],
    ['磷', ['P', 'PHOS'], '电解质/骨代谢', '磷与骨代谢、能量代谢和肾功能相关。', '偏高可能与肾功能、甲状旁腺或饮食相关因素有关。', '偏低可能与营养、维生素D或代谢状态有关。', '建议结合钙、肾功能和医生意见判断。'],
    ['C反应蛋白', ['CRP'], '炎症相关', 'C反应蛋白是反映炎症反应的常用指标。', '偏高提示体内可能存在炎症、感染或组织损伤等情况。', '偏低通常提示未见明显炎症反应。', '建议结合症状、血常规和医生意见判断。'],
    ['超敏C反应蛋白', ['hs-CRP', 'hsCRP'], '炎症/心血管风险', '超敏C反应蛋白可用于观察低水平炎症和心血管风险相关状态。', '偏高可能与炎症、感染或心血管风险因素有关。', '偏低通常提示低水平炎症不明显。', '建议结合症状、血脂和医生意见综合判断。'],
    ['尿蛋白', ['PRO', '尿PRO'], '尿常规', '尿蛋白用于观察尿液中蛋白水平，可辅助评估肾脏滤过屏障。', '偏高可能与肾脏、泌尿系统或运动发热等因素有关。', '偏低或阴性通常提示该项暂无明显异常。', '建议结合尿沉渣、肾功能和复查结果判断。'],
    ['尿糖', ['GLU-U', '尿糖GLU'], '尿常规/糖代谢', '尿糖反映尿液中葡萄糖情况。', '阳性或偏高可能与血糖升高或肾糖阈变化有关。', '阴性通常提示尿糖暂无明显异常。', '建议结合血糖和糖化血红蛋白判断。'],
    ['尿酮体', ['KET'], '尿常规/代谢', '尿酮体反映脂肪分解代谢产物。', '阳性可能与饥饿、低碳饮食、呕吐或糖代谢异常有关。', '阴性通常提示该项暂无明显异常。', '建议结合血糖、饮食状态和医生意见判断。'],
    ['尿潜血', ['BLD', 'OB'], '尿常规', '尿潜血用于观察尿液中红细胞或血红蛋白相关反应。', '阳性可能与泌尿系统炎症、结石、月经污染或运动等因素有关。', '阴性通常提示该项暂无明显异常。', '建议结合尿沉渣和症状复查判断。'],
    ['尿白细胞', ['LEU'], '尿常规', '尿白细胞用于观察泌尿系统炎症相关情况。', '偏高或阳性可能与泌尿系统感染或标本污染有关。', '阴性通常提示白细胞暂无明显异常。', '建议结合尿亚硝酸盐、症状和医生意见判断。'],
    ['尿亚硝酸盐', ['NIT'], '尿常规', '尿亚硝酸盐可辅助提示部分细菌感染线索。', '阳性可能提示细菌相关尿路感染风险。', '阴性不能完全排除感染。', '建议结合尿白细胞、症状和尿培养判断。'],
    ['尿比重', ['SG'], '尿常规', '尿比重反映尿液浓缩和稀释情况。', '偏高可能与饮水少、脱水或尿液浓缩有关。', '偏低可能与饮水多或浓缩功能变化有关。', '建议结合饮水、肾功能和复查判断。'],
    ['尿pH', ['pH-U', '尿PH'], '尿常规', '尿pH反映尿液酸碱度。', '偏高可能与饮食、感染或标本因素有关。', '偏低可能与饮食结构或代谢状态有关。', '建议结合尿常规其他项目综合判断。'],
    ['促甲状腺激素', ['TSH'], '甲状腺功能', 'TSH 用于观察垂体-甲状腺轴调节状态。', '偏高可能提示甲状腺功能减退倾向或调节变化。', '偏低可能提示甲状腺功能亢进倾向或药物影响。', '建议结合 FT3、FT4、症状和医生意见判断。'],
    ['游离甲状腺素', ['FT4'], '甲状腺功能', 'FT4 反映游离甲状腺素水平。', '偏高可能与甲状腺功能亢进倾向或用药有关。', '偏低可能与甲状腺功能减退倾向有关。', '建议结合 TSH、FT3 和医生意见判断。'],
    ['游离三碘甲状腺原氨酸', ['FT3'], '甲状腺功能', 'FT3 反映游离三碘甲状腺原氨酸水平。', '偏高可能与甲状腺功能亢进倾向有关。', '偏低可能与甲状腺功能减退、非甲状腺疾病或营养状态有关。', '建议结合 TSH、FT4 和医生意见判断。']
  ];
  medicalEntries.forEach(([name, aliases, category, meaning, highMeaning, lowMeaning, suggestion]) => {
    if (!medicalItemDictionary.some(entry => entry.name === name)) {
      medicalItemDictionary.push({ name, aliases, category, meaning, highMeaning, lowMeaning, normalMeaning: '当前结果位于参考范围内，通常提示该指标暂无明显异常。', suggestion: `${suggestion} 参考范围以原报告为准，系统默认值仅用于辅助理解。` });
    }
  });
}

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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {})
        }
      });
      if (!response.ok) {
        const message = response.status === 401 ? '当前登录状态已失效，请重新登录后再试。'
          : response.status === 404 ? '未找到这份报告，请刷新后重试。'
          : response.status === 422 || response.status === 400 ? '报告信息不完整，请核对后重试。'
          : '后端暂时无法处理请求，请稍后重试。';
        throw new Error(message);
      }
      return response.status === 204 ? null : await response.json();
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('连接超时，请确认后端已启动后重试。');
      if (error instanceof TypeError) throw new Error('无法连接后端，请确认服务已启动。');
      throw error;
    } finally {
      clearTimeout(timer);
    }
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
  selectedReportId = '';
  selectedAiReportId = '';
  expandedAiReportId = '';
  overviewItemFilter = null;
  reportListFilters = createReportFilters();
  reportEditSession = null;
  Object.keys(aiInterpretationState).forEach(key => delete aiInterpretationState[key]);
  chatRequestVersion += 1;
  chatSending = false;
  return appConfig.dataMode;
}
async function loadReportsToState() {
  const version = ++reportsLoadVersion;
  const mode = appConfig.dataMode;
  appState.loading = true;
  appState.error = null;
  try {
    const reports = mode === 'api'
      ? normalizeReports(await reportService.listReportsAsync())
      : reportService.listReports();
    if (version !== reportsLoadVersion || mode !== appConfig.dataMode) return [];
    appState.reports = reports;
    appState.reportsLoaded = true;
    return appState.reports;
  } catch (error) {
    if (version !== reportsLoadVersion || mode !== appConfig.dataMode) return [];
    appState.error = error;
    appState.reports = [];
    appState.reportsLoaded = false;
    return [];
  } finally {
    if (version === reportsLoadVersion) appState.loading = false;
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
    date: report?.date || formatDateTime(new Date()).slice(0, 10),
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
    refSource: ['dictionary', 'manual', 'report', 'unknown'].includes(item?.refSource) ? item.refSource : item?.refSource ? 'unknown' : (defaults ? 'dictionary' : 'manual'),
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
  const exact = labReferenceDictionary.find(entry => {
    const names = [entry.name, ...(entry.aliases || [])].map(name => String(name).trim().toLowerCase());
    return names.includes(normalized);
  });
  if (exact) return exact.name;
  const found = labReferenceDictionary.find(entry => {
    const names = [entry.name, ...(entry.aliases || [])].map(name => String(name).trim().toLowerCase());
    return names.some(name => name.length >= 2 && normalized.length >= 2 && (normalized.includes(name) || name.includes(normalized)));
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
    time: message.time || formatDateTime(new Date()),
    source: message.source === 'ai' ? 'ai' : message.source === 'mock' ? 'mock' : ''
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
  addMessage(role, content, source = '') {
    return this.saveMessages([...this.listMessages(), { role, content, source, time: formatDateTime(new Date()) }]);
  },
  clearMessages() {
    localStorage.setItem(CHAT_KEY, JSON.stringify([]));
    return [];
  }
};
function getChatHistory() { return chatService.listMessages(); }
function saveChatHistory(messages) { return chatService.saveMessages(messages); }
function clearChatHistory() { return chatService.clearMessages(); }
function addChatMessage(role, content, source = '') { return chatService.addMessage(role, content, source); }
async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 15000) {
  if (typeof AbortController === 'undefined') {
    try {
      const response = await fetch(url, options);
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function callAiInterpretApi(report) {
  const normalizedReport = normalizeReport(report);
  const data = await fetchJsonWithTimeout(`${appConfig.apiBaseUrl}/api/ai/interpret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report: normalizedReport })
  });
  return data?.ok && data.result ? data.result : null;
}
async function callAiChatApi(question, report, chatHistory) {
  if (!report) return null;
  const data = await fetchJsonWithTimeout(`${appConfig.apiBaseUrl}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report: normalizeReport(report),
      question,
      messages: (chatHistory || []).map(message => ({ role: message.role, content: message.content }))
    })
  });
  return data?.ok && data.reply ? data.reply : null;
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
  const id = screens.some(screen => screen.id === rawId) ? rawId : 'overview';
  if (!canLeaveReportEditor(id)) return;
  if (id !== 'upload') cancelReportImport();
  if (id === 'overview' && getActiveScreenId() !== 'overview') overviewItemFilter = null;
  screens.forEach(s => { s.classList.toggle('active', s.id === id); if (s.id === id) s.scrollTop = 0; });
  navButtons.forEach(btn => {
    const target = btn.dataset.go;
    const active = target === id || (target === 'reports' && ['upload','report-detail'].includes(id)) || (target === 'ai-insights' && id === 'ai-insights');
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
  if (appConfig.dataMode === 'api' && !appState.reportsLoaded && !['upload'].includes(id)) {
    renderAppStatus(id, 'loading');
    await loadReportsToState();
  }
  if (getActiveScreenId() === id) render(id);
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

window.addEventListener?.('beforeunload', event => {
  if (!reportEditSession || getActiveScreenId() !== 'upload') return;
  if (reportEditSession.saving || isReportEditorDirty()) {
    event.preventDefault();
    event.returnValue = '';
  }
});

function getReportFormSnapshot(root = document.querySelector('#upload')) {
  return JSON.stringify({
    fields: Array.from(root.querySelectorAll('#report-form input, #report-form select')).map(input => [input.name, input.value]),
    sources: Array.from(root.querySelectorAll('#item-body tr')).map(row => row.dataset?.refSource)
  });
}
function isReportEditorDirty() {
  return Boolean(reportEditSession && getReportFormSnapshot() !== reportEditSession.snapshot);
}
function canLeaveReportEditor(targetScreen) {
  if (!reportEditSession || getActiveScreenId() !== 'upload' || targetScreen === 'upload') return true;
  if (reportEditSession.saving) { showNotice('正在保存报告，请稍候。'); return false; }
  if (isReportEditorDirty() && !confirm('修改尚未保存，确认放弃本次编辑？')) return false;
  reportEditSession = null;
  return true;
}
async function startReportEdit(reportId) {
  const report = getReports().find(item => item.id === reportId);
  if (!report) { showNotice('未找到这份报告，请刷新列表后重试。'); return; }
  reportEditSession = { report: normalizeReport(report), mode: appConfig.dataMode, saving: false, snapshot: '' };
  await showScreen('upload');
}

function topBar(title, back = '') {
  return `<header class="app-top">${back ? `<button class="icon-btn" data-go="${esc(back)}" aria-label="返回"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button>` : '<span></span>'}<h1>${esc(title)}</h1><span class="header-mark" aria-hidden="true">医检</span></header>${renderDataSource()}`;
}
function renderDataSource() {
  const api = appConfig.dataMode === 'api';
  return `<div class="data-source-strip"><span class="source-dot ${api ? 'api' : ''}"></span><span>${api ? 'API 数据' : '本地数据'}</span><small>${api ? '来自当前后端服务' : '仅保存在此浏览器'}</small><button data-go="profile" aria-label="管理数据模式">管理</button></div>`;
}
function renderEmptyState(message, actionText = '', actionTarget = '') {
  return `<article class="card empty-state"><p>${esc(message)}</p>${actionText ? `<button class="primary-btn" data-go="${esc(actionTarget)}">${esc(actionText)}</button>` : ''}</article>`;
}
function render(id) {
  document.getElementById(id)?.setAttribute('aria-busy', 'false');
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
  const root = document.getElementById(id);
  if (root && !root.querySelector('.data-source-strip')) root.querySelector('.app-top')?.insertAdjacentHTML('afterend', renderDataSource());
}
function renderAppStatus(id, type) {
  const root = document.querySelector(`#${id}`);
  if (!root) return;
  const loading = type === 'loading';
  const message = loading ? '正在从后端加载报告数据…' : '后端连接失败，请确认 FastAPI 服务已启动。';
  root.setAttribute('aria-busy', String(loading));
  root.innerHTML = `${topBar(root.dataset.title || '加载数据', 'overview')}<article class="card app-state-card ${type}" role="status">${loading ? '<span class="pdf-spinner" aria-hidden="true"></span>' : ''}<strong>${esc(message)}</strong><p>${loading ? '数据加载完成后将自动显示。' : '本地报告没有被覆盖，可以重试或切回本地模式。'}</p>${!loading ? '<button class="primary-btn" data-retry-reports>重新加载</button><button class="outline-btn" data-go="profile">管理数据模式</button>' : ''}</article>`;
  root.querySelector('[data-retry-reports]')?.addEventListener('click', async () => {
    renderAppStatus(id, 'loading');
    await loadReportsToState();
    if (getActiveScreenId() === id) { root.setAttribute('aria-busy', 'false'); render(id); }
  });
}
function renderOverview() {
  const root = document.querySelector('#overview');
  const { report, total, normal, abnormal } = getOverviewStats();
  const metricName = report?.items.some(item => item.name === '空腹血糖') ? '空腹血糖' : report?.items[0]?.name;
  const trend = metricName ? getTrendData(metricName) : [];
  const latest = trend.at(-1);
  const bad = getAbnormalItems(report).slice(0, 3);
  const currentPatient = report?.patient;
  root.innerHTML = `${topBar('检验概览')}
    <section class="daily-hero">
      <div><p>报告档案</p><h2>近期检查概览</h2></div>
      <button class="hero-filter" data-go="upload" aria-label="新增报告" title="新增报告"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
    </section>
    ${report ? `<article class="patient-card rich-card"><div class="avatar" aria-hidden="true">${esc(currentPatient.name.slice(0, 1))}</div><div><div class="patient-name">${esc(currentPatient.name)}<span class="age-pill">${esc(currentPatient.age)}岁</span></div><div class="patient-id">患者 ID ${esc(currentPatient.patientId)}</div></div><span class="patient-record-label">最新报告<br><strong>${esc(report.date)}</strong></span></article><div class="overview-caption"><span>${esc(report.reportType)}</span><span>${esc(report.hospital)}</span></div>` : ''}
    <div class="stats">${[['all', total, '总项目'], ['normal', normal, '正常'], ['abnormal', abnormal, '异常']].map(([filter, count, label]) => `<button class="card stat-card ${overviewItemFilter === filter ? 'active' : ''}" data-overview-filter="${filter}" aria-expanded="${overviewItemFilter === filter}" ${report ? '' : 'disabled'}><strong class="${filter === 'abnormal' ? 'red' : filter === 'normal' ? 'green' : ''}">${count}</strong><span>${label}<small aria-hidden="true">${overviewItemFilter === filter ? '−' : '+'}</small></span></button>`).join('')}</div>
    ${renderOverviewItemBreakdown(report, overviewItemFilter)}
    ${latest ? `<article class="card section-card trend-summary-card"><div class="section-head"><h2>趋势摘要</h2><button data-go="trends" data-item-name="${esc(metricName)}">查看趋势 →</button></div><div class="trend-summary-top"><div><div class="metric-label">${esc(metricName)} <small>${esc(latest.unit)}</small></div><div class="metric-value"><strong class="${latest.status === 'normal' ? 'green' : 'red'}">${esc(latest.value)}</strong><span class="badge ${latest.status}">${statusText(latest.status)}</span></div></div><div class="range-pill">参考 ${esc(latest.refText)}</div></div>${renderOverviewChart(trend)}</article>` : ''}
    ${report ? `<article class="card section-card"><div class="section-head"><h2>近期异常指标</h2><button data-go="reports">查看全部 ></button></div><div class="abnormal-list">${bad.length ? bad.map(i => `<button class="abnormal-row" data-go="trends" data-item-name="${esc(i.name)}"><strong>${esc(i.name)}</strong><span>${esc(formatValue(i))}</span><small class="badge ${i.status}">${statusText(i.status)}</small></button>`).join('') : '<div class="empty-state compact">当前最新报告未发现明显异常指标。</div>'}</div><button class="primary-btn" style="margin-top:16px" data-go="upload">＋ 上传新报告</button></article>` : renderEmptyState('暂无报告数据，请先上传或录入一份检验报告。', '上传新报告', 'upload')}`;
  bindOverviewStatsEvents(root, report);
}
function renderOverviewItemBreakdown(report, filter = 'abnormal') {
  if (!report || !filter) return '';
  const items = report.items.filter(item => filter === 'all' ? true : filter === 'normal' ? item.status === 'normal' : item.status !== 'normal');
  const title = filter === 'all' ? '全部项目' : filter === 'normal' ? '正常项目' : '异常项目';
  const highCount = report.items.filter(item => item.status === 'high').length;
  const lowCount = report.items.filter(item => item.status === 'low').length;
  return `<article class="card section-card overview-breakdown" id="overview-breakdown"><div class="section-head"><h2>${title}</h2><span>${items.length} 项</span></div>${filter === 'abnormal' ? `<p class="breakdown-note">偏高 ${highCount} 项 · 偏低 ${lowCount} 项</p>` : ''}<div class="overview-item-list">${items.length ? items.map((item, index) => renderOverviewBreakdownItem(item, index)).join('') : `<div class="empty-state compact">当前没有${title}。</div>`}</div>${filter === 'abnormal' && items.length ? `<button class="outline-btn" data-go="ai-insights" data-report-id="${esc(report.id)}">去 AI 解读</button>` : ''}</article>`;
}
function renderOverviewBreakdownItem(item, index) {
  return `<article class="overview-item-card" data-overview-item-index="${index}"><div class="overview-item-main"><div><strong>${esc(item.name)}</strong><p>${esc(formatValue(item))} · 参考 ${esc(formatRange(item))}</p></div><span class="status-badge ${item.status || 'unknown'}">${statusText(item.status)}</span></div><div class="lab-item-meta"><span class="ref-source-badge ${item.refSource || 'unknown'}">${refSourceText(item.refSource || 'unknown')}</span><button class="outline-btn explanation-toggle" type="button" data-overview-explain="${index}">查看解释</button></div><div class="explanation-panel" hidden></div></article>`;
}
function bindOverviewStatsEvents(root, report) {
  root.querySelectorAll('[data-overview-filter]').forEach(button => {
    button.onclick = () => {
      overviewItemFilter = overviewItemFilter === button.dataset.overviewFilter ? null : button.dataset.overviewFilter;
      renderOverview();
    };
  });
  root.querySelector('#overview-breakdown')?.addEventListener('click', event => {
    const button = event.target.closest('[data-overview-explain]');
    if (!button || !report) return;
    const index = Number(button.dataset.overviewExplain);
    const filteredItems = report.items.filter(item => overviewItemFilter === 'all' ? true : overviewItemFilter === 'normal' ? item.status === 'normal' : item.status !== 'normal');
    const item = filteredItems[index];
    const panel = button.closest('.overview-item-card')?.querySelector('.explanation-panel');
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
function renderUpload() {
  cancelReportImport();
  const root = document.querySelector('#upload');
  const today = formatDateTime(new Date()).slice(0, 10);
  const editing = reportEditSession?.mode === appConfig.dataMode ? reportEditSession : null;
  const report = editing?.report || { reportType: '生化检验', hospital: '市第一人民医院', date: today, items: [] };
  root.innerHTML = `${topBar(editing ? '编辑报告' : '上传报告', editing ? 'report-detail' : 'reports')}
    ${editing ? `<section class="edit-report-notice"><strong>${esc(report.patient.name)} · ${esc(report.patient.patientId)}</strong><p>修改后，旧 AI 解读将失效。请按原报告核对数据。</p></section>` : `
    <article class="card upload-hero pdf-upload-card"><div><div class="cloud"><svg viewBox="0 0 24 24"><path d="M12 19V9M8 13l4-4 4 4M20 17.5A4.5 4.5 0 0 0 15.5 13h-.7A6 6 0 1 0 5 17.5"/></svg></div><h2>上传报告文件</h2><p>支持 PDF、PNG、JPG、WebP<br>扫描件与图片型 PDF 使用本地 OCR 识别</p><button class="primary-btn" id="choose-file" type="button" style="width:148px;min-height:40px">选择 PDF / 图片</button><input id="pdf-file-input" type="file" accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" hidden><label class="ocr-mode-option"><input type="checkbox" id="force-ocr">使用图片识别（OCR）重试文字缺失的 PDF</label><p class="ocr-privacy-note">原文件仅在浏览器内处理，不上传服务器。最多 20MB / 10 页；识别后必须核对，确认保存才会写入当前数据源。</p></div></article>
    <article class="card paste-parse-card"><h2>粘贴报告文本解析</h2><p>可把文本型 PDF 中复制出的报告内容粘贴到这里，使用同一套解析规则生成预览。</p><textarea id="paste-report-text" rows="7" placeholder="例如：GLU 7.4 mmol/L 3.9-6.1"></textarea><button class="outline-btn" id="parse-pasted-text" type="button">解析粘贴文本</button><div class="form-message" id="paste-parse-message" aria-live="polite"></div></article>
    <section id="pdf-preview-root"></section>`}
    <form id="report-form" novalidate><article class="card form-card"><h2>报告基本信息</h2>
      <div class="field-row"><label for="entry-report-type">报告类型</label><span class="input-wrap"><input id="entry-report-type" name="reportType" list="report-types" value="${esc(report.reportType)}" maxlength="100"><datalist id="report-types"><option>生化检验</option><option>血常规</option><option>尿常规</option><option>检验报告</option></datalist></span></div>
      <div class="field-row"><label for="entry-hospital">医院名称</label><span class="input-wrap"><input id="entry-hospital" name="hospital" value="${esc(report.hospital)}" maxlength="200"></span></div>
      <div class="field-row"><label for="entry-date">报告日期</label><span class="input-wrap"><input id="entry-date" name="date" type="date" value="${esc(report.date)}"></span></div></article>
    <article class="card form-card"><div class="section-head"><h2>检验项目</h2><button id="add-item" type="button">添加项目 ></button></div><p class="reference-note upload-note">参考范围以原报告为准，系统默认值仅用于辅助录入。</p><table class="item-table upload-item-table"><thead><tr><th>项目名称</th><th>数值</th><th>单位</th><th>参考下限</th><th>参考上限</th><th>来源</th><th>操作</th></tr></thead><tbody id="item-body"></tbody></table><button class="outline-btn" id="add-item-wide" type="button" style="width:100%;margin-top:12px">＋ 添加检验项目</button><div class="form-message" id="upload-message" aria-live="polite"></div></article>
    <div class="report-save-actions ${editing ? 'editing' : ''}">${editing ? '<button class="outline-btn" type="button" data-go="report-detail">取消编辑</button>' : ''}<button class="primary-btn" type="submit">${editing ? '保存修改' : '保存报告'}</button></div></form>`;
  const body = root.querySelector('#item-body');
  (report.items.length ? report.items : [{}]).forEach(item => body.append(createEmptyLabItemForm(item)));
  if (editing) editing.snapshot = getReportFormSnapshot(root);
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
  tr.dataset.referenceName = normalizeLabItemName(item.name || '');
  tr.dataset.refText = item.refText || defaults?.refText || '';
  tr.dataset.initialRefLow = String(refLow);
  tr.dataset.initialRefHigh = String(refHigh);
  tr.innerHTML = `<td><input name="itemName" aria-label="项目名称" value="${esc(item.name || '')}" placeholder="项目/缩写"></td><td><input name="itemValue" aria-label="数值" value="${esc(item.value ?? '')}" type="number" step="any" placeholder="数值"></td><td><input name="itemUnit" aria-label="单位" value="${esc(item.unit || defaults?.unit || '')}" placeholder="单位"></td><td><input name="itemRefLow" aria-label="参考下限" value="${esc(refLow)}" type="number" step="any" placeholder="下限"></td><td><input name="itemRefHigh" aria-label="参考上限" value="${esc(refHigh)}" type="number" step="any" placeholder="上限"></td><td><span class="ref-source-badge ${refSource}">${refSourceText(refSource)}</span></td><td><button class="trash" type="button" aria-label="删除此项目" data-upload-action="delete-item">⌫</button></td>`;
  return tr;
}
function bindUploadEvents(root) {
  const body = root.querySelector('#item-body');
  const message = root.querySelector('#upload-message');
  const addRow = () => body.append(createEmptyLabItemForm());
  const chooseFile = root.querySelector('#choose-file');
  if (chooseFile) chooseFile.onclick = () => root.querySelector('#pdf-file-input').click();
  const fileInput = root.querySelector('#pdf-file-input');
  if (fileInput) fileInput.onchange = event => {
    const file = event.target.files?.[0];
    if (file) handlePdfUpload(file, root);
    event.target.value = '';
  };
  const pasteButton = root.querySelector('#parse-pasted-text');
  if (pasteButton) pasteButton.onclick = () => { cancelReportImport(); handlePastedTextParse(root); };
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
    const submit = event.currentTarget.querySelector('[type="submit"]');
    if (submit.disabled) return;
    const editing = reportEditSession;
    const result = collectUploadFormData(root);
    if (result.errors.length) {
      showUploadMessage(message, result.errors[0], 'error');
      return;
    }
    submit.disabled = true;
    submit.textContent = '正在保存…';
    const inputs = Array.from(root.querySelectorAll('#report-form input, #report-form button'));
    inputs.forEach(input => { input.disabled = true; });
    if (editing) editing.saving = true;
    try {
      const saved = editing ? await saveEditedReport(result.report, editing) : await saveUploadedReport(result.report);
      selectedReportId = saved.id;
      setStoredSelectedReportId(selectedReportId);
      selectedTrendItem = saved.items[0]?.name || selectedTrendItem;
      if (editing) {
        reportEditSession = null;
        await showScreen('report-detail');
        showNotice('报告已更新');
      } else {
        showUploadMessage(message, '报告保存成功', 'success');
        setTimeout(() => { if (getActiveScreenId() === 'upload') showScreen('overview'); }, 600);
      }
    } catch (error) {
      showUploadMessage(message, `保存失败：${error.message}`, 'error');
      inputs.forEach(input => { input.disabled = false; });
      submit.textContent = editing ? '保存修改' : '保存报告';
    } finally {
      if (editing) editing.saving = false;
    }
  };
}
function applyReferenceDefaults(row, shouldNormalize) {
  if (!row) return;
  const nameInput = row.querySelector('[name="itemName"]');
  const unitInput = row.querySelector('[name="itemUnit"]');
  const lowInput = row.querySelector('[name="itemRefLow"]');
  const highInput = row.querySelector('[name="itemRefHigh"]');
  const canonicalName = normalizeLabItemName(nameInput.value);
  if (shouldNormalize) nameInput.value = canonicalName;
  // Blurring an unchanged name must not replace the report's own reference range.
  if (canonicalName === row.dataset.referenceName) return;
  row.dataset.referenceName = canonicalName;
  const defaults = getDefaultReferenceRange(canonicalName);
  if (!defaults) {
    setRowRefSource(row, 'unknown');
    return;
  }
  unitInput.value = defaults.unit;
  lowInput.value = defaults.refLow;
  highInput.value = defaults.refHigh;
  row.dataset.refText = defaults.refText;
  row.dataset.initialRefLow = String(defaults.refLow);
  row.dataset.initialRefHigh = String(defaults.refHigh);
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
    const source = ['dictionary', 'report', 'manual'].includes(row.dataset.refSource)
      ? row.dataset.refSource : reportEditSession && row.dataset.refSource === 'unknown' ? 'unknown' : 'manual';
    const sameBounds = refLow === Number(row.dataset.initialRefLow) && refHigh === Number(row.dataset.initialRefHigh);
    const refText = sameBounds && row.dataset.refText ? row.dataset.refText : `${refLow}–${refHigh}`;
    return { name: normalizeLabItemName(nameRaw), value, unit, refLow, refHigh, refText, refSource: source, status: calculateItemStatus(value, refLow, refHigh) };
  }).filter(Boolean);
  const report = { id: reportEditSession?.report.id || `r${Date.now()}`, patient: reportEditSession?.report.patient || patient, reportType: form.reportType.value.trim(), hospital: form.hospital.value.trim(), date: form.date.value, items };
  errors.push(...validateUploadForm(report));
  return { report, errors };
}
function validateUploadForm(report) {
  const errors = [];
  if (!report.reportType) errors.push('请填写报告类型');
  if (!report.hospital) errors.push('请填写医院名称');
  if (!report.date) errors.push('请选择报告日期');
  else if (!isValidReportDate(report.date)) errors.push('报告日期格式不正确，请重新选择');
  if (!report.items.length) errors.push('请至少填写一个完整检验项目');
  report.items.forEach((item, index) => {
    if (!item.name || !item.unit || !Number.isFinite(item.value) || !Number.isFinite(item.refLow) || !Number.isFinite(item.refHigh)) errors.push(`第 ${index + 1} 个检验项目未填写完整`);
    if (Number.isFinite(item.refLow) && Number.isFinite(item.refHigh) && item.refLow > item.refHigh) errors.push(`第 ${index + 1} 个检验项目参考下限不能大于上限`);
  });
  return errors;
}
function isValidReportDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function invalidateReportInterpretation(report) {
  aiInterpretationState[report.id] = { loading: false, error: '', source: 'mock', invalidated: true, result: generateAiInterpretation(report) };
  // Pending replies may have read the old report; do not append them after an edit.
  chatRequestVersion += 1;
  chatSending = false;
  selectedTrendPointKey = '';
}
async function saveEditedReport(report, session = reportEditSession) {
  if (!session || session.mode !== appConfig.dataMode) throw new Error('数据来源已变化，请重新打开报告后编辑。');
  const errors = validateUploadForm(report);
  if (errors.length) throw new Error(errors[0]);
  if (!getReports().some(item => item.id === session.report.id)) throw new Error('原报告已不存在，请返回列表刷新。');
  const next = normalizeReport({ ...report, id: session.report.id, patient: session.report.patient });
  if (JSON.stringify(next) === JSON.stringify(normalizeReport(session.report))) return next;
  const saved = await reportService.updateReportAsync(next.id, next);
  if (!saved) throw new Error('原报告已不存在，请返回列表刷新。');
  if (session.mode === appConfig.dataMode) {
    if (session.mode === 'api') {
      reportsLoadVersion += 1;
      appState.loading = false;
      appState.reports = appState.reports.map(item => item.id === saved.id ? saved : item);
      appState.reportsLoaded = true;
      appState.error = null;
    }
    invalidateReportInterpretation(saved);
  }
  return saved;
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
function isReportImage(file) {
  return /^image\/(png|jpeg|webp)$/i.test(file?.type || '') || /\.(png|jpe?g|webp)$/i.test(file?.name || '');
}
function validateReportFile(file) {
  if (!isPdfFile(file) && !isReportImage(file)) return '请上传 PDF、PNG、JPG 或 WebP 文件。';
  if (!file.size) return '文件为空，请重新选择报告。';
  if (file.size > 20 * 1024 * 1024) return '文件超过 20MB，请压缩或拆分后重试。';
  return '';
}
function cancelReportImport(showMessage = false) {
  const job = activeReportImport;
  if (!job) return;
  activeReportImport = null;
  job.cancelled = true;
  job.renderTask?.cancel();
  if (job.loadingTask) void job.loadingTask.destroy().catch(() => {});
  if (job.ocr) void job.ocr.close();
  const button = job.root.querySelector('#choose-file');
  if (button) button.disabled = false;
  if (showMessage) job.preview.innerHTML = '<article class="card pdf-error-message"><strong>已取消识别</strong><p>可以重新选择文件，或继续手动录入。</p></article>';
}
function importIsCurrent(job) {
  return activeReportImport === job && !job.cancelled && job.root.isConnected !== false && job.root.querySelector('#pdf-preview-root') === job.preview;
}
function renderExtractedReport(root, extracted) {
  const parsed = parsePdfReportText(extracted.text);
  parsed.source = extracted;
  parsed.confidence = calculatePdfParseConfidence(parsed);
  if (!parsed.items.length) {
    if (extracted.ocr) renderOcrTextReview(root, extracted);
    else renderPdfError(root, '未能自动识别检验项目，请检查文本或勾选图片识别重试。');
    return;
  }
  renderPdfPreview(root, parsed);
}
function renderOcrTextReview(root, extracted) {
  root.innerHTML = `<article class="card pdf-error-message"><strong>未能整理出检验项目</strong><p>已提取部分文字，请对照原件修正后重新解析，或改为手动录入。</p>${renderOcrTextEditor(extracted)}<button class="outline-btn" type="button" data-pdf-clear>改为手动录入</button></article>`;
  bindOcrTextEditor(root, extracted);
  root.querySelector('.ocr-text-review').open = true;
  root.querySelector('[data-pdf-clear]').onclick = () => root.replaceChildren();
}
function renderOcrTextEditor(extracted) {
  return `<details class="ocr-text-review"><summary>查看 / 修正 OCR 文字</summary><label>识别出的报告文字<textarea data-ocr-text rows="9" spellcheck="false">${esc(extracted.text)}</textarea></label><button class="outline-btn" type="button" data-ocr-reparse>重新解析文字</button></details>`;
}
function bindOcrTextEditor(root, extracted) {
  root.querySelector('[data-ocr-reparse]')?.addEventListener('click', () => {
    renderExtractedReport(root, { ...extracted, text: root.querySelector('[data-ocr-text]').value, edited: true });
  });
}
async function handlePdfUpload(file, root = document.querySelector('#upload')) {
  cancelReportImport();
  const previewRoot = root.querySelector('#pdf-preview-root');
  const validation = validateReportFile(file);
  if (validation) { renderPdfError(previewRoot, validation); return; }
  if (window.location?.protocol === 'file:') { renderPdfError(previewRoot, '请通过 http://localhost:8088 打开应用，不能直接双击 HTML 进行识别。'); return; }
  const job = { root, preview: previewRoot, cancelled: false, page: 1, ocr: null, loadingTask: null, renderTask: null };
  activeReportImport = job;
  const onStatus = message => {
    if (!importIsCurrent(job)) return;
    renderPdfStatus(previewRoot, message);
    const card = previewRoot.querySelector('.pdf-parse-status');
    const cancel = document.createElement('button');
    cancel.className = 'outline-btn'; cancel.type = 'button'; cancel.textContent = '取消';
    cancel.onclick = () => cancelReportImport(true);
    card.append(cancel);
  };
  if (window.MedicalOcr) job.ocr = window.MedicalOcr.createSession(event => {
    onStatus(event.status === 'recognizing text' ? `正在 OCR 识别第 ${job.page} 页 · ${Math.round((event.progress || 0) * 100)}%` : '正在加载本地 OCR 引擎和中英文语言包…');
  });
  const choose = root.querySelector('#choose-file');
  if (choose) choose.disabled = true;
  try {
    onStatus(isPdfFile(file) ? '正在读取 PDF' : '正在读取报告图片');
    let extracted;
    if (isPdfFile(file)) {
      extracted = await extractTextFromPdfFile(file, onStatus, {
        ocr: job.ocr, forceOcr: Boolean(root.querySelector('#force-ocr')?.checked),
        check: () => { if (!importIsCurrent(job)) throw new DOMException('已取消', 'AbortError'); },
        onPage: number => { job.page = number; }, onLoadingTask: task => { job.loadingTask = task; },
        onRenderTask: task => { job.renderTask = task; }
      });
    } else {
      if (!job.ocr) throw new Error('OCR_MODULE_UNAVAILABLE');
      const canvas = await window.MedicalOcr.imageToCanvas(file, job.ocr);
      try {
        const recognized = await job.ocr.recognize(canvas);
        extracted = { ok: Boolean(recognized.text.trim()), type: 'ocr-image', ocr: true, text: recognized.text, pages: [{ pageNumber: 1, method: 'ocr', ...recognized }], pageCount: 1 };
      } finally { canvas.width = 0; canvas.height = 0; }
    }
    if (!importIsCurrent(job)) return;
    if (!extracted.ok) {
      renderPdfError(previewRoot, extracted.message || '未识别到有效文字。请使用清晰、正向的原件图片，或改为手动录入。');
      return;
    }
    renderExtractedReport(previewRoot, extracted);
  } catch (error) {
    if (!importIsCurrent(job)) return;
    const message = error.name === 'OcrError' ? error.message : '报告识别失败，请检查本地 OCR 资源，或使用清晰的 PNG / JPG 文件重试。';
    renderPdfError(previewRoot, message);
    const retry = document.createElement('button');
    retry.className = 'outline-btn'; retry.type = 'button'; retry.textContent = '重新识别';
    retry.onclick = () => handlePdfUpload(file, root);
    previewRoot.querySelector('.pdf-error-message').append(retry);
  } finally {
    if (job.ocr) await job.ocr.close();
    if (activeReportImport === job) { activeReportImport = null; if (choose) choose.disabled = false; }
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
async function extractTextFromPdfFile(file, onStatus = () => {}, options = {}) {
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
  const openDocument = config => {
    options.check?.();
    const task = pdfjsLib.getDocument({ ...config, data: data.slice(0) });
    options.onLoadingTask?.(task);
    return task.promise;
  };
  try {
    pdf = await openDocument(pdfDocumentOptions);
  } catch (error) {
    options.check?.();
    console.warn('PDF.js worker 解析失败，切换到本地无 worker 模式。', error);
    try {
      pdf = await openDocument({ ...pdfDocumentOptions, disableWorker: true });
    } catch (fallbackError) {
      options.check?.();
      console.warn('PDF 字体映射资源加载失败，继续尝试提取已有文本。', fallbackError);
      onStatus('PDF 字体映射资源加载失败，正在尝试提取已有文本');
      pdf = await openDocument({ disableWorker: true });
    }
  }
  try {
    if (pdf.numPages > 10) return { ok: false, reason: 'page_limit', message: '单次最多处理 10 页 PDF，请拆分文件后重试，不会保存部分页面。' };
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      options.check?.();
      options.onPage?.(pageNumber);
      onStatus(`正在提取第 ${pageNumber} / ${pdf.numPages} 页文字`);
      const page = await pdf.getPage(pageNumber);
      try {
        let text = '';
        try { text = groupTextItemsIntoLines((await page.getTextContent()).items); }
        catch (error) { if (!options.ocr) throw error; }
        options.check?.();
        const useOcr = options.ocr && (options.forceOcr || !parseLabItemsFromText(text).items.length);
        if (useOcr) {
          onStatus(`正在准备第 ${pageNumber} / ${pdf.numPages} 页 OCR`);
          const base = page.getViewport({ scale: 1 });
          const size = window.MedicalOcr.fitDimensions(base.width, base.height, 3);
          const viewport = page.getViewport({ scale: size.scale });
          const canvas = document.createElement('canvas');
          canvas.width = size.width; canvas.height = size.height;
          try {
            const canvasContext = canvas.getContext('2d');
            if (!canvasContext) throw new Error('CANVAS_UNAVAILABLE');
            const task = page.render({ canvasContext, viewport, background: '#ffffff' });
            options.onRenderTask?.(task);
            await task.promise;
            options.check?.();
            const recognized = await options.ocr.recognize(canvas);
            pages.push({ pageNumber, method: 'ocr', ...recognized });
          } finally { canvas.width = 0; canvas.height = 0; options.onRenderTask?.(null); }
        } else pages.push({ pageNumber, method: 'text', text });
      } finally { page.cleanup?.(); }
    }
    options.check?.();
    const text = normalizePdfText(pages.map(page => page.text).join('\n'));
    const ocr = pages.some(page => page.method === 'ocr');
    const result = { ok: Boolean(text.trim()), text, pages, pageCount: pdf.numPages, ocr, type: ocr ? 'ocr-pdf' : 'pdf', unreadablePages: pages.filter(page => !page.text.trim()).map(page => page.pageNumber) };
    if (!result.ok) return { ...result, reason: 'no_text', message: options.ocr ? '未识别到有效文字，请使用清晰、正向的扫描文件或手动录入。' : '未提取到可复制文字，请使用 OCR 识别或手动录入。' };
    return result;
  } finally { await pdf.destroy?.(); }
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
  const today = formatDateTime(new Date()).slice(0, 10);
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
    date: parsedResult.date || formatDateTime(new Date()).slice(0, 10),
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
  const rows = (parsed.items || []).map((item, index) => `<tr class="parsed-item-row" data-ref-source="${esc(item.refSource || 'unknown')}" data-ref-text="${esc(item.refText || '')}" data-ref-low="${esc(item.refLow)}" data-ref-high="${esc(item.refHigh)}">
    <td><input name="pdfItemName" value="${esc(item.name)}" aria-label="项目名称 ${index + 1}"></td>
    <td><input name="pdfItemValue" type="number" step="0.01" value="${esc(item.value)}" aria-label="数值 ${index + 1}"></td>
    <td><input name="pdfItemUnit" value="${esc(item.unit || '')}" aria-label="单位 ${index + 1}"></td>
    <td><input name="pdfItemRefLow" type="number" step="0.01" value="${esc(item.refLow)}" aria-label="参考下限 ${index + 1}"></td>
    <td><input name="pdfItemRefHigh" type="number" step="0.01" value="${esc(item.refHigh)}" aria-label="参考上限 ${index + 1}"></td>
    <td><span class="ref-source-badge ${esc(item.refSource || 'unknown')}">${refSourceText(item.refSource || 'unknown')}</span>${parsed.source?.ocr && getDefaultReferenceRange(item.name)?.unit && normalizeParsedUnit(item.unit) !== normalizeParsedUnit(getDefaultReferenceRange(item.name).unit) ? '<small class="ocr-unit-warning">单位与常用单位不同，请核对原件</small>' : ''}</td>
  </tr>`).join('');
  root.innerHTML = `<article class="card pdf-preview-card">
    <div class="pdf-preview-head">
      <div><h2>${parsed.source?.ocr ? 'OCR 解析结果预览' : 'PDF 解析结果预览'}</h2><p>请核对并编辑解析结果，确认后才会保存到报告列表。</p></div>
      <span class="pdf-confidence-badge ${confidence.level}">${parsed.source?.ocr ? '字段完整度 ' : ''}${Math.round(confidence.score * 100)}% · ${parsed.source?.ocr ? '不代表识别准确率' : confidence.message}</span>
    </div>
    ${parsed.source?.ocr ? `<p class="ocr-review-warning">OCR 可能误识别小数点、数字、单位和参考范围，不能据此直接判断健康状况。患者和日期等未识别字段可能使用默认值，也请对照原件核对。${parsed.source.unreadablePages?.length ? `第 ${esc(parsed.source.unreadablePages.join('、'))} 页未识别出文字，请确认是否遗漏项目。` : '请逐项核对后保存。'}</p>` : ''}
    <div class="pdf-meta-grid">
      <label>报告类型<input name="pdfReportType" value="${esc(parsed.reportType || '检验报告')}"></label>
      <label>医院名称<input name="pdfHospital" value="${esc(parsed.hospital || '未知机构')}"></label>
      <label>报告日期<input name="pdfDate" type="date" value="${esc(parsed.date || formatDateTime(new Date()).slice(0, 10))}"></label>
      <label>患者姓名<input name="pdfPatientName" value="${esc(parsed.patient?.name || patient.name)}"></label>
      <label>患者年龄<input name="pdfPatientAge" type="number" value="${esc(parsed.patient?.age ?? patient.age)}"></label>
      <label>患者 ID<input name="pdfPatientId" value="${esc(parsed.patient?.patientId || patient.patientId)}"></label>
    </div>
    <p class="reference-note">参考范围以原报告为准，系统默认值仅用于辅助录入。</p>
    <div class="pdf-preview-table-wrap"><table class="pdf-preview-table"><thead><tr><th>项目</th><th>数值</th><th>单位</th><th>下限</th><th>上限</th><th>来源</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${renderParseDebugDetails(parsed, confidence)}
    ${parsed.source?.ocr ? renderOcrTextEditor(parsed.source) : ''}
    ${parsed.unmatchedLines?.length ? `<details class="pdf-unmatched-lines"><summary>未识别文本 ${parsed.unmatchedLines.length} 行</summary><pre>${esc(parsed.unmatchedLines.slice(0, 40).join('\n'))}</pre></details>` : ''}
    ${parsed.source?.ocr ? '<label class="ocr-verification"><input type="checkbox" data-ocr-verified>我已对照原件核对数值、小数点、单位和参考范围</label>' : ''}
    <div class="pdf-preview-actions"><button class="outline-btn" type="button" data-pdf-discard>放弃解析结果，改为手动录入</button><button class="primary-btn" type="button" data-pdf-save>确认保存解析结果</button></div>
    <div class="form-message" data-pdf-message aria-live="polite"></div>
  </article>`;
  bindPdfPreviewEvents(root);
  if (parsed.source?.ocr) bindOcrTextEditor(root, parsed.source);
}
function renderParseDebugDetails(parsed, confidence = calculatePdfParseConfidence(parsed)) {
  const rawText = parsed.rawText || parsed.source?.text || '';
  const lines = normalizePdfText(rawText).split('\n').filter(Boolean);
  const items = parsed.items || [];
  const countBySource = source => items.filter(item => item.refSource === source).length;
  const sourceLabel = parsed.source?.type === 'paste' ? '粘贴文本' : parsed.source?.type === 'ocr-image' ? '报告图片 · 本地 OCR' : `PDF ${parsed.source?.pageCount || 0} 页${parsed.source?.ocr ? ' · 含 OCR' : ''}`;
  const ocrPages = (parsed.source?.pages || []).filter(page => page.method === 'ocr');
  const confidences = ocrPages.map(page => page.confidence).filter(Number.isFinite);
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
      ${ocrPages.length ? `<span>OCR 页面</span><strong>${ocrPages.length} 页</strong><span>引擎字符置信度（非医学准确率）</span><strong>${confidences.length ? `${Math.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length)}%` : '暂无'}</strong>` : ''}
    </div>
    <div class="pdf-debug-lines"><strong>unmatchedLines</strong><pre>${esc((parsed.unmatchedLines || []).join('\n') || '无')}</pre></div>
  </details>`;
}
function bindPdfPreviewEvents(root) {
  const verified = root.querySelector('[data-ocr-verified]');
  root.oninput = event => { if (verified && event.target !== verified) verified.checked = false; };
  root.querySelectorAll('[name="pdfItemUnit"], [name="pdfItemRefLow"], [name="pdfItemRefHigh"]').forEach(input => {
    input.addEventListener('input', () => {
      const row = input.closest('tr');
      row.dataset.refSource = 'manual';
      const badge = row.querySelector('.ref-source-badge');
      badge.className = 'ref-source-badge manual';
      badge.textContent = refSourceText('manual');
      const warning = row.querySelector('.ocr-unit-warning');
      if (warning) {
        const defaults = getDefaultReferenceRange(row.querySelector('[name="pdfItemName"]').value);
        warning.hidden = normalizeParsedUnit(row.querySelector('[name="pdfItemUnit"]').value) === normalizeParsedUnit(defaults?.unit);
      }
    });
  });
  root.querySelectorAll('[name="pdfItemName"]').forEach(input => {
    input.addEventListener('blur', () => {
      input.value = normalizeLabItemName(input.value);
    });
  });
  root.querySelector('[data-pdf-discard]').onclick = () => root.replaceChildren();
  root.querySelector('[data-pdf-save]').onclick = async () => {
    const submit = root.querySelector('[data-pdf-save]');
    if (submit.disabled) return;
    const message = root.querySelector('[data-pdf-message]');
    if (verified && !verified.checked) {
      showUploadMessage(message, '请先对照原件核对 OCR 结果，并勾选核对确认。', 'error');
      verified.focus();
      return;
    }
    const result = collectParsedPdfPreview(root);
    if (result.errors.length) {
      showUploadMessage(message, result.errors[0], 'error');
      return;
    }
    submit.disabled = true;
    submit.textContent = '正在保存…';
    try {
      const saved = await saveUploadedReport(result.report);
      selectedReportId = saved.id;
      selectedTrendItem = saved.items[0]?.name || selectedTrendItem;
      setStoredSelectedReportId(selectedReportId);
      showUploadMessage(message, '报告保存成功', 'success');
      setTimeout(() => { if (getActiveScreenId() === 'upload') showScreen('overview'); }, 600);
    } catch (error) {
      showUploadMessage(message, `保存失败：${error.message}`, 'error');
      submit.disabled = false;
      submit.textContent = '确认保存解析结果';
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
    const unchangedBounds = lowRaw === row.dataset.refLow && highRaw === row.dataset.refHigh;
    const refText = unchangedBounds && row.dataset.refText ? row.dataset.refText : `${refLow}–${refHigh}`;
    return { name, value, unit, refLow, refHigh, refText, refSource, status: calculateItemStatus(value, refLow, refHigh) };
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
function getReportFilterError(filters) {
  if ((filters.startDate && !isValidReportDate(filters.startDate)) || (filters.endDate && !isValidReportDate(filters.endDate))) return '请选择有效的报告日期。';
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) return '开始日期不能晚于结束日期。';
  return '';
}
function filterReports(reports, filters = reportListFilters) {
  if (getReportFilterError(filters)) return [];
  const tokens = String(filters.search || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  return reports.filter(report => {
    if (filters.reportType && report.reportType !== filters.reportType) return false;
    if (filters.startDate && report.date < filters.startDate) return false;
    if (filters.endDate && report.date > filters.endDate) return false;
    const abnormal = getAbnormalItems(report).length;
    if (filters.status === 'abnormal' && abnormal === 0) return false;
    if (filters.status === 'normal' && (!report.items.length || abnormal > 0)) return false;
    const itemNames = report.items.flatMap(item => {
      const entry = labReferenceDictionary.find(candidate => candidate.name === normalizeLabItemName(item.name));
      return [item.name, ...(entry?.aliases || [])];
    });
    const searchable = [report.hospital, report.reportType, report.date, ...itemNames].join(' ').toLowerCase();
    return tokens.every(token => searchable.includes(token));
  }).sort((a, b) => b.date.localeCompare(a.date));
}
function renderReportListCard(report) {
  const count = getAbnormalItems(report).length;
  return `<article class="card report-card"><div class="report-title"><div class="flask-icon" aria-hidden="true">⚗</div><div><h2>${esc(report.reportType)}</h2><p>${esc(report.hospital)}</p></div><div class="report-date">${esc(report.date)}</div></div>
    <div class="report-count-row"><span>总项目 ${report.items.length} 项</span><span class="status-badge ${count ? 'high' : 'normal'}">${report.items.length ? `异常 ${count} 项` : '暂无检验项目'}</span></div>
    <div class="report-actions"><button class="outline-btn" data-go="report-detail" data-report-id="${esc(report.id)}">查看详情</button><button class="outline-btn" data-go="ai-insights" data-report-id="${esc(report.id)}">AI 解读</button><button class="outline-btn" data-go="trends" data-item-name="${esc(report.items[0]?.name || '')}">趋势分析</button></div></article>`;
}
function renderReportSearchResults(reports) {
  const error = getReportFilterError(reportListFilters);
  if (error) return `<div class="report-filter-error" role="alert">${esc(error)}</div>`;
  if (!reports.length) return renderEmptyState('暂无报告数据，请先上传或录入一份检验报告。', '上传新报告', 'upload');
  const filtered = filterReports(reports);
  return `<p class="report-result-count" role="status">显示 ${filtered.length} 份 / 共 ${reports.length} 份报告</p>${filtered.length ? `<div class="report-list">${filtered.map(renderReportListCard).join('')}</div>` : '<section class="report-search-empty"><h2>没有匹配的报告</h2><p>试试其他关键词，或调整日期与状态筛选。</p><button class="outline-btn" type="button" data-reset-report-filters>重置搜索与筛选</button></section>'}`;
}
function renderReports() {
  const root = document.querySelector('#reports');
  const reports = getReports();
  const types = [...new Set([...reports.map(report => report.reportType), reportListFilters.reportType].filter(Boolean))];
  root.innerHTML = `${topBar('报告列表')}
    <form class="report-filter-form" id="report-filter-form" role="search" novalidate>
      <div class="report-search-field"><input name="search" aria-label="搜索报告" placeholder="搜索医院、类型或检验项目" value="${esc(reportListFilters.search)}" enterkeyhint="search" autocomplete="off"><button type="button" class="report-search-clear" data-clear-report-search aria-label="清空搜索" title="清空搜索" ${reportListFilters.search ? '' : 'hidden'}>×</button><button class="report-search-submit" type="submit">搜索</button></div>
      <details class="report-filter-details"><summary>筛选条件</summary><div class="report-filter-grid">
        <label>报告类型<select name="reportType"><option value="">全部类型</option>${types.map(type => `<option value="${esc(type)}" ${type === reportListFilters.reportType ? 'selected' : ''}>${esc(type)}</option>`).join('')}</select></label>
        <label>指标状态<select name="status"><option value="">全部状态</option><option value="abnormal" ${reportListFilters.status === 'abnormal' ? 'selected' : ''}>有异常</option><option value="normal" ${reportListFilters.status === 'normal' ? 'selected' : ''}>未见异常</option></select></label>
        <label>开始日期<input type="date" name="startDate" value="${esc(reportListFilters.startDate)}"></label><label>结束日期<input type="date" name="endDate" value="${esc(reportListFilters.endDate)}"></label>
      </div></details><div class="report-filter-footer"><span data-filter-summary>${esc(reportFilterSummary())}</span><button type="button" data-reset-report-filters>重置</button></div>
    </form><div id="report-results">${renderReportSearchResults(reports)}</div><button class="float-add" data-go="upload" aria-label="新增报告" title="新增报告">＋</button>`;
  bindReportSearchEvents(root);
}
function reportFilterSummary() {
  const count = Object.values(reportListFilters).filter(value => String(value).trim()).length;
  return count ? `已应用 ${count} 项条件` : '全部报告 · 日期从新到旧';
}
function bindReportSearchEvents(root) {
  const form = root.querySelector('#report-filter-form');
  if (!form) return;
  const update = () => {
    Object.keys(reportListFilters).forEach(key => { reportListFilters[key] = form.elements.namedItem(key).value; });
    root.querySelector('#report-results').innerHTML = renderReportSearchResults(getReports());
    root.querySelector('[data-clear-report-search]').hidden = !reportListFilters.search;
    root.querySelector('[data-filter-summary]').textContent = reportFilterSummary();
  };
  form.onsubmit = event => { event.preventDefault(); update(); };
  form.elements.namedItem('search').oninput = update;
  form.onchange = update;
  root.onclick = event => {
    if (event.target.closest('[data-reset-report-filters]')) {
      reportListFilters = createReportFilters();
      Object.keys(reportListFilters).forEach(key => { form.elements.namedItem(key).value = ''; });
      update();
    }
    if (event.target.closest('[data-clear-report-search]')) {
      form.elements.namedItem('search').value = '';
      update();
      form.elements.namedItem('search').focus();
    }
  };
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
  root.innerHTML = `${topBar('报告详情', 'reports')}<article class="card detail-summary"><div class="detail-title"><div><h2>⚗ ${esc(r.reportType)}</h2><p>${esc(r.hospital)}</p></div><span class="report-date">${esc(r.date)}</span></div><div class="patient-meta"><span>${esc(r.patient.name)}</span><span>${esc(r.patient.age)}岁</span><span>ID: ${esc(r.patient.patientId)}</span></div><div class="detail-stats"><div><strong>${r.items.length}</strong><span>总项目</span></div><div><strong class="green">${r.items.length-bad.length}</strong><span>正常</span></div><div><strong class="red">${bad.length}</strong><span>异常</span></div></div><div class="detail-edit-action"><button class="outline-btn" type="button" data-edit-report="${esc(r.id)}">编辑报告</button></div></article><section class="lab-item-list"><div class="section-head detail-section-head"><h2>检验项目</h2><span>${r.items.length} 项</span></div>${r.items.map((item, index) => renderLabItemCard(item, index)).join('')}</section>`;
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
  root.onclick = event => {
    const editButton = event.target.closest('[data-edit-report]');
    if (editButton) { startReportEdit(editButton.dataset.editReport); return; }
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
    button.setAttribute('aria-expanded', String(willOpen));
  };
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
  const pct = previous && previous.value !== 0 ? (delta / Math.abs(previous.value) * 100) : null;
  const meta = getTrendMeta(selectedTrendItem, latest);
  if (!selectedTrendPointKey || !data.some(point => trendPointKey(point) === selectedTrendPointKey)) selectedTrendPointKey = trendPointKey(latest);
  const selectedPoint = data.find(point => trendPointKey(point) === selectedTrendPointKey) || latest;
  document.querySelector('#trends').innerHTML = `${topBar('趋势分析', 'reports')}
    <section class="trend-hero-panel ${latest?.status === 'normal' ? 'ok' : 'warn'}">
      <div class="trend-hero-head"><label class="hero-metric-select"><span class="field-caption">检验指标</span><select id="trend-select" aria-label="选择检验指标">${names.map(n=>`<option ${n===selectedTrendItem?'selected':''}>${esc(n)}</option>`).join('')}</select></label></div>
      <div class="trend-number-row"><div><strong>${latest?.value ?? '-'}</strong><span>${esc(latest?.unit || '')}</span><p>${latest?.date || ''}</p></div><div class="trend-delta"><b>${pct === null ? '暂无' : `${delta === 0 ? '—' : delta > 0 ? '↑' : '↓'} ${Math.abs(pct).toFixed(2)}%`}</b><small>${previous ? '较上次记录' : '暂无对比记录'}</small></div></div>
      <article class="trend-chart-card"><div class="chart-period"><span>${data[0]?.date || ''} — ${latest?.date || ''}</span></div>${renderChart(data, true)}</article>
    </section>
    ${renderTrendPointDetail(selectedPoint, data)}
    <div class="trend-tabs"><button class="${trendDetailTab === 'explain' ? 'active' : ''}" data-trend-tab="explain">名词解释</button><button class="${trendDetailTab === 'analysis' ? 'active' : ''}" data-trend-tab="analysis">异常分析</button><button class="${trendDetailTab === 'history' ? 'active' : ''}" data-trend-tab="history">历史记录</button></div>
    <section class="reference-context"><span class="status-badge ${latest.status}">${statusText(latest.status)}</span><p>参考范围 ${esc(formatRange(latest))}<small>参考范围以原报告为准，不等同于疾病风险分级。</small></p></section>
    ${renderTrendTabContent(trendDetailTab, selectedTrendItem, data, meta)}
    <button class="primary-btn add-data-btn" data-go="upload">添加数据</button>`;
  document.querySelector('#trend-select').onchange = e => { selectedTrendItem = e.target.value; selectedTrendPointKey = ''; trendDetailTab = 'explain'; renderTrends(); };
  bindTrendInteractions(data);
}
function trendPointKey(point) {
  return point ? `${point.reportId || ''}|${point.date}|${point.name}` : '';
}
function bindTrendInteractions(data) {
  const root = document.querySelector('#trends');
  root.querySelectorAll('[data-trend-index]').forEach(target => {
    const selectPoint = () => {
      const point = data[Number(target.dataset.trendIndex)];
      if (!point) return;
      selectedTrendPointKey = trendPointKey(point);
      renderTrends();
    };
    target.addEventListener('click', selectPoint);
    target.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPoint(); }
    });
  });
  root.querySelectorAll('[data-trend-tab]').forEach(button => {
    button.onclick = () => {
      trendDetailTab = button.dataset.trendTab || 'explain';
      renderTrends();
    };
  });
  root.querySelectorAll('[data-trend-report]').forEach(button => {
    button.onclick = () => {
      selectedReportId = button.dataset.trendReport;
      setStoredSelectedReportId(selectedReportId);
      showScreen('report-detail');
    };
  });
}
function renderTrendPointDetail(point, data) {
  const report = getReports().find(item => item.id === point?.reportId);
  const index = data.findIndex(item => trendPointKey(item) === trendPointKey(point));
  const previous = index > 0 ? data[index - 1] : null;
  const diff = previous ? point.value - previous.value : 0;
  const direction = !previous ? '暂无' : diff > 0 ? '上升' : diff < 0 ? '下降' : '持平';
  const pct = previous && previous.value ? `${Math.abs(diff / previous.value * 100).toFixed(2)}%` : '暂无';
  return `<article class="card trend-point-detail"><div class="section-head"><h2>时间点详情</h2><span>${esc(point.date)}</span></div><div class="trend-point-grid"><div><small>报告类型</small><strong>${esc(report?.reportType || '未知')}</strong></div><div><small>医院</small><strong>${esc(report?.hospital || '未知')}</strong></div><div><small>指标</small><strong>${esc(point.name)}</strong></div><div><small>当前数值</small><strong>${esc(point.value)} ${esc(point.unit || '')}</strong></div><div><small>参考范围</small><strong>${esc(formatRange(point))}</strong></div><div><small>状态</small><strong>${statusText(point.status)}</strong></div><div><small>较上一条</small><strong>${direction}</strong></div><div><small>变化</small><strong>${previous ? `${diff > 0 ? '+' : ''}${formatNumber(diff)} ${point.unit || ''} / ${pct}` : '暂无'}</strong></div></div>${report ? `<button class="outline-btn" type="button" data-trend-report="${esc(report.id)}">查看报告详情</button>` : ''}</article>`;
}
function renderTrendTabContent(tab, metricName, data, meta) {
  if (tab === 'analysis') return renderTrendAbnormalAnalysis(metricName, data);
  if (tab === 'history') return renderTrendHistory(metricName, data);
  return renderTrendExplanation(metricName, data.at(-1), meta);
}
function renderTrendExplanation(metricName, latest, meta) {
  const info = getMedicalItemInfo(metricName);
  if (!info) return `<article class="card explain-card"><h2>${esc(metricName)}名词解释</h2><p>当前项目暂无完整解释，可结合报告参考范围和医生建议理解。</p><div class="explanation-disclaimer"><strong>安全提示</strong><p>内容仅供参考，不能替代医生诊断。</p></div></article>`;
  return `<article class="card explain-card"><h2>${esc(info.name)}</h2><div class="explanation-title"><strong>${esc(info.category)}</strong><span>以报告参考范围为准</span></div><div class="explanation-section"><h4>指标含义</h4><p>${esc(info.meaning || meta.explain)}</p></div><div class="explanation-section"><h4>偏高可能提示</h4><p>${esc(info.highMeaning)}</p></div><div class="explanation-section"><h4>偏低可能提示</h4><p>${esc(info.lowMeaning)}</p></div><div class="explanation-section"><h4>建议</h4><p>${esc(info.suggestion)}</p></div><div class="explanation-disclaimer"><strong>安全提示</strong><p>${esc(explainLabItem(latest || { name: metricName }).disclaimer)}</p></div></article>`;
}
function analyzeTrendAbnormality(data) {
  const total = data.length;
  const normal = data.filter(item => item.status === 'normal').length;
  const high = data.filter(item => item.status === 'high').length;
  const low = data.filter(item => item.status === 'low').length;
  const latest = data.at(-1);
  const previous = data.at(-2);
  const values = data.map(item => Number(item.value)).filter(Number.isFinite);
  const consecutiveAbnormal = data.length >= 2 && data.slice(-2).every(item => item.status !== 'normal');
  const direction = !previous ? '暂无' : latest.value > previous.value ? '上升' : latest.value < previous.value ? '下降' : '持平';
  return { total, normal, high, low, latest, previous, highest: Math.max(...values), lowest: Math.min(...values), consecutiveAbnormal, direction };
}
function renderTrendAbnormalAnalysis(metricName, data) {
  const analysis = analyzeTrendAbnormality(data);
  return `<article class="card explain-card trend-analysis-card"><h2>${esc(metricName)}异常分析</h2>${data.length < 2 ? '<p>当前历史数据不足，建议积累更多报告后观察趋势。</p>' : ''}<div class="trend-point-grid"><div><small>历史记录</small><strong>${analysis.total} 次</strong></div><div><small>正常</small><strong>${analysis.normal} 次</strong></div><div><small>偏高</small><strong>${analysis.high} 次</strong></div><div><small>偏低</small><strong>${analysis.low} 次</strong></div><div><small>最近状态</small><strong>${statusText(analysis.latest?.status)}</strong></div><div><small>连续异常</small><strong>${analysis.consecutiveAbnormal ? '是' : '否'}</strong></div><div><small>最高值</small><strong>${formatNumber(analysis.highest)}</strong></div><div><small>最低值</small><strong>${formatNumber(analysis.lowest)}</strong></div><div><small>最近变化</small><strong>${analysis.direction}</strong></div></div><div class="explanation-disclaimer"><strong>安全提示</strong><p>趋势分析仅用于辅助理解，不能替代医生诊断。</p></div></article>`;
}
function renderTrendHistory(metricName, data) {
  const ordered = [...data].sort((a, b) => b.date.localeCompare(a.date));
  return `<article class="card explain-card trend-history-card"><h2>${esc(metricName)}历史记录</h2>${ordered.length ? `<div class="trend-history-list">${ordered.map(point => {
    const report = getReports().find(item => item.id === point.reportId);
    return `<div class="trend-history-row"><div><strong>${esc(point.date)}</strong><p>${esc(formatValue(point))} · 参考 ${esc(formatRange(point))}</p><small>${esc(report?.reportType || '未知报告')} · ${esc(report?.hospital || '未知机构')}</small></div><span class="status-badge ${point.status || 'unknown'}">${statusText(point.status)}</span>${report ? `<button class="outline-btn" type="button" data-trend-report="${esc(report.id)}">查看报告</button>` : ''}</div>`;
  }).join('')}</div>` : '<div class="empty-state compact">暂无历史记录。</div>'}</article>`;
}
function renderAi() {
  const reports = [...getReports()].sort((a,b)=>b.date.localeCompare(a.date));
  const latest = reports[0] || getLatestReport();
  const chatReport = getCurrentChatReport();
  const messages = getChatHistory();
  const root = document.querySelector('#ai-insights');
  root.innerHTML = `${topBar('健康助手', 'overview')}<div class="ai-tabs"><button class="${aiMode==='insights'?'active':''}" aria-pressed="${aiMode==='insights'}" id="tab-insights">AI 解读</button><button class="${aiMode==='chat'?'active':''}" aria-pressed="${aiMode==='chat'}" id="tab-chat">AI 对话</button></div>${aiMode==='insights' ? renderAiInsightCards(reports) : renderChatPanel(chatReport, messages)}`;
  document.querySelector('#tab-insights').onclick = () => { aiMode = 'insights'; selectedAiReportId = ''; expandedAiReportId = ''; renderAi(); };
  document.querySelector('#tab-chat').onclick = () => { aiMode = 'chat'; renderAi(); };
  root.querySelectorAll('[data-ai-toggle]').forEach(button => {
    button.onclick = () => {
      expandedAiReportId = expandedAiReportId === button.dataset.aiToggle ? '' : button.dataset.aiToggle;
      selectedAiReportId = '';
      renderAi();
    };
  });
  root.querySelectorAll('[data-ai-refresh]').forEach(button => {
    button.onclick = () => requestAiInterpretation(button.dataset.aiRefresh);
  });
  const form = document.querySelector('#chat-form');
  root.querySelectorAll('[data-quick-question]').forEach(button => {
    button.onclick = () => sendChatQuestion(button.dataset.quickQuestion);
  });
  const clearButton = root.querySelector('#clear-chat');
  if (clearButton) clearButton.onclick = () => {
    if (chatSending || !confirm('确认清空此浏览器中的聊天记录？')) return;
    clearChatHistory(); renderAi();
  };
  if (form) form.question.oninput = () => { chatDraft = form.question.value; };
  if (form) form.onsubmit = e => { e.preventDefault(); sendChatQuestion(form.question.value); };
}
async function requestAiInterpretation(reportId) {
  if (aiInterpretationState[reportId]?.loading) return;
  const mode = appConfig.dataMode;
  const report = getReports().find(item => item.id === reportId);
  if (!report) return;
  const requestState = { loading: true, error: '', source: 'mock', invalidated: Boolean(aiInterpretationState[reportId]?.invalidated), result: generateAiInterpretation(report) };
  aiInterpretationState[reportId] = requestState;
  renderAi();
  const result = await callAiInterpretApi(report);
  if (mode !== appConfig.dataMode || aiInterpretationState[reportId] !== requestState) return;
  aiInterpretationState[reportId] = result
    ? { loading: false, error: '', source: 'ai', result }
    : { loading: false, error: 'AI 服务暂不可用，已显示本地规则解读。', source: 'mock', invalidated: requestState.invalidated, result: generateAiInterpretation(report) };
  if (getActiveScreenId() === 'ai-insights') renderAi();
}
async function sendChatQuestion(rawQuestion) {
  const question = String(rawQuestion || '').trim();
  if (!question || chatSending) return;
  const report = getCurrentChatReport();
  if (!report) return;
  const version = ++chatRequestVersion;
  chatSending = true;
  chatDraft = '';
  try {
    addChatMessage('user', question);
    renderAi();
    const history = getChatHistory();
    const apiReply = await callAiChatApi(question, report, history);
    if (version !== chatRequestVersion) return;
    if (apiReply) addChatMessage('assistant', withDisclaimer(apiReply), 'ai');
    else addChatMessage('assistant', generateMockChatReply(question, report), 'mock');
  } catch {
    showNotice('聊天记录保存失败，请检查浏览器存储空间后重试。');
  } finally {
    if (version === chatRequestVersion) chatSending = false;
    if (getActiveScreenId() === 'ai-insights' && aiMode === 'chat') {
      renderAi();
      document.querySelector('#chat-form input')?.focus();
    }
  }
}
function renderChatPanel(report, messages) {
  if (!report) return renderEmptyState('暂无报告数据，请先上传或录入一份检验报告。', '录入报告', 'upload');
  return `${renderChatContextCard(report)}<p class="chat-safety-note">AI 仅供健康科普参考，不构成诊断或治疗建议。服务不可用时使用本地规则。</p>${renderQuickQuestions()}<div class="chat-head-row"><h2>对话记录</h2><button class="chat-clear-btn" id="clear-chat" type="button" ${chatSending || !messages.length ? 'disabled' : ''}>清空聊天</button></div>${renderChatMessages(messages)}${chatSending ? '<p class="chat-pending" role="status"><span class="pdf-spinner" aria-hidden="true"></span>正在理解这份报告…</p>' : ''}<form class="chat-input" id="chat-form"><input placeholder="询问指标含义、异常或复查" aria-label="健康问题" name="question" value="${esc(chatDraft)}" autocomplete="off" maxlength="2000" ${chatSending ? 'disabled' : ''}><button type="submit" ${chatSending ? 'disabled' : ''}>${chatSending ? '等待中' : '发送'}</button></form>`;
}
function renderChatContextCard(report) {
  const normalizedReport = normalizeReport(report);
  const bad = getAbnormalItems(normalizedReport);
  return `<article class="card chat-context-card"><div><h2>当前参考报告</h2><p>${esc(normalizedReport.reportType)} · ${esc(normalizedReport.hospital)}</p><small>${esc(normalizedReport.date)} · ${esc(normalizedReport.patient.name)}</small></div><div class="chat-context-grid"><span><strong>${normalizedReport.items.length}</strong>总项目</span><span><strong>${bad.length}</strong>异常</span></div></article><p class="chat-history-note">历史消息保留原回复；新提问以当前报告为准。</p>`;
}
function renderQuickQuestions() {
  const questions = ['这份报告有什么异常？', '我的空腹血糖严重吗？', '低密度脂蛋白是什么意思？', '我需要复查吗？'];
  return `<div class="quick-question-row">${questions.map(question => `<button type="button" data-quick-question="${esc(question)}" ${chatSending ? 'disabled' : ''}>${esc(question)}</button>`).join('')}</div>`;
}
function renderChatMessages(messages) {
  if (!messages.length) return '<div class="chat-thread"><div class="chat-empty-state">还没有对话。你可以直接提问，或点击上方快捷问题。</div></div>';
  return `<div class="chat-thread">${messages.map(message => `<div class="message ${message.role === 'user' ? 'user' : 'assistant'}">${message.role === 'assistant' ? '<div class="assistant-mark" aria-hidden="true">医检</div>' : ''}<div><div class="bubble">${esc(message.content)}${message.role === 'assistant' && message.source ? `<span class="ai-source-chip ${message.source}">${message.source === 'ai' ? 'AI 生成' : '本地规则'}</span>` : ''}</div><div class="msg-time">${esc(message.time)}</div></div></div>`).join('')}</div>`;
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
  const aiState = aiInterpretationState[normalizedReport.id] || { loading: false, error: '', source: 'mock', result: generateAiInterpretation(normalizedReport) };
  return `<article class="card ai-report-card ${expanded ? 'expanded' : 'collapsed'} ${highlighted ? 'highlighted' : ''}">
    <div class="ai-card-header"><div><h3>${esc(normalizedReport.reportType)}</h3><p>${esc(normalizedReport.hospital)} · ${esc(normalizedReport.patient.name)}</p><div class="ai-card-tags">${isLatest ? '<span>最新报告</span>' : ''}${isSelected ? '<span>当前查看</span>' : ''}</div></div><div><span class="report-date">${esc(normalizedReport.date)}</span><small class="status-badge ${bad.length ? 'high' : 'normal'}">异常 ${bad.length} 项</small></div></div>
    <div class="ai-summary-grid"><div><strong>${normalizedReport.items.length}</strong><span>总项目</span></div><div><strong>${normal}</strong><span>正常</span></div><div><strong class="${bad.length ? 'red' : 'green'}">${bad.length}</strong><span>异常</span></div></div>
    ${expanded && aiState.invalidated ? '<p class="ai-report-updated" role="status">报告已修改，旧 AI 解读已失效。当前解读基于更新后的数据。</p>' : ''}
    ${expanded ? `<div class="ai-generate-row"><span class="ai-source-chip ${aiState.source}">${aiState.source === 'ai' ? 'AI 生成' : '本地规则生成'}</span><button class="outline-btn ai-expand-button" type="button" data-ai-refresh="${esc(normalizedReport.id)}" ${aiState.loading ? 'disabled' : ''}>${aiState.loading ? '正在生成 AI 解读…' : '使用 AI 重新解读'}</button></div>${aiState.error ? `<div class="form-message error ai-inline-message">${esc(aiState.error)}</div>` : ''}${renderAiInterpretation(aiState.result)}` : `<div class="ai-report-summary"><div><strong>主要异常</strong><p>${abnormalNames.length ? abnormalNames.map(esc).join('、') : '未发现明显异常指标'}</p></div>${canToggle ? `<button class="outline-btn ai-expand-button" type="button" data-ai-toggle="${esc(normalizedReport.id)}">查看完整解读</button>` : ''}</div>`}
    ${expanded && canToggle ? `<button class="outline-btn ai-expand-button collapse" type="button" data-ai-toggle="${esc(normalizedReport.id)}">收起解读</button>` : ''}
  </article>`;
}
function renderAiInterpretation(interpretation) {
  const abnormalItems = Array.isArray(interpretation?.abnormalItems) ? interpretation.abnormalItems : [];
  const recommendations = Array.isArray(interpretation?.recommendations) ? interpretation.recommendations : [];
  return `<section class="ai-summary-box"><h4>整体评估</h4><p>${esc(interpretation?.summary || '暂无摘要。')}</p></section>
    <section class="ai-abnormal-list"><h4>异常指标分析</h4>${abnormalItems.length ? abnormalItems.map(item => `<article class="ai-abnormal-item"><div class="ai-abnormal-head"><strong>${esc(item.name)}</strong><span class="status-badge ${item.statusText === '偏高' ? 'high' : item.statusText === '偏低' ? 'low' : 'normal'}">${esc(item.statusText || '正常')}</span></div><div class="ai-abnormal-meta"><span>${esc(item.valueText)}</span><span>参考 ${esc(item.referenceText)}</span><span>${esc(item.category)}</span></div><p>${esc(item.explanation)}</p><small>${esc(item.suggestion)}</small></article>`).join('') : `<div class="ai-empty-state">${esc(interpretation?.normalNote || '未发现明显异常指标。')}</div>`}</section>
    <section class="ai-recommendation-list"><h4>综合建议</h4><ul>${recommendations.map(item => `<li>${esc(item)}</li>`).join('') || '<li>建议结合既往病史、症状和医生意见综合判断。</li>'}</ul></section>
    <section class="ai-disclaimer">${esc(interpretation?.disclaimer || '内容仅供健康科普和报告理解参考，不能替代医生诊断。')}</section>`;
}
function renderProfile() {
  const root = document.querySelector('#profile');
  const api = appConfig.dataMode === 'api';
  root.innerHTML = `${topBar('我的', 'overview')}<section class="profile-intro"><span class="profile-monogram" aria-hidden="true">医检</span><div><h2>我的报告空间</h2><p>${getReportsCount()} 份报告 · ${api ? '后端存储' : '本地存储'}</p></div><span class="version-label">Web</span></section>
    <section class="profile-section"><h2>数据与存储</h2><div class="data-mode-row"><span>当前数据来源</span><strong class="mode-badge ${appConfig.dataMode}">${api ? 'API 模式' : '本地模式'}</strong></div><p class="storage-description">${api ? '报告由当前 FastAPI 服务保存。切换模式不会自动迁移数据。' : '报告只保存在当前浏览器，不会自动同步。清理浏览器数据会丢失报告，请定期导出备份。'}</p><div class="mode-switch-actions"><button class="outline-btn" id="switch-local-mode" ${api ? '' : 'disabled'}>本地模式</button><button class="outline-btn" id="switch-api-mode" ${api ? 'disabled' : ''}>API 模式</button></div><p class="profile-privacy">本地演示与当前无鉴权后端均不适合存储真实敏感医疗信息。</p></section>
    <section class="profile-section"><h2>使用边界</h2><p>参考范围以原报告为准。解析后请核对项目、单位与参考值。</p><p>AI 仅供健康科普参考，不构成诊断或治疗建议。</p></section>${renderDevTools()}<div class="form-message" id="profile-message" role="status" aria-live="polite"></div>`;
  const details = root.querySelector('.dev-tools-disclosure');
  details.ontoggle = () => { profileToolsOpen = details.open; };
  bindProfileEvents(root);
  if (profileBusy) root.querySelectorAll('button, input').forEach(control => { control.disabled = true; });
}
function renderDevTools() {
  const reports = getReports();
  const latest = getLatestReport();
  const bad = getAbnormalItems(latest).length;
  const clearLabel = appConfig.dataMode === 'api' ? '清空后端报告' : '清空本地报告';
  return `<details class="dev-tools-disclosure" ${profileToolsOpen ? 'open' : ''}><summary>开发者工具 <span>连接、备份与迁移</span></summary><div class="dev-tools-card"><p class="dev-warning">清空、恢复和导入会覆盖当前数据，请先备份。</p>
    <section class="data-mode-panel">
      <div class="data-mode-row"><span>当前使用</span><strong class="mode-badge ${appConfig.dataMode}">${appConfig.dataMode === 'api' ? 'API 模式' : '本地模式'}</strong></div>
      <div class="data-mode-row"><span>API 地址</span><strong>${esc(appConfig.apiBaseUrl)}</strong></div>
      <div class="data-mode-row"><span>API 健康状态</span><strong>${apiHealthText(appState.apiHealth)}</strong></div>
      <div class="dev-actions mode-actions">
        <button class="outline-btn" type="button" id="check-api-health">检测后端连接</button>
      </div>
    </section>
    <section class="data-mode-panel ai-service-panel">
      <div class="data-mode-row"><span>AI Base URL</span><strong>${appState.aiHealth ? (appState.aiHealth.baseUrlConfigured ? '已配置' : '未配置') : '未检测'}</strong></div>
      <div class="data-mode-row"><span>AI Model</span><strong>${esc(appState.aiHealth?.model || '未检测')}</strong></div>
      <div class="data-mode-row"><span>AI Key</span><strong>${appState.aiHealth ? (appState.aiHealth.hasKey ? 'true' : 'false') : '未检测'}</strong></div>
      <div class="data-mode-row"><span>AI 接口状态</span><strong>${appState.aiHealth ? (appState.aiHealth.ok ? '可用' : '不可用') : '未检测'}</strong></div>
      <div class="dev-actions mode-actions">
        <button class="outline-btn" type="button" id="check-ai-health">检测 AI 服务</button>
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
  </div></details>`;
}
function bindProfileEvents(root) {
  const run = async action => {
    if (profileBusy) return;
    profileBusy = true;
    root.setAttribute('aria-busy', 'true');
    root.querySelectorAll('button, input').forEach(control => { control.disabled = true; });
    showProfileMessage('正在处理…', 'info');
    try { await action(); }
    catch { showProfileMessage('操作未完成，请确认后端连接或浏览器存储后重试。', 'error'); }
    finally {
      profileBusy = false;
      const target = root.querySelector('#profile-message');
      const message = target?.textContent || '';
      const type = target?.classList.contains('error') ? 'error' : 'success';
      renderProfile();
      root.setAttribute('aria-busy', 'false');
      if (message && message !== '正在处理…') showProfileMessage(message, type);
    }
  };
  root.querySelector('#clear-reports')?.addEventListener('click', () => run(async () => {
    const sourceText = appConfig.dataMode === 'api' ? '后端报告数据' : '本地报告数据';
    if (!confirm(`确认清空${sourceText}？该操作不会恢复示例报告。`)) return;
    await clearReportsData();
    renderProfile();
    showProfileMessage(appConfig.dataMode === 'api' ? '后端报告已清空' : '本地报告已清空', 'success');
  }));
  root.querySelector('#restore-sample')?.addEventListener('click', () => run(async () => {
    const sourceText = appConfig.dataMode === 'api' ? '后端报告数据' : '本地报告数据';
    if (!confirm(`确认恢复示例报告？这会覆盖当前${sourceText}。`)) return;
    await resetReportsToSample();
    renderProfile();
    showProfileMessage('示例报告已恢复', 'success');
  }));
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
  [['sync-local-to-api', syncLocalReportsToApi], ['pull-api-to-local', pullApiReportsToLocal], ['check-api-health', checkApiHealth], ['check-ai-health', checkAiHealth], ['switch-api-mode', switchToApiMode], ['switch-local-mode', switchToLocalMode]].forEach(([id, action]) => {
    root.querySelector(`#${id}`)?.addEventListener('click', () => run(action));
  });
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
async function checkAiHealth() {
  const result = await fetchJsonWithTimeout(`${appConfig.apiBaseUrl}/api/ai/health`, {}, 8000);
  appState.aiHealth = result || { ok: false, configured: false, message: 'AI 后端接口不可访问' };
  renderProfile();
  showProfileMessage(appState.aiHealth.ok ? 'AI 服务可用' : (appState.aiHealth.message || 'AI 服务暂不可用'), appState.aiHealth.ok ? 'success' : 'error');
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
  if (appConfig.dataMode === 'api' && (!appState.reportsLoaded || appState.error || appState.loading)) {
    showProfileMessage('报告尚未加载完成，请先重新连接后端再导出。', 'error');
    return;
  }
  const date = formatDateTime(new Date()).slice(0, 10).replaceAll('-', '');
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
  if (!confirm('同步会覆盖后端现有报告，本地数据不受影响。确认继续？')) return;
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
function showNotice(message) {
  const target = document.querySelector('#app-notice');
  if (!target) return;
  target.textContent = message;
  target.hidden = false;
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => { target.hidden = true; }, 5000);
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
    ${data.map((d,i)=>`<circle class="${d.status==='normal'?'dot-teal':'dot-coral'} ${trendPointKey(d) === selectedTrendPointKey ? 'selected-dot' : ''}" cx="${x(i)}" cy="${y(d.value)}" r="${large ? 4.2 : 3.5}"/>`).join('')}
    ${large ? data.map((d,i)=>`<circle class="trend-hit-point" role="button" tabindex="0" aria-label="${esc(d.date)} ${esc(d.name)} ${esc(formatValue(d))}" aria-pressed="${trendPointKey(d) === selectedTrendPointKey}" data-trend-index="${i}" cx="${x(i)}" cy="${y(d.value)}" r="18"><title>${esc(d.date)} ${esc(d.name)} ${esc(formatValue(d))}</title></circle>`).join('') : ''}
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
function statusText(s) { return s === 'high' ? '偏高' : s === 'low' ? '偏低' : s === 'normal' ? '正常' : '未知'; }
function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return Math.abs(number) >= 100 ? number.toFixed(0) : number.toFixed(2).replace(/\.?0+$/, '');
}
function formatValue(i) { return `${i.value} ${i.unit || ''}`.trim(); }
function formatRange(i) { return `${i.refText || `${i.refLow}–${i.refHigh}`} ${i.unit || ''}`.trim(); }
function esc(v) { return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
window.appConfig=appConfig; window.appState=appState; window.reportService=reportService; window.chatService=chatService; window.setDataMode=setDataMode; window.loadReportsToState=loadReportsToState; window.refreshReportsAndRender=refreshReportsAndRender; window.checkApiHealth=checkApiHealth; window.switchToApiMode=switchToApiMode; window.switchToLocalMode=switchToLocalMode; window.apiHealthText=apiHealthText; window.labReferenceDictionary=labReferenceDictionary; window.medicalItemDictionary=medicalItemDictionary; window.normalizeReport=normalizeReport; window.normalizeReports=normalizeReports; window.normalizeLabItemName=normalizeLabItemName; window.getDefaultReferenceRange=getDefaultReferenceRange; window.getMedicalItemInfo=getMedicalItemInfo; window.explainLabItem=explainLabItem; window.getReports=getReports; window.saveReports=saveReports; window.addReport=addReport; window.calculateItemStatus=calculateItemStatus; window.getLatestReport=getLatestReport; window.getAbnormalItems=getAbnormalItems; window.getOverviewStats=getOverviewStats; window.getTrendData=getTrendData; window.trendStatus=trendStatus; window.statusText=statusText; window.formatValue=formatValue; window.formatRange=formatRange; window.generateAiInterpretation=generateAiInterpretation; window.aiInterpretationToText=aiInterpretationToText; window.generateAiInterpretationText=generateAiInterpretationText; window.generateMockChatReply=generateMockChatReply; window.getCurrentChatReport=getCurrentChatReport; window.getChatHistory=getChatHistory; window.saveChatHistory=saveChatHistory; window.clearChatHistory=clearChatHistory; window.addChatMessage=addChatMessage; window.callAiChatApi=callAiChatApi; window.findMatchedLabItem=findMatchedLabItem; window.buildReportSummaryReply=buildReportSummaryReply; window.buildItemExplanationReply=buildItemExplanationReply; window.isMedicalAdviceQuestion=isMedicalAdviceQuestion; window.renderChatPanel=renderChatPanel; window.renderChatContextCard=renderChatContextCard; window.renderChatMessages=renderChatMessages; window.renderQuickQuestions=renderQuickQuestions; window.loadPdfJsIfNeeded=loadPdfJsIfNeeded; window.extractTextFromPdfFile=extractTextFromPdfFile; window.groupTextItemsIntoLines=groupTextItemsIntoLines; window.normalizePdfText=normalizePdfText; window.parsePdfReportText=parsePdfReportText; window.parseReportMetaFromText=parseReportMetaFromText; window.parseLabItemsFromText=parseLabItemsFromText; window.parseLabLine=parseLabLine; window.parsePdfReferenceRange=parsePdfReferenceRange; window.normalizeParsedUnit=normalizeParsedUnit; window.buildReportFromParsedPdf=buildReportFromParsedPdf; window.calculatePdfParseConfidence=calculatePdfParseConfidence; window.pdfParserTestCases=pdfParserTestCases; window.runPdfParserTests=runPdfParserTests; window.renderPdfStatus=renderPdfStatus; window.renderPdfError=renderPdfError; window.renderPdfPreview=renderPdfPreview; window.renderParseDebugDetails=renderParseDebugDetails; window.collectParsedPdfPreview=collectParsedPdfPreview; window.handlePastedTextParse=handlePastedTextParse; window.renderOverview=renderOverview; window.renderReports=renderReports; window.renderTrends=renderTrends; window.renderAi=renderAi; window.renderProfile=renderProfile; window.renderUpload=renderUpload; window.bindUploadEvents=bindUploadEvents; window.createEmptyLabItemForm=createEmptyLabItemForm; window.collectUploadFormData=collectUploadFormData; window.validateUploadForm=validateUploadForm; window.saveUploadedReport=saveUploadedReport; window.renderReportDetail=renderReportDetail; window.renderLabItemCard=renderLabItemCard; window.bindReportDetailEvents=bindReportDetailEvents; window.renderExplanationPanel=renderExplanationPanel; window.renderAiInsightCards=renderAiInsightCards; window.renderAiReportCard=renderAiReportCard; window.renderAiInterpretation=renderAiInterpretation; window.renderDevTools=renderDevTools; window.getReportsCount=getReportsCount; window.getChatCount=getChatCount; window.resetReportsToSample=resetReportsToSample; window.clearReportsData=clearReportsData; window.exportReportsJson=exportReportsJson; window.importReportsJson=importReportsJson; window.syncLocalReportsToApi=syncLocalReportsToApi; window.pullApiReportsToLocal=pullApiReportsToLocal; window.refreshAfterDataChange=refreshAfterDataChange;
window.aiInterpretationState=aiInterpretationState; window.fetchJsonWithTimeout=fetchJsonWithTimeout; window.callAiInterpretApi=callAiInterpretApi; window.requestAiInterpretation=requestAiInterpretation; window.checkAiHealth=checkAiHealth;
window.renderOverviewItemBreakdown=renderOverviewItemBreakdown; window.bindOverviewStatsEvents=bindOverviewStatsEvents; window.renderTrendPointDetail=renderTrendPointDetail; window.renderTrendTabContent=renderTrendTabContent; window.renderTrendExplanation=renderTrendExplanation; window.analyzeTrendAbnormality=analyzeTrendAbnormality; window.renderTrendAbnormalAnalysis=renderTrendAbnormalAnalysis; window.renderTrendHistory=renderTrendHistory; window.trendPointKey=trendPointKey;
window.filterReports = filterReports; window.getReportFilterError = getReportFilterError; window.startReportEdit = startReportEdit; window.saveEditedReport = saveEditedReport;
window.validateReportFile = validateReportFile; window.cancelReportImport = cancelReportImport;
showScreen('overview');
