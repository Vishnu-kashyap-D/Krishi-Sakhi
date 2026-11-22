// services/geoApiService.js
//
// Data used by the farm (land) analysis:
//  - Soil: ISRIC SoilGrids 2.0 REST API (free, no key). That service is often
//    slow or down, so when it does not answer in time an *estimate* is used and
//    the response is labelled with source "estimated".
//  - Climate / soil moisture: Open-Meteo (free, no key), real data.
//  - Land cover, NDVI and groundwater: no free key-less API exists for these,
//    so they are estimates and always labelled as such.
const axios = require('axios');

const SOILGRIDS_URL = 'https://rest.isric.org/soilgrids/v2.0/properties/query';
const OPEN_METEO_URL = process.env.OPEN_METEO_URL || 'https://api.open-meteo.com/v1/forecast';
const SOILGRIDS_TIMEOUT_MS = Number(process.env.SOILGRIDS_TIMEOUT_MS || 12000);

// Deterministic pseudo-random value in [0, 1) for a coordinate and a salt, so
// estimates are stable for the same location.
const seeded = (lat, lon, salt) => {
  const x = Math.sin(lat * 12.9898 + lon * 78.233 + salt * 37.719) * 43758.5453;
  return x - Math.floor(x);
};
const pick = (arr, r) => arr[Math.min(arr.length - 1, Math.floor(r * arr.length))];
const level = (v, low, high) => (v < low ? 'Low' : v < high ? 'Medium' : 'High');

// Simplified USDA soil texture classification from sand/silt/clay percentages.
const textureClass = (sand, silt, clay) => {
  if (clay >= 40) return silt >= 40 ? 'Silty Clay' : sand >= 45 ? 'Sandy Clay' : 'Clay';
  if (clay >= 27) return sand > 45 ? 'Sandy Clay Loam' : silt >= 40 ? 'Silty Clay Loam' : 'Clay Loam';
  if (silt >= 80) return 'Silt';
  if (silt >= 50) return 'Silt Loam';
  if (sand >= 85) return 'Sand';
  if (sand >= 70) return 'Loamy Sand';
  if (sand >= 52 || clay < 7) return 'Sandy Loam';
  return 'Loam';
};

const estimateSoil = (lat, lon) => {
  const sand = 25 + seeded(lat, lon, 1) * 50;
  const clay = 10 + seeded(lat, lon, 2) * 35;
  const silt = Math.max(5, 100 - sand - clay);
  return {
    texture: textureClass(sand, silt, clay),
    ph: 5.2 + seeded(lat, lon, 3) * 3,
    organic_carbon_percent: 0.4 + seeded(lat, lon, 4) * 1.4,
    composition: { sand_percent: Math.round(sand), silt_percent: Math.round(silt), clay_percent: Math.round(clay) },
    nutrient_levels: {
      nitrogen: pick(['Low', 'Medium', 'High'], seeded(lat, lon, 5)),
      phosphorus: pick(['Low', 'Medium', 'High'], seeded(lat, lon, 6)),
      potassium: pick(['Low', 'Medium', 'High'], seeded(lat, lon, 7))
    },
    source: 'estimated'
  };
};

const fetchSoilGrids = async (lat, lon) => {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), value: 'mean' });
  ['phh2o', 'soc', 'clay', 'sand', 'silt', 'nitrogen'].forEach((p) => params.append('property', p));
  ['0-5cm', '5-15cm'].forEach((d) => params.append('depth', d));
  const { data } = await axios.get(`${SOILGRIDS_URL}?${params.toString()}`, { timeout: SOILGRIDS_TIMEOUT_MS });

  const values = {};
  for (const layer of (data.properties && data.properties.layers) || []) {
    const factor = (layer.unit_measure && layer.unit_measure.d_factor) || 1;
    const means = layer.depths.map((d) => d.values.mean).filter((v) => v != null);
    if (means.length) values[layer.name] = means.reduce((a, b) => a + b, 0) / means.length / factor;
  }
  // SoilGrids returns nulls over water, cities and other masked areas.
  if (values.phh2o == null || values.clay == null || values.sand == null) return null;
  return values; // phh2o: pH, soc: g/kg, clay/sand/silt: %, nitrogen: g/kg
};

