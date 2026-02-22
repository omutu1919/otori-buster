/**
 * おとり物件バスター - アフィリエイト設定
 * タグIDの変更はここだけでOK
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.AFFILIATE = Object.freeze({
  AMAZON_TAG: 'vtubertrends-22',
  links: [
    {
      text: '賃貸トラブル対策の本を探す',
      keyword: '賃貸 トラブル 対策'
    },
    {
      text: '引越し必需品をチェック',
      keyword: '引越し 必需品'
    }
  ],
  buildUrl(keyword) {
    return `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${this.AMAZON_TAG}`;
  }
});
