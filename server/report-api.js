/**
 * おとり物件バスター - 通報API サーバー
 *
 * 使い方:
 *   npm install express cors
 *   node server/report-api.js
 *
 * エンドポイント:
 *   POST /api/otori-report    通報を受信・保存
 *   GET  /api/otori-report    通報一覧を取得（管理用）
 *   GET  /api/otori-report/stats  統計情報を取得
 *
 * 本番では:
 *   - SQLite/PostgreSQL等のDBに切り替えることを推奨
 *   - レート制限を追加すること
 *   - 認証を追加すること（管理APIのみ）
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'reports.json');
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN || '';

const VALID_REASONS = ['not_exist', 'already_taken', 'too_cheap', 'vague_address', 'fake_photo', 'bait_switch', 'other'];
const VALID_SITES = ['suumo', 'homes', 'athome', 'chintai', 'yahoo'];

function requireAdmin(req, res, next) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '');
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip + 'otori-buster-2026').digest('hex').slice(0, 16);
}

let writeLock = Promise.resolve();
function withLock(fn) {
  const prev = writeLock;
  let resolve;
  writeLock = new Promise(r => { resolve = r; });
  return prev.then(fn).finally(resolve);
}

app.set('trust proxy', 1);

// CORS設定（Chrome拡張からのリクエストを許可）
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^chrome-extension:\/\//.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));

// === スパム対策: レート制限 ===
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分
const RATE_LIMIT_MAX_REPORTS = 3;        // 1分あたり最大3件

// 同一URL重複制限
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24時間

function checkRateLimit(ip) {
  const now = Date.now();
  const hashedKey = `rate:${hashIp(ip)}`;
  const entry = rateLimitMap.get(hashedKey);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(hashedKey, { windowStart: now, count: 1 });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REPORTS) {
    return false;
  }

  rateLimitMap.set(hashedKey, { ...entry, count: entry.count + 1 });
  return true;
}

function checkDuplicate(url, ip) {
  const reports = loadReports();
  const cutoff = Date.now() - DUPLICATE_WINDOW_MS;
  const hashed = hashIp(ip);

  return !reports.some(r =>
    r.url === url &&
    r.ip === hashed &&
    new Date(r.receivedAt).getTime() > cutoff
  );
}

// 古いレート制限エントリを定期クリーン
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, key) => {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(key);
    }
  });
}, 5 * 60 * 1000);

/**
 * 通報データをファイルから読み込み
 */
function loadReports() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load reports:', err.message);
  }
  return [];
}

/**
 * 通報データをファイルに保存
 */
function saveReports(reports) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2), 'utf-8');
}

/**
 * 入力バリデーション
 */
function validateReport(data) {
  const errors = [];

  if (!data.url || typeof data.url !== 'string') {
    errors.push('url is required');
  }
  if (!data.reason || typeof data.reason !== 'string') {
    errors.push('reason is required');
  } else if (!VALID_REASONS.includes(data.reason)) {
    errors.push('reason must be one of: ' + VALID_REASONS.join(', '));
  }
  if (!data.siteName || typeof data.siteName !== 'string') {
    errors.push('siteName is required');
  } else if (!VALID_SITES.includes(data.siteName)) {
    errors.push('siteName must be one of: ' + VALID_SITES.join(', '));
  }

  // URLバリデーション（ドメインホワイトリスト）
  if (data.url) {
    try {
      const parsed = new URL(data.url);
      const validHosts = ['suumo.jp', 'homes.co.jp', 'athome.co.jp', 'chintai.net', 'realestate.yahoo.co.jp'];
      if (!['http:', 'https:'].includes(parsed.protocol) || !validHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
        errors.push('url must be from a supported real estate site');
      }
    } catch {
      errors.push('url is not a valid URL');
    }
  }

  // コメントの長さ制限
  if (data.comment && data.comment.length > 2000) {
    errors.push('comment must be 2000 characters or less');
  }

  return errors;
}

