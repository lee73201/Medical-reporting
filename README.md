# AI 医疗检验报告管理与解读系统

## 项目简介

这是一个医疗检验报告管理 MVP，用于录入、管理和解读医疗检验报告。系统支持检验项目异常识别、历史趋势分析、规则化 AI 解读、本地 mock AI 对话，以及可选的 FastAPI + SQLite 数据持久化。

当前版本不接真实 OCR、不接真实 AI API，不做用户登录。前端默认使用浏览器 `localStorage`，也可以在 profile 开发者工具中切换到 API 模式，从本地 FastAPI 后端读取和保存报告数据。

## 当前 MVP 功能

- 报告手动录入
- 文本型 PDF 本地解析
- 参考范围自动填充
- 检验项目别名归一化
- 异常状态判断
- 首页检验概览
- 报告列表
- 报告详情
- 单项医学解释
- 趋势分析
- AI 解读 mock
- AI 对话 mock
- profile 开发者调试工具
- localStorage 本地保存
- FastAPI + SQLite 可选后端模式

## 技术栈

- HTML
- CSS
- JavaScript
- PDF.js 本地 vendor 资源
- localStorage
- FastAPI
- SQLite
- 无 React / Vue
- 无真实 OCR
- 无真实 AI API

## 如何本地运行

可以直接用浏览器打开 `index.html`。

也可以使用本地静态服务：

```bash
python3 -m http.server 8088
```

然后访问：

```text
http://127.0.0.1:8088/index.html
```

## 页面结构说明

- `overview`：首页 / 检验概览
- `upload`：报告录入
- `reports`：报告列表
- `report-detail`：报告详情
- `trends`：趋势分析
- `ai-insights`：AI 解读
- AI 对话模式：位于 `ai-insights` 页面内的第二个 tab
- `profile`：我的 / 开发者工具

## 核心数据结构

标准 report 数据结构：

```js
{
  id,
  patient: {
    name,
    age,
    patientId
  },
  reportType,
  hospital,
  date,
  items: [
    {
      name,
      value,
      unit,
      refLow,
      refHigh,
      refText,
      refSource,
      status
    }
  ]
}
```

字段说明：

- `refSource`: `dictionary` / `manual` / `report` / `unknown`
- `status`: `normal` / `high` / `low`

## localStorage key

- reports key：`lab_reports_v2`
- chat key：`lab_chat_v2`
- selected report key：`lab_selected_report_id`

`selectedAiReportId` 和 `expandedAiReportId` 是运行时状态变量，不单独写入 localStorage。

## 数据访问层说明

当前数据模式：

```js
appConfig.dataMode === "local"
appConfig.apiBaseUrl === "http://127.0.0.1:8000"
```

默认使用 `localStorage`，但页面层通过 service 访问数据。切换到 API 模式后，页面先通过 `loadReportsToState()` 从后端加载 reports 到 `appState.reports`，再由同步兼容函数 `getReports()` 提供给各个页面渲染。

`reportService` 负责报告数据访问：

- `listReports()`
- `getReportById(id)`
- `getLatestReport()`
- `createReport(report)`
- `updateReport(id, updatedReport)`
- `deleteReport(id)`
- `saveAllReports(reports)`
- `clearReports()`
- `restoreSampleReports()`
- `exportReports()`
- `importReports(reports)`
- `listReportsAsync()`
- `createReportAsync(report)`
- `updateReportAsync(id, report)`
- `deleteReportAsync(id)`
- `clearReportsAsync()`
- `importReportsAsync(reports)`
- `exportReportsAsync()`

`chatService` 负责聊天数据访问：

- `listMessages()`
- `saveMessages(messages)`
- `addMessage(role, content)`
- `clearMessages()`

兼容函数仍然保留，例如 `getReports()`、`saveReports()`、`addReport()`、`getChatHistory()`、`saveChatHistory()`、`addChatMessage()`，它们现在只是 service wrapper。

`getReports()` 的取数规则：

- local 模式：直接从 `reportService.listReports()` 读取并标准化 `localStorage` 数据。
- api 模式：读取已经加载到内存的 `appState.reports`，避免页面层全部改成 `await`。

`appState` 负责 API 模式下的页面数据缓存和状态：

```js
{
  reports: [],
  reportsLoaded: false,
  loading: false,
  error: null,
  apiHealth: "unchecked"
}
```

如果后端请求失败，页面会显示连接错误，不会自动覆盖本地 `localStorage` 数据。

## 后端 API 与 SQLite

后端目录：

