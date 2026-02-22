/**
 * おとり物件バスター - スコアリングエンジン
 * 5因子による総合おとりスコア算出
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.scoringEngine = (() => {
  'use strict';

  const { parserUtils, marketData } = window.__otoriBuster;

  const WEIGHTS = Object.freeze({
    PRICE_GAP: 0.30,
    ADDRESS_VAGUE: 0.15,
    NO_NAME: 0.10,
    FEW_PHOTOS: 0.15,
    TOO_CHEAP: 0.15,
    REPORT_COUNT: 0.15
  });

  function getLevel(score) {
    if (score < 20) return 'safe';
    if (score < 45) return 'caution';
    if (score < 70) return 'warning';
    return 'danger';
  }

  /**
   * 相場を物件条件で補正
   * 築年数が古い・駅から遠い物件は相場より安くて当然なので割り引く
   */
  function adjustMarketRent(baseRent, age, walkMinutes) {
    let discount = 0;

    // 築年数: 年1%減、最大30%引き（築30年超）
    if (age > 0) {
      discount += Math.min(age * 0.01, 0.30);
    }

    // 駅距離: 徒歩5分超から1分あたり2%減、最大20%引き
    if (walkMinutes > 5) {
      discount += Math.min((walkMinutes - 5) * 0.02, 0.20);
    }

    return Math.round(baseRent * (1 - discount) * 100) / 100;
  }

  /** 因子1: 相場との乖離（築年数・駅距離で補正済み） */
  function scorePriceGap(property) {
    const region = parserUtils.extractRegion(property.address);
    const ward = parserUtils.extractWard(property.address);
    const layout = parserUtils.normalizeLayout(property.layout);
    const baseMarketRent = marketData.getMarketRent(region, ward, layout);

    if (!baseMarketRent || property.rent <= 0) {
      return { name: '相場との乖離', rawScore: 0, weight: WEIGHTS.PRICE_GAP, weightedScore: 0, reason: '相場データなし（判定スキップ）' };
    }

    const age = property.age > 0 ? property.age : 0;
    const walk = property.walkMinutes > 0 ? property.walkMinutes : 0;
    const marketRent = adjustMarketRent(baseMarketRent, age, walk);

    const gap = (marketRent - property.rent) / marketRent;
    let rawScore;
    let reason;

    const adjustNote = marketRent < baseMarketRent
      ? `（築${age}年/徒歩${walk}分で${baseMarketRent}万→${marketRent}万に補正）`
      : '';

    if (gap <= 0.05) {
      rawScore = 0;
      reason = `補正相場(${marketRent}万)との差: ${Math.round(gap * 100)}%以内${adjustNote}`;
    } else if (gap <= 0.15) {
      rawScore = Math.round(30 * ((gap - 0.05) / 0.10));
      reason = `補正相場(${marketRent}万)より${Math.round(gap * 100)}%安い${adjustNote}`;
    } else if (gap <= 0.25) {
      rawScore = 30 + Math.round(30 * ((gap - 0.15) / 0.10));
      reason = `補正相場(${marketRent}万)より${Math.round(gap * 100)}%安い（要注意）${adjustNote}`;
    } else if (gap <= 0.40) {
      rawScore = 60 + Math.round(40 * ((gap - 0.25) / 0.15));
      reason = `補正相場(${marketRent}万)より${Math.round(gap * 100)}%安い（非常に怪しい）${adjustNote}`;
    } else {
      rawScore = 100;
      reason = `補正相場(${marketRent}万)より${Math.round(gap * 100)}%安い（おとりの可能性大）${adjustNote}`;
    }

    return { name: '相場との乖離', rawScore, weight: WEIGHTS.PRICE_GAP, weightedScore: Math.round(rawScore * WEIGHTS.PRICE_GAP), reason };
  }

  /** 因子2: 住所の曖昧さ */
  function scoreAddressVague(property) {
    const detail = parserUtils.getAddressDetail(property.address);
    const scoreMap = { 'full': 0, 'town': 40, 'ward': 80, 'none': 100 };
    const reasonMap = {
      'full': '番地・丁目まで記載あり',
      'town': '町名まで記載（番地なし）',
      'ward': '区名までしか記載なし',
      'none': '住所の記載なし'
    };
    const rawScore = scoreMap[detail];
    return { name: '住所の曖昧さ', rawScore, weight: WEIGHTS.ADDRESS_VAGUE, weightedScore: Math.round(rawScore * WEIGHTS.ADDRESS_VAGUE), reason: reasonMap[detail] };
  }

  /** 因子3: 物件名なし */
  function scoreNoName(property) {
    const hasName = property.name && property.name.trim() !== '';
    const rawScore = hasName ? 0 : 100;
    return { name: '物件名なし', rawScore, weight: WEIGHTS.NO_NAME, weightedScore: Math.round(rawScore * WEIGHTS.NO_NAME), reason: hasName ? '物件名あり' : '物件名の記載なし' };
  }

  /** 因子4: 写真不足 */
  function scoreFewPhotos(property) {
    const count = property.photoCount;

    // photoCount が -1 = 一覧ページで枚数不明 → スキップ
    if (count < 0) {
      return { name: '写真不足', rawScore: 0, weight: WEIGHTS.FEW_PHOTOS, weightedScore: 0, reason: '一覧ページのため判定スキップ' };
    }

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

    return { name: '写真不足', rawScore, weight: WEIGHTS.FEW_PHOTOS, weightedScore: Math.round(rawScore * WEIGHTS.FEW_PHOTOS), reason };
  }

  /** 因子5: 極端に安い家賃 */
  function scoreTooCheap(property) {
    const region = parserUtils.extractRegion(property.address);
    const minRent = marketData.getMinRent(region);

    if (property.rent <= 0) {
      return { name: '家賃が極端に安い', rawScore: 0, weight: WEIGHTS.TOO_CHEAP, weightedScore: 0, reason: '家賃情報なし（判定スキップ）' };
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

  /** 因子6: 通報件数（他ユーザーからの通報） */
  function scoreReportCount(property) {
    const count = property.reportCount || 0;

    if (count <= 0) {
      return { name: '通報件数', rawScore: 0, weight: WEIGHTS.REPORT_COUNT, weightedScore: 0, reason: '通報なし' };
    }

    let rawScore;
    let reason;
    if (count >= 3) {
      rawScore = 100;
      reason = `${count}件の通報あり（複数ユーザーが報告）`;
    } else if (count >= 2) {
      rawScore = 70;
      reason = `${count}件の通報あり`;
    } else {
      rawScore = 40;
      reason = '1件の通報あり';
    }

    return { name: '通報件数', rawScore, weight: WEIGHTS.REPORT_COUNT, weightedScore: Math.round(rawScore * WEIGHTS.REPORT_COUNT), reason };
  }

  function calculate(property) {
    const factors = [
      scorePriceGap(property),
      scoreAddressVague(property),
      scoreNoName(property),
      scoreFewPhotos(property),
      scoreTooCheap(property),
      scoreReportCount(property)
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
