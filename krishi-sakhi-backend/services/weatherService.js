// Live weather from Open-Meteo (https://open-meteo.com, free, no API key) with
// farming advice derived from the forecast. Responses are cached in memory.
const axios = require('axios');

const OPEN_METEO_URL = process.env.OPEN_METEO_URL || 'https://api.open-meteo.com/v1/forecast';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_DAYS = 16;

const cache = new Map();
const placeCache = new Map();

// WMO weather interpretation codes -> condition names used by the frontend.
const describeCode = (code) => {
  if (code === 0) return ['Clear', 'Clear sky'];
  if (code === 1) return ['Sunny', 'Mainly clear'];
  if (code === 2) return ['Partly Cloudy', 'Partly cloudy'];
  if (code === 3) return ['Cloudy', 'Overcast'];
  if (code === 45 || code === 48) return ['Fog', 'Fog'];
  if ([51, 53, 55, 56, 57].includes(code)) return ['Light Rain', 'Drizzle'];
  if ([61, 80].includes(code)) return ['Light Rain', 'Light rain'];
  if ([63, 81].includes(code)) return ['Light Rain', 'Moderate rain'];
  if ([65, 82, 66, 67].includes(code)) return ['Heavy Rain', 'Heavy rain'];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ['Snow', 'Snow'];
  if ([95, 96, 99].includes(code)) return ['Thunderstorm', 'Thunderstorm'];
  return ['Partly Cloudy', 'Variable conditions'];
};

const round = (v, d = 1) => (v == null || Number.isNaN(v) ? null : Math.round(v * 10 ** d) / 10 ** d);

const cacheKey = (lat, lng, days) => `${lat.toFixed(2)},${lng.toFixed(2)},${days}`;

const reverseGeocode = async (lat, lng) => {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (placeCache.has(key)) return placeCache.get(key);
  let place = null;
  try {
    const { data } = await axios.get(NOMINATIM_URL, {
      params: { lat, lon: lng, format: 'json', zoom: 10, 'accept-language': 'en' },
      headers: { 'User-Agent': 'KrishiSakhi/2.0 (farm advisory app)' },
      timeout: 4000
    });
    const a = data && data.address ? data.address : {};
    place = {
      district: a.state_district || a.county || a.city || a.town || a.village || null,
      state: a.state || null,
      country: (a.country_code || '').toUpperCase() || null
    };
  } catch (error) {
    // Place names are optional; coordinates are always returned.
  }
  placeCache.set(key, place);
  return place;
};

const fetchForecast = async (lat, lng, days) => {
  const { data } = await axios.get(OPEN_METEO_URL, {
    params: {
      latitude: lat,
      longitude: lng,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,dew_point_2m,visibility,uv_index',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset,et0_fao_evapotranspiration,relative_humidity_2m_mean',
      hourly: 'soil_moisture_3_to_9cm,soil_temperature_6cm',
      timezone: 'auto',
      forecast_days: days
    },
    timeout: 10000
  });
  return data;
};

const buildDaily = (d) => d.time.map((date, i) => {
  const [condition, description] = describeCode(d.weather_code[i]);
  const max = d.temperature_2m_max[i];
  const min = d.temperature_2m_min[i];
  return {
    date,
    temperature: { min: round(min), max: round(max) },
    humidity: d.relative_humidity_2m_mean ? d.relative_humidity_2m_mean[i] : null,
    precipitation: {
      probability: d.precipitation_probability_max[i] ?? 0,
      amount: round(d.precipitation_sum[i] ?? 0),
      type: 'rain'
    },
    windSpeed: round(d.wind_speed_10m_max[i]),
    condition,
    description,
    uvIndex: round(d.uv_index_max[i]),
    sunrise: d.sunrise[i],
    sunset: d.sunset[i],
    evapotranspiration: round(d.et0_fao_evapotranspiration[i]),
    growingDegreeDays: max != null && min != null ? round(Math.max(0, (max + min) / 2 - 10)) : null
  };
});

// Latest hourly value at or before "now" (falls back to the first value).
const currentHourly = (hourly, field, nowIso) => {
  if (!hourly || !hourly[field]) return null;
  let idx = 0;
  hourly.time.forEach((t, i) => { if (t <= nowIso) idx = i; });
  return hourly[field][idx];
};

