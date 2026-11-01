# AI 医疗检验报告管理与解读系统

## 项目简介

这是一个医疗检验报告管理 MVP，用于录入、管理和解读医疗检验报告。系统支持检验项目异常识别、历史趋势分析、规则化 AI 解读、本地 mock AI 对话，以及可选的 FastAPI + SQLite 数据持久化。

当前支持浏览器本地 OCR（扫描件、图片型 PDF 和报告图片），不做用户登录。前端默认使用浏览器 `localStorage`，也可以在 profile 开发者工具中切换到 API 模式，从本地 FastAPI 后端读取和保存报告数据；AI 解读/对话可通过 FastAPI 后端代理调用 DeepSeek，失败时自动回退到本地规则 mock。

## 扫描件与报告图片：version7-local-ocr

这是对 HTML 项目的增量更新，没有改变标准 report 数据结构、后端 API 或现有检验项目 parser 规则。

### 使用流程

1. 通过 HTTP 打开应用，例如 `http://127.0.0.1:8088/index.html`，不要直接双击 HTML。
2. 在“上传报告”选择 PDF、PNG、JPG 或 WebP。文本 PDF 优先提取文字；没有可解析项目的页面自动渲染成图片进行 OCR，混合 PDF 逐页处理。
3. 如果 PDF 的文字层存在但不完整，可勾选“使用图片识别（OCR）重试文字缺失的 PDF”，让整份 PDF 逐页改用 OCR。此模式可能比原生文字提取更不准确。
4. 识别结果复用现有解析预览，可修改患者、医院、日期、项目、数值、单位和参考范围。无法整理项目时，仍可打开已识别文字修正。
5. “查看 / 修正 OCR 文字”允许修正识别文字并重新调用同一套 `parsePdfReportText()`。没有自动纠正数字、小数点或猜测单位的规则。
6. 必须逐项对照原件，勾选核对确认后再保存。修改字段会取消勾选，需要重新核对。所有结果只在明确确认后调用现有 `saveUploadedReport()`：local 写入 `lab_reports_v2`，API 调用现有报告 API。

### 资源、隐私与限制

- 引擎为 Tesseract.js 6.0.1 / core 6.0.0，简体中文与英文语言包来自官方 tessdata_fast。全部位于 `vendor/ocr/`，不依赖 OCR CDN 或外部 OCR 服务。来源与许可见 [资源说明](vendor/ocr/README.md)。
- `ocr.js` 按需加载识别 worker；PDF.js 负责将扫描页渲染为 canvas。识别引擎与语言包约 20MB（目录总量），浏览器只加载当前选中的 core 变体。
- 原 PDF/图片不上传服务器，不写入 localStorage，也不在日志中打印识别全文。确认后的结构化报告按当前数据模式保存；之后主动调用真实 AI 仍会按原有流程发送结构化报告到后端 AI 代理。
- 单文件最多 20MB、PDF 最多 10 页、输入图片最多 2500 万像素；每页识别画布最多约 600 万像素，长边不超过 3200px。超过 PDF 页数限制会整份拒绝，不会悄悄保存部分页面。
- 逐页识别，提供进度、取消、失败重试。切换页面会取消当前任务；初始化期间取消时停止展示结果，并在 worker 创建完成后释放它。
- OCR 可能漏行、误识别小数点、数值、日期或单位。单位与字典常用单位不同时提示核对，**不会直接替换为字典单位**。字段完整度不代表识别准确率，引擎字符置信度也不是医学准确率。
- 推荐清晰、正向、单列表格的打印报告。模糊、倾斜、旋转、手写、多栏复杂表格、定性结果以及全部真实医院版式未充分验证。无法确认时改用手动录入，不要据此诊断。
- 没有新增后端 OCR、云识别、用户认证或隐私隔离能力；仍不适合存储真实敏感医疗数据。

### 测试

```bash
node --check app.js
node --check ocr.js
node --test tests/frontend.test.cjs tests/ocr.test.cjs
```

前端自动测试 41/41 通过，覆盖资源缺失、worker 复用、初始化/识别取消、超时、画布限制、混合 PDF 分流、页数限制、保存前核对、原文参考文本保留和原有数据流程。原 parser 的 14 条用例保持通过；后端临时数据库回归通过，仅有现有测试依赖的弃用提示。

