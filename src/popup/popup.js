/**
 * おとり物件バスター - Popup Script
 */

;(() => {
  'use strict';

  const toggleEl = document.getElementById('toggleEnabled');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const summarySection = document.getElementById('summarySection');

  // 通報リンク生成
  const reportConfig = window.__otoriBuster && window.__otoriBuster.REPORT_CONFIG;
  if (reportConfig) {
    const officialLinksEl = document.getElementById('officialLinks');
    reportConfig.officialLinks.forEach(link => {
      const a = document.createElement('a');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'popup__report-link';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'popup__report-link-icon';
      iconSpan.textContent = link.icon || '';

      const bodySpan = document.createElement('span');
      bodySpan.className = 'popup__report-link-body';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'popup__report-link-label';
      labelSpan.textContent = link.label;

      const descSpan = document.createElement('span');
      descSpan.className = 'popup__report-link-desc';
      descSpan.textContent = link.description || '';

      bodySpan.appendChild(labelSpan);
      bodySpan.appendChild(descSpan);

      const arrowSpan = document.createElement('span');
      arrowSpan.className = 'popup__report-link-arrow';
      arrowSpan.textContent = '\u203A';

      a.appendChild(iconSpan);
      a.appendChild(bodySpan);
      a.appendChild(arrowSpan);
      officialLinksEl.appendChild(a);
    });

    // 現在のサイトに対応するリンクを表示
    chrome.storage.local.get('scanResult', (result) => {
      if (result.scanResult && result.scanResult.site) {
        const siteInfo = reportConfig.siteLinks[result.scanResult.site];
        if (siteInfo) {
          const siteLinkEl = document.getElementById('siteLink');
          const a = document.createElement('a');
          a.href = siteInfo.url;
          a.target = '_blank';
          a.rel = 'noopener';
          a.className = 'popup__report-site-link';
          a.textContent = `${siteInfo.label} に問い合わせる`;
          siteLinkEl.appendChild(a);
        }
      }
    });

    // 通報件数を表示
    chrome.storage.local.get({ reports: [] }, (result) => {
      const count = result.reports.length;
      if (count > 0) {
        document.getElementById('reportStats').textContent = `${count}件の通報データを蓄積中`;
      }
    });
  }

  // アフィリエイトバナー生成
  const aff = window.__otoriBuster && window.__otoriBuster.AFFILIATE;
  if (aff) {
    const adsSection = document.getElementById('adsSection');
    aff.links.forEach(link => {
      const a = document.createElement('a');
      a.href = aff.buildUrl(link.url);
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'popup__ad-banner';
      a.style.background = `linear-gradient(135deg, ${link.color}, ${link.color}dd)`;

      const titleSpan = document.createElement('span');
      titleSpan.className = 'popup__ad-banner-title';
      titleSpan.textContent = link.title;

      const subSpan = document.createElement('span');
      subSpan.className = 'popup__ad-banner-sub';
      subSpan.textContent = link.sub;

      const arrowSpan = document.createElement('span');
      arrowSpan.className = 'popup__ad-banner-arrow';
      arrowSpan.textContent = '\u203A';

      a.appendChild(titleSpan);
      a.appendChild(subSpan);
      a.appendChild(arrowSpan);
      adsSection.appendChild(a);
    });
  }

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
  });

  // スキャン結果をstorage.localから取得（最もシンプルで確実）
  chrome.storage.local.get('scanResult', (result) => {
    if (result.scanResult) {
      showSummary(result.scanResult);
    } else {
      statusText.textContent = '対応サイトで物件一覧を開いてください';
    }
  });

  /**
   * UIの有効/無効表示を更新
   * @param {boolean} enabled
   */
  function updateUI(enabled) {
    const popup = document.querySelector('.popup');
    if (enabled) {
      popup.classList.remove('popup--disabled');
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

    const siteName = data.site || '';
    const siteLabel = { suumo: 'SUUMO', homes: "HOME'S", athome: 'at home', chintai: 'CHINTAI', yahoo: 'Yahoo!不動産' }[siteName] || siteName;

    if (data.danger > 0) {
      statusIcon.textContent = data.danger;
      statusIcon.style.background = '#f44336';
      statusText.textContent = `${siteLabel}: ${data.danger}件の危険な物件を検出`;
    } else if (data.warning > 0) {
      statusIcon.textContent = data.warning;
      statusIcon.style.background = '#ff9800';
      statusText.textContent = `${siteLabel}: ${data.warning}件の要注意物件を検出`;
    } else if (data.total > 0) {
      statusIcon.textContent = data.total;
      statusIcon.style.background = '#4caf50';
      statusText.textContent = `${siteLabel}: ${data.total}件を解析済み`;
    } else {
      statusIcon.textContent = '0';
      statusIcon.style.background = '#e0e0e0';
      statusText.textContent = '物件が見つかりませんでした';
    }
  }
})();
