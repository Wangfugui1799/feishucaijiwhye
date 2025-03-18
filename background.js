// 飞书多维表格链接采集器 - 后台服务逻辑

// 飞书API配置
const FEISHU_CONFIG = {
  APP_ID: 'cli_a75d4581c333901c',
  APP_SECRET: 'NYEnic0G01H1Jy7mtdiMXe6HEQVYrrJl',
  BASE_ID: 'JbVTbIZZGaC7nQsfv1BcaYNrneg',
  TABLE_ID: 'tbl3thMMWApyDAZc',
  FIELD_NAME: '链接' // 字段名称
};

// 飞书API接口
const FEISHU_API = {
  GET_TENANT_ACCESS_TOKEN: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
  ADD_RECORD: (baseId, tableId) => `https://open.feishu.cn/open-apis/bitable/v1/apps/${baseId}/tables/${tableId}/records`
};

/**
 * 监听来自popup的消息
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // 确保异步响应
  const keepAliveCallback = true;
  
  if (request.action === 'saveLink') {
    saveLinkToFeishu(request.data)
      .then(result => {
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('保存链接失败:', error);
        sendResponse({ success: false, error: error.message || '保存失败' });
      });
  } else {
    sendResponse({ success: false, error: '未知操作' });
  }
  
  return keepAliveCallback;
});

/**
 * 保存链接到飞书多维表格
 * @param {Object} data - 链接数据
 * @param {string} data.url - 链接URL
 * @param {string} data.displayText - 显示文本
 * @returns {Promise} - 保存结果
 */
async function saveLinkToFeishu(data) {
  try {
    // 1. 获取访问令牌
    const token = await getFeishuAccessToken();
    
    // 2. 构建记录数据
    const recordData = {
      fields: {
        [FEISHU_CONFIG.FIELD_NAME]: {
          text: data.displayText,
          link: data.url
        }
      }
    };
    
    // 3. 添加记录
    const response = await fetch(FEISHU_API.ADD_RECORD(FEISHU_CONFIG.BASE_ID, FEISHU_CONFIG.TABLE_ID), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(recordData)
    });
    
    // 4. 处理响应
    const result = await response.json();
    
    if (!response.ok || result.code !== 0) {
      throw new Error(result.msg || '飞书API调用失败');
    }
    
    // 记录成功日志
    console.log('链接保存成功:', result);
    return result;
  } catch (error) {
    console.error('保存链接过程中出错:', error);
    throw error;
  }
}

/**
 * 获取飞书访问令牌
 * @returns {Promise<string>} - 访问令牌
 */
async function getFeishuAccessToken() {
  try {
    // 检查缓存中是否有有效的令牌
    const cachedToken = await getCachedToken();
    if (cachedToken) {
      return cachedToken;
    }
    
    // 请求新令牌
    const response = await fetch(FEISHU_API.GET_TENANT_ACCESS_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: FEISHU_CONFIG.APP_ID,
        app_secret: FEISHU_CONFIG.APP_SECRET
      })
    });
    
    const result = await response.json();
    
    if (!response.ok || result.code !== 0) {
      throw new Error(result.msg || '获取飞书访问令牌失败');
    }
    
    // 缓存令牌
    await cacheToken(result.tenant_access_token, result.expire);
    
    return result.tenant_access_token;
  } catch (error) {
    console.error('获取飞书访问令牌失败:', error);
    throw error;
  }
}

/**
 * 从缓存中获取令牌
 * @returns {Promise<string|null>} - 缓存的令牌或null
 */
async function getCachedToken() {
  return new Promise(resolve => {
    chrome.storage.local.get(['feishuToken', 'tokenExpiry'], function(result) {
      if (result.feishuToken && result.tokenExpiry) {
        // 检查令牌是否过期（提前5分钟刷新）
        const now = Date.now();
        const expiryTime = result.tokenExpiry;
        
        if (now < expiryTime - 5 * 60 * 1000) {
          resolve(result.feishuToken);
          return;
        }
      }
      resolve(null);
    });
  });
}

/**
 * 缓存令牌
 * @param {string} token - 访问令牌
 * @param {number} expireIn - 过期时间（秒）
 * @returns {Promise<void>}
 */
async function cacheToken(token, expireIn) {
  return new Promise(resolve => {
    // 计算过期时间（毫秒）
    const expiryTime = Date.now() + expireIn * 1000;
    
    // 存储令牌和过期时间
    chrome.storage.local.set({
      feishuToken: token,
      tokenExpiry: expiryTime
    }, function() {
      resolve();
    });
  });
}