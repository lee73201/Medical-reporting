# 医疗 App 原型交接文档

## 1. 项目概况

本项目是一个原生 HTML、CSS、JavaScript 实现的医疗健康移动端 App 原型。当前版本不使用 React、Vue 或其他前端框架，也没有构建流程，直接通过浏览器打开 `index.html` 即可运行。

主要文件：

- `index.html`：页面结构、各业务页面容器、按钮跳转入口。
- `styles.css`：整体视觉系统、移动端布局、卡片样式、新增业务页面样式。
- `app.js`：页面切换、登录流程、健康助手、本地 mock 数据、预约/用药/费用交互逻辑。

当前版本保留了原有功能：

- 登录、找回密码、验证码、新密码流程。
- 首页。
- 检验报告概览。
- 近期报告。
- 异常指标。
- 趋势分析。
- 健康解读/健康助手聊天。

当前版本新增了首页三个快捷入口和对应页面：

- 预约管理：`appointments`
- 费用支付：`billing`
- 用药记录：`medications`

## 2. 页面结构

所有页面都是 `index.html` 中的 `<section class="screen ...">`。页面显示与隐藏由 `app.js` 的 `showScreen(id)` 控制。

现有主要页面 ID：

- `login`：登录页。
- `forgot`：找回密码页。
- `verify`：验证码页。
- `reset`：设置新密码页。
- `home`：首页。
- `overview`：检验概览页。
- `reports`：近期报告页。
- `abnormal`：异常指标页。
- `trend`：趋势分析页。
- `insight`：健康解读/健康助手页。
- `healthy`：正常报告页。
- `appointments`：预约管理页。
- `billing`：费用支付页。
- `medications`：用药记录页。

页面跳转机制：

- 任意元素只要带有 `data-go="目标页面ID"`，点击后会触发 `showScreen(目标页面ID)`。
- `showScreen()` 会给目标页面添加 `.active`，并移除其他页面的 `.active`。
- 页面切换后会将当前页面滚动条重置到顶部。
- 底部导航是否显示由 `appScreens` 集合控制。

## 3. 首页快捷功能

首页位于 `index.html` 的 `#home` 页面。

快捷功能按钮如下：

```html
<button class="quick-action-card" data-go="appointments">预约管理</button>
<button class="quick-action-card" data-go="billing">费用支付</button>
<button class="quick-action-card" data-go="medications">用药记录</button>
<button class="quick-action-card active" data-go="overview">检验报告</button>
```

功能说明：

- 点击“预约管理”进入 `appointments` 页面。
- 点击“费用支付”进入 `billing` 页面。
- 点击“用药记录”进入 `medications` 页面。
- 点击“检验报告”仍然进入原有 `overview` 页面。

## 4. 新增页面：预约管理

页面 ID：`appointments`

页面入口：

- 首页“预约管理”按钮。

页面结构：

- 顶部 `page-header`，左侧返回按钮 `data-go="home"`。
- 内容容器：`<div id="appointments-content"></div>`
- 页面内容由 `renderAppointments()` 动态渲染。

功能内容：

- “下次预约”卡片：
  - 科室：内分泌科
  - 医生：李医生
  - 日期：2026年4月2日
  - 时间：默认 09:30，用户选择后更新
  - 状态：默认“待确认”，确认后显示“已预约”

- “可预约科室”列表：
  - 内分泌科
  - 心内科
  - 全科门诊

- “预约时间”区域：
  - 09:30
  - 10:30
  - 14:00
  - 15:30

交互逻辑：

- 点击时间段按钮：
  - 保存所选时间到 `localStorage`
  - 移除已确认状态
  - 重新渲染预约页面
  - 被选中的时间段添加 `.selected`

- 点击“确认预约”：
  - 如果用户未手动选择时间，则使用默认时间 `09:30`
  - 将预约确认状态保存到 `localStorage`
  - 状态改为“已预约”
  - 显示提示“预约成功，已为您保留该时间段。”

相关 localStorage key：

- `health_app_selected_slot`
- `health_app_appointment_confirmed`

## 5. 新增页面：用药记录

页面 ID：`medications`

页面入口：

- 首页“用药记录”按钮。

页面结构：

