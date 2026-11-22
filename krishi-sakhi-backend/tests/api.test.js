// API tests using Node's built-in test runner (node --test).
// External services (Open-Meteo, SoilGrids, Nominatim, Gemini) are not called:
// axios is stubbed and GEMINI_API_KEY is empty, so the suite runs offline.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbFile = path.join(os.tmpdir(), `krishi-sakhi-test-${process.pid}.db`);
process.env.DB_PATH = dbFile;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.GEMINI_API_KEY = '';
process.env.SOILGRIDS_TIMEOUT_MS = '100';

const axios = require('axios');
const realGet = axios.get;

// Minimal Open-Meteo-shaped payload.
const meteo = (days = 7) => {
  const dates = Array.from({ length: days }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`);
  const fill = (v) => dates.map(() => v);
  return {
    elevation: 20,
    timezone: 'Asia/Kolkata',
    current: {
      time: '2026-01-01T10:00', temperature_2m: 30, relative_humidity_2m: 85, apparent_temperature: 33,
      precipitation: 0, weather_code: 63, cloud_cover: 70, surface_pressure: 1008, wind_speed_10m: 8,
      wind_direction_10m: 200, dew_point_2m: 24, visibility: 12000, uv_index: 5,
      soil_moisture_3_to_9cm: 0.12, soil_temperature_6cm: 28,
    },
    daily: {
      time: dates,
      weather_code: fill(63),
      temperature_2m_max: fill(32), temperature_2m_min: fill(24),
      precipitation_sum: [80, ...fill(2).slice(1)],
      precipitation_probability_max: fill(80),
      wind_speed_10m_max: fill(12), uv_index_max: fill(6),
      sunrise: fill('06:00'), sunset: fill('18:00'),
      et0_fao_evapotranspiration: fill(4), relative_humidity_2m_mean: fill(80),
    },
    hourly: { time: ['2026-01-01T00:00', '2026-01-01T10:00'], soil_moisture_3_to_9cm: [0.2, 0.12], soil_temperature_6cm: [26, 28] },
  };
};

let soilGridsUp = false;
axios.get = async (url, config = {}) => {
  if (url.includes('open-meteo')) {
    const days = config.params && config.params.past_days ? 31 : (config.params && config.params.forecast_days) || 7;
    return { data: meteo(days) };
  }
  if (url.includes('nominatim')) return { data: { address: { state_district: 'Thrissur', state: 'Kerala', country_code: 'in' } } };
  if (url.includes('soilgrids')) {
    if (!soilGridsUp) throw Object.assign(new Error('timeout'), { code: 'ECONNABORTED' });
    const layer = (name, mean, d) => ({ name, unit_measure: { d_factor: d }, depths: [{ values: { mean } }, { values: { mean } }] });
    return { data: { properties: { layers: [layer('phh2o', 55, 10), layer('soc', 120, 10), layer('clay', 300, 10), layer('sand', 400, 10), layer('silt', 300, 10), layer('nitrogen', 80, 100)] } } };
  }
  throw new Error(`Unexpected network call in tests: ${url}`);
};

const app = require('../app');
const { initializeDatabase, sequelize } = require('../config/db');

let server;
let base;

const call = async (method, url, { body, token, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(base + url, { method, headers, body: payload });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
};

before(async () => {
  await initializeDatabase();
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  axios.get = realGet;
  await new Promise((resolve) => server.close(resolve));
  await sequelize.close();
  fs.rmSync(dbFile, { force: true });
});

test('health endpoint reports database and AI status', async () => {
  const r = await call('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.database, 'ok');
  assert.equal(r.body.ai.configured, false);
});

test('unknown API route returns JSON 404 and bad JSON returns 400', async () => {
  assert.equal((await call('GET', '/does-not-exist')).status, 404);
  const bad = await call('POST', '/v1/analyze', { body: '{bad' });
  assert.equal(bad.status, 400);
  assert.match(bad.body.error, /not valid JSON/);
});

let token;
let otherToken;

test('registration validates input and returns a working token', async () => {
  assert.equal((await call('POST', '/auth/register', { body: { email: 'a@b.com', password: 'secret1' } })).status, 400);
  assert.equal((await call('POST', '/auth/register', { body: { name: 'Ann', email: 'not-an-email', password: 'secret1' } })).status, 400);
  assert.equal((await call('POST', '/auth/register', { body: { name: 'Ann', email: 'ann@example.com', password: '123' } })).status, 400);

  const r = await call('POST', '/auth/register', { body: { name: 'Ann Farmer', email: 'Ann@Example.com', password: 'secret1', role: 'admin' } });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.user.email, 'ann@example.com');
  assert.equal(r.body.data.user.role, 'farmer', 'public sign-up must not create admins');
  assert.equal(r.body.data.user.password, undefined);
  token = r.body.data.token;

  const dup = await call('POST', '/auth/register', { body: { name: 'Ann', email: 'ann@example.com', password: 'secret1' } });
  assert.equal(dup.status, 409);

  const other = await call('POST', '/auth/register', { body: { name: 'Bob Buyer', email: 'bob@example.com', password: 'secret2' } });
  otherToken = other.body.data.token;
});

test('login, profile, profile update and password change', async () => {
  assert.equal((await call('POST', '/auth/login', { body: { email: 'ann@example.com', password: 'wrong' } })).status, 401);
  const login = await call('POST', '/auth/login', { body: { email: 'ann@example.com', password: 'secret1' } });
  assert.equal(login.status, 200);

  assert.equal((await call('GET', '/auth/profile')).status, 401);
  assert.equal((await call('GET', '/auth/profile', { token: 'garbage' })).status, 401);
  const profile = await call('GET', '/auth/profile', { token });
  assert.equal(profile.body.data.user.name, 'Ann Farmer');

  const upd = await call('PUT', '/auth/profile', { token, body: { phone: '9999999999', location: 'Thrissur, Kerala', role: 'admin' } });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.data.user.phone, '9999999999');
  assert.equal(upd.body.data.user.role, 'farmer', 'role cannot be changed through the profile');

  assert.equal((await call('PUT', '/auth/change-password', { token, body: { currentPassword: 'nope', newPassword: 'newpass1' } })).status, 401);
  assert.equal((await call('PUT', '/auth/change-password', { token, body: { currentPassword: 'secret1', newPassword: 'newpass1' } })).status, 200);
  assert.equal((await call('POST', '/auth/login', { body: { email: 'ann@example.com', password: 'newpass1' } })).status, 200);
});

test('farm analysis validates input', async () => {
  assert.equal((await call('POST', '/v1/analyze', { body: {} })).status, 400);
  assert.equal((await call('POST', '/v1/analyze', { body: { latitude: 'x', longitude: 76, acres: 1 } })).status, 400);
  assert.equal((await call('POST', '/v1/analyze', { body: { latitude: 95, longitude: 76, acres: 1 } })).status, 400);
  assert.equal((await call('POST', '/v1/analyze', { body: { latitude: 10, longitude: 76, acres: 0 } })).status, 400);
});

test('farm analysis falls back to labelled estimates when SoilGrids is down', async () => {
  soilGridsUp = false;
  const r = await call('POST', '/v1/analyze', { token, body: { latitude: 10.52, longitude: 76.21, acres: 2 } });
  assert.equal(r.status, 200);
  const d = r.body.data;
  assert.ok(d.soil_properties.texture, 'texture must be present');
  assert.equal(typeof d.soil_properties.ph, 'number');
  assert.equal(typeof d.groundwater.depth_meters, 'number');
  assert.equal(d.data_sources.soil, 'estimated');
  assert.equal(d.data_sources.climate, 'Open-Meteo');
  assert.equal(d.climate.rainfall_last_30_days_mm, 80 + 2 * 29);
  assert.ok(Array.isArray(d.recommendations));

  // Same location -> same estimate (deterministic)
  const again = await call('POST', '/v1/analyze', { body: { latitude: 10.52, longitude: 76.21, acres: 2 } });
  assert.equal(again.body.data.soil_properties.texture, d.soil_properties.texture);
});

test('farm analysis uses SoilGrids values when available', async () => {
  soilGridsUp = true;
  const r = await call('POST', '/v1/analyze', { token, body: { latitude: 12.97, longitude: 77.59, acres: 1 } });
  soilGridsUp = false;
  const d = r.body.data;
  assert.equal(d.data_sources.soil, 'ISRIC SoilGrids 2.0');
  assert.equal(d.soil_properties.ph, 5.5);
  assert.equal(d.soil_properties.texture, 'Clay Loam');
  assert.equal(d.soil_properties.organic_carbon_percent, 1.2);
  assert.equal(d.nutrient_levels.nitrogen, 'Low');
  assert.ok(d.recommendations.some((x) => /acidic/.test(x.message)));
});

test('farm analysis history requires login and returns own reports', async () => {
  assert.equal((await call('GET', '/v1/analyze/history')).status, 401);
  const h = await call('GET', '/v1/analyze/history', { token });
  assert.equal(h.status, 200);
  assert.equal(h.body.data.length, 2);
  const other = await call('GET', '/v1/analyze/history', { token: otherToken });
  assert.equal(other.body.data.length, 0);
});

test('weather endpoints return live-shaped data with derived advice', async () => {
  assert.equal((await call('GET', '/weather/current')).status, 400);
  assert.equal((await call('GET', '/weather/current?lat=abc&lon=76')).status, 400);
  const cur = await call('GET', '/weather/current?lat=10.52&lon=76.21');
  assert.equal(cur.status, 200);
  assert.equal(cur.body.data.location.name, 'Thrissur, Kerala');
  assert.equal(cur.body.data.current.condition, 'Light Rain');
  assert.equal(cur.body.data.agriculture.soilMoisture, 12);
  assert.ok(cur.body.data.alerts.some((a) => /Heavy rain/.test(a.title)), 'heavy rain alert expected for 80 mm');
  assert.ok(cur.body.data.agriculture.recommendations.some((r) => /Postpone irrigation/.test(r.message)));

  const fc = await call('GET', '/weather/forecast?lat=10.52&lon=76.21&days=5');
  assert.equal(fc.status, 200);
  assert.equal(fc.body.data.forecast.length, 5);
});

test('chatbot validates input and reports a clear 503 when AI is not configured', async () => {
  assert.equal((await call('POST', '/chat/message', { body: {} })).status, 400);
  assert.equal((await call('POST', '/chat/message', { body: { message: 'x'.repeat(4001) } })).status, 400);
  const r = await call('POST', '/chat/message', { body: { message: 'What should I sow in June?' } });
  assert.equal(r.status, 503);
  assert.match(r.body.error, /GEMINI_API_KEY/);
  assert.equal((await call('GET', '/chat/sessions')).status, 401);
  assert.equal((await call('GET', '/chat/sessions', { token })).status, 200);
});

test('crop analysis rejects missing or unsupported files', async () => {
  assert.equal((await call('POST', '/crop-analysis/analyze', { form: new FormData() })).status, 400);
  const fd = new FormData();
  fd.append('image', new Blob(['hello'], { type: 'text/plain' }), 'note.txt');
  const r = await call('POST', '/crop-analysis/analyze', { form: fd });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /JPEG, PNG/);

  const png = new FormData();
  png.append('image', new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }), 'leaf.png');
  const noKey = await call('POST', '/crop-analysis/analyze', { form: png });
  assert.equal(noKey.status, 503);
  assert.equal((await call('GET', '/crop-analysis/history')).status, 401);
});

test('marketplace: seeded listings, create, ownership checks, delete', async () => {
  const list = await call('GET', '/marketplace/products');
  assert.equal(list.status, 200);
  assert.equal(list.body.data.pagination.totalProducts, 3);

  assert.equal((await call('POST', '/marketplace/products', { body: { title: 'x' } })).status, 401);
  assert.equal((await call('POST', '/marketplace/products', { token, body: { title: 'Rice' } })).status, 400);
  assert.equal((await call('POST', '/marketplace/products', {
    token, body: { title: 'Bad unit', description: 'd', category: 'crops', price: 1, unit: 'bucket', quantity: 1 },
  })).status, 400);

  const created = await call('POST', '/marketplace/products', {
    token, body: { title: 'Fresh Tomatoes', description: 'Farm fresh', category: 'crops', price: 30, unit: 'kg', quantity: 50 },
  });
  assert.equal(created.status, 201);
  const id = created.body.data.product.id;
  assert.equal(created.body.data.product.seller.name, 'Ann Farmer');

  const search = await call('GET', '/marketplace/products?search=tomato');
  assert.equal(search.body.data.products.length, 1);
  const mine = await call('GET', '/marketplace/products?mine=true', { token });
  assert.equal(mine.body.data.products.length, 1);

  assert.equal((await call('PUT', `/marketplace/products/${id}`, { token: otherToken, body: { price: 1 } })).status, 403);
  assert.equal((await call('DELETE', `/marketplace/products/${id}`, { token: otherToken })).status, 403);
  const upd = await call('PUT', `/marketplace/products/${id}`, { token, body: { price: 35, sellerId: 999 } });
  assert.equal(upd.body.data.product.price, 35);
  assert.equal(upd.body.data.product.sellerId, upd.body.data.product.seller.id, 'sellerId cannot be reassigned');
  assert.equal((await call('DELETE', `/marketplace/products/${id}`, { token })).status, 200);
  assert.equal((await call('GET', `/marketplace/products/${id}`)).status, 404);
});

test('community forum: read, post, like once, comment', async () => {
  const posts = await call('GET', '/community/forum/posts');
  assert.equal(posts.status, 200);
  assert.equal(posts.body.data.length, 3);

  assert.equal((await call('POST', '/community/forum/posts', { body: { title: 'Hi', content: 'x' } })).status, 401);
  assert.equal((await call('POST', '/community/forum/posts', { token, body: { title: 'Help', content: 'x', category: 'nope' } })).status, 400);
  const created = await call('POST', '/community/forum/posts', { token, body: { title: 'Leaf curl in chilli', content: 'What should I spray?', category: 'crop-disease' } });
  assert.equal(created.status, 201);
  const id = created.body.data.id;

  const like1 = await call('POST', `/community/forum/${id}/like`, { token });
  const like2 = await call('POST', `/community/forum/${id}/like`, { token });
  assert.equal(like1.body.likes, 1);
  assert.equal(like2.body.likes, 1);
  assert.equal(like2.body.liked, false);

  assert.equal((await call('POST', `/community/forum/${id}/comment`, { body: { comment: 'hi' } })).status, 401);
  const c = await call('POST', `/community/forum/${id}/comment`, { token: otherToken, body: { comment: 'Use neem oil' } });
  assert.equal(c.status, 201);
  const after = await call('GET', '/community/forum/posts?category=crop-disease');
  const post = after.body.data.find((p) => p.id === id);
  assert.equal(post.comments, 1);
  assert.equal(post.replies[0].author, 'Bob Buyer');
});

test('expert booking validates and stores requests', async () => {
  assert.equal((await call('POST', '/community/experts/book', { body: { expertId: 1, date: '2020-01-01', time: '10:00' } })).status, 400);
  assert.equal((await call('POST', '/community/experts/book', { body: { expertId: 'x', date: '2099-01-01', time: '10:00' } })).status, 400);
  const ok = await call('POST', '/community/experts/book', { token, body: { expertId: 1, date: '2099-01-01', time: '10:00', consultationType: 'audio', issue: 'Leaf curl' } });
  assert.equal(ok.status, 201);
  const mine = await call('GET', '/community/experts/bookings', { token });
  assert.equal(mine.body.data.length, 1);
});

test('my farm: knowledge base, diary, auto reminders, advisory', async () => {
  const kb = await call('GET', '/farm/knowledge?crop=paddy');
  assert.equal(kb.status, 200);
  assert.ok(kb.body.data.crops.rice);
  assert.equal((await call('GET', '/farm/knowledge?crop=unobtainium')).status, 404);
  assert.equal((await call('GET', '/farm/prices?commodity=Banana')).status, 503, 'prices need DATA_GOV_IN_API_KEY');

  assert.equal((await call('GET', '/farm/activities')).status, 401);
  assert.equal((await call('POST', '/farm/activities', { token, body: { type: 'dance', date: '2026-01-01' } })).status, 400);
  assert.equal((await call('POST', '/farm/activities', { token, body: { type: 'sowing', date: '2999-01-01' } })).status, 400);

  const todayIso = new Date().toISOString().slice(0, 10);
  const sow = await call('POST', '/farm/activities', { token, body: { type: 'sowing', crop: 'Paddy', date: todayIso, cost: 1200 } });
  assert.equal(sow.status, 201);
  assert.ok(sow.body.scheduledReminders >= 5, 'sowing rice schedules calendar reminders');

  await call('POST', '/farm/activities', { token, body: { type: 'pest-observation', crop: 'Paddy', date: todayIso, notes: 'stem borer dead hearts' } });
  const list = await call('GET', '/farm/activities', { token });
  assert.equal(list.body.data.length, 2);
  assert.equal((await call('GET', '/farm/activities', { token: otherToken })).body.data.length, 0);

  const rem = await call('POST', '/farm/reminders', { token, body: { title: 'Pay PMFBY premium', dueDate: todayIso } });
  assert.equal(rem.status, 201);
  assert.equal((await call('PATCH', `/farm/reminders/${rem.body.data.id}`, { token: otherToken, body: { done: true } })).status, 404);

  // Give the farm a location so advisory uses (stubbed) weather: 80 mm rain + 12% soil moisture
  await call('PUT', '/auth/profile', { token, body: { farmDetails: { lat: 10.52, lng: 76.21, crops: ['Paddy'], soilType: 'Clay loam', irrigation: 'canal' } } });
  const adv = await call('GET', '/farm/advisory', { token });
  assert.equal(adv.status, 200);
  const titles = adv.body.data.alerts.map((a) => a.title).join(' | ');
  assert.match(titles, /Rain expected/);
  assert.match(titles, /Follow up on your pest observation/);
  assert.match(titles, /Pay PMFBY premium/);
  assert.equal(adv.body.data.summary.spendLast60Days, 1200);

  assert.equal((await call('PATCH', `/farm/reminders/${rem.body.data.id}`, { token, body: { done: true } })).status, 200);
  assert.equal((await call('DELETE', `/farm/activities/${sow.body.data.id}`, { token: otherToken })).status, 404);
  assert.equal((await call('DELETE', `/farm/activities/${sow.body.data.id}`, { token })).status, 200);
});
