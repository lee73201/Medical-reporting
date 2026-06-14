const screens = Array.from(document.querySelectorAll(".screen"));
const nav = document.querySelector(".bottom-nav");
const navButtons = Array.from(document.querySelectorAll(".bottom-nav button"));
const appScreens = new Set(["home", "overview", "reports", "abnormal", "trend", "healthy"]);
const SAFETY_NOTICE = "本内容仅用于健康教育和就医准备，不能替代专业医生诊断或治疗建议。";
const LOADING_STEPS = [
  "正在整理您的描述...",
  "正在识别主要症状...",
  "正在生成健康建议...",
  "正在检查危险信号...",
];

const chatThread = document.querySelector("#chat-thread");
const advisorInput = document.querySelector("#advisor-input");
const advisorSend = document.querySelector("#advisor-send");
const chatState = {
  isAnalyzing: false,
};

function showScreen(id) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.id === id);
    if (screen.id === id) {
      screen.scrollTop = 0;
    }
  });

  nav.classList.toggle("visible", appScreens.has(id));
  navButtons.forEach((button) => {
    const target = button.dataset.go;
    const active =
      target === id ||
      (target === "overview" && ["home", "overview", "trend", "insight"].includes(id)) ||
      (target === "reports" && ["reports", "healthy"].includes(id)) ||
      (target === "abnormal" && id === "abnormal");
    button.classList.toggle("active", active);
  });
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-go]");
  if (!trigger) return;
  showScreen(trigger.dataset.go);
});

document.querySelector("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  showScreen("home");
});

document.querySelector("#recovery-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const feedback = document.querySelector("#recovery-feedback");
  feedback.textContent = "重置链接已发送，请查看您的邮箱或手机短信。";
  window.setTimeout(() => showScreen("verify"), 650);
});

document.querySelector("#reset-form").addEventListener("submit", (event) => {
  event.preventDefault();
  window.setTimeout(() => showScreen("login"), 650);
});

document.querySelectorAll(".otp-grid input").forEach((input, index, inputs) => {
  input.addEventListener("input", () => {
    if (input.value && inputs[index + 1]) {
      inputs[index + 1].focus();
    }
  });
});

advisorSend.addEventListener("click", () => {
  sendAdvisorMessage(advisorInput.value);
});

advisorInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendAdvisorMessage(advisorInput.value);
  }
});

document.querySelectorAll("[data-prompt]").forEach((chip) => {
  chip.addEventListener("click", () => {
    sendAdvisorMessage(chip.dataset.prompt);
  });
});

showScreen("login");

function sendAdvisorMessage(rawText) {
  const text = String(rawText || "").trim();
  if (!text || chatState.isAnalyzing) return;

  chatState.isAnalyzing = true;
  advisorInput.value = "";
  setAdvisorInputEnabled(false);
  appendUserMessage(text);

  const loadingNode = appendLoadingMessage();
  const stopLoading = playLoadingSteps(loadingNode);

  window.setTimeout(() => {
    stopLoading();
    loadingNode.remove();
    appendClinicalResponse(text);
    chatState.isAnalyzing = false;
    setAdvisorInputEnabled(true);
    advisorInput.focus();
    scrollChatToBottom();
  }, 1250);
}

function setAdvisorInputEnabled(enabled) {
  advisorInput.disabled = !enabled;
  advisorSend.disabled = !enabled;
  advisorSend.textContent = enabled ? "发送" : "...";
}

function appendUserMessage(text) {
  const message = document.createElement("div");
  message.className = "chat-message user";
  message.innerHTML = `<div class="chat-bubble"></div>`;
  message.querySelector(".chat-bubble").textContent = text;
  chatThread.append(message);
  scrollChatToBottom();
}

function appendLoadingMessage() {
  const message = document.createElement("div");
  message.className = "chat-message ai loading";
  message.innerHTML = `
    <div class="chat-bubble">
      <span class="typing-dot"></span>
      <span class="loading-text">${LOADING_STEPS[0]}</span>
    </div>
  `;
  chatThread.append(message);
  scrollChatToBottom();
  return message;
}

function playLoadingSteps(loadingNode) {
  let index = 0;
  const label = loadingNode.querySelector(".loading-text");
  const timer = window.setInterval(() => {
    index = Math.min(index + 1, LOADING_STEPS.length - 1);
    label.textContent = LOADING_STEPS[index];
    scrollChatToBottom();
  }, 420);

  return () => window.clearInterval(timer);
}

function appendClinicalResponse(userText) {
  const cards = buildClinicalCards(userText);
  const message = document.createElement("div");
  message.className = "chat-message ai";
  message.innerHTML = `
    <div class="clinical-response">
      ${cards.map(renderClinicalCard).join("")}
      <p class="safety-note">${SAFETY_NOTICE}</p>
    </div>
  `;
  chatThread.append(message);
  scrollChatToBottom();
}

function buildClinicalCards(userText) {
  const signals = extractSignalsFromText(userText);

  return [
    {
      title: "症状概览",
      tone: "blue",
      items: [
        ["本次描述", userText],
        ["主要信息", signals.summary],
        ["需要补充", "建议继续补充体温、持续时间、既往疾病、正在用药和过敏史，便于医生进一步判断。"],
      ],
    },
    {
      title: "可能方向",
      tone: "green",
      items: [
        ["初步判断", signals.possibleCause],
        ["需要排除", signals.differentials],
      ],
    },
    {
      title: "建议措施",
      tone: "purple",
      items: [
        ["现在可以做", signals.selfCare],
        ["建议检查", signals.tests],
        ["就医建议", signals.followUp],
      ],
    },
    {
      title: "危险信号",
      tone: "red",
      items: [
        ["立即就医", signals.warningSigns.length ? signals.warningSigns.join("；") : "呼吸困难；持续高热；意识模糊；胸痛加重"],
        ["安全提醒", "如果症状快速加重、出现明显虚弱、血氧下降或疼痛加重，请及时联系医生或前往急诊。"],
      ],
    },
  ];
}

