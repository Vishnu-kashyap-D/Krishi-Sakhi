import React from 'react';

// `source` labels where the value came from; "estimated" values get a badge.
const ReportCard = ({ icon, title, value, color = 'primary', source }) => {
  const colorClasses = {
    primary: 'border-primary-200 bg-primary-50',
    green: 'border-green-200 bg-green-50',
    blue: 'border-blue-200 bg-blue-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    red: 'border-red-200 bg-red-50',
  };
  const estimated = source === 'estimated';

  return (
    <div className={`p-4 rounded-xl border-2 ${colorClasses[color] || colorClasses.primary}`}>
      <div className="flex items-center space-x-3">
        <div className="text-2xl" aria-hidden="true">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
            {source && (
              <span
                className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${
                  estimated ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                }`}
                title={estimated ? 'No live data source is available for this value; it is an estimate.' : `Source: ${source}`}
              >
                {estimated ? 'Estimated' : source}
              </span>
            )}
          </div>
          <p className="font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
