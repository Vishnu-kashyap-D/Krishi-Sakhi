import React, { useState } from 'react';
import MapComponent from '../components/MapComponent';
import InputPanel from '../components/InputPanel';
import AnalysisReport from '../components/AnalysisReport';
import { analysisAPI, authAPI } from '../api/services';
import { getUser, updateStoredUser } from '../utils/auth';
import { getErrorMessage } from '../api/client';

const FarmAnalysisPage = () => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [farmArea, setFarmArea] = useState(1);
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setAnalysisData(null);
    setError(null);
  };

  const handleAnalysis = async () => {
    if (!selectedLocation || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await analysisAPI.analyzeFarm({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        acres: farmArea,
        farmName: 'My Farm',
      });
      setAnalysisData(response.data);
      // Remember this field as the farm location for personalised weather alerts.
      const user = getUser();
      if (user && user.farmDetails?.lat == null) {
        authAPI.updateProfile({ farmDetails: { ...(user.farmDetails || {}), lat: selectedLocation.lat, lng: selectedLocation.lng } })
          .then((r) => updateStoredUser(r.data.user))
          .catch(() => {});
      }
    } catch (err) {
      setAnalysisData(null);
      setError(getErrorMessage(err, 'Farm analysis failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[calc(100vh-200px)]">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-4 h-[60vh] lg:h-auto">
          <MapComponent
            selectedLocation={selectedLocation}
            farmArea={farmArea}
            onLocationSelect={handleLocationSelect}
          />
        </div>

        <div className="space-y-6 lg:overflow-y-auto">
          <InputPanel
            selectedLocation={selectedLocation}
            farmArea={farmArea}
            setFarmArea={setFarmArea}
            onAnalyze={handleAnalysis}
            isLoading={isLoading}
          />

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg" role="alert">
              {error}
            </div>
          )}

          {analysisData && <AnalysisReport data={analysisData} />}
        </div>
      </div>
    </div>
  );
};

export default FarmAnalysisPage;
