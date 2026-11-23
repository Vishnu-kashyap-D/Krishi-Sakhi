import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { LanguageProvider } from './context/LanguageContext';
import HomePage from './pages/HomePage';

// Each page is loaded on demand so heavy libraries (Leaflet, Chart.js) are
// only downloaded on the pages that use them.
const FarmAnalysisPage = lazy(() => import('./pages/FarmAnalysisPage'));
const CropAnalysisPage = lazy(() => import('./pages/CropAnalysisPage'));
const ChatbotPage = lazy(() => import('./pages/ChatbotPage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const WeatherPage = lazy(() => import('./pages/WeatherPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const CreateProductPage = lazy(() => import('./pages/CreateProductPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const MyFarmPage = lazy(() => import('./pages/MyFarmPage'));

const PageLoader = () => (
  <div className="flex justify-center py-24" role="status" aria-label="Loading">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </div>
        </main>
        {!isAuthPage && location.pathname !== '/chatbot' && <Footer />}
      </div>
    </LanguageProvider>
  );
}

export default App;
