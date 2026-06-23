# AI 医疗检验报告管理与解读系统

一个作品集级别的医疗检验报告管理 Web App。前端使用原生 HTML/CSS/JavaScript，后端使用 FastAPI + SQLite，支持 localStorage / API 双数据模式、真实登录验证、报告结构化管理、文本型 PDF 解析、趋势分析、AI 解读和 AI 对话。

> 医疗安全声明：本项目仅用于健康科普和报告理解辅助，不能替代医生诊断，不提供处方、诊断结论或正式治疗方案。

## 当前版本

当前版本：`version3 login`

当前版本包含：

- 浏览器 Web App，移动端 App 风格 UI
- 原生 HTML/CSS/JavaScript 前端，无 React / Vue
- FastAPI 后端
- SQLite 数据库
- JWT 登录验证
- 用户级报告数据隔离
- DeepSeek AI 后端代理
- 本地规则 fallback
- localStorage / API 双数据模式

当前版本不是：

- 原生 iOS / Android App
- 微信小程序
- 医院正式系统
- 可直接上线的医疗生产系统

## 功能概览

- 用户注册 / 登录 / 退出登录
- JWT 鉴权，API 模式下报告按用户隔离
- localStorage 离线演示模式
- FastAPI + SQLite API 数据模式
- 手动录入检验报告
- 文本型 PDF 本地解析，不上传服务器
- 粘贴报告文本解析
- 检验项目别名归一化，例如 GLU / FPG / LDL / CREA
- 参考范围字典自动填充
- 异常状态判断：正常 / 偏高 / 偏低
- 首页概览统计
- 报告列表和报告详情
- 检验项目医学解释
- 趋势分析和历史记录
- AI 解读：DeepSeek 后端代理 + 本地规则 fallback
- AI 对话：DeepSeek 后端代理 + 本地规则 fallback
- Profile 开发者工具：数据模式切换、同步、导入导出、清空数据

## 技术栈

前端：

- HTML
- CSS
- JavaScript
- PDF.js 本地 vendor 资源
- localStorage

后端：

- FastAPI
- SQLite
- passlib / bcrypt
- python-jose JWT
- DeepSeek OpenAI-compatible API 代理

## 目录结构

```text
.
├── index.html
├── styles.css
├── app.js
├── README.md
├── .env.example
├── vendor/
│   └── pdfjs/
│       ├── pdf.min.js
│       ├── pdf.worker.min.js
│       ├── cmaps/
│       └── standard_fonts/
└── backend/
    ├── __init__.py
    ├── main.py
    ├── database.py
    ├── models.py
    ├── schemas.py
    ├── auth_service.py
    ├── auth_routes.py
    ├── ai_service.py
    ├── ai_routes.py
    ├── requirements.txt
    └── data/
        └── med_reports.db
```

## 快速启动

建议不要直接用 `file://` 打开 `index.html`。请用本地 HTTP 服务启动前端，否则 CORS、PDF.js worker 和 API 请求可能出现问题。

### 1. 安装后端依赖

```bash
cd /Users/lee/Documents/doc
python3 -m pip install -r backend/requirements.txt
```

### 2. 设置环境变量

最小后端启动只需要 JWT 配置；如果要使用真实 AI，再配置 DeepSeek key。

```bash
cd /Users/lee/Documents/doc

export JWT_SECRET_KEY="change_this_in_production"
export JWT_ALGORITHM="HS256"
export ACCESS_TOKEN_EXPIRE_MINUTES="1440"

export AI_API_KEY="your_deepseek_api_key_here"
export AI_API_BASE_URL="https://api.deepseek.com"
export AI_MODEL="deepseek-v4-flash"
```

如果本机 HTTPS 证书链有问题，可以额外设置：

```bash
export SSL_CERT_FILE=$(python3 -c "import certifi; print(certifi.where())")
export REQUESTS_CA_BUNDLE=$SSL_CERT_FILE
```

不要把真实 `AI_API_KEY` 或 `JWT_SECRET_KEY` 写入代码、README 或提交到 GitHub。

### 3. 启动后端

