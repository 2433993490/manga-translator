chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "process_image") return;

  processImage(request)
    .then((result) => sendResponse({ success: true, data: result }))
    .catch((error) => {
      console.error("处理出错:", error);
      sendResponse({ success: false, error: error.message || String(error) });
    });

  return true;
});

async function processImage({ url, settings }) {
  if (!url) {
    throw new Error("图片地址为空。");
  }

  const base64 = await fetchImageAsBase64(url);
  const ocrBlocks = await runOCR(base64, url, settings);

  if (!ocrBlocks.length) {
    return [];
  }

  return runTranslation(ocrBlocks, settings);
}

async function runOCR(base64, url, settings) {
  if (settings.ocrProvider === "custom_http") {
    return normalizeBlocks(
      await callJsonApi(settings.ocrEndpoint, settings.ocrApiKey, {
        image_base64: base64,
        image_url: url,
        scene: "manga"
      })
    );
  }

  const endpoint = settings.ocrEndpoint || "http://127.0.0.1:8000/api/ocr";
  return normalizeBlocks(
    await callJsonApi(endpoint, settings.ocrApiKey, {
      base64_img: base64
    })
  );
}

async function runTranslation(blocks, settings) {
  const provider = settings.translationProvider;
  if (provider === "none") {
    return blocks;
  }

  if (provider === "libretranslate") {
    const endpoint = settings.translationEndpoint || "https://libretranslate.com/translate";
    return translateByLibre(endpoint, settings.translationApiKey, settings.targetLanguage, blocks);
  }

  if (provider === "custom_http") {
    const response = await callJsonApi(settings.translationEndpoint, settings.translationApiKey, {
      texts: blocks.map((b) => b.originalText),
      target_language: settings.targetLanguage,
      source_language: "auto",
      scene: "manga"
    });

    const translatedTexts = response.translations || response.data || [];
    return blocks.map((block, index) => ({
      ...block,
      translatedText: translatedTexts[index] || block.originalText
    }));
  }

  return blocks;
}

async function translateByLibre(endpoint, apiKey, targetLanguage, blocks) {
  const translated = [];

  for (const block of blocks) {
    const payload = {
      q: block.originalText,
      source: "auto",
      target: targetLanguage || "zh",
      format: "text"
    };

    if (apiKey) payload.api_key = apiKey;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate 调用失败: HTTP ${response.status}`);
    }

    const result = await response.json();
    translated.push({
      ...block,
      translatedText: result.translatedText || block.originalText
    });
  }

  return translated;
}

async function callJsonApi(endpoint, apiKey, body) {
  if (!endpoint) {
    throw new Error("接口地址为空，请在弹窗中先配置。\n");
  }

  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 120)}`);
  }

  return response.json();
}

function normalizeBlocks(response) {
  const blocks = response.data || response.blocks || response.result || [];

  return blocks
    .filter((block) => block?.box)
    .map((block) => ({
      originalText: block.originalText || block.text || "",
      translatedText: block.translatedText || block.translation || block.originalText || block.text || "",
      box: {
        x: clamp01(Number(block.box.x)),
        y: clamp01(Number(block.box.y)),
        width: clamp01(Number(block.box.width)),
        height: clamp01(Number(block.box.height))
      }
    }));
}

function clamp01(value) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

async function fetchImageAsBase64(url) {
  const response = await fetch(url, {
    headers: {
      Referer: "https://www.pixiv.net/"
    }
  });

  if (!response.ok) {
    throw new Error(`下载图片失败: HTTP ${response.status}`);
  }

  const blob = await response.blob();
  return blobToBase64(blob);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