const deriveAlerts = (daily) => {
  const alerts = [];
  daily.slice(0, 3).forEach((day) => {
    const amount = day.precipitation.amount || 0;
    if (amount >= 115.6) {
      alerts.push({ title: `Very heavy rain expected (${day.date})`, description: `About ${amount} mm of rain is forecast. Clear field drains, harvest mature produce and avoid fertilizer application.`, severity: 'severe', startTime: day.date });
    } else if (amount >= 64.5) {
      alerts.push({ title: `Heavy rain expected (${day.date})`, description: `About ${amount} mm of rain is forecast. Ensure drainage and postpone spraying and fertilizer application.`, severity: 'moderate', startTime: day.date });
    }
    if (day.temperature.max != null && day.temperature.max >= 40) {
      alerts.push({ title: `Extreme heat (${day.date})`, description: `Maximum temperature near ${day.temperature.max}°C. Irrigate in the early morning or evening and protect livestock from heat.`, severity: 'moderate', startTime: day.date });
    }
    if (day.windSpeed != null && day.windSpeed >= 50) {
      alerts.push({ title: `Strong winds (${day.date})`, description: `Winds up to ${day.windSpeed} km/h. Support tall crops and banana plants, and do not spray.`, severity: 'moderate', startTime: day.date });
    }
  });
  return alerts;
};

const buildRecommendations = (current, daily, soilMoisturePct) => {
  const recs = [];
  const next48 = daily.slice(0, 2);
  const rain48 = next48.reduce((s, d) => s + (d.precipitation.amount || 0), 0);
  const maxRainProb = Math.max(...next48.map((d) => d.precipitation.probability || 0));
  const today = daily[0] || {};

  if (rain48 >= 10 || maxRainProb >= 70) {
    recs.push({ type: 'irrigation', priority: 'medium', message: `Rain expected in the next 48 hours (${round(rain48)} mm, up to ${maxRainProb}% chance). Postpone irrigation and check field drainage.` });
  } else if (soilMoisturePct != null && soilMoisturePct < 15) {
    recs.push({ type: 'irrigation', priority: 'high', message: `Topsoil is dry (${soilMoisturePct}% moisture) and little rain is expected. Irrigate early in the morning or in the evening.` });
  } else if (today.evapotranspiration != null && today.evapotranspiration >= 5) {
    recs.push({ type: 'irrigation', priority: 'medium', message: `High water demand today (evapotranspiration ${today.evapotranspiration} mm). Check soil moisture and irrigate crops that are flowering or fruiting.` });
  } else {
    recs.push({ type: 'irrigation', priority: 'low', message: 'No rain expected and water demand is moderate. Follow your normal irrigation schedule.' });
  }

  if (current.humidity >= 80 && current.temperature >= 20 && current.temperature <= 32) {
    recs.push({ type: 'pest-control', priority: 'high', message: 'Warm, humid conditions favour fungal diseases. Inspect leaves for spots and mildew and keep good spacing for air flow.' });
  }

  const windToday = today.windSpeed != null ? today.windSpeed : current.windSpeed;
  if (windToday >= 20 || maxRainProb >= 60) {
    recs.push({ type: 'pest-control', priority: 'medium', message: 'Avoid spraying pesticides or foliar fertilizer today: wind or rain will reduce their effect and cause drift.' });
  } else {
    recs.push({ type: 'pest-control', priority: 'low', message: 'Calm, dry conditions: a good window for spraying if needed (early morning or late evening).' });
  }

  if (today.temperature && today.temperature.max >= 38) {
    recs.push({ type: 'planting', priority: 'high', message: 'Heat stress risk. Avoid transplanting during the day; use mulch to keep soil cool and moist.' });
  }
  return recs;
};