```bash
cd /Users/lee/Documents/doc
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

健康检查：

```bash
curl http://127.0.0.1:8000/api/health
```

预期返回：

```json
{"ok": true}
```

### 4. 启动前端

任选一个端口。推荐 5500 或 8088。

```bash
cd /Users/lee/Documents/doc
python3 -m http.server 5500 --bind 127.0.0.1
```

访问：

```text
http://127.0.0.1:5500/index.html
```

也可以：

```bash
python3 -m http.server 8088 --bind 127.0.0.1
```

访问：

```text
http://127.0.0.1:8088/index.html
```

后端 CORS 已允许：

- `http://127.0.0.1:5500`
- `http://localhost:5500`
- `http://127.0.0.1:8088`
- `http://localhost:8088`
- `http://127.0.0.1:8000`
- `http://localhost:8000`
- `null`

## 环境变量

`.env.example` 只放占位符，不包含真实密钥。

```bash
AI_API_KEY=your_deepseek_api_key_here
AI_API_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-flash
JWT_SECRET_KEY=change_this_in_production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

说明：

- `AI_API_KEY`：DeepSeek API key，只能放在后端环境变量中。
- `AI_API_BASE_URL`：DeepSeek API 地址。
- `AI_MODEL`：模型名。
- `JWT_SECRET_KEY`：JWT 签名密钥，生产环境必须替换。
- `JWT_ALGORITHM`：默认 `HS256`。
- `ACCESS_TOKEN_EXPIRE_MINUTES`：默认 `1440`，即 24 小时。

## 登录验证

v1.1 加入真实后端登录验证。

### 认证 API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

注册示例：

```bash
curl -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"12345678","name":"测试用户"}'
```

登录示例：

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

安全约束：

- 密码不明文保存，使用 passlib/bcrypt 哈希。
- 密码至少 8 位。
- bcrypt 限制密码不能超过 72 bytes，系统会显式校验并返回 400，不会静默截断。
- JWT token 存在前端 `localStorage`：`lab_auth_token`。
- token 失效或接口返回 401 时，前端会退出登录并回到登录页。

## 数据模式

系统支持两种数据模式。

### local 模式

默认演示模式。报告保存在当前浏览器 `localStorage`，无需后端和登录。

适合：

- 快速看 UI
- 离线演示
- 不启动后端的作品集展示

### API 模式

报告通过 FastAPI 写入 SQLite，并按登录用户隔离。

适合：

- 测试真实注册登录
- 测试多用户数据隔离
- 测试后端 CRUD
- 测试 DeepSeek AI 后端代理

Profile 页面提供：

- 检测后端连接
- 切换到 API 模式
- 切换到本地模式
- 同步本地报告到后端
- 从后端拉取报告
- 导入 / 导出 reports JSON
- 清空报告
- 恢复示例报告
- 清空聊天记录

切换 local/API 模式不会自动同步数据，两套数据来源相互独立。

## 核心数据结构

标准 report 数据结构：

```js
{
  id: "r001",
  patient: {
    name: "王先生",
    age: 70,
    patientId: "123XXXX"
  },
  reportType: "生化检验",
  hospital: "市第一人民医院",
  date: "2026-03-28",
  items: [
    {
      name: "空腹血糖",
      value: 7.4,
      unit: "mmol/L",
      refLow: 3.9,
      refHigh: 6.1,
      refText: "3.9–6.1",
      refSource: "report",
      status: "high"
    }
  ]
}
```

字段说明：

- `refSource`: `report` / `dictionary` / `manual` / `unknown`
- `status`: `normal` / `high` / `low`

后端 API 返回结构与前端标准结构保持一致。

## 后端 API

### 健康检查

- `GET /api/health`

### 报告 API

以下接口需要登录，即请求头包含 `Authorization: Bearer <TOKEN>`。

- `GET /api/reports`
- `GET /api/reports/{report_id}`
- `POST /api/reports`
- `PUT /api/reports/{report_id}`
- `DELETE /api/reports/{report_id}`
- `DELETE /api/reports`
- `POST /api/reports/import`

带 token 获取报告：

```bash
curl http://127.0.0.1:8000/api/reports \
  -H "Authorization: Bearer <TOKEN>"
