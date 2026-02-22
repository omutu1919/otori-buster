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

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'reports.json');

// CORS設定（Chrome拡張からのリクエストを許可）
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '1mb' }));

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
  }
  if (!data.siteName || typeof data.siteName !== 'string') {
    errors.push('siteName is required');
  }

  // URLの簡易バリデーション
  if (data.url && !data.url.startsWith('http')) {
    errors.push('url must start with http');
  }

  // コメントの長さ制限
  if (data.comment && data.comment.length > 2000) {
    errors.push('comment must be 2000 characters or less');
  }

  return errors;
}

// === POST /api/otori-report === 通報を受信
app.post('/api/otori-report', (req, res) => {
  const data = req.body;

  const errors = validateReport(data);
  if (errors.length > 0) {
    return res.status(400).json({ ok: false, errors });
  }

  const report = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    url: data.url,
    propertyName: (data.propertyName || '').slice(0, 200),
    siteName: data.siteName,
    rent: Number(data.rent) || 0,
    address: (data.address || '').slice(0, 200),
    score: Number(data.score) || 0,
    level: data.level || '',
    reason: data.reason,
    reasonLabel: (data.reasonLabel || '').slice(0, 100),
    comment: (data.comment || '').slice(0, 2000),
    reportedAt: data.reportedAt || new Date().toISOString(),
    ip: req.ip,
    userAgent: req.headers['user-agent'] || '',
    receivedAt: new Date().toISOString()
  };

  const reports = loadReports();
  reports.push(report);
  saveReports(reports);

  console.log(`[Report] ${report.id} - ${report.siteName} - ${report.reason}`);

  res.json({ ok: true, id: report.id });
});

// === GET /api/otori-report === 通報一覧（管理用）
app.get('/api/otori-report', (req, res) => {
  const reports = loadReports();
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;

  const sorted = reports.slice().reverse();
  const page = sorted.slice(offset, offset + limit);

  res.json({
    ok: true,
    total: reports.length,
    offset,
    limit,
    reports: page
  });
});

// === GET /api/otori-report/stats === 統計情報
app.get('/api/otori-report/stats', (req, res) => {
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
