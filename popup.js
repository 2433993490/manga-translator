const DEFAULT_SETTINGS = {
  openaiUnified: true,
  openaiEndpoint: "https://api.openai.com/v1/chat/completions",
  openaiApiKey: "",
  openaiModel: "gpt-4.1-mini",
  ocrProvider: "openai_vision",
  ocrEndpoint: "https://api.openai.com/v1/chat/completions",
  ocrApiKey: "",
  translationProvider: "openai_text",
  translationEndpoint: "https://api.openai.com/v1/chat/completions",
  translationApiKey: "",
  targetLanguage: "zh"
};

const fields = {
  openaiUnified: document.getElementById("openaiUnified"),
  openaiEndpoint: document.getElementById("openaiEndpoint"),
  openaiApiKey: document.getElementById("openaiApiKey"),
  openaiModel: document.getElementById("openaiModel"),
  ocrProvider: document.getElementById("ocrProvider"),
  ocrEndpoint: document.getElementById("ocrEndpoint"),
  ocrApiKey: document.getElementById("ocrApiKey"),
  translationProvider: document.getElementById("translationProvider"),
  translationEndpoint: document.getElementById("translationEndpoint"),
  translationApiKey: document.getElementById("translationApiKey"),
  targetLanguage: document.getElementById("targetLanguage")
};

const statusEl = document.getElementById("status");
const advancedCard = document.getElementById("advancedCard");

document.addEventListener("DOMContentLoaded", init);
document.getElementById("saveBtn").addEventListener("click", saveSettings);
document.getElementById("translateBtn").addEventListener("click", translateCurrentTab);
fields.openaiUnified.addEventListener("change", syncAdvancedVisibility);

async function init() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  for (const [key, input] of Object.entries(fields)) {
    if (input.type === "checkbox") {
      input.checked = Boolean(stored[key]);
    } else {
      input.value = stored[key] ?? DEFAULT_SETTINGS[key];
    }
  }
  syncAdvancedVisibility();
}

function syncAdvancedVisibility() {
  advancedCard.classList.toggle("hidden", fields.openaiUnified.checked);
}

async function saveSettings() {
  const settings = readSettings();
  await chrome.storage.sync.set(settings);
  setStatus("配置已保存。", false);
}

async function translateCurrentTab() {
  try {
    const settings = readSettings();
    await chrome.storage.sync.set(settings);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus("未找到当前标签页。", true);
      return;
    }

    await chrome.tabs.sendMessage(tab.id, { action: "translate_images", settings });
    setStatus("已触发翻译任务，请查看页面结果。", false);
  } catch (error) {
    setStatus(`触发失败：${error.message}`, true);
  }
}

function readSettings() {
  const base = {
    openaiUnified: fields.openaiUnified.checked,
    openaiEndpoint: fields.openaiEndpoint.value.trim() || DEFAULT_SETTINGS.openaiEndpoint,
    openaiApiKey: fields.openaiApiKey.value.trim(),
    openaiModel: fields.openaiModel.value.trim() || DEFAULT_SETTINGS.openaiModel,
    ocrProvider: fields.ocrProvider.value,
    ocrEndpoint: fields.ocrEndpoint.value.trim(),
    ocrApiKey: fields.ocrApiKey.value.trim(),
    translationProvider: fields.translationProvider.value,
    translationEndpoint: fields.translationEndpoint.value.trim(),
    translationApiKey: fields.translationApiKey.value.trim(),
    targetLanguage: fields.targetLanguage.value.trim() || "zh"
  };

  if (base.openaiUnified) {
    return {
      ...base,
      ocrProvider: "openai_vision",
      ocrEndpoint: base.openaiEndpoint,
      ocrApiKey: base.openaiApiKey,
      translationProvider: "openai_text",
      translationEndpoint: base.openaiEndpoint,
      translationApiKey: base.openaiApiKey
    };
  }

  return base;
}

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b91c1c" : "#065f46";
}
