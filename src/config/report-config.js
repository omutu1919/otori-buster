/**
 * おとり物件バスター - 通報機能設定
 */

window.__otoriBuster = window.__otoriBuster || {};

window.__otoriBuster.REPORT_CONFIG = Object.freeze({
  // 通報APIエンドポイント（自前サーバーのURLに変更すること）
  API_URL: 'https://ai-kakudai.com/api/otori-report',

  // 通報理由の選択肢
  reasons: Object.freeze([
    { value: 'not_exist', label: '内見に行ったら物件が存在しなかった' },
    { value: 'already_taken', label: '問い合わせたら「もう決まった」と言われた' },
    { value: 'too_cheap', label: '条件が良すぎて不自然' },
    { value: 'vague_address', label: '住所が曖昧・不正確だった' },
    { value: 'fake_photo', label: '写真が偽物・別物件の使い回しだった' },
    { value: 'bait_switch', label: '別の高額物件を勧められた' },
    { value: 'other', label: 'その他' }
  ]),

  // 公式通報・相談リンク
  officialLinks: Object.freeze([
    {
      label: '国土交通省 免許行政庁一覧',
      url: 'https://www.mlit.go.jp/totikensangyo/const/sosei_const_tk3_000031.html',
      description: 'おとり広告を行政処分できる窓口',
      icon: '\u{1F3DB}'
    },
    {
      label: '不動産公正取引協議会',
      url: 'https://www.sfkoutori.or.jp/',
      description: '不当表示・おとり広告の違反申告',
      icon: '\u{2696}'
    },
    {
      label: '消費者ホットライン (188)',
      url: 'tel:188',
      description: '消費者トラブル全般の相談窓口',
      icon: '\u{1F4DE}'
    }
  ]),

  // サイト別問い合わせリンク
  siteLinks: Object.freeze({
    suumo: { label: 'SUUMO', url: 'https://suumo.jp/edit/toi/' },
    homes: { label: "HOME'S", url: 'https://www.homes.co.jp/info/contact/' },
    athome: { label: 'at home', url: 'https://www.athome.co.jp/contents/contact/' },
    chintai: { label: 'CHINTAI', url: 'https://www.chintai.net/info/contact/' },
    yahoo: { label: 'Yahoo!不動産', url: 'https://support.yahoo-net.jp/' }
  })
});
