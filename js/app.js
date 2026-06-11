/**
 * 周期建议 · 主应用
 * Main application — ties UI, data, and screening engine together
 */

const App = (() => {
  'use strict';

  // ─── State ───
  let state = {
    activeTab: 'screener',
    screeningResults: [],
    selectedStock: null,
    isScreening: false,
    priceData: null,
    sortKey: 'relevanceScore',
    sortAsc: false,
    dataSource: null,
    userStocks: [], // stocks added by user
  };

  // ─── DOM cache ───
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ─── Init ───
  function init() {
    state.dataSource = DataLayer.getDataSourceInfo();
    // Load user-added stocks from localStorage
    loadUserStocks();
    renderOverview();
    renderDataSources();
    renderTabs();
    renderScreenerTab();
    bindTabNavigation();
    bindGlobalEvents();
  }

  // ─── User stock persistence (app.js owns this fully) ───
  function loadUserStocks() {
    try {
      const saved = localStorage.getItem('zhouqijianyi_user_stocks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          state.userStocks = parsed;
          // Schedule a check for stocks with incomplete data (sector='自定义' or holderType='其他')
          setTimeout(checkStaleUserStocks, 500);
        }
      }
    } catch (e) { /* ignore */ }
  }

  function saveUserStocks() {
    try {
      localStorage.setItem('zhouqijianyi_user_stocks', JSON.stringify(state.userStocks));
    } catch (e) { /* ignore */ }
  }

  /** Detect stale user stocks (saved before the confirmation-form fix) and prompt edit */
  function checkStaleUserStocks() {
    const stale = state.userStocks.filter(s => s.sector === '自定义' || s.holderType === '其他');
    if (stale.length === 0) return;
    // Show editable tags with warning for each stale stock
    renderUserStockList();
    showToast('有 ' + stale.length + ' 只自选股信息不完整，请点击 ✏️ 编辑完善', 'info');
  }

  /** Helper: get all stocks (built-in + user-added) */
  function getAllStocksMerged() {
    return DataLayer.getAllStocks().concat(state.userStocks);
  }

  /** Helper: find stock in merged pool */
  function findStock(code) {
    return DataLayer.getStock(code) || state.userStocks.find(s => s.code === code) || null;
  }

  /** Helper: fuzzy search across merged pool */
  function searchMerged(q) {
    const query = q.toLowerCase().trim();
    if (!query) return [];
    return getAllStocksMerged().filter(s =>
      s.code.includes(query) ||
      s.name.toLowerCase().includes(query) ||
      (s.sector && s.sector.toLowerCase().includes(query))
    );
  }

  // ─── Tab Navigation ───
  function renderTabs() {
    const nav = $('.tab-nav');
    if (!nav) return;
    nav.innerHTML = Methodology.TABS.map(t => `
      <button class="tab-btn ${t.highlight ? 'highlight' : ''} ${t.id === state.activeTab ? 'active' : ''}"
              data-tab="${t.id}">${t.label}</button>
    `).join('');
  }

  function bindTabNavigation() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      const tabId = btn.dataset.tab;
      switchTab(tabId);
    });
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Overview Tab ───
  function renderOverview() {
    const container = $('#tab-overview .overview-grid');
    if (!container) return;
    container.innerHTML = Methodology.CORE_PARAMS.map(p => `
      <div class="overview-cell">
        <div class="overview-num">${p.num}</div>
        <div class="overview-label">${p.label}</div>
      </div>
    `).join('');

    const wf = $('#tab-overview .workflow');
    if (wf) {
      wf.innerHTML = Methodology.WORKFLOW.map(w => `
        <div class="workflow-step">
          <div class="wf-num">${w.num}</div>
          <div class="wf-body">
            <div class="wf-title">${w.title} <span class="badge ${w.tagClass} wf-tag">${w.tag}</span></div>
            <div class="wf-desc">${w.desc}</div>
          </div>
        </div>
      `).join('');
    }
  }

  function renderDataSources() {
    const tbody = document.querySelector('#tab-overview .source-table tbody');
    if (!tbody) return;
    tbody.innerHTML = Methodology.DATA_SOURCES.map(d => `
      <tr>
        <td>${d.name}</td>
        <td><span class="badge badge-${d.icon} tag">${d.type}</span></td>
        <td>${d.use}</td>
        <td style="font-family:var(--mono);font-size:11px;">${d.access}</td>
      </tr>
    `).join('');
  }

  // ─── Screener Tab ───
  function renderScreenerTab() {
    const panel = $('#tab-screener .screener-section');
    if (!panel) return;

    const stocks = getAllStocksMerged();
    const ds = state.dataSource;

    panel.innerHTML = `
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-num">${stocks.length}</div>
          <div class="stat-label">候选池股票数</div>
        </div>
        <div class="stat-item">
          <div class="stat-num" id="passed-count">-</div>
          <div class="stat-label">通过硬性条件</div>
        </div>
        <div class="stat-item">
          <div class="stat-num" id="top-score">-</div>
          <div class="stat-label">最高相关度</div>
        </div>
        <div class="stat-item">
          <div class="stat-num" id="avg-score">-</div>
          <div class="stat-label">平均相关度</div>
        </div>
      </div>

      <!-- ═══ Add Stock Panel ═══ -->
      <div class="add-stock-panel">
        <div class="add-stock-header">➕ 添加自选股票</div>
        <div class="add-stock-body">
          <div class="add-stock-row">
            <input type="text" id="stock-search-input" placeholder="输入股票名称或代码（模糊匹配，如"紫金"、"600036"）" autocomplete="off">
            <div id="stock-search-dropdown" class="search-dropdown"></div>
            <button class="btn btn-sm" id="add-stock-btn">添加</button>
          </div>
          <div id="user-stock-list" class="user-stock-list"></div>
        </div>
      </div>

      <div class="screener-controls">
        <label>
          数据源
          <select id="data-source-select">
            <option value="mock">模拟数据 (${stocks.length}只)</option>
          </select>
        </label>
        <label>
          显示
          <select id="result-count-select">
            <option value="100" selected>全部 (最多100只)</option>
          </select>
        </label>
        <button class="btn" id="run-screener-btn">
          <span id="screener-btn-text">▶ 运行自动筛选</span>
          <span id="screener-spinner" class="spinner" style="display:none"></span>
        </button>
        <button class="btn btn-outline btn-sm" id="reset-screener-btn">重置</button>
      </div>
      <div class="note-box">
        💡 筛选逻辑基于寒武纪方法论五级漏斗：企业性质(国企) → 行业(商品类) → 基本面(盈利弹性) → 周期位置(价格分位) → 估值(PE≤15×)。
        当前为<strong>模拟演示模式</strong>，包含${stocks.length}只A股资源类国企股票数据。
        <br><small>生产环境可通过EdgeOne Functions连接实时行情API获取真实数据。</small>
      </div>
      <div id="screener-results">
        <div style="text-align:center;padding:3rem 0;color:var(--ink3);font-family:var(--sans);font-size:13px;">
          点击「运行自动筛选」查看结果。也可以在输入框中搜索或输入股票代码/名称后点击「添加」。
        </div>
      </div>
    `;

    // Bind screener controls
    setTimeout(() => {
      $('#run-screener-btn').addEventListener('click', runScreener);
      $('#reset-screener-btn').addEventListener('click', resetScreener);
      initStockSearch();
      renderUserStockList();
    }, 0);
  }

  // ─── Stock Search & Add ───
  function initStockSearch() {
    const input = $('#stock-search-input');
    const dropdown = $('#stock-search-dropdown');
    if (!input || !dropdown) {
      console.warn('initStockSearch: input or dropdown not found');
      return;
    }

    let searchTimer;

    input.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = input.value.trim();
      if (q.length < 1) {
        dropdown.classList.remove('active');
        dropdown.innerHTML = '';
        return;
      }
      searchTimer = setTimeout(() => {
        const results = searchMerged(q);
        if (results.length === 0) {
          // Allow adding arbitrary stock by code/name
          dropdown.innerHTML = `<div class="search-item search-new" data-code="${q}" data-name="${q}">➕ 添加: "${q}"</div>`;
          dropdown.classList.add('active');
          return;
        }
        dropdown.innerHTML = results.slice(0, 10).map(s => `
          <div class="search-item" data-code="${s.code}" data-name="${s.name}">
            <span class="search-code">${s.code}</span>
            <span class="search-name">${s.name}</span>
            <span class="search-sector">${s.sector}</span>
          </div>
        `).join('');
        dropdown.classList.add('active');
      }, 200);
    });

    // Pick from dropdown
    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.search-item');
      if (!item) return;
      const code = item.dataset.code;
      const name = item.dataset.name;
      input.value = name + ' (' + code + ')';
      input.dataset.selectedCode = code;
      input.dataset.selectedName = name;
      dropdown.classList.remove('active');
      dropdown.innerHTML = '';
      // Auto-add when picking from dropdown
      addUserStockFromInput();
    });

    // Close dropdown on blur
    input.addEventListener('blur', () => {
      setTimeout(() => {
        dropdown.classList.remove('active');
      }, 250);
    });

    // Add button — use the panel as delegate to survive re-renders
    const panel = document.getElementById('tab-screener');
    if (panel) {
      panel.addEventListener('click', (e) => {
        if (e.target.id === 'add-stock-btn') {
          e.preventDefault();
          addUserStockFromInput();
        }
      });
    }
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addUserStockFromInput();
      }
    });
  }

  function addUserStockFromInput() {
    try {
      const input = $('#stock-search-input');
      if (!input) { showToast('输入框未找到', 'error'); return; }

      let code = input.dataset.selectedCode;
      const rawValue = input.value.trim();
      let name = input.dataset.selectedName || rawValue.replace(/\s*\(.*?\)\s*/g, '').trim();

      if (!code) {
        const match6 = rawValue.match(/(\d{6})/);
        if (match6) {
          code = match6[1];
          if (!name || name === code) name = rawValue;
        } else {
          const found = getAllStocksMerged().find(s => s.name === rawValue || s.code === rawValue);
          if (found) { showToast('"' + found.name + '" 已在候选池中', 'info'); input.value = ''; return; }
          code = rawValue; name = rawValue;
        }
      }

      if (!code) { showToast('请输入股票代码或名称', 'info'); return; }

      // If stock exists in built-in universe, can't add
      if (DataLayer.getStock(code)) { showToast('该股票已在候选池中', 'info'); input.value = ''; return; }

      // If stock already in user stocks with stale data, open edit form
      const existingUserStock = state.userStocks.find(s => s.code === code);
      if (existingUserStock) {
        showStockConfirmForm(code, existingUserStock.name, existingUserStock);
        input.value = '';
        return;
      }

      // Show confirmation form for new stock
      showStockConfirmForm(code, name);
    } catch (e) {
      console.error('addUserStockFromInput error:', e);
      showToast('添加失败: ' + e.message, 'error');
    }
  }

  // ─── Stock Confirmation Form ───
  function showStockConfirmForm(code, name, existingStock) {
    document.getElementById('stock-confirm-form')?.remove();
    const isEdit = !!existingStock;
    const defaultHolder = existingStock ? existingStock.holderType : '';
    const defaultSector = existingStock ? existingStock.sector : '';
    const titleText = isEdit ? '编辑股票信息' : '确认股票信息';
    const btnText = isEdit ? '保存修改' : '确认添加';

    const form = document.createElement('div');
    form.id = 'stock-confirm-form';
    form.className = 'stock-confirm-form';
    form.innerHTML =
      '<div class="confirm-header">' + titleText + '</div>' +
      '<div class="confirm-body">' +
        '<div class="confirm-row"><span class="confirm-label">代码</span><span class="confirm-value mono">' + code + '</span></div>' +
        '<div class="confirm-row"><span class="confirm-label">名称</span><span class="confirm-value">' + name + '</span></div>' +
        '<div class="confirm-row">' +
          '<span class="confirm-label">企业性质 <span class="required">*</span></span>' +
          '<select id="cf-holder-type" class="confirm-select">' +
            '<option value="">— 请选择 —</option>' +
            '<option value="央企"' + (defaultHolder === '央企' ? ' selected' : '') + '>央企（国务院国资委）</option>' +
            '<option value="省国资委"' + (defaultHolder === '省国资委' ? ' selected' : '') + '>省国资委控股</option>' +
            '<option value="地市国资委"' + (defaultHolder === '地市国资委' ? ' selected' : '') + '>地市级国资委</option>' +
            '<option value="民营"' + (defaultHolder === '民营' ? ' selected' : '') + '>民营</option>' +
            '<option value="外资"' + (defaultHolder === '外资' ? ' selected' : '') + '>外资</option>' +
            '<option value="其他"' + (defaultHolder === '其他' ? ' selected' : '') + '>其他</option>' +
          '</select>' +
          '<div class="confirm-hint">Gate 1：央企/省国资委/地市国资委 → 通过 ✓</div>' +
        '</div>' +
        '<div class="confirm-row">' +
          '<span class="confirm-label">行业 <span class="required">*</span></span>' +
          '<select id="cf-sector" class="confirm-select">' +
            '<option value="">— 请选择 —</option>' +
            '<optgroup label="★ 战略商品（Gate 2 通过 + 高分）">' +
              '<option value="稀土"' + (defaultSector === '稀土' ? ' selected' : '') + '>稀土</option>' +
              '<option value="钨"' + (defaultSector === '钨' ? ' selected' : '') + '>钨</option>' +
              '<option value="锑"' + (defaultSector === '锑' ? ' selected' : '') + '>锑</option>' +
              '<option value="钼"' + (defaultSector === '钼' ? ' selected' : '') + '>钼</option>' +
              '<option value="钴"' + (defaultSector === '钴' ? ' selected' : '') + '>钴</option>' +
              '<option value="锂"' + (defaultSector === '锂' ? ' selected' : '') + '>锂</option>' +
              '<option value="钛"' + (defaultSector === '钛' ? ' selected' : '') + '>钛</option>' +
              '<option value="铀"' + (defaultSector === '铀' ? ' selected' : '') + '>铀</option>' +
              '<option value="黄金"' + (defaultSector === '黄金' ? ' selected' : '') + '>黄金</option>' +
              '<option value="石油天然气"' + (defaultSector === '石油天然气' ? ' selected' : '') + '>石油天然气</option>' +
              '<option value="煤炭"' + (defaultSector === '煤炭' ? ' selected' : '') + '>煤炭</option>' +
              '<option value="钾肥"' + (defaultSector === '钾肥' ? ' selected' : '') + '>钾肥</option>' +
              '<option value="磷化工"' + (defaultSector === '磷化工' ? ' selected' : '') + '>磷化工</option>' +
            '</optgroup>' +
            '<optgroup label="商品类（Gate 2 通过）">' +
              '<option value="铜"' + (defaultSector === '铜' ? ' selected' : '') + '>铜</option>' +
              '<option value="铝"' + (defaultSector === '铝' ? ' selected' : '') + '>铝</option>' +
              '<option value="铅锌"' + (defaultSector === '铅锌' ? ' selected' : '') + '>铅锌</option>' +
              '<option value="锡"' + (defaultSector === '锡' ? ' selected' : '') + '>锡</option>' +
              '<option value="镍"' + (defaultSector === '镍' ? ' selected' : '') + '>镍</option>' +
              '<option value="钢铁"' + (defaultSector === '钢铁' ? ' selected' : '') + '>钢铁</option>' +
              '<option value="水泥"' + (defaultSector === '水泥' ? ' selected' : '') + '>水泥</option>' +
              '<option value="电力"' + (defaultSector === '电力' ? ' selected' : '') + '>电力</option>' +
              '<option value="化工"' + (defaultSector === '化工' ? ' selected' : '') + '>化工</option>' +
              '<option value="农业"' + (defaultSector === '农业' ? ' selected' : '') + '>农业</option>' +
            '</optgroup>' +
            '<optgroup label="非商品类（Gate 2 不通过）">' +
              '<option value="金融"' + (defaultSector === '金融' ? ' selected' : '') + '>金融</option>' +
              '<option value="科技"' + (defaultSector === '科技' ? ' selected' : '') + '>科技/AI/芯片</option>' +
              '<option value="消费"' + (defaultSector === '消费' ? ' selected' : '') + '>消费品</option>' +
              '<option value="医药"' + (defaultSector === '医药' ? ' selected' : '') + '>医药</option>' +
              '<option value="房地产"' + (defaultSector === '房地产' ? ' selected' : '') + '>房地产</option>' +
              '<option value="军工"' + (defaultSector === '军工' ? ' selected' : '') + '>军工/船舶/航空航天</option>' +
              '<option value="其他"' + (defaultSector === '其他' ? ' selected' : '') + '>其他行业</option>' +
            '</optgroup>' +
          '</select>' +
          '<div class="confirm-hint">Gate 2：战略商品 / 商品类行业 → 通过 ✓</div>' +
        '</div>' +
        '<div class="confirm-row">' +
          '<div class="confirm-actions">' +
            '<button class="btn" id="cf-confirm-btn">' + btnText + '</button> ' +
            '<button class="btn btn-outline btn-sm" id="cf-cancel-btn">取消</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.querySelector('.add-stock-body')?.appendChild(form);

    // Scroll form into view
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    document.getElementById('cf-confirm-btn').onclick = function() {
      if (isEdit) {
        confirmEditStock(code, name, existingStock);
      } else {
        confirmAddStock(code, name);
      }
    };
    document.getElementById('cf-cancel-btn').onclick = function() {
      document.getElementById('stock-confirm-form')?.remove();
      const inp = $('#stock-search-input');
      if (inp) { inp.value = ''; delete inp.dataset.selectedCode; }
    };
  }

  function confirmAddStock(code, name) {
    const holderType = document.getElementById('cf-holder-type').value;
    const sector = document.getElementById('cf-sector').value;
    if (!holderType) { showToast('请选择企业性质', 'info'); return; }
    if (!sector) { showToast('请选择行业分类', 'info'); return; }

    const holderMap = { '央企':'国务院国资委','省国资委':holderType + '控股','地市国资委':holderType + '控股','民营':'民营股东','外资':'外资股东','其他':'待确认' };
    const strategicSectors = ['稀土','钨','锑','钼','钴','锂','钛','黄金','石油天然气','煤炭','钾肥','磷化工'];

    const newStock = {
      code: code,
      name: name || code,
      sector: sector,
      mktCap: 50 + Math.random() * 200,
      peTTM: 10 + Math.random() * 20,
      pb: 1 + Math.random() * 3,
      roe: 5 + Math.random() * 15,
      holder: holderMap[holderType] || holderType,
      holderType: holderType,
      natlStrategic: strategicSectors.indexOf(sector) >= 0,
      grossMargin: 15 + Math.random() * 25,
      netProfit3y: 1 + Math.random() * 4,
      debtRatio: 35 + Math.random() * 25,
      cashFlowRatio: 0.5 + Math.random() * 0.5,
      prodPrice5yPct: 30 + Math.random() * 40,
      isUserAdded: true,
    };

    state.userStocks.push(newStock);
    saveUserStocks();

    document.getElementById('stock-confirm-form')?.remove();
    const input = $('#stock-search-input');
    if (input) { input.value = ''; delete input.dataset.selectedCode; }

    showToast('✅ 已添加 "' + (name || code) + '"', 'success');
    renderUserStockList();
    updateStockCount();
    runScreener();
  }

  /** Edit an existing user-added stock (fix stale data) */
  function confirmEditStock(code, name, existingStock) {
    const holderType = document.getElementById('cf-holder-type').value;
    const sector = document.getElementById('cf-sector').value;
    if (!holderType) { showToast('请选择企业性质', 'info'); return; }
    if (!sector) { showToast('请选择行业分类', 'info'); return; }

    const holderMap = { '央企':'国务院国资委','省国资委':holderType + '控股','地市国资委':holderType + '控股','民营':'民营股东','外资':'外资股东','其他':'待确认' };
    const strategicSectors = ['稀土','钨','锑','钼','钴','锂','钛','黄金','石油天然气','煤炭','钾肥','磷化工'];

    const idx = state.userStocks.indexOf(existingStock);
    if (idx === -1) { showToast('未找到该股票', 'error'); return; }

    state.userStocks[idx].sector = sector;
    state.userStocks[idx].holder = holderMap[holderType] || holderType;
    state.userStocks[idx].holderType = holderType;
    state.userStocks[idx].natlStrategic = strategicSectors.indexOf(sector) >= 0;
    saveUserStocks();

    document.getElementById('stock-confirm-form')?.remove();
    showToast('✅ 已更新 "' + (name || code) + '" 信息', 'success');
    renderUserStockList();
    runScreener();
  }

  function renderUserStockList() {
    const container = $('#user-stock-list');
    if (!container) return;

    if (state.userStocks.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="user-stock-label">已添加的自选股 (${state.userStocks.length})：</div>
      <div class="user-stock-tags">
        ${state.userStocks.map(s => {
          const isStale = s.sector === '自定义' || s.holderType === '其他';
          return `<span class="user-stock-tag ${isStale ? 'stale' : ''}" title="${s.code} · ${s.sector}">
            ${isStale ? '⚠️ ' : ''}${s.name}
            <button class="user-stock-edit" data-code="${s.code}">✏️</button>
            <button class="user-stock-remove" data-code="${s.code}">&times;</button>
          </span>`;
        }).join('')}
      </div>
    `;

    // Bind remove buttons
    container.querySelectorAll('.user-stock-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        state.userStocks = state.userStocks.filter(s => s.code !== code);
        saveUserStocks();
        renderUserStockList();
        updateStockCount();
        showToast('已移除 "' + code + '"', 'info');
      });
    });

    // Bind edit buttons
    container.querySelectorAll('.user-stock-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        const stock = state.userStocks.find(s => s.code === code);
        if (stock) {
          showStockConfirmForm(stock.code, stock.name, stock);
        }
      });
    });
  }

  function updateStockCount() {
    const el = $('.stat-item:first-child .stat-num');
    if (el) el.textContent = getAllStocksMerged().length;
  }

  async function runScreener() {
    if (state.isScreening) return;
    state.isScreening = true;

    const btn = $('#screener-btn-text');
    const spinner = $('#screener-spinner');
    if (btn) btn.style.display = 'none';
    if (spinner) spinner.style.display = 'inline-block';

    // Simulate async processing
    await new Promise(r => setTimeout(r, 600));

    const stocks = getAllStocksMerged();
    const count = parseInt($('#result-count-select')?.value || '50');
    const topN = Screener.getTopN(stocks, count);

    state.screeningResults = topN;

    renderScreenerResults(topN, stocks.length);

    if (btn) btn.style.display = 'inline';
    if (spinner) spinner.style.display = 'none';
    state.isScreening = false;
  }

  function renderScreenerResults(results, total) {
    const container = $('#screener-results');
    if (!container) return;

    // Apply current sort
    const sorted = sortResults(results);

    const passedHard = sorted.filter(r => r.hardGatesPassed);
    const avgScore = sorted.length > 0
      ? Math.round(sorted.reduce((s, r) => s + r.relevanceScore, 0) / sorted.length)
      : 0;

    // Update stats
    const passedEl = $('#passed-count');
    const topEl = $('#top-score');
    const avgEl = $('#avg-score');
    if (passedEl) passedEl.textContent = passedHard.length;
    if (topEl) topEl.textContent = sorted.length > 0 ? sorted[0].relevanceScore : '-';
    if (avgEl) avgEl.textContent = avgScore;

    if (sorted.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:3rem 0;color:var(--ink3);"><p>没有找到符合条件的股票。</p></div>`;
      return;
    }

    let html = `
      <div style="margin-bottom:0.75rem;font-family:var(--sans);font-size:12px;color:var(--ink3);display:flex;justify-content:space-between;flex-wrap:wrap;">
        <span>共筛选 ${sorted.length} 只股票 | 通过硬性条件(国企+商品行业): ${passedHard.length} 只</span>
        <span style="font-size:11px;color:var(--ink3);">
          排序: <select id="sort-select">
            <option value="relevanceScore">相关度 (默认)</option>
            <option value="action">建议</option>
            <option value="code">代码</option>
            <option value="name">名称</option>
            <option value="peTTM">PE</option>
          </select>
        </span>
      </div>
      <div class="results-table-wrap">
        <table class="results-table">
          <thead>
            <tr>
              <th>#</th>
              <th class="sortable" data-sort="code">代码</th>
              <th class="sortable" data-sort="name">名称</th>
              <th>行业</th>
              <th>控股</th>
              <th class="sortable" data-sort="relevanceScore">相关度</th>
              <th>关1</th><th>关2</th><th>关3</th><th>关4</th><th>关5</th>
              <th class="sortable sort-active" data-sort="action">建议</th>
              <th>详情</th>
            </tr>
          </thead>
          <tbody>
    `;

    sorted.forEach((r, i) => {
      const g = r.gates;
      const scoreBarWidth = Math.max(4, r.relevanceScore);

      html += `
        <tr>
          <td><span class="rank-num">${i + 1}</span></td>
          <td><span class="stock-code">${r.code}</span></td>
          <td><span class="stock-name">${r.name}</span></td>
          <td>${r.sector}</td>
          <td style="font-size:10px;">${r.holderType}</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-weight:600;color:${Utils.scoreColor(r.relevanceScore)};">${r.relevanceScore}</span>
              <div class="score-bar" style="width:${scoreBarWidth}px;background:${Utils.scoreColor(r.relevanceScore)};"></div>
            </div>
          </td>
          <td>${gateBadge(g.g1.passed)}</td>
          <td>${gateBadge(g.g2.passed)}</td>
          <td>${gateBadge(g.g3.passed)}</td>
          <td>${gateBadge(g.g4.passed)}</td>
          <td>${gateBadge(g.g5.passed)}</td>
          <td><span class="status-badge ${r.advice.actionClass}">${r.advice.action}</span></td>
          <td><button class="btn btn-outline btn-sm" data-detail="${r.code}">查看</button></td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;

    // Bind detail buttons
    container.querySelectorAll('[data-detail]').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.detail;
        const result = state.screeningResults.find(r => r.code === code);
        if (result) showDetailModal(result);
      });
    });

    // Bind sort dropdown
    const sortSelect = $('#sort-select');
    if (sortSelect) {
      sortSelect.value = state.sortKey;
      sortSelect.addEventListener('change', () => {
        state.sortKey = sortSelect.value;
        state.sortAsc = false;
        renderScreenerResults(state.screeningResults);
      });
    }

    // Bind sortable column headers
    container.querySelectorAll('.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (state.sortKey === key) {
          state.sortAsc = !state.sortAsc;
        } else {
          state.sortKey = key;
          state.sortAsc = false;
        }
        renderScreenerResults(state.screeningResults);
      });
    });
  }

  function sortResults(results) {
    const key = state.sortKey;
    const asc = state.sortAsc;
    const sorted = [...results];

    sorted.sort((a, b) => {
      let va, vb;
      switch (key) {
        case 'relevanceScore':
          va = a.relevanceScore;
          vb = b.relevanceScore;
          break;
        case 'action': {
          const order = { '强烈推荐买入': 5, '建议关注': 4, '可选择性关注': 3, '不符合基本条件': 1 };
          va = order[a.advice.action] || 0;
          vb = order[b.advice.action] || 0;
          break;
        }
        case 'code':
          va = a.code;
          vb = b.code;
          break;
        case 'name':
          va = a.name;
          vb = b.name;
          break;
        case 'peTTM':
          va = a.raw.peTTM || 999;
          vb = b.raw.peTTM || 999;
          break;
        default:
          va = a.relevanceScore;
          vb = b.relevanceScore;
      }
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  function gateBadge(passed) {
    return passed
      ? '<span class="tag-pass">✓</span>'
      : '<span class="tag-fail">✗</span>';
  }

  function resetScreener() {
    state.screeningResults = [];
    const container = $('#screener-results');
    if (container) {
      container.innerHTML = `<div style="text-align:center;padding:3rem 0;color:var(--ink3);font-family:var(--sans);font-size:13px;">点击「运行自动筛选」查看结果</div>`;
    }
    const passedEl = $('#passed-count');
    const topEl = $('#top-score');
    const avgEl = $('#avg-score');
    if (passedEl) passedEl.textContent = '-';
    if (topEl) topEl.textContent = '-';
    if (avgEl) avgEl.textContent = '-';
  }

  // ─── Detail Modal ───
  function showDetailModal(result) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'detail-modal';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const r = result;
    const g = r.gates;
    const s = r.raw;

    overlay.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" id="modal-close-btn">&times;</button>
        <div class="modal-title">${r.name} (${r.code})</div>
        <div class="modal-sub">${r.sector} · ${r.holderType}</div>

        <div class="stats-row" style="margin-bottom:1.25rem;">
          <div class="stat-item">
            <div class="stat-num" style="color:${Utils.scoreColor(r.relevanceScore)};">${r.relevanceScore}</div>
            <div class="stat-label">相关度评分</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">${s.peTTM}×</div>
            <div class="stat-label">PE (TTM)</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">${s.pb}×</div>
            <div class="stat-label">PB</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">${s.grossMargin}%</div>
            <div class="stat-label">毛利率</div>
          </div>
        </div>

        <div class="modal-section">
          <h4>五关筛选结果</h4>
          ${[
            { label: '关1 · 企业性质', passed: g.g1.passed, detail: g.g1.details },
            { label: '关2 · 行业筛选', passed: g.g2.passed, detail: g.g2.details },
            { label: '关3 · 基本面量化', passed: g.g3.passed, detail: g.g3.details },
            { label: '关4 · 周期判断', passed: g.g4.passed, detail: g.g4.details },
            { label: '关5 · 估值确认', passed: g.g5.passed, detail: g.g5.details },
          ].map(gate => `
            <div class="gate-result">
              <span class="${gate.passed ? 'icon-pass' : 'icon-fail'}">${gate.passed ? '●' : '○'}</span>
              <span><strong>${gate.label}</strong>: ${gate.detail}</span>
            </div>
          `).join('')}
        </div>

        <div class="advice-box">
          <h4>${r.advice.action}</h4>
          <p>${r.advice.summary}</p>
          ${r.advice.keyPoints ? `
            <div style="margin-top:0.75rem;">
              <strong style="font-size:11px;font-family:var(--sans);color:var(--green);text-transform:uppercase;letter-spacing:0.1em;">核心优势</strong>
              <ul style="margin:0.3rem 0 0 1.2rem;font-size:13px;color:var(--ink2);">
                ${r.advice.keyPoints.map(k => `<li>${k}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${r.advice.risks ? `
            <div style="margin-top:0.5rem;">
              <strong style="font-size:11px;font-family:var(--sans);color:var(--red);text-transform:uppercase;letter-spacing:0.1em;">风险提示</strong>
              <ul style="margin:0.3rem 0 0 1.2rem;font-size:13px;color:var(--ink2);">
                ${r.advice.risks.map(k => `<li>${k}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          <div style="margin-top:0.75rem;display:flex;gap:1rem;font-family:var(--sans);font-size:12px;color:var(--ink3);">
            <span>建议仓位: <strong>${r.advice.suggestedPosition}</strong></span>
            <span>持有周期: <strong>${r.advice.timeHorizon}</span>
            <span>置信度: <strong>${r.advice.confidence}</strong></span>
          </div>
        </div>

        <div style="margin-top:1rem;text-align:right;">
          <button class="btn btn-sm" onclick="closeModal()">关闭</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);

    // Close on Escape
    document.addEventListener('keydown', escHandler = (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ─── Toast notification ───
  function showToast(msg, type) {
    try {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:99999;display:flex;flex-direction:column;gap:0.5rem;pointer-events:none;';
        document.body.appendChild(container);
      }

      const bgColor = type === 'success' ? '#1a5c2a' : type === 'info' ? '#1a3a6b' : type === 'error' ? '#8b1a1a' : '#1a1a18';
      const toast = document.createElement('div');
      toast.style.cssText = 'padding:0.7rem 1.2rem;background:' + bgColor + ';color:#fff;font-family:Helvetica Neue,Arial,sans-serif;font-size:13px;border-radius:2px;box-shadow:0 2px 10px rgba(0,0,0,0.25);max-width:360px;line-height:1.5;';
      toast.textContent = msg;
      container.appendChild(toast);
      setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
      }, 3000);
    } catch(e) {
      console.error('showToast error:', e);
    }
  }

  let escHandler = null;

  function closeModal() {
    const overlay = document.getElementById('detail-modal');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    }
    if (escHandler) {
      document.removeEventListener('keydown', escHandler);
      escHandler = null;
    }
  }

  // ─── Global Events ───
  function bindGlobalEvents() {
    // Copy buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.copy-btn');
      if (!btn) return;
      const block = btn.closest('.prompt-block');
      if (!block) return;
      const text = block.innerText.replace('COPY\n', '').trim();
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'COPIED';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'COPY';
          btn.classList.remove('copied');
        }, 2000);
      }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btn.textContent = 'COPIED';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'COPY';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  }

  // ─── Public API ───
  return { init };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());

// Expose closeModal globally for inline onclick
window.closeModal = () => {
  const overlay = document.getElementById('detail-modal');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 200);
  }
};
