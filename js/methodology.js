/**
 * 周期建议 · 方法论数据
 * All prompt data for the 5-gate system + verification + monitoring + exit
 */

const Methodology = (() => {
  'use strict';

  // ─── Core Parameters ───
  const CORE_PARAMS = [
    { num: '5–10×', label: '3年业绩爆发阈值' },
    { num: '15×',   label: 'PE买入上限（大机会）' },
    { num: '70%',   label: '主仓位下限' },
    { num: '3支',   label: '最大同时持仓数' },
    { num: '3年+',  label: '底部横盘时间' },
    { num: '60×',   label: 'PE危险线（顶部）' },
  ];

  // ─── 5-Gate Workflow ───
  const WORKFLOW = [
    { num: '01', title: '企业性质过滤', tag: '硬性排除', tagClass: 'badge-filter',
      desc: '确认实际控制人为央企或省国资委。民企、外资、私募控股一律排除。工具：天眼查、企查查、CNINFO。' },
    { num: '02', title: '行业与能力圈过滤', tag: '硬性排除', tagClass: 'badge-filter',
      desc: '仅保留商品类：战略矿产、资源、能源。排除AI、芯片、券商、消费品等非商品行业。' },
    { num: '03', title: '基本面量化筛选', tag: '量化计算', tagClass: 'badge-analysis',
      desc: '3年净利润增幅≥5倍 或 主要产品价格涨幅≥2倍 或 单年增长≥3倍。毛利率持续高且无下滑。' },
    { num: '04', title: '周期位置判断', tag: '周期分析', tagClass: 'badge-cycle',
      desc: '全产业链亏损确认 + 资深从业者离场信号 + 股价3年以上横盘 + 市场冷清无讨论。' },
    { num: '05', title: '估值与拐点确认', tag: '买入触发', tagClass: 'badge-verify',
      desc: 'PE ≤ 15×。确认行业/产品/业绩/周期四类拐点之一出现。低价低位，机构尚未进场。' },
  ];

  // ─── Data Sources ───
  const DATA_SOURCES = [
    { name: '上交所/深交所公告 (CNINFO)', type: '官方', icon: 'verify', use: '财务报告、股权结构', access: 'cninfo.com.cn' },
    { name: 'Wind 金融终端', type: '专业', icon: 'analysis', use: '全市场筛选、行业数据', access: '付费终端' },
    { name: 'Bloomberg Terminal', type: '专业', icon: 'analysis', use: '国际对标、大宗商品价格', access: '付费终端' },
    { name: 'LME / SHFE', type: '实时', icon: 'search', use: '有色金属期货价格', access: 'lme.com / shfe.com.cn' },
    { name: 'USGS 矿产年鉴', type: '官方', icon: 'verify', use: '全球矿产产量、储量、供需', access: 'usgs.gov/minerals' },
    { name: '中国地质调查局', type: '官方', icon: 'verify', use: '国内矿产资源数据', access: 'cgs.gov.cn' },
    { name: 'Refinitiv / Reuters', type: '实时', icon: 'search', use: '国际大宗商品价格交叉验证', access: 'refinitiv.com' },
    { name: '国家统计局', type: '官方', icon: 'verify', use: '产量、产能利用率、行业数据', access: 'stats.gov.cn' },
    { name: '工信部公告', type: '官方', icon: 'verify', use: '行政干预政策、产能指标', access: 'miit.gov.cn' },
    { name: 'Perplexity / Claude Search', type: 'AI搜索', icon: 'search', use: '快速交叉验证、新闻整合', access: '在线工具' },
  ];

  // ─── Tabs Definition (screener first = homepage) ───
  const TABS = [
    { id: 'screener', label: '自动筛选', highlight: true },
    { id: 'overview', label: '总览' },
    { id: 'gate1',    label: '关1 企业性质' },
    { id: 'gate2',    label: '关2 行业筛选' },
    { id: 'gate3',    label: '关3 基本面' },
    { id: 'gate4',    label: '关4 周期判断' },
    { id: 'gate5',    label: '关5 估值确认' },
    { id: 'verify',   label: '多渠道验证' },
    { id: 'monitor',  label: '持仓监控' },
    { id: 'exit',     label: '卖出决策' },
  ];

  return { CORE_PARAMS, WORKFLOW, DATA_SOURCES, TABS };
})();
