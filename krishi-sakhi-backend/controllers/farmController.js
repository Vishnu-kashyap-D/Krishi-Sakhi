// "My Farm": activity diary, reminders, personalised advisory, crop knowledge,
// schemes and market prices.
const axios = require('axios');
const { Op, ValidationError } = require('sequelize');
const { FarmActivity, Reminder, ForumPost } = require('../models');
const { CROPS, resolveCrop, SCHEMES } = require('../data/cropKnowledge');
const weatherService = require('../services/weatherService');

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const badRequest = (res, error) => res.status(400).json({ success: false, error });
const handle = (res, error, message) => {
  if (error instanceof ValidationError) return badRequest(res, error.errors.map((e) => e.message).join(', '));
  console.error(message, error);
  return res.status(500).json({ success: false, error: message });
};

// ---------- Activities ----------
const listActivities = async (req, res) => {
  try {
    const rows = await FarmActivity.findAll({
      where: { userId: req.user.id },
      order: [['date', 'DESC'], ['id', 'DESC']],
      limit: Math.min(parseInt(req.query.limit, 10) || 100, 500)
    });
    res.json({ success: true, data: rows });
  } catch (error) { handle(res, error, 'Failed to load activities'); }
};

const createActivity = async (req, res) => {
  try {
    const { type, crop, date, quantity, unit, cost, notes } = req.body || {};
    if (!FarmActivity.TYPES.includes(type)) return badRequest(res, `type must be one of: ${FarmActivity.TYPES.join(', ')}`);
    if (!isDate(date)) return badRequest(res, 'date must be YYYY-MM-DD');
    if (date > addDays(today(), 1)) return badRequest(res, 'Activities cannot be logged in the future; add a reminder instead');

    const activity = await FarmActivity.create({
      userId: req.user.id,
      type,
      crop: crop ? String(crop).slice(0, 60) : null,
      date,
      quantity: quantity === '' || quantity == null ? null : Number(quantity),
      unit: unit ? String(unit).slice(0, 20) : null,
      cost: cost === '' || cost == null ? null : Number(cost),
      notes: notes ? String(notes).slice(0, 1000) : null
    });

    // Sowing a known crop schedules its upcoming calendar operations as reminders.
    let scheduled = [];
    const key = type === 'sowing' ? resolveCrop(crop) : null;
    if (key) {
      const upcoming = CROPS[key].operations.filter((op) => op.day > 0 && addDays(date, op.day) >= today());
      scheduled = await Reminder.bulkCreate(upcoming.map((op) => ({
        userId: req.user.id,
        title: `${CROPS[key].name}: ${op.task}`,
        dueDate: addDays(date, op.day),
        category: 'crop-operation',
        source: 'calendar'
      })));
    }
    res.status(201).json({ success: true, data: activity, scheduledReminders: scheduled.length });
  } catch (error) { handle(res, error, 'Failed to save activity'); }
};

const deleteActivity = async (req, res) => {
  try {
    const n = await FarmActivity.destroy({ where: { id: req.params.id, userId: req.user.id } });
    if (!n) return res.status(404).json({ success: false, error: 'Activity not found' });
    res.json({ success: true });
  } catch (error) { handle(res, error, 'Failed to delete activity'); }
};

// ---------- Reminders ----------
const listReminders = async (req, res) => {
  try {
    const where = { userId: req.user.id };
    if (req.query.includeDone !== 'true') where.done = false;
    const rows = await Reminder.findAll({ where, order: [['dueDate', 'ASC']], limit: 200 });
    res.json({ success: true, data: rows });
  } catch (error) { handle(res, error, 'Failed to load reminders'); }
};

const createReminder = async (req, res) => {
  try {
    const { title, dueDate, category } = req.body || {};
    if (!title || !String(title).trim()) return badRequest(res, 'title is required');
    if (!isDate(dueDate)) return badRequest(res, 'dueDate must be YYYY-MM-DD');
    const r = await Reminder.create({ userId: req.user.id, title: String(title).trim(), dueDate, category: category || 'task', source: 'user' });
    res.status(201).json({ success: true, data: r });
  } catch (error) { handle(res, error, 'Failed to save reminder'); }
};

const updateReminder = async (req, res) => {
  try {
    const r = await Reminder.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!r) return res.status(404).json({ success: false, error: 'Reminder not found' });
    const { done, title, dueDate } = req.body || {};
    if (dueDate !== undefined && !isDate(dueDate)) return badRequest(res, 'dueDate must be YYYY-MM-DD');
    await r.update({
      ...(done !== undefined && { done: Boolean(done) }),
      ...(title !== undefined && { title: String(title).trim() }),
      ...(dueDate !== undefined && { dueDate })
    });
    res.json({ success: true, data: r });
  } catch (error) { handle(res, error, 'Failed to update reminder'); }
};

