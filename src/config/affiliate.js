/**
 * おとり物件バスター - アフィリエイト設定
 * タグIDの変更はここだけでOK
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.AFFILIATE = Object.freeze({
  AMAZON_TAG: 'vtubertrends-22',
  links: [
    {
      title: 'Amazon タイムセール',
      sub: '本日のお得な商品をチェック',
      url: 'https://www.amazon.co.jp/gp/goldbox',
      color: '#FF9900'
    },
    {
      title: 'Amazon 売れ筋ランキング',
      sub: '今みんなが買っているものは？',
      url: 'https://www.amazon.co.jp/gp/bestsellers',
      color: '#146EB4'
    }
  ],
  buildUrl(baseUrl) {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}tag=${this.AMAZON_TAG}`;
  }
});