- 顶部 `page-header`，左侧返回按钮 `data-go="home"`。
- 内容容器：`<div id="medications-content"></div>`
- 页面内容由 `renderMedications()` 动态渲染。

当前 mock 药物：

1. 二甲双胍
   - 剂量：0.5g
   - 频率：每日 2 次
   - 时间：早餐后、晚餐后
   - 备注：随餐或餐后服用，记录血糖变化

2. 阿托伐他汀
   - 剂量：20mg
   - 频率：每日 1 次
   - 时间：睡前
   - 备注：关注肌肉酸痛等不适

3. 氨氯地平
   - 剂量：5mg
   - 频率：每日 1 次
   - 时间：早晨
   - 备注：定期记录血压

功能内容：

- 当前用药列表。
- 今日服药记录。
- 医疗安全提示。

交互逻辑：

- 点击“标记已服用”按钮：
  - 将对应药物 ID 的服用状态保存在 `localStorage`
  - 按钮文案切换为“已服用”
  - 药物卡片状态 badge 切换为“已服用”

- 再次点击“已服用”：
  - 取消该药物今日服用记录
  - 状态回到“待记录”

安全限制：

- 页面只做记录和提醒。
- 不生成处方建议。
- 不建议用户自行用药。
- 安全提示文案为：
  “用药信息仅用于记录和提醒，请按照医生处方使用，不要自行调整剂量、停药或加药。”

相关 localStorage key：

- `health_app_medication_taken`

该 key 保存 JSON 对象，例如：

```json
{
  "metformin": true,
  "atorvastatin": false
}
```

## 6. 新增页面：费用支付

页面 ID：`billing`

页面入口：

- 首页“费用支付”按钮。

页面结构：

- 顶部 `page-header`，左侧返回按钮 `data-go="home"`。
- 内容容器：`<div id="billing-content"></div>`
- 页面内容由 `renderBilling()` 动态渲染。

mock 账单：

- 项目名称：血液生化检查
- 日期：2026.03.28
- 金额：¥86.50
- 状态：默认“待支付”，支付后变为“已支付”

费用明细：

- 检验费：¥68.00
- 报告服务费：¥12.50
- 平台记录费：¥6.00

交互逻辑：

- 点击“模拟支付”：
  - 将支付状态保存到 `localStorage`
  - 账单 badge 改为“已支付”
  - 按钮文案改为“已完成支付”
  - 按钮变为 disabled
  - 显示“支付成功，账单状态已更新。”

注意：

- 当前版本没有接入真实支付接口。
- “模拟支付”只修改本地状态。

相关 localStorage key：

- `health_app_bill_paid`

## 7. 健康助手功能

页面 ID：`insight`

当前健康助手仍保留原有交互逻辑，并未被新增页面破坏。

主要函数：

- `sendAdvisorMessage(rawText)`
- `appendUserMessage(text)`
- `appendLoadingMessage()`
- `playLoadingSteps(loadingNode)`
- `appendClinicalResponse(userText)`
- `buildClinicalCards(userText)`
- `extractSignalsFromText(text)`

交互流程：

1. 用户在输入框 `#advisor-input` 输入健康问题。
2. 点击发送按钮 `#advisor-send`，或按 Enter。
3. 页面添加用户气泡。
4. 显示 loading 气泡，并依次展示：
   - 正在整理您的描述...
   - 正在识别主要症状...
   - 正在生成健康建议...
   - 正在检查危险信号...
5. 约 1.25 秒后生成结构化健康建议卡片。

输出卡片：

- 症状概览
- 可能方向
- 建议措施
- 危险信号

当前识别关键词：

- 发热/发烧/高烧/fever/temperature
- 咳嗽/cough
- 胸痛/chest pain
- 口渴/thirsty
- 乏力/fatigue/tired
- 呼吸困难/喘/shortness/breath
- 糖尿病/diabetes
- 高血压/hypertension
- 三天/3天/3 days
- 意识模糊/confusion
- 用药/药/medicine/medication

医疗安全声明：

```text
本内容仅用于健康教育和就医准备，不能替代专业医生诊断或治疗建议。
```

## 8. Mock 数据结构

mock 数据统一定义在 `app.js` 的 `mockData`：

