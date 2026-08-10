import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import api from '../../api';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  FileText,
  AlertTriangle,
  PieChart,
  Edit3,
  Tags,
  BellRing,
  Layout,
  HelpCircle,
  Key,
  Activity,
  Calendar,
  DollarSign,
  ChevronDown,
  Globe,
  Shield,
  Newspaper,
  Megaphone,
  User,
  MessageSquare,
  Image as ImageIcon,
  Search,
  Sparkles,
  Building2,
  Languages,
  Briefcase,
  Menu
} from 'lucide-react';

/**
 * Collapsible sidebar section wrapper.
 * Sections remember their open/closed state in localStorage.
 */
const SidebarSection = ({ id, title, icon: Icon, children, defaultOpen = true, badge }) => {
  const storageKey = `sidebar_section_${id}`;
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : defaultOpen;
  });

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    localStorage.setItem(storageKey, String(next));
  };

  return (
    <div className={`sidebar-section ${isOpen ? 'sidebar-section--open' : ''}`}>
      <button className="sidebar-section-header" onClick={toggle} type="button">
        <div className="sidebar-section-header-left">
          {Icon && <Icon size={14} className="sidebar-section-icon" />}
          <span className="sidebar-section-title">{title}</span>
        </div>
        <div className="sidebar-section-header-right">
          {badge > 0 && <span className="sidebar-badge">{badge > 99 ? '99+' : badge}</span>}
          <ChevronDown size={14} className={`sidebar-chevron ${isOpen ? 'sidebar-chevron--open' : ''}`} />
        </div>
      </button>
      <div className={`sidebar-section-body ${isOpen ? 'sidebar-section-body--open' : ''}`}>
        {children}
      </div>
    </div>
  );
};

/** 
 * Single nav item with optional badge count.
 */
const SidebarNavLink = ({ to, icon: Icon, label, badge }) => (
  <NavLink to={to} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
    <Icon size={18} />
    <span className="nav-link-label">{label}</span>
    {badge > 0 && <span className="sidebar-badge sidebar-badge--inline">{badge > 99 ? '99+' : badge}</span>}
  </NavLink>
);

