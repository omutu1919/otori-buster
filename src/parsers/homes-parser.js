/**
 * おとり物件バスター - HOME'S パーサー
 * https://www.homes.co.jp/chintai/
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.homesParser = (() => {
  'use strict';

  const { parserUtils } = window.__otoriBuster;
  const { safeText, safeCount, parseRent, parseManagementFee, normalizeLayout, parseAge, parseWalkMinutes } = parserUtils;

  const SITE_NAME = 'homes';

  function canParse() {
    return location.hostname.endsWith('homes.co.jp') && location.pathname.includes('/chintai/');
  }

  /**
   * 物件カード1件を解析
   * @param {HTMLElement} card
   * @returns {import('../types/index.js').PropertyData}
   */
  function parseCard(card) {
    // HOME'Sのセレクタ（実際のDOM構造に合わせて調整が必要）
    const name = safeText(card, '.bukkenName, .mod-buildingName, [data-type="building-name"]') ||
                 safeText(card, 'h2, h3');

    const address = safeText(card, '.bukkenAddress, .prg-address, [data-type="address"]') ||
                    safeText(card, '.detailData-address');

    const rentText = safeText(card, '.bukkenPrice, .prg-price, [data-type="price"]') ||
                     safeText(card, '.detailData-price .num');

    const feeText = safeText(card, '.bukkenAdmin, .prg-administration') ||
                    safeText(card, '.detailData-kanrihi');

    const layoutText = safeText(card, '.bukkenMadori, .prg-madori, [data-type="madori"]') ||
                       safeText(card, '.detailData-madori');

    const areaText = safeText(card, '.bukkenMenseki, .prg-menseki, [data-type="menseki"]') ||
                     safeText(card, '.detailData-menseki');

    const photoCount = safeCount(card, '.bukkenPhoto img, .mod-mergeBuilding--photo img, .photoList img, img[data-type="photo"]');

    const stationText = safeText(card, '.bukkenStation, .prg-station, [data-type="station"]') ||
                        safeText(card, '.detailData-station');

    const ageText = safeText(card, '.bukkenAge, .prg-age') ||
                    safeText(card, '.detailData-chikunen');

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
    // HOME'Sの物件カードセレクタ（複数候補）
    const selectors = [
      '.mod-mergeBuilding',
      '.mod-buildingList--item',
      '.bukkenList-item',
      '[data-type="building-block"]'
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
        console.error('[おとり物件バスター] HOME\'S解析エラー:', err);
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
