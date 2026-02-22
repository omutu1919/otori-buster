/**
 * おとり物件バスター - 相場データテーブル
 * 東京23区 + 大阪24区、間取り別平均家賃（万円）
 * データソース: CHINTAI 2026年2月
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.marketData = (() => {
  'use strict';

  /**
   * 東京23区 間取り別平均家賃（万円）
   * @type {Object<string, Object<string, number>>}
   */
  const TOKYO_RENT = Object.freeze({
    '千代田区': { '1R': 10.5, '1K': 11.0, '1DK': 13.5, '1LDK': 19.0, '2DK': 15.0, '2LDK': 27.0 },
    '中央区':   { '1R': 10.0, '1K': 10.5, '1DK': 13.0, '1LDK': 18.5, '2DK': 14.5, '2LDK': 25.0 },
    '港区':     { '1R': 11.5, '1K': 12.0, '1DK': 15.0, '1LDK': 22.0, '2DK': 17.0, '2LDK': 32.0 },
    '新宿区':   { '1R': 8.5,  '1K': 9.0,  '1DK': 11.5, '1LDK': 16.0, '2DK': 12.5, '2LDK': 22.0 },
    '文京区':   { '1R': 8.0,  '1K': 8.5,  '1DK': 11.0, '1LDK': 15.0, '2DK': 12.0, '2LDK': 20.0 },
    '台東区':   { '1R': 8.0,  '1K': 8.5,  '1DK': 10.5, '1LDK': 14.5, '2DK': 11.5, '2LDK': 19.0 },
    '墨田区':   { '1R': 7.5,  '1K': 8.0,  '1DK': 10.0, '1LDK': 13.5, '2DK': 10.5, '2LDK': 17.0 },
    '江東区':   { '1R': 7.5,  '1K': 8.0,  '1DK': 10.5, '1LDK': 14.0, '2DK': 11.0, '2LDK': 18.5 },
    '品川区':   { '1R': 8.5,  '1K': 9.0,  '1DK': 11.5, '1LDK': 16.0, '2DK': 13.0, '2LDK': 22.0 },
    '目黒区':   { '1R': 8.5,  '1K': 9.5,  '1DK': 12.0, '1LDK': 17.0, '2DK': 13.5, '2LDK': 24.0 },
    '大田区':   { '1R': 7.0,  '1K': 7.5,  '1DK': 9.5,  '1LDK': 13.0, '2DK': 10.0, '2LDK': 16.0 },
    '世田谷区': { '1R': 7.5,  '1K': 8.0,  '1DK': 10.5, '1LDK': 14.5, '2DK': 11.5, '2LDK': 19.0 },
    '渋谷区':   { '1R': 9.5,  '1K': 10.0, '1DK': 13.0, '1LDK': 19.0, '2DK': 15.0, '2LDK': 27.0 },
    '中野区':   { '1R': 7.0,  '1K': 7.5,  '1DK': 9.5,  '1LDK': 13.0, '2DK': 10.0, '2LDK': 16.5 },
    '杉並区':   { '1R': 7.0,  '1K': 7.5,  '1DK': 9.5,  '1LDK': 13.0, '2DK': 10.0, '2LDK': 16.0 },
    '豊島区':   { '1R': 7.5,  '1K': 8.0,  '1DK': 10.5, '1LDK': 14.0, '2DK': 11.0, '2LDK': 18.0 },
    '北区':     { '1R': 7.0,  '1K': 7.5,  '1DK': 9.0,  '1LDK': 12.5, '2DK': 9.5,  '2LDK': 15.5 },
    '荒川区':   { '1R': 7.0,  '1K': 7.5,  '1DK': 9.0,  '1LDK': 12.0, '2DK': 9.5,  '2LDK': 15.0 },
    '板橋区':   { '1R': 6.5,  '1K': 7.0,  '1DK': 8.5,  '1LDK': 11.5, '2DK': 9.0,  '2LDK': 14.0 },
    '練馬区':   { '1R': 6.0,  '1K': 6.5,  '1DK': 8.0,  '1LDK': 11.0, '2DK': 8.5,  '2LDK': 13.5 },
    '足立区':   { '1R': 6.0,  '1K': 6.5,  '1DK': 7.5,  '1LDK': 10.0, '2DK': 8.0,  '2LDK': 12.0 },
    '葛飾区':   { '1R': 6.0,  '1K': 6.5,  '1DK': 7.5,  '1LDK': 10.0, '2DK': 8.0,  '2LDK': 12.0 },
    '江戸川区': { '1R': 6.0,  '1K': 6.5,  '1DK': 7.5,  '1LDK': 10.5, '2DK': 8.0,  '2LDK': 12.5 }
  });

  /**
   * 大阪24区 間取り別平均家賃（万円）
   * @type {Object<string, Object<string, number>>}
   */
  const OSAKA_RENT = Object.freeze({
    '都島区':   { '1R': 5.5, '1K': 6.0, '1DK': 7.0,  '1LDK': 9.5,  '2DK': 7.5,  '2LDK': 11.0 },
    '福島区':   { '1R': 6.0, '1K': 6.5, '1DK': 7.5,  '1LDK': 10.5, '2DK': 8.5,  '2LDK': 13.0 },
    '此花区':   { '1R': 5.0, '1K': 5.5, '1DK': 6.5,  '1LDK': 8.5,  '2DK': 6.5,  '2LDK': 9.5 },
    '西区':     { '1R': 6.5, '1K': 7.0, '1DK': 8.0,  '1LDK': 11.5, '2DK': 9.0,  '2LDK': 14.0 },
    '港区':     { '1R': 5.0, '1K': 5.5, '1DK': 6.5,  '1LDK': 8.5,  '2DK': 7.0,  '2LDK': 10.0 },
    '大正区':   { '1R': 4.5, '1K': 5.0, '1DK': 5.5,  '1LDK': 7.5,  '2DK': 6.0,  '2LDK': 8.5 },
    '天王寺区': { '1R': 6.0, '1K': 6.5, '1DK': 7.5,  '1LDK': 10.5, '2DK': 8.5,  '2LDK': 13.0 },
    '浪速区':   { '1R': 6.0, '1K': 6.5, '1DK': 7.5,  '1LDK': 10.0, '2DK': 8.0,  '2LDK': 12.0 },
    '西淀川区': { '1R': 4.5, '1K': 5.0, '1DK': 5.5,  '1LDK': 7.5,  '2DK': 6.0,  '2LDK': 8.5 },
    '東淀川区': { '1R': 5.0, '1K': 5.5, '1DK': 6.0,  '1LDK': 8.0,  '2DK': 6.5,  '2LDK': 9.5 },
    '東成区':   { '1R': 5.0, '1K': 5.5, '1DK': 6.5,  '1LDK': 8.5,  '2DK': 7.0,  '2LDK': 10.0 },
    '生野区':   { '1R': 4.5, '1K': 5.0, '1DK': 5.5,  '1LDK': 7.0,  '2DK': 5.5,  '2LDK': 8.0 },
    '旭区':     { '1R': 4.5, '1K': 5.0, '1DK': 5.5,  '1LDK': 7.5,  '2DK': 6.0,  '2LDK': 8.5 },
    '城東区':   { '1R': 5.0, '1K': 5.5, '1DK': 6.5,  '1LDK': 8.5,  '2DK': 7.0,  '2LDK': 10.0 },
    '阿倍野区': { '1R': 5.5, '1K': 6.0, '1DK': 7.0,  '1LDK': 9.5,  '2DK': 7.5,  '2LDK': 11.5 },
    '住吉区':   { '1R': 5.0, '1K': 5.5, '1DK': 6.0,  '1LDK': 8.0,  '2DK': 6.5,  '2LDK': 9.5 },
    '東住吉区': { '1R': 4.5, '1K': 5.0, '1DK': 5.5,  '1LDK': 7.5,  '2DK': 6.0,  '2LDK': 8.5 },
    '西成区':   { '1R': 4.0, '1K': 4.5, '1DK': 5.0,  '1LDK': 6.5,  '2DK': 5.0,  '2LDK': 7.0 },
    '淀川区':   { '1R': 5.5, '1K': 6.0, '1DK': 7.0,  '1LDK': 9.5,  '2DK': 7.5,  '2LDK': 11.0 },
    '鶴見区':   { '1R': 5.0, '1K': 5.5, '1DK': 6.0,  '1LDK': 8.0,  '2DK': 6.5,  '2LDK': 9.5 },
    '住之江区': { '1R': 4.5, '1K': 5.0, '1DK': 5.5,  '1LDK': 7.5,  '2DK': 6.0,  '2LDK': 8.5 },
    '平野区':   { '1R': 4.5, '1K': 5.0, '1DK': 5.5,  '1LDK': 7.0,  '2DK': 5.5,  '2LDK': 8.0 },
    '北区':     { '1R': 6.5, '1K': 7.0, '1DK': 8.0,  '1LDK': 11.0, '2DK': 9.0,  '2LDK': 14.0 },
    '中央区':   { '1R': 6.5, '1K': 7.0, '1DK': 8.0,  '1LDK': 11.5, '2DK': 9.0,  '2LDK': 14.5 }
  });

  /**
   * 東京の最低ライン家賃（万円）- これ以下はほぼありえない
   */
  const TOKYO_MIN_RENT = 3.0;

  /**
   * 大阪の最低ライン家賃（万円）
   */
  const OSAKA_MIN_RENT = 2.5;

  /**
   * 相場を取得
   * @param {string} region - 'tokyo' or 'osaka'
   * @param {string} ward - 区名（"新宿区"等）
   * @param {string} layout - 間取り（"1K"等）
   * @returns {number|null} 相場家賃（万円）、データなしならnull
   */
  function getMarketRent(region, ward, layout) {
    const table = region === 'tokyo' ? TOKYO_RENT : region === 'osaka' ? OSAKA_RENT : null;
    if (!table) return null;

    const wardData = table[ward];
    if (!wardData) return null;

    // 間取りの正規化マッピング
    const normalizedLayout = normalizeLayoutForLookup(layout);
    return wardData[normalizedLayout] || null;
  }

  /**
   * 相場検索用に間取りを正規化
   * @param {string} layout
   * @returns {string}
   */
  function normalizeLayoutForLookup(layout) {
    if (!layout) return '1K';

    const upper = layout.toUpperCase().replace(/\s/g, '');

    // 直接マッチ
    if (['1R', '1K', '1DK', '1LDK', '2DK', '2LDK'].includes(upper)) return upper;

    // 2K → 2DK にフォールバック
    if (upper === '2K') return '2DK';
    // 3DK, 3LDK → 2LDK にフォールバック
    if (upper.startsWith('3') || upper.startsWith('4')) return '2LDK';

    return '1K';
  }

  /**
   * 最低ライン家賃を取得
   * @param {string} region - 'tokyo' or 'osaka'
   * @returns {number}
   */
  function getMinRent(region) {
    if (region === 'tokyo') return TOKYO_MIN_RENT;
    if (region === 'osaka') return OSAKA_MIN_RENT;
    return TOKYO_MIN_RENT;
  }

  return Object.freeze({
    getMarketRent,
    getMinRent,
    TOKYO_RENT,
    OSAKA_RENT
  });
})();
