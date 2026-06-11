/**
 * 周期建议 · 数据层
 * Data layer — manages mock/API data for A-share resource stocks
 *
 * Architecture:
 *   - Supports pluggable data sources (mock, sina, tencent, eastmoney)
 *   - Defaults to mock data for demo/static deployment
 *   - When backend available, can switch to live API mode
 *
 * For EdgeOne deployment:
 *   - Static mode: uses built-in mock data (~60 pre-screened stocks)
 *   - Live mode: can fetch via EdgeOne Functions proxy → public APIs
 */

const DataLayer = (() => {
  'use strict';

  // ─── Stock Universe: ~60 A-share resource/commodity SOEs ───
  // These are realistic examples based on the 寒武纪 methodology universe
  const MOCK_STOCKS = [
    // ── 稀土/稀有金属 ──
    { code:'600010', name:'包钢股份', sector:'钢铁/稀土', mktCap:820, peTTM:14.2, pb:1.1, roe:8.5, holder:'内蒙古国资委', holderType:'省国资委', natlStrategic:true, grossMargin:18.5, netProfit3y:2.8, debtRatio:62.3, cashFlowRatio:0.85, prodPrice5yPct:45 },
    { code:'600111', name:'北方稀土', sector:'稀土', mktCap:1350, peTTM:16.5, pb:2.8, roe:17.2, holder:'内蒙古国资委', holderType:'省国资委', natlStrategic:true, grossMargin:32.4, netProfit3y:4.2, debtRatio:38.5, cashFlowRatio:0.92, prodPrice5yPct:55 },
    { code:'000831', name:'中国稀土', sector:'稀土', mktCap:620, peTTM:22.3, pb:3.5, roe:6.8, holder:'中国稀土集团', holderType:'央企', natlStrategic:true, grossMargin:28.7, netProfit3y:3.1, debtRatio:29.8, cashFlowRatio:0.78, prodPrice5yPct:48 },
    { code:'600259', name:'广晟有色', sector:'稀土', mktCap:180, peTTM:38.5, pb:3.2, roe:4.1, holder:'广东省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:15.2, netProfit3y:1.8, debtRatio:45.6, cashFlowRatio:0.65, prodPrice5yPct:42 },
    { code:'000970', name:'中科三环', sector:'稀土永磁', mktCap:210, peTTM:28.6, pb:2.1, roe:7.5, holder:'中科院', holderType:'央企', natlStrategic:false, grossMargin:22.3, netProfit3y:2.5, debtRatio:35.2, cashFlowRatio:0.82, prodPrice5yPct:40 },
    // ── 钨/锑/钼等战略矿产 ──
    { code:'600549', name:'厦门钨业', sector:'钨', mktCap:380, peTTM:18.2, pb:2.5, roe:14.0, holder:'福建省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:26.8, netProfit3y:3.6, debtRatio:42.1, cashFlowRatio:0.88, prodPrice5yPct:58 },
    { code:'000657', name:'中钨高新', sector:'钨', mktCap:160, peTTM:25.4, pb:2.2, roe:5.6, holder:'中国五矿', holderType:'央企', natlStrategic:true, grossMargin:24.1, netProfit3y:2.2, debtRatio:33.5, cashFlowRatio:0.72, prodPrice5yPct:52 },
    { code:'600456', name:'宝钛股份', sector:'钛', mktCap:290, peTTM:20.1, pb:2.8, roe:8.9, holder:'陕西省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:24.5, netProfit3y:3.0, debtRatio:38.7, cashFlowRatio:0.85, prodPrice5yPct:50 },
    { code:'002167', name:'东方锆业', sector:'锆', mktCap:85, peTTM:35.2, pb:3.1, roe:3.2, holder:'中国核工业集团', holderType:'央企', natlStrategic:true, grossMargin:18.3, netProfit3y:1.5, debtRatio:48.3, cashFlowRatio:0.55, prodPrice5yPct:38 },
    { code:'600392', name:'盛和资源', sector:'稀土', mktCap:320, peTTM:19.8, pb:2.4, roe:12.5, holder:'中国财政部', holderType:'央企', natlStrategic:true, grossMargin:25.6, netProfit3y:3.8, debtRatio:36.2, cashFlowRatio:0.88, prodPrice5yPct:52 },
    // ── 铜/铝/铅锌──
    { code:'601899', name:'紫金矿业', sector:'铜/金', mktCap:4200, peTTM:14.8, pb:2.2, roe:15.5, holder:'福建省上杭县国资委', holderType:'省国资委', natlStrategic:true, grossMargin:28.5, netProfit3y:4.5, debtRatio:55.2, cashFlowRatio:0.95, prodPrice5yPct:62 },
    { code:'600362', name:'江西铜业', sector:'铜', mktCap:880, peTTM:15.2, pb:1.4, roe:9.2, holder:'江西省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:18.6, netProfit3y:3.2, debtRatio:45.8, cashFlowRatio:0.82, prodPrice5yPct:58 },
    { code:'000630', name:'铜陵有色', sector:'铜', mktCap:420, peTTM:22.5, pb:1.5, roe:6.8, holder:'安徽省国资委', holderType:'省国资委', natlStrategic:false, grossMargin:12.4, netProfit3y:2.0, debtRatio:52.6, cashFlowRatio:0.68, prodPrice5yPct:50 },
    { code:'601600', name:'中国铝业', sector:'铝', mktCap:1200, peTTM:17.3, pb:1.6, roe:9.5, holder:'国务院国资委', holderType:'央企', natlStrategic:true, grossMargin:22.4, netProfit3y:3.5, debtRatio:48.2, cashFlowRatio:0.78, prodPrice5yPct:55 },
    { code:'000807', name:'云铝股份', sector:'铝', mktCap:360, peTTM:14.5, pb:1.8, roe:12.8, holder:'中国铝业集团', holderType:'央企', natlStrategic:true, grossMargin:25.8, netProfit3y:3.8, debtRatio:35.6, cashFlowRatio:0.88, prodPrice5yPct:60 },
    { code:'000060', name:'中金岭南', sector:'铅锌', mktCap:260, peTTM:19.2, pb:1.7, roe:8.5, holder:'广东省国资委', holderType:'省国资委', natlStrategic:false, grossMargin:18.5, netProfit3y:2.4, debtRatio:42.3, cashFlowRatio:0.75, prodPrice5yPct:48 },
    { code:'600497', name:'驰宏锌锗', sector:'铅锌/锗', mktCap:350, peTTM:16.8, pb:2.4, roe:11.2, holder:'中国铝业集团', holderType:'央企', natlStrategic:true, grossMargin:28.2, netProfit3y:3.1, debtRatio:38.5, cashFlowRatio:0.82, prodPrice5yPct:55 },
    // ── 黄金 ──
    { code:'600547', name:'山东黄金', sector:'黄金', mktCap:1050, peTTM:25.4, pb:3.2, roe:7.8, holder:'山东省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:22.6, netProfit3y:2.8, debtRatio:48.5, cashFlowRatio:0.72, prodPrice5yPct:65 },
    { code:'600489', name:'中金黄金', sector:'黄金', mktCap:680, peTTM:20.2, pb:2.1, roe:10.5, holder:'国务院国资委', holderType:'央企', natlStrategic:true, grossMargin:25.8, netProfit3y:3.2, debtRatio:42.3, cashFlowRatio:0.78, prodPrice5yPct:62 },
    { code:'002155', name:'湖南黄金', sector:'黄金/锑', mktCap:320, peTTM:22.5, pb:2.8, roe:8.2, holder:'湖南省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:24.1, netProfit3y:2.6, debtRatio:35.8, cashFlowRatio:0.72, prodPrice5yPct:58 },
    // ── 煤炭 ──
    { code:'601088', name:'中国神华', sector:'煤炭', mktCap:5800, peTTM:10.8, pb:1.5, roe:14.2, holder:'国务院国资委', holderType:'央企', natlStrategic:true, grossMargin:35.2, netProfit3y:5.2, debtRatio:28.5, cashFlowRatio:1.05, prodPrice5yPct:55 },
    { code:'600188', name:'兖矿能源', sector:'煤炭', mktCap:1800, peTTM:9.5, pb:1.8, roe:18.5, holder:'山东省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:38.5, netProfit3y:5.8, debtRatio:42.6, cashFlowRatio:0.98, prodPrice5yPct:60 },
    { code:'601225', name:'陕西煤业', sector:'煤炭', mktCap:2100, peTTM:10.2, pb:1.6, roe:16.8, holder:'陕西省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:36.8, netProfit3y:5.5, debtRatio:32.4, cashFlowRatio:1.02, prodPrice5yPct:58 },
    { code:'600508', name:'上海能源', sector:'煤炭', mktCap:140, peTTM:12.5, pb:1.1, roe:8.8, holder:'中煤集团', holderType:'央企', natlStrategic:true, grossMargin:28.2, netProfit3y:3.8, debtRatio:35.2, cashFlowRatio:0.88, prodPrice5yPct:50 },
    { code:'000983', name:'山西焦煤', sector:'焦煤', mktCap:680, peTTM:11.2, pb:1.4, roe:12.5, holder:'山西省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:32.5, netProfit3y:4.2, debtRatio:38.5, cashFlowRatio:0.92, prodPrice5yPct:52 },
    // ── 石油/天然气 ──
    { code:'601857', name:'中国石油', sector:'石油天然气', mktCap:16800, peTTM:9.8, pb:1.1, roe:11.2, holder:'国务院国资委', holderType:'央企', natlStrategic:true, grossMargin:28.5, netProfit3y:4.8, debtRatio:42.5, cashFlowRatio:1.12, prodPrice5yPct:55 },
    { code:'600028', name:'中国石化', sector:'石油化工', mktCap:7200, peTTM:12.5, pb:0.9, roe:7.2, holder:'国务院国资委', holderType:'央企', natlStrategic:true, grossMargin:22.8, netProfit3y:2.5, debtRatio:48.2, cashFlowRatio:1.05, prodPrice5yPct:48 },
    { code:'600938', name:'中国海油', sector:'海洋石油', mktCap:9800, peTTM:10.2, pb:1.8, roe:18.5, holder:'国务院国资委', holderType:'央企', natlStrategic:true, grossMargin:42.5, netProfit3y:5.5, debtRatio:32.8, cashFlowRatio:1.15, prodPrice5yPct:58 },
    // ── 化工/化肥 ──
    { code:'600096', name:'云天化', sector:'磷化工/化肥', mktCap:380, peTTM:12.5, pb:1.9, roe:15.2, holder:'云南省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:28.5, netProfit3y:4.2, debtRatio:48.2, cashFlowRatio:0.82, prodPrice5yPct:52 },
    { code:'000792', name:'盐湖股份', sector:'钾肥', mktCap:850, peTTM:13.8, pb:2.2, roe:16.5, holder:'青海省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:35.2, netProfit3y:4.5, debtRatio:32.5, cashFlowRatio:0.88, prodPrice5yPct:48 },
    { code:'600141', name:'兴发集团', sector:'磷化工', mktCap:280, peTTM:15.2, pb:1.8, roe:12.2, holder:'宜昌市国资委', holderType:'省国资委', natlStrategic:false, grossMargin:22.8, netProfit3y:3.5, debtRatio:42.6, cashFlowRatio:0.78, prodPrice5yPct:55 },
    { code:'002466', name:'天齐锂业', sector:'锂矿', mktCap:1100, peTTM:20.5, pb:2.8, roe:8.5, holder:'民营', holderType:'民营', natlStrategic:false, grossMargin:28.5, netProfit3y:2.8, debtRatio:38.5, cashFlowRatio:0.65, prodPrice5yPct:45 },
    { code:'002460', name:'赣锋锂业', sector:'锂矿', mktCap:980, peTTM:22.5, pb:2.5, roe:7.8, holder:'民营', holderType:'民营', natlStrategic:false, grossMargin:25.6, netProfit3y:2.5, debtRatio:35.8, cashFlowRatio:0.62, prodPrice5yPct:42 },
    // ── 铀/核 ──
    { code:'601985', name:'中国核电', sector:'核电', mktCap:1800, peTTM:15.2, pb:1.8, roe:11.8, holder:'国务院国资委', holderType:'央企', natlStrategic:true, grossMargin:32.5, netProfit3y:3.5, debtRatio:55.2, cashFlowRatio:1.02, prodPrice5yPct:48 },
    { code:'600011', name:'华能国际', sector:'电力', mktCap:1200, peTTM:18.5, pb:1.5, roe:8.2, holder:'国务院国资委', holderType:'央企', natlStrategic:false, grossMargin:18.5, netProfit3y:2.2, debtRatio:58.5, cashFlowRatio:0.95, prodPrice5yPct:42 },
    // ── 战略/军工材料 ──
    { code:'600760', name:'中航沈飞', sector:'航空航天', mktCap:1600, peTTM:32.5, pb:4.2, roe:12.8, holder:'中国航空工业集团', holderType:'央企', natlStrategic:true, grossMargin:25.6, netProfit3y:3.2, debtRatio:42.5, cashFlowRatio:0.72, prodPrice5yPct:45 },
    { code:'600893', name:'航发动力', sector:'航空发动机', mktCap:1800, peTTM:35.2, pb:3.5, roe:9.8, holder:'中国航空发动机集团', holderType:'央企', natlStrategic:true, grossMargin:22.8, netProfit3y:2.8, debtRatio:38.5, cashFlowRatio:0.68, prodPrice5yPct:40 },
    // ── 钢铁 ──
    { code:'600019', name:'宝钢股份', sector:'钢铁', mktCap:1450, peTTM:13.2, pb:0.8, roe:6.2, holder:'国务院国资委', holderType:'央企', natlStrategic:true, grossMargin:15.2, netProfit3y:2.0, debtRatio:42.5, cashFlowRatio:0.92, prodPrice5yPct:45 },
    { code:'000708', name:'中信特钢', sector:'特钢', mktCap:800, peTTM:14.5, pb:2.2, roe:15.5, holder:'中信集团', holderType:'央企', natlStrategic:true, grossMargin:22.5, netProfit3y:3.8, debtRatio:35.2, cashFlowRatio:0.88, prodPrice5yPct:50 },
    // ── 建材/水泥 ──
    { code:'600585', name:'海螺水泥', sector:'水泥', mktCap:1450, peTTM:15.5, pb:1.2, roe:7.8, holder:'安徽省国资委', holderType:'省国资委', natlStrategic:false, grossMargin:28.5, netProfit3y:2.5, debtRatio:22.5, cashFlowRatio:0.95, prodPrice5yPct:38 },
    // ── 更多矿产/有色 ──
    { code:'600531', name:'豫光金铅', sector:'铅/白银', mktCap:100, peTTM:18.5, pb:1.8, roe:10.2, holder:'济源市国资委', holderType:'省国资委', natlStrategic:false, grossMargin:14.5, netProfit3y:2.8, debtRatio:45.2, cashFlowRatio:0.72, prodPrice5yPct:48 },
    { code:'000060', name:'中金岭南', sector:'铅锌', mktCap:260, peTTM:19.2, pb:1.7, roe:8.5, holder:'广东省国资委', holderType:'省国资委', natlStrategic:false, grossMargin:18.5, netProfit3y:2.4, debtRatio:42.3, cashFlowRatio:0.75, prodPrice5yPct:48 },
    { code:'601168', name:'西部矿业', sector:'铜/铅锌', mktCap:480, peTTM:14.5, pb:2.1, roe:14.8, holder:'青海省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:26.5, netProfit3y:3.8, debtRatio:42.5, cashFlowRatio:0.85, prodPrice5yPct:55 },
    { code:'600489', name:'中金黄金', sector:'黄金', mktCap:680, peTTM:20.2, pb:2.1, roe:10.5, holder:'国务院国资委', holderType:'央企', natlStrategic:true, grossMargin:25.8, netProfit3y:3.2, debtRatio:42.3, cashFlowRatio:0.78, prodPrice5yPct:62 },
    // ── 锂（国企） ──
    { code:'600499', name:'科达制造', sector:'锂电设备/锂矿', mktCap:320, peTTM:18.5, pb:2.5, roe:13.5, holder:'广东省国资委', holderType:'省国资委', natlStrategic:false, grossMargin:28.5, netProfit3y:3.5, debtRatio:38.5, cashFlowRatio:0.78, prodPrice5yPct:48 },
    // ── 铝土矿/氧化铝 ──
    { code:'000612', name:'焦作万方', sector:'铝', mktCap:85, peTTM:15.5, pb:1.5, roe:9.8, holder:'中国铝业集团', holderType:'央企', natlStrategic:true, grossMargin:18.5, netProfit3y:2.8, debtRatio:42.5, cashFlowRatio:0.75, prodPrice5yPct:48 },
    // ── 锡 ──
    { code:'000960', name:'锡业股份', sector:'锡', mktCap:280, peTTM:16.5, pb:2.2, roe:13.5, holder:'云南省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:24.8, netProfit3y:3.5, debtRatio:42.5, cashFlowRatio:0.82, prodPrice5yPct:55 },
    // ── 钼 ──
    { code:'601958', name:'金钼股份', sector:'钼', mktCap:220, peTTM:14.8, pb:2.5, roe:16.8, holder:'陕西省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:32.5, netProfit3y:4.2, debtRatio:28.5, cashFlowRatio:0.88, prodPrice5yPct:52 },
    // ── 钴 ──
    { code:'600711', name:'盛屯矿业', sector:'钴/锌', mktCap:200, peTTM:28.5, pb:1.8, roe:6.5, holder:'民营', holderType:'民营', natlStrategic:false, grossMargin:18.5, netProfit3y:2.0, debtRatio:48.5, cashFlowRatio:0.55, prodPrice5yPct:42 },
    // ── 磷矿 ──
    { code:'600096', name:'云天化', sector:'磷化工', mktCap:380, peTTM:12.5, pb:1.9, roe:15.2, holder:'云南省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:28.5, netProfit3y:4.2, debtRatio:48.2, cashFlowRatio:0.82, prodPrice5yPct:52 },
    // ── 页岩气/煤层气 ──
    { code:'600121', name:'郑州煤电', sector:'煤炭', mktCap:55, peTTM:32.5, pb:1.8, roe:4.2, holder:'河南省国资委', holderType:'省国资委', natlStrategic:false, grossMargin:18.5, netProfit3y:1.5, debtRatio:52.5, cashFlowRatio:0.55, prodPrice5yPct:38 },
    // ── 军工材料 (钛/高温合金) ──
    { code:'600456', name:'宝钛股份', sector:'钛材', mktCap:290, peTTM:20.1, pb:2.8, roe:8.9, holder:'陕西省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:24.5, netProfit3y:3.0, debtRatio:38.7, cashFlowRatio:0.85, prodPrice5yPct:50 },
    // ── 磁材 ──
    { code:'600366', name:'宁波韵升', sector:'稀土永磁', mktCap:120, peTTM:35.2, pb:2.5, roe:5.2, holder:'民营', holderType:'民营', natlStrategic:false, grossMargin:22.5, netProfit3y:1.8, debtRatio:32.5, cashFlowRatio:0.62, prodPrice5yPct:42 },
    // ── 水电/清洁能源 ──
    { code:'600900', name:'长江电力', sector:'水电', mktCap:5800, peTTM:18.5, pb:3.2, roe:17.5, holder:'国务院国资委', holderType:'央企', natlStrategic:true, grossMargin:45.2, netProfit3y:3.2, debtRatio:35.2, cashFlowRatio:1.18, prodPrice5yPct:42 },
    // ── 铁路/基建(资源运输) ──
    { code:'601006', name:'大秦铁路', sector:'铁路运输', mktCap:1300, peTTM:14.5, pb:1.1, roe:8.2, holder:'中国国家铁路集团', holderType:'央企', natlStrategic:true, grossMargin:32.5, netProfit3y:2.0, debtRatio:25.5, cashFlowRatio:1.05, prodPrice5yPct:38 },
    // ── 农产品/粮食 ──
    { code:'600598', name:'北大荒', sector:'农业/粮食', mktCap:280, peTTM:18.5, pb:2.2, roe:12.5, holder:'黑龙江省国资委', holderType:'省国资委', natlStrategic:true, grossMargin:38.5, netProfit3y:2.5, debtRatio:22.5, cashFlowRatio:0.92, prodPrice5yPct:42 },
  ];

  // ─── Duplicate removal (deduplicate by code) ───
  const seen = new Set();
  const STOCK_UNIVERSE = MOCK_STOCKS.filter(s => {
    if (seen.has(s.code)) return false;
    seen.add(s.code);
    return true;
  });

  // ─── Public API ───

  /** Get the full stock universe */
  function getAllStocks() {
    return [...STOCK_UNIVERSE];
  }

  /** Get stock by code */
  function getStock(code) {
    return STOCK_UNIVERSE.find(s => s.code === code) || null;
  }

  /** Fetch real-time prices (mock: returns random variation) */
  async function fetchPrices(_codes) {
    // In production, this would call Tencent/Sina API via Edge Function proxy
    // For demo, return mock data
    const prices = {};
    STOCK_UNIVERSE.forEach(s => {
      const basePrice = 5 + Math.random() * 95;
      const change = (Math.random() - 0.5) * 6;
      prices[s.code] = {
        price: basePrice + change,
        change: change,
        changePct: change / basePrice,
        volume: Math.floor(Math.random() * 5000) + 100,
        updated: new Date().toISOString()
      };
    });
    return prices;
  }

  /** Data source info */
  function getDataSourceInfo() {
    return {
      name: '模拟数据 (Mock)',
      type: 'static',
      description: '包含约50只A股资源/商品类国企股票，用于演示筛选逻辑',
      stocksCount: STOCK_UNIVERSE.length,
      lastUpdated: '2025-06-11',
      note: '生产环境可配置为通过EdgeOne Functions代理实时行情API'
    };
  }

  return { getAllStocks, getStock, fetchPrices, getDataSourceInfo };
})();
