const multer = require('multer');
const cropAnalysisService = require('../services/cropAnalysisService');
const { CropAnalysis } = require('../models/Analysis');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (cropAnalysisService.SUPPORTED_MIME_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error('Only JPEG, PNG, WEBP or HEIC images are supported'), { statusCode: 400 }));
  }
}).single('image');

const analyzeCropImage = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      const message = err instanceof multer.MulterError
        ? (err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 10 MB)' : err.message)
        : err.message;
      return res.status(400).json({ success: false, error: message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided (form field "image")' });
    }

    const hint = typeof req.body.cropType === 'string' && req.body.cropType !== 'auto-detect'
      ? req.body.cropType.slice(0, 50) : null;

    try {
      const result = await cropAnalysisService.analyzeCropImage(req.file.buffer, req.file.mimetype, hint);
      const saved = await CropAnalysis.create({
        userId: req.user ? req.user.id : null,
        cropType: result.cropInfo.type,
        healthScore: result.healthScore,
        issueCount: result.issues.length,
        result
      });
      res.json({ success: true, data: { id: saved.id, ...result }, message: 'Crop analysis completed' });
    } catch (error) {
      const status = error.statusCode || 500;
      if (status === 500) console.error('Crop analysis error:', error);
      res.status(status).json({ success: false, error: status === 500 ? 'Failed to analyze crop image' : error.message });
    }
  });
};

// Analyses of the logged-in user.
const getAnalysisHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const { rows, count } = await CropAnalysis.findAndCountAll({
      where: { userId: req.user.id },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
    res.json({
      success: true,
      data: {
        history: rows.map((r) => ({ id: r.id, date: r.created_at, cropType: r.cropType, health: r.healthScore, issueCount: r.issueCount, result: r.result })),
        total: count,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Get crop analysis history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analysis history' });
  }
};

const getSupportedCrops = (req, res) => {
  const crops = cropAnalysisService.SUPPORTED_CROPS;
  res.json({ success: true, data: { crops, total: crops.length } });
};

// Reference information about common diseases (static content).
const COMMON_DISEASES = [
  { id: '1', name: 'Early Blight', crops: ['tomato', 'potato'], symptoms: 'Dark spots with concentric rings on older leaves', treatment: 'Remove affected leaves; spray mancozeb or a copper-based fungicide' },
  { id: '2', name: 'Bacterial Leaf Blight', crops: ['rice'], symptoms: 'Water-soaked to yellow stripes along leaf edges', treatment: 'Use resistant varieties, avoid excess nitrogen, drain the field' },
  { id: '3', name: 'Powdery Mildew', crops: ['wheat', 'cucumber', 'grapes'], symptoms: 'White powdery patches on leaves and stems', treatment: 'Apply wettable sulphur; improve spacing and air flow' },
  { id: '4', name: 'Root Rot', crops: ['cotton', 'sugarcane'], symptoms: 'Yellowing leaves, wilting, stunted growth', treatment: 'Improve drainage; use Trichoderma-enriched compost' }
];

const getCommonDiseases = (req, res) => {
  const crop = (req.query.cropType || '').toLowerCase();
  const diseases = crop ? COMMON_DISEASES.filter((d) => d.crops.includes(crop)) : COMMON_DISEASES;
  res.json({ success: true, data: { diseases, total: diseases.length } });
};

module.exports = {
  analyzeCropImage,
  getAnalysisHistory,
  getSupportedCrops,
  getCommonDiseases
};
