/**
 * 周期建议 · 五级漏斗筛选引擎
 * 5-Gate Stock Screening Engine
 *
 * Implements the 寒武纪方法论 five-gate logic:
 *   Gate 1: 企业性质 — only SOEs (央企/省国资委)
 *   Gate 2: 行业筛选 — only commodity/resource sectors
 *   Gate 3: 基本面 — profit growth, margins, cash flow
 *   Gate 4: 周期判断 — cycle position scoring
 *   Gate 5: 估值确认 — PE, PB, normalized earnings
 *
 * Each gate returns { passed: bool, score: 0-100, details: string }
 * Final result: relevanceScore (0-100) weighted across gates.
 */

const Screener = (() => {
  'use strict';

  // ─── Priority sector list (Gate 2) ───
  const COMMODITY_SECTORS = [
    '稀土', '钨', '锑', '钼', '锡', '钴', '锂', '锆', '钛', '钒', '镍', '锌', '铅',
    '铜', '铝', '黄金', '白银', '煤炭', '焦煤', '石油', '天然气', '页岩气',
    '磷化工', '钾肥', '化肥', '铀', '核电', '钢铁', '特钢', '水泥', '建材',
    '军工材料', '稀土永磁', '磁材', '钛材', '高温合金',
    '水电', '清洁能源', '铁路运输', '农业',
  ];

  // ─── High-priority strategic sectors ───
  const STRATEGIC_SECTORS = [
    '稀土', '钨', '锑', '钼', '铀', '钴', '锂', '钛', '黄金',
    '石油', '天然气', '煤炭', '钾肥', '磷化工',
  ];

  // ─── Owner type ranking ───
  const OWNER_RANK = {
    '央企': 100,
    '省国资委': 85,
    '地市国资委': 70,
    '民营': 0,
    '外资': 0,
    '其他': 30,
  };

  // ================================================================
  //  GATE 1: 企业性质过滤
  // ================================================================
  function gate1(stock) {
    const type = (stock.holderType || '').trim();
    const rank = OWNER_RANK[type] || 0;
    const passed = rank >= 70; // 省国资委+

    let details;
    if (passed) {
      details = `通过 ✓ 实际控制人: ${stock.holder} (${type})`;
    } else {
      details = `排除 ✗ 实际控制人: ${stock.holder} (${type}) — 不符合国企要求`;
    }

    return { passed, score: rank, details, label: type };
  }

  // ================================================================
  //  GATE 2: 行业与能力圈过滤
  // ================================================================
  function gate2(stock) {
    const sector = (stock.sector || '');
    const isCommodity = COMMODITY_SECTORS.some(s => sector.includes(s));
    const isStrategic = STRATEGIC_SECTORS.some(s => sector.includes(s));

    let score = 0;
    if (isCommodity) {
      score = isStrategic ? 100 : 75;
    }

    const passed = score >= 75;

    let details;
    if (passed) {
      const tag = isStrategic ? '战略商品' : '商品类';
      details = `通过 ✓ 行业: ${sector} [${tag}]`;
    } else {
      details = `排除 ✗ 行业: ${sector} — 不属于商品类资源行业`;
    }

    return { passed, score, details, isStrategic, sector };
  }

  // ================================================================
  //  GATE 3: 基本面量化筛选
  // ================================================================
  function gate3(stock) {
    let issues = [];
    let score = 100;

    // 3.1 Net profit growth multiple (3-year)
    const profitMul = stock.netProfit3y || 0;
    if (profitMul >= 5) {
      // excellent
    } else if (profitMul >= 3) {
      score -= 10;
      issues.push(`净利润3年弹性${profitMul.toFixed(1)}倍，未达5倍阈值`);
    } else if (profitMul >= 2) {
      score -= 25;
      issues.push(`净利润弹性仅${profitMul.toFixed(1)}倍，低于3倍警戒线`);
    } else {
      score -= 40;
      issues.push(`净利润弹性仅${profitMul.toFixed(1)}倍，远低于5倍要求`);
    }

    // 3.2 Gross margin check
    const gm = stock.grossMargin || 0;
    if (gm >= 30) {
      // excellent
    } else if (gm >= 20) {
      score -= 10;
      issues.push(`毛利率${gm.toFixed(1)}%，处于中等水平`);
    } else if (gm >= 15) {
      score -= 20;
      issues.push(`毛利率${gm.toFixed(1)}%，偏低`);
    } else {
      score -= 35;
      issues.push(`毛利率${gm.toFixed(1)}%，过低`);
    }

    // 3.3 Cash flow quality
    const cf = stock.cashFlowRatio || 0;
    if (cf >= 1.0) {
      // excellent
    } else if (cf >= 0.8) {
      // good
    } else if (cf >= 0.5) {
      score -= 15;
      issues.push(`经营性现金流/净利润=${cf.toFixed(2)}，低于0.8健康线`);
    } else {
      score -= 30;
      issues.push(`现金流质量差 (${cf.toFixed(2)})，需警惕`);
    }

    // 3.4 Debt ratio
    const dr = stock.debtRatio || 0;
    if (dr < 35) {
      // excellent
    } else if (dr < 50) {
      score -= 8;
    } else if (dr < 65) {
      score -= 15;
      issues.push(`资产负债率${dr.toFixed(1)}%，偏高`);
    } else {
      score -= 25;
      issues.push(`资产负债率${dr.toFixed(1)}%，超过商品类企业健康线65%`);
    }

    const passed = score >= 50;
    const detailSummary = issues.length > 0 ? issues.join('; ') : '基本面健康';

    return {
      passed,
      score: Math.max(0, Math.min(100, score)),
      details: passed
        ? `通过 ✓ ${detailSummary}`
        : `不通过 ✗ ${detailSummary}`,
      profitMul,
      grossMargin: gm,
      cashFlowRatio: cf,
      debtRatio: dr,
    };
  }

  // ================================================================
  //  GATE 4: 周期位置判断
  // ================================================================
  function gate4(stock) {
    // Using prodPrice5yPct as a proxy for cycle position
    // Low percentile = likely near bottom = good buying opportunity
    const pricePct = stock.prodPrice5yPct || 50;

    let score;
    let position;
    let details;

    if (pricePct < 25) {
      score = 95;
      position = '底部区间';
      details = `价格处于近5年${pricePct}%分位 — 底部区间，买入信号强`;
    } else if (pricePct < 40) {
      score = 80;
      position = '底部至中段';
      details = `价格处于近5年${pricePct}%分位 — 偏低，适合建仓`;
    } else if (pricePct < 55) {
      score = 55;
      position = '中段';
      details = `价格处于近5年${pricePct}%分位 — 中性位置，等待更好时机`;
    } else if (pricePct < 70) {
      score = 35;
      position = '中段偏高';
      details = `价格处于近5年${pricePct}%分位 — 偏高，谨慎`;
    } else {
      score = 15;
      position = '顶部区间';
      details = `价格处于近5年${pricePct}%分位 — 顶部区间，风险较高`;
    }

    const passed = score >= 55;

    return {
      passed,
      score,
      details: passed
        ? `通过 ✓ ${details}`
        : `暂缓 ✗ ${details}`,
      position,
      pricePercentile: pricePct,
    };
  }

  // ================================================================
  //  GATE 5: 估值确认
  // ================================================================
  function gate5(stock) {
    const pe = stock.peTTM || 0;
    const pb = stock.pb || 0;
    const roe = stock.roe || 0;

    let score = 50;
    let issues = [];

    // PE scoring
    if (pe <= 0) {
      // Loss-making — need normalized earnings
      score += 10;
      issues.push('当前亏损，需用正常化利润估值');
    } else if (pe <= 10) {
      score += 50;
      issues.push(`PE ${pe.toFixed(1)}× — 极低估值`);
    } else if (pe <= 15) {
      score += 40;
      issues.push(`PE ${pe.toFixed(1)}× — 买入区间 (≤15×)`);
    } else if (pe <= 20) {
      score += 20;
      issues.push(`PE ${pe.toFixed(1)}× — 合理偏低`);
    } else if (pe <= 30) {
      issues.push(`PE ${pe.toFixed(1)}× — 合理中枢`);
    } else if (pe <= 45) {
      score -= 15;
      issues.push(`PE ${pe.toFixed(1)}× — 偏高，警惕`);
    } else {
      score -= 30;
      issues.push(`PE ${pe.toFixed(1)}× — 危险区间`);
    }

    // PB scoring
    if (pb < 1.0) {
      score += 15;
      issues.push(`PB ${pb.toFixed(1)} — 破净`);
    } else if (pb < 2.0) {
      score += 5;
    } else if (pb > 4.0) {
      score -= 10;
      issues.push(`PB ${pb.toFixed(1)} — 偏高`);
    }

    // ROE bonus
    if (roe >= 15) score += 10;
    else if (roe >= 10) score += 5;
    else if (roe < 5) score -= 5;

    const finalScore = Math.max(0, Math.min(100, score));
    const passed = finalScore >= 50;

    return {
      passed,
      score: finalScore,
      details: passed
        ? `通过 ✓ PE ${pe.toFixed(1)}× ${issues.join('; ')}`
        : `暂缓 ✗ ${issues.join('; ')}`,
      pe, pb, roe,
    };
  }

  // ================================================================
  //  COMPOSITE: Run all 5 gates + compute relevance score
  // ================================================================
  function screenStock(stock) {
    const g1 = gate1(stock);
    const g2 = gate2(stock);
    const g3 = gate3(stock);
    const g4 = gate4(stock);
    const g5 = gate5(stock);

    // Gate 1 & 2 are hard passes — if failed, overall relevance is low
    const hardGatesPassed = g1.passed && g2.passed;

    // Relevance score = weighted sum of all gates
    // Gate 1 & 2 have higher weight (hard filters)
    let relevance;
    if (!g1.passed && !g2.passed) {
      relevance = 5; // Both hard gates failed
    } else if (!g1.passed || !g2.passed) {
      relevance = Math.max(10, Math.round(
        g3.score * 0.3 + g4.score * 0.3 + g5.score * 0.4
      ) * 0.3);
    } else {
      relevance = Math.round(
        g1.score * 0.15 +
        g2.score * 0.15 +
        g3.score * 0.25 +
        g4.score * 0.20 +
        g5.score * 0.25
      );
    }

    relevance = Math.max(0, Math.min(100, relevance));

    // Generate investment advice based on relevance score
    const advice = generateAdvice(stock, relevance, g1, g2, g3, g4, g5);

    return {
      code: stock.code,
      name: stock.name,
      sector: stock.sector,
      holderType: g1.label,
      isStrategic: g2.isStrategic || false,
      gates: { g1, g2, g3, g4, g5 },
      hardGatesPassed,
      relevanceScore: relevance,
      advice,
      raw: stock,
    };
  }

  // ================================================================
  //  INVESTMENT ADVICE GENERATOR
  // ================================================================
  function generateAdvice(stock, relevance, g1, g2, g3, g4, g5) {
    const allPassed = g1.passed && g2.passed && g3.passed && g4.passed && g5.passed;

    if (allPassed && relevance >= 80) {
      return {
        action: '强烈推荐买入',
        actionClass: 'ok',
        summary: `符合寒武纪方法论全部五关要求。${stock.name}为${stock.holder}控股的${stock.sector}企业，当前PE仅${stock.peTTM}×，处于估值底部。产品价格处于近5年${stock.prodPrice5yPct}%分位，周期位置理想。建议分3批建仓，总仓位不超过总资产15%。`,
        confidence: '高',
        keyPoints: [
          `国企控股 (${g1.label}) — 安全边际充足`,
          `${stock.sector}行业 — 战略商品属性强`,
          `净利润3年弹性${stock.netProfit3y}倍 — 业绩爆发力强`,
          `当前PE ${stock.peTTM}× — 低于15×买入标准`,
          `产品价格处于周期低位 — 上升空间大`,
        ],
        risks: [
          '大宗商品价格持续低迷',
          '宏观经济下行超预期',
          '行业政策变化风险',
        ],
        suggestedPosition: '15%',
        timeHorizon: '2-4年',
      };
    }

    if (relevance >= 65 && g1.passed && g2.passed) {
      return {
        action: '建议关注',
        actionClass: 'ok',
        summary: `${stock.name}通过企业性质和行业筛选，基本面/周期/估值部分达标。建议加入观察列表，待更多拐点信号出现后建仓。`,
        confidence: '中',
        keyPoints: [
          `国企控股 — 符合安全边际要求`,
          `行业: ${stock.sector}`,
          g3.passed ? '基本面达标' : `基本面待改善 (评分${g3.score})`,
          g4.passed ? '周期位置合适' : `周期位置偏中段`,
          g5.passed ? `PE ${stock.peTTM}× 可接受` : `PE ${stock.peTTM}× 偏高`,
        ],
        risks: ['等待更明确的拐点信号', '关注产品价格走势'],
        suggestedPosition: '观察',
        timeHorizon: '1-2年',
      };
    }

    if (!g1.passed || !g2.passed) {
      return {
        action: '不符合基本条件',
        actionClass: 'warn',
        summary: `${g1.passed ? '' : '企业性质不符(非国企控股)'}${g1.passed && !g2.passed ? '；' : ''}${g2.passed ? '' : '行业不符合商品类要求'}`,
        confidence: '高',
        keyPoints: [
          !g1.passed ? `✗ 企业性质: ${g1.details}` : '✓ 企业性质通过',
          !g2.passed ? `✗ 行业: ${g2.details}` : '✓ 行业通过',
        ],
        risks: ['硬性条件不满足，排除'],
        suggestedPosition: '0%',
        timeHorizon: '-',
      };
    }

    return {
      action: '可选择性关注',
      actionClass: 'pending',
      summary: `通过部分筛选条件，但综合评分${relevance}分，未达到建仓标准。需进一步跟踪。`,
      confidence: '低',
      keyPoints: ['部分条件满足', '需更多数据验证'],
      risks: ['基本面或估值存在不确定性'],
      suggestedPosition: '0-5%',
      timeHorizon: '待定',
    };
  }

  // ================================================================
  //  SCREEN ALL STOCKS
  // ================================================================
  function screenAll(stocks) {
    return stocks
      .map(s => screenStock(s))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // ================================================================
  //  GET TOP N
  // ================================================================
  function getTopN(stocks, n = 50) {
    const results = screenAll(stocks);
    return results.slice(0, n);
  }

  return { screenStock, screenAll, getTopN, gate1, gate2, gate3, gate4, gate5 };
})();
