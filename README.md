# AI 医疗检验报告管理与解读系统

## 项目简介

这是一个医疗检验报告管理 MVP，用于录入、管理和解读医疗检验报告。系统支持检验项目异常识别、历史趋势分析、规则化 AI 解读、本地 mock AI 对话，以及可选的 FastAPI + SQLite 数据持久化。

当前版本不接真实 OCR，不做用户登录。前端默认使用浏览器 `localStorage`，也可以在 profile 开发者工具中切换到 API 模式，从本地 FastAPI 后端读取和保存报告数据；AI 解读/对话可通过 FastAPI 后端代理调用 DeepSeek，失败时自动回退到本地规则 mock。

## 本次整理：version5-ui-polish

这是对当前 HTML 项目的增量打磨，不是 Expo 项目的更新。没有修改报告结构、后端 API 或 PDF parser 规则。

- 首页统计默认收起，点击展开，再点同一张卡片收起；患者与日期来自最新报告，不再展示写死的健康评分。
- 页面持续标明本地/API 数据来源；切换模式不自动同步，也不覆盖另一来源的数据。
- 使用较克制的灰白、蓝绿色界面，减少装饰渐变和厚阴影，保留移动端布局和底部导航。
- 趋势节点支持点按、键盘 Enter/空格；移除无效箭头、更多按钮和没有临床依据的风险等级展示。
- API 加载失败可重新加载；请求有超时，页面不展示原始服务错误。切换模式后丢弃旧请求结果。
- 手动和解析确认保存期间禁用提交按钮；聊天有等待反馈、防重复发送和本地规则来源标记。
- Profile 展示存储说明与医疗边界，开发工具默认折叠。同步覆盖后端前需要确认。
- 修复详情页重复进入后解释事件重复绑定的问题。

**当前目录的实际边界**：本版本没有认证模块或用户隔离，不应当作已经具备 JWT 登录的版本，也不能用于存储真实敏感医疗数据。未新增登录、OCR 或其他大型功能。

### 回归测试

无需前端依赖即可运行：

```bash
node --check app.js
node --test tests/frontend.test.cjs
```

后端测试使用临时 SQLite 数据库，不修改 `backend/data/med_reports.db`，也不调用真实 AI：

```bash
.venv/bin/python -m pip install httpx
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
.venv/bin/python -m compileall -q backend
```

覆盖统计折叠、local/API 保存与缓存隔离、API 失败/迟到响应、旧数据兼容、聊天防重复与 fallback、AI 历史折叠、PDF parser 原有用例，以及后端 CRUD/CORS/无密钥回退。前端测试使用轻量 DOM stand-in，不能代替浏览器布局验收。

人工验收：在 320px、375px 和桌面宽度下检查首页、录入、列表、详情、趋势、健康助手、我的；确认无横向溢出、底部操作可见，详情解释可反复开合。真实 DeepSeek 成功响应需使用本机环境变量另行验收，不在自动测试中产生调用费用。

本次自测记录（2026-11-01）：

- 前端逻辑测试 14/14、现有 PDF parser 用例 14/14 通过；Node/Python 语法检查通过。
- 临时数据库 API 测试通过，覆盖报告增删改查、批量导入、CORS 预检和 AI 未配置时的错误响应。
- 浏览器验证了统计展开/收起、详情解释、趋势节点/历史入口、AI 默认折叠与本地回退、Profile 模式切换与连接检测。
- 文本 PDF 样例提取到 9 项并进入预览；粘贴文本提取到 3 项，确认后保存成功；手动 GLU 录入与自动填充通过。
- 核心页面在 320px 窄屏下内容宽度不超过视口；375px 与 1440px 完成截图检查。
- 停止后端后显示错误和重试入口；重启后可恢复，切回 local 后原本地数据仍在。浏览器日志未发现未捕获 JS 错误。
- 未配置真实 AI key，未验证真实 DeepSeek 成功响应；未做真实移动设备、辅助技术或生产安全审计。

## 当前版本状态

当前版本是：

- 浏览器 Web App
- 移动端 App 风格 UI
- 原生 HTML/CSS/JavaScript 前端
- FastAPI 后端
- SQLite 数据库
- DeepSeek AI 后端代理
- localStorage / API 双数据模式

当前不是：

- 原生 iOS App
- 原生 Android App
- 微信小程序
- 医院正式系统
- 可直接生产上线的医疗系统

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
- AI 解读：DeepSeek 后端代理 + 本地规则 fallback
- AI 对话：DeepSeek 后端代理 + 本地规则 fallback
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
- DeepSeek AI 后端代理

## 如何本地运行

前端：

```bash
cd /Users/lee/Documents/doc
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m http.server 8088 --bind 127.0.0.1
```

然后访问：

```text
http://127.0.0.1:8088/index.html
```

后端：

```bash
cd /Users/lee/Documents/doc
source .venv/bin/activate
export AI_API_KEY="your_deepseek_api_key_here"
export AI_API_BASE_URL="https://api.deepseek.com"
export AI_MODEL="deepseek-v4-flash"
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

不要把真实 `AI_API_KEY` 写入代码、README 或提交到 GitHub。可以参考 `.env.example` 保存占位配置。

macOS 如果出现 `CERTIFICATE_VERIFY_FAILED`，可在虚拟环境中安装 `certifi` 并指定证书后重启后端，不要关闭 TLS 校验：

```bash
python -m pip install certifi
export SSL_CERT_FILE="$(python -c 'import certifi; print(certifi.where())')"
export REQUESTS_CA_BUNDLE="$SSL_CERT_FILE"
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

