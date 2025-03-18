// 飞书多维表格链接采集器 - 弹出窗口逻辑

document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const saveButton = document.getElementById('saveButton');
  const statusContainer = document.getElementById('statusContainer');
  
  // 绑定保存按钮点击事件
  saveButton.addEventListener('click', function() {
    // 禁用按钮，防止重复点击
    saveButton.disabled = true;
    
    // 显示加载状态
    showStatus('loading', '正在保存链接...');
    
    // 获取当前标签页信息
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs.length > 0) {
        const currentTab = tabs[0];
        const url = currentTab.url;
        
        // 提取域名作为显示文本
        const displayText = extractDomain(url);
        
        // 发送消息到后台服务
        chrome.runtime.sendMessage(
          {
            action: 'saveLink',
            data: {
              url: url,
              displayText: displayText
            }
          },
          function(response) {
            // 处理响应
            if (response && response.success) {
              showStatus('success', '链接保存成功！');
            } else {
              const errorMsg = response && response.error ? response.error : '未知错误';
              showStatus('error', `保存失败: ${errorMsg}`);
            }
            
            // 延迟启用按钮
            setTimeout(function() {
              saveButton.disabled = false;
            }, 1000);
          }
        );
      } else {
        showStatus('error', '无法获取当前页面信息');
        saveButton.disabled = false;
      }
    });
  });
  
  /**
   * 显示状态信息
   * @param {string} type - 状态类型：loading, success, error
   * @param {string} message - 状态消息
   */
  function showStatus(type, message) {
    // 清除之前的状态类
    statusContainer.className = 'status';
    
    // 设置新的状态类和内容
    if (type === 'loading') {
      statusContainer.classList.add('loading');
      statusContainer.innerHTML = `<div class="spinner"></div>${message}`;
    } else {
      statusContainer.classList.add(type);
      statusContainer.textContent = message;
    }
  }
  
  /**
   * 从URL中提取域名
   * @param {string} url - 完整URL
   * @returns {string} - 提取的域名
   */
  function extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      console.error('URL解析错误:', e);
      return url; // 解析失败时返回原始URL
    }
  }
});