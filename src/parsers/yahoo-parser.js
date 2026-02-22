/**
 * おとり物件バスター - Yahoo!不動産 パーサー
 * Puppeteerで確認済みのセレクタ使用
 *
 * DOM構造:
 *   li.ListBukken__item (建物カード)
 *     .ListCassette__ttl__link (駅名+築年数 ※建物名なしの場合あり)
 *     .ListCassette__ttl__tag (建物種別: アパート/マンション)
 *     .ListCassette__txt (交通アクセス: "守山駅/東海道本線 徒歩1分以内")
 *     .ListCassette__list内 (住所: "滋賀県守山市梅田町")
 *     .ListCassetteRoom__item (部屋行、複数あり)
 *       .ListCassetteRoom__dtl__price (賃料: "9.6万円 管理費等 8,000円")
 *       .ListCassetteRoom__dtl__price__txtS (管理費: "管理費等 8,000円")
 *       .ListCassetteRoom__dtl__layout (間取り: "1LDK")
 *       a[href*="/rent/detail/"] (詳細リンク)
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.yahooParser = (() => {
  'use strict';

  const { parserUtils, logger } = window.__otoriBuster;
  const { safeText, parseRent, parseManagementFee, normalizeLayout, parseAge, parseWalkMinutes, normalizeDigits, extractCompany } = parserUtils;

  const SITE_NAME = 'yahoo';
  const YAHOO_COMPANY_SELECTORS = ['[class*="Company"]'];

  function canParse() {
    return location.hostname === 'realestate.yahoo.co.jp' &&
           (location.pathname.includes('/rent/') || location.pathname.includes('/chintai/'));
  }

  function isDetailPage() {
    return /\/rent\/detail\//.test(location.pathname);
  }

  /**
   * .ListCassette__list 内のテキストから住所を抽出
   * 住所は「都道府県+市区町村」パターンで判別
   */
  function extractAddressFromCard(card) {
    const listItems = card.querySelectorAll('.ListCassette__item, .ListCassette__txt');
    for (const item of listItems) {
      const text = item.textContent.trim();
      if (/[都道府県]/.test(text) && /[市区町村郡]/.test(text) && !text.includes('徒歩')) {
        return text;
      }
    }
    // フォールバック: カード全体のテキストから住所パターンを探す
    const fullText = card.textContent || '';
    const match = fullText.match(/(東京都|北海道|(?:大阪|京都)府|.{2,3}県)[^\s]{2,20}[市区町村郡].{0,20}/);
    return match ? match[0].trim() : '';
  }

  // === 一覧ページ ===

  function parseListPage() {
    const buildings = document.querySelectorAll('.ListBukken__item');
    const properties = [];

    buildings.forEach(building => {
      try {
        // 建物名（タイトル行は駅名+築年が多い、建物名がない場合もある）
        const titleText = safeText(building, '.ListCassette__ttl__link');
        const buildingType = safeText(building, '.ListCassette__ttl__tag');
        const name = titleText.includes('駅') ? '' : titleText;

        // 築年数: タイトルから "築XX年" を抽出
        const age = parseAge(titleText);

        // 住所
        const address = extractAddressFromCard(building);

        // 交通: 最初の駅情報
        const stationEl = building.querySelector('.ListCassette__txt');
        const stationText = stationEl ? stationEl.textContent.trim() : '';

        // 一覧ページは写真1枚のみ
        const photoCount = -1;

        // 部屋行を処理
        const rooms = building.querySelectorAll('.ListCassetteRoom__item');

        if (rooms.length === 0) {
          // 部屋行がない場合は建物情報だけで1件
          properties.push({
            name, rent: 0, managementFee: 0, address,
            layout: '', photoCount, area: '', age,
            station: stationText, walkMinutes: parseWalkMinutes(stationText),
            company: extractCompany(building, YAHOO_COMPANY_SELECTORS),
            source: SITE_NAME, element: building
          });
        } else {
          rooms.forEach(room => {
            const priceText = safeText(room, '.ListCassetteRoom__dtl__price');
            const feeText = safeText(room, '.ListCassetteRoom__dtl__price__txtS');
            const layoutText = safeText(room, '.ListCassetteRoom__dtl__layout');

            // 面積: 部屋行テキストから "XX.XXm2" を抽出
            const roomText = normalizeDigits(room.textContent || '');
            const areaMatch = roomText.match(/(\d+\.?\d*)\s*m[2²]/);
            const areaText = areaMatch ? areaMatch[1] + 'm2' : '';

            properties.push({
              name,
              rent: parseRent(priceText),
              managementFee: parseManagementFee(feeText),
              address,
              layout: normalizeLayout(layoutText),
              photoCount,
              area: areaText,
              age,
              station: stationText,
              walkMinutes: parseWalkMinutes(stationText),
              company: extractCompany(building, YAHOO_COMPANY_SELECTORS),
              source: SITE_NAME,
              element: building
            });
          });
        }
      } catch (err) {
        logger.error('Yahoo!不動産解析エラー:', err);
      }
    });

    return properties;
  }

  // === 詳細ページ ===

  function parseDetailPage() {
    const name = safeText(document.body, 'h1, [class*="DetailHeader"] [class*="name"]') || '';

    function tableValue(label) {
      const ths = document.querySelectorAll('th, dt');
      for (const th of ths) {
        if (th.textContent.trim().includes(label)) {
          const next = th.nextElementSibling;
          if (next) return next.textContent.trim();
        }
      }
      return '';
    }

    const rentRaw = tableValue('賃料');
    const address = tableValue('所在地') || tableValue('住所');
    const stationText = tableValue('交通') || tableValue('アクセス');
    const ageText = tableValue('築年') || tableValue('建築');
    const layoutText = tableValue('間取り');
    const areaText = tableValue('面積') || tableValue('専有面積');

    const photos = document.querySelectorAll('[class*="gallery"] img, [class*="photo"] img, [class*="slider"] img');
    const targetEl = document.querySelector('h1') || document.querySelector('[class*="DetailHeader"]');
    if (!targetEl) return [];

    return [{
      name,
      rent: parseRent(rentRaw),
      managementFee: 0,
      address,
      layout: normalizeLayout(layoutText),
      photoCount: photos.length,
      area: areaText,
      age: parseAge(ageText),
      station: stationText,
      walkMinutes: parseWalkMinutes(stationText),
      company: extractCompany(document.body, YAHOO_COMPANY_SELECTORS),
      source: SITE_NAME,
      element: targetEl
    }];
  }

  // === 詳細URL抽出 ===

  function getDetailUrl(buildingElement) {
    const link = buildingElement.querySelector('a[href*="/rent/detail/"]');
    return link ? link.href : '';
  }

  function parse() {
    if (isDetailPage()) {
      try { return parseDetailPage(); }
      catch (err) { logger.error('Yahoo!不動産詳細エラー:', err); return []; }
    }
    return parseListPage();
  }

  return Object.freeze({ name: SITE_NAME, canParse, parse, getDetailUrl });
})();
