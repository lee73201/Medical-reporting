# AI 医疗检验报告管理与解读系统

## 项目简介

这是一个医疗检验报告管理 MVP，用于录入、管理和解读医疗检验报告。系统支持检验项目异常识别、历史趋势分析、规则化 AI 解读、本地 mock AI 对话，以及可选的 FastAPI + SQLite 数据持久化。

当前版本不接真实 OCR，不做用户登录。前端默认使用浏览器 `localStorage`，也可以在 profile 开发者工具中切换到 API 模式，从本地 FastAPI 后端读取和保存报告数据；AI 解读/对话可通过 FastAPI 后端代理调用 DeepSeek，失败时自动回退到本地规则 mock。

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
python3 -m http.server 8088 --bind 127.0.0.1
```

然后访问：

```text
http://127.0.0.1:8088/index.html
```

后端：

```bash
cd /Users/lee/Documents/doc
export AI_API_KEY="your_deepseek_api_key_here"
export AI_API_BASE_URL="https://api.deepseek.com"
export AI_MODEL="deepseek-v4-flash"
export SSL_CERT_FILE=$(python3 -c "import certifi; print(certifi.where())")
export REQUESTS_CA_BUNDLE=$SSL_CERT_FILE
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

不要把真实 `AI_API_KEY` 写入代码、README 或提交到 GitHub。可以参考 `.env.example` 保存占位配置。

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

## v1.1 登录验证与用户隔离

v1.0 旧 SQLite 数据库会在首次启动 v1.1 后端时自动为 reports 表补充 user_id 字段，不会删除已有报告数据。

本版本加入后端真实注册、登录和 JWT 鉴权。API 模式下，报告数据按登录用户隔离；local 模式仍保留为离线演示模式，数据只保存在当前浏览器 localStorage，不会同步到账号。

### 认证相关环境变量

不要把真实密钥写进代码或提交到 GitHub。可以在启动后端前设置：

```bash
export JWT_SECRET_KEY="change_this_in_production"
export JWT_ALGORITHM="HS256"
export ACCESS_TOKEN_EXPIRE_MINUTES="1440"
```

`.env.example` 已包含占位配置。生产环境必须替换 `JWT_SECRET_KEY`，不要使用示例值。

### 后端认证 API

- `POST /api/auth/register`：注册用户，成功后返回 token 和 user。
- `POST /api/auth/login`：登录，成功后返回 token 和 user。
- `GET /api/auth/me`：读取当前用户，需要 `Authorization: Bearer <TOKEN>`。
- `POST /api/auth/logout`：返回 `{ "ok": true }`，前端负责删除 token。

### 报告 API 鉴权

以下接口在 API 模式下都需要登录，并且只读写当前用户自己的报告：

- `GET /api/reports`
- `GET /api/reports/{report_id}`
- `POST /api/reports`
- `PUT /api/reports/{report_id}`
- `DELETE /api/reports/{report_id}`
- `DELETE /api/reports`
- `POST /api/reports/import`

前端会把 `lab_auth_token` 中的 token 自动加到 API 请求头。token 失效或接口返回 401 时，前端会清除登录状态并回到登录页。

### 前端登录行为

- API 模式未登录时，会显示登录/注册页面。
- 登录或注册成功后进入首页。
- Profile 页面显示当前登录用户，并提供退出登录按钮。
- local 模式不强制登录，可用于离线作品集演示。
- 切换到 API 模式但尚未登录时，会先进入登录页。

### curl 验证命令

注册：

```bash
curl -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"12345678","name":"测试用户"}'
```

登录：

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"12345678"}'
```

获取当前用户：

```bash
curl http://127.0.0.1:8000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

带 token 获取报告：

```bash
curl http://127.0.0.1:8000/api/reports \
  -H "Authorization: Bearer <TOKEN>"
```

### 安全说明

- 密码使用 passlib/bcrypt 哈希后保存，不存明文密码。
- JWT secret 从环境变量读取，不应提交真实值。
- 当前没有复杂 RBAC、审计、密码重置和第三方登录，不适合直接作为真实医疗生产系统。
- 医疗解释仍仅供健康科普和报告理解参考，不能替代医生诊断。

