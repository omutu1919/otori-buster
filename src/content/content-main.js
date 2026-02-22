/**
 * おとり物件バスター - コンテンツスクリプト エントリポイント
 * パーサー検出 → スコアリング → オーバーレイ表示
 */

;(() => {
  'use strict';

  const ns = window.__otoriBuster;
  if (!ns) {
    console.error('[おとり物件バスター] 名前空間が初期化されていません');
    return;
  }

  const PARSERS = [
    ns.suumoParser,
    ns.homesParser,
    ns.athomeParser,
    ns.chintaiParser,
    ns.yahooParser
  ].filter(Boolean);

  function detectParser() {
    for (const parser of PARSERS) {
      if (parser.canParse()) return parser;
    }
    return null;
  }

  /**
   * メイン処理: 物件解析 → スコア算出 → オーバーレイ表示
   * 既にバッジがある要素はスキップする（差分更新）
   */
  function run() {
    const parser = detectParser();
    if (!parser) return;

    const properties = parser.parse();
    if (properties.length === 0) return;

    console.log(`[おとり物件バスター] ${parser.name}: ${properties.length}件検出`);

    let newCount = 0;
    const allScores = new Map();

    properties.forEach(property => {
      try {
        if (!property.element) return;

        const score = ns.scoringEngine.calculate(property);

        // 同じ要素には最高スコアを使う（1建物に複数部屋の場合）
        const existing = allScores.get(property.element);
        if (!existing || score.total > existing.total) {
          allScores.set(property.element, score);
        }
      } catch (err) {
        console.error('[おとり物件バスター] スコアリングエラー:', err);
      }
    });

    // 新しい要素にだけバッジ追加（既存はattach内でスキップ）
    allScores.forEach((score, element) => {
      if (!element.querySelector('.otori-buster-host')) {
        ns.overlay.attach(element, score);
        newCount++;
      }
    });

    if (newCount > 0) {
      console.log(`[おとり物件バスター] ${newCount}件にバッジ追加`);
    }

    // 結果をstorage.localに保存（popup用）
    saveSummary(parser.name, allScores);
  }

  /**
   * 結果をストレージに保存
   */
  function saveSummary(siteName, elementScores) {
    const summary = {
      site: siteName,
      total: elementScores.size,
      danger: 0,
      warning: 0,
      caution: 0,
      safe: 0
    };

    elementScores.forEach(score => {
      summary[score.level]++;
    });

    try {
      chrome.storage.local.set({ scanResult: summary });
      chrome.runtime.sendMessage({ type: 'SCAN_RESULT', data: summary }).catch(() => {});
    } catch (err) {
      // 無視
    }
  }

  /**
   * 初期化
   */
  function init() {
    chrome.storage.local.get({ enabled: true }, (settings) => {
      if (!settings.enabled) return;

      // 初回実行
      run();

      // 新しい物件カードの追加を定期チェック（無限スクロール対応）
      // MutationObserverは自分のDOM変更で無限ループするためsetIntervalを使用
      setInterval(() => {
        run();
      }, 3000);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
