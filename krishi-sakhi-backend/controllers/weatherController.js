const weatherService = require('../services/weatherService');

// Parses and validates ?lat=&lon= (also accepts lng). Returns null after sending a 400.
const parseCoords = (src, res, example) => {
  const latRaw = src.lat;
  const lonRaw = src.lon !== undefined ? src.lon : src.lng;
  if (latRaw === undefined || lonRaw === undefined || latRaw === '' || lonRaw === '') {
    res.status(400).json({ success: false, error: 'Latitude and longitude are required', example });
    return null;
  }
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    res.status(400).json({ success: false, error: 'Latitude and longitude must be valid numbers' });
    return null;
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    res.status(400).json({ success: false, error: 'Latitude must be between -90 and 90 and longitude between -180 and 180' });
    return null;
  }
  return { lat, lon };
};

const fail = (res, error, message) => {
  const status = error.statusCode || 500;
  console.error(message, error.cause ? error.cause.message : error.message);
  res.status(status).json({ success: false, error: status === 500 ? message : error.message });
};

const getCurrentWeather = async (req, res) => {
  const c = parseCoords(req.query, res, '/api/weather/current?lat=10.5276&lon=76.2144');
  if (!c) return;
  try {
    const result = await weatherService.getWeatherData(c.lat, c.lon);
    res.json({ success: true, data: result.data, cached: result.cached });
  } catch (error) {
    fail(res, error, 'Failed to fetch weather data');
  }
};

const getWeatherForecast = async (req, res) => {
  const c = parseCoords(req.query, res, '/api/weather/forecast?lat=10.5276&lon=76.2144&days=7');
  if (!c) return;
  const days = Math.max(1, Math.min(parseInt(req.query.days, 10) || 7, 16));
  try {
    const result = await weatherService.getWeatherForecast(c.lat, c.lon, days);
    res.json({ success: true, data: result.data, requestedDays: days, cached: result.cached });
  } catch (error) {
    fail(res, error, 'Failed to fetch weather forecast');
  }
};

const getAgricultureInsights = async (req, res) => {
  const c = parseCoords(req.query, res, '/api/weather/agriculture?lat=10.5276&lon=76.2144&crop=rice');
  if (!c) return;
  try {
    const insights = await weatherService.getAgricultureWeatherInsights(c.lat, c.lon, req.query.crop);
    res.json({ success: true, data: insights.data, crop: req.query.crop || 'general' });
  } catch (error) {
    fail(res, error, 'Failed to fetch agriculture weather insights');
  }
};

const getWeatherAlerts = async (req, res) => {
  const c = parseCoords(req.query, res, '/api/weather/alerts?lat=10.5276&lon=76.2144');
  if (!c) return;
  try {
    const { data } = await weatherService.getWeatherData(c.lat, c.lon);
    res.json({
      success: true,
      data: { location: data.location, alerts: data.alerts, lastUpdated: data.source.lastUpdated, note: data.source.alertsNote }
    });
  } catch (error) {
    fail(res, error, 'Failed to fetch weather alerts');
  }
};

const getWeatherSummary = async (req, res) => {
  const { locations } = req.body || {};
  if (!Array.isArray(locations) || locations.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Locations array is required',
      example: { locations: [{ name: 'Thrissur', lat: 10.5276, lon: 76.2144 }] }
    });
  }
  if (locations.length > 10) {
    return res.status(400).json({ success: false, error: 'Maximum 10 locations allowed per request' });
  }

  const summaries = await Promise.all(locations.map(async (loc) => {
    const lat = Number(loc && loc.lat);
    const lon = Number(loc && (loc.lon !== undefined ? loc.lon : loc.lng));
    const name = (loc && loc.name) || `${lat}, ${lon}`;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { location: name, error: 'Missing or invalid coordinates' };
    try {
      const { data } = await weatherService.getWeatherData(lat, lon);
      return {
        location: name,
        coordinates: { lat, lon },
        weather: {
          temperature: data.current.temperature,
          condition: data.current.condition,
          humidity: data.current.humidity,
          precipitation: data.daily[0] ? data.daily[0].precipitation : null
        },
        agriculture: {
          soilMoisture: data.agriculture.soilMoisture,
          recommendation: data.agriculture.recommendations[0] ? data.agriculture.recommendations[0].message : null
        }
      };
    } catch (error) {
      return { location: name, error: error.message };
    }
  }));

  res.json({ success: true, data: { summaries, timestamp: new Date() } });
};

module.exports = {
  getCurrentWeather,
  getWeatherForecast,
  getAgricultureInsights,
  getWeatherSummary,
  getWeatherAlerts
};