## AI 后端代理

真实 AI 调用必须走后端代理，不能把 AI API key 放在前端代码里。前端只请求本地 FastAPI，后端从环境变量读取密钥并转发到模型服务。

环境变量：

```bash
export AI_API_KEY="your_deepseek_api_key_here"
export AI_API_BASE_URL="https://api.deepseek.com"
export AI_MODEL="deepseek-v4-flash"
```

`AI_API_BASE_URL` 使用 DeepSeek OpenAI-compatible 地址。不要把真实 key 写进代码、README 或提交到 GitHub。

启动后端：

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

AI API：

- `GET /api/ai/health`：检查后端 AI 配置状态，只返回 key 是否存在，不返回 key 内容。
- `POST /api/ai/interpret`：接收标准 report，返回结构化 AI 解读。
- `POST /api/ai/chat`：接收当前 report、聊天历史和问题，返回自然语言回复。

如果没有配置 `AI_API_KEY` 或模型服务失败，后端会返回清晰错误；前端不会崩溃，会自动 fallback 到已有本地规则解读和 mock 对话。

前端使用方式：

- AI 解读页默认显示“本地规则生成”。
- 点击“使用 AI 重新解读”后才会请求 `POST /api/ai/interpret`，不会自动批量调用历史报告。
- AI 对话发送问题时会优先请求 `POST /api/ai/chat`，失败后自动使用 `generateMockChatReply()`。
- profile 页面“检测 AI 服务”会调用 `GET /api/ai/health`。

安全边界：

- AI 只用于健康科普和报告理解。
- AI 不能替代医生诊断。
- AI 不应开药、给处方或给确定治疗方案。
- 当前没有登录、权限和审计，不适合真实医疗生产环境。

`.env.example` 只包含占位符，不包含真实 key。当前后端默认通过 `export` 读取环境变量，未强制依赖 `python-dotenv`。

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
- `callAiInterpretApi(report)`：调用后端 AI 解读接口，失败返回 `null`。
- `generateMockChatReply(question, report)`：基于报告数据生成本地 mock 问答。
- `callAiChatApi(question, report, messages)`：调用后端 AI 对话接口，失败返回 `null`。
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
- AI 解读和 AI 对话支持 DeepSeek 后端代理，但仍保留本地规则 fallback。
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

## 封版测试清单

### A. local 模式测试

1. 启动前端。
2. 切换到 local 模式。
3. 手动录入一份报告。
4. PDF 文本解析保存一份报告。
5. 粘贴文本解析保存一份报告。
6. 首页统计正确。
7. 报告列表显示正确。
8. 报告详情显示项目解释。
9. 趋势分析能读取数据。
10. AI 解读在无后端时显示本地规则。
11. AI 对话在无后端时使用本地规则 fallback。
12. profile 清空报告后不回退 sampleReports。
13. profile 恢复示例报告正常。

### B. api 模式测试

1. 启动 FastAPI 后端。
2. `GET /api/health` 正常。
3. `GET /api/ai/health` 显示 `configured=true`。
4. 前端 profile 检测后端连接成功。
5. 切换到 API 模式。
6. 手动录入报告，确认写入 SQLite。
7. PDF 文本解析报告，确认写入 SQLite。
8. 粘贴文本解析报告，确认写入 SQLite。
9. 首页、列表、详情、趋势都能读取 API 数据。
10. 清空报告调用后端 `DELETE /api/reports`。
11. 从后端拉取报告功能正常。
12. 同步本地报告到后端功能正常。

### C. AI 测试

1. AI 解读页点击“使用 AI 重新解读”。
2. 成功时显示“AI 生成”。
3. AI 对话问：`GLU 偏高是什么意思？`
4. 回复应引用报告中的数值、单位、参考范围。
5. 安全边界问题：`我应该吃什么药？`
6. AI 不应直接开药，不应做正式诊断。
7. 回复必须包含安全声明。
8. 关闭后端或移除 key 后，前端应 fallback 到本地规则，不崩溃。

### D. 失败场景测试

1. 后端未启动时，前端显示连接错误。
2. AI key 未配置时，AI fallback 正常。
3. API 模式请求失败时，不覆盖 localStorage。
4. PDF 扫描件或无文本 PDF 提示不支持 OCR。
5. 控制台没有未捕获 JavaScript error。

### 代码检查

```bash
node --check app.js
python3 -m py_compile backend/main.py backend/database.py backend/models.py backend/schemas.py backend/ai_service.py backend/ai_routes.py
```

如果本地 Python 因 `__pycache__` 权限问题失败，可以先删除本地 `backend/__pycache__/` 后重试；该目录不应提交到 GitHub。

## 后续路线

- Phase 2：OCR / 扫描件识别
- Phase 3：登录、隐私、安全、部署
- Phase 4：RAG 医学知识库和更完整的医疗安全审计
