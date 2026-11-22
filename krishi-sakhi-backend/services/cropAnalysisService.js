// Crop image analysis with Google Gemini (multimodal). The uploaded image is
// sent to Gemini together with a strict JSON schema and the structured result
// is returned to the client. Nothing in the result is randomly generated.
const { SchemaType } = require('@google/generative-ai');
const { getModel, getModelName, toAIError } = require('./geminiClient');

const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const SUPPORTED_CROPS = [
  { id: 'wheat', name: 'Wheat', icon: '🌾' },
  { id: 'rice', name: 'Rice', icon: '🌾' },
  { id: 'cotton', name: 'Cotton', icon: '🏵️' },
  { id: 'sugarcane', name: 'Sugarcane', icon: '🎋' },
  { id: 'potato', name: 'Potato', icon: '🥔' },
  { id: 'tomato', name: 'Tomato', icon: '🍅' },
  { id: 'onion', name: 'Onion', icon: '🧅' },
  { id: 'maize', name: 'Maize', icon: '🌽' },
  { id: 'coconut', name: 'Coconut', icon: '🥥' },
  { id: 'banana', name: 'Banana', icon: '🍌' }
];

const S = SchemaType;
const RESPONSE_SCHEMA = {
  type: S.OBJECT,
  properties: {
    isPlantImage: { type: S.BOOLEAN, description: 'true only if the image shows a crop, plant, leaf, fruit or field' },
    rejectionReason: { type: S.STRING, description: 'why the image cannot be analysed (empty when isPlantImage is true)' },
    cropInfo: {
      type: S.OBJECT,
      properties: {
        type: { type: S.STRING, description: 'common crop name, e.g. Tomato' },
        variety: { type: S.STRING, description: 'variety if recognisable, otherwise "Unknown"' },
        growthStage: { type: S.STRING, description: 'Seedling, Vegetative, Flowering, Fruiting, Maturity or Unknown' },
        confidence: { type: S.NUMBER, description: '0-1 confidence in the crop identification' }
      },
      required: ['type', 'variety', 'growthStage', 'confidence']
    },
    healthScore: { type: S.INTEGER, description: '0-100 overall plant health visible in the image' },
    summary: { type: S.STRING, description: 'two-sentence plain-language summary for the farmer' },
    issues: {
      type: S.ARRAY,
      items: {
        type: S.OBJECT,
        properties: {
          type: { type: S.STRING, enum: ['disease', 'pest', 'nutrient', 'water', 'physical', 'other'], format: 'enum' },
          name: { type: S.STRING },
          severity: { type: S.STRING, enum: ['Low', 'Medium', 'High'], format: 'enum' },
          confidence: { type: S.NUMBER, description: '0-1' },
          affectedArea: { type: S.STRING, description: 'approximate visible affected share, e.g. "15%"' },
          symptoms: { type: S.STRING, description: 'visible symptoms seen in this image' }
        },
        required: ['type', 'name', 'severity', 'confidence', 'symptoms']
      }
    },
    recommendations: {
      type: S.ARRAY,
      items: {
        type: S.OBJECT,
        properties: {
          category: { type: S.STRING, enum: ['treatment', 'nutrition', 'pest-control', 'irrigation', 'care'], format: 'enum' },
          priority: { type: S.STRING, enum: ['high', 'medium', 'low'], format: 'enum' },
          action: { type: S.STRING },
          details: { type: S.STRING, description: 'specific product/dose/method suitable for Indian farmers, with safety notes' },
          timeline: { type: S.STRING }
        },
        required: ['category', 'priority', 'action', 'details', 'timeline']
      }
    }
  },
  required: ['isPlantImage', 'rejectionReason', 'cropInfo', 'healthScore', 'summary', 'issues', 'recommendations']
};

const PROMPT = (cropHint) => `You are an expert plant pathologist and agronomist helping Indian farmers.
Analyse the attached photo.
${cropHint ? `The farmer says the crop is: ${cropHint}. Verify this from the image.` : 'Identify the crop from the image.'}
Rules:
- Only report problems that are actually visible in the photo. If the plant looks healthy, return an empty issues list.
- If the image is not a plant/crop/field, or is too blurry to judge, set isPlantImage=false and explain in rejectionReason.
- Recommendations must be practical and affordable in India; prefer integrated pest management and include safety precautions for chemicals.
- Always include one "care" recommendation for ongoing monitoring.
- Be honest about uncertainty through the confidence values.`;

const gradeFor = (score) => {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'C+';
  return 'C';
};

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

class NotAPlantError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 422;
  }
}

const analyzeCropImage = async (imageBuffer, mimeType, cropHint) => {
  const started = Date.now();
  let parsed;
  try {
    const model = getModel({
      generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0.2 }
    });
    const result = await model.generateContent([
      { text: PROMPT(cropHint) },
      { inlineData: { mimeType, data: imageBuffer.toString('base64') } }
    ]);
    parsed = JSON.parse(result.response.text());
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw toAIError(Object.assign(new Error('Gemini returned invalid JSON'), { status: 502 }));
    }
    throw toAIError(error);
  }

  if (!parsed.isPlantImage) {
    throw new NotAPlantError(parsed.rejectionReason || 'The image does not appear to show a crop or plant. Please upload a clear photo of the affected plant.');
  }

  const healthScore = Math.max(0, Math.min(100, Math.round(Number(parsed.healthScore) || 0)));
  return {
    cropInfo: {
      type: parsed.cropInfo.type,
      variety: parsed.cropInfo.variety || 'Unknown',
      growthStage: parsed.cropInfo.growthStage || 'Unknown',
      confidence: clamp01(parsed.cropInfo.confidence)
    },
    healthScore,
    qualityGrade: gradeFor(healthScore),
    summary: parsed.summary,
    issues: (parsed.issues || []).map((i) => ({ ...i, confidence: clamp01(i.confidence) })),
    recommendations: parsed.recommendations || [],
    analysisMetadata: {
      analysisDate: new Date().toISOString(),
      imageSize: imageBuffer.length,
      mimeType,
      processingTimeMs: Date.now() - started,
      model: getModelName(),
      disclaimer: 'AI-based visual assessment. Confirm serious problems with your local Krishi Vigyan Kendra before applying chemicals.'
    }
  };
};

module.exports = {
  analyzeCropImage,
  SUPPORTED_MIME_TYPES,
  SUPPORTED_CROPS,
  gradeFor
};
