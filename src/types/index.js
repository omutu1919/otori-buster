/**
 * おとり物件バスター - 型定義 (JSDoc)
 * @namespace window.__otoriBuster
 */

window.__otoriBuster = window.__otoriBuster || {};

/**
 * @typedef {Object} PropertyData
 * @property {string} name - 物件名（空文字の場合あり）
 * @property {number} rent - 家賃（万円）
 * @property {number} managementFee - 管理費・共益費（万円）
 * @property {string} address - 住所
 * @property {string} layout - 間取り（1R, 1K, 1DK, 1LDK, 2DK, 2LDK 等）
 * @property {number} photoCount - 写真枚数
 * @property {string} area - 専有面積（m²）
 * @property {number} age - 築年数
 * @property {string} station - 最寄り駅
 * @property {number} walkMinutes - 駅徒歩（分）
 * @property {string} source - 取得元サイト名
 * @property {HTMLElement} element - 対応するDOM要素
 */

/**
 * @typedef {'1R'|'1K'|'1DK'|'1LDK'|'2DK'|'2LDK'|'2K'|'3DK'|'3LDK'} LayoutType
 */

/**
 * @typedef {Object} ScoreFactor
 * @property {string} name - 因子名
 * @property {number} rawScore - 素点（0-100）
 * @property {number} weight - 重み（0-1）
 * @property {number} weightedScore - 加重スコア
 * @property {string} reason - 判定理由
 */

/**
 * @typedef {Object} OtoriScore
 * @property {number} total - 合計スコア（0-100）
 * @property {'safe'|'caution'|'warning'|'danger'} level - リスクレベル
 * @property {ScoreFactor[]} factors - 因子別スコア
 */

/**
 * @typedef {Object} ParserResult
 * @property {string} site - サイト名
 * @property {PropertyData[]} properties - 解析された物件データ配列
 */

/**
 * @typedef {Object} SiteParser
 * @property {string} name - パーサー名
 * @property {function(): boolean} canParse - このパーサーが使えるか判定
 * @property {function(): PropertyData[]} parse - 物件データを解析
 */

/**
 * @typedef {Object} UserSettings
 * @property {boolean} enabled - 拡張機能有効/無効
 * @property {boolean} showBadge - バッジ表示
 * @property {boolean} showDetailOnHover - ホバーで詳細表示
 * @property {number} dangerThreshold - 危険判定閾値
 */

window.__otoriBuster.DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  showBadge: true,
  showDetailOnHover: false,
  dangerThreshold: 70
});
