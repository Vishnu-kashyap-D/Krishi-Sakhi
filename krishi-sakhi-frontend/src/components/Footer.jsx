import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const Footer = () => (
  <footer className="mt-16 border-t border-soil-200 bg-primary-950 text-primary-100">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
      <div>
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-9" />
          <span className="font-display text-xl font-semibold text-white">Krishi Sakhi</span>
        </div>
        <p className="mt-3 max-w-xs text-sm text-primary-200">
          A farming companion for Indian farmers: land profiling, crop health checks, weather advice and an AI assistant in your language.
        </p>
      </div>
      <div className="text-sm">
        <p className="mb-3 font-semibold uppercase tracking-[0.14em] text-harvest-300">Tools</p>
        <ul className="space-y-2">
          <li><Link className="hover:text-white" to="/farm-analysis">Farm analysis</Link></li>
          <li><Link className="hover:text-white" to="/crop-analysis">Crop health check</Link></li>
          <li><Link className="hover:text-white" to="/weather">Weather advisory</Link></li>
          <li><Link className="hover:text-white" to="/chatbot">AI assistant</Link></li>
        </ul>
      </div>
      <div className="text-sm">
        <p className="mb-3 font-semibold uppercase tracking-[0.14em] text-harvest-300">Data sources</p>
        <ul className="space-y-2 text-primary-200">
          <li>Weather &amp; soil moisture: Open-Meteo</li>
          <li>Soil properties: ISRIC SoilGrids</li>
          <li>Maps: © OpenStreetMap contributors</li>
          <li>AI: Google Gemini</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-white/10 py-4 text-center text-xs text-primary-300">
      Built for Smart India Hackathon · SIH25168 · Advice is informational — confirm with your local Krishi Vigyan Kendra.
    </div>
  </footer>
);

export default Footer;
