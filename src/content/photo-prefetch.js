/**
 * おとり物件バスター - 詳細ページ写真枚数プリフェッチ
 * 一覧ページから各物件の詳細ページを非同期取得し写真枚数を返す
 * サーバー負荷を考慮してリクエスト間隔を設ける
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.photoPrefetch = (() => {
  'use strict';

  const FETCH_DELAY_MS = 800;
  const cache = new Map();

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * HTML文字列から写真枚数を抽出
   * DOMParserで安全にパース（スクリプト実行なし）
   */
  function countPhotosFromHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const photos = doc.querySelectorAll(
      '[class*="gallery"] img, [class*="photo"] img, [class*="slider"] img'
    );
    return photos.length;
  }

  /**
   * 単一URLの写真枚数を取得（キャッシュ付き）
   */
  async function fetchPhotoCount(url) {
    if (cache.has(url)) return cache.get(url);

    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) return -1;

      const html = await res.text();
      const count = countPhotosFromHTML(html);
      cache.set(url, count);
      return count;
    } catch (err) {
      console.warn('[おとり物件バスター] プリフェッチエラー:', err.message);
      return -1;
    }
  }

  /**
   * 複数アイテムを順次プリフェッチ
   * @param {Array<{element: Element, url: string}>} items
   * @param {function({element: Element, photoCount: number}): void} onResult
   */
  async function prefetchAll(items, onResult) {
    for (const item of items) {
      if (!item.url) continue;

      const photoCount = await fetchPhotoCount(item.url);
      if (photoCount >= 0) {
        onResult({ element: item.element, photoCount });
      }

      await sleep(FETCH_DELAY_MS);
    }
  }

  return Object.freeze({ prefetchAll });
})();
