/**
 * おとり物件バスター - Service Worker (Background)
 * バッジ管理、メッセージハンドリング
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_RESULT') {
    handleScanResult(message.data, sender.tab);
    sendResponse({ ok: true });
  }

  if (message.type === 'GET_STATUS') {
    sendResponse({ ok: true, enabled: true });
  }

  return true;
});

/**
 * スキャン結果を受信してアイコンバッジを更新
 * @param {Object} data - { site, total, danger, warning, caution, safe }
 * @param {chrome.tabs.Tab} tab
 */
function handleScanResult(data, tab) {
  if (!tab || !tab.id) return;

  const dangerCount = data.danger || 0;
  const warningCount = data.warning || 0;

  if (dangerCount > 0) {
    chrome.action.setBadgeText({ text: `${dangerCount}`, tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#f44336', tabId: tab.id });
  } else if (warningCount > 0) {
    chrome.action.setBadgeText({ text: `${warningCount}`, tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#ff9800', tabId: tab.id });
  } else if (data.total > 0) {
    chrome.action.setBadgeText({ text: `${data.total}`, tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#4caf50', tabId: tab.id });
  } else {
    chrome.action.setBadgeText({ text: '', tabId: tab.id });
  }

  // タブごとの結果をストレージに保存
  chrome.storage.session.set({ [`tab_${tab.id}`]: data });
}

// タブが閉じられたらセッションストレージをクリーン
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`tab_${tabId}`);
});

// 拡張機能インストール時の初期設定
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(null, (existing) => {
    const defaults = {
      enabled: true,
      showBadge: true,
      showDetailOnHover: false,
      dangerThreshold: 70
    };

    const merged = { ...defaults, ...existing };
    chrome.storage.local.set(merged);
  });
});
