import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Breadcrumbs from './components/layout/Breadcrumbs';

// Smart Lazy Loader with Automatic Stale Asset Auto-Refresh
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenRefreshed = JSON.parse(
      window.sessionStorage.getItem('retry-lazy-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('retry-lazy-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasBeenRefreshed) {
        window.sessionStorage.setItem('retry-lazy-refreshed', 'true');
        window.location.reload(true);
        return { default: () => null };
      }
      throw error;
    }
  });

// Code-split page components with resilient retry mechanism
const Login = lazyWithRetry(() => import('./pages/Login'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const UserManagement = lazyWithRetry(() => import('./pages/admin/UserManagement'));
const KycManagement = lazyWithRetry(() => import('./pages/admin/KycManagement'));
const ProfanityFilter = lazyWithRetry(() => import('./pages/admin/ProfanityFilter'));
const SystemSettings = lazyWithRetry(() => import('./pages/admin/SystemSettings'));
const AnalyticsDashboard = lazyWithRetry(() => import('./pages/admin/AnalyticsDashboard'));
const TaxonomyManager = lazyWithRetry(() => import('./pages/admin/TaxonomyManager'));
const RoleManagement = lazyWithRetry(() => import('./pages/admin/RoleManagement'));
const PushNotifications = lazyWithRetry(() => import('./pages/admin/PushNotifications'));
const HomeLayoutBuilder = lazyWithRetry(() => import('./pages/admin/HomeLayoutBuilder'));
const NavbarManager = lazyWithRetry(() => import('./pages/admin/NavbarManager'));
const SurveyBuilder = lazyWithRetry(() => import('./pages/admin/SurveyBuilder'));
const AuditLogs = lazyWithRetry(() => import('./pages/admin/AuditLogs'));
const CommentsModeration = lazyWithRetry(() => import('./pages/admin/CommentsModeration'));
const MediaLibrary = lazyWithRetry(() => import('./pages/admin/MediaLibrary'));
const SeoConsole = lazyWithRetry(() => import('./pages/admin/SeoConsole'));
const ContentQueue = lazyWithRetry(() => import('./pages/editor/ContentQueue'));
const MyPosts = lazyWithRetry(() => import('./pages/journalist/MyPosts'));
const PostEditor = lazyWithRetry(() => import('./pages/journalist/PostEditor'));
const NewsManagement = lazyWithRetry(() => import('./pages/admin/NewsManagement'));
const NewsEditor = lazyWithRetry(() => import('./pages/admin/NewsEditor'));
const BreakingNewsDashboard = lazyWithRetry(() => import('./pages/admin/BreakingNewsDashboard'));
const UgcQueue = lazyWithRetry(() => import('./pages/admin/UgcQueue'));
const EditorialCalendar = lazyWithRetry(() => import('./pages/admin/EditorialCalendar'));
const AdManagement = lazyWithRetry(() => import('./pages/admin/AdManagement'));
const RssManager = lazyWithRetry(() => import('./pages/admin/RssManager'));
const RewardSystem = lazyWithRetry(() => import('./pages/admin/RewardSystem'));
const SubscribersManagement = lazyWithRetry(() => import('./pages/admin/SubscribersManagement'));
const NotificationPreferences = lazyWithRetry(() => import('./pages/admin/NotificationPreferences'));
const Profile = lazyWithRetry(() => import('./pages/admin/Profile'));
const AiConfiguration = lazyWithRetry(() => import('./pages/admin/AiConfiguration'));
const CommunityModules = lazyWithRetry(() => import('./pages/admin/CommunityModules'));
const LanguageFontSettings = lazyWithRetry(() => import('./pages/admin/LanguageFontSettings'));
const EmployersManagement = lazyWithRetry(() => import('./pages/admin/EmployersManagement'));
const CandidatesManagement = lazyWithRetry(() => import('./pages/admin/CandidatesManagement'));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
      <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading page...
    </div>
  </div>
);


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    // Automatic recovery if error is due to updated deployment / stale chunk hashes
    const isChunkError = error && (
      error.name === 'ChunkLoadError' || 
      String(error.message).includes('dynamically imported module') || 
      String(error.message).includes('Loading chunk') ||
      String(error.message).includes('Failed to fetch')
    );

    if (isChunkError) {
      const lastReload = sessionStorage.getItem('chunk_reload_ts');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
        sessionStorage.setItem('chunk_reload_ts', String(now));
        window.location.reload(true);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error && (
        this.state.error.name === 'ChunkLoadError' || 
        String(this.state.error.message).includes('dynamically imported module') ||
        String(this.state.error.message).includes('Loading chunk')
      );

      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', padding: '2rem' }}>
          <div style={{ maxWidth: '500px', width: '100%', background: '#1e293b', border: '1px solid #334155', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#f43f5e' }}>
              {isChunkError ? '⚡ System Update Applied' : '⚠️ Page Render Error'}
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              {isChunkError ? 'A new system update was deployed. Please refresh to load the latest version.' : (this.state.error?.message || 'An unexpected rendering error occurred.')}
            </p>
            <button
              onClick={() => window.location.reload(true)}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              🔄 Refresh Page & Load Update
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedLayout = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="app-container"><div className="glass-panel" style={{margin: 'auto', padding: '2rem'}}>Loading...</div></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/admin/dashboard" replace />;

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Sidebar />
        <Header />
        <main className="main-content">
          <Breadcrumbs />
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </main>
      </div>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
          <Route path="/login" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<Login />} />
          
          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          } />

          {/* Super Admin routes */}
          <Route path="/admin/users" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR']}>
              <UserManagement />
            </ProtectedLayout>
          } />
          
          <Route path="/admin/kyc" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR']}>
              <KycManagement />
            </ProtectedLayout>
          } />
          
           <Route path="/admin/settings" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN']}>
              <SystemSettings />
            </ProtectedLayout>
          } />

          <Route path="/admin/settings/ai" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN']}>
              <AiConfiguration />
            </ProtectedLayout>
          } />

          <Route path="/admin/community" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR']}>
              <CommunityModules />
            </ProtectedLayout>
          } />

          <Route path="/admin/jobs/employers" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR']}>
              <EmployersManagement />
            </ProtectedLayout>
          } />

          <Route path="/admin/jobs/candidates" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR']}>
              <CandidatesManagement />
            </ProtectedLayout>
          } />

          <Route path="/admin/settings/language" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN']}>
              <LanguageFontSettings />
            </ProtectedLayout>
          } />

          <Route path="/admin/profanity" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN']}>
              <ProfanityFilter />
            </ProtectedLayout>
          } />

          <Route path="/admin/analytics" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR']}>
              <AnalyticsDashboard />
            </ProtectedLayout>
          } />

          <Route path="/admin/taxonomy" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN']}>
              <TaxonomyManager />
            </ProtectedLayout>
          } />

          <Route path="/admin/push" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR']}>
              <PushNotifications />
            </ProtectedLayout>
          } />

          <Route path="/admin/layout" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR']}>
              <HomeLayoutBuilder />
            </ProtectedLayout>
          } />

          <Route path="/admin/navbar" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR']}>
              <NavbarManager />
            </ProtectedLayout>
          } />

          <Route path="/admin/news" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN']}>
              <NewsManagement />
            </ProtectedLayout>
          } />

          <Route path="/admin/news/create" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN']}>
              <NewsEditor />
            </ProtectedLayout>
          } />

          <Route path="/admin/breaking" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN']}>
              <BreakingNewsDashboard />
            </ProtectedLayout>
          } />

          <Route path="/admin/ugc-queue" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN', 'SUB_EDITOR']}>
              <UgcQueue />
            </ProtectedLayout>
          } />

          <Route path="/admin/editorial-calendar" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN']}>
              <EditorialCalendar />
            </ProtectedLayout>
          } />

          <Route path="/admin/ads" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN']}>
              <AdManagement />
            </ProtectedLayout>
          } />

          <Route path="/admin/subscribers" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN']}>
              <SubscribersManagement />
            </ProtectedLayout>
          } />

          <Route path="/admin/notifications" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN']}>
              <NotificationPreferences />
            </ProtectedLayout>
          } />

          <Route path="/admin/profile" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN', 'MOBILE_JOURNALIST', 'INSTITUTION_LOGIN', 'ADMIN', 'EDITOR', 'MODERATOR']}>
              <Profile />
            </ProtectedLayout>
          } />

          <Route path="/admin/rewards" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN']}>
              <RewardSystem />
            </ProtectedLayout>
          } />

          <Route path="/admin/rss" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR']}>
              <RssManager />
            </ProtectedLayout>
          } />

          <Route path="/admin/seo" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR']}>
              <SeoConsole />
            </ProtectedLayout>
          } />


          <Route path="/admin/news/:id/edit" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN']}>
              <NewsEditor />
            </ProtectedLayout>
          } />

          <Route path="/admin/surveys" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN']}>
              <SurveyBuilder />
            </ProtectedLayout>
          } />

          <Route path="/admin/roles" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN']}>
              <RoleManagement />
            </ProtectedLayout>
          } />

          <Route path="/admin/audit-logs" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN']}>
              <AuditLogs />
            </ProtectedLayout>
          } />

          <Route path="/admin/comments" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN']}>
              <CommentsModeration />
            </ProtectedLayout>
          } />

          <Route path="/admin/media" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN', 'MOBILE_JOURNALIST', 'INSTITUTION_LOGIN']}>
              <MediaLibrary />
            </ProtectedLayout>
          } />
          {/* Chief Editor routes */}
          <Route path="/admin/content" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR']}>
              <ContentQueue />
            </ProtectedLayout>
          } />

          {/* Journalist / Institution routes */}
          <Route path="/journalist/posts" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR', 'MOBILE_JOURNALIST', 'INSTITUTION_LOGIN']}>
              <MyPosts />
            </ProtectedLayout>
          } />
          <Route path="/journalist/create" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR', 'MOBILE_JOURNALIST', 'INSTITUTION_LOGIN']}>
              <PostEditor />
            </ProtectedLayout>
          } />
          <Route path="/journalist/edit/:id" element={
            <ProtectedLayout allowedRoles={['SUPER_ADMIN', 'CHIEF_EDITOR', 'MOBILE_JOURNALIST', 'INSTITUTION_LOGIN']}>
              <PostEditor />
            </ProtectedLayout>
          } />

          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </I18nProvider>
    </AuthProvider>
  );
}

export default App;
