/**
 * おとり物件バスター - スコアリングエンジン
 * 5因子による総合おとりスコア算出
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.scoringEngine = (() => {
  'use strict';

  const { parserUtils, marketData } = window.__otoriBuster;

  /**
   * 因子の重み定義
   */
  const WEIGHTS = Object.freeze({
    PRICE_GAP: 0.35,
    ADDRESS_VAGUE: 0.20,
    NO_NAME: 0.15,
    FEW_PHOTOS: 0.15,
    TOO_CHEAP: 0.15
  });

  /**
   * リスクレベル判定
   * @param {number} score - 合計スコア（0-100）
   * @returns {'safe'|'caution'|'warning'|'danger'}
   */
  function getLevel(score) {
    if (score < 20) return 'safe';
    if (score < 45) return 'caution';
    if (score < 70) return 'warning';
    return 'danger';
  }

  /**
   * 因子1: 相場との乖離スコア
   * @param {import('../types/index.js').PropertyData} property
   * @returns {import('../types/index.js').ScoreFactor}
   */
  function scorePriceGap(property) {
    const region = parserUtils.extractRegion(property.address);
    const ward = parserUtils.extractWard(property.address);
    const layout = parserUtils.normalizeLayout(property.layout);
    const marketRent = marketData.getMarketRent(region, ward, layout);

    if (!marketRent || property.rent <= 0) {
      return {
        name: '相場との乖離',
        rawScore: 0,
        weight: WEIGHTS.PRICE_GAP,
        weightedScore: 0,
        reason: '相場データなし（判定スキップ）'
      };
    }

    const gap = (marketRent - property.rent) / marketRent;

    let rawScore;
    let reason;

    if (gap <= 0.05) {
      rawScore = 0;
      reason = `相場(${marketRent}万)との差: ${Math.round(gap * 100)}%以内`;
    } else if (gap <= 0.15) {
      rawScore = Math.round(30 * ((gap - 0.05) / 0.10));
      reason = `相場(${marketRent}万)より${Math.round(gap * 100)}%安い`;
    } else if (gap <= 0.25) {
      rawScore = 30 + Math.round(30 * ((gap - 0.15) / 0.10));
      reason = `相場(${marketRent}万)より${Math.round(gap * 100)}%安い（要注意）`;
    } else if (gap <= 0.40) {
      rawScore = 60 + Math.round(40 * ((gap - 0.25) / 0.15));
      reason = `相場(${marketRent}万)より${Math.round(gap * 100)}%安い（非常に怪しい）`;
    } else {
      rawScore = 100;
      reason = `相場(${marketRent}万)より${Math.round(gap * 100)}%安い（おとりの可能性大）`;
    }

    return {
      name: '相場との乖離',
      rawScore,
      weight: WEIGHTS.PRICE_GAP,
      weightedScore: Math.round(rawScore * WEIGHTS.PRICE_GAP),
      reason
    };
  }

  /**
   * 因子2: 住所の曖昧さスコア
   * @param {import('../types/index.js').PropertyData} property
   * @returns {import('../types/index.js').ScoreFactor}
   */
  function scoreAddressVague(property) {
    const detail = parserUtils.getAddressDetail(property.address);

    const scoreMap = {
      'full': 0,
      'town': 60,
      'ward': 80,
      'none': 100
    };

    const reasonMap = {
      'full': '番地まで記載あり',
      'town': '町名までしか記載なし',
      'ward': '区名までしか記載なし',
      'none': '住所の記載なし'
    };

    const rawScore = scoreMap[detail];

    return {
      name: '住所の曖昧さ',
      rawScore,
      weight: WEIGHTS.ADDRESS_VAGUE,
      weightedScore: Math.round(rawScore * WEIGHTS.ADDRESS_VAGUE),
      reason: reasonMap[detail]
    };
  }

  /**
   * 因子3: 物件名なしスコア
   * @param {import('../types/index.js').PropertyData} property
   * @returns {import('../types/index.js').ScoreFactor}
   */
  function scoreNoName(property) {
    const hasName = property.name && property.name.trim() !== '';
    const rawScore = hasName ? 0 : 100;

    return {
      name: '物件名なし',
      rawScore,
      weight: WEIGHTS.NO_NAME,
      weightedScore: Math.round(rawScore * WEIGHTS.NO_NAME),
      reason: hasName ? '物件名あり' : '物件名の記載なし'
    };
  }

  /**
   * 因子4: 写真不足スコア
   * @param {import('../types/index.js').PropertyData} property
   * @returns {import('../types/index.js').ScoreFactor}
   */
  function scoreFewPhotos(property) {
    const count = property.photoCount;
    let rawScore;
    let reason;

    if (count >= 5) {
      rawScore = 0;
      reason = `写真${count}枚（十分）`;
    } else if (count >= 3) {
      rawScore = 30;
      reason = `写真${count}枚（やや少ない）`;
    } else if (count >= 1) {
      rawScore = 70;
      reason = `写真${count}枚（少ない）`;
    } else {
      rawScore = 100;
      reason = '写真なし';
    }

    return {
      name: '写真不足',
      rawScore,
      weight: WEIGHTS.FEW_PHOTOS,
      weightedScore: Math.round(rawScore * WEIGHTS.FEW_PHOTOS),
      reason
    };
  }

  /**
   * 因子5: 極端に安い家賃スコア
   * @param {import('../types/index.js').PropertyData} property
   * @returns {import('../types/index.js').ScoreFactor}
   */
  function scoreTooCheap(property) {
    const region = parserUtils.extractRegion(property.address);
    const minRent = marketData.getMinRent(region);

    if (property.rent <= 0) {
      return {
        name: '家賃が極端に安い',
        rawScore: 0,
        weight: WEIGHTS.TOO_CHEAP,
        weightedScore: 0,
        reason: '家賃情報なし（判定スキップ）'
      };
    }

    const rawScore = property.rent < minRent ? 100 : 0;
    const regionLabel = region === 'tokyo' ? '東京' : region === 'osaka' ? '大阪' : '不明';

    return {
      name: '家賃が極端に安い',
      rawScore,
      weight: WEIGHTS.TOO_CHEAP,
      weightedScore: Math.round(rawScore * WEIGHTS.TOO_CHEAP),
      reason: rawScore > 0
        ? `${regionLabel}で${property.rent}万円は最低ライン(${minRent}万)以下`
        : `${property.rent}万円（最低ライン${minRent}万以上）`
    };
  }

  /**
   * 総合おとりスコアを算出
   * @param {import('../types/index.js').PropertyData} property
   * @returns {import('../types/index.js').OtoriScore}
   */
  function calculate(property) {
    const factors = [
      scorePriceGap(property),
      scoreAddressVague(property),
      scoreNoName(property),
      scoreFewPhotos(property),
      scoreTooCheap(property)
    ];

    const total = factors.reduce((sum, f) => sum + f.weightedScore, 0);
    const clampedTotal = Math.min(100, Math.max(0, total));

    return Object.freeze({
      total: clampedTotal,
      level: getLevel(clampedTotal),
      factors: Object.freeze(factors)
    });
  }

  return Object.freeze({ calculate });
})();
