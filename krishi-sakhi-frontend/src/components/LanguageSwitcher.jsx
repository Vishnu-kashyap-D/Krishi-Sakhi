import React, { useState, useEffect } from 'react';
import { FaGlobe, FaChevronDown } from 'react-icons/fa';
import { languageAPI } from '../api/services';

let languagesRequest = null;

const LanguageSwitcher = ({ currentLanguage = 'en', onLanguageChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Supported languages with their display names
  const languageMap = {
    en: { name: 'English', flag: '🇬🇧' },
    hi: { name: 'हिन्दी', flag: '🇮🇳' },
    ta: { name: 'தமிழ்', flag: '🇮🇳' },
    te: { name: 'తెలుగు', flag: '🇮🇳' },
    kn: { name: 'ಕನ್ನಡ', flag: '🇮🇳' },
    gu: { name: 'ગુજરાતી', flag: '🇮🇳' },
    mr: { name: 'मराठी', flag: '🇮🇳' },
    pa: { name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    bn: { name: 'বাংলা', flag: '🇮🇳' },
    or: { name: 'ଓଡ଼ିଆ', flag: '🇮🇳' }
  };

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      // One request per page load, shared by every switcher instance.
      if (!languagesRequest) languagesRequest = languageAPI.getLanguages();
      const data = await languagesRequest;

      if (data.success) {
        const languageList = Object.entries(data.data.languages).map(([code, info]) => ({
          code,
          name: languageMap[code]?.name || info.nativeName || info.name,
          flag: languageMap[code]?.flag || '🌐'
        }));
        setLanguages(languageList);
      }
    } catch {
      // The built-in list below is used when the server is unreachable.
      // Fallback to default languages
      setLanguages([
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
        { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
        { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
        { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelect = (languageCode) => {
    setIsOpen(false);
    if (onLanguageChange) {
      onLanguageChange(languageCode);
    }
    
    // Store language preference
    localStorage.setItem('preferred_language', languageCode);
    
    // For demo purposes, you might want to reload or update app state
    console.log('Language changed to:', languageCode);
  };

  const currentLang = languages.find(lang => lang.code === currentLanguage) || 
                     { code: 'en', name: 'English', flag: '🇬🇧' };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
        <FaGlobe className="text-gray-400 animate-spin" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
        aria-label="Select Language"
      >
        <span className="text-lg">{currentLang.flag}</span>
        <span className="text-sm font-medium text-gray-700 hidden sm:inline">
          {currentLang.name}
        </span>
        <FaChevronDown 
          className={`text-xs text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-40 max-h-64 overflow-y-auto">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Select Language
              </p>
            </div>
            
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageSelect(language.code)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-3 transition-colors ${
                  currentLanguage === language.code ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <span className="text-lg">{language.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {language.name}
                  </p>
                  <p className="text-xs text-gray-500 uppercase">
                    {language.code}
                  </p>
                </div>
                {currentLanguage === language.code && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </button>
            ))}
            
            <div className="px-3 py-2 border-t border-gray-100 mt-1">
              <p className="text-xs text-gray-400">
                🌾 Krishi Sakhi supports {languages.length} languages
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;