```text
backend/
├── main.py
├── database.py
├── models.py
├── schemas.py
├── requirements.txt
└── data/
    └── med_reports.db
```

安装依赖：

```bash
pip install -r backend/requirements.txt
```

启动后端：

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

启动前端：

```bash
python3 -m http.server 8088 --bind 127.0.0.1
```

访问：

```text
前端：http://127.0.0.1:8088/index.html
后端：http://127.0.0.1:8000/api/health
```

SQLite 数据库位置：

```text
backend/data/med_reports.db
```

API 列表：

- `GET /api/health`
- `GET /api/reports`
- `GET /api/reports/{report_id}`
- `POST /api/reports`
- `PUT /api/reports/{report_id}`
- `DELETE /api/reports/{report_id}`
- `DELETE /api/reports`
- `POST /api/reports/import`

SQLite 表：

- `reports`：报告基本信息和患者信息。
- `report_items`：报告中的检验项目，通过 `report_id` 关联 `reports.id`。

前端默认仍然是：

```js
appConfig.dataMode = "local"
```

也就是说现有页面仍读写 `localStorage`，不会因为后端不可用而影响原型功能。

### 启用 API 模式

1. 启动后端：

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

2. 启动前端：

```bash
python3 -m http.server 8088 --bind 127.0.0.1
```

3. 打开 `http://127.0.0.1:8088/index.html`。
4. 进入底部“我的”页面。
5. 在“数据模式”区域点击“检测后端连接”。
6. 连接正常后点击“切换到 API 模式”。

切换模式不会自动同步数据。local 模式和 API 模式是两套数据来源，需要使用 profile 中的同步工具手动迁移。

profile 开发者调试工具提供两个过渡按钮：

- “同步本地报告到后端”：读取当前 `localStorage` reports，调用 `POST /api/reports/import`。
- “从后端拉取报告”：调用 `GET /api/reports`，确认后覆盖本地 `localStorage` reports。

profile 还提供数据模式工具：

- “检测后端连接”：调用 `GET /api/health`。
- “切换到 API 模式”：把 `lab_data_mode` 写为 `api`，随后从后端加载 reports。
- “切换到本地模式”：把 `lab_data_mode` 写为 `local`，随后从浏览器 `localStorage` 读取 reports。

当前 localStorage key：

- `lab_reports_v2`
- `lab_chat_v2`
- `lab_selected_report_id`
- `lab_data_mode`

当前后端没有登录、权限控制和审计日志，`DELETE /api/reports` 也是开发接口，不适合生产环境直接使用。

## 主要函数说明

- `getReports()`：local 模式读取本地报告；api 模式读取 `appState.reports`。
- `saveReports(reports)`：保存标准化报告数据。
- `addReport(report)`：新增报告并写入 localStorage。
- `loadReportsToState()`：根据当前 dataMode 加载报告数据到 `appState`。
- `refreshReportsAndRender(targetScreen)`：刷新报告缓存并重新渲染页面。
- `normalizeReport(report)`：兼容旧数据并统一 report 结构。
- `normalizeReports(reports)`：批量标准化报告。
- `normalizeLabItemName(itemName)`：将中文名或别名归一为标准项目名。
- `getDefaultReferenceRange(itemName)`：从参考范围字典获取默认单位和范围。
- `explainLabItem(item)`：根据医学解释字典生成单项解释。
- `generateAiInterpretation(report)`：生成结构化 AI 解读对象。
- `generateMockChatReply(question, report)`：基于报告数据生成本地 mock 问答。
- `getTrendData(itemName)`：提取某指标历史趋势数据。
- `getChatHistory()`：读取聊天记录。
- `saveChatHistory(messages)`：保存聊天记录。
- `extractTextFromPdfFile(file)`：用 PDF.js 从文本型 PDF 提取页面文字。
- `parseReportMetaFromText(text)`：从 PDF 文本中解析报告机构、类型、日期和患者信息。
- `parseLabItemsFromText(text)`：从 PDF 文本中解析检验项目。
- `buildReportFromParsedPdf(parsedResult)`：将 PDF 解析结果转换为标准 report 结构。
- `calculatePdfParseConfidence(parsed)`：估算解析置信度。
- `runPdfParserTests()`：在浏览器控制台运行 PDF 文本解析回归测试。

## 文本型 PDF 解析

upload 页面支持上传文本型 PDF。这里的 PDF 必须本身包含可复制文字，浏览器会在本地通过 PDF.js 提取文本并解析报告信息。

解析流程：

