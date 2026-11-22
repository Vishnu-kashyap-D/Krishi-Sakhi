import React from 'react';
import ReportCard from './ReportCard';

const LEVEL_STYLE = {
  high: { text: 'text-green-600', bar: 'w-full bg-green-500' },
  medium: { text: 'text-yellow-600', bar: 'w-2/3 bg-yellow-500' },
  low: { text: 'text-red-600', bar: 'w-1/3 bg-red-500' },
};
const styleFor = (level) => LEVEL_STYLE[String(level || '').toLowerCase()] || { text: 'text-gray-600', bar: 'w-1/2 bg-gray-400' };

const PRIORITY_STYLE = {
  high: 'border-red-300 bg-red-50',
  medium: 'border-yellow-300 bg-yellow-50',
  low: 'border-green-300 bg-green-50',
};

const NutrientBar = ({ label, level }) => {
  const s = styleFor(level);
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className={`text-sm font-bold ${s.text}`}>{level}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${s.bar}`} />
      </div>
    </div>
  );
};

const AnalysisReport = ({ data }) => {
  const sources = data.data_sources || {};
  const soil = data.soil_properties || {};
  const climate = data.climate && data.climate.source === 'Open-Meteo' ? data.climate : null;
  const hasComposition = soil.sand_percent != null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 fade-in">
      <div className="text-center mb-6">
        <div className="text-3xl mb-2" aria-hidden="true">📊</div>
        <h2 className="text-xl font-bold text-gray-800">Farm Analysis Report</h2>
      </div>

      <div className="space-y-4">
        <ReportCard icon="🌱" title="Soil Type" value={soil.texture} color="primary" source={sources.soil} />
        <ReportCard icon="⚗️" title="Soil pH" value={soil.ph} color="primary" source={sources.soil} />
        <ReportCard icon="🍂" title="Organic Carbon" value={`${soil.organic_carbon_percent}%`} color="primary" source={sources.soil} />
        {hasComposition && (
          <p className="text-xs text-gray-600 -mt-2 px-1">
            Sand {soil.sand_percent}% · Silt {soil.silt_percent}% · Clay {soil.clay_percent}%
          </p>
        )}

        {climate && (
          <>
            <ReportCard
              icon="🌧️"
              title="Rainfall (last 30 days)"
              value={`${climate.rainfall_last_30_days_mm} mm`}
              color="blue"
              source={climate.source}
            />
            <ReportCard
              icon="💦"
              title="Topsoil Moisture"
              value={climate.soil_moisture_percent != null ? `${climate.soil_moisture_percent}% (3-9 cm)` : 'Not available'}
              color="blue"
              source={climate.source}
            />
            <ReportCard
              icon="🌡️"
              title="Avg Temperature (30 days)"
              value={`${climate.avg_min_temp_c}°C – ${climate.avg_max_temp_c}°C · ${climate.elevation_m} m elevation`}
              color="yellow"
              source={climate.source}
            />
          </>
        )}

        <ReportCard icon="🌾" title="Land Cover" value={data.land_cover.class} color="green" source={sources.land_cover} />
        <ReportCard
          icon="🍃"
          title="Vegetation Health"
          value={`${data.vegetation_index.remark} (NDVI: ${data.vegetation_index.ndvi})`}
          color="green"
          source={sources.vegetation_index}
        />
        <ReportCard
          icon="💧"
          title="Groundwater"
          value={`${data.groundwater.depth_meters} m depth - ${data.groundwater.availability}`}
          color="blue"
          source={sources.groundwater}
        />

        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Nutrient Levels</h3>
            {sources.nutrients && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {sources.nutrients === 'estimated' ? 'Estimated' : 'Partly estimated'}
              </span>
            )}
          </div>
          <NutrientBar label="Nitrogen" level={data.nutrient_levels.nitrogen} />
          <NutrientBar label="Phosphorus" level={data.nutrient_levels.phosphorus} />
          <NutrientBar label="Potassium" level={data.nutrient_levels.potassium} />
        </div>

        {Array.isArray(data.recommendations) && data.recommendations.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Recommendations</h3>
            <ul className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <li key={i} className={`border-l-4 rounded p-3 text-sm text-gray-800 ${PRIORITY_STYLE[rec.priority] || PRIORITY_STYLE.low}`}>
                  <span className="font-semibold capitalize">{rec.type}</span>
                  <span className="text-xs text-gray-500"> · {rec.priority} priority</span>
                  <p className="mt-1">{rec.message}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600 space-y-1">
          <p><strong>Location:</strong> {data.location.latitude.toFixed(4)}, {data.location.longitude.toFixed(4)}</p>
          <p><strong>Area:</strong> {data.location.acres} acres</p>
          {(data.notes || []).map((note, i) => <p key={i} className="text-amber-700">{note}</p>)}
          <p className="text-xs">
            Values marked “Estimated” have no live data source yet and are approximations. Get a soil test from your
            nearest soil testing lab (Soil Health Card scheme) before deciding fertilizer doses.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisReport;
