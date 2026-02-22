/**
 * おとり物件バスター - Popup Script
 */

;(() => {
  'use strict';

  const toggleEl = document.getElementById('toggleEnabled');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const summarySection = document.getElementById('summarySection');

  // 設定読み込み
  chrome.storage.local.get({ enabled: true }, (settings) => {
    toggleEl.checked = settings.enabled;
    updateUI(settings.enabled);
  });

  // 有効/無効トグル
  toggleEl.addEventListener('change', () => {
    const enabled = toggleEl.checked;
    chrome.storage.local.set({ enabled });
    updateUI(enabled);

    // 現在のタブでコンテンツスクリプトに通知
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE', enabled }).catch(() => {});
      }
    });
  });

  // 現在のタブのスキャン結果を取得
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    const tabId = tabs[0].id;

    chrome.storage.session.get(`tab_${tabId}`, (result) => {
      const data = result[`tab_${tabId}`];
      if (data) {
        showSummary(data);
      } else {
        statusText.textContent = '対応サイトで物件一覧を開いてください';
      }
    });
  });

  /**
   * UIの有効/無効表示を更新
   * @param {boolean} enabled
   */
  function updateUI(enabled) {
    const popup = document.querySelector('.popup');
    if (enabled) {
      popup.classList.remove('popup--disabled');
      statusText.textContent = 'スキャン中...';
    } else {
      popup.classList.add('popup--disabled');
      statusIcon.textContent = '--';
      statusIcon.style.background = '#bdbdbd';
      statusText.textContent = '無効化されています';
      summarySection.style.display = 'none';
    }
  }

  /**
   * スキャン結果サマリーを表示
   * @param {Object} data
   */
  function showSummary(data) {
    summarySection.style.display = 'block';

    document.getElementById('totalCount').textContent = data.total || 0;
    document.getElementById('dangerCount').textContent = data.danger || 0;
    document.getElementById('warningCount').textContent = data.warning || 0;
    document.getElementById('cautionCount').textContent = data.caution || 0;
    document.getElementById('safeCount').textContent = data.safe || 0;

    // ステータスアイコン更新
    if (data.danger > 0) {
      statusIcon.textContent = data.danger;
      statusIcon.style.background = '#f44336';
      statusText.textContent = `${data.danger}件の危険な物件を検出`;
    } else if (data.warning > 0) {
      statusIcon.textContent = data.warning;
      statusIcon.style.background = '#ff9800';
      statusText.textContent = `${data.warning}件の要注意物件を検出`;
    } else if (data.total > 0) {
      statusIcon.textContent = data.total;
      statusIcon.style.background = '#4caf50';
      statusText.textContent = `${data.total}件を解析済み（問題なし）`;
    } else {
      statusIcon.textContent = '0';
      statusIcon.style.background = '#e0e0e0';
      statusText.textContent = '物件が見つかりませんでした';
    }
  }
})();
