/**
 * おとり物件バスター - at home パーサー
 * https://www.athome.co.jp/chintai/
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.athomeParser = (() => {
  'use strict';

  const { parserUtils } = window.__otoriBuster;
  const { safeText, safeCount, parseRent, parseManagementFee, normalizeLayout, parseAge, parseWalkMinutes } = parserUtils;

  const SITE_NAME = 'athome';

  function canParse() {
    return location.hostname.endsWith('athome.co.jp') && location.pathname.includes('/chintai/');
  }

  /**
   * 物件カード1件を解析
   * @param {HTMLElement} card
   * @returns {import('../types/index.js').PropertyData}
   */
  function parseCard(card) {
    const name = safeText(card, '.property-name, .p-property-title, h2.title, h3.title') ||
                 safeText(card, '[class*="propertyName"], [class*="building-name"]');

    const address = safeText(card, '.property-address, .p-property-address, [class*="address"]');

    const rentText = safeText(card, '.property-price, .p-property-price, [class*="price"]') ||
                     safeText(card, '.rent');

    const feeText = safeText(card, '.property-management, .p-property-management, [class*="management"]') ||
                    safeText(card, '.kanrihi');

    const layoutText = safeText(card, '.property-layout, .p-property-layout, [class*="madori"], [class*="layout"]');

    const areaText = safeText(card, '.property-area, .p-property-area, [class*="menseki"], [class*="area"]');

    const photoCount = safeCount(card, '.property-photo img, .p-property-photo img, [class*="photo"] img, .thumb img');

    const stationText = safeText(card, '.property-station, .p-property-station, [class*="station"], [class*="access"]');

    const ageText = safeText(card, '.property-age, .p-property-age, [class*="chikunen"], [class*="age"]');

    return {
      name,
      rent: parseRent(rentText),
      managementFee: parseManagementFee(feeText),
      address,
      layout: normalizeLayout(layoutText),
      photoCount: Math.max(photoCount, 0),
      area: areaText,
      age: parseAge(ageText),
      station: stationText,
      walkMinutes: parseWalkMinutes(stationText),
      source: SITE_NAME,
      element: card
    };
  }

  function parse() {
    const selectors = [
      '.property-list-item',
      '.p-property-item',
      '.property-cassette',
      '[data-property-id]'
    ];

    let cards = [];
    for (const sel of selectors) {
      cards = document.querySelectorAll(sel);
      if (cards.length > 0) break;
    }

    const properties = [];
    cards.forEach(card => {
      try {
        properties.push(parseCard(card));
      } catch (err) {
        console.error('[おとり物件バスター] at home解析エラー:', err);
      }
    });

    return properties;
  }

  return Object.freeze({
    name: SITE_NAME,
    canParse,
    parse
  });
})();
