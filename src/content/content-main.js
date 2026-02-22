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

  /**
   * 適用可能なパーサーを検出
   * @returns {import('../types/index.js').SiteParser|null}
   */
  function detectParser() {
    for (const parser of PARSERS) {
      if (parser.canParse()) return parser;
    }
    return null;
  }

  /**
   * メイン処理: 物件解析 → スコア算出 → オーバーレイ表示
   */
  function run() {
    const parser = detectParser();
    if (!parser) return;

    console.log(`[おとり物件バスター] ${parser.name} パーサーで解析開始`);

    const properties = parser.parse();
    if (properties.length === 0) {
      console.log('[おとり物件バスター] 物件が見つかりませんでした');
      return;
    }

    console.log(`[おとり物件バスター] ${properties.length}件の物件を検出`);

    // 既存のオーバーレイを削除（再実行対策）
    ns.overlay.removeAll();

    let scored = 0;
    const elementScores = new Map();

    properties.forEach(property => {
      try {
        if (!property.element) return;

        // 同じ要素に対して最もスコアの高い結果を使う（SUUMO対応: 1建物に複数部屋）
        const score = ns.scoringEngine.calculate(property);

        const existing = elementScores.get(property.element);
        if (!existing || score.total > existing.total) {
          elementScores.set(property.element, score);
        }

        scored++;
      } catch (err) {
        console.error('[おとり物件バスター] スコアリングエラー:', err);
      }
    });

    // オーバーレイ表示
    elementScores.forEach((score, element) => {
      ns.overlay.attach(element, score);
    });

    console.log(`[おとり物件バスター] ${scored}件をスコアリング、${elementScores.size}件にバッジ表示`);

    // バックグラウンドに結果を送信
    notifyBackground(parser.name, elementScores);
  }

  /**
   * バックグラウンドスクリプトに結果通知
   * @param {string} siteName
   * @param {Map<HTMLElement, import('../types/index.js').OtoriScore>} elementScores
   */
  function notifyBackground(siteName, elementScores) {
    try {
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

      chrome.runtime.sendMessage({
        type: 'SCAN_RESULT',
        data: summary
      });
    } catch (err) {
      // バックグラウンドが応答しない場合は無視
    }
  }

  /**
   * 設定を確認して実行
   */
  function init() {
    chrome.storage.local.get(ns.DEFAULT_SETTINGS, (settings) => {
      if (!settings.enabled) {
        console.log('[おとり物件バスター] 無効化されています');
        return;
      }

      // 初回実行
      run();

      // DOMの動的変更を監視（無限スクロール対応）
      const observer = new MutationObserver(debounce(() => {
        run();
      }, 1000));

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }

  /**
   * デバウンス
   * @param {Function} fn
   * @param {number} delay
   * @returns {Function}
   */
  function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // DOMが準備完了していれば即実行、そうでなければ待機
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
