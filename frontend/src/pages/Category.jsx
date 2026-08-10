import React, { useContext, useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';
import { fetchApi } from '../utils/api';

const subcatEnTranslations = {
  'மாநிலம்': 'State',
  'தேசியம்': 'National',
  'சர்வதேசம்': 'International',
  'அரசு கொள்கைகள்': 'Governance',
  'சந்தை': 'Markets',
  'நிறுவனங்கள்': 'Companies',
  'முதலீடு': 'Investment',
  'ஸ்டார்ட்அப்': 'Startups',
  'கிரிக்கெட்': 'Cricket',
  'கால்பந்து': 'Football',
  'டென்னிஸ்': 'Tennis',
  'உள்ளூர்': 'Local Sports',
  'கோலிவுட்': 'Kollywood',
  'பாலிவுட்': 'Bollywood',
  'விமர்சனங்கள்': 'Reviews',
  'இசை': 'Music',
  'ஸ்மார்ட்போன்': 'Smartphones',
  'மென்பொருள்': 'Software',
  'AI': 'AI',
  'செயற்கை நுண்ணறிவு': 'AI',
  'விண்வெளி': 'Space',
  'உலக செய்திகள்': 'World News',
  'state': 'State',
  'national': 'National',
  'international': 'International',
  'governance': 'Governance',
  'markets': 'Markets',
  'companies': 'Companies',
  'investment': 'Investment',
  'startups': 'Startups',
  'cricket': 'Cricket',
  'football': 'Football',
  'tennis': 'Tennis',
  'local sports': 'Local Sports',
  'kollywood': 'Kollywood',
  'bollywood': 'Bollywood',
  'reviews': 'Reviews',
  'music': 'Music',
  'smartphones': 'Smartphones',
  'software': 'Software',
  'space': 'Space',
  'world news': 'World News'
};

const Category = () => {
  const { lang } = useContext(LanguageContext);
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Determine category key (cat query param has precedence, otherwise URL slug, default to 'politics')
  const catKey = (searchParams.get('cat') || slug || 'politics').toLowerCase();

  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [selectedSubcat, setSelectedSubcat] = useState('அனைத்தும்');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [navCategories, setNavCategories] = useState([]);
  const [subcatOpen, setSubcatOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.custom-dropdown')) {
        setSubcatOpen(false);
        setFilterOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);


  useEffect(() => {
    fetchApi('/categories/nav')
      .then(data => {
        if (Array.isArray(data)) {
          setNavCategories(data);
        }
      })
      .catch(err => console.warn("Failed to load nav categories in Category page", err));
  }, []);

  const catConfigurations = {
    politics: {
      titleTa: 'அரசியல் செய்திகள்',
      titleEn: 'Politics News',
      breadTa: 'அரசியல்',
      breadEn: 'Politics',
      themeClass: 'theme-politics',
      color: '#1D4ED8',
      subcatsTa: ['அனைத்தும்', 'மாநிலம்', 'தேசியம்', 'சர்வதேசம்', 'அரசு கொள்கைகள்'],
      subcatsEn: ['All', 'State', 'National', 'International', 'Governance'],
      articles: [
        {
          id: 1,
          titleTa: 'தமிழக சட்டமன்றக் கூட்டத்தொடர் புதிய பட்ஜெட் அறிவிப்புகள் – நேரடித் தகவல்கள்',
          titleEn: 'TN assembly budget session new announcements - live reports',
          descTa: 'பட்ஜெட் கூட்டத்தொடரில் முக்கிய துறைகளுக்கான நிதி ஒதுக்கீடுகள் மற்றும் புதிய திட்டங்கள் குறித்த தகவல்கள் வெளியிடப்பட்டன.',
          descEn: 'Important budget allocations and welfare schemes announced during the state assembly session.',
          subcatTa: 'மாநிலம்',
          subcatEn: 'State',
          type: 'featured',
          dateTa: '1 மணி நேரம்',
          dateEn: '1 Hr Ago',
          readTimeTa: '3 நிமிட வாசிப்பு',
          readTimeEn: '3 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800',
          gradient: 'linear-gradient(135deg, #1E3A8A, #3B82F6)'
        },
        {
          id: 2,
          titleTa: 'தேசிய தேர்தல் களம்: புது தில்லியில் அனைத்துக் கட்சிக் கூட்டம் இன்று',
          titleEn: 'National elections: all-party meet in New Delhi today',
          descTa: 'எதிர்வரும் பாராளுமன்றக் கூட்டத்தொடரை சுமுகமாக நடத்துவது குறித்து முக்கிய விவாதங்கள் நடைபெறுகின்றன.',
          descEn: 'Opposition and ruling parties meet to deliberate on parliamentary updates and guidelines.',
          subcatTa: 'தேசியம்',
          subcatEn: 'National',
          type: 'recent',
          dateTa: '3 மணி நேரம்',
          dateEn: '3 Hr Ago',
          readTimeTa: '2 நிமிட வாசிப்பு',
          readTimeEn: '2 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800',
          gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)'
        },
        {
          id: 3,
          titleTa: 'இந்திய-அமெரிக்க வெளியுறவுத் துறை அமைச்சர்கள் சந்திப்பு - முக்கிய ஒப்பந்தங்கள்',
          titleEn: 'India-US foreign ministers meet - key bilateral agreements signed',
          descTa: 'இரு நாடுகளுக்கு இடையிலான பாதுகாப்பு மற்றும் வர்த்தக உறவுகள் குறித்து உயர்மட்ட ஆலோசனைகள் நடைபெற்றன.',
          descEn: 'Bilateral defense ties and commerce updates signed during the high-level meeting in Washington.',
          subcatTa: 'சர்வதேசம்',
          subcatEn: 'International',
          type: 'analysis',
          dateTa: '6 மணி நேரம்',
          dateEn: '6 Hr Ago',
          readTimeTa: '5 நிமிட வாசிப்பு',
          readTimeEn: '5 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
          gradient: 'linear-gradient(135deg, #1D4ED8, #1E3A8A)'
        },
        {
          id: 4,
          titleTa: 'புதிய கல்விக் கொள்கை 2026: மாநில அரசுகளின் கருத்துக்கள் கேட்பு',
          titleEn: 'New education policy 2026: state views requested',
          descTa: 'கல்வித் துறையில் மேற்கொள்ளப்பட வேண்டிய சீர்திருத்தங்கள் குறித்து ஆலோசனைகள் பெறப்பட்டு வருகின்றன.',
          descEn: 'State education ministries present reports regarding local guidelines and recommendations.',
          subcatTa: 'அரசு கொள்கைகள்',
          subcatEn: 'Governance',
          type: 'opinion',
          dateTa: '12 மணி நேரம்',
          dateEn: '12 Hr Ago',
          readTimeTa: '4 நிமிட வாசிப்பு',
          readTimeEn: '4 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
          gradient: 'linear-gradient(135deg, #2563EB, #3B82F6)'
        }
      ]
    },
    business: {
      titleTa: 'வணிகச் செய்திகள்',
      titleEn: 'Business News',
      breadTa: 'வணிகம்',
      breadEn: 'Business',
      themeClass: 'theme-business',
      color: '#059669',
      subcatsTa: ['அனைத்தும்', 'சந்தை', 'நிறுவனங்கள்', 'முதலீடு', 'ஸ்டார்ட்அப்'],
      subcatsEn: ['All', 'Markets', 'Companies', 'Investment', 'Startups'],
      articles: [
        {
          id: 7,
          titleTa: 'பங்குச்சந்தை வரலாறு காணாத உயர்வு – சென்செக்ஸ் 83,000 புள்ளிகளைத் தாண்டியது',
          titleEn: 'Stock markets reach record highs - Sensex crosses 83,000 points',
          descTa: 'தொழில்நுட்ப மற்றும் வங்கி பங்குகள் பெரும் லாபம் ஈட்டியதை அடுத்து முதலீட்டாளர்கள் மகிழ்ச்சி அடைந்துள்ளனர்.',
          descEn: 'Tech and Banking sector shares register major gains as domestic markets hit new historic milestones.',
          subcatTa: 'சந்தை',
          subcatEn: 'Markets',
          type: 'featured',
          dateTa: '30 நிமிடங்கள்',
          dateEn: '30 Min Ago',
          readTimeTa: '2 நிமிட வாசிப்பு',
          readTimeEn: '2 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
          gradient: 'linear-gradient(135deg, #065F46, #10B981)'
        },
        {
          id: 8,
          titleTa: 'டாடா மோட்டார்ஸ் மின்சார வாகன உற்பத்தியில் புதிய முதலீடுகள்',
          titleEn: 'Tata Motors announces fresh investments in EV manufacturing',
          descTa: 'வாகன சந்தையில் எலெக்ட்ரிக் கார்களின் தேவையை பூர்த்தி செய்ய புதிய தொழிற்சாலைகள் அமைக்கப்பட உள்ளன.',
          descEn: 'Automaker plans new manufacturing lines to cater to expanding customer demand in electric vehicles.',
          subcatTa: 'நிறுவனங்கள்',
          subcatEn: 'Companies',
          type: 'recent',
          dateTa: '2 மணி நேரம்',
          dateEn: '2 Hr Ago',
          readTimeTa: '3 நிமிட வாசிப்பு',
          readTimeEn: '3 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800',
          gradient: 'linear-gradient(135deg, #10B981, #34D399)'
        },
        {
          id: 9,
          titleTa: 'தங்கத்தின் விலை அதிரடி வீழ்ச்சி - இன்றைய நிலவரம்',
          titleEn: 'Gold prices plunge sharply - today market details',
          descTa: 'சர்வதேச சந்தையில் ஏற்பட்ட மாற்றங்கள் காரணமாக தங்கம் மற்றும் வெள்ளியின் விலை இன்று சற்று குறைந்துள்ளது.',
          descEn: 'Yellow metal prices fall across major Indian cities following global bullion rate drops.',
          subcatTa: 'முதலீடு',
          subcatEn: 'Investment',
          type: 'recent',
          dateTa: '4 மணி நேரம்',
          dateEn: '4 Hr Ago',
          readTimeTa: '2 நிமிட வாசிப்பு',
          readTimeEn: '2 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800',
          gradient: 'linear-gradient(135deg, #047857, #10B981)'
        }
      ]
    },
    sports: {
      titleTa: 'விளையாட்டுச் செய்திகள்',
      titleEn: 'Sports News',
      breadTa: 'விளையாட்டு',
      breadEn: 'Sports',
      themeClass: 'theme-sports',
      color: '#EA580C',
      subcatsTa: ['அனைத்தும்', 'கிரிக்கெட்', 'கால்பந்து', 'டென்னிஸ்', 'உள்ளூர்'],
      subcatsEn: ['All', 'Cricket', 'Football', 'Tennis', 'Local Sports'],
      articles: [
        {
          id: 13,
          titleTa: 'IPL 2025: சென்னை சூப்பர் கிங்ஸ் அணி இறுதிப்போட்டிக்கு தகுதி பெற்றது',
          titleEn: 'IPL 2025: Chennai Super Kings qualify for the grand finale',
          descTa: 'ரசிகர்களை பரவசப்படுத்திய பரபரப்பான போட்டியில் மும்பை அணியை வீழ்த்தி சென்னை அணி வெற்றி பெற்றது.',
          descEn: 'CSK defeats MI in an absolute thriller to book their spot in the final championship clash.',
          subcatTa: 'கிரிக்கெட்',
          subcatEn: 'Cricket',
          type: 'featured',
          dateTa: '10 நிமிடங்கள்',
          dateEn: '10 Min Ago',
          readTimeTa: '4 நிமிட வாசிப்பு',
          readTimeEn: '4 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800',
          gradient: 'linear-gradient(135deg, #C2410C, #F97316)'
        },
        {
          id: 14,
          titleTa: 'உலகக் கோப்பை தகுதிச் சுற்று கால்பந்து: இந்திய அணி அபார ஆட்டம்',
          titleEn: 'World Cup qualifiers football: India shines in group matches',
          descTa: 'நெருக்கடியான போட்டியில் ஆப்கானிஸ்தான் அணியை 2-1 என்ற கோல் கணக்கில் வீழ்த்தி இந்திய அணி சாதனை படைத்தது.',
          descEn: 'Indian national football team registers crucial 2-1 victory over Afghanistan in qualifiers.',
          subcatTa: 'கால்பந்து',
          subcatEn: 'Football',
          type: 'recent',
          dateTa: '3 மணி நேரம்',
          dateEn: '3 Hr Ago',
          readTimeTa: '3 நிமிட வாசிப்பு',
          readTimeEn: '3 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',
          gradient: 'linear-gradient(135deg, #F97316, #FB923C)'
        }
      ]
    },
    cinema: {
      titleTa: 'சினிமா & பொழுதுபோக்கு',
      titleEn: 'Entertainment News',
      breadTa: 'பொழுதுபோக்கு',
      breadEn: 'Entertainment',
      themeClass: 'theme-cinema',
      color: '#DB2777',
      subcatsTa: ['அனைத்தும்', 'கோலிவுட்', 'பாலிவுட்', 'விமர்சனங்கள்', 'இசை'],
      subcatsEn: ['All', 'Kollywood', 'Bollywood', 'Reviews', 'Music'],
      articles: [
        {
          id: 19,
          titleTa: 'விஜய் 69-வது படம்: அனிருத் இசையமைப்பில் உருவாவதாக அதிகாரப்பூர்வ அறிவிப்பு',
          titleEn: 'Vijay 69th film: Anirudh officially confirmed as music director',
          descTa: 'திரையுலகமே பெரிதும் எதிர்பார்த்த பிரம்மாண்ட கூட்டணி மீண்டும் இணைகிறது. ரசிகர்கள் பெரும் கொண்டாட்டத்தில் உள்ளனர்.',
          descEn: 'The highly anticipated cinematic team collaborates again for Thalapathy Vijay’s final project.',
          subcatTa: 'கோலிவுட்',
          subcatEn: 'Kollywood',
          type: 'featured',
          dateTa: '45 நிமிடங்கள்',
          dateEn: '45 Min Ago',
          readTimeTa: '2 நிமிட வாசிப்பு',
          readTimeEn: '2 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
          gradient: 'linear-gradient(135deg, #BE185D, #EC4899)'
        },
        {
          id: 20,
          titleTa: 'ஆஸ்கார் 2026 பரிந்துரை பட்டியலில் இடம் பிடித்த தமிழ் திரைப்படம்',
          titleEn: 'Tamil movie shortlisted for Oscar 2026 official nominations',
          descTa: 'இந்தியாவின் அதிகாரப்பூர்வ பிரதிநிதியாக தமிழ் படம் தேர்வு செய்யப்பட்டுள்ளதாக திரைப்பட கூட்டமைப்பு அறிவித்துள்ளது.',
          descEn: 'Film Federation of India nominates Tamil cinema masterpiece as the country’s official submission.',
          subcatTa: 'கோலிவுட்',
          subcatEn: 'Kollywood',
          type: 'analysis',
          dateTa: '4 மணி நேரம்',
          dateEn: '4 Hr Ago',
          readTimeTa: '4 நிமிட வாசிப்பு',
          readTimeEn: '4 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800',
          gradient: 'linear-gradient(135deg, #EC4899, #F472B6)'
        }
      ]
    },
    tech: {
      titleTa: 'தொழில்நுட்பச் செய்திகள்',
      titleEn: 'Technology News',
      breadTa: 'தொழில்நுட்பம்',
      breadEn: 'Tech',
      themeClass: 'theme-tech',
      color: '#7C3AED',
      subcatsTa: ['அனைத்தும்', 'ஸ்மார்ட்போன்', 'மென்பொருள்', 'AI', 'விண்வெளி'],
      subcatsEn: ['All', 'Smartphones', 'Software', 'AI', 'Space'],
      articles: [
        {
          id: 25,
          titleTa: 'ChatGPT 5.0 வெளியீடு: செயற்கை நுண்ணறிவில் அடுத்த கட்ட பாய்ச்சல்',
          titleEn: 'ChatGPT 5.0 launched: next paradigm shift in artificial intelligence',
          descTa: 'புதிய மனித உணர்வுகளைப் புரிந்துகொள்ளும் திறன் மற்றும் மிக வேகமான பதிலளிப்பு வசதிகள் கொண்ட புதிய மாடல் அறிமுகம்.',
          descEn: 'OpenAI introduces its latest frontier model with advanced emotional intelligence and reasoning capabilities.',
          subcatTa: 'AI',
          subcatEn: 'AI',
          type: 'featured',
          dateTa: '20 நிமிடங்கள்',
          dateEn: '20 Min Ago',
          readTimeTa: '4 நிமிட வாசிப்பு',
          readTimeEn: '4 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800',
          gradient: 'linear-gradient(135deg, #6D28D9, #A855F7)'
        },
        {
          id: 26,
          titleTa: 'ஆப்பிள் நிறுவனத்தின் புதிய ஐபோன் 17 சீரிஸ் சிறப்பம்சங்கள் கசிந்தன',
          titleEn: 'Apple iPhone 17 series specifications leaked online',
          descTa: 'மெல்லிய வடிவமைப்பு, மேம்பட்ட பேட்டரி ஆயுள் மற்றும் சக்திவாய்ந்த கேமரா அமைப்புகள் இடம்பெறுவது உறுதியாகியுள்ளது.',
          descEn: 'Leaked details hint at ultra-slim profile redesign and enhanced battery and optical zoom units.',
          subcatTa: 'ஸ்மார்ட்போன்',
          subcatEn: 'Smartphones',
          type: 'recent',
          dateTa: '3 மணி நேரம்',
          dateEn: '3 Hr Ago',
          readTimeTa: '3 நிமிட வாசிப்பு',
          readTimeEn: '3 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800',
          gradient: 'linear-gradient(135deg, #A855F7, #C084FC)'
        }
      ]
    },
    international: {
      titleTa: 'சர்வதேச செய்திகள்',
      titleEn: 'International News',
      breadTa: 'சர்வதேசம்',
      breadEn: 'International',
      themeClass: 'theme-international',
      color: '#0F172A',
      subcatsTa: ['அனைத்தும்', 'தேசியம்', 'சர்வதேசம்', 'உலக செய்திகள்'],
      subcatsEn: ['All', 'National', 'International', 'World News'],
      articles: [
        {
          id: 31,
          titleTa: 'விண்வெளி ஆய்வு: "ககன்யான்" திட்டத்தின் முக்கிய மைல்கல் - "சால்வ்" சாலிட் மோட்டார் சோதனையை வெற்றிகரமாக முடித்தது இஸ்ரோ',
          titleEn: 'Space Exploration: ISRO Conducts Successful SOLVE Solid Motor Ground Test for Gaganyaan Mission',
          descTa: 'ஸ்ரீஹரிகோட்டாவில் ககன்யான் மனித விண்கலத் திட்டத்தின் மீட்பு அமைப்புகளை சோதிப்பதற்கான சாலிட் மோட்டார் சோதனையை வெற்றிகரமாக மேற்கொண்டுள்ளது.',
          descEn: 'The experimental launch vehicle solid strap-on motor ground test at Sriharikota validates deceleration and recovery module systems.',
          subcatTa: 'சர்வதேசம்',
          subcatEn: 'International',
          type: 'featured',
          dateTa: '2 மணி நேரம்',
          dateEn: '2 Hr Ago',
          readTimeTa: '4 நிமிட வாசிப்பு',
          readTimeEn: '4 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
          gradient: 'linear-gradient(135deg, #1E40AF, #3B82F6)'
        }
      ]
    },
    world: {
      titleTa: 'சர்வதேச செய்திகள்',
      titleEn: 'International News',
      breadTa: 'சர்வதேசம்',
      breadEn: 'International',
      themeClass: 'theme-international',
      color: '#0F172A',
      subcatsTa: ['அனைத்தும்', 'தேசியம்', 'சர்வதேசம்', 'உலக செய்திகள்'],
      subcatsEn: ['All', 'National', 'International', 'World News'],
      articles: [
        {
          id: 31,
          titleTa: 'விண்வெளி ஆய்வு: "ககன்யான்" திட்டத்தின் முக்கிய மைல்கல் - "சால்வ்" சாலிட் மோட்டார் சோதனையை வெற்றிகரமாக முடித்தது இஸ்ரோ',
          titleEn: 'Space Exploration: ISRO Conducts Successful SOLVE Solid Motor Ground Test for Gaganyaan Mission',
          descTa: 'ஸ்ரீஹரிகோட்டாவில் ககன்யான் மனித விண்கலத் திட்டத்தின் மீட்பு அமைப்புகளை சோதிப்பதற்கான சாலிட் மோட்டார் சோதனையை வெற்றிகரமாக மேற்கொண்டுள்ளது.',
          descEn: 'The experimental launch vehicle solid strap-on motor ground test at Sriharikota validates deceleration and recovery module systems.',
          subcatTa: 'சர்வதேசம்',
          subcatEn: 'International',
          type: 'featured',
          dateTa: '2 மணி நேரம்',
          dateEn: '2 Hr Ago',
          readTimeTa: '4 நிமிட வாசிப்பு',
          readTimeEn: '4 Min Read',
          imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
          gradient: 'linear-gradient(135deg, #1E40AF, #3B82F6)'
        }
      ]
    },
    regional: {
      titleTa: 'மண்டலச் செய்திகள்',
      titleEn: 'Regional News',
      breadTa: 'மண்டலம்',
      breadEn: 'Regional',
      themeClass: 'theme-regional',
      color: '#059669',
      subcatsTa: ['அனைத்தும்', 'தமிழ்நாடு', 'மாவட்டங்கள்', 'உள்ளூர்'],
      subcatsEn: ['All', 'Tamil Nadu', 'Districts', 'Local'],
      articles: []
    },
    'our-town': {
      titleTa: 'நம்ம ஊர் செய்திகள்',
      titleEn: 'Our Town News',
      breadTa: 'நம்ம ஊர்',
      breadEn: 'Regional',
      themeClass: 'theme-regional',
      color: '#059669',
      subcatsTa: ['அனைத்தும்', 'தமிழ்நாடு', 'மாவட்டங்கள்', 'உள்ளூர்'],
      subcatsEn: ['All', 'Tamil Nadu', 'Districts', 'Local'],
      articles: []
    }
  };

  const matchedDbCat = navCategories.find(c => (c.slug || '').toLowerCase() === catKey);

  const baseConfig = catConfigurations[catKey] || {
    themeClass: 'theme-politics',
    color: '#1D4ED8',
    articles: []
  };

  const currentCat = matchedDbCat ? {
    ...baseConfig,
    titleTa: matchedDbCat.nameTa || matchedDbCat.name,
    titleEn: matchedDbCat.name,
    breadTa: matchedDbCat.nameTa || matchedDbCat.name,
    breadEn: matchedDbCat.name,
    subcatsTa: ['அனைத்தும்', ...(matchedDbCat.subcategories || []).map(s => s.nameTa || s.name)],
    subcatsEn: ['All', ...(matchedDbCat.subcategories || []).map(s => s.name)]
  } : baseConfig;

  useEffect(() => {
    // Dynamically apply category color theme class to body
    document.body.classList.add(currentCat.themeClass || 'theme-politics');
    return () => {
      document.body.classList.remove(currentCat.themeClass || 'theme-politics');
    };
  }, [currentCat]);

  useEffect(() => {
    // Reset selections on category change
    setSelectedSubcat('அனைத்தும்');
    setSelectedFilter('all');

    // Fetch dynamic database articles from backend
    fetchApi('/articles/getAllWeb?size=200')
      .then(res => {
        const data = res?.content || (Array.isArray(res) ? res : []);
        const catIdMap = { politics: 1, business: 2, sports: 3, cinema: 4, tech: 5, regional: 6, 'our-town': 6, international: 7, world: 7 };
        const targetId = matchedDbCat ? matchedDbCat.id : (catIdMap[catKey] || 1);

        const filtered = data.filter(item => {
          if (item.categoryId) return String(item.categoryId) === String(targetId);
          if (item.categorySlug) return item.categorySlug.toLowerCase() === catKey.toLowerCase();
          return false;
        });

        // Helper to find subcategory names from navCategories
        const findSubcatInfo = (subId) => {
          if (!subId || !navCategories.length) return null;
          for (const cat of navCategories) {
            if (cat.subcategories) {
              const found = cat.subcategories.find(s => String(s.id) === String(subId));
              if (found) return found;
            }
          }
          return null;
        };

        const dbArticles = filtered.map(item => {
          const subInfo = findSubcatInfo(item.subcategoryId);
          const subTa = item.subCategoryNameTa || item.subCategoryName || (subInfo ? (subInfo.nameTa || subInfo.name) : (item.districtId ? 'மாநிலம்' : 'தேசியம்'));
          const subEn = item.subCategoryName || item.subCategoryNameTa || (subInfo ? (subInfo.name || subInfo.nameTa) : (item.districtId ? 'State' : 'National'));

          return {
            id: item.id || item.article_id,
            titleTa: item.titleTa,
            titleEn: item.titleEn,
            descTa: item.shortDescTa || (item.contentTa ? item.contentTa.replace(/<[^>]*>/g, '').slice(0, 150) : ''),
            descEn: item.shortDescEn || (item.contentEn ? item.contentEn.replace(/<[^>]*>/g, '').slice(0, 150) : ''),
            subcatTa: subTa,
            subcatEn: subEn,
            subcategoryId: item.subcategoryId,
            type: item.viewsCount > 100 ? 'featured' : 'recent',
            dateTa: '1 மணி நேரம்',
            dateEn: '1 Hr Ago',
            readTimeTa: `${item.readingTime || 1} நிமிட வாசிப்பு`,
            readTimeEn: `${item.readingTime || 1} Min Read`,
            imageUrl: item.imageUrl || item.featuredImage || item.image_url || item.featured_image,
            gradient: 'linear-gradient(135deg, #1E40AF, #3B82F6)'
          };
        });

        // Combine DB articles on top, then fall back to static articles if DB list has < 4 items
        const staticList = currentCat.articles || [];
        const combined = [...dbArticles, ...staticList.filter(s => !dbArticles.some(d => d.id === s.id))];

        setArticles(combined);
      })
      .catch(err => {
        console.warn("Could not fetch articles for category", err);
        setArticles(currentCat.articles || []);
      });
  }, [catKey, matchedDbCat, navCategories]);

  useEffect(() => {
    document.title = `${lang === 'en' ? currentCat.titleEn : currentCat.titleTa} - KINGS 24x7`;
  }, [lang, currentCat]);

  useEffect(() => {
    const subcatParam = searchParams.get('subcat');
    if (subcatParam) {
      setSelectedSubcat(subcatParam);
    } else {
      setSelectedSubcat(lang === 'en' ? 'All' : 'அனைத்தும்');
    }
  }, [lang, searchParams, catKey]);

  useEffect(() => {
    // Perform subcategory and type filtering
    let temp = articles;

    // Subcategory Filter
    if (selectedSubcat !== 'அனைத்தும்' && selectedSubcat !== 'All') {
      temp = temp.filter(art => {
        const subcatTaValue = (art.subcatTa || '').toLowerCase().trim();
        const subcatEnValue = (art.subcatEn || '').toLowerCase().trim();
        const targetSelected = (selectedSubcat || '').toLowerCase().trim();
        
        return subcatTaValue === targetSelected || 
               subcatEnValue === targetSelected ||
               (subcatEnTranslations[art.subcatTa] || '').toLowerCase() === targetSelected ||
               (subcatEnTranslations[art.subcatEn] || '').toLowerCase() === targetSelected;
      });
    }

    // Type Filter (all, featured, analysis, opinion)
    if (selectedFilter !== 'all') {
      temp = temp.filter(art => art.type === selectedFilter);
    }

    setFilteredArticles(temp);
  }, [selectedSubcat, selectedFilter, articles, lang]);

  const getSubcatEn = (s) => {
    if (!s) return '';
    const nameStr = s.name || '';
    const nameTaStr = s.nameTa || '';
    return subcatEnTranslations[nameStr] || subcatEnTranslations[nameTaStr] || subcatEnTranslations[nameStr.toLowerCase()] || nameStr;
  };

  const matchedCat = navCategories.find(c => c.slug === catKey);
  const subcategories = matchedCat 
    ? (lang === 'en' 
        ? ['All', ...matchedCat.subcategories.map(s => getSubcatEn(s))] 
        : ['அனைத்தும்', ...matchedCat.subcategories.map(s => s.nameTa)])
    : (lang === 'en' ? currentCat.subcatsEn : currentCat.subcatsTa);

  return (
    <main className="news-section" style={{ width: '100%', '--category-color': currentCat.color || 'var(--primary)' }}>
      {/* CATEGORY HEADER BLOCK */}
      <div className="category-header" style={{ padding: '30px 0', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container">
          {/* Breadcrumbs */}
          <div className="breadcrumbs">
            <Link to="/">{lang === 'en' ? 'Home' : 'முகப்பு'}</Link>
            <i className="fas fa-chevron-right" style={{ fontSize: '10px', margin: '0 8px' }}></i>
            <span>{lang === 'en' ? currentCat.breadEn : currentCat.breadTa}</span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '16px 0 20px 0' }}>
            {lang === 'en' ? currentCat.titleEn : currentCat.titleTa}
          </h1>

          {/* Subcategory tabs removed */}
        </div>
      </div>

      {/* news list grid */}
      <div className="container" style={{ marginTop: '24px' }}>
        {filteredArticles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            {lang === 'en' ? 'No articles found matching filters.' : 'செய்திகள் ஏதும் இல்லை.'}
          </div>
        ) : (
          <div className="news-grid">
            {filteredArticles.map(art => (
              <div 
                className="news-card" 
                key={art.id}
                onClick={() => navigate(`/article/${art.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div 
                  className="card-img" 
                  style={{ 
                    background: art.imageUrl ? `url(${art.imageUrl}) center/cover` : art.gradient 
                  }}
                >
                  <span className="cat-badge" style={{ background: 'var(--category-color, var(--primary))' }}>
                    {lang === 'en' ? (subcatEnTranslations[art.subcatTa] || art.subcatEn) : art.subcatTa}
                  </span>
                </div>
                <div className="card-body">
                  <h3>{lang === 'en' ? art.titleEn : art.titleTa}</h3>
                  <p>{lang === 'en' ? art.descEn : art.descTa}</p>
                  <div className="card-meta">
                    <span><i className="far fa-clock"></i> {lang === 'en' ? art.dateEn : art.dateTa}</span>
                    <span><i className="far fa-eye"></i> {lang === 'en' ? art.readTimeEn : art.readTimeTa}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px', marginBottom: '40px' }}>
          <button 
            className="livetv-btn" 
            style={{ background: 'var(--category-color, var(--primary))', border: 'none', color: 'white', padding: '12px 32px', borderRadius: '30px', fontWeight: 700, cursor: 'pointer' }}
            onClick={() => alert(lang === 'en' ? 'End of list reached.' : 'மேலும் செய்திகள் விரைவில்!')}
          >
            {lang === 'en' ? 'Load More' : 'மேலும் செய்திகள்'}
          </button>
        </div>
      </div>
    </main>
  );
};

export default Category;
