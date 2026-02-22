/**
 * おとり物件バスター - CHINTAI パーサー
 * ※ ページロードが重くPuppeteer検証困難。DevTools確認を推奨。
 *
 * CHINTAIの一般的なDOM構造（推定 + SUUMO類似構造）:
 *   .cassetteitem / .building_item / [data-building] (物件カード)
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.chintaiParser = (() => {
  'use strict';

  const { parserUtils } = window.__otoriBuster;
  const { safeText, parseRent, parseManagementFee, normalizeLayout, parseAge, parseWalkMinutes, normalizeDigits } = parserUtils;

  const SITE_NAME = 'chintai';

  function extractCompany(container) {
    const ths = container.querySelectorAll('th, dt');
    for (const th of ths) {
      if (th.textContent.trim().match(/取扱|会社|不動産/)) {
        const next = th.nextElementSibling;
        if (next) return next.textContent.trim().slice(0, 100);
      }
    }
    const el = container.querySelector('[class*="company"], [class*="agency"], [class*="shop"]');
    if (el) return el.textContent.trim().slice(0, 100);
    return '';
  }

  function canParse() {
    return location.hostname.endsWith('chintai.net');
  }

  function isDetailPage() {
    return /\/detail\//.test(location.pathname) || /\/room\//.test(location.pathname);
  }

  /**
   * テーブルまたはdl/dt/ddから値を抽出
   */
  function findValue(container, label) {
    const ths = container.querySelectorAll('th');
    for (const th of ths) {
      if (th.textContent.trim().includes(label)) {
        const td = th.nextElementSibling;
        if (td) return td.textContent.trim();
      }
    }
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
    const selectors = [
      '.cassetteitem',
      '.building_item',
      '[data-building-id]',
      '[data-building]',
      '.cassette',
      '.property-cassette'
    ];

    let cards = [];
    for (const sel of selectors) {
      cards = document.querySelectorAll(sel);
      if (cards.length > 0) break;
    }

    // フォールバック: 家賃+間取り+住所を含む要素
    if (cards.length === 0) {
      const all = document.querySelectorAll('div, article, section, li');
      const found = [];
      for (const el of all) {
        const text = el.textContent || '';
        const size = text.length;
        if (size > 80 && size < 3000 && text.includes('万円') && /[0-9][KDL]/.test(text) && (text.includes('区') || text.includes('市'))) {
          found.push(el);
        }
      }
      found.sort((a, b) => a.textContent.length - b.textContent.length);
      cards = found.slice(0, 30);
    }

    const properties = [];
    cards.forEach(card => {
      try {
        const name = safeText(card, '.cassetteitem_content-title, h2, h3, [class*="building-name"], [class*="title"]') || '';
        const address = findValue(card, '所在地') || findValue(card, '住所') ||
                        safeText(card, '.cassetteitem_detail-col1, [class*="address"]') || '';

        const rentText = findValue(card, '賃料') ||
                         safeText(card, '.cassetteitem_price--rent, [class*="price"], [class*="rent"]') || '';
        const feeText = findValue(card, '管理費') || findValue(card, '共益費') ||
                        safeText(card, '.cassetteitem_price--administration, [class*="admin"]') || '';
        const layoutText = findValue(card, '間取り') ||
                           safeText(card, '.cassetteitem_madori, [class*="madori"]') || '';
        const areaText = findValue(card, '面積') ||
                         safeText(card, '.cassetteitem_menseki, [class*="menseki"]') || '';
        const stationText = findValue(card, '交通') ||
                            safeText(card, '.cassetteitem_detail-col2, [class*="station"]') || '';
        const ageText = findValue(card, '築年') ||
                        safeText(card, '.cassetteitem_detail-col3 div, [class*="age"]') || '';

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
          company: extractCompany(card),
          source: SITE_NAME,
          element: card
        });
      } catch (err) {
        console.error('[おとり物件バスター] CHINTAI解析エラー:', err);
      }
    });

    return properties;
  }

  // === 詳細ページ ===

  function parseDetailPage() {
    const name = safeText(document.body, 'h1, [class*="building-name"], [class*="title"]') || '';

    const address = findValue(document.body, '所在地') || findValue(document.body, '住所');
    const rentText = findValue(document.body, '賃料');
    const feeText = findValue(document.body, '管理費') || findValue(document.body, '共益費');
    const layoutText = findValue(document.body, '間取り');
    const areaText = findValue(document.body, '面積') || findValue(document.body, '専有面積');
    const stationText = findValue(document.body, '交通');
    const ageText = findValue(document.body, '築年') || findValue(document.body, '建築年');

    const photos = document.querySelectorAll('[class*="gallery"] img, [class*="photo"] img, [class*="slider"] img');
    const targetEl = document.querySelector('h1');
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
      company: extractCompany(document.body),
      source: SITE_NAME,
      element: targetEl
    }];
  }

  function parse() {
    if (isDetailPage()) {
      try { return parseDetailPage(); }
      catch (err) { console.error('[おとり物件バスター] CHINTAI詳細エラー:', err); return []; }
    }
    return parseListPage();
  }

  return Object.freeze({ name: SITE_NAME, canParse, parse });
})();
