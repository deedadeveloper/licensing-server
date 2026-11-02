const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync('licensing.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    key TEXT PRIMARY KEY,
    client_name TEXT,
    status TEXT DEFAULT 'active',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/' && req.method === 'GET') {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(htmlPath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Error loading dashboard');
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  }
  else if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', database: 'native-sqlite' }));
  } 
  else if (url.pathname === '/api/licenses' && req.method === 'GET') {
    const stmt = db.prepare('SELECT * FROM licenses ORDER BY created_at DESC');
    const licenses = stmt.all();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(licenses));
  }
  else if (url.pathname === '/licenses' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { client_name, duration_days } = JSON.parse(body);
        if (!client_name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'client_name is required' }));
        }

        const key = crypto.randomUUID();
        let expires_at = null;
        if (duration_days && !isNaN(duration_days)) {
          const expDate = new Date();
          expDate.setDate(expDate.getDate() + Number(duration_days));
          expires_at = expDate.toISOString().slice(0, 19).replace('T', ' ');
        }

        const stmt = db.prepare('INSERT INTO licenses (key, client_name, status, expires_at) VALUES (?, ?, ?, ?)');
        stmt.run(key, client_name, 'active', expires_at);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ key, client_name, status: 'active', expires_at }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
  }
  else if (url.pathname.startsWith('/verify/') && req.method === 'GET') {
    const key = url.pathname.split('/')[2];
    if (!key) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'License key required' }));
    }

    const stmt = db.prepare('SELECT * FROM licenses WHERE key = ?');
    const license = stmt.get(key);

    if (!license) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ valid: false, error: 'License not found' }));
    }

    if (license.status !== 'active') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ valid: false, error: `License is ${license.status}`, license }));
    }

    if (license.expires_at) {
      const now = new Date();
      const expiration = new Date(license.expires_at + 'Z');
      if (now > expiration) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ valid: false, error: 'License has expired', license }));
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ valid: true, license }));
  }
  else if (url.pathname.startsWith('/revoke/') && req.method === 'POST') {
    const key = url.pathname.split('/')[2];
    if (!key) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'License key required' }));
    }

    const stmt = db.prepare('UPDATE licenses SET status = ? WHERE key = ?');
    const result = stmt.run('revoked', key);

    if (result.changes > 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: `License ${key} has been revoked` }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'License not found' }));
    }
  }
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Licensing server running on port ${PORT} with Static HTML/CSS Dashboard`);
});
