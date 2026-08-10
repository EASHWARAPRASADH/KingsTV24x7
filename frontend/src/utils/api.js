const getApiBase = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return import.meta.env.VITE_API_BASE || 'http://localhost:8085/api/v1';
  }
  if (import.meta.env.VITE_API_BASE && !import.meta.env.VITE_API_BASE.includes('localhost')) {
    return import.meta.env.VITE_API_BASE;
  }
  return 'https://kings-tv.onrender.com/api/v1';
};

const getBaseServer = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return import.meta.env.VITE_SERVER_BASE || 'http://localhost:8085';
  }
  if (import.meta.env.VITE_SERVER_BASE && !import.meta.env.VITE_SERVER_BASE.includes('localhost')) {
    return import.meta.env.VITE_SERVER_BASE;
  }
  return 'https://kings-tv.onrender.com';
};

export const SERVER_BASE = getBaseServer();
export const API_BASE = getApiBase();

export const getImageUrl = (itemOrPath) => {
  if (!itemOrPath) return '';
  let path = itemOrPath;
  if (typeof itemOrPath === 'object' && itemOrPath !== null) {
    if (itemOrPath.imageUrl) {
      path = itemOrPath.imageUrl;
    } else if (itemOrPath.featuredImage) {
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
        console.warn('[Deprecation Warning] Article image accessed via legacy "featuredImage" property. Backend DTO has been standardized to emit "imageUrl".', itemOrPath);
      }
      path = itemOrPath.featuredImage;
    } else if (itemOrPath.url) {
      path = itemOrPath.url;
    } else {
      path = '';
    }
  }
  if (!path || typeof path !== 'string') return '';
  if (path.startsWith('blob:')) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/uploads')) return `${SERVER_BASE}${path}`;
  if (path.startsWith('uploads')) return `${SERVER_BASE}/${path}`;
  return `${SERVER_BASE}/${path.replace(/^\/+/, '')}`;
};

const translateVideo = (vid, lang) => {
  if (!vid) return vid;
  const rawTitle = vid.title || '';
  const rawDesc = vid.description || '';
  let titleVal = rawTitle;
  let descVal = rawDesc;

  if (lang === 'en') {
    if (rawTitle.includes('Rain Update') || rawTitle.includes('கனமழை')) {
      titleVal = 'Rain Update in Tamil Nadu | Heavy Rain Alert in Chennai and Districts';
      descVal = 'Weather department issues heavy rain warning for next 24 hours in Chennai and surrounding districts.';
    } else if (rawTitle.includes('Gold') || rawTitle.includes('தங்கம்') || rawTitle.includes('Gold Rate')) {
      titleVal = 'Gold Rate Drops Sharply | Today\'s Gold Price details in Chennai';
      descVal = 'Good news for gold buyers as sovereign rate decreases significantly today.';
    } else if (rawTitle.includes('Vijay TVK') || rawTitle.includes('விஜய் மாநாடு') || rawTitle.includes('ஜனநாயகன்') || rawTitle.includes('விஜய்யின்')) {
      titleVal = 'Vijay\'s Jananayagan Movie Censor Board Cuts | TVK Conference Updates';
      descVal = 'Actor Vijay\'s upcoming film Jananayagan updates and debut state conference preparations of TVK in Vikravandi.';
    } else if (rawTitle.includes('IPL') || rawTitle.includes('ஐபிஎல்') || rawTitle.includes('டி20') || rawTitle.includes('ஷ்ரேயாஸ்') || rawTitle.includes('இங்கிலாந்து')) {
      titleVal = 'India vs England T20 Series | Shreyas Iyer Interview and Cricket Highlights';
      descVal = 'Catch the latest cricket analysis, match highlights, and exclusive interview of batsman Shreyas Iyer.';
    } else if (rawTitle.includes('Gaganyaan') || rawTitle.includes('ககன்யான்') || rawTitle.includes('விண்வெளி')) {
      titleVal = 'ISRO Gaganyaan Test Success | Indian Astronaut Space Mission Updates';
      descVal = 'India\'s space agency successfully tests the solid booster system for the upcoming human flight.';
    } else if (rawTitle.includes('Metro') || rawTitle.includes('சென்னை மெட்ரோ')) {
      titleVal = 'Chennai Metro Phase 2 updates | Driverless train tests began';
      descVal = 'Trial runs of driverless trainsets started between Poonamallee and Vadapalani elevated line.';
    } else if (rawTitle.includes('பட்ஜெட்')) {
      titleVal = 'Tamil Nadu Budget 2026 | Key Announcements and Live Analysis';
      descVal = 'Detailed coverage of the financial allocations and welfare projects announced in the Tamil Nadu budget session.';
    } else if (rawTitle.includes('US Presidential') || rawTitle.includes('அதிபர்') || rawTitle.includes('Elections')) {
      titleVal = 'US Presidential Elections Update | Live Status and Analysis';
      descVal = 'US Presidential election results and direct updates, featuring swing state trends and analyst debates.';
    } else if (rawTitle.includes('நேரடி செய்தி') || rawTitle.includes('Live TV') || rawTitle.includes('Puthiya Thalaimurai')) {
      titleVal = 'KINGS 24x7 Live TV News Stream | Puthiya Thalaimurai Live';
      descVal = 'Watch continuous Tamil and English live news coverage, debates and special updates.';
    } else if (rawTitle.includes('Nothing Phone 2a') || rawTitle.includes('Nothing') || rawTitle.includes('நத்திங்')) {
      titleVal = 'Nothing Phone 2a Unboxing & Review';
      descVal = 'Nothing Phone 2a unboxing and overview. We check out the design, specifications, Glyph interface, camera quality, and performance of Nothing\'s new budget smartphone.';
    }
  }

  return {
    ...vid,
    title: titleVal,
    description: descVal
  };
};

