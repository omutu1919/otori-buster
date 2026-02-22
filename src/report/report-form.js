/**
 * おとり物件バスター - 通報フォーム（Shadow DOMモーダル）
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.reportForm = (() => {
  'use strict';

  const ns = window.__otoriBuster;
  let hostEl = null;

  function getCSS() {
    return `
      :host {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Hiragino Sans', 'Noto Sans JP', sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #333;
      }

      .otori-report-backdrop {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1;
      }

      .otori-report-modal {
        position: relative;
        z-index: 2;
        width: 420px;
        max-height: 85vh;
        overflow-y: auto;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
      }

      .otori-report-modal__header {
        padding: 16px 20px;
        background: linear-gradient(135deg, #c62828, #e53935);
        color: #fff;
        font-size: 16px;
        font-weight: 700;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .otori-report-modal__close {
        background: none;
        border: none;
        color: #fff;
        font-size: 22px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
        opacity: 0.8;
      }
      .otori-report-modal__close:hover { opacity: 1; }

      .otori-report-modal__body {
        padding: 20px;
      }

      .otori-report-field {
        margin-bottom: 14px;
      }

      .otori-report-field:last-child {
        margin-bottom: 0;
      }

      .otori-report-field label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #555;
        margin-bottom: 4px;
      }

      .otori-report-field input,
      .otori-report-field select,
      .otori-report-field textarea {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 13px;
        font-family: inherit;
        background: #fafafa;
        color: #333;
        transition: border-color 0.2s;
      }

      .otori-report-field input:focus,
      .otori-report-field select:focus,
      .otori-report-field textarea:focus {
        outline: none;
        border-color: #1a237e;
        background: #fff;
      }

      .otori-report-field input[readonly] {
        background: #f0f0f0;
        color: #888;
        cursor: default;
      }

      .otori-report-field textarea {
        resize: vertical;
        min-height: 60px;
      }

      .otori-report-score {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        color: #fff;
      }

      .otori-report-row {
        display: flex;
        gap: 10px;
      }

      .otori-report-row .otori-report-field {
        flex: 1;
      }

      .otori-report-submit {
        display: block;
        width: 100%;
        padding: 12px;
        margin-top: 16px;
        background: linear-gradient(135deg, #c62828, #e53935);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: opacity 0.2s, transform 0.15s;
      }

      .otori-report-submit:hover {
        opacity: 0.9;
        transform: scale(1.01);
      }

      .otori-report-submit:disabled {
        background: #bdbdbd;
        cursor: not-allowed;
        transform: none;
      }

      .otori-report-success {
        text-align: center;
        padding: 30px 20px;
      }

      .otori-report-success__icon {
        font-size: 48px;
        margin-bottom: 12px;
      }

      .otori-report-success__text {
        font-size: 15px;
        font-weight: 600;
        color: #2e7d32;
        margin-bottom: 6px;
      }

      .otori-report-success__sub {
        font-size: 12px;
        color: #888;
      }

      .otori-report-error {
        text-align: center;
        padding: 10px;
        background: #fff3e0;
        border-radius: 6px;
        font-size: 12px;
        color: #e65100;
        margin-top: 10px;
      }

      .otori-report-note {
        font-size: 11px;
        color: #999;
        text-align: center;
        margin-top: 12px;
      }
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 通報フォームを開く
   * @param {Object} params - { name, url, siteName, rent, address, score, level }
   */
  function open(params) {
    if (hostEl) close();

    const config = ns.REPORT_CONFIG;
    if (!config) return;

    const reasonOptions = config.reasons.map(r =>
      `<option value="${escapeHtml(r.value)}">${escapeHtml(r.label)}</option>`
    ).join('');

    const LEVEL_COLORS = { safe: '#4caf50', caution: '#ffc107', warning: '#ff9800', danger: '#f44336' };
    const LEVEL_LABELS = { safe: '\u5B89\u5168', caution: '\u6CE8\u610F', warning: '\u8B66\u544A', danger: '\u5371\u967A' };
    const scoreColor = LEVEL_COLORS[params.level] || '#999';
    const scoreLabel = LEVEL_LABELS[params.level] || '';

    hostEl = document.createElement('div');
    hostEl.className = 'otori-report-host';
    const shadow = hostEl.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = getCSS();
    shadow.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.className = 'otori-report-backdrop';
    shadow.appendChild(backdrop);

    const modal = document.createElement('div');
    modal.className = 'otori-report-modal';
    modal.innerHTML = `
      <div class="otori-report-modal__header">
        <span>おとり物件を通報</span>
        <button class="otori-report-modal__close" aria-label="\u9589\u3058\u308B">&times;</button>
      </div>
      <div class="otori-report-modal__body">
        <form class="otori-report-form">
          <div class="otori-report-field">
            <label>物件名</label>
            <input type="text" name="propertyName" value="${escapeHtml(params.name || '')}" readonly>
          </div>
          <div class="otori-report-field">
            <label>物件URL</label>
            <input type="text" name="url" value="${escapeHtml(params.url || location.href)}" readonly>
          </div>
          <div class="otori-report-row">
            <div class="otori-report-field">
              <label>サイト</label>
              <input type="text" name="siteName" value="${escapeHtml(params.siteName || '')}" readonly>
            </div>
            <div class="otori-report-field">
              <label>おとりスコア</label>
              <div><span class="otori-report-score" style="background:${scoreColor}">${params.score || 0} ${escapeHtml(scoreLabel)}</span></div>
            </div>
          </div>
          <div class="otori-report-row">
            <div class="otori-report-field">
              <label>家賃</label>
              <input type="text" name="rent" value="${params.rent ? params.rent.toLocaleString() + '\u5186' : '\u4E0D\u660E'}" readonly>
            </div>
            <div class="otori-report-field">
              <label>住所</label>
              <input type="text" name="address" value="${escapeHtml(params.address || '')}" readonly>
            </div>
          </div>
          <div class="otori-report-field">
            <label>通報理由 *</label>
            <select name="reason" required>${reasonOptions}</select>
          </div>
          <div class="otori-report-field">
            <label>詳細コメント（任意）</label>
            <textarea name="comment" rows="3" placeholder="具体的な状況があれば教えてください..."></textarea>
          </div>
          <button type="submit" class="otori-report-submit">通報を送信</button>
          <div class="otori-report-note">送信された情報はおとり物件データベースに蓄積されます</div>
        </form>
      </div>
    `;
    shadow.appendChild(modal);

    // イベント
    backdrop.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      close();
    });

    modal.querySelector('.otori-report-modal__close').addEventListener('mousedown', (e) => {
      e.stopPropagation();
      close();
    });

    modal.addEventListener('mousedown', (e) => { e.stopPropagation(); });
    modal.addEventListener('click', (e) => { e.stopPropagation(); });

    const form = modal.querySelector('.otori-report-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSubmit(form, params);
    });

    document.body.appendChild(hostEl);
  }

  async function handleSubmit(form, params) {
    const submitBtn = form.querySelector('.otori-report-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '\u9001\u4FE1\u4E2D...';

    // 既存のエラー表示を消す
    const existingError = form.querySelector('.otori-report-error');
    if (existingError) existingError.remove();

    const reportData = {
      url: params.url || location.href,
      propertyName: params.name || '',
      siteName: params.siteName || '',
      rent: params.rent || 0,
      address: params.address || '',
      score: params.score || 0,
      level: params.level || '',
      reason: form.reason.value,
      reasonLabel: ns.REPORT_CONFIG.reasons.find(r => r.value === form.reason.value)?.label || '',
      comment: form.comment.value.trim(),
      reportedAt: new Date().toISOString(),
      pageUrl: location.href
    };

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'REPORT_OTORI', data: reportData },
          (res) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(res);
            }
          }
        );
      });

      if (response && response.ok) {
        showSuccess(form);
      } else {
        showError(form, submitBtn, response?.error || '\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F');
      }
    } catch (err) {
      showError(form, submitBtn, err.message || '\u901A\u4FE1\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F');
    }
  }

  function showSuccess(form) {
    const body = form.parentElement;
    body.innerHTML = `
      <div class="otori-report-success">
        <div class="otori-report-success__icon">\u2705</div>
        <div class="otori-report-success__text">通報を送信しました</div>
        <div class="otori-report-success__sub">ご協力ありがとうございます。データベースに記録されました。</div>
      </div>
    `;
    setTimeout(() => close(), 2500);
  }

  function showError(form, submitBtn, message) {
    submitBtn.disabled = false;
    submitBtn.textContent = '\u901A\u5831\u3092\u9001\u4FE1';

    const errorDiv = document.createElement('div');
    errorDiv.className = 'otori-report-error';
    errorDiv.textContent = message;
    form.appendChild(errorDiv);
  }

  function close() {
    if (hostEl) {
      hostEl.remove();
      hostEl = null;
    }
  }

  return Object.freeze({ open, close });
})();
