#!/bin/bash
# Auto-refresh Claude OAuth token for mi1k container
CONTAINER="mi1k"

docker compose -f /root/Production/apps/mi1k/docker-compose.yml exec -T server node -e "
const https = require('https');
const fs = require('fs');
const credPath = '/paperclip/.claude/.credentials.json';

let creds;
try { creds = JSON.parse(fs.readFileSync(credPath, 'utf8')); } catch { process.exit(0); }
const oauth = creds.claudeAiOauth;
if (!oauth || !oauth.refreshToken) process.exit(0);

// Always refresh if token expires within 6 hours
const sixHours = 6 * 60 * 60 * 1000;
if (oauth.expiresAt && (oauth.expiresAt - Date.now()) > sixHours) {
  console.log('Token still valid, expires:', new Date(oauth.expiresAt).toISOString());
  process.exit(0);
}

const data = JSON.stringify({
  grant_type: 'refresh_token',
  refresh_token: oauth.refreshToken,
  client_id: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
  scope: (oauth.scopes || ['user:inference','user:profile','user:sessions:claude_code']).join(' ')
});

const req = https.request({
  hostname: 'platform.claude.com',
  path: '/v1/oauth/token',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
  timeout: 15000
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const resp = JSON.parse(body);
      creds.claudeAiOauth = {
        ...oauth,
        accessToken: resp.access_token,
        refreshToken: resp.refresh_token || oauth.refreshToken,
        expiresAt: Date.now() + resp.expires_in * 1000
      };
      fs.writeFileSync(credPath, JSON.stringify(creds));
      console.log('Token refreshed. New expiry:', new Date(creds.claudeAiOauth.expiresAt).toISOString());
    } else {
      console.error('Refresh failed:', res.statusCode, body);
      process.exit(1);
    }
  });
});
req.on('error', (e) => { console.error('Error:', e.message); process.exit(1); });
req.write(data);
req.end();
" 2>&1