可选生成合成测试文件（测试工具依赖 Pillow、reportlab、pypdf，不是应用运行依赖）：

```bash
python -m pip install Pillow reportlab pypdf
python tests/create_ocr_fixtures.py --output /tmp/medical-ocr-test
```

非 macOS 环境可用 `--font /path/to/chinese-font.ttc` 指定中文字体。生成中文报告 PNG、两页纯图片 PDF、混合 PDF、空白扫描件和 11 页超限文件，均不含真实患者信息。

本次浏览器实际验收：中文图片识别到空腹血糖/LDL/CREA；两页扫描 PDF 识别到 6 项；混合 PDF 仅扫描页运行 OCR；原文本 PDF 样例仍解析出 9 项。也验证了空白文件提示、超限拦截、取消、文字修正重解析、local/API 确认保存与下游页面读取。扫描样例出现过单位误识别和标题被当作项目，需在预览或原始文字中修正；没有宣称对任意医院报告都能准确识别。

## 报告纠错与查找：version6-report-edit-search

在现有页面上增加编辑、搜索和筛选，没有修改后端 API、报告标准结构、PDF parser 或数据模式架构。

### 报告编辑

1. 从报告列表进入详情，点击“编辑报告”。编辑复用 `upload` 容器，编辑时不展示 PDF/粘贴入口。
2. 可以修正报告类型、医院、日期，以及检验项目的名称、数值、单位、参考上下限，也可以添加或删除项目。
3. 保存保留原报告 ID 和患者信息，不会创建重复报告。local 模式更新 `lab_reports_v2`；API 模式调用现有 `PUT /api/reports/{id}`，成功后更新内存缓存。
4. 数值与范围需完整、有限，下限不能大于上限。错误时保留表单；保存中禁用重复提交，离开未保存的编辑会要求确认放弃。
5. 只修改结果数值不会改变参考范围来源；原名称失焦不再覆盖原报告范围。修改单位或范围才标为“手动修改”；未改动的 `<5.2` 等原文范围文本会保留。
6. 实际修改后，旧 AI 解读失效并显示提示，本地解读、统计和趋势按新数据生成。旧请求的 AI 结果不会覆盖新数据。真实 AI 仍需用户主动重新生成；历史聊天不被改写，新提问使用当前报告。

### 搜索与筛选

- 列表顶部搜索医院、报告类型或检验项目，支持 GLU、LDL、CREA 等现有别名。输入实时更新，也支持回车/搜索按钮。
- “筛选条件”可展开报告类型、异常状态、开始/结束日期；日期范围包含首尾两天，开始晚于结束时提示修正。
- 关键词和筛选条件组合生效。清空按钮仅清除关键词；“重置”清除全部条件。
- 结果按日期从新到旧排序，显示筛选数量；“没有匹配的报告”与真正没有报告分开展示。
- local/API 共用同一套筛选函数，对当前加载的完整报告集合进行前端筛选，不会逐次输入请求后端。筛选条件只保留在当前会话，切换数据来源后重置。

### 本次验证

- `node --check app.js`、前端逻辑测试 28/28、原有 PDF parser 测试 14/14、临时数据库后端回归通过。
- 浏览器验证 local 编辑保存、异常数变化、原文参考来源保留、AI 失效提示，以及搜索/清空/组合筛选。
- 通过临时测试报告验证真实 API 编辑、自定义报告类型、非法范围拦截、手动来源保存及刷新持久化；测试记录已清理，原有数据库报告未被修改。
- 手机样式容器实测内容宽度 388px，无横向溢出。当前浏览器工具未能准确模拟 320px CSS 视口，仍需在真实窄屏设备上检查原生日期输入和键盘。
- 本次不包含版本历史/撤销、多人并发冲突控制或服务端分页搜索；历史聊天保留原回复。浏览器原生的离开确认框和关闭页面提醒可能受浏览器策略影响。

## 上一版整理：version5-ui-polish

这是对当前 HTML 项目的增量打磨，不是 Expo 项目的更新。没有修改报告结构、后端 API 或 PDF parser 规则。

