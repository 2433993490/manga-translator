document.getElementById('translateBtn').addEventListener('click', async () => {
  // 获取当前活跃的标签页
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // 向当前页面的 content.js 发送消息
  chrome.tabs.sendMessage(tab.id, { action: "translate_images" });
});
