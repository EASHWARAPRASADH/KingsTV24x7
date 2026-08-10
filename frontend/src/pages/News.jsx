import React, { useContext, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { GeoContext } from '../context/GeoContext';
import { fetchApi, getImageUrl } from '../utils/api';
import { getRelativeTime, getReadingTime, getViewsCount } from '../utils/formatters';
import AdWidget from '../components/AdWidget';

const News = () => {
  const { lang } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const { activeDistrict, allDistricts: geoDistricts } = useContext(GeoContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary Data State
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [liveVideo, setLiveVideo] = useState(null);
  const [trending, setTrending] = useState([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedDistrict, setSelectedDistrict] = useState(() => 'all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'popular'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const districtList = geoDistricts.length > 0
    ? geoDistricts.map(d => ({ en: d.nameEn, ta: d.nameTa || d.nameEn }))
    : [
    { en: 'Chennai', ta: 'சென்னை' },
    { en: 'Coimbatore', ta: 'கோவை' },
    { en: 'Madurai', ta: 'மதுரை' },
    { en: 'Trichy', ta: 'திருச்சி' },
    { en: 'Salem', ta: 'சேலம்' },
    { en: 'Tirunelveli', ta: 'திருநெல்வேலி' },
    { en: 'Vellore', ta: 'வேலூர்' },
    { en: 'Erode', ta: 'ஈரோடு' },
    { en: 'Thoothukudi', ta: 'தூத்துக்குடி' },
    { en: 'Tanjore', ta: 'தஞ்சாவூர்' },
    { en: 'Kanyakumari', ta: 'கன்னியாகுமரி' },
    { en: 'Namakkal', ta: 'நாமக்கல்' },
    { en: 'Dharmapuri', ta: 'தர்மபுரி' },
    { en: 'Pudukkottai', ta: 'புதுக்கோட்டை' },
    { en: 'Karur', ta: 'கரூர்' },
    { en: 'Sivaganga', ta: 'சிவகங்கை' },
    { en: 'Theni', ta: 'தேனி' },
    { en: 'Virudhunagar', ta: 'விருதுநகர்' },
    { en: 'Thiruvallur', ta: 'திருவள்ளூர்' },
    { en: 'Kanchipuram', ta: 'காஞ்சிபுரம்' },
    { en: 'Chengalpattu', ta: 'செங்கல்பட்டு' },
    { en: 'Thiruvannamalai', ta: 'திருவண்ணாமலை' },
    { en: 'Viluppuram', ta: 'விழுப்புரம்' },
    { en: 'Cuddalore', ta: 'கடலூர்' },
    { en: 'Nagapattinam', ta: 'நாகப்பட்டினம்' },
    { en: 'Tiruvarur', ta: 'திருவாரூர்' },
    { en: 'Mayiladuthurai', ta: 'மயிலாடுதுறை' },
    { en: 'Ariyalur', ta: 'அரியலூர்' },
    { en: 'Perambalur', ta: 'பெரம்பலூர்' },
    { en: 'Nilgiris', ta: 'நீலகிரி' },
    { en: 'Tiruppur', ta: 'திருப்பூர்' },
    { en: 'Tenkasi', ta: 'தென்காசி' },
    { en: 'Ranipet', ta: 'ராணிப்பேட்டை' },
    { en: 'Tirupathur', ta: 'திருப்பத்தூர்' },
    { en: 'Kallakurichi', ta: 'கள்ளக்குறிச்சி' },
    { en: 'Krishnagiri', ta: 'கிருஷ்ணகிரி' },
    { en: 'Ramanathapuram', ta: 'ராமநாதபுரம்' }
  ];

  const categoryColorMap = {
    1: '#EF4444', // Politics - Red
    2: '#2563EB', // Business - Blue
    3: '#10B981', // Sports - Green
    4: '#8B5CF6', // Cinema - Purple
    5: '#06B6D4', // Tech - Cyan
    6: '#F59E0B', // Regional - Amber
    7: '#EC4899'  // International - Pink
  };

  useEffect(() => {
    document.title = lang === 'en' ? 'Newsroom & Live Bulletins | KINGS 24x7' : 'செய்தி அரங்கம் | கிங்ஸ் 24x7';
  }, [lang]);

  useEffect(() => {
    setLoading(true);

    // 1. Fetch categories
    fetchApi('/categories')
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {
        fetchApi('/categories/nav').then(navData => {
          if (Array.isArray(navData)) setCategories(navData);
        }).catch(() => {});
      });

    // 2. Fetch live video stream
    fetchApi('/videos/live')
      .then(data => {
        if (data && (data.youtubeUrl || data.videoUrl)) {
          setLiveVideo(data);
        } else {
          setLiveVideo({
            title: lang === 'en' ? 'KINGS 24x7 Live TV Stream' : 'கிங்ஸ் 24x7 நேரலை ஒளிபரப்பு',
            youtubeUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk'
          });
        }
      })
      .catch(() => {
        setLiveVideo({
          title: lang === 'en' ? 'KINGS 24x7 Live TV Stream' : 'கிங்ஸ் 24x7 நேரலை ஒளிபரப்பு',
          youtubeUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk'
        });
      });

    // 3. Fetch web published articles
    fetchApi('/articles/getAllWeb?size=300&sortBy=publishedAt&direction=desc')
      .then(res => {
        const data = Array.isArray(res) ? res : (res?.content || []);
        setArticles(data);

        // Top 5 trending articles ordered by views
        const popular = [...data].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 5);
        setTrending(popular);
      })
      .catch(err => console.warn("Failed to load newsroom articles", err))
      .finally(() => setLoading(false));
  }, [lang]);

  // Synchronize URL search parameters to state
  useEffect(() => {
    const catParam = searchParams.get('category');
    const distParam = searchParams.get('district');
    if (catParam) setSelectedCategory(catParam);
    if (distParam) setSelectedDistrict(distParam);
  }, [searchParams]);

  // Pre-select user's geo district in News filter
  useEffect(() => {
    if (activeDistrict && activeDistrict.nameEn && selectedDistrict === 'all') {
      // News filter uses English names for district
      setSelectedDistrict(activeDistrict.nameEn);
    }
  }, [activeDistrict]);

  // Handle category pill changes
  const handleCategoryChange = (catId) => {
    setSelectedCategory(String(catId));
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    if (String(catId) === 'all') params.delete('category');
    else params.set('category', String(catId));
    setSearchParams(params);
  };

  // Handle district changes
  const handleDistrictChange = (dist) => {
    setSelectedDistrict(dist);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    if (dist === 'all') params.delete('district');
    else params.set('district', dist);
    setSearchParams(params);
  };

  // Calculate article counts per category
  const getCategoryCount = (catId) => {
    if (catId === 'all') return articles.length;
    return articles.filter(a => String(a.categoryId) === String(catId) || String(a.categorySlug) === String(catId)).length;
  };

  // Filter and Sorting Logic
  const filteredArticles = articles.filter(art => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = query === '' || 
      (art.titleEn || '').toLowerCase().includes(query) ||
      (art.titleTa || '').toLowerCase().includes(query) ||
      (art.shortDescEn || '').toLowerCase().includes(query) ||
      (art.shortDescTa || '').toLowerCase().includes(query) ||
      (art.contentEn || '').toLowerCase().includes(query) ||
      (art.contentTa || '').toLowerCase().includes(query);

    const matchesCategory = selectedCategory === 'all' || 
      String(art.categoryId) === String(selectedCategory) ||
      (art.categorySlug && art.categorySlug.toLowerCase() === selectedCategory.toLowerCase());

    const matchesDistrict = selectedDistrict === 'all' || 
      (art.districtNameEn && art.districtNameEn.toLowerCase() === selectedDistrict.toLowerCase()) ||
      (art.districtNameTa && art.districtNameTa.toLowerCase() === selectedDistrict.toLowerCase()) ||
      (art.districtId && String(art.districtId) === selectedDistrict);

    return matchesSearch && matchesCategory && matchesDistrict;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt);
    }
    if (sortBy === 'oldest') {
      return new Date(a.publishedAt || a.createdAt) - new Date(b.publishedAt || b.createdAt);
    }
    if (sortBy === 'popular') {
      return (b.viewsCount || 0) - (a.viewsCount || 0);
    }
    return 0;
  });

  // Hero split-deck items (Only shown on Page 1 when no active filters)
  const isDefaultView = currentPage === 1 && searchQuery.trim() === '' && selectedCategory === 'all' && selectedDistrict === 'all';
  const featuredArticle = isDefaultView && filteredArticles.length > 0 ? filteredArticles[0] : null;
  const sideHeroArticles = isDefaultView && filteredArticles.length > 1 ? filteredArticles.slice(1, 4) : [];

  // Exclude hero deck items from grid on Page 1 default view to avoid duplicate display
  const baseGridList = (isDefaultView && filteredArticles.length > 4) 
    ? filteredArticles.slice(4) 
    : filteredArticles;

  const totalPages = Math.ceil(baseGridList.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentArticles = baseGridList.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    const contentNode = document.getElementById('news-content-start');
    if (contentNode) {
      contentNode.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };

  return (
    <div style={{
      background: theme === 'dark' ? '#070A13' : '#F4F6FA',
      color: theme === 'dark' ? '#E2E8F0' : '#1E293B',
      minHeight: '100vh',
      fontFamily: '"Inter", "Outfit", sans-serif',
      paddingBottom: '4rem'
    }}>
      <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
        
        {/* Top Newsroom Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          padding: '2rem 0 1.2rem 0',
          borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '4px', height: '22px', background: '#2563EB', borderRadius: '2px' }}></span>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#2563EB' }}>
                {lang === 'en' ? 'LIVE BROADCAST & NEWS DESK' : 'நேரலை மற்றும் செய்திப் பிரிவு'}
              </span>
            </div>
            <h1 style={{
              fontSize: '2.4rem',
              fontWeight: 950,
              letterSpacing: '-1.5px',
              margin: '6px 0 0 0',
              lineHeight: 1.1,
              fontFamily: '"Outfit", sans-serif',
              color: theme === 'dark' ? '#FFFFFF' : '#1E293B'
            }}>
              {lang === 'en' ? 'The Newsroom Feed' : 'செய்தி அரங்கம்'}
            </h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
              padding: '6px 14px',
              borderRadius: '20px',
              color: theme === 'dark' ? '#94A3B8' : '#64748B',
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}>
              <i className="far fa-calendar-alt" style={{ marginRight: '6px', color: '#2563EB' }}></i>
              {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ta-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div className="animate-spin" style={{ width: '48px', height: '48px', border: '3px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#94A3B8' }}>
                {lang === 'en' ? 'Loading latest newsroom updates...' : 'செய்திகள் தளவமைப்பு தயாராகிறது...'}
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* BBC-Inspired Lead News Deck */}
            {featuredArticle && (
              <div style={{
                display: 'grid',
                gap: '1.5rem',
                margin: '1.5rem 0 2.5rem 0'
              }} className="hero-split-deck-layout">
                <style>{`
                  .hero-split-deck-layout {
                    grid-template-columns: 1fr;
                  }
                  @media (min-width: 992px) {
                    .hero-split-deck-layout {
                      grid-template-columns: 7fr 5fr !important;
                    }
                  }
                `}</style>

                {/* Left Big Lead Featured Card */}
                <div style={{
                  background: theme === 'dark' ? '#0D111D' : '#FFFFFF',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.05)',
                  border: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}>
                  <div style={{ position: 'relative', width: '100%', height: '360px', overflow: 'hidden' }}>
                    <img
                      src={getImageUrl(featuredArticle)}
                      alt={lang === 'en' ? featuredArticle.titleEn : featuredArticle.titleTa}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      display: 'flex',
                      gap: '8px',
                      zIndex: 5
                    }}>
                      <span style={{ background: '#DC2626', color: '#FFFFFF', fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {lang === 'en' ? 'FEATURED' : 'முக்கிய செய்தி'}
                      </span>
                      <span style={{ 
                        background: categoryColorMap[featuredArticle.categoryId] || '#2563EB', 
                        color: '#FFFFFF', 
                        fontSize: '10px', 
                        fontWeight: 900, 
                        padding: '4px 10px', 
                        borderRadius: '4px', 
                        textTransform: 'uppercase' 
                      }}>
                        {lang === 'en' ? (featuredArticle.categoryName || 'News') : (featuredArticle.categoryNameTa || 'செய்திகள்')}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ padding: '1.6rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{
                      fontSize: '1.6rem',
                      fontWeight: 900,
                      margin: '0 0 10px 0',
                      lineHeight: 1.3,
                      fontFamily: '"Outfit", sans-serif'
                    }}>
                      <Link to={`/article/${featuredArticle.id || featuredArticle.article_id}`} style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#2563EB'} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>
                        {lang === 'en' ? (featuredArticle.titleEn || featuredArticle.titleTa) : (featuredArticle.titleTa || featuredArticle.titleEn)}
                      </Link>
                    </h2>
                    <p style={{
                      fontSize: '14px',
                      color: theme === 'dark' ? '#94A3B8' : '#64748B',
                      lineHeight: 1.6,
                      margin: '0 0 16px 0',
                      flex: 1
                    }}>
                      {lang === 'en' ? (featuredArticle.shortDescEn || featuredArticle.shortDescTa) : (featuredArticle.shortDescTa || featuredArticle.shortDescEn)}
                    </p>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#94A3B8',
                      borderTop: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F1F5F9',
                      paddingTop: '12px'
                    }}>
                      <span>
                        <i className="far fa-user" style={{ marginRight: '6px', color: '#2563EB' }}></i>
                        {featuredArticle.authorName || 'Kings TV Desk'}
                      </span>
                      <div style={{ display: 'flex', gap: '14px' }}>
                        <span>
                          <i className="far fa-eye" style={{ marginRight: '4px' }}></i>
                          {getViewsCount(featuredArticle)}
                        </span>
                        <span>
                          <i className="far fa-clock" style={{ marginRight: '4px' }}></i>
                          {getReadingTime(featuredArticle, lang)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Bulletins Stack */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: theme === 'dark' ? '#94A3B8' : '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', background: '#DC2626', borderRadius: '50%' }}></span>
                      {lang === 'en' ? 'TOP HEADLINES' : 'தலைப்புச் செய்திகள்'}
                    </span>
                  </div>

                  {sideHeroArticles.map((art, idx) => (
                    <div
                      key={art.id || art.article_id || idx}
                      style={{
                        background: theme === 'dark' ? '#0D111D' : '#FFFFFF',
                        borderRadius: '12px',
                        padding: '1.1rem',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid #E2E8F0',
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'center',
                        transition: 'transform 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                    >
                      <div style={{ width: '95px', height: '75px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                        <img
                          src={getImageUrl(art)}
                          alt={lang === 'en' ? art.titleEn : art.titleTa}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ 
                          fontSize: '10px', 
                          color: categoryColorMap[art.categoryId] || '#2563EB', 
                          fontWeight: 800, 
                          textTransform: 'uppercase' 
                        }}>
                          {lang === 'en' ? (art.categoryName || 'News') : (art.categoryNameTa || 'செய்திகள்')}
                        </span>
                        <h4 style={{
                          fontSize: '13.5px',
                          fontWeight: 800,
                          margin: '4px 0',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          <Link to={`/article/${art.id || art.article_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {lang === 'en' ? (art.titleEn || art.titleTa) : (art.titleTa || art.titleEn)}
                          </Link>
                        </h4>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                          <span><i className="far fa-eye"></i> {getViewsCount(art)}</span>
                          <span>•</span>
                          <span>{getReadingTime(art, lang)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter & Search Control Panel */}
            <div id="news-content-start" style={{
              background: theme === 'dark' ? '#0D111D' : '#FFFFFF',
              borderRadius: '16px',
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              padding: '1.4rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
                alignItems: 'center'
              }}>
                {/* Search Bar */}
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-search" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '14px' }}></i>
                  <input
                    type="text"
                    placeholder={lang === 'en' ? 'Search headlines & topics...' : 'செய்திகளைத் தேடுங்கள்...'}
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    style={{
                      width: '100%',
                      padding: '11px 16px 11px 42px',
                      borderRadius: '10px',
                      border: theme === 'dark' ? '1px solid #1E293B' : '1px solid #CBD5E1',
                      background: theme === 'dark' ? '#131926' : '#F8FAFC',
                      color: 'inherit',
                      outline: 'none',
                      fontSize: '13.5px'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', fontSize: '14px' }}
                    >&times;</button>
                  )}
                </div>

                {/* District Filter Dropdown */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      borderRadius: '10px',
                      border: theme === 'dark' ? '1px solid #1E293B' : '1px solid #CBD5E1',
                      background: theme === 'dark' ? '#131926' : '#FFFFFF',
                      color: 'inherit',
                      outline: 'none',
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      appearance: 'none'
                    }}
                  >
                    <option value="all">📍 {lang === 'en' ? 'All Districts (Tamil Nadu)' : 'அனைத்து மாவட்டங்கள்'}</option>
                    {districtList.map(d => (
                      <option key={d.en} value={d.en}>{lang === 'en' ? d.en : d.ta}</option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8', fontSize: '10px' }}></i>
                </div>

                {/* Sort Filter Dropdown */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      borderRadius: '10px',
                      border: theme === 'dark' ? '1px solid #1E293B' : '1px solid #CBD5E1',
                      background: theme === 'dark' ? '#131926' : '#FFFFFF',
                      color: 'inherit',
                      outline: 'none',
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      appearance: 'none'
                    }}
                  >
                    <option value="newest">🕒 {lang === 'en' ? 'Latest Published' : 'புதிய செய்திகள்'}</option>
                    <option value="popular">🔥 {lang === 'en' ? 'Most Viewed / Trending' : 'பிரபலமான செய்திகள்'}</option>
                    <option value="oldest">⌛ {lang === 'en' ? 'Oldest First' : 'பழைய செய்திகள்'}</option>
                  </select>
                  <i className="fas fa-chevron-down" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8', fontSize: '10px' }}></i>
                </div>
              </div>

              {/* Category Pill Buttons with Dynamic Article Count Badges */}
              <div style={{
                marginTop: '1.2rem',
                borderTop: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F1F5F9',
                paddingTop: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  overflowX: 'auto',
                  gap: '8px',
                  paddingBottom: '4px'
                }} className="hide-scrollbar">
                  <button
                    onClick={() => handleCategoryChange('all')}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: selectedCategory === 'all' ? '#2563EB' : (theme === 'dark' ? '#131926' : '#F1F5F9'),
                      color: selectedCategory === 'all' ? '#FFFFFF' : 'inherit',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{lang === 'en' ? 'All Feeds' : 'அனைத்து செய்திகள்'}</span>
                    <span style={{ 
                      fontSize: '10px', 
                      background: selectedCategory === 'all' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)', 
                      padding: '1px 6px', 
                      borderRadius: '10px' 
                    }}>
                      {getCategoryCount('all')}
                    </span>
                  </button>

                  {categories.map(cat => {
                    const catIdStr = String(cat.id || cat.categoryId);
                    const isSelected = selectedCategory === catIdStr || selectedCategory === cat.slug;
                    const count = getCategoryCount(catIdStr);

                    return (
                      <button
                        key={cat.id || cat.categoryId}
                        onClick={() => handleCategoryChange(catIdStr)}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '20px',
                          border: 'none',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: isSelected ? '#2563EB' : (theme === 'dark' ? '#131926' : '#F1F5F9'),
                          color: isSelected ? '#FFFFFF' : 'inherit',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>{lang === 'en' ? (cat.name || cat.nameEn) : (cat.nameTa || cat.name)}</span>
                        {count > 0 && (
                          <span style={{ 
                            fontSize: '10px', 
                            background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)', 
                            padding: '1px 6px', 
                            borderRadius: '10px' 
                          }}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Results Counter Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#94A3B8' }}>
                {lang === 'en' 
                  ? `Showing ${baseGridList.length > 0 ? indexOfFirstItem + 1 : 0}–${Math.min(indexOfLastItem, baseGridList.length)} of ${baseGridList.length} articles`
                  : `${baseGridList.length} செய்திகளில் ${baseGridList.length > 0 ? indexOfFirstItem + 1 : 0}–${Math.min(indexOfLastItem, baseGridList.length)} காட்டப்படுகிறது`}
              </span>
            </div>

            {/* Main Feed Split Layout */}
            <div style={{
              display: 'grid',
              gap: '2rem',
              alignItems: 'start'
            }} className="news-main-grid-layout">
              <style>{`
                .news-main-grid-layout {
                  grid-template-columns: 1fr;
                }
                @media (min-width: 992px) {
                  .news-main-grid-layout {
                    grid-template-columns: 8fr 4fr !important;
                  }
                }
              `}</style>
              
              {/* Left Column: Articles Grid */}
              <div>
                {baseGridList.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '5rem 2rem',
                    background: theme === 'dark' ? '#0D111D' : '#FFFFFF',
                    borderRadius: '16px',
                    border: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid #E2E8F0'
                  }}>
                    <i className="far fa-newspaper" style={{ fontSize: '52px', color: '#94A3B8', marginBottom: '1rem' }}></i>
                    <h3 style={{ fontSize: '18px', fontWeight: 800 }}>
                      {lang === 'en' ? 'No Articles Found' : 'செய்திகள் எதுவும் இல்லை'}
                    </h3>
                    <p style={{ color: '#94A3B8', fontSize: '13.5px', marginTop: '6px' }}>
                      {lang === 'en' ? 'Try adjusting your search filters or selecting a different category.' : 'தேடல் சொல்லை அல்லது வகையை மாற்றித் தேடுங்கள்.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '1.4rem'
                    }}>
                      {currentArticles.map(art => (
                        <div
                          key={art.id || art.article_id}
                          style={{
                            background: theme === 'dark' ? '#0D111D' : '#FFFFFF',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 18px rgba(0,0,0,0.02)',
                            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid #E2E8F0',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}
                          className="news-card"
                        >
                          <style>{`
                            .news-card:hover {
                              transform: translateY(-4px);
                              box-shadow: 0 10px 25px rgba(0,0,0,0.08) !important;
                            }
                          `}</style>
                          <Link to={`/article/${art.id || art.article_id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ width: '100%', height: '185px', overflow: 'hidden', position: 'relative' }}>
                              <img
                                src={getImageUrl(art)}
                                alt={lang === 'en' ? art.titleEn : art.titleTa}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';
                                }}
                              />
                              <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                                <span style={{ 
                                  background: categoryColorMap[art.categoryId] || '#2563EB', 
                                  color: '#FFFFFF', 
                                  fontSize: '9.5px', 
                                  fontWeight: 900, 
                                  padding: '3px 8px', 
                                  borderRadius: '4px', 
                                  textTransform: 'uppercase' 
                                }}>
                                  {lang === 'en' ? (art.categoryName || 'News') : (art.categoryNameTa || 'செய்திகள்')}
                                </span>
                              </div>
                            </div>

                            <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                              <h3 style={{
                                fontSize: '15px',
                                fontWeight: 800,
                                margin: '0 0 8px 0',
                                lineHeight: 1.35,
                                fontFamily: '"Outfit", sans-serif',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {lang === 'en' ? (art.titleEn || art.titleTa) : (art.titleTa || art.titleEn)}
                              </h3>
                              <p style={{
                                fontSize: '12.5px',
                                color: theme === 'dark' ? '#94A3B8' : '#64748B',
                                margin: '0 0 14px 0',
                                lineHeight: 1.5,
                                flex: 1,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical'
                              }}>
                                {lang === 'en' ? (art.shortDescEn || art.shortDescTa) : (art.shortDescTa || art.shortDescEn)}
                              </p>

                              <div style={{
                                borderTop: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid #F1F5F9',
                                paddingTop: '10px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '11px',
                                color: '#94A3B8',
                                fontWeight: 700
                              }}>
                                <span>
                                  <i className="far fa-clock" style={{ marginRight: '4px' }}></i> 
                                  {getRelativeTime(art.publishedAt || art.createdAt, lang)}
                                </span>
                                <span>
                                  <i className="far fa-eye" style={{ marginRight: '4px' }}></i> 
                                  {getViewsCount(art)}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '2.5rem'
                      }}>
                        <button
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            border: 'none',
                            background: theme === 'dark' ? '#0D111D' : '#FFFFFF',
                            color: 'inherit',
                            cursor: 'pointer',
                            opacity: currentPage === 1 ? 0.4 : 1,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                          }}
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>

                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => paginate(i + 1)}
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              border: 'none',
                              background: currentPage === i + 1 ? '#2563EB' : (theme === 'dark' ? '#0D111D' : '#FFFFFF'),
                              color: currentPage === i + 1 ? '#FFFFFF' : 'inherit',
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                              transition: 'all 0.2s'
                            }}
                          >
                            {i + 1}
                          </button>
                        ))}

                        <button
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            border: 'none',
                            background: theme === 'dark' ? '#0D111D' : '#FFFFFF',
                            color: 'inherit',
                            cursor: 'pointer',
                            opacity: currentPage === totalPages ? 0.4 : 1,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                          }}
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right Column: Sticky Sidebar Widgets */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                position: 'sticky',
                top: '90px'
              }}>
                {/* 1. Live Broadcast Stream Widget */}
                <div style={{
                  background: theme === 'dark' ? '#0D111D' : '#FFFFFF',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  border: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid #E2E8F0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626', display: 'inline-block' }}></span>
                      {lang === 'en' ? 'LIVE STREAM' : 'நேரலை ஒளிபரப்பு'}
                    </span>
                    <span style={{ fontSize: '10px', background: 'rgba(220, 38, 38, 0.1)', color: '#DC2626', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                      24x7
                    </span>
                  </div>
                  <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '10px', overflow: 'hidden' }}>
                    {(() => {
                      let rawUrl = liveVideo?.youtubeUrl || liveVideo?.videoUrl || '';
                      const DEFAULT_EMBED = 'https://www.youtube.com/embed/jfKfPfyJRdk';

                      let srcUrl = DEFAULT_EMBED;
                      if (rawUrl && !rawUrl.includes('live_stream?channel=') && !rawUrl.includes('live1')) {
                        if (rawUrl.includes('embed/')) {
                          srcUrl = rawUrl;
                        } else {
                          const m = rawUrl.match(/(?:v=|\/|embed\/|youtu\.be\/)([0-9A-Za-z_-]{11})/);
                          if (m && m[1]) srcUrl = `https://www.youtube.com/embed/${m[1]}`;
                        }
                      }
                      return (
                        <iframe
                          src={srcUrl}
                          title={liveVideo?.title || 'Kings TV Live Stream'}
                          style={{ width: '100%', height: '100%', border: 'none' }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      );
                    })()}
                  </div>
                </div>

                {/* 2. Weather Forecast Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                  color: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '1.4rem',
                  boxShadow: '0 8px 25px rgba(59, 130, 246, 0.15)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.85 }}>
                        {lang === 'en' ? 'TAMIL NADU WEATHER' : 'வானிலை அறிக்கை'}
                      </span>
                      <h4 style={{ fontSize: '17px', fontWeight: 900, margin: '4px 0 0 0', fontFamily: '"Outfit", sans-serif' }}>
                        {lang === 'en' ? 'Chennai Metro' : 'சென்னை மாநகரம்'}
                      </h4>
                    </div>
                    <i className="fas fa-cloud-sun-rain" style={{ fontSize: '28px', color: '#FFBD59' }}></i>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '12px 0 6px 0' }}>
                    <h2 style={{ fontSize: '2.6rem', fontWeight: 950, margin: 0 }}>32°C</h2>
                    <span style={{ fontSize: '13px', opacity: 0.85 }}>/ 89.6°F</span>
                  </div>
                  <p style={{ fontSize: '12px', margin: 0, opacity: 0.85, lineHeight: 1.4 }}>
                    {lang === 'en' ? 'Partly cloudy sky. High humidity. Occasional showers expected.' : 'ஓரளவு மேகமூட்டம். ஆங்காங்கே மழை பெய்ய வாய்ப்பு.'}
                  </p>
                </div>

                {/* 3. Ranked Trending Stories (#01 to #05) */}
                <div style={{
                  background: theme === 'dark' ? '#0D111D' : '#FFFFFF',
                  borderRadius: '16px',
                  padding: '1.4rem',
                  border: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid #E2E8F0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                }}>
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    margin: '0 0 1.2rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fas fa-fire" style={{ color: '#EF4444' }}></i>
                    {lang === 'en' ? 'TRENDING STORIES' : 'பிரபலமான செய்திகள்'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    {trending.map((art, idx) => (
                      <div key={art.id || art.article_id || idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 950,
                          color: '#2563EB',
                          opacity: 0.4,
                          lineHeight: 1,
                          width: '24px'
                        }}>
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <Link to={`/article/${art.id || art.article_id}`} style={{
                            textDecoration: 'none',
                            color: 'inherit',
                            fontSize: '13.5px',
                            fontWeight: 800,
                            lineHeight: 1.35,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {lang === 'en' ? (art.titleEn || art.titleTa) : (art.titleTa || art.titleEn)}
                          </Link>
                          <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginTop: '4px' }}>
                            <i className="far fa-eye" style={{ marginRight: '4px' }}></i>
                            {getViewsCount(art)} {lang === 'en' ? 'views' : 'பார்வைகள்'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ad Placement */}
                <AdWidget placementId="sidebar_ad_archive" />
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default News;
