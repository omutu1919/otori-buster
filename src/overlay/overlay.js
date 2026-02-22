/**
 * おとり物件バスター - オーバーレイUI
 * Shadow DOMでスタイル分離されたスコアバッジ＆詳細パネル
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.overlay = (() => {
  'use strict';

  const COLORS = Object.freeze({
    safe:    { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32', badge: '#4caf50' },
    caution: { bg: '#fff8e1', border: '#ffc107', text: '#f57f17', badge: '#ffc107' },
    warning: { bg: '#fff3e0', border: '#ff9800', text: '#e65100', badge: '#ff9800' },
    danger:  { bg: '#ffebee', border: '#f44336', text: '#c62828', badge: '#f44336' }
  });

  const LEVEL_LABELS = Object.freeze({
    safe: '安全',
    caution: '注意',
    warning: '警告',
    danger: '危険'
  });

  // 現在開いているパネル（1つだけ開く制御用）
  let openPanel = null;

  // グローバルクリックハンドラ（1回だけ登録）
  document.addEventListener('click', (e) => {
    // otori-buster-host 内のクリックは無視
    if (e.target.closest && e.target.closest('.otori-buster-host')) return;
    if (openPanel) {
      openPanel.classList.remove('otori-panel--open');
      openPanel = null;
    }
  }, true);

  function getShadowCSS() {
    return `
      :host {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Hiragino Sans', 'Noto Sans JP', sans-serif;
        line-height: 1.4;
        font-size: 13px;
      }

      .otori-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        user-select: none;
      }

      .otori-badge:hover {
        transform: scale(1.05);
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
      }

      .otori-badge__score {
        font-size: 14px;
        font-weight: 800;
      }

      .otori-badge__label {
        font-size: 11px;
      }

      .otori-panel {
        display: none;
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        width: 300px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        overflow: hidden;
        z-index: 10000;
        background: #fff;
      }

      .otori-panel--open {
        display: block;
      }

      .otori-panel__header {
        padding: 12px 16px;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .otori-panel__close {
        background: none;
        border: none;
        color: #fff;
        font-size: 18px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
        opacity: 0.8;
      }

      .otori-panel__close:hover {
        opacity: 1;
      }

      .otori-panel__body {
        padding: 12px 16px;
      }

      .otori-factor {
        margin-bottom: 10px;
      }

      .otori-factor:last-child {
        margin-bottom: 0;
      }

      .otori-factor__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .otori-factor__name {
        font-size: 12px;
        font-weight: 600;
        color: #333;
      }

      .otori-factor__score {
        font-size: 11px;
        font-weight: 700;
        color: #666;
      }

      .otori-factor__bar {
        height: 6px;
        background: #e0e0e0;
        border-radius: 3px;
        overflow: hidden;
      }

      .otori-factor__fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
      }

      .otori-factor__reason {
        font-size: 11px;
        color: #888;
        margin-top: 3px;
      }

      .otori-panel__footer {
        padding: 10px 16px;
        border-top: 1px solid #eee;
        font-size: 10px;
        color: #aaa;
        text-align: center;
      }
    `;
  }

  function createBadge(score) {
    const colors = COLORS[score.level];
    const badge = document.createElement('div');
    badge.className = 'otori-badge';
    badge.style.cssText = `background: ${colors.badge}; color: #fff;`;
    badge.innerHTML = `
      <span class="otori-badge__score">${score.total}</span>
      <span class="otori-badge__label">${LEVEL_LABELS[score.level]}</span>
    `;
    return badge;
  }

  function createPanel(score) {
    const colors = COLORS[score.level];
    const panel = document.createElement('div');
    panel.className = 'otori-panel';

    const factorsHTML = score.factors.map(f => {
      const barColor = f.rawScore >= 70 ? COLORS.danger.badge :
                       f.rawScore >= 45 ? COLORS.warning.badge :
                       f.rawScore >= 20 ? COLORS.caution.badge :
                       COLORS.safe.badge;
      return `
        <div class="otori-factor">
          <div class="otori-factor__header">
            <span class="otori-factor__name">${f.name}</span>
            <span class="otori-factor__score">${f.rawScore}/100 (x${f.weight})</span>
          </div>
          <div class="otori-factor__bar">
            <div class="otori-factor__fill" style="width: ${f.rawScore}%; background: ${barColor};"></div>
          </div>
          <div class="otori-factor__reason">${f.reason}</div>
        </div>
      `;
    }).join('');

    panel.innerHTML = `
      <div class="otori-panel__header" style="background: ${colors.badge};">
        <span>おとりスコア: ${score.total}/100 (${LEVEL_LABELS[score.level]})</span>
        <button class="otori-panel__close" aria-label="閉じる">&times;</button>
      </div>
      <div class="otori-panel__body">
        ${factorsHTML}
      </div>
      <div class="otori-panel__footer">
        おとり物件バスター - スコアは参考値です
      </div>
    `;

    return panel;
  }

  /**
   * 物件要素にオーバーレイを付与
   */
  function attach(element, score) {
    if (element.querySelector('.otori-buster-host')) return;

    const computedPosition = window.getComputedStyle(element).position;
    if (computedPosition === 'static') {
      element.style.position = 'relative';
    }

    const host = document.createElement('div');
    host.className = 'otori-buster-host';
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = getShadowCSS();
    shadow.appendChild(style);

    const badge = createBadge(score);
    shadow.appendChild(badge);

    const panel = createPanel(score);
    shadow.appendChild(panel);

    // バッジクリック: ホスト要素のonclickで処理（リターゲット問題回避）
    host.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const isOpen = panel.classList.contains('otori-panel--open');

      // 現在開いてるパネルを閉じる
      if (openPanel && openPanel !== panel) {
        openPanel.classList.remove('otori-panel--open');
      }

      if (isOpen) {
        panel.classList.remove('otori-panel--open');
        openPanel = null;
      } else {
        panel.classList.add('otori-panel--open');
        openPanel = panel;
      }
    });

    element.appendChild(host);
  }

  function removeAll() {
    document.querySelectorAll('.otori-buster-host').forEach(el => el.remove());
    openPanel = null;
  }

  return Object.freeze({ attach, removeAll });
})();
