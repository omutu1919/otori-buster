/**
 * おとり物件バスター - Service Worker (Background)
 * バッジ管理、メッセージハンドリング
 */

// 通報APIのデフォルトURL（report-config.jsはcontent scriptのみで読み込まれるため、ここにも定義）
const REPORT_API_URL = 'https://tsumocchi.com/api/otori-report';

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
    return true; // 非同期レスポンス
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
    // storage.localからAPI URLを取得（設定画面で変更可能にする想定）
    const settings = await chrome.storage.local.get({ reportApiUrl: REPORT_API_URL });
    const apiUrl = settings.reportApiUrl;

    if (apiUrl.includes('your-server.example.com')) {
      // ローカルにだけ保存（サーバー未設定時）
      await saveReportLocally(data);
      return { ok: true, local: true };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // ローカルにも保存
    await saveReportLocally(data);
    return { ok: true };
  } catch (err) {
    // サーバー送信失敗でもローカルには保存
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