const circuits = {}; // Maps base endpoint -> { status, failures, lastFailureTime }
const COOL_DOWN_MS = 30000; // 30 seconds
const MAX_FAILURES = 3;

export const fetchApi = async (endpoint, options = {}) => {
  const method = options.method || 'GET';
  const cacheKey = `api_cache_${endpoint}`;
  
  // Strip query parameters to track circuit state per base endpoint
  const basePath = endpoint.split('?')[0];
  let circuit = circuits[basePath];
  if (!circuit) {
    circuit = { status: 'closed', failures: 0, lastFailureTime: 0 };
    circuits[basePath] = circuit;
  }

  // Bypass circuit breaker and stale cache for live breaking news, public layout, categories, districts, and menus
  const isBypassed = endpoint.includes('breaking-news') || endpoint.includes('layout') || endpoint.includes('categories') || endpoint.includes('districts') || endpoint.includes('menus');
  if (isBypassed) {
    circuit.status = 'closed';
    circuit.failures = 0;
  }

  // Check if circuit is open
  if (!isBypassed && circuit.status === 'open') {
    const elapsed = Date.now() - circuit.lastFailureTime;
    if (elapsed > COOL_DOWN_MS) {
      // Transition to half-open
      circuit.status = 'half-open';
      console.warn(`[Circuit Breaker] Half-opening connection for endpoint: ${basePath}`);
    } else {
      // Circuit is open, instantly return fallback cache if available
      console.warn(`[Circuit Breaker] Blocked call to ${basePath} (Circuit is OPEN)`);
      if (method === 'GET' || method === 'get') {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          console.info(`[Resilience] Serving fallback stale cache for blocked endpoint: ${endpoint}`);
          return JSON.parse(cached);
        }
      }
      throw new Error(`Circuit breaker open for endpoint: ${basePath}`);
    }
  }

  const session = JSON.parse(localStorage.getItem('king24x7_session') || 'null');
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(session && session.token ? { 'Authorization': `Bearer ${session.token}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Success: reset circuit state
    if (circuit.status !== 'closed') {
      console.info(`[Circuit Breaker] Closing circuit for endpoint: ${basePath} after success`);
    }
    circuit.status = 'closed';
    circuit.failures = 0;

    // Cache successful GET responses (bypassed for live breaking news & layout)
    if ((method === 'GET' || method === 'get') && !isBypassed) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (e) {
        console.warn('[Resilience] Failed to write API response to localStorage cache:', e);
      }
    }

    const lang = localStorage.getItem('king24x7_lang') || 'en';

    if (endpoint.startsWith('/videos') && lang === 'en') {
      if (Array.isArray(data)) {
        return data.map(v => translateVideo(v, lang));
      } else if (data && typeof data === 'object') {
        return translateVideo(data, lang);
      }
    }

    return data;

  } catch (error) {
    // Failure: increment failure counts and trip circuit if limit reached
    circuit.failures++;
    circuit.lastFailureTime = Date.now();
    
    if (circuit.failures >= MAX_FAILURES) {
      circuit.status = 'open';
      console.error(`[Circuit Breaker] Tripped OPEN for endpoint: ${basePath} after ${circuit.failures} failures. Cool-down: 30s.`);
    }

    // Try serving fallback content from cache
    if (method === 'GET' || method === 'get') {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        console.warn(`[Resilience] Network failed for ${endpoint}. Serving stale cache as fallback. Error: ${error.message}`);
        return JSON.parse(cached);
      }
    }

    throw error;
  }
};
