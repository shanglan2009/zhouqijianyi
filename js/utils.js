/**
 * 周期建议 · 工具函数
 * Cambrian Methodology Utility Functions
 */

const Utils = {
  /** Format number with commas */
  fmtNum(x) {
    if (x == null || isNaN(x)) return '-';
    return Number(x).toLocaleString('zh-CN');
  },

  /** Format percentage */
  fmtPct(x, decimals = 1) {
    if (x == null || isNaN(x)) return '-';
    return (x * 100).toFixed(decimals) + '%';
  },

  /** Format as倍 (multiple) */
  fmtMul(x, decimals = 1) {
    if (x == null || isNaN(x)) return '-';
    return Number(x).toFixed(decimals) + '×';
  },

  /** Format yuan (亿元) */
  fmtYi(x) {
    if (x == null || isNaN(x)) return '-';
    if (Math.abs(x) >= 1) return Number(x).toFixed(1) + '亿';
    return (x * 10000).toFixed(0) + '万';
  },

  /** Format PE ratio */
  fmtPE(x) {
    if (x == null || isNaN(x) || x < 0) return '-';
    return Number(x).toFixed(1) + '×';
  },

  /** Clamp */
  clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },

  /** Normalize score 0-100 */
  normalize(val, min, max) {
    if (max === min) return 50;
    return Utils.clamp(((val - min) / (max - min)) * 100, 0, 100);
  },

  /** Score color — green (high) to red (low) */
  scoreColor(score, maxScore = 100) {
    const pct = score / maxScore;
    if (pct >= 0.7) return 'var(--green)';
    if (pct >= 0.4) return '#b8860b';
    return 'var(--red)';
  },

  /** Gate pass/fail display */
  gateIcon(passed) {
    return passed ? '✓' : '✗';
  },

  /** Generate a simple unique id */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /** Debounce */
  debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }
};
