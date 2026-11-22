import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaLeaf, FaMicroscope, FaComments, FaStore, FaCloudSun, FaUsers, FaArrowRight,
  FaMapMarkedAlt, FaClipboardList, FaBell, FaTint, FaWind, FaMicrophone,
} from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import { getUser, onAuthChange } from '../utils/auth';
import { weatherAPI } from '../api/services';

const DEFAULT_PLACE = { lat: 10.5276, lon: 76.2144 }; // Thrissur, Kerala

// Live conditions card in the hero (real Open-Meteo data via the backend).
const LiveWeatherCard = () => {
  const [w, setW] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    weatherAPI.getCurrentWeather(DEFAULT_PLACE.lat, DEFAULT_PLACE.lon)
      .then((r) => { if (!cancelled) setW(r.data); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  if (failed) return null;
  const advice = w?.agriculture?.recommendations?.[0];

  return (
    <div className="card relative w-full max-w-sm p-5 animate-float">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Live field conditions</span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-primary-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary-500" /> live
        </span>
      </div>
      {w ? (
        <>
          <p className="mt-2 text-sm font-semibold text-soil-800">{w.location.name}</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="font-display text-5xl font-semibold text-primary-900">{Math.round(w.current.temperature)}°</p>
            <p className="pb-1.5 text-sm text-soil-700">{w.current.description}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-primary-50 p-2"><FaTint className="mx-auto mb-1 text-primary-600" />{w.current.humidity}%<br /><span className="text-soil-700">humidity</span></div>
            <div className="rounded-xl bg-primary-50 p-2"><FaWind className="mx-auto mb-1 text-primary-600" />{w.current.windSpeed}<br /><span className="text-soil-700">km/h</span></div>
            <div className="rounded-xl bg-harvest-50 p-2"><FaLeaf className="mx-auto mb-1 text-harvest-600" />{w.agriculture.soilMoisture ?? '—'}%<br /><span className="text-soil-700">soil moisture</span></div>
          </div>
          {advice && (
            <p className="mt-4 rounded-xl border border-harvest-200 bg-harvest-50 p-3 text-xs leading-relaxed text-soil-800">
              <strong className="text-harvest-700">Today: </strong>{advice.message}
            </p>
          )}
        </>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="h-4 w-1/2 animate-pulse rounded bg-soil-100" />
          <div className="h-12 w-1/3 animate-pulse rounded bg-soil-100" />
          <div className="h-16 animate-pulse rounded bg-soil-100" />
        </div>
      )}
    </div>
  );
};

// Decorative landscape: sun, hills and furrows.
const FieldIllustration = () => (
  <svg viewBox="0 0 600 260" className="absolute inset-x-0 bottom-0 h-28 w-full md:h-36" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 150 C120 110 220 120 320 140 S520 120 600 100 V260 H0Z" fill="#b9dcc3" opacity=".55" />
    <path d="M0 190 C140 150 260 160 360 180 S520 170 600 150 V260 H0Z" fill="#5ca677" opacity=".55" />
    <path d="M0 225 C160 195 300 200 420 215 S560 210 600 200 V260 H0Z" fill="#276f45" />
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={i} d={`M${-40 + i * 10} ${240 - i * 6} C200 ${222 - i * 6} 380 ${226 - i * 6} 640 ${214 - i * 6}`} stroke="#3a8a59" strokeWidth="2" fill="none" opacity=".6" />
    ))}
  </svg>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { translate } = useLanguage();
  const [user, setUser] = useState(getUser());
  useEffect(() => onAuthChange(setUser), []);

  const features = [
    { icon: FaMapMarkedAlt, title: translate('smartAnalysis', 'Smart Farm Analysis'), desc: 'Tap your field on the map for soil texture, pH, organic carbon, recent rainfall and soil moisture, with clear next steps.', path: '/farm-analysis', span: 'md:col-span-2', tone: 'from-primary-800 to-primary-950 text-white' },
    { icon: FaMicroscope, title: translate('cropAnalysis', 'Crop Health Check'), desc: 'Photograph a leaf. AI spots diseases, pests and deficiencies and suggests treatment.', path: '/crop-analysis', tone: 'from-harvest-100 to-harvest-50' },
    { icon: FaComments, title: translate('aiAssistant', 'AI Assistant'), desc: 'Ask anything about your crops by text or voice, in your language. It remembers your farm.', path: '/chatbot', tone: 'from-white to-primary-50' },
    { icon: FaClipboardList, title: 'My Farm Diary', desc: 'Log sowing, irrigation, fertiliser and pest sightings. Get reminders and advice based on your own records.', path: '/my-farm', tone: 'from-white to-soil-100' },
    { icon: FaCloudSun, title: translate('weatherInsights', 'Weather Advisory'), desc: '7-day forecast turned into field advice: when to irrigate, when not to spray.', path: '/weather', tone: 'from-white to-primary-50' },
    { icon: FaStore, title: translate('marketplace', 'Marketplace'), desc: 'List your produce and find seeds, inputs and tools near you.', path: '/marketplace', tone: 'from-white to-harvest-50' },
    { icon: FaUsers, title: translate('communitySupport', 'Community'), desc: 'Ask fellow farmers and book time with agronomists.', path: '/community', tone: 'from-white to-soil-100' },
  ];

  const steps = [
    { n: '01', title: 'Mark your farm', text: 'Drop a pin on the map and set your acreage, crops, soil and irrigation.' },
    { n: '02', title: 'Get a land profile', text: 'Soil and climate data from SoilGrids and Open-Meteo, explained simply.' },
    { n: '03', title: 'Log and get advised', text: 'Record field work; Krishi Sakhi warns you before rain, pests or missed tasks.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-harvest-300/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-primary-300/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-36 pt-12 md:pb-44 md:pt-16 lg:grid-cols-[1.2fr_1fr]">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-harvest-200 bg-white/80 px-3 py-1 text-xs font-semibold text-harvest-700">
              <FaLeaf /> കൃഷി സഖി · कृषि सखी · Your farming friend
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] text-primary-950 sm:text-5xl lg:text-6xl">
              {translate('welcomeTitle', 'Welcome to Krishi Sakhi')}
              <span className="block bg-gradient-to-r from-primary-700 via-primary-500 to-harvest-500 bg-clip-text text-transparent">
                grow with confidence.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-soil-800">
              {translate('welcomeSubtitle', 'Your AI-powered farming companion for better yields and sustainable agriculture')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => navigate(user ? '/my-farm' : '/signup')} className="btn-primary text-base">
                {user ? 'Open my farm' : translate('getStarted', 'Get Started')} <FaArrowRight />
              </button>
              <button onClick={() => navigate('/chatbot')} className="btn-ghost text-base">
                <FaMicrophone className="text-harvest-600" /> Ask Krishi Sakhi
              </button>
            </div>
            {!user && (
              <p className="mt-4 text-sm text-soil-700">
                Already registered? <Link to="/login" className="font-semibold text-primary-700 underline decoration-harvest-400 decoration-2 underline-offset-4">Log in</Link>
              </p>
            )}
          </div>
          <div className="flex justify-center lg:justify-end" style={{ animationDelay: '150ms' }}>
            <LiveWeatherCard />
          </div>
        </div>
        <FieldIllustration />
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow">What you can do</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-primary-950 md:text-4xl">
            {translate('featuresTitle', 'Powerful Features for Modern Farmers')}
          </h2>
          <p className="mt-3 text-soil-700">{translate('featuresSubtitle', 'Comprehensive tools and insights to modernize your farming practices')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, desc, path, span = '', tone }, i) => (
            <Link
              key={path}
              to={path}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`group relative overflow-hidden rounded-3xl border border-soil-200/70 bg-gradient-to-br p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lift animate-rise ${span} ${tone}`}
            >
              <div className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl ${tone.includes('text-white') ? 'bg-white/15 text-harvest-300' : 'bg-primary-800 text-harvest-300'}`}>
                <Icon className="text-xl" />
              </div>
              <h3 className={`font-display text-xl font-semibold ${tone.includes('text-white') ? 'text-white' : 'text-primary-950'}`}>{title}</h3>
              <p className={`mt-2 text-sm leading-relaxed ${tone.includes('text-white') ? 'text-primary-100' : 'text-soil-700'}`}>{desc}</p>
              <span className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${tone.includes('text-white') ? 'text-harvest-300' : 'text-primary-700'}`}>
                {translate('explore', 'Explore')} <FaArrowRight className="transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 pb-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-primary-900 p-8 text-white md:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-harvest-400/20 blur-3xl" />
          <p className="eyebrow !text-harvest-300">How it works</p>
          <h2 className="mt-2 font-display text-3xl font-semibold !text-white">From a pin on the map to a plan for the week</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <p className="font-display text-4xl font-semibold text-harvest-300">{s.n}</p>
                <h3 className="mt-3 text-lg font-semibold !text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-primary-100">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-primary-200">
            <span className="font-semibold uppercase tracking-[0.14em] text-primary-300">Powered by open data</span>
            <span>ISRIC SoilGrids</span><span>Open-Meteo</span><span>OpenStreetMap</span><span>Google Gemini</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="card flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
          <div>
            <h3 className="font-display text-2xl font-semibold text-primary-950">{translate('ctaTitle', 'Ready to Transform Your Farming?')}</h3>
            <p className="mt-2 text-soil-700">Start with a free land profile of your farm. It takes under a minute.</p>
          </div>
          <button onClick={() => navigate('/farm-analysis')} className="btn-accent text-base">
            <FaBell /> {translate('startAnalysis', 'Start Analysis Now')}
          </button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
