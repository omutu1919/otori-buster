/**
 * おとり物件バスター - CHINTAI パーサー
 * https://www.chintai.net/
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.chintaiParser = (() => {
  'use strict';

  const { parserUtils } = window.__otoriBuster;
  const { safeText, safeCount, parseRent, parseManagementFee, normalizeLayout, parseAge, parseWalkMinutes } = parserUtils;

  const SITE_NAME = 'chintai';

  function canParse() {
    return location.hostname.endsWith('chintai.net');
  }

  /**
   * 物件カード1件を解析
   * @param {HTMLElement} card
   * @returns {import('../types/index.js').PropertyData}
   */
  function parseCard(card) {
    const name = safeText(card, '.cassetteitem_content-title, .building-name, h3[class*="title"]') ||
                 safeText(card, '.js-cassetteitem-title');

    const address = safeText(card, '.cassetteitem_detail-col1, [class*="address"]') ||
                    safeText(card, '.building-address');

    const rentText = safeText(card, '.cassetteitem_price--rent, [class*="price"], .rent-value');

    const feeText = safeText(card, '.cassetteitem_price--administration, [class*="admin"], .kanrihi-value');

    const layoutText = safeText(card, '.cassetteitem_madori, [class*="madori"], .room-madori');

    const areaText = safeText(card, '.cassetteitem_menseki, [class*="menseki"], .room-menseki');

    const photoCount = safeCount(card, '.cassetteitem_object img, [class*="photo"] img, .building-photo img');

    const stationText = safeText(card, '.cassetteitem_detail-col2, [class*="station"], .building-station');

    const ageText = safeText(card, '.cassetteitem_detail-col3 div:first-child, [class*="age"], .building-age');

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
      '.cassetteitem',
      '.building-cassette',
      '.property-cassette',
      '[data-building-id]'
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
        console.error('[おとり物件バスター] CHINTAI解析エラー:', err);
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
