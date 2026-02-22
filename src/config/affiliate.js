/**
 * おとり物件バスター - アフィリエイト設定
 * タグIDの変更はここだけでOK
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.AFFILIATE = Object.freeze({
  AMAZON_TAG: 'vtubertrends-22',
  links: [
    {
      title: '引越し準備はお済みですか？',
      sub: '新生活に必要なものをまとめてチェック',
      url: 'https://www.amazon.co.jp/b?node=2221516051',
      color: '#FF9900',
      icon: '\u{1F4E6}'
    },
    {
      title: 'Amazon タイムセール',
      sub: '本日のお得な商品をチェック',
      url: 'https://www.amazon.co.jp/gp/goldbox',
      color: '#E8530E',
      icon: '\u{26A1}'
    }
  ],
  buildUrl(baseUrl) {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}tag=${this.AMAZON_TAG}`;
  }
});