1. 用户选择文本型 PDF。
2. 浏览器本地通过 PDF.js 读取文本，不上传服务器。
3. 系统调用 `parsePdfReportText(text)` 解析报告基础信息和检验项目。
4. 解析结果进入预览区，用户可编辑报告信息、患者信息和项目数据。
5. 用户点击“确认保存解析结果”后，才会写入标准 `report` 数据结构和 `lab_reports_v2`。

upload 页面也支持“粘贴报告文本解析”：

1. 从 PDF 或其他文本来源复制报告文字。
2. 粘贴到 textarea。
3. 点击“解析粘贴文本”。
4. 使用与 PDF 上传完全相同的 `parsePdfReportText(text)`、预览 UI 和保存逻辑。

预览区提供“查看解析详情”折叠面板，包含来源、PDF 页数或粘贴文本、提取文本字符数、识别行数、成功解析项目数、未识别行数、参考范围来源统计、置信度和 `unmatchedLines`。

当前实现边界：

- 这是纯文本 PDF 解析，不是 OCR。
- 支持可复制文字的 PDF。
- 不支持扫描件、拍照件或图片型 PDF。
- PDF 文件只在浏览器本地解析，不上传服务器。
- 解析结果不会自动保存，必须由用户在预览区核对并点击“确认保存解析结果”。
- 解析出的报告会进入现有标准 `report` 数据结构，并保存到 `lab_reports_v2`。
- 如果 PDF 无文本或检验项目无法识别，页面会提示改用手动录入。

当前支持的常见文本格式：

```text
GLU 7.4 mmol/L 3.9-6.1
GLU 7.4 H mmol/L 3.9-6.1
GLU 7.4 ↑ mmol/L 3.9-6.1
LDL 3.7 偏高 mmol/L 0-3.4
WBC 2.9 L 10^9/L 3.5-9.5
UA 480 umol/L 208~428
CREA 115 umol/L 57 至 111
TC 5.8 mmol/L <5.2
```

支持的参考范围格式包括 `3.9-6.1`、`3.9–6.1`、`3.9~6.1`、`3.9 至 6.1`、`<5.2`、`≤5.2`、`>1.0`、`≥1.0`。

支持的常见单位包括 `mmol/L`、`umol/L`、`μmol/L`、`g/L`、`10^9/L`、`x10^9/L`、`%`、`U/L`。

Parser 回归测试：

```js
runPdfParserTests()
```

在浏览器控制台执行后，会输出每个 case 的通过/失败结果和汇总数量。

PDF.js 当前使用本地 vendor 资源，避免浏览器跨域加载 CMap 文件导致 CORS 报错：

```text
vendor/pdfjs/pdf.min.js
vendor/pdfjs/pdf.worker.min.js
vendor/pdfjs/cmaps/
vendor/pdfjs/standard_fonts/
```

当前 vendor 资源来自 `pdfjs-dist@3.11.174`。如果重新拉取项目后缺少该目录，需要补齐同版本 PDF.js 资源，否则中文 CMap 或标准字体加载可能失败。

## 当前限制

- 当前只是前端 MVP。
- 文本型 PDF 解析只适配简单检验报告，复杂表格可能需要手动修正。
- 扫描件和图片型 PDF 暂不支持，需要 Phase 2 接入 OCR。
- 当前不支持复杂表格 OCR、图片识别、手写识别。
- AI 解读是规则和字典生成，不是真实大模型。
- AI 对话是本地 mock，不是真实 AI API。
- localStorage 不适合生产环境存储敏感医疗数据。
- 不支持用户登录。
- 不支持多设备同步。
- 不支持真实医院系统对接。

## 医疗安全边界

- 本系统不能替代医生。
- 不提供诊断。
- 不提供处方。
- 不提供确定治疗方案。
- 检验结果需要结合症状、病史、复查和医生判断。
- 如有明显不适或严重异常，应及时就医。

## 后续路线

- Phase 1：纯前端 MVP
- Phase 2：OCR / 扫描件识别
- Phase 3：后端和数据库
- Phase 4：真实 AI API 和 RAG 医学知识库
- Phase 5：登录、隐私、安全、部署

## 测试清单

- 上传 `GLU`，数值填写 `7.4`
- 上传包含 `GLU 7.4 mmol/L 3.9-6.1` 的文本型 PDF，确认预览后保存
- 粘贴测试文本，确认能进入同一套解析预览
- 在控制台运行 `runPdfParserTests()`
- 查看首页异常统计
- 查看报告详情
- 展开医学解释
- 查看趋势
- 查看 AI 解读
- AI 对话输入 `GLU 严重吗`
- 清空聊天记录
- 导出 / 导入 reports JSON
