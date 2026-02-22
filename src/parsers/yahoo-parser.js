/**
 * おとり物件バスター - Yahoo!不動産 パーサー
 * https://realestate.yahoo.co.jp/rent/
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.yahooParser = (() => {
  'use strict';

  const { parserUtils } = window.__otoriBuster;
  const { safeText, safeCount, parseRent, parseManagementFee, normalizeLayout, parseAge, parseWalkMinutes } = parserUtils;

  const SITE_NAME = 'yahoo';

  function canParse() {
    return location.hostname === 'realestate.yahoo.co.jp' &&
           (location.pathname.includes('/rent/') || location.pathname.includes('/chintai/'));
  }

  /**
   * 物件カード1件を解析
   * @param {HTMLElement} card
   * @returns {import('../types/index.js').PropertyData}
   */
  function parseCard(card) {
    const name = safeText(card, '.Property__name, .property-name, h3[class*="name"]') ||
                 safeText(card, 'h2, h3');

    const address = safeText(card, '.Property__address, .property-address, [class*="address"]');

    const rentText = safeText(card, '.Property__price, .property-price, [class*="price"]');

    const feeText = safeText(card, '.Property__admin, .property-admin, [class*="admin"]') ||
                    safeText(card, '[class*="management"]');

    const layoutText = safeText(card, '.Property__layout, .property-layout, [class*="madori"]');

    const areaText = safeText(card, '.Property__area, .property-area, [class*="menseki"]');

    const photoCount = safeCount(card, '.Property__image img, .property-photo img, [class*="photo"] img, .thumb img');

    const stationText = safeText(card, '.Property__access, .property-station, [class*="station"], [class*="access"]');

    const ageText = safeText(card, '.Property__age, .property-age, [class*="age"], [class*="chikunen"]');

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
      '.Property',
      '.property-cassette',
      '.SearchResult__item',
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
        console.error('[おとり物件バスター] Yahoo!不動産解析エラー:', err);
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