const getWeatherBundle = async (lat, lng, days = 7) => {
  const forecastDays = Math.max(1, Math.min(parseInt(days, 10) || 7, MAX_DAYS));
  const key = cacheKey(lat, lng, forecastDays);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return { data: hit.data, cached: true };

  let raw;
  try {
    raw = await fetchForecast(lat, lng, forecastDays);
  } catch (error) {
    const err = new Error('Weather service (Open-Meteo) is unreachable. Please try again later.');
    err.statusCode = 502;
    err.cause = error;
    throw err;
  }
  const place = await reverseGeocode(lat, lng);

  const c = raw.current || {};
  const [condition, description] = describeCode(c.weather_code);
  const current = {
    temperature: round(c.temperature_2m),
    feelsLike: round(c.apparent_temperature),
    humidity: c.relative_humidity_2m,
    pressure: round(c.surface_pressure, 0),
    windSpeed: round(c.wind_speed_10m),
    windDirection: c.wind_direction_10m,
    visibility: c.visibility != null ? round(c.visibility / 1000) : null,
    uvIndex: round(c.uv_index),
    condition,
    description,
    cloudCover: c.cloud_cover,
    dewPoint: round(c.dew_point_2m),
    precipitation: c.precipitation,
    time: c.time
  };

  const daily = buildDaily(raw.daily);
  const soilVwc = currentHourly(raw.hourly, 'soil_moisture_3_to_9cm', c.time);
  const soilMoisture = soilVwc != null ? round(soilVwc * 100, 0) : null;
  const soilTemperature = round(currentHourly(raw.hourly, 'soil_temperature_6cm', c.time));

  const placeName = place && (place.district || place.state)
    ? [place.district, place.state].filter(Boolean).join(', ')
    : `${lat.toFixed(3)}, ${lng.toFixed(3)}`;

  const data = {
    location: {
      coordinates: { lat, lng },
      name: placeName,
      district: place ? place.district : null,
      state: place ? place.state : null,
      country: place ? place.country : null,
      elevation: raw.elevation,
      timezone: raw.timezone
    },
    current,
    daily,
    alerts: deriveAlerts(daily),
    agriculture: {
      soilMoisture,
      soilMoistureDepth: '3-9 cm',
      soilTemperature,
      evapotranspiration: daily[0] ? daily[0].evapotranspiration : null,
      growingDegreeDays: daily[0] ? daily[0].growingDegreeDays : null,
      recommendations: buildRecommendations(current, daily, soilMoisture)
    },
    source: {
      provider: 'Open-Meteo',
      url: 'https://open-meteo.com',
      lastUpdated: new Date().toISOString(),
      alertsNote: 'Alerts are derived from the forecast using IMD rainfall thresholds; they are not official IMD warnings.'
    }
  };

  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return { data, cached: false };
};

const getWeatherData = (lat, lng) => getWeatherBundle(lat, lng, 7);

const getWeatherForecast = async (lat, lng, days = 7) => {
  const { data, cached } = await getWeatherBundle(lat, lng, days);
  return {
    data: { location: data.location, forecast: data.daily, agriculture: data.agriculture, source: data.source },
    cached
  };
};

const getAgricultureWeatherInsights = async (lat, lng, cropType) => {
  const { data } = await getWeatherBundle(lat, lng, 7);
  const { current, agriculture } = data;
  const insights = [];

  if (current.temperature > 35) {
    insights.push({ type: 'warning', category: 'temperature', priority: 'high', message: 'High temperature. Ensure adequate irrigation and shade for sensitive crops.', action: 'Irrigate in the evening, use mulching' });
  }
  if (current.humidity > 80) {
    insights.push({ type: 'warning', category: 'humidity', priority: 'medium', message: 'Very high humidity may lead to fungal diseases.', action: 'Improve air circulation, scout for leaf spots' });
  }
  const today = data.daily[0];
  if (today && today.precipitation.probability > 70) {
    insights.push({ type: 'info', category: 'precipitation', priority: 'medium', message: 'High chance of rain today. Skip irrigation and prepare for water logging.', action: 'Cancel irrigation, check drainage' });
  }
  const crop = (cropType || '').toLowerCase();
  if (crop.includes('rice')) {
    insights.push({ type: 'tip', category: 'crop-specific', priority: 'low', message: 'For rice, maintain 2-5 cm standing water during tillering; drain the field before heavy rain.', action: 'Monitor bund water levels' });
  } else if (crop.includes('coconut')) {
    insights.push({ type: 'tip', category: 'crop-specific', priority: 'low', message: 'Coconut palms need deep watering in dry spells. Mulch the basin with husk or leaves.', action: 'Deep watering once a week' });
  }
  agriculture.recommendations.forEach((r) => insights.push({ type: 'advice', category: r.type, priority: r.priority, message: r.message }));

  return {
    data: {
      location: data.location,
      insights,
      weatherSummary: {
        temperature: current.temperature,
        humidity: current.humidity,
        condition: current.condition,
        recommendation: insights.length ? insights[0].message : 'Weather conditions are favourable for farming'
      },
      agriculture
    }
  };
};

module.exports = {
  getWeatherData,
  getWeatherForecast,
  getAgricultureWeatherInsights,
  describeCode
};
