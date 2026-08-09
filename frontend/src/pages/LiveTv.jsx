import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';
import { fetchApi } from '../utils/api';
import HlsPlayer from '../components/HlsPlayer';

const LiveTv = () => {
  const { lang } = useContext(LanguageContext);
  const [liveVideo, setLiveVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  const DEFAULT_LIVE_VIDEO = {
    title: lang === 'en' ? 'KINGS 24x7 Live Broadcast' : 'கிங்ஸ் 24x7 நேரலை ஒளிபரப்பு',
    description: lang === 'en' ? 'Watch continuous live news coverage in Tamil and English.' : 'தமிழக செய்திகளின் நேரடி ஒளிபரப்பு.',
    youtubeUrl: 'https://www.youtube.com/embed/hw7Fjh6mncQ',
    isLiveTv: 1
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchApi('/videos/live')
      .then(res => {
        if (res && (res.youtubeUrl || res.videoUrl)) {
          setLiveVideo(res);
        } else {
          setLiveVideo(DEFAULT_LIVE_VIDEO);
        }
        setLoading(false);
      })
      .catch(err => {
        console.warn("Could not fetch live video, using fallback stream", err);
        setLiveVideo(DEFAULT_LIVE_VIDEO);
        setLoading(false);
      });
  }, [lang]);

  const getYoutubeEmbedUrl = (url) => {
    if (!url || url.includes('2g811Eo7K8U')) return 'https://www.youtube.com/embed/hw7Fjh6mncQ?autoplay=1&mute=1';
    if (url.includes('embed/')) {
      return url.includes('?') ? url : `${url}?autoplay=1&mute=1`;
    }
    // Extract video ID
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2] && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1` : 'https://www.youtube.com/embed/hw7Fjh6mncQ?autoplay=1&mute=1';
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h3>{lang === 'en' ? 'Connecting to Live Broadcast...' : 'நேரலை ஒளிபரப்புடன் இணைக்கப்படுகிறது...'}</h3>
      </div>
    );
  }

  const embedUrl = getYoutubeEmbedUrl(liveVideo?.youtubeUrl || liveVideo?.videoUrl);

  return (
    <div className="container" style={{ marginTop: '30px', marginBottom: '50px' }}>
      <div className="breadcrumbs" style={{ marginBottom: '20px' }}>
        <Link to="/">{lang === 'en' ? 'Home' : 'முகப்பு'}</Link>
        <i className="fas fa-chevron-right" style={{ fontSize: '10px', margin: '0 8px' }}></i>
        <span>{lang === 'en' ? 'Live TV' : 'நேரலை தொலைக்காட்சி'}</span>
      </div>

      <div className="live-tv-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Video Player */}
          <div style={{ borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', background: '#000', overflow: 'hidden' }}>
            {liveVideo?.videoUrl?.includes('.m3u8') || liveVideo?.youtubeUrl?.includes('.m3u8') ? (
              <HlsPlayer src={liveVideo?.videoUrl || liveVideo?.youtubeUrl} poster="/assets/images/live-tv-poster.jpg" autoPlay={true} />
            ) : embedUrl ? (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                <iframe
                  title="Live Broadcast"
                  src={embedUrl}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                {lang === 'en' ? 'Live Stream Offline' : 'நேரலை தற்போது நடைபெறவில்லை'}
              </div>
            )}
          </div>

          {/* Details */}
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <span style={{ padding: '4px 12px', background: '#EF4444', color: '#fff', borderRadius: '4px', fontSize: '12px', fontWeight: '800', letterSpacing: '1px', display: 'inline-block' }}>
                <i className="fas fa-broadcast-tower" style={{ marginRight: '6px' }}></i>
                LIVE
              </span>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>
                {liveVideo?.title || (lang === 'en' ? 'KINGS 24x7 Live Broadcast' : 'கிங்ஸ் 24x7 நேரடி ஒளிபரப்பு')}
              </h1>
            </div>
            <p style={{ color: '#4A5568', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
              {liveVideo?.description || (lang === 'en' ? 'Watch continuous live coverage in Tamil.' : 'தமிழக செய்திகளின் நேரடி ஒளிபரப்பு.')}
            </p>
          </div>
        </div>

        {/* Sidebar chat/updates */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 15px 0', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
            <i className="fas fa-comments" style={{ color: '#3B82F6', marginRight: '8px' }}></i>
            {lang === 'en' ? 'Live Chat Updates' : 'நேரடிச் செய்திப் பகிர்வு'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '400px', overflowY: 'auto' }}>
            <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '6px' }}>
              <strong style={{ color: '#3B82F6', fontSize: '0.85rem' }}>Admin:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#333' }}>
                {lang === 'en' ? 'Welcome to KINGS 24x7 Live Stream.' : 'கிங்ஸ் 24x7 நேரலை செய்திக்கு வரவேற்கிறோம்.'}
              </p>
            </div>
            <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '6px' }}>
              <strong style={{ color: '#4A5568', fontSize: '0.85rem' }}>Karthik (Chennai):</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#333' }}>
                {lang === 'en' ? 'Good audio and video quality!' : 'அருமையான நேரடி செய்தி ஒளிபரப்பு!'}
              </p>
            </div>
            <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '6px' }}>
              <strong style={{ color: '#4A5568', fontSize: '0.85rem' }}>Priya (Salem):</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#333' }}>
                {lang === 'en' ? 'Super update on the budget session.' : 'பட்ஜெட் கூட்டத்தொடர் பற்றிய தெளிவான தகவல்கள்.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTv;
