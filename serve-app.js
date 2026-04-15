const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 4200;
const STATIC_DIR = path.join(__dirname, 'apps/admin-web/dist/admin-web/browser');

// API 프록시 → NestJS (localhost:3000)
app.use(createProxyMiddleware({
  pathFilter: '/api',
  target: 'http://localhost:3000',
  changeOrigin: true,
}));

// Angular 정적 파일 서빙
app.use(express.static(STATIC_DIR));

// SPA 라우팅 fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`App running on http://localhost:${PORT}`);
});
