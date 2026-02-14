const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const STORE_PATH = path.join(__dirname, 'data', 'store.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const APP_CATEGORIES = ['social_media', 'third_party', 'other'];

function readStore() {
  if (!fs.existsSync(STORE_PATH)) return { users: {} };
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch {
    return { users: {} };
  }
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function toDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getRiskLevel(score) {
  if (score <= 2) return 'Low';
  if (score <= 5) return 'Moderate';
  if (score <= 8) return 'Elevated';
  return 'High';
}

function buildAnalytics(userData) {
  const totals = { social_media: 0, third_party: 0, other: 0 };
  const dailyMap = {};

  userData.events.forEach((event) => {
    totals[event.category] += 1;

    if (!dailyMap[event.day]) {
      dailyMap[event.day] = {
        social_media: 0,
        third_party: 0,
        other: 0,
        total: 0,
        score: 0
      };
    }

    dailyMap[event.day][event.category] += 1;
    dailyMap[event.day].total += 1;
    const weight = event.category === 'third_party' ? 3 : event.category === 'social_media' ? 2 : 1;
    dailyMap[event.day].score += weight;
  });

  const trend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, values]) => ({ day, ...values, riskLevel: getRiskLevel(values.score) }));

  return { totals, trend, totalEvents: userData.events.length, apps: userData.apps };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function getContentType(filePath) {
  const ext = path.extname(filePath);
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  const sanitizedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, sanitizedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === 'POST' && pathname === '/api/track') {
    try {
      const body = await parseBody(req);
      const { email, appName, category } = body;
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        sendJson(res, 400, { error: 'A valid email is required.' });
        return;
      }
      if (!appName || String(appName).trim().length < 2) {
        sendJson(res, 400, { error: 'appName is required.' });
        return;
      }
      if (!APP_CATEGORIES.includes(category)) {
        sendJson(res, 400, { error: `category must be one of: ${APP_CATEGORIES.join(', ')}` });
        return;
      }

      const store = readStore();
      if (!store.users[normalizedEmail]) {
        store.users[normalizedEmail] = { email: normalizedEmail, apps: {}, events: [] };
      }

      const day = toDayKey();
      const user = store.users[normalizedEmail];
      const appKey = String(appName).trim();

      if (!user.apps[appKey]) user.apps[appKey] = { category, visits: 0, lastVisitedDay: day };
      user.apps[appKey].category = category;
      user.apps[appKey].visits += 1;
      user.apps[appKey].lastVisitedDay = day;
      user.events.push({ timestamp: new Date().toISOString(), day, appName: appKey, category });

      writeStore(store);
      sendJson(res, 201, { message: 'Visit event recorded successfully.' });
      return;
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }
  }

  if (req.method === 'GET' && pathname === '/api/categories') {
    sendJson(res, 200, { categories: APP_CATEGORIES });
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/users/') && pathname.endsWith('/analytics')) {
    const email = normalizeEmail(decodeURIComponent(pathname.replace('/api/users/', '').replace('/analytics', '')));
    const store = readStore();
    const userData = store.users[email];
    if (!userData) {
      sendJson(res, 404, { error: 'No data found for that email.' });
      return;
    }

    sendJson(res, 200, { email, analytics: buildAnalytics(userData) });
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res, pathname);
    return;
  }

  res.writeHead(405);
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
