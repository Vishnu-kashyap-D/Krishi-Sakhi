import React, { useEffect } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { LanguageProvider } from './context/LanguageContext';
import HomePage from './pages/HomePage';
import FarmAnalysisPage from './pages/FarmAnalysisPage';
import CropAnalysisPage from './pages/CropAnalysisPage';
import ChatbotPage from './pages/ChatbotPage';
import MarketplacePage from './pages/MarketplacePage';
import WeatherPage from './pages/WeatherPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import CommunityPage from './pages/CommunityPage';
import CreateProductPage from './pages/CreateProductPage';
import ProductDetailPage from './pages/ProductDetailPage';
import MyFarmPage from './pages/MyFarmPage';

const NotFound = () => (
  <div className="mx-auto max-w-xl px-4 py-24 text-center">
    <p className="eyebrow">404</p>
    <h1 className="page-title mt-2">This field is empty</h1>
    <p className="mt-3 text-soil-700">The page you are looking for does not exist.</p>
    <Link to="/" className="btn-primary mt-6">Back to home</Link>
  </div>
);

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  // Start every page at the top.
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <LanguageProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1" key={location.pathname}>
          <div className="fade-in">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/" element={<HomePage />} />
              <Route path="/farm-analysis" element={<FarmAnalysisPage />} />
              <Route path="/crop-analysis" element={<CropAnalysisPage />} />
              <Route path="/chatbot" element={<ChatbotPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/marketplace/create" element={<CreateProductPage />} />
              <Route path="/marketplace/:id" element={<ProductDetailPage />} />
              <Route path="/weather" element={<WeatherPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/my-farm" element={<MyFarmPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </main>
        {!isAuthPage && location.pathname !== '/chatbot' && <Footer />}
      </div>
    </LanguageProvider>
  );
}

export default App;