```js
const mockData = {
  patient: {},
  appointments: {},
  medications: [],
  bills: {}
};
```

用途：

- `mockData.patient`：患者基础信息，目前作为预留数据。
- `mockData.appointments`：预约页面数据。
- `mockData.medications`：用药页面数据。
- `mockData.bills`：费用页面数据。

后续如果要接后端，可以优先替换 `mockData` 的来源，而不是重写页面结构。

## 9. localStorage 状态

状态 key 集中定义在 `stateKeys`：

```js
const stateKeys = {
  appointmentSlot: "health_app_selected_slot",
  appointmentConfirmed: "health_app_appointment_confirmed",
  medicationTaken: "health_app_medication_taken",
  billPaid: "health_app_bill_paid",
};
```

清空演示状态的方法：

在浏览器控制台执行：

```js
localStorage.removeItem("health_app_selected_slot");
localStorage.removeItem("health_app_appointment_confirmed");
localStorage.removeItem("health_app_medication_taken");
localStorage.removeItem("health_app_bill_paid");
```

或者直接清空当前站点 localStorage。

## 10. 样式实现

项目整体视觉风格仍保持当前中文医疗 App 风格：

- 蓝白主色。
- 浅灰/浅蓝背景。
- 圆角卡片。
- 柔和阴影。
- 移动端 390px 宽度适配。
- 中文字体优先使用：
  - `PingFang SC`
  - `Noto Sans SC`
  - `Microsoft YaHei`

新增样式主要在 `styles.css` 底部：

- `.detail-grid`：详情字段两列布局。
- `.option-list` / `.option-row`：科室列表。
- `.time-slot-grid` / `.time-slot`：预约时间段。
- `.medication-list` / `.medication-card`：用药卡片。
- `.today-medication-list` / `.action-row`：今日服药记录。
- `.compact-action`：紧凑型操作按钮。
- `.billing-card` / `.bill-total` / `.bill-item-list` / `.bill-item`：账单 UI。
- 小屏兜底 media query，避免横向滚动。

## 11. 验收流程

建议按以下步骤测试：

1. 打开：

   ```text
   file:///Users/lee/Documents/doc/index.html
   ```

2. 登录流程：

   - 点击“安全登录”
   - 应进入首页

3. 首页快捷入口：

   - 点击“预约管理”
   - 应进入预约管理页
   - 点击返回，应回到首页

   - 点击“费用支付”
   - 应进入费用支付页
   - 点击返回，应回到首页

   - 点击“用药记录”
   - 应进入用药记录页
   - 点击返回，应回到首页

   - 点击“检验报告”
   - 应进入原有检验概览页

4. 预约管理：

   - 点击任意时间段
   - 时间段应高亮
   - 点击“确认预约”
   - 状态应变为“已预约”
   - 应显示预约成功提示

5. 费用支付：

   - 点击“模拟支付”
   - 状态应变为“已支付”
   - 按钮应变为“已完成支付”并禁用
   - 应显示支付成功提示

6. 用药记录：

   - 点击任意“标记已服用”
   - 对应药物状态应变为“已服用”
   - 再次点击可切回“待记录”

7. 健康助手：

   - 进入检验流程中的“健康解读”
   - 输入问题，例如：

     ```text
     我发烧三天了，还有咳嗽
     ```

   - 应显示 loading
   - 应输出结构化健康建议卡片

8. 控制台检查：

   - 打开浏览器开发者工具
   - 操作上述流程
   - 控制台不应出现 JavaScript 报错

## 12. 后续扩展建议

后续可以按以下方向继续迭代：

- 将 `mockData` 替换为真实后端接口返回。
- 给预约管理增加科室选择后的医生列表。
- 给用药记录增加提醒时间和通知权限。
- 给费用支付接入真实支付前，应新增支付确认页和风控提示。
- 健康助手如果重新接入后端，应保留当前卡片化展示，不直接展示 JSON。
- 增加“我的”页面，与底部导航中的用户中心形成完整闭环。

## 13. 当前限制

- 当前所有新增功能都是前端原型模拟。
- 没有真实后端。
- 没有真实支付。
- 没有真实预约系统。
- 用药记录只做提醒和记录，不提供处方或自行用药建议。

