/**
 * おとり物件バスター - HOME'S パーサー
 * Puppeteerで確認済みのセレクタ使用
 *
 * DOM構造:
 *   .mod-listKks (建物カード)
 *     .moduleHead > h2.heading > a.detailLink (建物名・詳細リンク)
 *     .moduleBody (部屋行、複数あり)
 *       .bukkenPhoto img (写真, alt=建物名)
 *       table: th.price/td.price, th.address/td.address, th.traffic/td.traffic, th.space/td.space
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.homesParser = (() => {
  'use strict';

  const { parserUtils, logger } = window.__otoriBuster;
  const { safeText, parseRent, parseManagementFee, normalizeLayout, parseAge, parseWalkMinutes, extractCompany } = parserUtils;

  const SITE_NAME = 'homes';
  const HOMES_COMPANY_SELECTORS = ['.bukkenAgency'];

  function canParse() {
    return location.hostname.endsWith('homes.co.jp') && location.pathname.includes('/chintai/');
  }

  function isDetailPage() {
    return /\/chintai\/b-\d+\//.test(location.pathname);
  }

  // === 一覧ページ ===

  function parseListPage() {
    const buildings = document.querySelectorAll('.mod-listKks, [class*="mod-listKks"]');
    const properties = [];

    buildings.forEach(building => {
      try {
        // 建物名
        const nameEl = building.querySelector('.heading a.detailLink, .heading a, h2.heading');
        const nameFromLink = nameEl ? nameEl.textContent.trim() : '';
        const imgEl = building.querySelector('.bukkenPhoto img');
        const name = nameFromLink || (imgEl ? imgEl.alt : '');

        // 部屋行を処理
        const rooms = building.querySelectorAll('.moduleBody');
        rooms.forEach(room => {
          const rentCell = room.querySelector('td.price');
          const rentText = rentCell ? rentCell.textContent.trim() : '';
          const rentNumEl = room.querySelector('td.price .num');
          const rentNum = rentNumEl ? rentNumEl.textContent.trim() : '';

          // 管理費: "13.4万円 / 15,000円" の "/" の後
          let feeText = '';
          if (rentText.includes('/')) {
            feeText = rentText.split('/').pop().trim();
          }

          const address = safeText(room, 'td.address');
          const stationText = safeText(room, 'td.traffic');

          // "47.81m² / 1LDK" → 面積と間取りを分離
          const spaceText = safeText(room, 'td.space');
          let areaText = '';
          let layoutText = '';
          if (spaceText.includes('/')) {
            const parts = spaceText.split('/');
            areaText = parts[0].trim();
            layoutText = parts[1].trim();
          } else {
            layoutText = spaceText;
          }

          // 一覧ページは写真1枚のみ
          const photoCount = -1;

          properties.push({
            name,
            rent: parseRent(rentNum + '万円'),
            managementFee: parseManagementFee(feeText),
            address,
            layout: normalizeLayout(layoutText),
            photoCount,
            area: areaText,
            age: -1,
            station: stationText,
            walkMinutes: parseWalkMinutes(stationText),
            company: extractCompany(building, HOMES_COMPANY_SELECTORS),
            source: SITE_NAME,
            element: building
          });
        });
      } catch (err) {
        logger.error('HOME\'S解析エラー:', err);
      }
    });

    return properties;
  }

  // === 詳細ページ ===

  function parseDetailPage() {
    const name = safeText(document.body, 'h1, .bukkenName, .building-name') || '';

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

    const rentRaw = tableValue('賃料');
    const rent = parseRent(rentRaw);
    const feeRaw = tableValue('管理費') || tableValue('共益費');
    const address = tableValue('所在地') || tableValue('住所');
    const stationText = tableValue('交通') || tableValue('アクセス');
    const ageText = tableValue('築年') || tableValue('建築年');
    const spaceText = tableValue('面積') || tableValue('専有面積');
    const layoutText = tableValue('間取り');

    const photos = document.querySelectorAll('[class*="gallery"] img, [class*="photo"] img, [class*="slider"] img');
    const targetEl = document.querySelector('h1') || document.querySelector('.bukkenName');
    if (!targetEl) return [];

    return [{
      name,
      rent,
      managementFee: parseManagementFee(feeRaw),
      address,
      layout: normalizeLayout(layoutText),
      photoCount: photos.length,
      area: spaceText,
      age: parseAge(ageText),
      station: stationText,
      walkMinutes: parseWalkMinutes(stationText),
      company: extractCompany(document.body, HOMES_COMPANY_SELECTORS),
      source: SITE_NAME,
      element: targetEl
    }];
  }

  // === 詳細URL抽出 ===

  function getDetailUrl(buildingElement) {
    const link = buildingElement.querySelector('a.detailLink[href], a.prg-detailLink[href], a[href*="/chintai/b-"]');
    return link ? link.href : '';
  }

  function parse() {
    if (isDetailPage()) {
      try { return parseDetailPage(); }
      catch (err) { logger.error('HOME\'S詳細エラー:', err); return []; }
    }
    return parseListPage();
  }

  return Object.freeze({ name: SITE_NAME, canParse, parse, getDetailUrl });
})();
