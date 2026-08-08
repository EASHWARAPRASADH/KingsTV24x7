import React, { useContext, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { fetchApi, getImageUrl } from '../utils/api';
import AdWidget from '../components/AdWidget';

const News = () => {
  const { lang, t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
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
    document.title = lang === 'en' ? 'News Feed - KINGS 24x7' : 'செய்திகள் - KINGS 24x7';
  }, [lang]);

  useEffect(() => {
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

    // 3. Fetch all articles
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
    // Search filter
    const matchesSearch = searchQuery.trim() === '' || 
      (art.titleEn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.titleTa || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.contentEn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.contentTa || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory = selectedCategory === 'all' || 
      String(art.categoryId) === String(selectedCategory);

    // District filter
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentArticles = filteredArticles.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Highlight featured top article
  const featuredArticle = filteredArticles[0];
  const listArticles = currentArticles.filter(art => !featuredArticle || art.id !== featuredArticle.id);

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: theme === 'dark' ? '#0b0f19' : '#f8fafc' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="animate-spin" style={{ width: '48px', height: '48px', border: '4px solid var(--primary, #B3732A)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
            {lang === 'en' ? 'Fetching News Feed...' : 'செய்திகள் ஏற்றப்படுகின்றன...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: theme === 'dark' ? '#0b0f19' : '#f8fafc',
      color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
      minHeight: '100vh',
      padding: '2rem 1rem'
    }}>
      <div className="container" style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Page Header */}
        <div style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.5rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            letterSpacing: '-1px',
            color: 'var(--primary, #B3732A)',
            margin: 0
          }}>
            {lang === 'en' ? 'Kings 24x7 News Portal' : 'கிங்ஸ் 24x7 செய்தி தளம்'}
          </h1>
          <p style={{
            fontSize: '14px',
            margin: '6px 0 0 0',
            color: theme === 'dark' ? '#94a3b8' : '#64748b'
          }}>
            {lang === 'en' ? 'Your trusted window to regional, national, and international updates.' : 'உள்ளூர், மாநில, மற்றும் உலகளாவிய செய்திகளின் உன்னத தளம்.'}
          </p>
        </div>

        {/* Filters Panel */}
        <div style={{
          background: theme === 'dark' ? '#111827' : '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Top Search & Dropdowns Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '16px', color: '#94a3b8' }}></i>
              <input
                type="text"
                placeholder={lang === 'en' ? 'Search headlines, contents...' : 'செய்திகள், கட்டுரைகளைத் தேடுக...'}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  borderRadius: '8px',
                  border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                  background: theme === 'dark' ? '#1f2937' : '#f9fafb',
                  color: 'inherit',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* District Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {lang === 'en' ? 'District:' : 'மாவட்டம்:'}
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                  background: theme === 'dark' ? '#1f2937' : '#ffffff',
                  color: 'inherit',
                  outline: 'none',
                  fontSize: '14px'
                }}
              >
                <option value="all">{lang === 'en' ? 'All Districts' : 'அனைத்து மாவட்டங்கள்'}</option>
                {districts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {lang === 'en' ? 'Sort By:' : 'வரிசைப்படுத்து:'}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                  background: theme === 'dark' ? '#1f2937' : '#ffffff',
                  color: 'inherit',
                  outline: 'none',
                  fontSize: '14px'
                }}
              >
                <option value="newest">{lang === 'en' ? 'Newest First' : 'புதியவை முதலில்'}</option>
                <option value="oldest">{lang === 'en' ? 'Oldest First' : 'பழையவை முதலில்'}</option>
                <option value="popular">{lang === 'en' ? 'Most Popular' : 'அதிகம் பார்வையிடப்பட்டவை'}</option>
              </select>
            </div>
          </div>

          {/* Categories Pill Bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
              {lang === 'en' ? 'Categories' : 'செய்திப் பிரிவுகள்'}
            </span>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <button
                onClick={() => handleCategoryChange('all')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: selectedCategory === 'all' ? 'var(--primary, #B3732A)' : (theme === 'dark' ? '#1f2937' : '#f1f5f9'),
                  color: selectedCategory === 'all' ? '#ffffff' : 'inherit',
                  transition: 'all 0.2s'
                }}
              >
                {lang === 'en' ? 'All' : 'அனைத்தும்'}
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: String(selectedCategory) === String(cat.id) ? 'var(--primary, #B3732A)' : (theme === 'dark' ? '#1f2937' : '#f1f5f9'),
                    color: String(selectedCategory) === String(cat.id) ? '#ffffff' : 'inherit',
                    transition: 'all 0.2s'
                  }}
                >
                  {lang === 'en' ? cat.name : (cat.nameTa || cat.name)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Grid Section (BBC/NDTV Grid layout) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '2rem',
          alignItems: 'start'
        }} className="news-main-grid-layout">
          <style>{`
            @media (min-width: 992px) {
              .news-main-grid-layout {
                grid-template-columns: 8fr 4fr !important;
              }
            }
          `}</style>

          {/* Left Column - Articles */}
          <div>
            {filteredArticles.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: theme === 'dark' ? '#111827' : '#ffffff',
                borderRadius: '12px'
              }}>
                <i className="far fa-newspaper" style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '1rem' }}></i>
                <h3>{lang === 'en' ? 'No articles match your filters' : 'தேடலுக்குரிய செய்திகள் எதுவும் கிடைக்கவில்லை'}</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  {lang === 'en' ? 'Try adjusting your search terms or filters.' : 'வேறு சொற்கள் அல்லது வடிகட்டிகளைப் பயன்படுத்தி தேடவும்.'}
                </p>
              </div>
            ) : (
              <>
                {/* Hero Featured Article (Only show on page 1) */}
                {currentPage === 1 && featuredArticle && (
                  <div style={{
                    background: theme === 'dark' ? '#111827' : '#ffffff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                    marginBottom: '2rem',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{ position: 'relative', width: '100%', height: '420px', overflow: 'hidden' }}>
                      <img
                        src={getImageUrl(featuredArticle)}
                        alt={lang === 'en' ? featuredArticle.titleEn : featuredArticle.titleTa}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/assets/images/default-news.png';
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 20%, rgba(0,0,0,0.4) 60%, transparent)',
                        padding: '2rem',
                        color: '#ffffff'
                      }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                          <span style={{ background: 'var(--primary, #B3732A)', color: '#ffffff', fontSize: '11px', fontWeight: '900', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            {featuredArticle.categoryName || 'News'}
                          </span>
                          {featuredArticle.districtNameEn && (
                            <span style={{ background: '#3b82f6', color: '#ffffff', fontSize: '11px', fontWeight: '900', padding: '4px 8px', borderRadius: '4px' }}>
                              {lang === 'en' ? featuredArticle.districtNameEn : featuredArticle.districtNameTa}
                            </span>
                          )}
                        </div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 10px 0', lineHeight: 1.2 }}>
                          <Link to={`/article/${featuredArticle.id}`} style={{ color: '#ffffff', textDecoration: 'none' }}>
                            {lang === 'en' ? featuredArticle.titleEn : featuredArticle.titleTa}
                          </Link>
                        </h2>
                        <p style={{ fontSize: '14.5px', color: '#cbd5e1', margin: 0, opacity: 0.9 }}>
                          {lang === 'en' ? featuredArticle.shortDescEn : featuredArticle.shortDescTa}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Articles List Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.5rem',
                  marginBottom: '2rem'
                }}>
                  {listArticles.map(art => (
                    <div
                      key={art.id}
                      style={{
                        background: theme === 'dark' ? '#111827' : '#ffffff',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                    >
                      <Link to={`/article/${art.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ width: '100%', height: '180px', overflow: 'hidden', position: 'relative' }}>
                          <img
                            src={getImageUrl(art)}
                            alt={lang === 'en' ? art.titleEn : art.titleTa}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/assets/images/default-news.png';
                            }}
                          />
                          <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '4px' }}>
                            <span style={{ background: 'var(--primary, #B3732A)', color: '#ffffff', fontSize: '10px', fontWeight: '900', padding: '3px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                              {art.categoryName || 'News'}
                            </span>
                          </div>
                        </div>

                        <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 10px 0', lineHeight: 1.3 }}>
                            {lang === 'en' ? art.titleEn : art.titleTa}
                          </h3>
                          <p style={{
                            fontSize: '13px',
                            color: theme === 'dark' ? '#94a3b8' : '#64748b',
                            margin: '0 0 15px 0',
                            flex: 1,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {lang === 'en' ? art.shortDescEn : art.shortDescTa}
                          </p>

                          <div style={{
                            borderTop: '1px solid rgba(0,0,0,0.05)',
                            paddingTop: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '11px',
                            color: '#94a3b8',
                            fontWeight: 600
                          }}>
                            <span>
                              <i className="far fa-calendar-alt"></i> {new Date(art.publishedAt || art.createdAt).toLocaleDateString()}
                            </span>
                            <span>
                              <i className="far fa-eye"></i> {art.viewsCount || 0}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '2rem'
                  }}>
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        background: theme === 'dark' ? '#1f2937' : '#e5e7eb',
                        color: 'inherit',
                        cursor: 'pointer',
                        opacity: currentPage === 1 ? 0.5 : 1
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
                          borderRadius: '6px',
                          border: 'none',
                          background: currentPage === i + 1 ? 'var(--primary, #B3732A)' : (theme === 'dark' ? '#1f2937' : '#e5e7eb'),
                          color: currentPage === i + 1 ? '#ffffff' : 'inherit',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        background: theme === 'dark' ? '#1f2937' : '#e5e7eb',
                        color: 'inherit',
                        cursor: 'pointer',
                        opacity: currentPage === totalPages ? 0.5 : 1
                      }}
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column - Sidebar Widgets (BBC / NDTV style) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
          }}>
            {/* Live TV Streaming Widget */}
            {liveVideo && (
              <div style={{
                background: theme === 'dark' ? '#111827' : '#ffffff',
                borderRadius: '12px',
                padding: '1.2rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  fontWeight: 900,
                  color: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }}></span>
                  {lang === 'en' ? 'LIVE NEWS TV' : 'நேரலை செய்தி'}
                </h4>
                <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '8px', overflow: 'hidden' }}>
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

            {/* Weather / Market Widget */}
            <div style={{
              background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '1.2rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>
                  {lang === 'en' ? 'CHENNAI WEATHER' : 'சென்னை வானிலை'}
                </span>
                <i className="fas fa-cloud-sun-rain" style={{ fontSize: '24px' }}></i>
              </div>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '10px 0 0 0' }}>32°C</h3>
              <p style={{ fontSize: '12px', margin: '4px 0 0 0', opacity: 0.8 }}>
                {lang === 'en' ? 'Partly cloudy. Scattered showers expected.' : 'ஓரளவு மேகமூட்டம். ஆங்காங்கே மழை பெய்ய வாய்ப்பு.'}
              </p>
            </div>

            {/* Trending Articles Feed List */}
            <div style={{
              background: theme === 'dark' ? '#111827' : '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 900,
                margin: '0 0 1.2rem 0',
                borderBottom: '2px solid var(--primary, #B3732A)',
                paddingBottom: '8px'
              }}>
                {lang === 'en' ? 'TRENDING NEWS' : 'பரபரப்பான செய்திகள்'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {trending.map((art, idx) => (
                  <div key={art.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: 900,
                      color: 'var(--primary, #B3732A)',
                      opacity: 0.4,
                      width: '30px',
                      textAlign: 'center'
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Link to={`/article/${art.id}`} style={{
                        textDecoration: 'none',
                        color: 'inherit',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        lineHeight: 1.3,
                        display: 'block'
                      }}>
                        {lang === 'en' ? art.titleEn : art.titleTa}
                      </Link>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
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

      </div>
    </div>
  );
};

export default News;
