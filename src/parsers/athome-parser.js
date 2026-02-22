/**
 * おとり物件バスター - at home パーサー
 * ※ CAPTCHAによりPuppeteer検証不可。DevTools確認を推奨。
 *
 * at homeの一般的なDOM構造（推定 + 公開情報ベース）:
 *   .p-property-item / .property-cassette / [data-property-id] (物件カード)
 *   テーブルベースの物件詳細
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.athomeParser = (() => {
  'use strict';

  const { parserUtils } = window.__otoriBuster;
  const { safeText, parseRent, parseManagementFee, normalizeLayout, parseAge, parseWalkMinutes, normalizeDigits } = parserUtils;

  const SITE_NAME = 'athome';

  function canParse() {
    return location.hostname.endsWith('athome.co.jp') && location.pathname.includes('/chintai/');
  }

  function isDetailPage() {
    return /\/chintai\/\d+\//.test(location.pathname);
  }

  /**
   * テーブルまたはdl/dt/ddから値を抽出する汎用関数
   */
  function findValue(container, label) {
    // th/td パターン
    const ths = container.querySelectorAll('th');
    for (const th of ths) {
      if (th.textContent.trim().includes(label)) {
        const td = th.nextElementSibling;
        if (td) return td.textContent.trim();
      }
    }
    // dt/dd パターン
    const dts = container.querySelectorAll('dt');
    for (const dt of dts) {
      if (dt.textContent.trim().includes(label)) {
        const dd = dt.nextElementSibling;
        if (dd) return dd.textContent.trim();
      }
    }
    return '';
  }

  // === 一覧ページ ===

  function parseListPage() {
    // 複数の候補セレクタを試す
    const selectors = [
      '[data-property-id]',
      '.p-property-item',
      '.property-cassette',
      '.property-body',
      'article.property',
      '.bukken-detail'
    ];

    let cards = [];
    for (const sel of selectors) {
      cards = document.querySelectorAll(sel);
      if (cards.length > 0) break;
    }

    // セレクタで見つからない場合、家賃+間取り+住所を含む要素を探す
    if (cards.length === 0) {
      const all = document.querySelectorAll('div, article, section, li');
      const found = [];
      for (const el of all) {
        const text = el.textContent || '';
        const size = text.length;
        if (size > 80 && size < 3000 && text.includes('万円') && /[0-9][KDL]/.test(text) && text.includes('区')) {
          found.push(el);
        }
      }
      // 最小の要素（カード単位に近い）を使う
      found.sort((a, b) => a.textContent.length - b.textContent.length);
      cards = found.slice(0, 30);
    }

    const properties = [];
    cards.forEach(card => {
      try {
        const name = safeText(card, 'h2, h3, .property-name, [class*="name"], [class*="title"]') || '';
        const address = findValue(card, '所在地') || findValue(card, '住所') ||
                        safeText(card, '[class*="address"]') || '';
        const rentText = findValue(card, '賃料') || safeText(card, '[class*="price"], [class*="rent"]') || '';
        const feeText = findValue(card, '管理費') || findValue(card, '共益費') || '';
        const layoutText = findValue(card, '間取り') || safeText(card, '[class*="madori"], [class*="layout"]') || '';
        const areaText = findValue(card, '面積') || safeText(card, '[class*="menseki"], [class*="area"]') || '';
        const stationText = findValue(card, '交通') || safeText(card, '[class*="station"], [class*="access"]') || '';
        const ageText = findValue(card, '築年') || safeText(card, '[class*="age"], [class*="chikunen"]') || '';

        properties.push({
          name,
          rent: parseRent(rentText),
          managementFee: parseManagementFee(feeText),
          address,
          layout: normalizeLayout(layoutText),
          photoCount: -1,
          area: areaText,
          age: parseAge(ageText),
          station: stationText,
          walkMinutes: parseWalkMinutes(stationText),
          source: SITE_NAME,
          element: card
        });
      } catch (err) {
        console.error('[おとり物件バスター] at home解析エラー:', err);
      }
    });

    return properties;
  }

  // === 詳細ページ ===

  function parseDetailPage() {
    const name = safeText(document.body, 'h1, .property-name, [class*="name"]') || '';

    const address = findValue(document.body, '所在地') || findValue(document.body, '住所');
    const rentText = findValue(document.body, '賃料');
    const feeText = findValue(document.body, '管理費') || findValue(document.body, '共益費');
    const layoutText = findValue(document.body, '間取り');
    const areaText = findValue(document.body, '面積') || findValue(document.body, '専有面積');
    const stationText = findValue(document.body, '交通');
    const ageText = findValue(document.body, '築年') || findValue(document.body, '建築年');

    const photos = document.querySelectorAll('[class*="gallery"] img, [class*="photo"] img, [class*="slider"] img');
    const targetEl = document.querySelector('h1') || document.querySelector('[class*="property-name"]');
    if (!targetEl) return [];

    return [{
      name,
      rent: parseRent(rentText),
      managementFee: parseManagementFee(feeText),
      address,
      layout: normalizeLayout(layoutText),
      photoCount: photos.length,
      area: areaText,
      age: parseAge(ageText),
      station: stationText,
      walkMinutes: parseWalkMinutes(stationText),
      source: SITE_NAME,
      element: targetEl
    }];
  }

  function parse() {
    if (isDetailPage()) {
      try { return parseDetailPage(); }
      catch (err) { console.error('[おとり物件バスター] at home詳細エラー:', err); return []; }
    }
    return parseListPage();
  }

  return Object.freeze({ name: SITE_NAME, canParse, parse });
})();
