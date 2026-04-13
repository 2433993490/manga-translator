// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate_images") {
    processImages();
  }
});

async function processImages() {
  const images = document.querySelectorAll('img');
  
  for (let img of images) {
    // 过滤掉太小的图片（通常是图标等）
    if (img.width < 150 || img.height < 150) continue;

    // 1. 获取图片 URL
    const imageUrl = img.src;

    // 2. 将图片信息发送给 background.js 请求 OCR 和翻译
    chrome.runtime.sendMessage(
      { action: "process_image", url: imageUrl },
      (response) => {
        if (response && response.success) {
          // 3. 根据返回的数据在图片上绘制翻译层
          drawTranslationOverlays(img, response.data);
        }
      }
    );
  }
}

function drawTranslationOverlays(img, translationData) {
  // 为了让绝对定位的遮罩层能对齐图片，我们需要获取图片在页面中的绝对位置
  const rect = img.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // 假设 translationData 包含了多个文本块及其在图片上的相对坐标（百分比或像素）
  translationData.forEach(block => {
    const overlay = document.createElement('div');
    overlay.className = 'manga-translation-overlay';
    overlay.innerText = block.translatedText;

    // 此处假设 block.box 返回的是相对于图片左上角的相对比例 (0.0 到 1.0)
    // 真实 API (如 Google Vision) 会返回具体坐标，需要在此进行换算
    overlay.style.left = (rect.left + scrollLeft + (img.width * block.box.x)) + 'px';
    overlay.style.top = (rect.top + scrollTop + (img.height * block.box.y)) + 'px';
    overlay.style.width = (img.width * block.box.width) + 'px';
    overlay.style.height = (img.height * block.box.height) + 'px';

    document.body.appendChild(overlay);
  });
}