const deleteReminder = async (req, res) => {
  try {
    const n = await Reminder.destroy({ where: { id: req.params.id, userId: req.user.id } });
    if (!n) return res.status(404).json({ success: false, error: 'Reminder not found' });
    res.json({ success: true });
  } catch (error) { handle(res, error, 'Failed to delete reminder'); }
};

// ---------- Personalised advisory ----------
const farmCoordinates = (user) => {
  const fd = user.farmDetails || {};
  const loc = typeof user.location === 'object' && user.location ? user.location : {};
  const lat = Number(fd.lat ?? loc.lat);
  const lng = Number(fd.lng ?? loc.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0) ? { lat, lng } : null;
};

const locationWords = (user) => {
  const text = typeof user.location === 'string' ? user.location : [user.location?.district, user.location?.state].filter(Boolean).join(' ');
  return text.split(/[,\s]+/).map((w) => w.trim()).filter((w) => w.length > 3);
};

const getAdvisory = async (req, res) => {
  try {
    const user = req.user;
    const alerts = [];
    const fd = user.farmDetails || {};
    const crops = (fd.crops || []).map(String);
    const now = today();

    // Profile completeness
    const missing = [];
    if (!farmCoordinates(user)) missing.push('farm location on the map');
    if (!crops.length) missing.push('crops you grow');
    if (!fd.soilType) missing.push('soil type');
    if (!fd.irrigation) missing.push('irrigation source');
    if (missing.length) {
      alerts.push({ priority: 'medium', category: 'profile', title: 'Complete your farm profile', message: `Add your ${missing.join(', ')} so advice can be personalised.` });
    }

    const activities = await FarmActivity.findAll({ where: { userId: user.id, date: { [Op.gte]: addDays(now, -60) } }, order: [['date', 'DESC']] });
    const lastOf = (type) => activities.find((a) => a.type === type);

    // Weather-aware advice
    let weather = null;
    const coords = farmCoordinates(user);
    if (coords) {
      try {
        weather = (await weatherService.getWeatherData(coords.lat, coords.lng)).data;
      } catch (e) {
        alerts.push({ priority: 'low', category: 'weather', title: 'Weather unavailable', message: 'Could not fetch the forecast right now; advice below ignores weather.' });
      }
    }
    if (weather) {
      const next2 = weather.daily.slice(0, 2);
      const rain48 = next2.reduce((s, d) => s + (d.precipitation.amount || 0), 0);
      const rainProb = Math.max(...next2.map((d) => d.precipitation.probability || 0));
      const lastSpray = lastOf('pesticide') || lastOf('fertilizer');
      if (rainProb >= 60 || rain48 >= 10) {
        alerts.push({ priority: 'high', category: 'weather', title: 'Rain expected — hold spraying and fertiliser', message: `About ${Math.round(rain48)} mm of rain (up to ${rainProb}% chance) in the next 48 hours at your farm. Rain will wash off sprays and fertiliser.` });
        if (lastSpray && daysBetween(lastSpray.date, now) <= 1) {
          alerts.push({ priority: 'medium', category: 'weather', title: 'Recent application may wash off', message: `You applied ${lastSpray.type} on ${lastSpray.date}. Check the label for the rain-free period needed.` });
        }
      }
      weather.alerts.forEach((a) => alerts.push({ priority: a.severity === 'severe' ? 'high' : 'medium', category: 'weather', title: a.title, message: a.description }));

      const lastIrr = lastOf('irrigation');
      const sm = weather.agriculture.soilMoisture;
      if (fd.irrigation !== 'rainfed' && sm != null && sm < 15 && rain48 < 5) {
        const since = lastIrr ? `${daysBetween(lastIrr.date, now)} days ago` : 'not logged recently';
        alerts.push({ priority: 'high', category: 'irrigation', title: 'Soil is drying out', message: `Topsoil moisture is ${sm}% and little rain is due. Your last irrigation was ${since}. Irrigate early morning or evening.` });
      }
      const h = weather.current.humidity;
      if (h >= 80 && weather.current.temperature >= 20 && weather.current.temperature <= 32 && crops.length) {
        alerts.push({ priority: 'medium', category: 'pest', title: 'Disease-friendly weather', message: `Warm and humid conditions favour fungal diseases in ${crops.join(', ')}. Scout your field in the next two days.` });
      }
    }

    // Own pest observations without a follow-up action
    const lastPest = lastOf('pest-observation');
    if (lastPest && daysBetween(lastPest.date, now) <= 14) {
      const treated = activities.some((a) => a.type === 'pesticide' && a.date >= lastPest.date);
      if (!treated) {
        alerts.push({ priority: 'medium', category: 'pest', title: 'Follow up on your pest observation', message: `On ${lastPest.date} you noted: "${(lastPest.notes || lastPest.crop || 'pest').slice(0, 120)}". Check if it is spreading, or ask the AI assistant with a photo.` });
      }
    }

    // Nearby pest/disease reports from the community (last 14 days, same area)
    const words = locationWords(user);
    if (words.length) {
      const nearby = await ForumPost.findAll({
        where: {
          category: 'crop-disease',
          created_at: { [Op.gte]: new Date(Date.now() - 14 * 86400000) },
          userId: { [Op.or]: [{ [Op.ne]: user.id }, { [Op.is]: null }] },
          [Op.or]: words.map((w) => ({ authorLocation: { [Op.like]: `%${w}%` } }))
        },
        limit: 5,
        order: [['created_at', 'DESC']]
      });
      nearby.forEach((p) => alerts.push({ priority: 'medium', category: 'pest', title: `Pest report near you: ${p.title}`, message: `Posted by ${p.authorName} (${p.authorLocation}) in the community forum.`, link: '/community' }));
    }

    // Due / overdue reminders
    const due = await Reminder.findAll({ where: { userId: user.id, done: false, dueDate: { [Op.lte]: addDays(now, 3) } }, order: [['dueDate', 'ASC']] });
    due.forEach((r) => alerts.push({
      priority: r.dueDate < now ? 'high' : 'medium',
      category: 'reminder',
      title: r.dueDate < now ? `Overdue: ${r.title}` : `Due ${r.dueDate === now ? 'today' : r.dueDate}: ${r.title}`,
      message: r.dueDate < now ? `This was due on ${r.dueDate}.` : 'Coming up in the next few days.',
      reminderId: r.id
    }));

    // Seasonal guidance for the crops the farmer grows
    crops.forEach((c) => {
      const key = resolveCrop(c);
      if (key && !activities.some((a) => resolveCrop(a.crop) === key)) {
        alerts.push({ priority: 'low', category: 'calendar', title: `${CROPS[key].name}: season guide`, message: CROPS[key].seasons.map((s) => `${s.name}: sow ${s.sow}`).join(' · ') + '. Log your sowing to get automatic task reminders.' });
      }
    });

    const order = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => order[a.priority] - order[b.priority]);

    const spend = activities.reduce((s, a) => s + (a.cost || 0), 0);
    res.json({
      success: true,
      data: {
        alerts,
        summary: {
          activitiesLast60Days: activities.length,
          spendLast60Days: Math.round(spend),
          openReminders: await Reminder.count({ where: { userId: user.id, done: false } }),
          weather: weather ? { place: weather.location.name, temperature: weather.current.temperature, condition: weather.current.condition } : null
        }
      }
    });
  } catch (error) { handle(res, error, 'Failed to build advisory'); }
};

