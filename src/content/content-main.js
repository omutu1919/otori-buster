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

  const CHECK_INTERVAL_MS = 3000;

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
  let intervalId = null;

  /**
   * 拡張コンテキストが有効かチェック
   * 拡張が再読み込みされると無効になる
   */
  function isContextValid() {
    try {
      return !!chrome.runtime && !!chrome.runtime.id;
    } catch (_e) {
      return false;
    }
  }

  /**
   * コンテキスト無効時にすべての処理を停止
   */
  function shutdown() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    pendingPrefetch.length = 0;
    ns.logger.log('コンテキスト無効のため停止');
  }

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
    if (!isContextValid()) { shutdown(); return; }

    const parser = detectParser();
    if (!parser) return;

    const properties = parser.parse();
    if (properties.length === 0) return;

    ns.logger.log(`${parser.name}: ${properties.length}件検出`);

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
        ns.logger.error('スコアリングエラー:', err);
      }
    });

    // 新しい要素にだけバッジ追加（既存はattach内でスキップ）
    allScores.forEach((score, element) => {
      if (!element.querySelector('.otori-buster-host')) {
        const property = propertyCache.get(element);
        ns.overlay.attach(element, score, property);
        newCount++;
      }
      latestScores.set(element, score);
    });

    if (newCount > 0) {
      ns.logger.log(`${newCount}件にバッジ追加`);
    }

    // 結果をstorage.localに保存（popup用）
    currentSiteName = parser.name;
    saveSummary(currentSiteName, latestScores);

    // 写真枚数プリフェッチ開始（一覧ページのみ）
    queuePrefetch(parser, allScores);

    // 通報件数を取得してスコアに反映
    fetchReportCounts(parser, allScores);
  }

  /**
   * サーバーから通報件数を取得し、スコアを再計算
   */
  let reportCountsFetched = new Set();
  function fetchReportCounts(parser, allScores) {
    const urlToElement = new Map();

    allScores.forEach((_score, element) => {
      if (reportCountsFetched.has(element)) return;
      const url = typeof parser.getDetailUrl === 'function' ? parser.getDetailUrl(element) : '';
      if (url) {
        urlToElement.set(url, element);
        reportCountsFetched.add(element);
      }
    });

    if (urlToElement.size === 0) return;

    const urls = [...urlToElement.keys()];
    if (!isContextValid()) { shutdown(); return; }
    try {
    chrome.runtime.sendMessage({ type: 'FETCH_REPORT_COUNTS', urls }, (response) => {
      if (chrome.runtime.lastError || !response || !response.ok) return;
      if (!isContextValid()) return;

      const counts = response.counts || {};
      let updated = 0;

      urlToElement.forEach((element, url) => {
        const count = counts[url] || 0;
        if (count <= 0) return;

        const property = propertyCache.get(element);
        if (!property) return;

        const updatedProperty = { ...property, reportCount: count };
        const newScore = ns.scoringEngine.calculate(updatedProperty);

        propertyCache.set(element, updatedProperty);
        latestScores.set(element, newScore);
        ns.overlay.update(element, newScore, updatedProperty);
        updated++;
      });

      if (updated > 0) {
        saveSummary(currentSiteName, latestScores);
        ns.logger.log(`${updated}件に通報件数を反映`);
      }
    });
    } catch (_e) {
      shutdown();
    }
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

    ns.logger.log(`${pendingPrefetch.length}件の写真枚数をプリフェッチ開始`);
    runPrefetch();
  }

  /**
   * キューを順次処理（800ms間隔でサーバー負荷軽減）
   * 処理中に新しいアイテムが追加されても安全に処理
   */
  async function runPrefetch() {
    prefetchRunning = true;

    while (pendingPrefetch.length > 0) {
      if (!isContextValid()) { shutdown(); prefetchRunning = false; return; }
      const items = pendingPrefetch.splice(0);
      await ns.photoPrefetch.prefetchAll(items, onPrefetchResult);
    }

    // 全件完了後にstorage更新（ポップアップの集計を正確に）
    if (!isContextValid()) { prefetchRunning = false; return; }
    saveSummary(currentSiteName, latestScores);
    ns.logger.log('プリフェッチ完了、storage更新');

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

    ns.overlay.update(element, newScore, updatedProperty);
    ns.logger.log(`プリフェッチ更新: 写真${photoCount}枚 → スコア${newScore.total}(${newScore.level})`);
  }

  /**
   * 結果をストレージに保存
   */
  function saveSummary(siteName, elementScores) {
    if (!isContextValid()) { shutdown(); return; }

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
        if (chrome.runtime.lastError) return;
      });
      chrome.runtime.sendMessage({ type: 'SCAN_RESULT', data: summary }).catch(() => {});
    } catch (_e) {
      shutdown();
    }
  }

  /**
   * 初期化
   */
  function init() {
    try {
      chrome.storage.local.get({ enabled: true }, (settings) => {
        if (chrome.runtime.lastError || !settings.enabled) return;

        run();

        intervalId = setInterval(() => {
          run();
        }, CHECK_INTERVAL_MS);
      });
    } catch (_e) {
      shutdown();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
