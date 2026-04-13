chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "process_image") {
    
    console.log("正在处理图片 URL:", request.url);

    // 1. 获取图片并转换为 Base64
    fetchImageAsBase64(request.url)
      .then(base64 => {
        // 2. 发送给本地的 Python API (端口 8000)
        return fetch('http://127.0.0.1:8000/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ base64_img: base64 })
        });
      })
      .then(response => response.json())
      .then(result => {
        console.log("Python 后端返回结果:", result);
        sendResponse(result); // 将真实结果返回给 content.js 去画框
      })
      .catch(error => {
        console.error("处理出错:", error);
        sendResponse({ success: false, error: error.toString() });
      });

    return true; // 保持异步消息通道开启
  }
});

// 辅助函数：突破防盗链下载图片并转为 Base64
async function fetchImageAsBase64(url) {
  // 注意：Pixiv 需要 referer 才能下载大图
  const response = await fetch(url, {
    headers: {
      "Referer": "https://www.pixiv.net/" 
    }
  });
  
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
