/**
 * おとり物件バスター - オーバーレイUI
 * Shadow DOMでスタイル分離されたスコアバッジ＆詳細パネル
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.overlay = (() => {
  'use strict';

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  const COLORS = Object.freeze({
    safe:    { badge: '#4caf50' },
    caution: { badge: '#ffc107' },
    warning: { badge: '#ff9800' },
    danger:  { badge: '#f44336' }
  });

  const LEVEL_LABELS = Object.freeze({
    safe: '安全',
    caution: '注意',
    warning: '警告',
    danger: '危険'
  });

  // 全ホスト要素を追跡（他パネルを閉じる用）
  const allHosts = [];

  /**
   * 物件カード内の詳細リンクURLを取得
   */
  function getPropertyDetailUrl(element) {
    const link = element.querySelector('a[href*="/chintai/"], a[href*="/rent/detail/"], a[href*="/detail/"]');
    return link ? link.href : '';
  }

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
        color: #fff;
      }

      .otori-badge:hover {
        transform: scale(1.05);
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
      }

      .otori-badge__score { font-size: 14px; font-weight: 800; }
      .otori-badge__label { font-size: 11px; }

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

      :host([data-open]) .otori-panel {
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

      .otori-panel__close:hover { opacity: 1; }

      .otori-panel__body { padding: 12px 16px; }

      .otori-factor { margin-bottom: 10px; }
      .otori-factor:last-child { margin-bottom: 0; }

      .otori-factor__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .otori-factor__name { font-size: 12px; font-weight: 600; color: #333; }
      .otori-factor__score { font-size: 11px; font-weight: 700; color: #666; }

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

      .otori-factor__reason { font-size: 11px; color: #888; margin-top: 3px; }

      .otori-panel__footer {
        padding: 10px 16px;
        border-top: 1px solid #eee;
        font-size: 10px;
        color: #aaa;
        text-align: center;
      }

      .otori-panel__ad {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        padding: 12px 14px;
        border-radius: 8px;
        color: #fff;
        text-decoration: none;
        transition: opacity 0.2s, transform 0.15s;
      }

      .otori-panel__ad:hover {
        opacity: 0.88;
        transform: scale(1.02);
      }

      .otori-panel__ad-icon {
        font-size: 22px;
        flex-shrink: 0;
      }

      .otori-panel__ad-body {
        flex: 1;
        min-width: 0;
      }

      .otori-panel__ad-title {
        display: block;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.3;
      }

      .otori-panel__ad-sub {
        display: block;
        font-size: 10px;
        opacity: 0.85;
        margin-top: 2px;
      }

      .otori-panel__ad-label {
        font-size: 8px;
        font-weight: 400;
        opacity: 0.7;
        position: absolute;
        top: 4px;
        right: 6px;
      }

      .otori-panel__ad-arrow {
        font-size: 16px;
        opacity: 0.7;
        flex-shrink: 0;
      }

      .otori-panel__report-btn {
        display: block;
        width: 100%;
        padding: 8px;
        margin-top: 8px;
        background: none;
        border: 1.5px solid #c62828;
        border-radius: 6px;
        color: #c62828;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
        font-family: inherit;
      }

      .otori-panel__report-btn:hover {
        background: #c62828;
        color: #fff;
      }
    `;
  }

  /**
   * 物件要素にオーバーレイを付与
   * @param {HTMLElement} element
   * @param {Object} score
   * @param {Object} [property] - 通報フォーム用の物件データ
   */
  function attach(element, score, property) {
    if (element.querySelector('.otori-buster-host')) return;

    const computedPosition = window.getComputedStyle(element).position;
    if (computedPosition === 'static') {
      element.style.position = 'relative';
    }

    const colors = COLORS[score.level];

    const host = document.createElement('div');
    host.className = 'otori-buster-host';
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = getShadowCSS();
    shadow.appendChild(style);

    // バッジ
    const badge = document.createElement('div');
    badge.className = 'otori-badge';
    badge.style.background = colors.badge;
    badge.innerHTML = `<span class="otori-badge__score">${escapeHtml(String(score.total))}</span><span class="otori-badge__label">${escapeHtml(LEVEL_LABELS[score.level] || '')}</span>`;
    shadow.appendChild(badge);

    // アフィリエイトリンク
    const aff = window.__otoriBuster.AFFILIATE;
    const adLinksHTML = aff ? aff.links.map(link => {
      const url = escapeHtml(aff.buildUrl(link.url));
      const bg = link.color || '#FF9900';
      return `<a href="${url}" target="_blank" rel="noopener" class="otori-panel__ad" style="background:linear-gradient(135deg, ${bg}, ${bg}dd);position:relative;">
        <span class="otori-panel__ad-label">広告</span>
        <span class="otori-panel__ad-icon">${escapeHtml(link.icon || '')}</span>
        <span class="otori-panel__ad-body">
          <span class="otori-panel__ad-title">${escapeHtml(link.title)}</span>
          <span class="otori-panel__ad-sub">${escapeHtml(link.sub || '')}</span>
        </span>
        <span class="otori-panel__ad-arrow">\u203A</span>
      </a>`;
    }).join('') : '';

    // パネル
    const panel = document.createElement('div');
    panel.className = 'otori-panel';

    const factorsHTML = score.factors.map(f => {
      const safeRawScore = Math.min(100, Math.max(0, Number(f.rawScore) || 0));
      const barColor = safeRawScore >= 70 ? '#f44336' : safeRawScore >= 45 ? '#ff9800' : safeRawScore >= 20 ? '#ffc107' : '#4caf50';
      return `<div class="otori-factor">
        <div class="otori-factor__header">
          <span class="otori-factor__name">${escapeHtml(f.name)}</span>
          <span class="otori-factor__score">${escapeHtml(String(f.rawScore))}/100 (x${escapeHtml(String(f.weight))})</span>
        </div>
        <div class="otori-factor__bar">
          <div class="otori-factor__fill" style="width:${safeRawScore}%;background:${barColor}"></div>
        </div>
        <div class="otori-factor__reason">${escapeHtml(f.reason)}</div>
      </div>`;
    }).join('');

    panel.innerHTML = `
      <div class="otori-panel__header" style="background:${colors.badge}">
        <span>おとりスコア: ${escapeHtml(String(score.total))}/100 (${escapeHtml(LEVEL_LABELS[score.level] || '')})</span>
        <button class="otori-panel__close" aria-label="閉じる">&times;</button>
      </div>
      <div class="otori-panel__body">
        ${factorsHTML}
        ${adLinksHTML}
      </div>
      <div class="otori-panel__footer">
        <button class="otori-panel__report-btn" data-action="report">この物件を通報する</button>
        <div style="margin-top:6px;">おとり物件バスター - スコアは参考値です</div>
      </div>
    `;
    shadow.appendChild(panel);

    // === イベント処理 ===
    // パネル開閉をdata属性で制御（CSSの :host([data-open]) で表示切替）
    // clickイベント伝播の問題を完全に回避するためmousedownを使用

    badge.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const isOpen = host.hasAttribute('data-open');

      // 他のパネルを全部閉じる
      allHosts.forEach(h => {
        if (h !== host) h.removeAttribute('data-open');
      });

      if (isOpen) {
        host.removeAttribute('data-open');
      } else {
        host.setAttribute('data-open', '');
      }
    });

    // 閉じるボタン
    panel.querySelector('.otori-panel__close').addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      host.removeAttribute('data-open');
    });

    // 通報ボタン
    const reportBtn = panel.querySelector('[data-action="report"]');
    if (reportBtn) {
      reportBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (window.__otoriBuster.reportForm) {
          const detailUrl = getPropertyDetailUrl(element);
          // 全プロパティデータ + 全スコア因子を通報フォームに渡す
          const fullProperty = property ? { ...property, element: undefined } : {};
          window.__otoriBuster.reportForm.open({
            ...fullProperty,
            url: detailUrl || location.href,
            siteName: property ? property.source : '',
            score: score.total,
            level: score.level,
            factors: score.factors || []
          });
        }
        host.removeAttribute('data-open');
      });
    }

    // パネル内のクリック/マウスイベントが外に漏れないようにする
    panel.addEventListener('mousedown', (e) => { e.stopPropagation(); });
    panel.addEventListener('click', (e) => {
      e.stopPropagation();
      // アフィリエイトリンク・通報ボタンのクリックは許可
      if (!e.target.closest('a') && !e.target.closest('button')) e.preventDefault();
    });
    host.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); });

    element.appendChild(host);
    allHosts.push(host);
  }

  /**
   * 既存バッジを削除して新スコアで再描画（プリフェッチ更新用）
   */
  function update(element, score, property) {
    const existing = element.querySelector('.otori-buster-host');
    if (existing) {
      const idx = allHosts.indexOf(existing);
      if (idx >= 0) allHosts.splice(idx, 1);
      existing.remove();
    }
    attach(element, score, property);
  }

  function removeAll() {
    document.querySelectorAll('.otori-buster-host').forEach(el => el.remove());
    allHosts.length = 0;
  }

  return Object.freeze({ attach, update, removeAll });
})();