function renderClinicalCard(card) {
  return `
    <section class="clinical-response-card ${card.tone}">
      <h3>${escapeHtml(card.title)}</h3>
      ${card.items
        .map(([label, value]) => `
          <div class="clinical-row">
            <strong>${escapeHtml(label)}</strong>
            <p>${escapeHtml(value)}</p>
          </div>
        `)
        .join("")}
    </section>
  `;
}

function extractSignalsFromText(text) {
  const normalized = String(text || "").toLowerCase();
  const symptoms = [];
  const risks = [];
  const warningSigns = [];

  const has = (patterns) => patterns.some((pattern) => normalized.includes(pattern));
  if (has(["fever", "发烧", "发热", "高烧", "temperature"])) symptoms.push("发热");
  if (has(["cough", "咳嗽"])) symptoms.push("咳嗽");
  if (has(["chest pain", "胸痛", "胸口痛"])) {
    symptoms.push("胸痛");
    warningSigns.push("胸痛加重");
  }
  if (has(["thirsty", "口渴", "多饮"])) symptoms.push("口渴");
  if (has(["tired", "fatigue", "乏力", "疲劳"])) symptoms.push("乏力");
  if (has(["shortness", "breath", "呼吸困难", "喘"])) {
    symptoms.push("呼吸不适");
    warningSigns.push("呼吸困难");
  }
  if (has(["diabetes", "糖尿病"])) risks.push("糖尿病史");
  if (has(["hypertension", "高血压"])) risks.push("高血压史");
  if (has(["3 days", "三天", "3天"])) risks.push("症状约 3 天");
  if (has(["confusion", "意识模糊", "神志"])) warningSigns.push("意识模糊");
  if (has(["high fever", "高热", "持续高热"])) warningSigns.push("持续高热");

  const symptomText = symptoms.length ? symptoms.join("、") : "您描述的不适";
  const respiratory = has(["fever", "发烧", "发热"]) && has(["cough", "咳嗽"]);
  const glucose = has(["thirsty", "口渴", "多饮", "diabetes", "糖尿病", "blood sugar", "血糖"]);
  const medication = has(["medication", "medicine", "药", "用药", "吃什么"]);

  let possibleCause = "目前信息适合先做基础分流，尚不能判断具体疾病。";
  let differentials = "可根据后续信息进一步区分感染、代谢异常、心肺问题或药物相关不适。";
  let tests = "建议记录体温、血压、心率、血糖等基础数据；症状持续时可咨询医生是否需要血常规、尿检或影像检查。";
  let selfCare = "先注意休息、补充水分，记录症状变化，避免自行叠加处方药或抗生素。";
  let followUp = "如果症状持续、加重或影响日常活动，建议预约医生进一步评估。";

  if (respiratory) {
    possibleCause = "发热合并咳嗽时，呼吸道感染是需要考虑的方向；如果伴随胸痛、气促或持续高热，需要更谨慎。";
    differentials = "需要排除普通上呼吸道感染、流感或其他病毒感染、支气管炎、肺部感染，以及胸痛相关的心肺问题。";
    tests = "可记录体温和血氧；如咳嗽加重、胸痛或气促，医生可能会建议血常规、炎症指标或胸部影像检查。";
    followUp = "若发热超过 3 天、咳嗽加重、胸痛明显或出现气促，建议尽快就医。";
  }

  if (glucose) {
    possibleCause = "口渴、乏力或糖尿病史提示需要关注血糖波动、脱水或感染诱发的代谢异常。";
    differentials = "需要排除高血糖、低血糖、感染相关血糖升高、脱水，以及药物或饮食改变造成的血糖波动。";
    tests = "建议记录指尖血糖或连续血糖数据；症状明显时可咨询医生是否需要尿酮、血酮、电解质等检查。";
    selfCare = "先补充水分，避免高糖饮料和高糖食物；不要自行大幅调整降糖药剂量。";
    followUp = "如果血糖持续明显升高、出现呕吐、嗜睡、明显乏力或呼吸异常，应及时就医。";
  }

  if (medication) {
    possibleCause = "用药建议需要结合诊断、既往病史、过敏史、当前用药和肝肾功能，不能只凭一句描述决定。";
    differentials = "需要先明确症状原因，再考虑是否需要退热、止咳、抗感染、降糖或其他治疗。";
    tests = "建议补充当前用药、过敏史、基础疾病和症状严重程度，必要时由医生评估药物相互作用。";
    selfCare = "避免自行叠加处方药、抗生素或多种退烧止痛药；使用非处方药也要注意禁忌。";
    followUp = "如需要处方药或症状较重，应预约医生确认诊断和用药方案。";
  }

  return {
    summary: `主要提到：${symptomText}${risks.length ? `；相关背景：${risks.join("、")}` : ""}。`,
    risks,
    warningSigns,
    possibleCause,
    differentials,
    tests,
    selfCare,
    followUp,
  };
}

function scrollChatToBottom() {
  requestAnimationFrame(() => {
    chatThread.scrollTop = chatThread.scrollHeight;
    const activeScreen = document.querySelector(".screen.active");
    if (activeScreen) activeScreen.scrollTop = activeScreen.scrollHeight;
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
