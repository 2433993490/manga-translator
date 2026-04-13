const DEFAULT_SETTINGS = {
  ocrProvider: "local_paddle",
  ocrEndpoint: "http://127.0.0.1:8000/api/ocr",
  ocrApiKey: "",
  translationProvider: "none",
  translationEndpoint: "https://libretranslate.com/translate",
  translationApiKey: "",
  targetLanguage: "zh"
};

const fields = {
  ocrProvider: document.getElementById("ocrProvider"),
  ocrEndpoint: document.getElementById("ocrEndpoint"),
  ocrApiKey: document.getElementById("ocrApiKey"),
  translationProvider: document.getElementById("translationProvider"),
  translationEndpoint: document.getElementById("translationEndpoint"),
  translationApiKey: document.getElementById("translationApiKey"),
  targetLanguage: document.getElementById("targetLanguage")
};

const statusEl = document.getElementById("status");

document.addEventListener("DOMContentLoaded", init);
document.getElementById("saveBtn").addEventListener("click", saveSettings);
document.getElementById("translateBtn").addEventListener("click", translateCurrentTab);

async function init() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  Object.entries(fields).forEach(([key, input]) => {
    input.value = stored[key] ?? DEFAULT_SETTINGS[key];
  });
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

    await chrome.tabs.sendMessage(tab.id, {
      action: "translate_images",
      settings
    });
    setStatus("已触发翻译任务，请查看页面结果。", false);
  } catch (error) {
    setStatus(`触发失败：${error.message}`, true);
  }
}

function readSettings() {
  return {
    ocrProvider: fields.ocrProvider.value,
    ocrEndpoint: fields.ocrEndpoint.value.trim(),
    ocrApiKey: fields.ocrApiKey.value.trim(),
    translationProvider: fields.translationProvider.value,
    translationEndpoint: fields.translationEndpoint.value.trim(),
    translationApiKey: fields.translationApiKey.value.trim(),
    targetLanguage: fields.targetLanguage.value.trim() || "zh"
  };
}

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b91c1c" : "#065f46";
}
