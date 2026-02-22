/**
 * おとり物件バスター - SUUMO パーサー
 * Puppeteerで確認済みのセレクタ使用
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.suumoParser = (() => {
  'use strict';

  const { parserUtils, logger } = window.__otoriBuster;
  const { safeText, safeCount, parseRent, parseManagementFee, normalizeLayout, parseAge, parseWalkMinutes, extractCompany } = parserUtils;

  const SITE_NAME = 'suumo';

  function canParse() {
    return location.hostname === 'suumo.jp' && location.pathname.includes('/chintai/');
  }

  // === 一覧ページ ===

  function parseListPage() {
    const cards = document.querySelectorAll('div.cassetteitem');
    const properties = [];

    cards.forEach(card => {
      try {
        const name = safeText(card, '.cassetteitem_content-title');
        const address = safeText(card, '.cassetteitem_detail-col1');

        // 一覧ページの写真は代表サムネ1枚のみなので枚数判定不可 → -1
        const photoCount = -1;

        const detailCol3Items = card.querySelectorAll('.cassetteitem_detail-col3 div');
        const ageText = detailCol3Items.length > 0 ? detailCol3Items[0].textContent.trim() : '';
        const age = parseAge(ageText);

        const stationEl = card.querySelector('.cassetteitem_detail-col2 .cassetteitem_detail-text');
        const stationText = stationEl ? stationEl.textContent.trim() : '';
        const walkMinutes = parseWalkMinutes(stationText);

        // 1建物に複数部屋
        const rooms = card.querySelectorAll('.cassetteitem_other tbody tr');

        if (rooms.length === 0) {
          properties.push(makeProperty(card, name, address, photoCount, age, stationText, walkMinutes,
            safeText(card, '.cassetteitem_price--rent'),
            safeText(card, '.cassetteitem_price--administration'),
            safeText(card, '.cassetteitem_madori'),
            safeText(card, '.cassetteitem_menseki')
          ));
        } else {
          rooms.forEach(room => {
            properties.push(makeProperty(card, name, address, photoCount, age, stationText, walkMinutes,
              safeText(room, '.cassetteitem_price--rent'),
              safeText(room, '.cassetteitem_price--administration'),
              safeText(room, '.cassetteitem_madori'),
              safeText(room, '.cassetteitem_menseki')
            ));
          });
        }
      } catch (err) {
        logger.error('SUUMO一覧解析エラー:', err);
      }
    });

    return properties;
  }

  const SUUMO_COMPANY_SELECTORS = ['a[href*="/kaisha/"]', '.cassetteitem_detail-text--lead'];

  function makeProperty(card, name, address, photoCount, age, station, walkMinutes, rentText, feeText, layoutText, areaText) {
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
      company: extractCompany(card, SUUMO_COMPANY_SELECTORS),
      source: SITE_NAME,
      element: card
    };
  }

  // === 詳細ページ ===

  function isDetailPage() {
    return /\/chintai\/[a-z]{2,3}_\d+/.test(location.pathname);
  }

  /**
   * 詳細ページのテーブルからラベルに対応する値を抽出
   * SUUMOは "賃料(管理費)" のように複合ラベルを使うので部分一致
   */
  function tableValue(label) {
    const ths = document.querySelectorAll('th');
    for (const th of ths) {
      if (th.textContent.trim().includes(label)) {
        const td = th.nextElementSibling;
        if (td) return td.textContent.trim();
      }
    }
    return '';
  }

  function parseDetailPage() {
    const name = safeText(document.body, '.section_h1-header-title') ||
                 safeText(document.body, 'h1');

    const address = tableValue('所在地');

    // "12.1万円\n(8000円)" から家賃部分だけ抽出
    const rentRaw = tableValue('賃料');
    const rent = parseRent(rentRaw);

    // 管理費は賃料セルの括弧内、またはtableから
    let fee = 0;
    const feeMatch = rentRaw.match(/[（(]([\d,.]+円?)[)）]/);
    if (feeMatch) {
      fee = parseManagementFee(feeMatch[1]);
    }

    const layoutText = tableValue('間取り');
    const areaText = tableValue('専有面積');
    const ageText = tableValue('築年');
    const stationText = tableValue('交通');

    // 詳細ページはギャラリー写真を数える
    const photoCount = safeCount(document.body, '[class*="gallery"] img, [class*="photo"] img');

    const targetEl = document.querySelector('.section_h1-header') ||
                     document.querySelector('h1');

    if (!targetEl) {
      logger.log('SUUMO詳細: バッジ表示先が見つかりません');
      return [];
    }

    logger.log('SUUMO詳細:', { name, address, rent, layout: layoutText, photoCount });

    return [{
      name,
      rent,
      managementFee: fee,
      address,
      layout: normalizeLayout(layoutText),
      photoCount,
      area: areaText,
      age: parseAge(ageText),
      station: stationText,
      walkMinutes: parseWalkMinutes(stationText),
      company: extractCompany(document.body, SUUMO_COMPANY_SELECTORS),
      source: SITE_NAME,
      element: targetEl
    }];
  }

  // === 詳細URL抽出（プリフェッチ用） ===

  /**
   * 一覧ページのカード要素から詳細ページURLを抽出
   * SUUMOの詳細URLパターン: /chintai/jnc_XXXXXXXXX/
   */
  function getDetailUrl(cardElement) {
    const links = cardElement.querySelectorAll('a[href]');
    for (const link of links) {
      if (/\/chintai\/[a-z]{2,3}_\d+/.test(link.href)) {
        return link.href;
      }
    }
    return '';
  }

  // === メイン ===

  function parse() {
    if (isDetailPage()) {
      try {
        return parseDetailPage();
      } catch (err) {
        logger.error('SUUMO詳細ページ解析エラー:', err);
        return [];
      }
    }
    return parseListPage();
  }

  return Object.freeze({ name: SITE_NAME, canParse, parse, getDetailUrl });
})();
