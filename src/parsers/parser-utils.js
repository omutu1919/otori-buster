/**
 * おとり物件バスター - パーサー共通ユーティリティ
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.parserUtils = (() => {
  'use strict';

  /**
   * 家賃文字列を万円の数値に変換
   * @param {string} text - "7.5万円", "75,000円", "7万5000円" 等
   * @returns {number} 万円単位の数値（解析不能なら0）
   */
  function parseRent(text) {
    if (!text || typeof text !== 'string') return 0;

    const cleaned = text.replace(/\s/g, '');

    // "7.5万円" or "7.5万" パターン
    const manPattern = /(\d+(?:\.\d+)?)万/;
    const manMatch = cleaned.match(manPattern);
    if (manMatch) {
      // "7万5000円" のようなパターンも処理
      const manValue = parseFloat(manMatch[1]);
      const afterMan = cleaned.slice(cleaned.indexOf('万') + 1);
      const senMatch = afterMan.match(/(\d+)/);
      if (senMatch) {
        return manValue + parseInt(senMatch[1], 10) / 10000;
      }
      return manValue;
    }

    // "75,000円" or "75000円" パターン
    const yenPattern = /(\d[\d,]+)/;
    const yenMatch = cleaned.match(yenPattern);
    if (yenMatch) {
      const yen = parseInt(yenMatch[1].replace(/,/g, ''), 10);
      if (yen >= 10000) {
        return yen / 10000;
      }
    }

    return 0;
  }

  /**
   * 管理費・共益費を万円の数値に変換
   * @param {string} text - "5,000円", "-", "なし" 等
   * @returns {number} 万円単位の数値
   */
  function parseManagementFee(text) {
    if (!text || typeof text !== 'string') return 0;

    const cleaned = text.replace(/\s/g, '');
    if (cleaned === '-' || cleaned === 'なし' || cleaned === '込み') return 0;

    return parseRent(cleaned);
  }

  /**
   * 住所から区（ward）を抽出
   * @param {string} address - "東京都新宿区西新宿1-2-3" 等
   * @returns {string} 区名（"新宿区"）、見つからなければ空文字
   */
  function extractWard(address) {
    if (!address || typeof address !== 'string') return '';

    const match = address.match(/(.{1,4}区)/);
    return match ? match[1] : '';
  }

  /**
   * 住所から都道府県を抽出
   * @param {string} address
   * @returns {'tokyo'|'osaka'|'other'}
   */
  function extractRegion(address) {
    if (!address || typeof address !== 'string') return 'other';

    if (address.includes('東京') || address.match(/都[^道府県]/)) return 'tokyo';
    if (address.includes('大阪')) return 'osaka';
    return 'other';
  }

  /**
   * 住所の詳細度を判定
   * @param {string} address
   * @returns {'full'|'town'|'ward'|'none'} full=番地あり, town=町名まで, ward=区まで, none=なし
   */
  function getAddressDetail(address) {
    if (!address || typeof address !== 'string' || address.trim() === '') return 'none';

    // 番地あり（数字-数字 or 丁目）
    if (address.match(/\d+-\d+/) || address.includes('丁目')) return 'full';

    // 町名あり（区の後に2文字以上）
    const wardIdx = address.indexOf('区');
    if (wardIdx > 0 && address.length > wardIdx + 3) return 'town';

    // 区まで
    if (address.includes('区') || address.includes('市')) return 'ward';

    return 'none';
  }

  /**
   * 間取りを正規化
   * @param {string} layout - "1K", "ワンルーム", "1R" 等
   * @returns {string} 正規化された間取り
   */
  function normalizeLayout(layout) {
    if (!layout || typeof layout !== 'string') return '';

    const cleaned = layout.replace(/\s/g, '').toUpperCase();

    if (cleaned === 'ワンルーム' || cleaned === 'STUDIO') return '1R';
    if (cleaned.match(/^[1-4][RKDL]+$/)) return cleaned;

    const match = cleaned.match(/([1-4])([RKDL]+)/);
    return match ? `${match[1]}${match[2]}` : cleaned;
  }

  /**
   * 築年数を数値に変換
   * @param {string} text - "築5年", "新築", "築30年" 等
   * @returns {number} 築年数（新築=0、解析不能=-1）
   */
  function parseAge(text) {
    if (!text || typeof text !== 'string') return -1;

    if (text.includes('新築')) return 0;

    const match = text.match(/築?(\d+)年/);
    return match ? parseInt(match[1], 10) : -1;
  }

  /**
   * 徒歩分数を数値に変換
   * @param {string} text - "徒歩5分", "歩5分", "バス10分" 等
   * @returns {number} 分数（解析不能なら-1）
   */
  function parseWalkMinutes(text) {
    if (!text || typeof text !== 'string') return -1;

    const match = text.match(/歩(\d+)分/);
    return match ? parseInt(match[1], 10) : -1;
  }

  /**
   * DOM要素のテキストを安全に取得
   * @param {Element} parent - 親要素
   * @param {string} selector - CSSセレクタ
   * @returns {string} テキスト（見つからなければ空文字）
   */
  function safeText(parent, selector) {
    if (!parent) return '';
    const el = parent.querySelector(selector);
    return el ? el.textContent.trim() : '';
  }

  /**
   * DOM要素の数を安全にカウント
   * @param {Element} parent - 親要素
   * @param {string} selector - CSSセレクタ
   * @returns {number}
   */
  function safeCount(parent, selector) {
    if (!parent) return 0;
    return parent.querySelectorAll(selector).length;
  }

  /**
   * 専有面積を数値に変換（m²）
   * @param {string} text - "25.5m²", "25.5㎡" 等
   * @returns {number}
   */
  function parseArea(text) {
    if (!text || typeof text !== 'string') return 0;
    const match = text.match(/([\d.]+)\s*[m㎡]/);
    return match ? parseFloat(match[1]) : 0;
  }

  return Object.freeze({
    parseRent,
    parseManagementFee,
    extractWard,
    extractRegion,
    getAddressDetail,
    normalizeLayout,
    parseAge,
    parseWalkMinutes,
    safeText,
    safeCount,
    parseArea
  });
})();
