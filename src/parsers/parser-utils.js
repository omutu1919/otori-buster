/**
 * おとり物件バスター - パーサー共通ユーティリティ
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.parserUtils = (() => {
  'use strict';

  /**
   * 全角数字を半角に変換
   * @param {string} text
   * @returns {string}
   */
  function normalizeDigits(text) {
    if (!text) return '';
    return text.replace(/[０-９]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30)
    );
  }

  /**
   * 家賃文字列を万円の数値に変換
   * @param {string} text - "7.5万円", "75,000円", "7万5000円" 等
   * @returns {number} 万円単位の数値（解析不能なら0）
   */
  function parseRent(text) {
    if (!text || typeof text !== 'string') return 0;

    const cleaned = normalizeDigits(text.replace(/\s/g, ''));

    // "7.5万円" or "7.5万" パターン
    const manPattern = /(\d+(?:\.\d+)?)万/;
    const manMatch = cleaned.match(manPattern);
    if (manMatch) {
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
   */
  function parseManagementFee(text) {
    if (!text || typeof text !== 'string') return 0;
    const cleaned = text.replace(/\s/g, '');
    if (cleaned === '-' || cleaned === 'なし' || cleaned === '込み') return 0;
    return parseRent(cleaned);
  }

  /**
   * 住所から区（ward）を抽出
   */
  function extractWard(address) {
    if (!address || typeof address !== 'string') return '';
    // [^都道府県] で "東京都" の "都" を除外し "新宿区" を正しくマッチ
    const match = address.match(/([^都道府県\s]{1,4}区)/);
    return match ? match[1] : '';
  }

  /**
   * 住所から都道府県を抽出
   */
  function extractRegion(address) {
    if (!address || typeof address !== 'string') return 'other';
    if (address.includes('東京') || address.match(/都[^道府県]/)) return 'tokyo';
    if (address.includes('大阪')) return 'osaka';
    return 'other';
  }

  /**
   * 住所の詳細度を判定
   * SUUMOの一覧では "東京都新宿区西落合１" のように丁目番号が付く
   * @returns {'full'|'town'|'ward'|'none'}
   */
  function getAddressDetail(address) {
    if (!address || typeof address !== 'string' || address.trim() === '') return 'none';

    const normalized = normalizeDigits(address);

    // 番地あり（数字-数字 or 丁目）
    if (normalized.match(/\d+-\d+/) || normalized.includes('丁目')) return 'full';

    // 町名+番号あり（"西落合1" のように区の後に町名+数字）
    // SUUMOの一覧ページでは丁目を省略して数字だけ付けるパターン
    const wardIdx = normalized.indexOf('区');
    if (wardIdx > 0) {
      const afterWard = normalized.slice(wardIdx + 1);
      // 町名の後に数字があればほぼ丁目指定
      if (afterWard.match(/[^\d]\d+$/)) return 'full';
      // 町名が3文字以上あればtown
      if (afterWard.length >= 2) return 'town';
    }

    if (normalized.includes('区') || normalized.includes('市')) return 'ward';

    return 'none';
  }

  /**
   * 間取りを正規化
   */
  function normalizeLayout(layout) {
    if (!layout || typeof layout !== 'string') return '';
    const cleaned = normalizeDigits(layout.replace(/\s/g, '')).toUpperCase();
    if (cleaned === 'ワンルーム' || cleaned === 'STUDIO') return '1R';
    if (cleaned.match(/^[1-4][RKDL]+$/)) return cleaned;
    const match = cleaned.match(/([1-4])([RKDL]+)/);
    return match ? `${match[1]}${match[2]}` : cleaned;
  }

  /**
   * 築年数を数値に変換
   * "築5年" → 5, "新築" → 0, "2022年11月" → (現在年 - 2022)
   */
  function parseAge(text) {
    if (!text || typeof text !== 'string') return -1;
    if (text.includes('新築')) return 0;

    const normalized = normalizeDigits(text);

    // "築XX年" パターン（XX が100未満）
    const ageMatch = normalized.match(/築(\d{1,2})年/);
    if (ageMatch) return parseInt(ageMatch[1], 10);

    // "YYYY年MM月" パターン（築年月表記）
    const yearMatch = normalized.match(/((?:19|20)\d{2})年/);
    if (yearMatch) {
      const builtYear = parseInt(yearMatch[1], 10);
      const currentYear = new Date().getFullYear();
      return Math.max(0, currentYear - builtYear);
    }

    return -1;
  }

  /**
   * 徒歩分数を数値に変換
   */
  function parseWalkMinutes(text) {
    if (!text || typeof text !== 'string') return -1;
    const normalized = normalizeDigits(text);
    const match = normalized.match(/歩(\d+)分/);
    return match ? parseInt(match[1], 10) : -1;
  }

  /**
   * DOM要素のテキストを安全に取得
   */
  function safeText(parent, selector) {
    if (!parent) return '';
    const el = parent.querySelector(selector);
    return el ? el.textContent.trim() : '';
  }

  /**
   * DOM要素の数を安全にカウント
   */
  function safeCount(parent, selector) {
    if (!parent) return 0;
    return parent.querySelectorAll(selector).length;
  }

  /**
   * 専有面積を数値に変換（m²）
   */
  function parseArea(text) {
    if (!text || typeof text !== 'string') return 0;
    const match = normalizeDigits(text).match(/([\d.]+)\s*[m㎡]/);
    return match ? parseFloat(match[1]) : 0;
  }

  return Object.freeze({
    normalizeDigits,
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
