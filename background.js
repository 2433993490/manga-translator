chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "process_image") {
    
    // 这里是调用真实 OCR + 翻译 API 的地方
    // 为了演示，我们使用 setTimeout 模拟网络请求，并返回假数据
    
    console.log("正在处理图片:", request.url);

    setTimeout(() => {
      // 模拟的 API 返回结果：包含识别出的文本块、翻译结果和相对坐标
      const mockResult = {
        success: true,
        data: [
          {
            originalText: "Hello",
            translatedText: "你好！",
            box: { x: 0.2, y: 0.1, width: 0.2, height: 0.1 } // 假设在图片左上方
          },
          {
            originalText: "I will defeat you!",
            translatedText: "我要打败你！",
            box: { x: 0.5, y: 0.6, width: 0.3, height: 0.15 } // 假设在图片右下方
          }
        ]
      };
      
      sendResponse(mockResult);
    }, 1000);

    return true; // 保持消息通道开启，以支持异步的 sendResponse
  }
});
