const OVERLAY_SELECTOR = ".manga-translation-overlay, .manga-translation-container";

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "translate_images") {
    processImages(request.settings).catch((error) => {
      console.error("图片翻译失败:", error);
    });
  }
});

async function processImages(settings) {
  clearOldOverlays();

  const images = Array.from(document.querySelectorAll("img"));
  for (const img of images) {
    if (img.width < 180 || img.height < 180) continue;

    const response = await chrome.runtime.sendMessage({
      action: "process_image",
      url: img.currentSrc || img.src,
      settings
    });

    if (!response?.success) {
      console.warn("单张图片处理失败:", response?.error || "未知错误");
      continue;
    }

    drawTranslationOverlays(img, response.data || []);
  }
}

function drawTranslationOverlays(img, translationData) {
  if (!translationData.length) return;

  const wrapper = document.createElement("div");
  wrapper.className = "manga-translation-container";

  const rect = img.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  wrapper.style.left = `${rect.left + scrollLeft}px`;
  wrapper.style.top = `${rect.top + scrollTop}px`;
  wrapper.style.width = `${img.width}px`;
  wrapper.style.height = `${img.height}px`;

  translationData.forEach((block) => {
    const overlay = document.createElement("div");
    overlay.className = "manga-translation-overlay";
    overlay.title = block.originalText || "";
    overlay.innerText = block.translatedText || block.originalText || "";

    overlay.style.left = `${img.width * block.box.x}px`;
    overlay.style.top = `${img.height * block.box.y}px`;
    overlay.style.width = `${img.width * block.box.width}px`;
    overlay.style.height = `${img.height * block.box.height}px`;

    wrapper.appendChild(overlay);
  });

  document.body.appendChild(wrapper);
}

function clearOldOverlays() {
  document.querySelectorAll(OVERLAY_SELECTOR).forEach((node) => node.remove());
}
