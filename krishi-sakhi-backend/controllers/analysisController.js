// controllers/analysisController.js
const geoApiService = require('../services/geoApiService');
const { FarmAnalysis } = require('../models/Analysis');

const round = (v, d) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);

const generateRecommendations = (soil, landVeg, groundwater, climate) => {
  const recs = [];
  if (soil.ph < 5.5) {
    recs.push({ type: 'soil', priority: 'high', message: `Soil is strongly acidic (pH ${round(soil.ph, 1)}). Apply agricultural lime (dolomite) as per a soil test, typically 1-2 tonnes per hectare.` });
  } else if (soil.ph < 6.0) {
    recs.push({ type: 'soil', priority: 'medium', message: `Soil is slightly acidic (pH ${round(soil.ph, 1)}). A light liming will improve nutrient availability for most crops.` });
  } else if (soil.ph > 8.0) {
    recs.push({ type: 'soil', priority: 'high', message: `Soil is alkaline (pH ${round(soil.ph, 1)}). Add gypsum and organic matter; choose tolerant crops such as barley or cotton.` });
  }
  if (soil.organic_carbon_percent < 0.5) {
    recs.push({ type: 'soil', priority: 'high', message: 'Organic carbon is low. Add farmyard manure or compost (5-10 t/ha) and keep crop residues in the field.' });
  }
  if (soil.nutrient_levels.nitrogen === 'Low') {
    recs.push({ type: 'nutrient', priority: 'high', message: 'Nitrogen is low. Apply compost or green manure, or split doses of urea as recommended for your crop.' });
  }
  if (soil.nutrient_levels.phosphorus === 'Low') {
    recs.push({ type: 'nutrient', priority: 'medium', message: 'Phosphorus may be low. Consider DAP or single super phosphate at sowing (confirm with a soil test).' });
  }
  if (soil.nutrient_levels.potassium === 'Low') {
    recs.push({ type: 'nutrient', priority: 'medium', message: 'Potassium may be low. Consider muriate of potash (MOP) as per a soil test.' });
  }
  if (groundwater.depth_meters > 30) {
    recs.push({ type: 'water', priority: 'medium', message: 'Groundwater is likely deep. Use drip or sprinkler irrigation and harvest rainwater.' });
  }
  if (climate && climate.source === 'Open-Meteo') {
    if (climate.rainfall_last_30_days_mm < 20 && climate.soil_moisture_percent != null && climate.soil_moisture_percent < 20) {
      recs.push({ type: 'water', priority: 'high', message: `Only ${climate.rainfall_last_30_days_mm} mm of rain in the last 30 days and dry topsoil (${climate.soil_moisture_percent}%). Plan irrigation and mulch to save moisture.` });
    } else if (climate.rainfall_last_30_days_mm > 300) {
      recs.push({ type: 'water', priority: 'medium', message: `Heavy recent rainfall (${climate.rainfall_last_30_days_mm} mm in 30 days). Ensure field drainage to avoid waterlogging and root diseases.` });
    }
  }
  if (landVeg.vegetation_index.ndvi < 0.35) {
    recs.push({ type: 'crop', priority: 'low', message: 'Vegetation cover appears low. Consider a cover crop or green manure between seasons.' });
  }
  return recs;
};

const getFarmAnalysis = async (req, res) => {
  const { latitude, longitude, acres, farmName } = req.body || {};

  if (latitude == null || longitude == null || acres == null || latitude === '' || longitude === '' || acres === '') {
    return res.status(400).json({ success: false, error: 'Latitude, longitude, and acres are required.' });
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  const farmAcres = Number(acres);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(farmAcres)) {
    return res.status(400).json({ success: false, error: 'Latitude, longitude, and acres must be valid numbers.' });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ success: false, error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.' });
  }
  if (farmAcres <= 0 || farmAcres > 10000) {
    return res.status(400).json({ success: false, error: 'Farm area must be greater than 0 and at most 10000 acres.' });
  }

  try {
    const [soil, landVeg, groundwater, climate] = await Promise.all([
      geoApiService.fetchSoilData(lat, lng),
      geoApiService.fetchLandAndVegData(lat, lng),
      geoApiService.fetchGroundwaterData(lat, lng),
      geoApiService.fetchClimateData(lat, lng)
    ]);

    const report = {
      farm_name: (typeof farmName === 'string' && farmName.trim().slice(0, 100)) || 'Unnamed Farm',
      location: { latitude: lat, longitude: lng, acres: farmAcres },
      land_cover: landVeg.land_cover,
      vegetation_index: landVeg.vegetation_index,
      soil_properties: {
        texture: soil.texture,
        ph: round(soil.ph, 1),
        organic_carbon_percent: round(soil.organic_carbon_percent, 2),
        ...soil.composition
      },
      nutrient_levels: soil.nutrient_levels,
      groundwater: { depth_meters: groundwater.depth_meters, availability: groundwater.availability },
      climate,
      data_sources: {
        soil: soil.source,
        nutrients: soil.source === 'estimated' ? 'estimated' : 'nitrogen: SoilGrids; phosphorus/potassium: estimated',
        land_cover: landVeg.source,
        vegetation_index: landVeg.source,
        groundwater: groundwater.source,
        climate: climate.source
      },
      notes: [soil.note].filter(Boolean),
      analysis_timestamp: new Date().toISOString(),
      recommendations: generateRecommendations(soil, landVeg, groundwater, climate)
    };

    const saved = await FarmAnalysis.create({
      userId: req.user ? req.user.id : null,
      farmName: report.farm_name,
      latitude: lat,
      longitude: lng,
      acres: farmAcres,
      report
    });

    res.status(200).json({ success: true, data: { farm_id: saved.id, ...report } });
  } catch (error) {
    console.error('Error during farm analysis:', error);
    res.status(500).json({ success: false, error: 'Farm analysis failed. Please try again.' });
  }
};

const getAnalysisHistory = async (req, res) => {
  try {
    const rows = await FarmAnalysis.findAll({
      where: { userId: req.user.id },
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(req.query.limit, 10) || 20, 100)
    });
    res.json({
      success: true,
      data: rows.map((r) => ({ id: r.id, farmName: r.farmName, latitude: r.latitude, longitude: r.longitude, acres: r.acres, createdAt: r.created_at, report: r.report }))
    });
  } catch (error) {
    console.error('Get farm analysis history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analysis history' });
  }
};

module.exports = {
  getFarmAnalysis,
  getAnalysisHistory,
  generateRecommendations
};
