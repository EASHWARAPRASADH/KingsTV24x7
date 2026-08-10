/**
 * Dynamic Utility Formatters for News & Content Metadata
 * - Relative Time ("1 Hr Ago", "15 Mins Ago", "2 Days Ago" / Tamil)
 * - Dynamic Reading Time ("1 min read" / "1 நிமி வாசிப்பு")
 * - Dynamic Views Count
 */

export const getRelativeTime = (dateInput, lang = 'en') => {
  if (!dateInput) return lang === 'en' ? 'Just now' : 'சற்றே முன்';
  
  let date;
  if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  }
  
  if (!date || isNaN(date.getTime())) {
    return lang === 'en' ? 'Just now' : 'சற்றே முன்';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 45) {
    return lang === 'en' ? 'Just now' : 'சற்றே முன்';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return lang === 'en'
      ? `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`
      : `${diffInMinutes} நிமிடங்களுக்கு முன்`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return lang === 'en'
      ? `${diffInHours} hr${diffInHours > 1 ? 's' : ''} ago`
      : `${diffInHours} மணி நேரத்திற்கு முன்`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return lang === 'en'
      ? `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
      : `${diffInDays} நாட்களுக்கு முன்`;
  }

  // Beyond 30 days, format cleanly: "10 Aug 2026"
  const day = date.getDate();
  const monthEn = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  
  if (lang === 'en') {
    return `${day} ${monthEn} ${year}`;
  } else {
    const monthTaMap = {
      Jan: 'ஜன', Feb: 'பிப்', Mar: 'மார்', Apr: 'ஏப்', May: 'மே', Jun: 'ஜூன்',
      Jul: 'ஜூலை', Aug: 'ஆக', Sep: 'செப்', Oct: 'அக்', Nov: 'நவ', Dec: 'டிச'
    };
    return `${day} ${monthTaMap[monthEn] || monthEn} ${year}`;
  }
};

export const getReadingTime = (article, lang = 'en') => {
  if (!article) return lang === 'en' ? '1 min read' : '1 நிமி வாசிப்பு';
  
  if (article.readingTime && typeof article.readingTime === 'number') {
    const mins = article.readingTime;
    return lang === 'en' ? `${mins} min read` : `${mins} நிமி வாசிப்பு`;
  }

  const text = (
    (article.titleEn || '') + ' ' +
    (article.titleTa || '') + ' ' +
    (article.shortDescEn || '') + ' ' +
    (article.shortDescTa || '') + ' ' +
    (article.contentEn || '') + ' ' +
    (article.contentTa || '')
  ).replace(/<[^>]*>/g, '').trim();

  const words = text ? text.split(/\s+/).length : 0;
  const mins = Math.max(1, Math.ceil(words / 160));
  return lang === 'en' ? `${mins} min read` : `${mins} நிமி வாசிப்பு`;
};

export const getViewsCount = (article) => {
  if (!article) return 42;
  if (typeof article.viewsCount === 'number' && article.viewsCount > 0) return article.viewsCount;
  if (typeof article.views === 'number' && article.views > 0) return article.views;
  
  // Deterministic calculation based on article ID string/number
  const idStr = String(article.id || article.article_id || '10');
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash * 31 + idStr.charCodeAt(i)) % 1000;
  }
  return hash + 85;
};
