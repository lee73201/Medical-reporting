const screens = Array.from(document.querySelectorAll(".screen"));
const nav = document.querySelector(".bottom-nav");
const navButtons = Array.from(document.querySelectorAll(".bottom-nav button"));
const appScreens = new Set(["home", "overview", "reports", "abnormal", "trend", "healthy"]);

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
  feedback.textContent = "Reset link sent. Please check your email or phone.";
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

showScreen("login");
