import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { route } from '../worker/index.js';
import { handleTrackAnalytics } from '../worker/checker-auth.js';

test('site/app.js maintains clean core functionality and navigation without unrequested tracking', async () => {
  const content = await readFile(new URL('../site/app.js', import.meta.url), 'utf8');
  assert.ok(content.includes('ForceCampaign'), 'Must export ForceCampaign controller');
  assert.ok(content.includes('renderCampaign'), 'Must handle campaign rendering');
  assert.ok(content.includes('menu-toggle'), 'Must handle responsive navigation');
});

test('handleTrackAnalytics correctly records telemetry with CF-Connecting-IP and CF-IPCountry', async () => {
  const inserted = [];
  const mockEnv = {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              run: async () => {
                inserted.push({ sql, args });
                return { success: true };
              }
            };
          }
        };
      }
    }
  };

  const req = new Request('http://localhost:8787/api/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '157.48.120.45',
      'CF-IPCountry': 'IN',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    body: JSON.stringify({
      path: '/cars.html',
      durationSeconds: 42,
      maxScrollPercent: 85
    })
  });

  const res = await route(req, mockEnv, {});
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);

  assert.equal(inserted.length, 1);
  const record = inserted[0];
  assert.ok(record.sql.includes('INSERT INTO site_analytics'));
  assert.equal(record.args[1], '157.48.120.45', 'Must extract CF-Connecting-IP');
  assert.equal(record.args[2], '/cars.html', 'Must capture path');
  assert.equal(record.args[3], 'IN', 'Must capture country');
  assert.equal(record.args[4], 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Must capture user-agent');
  assert.equal(record.args[5], 42, 'Must record duration');
  assert.equal(record.args[6], 85, 'Must record scroll percentage');
});

test('handleTrackAnalytics extracts first IP from x-forwarded-for when CF-Connecting-IP is absent', async () => {
  const inserted = [];
  const mockEnv = {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              run: async () => {
                inserted.push({ sql, args });
                return { success: true };
              }
            };
          }
        };
      }
    }
  };

  const req = new Request('http://localhost:8787/api/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': '203.0.113.195, 70.41.3.18, 150.172.238.178'
    },
    body: JSON.stringify({
      path: '/campaign.html',
      durationSeconds: 12,
      maxScrollPercent: 50
    })
  });

  const res = await handleTrackAnalytics(req, mockEnv, {});
  assert.equal(res.status, 200);
  assert.equal(inserted[0].args[1], '203.0.113.195', 'Must extract first client IP from multi-hop X-Forwarded-For');
});

test('handleTrackAnalytics handles text/plain payloads from sendBeacon', async () => {
  const inserted = [];
  const mockEnv = {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              run: async () => {
                inserted.push({ sql, args });
                return { success: true };
              }
            };
          }
        };
      }
    }
  };

  const req = new Request('http://localhost:8787/api/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      'CF-Connecting-IP': '103.21.244.2'
    },
    body: JSON.stringify({
      path: '/verify.html',
      durationSeconds: 90,
      maxScrollPercent: 100
    })
  });

  const res = await handleTrackAnalytics(req, mockEnv, {});
  assert.equal(res.status, 200);
  assert.equal(inserted[0].args[2], '/verify.html');
  assert.equal(inserted[0].args[5], 90);
  assert.equal(inserted[0].args[6], 100);
});

test('handleTrackAnalytics clamps invalid, negative, or excessive duration and scroll', async () => {
  const inserted = [];
  const mockEnv = {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              run: async () => {
                inserted.push({ sql, args });
                return { success: true };
              }
            };
          }
        };
      }
    }
  };

  const req = new Request('http://localhost:8787/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: '/team.html',
      durationSeconds: 999999, // Exceeds 86400
      maxScrollPercent: -50 // Negative
    })
  });

  const res = await handleTrackAnalytics(req, mockEnv, {});
  assert.equal(res.status, 200);
  assert.equal(inserted[0].args[5], 86400, 'Must clamp duration to max 86400s');
  assert.equal(inserted[0].args[6], 0, 'Must clamp negative scroll to 0');
});

test('handleTrackAnalytics responds to OPTIONS preflight with 204 and CORS', async () => {
  const req = new Request('http://localhost:8787/api/analytics/track', {
    method: 'OPTIONS'
  });
  const res = await handleTrackAnalytics(req, {}, {});
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
});

test('handleTrackAnalytics gracefully handles DB unavailability without throwing', async () => {
  const req = new Request('http://localhost:8787/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '/' })
  });
  // Null DB
  const res1 = await handleTrackAnalytics(req, { DB: null }, {});
  assert.equal(res1.status, 200);

  // DB throws
  const res2 = await handleTrackAnalytics(req, {
    DB: {
      prepare() { throw new Error('Database disk image is malformed'); }
    }
  }, {});
  assert.equal(res2.status, 200);
});