const Sidebar = () => {
  const { user, hasAnyRole } = useAuth();
  const { t } = useI18n();
  const [counts, setCounts] = useState({});

  // Fetch sidebar badge counts every 60 seconds
  const fetchCounts = useCallback(async () => {
    try {
      const res = await api.get('/admin/sidebar/counts');
      setCounts(res.data || {});
    } catch {
      // Silently fail — badges just won't show numbers
    }
  }, []);

  useEffect(() => {
    if (hasAnyRole(['SUPER_ADMIN', 'CHIEF_EDITOR', 'SUB_EDITOR'])) {
      fetchCounts();
      const interval = setInterval(fetchCounts, 60000);
      return () => clearInterval(interval);
    }
  }, [fetchCounts, hasAnyRole]);

  const isAdmin = hasAnyRole(['SUPER_ADMIN']);
  const isEditor = hasAnyRole(['SUPER_ADMIN', 'CHIEF_EDITOR']);
  const isJournalist = hasAnyRole(['MOBILE_JOURNALIST', 'INSTITUTION_LOGIN']);
  const isDistrictAdmin = hasAnyRole(['DISTRICT_ADMIN']);
  const canManageUsers = hasAnyRole(['SUPER_ADMIN', 'CHIEF_EDITOR', 'DISTRICT_ADMIN']);

  const getNewsSiteUrl = () => {
    const host = window.location.hostname;
    return (host === 'localhost' || host === '127.0.0.1')
      ? 'http://localhost:5173'
      : 'https://d3ny6hy96rbdb3.cloudfront.net/';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Link to="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', width: '100%' }}>
          <img src="/assets/logo-banner-light.png" onError={(e) => { e.target.style.display = 'none'; }} alt="King TV Admin" style={{ maxHeight: '52px', width: 'auto', objectFit: 'contain' }} />
        </Link>
      </div>
      
      <nav className="sidebar-nav">
        {/* ═══ MAIN ═══ */}
        <SidebarSection id="main" title={t('main')} icon={LayoutDashboard} defaultOpen={true}>
          <SidebarNavLink to="/admin/dashboard" icon={LayoutDashboard} label={t('dashboard')} />
          {(isEditor || isDistrictAdmin) && (
            <SidebarNavLink to="/admin/analytics" icon={PieChart} label={t('analytics')} />
          )}
        </SidebarSection>

        {/* ═══ NEWSROOM (Content Creation & Management) ═══ */}
        {(isEditor || isDistrictAdmin) && (
          <SidebarSection 
            id="newsroom" 
            title={t('newsroom')} 
            icon={Newspaper} 
            defaultOpen={true}
            badge={(counts.pendingArticles || 0) + (counts.pendingUgc || 0)}
          >
            <SidebarNavLink to="/admin/editorial-calendar" icon={Calendar} label={t('editorialCalendar')} />
            <SidebarNavLink to="/admin/news" icon={FileText} label={t('newsManagement')} />
            <SidebarNavLink to="/admin/media" icon={ImageIcon} label={t('mediaLibrary') || 'Media Library'} />
            <SidebarNavLink to="/admin/comments" icon={MessageSquare} label={t('comments') || 'Comments Moderation'} />
            <SidebarNavLink to="/admin/ugc-queue" icon={Users} label={t('ugcQueue')} badge={counts.pendingUgc} />
            <SidebarNavLink to="/admin/breaking" icon={AlertTriangle} label={t('breakingNews')} badge={counts.activeBreaking} />
            <SidebarNavLink to="/admin/rss" icon={Globe} label="RSS Importer" />
          </SidebarSection>
        )}

        {/* ═══ WORKSPACE (Journalist / Institution) ═══ */}
        {isJournalist && (
          <SidebarSection id="workspace" title={t('workspace')} icon={Edit3} defaultOpen={true}>
            <SidebarNavLink to="/journalist/posts" icon={Edit3} label={t('myPosts')} />
            <SidebarNavLink to="/admin/media" icon={ImageIcon} label={t('mediaLibrary') || 'Media Library'} />
          </SidebarSection>
        )}

        {/* ═══ ENGAGEMENT & LAYOUT ═══ */}
        {isEditor && (
          <SidebarSection id="engagement" title={t('engagement')} icon={Megaphone} defaultOpen={false}>
            <SidebarNavLink to="/admin/push" icon={BellRing} label={t('push')} />
            <SidebarNavLink to="/admin/layout" icon={Layout} label={t('layout')} />
            <SidebarNavLink to="/admin/navbar" icon={Menu} label={t('navbar')} />
            <SidebarNavLink to="/admin/community" icon={Building2} label="Community Modules" />
            <SidebarNavLink to="/admin/surveys" icon={HelpCircle} label={t('surveys')} />
          </SidebarSection>
        )}

        {/* ═══ MONETIZATION ═══ */}
        {isAdmin && (
          <SidebarSection id="monetization" title={t('monetization')} icon={DollarSign} defaultOpen={false}>
            <SidebarNavLink to="/admin/ads" icon={DollarSign} label={t('adManagement')} />
            <SidebarNavLink to="/admin/rewards" icon={Activity} label="Reward System" />
          </SidebarSection>
        )}

        {/* ═══ ADMINISTRATION ═══ */}
        {(isAdmin || canManageUsers) && (
          <SidebarSection 
            id="administration" 
            title={t('administration')} 
            icon={Shield} 
            defaultOpen={false}
            badge={counts.pendingProfanity}
          >
            {canManageUsers && (
              <>
                <SidebarNavLink to="/admin/users" icon={Users} label={t('userAccounts')} />
                <SidebarNavLink to="/admin/kyc" icon={Shield} label={t('kycVerification') || 'KYC Verification'} />
              </>
            )}
            {isAdmin && (
              <>
                <SidebarNavLink to="/admin/roles" icon={Key} label={t('rolesPermissions')} />
                <SidebarNavLink to="/admin/subscribers" icon={Users} label="Subscribers" />
                <SidebarNavLink to="/admin/taxonomy" icon={Tags} label={t('taxonomy')} />
                <SidebarNavLink to="/admin/seo" icon={Search} label={t('seoConsole') || 'SEO & Sitemap'} />
                <SidebarNavLink to="/admin/settings" icon={Settings} label={t('settings')} />
                <SidebarNavLink to="/admin/settings/ai" icon={Sparkles} label="AI Configuration" />
                <SidebarNavLink to="/admin/settings/language" icon={Languages} label="Language & Fonts" />
                <SidebarNavLink to="/admin/profanity" icon={AlertTriangle} label={t('profanity')} badge={counts.pendingProfanity} />
                <SidebarNavLink to="/admin/audit-logs" icon={Activity} label={t('audit')} />
              </>
            )}
          </SidebarSection>
        )}

        {/* ═══ PERSONAL ═══ */}
        <div className="sidebar-divider" />
        <SidebarNavLink to="/admin/profile" icon={User} label={t('myProfile')} />
        
        <a href={getNewsSiteUrl()} target="_blank" rel="noopener noreferrer" className="nav-link nav-link--external">
          <Globe size={18} />
          <span className="nav-link-label">{t('viewNewsSite')}</span>
        </a>
      </nav>
    </aside>
  );
};

export default Sidebar;