// === POST /api/otori-report === 通報を受信
app.post('/api/otori-report', async (req, res) => {
  const data = req.body;
  const clientIp = req.ip || req.headers['x-real-ip'] || '';

  // レート制限チェック
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ ok: false, error: '通報の送信が多すぎます。1分後にお試しください。' });
  }

  const errors = validateReport(data);
  if (errors.length > 0) {
    return res.status(400).json({ ok: false, errors });
  }

  // 同一URL+同一IPの24時間以内の重複チェック
  if (!checkDuplicate(data.url, clientIp)) {
    return res.status(409).json({ ok: false, error: 'この物件は24時間以内に通報済みです。' });
  }

  const report = {
    id: crypto.randomUUID(),
    // 物件データ（ページから取得できた全情報）
    url: data.url,
    propertyName: (data.propertyName || '').slice(0, 200),
    siteName: data.siteName,
    rent: Number(data.rent) || 0,
    managementFee: Number(data.managementFee) || 0,
    address: (data.address || '').slice(0, 200),
    layout: (data.layout || '').slice(0, 50),
    area: (data.area || '').slice(0, 50),
    age: Number(data.age) ?? -1,
    station: (data.station || '').slice(0, 200),
    walkMinutes: Number(data.walkMinutes) ?? -1,
    photoCount: Number(data.photoCount) ?? -1,
    company: (data.company || '').slice(0, 100),
    // スコア情報
    score: Number(data.score) || 0,
    level: data.level || '',
    factors: Array.isArray(data.factors)
      ? data.factors.slice(0, 10).map(f => ({
          name: String(f.name || '').slice(0, 50),
          rawScore: Math.min(100, Math.max(0, Number(f.rawScore) || 0)),
          weight: Math.min(1, Math.max(0, Number(f.weight) || 0)),
          reason: String(f.reason || '').slice(0, 200)
        }))
      : [],
    // ユーザー入力
    reason: data.reason,
    reasonLabel: (data.reasonLabel || '').slice(0, 100),
    comment: (data.comment || '').slice(0, 2000),
    // メタデータ
    reportedAt: data.reportedAt || new Date().toISOString(),
    pageUrl: (data.pageUrl || '').slice(0, 500),
    ip: hashIp(clientIp),
    userAgent: req.headers['user-agent'] || '',
    receivedAt: new Date().toISOString()
  };

  await withLock(() => {
    const reports = loadReports();
    saveReports([...reports, report]);
  });

  res.json({ ok: true, id: report.id });
});

// === GET /api/otori-report === 通報一覧（管理用）
app.get('/api/otori-report', requireAdmin, (req, res) => {
  const reports = loadReports();
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;

  const sorted = reports.slice().reverse();
  const page = sorted.slice(offset, offset + limit).map(({ ip, userAgent, ...safe }) => safe);

  res.json({
    ok: true,
    total: reports.length,
    offset,
    limit,
    reports: page
  });
});

// === POST /api/otori-report/counts === URL別通報件数（拡張機能スコアリング用）
app.post('/api/otori-report/counts', (req, res) => {
  const urls = req.body.urls;
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ ok: false, error: 'urls array is required' });
  }

  // 最大100件に制限
  const targetUrls = urls.slice(0, 100);
  const reports = loadReports();

  const counts = {};
  targetUrls.forEach(url => { counts[url] = 0; });

  reports.forEach(r => {
    if (counts[r.url] !== undefined) {
      counts[r.url]++;
    }
  });

  res.json({ ok: true, counts });
});

// === GET /api/otori-report/stats === 統計情報
app.get('/api/otori-report/stats', requireAdmin, (req, res) => {
  const reports = loadReports();

  const bySite = {};
  const byReason = {};

  reports.forEach(r => {
    bySite[r.siteName] = (bySite[r.siteName] || 0) + 1;
    byReason[r.reason] = (byReason[r.reason] || 0) + 1;
  });

  res.json({
    ok: true,
    total: reports.length,
    bySite,
    byReason
  });
});

app.listen(PORT, () => {
  console.log(`Otori Report API running on port ${PORT}`);
  console.log(`POST http://localhost:${PORT}/api/otori-report`);
});
