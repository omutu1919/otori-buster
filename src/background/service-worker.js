/**
 * おとり物件バスター - Service Worker (Background)
 * バッジ管理、メッセージハンドリング
 */

// 通報APIのデフォルトURL（report-config.jsはcontent scriptのみで読み込まれるため、ここにも定義）
const REPORT_API_URL = 'https://ai-kakudai.com/api/otori-report';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_RESULT') {
    handleScanResult(message.data, sender.tab);
    sendResponse({ ok: true });
  }

  if (message.type === 'GET_STATUS') {
    sendResponse({ ok: true, enabled: true });
  }

  if (message.type === 'REPORT_OTORI') {
    handleReport(message.data).then(sendResponse);
    return true;
  }

  if (message.type === 'FETCH_REPORT_COUNTS') {
    fetchReportCounts(message.urls).then(sendResponse);
    return true;
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

/**
 * 通報データをサーバーに送信
 * @param {Object} data - 通報データ
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function handleReport(data) {
  try {
    const response = await fetch(REPORT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await saveReportLocally(data);
    return { ok: true };
  } catch (err) {
    await saveReportLocally(data);
    return { ok: true, local: true, serverError: err.message };
  }
}

/**
 * 通報データをchrome.storage.localに保存
 */
async function saveReportLocally(data) {
  const result = await chrome.storage.local.get({ reports: [] });
  const reports = [...result.reports, { ...data, savedAt: new Date().toISOString() }];
  // 最大500件保持
  const trimmed = reports.length > 500 ? reports.slice(-500) : reports;
  await chrome.storage.local.set({ reports: trimmed });
}

/**
 * 通報件数をサーバーから取得
 * @param {string[]} urls
 * @returns {Promise<{ok: boolean, counts?: Object}>}
 */
async function fetchReportCounts(urls) {
  try {
    const response = await fetch(`${REPORT_API_URL}/counts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls })
    });

    if (!response.ok) return { ok: false, counts: {} };

    const data = await response.json();
    return { ok: true, counts: data.counts || {} };
  } catch (err) {
    return { ok: false, counts: {}, error: err.message };
  }
}

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
