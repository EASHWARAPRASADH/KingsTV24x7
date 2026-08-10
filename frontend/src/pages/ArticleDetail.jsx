import React, { useContext, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';
import { fetchApi, getImageUrl, API_BASE } from '../utils/api';
import AdWidget from '../components/AdWidget';
import SkeletonLoader from '../components/SkeletonLoader';

const ArticleDetail = () => {
  const { id } = useParams();
  const { lang, t } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [related, setRelated] = useState([]);
  const [trending, setTrending] = useState([]);
  const [showAllComments, setShowAllComments] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(progress);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Form states
  const [commentor, setCommentor] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const [sidebarWeather, setSidebarWeather] = useState({ temp: '32°C', condition: 'Partly Cloudy', conditionTa: 'மேகமூட்டம்', humidity: '72%', wind: '18 km/h' });

  const [isBookmarkedOffline, setIsBookmarkedOffline] = useState(false);

  const getCleanContentHtml = (htmlContent) => {
    if (!htmlContent) return '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString('<div>' + htmlContent + '</div>', 'text/html');
      const wrapper = doc.body.firstChild;

      const imgs = wrapper.querySelectorAll('img');
      if (imgs.length === 0) return htmlContent;

      imgs.forEach((img) => {
        const src = (img.getAttribute('src') || '').trim();
        // Remove only auto-embedded base64 images from failed TinyMCE uploads
        if (src.startsWith('data:image/')) {
          const parent = img.parentElement;
          img.remove();
          if (parent && parent !== wrapper && !parent.textContent.trim() && !parent.querySelector('img,video,iframe')) {
            parent.remove();
          }
        }
      });

      return wrapper.innerHTML.trim();
    } catch (e) {
      console.warn('Error parsing clean content HTML', e);
      return htmlContent;
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('kings_offline_bookmarks');
      if (stored) {
        const list = JSON.parse(stored);
        setIsBookmarkedOffline(list.some(a => String(a.id) === String(id)));
      }
    } catch (e) {}
  }, [id]);

  useEffect(() => {
    if (article && article.id) {
      let linkEl = document.querySelector('link[rel="amphtml"]');
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.setAttribute('rel', 'amphtml');
        document.head.appendChild(linkEl);
      }
      const baseApi = API_BASE;
      linkEl.setAttribute('href', `${baseApi}/articles/public/news/${article.id}/amp`);

      return () => {
        if (linkEl && linkEl.parentNode) {
          linkEl.parentNode.removeChild(linkEl);
        }
      };
    }
  }, [article]);

  // === Enterprise SEO: OG + Twitter Card + NewsArticle JSON-LD ===
  useEffect(() => {
    if (!article) return;

    const siteUrl = window.location.origin;
    const articleUrl = window.location.href;
    const title = (lang === 'ta' ? article.titleTa : article.titleEn) || article.titleTa || '';
    const description = (lang === 'ta' ? article.shortDescTa : article.shortDescEn) || article.metaDescription || '';
    const image = article.ogImage || article.featuredImage || article.imageUrl || '';
    const author = article.authorName || 'Kings TV News Desk';
    const pubDate = article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString();
    const modDate = article.updatedAt ? new Date(article.updatedAt).toISOString() : pubDate;

    const setMeta = (selector, attrName, attrVal, content) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
      return el;
    };

    document.title = `${title} | Kings 24x7`;

    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', articleUrl);
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'article');
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'Kings 24x7');
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', lang === 'ta' ? 'ta_IN' : 'en_IN');
    if (image) setMeta('meta[property="og:image"]', 'property', 'og:image', image);
    setMeta('meta[property="article:published_time"]', 'property', 'article:published_time', pubDate);
    setMeta('meta[property="article:modified_time"]', 'property', 'article:modified_time', modDate);
    setMeta('meta[property="article:author"]', 'property', 'article:author', author);

    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:site"]', 'name', 'twitter:site', '@kings24x7');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    if (image) setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);

    // NewsArticle JSON-LD structured data
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'NewsArticle',
          'headline': title,
          'description': description,
          'image': image ? [image] : [],
          'datePublished': pubDate,
          'dateModified': modDate,
          'author': [{ '@type': 'Person', 'name': author, 'url': `${siteUrl}/author/${encodeURIComponent(author)}` }],
          'publisher': {
            '@type': 'Organization',
            'name': 'Kings 24x7',
            'logo': { '@type': 'ImageObject', 'url': `${siteUrl}/assets/icons/logo.png` }
          },
          'mainEntityOfPage': { '@type': 'WebPage', '@id': articleUrl },
          'inLanguage': lang === 'ta' ? 'ta' : 'en',
          'isAccessibleForFree': true,
          ...(article.isAiGenerated && { 'additionalType': 'https://schema.org/AIGeneratedContent' }),
        },
        {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': siteUrl },
            { '@type': 'ListItem', 'position': 2, 'name': title, 'item': articleUrl }
          ]
        }
      ]
    };

    let scriptEl = document.querySelector('script[data-kings-jsonld]');
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.setAttribute('data-kings-jsonld', 'true');
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = 'Kings 24x7 | Tamil News';
      ['meta[property^="og:"]', 'meta[property^="article:"]', 'meta[name^="twitter:"]', 'script[data-kings-jsonld]']
        .forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));
    };
  }, [article, lang]);

  const toggleOfflineSave = () => {
    try {
      const stored = localStorage.getItem('kings_offline_bookmarks');
      let list = stored ? JSON.parse(stored) : [];
      if (isBookmarkedOffline) {
        list = list.filter(a => String(a.id) !== String(id));
        setIsBookmarkedOffline(false);
        triggerToast(lang === 'en' ? 'Removed from offline storage' : 'ஆஃப்லைன் சேமிப்பகத்திலிருந்து நீக்கப்பட்டது');
      } else {
        list.push(article);
        setIsBookmarkedOffline(true);
        triggerToast(lang === 'en' ? 'Saved for offline reading!' : 'ஆஃப்லைன் வாசிப்பிற்காகச் சேமிக்கப்பட்டது!');
      }
      localStorage.setItem('kings_offline_bookmarks', JSON.stringify(list));
    } catch (e) {}
  };

  useEffect(() => {
    const baseApi = import.meta.env.VITE_API_BASE || 'https://kings-tv.onrender.com/api/v1';
    fetch(`${baseApi}/weather?city=Chennai`)
      .then(res => res.json())
      .then(data => {
        if (data && data.temp) {
          setSidebarWeather({
            temp: data.temp,
            condition: data.condition,
            conditionTa: data.conditionTa,
            humidity: data.humidity,
            wind: data.wind
          });
        }
      })
      .catch(err => console.warn("Failed to load sidebar weather", err));
  }, []);

  const fetchComments = () => {
    fetchApi(`/articles/${id}/comments`)
      .then(data => {
        const formatted = Array.isArray(data) ? data.map(item => ({
          id: item.comment_id || item.id,
          commentorName: item.commentorName || item.commenterName || item.commentor_name || 'Anonymous',
          commentText: item.commentText || item.comment_text,
          createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''
        })) : [];
        setComments(formatted);
      })
      .catch(() => setComments([]));
  };

  const loadData = () => {
    const catLookup = {
      1: { slug: 'politics', name: 'Politics', nameTa: 'அரசியல்' },
      2: { slug: 'business', name: 'Business', nameTa: 'வணிகம்' },
      3: { slug: 'sports', name: 'Sports', nameTa: 'விளையாட்டு' },
      4: { slug: 'cinema', name: 'Cinema', nameTa: 'பொழுதுபோக்கு' },
      5: { slug: 'tech', name: 'Tech', nameTa: 'தொழில்நுட்பம்' },
      6: { slug: 'regional', name: 'Regional', nameTa: 'மாநில செய்திகள்' },
      7: { slug: 'international', name: 'International', nameTa: 'சர்வதேச செய்திகள்' }
    };

    fetchApi(`/articles/${id}`)
      .then(data => {
        if (data && (data.titleTa || data.titleEn)) {
          const currentCategoryId = data.categoryId || 1;
          const cat = catLookup[currentCategoryId] || { slug: 'general', name: 'General', nameTa: 'பொது' };
          const catNameTa = data.categoryNameTa || cat.nameTa;
          const catNameEn = data.categoryName || cat.name;
          const catSlug = data.categorySlug || cat.slug;

          const subNameTa = data.subCategoryNameTa || data.subCategoryName || '';
          const subNameEn = data.subCategoryName || data.subCategoryNameTa || '';
          const subSlug = data.subCategorySlug || '';

          setArticle({
            id: data.id || data.article_id,
            categoryId: currentCategoryId,
            subcategoryId: data.subcategoryId,
            titleTa: data.titleTa || data.titleEn || data.title || '',
            titleEn: data.titleEn || data.titleTa || data.title || '',
            descTa: data.shortDescTa || data.shortDescEn || data.metaDescription || '',
            descEn: data.shortDescEn || data.shortDescTa || data.metaDescription || '',
            contentTa: data.contentTa || data.contentEn || data.content || '',
            contentEn: data.contentEn || data.contentTa || data.content || '',
            authorName: data.authorName || 'Kings TV Desk',
            authorNameEn: data.authorNameEn || 'Kings TV Desk',
            authorRole: 'செய்தி நிருபர்',
            authorRoleEn: 'News Reporter',
            pubDate: data.publishedAt ? new Date(data.publishedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            updDate: data.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            readTime: `${data.readingTime || 1} நிமிட வாசிப்பு`,
            readTimeEn: `${data.readingTime || 1} Min Read`,
            categoryName: catNameTa,
            categoryNameEn: catNameEn,
            categorySlug: catSlug,
            subCategoryName: subNameTa,
            subCategoryNameEn: subNameEn,
            subCategorySlug: subSlug,
            tags: data.metaKeywords 
              ? data.metaKeywords.split(',').map(s => s.trim()).filter(Boolean)
              : ['செய்திகள்'],
            imageUrl: data.imageUrl || data.featuredImage || data.image_url || data.featured_image,
            authorProfileImage: data.authorProfileImage,
            gradient: 'linear-gradient(135deg, #1E3A8A, #3B82F6)'
          });

          fetchApi(`/articles/${data.id || data.article_id}/related`)
            .then(relatedArts => {
              const list = Array.isArray(relatedArts)
                ? relatedArts.map(item => ({
                    id: item.id || item.article_id,
                    titleTa: item.titleTa,
                    titleEn: item.titleEn,
                    descTa: item.shortDescTa,
                    descEn: item.shortDescEn,
                    subcatTa: item.districtId ? 'மாநிலம்' : 'தேசியம்',
                    subcatEn: item.districtId ? 'State' : 'National',
                    imageUrl: item.imageUrl || item.featuredImage || item.image_url || item.featured_image,
                    gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)'
                  }))
                : [];
              setRelated(list);
            })
            .catch(() => setRelated([]));
        } else {
          setArticle(null);
          setRelated([]);
        }
        fetchComments();
      })
      .catch(err => {
        try {
          const stored = localStorage.getItem('kings_offline_bookmarks');
          if (stored) {
            const list = JSON.parse(stored);
            const found = list.find(a => String(a.id) === String(id));
            if (found) {
              setArticle(found);
              setRelated([]);
              fetchComments();
              return;
            }
          }
        } catch (e) {}
        setArticle(null);
        setRelated([]);
        setComments([]);
      });

    fetchApi('/articles/public/trending')
      .then(tData => {
        if (Array.isArray(tData)) {
          setTrending(tData.map((item, index) => ({
            id: item.id || item.article_id,
            titleTa: item.titleTa,
            titleEn: item.titleEn,
            imageUrl: item.imageUrl,
            rank: index + 1
          })));
        } else {
          setTrending([]);
        }
      })
      .catch(() => setTrending([]));
  };


  useEffect(() => {
    loadData();
    window.scrollTo(0, 0);
  }, [id]);

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    fetchApi(`/articles/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        commentorName: commentor,
        commentorEmail: email,
        commentText: msg
      })
    })
    .then(() => {
      triggerToast(lang === 'en' ? 'Comment submitted successfully!' : 'கருத்து வெற்றிகரமாகப் பதியப்பட்டது!');
      setCommentor('');
      setEmail('');
      setMsg('');
      loadData();
    })
    .catch(err => {
      console.warn("API comment failed, saving locally", err);
      const newComment = {
        id: Date.now(),
        commentorName: commentor,
        commentText: msg,
        createdAt: lang === 'en' ? 'Just now' : 'சற்றுமுன்'
      };
      setComments(prev => [...prev, newComment]);
      setCommentor('');
      setEmail('');
      setMsg('');
      triggerToast(lang === 'en' ? 'Comment added!' : 'கருத்து சேர்க்கப்பட்டது!');
    });
  };

  const triggerToast = (msgText) => {
    setToastMessage(msgText);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    triggerToast(lang === 'en' ? 'Link Copied!' : 'நகலெடுக்கப்பட்டது!');
  };

  const getAuthorNameEn = () => {
    if (!article) return '';
    if (article.authorNameEn) return article.authorNameEn;
    const authorTranslations = {
      'கே. செல்வக்குமார்': 'K. Selvakumar',
      'ஏ. கவிதா': 'A. Kavitha',
      'கே. சூர்யா': 'K. Surya',
      'எம். ராஜேஷ்': 'M. Rajesh',
      'எஸ். கார்த்திக்': 'S. Karthik'
    };
    return authorTranslations[article.authorName] || article.authorName || 'K. Selvakumar';
  };

  const getAuthorRoleEn = () => {
    if (!article) return '';
    if (article.authorRoleEn) return article.authorRoleEn;
    const roleTranslations = {
      'தலைமைச் செய்தி நிருபர்': 'Chief News Reporter',
      'தொழில்நுட்ப செய்தியாளர்': 'Technology Reporter',
      'சினிமா நிருபர்': 'Cinema Reporter',
      'விளையாட்டு நிருபர்': 'Sports Reporter'
    };
    return roleTranslations[article.authorRole] || article.authorRole || 'News Reporter';
  };

  const getCommentsList = () => {
    return comments.map(c => {
      let name = lang === 'en' ? (c.commentorNameEn || c.commentorName) : c.commentorName;
      let text = lang === 'en' ? (c.commentTextEn || c.commentText || c.comment_text) : (c.commentText || c.comment_text);
      let time = lang === 'en' ? (c.createdAtEn || c.createdAt) : c.createdAt;

      if (lang === 'en') {
        if (name === 'குமரன்') name = 'Kumaran';
        else if (name === 'மகேஷ்வரன்') name = 'Maheshwaran';
        else if (name === 'அருள்') name = 'Arul';
        else if (name === 'திவ்யா') name = 'Divya';
        else if (name === 'கார்த்திக்') name = 'Karthik';
        else if (name === 'சுரேஷ்') name = 'Suresh';
        else if (name === 'விக்னேஷ்') name = 'Vignesh';
        else if (name === 'பிரியா') name = 'Priya';
        else if (name === 'ஹரிஷ்') name = 'Harish';
        else if (name === 'ரம்யா') name = 'Ramya';
        else if (name === 'முருகன்') name = 'Murugan';
        else if (name === 'ராதா') name = 'Radha';
        else if (name === 'விஜய்') name = 'Vijay';
        else if (name === 'ஆனந்த்') name = 'Anand';

        if (time === '10 மணி நேரத்திற்கு முன்') time = '10 hours ago';
        else if (time === '8 மணி நேரத்திற்கு முன்') time = '8 hours ago';
        else if (time === '5 மணி நேரத்திற்கு முன்') time = '5 hours ago';
        else if (time === '2 மணி நேரத்திற்கு முன்') time = '2 hours ago';
        else if (time === '4 மணி நேரத்திற்கு முன்') time = '4 hours ago';
        else if (time === '3 மணி நேரத்திற்கு முன்') time = '3 hours ago';
        else if (time === '6 மணி நேரத்திற்கு முன்') time = '6 hours ago';
        else if (time === '1 மணி நேரத்திற்கு முன்') time = '1 hour ago';
        else if (time === '12 மணி நேரத்திற்கு முன்') time = '12 hours ago';
        else if (time === '9 மணி நேரத்திற்கு முன்') time = '9 hours ago';
        else if (time === '7 மணி நேரத்திற்கு முன்') time = '7 hours ago';
        else if (time === '1 மணி நேரம்') time = '1 hour ago';

        if (text && text.includes('பட்ஜெட்')) {
          text = 'Excellent budget announcements. In particular, the increase in funding for education is commendable.';
        } else if (text && text.includes('விவசாயிகளுக்கான')) {
          text = 'Need clarification in assembly on whether free electricity and subsidies for farmers will continue.';
        }
      }
      return { ...c, commentorName: name, commentText: text, createdAt: time };
    });
  };

  const getTrendingList = () => {
    return trending.map(tItem => {
      const title = lang === 'en' ? (tItem.titleEn || tItem.title) : (tItem.titleTa || tItem.title);
      return { ...tItem, title };
    });
  };

  useEffect(() => {
    if (article) {
      document.title = (lang === 'en' ? article.titleEn : article.titleTa) || 'KINGS 24x7';
      
      const desc = lang === 'en' ? article.descEn : article.descTa;
      const keywords = article.tags ? article.tags.join(', ') : 'news, tamil';
      
      const updateMetaTag = (name, content) => {
        if (!content) return;
        let element = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
        if (!element) {
          element = document.createElement('meta');
          if (name.startsWith('og:')) {
            element.setAttribute('property', name);
          } else {
            element.setAttribute('name', name);
          }
          document.head.appendChild(element);
        }
        element.setAttribute('content', content);
      };

      updateMetaTag('description', desc);
      updateMetaTag('keywords', keywords);
      updateMetaTag('og:title', lang === 'en' ? (article.titleEn || article.titleTa) : (article.titleTa || article.titleEn));
      updateMetaTag('og:description', desc);
      if (article.imageUrl) {
        updateMetaTag('og:image', article.imageUrl);
      }
    }
  }, [lang, article]);

  useEffect(() => {
    if (!article || !article.id) return;

    const hasTamil = (text) => /[\u0B80-\u0BFF]/.test(text || '');

    const translateSection = async (text, targetLang) => {
      if (!text || !text.trim()) return text;
      const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleanText) return text;
      try {
        const encoded = encodeURIComponent(cleanText.substring(0, 2500));
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encoded}`);
        const data = await res.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const translatedText = data[0].map(item => item[0]).join('');
          if (text.includes('<p>')) {
            return translatedText.split('. ').map(p => `<p>${p.trim()}</p>`).join('');
          }
          return translatedText;
        }
      } catch (e) {
        console.warn('Auto translation fallback error', e);
      }
      return text;
    };

    const runAutoTranslationIfNeeded = async () => {
      if (lang === 'en') {
        const currentTitle = article.titleEn || article.titleTa || '';
        const currentContent = article.contentEn || article.contentTa || '';
        if (hasTamil(currentTitle) || hasTamil(currentContent)) {
          const newTitle = hasTamil(currentTitle) ? await translateSection(currentTitle, 'en') : currentTitle;
          const newContent = hasTamil(currentContent) ? await translateSection(currentContent, 'en') : currentContent;
          const newDesc = article.descEn && hasTamil(article.descEn) ? await translateSection(article.descEn, 'en') : (article.descEn || '');
          setArticle(prev => prev ? { ...prev, titleEn: newTitle, contentEn: newContent, descEn: newDesc } : prev);
        }
      } else if (lang === 'ta') {
        const currentTitle = article.titleTa || article.titleEn || '';
        const currentContent = article.contentTa || article.contentEn || '';
        if (!hasTamil(currentTitle) || !hasTamil(currentContent)) {
          const newTitle = !hasTamil(currentTitle) ? await translateSection(currentTitle, 'ta') : currentTitle;
          const newContent = !hasTamil(currentContent) ? await translateSection(currentContent, 'ta') : currentContent;
          const newDesc = article.descTa && !hasTamil(article.descTa) ? await translateSection(article.descTa, 'ta') : (article.descTa || '');
          setArticle(prev => prev ? { ...prev, titleTa: newTitle, contentTa: newContent, descTa: newDesc } : prev);
        }
      }
    };

    runAutoTranslationIfNeeded();
  }, [lang, article?.id]);

  if (!article) {
    return (
      <div className="container" style={{ marginTop: '30px', marginBottom: '40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '30px' }} className="detail-skeleton-grid">
          <div>
            <SkeletonLoader type="detail" />
          </div>
          <div>
            <div className="skeleton-item" style={{ height: '24px', width: '150px', borderRadius: '4px', marginBottom: '15px' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <SkeletonLoader type="list" count={3} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ marginTop: '20px', marginBottom: '40px' }}>
      {/* Reading Progress Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${scrollProgress}%`,
        height: '4px',
        background: 'var(--category-color, var(--primary))',
        zIndex: 1000,
        transition: 'width 0.1s ease'
      }} />

      {/* Floating Share Sidebar */}
      <div className="share-sidebar-floating">
        <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(37, 211, 102, 0.1)' }} title="Share on WhatsApp">
          <i className="fab fa-whatsapp"></i>
        </a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(24, 119, 242, 0.1)' }} title="Share on Facebook">
          <i className="fab fa-facebook-f"></i>
        </a>
        <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1DA1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(29, 161, 242, 0.1)' }} title="Share on Twitter">
          <i className="fab fa-twitter"></i>
        </a>
        <a href={`https://telegram.me/share/url?url=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0088cc', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0, 136, 204, 0.1)' }} title="Share on Telegram">
          <i className="fab fa-telegram-plane"></i>
        </a>
        <button onClick={toggleOfflineSave} style={{ border: 'none', cursor: 'pointer', color: isBookmarkedOffline ? '#10B981' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: isBookmarkedOffline ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)' }} title={lang === 'en' ? 'Save Offline' : 'ஆஃப்லைனில் சேமி'}>
          <i className={isBookmarkedOffline ? "fas fa-bookmark" : "far fa-bookmark"}></i>
        </button>
        <button onClick={handleCopyLink} style={{ border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)' }} title="Copy Link">
          <i className="fas fa-link"></i>
        </button>
      </div>

      <style>{`
        .share-sidebar-floating {
          position: fixed;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 100;
          background: var(--card-bg);
          padding: 12px;
          border-radius: 30px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color);
        }
        @media (max-width: 1024px) {
          .share-sidebar-floating {
            position: static;
            transform: none;
            flex-direction: row;
            justify-content: center;
            margin: 20px auto;
            box-shadow: none;
            background: transparent;
            border: none;
            padding: 0;
            max-width: 300px;
          }
        }
      `}</style>

      <div className="article-container">
        
        {/* Main Article Column */}
        <main className="article-main">
          {/* Category & Subcategory Badges */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
            <Link to={`/category/${article.categorySlug}`} style={{ background: 'var(--primary, #0284c7)', color: '#ffffff', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {lang === 'en' ? article.categoryNameEn : article.categoryName}
            </Link>
            {article.subCategoryName && (
              <span style={{ background: 'rgba(2, 132, 199, 0.12)', color: 'var(--primary, #0284c7)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(2, 132, 199, 0.2)' }}>
                {lang === 'en' ? article.subCategoryNameEn : article.subCategoryName}
              </span>
            )}
          </div>

          {/* Breadcrumbs */}
          <div className="breadcrumbs" style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', flexWrap: 'wrap' }}>
            <Link to="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>{lang === 'en' ? 'Home' : 'முகப்பு'}</Link>
            <i className="fas fa-chevron-right" style={{ fontSize: '8px', margin: '0 8px', opacity: 0.5 }}></i>
            <Link to={`/category/${article.categorySlug}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              {lang === 'en' ? article.categoryNameEn : article.categoryName}
            </Link>
            {article.subCategoryName && (
              <>
                <i className="fas fa-chevron-right" style={{ fontSize: '8px', margin: '0 8px', opacity: 0.5 }}></i>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  {lang === 'en' ? article.subCategoryNameEn : article.subCategoryName}
                </span>
              </>
            )}
            <i className="fas fa-chevron-right" style={{ fontSize: '8px', margin: '0 8px', opacity: 0.5 }}></i>
            <span style={{ color: 'var(--text-secondary)' }}>
              {(() => {
                const titleStr = lang === 'en' ? (article.titleEn || article.titleTa || '') : (article.titleTa || article.titleEn || '');
                return titleStr.length > 35 ? titleStr.substring(0, 35) + '...' : titleStr;
              })()}
            </span>
          </div>

          {/* Headlines */}
          <div className="article-headlines">
            <h1 id="artTitle" style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1.4, marginBottom: '20px', color: 'var(--text-dark)' }}>
              {lang === 'en' ? (article.titleEn || article.titleTa) : (article.titleTa || article.titleEn)}
            </h1>
          </div>

          {/* Featured Hero Photo (Thumbnail Photo visible inside Article) */}
          {getImageUrl(article) && (
            <div className="article-featured-hero" style={{ marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              <img 
                src={getImageUrl(article)} 
                alt={lang === 'en' ? (article.titleEn || article.titleTa) : (article.titleTa || article.titleEn)} 
                style={{ width: '100%', maxHeight: '480px', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {(article.imageCaption || (lang === 'en' ? article.shortDescEn : article.shortDescTa)) && (
                <div style={{ padding: '8px 14px', background: 'var(--bg-light)', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border-color)' }}>
                  <i className="fas fa-camera" style={{ marginRight: '6px', opacity: 0.7 }}></i>
                  {article.imageCaption || (lang === 'en' ? article.shortDescEn : article.shortDescTa)}
                </div>
              )}
            </div>
          )}

          {/* Article Body */}
          <article 
            className="article-body-text" 
            id="articleBody" 
            style={{ fontSize: '16px', lineHeight: 1.8, color: 'var(--text-dark)' }}
            dangerouslySetInnerHTML={{
              __html: getCleanContentHtml(
                lang === 'en' ? (article.contentEn || article.contentTa) : (article.contentTa || article.contentEn)
              )
            }}
          />

          {/* MID-ARTICLE FEED AD WIDGET */}
          <AdWidget placement="mid-article" />

          {/* Clickable Tags */}
          <div className="article-tags" id="articleTags" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '24px 0' }}>
            {article.tags.map((tg, i) => {
              const tagTranslations = {
                'செய்திகள்': 'News',
                'தமிழகம்': 'Tamil Nadu',
                'செய்தி': 'News',
                'விளையாட்டு': 'Sports'
              };
              const tagLabel = lang === 'en' ? (tagTranslations[tg] || tg) : tg;
              return (
                <Link 
                  to={`/tag/${tg}`} 
                  key={i} 
                  className="article-tag" 
                  style={{ 
                    background: 'var(--primary-light)', 
                    color: 'var(--primary)', 
                    padding: '4px 12px', 
                    borderRadius: '4px', 
                    fontSize: '12px', 
                    fontWeight: 700, 
                    textDecoration: 'none', 
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }}
                >
                  {tagLabel}
                </Link>
              );
            })}
          </div>

          {/* Article Information (Redesigned Meta Info & Byline) */}
          <div className="article-meta-info" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px', 
            background: 'var(--card-bg)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <div className="author-profile">
              {article.authorProfileImage ? (
                <img 
                  src={article.authorProfileImage} 
                  alt={lang === 'en' ? getAuthorNameEn() : article.authorName} 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', marginRight: '12px' }}
                />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--category-color, var(--primary)), #000000)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, marginRight: '12px' }}>
                  {(lang === 'en' ? getAuthorNameEn() : (article.authorName || 'கே')).charAt(0)}
                </div>
              )}
              <div className="author-details">
                <h4 id="authorName" style={{ fontWeight: 800, fontSize: '14px', margin: 0 }}>
                  {lang === 'en' ? getAuthorNameEn() : article.authorName}
                </h4>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {lang === 'en' ? getAuthorRoleEn() : article.authorRole}
                </span>
              </div>
            </div>
            <div className="article-time" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <div><i className="far fa-calendar-alt"></i> {lang === 'en' ? 'Published: ' : 'வெளியிடப்பட்டது: '} <span id="pubDate">{article.pubDate}</span></div>
              <div><i className="fas fa-history"></i> {lang === 'en' ? 'Updated: ' : 'புதுப்பிக்கப்பட்டது: '} <span id="updDate">{article.updDate}</span></div>
              <div style={{ fontWeight: 600, color: 'var(--category-color, var(--primary))', marginTop: '4px' }}>
                <i className="far fa-clock"></i> <span id="readTime">{lang === 'en' ? article.readTimeEn : article.readTime}</span>
              </div>
            </div>
          </div>

          {/* Share Card (Horizontal list below Article Info) */}
          <div className="share-card" style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dark)' }}>
              {lang === 'en' ? 'Share this news' : 'இந்த செய்தியைப் பகிர்க'}
            </h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a 
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(window.location.href)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', background: '#25D366', color: '#FFF', borderRadius: '50%', textDecoration: 'none', fontSize: '18px' }}
                title="WhatsApp"
              >
                <i className="fab fa-whatsapp"></i>
              </a>
              <a 
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', background: '#1877F2', color: '#FFF', borderRadius: '50%', textDecoration: 'none', fontSize: '18px' }}
                title="Facebook"
              >
                <i className="fab fa-facebook-f"></i>
              </a>
              <a 
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', background: '#000000', color: '#FFF', borderRadius: '50%', textDecoration: 'none', fontSize: '18px' }}
                title="X"
              >
                <i className="fab fa-twitter"></i>
              </a>
              <a 
                href={`https://telegram.me/share/url?url=${encodeURIComponent(window.location.href)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', background: '#0088cc', color: '#FFF', borderRadius: '50%', textDecoration: 'none', fontSize: '18px' }}
                title="Telegram"
              >
                <i className="fab fa-telegram-plane"></i>
              </a>
              <button 
                onClick={handleCopyLink}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', background: '#64748B', color: '#FFF', borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                title={lang === 'en' ? 'Copy Link' : 'நகலெடுக்க'}
              >
                <i className="fas fa-link"></i>
              </button>
            </div>
          </div>

          {/* Comment Card (Comments list + Add Comment form) */}
          <div className="comment-card" style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px'
          }}>
            <h3 className="comments-count" id="commentCountTitle" style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              {comments.length} {lang === 'en' ? 'Comments' : 'கருத்துக்கள்'}
            </h3>
            
            <div className="comments-list" id="commentsList" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {getCommentsList().length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                  {lang === 'en' ? 'No comments yet. Be the first to comment!' : 'கருத்துகள் ஏதும் இல்லை. முதல் நபராக கருத்து தெரிவிக்கவும்!'}
                </div>
              ) : (
                (showAllComments ? getCommentsList() : getCommentsList().slice(0, 3)).map((c, i) => (
                  <div className="comment-item" key={c.id || i} style={{ display: 'flex', gap: '15px', background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
                    <div className="comment-avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                      {(c.commentorName || 'A').charAt(0)}
                    </div>
                    <div className="comment-content" style={{ flex: 1 }}>
                      <div className="comment-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h5 style={{ fontWeight: 800, fontSize: '13px', margin: 0 }}>{c.commentorName}</h5>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.createdAt || new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="comment-text" style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-dark)', margin: 0 }}>
                        {c.commentText || c.comment_text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {getCommentsList().length > 3 && (
              <button 
                onClick={() => setShowAllComments(!showAllComments)}
                style={{
                  display: 'block',
                  margin: '-8px auto 24px auto',
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--primary)',
                  color: 'var(--primary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
              >
                {showAllComments 
                  ? (lang === 'en' ? 'Show Less Comments' : 'குறைவான கருத்துகளைக் காட்டு') 
                  : (lang === 'en' ? 'Show More Comments' : 'மேலும் கருத்துகளைக் காட்டு')}
              </button>
            )}

            <div className="comment-form-container" style={{ borderTop: comments.length > 0 ? '1px solid var(--border-color)' : 'none', paddingTop: comments.length > 0 ? '24px' : '0' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {lang === 'en' ? 'Share Your Comments' : 'கருத்துக்களைப் பகிரவும்'}
              </h4>
              <form className="comment-form" id="commentForm" onSubmit={handleCommentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="comment-form-grid">
                  <input 
                    type="text" 
                    placeholder={lang === 'en' ? 'Name *' : 'பெயர் *'}
                    value={commentor}
                    onChange={(e) => setCommentor(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-dark)', fontSize: '12px' }}
                  />
                  <input 
                    type="email" 
                    placeholder={lang === 'en' ? 'Email *' : 'மின்னஞ்சல் *'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-dark)', fontSize: '12px' }}
                  />
                </div>
                <textarea 
                  placeholder={lang === 'en' ? 'Write comment here...' : 'உங்கள் கருத்துக்களை இங்கு எழுதவும்...'}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  required
                  rows="3"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-dark)', fontSize: '12px', resize: 'vertical' }}
                ></textarea>
                <button type="submit" style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, width: 'max-content', fontSize: '12px' }}>
                  {lang === 'en' ? 'Submit' : 'பதிவு செய்க'}
                </button>
              </form>
            </div>
          </div>

          {/* Related Articles Grid */}
          <div className="related-articles" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <h3 className="related-title" style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {lang === 'en' ? 'Related News' : 'தொடர்புடைய செய்திகள்'}
            </h3>
            <div className="news-grid">
              {related.map(rel => (
                <div 
                  className="news-card" 
                  key={rel.id} 
                  onClick={() => navigate(`/article/${rel.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div 
                    className="card-img" 
                    style={{ 
                      background: rel.imageUrl ? `url(${rel.imageUrl}) center/cover` : (rel.gradient || 'linear-gradient(135deg, #3B82F6, #60A5FA)'), 
                      height: '140px',
                      position: 'relative'
                    }}
                  >
                    <span className="cat-badge" style={{ background: 'var(--category-color, var(--primary))' }}>
                      {lang === 'en' ? rel.subcatEn : rel.subcatTa}
                    </span>
                  </div>
                  <div className="card-body" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1.4, margin: 0, color: 'var(--text-dark)' }}>
                      {lang === 'en' ? rel.titleEn : rel.titleTa}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Sidebar Area */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Weather Widget */}
          <div className="weather-widget" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-cloud-sun" style={{ color: 'var(--primary)' }}></i> 
              {lang === 'en' ? 'Chennai Weather' : 'சென்னை வானிலை'}
            </h4>
            <div className="weather-current" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div className="temp" style={{ fontSize: '32px', fontWeight: 800 }}>{sidebarWeather.temp}</div>
              <div className="details" style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column' }}>
                <strong style={{ color: 'var(--text-dark)' }}>{lang === 'en' ? sidebarWeather.condition : sidebarWeather.conditionTa}</strong>
                <span>{lang === 'en' ? `Humidity: ${sidebarWeather.humidity}` : `ஈரப்பதம்: ${sidebarWeather.humidity}`}</span>
                <span>{lang === 'en' ? `Wind: ${sidebarWeather.wind}` : `காற்று: ${sidebarWeather.wind}`}</span>
              </div>
            </div>
          </div>
          
          {/* Trending Widget */}
          <div className="trending-list" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-fire" style={{ color: '#EF4444' }}></i> 
              {lang === 'en' ? 'Trending News' : 'ட்ரெண்டிங் செய்திகள்'}
            </h4>
            {getTrendingList().map(tItem => (
              <div className="trending-item" key={tItem.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span className="rank top3" style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#EF4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  {tItem.rank}
                </span>
                <div className="info" style={{ flex: 1 }}>
                  <h5 style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>{tItem.title}</h5>
                </div>
              </div>
            ))}
          </div>
        </aside>

      </div>

      {/* Toast Alert popup */}
      <div 
        className={`toast-alert ${showToast ? 'show' : ''}`} 
        id="toastAlert"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%) ' + (showToast ? 'translateY(0)' : 'translateY(100px)'),
          opacity: showToast ? 1 : 0,
          background: 'var(--primary)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 700,
          zIndex: 99999,
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {toastMessage}
      </div>
    </div>
  );
};

export default ArticleDetail;
