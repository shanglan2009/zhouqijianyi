/**
 * 腾讯云 EdgeOne Functions — API 代理函数
 *
 * 此 Edge Function 部署在腾讯云 EdgeOne 上，为前端提供数据代理：
 * 1. 转发股票查询请求到公开行情 API
 * 2. 转换数据格式供前端使用
 * 3. 添加 CORS 头
 *
 * 部署方式：在 EdgeOne 控制台 → Edge Functions → 新建函数，粘贴本代码
 * 关联路由：/api/stock/* → 本函数
 */

// 支持的API端点配置
const API_CONFIG = {
  // 腾讯行情API (公开，无需key)
  tencent: {
    base: 'https://qt.gtimg.cn',
    format: (codes) => `/q=${codes.join(',')}`,
    // 返回格式: v_sh600036="1~名称~代码~价格~...~..."
  },
  // 东方财富API
  eastmoney: {
    base: 'https://push2.eastmoney.com/api/qt/clist/get',
    format: (params) => {
      const q = new URLSearchParams({
        pn: params.page || '1',
        pz: params.size || '50',
        po: '1',
        np: '1',
        ut: 'bd1d9ddb04089700cf9c27f6f7426281',
        fltt: '2',
        invt: '2',
        fid: 'f3',
        fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048',
        fields: 'f12,f14,f2,f3,f4,f5,f6,f7,f15,f16,f17,f18,f20,f21,f23,f24,f25,f57'
      });
      return `/api/qt/clist/get?${q}`;
    }
  }
};

/**
 * 处理请求入口
 * EdgeOne Function 标准入口
 */
async function handleEvent(event) {
  const request = event.request;
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };

  // OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 路由: GET /api/stock/quote?code=600036
    if (path === '/api/stock/quote' && request.method === 'GET') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response(JSON.stringify({ error: '缺少 code 参数' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 判断市场前缀
      const prefix = code.startsWith('6') ? 'sh' : 'sz';
      const qtUrl = `${API_CONFIG.tencent.base}/q=${prefix}${code}`;

      const resp = await fetch(qtUrl);
      const text = await resp.text();

      // 解析腾讯行情返回格式
      // 格式: v_sh600036="1~名称~代码~现价~...~...";
      const match = text.match(/"([^"]+)"/);
      if (!match) {
        return new Response(JSON.stringify({ error: '解析失败' }), {
          status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      const parts = match[1].split('~');
      const data = {
        code: code,
        name: parts[1],
        price: parseFloat(parts[3]) || 0,
        prevClose: parseFloat(parts[4]) || 0,
        open: parseFloat(parts[5]) || 0,
        high: parseFloat(parts[33]) || 0,
        low: parseFloat(parts[34]) || 0,
        volume: parseFloat(parts[6]) || 0,
        amount: parseFloat(parts[37]) || 0,
        change: parseFloat(parts[31]) || 0,
        changePct: parseFloat(parts[32]) || 0,
        updated: new Date().toISOString()
      };

      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 路由: GET /api/stock/list?page=1&size=50
    if (path === '/api/stock/list' && request.method === 'GET') {
      const page = url.searchParams.get('page') || '1';
      const size = url.searchParams.get('size') || '50';

      const emUrl = `${API_CONFIG.eastmoney.base}${API_CONFIG.eastmoney.format({ page, size })}`;
      const resp = await fetch(emUrl);
      const json = await resp.json();

      return new Response(JSON.stringify(json), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 路由: GET /api/health
    if (path === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 404
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// EdgeOne 标准导出
export { handleEvent };
