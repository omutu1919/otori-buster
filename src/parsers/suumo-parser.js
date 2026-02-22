/**
 * おとり物件バスター - SUUMO パーサー
 * https://suumo.jp/chintai/
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.suumoParser = (() => {
  'use strict';

  const { parserUtils } = window.__otoriBuster;
  const { safeText, safeCount, parseRent, parseManagementFee, normalizeLayout, parseArea, parseAge, parseWalkMinutes } = parserUtils;

  const SITE_NAME = 'suumo';

  /**
   * このパーサーが現在のページで使用可能か判定
   * @returns {boolean}
   */
  function canParse() {
    return location.hostname === 'suumo.jp' && location.pathname.includes('/chintai/');
  }

  /**
   * 物件カード1件を解析
   * @param {HTMLElement} card - div.cassetteitem 要素
   * @returns {import('../types/index.js').PropertyData}
   */
  function parseCard(card) {
    // 物件名
    const name = safeText(card, '.cassetteitem_content-title');

    // 住所
    const address = safeText(card, '.cassetteitem_detail-col1');

    // 写真枚数
    const photoCount = safeCount(card, '.cassetteitem_object-item img');

    // 築年数・階数情報
    const detailCol3Items = card.querySelectorAll('.cassetteitem_detail-col3 div');
    const ageText = detailCol3Items.length > 0 ? detailCol3Items[0].textContent.trim() : '';
    const age = parseAge(ageText);

    // 交通情報
    const stationEl = card.querySelector('.cassetteitem_detail-col2 .cassetteitem_detail-text');
    const stationText = stationEl ? stationEl.textContent.trim() : '';
    const walkMinutes = parseWalkMinutes(stationText);

    // SUUMOは一つの建物カードに複数の部屋（tbody）がある
    const rooms = card.querySelectorAll('.cassetteitem_other tbody tr');

    if (rooms.length === 0) {
      // 部屋情報が見つからない場合、カード全体から情報取得
      return [createPropertyFromCard(card, name, address, photoCount, age, stationText, walkMinutes)];
    }

    return Array.from(rooms).map(room => {
      const rentText = safeText(room, '.cassetteitem_price--rent');
      const feeText = safeText(room, '.cassetteitem_price--administration');
      const layoutText = safeText(room, '.cassetteitem_madori');
      const areaText = safeText(room, '.cassetteitem_menseki');

      return {
        name,
        rent: parseRent(rentText),
        managementFee: parseManagementFee(feeText),
        address,
        layout: normalizeLayout(layoutText),
        photoCount,
        area: areaText,
        age,
        station: stationText,
        walkMinutes,
        source: SITE_NAME,
        element: card
      };
    });
  }

  /**
   * フォールバック: カード全体から1物件として情報取得
   * @returns {import('../types/index.js').PropertyData}
   */
  function createPropertyFromCard(card, name, address, photoCount, age, station, walkMinutes) {
    const rentText = safeText(card, '.cassetteitem_price--rent');
    const feeText = safeText(card, '.cassetteitem_price--administration');
    const layoutText = safeText(card, '.cassetteitem_madori');
    const areaText = safeText(card, '.cassetteitem_menseki');

    return {
      name,
      rent: parseRent(rentText),
      managementFee: parseManagementFee(feeText),
      address,
      layout: normalizeLayout(layoutText),
      photoCount,
      area: areaText,
      age,
      station,
      walkMinutes,
      source: SITE_NAME,
      element: card
    };
  }

  /**
   * ページ内の全物件を解析
   * @returns {import('../types/index.js').PropertyData[]}
   */
  function parse() {
    const cards = document.querySelectorAll('div.cassetteitem');
    const properties = [];

    cards.forEach(card => {
      try {
        const parsed = parseCard(card);
        parsed.forEach(p => properties.push(p));
      } catch (err) {
        console.error('[おとり物件バスター] SUUMO解析エラー:', err);
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
