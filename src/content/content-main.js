/**
 * おとり物件バスター - コンテンツスクリプト エントリポイント
 * パーサー検出 → スコアリング → オーバーレイ表示 → 写真プリフェッチ
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

  // プリフェッチ後の再スコアリング用キャッシュ
  const propertyCache = new WeakMap();
  const prefetchQueued = new WeakSet();
  const pendingPrefetch = [];
  let prefetchRunning = false;
  let currentSiteName = '';
  const latestScores = new Map();

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
          propertyCache.set(property.element, property);
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
      latestScores.set(element, score);
    });

    if (newCount > 0) {
      console.log(`[おとり物件バスター] ${newCount}件にバッジ追加`);
    }

    // 結果をstorage.localに保存（popup用）
    currentSiteName = parser.name;
    saveSummary(currentSiteName, latestScores);

    // 写真枚数プリフェッチ開始（一覧ページのみ）
    queuePrefetch(parser, allScores);
  }

  /**
   * プリフェッチ対象をキューに追加し、未実行なら処理開始
   */
  function queuePrefetch(parser, allScores) {
    if (!ns.photoPrefetch || typeof parser.getDetailUrl !== 'function') return;

    allScores.forEach((_score, element) => {
      if (prefetchQueued.has(element)) return;

      const url = parser.getDetailUrl(element);
      if (url) {
        pendingPrefetch.push({ element, url });
        prefetchQueued.add(element);
      }
    });

    if (prefetchRunning || pendingPrefetch.length === 0) return;

    console.log(`[おとり物件バスター] ${pendingPrefetch.length}件の写真枚数をプリフェッチ開始`);
    runPrefetch();
  }

  /**
   * キューを順次処理（800ms間隔でサーバー負荷軽減）
   * 処理中に新しいアイテムが追加されても安全に処理
   */
  async function runPrefetch() {
    prefetchRunning = true;

    while (pendingPrefetch.length > 0) {
      const items = pendingPrefetch.splice(0);
      await ns.photoPrefetch.prefetchAll(items, onPrefetchResult);
    }

    // 全件完了後にstorage更新（ポップアップの集計を正確に）
    saveSummary(currentSiteName, latestScores);
    console.log('[おとり物件バスター] プリフェッチ完了、storage更新');

    prefetchRunning = false;
  }

  /**
   * プリフェッチ結果コールバック: スコア再計算 → バッジ更新
   */
  function onPrefetchResult({ element, photoCount }) {
    const property = propertyCache.get(element);
    if (!property) return;

    // immutableに更新（元のpropertyは変更しない）
    const updatedProperty = { ...property, photoCount };
    const newScore = ns.scoringEngine.calculate(updatedProperty);

    propertyCache.set(element, updatedProperty);
    latestScores.set(element, newScore);

    ns.overlay.update(element, newScore);
    console.log(`[おとり物件バスター] プリフェッチ更新: 写真${photoCount}枚 → スコア${newScore.total}(${newScore.level})`);
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
      chrome.storage.local.set({ scanResult: summary }, () => {
        if (chrome.runtime.lastError) {
          console.error('[おとり物件バスター] storage保存エラー:', chrome.runtime.lastError);
        }
      });
      chrome.runtime.sendMessage({ type: 'SCAN_RESULT', data: summary }).catch(() => {});
    } catch (err) {
      console.error('[おとり物件バスター] saveSummary例外:', err);
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