// ---------- Knowledge ----------
const getKnowledge = (req, res) => {
  const key = resolveCrop(req.query.crop);
  if (req.query.crop && !key) return res.status(404).json({ success: false, error: 'No calendar for that crop yet', available: Object.keys(CROPS) });
  const crops = key ? { [key]: CROPS[key] } : CROPS;
  res.json({ success: true, data: { crops, schemes: SCHEMES } });
};

// ---------- Market prices (data.gov.in Agmarknet, needs a free API key) ----------
const AGMARK_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const getPrices = async (req, res) => {
  const key = process.env.DATA_GOV_IN_API_KEY;
  if (!key) {
    return res.status(503).json({ success: false, error: 'Live mandi prices need a free data.gov.in API key. Set DATA_GOV_IN_API_KEY in the backend .env.' });
  }
  const commodity = String(req.query.commodity || '').trim();
  const state = String(req.query.state || 'Kerala').trim();
  if (!commodity) return badRequest(res, 'commodity is required');
  try {
    const { data } = await axios.get(AGMARK_URL, {
      params: { 'api-key': key, format: 'json', limit: 50, 'filters[state]': state, 'filters[commodity]': commodity },
      timeout: 12000
    });
    const records = (data.records || []).map((r) => ({
      market: r.market, district: r.district, variety: r.variety, date: r.arrival_date,
      minPrice: Number(r.min_price), maxPrice: Number(r.max_price), modalPrice: Number(r.modal_price), unit: '₹/quintal'
    }));
    res.json({ success: true, data: { commodity, state, records, source: 'Agmarknet via data.gov.in' } });
  } catch (error) {
    console.error('Price API error:', error.message);
    res.status(502).json({ success: false, error: 'Could not reach the data.gov.in price service.' });
  }
};

module.exports = {
  listActivities, createActivity, deleteActivity,
  listReminders, createReminder, updateReminder, deleteReminder,
  getAdvisory, getKnowledge, getPrices
};
