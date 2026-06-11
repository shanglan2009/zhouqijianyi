# EdgeOne 部署指南

## 方式一：静态站点（推荐 — 5分钟部署）

腾讯云 EdgeOne 支持直接托管静态站点，无需服务器。

### 步骤

1. **登录 EdgeOne 控制台** → 站点管理 → 选择/创建站点
2. **静态站点托管** → 开启 → 上传本项目的以下文件：
   - `index.html`
   - `css/style.css`
   - `js/utils.js`, `js/methodology.js`, `js/data-layer.js`, `js/screener.js`, `js/app.js`
3. **配置路由**：将根路径 `/` 指向 `index.html`
4. **（可选）配置 HTTPS**：自动或上传证书
5. **等待部署生效**（通常1-2分钟）

### 项目文件清单

```
zhouqijianyi/
├── index.html          ← 主入口，所有页面内容
├── css/style.css       ← 完整样式
├── js/
│   ├── utils.js        ← 工具函数
│   ├── methodology.js  ← 方法论数据定义
│   ├── data-layer.js   ← 数据层（含约50只模拟股票）
│   ├── screener.js     ← 五级漏斗筛选引擎
│   └── app.js          ← 主应用逻辑
└── edgeone/
    └── functions.js    ← （可选）Edge Function API 代理
```

## 方式二：纯静态部署（任何 CDN / GitHub Pages）

本应用是纯前端 SPA，可部署在任何静态托管平台：
- GitHub Pages
- Vercel / Netlify
- 阿里云 OSS / 腾讯云 COS
- 任意 CDN

## 方式三：EdgeOne + 实时数据API

如需连接实时行情数据，部署 `edgeone/functions.js` 到 EdgeOne Edge Functions：

1. **EdgeOne 控制台** → Edge Functions → 新建函数
2. 粘贴 `edgeone/functions.js` 内容
3. 关联路由：`/api/stock/*` → 本函数
4. 修改 `js/data-layer.js` 中的 `fetchPrices` 函数，改为调用 `/api/stock/quote`
