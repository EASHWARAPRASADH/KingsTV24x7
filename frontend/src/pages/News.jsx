import React, { useContext, useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { fetchApi, getImageUrl } from '../utils/api';
import AdWidget from '../components/AdWidget';

const News = () => {
  const { lang } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [breakingNews, setBreakingNews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [liveVideo, setLiveVideo] = useState(null);
  const [trending, setTrending] = useState([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedDistrict, setSelectedDistrict] = useState(searchParams.get('district') || 'all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'popular'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const districts = [
    'Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem', 'Tirunelveli',
    'Vellore', 'Erode', 'Thoothukudi', 'Tanjore', 'Kanyakumari', 'Namakkal',
    'Dharmapuri', 'Pudukkottai', 'Karur', 'Sivaganga', 'Theni', 'Virudhunagar',
    'Thiruvallur', 'Kanchipuram', 'Chengalpattu', 'Thiruvannamalai', 'Viluppuram',
    'Cuddalore', 'Nagapattinam', 'Tiruvarur', 'Mayiladuthurai', 'Ariyalur',
    'Perambalur', 'Nilgiris', 'Tiruppur', 'Tenkasi', 'Ranipet', 'Tirupathur',
    'Kallakurichi', 'Krishnagiri', 'Ramanathapuram'
  ];

  useEffect(() => {
    document.title = lang === 'en' ? 'Latest News & Bulletins | KINGS 24x7' : 'சமீபத்திய செய்திகள் | கிங்ஸ் 24x7';
  }, [lang]);

  useEffect(() => {
    setLoading(true);

    // 1. Fetch categories
    fetchApi('/categories/nav')
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(err => console.warn("Failed to load categories for filter", err));

    // 2. Fetch live stream
    fetchApi('/videos/live')
      .then(data => {
        if (data && (data.youtubeUrl || data.videoUrl)) {
          setLiveVideo(data);
        } else {
          setLiveVideo({
            title: lang === 'en' ? 'KINGS 24x7 Live TV News Stream' : 'கிங்ஸ் 24x7 நேரலை செய்தி',
            youtubeUrl: 'https://www.youtube.com/embed/2g811Eo7K8U'
          });
        }
      })
      .catch(() => {
        setLiveVideo({
          title: lang === 'en' ? 'KINGS 24x7 Live TV News Stream' : 'கிங்ஸ் 24x7 நேரலை செய்தி',
          youtubeUrl: 'https://www.youtube.com/embed/2g811Eo7K8U'
        });
      });

    // 3. Fetch breaking news
    fetchApi('/breaking-news/getAllWeb')
      .then(res => {
        const data = res?.content || (Array.isArray(res) ? res : []);
        setBreakingNews(data);
      })
      .catch(() => {});

    // 4. Fetch all articles
    fetchApi('/articles/getAllWeb?size=300')
      .then(res => {
        const data = res?.content || (Array.isArray(res) ? res : []);
        setArticles(data);
        // Extract top 5 popular articles for trending sidebar
        const popular = [...data].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 5);
        setTrending(popular);
      })
      .catch(err => console.warn("Failed to load articles", err))
      .finally(() => setLoading(false));
  }, [lang]);

  // Sync params to filter states
  useEffect(() => {
    const catParam = searchParams.get('category');
    const distParam = searchParams.get('district');
    if (catParam) setSelectedCategory(catParam);
    if (distParam) setSelectedDistrict(distParam);
  }, [searchParams]);

  // Handle filter changes
  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    if (catId === 'all') params.delete('category');
    else params.set('category', catId);
    setSearchParams(params);
  };

  const handleDistrictChange = (dist) => {
    setSelectedDistrict(dist);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    if (dist === 'all') params.delete('district');
    else params.set('district', dist);
    setSearchParams(params);
  };

  // Filter and Sort Processing
  const filteredArticles = articles.filter(art => {
    const matchesSearch = searchQuery.trim() === '' || 
      (art.titleEn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.titleTa || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.contentEn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.contentTa || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || 
      String(art.categoryId) === String(selectedCategory);

    const matchesDistrict = selectedDistrict === 'all' || 
      (art.districtNameEn && art.districtNameEn.toLowerCase() === selectedDistrict.toLowerCase()) ||
      (art.districtNameTa && art.districtNameTa.toLowerCase() === selectedDistrict.toLowerCase());

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

  // Highlight featured top article & right sidebar articles (split hero layout)
  const featuredArticle = filteredArticles[0];
  const sideHeroArticles = filteredArticles.slice(1, 4);

  // Pagination calculations
  // We exclude the hero deck articles from pagination list on page 1 to prevent duplication
  const baseList = (currentPage === 1) 
    ? filteredArticles.slice(4) 
    : filteredArticles;

  const totalPages = Math.ceil(baseList.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentArticles = baseList.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    const contentNode = document.getElementById('news-content-start');
    if (contentNode) {
      contentNode.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  };

  return (
    <div style={{
      background: theme === 'dark' ? '#070a13' : '#f4f6fa',
      color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
      minHeight: '100vh',
      fontFamily: '"Inter", "Outfit", sans-serif',
      paddingBottom: '3rem'
    }}>
      
      {/* 1. Breaking News Ticker Bar */}
      {breakingNews.length > 0 && (
        <div style={{
          background: '#dc2626',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          height: '40px',
          boxShadow: '0 2px 10px rgba(220, 38, 38, 0.2)',
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{
            background: '#b91c1c',
            padding: '0 16px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            fontWeight: 900,
            fontSize: '13px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            boxShadow: '4px 0 10px rgba(0,0,0,0.15)',
            zIndex: 11
          }}>
            <i className="fas fa-bolt" style={{ marginRight: '6px', animation: 'flash 1.5s infinite' }}></i>
            {lang === 'en' ? 'BREAKING' : 'செய்தி விளம்பரம்'}
          </div>
          <div className="ticker-wrapper" style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            width: '100%',
            overflow: 'hidden'
          }}>
            <style>{`
              @keyframes ticker {
                0% { transform: translate3d(0, 0, 0); }
                100% { transform: translate3d(-50%, 0, 0); }
              }
              @keyframes flash {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
              }
              .ticker-track {
                display: inline-flex;
                animation: ticker 25s linear infinite;
              }
              .ticker-track:hover {
                animation-play-state: paused;
              }
              .ticker-item {
                padding: 0 24px;
                font-size: 13.5px;
                font-weight: 700;
                color: #ffffff;
                text-decoration: none;
                display: flex;
                align-items: center;
              }
              .ticker-item::after {
                content: "•";
                color: rgba(255, 255, 255, 0.5);
                margin-left: 24px;
              }
            `}</style>
            <div className="ticker-track">
              {/* Double it up to make infinite marquee smooth */}
              {[...breakingNews, ...breakingNews].map((item, idx) => (
                <span key={idx} className="ticker-item">
                  {lang === 'en' ? item.titleEn : item.titleTa}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
        
        {/* 2. Top Portal Brand Title */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          padding: '2rem 0 1.2rem 0',
          borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '4px', height: '24px', background: 'var(--primary, #B3732A)', borderRadius: '2px' }}></span>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary, #B3732A)' }}>
                {lang === 'en' ? 'LIVE BROADCAST & NEWS DESK' : 'நேரலை மற்றும் செய்திப் பிரிவு'}
              </span>
            </div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 950,
              letterSpacing: '-1.5px',
              margin: '6px 0 0 0',
              lineHeight: 1.1,
              fontFamily: '"Outfit", sans-serif',
              background: theme === 'dark' ? 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)' : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {lang === 'en' ? 'The Newsroom Feed' : 'செய்தி அரங்கம்'}
            </h1>
          </div>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            padding: '6px 12px',
            borderRadius: '20px',
            color: '#94a3b8'
          }}>
            <i className="far fa-clock" style={{ marginRight: '6px' }}></i>
            {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ta-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {loading ? (
          <div style={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div className="animate-spin" style={{ width: '48px', height: '48px', border: '3px solid var(--primary, #B3732A)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>
                {lang === 'en' ? 'Loading professional news deck...' : 'செய்திகள் தளவமைப்பு தயாராகிறது...'}
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* 3. BBC-Inspired Split Hero Grid (Only on page 1 with no active search/filters) */}
            {currentPage === 1 && searchQuery.trim() === '' && selectedCategory === 'all' && selectedDistrict === 'all' && featuredArticle && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '1.5rem',
                margin: '1.5rem 0 2.5rem 0'
              }} className="hero-split-deck-layout">
                <style>{`
                  @media (min-width: 992px) {
                    .hero-split-deck-layout {
                      grid-template-columns: 7fr 5fr !important;
                    }
                  }
                `}</style>

                {/* Left Side: Big Hero Card */}
                <div style={{
                  background: theme === 'dark' ? '#0d111d' : '#ffffff',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                  border: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}>
                  <div style={{ position: 'relative', width: '100%', height: '380px', overflow: 'hidden' }}>
                    <img
                      src={getImageUrl(featuredArticle)}
                      alt={lang === 'en' ? featuredArticle.titleEn : featuredArticle.titleTa}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/assets/images/default-news.png';
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      display: 'flex',
                      gap: '6px',
                      zIndex: 5
                    }}>
                      <span style={{ background: '#dc2626', color: '#ffffff', fontSize: '10px', fontWeight: '900', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {lang === 'en' ? 'FEATURED' : 'முக்கிய செய்தி'}
                      </span>
                      <span style={{ background: 'var(--primary, #B3732A)', color: '#ffffff', fontSize: '10px', fontWeight: '900', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                        {featuredArticle.categoryName || 'News'}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: '1.8rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{
                      fontSize: '1.65rem',
                      fontWeight: 900,
                      margin: '0 0 12px 0',
                      lineHeight: 1.25,
                      fontFamily: '"Outfit", sans-serif'
                    }}>
                      <Link to={`/article/${featuredArticle.id}`} style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary, #B3732A)'} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>
                        {lang === 'en' ? featuredArticle.titleEn : featuredArticle.titleTa}
                      </Link>
                    </h2>
                    <p style={{
                      fontSize: '14.5px',
                      color: theme === 'dark' ? '#94a3b8' : '#64748b',
                      lineHeight: 1.6,
                      margin: '0 0 20px 0',
                      flex: 1
                    }}>
                      {lang === 'en' ? featuredArticle.shortDescEn : featuredArticle.shortDescTa}
                    </p>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#94a3b8',
                      borderTop: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9',
                      paddingTop: '12px'
                    }}>
                      <span>
                        <i className="far fa-user" style={{ marginRight: '6px' }}></i>
                        {featuredArticle.authorName || 'Kings News Desk'}
                      </span>
                      <span>
                        <i className="far fa-calendar" style={{ marginRight: '6px' }}></i>
                        {new Date(featuredArticle.publishedAt || featuredArticle.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Bulletins Vertical Stack */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', background: '#dc2626', borderRadius: '50%' }}></span>
                    {lang === 'en' ? 'TOP HEADLINES' : 'தலைப்புச் செய்திகள்'}
                  </span>
                  
                  {sideHeroArticles.map((art, idx) => (
                    <div
                      key={art.id}
                      style={{
                        background: theme === 'dark' ? '#0d111d' : '#ffffff',
                        borderRadius: '12px',
                        padding: '1.2rem',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.04)' : '1px solid #e2e8f0',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                    >
                      <div style={{ width: '100px', height: '80px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                        <img
                          src={getImageUrl(art)}
                          alt={lang === 'en' ? art.titleEn : art.titleTa}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/images/default-news.png';
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '10px', color: 'var(--primary, #B3732A)', fontWeight: 800, textTransform: 'uppercase' }}>
                          {art.categoryName || 'General'}
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
                          <Link to={`/article/${art.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {lang === 'en' ? art.titleEn : art.titleTa}
                          </Link>
                        </h4>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {new Date(art.publishedAt || art.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Filters Control Panel */}
            <div id="news-content-start" style={{
              background: theme === 'dark' ? '#0d111d' : '#ffffff',
              borderRadius: '16px',
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0',
              boxShadow: '0 6px 30px rgba(0,0,0,0.04)',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              {/* Inputs Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                alignItems: 'center'
              }}>
                {/* Search Bar */}
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-search" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}></i>
                  <input
                    type="text"
                    placeholder={lang === 'en' ? 'Search topics & headlines...' : 'செய்திகளைத் தேடுங்கள்...'}
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      borderRadius: '10px',
                      border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #cbd5e1',
                      background: theme === 'dark' ? '#131926' : '#f8fafc',
                      color: 'inherit',
                      outline: 'none',
                      fontSize: '13.5px',
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>

                {/* District Selector */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #cbd5e1',
                      background: theme === 'dark' ? '#131926' : '#ffffff',
                      color: 'inherit',
                      outline: 'none',
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      appearance: 'none'
                    }}
                  >
                    <option value="all">📍 {lang === 'en' ? 'Filter by District' : 'அனைத்து மாவட்டங்கள்'}</option>
                    {districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8', fontSize: '10px' }}></i>
                </div>

                {/* Sort Option */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #cbd5e1',
                      background: theme === 'dark' ? '#131926' : '#ffffff',
                      color: 'inherit',
                      outline: 'none',
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      appearance: 'none'
                    }}
                  >
                    <option value="newest">🕒 {lang === 'en' ? 'Latest Headlines' : 'புதிய செய்திகள்'}</option>
                    <option value="oldest">⌛ {lang === 'en' ? 'Chronological (Oldest)' : 'பழைய செய்திகள்'}</option>
                    <option value="popular">🔥 {lang === 'en' ? 'Trending (Most Viewed)' : 'பரபரப்பான செய்திகள்'}</option>
                  </select>
                  <i className="fas fa-chevron-down" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8', fontSize: '10px' }}></i>
                </div>
              </div>

              {/* Scrollable Categories Pillow Bar */}
              <div style={{
                marginTop: '1.2rem',
                borderTop: theme === 'dark' ? '1px solid rgba(255,255,255,0.04)' : '1px solid #f1f5f9',
                paddingTop: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  overflowX: 'auto',
                  gap: '8px',
                  paddingBottom: '4px'
                }} className="hide-scrollbar">
                  <style>{`
                    .hide-scrollbar::-webkit-scrollbar {
                      display: none;
                    }
                    .hide-scrollbar {
                      -ms-overflow-style: none;
                      scrollbar-width: none;
                    }
                  `}</style>
                  <button
                    onClick={() => handleCategoryChange('all')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '25px',
                      border: 'none',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: selectedCategory === 'all' ? 'var(--primary, #B3732A)' : (theme === 'dark' ? '#131926' : '#f1f5f9'),
                      color: selectedCategory === 'all' ? '#ffffff' : 'inherit',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                  >
                    {lang === 'en' ? 'All Feeds' : 'அனைத்து செய்திகள்'}
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '25px',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: String(selectedCategory) === String(cat.id) ? 'var(--primary, #B3732A)' : (theme === 'dark' ? '#131926' : '#f1f5f9'),
                        color: String(selectedCategory) === String(cat.id) ? '#ffffff' : 'inherit',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                      }}
                    >
                      {lang === 'en' ? cat.name : (cat.nameTa || cat.name)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Main Feed Layout */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '2rem',
              alignItems: 'start'
            }} className="news-main-grid-layout">
              
              {/* Left Column - Articles Grid */}
              <div>
                {filteredArticles.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '5rem 2rem',
                    background: theme === 'dark' ? '#0d111d' : '#ffffff',
                    borderRadius: '16px',
                    border: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0'
                  }}>
                    <i className="far fa-newspaper" style={{ fontSize: '56px', color: '#64748b', marginBottom: '1.2rem' }}></i>
                    <h3 style={{ fontSize: '18px', fontWeight: 800 }}>
                      {lang === 'en' ? 'No Articles Found' : 'செய்திகள் எதுவும் இல்லை'}
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '6px' }}>
                      {lang === 'en' ? 'Try adjusting your search query or switching categories.' : 'தேடல் சொல்லை மாற்றித் தேடுங்கள்.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '1.5rem'
                    }}>
                      {currentArticles.map(art => (
                        <div
                          key={art.id}
                          style={{
                            background: theme === 'dark' ? '#0d111d' : '#ffffff',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.3s ease',
                            height: '100%'
                          }}
                          className="news-card"
                        >
                          <style>{`
                            .news-card:hover {
                              transform: translateY(-5px);
                              box-shadow: 0 10px 24px rgba(0,0,0,0.08) !important;
                            }
                          `}</style>
                          <Link to={`/article/${art.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ width: '100%', height: '190px', overflow: 'hidden', position: 'relative' }}>
                              <img
                                src={getImageUrl(art)}
                                alt={lang === 'en' ? art.titleEn : art.titleTa}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/assets/images/default-news.png';
                                }}
                              />
                              <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                                <span style={{ background: 'var(--primary, #B3732A)', color: '#ffffff', fontSize: '9.5px', fontWeight: '900', padding: '3px 7px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  {art.categoryName || 'News'}
                                </span>
                              </div>
                            </div>

                            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
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
                                {lang === 'en' ? art.titleEn : art.titleTa}
                              </h3>
                              <p style={{
                                fontSize: '12.5px',
                                color: theme === 'dark' ? '#94a3b8' : '#64748b',
                                margin: '0 0 16px 0',
                                lineHeight: 1.5,
                                flex: 1,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical'
                              }}>
                                {lang === 'en' ? art.shortDescEn : art.shortDescTa}
                              </p>

                              <div style={{
                                borderTop: theme === 'dark' ? '1px solid rgba(255,255,255,0.04)' : '1px solid #f1f5f9',
                                paddingTop: '10px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '11px',
                                color: '#94a3b8',
                                fontWeight: 700
                              }}>
                                <span>
                                  <i className="far fa-clock" style={{ marginRight: '4px' }}></i> 
                                  {new Date(art.publishedAt || art.createdAt).toLocaleDateString()}
                                </span>
                                <span>
                                  <i className="far fa-eye" style={{ marginRight: '4px' }}></i> 
                                  {art.viewsCount || 0}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
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
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            border: 'none',
                            background: theme === 'dark' ? '#0d111d' : '#ffffff',
                            color: 'inherit',
                            cursor: 'pointer',
                            opacity: currentPage === 1 ? 0.4 : 1,
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                          }}
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => paginate(i + 1)}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              border: 'none',
                              background: currentPage === i + 1 ? 'var(--primary, #B3732A)' : (theme === 'dark' ? '#0d111d' : '#ffffff'),
                              color: currentPage === i + 1 ? '#ffffff' : 'inherit',
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
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
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            border: 'none',
                            background: theme === 'dark' ? '#0d111d' : '#ffffff',
                            color: 'inherit',
                            cursor: 'pointer',
                            opacity: currentPage === totalPages ? 0.4 : 1,
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                          }}
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right Column - Sticky Sidebar */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                position: 'sticky',
                top: '90px'
              }}>
                
                {/* 1. Live TV Widget */}
                {liveVideo && (
                  <div style={{
                    background: theme === 'dark' ? '#0d111d' : '#ffffff',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    border: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'flash 1.5s infinite' }}></span>
                        {lang === 'en' ? 'LIVE STREAM' : 'நேரலை ஒலிபரப்பு'}
                      </span>
                      <span style={{ fontSize: '10.5px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '3px 8px', borderRadius: '12px', fontWeight: 800 }}>
                        24x7
                      </span>
                    </div>
                    <div style={{ position: 'relative', width: '100%', height: '175px', borderRadius: '10px', overflow: 'hidden' }}>
                      <iframe
                        src={liveVideo.youtubeUrl}
                        title={liveVideo.title}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {/* 2. Weather Widget */}
                <div style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  color: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 10px 25px rgba(59, 130, 246, 0.15)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.85 }}>
                        {lang === 'en' ? 'TAMIL NADU METRO' : 'வானிலை அறிக்கை'}
                      </span>
                      <h4 style={{ fontSize: '18px', fontWeight: 900, margin: '4px 0 0 0', fontFamily: '"Outfit", sans-serif' }}>
                        {lang === 'en' ? 'Chennai City' : 'சென்னை மாநகரம்'}
                      </h4>
                    </div>
                    <i className="fas fa-cloud-sun-rain" style={{ fontSize: '28px', color: '#ffbd59' }}></i>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '14px 0 6px 0' }}>
                    <h2 style={{ fontSize: '2.8rem', fontWeight: 950, margin: 0 }}>32°C</h2>
                    <span style={{ fontSize: '14px', opacity: 0.8 }}>/ 89.6°F</span>
                  </div>
                  <p style={{ fontSize: '12.5px', margin: 0, opacity: 0.85, lineHeight: 1.4 }}>
                    {lang === 'en' ? 'Partly cloudy sky. High humidity. Occasional showers expected.' : 'ஓரளவு மேகமூட்டம். ஆங்காங்கே மழை பெய்ய வாய்ப்பு.'}
                  </p>
                </div>

                {/* 3. Numbered Trending Feed */}
                <div style={{
                  background: theme === 'dark' ? '#0d111d' : '#ffffff',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  border: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                }}>
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    margin: '0 0 1.25rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fas fa-chart-line" style={{ color: 'var(--primary, #B3732A)' }}></i>
                    {lang === 'en' ? 'TRENDING STORIES' : 'பிரபலமான செய்திகள்'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {trending.map((art, idx) => (
                      <div key={art.id} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <div style={{
                          fontSize: '26px',
                          fontWeight: 950,
                          color: 'var(--primary, #B3732A)',
                          opacity: 0.35,
                          lineHeight: 1,
                          width: '24px'
                        }}>
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <Link to={`/article/${art.id}`} style={{
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
                            {lang === 'en' ? art.titleEn : art.titleTa}
                          </Link>
                          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                            {art.viewsCount || 0} {lang === 'en' ? 'views' : 'பார்வைகள்'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ad Widget */}
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
