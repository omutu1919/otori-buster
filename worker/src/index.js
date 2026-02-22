/**
 * おとり物件バスター - Cloudflare Workers プロキシ
 *
 * Chrome拡張 → このWorker → ai-kakudai.com/api/otori-report
 * バックエンドURLを拡張コードから隠蔽する
 */

const ALLOWED_PATHS = [
  '/api/otori-report',
  '/api/otori-report/counts',
  '/api/otori-report/stats'
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // パス制限（許可されたエンドポイントのみ転送）
    const matched = ALLOWED_PATHS.find(p => path === p || path.startsWith(p + '/'));
    if (!matched) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Not Found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // メソッド制限
    if (!['GET', 'POST'].includes(request.method)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
        { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // バックエンドにプロキシ
    const backendUrl = `${env.BACKEND_URL}${path}${url.search}`;

    const proxyRequest = new Request(backendUrl, {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'X-Real-IP': request.headers.get('CF-Connecting-IP') || '',
        'User-Agent': request.headers.get('User-Agent') || ''
      },
      body: request.method === 'POST' ? request.body : undefined
    });

    try {
      const response = await fetch(proxyRequest);
      const body = await response.text();

      return new Response(body, {
        status: response.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': response.headers.get('Content-Type') || 'application/json'
        }
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Backend unavailable' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }
  }
};