const fetchSoilData = async (lat, lon) => {
  const estimate = estimateSoil(lat, lon);
  try {
    const v = await fetchSoilGrids(lat, lon);
    if (!v) return { ...estimate, note: 'SoilGrids has no data for this point (water, urban or masked area).' };
    const silt = v.silt != null ? v.silt : Math.max(0, 100 - v.sand - v.clay);
    return {
      texture: textureClass(v.sand, silt, v.clay),
      ph: v.phh2o,
      organic_carbon_percent: v.soc != null ? v.soc / 10 : estimate.organic_carbon_percent,
      composition: { sand_percent: Math.round(v.sand), silt_percent: Math.round(silt), clay_percent: Math.round(v.clay) },
      nutrient_levels: {
        // Total soil nitrogen (g/kg) bands: <1 low, 1-2 medium, >2 high.
        nitrogen: v.nitrogen != null ? level(v.nitrogen, 1, 2) : estimate.nutrient_levels.nitrogen,
        // SoilGrids does not provide phosphorus or potassium.
        phosphorus: estimate.nutrient_levels.phosphorus,
        potassium: estimate.nutrient_levels.potassium
      },
      source: 'ISRIC SoilGrids 2.0',
      note: 'Phosphorus and potassium are estimates; get a soil test for exact values.'
    };
  } catch (error) {
    console.warn(`SoilGrids unavailable (${error.code || error.message}); using estimated soil values.`);
    return { ...estimate, note: 'SoilGrids did not respond; soil values are estimates.' };
  }
};

const fetchLandAndVegData = async (lat, lon) => {
  const ndvi = 0.2 + seeded(lat, lon, 8) * 0.6;
  return {
    land_cover: { class: pick(['Agricultural Land', 'Fallow Land', 'Plantation', 'Paddy Field'], seeded(lat, lon, 9)) },
    vegetation_index: {
      ndvi: Math.round(ndvi * 100) / 100,
      remark: ndvi < 0.35 ? 'Poor Vegetation' : ndvi < 0.6 ? 'Moderate Vegetation' : 'Healthy Vegetation'
    },
    source: 'estimated'
  };
};

const fetchGroundwaterData = async (lat, lon) => {
  const depth = pick([8, 12, 15, 20, 25, 30, 35, 40], seeded(lat, lon, 10));
  return {
    depth_meters: depth,
    availability: depth <= 15 ? 'Good' : depth <= 30 ? 'Moderate' : 'Low',
    source: 'estimated'
  };
};

// Recent rainfall, temperature and soil moisture from Open-Meteo (real data).
const fetchClimateData = async (lat, lon) => {
  try {
    const { data } = await axios.get(OPEN_METEO_URL, {
      params: {
        latitude: lat,
        longitude: lon,
        daily: 'precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration',
        current: 'soil_moisture_3_to_9cm,soil_temperature_6cm',
        past_days: 30,
        forecast_days: 1,
        timezone: 'auto'
      },
      timeout: 10000
    });
    const d = data.daily;
    const n = d.time.length - 1; // past 30 days (exclude today)
    const sum = (arr) => arr.slice(0, n).reduce((a, b) => a + (b || 0), 0);
    const avg = (arr) => sum(arr) / n;
    return {
      elevation_m: data.elevation,
      rainfall_last_30_days_mm: Math.round(sum(d.precipitation_sum)),
      avg_max_temp_c: Math.round(avg(d.temperature_2m_max) * 10) / 10,
      avg_min_temp_c: Math.round(avg(d.temperature_2m_min) * 10) / 10,
      evapotranspiration_last_30_days_mm: Math.round(sum(d.et0_fao_evapotranspiration)),
      soil_moisture_percent: data.current && data.current.soil_moisture_3_to_9cm != null
        ? Math.round(data.current.soil_moisture_3_to_9cm * 100) : null,
      soil_temperature_c: data.current ? data.current.soil_temperature_6cm : null,
      source: 'Open-Meteo'
    };
  } catch (error) {
    console.warn(`Open-Meteo climate data unavailable: ${error.message}`);
    return { source: 'unavailable' };
  }
};

module.exports = {
  fetchSoilData,
  fetchLandAndVegData,
  fetchGroundwaterData,
  fetchClimateData,
  textureClass
};