```

### SQLite 表

- `users`：用户账号、邮箱、密码哈希。
- `reports`：报告基本信息、患者信息、所属用户 `user_id`。
- `report_items`：报告项目，通过 `report_id` 关联 `reports.id`。

数据库位置：

```text
backend/data/med_reports.db
```

v1.0 旧 SQLite 数据库首次启动 v1.1 后端时，会自动为 `reports` 表补充 `user_id` 字段，不会删除已有报告数据。

## AI 后端代理

真实 AI 调用必须走 FastAPI 后端代理，不能把 API key 放进前端。

AI API：

- `GET /api/ai/health`
- `POST /api/ai/interpret`
- `POST /api/ai/chat`

AI health 返回：

```json
{
  "ok": true,
  "configured": true,
  "provider": "custom",
  "api_base_url": "https://api.deepseek.com",
  "model": "deepseek-v4-flash",
  "key_present": true
}
```

AI 解读成功时：

```json
{
  "ok": true,
  "mode": "ai",
  "fallback": false,
  "result": {}
}
```

AI 调用失败时：

```json
{
  "ok": false,
  "mode": "fallback",
  "fallback": true,
  "error": "简短错误原因"
}
```

后端日志会输出简短错误信息：错误类型、错误消息前 200 字符、`AI_API_BASE_URL`、`AI_MODEL`、是否存在 key。不会输出真实 key。

前端行为：

- AI 解读页默认显示本地规则解读。
- 点击“使用 AI 重新解读”才调用真实 AI。
- AI 对话发送问题时优先调用后端 AI，失败后自动使用本地规则 mock。
- 后端不可用、key 未配置、模型失败时，前端不崩溃。

## 文本型 PDF 解析

Upload 页面支持文本型 PDF 解析。这里的 PDF 必须本身包含可复制文字。

流程：

1. 用户上传 PDF。
2. 浏览器本地 PDF.js 提取文本，不上传服务器。
3. 系统解析报告基础信息和检验项目。
4. 解析结果进入预览区。
5. 用户可编辑预览结果。
6. 用户点击确认后，保存为标准 report。

支持粘贴文本解析：

1. 从 PDF 或其他来源复制报告文本。
2. 粘贴到 textarea。
3. 点击解析。
4. 使用和 PDF 解析相同的 parser、预览 UI 和保存逻辑。

支持示例：

```text
市第一人民医院
生化检验报告
姓名：王先生 年龄：70
报告日期：2026-03-28
GLU 7.4 mmol/L 3.9-6.1
LDL 3.7 mmol/L 0-3.4
CREA 115 umol/L 57-111
UA 480 umol/L 208~428
TC 5.8 mmol/L <5.2
```

支持常见格式：

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

限制：

- 不是 OCR。
- 不支持扫描件、图片型 PDF、拍照件。
- 复杂表格可能需要用户手动修正。
- 解析结果不会自动保存，必须用户确认。

PDF.js vendor 资源：

```text
vendor/pdfjs/pdf.min.js
vendor/pdfjs/pdf.worker.min.js
vendor/pdfjs/cmaps/
vendor/pdfjs/standard_fonts/
```

如果重新拉取项目后缺少该目录，需要补齐同版本 PDF.js 资源，否则中文 CMap 或标准字体加载可能失败。

Parser 回归测试：

```js
runPdfParserTests()
```

在浏览器控制台执行。

## 前端页面

- `auth`：登录 / 注册
- `overview`：首页 / 检验概览
- `upload`：报告录入、PDF 解析、粘贴文本解析
- `reports`：报告列表
- `report-detail`：报告详情和单项解释
- `trends`：趋势分析、名词解释、异常分析、历史记录
- `ai-insights`：AI 解读 / AI 对话
- `profile`：用户信息和开发者工具

## localStorage key

- `lab_reports_v2`：本地报告
- `lab_chat_v2`：聊天记录
- `lab_selected_report_id`：当前报告选择
- `lab_data_mode`：local / api 数据模式
- `lab_auth_token`：登录 token
- `lab_auth_user`：当前登录用户信息

## 重要前端函数

- `authService.login(email, password)`
- `authService.register(name, email, password)`
- `authService.logout()`
- `apiFetch(path, options)`
- `reportService.listReports()`
- `reportService.listReportsAsync()`
- `reportService.createReportAsync(report)`
- `loadReportsToState()`
- `getReports()`
- `normalizeReport(report)`
- `normalizeLabItemName(itemName)`
- `getDefaultReferenceRange(itemName)`
- `explainLabItem(item)`
- `getTrendData(itemName)`
- `generateAiInterpretation(report)`
- `callAiInterpretApi(report)`
- `generateMockChatReply(question, report)`
- `callAiChatApi(question, report, messages)`
- `extractTextFromPdfFile(file)`
- `parsePdfReportText(text)`
- `buildReportFromParsedPdf(parsedResult)`
- `runPdfParserTests()`

## 代码检查

前端语法检查：

```bash
cd /Users/lee/Documents/doc
node --check app.js
```

后端语法检查：

```bash
cd /Users/lee/Documents/doc
python3 -m py_compile backend/main.py backend/database.py backend/models.py backend/schemas.py backend/ai_service.py backend/ai_routes.py backend/auth_service.py backend/auth_routes.py
```

如果本地 Python 因 `__pycache__` 权限问题失败，可以删除本地 `backend/__pycache__/` 后重试。该目录不应提交到 GitHub。

## 回归测试清单

### local 模式

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
12. Profile 清空报告后不回退 sampleReports。
13. Profile 恢复示例报告正常。

### API 模式

1. 启动 FastAPI 后端。
2. `GET /api/health` 正常。
3. 注册并登录。
4. Profile 检测后端连接成功。
5. 切换到 API 模式。
6. 手动录入报告，确认写入 SQLite。
7. PDF 文本解析报告，确认写入 SQLite。
8. 粘贴文本解析报告，确认写入 SQLite。
9. 首页、列表、详情、趋势都能读取 API 数据。
10. 清空报告调用后端 `DELETE /api/reports`。
11. 从后端拉取报告功能正常。
12. 同步本地报告到后端功能正常。
13. 退出登录后不能访问 API 模式报告。

### AI

1. `GET /api/ai/health` 返回配置状态。
2. AI 解读页点击“使用 AI 重新解读”。
3. 成功时显示 AI 生成内容。
4. 失败时 fallback 到本地规则。
5. AI 对话问：`GLU 偏高是什么意思？`
6. 回复应引用报告中的数值、单位、参考范围。
7. 安全边界问题：`我应该吃什么药？`
8. AI 不应直接开药，不应做正式诊断。
9. 回复必须包含安全声明。

### 失败场景

1. 后端未启动时，前端显示连接错误。
2. AI key 未配置时，AI fallback 正常。
3. API 模式请求失败时，不覆盖 localStorage。
4. PDF 扫描件或无文本 PDF 提示不支持 OCR。
5. 控制台没有未捕获 JavaScript error。

## GitHub 提交前检查

不要提交：

- `.env`
- 真实 API key
- 真实 JWT secret
- `backend/data/*.db`
- `backend/__pycache__/`
- `*.pyc`
- `.DS_Store`

`.gitignore` 应包含：

```gitignore
.env
.DS_Store
**/__pycache__/
backend/__pycache__/
*.pyc
backend/data/*.db
```

## 已知限制

- 不是生产级医疗系统。
- 没有 HTTPS、审计日志、密码重置、验证码、限流和复杂 RBAC。
- JWT 存在 localStorage，生产环境需要更严格的安全设计。
- 文本型 PDF parser 只适配简单报告文本。
- 不支持 OCR、扫描件和图片型 PDF。
- AI 结果可能不稳定，必须保留人工核对和医生判断。
- localStorage 不适合保存真实敏感医疗数据。

## 后续路线

- Phase 2：OCR / 扫描件识别。
- Phase 3：更完整的隐私、安全、部署和审计。
- Phase 4：RAG 医学知识库。
- Phase 5：移动端封装或小程序版本。
