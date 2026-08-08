import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { fetchApi } from './utils/api';
import Header from './components/Header';
import Footer from './components/Footer';
import Customizer from './components/Customizer';
import AiAssistant from './components/AiAssistant';
import SplashScreen from './components/SplashScreen';
import MobileBottomNav from './components/MobileBottomNav';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider } from './context/AuthContext';
import { DistrictProvider } from './context/DistrictContext';
import DashboardLayout from './components/DashboardLayout';
import OfflineBanner from './components/OfflineBanner';

import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import News from './pages/News';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Directory from './pages/Directory';
import BizDirectoryMain from './pages/BizDirectoryMain';
import DealsListing from './pages/DealsListing';
import RfqMarketplace from './pages/RfqMarketplace';
import Classifieds from './pages/Classifieds';
import Wishes from './pages/Wishes';
import Obituaries from './pages/Obituaries';
import Jobs from './pages/Jobs';
import ArticleDetail from './pages/ArticleDetail';
import Category from './pages/Category';
import TagArchive from './pages/TagArchive';
import Videos from './pages/Videos';
import NotFound from './pages/NotFound';
import Maintenance from './pages/Maintenance';
import DMCAPolicy from './pages/DMCAPolicy';
import CrowdReportForm from './pages/CrowdReportForm';
import AuthorProfile from './pages/AuthorProfile';
import AdvancedSearch from './pages/AdvancedSearch';
import ArchiveListing from './pages/ArchiveListing';
import WebStories from './pages/WebStories';
import AboutUs from './pages/AboutUs';
import Careers from './pages/Careers';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfUse from './pages/TermsOfUse';
import ContactUs from './pages/ContactUs';
import Advertise from './pages/Advertise';
import LiveTv from './pages/LiveTv';
import Weather from './pages/Weather';
import BizDirectoryRegister from './pages/BizDirectoryRegister';
import BizDirectoryDashboard from './pages/BizDirectoryDashboard';
import MyRfqs from './pages/MyRfqs';
import MyQuotes from './pages/MyQuotes';


function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    fetchApi('/public/maintenance-status')
      .then(res => {
        if (res && res.maintenance) {
          setMaintenanceMode(true);
        }
      })
      .catch(() => {});

    fetchApi('/public/config/ui')
      .then(res => {
        if (res) {
          const root = document.documentElement;
          const loadFont = (fontName) => {
            if (!fontName) return;
            const linkId = `dynamic-font-${fontName.replace(/\s+/g, '-')}`;
            if (document.getElementById(linkId)) return;
            const link = document.createElement('link');
            link.id = linkId;
            link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;500;600;700;800;900&display=swap`;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
          };

          if (res['font.primary']) {
             root.style.setProperty('--font-primary', `"${res['font.primary']}", sans-serif`);
             loadFont(res['font.primary']);
          }
          if (res['font.secondary']) {
             root.style.setProperty('--font-secondary', `"${res['font.secondary']}", sans-serif`);
             loadFont(res['font.secondary']);
          }
          if (res['font.tertiary']) {
             root.style.setProperty('--font-tertiary', `"${res['font.tertiary']}", sans-serif`);
             loadFont(res['font.tertiary']);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (window.gtag) {
      window.gtag('config', 'G-LYPDQ9LFS3', {
        page_path: location.pathname + location.search
      });
    } else {
      console.log(`[GA4 Stub] Page View Tracked: ${location.pathname + location.search}`);
    }
  }, [location]);

  if (maintenanceMode && location.pathname !== '/login') {
    return <Maintenance />;
  }

  return (
    <div className="app-container">
      <OfflineBanner />
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <Header />
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/kingstv" element={<Home />} />
          <Route path="/kingstv/" element={<Home />} />
          <Route path="/king-tv" element={<Home />} />
          <Route path="/king-tv/" element={<Home />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="/News" element={<News />} />
          <Route path="/news" element={<News />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login.html" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/directory" element={<BizDirectoryMain />} />
          <Route path="/directory.html" element={<Navigate to="/directory" replace />} />
          <Route path="/nfc" element={<Navigate to="/directory/dashboard" replace />} />
          <Route path="/deals" element={<DealsListing />} />
          <Route path="/rfq" element={<RfqMarketplace />} />
          <Route path="/classifieds" element={<Classifieds />} />
          <Route path="/classifieds.html" element={<Navigate to="/classifieds" replace />} />
          <Route path="/wishes" element={<Wishes />} />
          <Route path="/wishes.html" element={<Navigate to="/wishes" replace />} />
          <Route path="/obituaries" element={<Obituaries />} />
          <Route path="/obituaries.html" element={<Navigate to="/obituaries" replace />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs.html" element={<Navigate to="/jobs" replace />} />
          <Route path="/category/:slug" element={<Category />} />
          <Route path="/category.html" element={<Category />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/web-stories" element={<WebStories />} />
          <Route path="/article/:id" element={<ArticleDetail />} />
          <Route path="/article" element={<Navigate to="/" replace />} />
          <Route path="/news/:id" element={<ArticleDetail />} />
          <Route path="/tag/:tagName" element={<TagArchive />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/advertise" element={<Advertise />} />
          <Route path="/live-tv" element={<LiveTv />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/directory/register" element={
            <ProtectedRoute>
              <BizDirectoryRegister />
            </ProtectedRoute>
          } />
          <Route path="/directory/dashboard" element={
            <ProtectedRoute>
              <BizDirectoryDashboard />
            </ProtectedRoute>
          } />
          <Route path="/my-rfqs" element={
            <ProtectedRoute>
              <MyRfqs />
            </ProtectedRoute>
          } />
          <Route path="/my-quotes" element={
            <ProtectedRoute>
              <MyQuotes />
            </ProtectedRoute>
          } />
           <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-use" element={<TermsOfUse />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/submit-report" element={<CrowdReportForm />} />
          <Route path="/author/:authorName" element={<AuthorProfile />} />
          <Route path="/search" element={<AdvancedSearch />} />
          <Route path="/archive/:year/:month" element={<ArchiveListing />} />
          <Route path="/archive/:year" element={<ArchiveListing />} />
          <Route path="/dmca-policy" element={<DMCAPolicy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
      <MobileBottomNav />
      <Customizer />
      <AiAssistant />
      <ScrollToTop />
    </div>
  );
}

function getBasename() {
  const p = window.location.pathname;
  if (p.startsWith('/kingstv/')) return '/kingstv';
  if (p === '/kingstv') return '/kingstv';
  if (p.startsWith('/king-tv/')) return '/king-tv';
  if (p === '/king-tv') return '/king-tv';
  return '/';
}

function App() {
  return (
    <AuthProvider>
      <DistrictProvider>
        <Router basename={getBasename()}>
          <AppContent />
        </Router>
      </DistrictProvider>
    </AuthProvider>
  );
}

export default App;