- 首页统计默认收起，点击展开，再点同一张卡片收起；患者与日期来自最新报告，不再展示写死的健康评分。
- 页面持续标明本地/API 数据来源；切换模式不自动同步，也不覆盖另一来源的数据。
- 使用较克制的灰白、蓝绿色界面，减少装饰渐变和厚阴影，保留移动端布局和底部导航。
- 趋势节点支持点按、键盘 Enter/空格；移除无效箭头、更多按钮和没有临床依据的风险等级展示。
- API 加载失败可重新加载；请求有超时，页面不展示原始服务错误。切换模式后丢弃旧请求结果。
- 手动和解析确认保存期间禁用提交按钮；聊天有等待反馈、防重复发送和本地规则来源标记。
- Profile 展示存储说明与医疗边界，开发工具默认折叠。同步覆盖后端前需要确认。
- 修复详情页重复进入后解释事件重复绑定的问题。

**该历史版本的边界**：version5 未新增登录或 OCR。当前目录仍没有认证模块或用户隔离，不应当作已经具备 JWT 登录的版本，也不能用于存储真实敏感医疗数据；OCR 状态以文首新版本说明为准。

### 回归测试

无需前端依赖即可运行：

```bash
node --check app.js
node --check ocr.js
node --test tests/frontend.test.cjs tests/ocr.test.cjs
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
- 报告编辑与纠错（保留原 ID 和患者信息）
- 报告搜索、类型/状态/日期组合筛选
- 文本型 PDF 本地解析
- 扫描件 / 图片型 PDF / PNG / JPG / WebP 本地 OCR 与核对预览
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
- Tesseract.js 本地 OCR（不使用云识别服务）
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
5. 用户点击“确认保存解析结果”后，才会按当前数据模式写入标准 `report` 数据结构：local 保存至 `lab_reports_v2`，API 保存至后端。

upload 页面也支持“粘贴报告文本解析”：

1. 从 PDF 或其他文本来源复制报告文字。
2. 粘贴到 textarea。
3. 点击“解析粘贴文本”。
4. 使用与 PDF 上传完全相同的 `parsePdfReportText(text)`、预览 UI 和保存逻辑。

预览区提供“查看解析详情”折叠面板，包含来源、PDF 页数或粘贴文本、提取文本字符数、识别行数、成功解析项目数、未识别行数、参考范围来源统计、置信度和 `unmatchedLines`。

当前实现边界：

- 文本提取分支不是 OCR；扫描页自动切换本地 OCR，详见文首说明。
- 支持可复制文字的 PDF。
- 扫描件、报告图片和图片型 PDF 可使用本地 OCR，但准确率受清晰度、方向和版式影响。
- PDF 文件只在浏览器本地解析，不上传服务器。
- 解析结果不会自动保存，必须由用户在预览区核对并点击“确认保存解析结果”。
- 解析出的报告会进入现有标准 `report` 数据结构，按当前 local/API 模式保存。
- 如果文字提取和 OCR 都无法得到有效项目，可修正 OCR 原始文字或改用手动录入。

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

- 当前是浏览器前端和可选 FastAPI 后端组成的 MVP，不适合医疗生产使用。
- 文本型 PDF 解析只适配简单检验报告，复杂表格可能需要手动修正。
- 扫描件和图片型 PDF 的本地 OCR 需要人工核对；不保证复杂表格、手写、模糊或旋转图片的识别效果。
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
4. PDF 扫描件进入 OCR 核对预览；完全空白文件提示无有效文字，OCR 失败可重试或手动录入。
5. 控制台没有未捕获 JavaScript error。

### 代码检查

```bash
node --check app.js
node --check ocr.js
node --test tests/frontend.test.cjs tests/ocr.test.cjs
python3 -m py_compile backend/main.py backend/database.py backend/models.py backend/schemas.py backend/ai_service.py backend/ai_routes.py
```

如果本地 Python 因 `__pycache__` 权限问题失败，可以先删除本地 `backend/__pycache__/` 后重试；该目录不应提交到 GitHub。

## 后续路线

- 本地 OCR 已加入；后续优先收集真实版式误识别反馈和核对体验，不默认扩展云识别。
- Phase 3：登录、隐私、安全、部署
- Phase 4：RAG 医学知识库和更完整的医疗安全审计
