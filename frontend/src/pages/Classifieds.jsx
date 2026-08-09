import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { fetchApi, getImageUrl } from '../utils/api';
import './Classifieds.css';

// DEFAULT CATEGORIES WITH SUBCATEGORIES
export const DEFAULT_CATEGORIES = [
  {
    id: 1,
    name: 'Property / சொத்துக்கள்',
    slug: 'property',
    iconClass: 'fa-building',
    activeAdCount: 42,
    subcategories: [
      { id: 101, name: 'House for Rent / வாடகை வீடு' },
      { id: 102, name: 'House for Sale / வீடு விற்பனை' },
      { id: 103, name: 'Plot & Land / நிலம்' },
      { id: 104, name: 'Commercial Property / வணிக இடம்' }
    ]
  },
  {
    id: 2,
    name: 'Vehicles / வாகனங்கள்',
    slug: 'vehicle',
    iconClass: 'fa-car',
    activeAdCount: 38,
    subcategories: [
      { id: 201, name: 'Cars / கார்கள்' },
      { id: 202, name: 'Bikes & Scooters / இருசக்கர வாகனங்கள்' },
      { id: 203, name: 'Commercial Vehicles / வர்த்தக வாகனங்கள்' },
      { id: 204, name: 'Auto Parts & Accessories / உதிரி பாகங்கள்' }
    ]
  },
  {
    id: 3,
    name: 'Mobiles & Electronics / மின்னணு சாதனங்கள்',
    slug: 'electronics',
    iconClass: 'fa-mobile-alt',
    activeAdCount: 56,
    subcategories: [
      { id: 301, name: 'Mobile Phones / கைபேசிகள்' },
      { id: 302, name: 'Laptops & Computers / கணினிகள்' },
      { id: 303, name: 'TVs & Audio / டிவி & ஆடியோ' },
      { id: 304, name: 'Home Appliances / வீட்டு உபகரணங்கள்' }
    ]
  },
  {
    id: 4,
    name: 'Jobs / வேலைவாய்ப்பு',
    slug: 'jobs',
    iconClass: 'fa-briefcase',
    activeAdCount: 29,
    subcategories: [
      { id: 401, name: 'Full Time / முழு நேர வேலை' },
      { id: 402, name: 'Part Time / பகுதி நேர வேலை' },
      { id: 403, name: 'Work From Home / வீட்டிலிருந்து வேலை' },
      { id: 404, name: 'Drivers & Delivery / ஓட்டுநர் & டெலிவரி' }
    ]
  },
  {
    id: 5,
    name: 'Services / சேவைகள்',
    slug: 'services',
    iconClass: 'fa-tools',
    activeAdCount: 19,
    subcategories: [
      { id: 501, name: 'Home Repair & Electrician / வீட்டு பழுது' },
      { id: 502, name: 'Transport & Packers / போக்குவரத்து' },
      { id: 503, name: 'Tuitions & Classes / பயிற்சிகள்' },
      { id: 504, name: 'Events & Catering / விழா ஏற்பாடுகள்' }
    ]
  },
  {
    id: 6,
    name: 'Special Offers / சிறப்பு சலுகைகள்',
    slug: 'discount',
    iconClass: 'fa-percent',
    activeAdCount: 24,
    subcategories: [
      { id: 601, name: 'Retail Store Deals / கடை சலுகைகள்' },
      { id: 602, name: 'Restaurant Offers / உணவக சலுகைகள்' },
      { id: 603, name: 'Electronics Discount / எலக்ட்ரானிக்ஸ் தள்ளுபடி' },
      { id: 604, name: 'Fashion & Clothing Sales / ஆடை தள்ளுபடி' }
    ]
  },
  {
    id: 7,
    name: 'Furniture & Home / வீட்டு உபயோகம்',
    slug: 'furniture',
    iconClass: 'fa-couch',
    activeAdCount: 15,
    subcategories: [
      { id: 701, name: 'Sofa & Dining / சோபா & மேஜை' },
      { id: 702, name: 'Beds & Wardrobes / கட்டில் & அலமாரி' },
      { id: 703, name: 'Home Decor & Lighting / அலங்கார பொருட்கள்' }
    ]
  },
  {
    id: 8,
    name: 'Fashion & Beauty / ஆடை & அழகு',
    slug: 'fashion',
    iconClass: 'fa-tshirt',
    activeAdCount: 21,
    subcategories: [
      { id: 801, name: "Men's Wear / ஆண்கள் ஆடை" },
      { id: 802, name: "Women's Wear / பெண்கள் ஆடை" },
      { id: 803, name: 'Watches & Accessories / கடிகாரங்கள்' }
    ]
  }
];

// DEFAULT ALL 38 DISTRICTS OF TAMIL NADU
export const DEFAULT_DISTRICTS = [
  { id: 1, nameEn: 'Chennai', nameTa: 'சென்னை' },
  { id: 2, nameEn: 'Coimbatore', nameTa: 'கோயம்புத்தூர்' },
  { id: 3, nameEn: 'Madurai', nameTa: 'மதுரை' },
  { id: 4, nameEn: 'Salem', nameTa: 'சேலம்' },
  { id: 5, nameEn: 'Tiruchirappalli', nameTa: 'திருச்சி' },
  { id: 6, nameEn: 'Tirunelveli', nameTa: 'திருநெல்வேலி' },
  { id: 7, nameEn: 'Vellore', nameTa: 'வேலூர்' },
  { id: 8, nameEn: 'Erode', nameTa: 'ஈரோடு' },
  { id: 9, nameEn: 'Thanjavur', nameTa: 'தஞ்சாவூர்' },
  { id: 10, nameEn: 'Kanyakumari', nameTa: 'கன்னியாகுமரி' },
  { id: 11, nameEn: 'Dindigul', nameTa: 'திண்டுக்கல்' },
  { id: 12, nameEn: 'Tiruppur', nameTa: 'திருப்பூர்' },
  { id: 13, nameEn: 'Kanchipuram', nameTa: 'காஞ்சிபுரம்' },
  { id: 14, nameEn: 'Tiruvallur', nameTa: 'திருவள்ளூர்' },
  { id: 15, nameEn: 'Cuddalore', nameTa: 'கடலூர்' },
  { id: 16, nameEn: 'Dharmapuri', nameTa: 'தர்மபுரி' },
  { id: 17, nameEn: 'Thoothukudi', nameTa: 'தூத்துக்குடி' },
  { id: 18, nameEn: 'Nagapattinam', nameTa: 'நாகப்பட்டினம்' },
  { id: 19, nameEn: 'Namakkal', nameTa: 'நாமக்கல்' },
  { id: 20, nameEn: 'Pudukkottai', nameTa: 'புதுக்கோட்டை' },
  { id: 21, nameEn: 'Ramanathapuram', nameTa: 'ராமநாதபுரம்' },
  { id: 22, nameEn: 'Sivaganga', nameTa: 'சிவகங்கை' },
  { id: 23, nameEn: 'Theni', nameTa: 'தேனி' },
  { id: 24, nameEn: 'Tiruvannamalai', nameTa: 'திருவண்ணாமலை' },
  { id: 25, nameEn: 'Tiruvarur', nameTa: 'திருவாரூர்' },
  { id: 26, nameEn: 'Virudhunagar', nameTa: 'விருதுநகர்' },
  { id: 27, nameEn: 'Viluppuram', nameTa: 'விழுப்புரம்' },
  { id: 28, nameEn: 'Krishnagiri', nameTa: 'கிருஷ்ணகிரி' },
  { id: 29, nameEn: 'Perambalur', nameTa: 'பெரம்பலூர்' },
  { id: 30, nameEn: 'Ariyalur', nameTa: 'அரியலூர்' },
  { id: 31, nameEn: 'Nilgiris', nameTa: 'நீலகிரி' },
  { id: 32, nameEn: 'Tirupattur', nameTa: 'திருப்பத்தூர்' },
  { id: 33, nameEn: 'Ranipet', nameTa: 'ராணிப்பேட்டை' },
  { id: 34, nameEn: 'Tenkasi', nameTa: 'தென்காசி' },
  { id: 35, nameEn: 'Chengalpattu', nameTa: 'செங்கல்பட்டு' },
  { id: 36, nameEn: 'Kallakurichi', nameTa: 'கள்ளக்குறிச்சி' },
  { id: 37, nameEn: 'Mayiladuthurai', nameTa: 'மயிலாடுதுறை' },
  { id: 38, nameEn: 'Karur', nameTa: 'கரூர்' }
];

// INITIAL SAMPLE APPROVED ADS
const INITIAL_SAMPLE_ADS = [
  {
    id: 1001,
    title: 'Apple MacBook Air M2 2023 - Like New',
    priceDetail: '₹85,000',
    price: 85000,
    location: 'Chennai / சென்னை',
    categoryName: 'Mobiles & Electronics',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500',
    description: 'Apple MacBook Air M2 8GB RAM 256GB SSD. Midnight Color. Mint condition with original box, bill and charger.',
    contactPhone: '9876543210',
    whatsappNumber: '9876543210',
    createdAt: '2 hours ago'
  },
  {
    id: 1002,
    title: '2 BHK Luxury Apartment for Rent',
    priceDetail: '₹18,000 / month',
    price: 18000,
    location: 'Coimbatore / கோயம்புத்தூர்',
    categoryName: 'Property',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500',
    description: 'Spacious 2 BHK East facing apartment. Car parking, 24/7 security, elevator and metro water facility included.',
    contactPhone: '9876512345',
    whatsappNumber: '9876512345',
    createdAt: '4 hours ago'
  },
  {
    id: 1003,
    title: 'Honda City i-VTEC VX 2021 Petrol',
    priceDetail: '₹7,50,000',
    price: 750000,
    location: 'Madurai / மதுரை',
    categoryName: 'Vehicles',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500',
    description: 'Single owner Honda City, 35,000 km driven. Full company service history, insurance valid till Nov 2026.',
    contactPhone: '9123456789',
    whatsappNumber: '9123456789',
    createdAt: '1 day ago'
  },
  {
    id: 1004,
    title: 'Samsung 55 inch 4K Smart TV Offer',
    priceDetail: '₹39,999',
    price: 39999,
    location: 'Salem / சேலம்',
    categoryName: 'Special Offers',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500',
    description: 'Exclusive festival discount offer! Brand new sealed piece Samsung Crystal 4K UHD Smart TV with 2 year warranty.',
    contactPhone: '9988776655',
    whatsappNumber: '9988776655',
    createdAt: '2 days ago'
  }
];

const Classifieds = () => {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);

  // Lists
  const [ads, setAds] = useState([]);
  const [pendingAds, setPendingAds] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [formSubcategories, setFormSubcategories] = useState(DEFAULT_CATEGORIES[0].subcategories);
  const [districts, setDistricts] = useState(DEFAULT_DISTRICTS);
  
  // Selection / Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [smartSearchLoading, setSmartSearchLoading] = useState(false);
  const [smartSearchIntent, setSmartSearchIntent] = useState(null);
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedLoc, setSelectedLoc] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [priceMax, setPriceMax] = useState(1000000);
  const [conditionNew, setConditionNew] = useState(true);
  const [conditionUsed, setConditionUsed] = useState(true);

  // Loading
  const [loading, setLoading] = useState(false);

  // Modals & Views
  const [selectedAd, setSelectedAd] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [shareAdObj, setShareAdObj] = useState(null);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('kingstv_classifieds_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const toggleWishlist = (adId, e) => {
    if (e) e.stopPropagation();
    setWishlist(prev => {
      const newWishlist = prev.includes(adId) ? prev.filter(id => id !== adId) : [...prev, adId];
      localStorage.setItem('kingstv_classifieds_wishlist', JSON.stringify(newWishlist));
      return newWishlist;
    });
  };

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newCatId, setNewCatId] = useState('1');
  const [newSubcatId, setNewSubcatId] = useState('101');
  const [newPrice, setNewPrice] = useState('');
  const [newNegotiable, setNewNegotiable] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDistrictId, setNewDistrictId] = useState('1');
  const [newPincode, setNewPincode] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [newLatitude, setNewLatitude] = useState(null);
  const [newLongitude, setNewLongitude] = useState(null);
  const [isFree, setIsFree] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [lastGeneratedDesc, setLastGeneratedDesc] = useState('');
  
  // AI Enhancement State
  const [showAiEnhanceModal, setShowAiEnhanceModal] = useState(false);
  const [aiEnhancedData, setAiEnhancedData] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Fetch categories & districts from API with automatic fallback
  useEffect(() => {
    fetchApi('/classifieds/categories')
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setCategories(data);
      })
      .catch(() => setCategories(DEFAULT_CATEGORIES));

    fetchApi('/districts')
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setDistricts(data);
      })
      .catch(() => setDistricts(DEFAULT_DISTRICTS));
  }, []);

  // No longer loading pending ads from local storage since backend is fully integrated

  // Load Ads from API
  const loadAds = () => {
    setLoading(true);

    let combinedList = [...INITIAL_SAMPLE_ADS];

    fetchApi('/classifieds')
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const FALLBACK_IMAGES = [
            'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500',
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500',
            'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500',
            'https://images.unsplash.com/photo-1511385348-a52b4a160dc2?w=500',
            'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=500',
            'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=500',
            'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=500'
          ];
          const formatted = data.map((item, index) => ({
            id: item.id,
            title: item.title,
            priceDetail: item.price === 0 ? 'FREE' : `₹${item.price.toLocaleString()}`,
            price: item.price,
            location: item.location || 'Tamil Nadu',
            status: item.status || 'active',
            imageUrl: item.imageUrl || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
            description: item.description,
            contactPhone: item.contactPhone,
            whatsappNumber: item.whatsappNumber,
            createdAt: 'Recently'
          }));
          combinedList = [...formatted, ...combinedList];
        }
        filterAndSetAds(combinedList);
      })
      .catch(() => {
        filterAndSetAds(combinedList);
      });
  };

  const filterAndSetAds = (allAds) => {
    let filtered = allAds.filter(a => a.status === 'active' || !a.status);

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a => a.title.toLowerCase().includes(q) || (a.description && a.description.toLowerCase().includes(q)));
    }

    if (selectedCat !== 'all') {
      filtered = filtered.filter(a => {
        const catObj = categories.find(c => c.slug === selectedCat);
        return catObj ? (a.categoryName?.includes(catObj.name) || a.categoryId === catObj.id) : true;
      });
    }

    if (selectedLoc !== 'all') {
      const distObj = districts.find(d => String(d.id) === String(selectedLoc));
      if (distObj) {
        filtered = filtered.filter(a => a.location?.includes(distObj.nameEn) || a.location?.includes(distObj.nameTa));
      }
    }

    if (priceMax < 1000000) {
      filtered = filtered.filter(a => (a.price || 0) <= priceMax);
    }

    // Condition filter (for demonstration, applying conditionNew/conditionUsed logic if added to ad objects)
    // Here we'll skip it if both are true to avoid filtering out all if data is missing
    if (!conditionNew || !conditionUsed) {
      filtered = filtered.filter(a => {
        const isNew = a.condition === 'new';
        const isUsed = a.condition !== 'new'; // Simplify default assumption
        return (conditionNew && isNew) || (conditionUsed && isUsed);
      });
    }

    if (selectedSort === 'price_asc') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (selectedSort === 'price_desc') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    setAds(filtered);
    setLoading(false);
  };

  useEffect(() => {
    loadAds();

    try {
      const channel = new BroadcastChannel('kings_classifieds_channel');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'AD_APPROVED') {
          loadAds();
        }
      };
      return () => channel.close();
    } catch (e) {}
  }, [selectedCat, selectedLoc, selectedSort, searchQuery, priceMax, conditionNew, conditionUsed]);

  const handleOpenDetails = (ad) => {
    setSelectedAd(ad);
    setPhoneRevealed(false);
  };

  const handleCategoryChange = (e) => {
    const catId = e.target.value;
    setNewCatId(catId);
    
    // Find subcategories for selected category
    const selectedCategory = categories.find(c => String(c.id) === String(catId));
    if (selectedCategory && selectedCategory.subcategories) {
      setFormSubcategories(selectedCategory.subcategories);
      if (selectedCategory.subcategories.length > 0) {
        setNewSubcatId(String(selectedCategory.subcategories[0].id));
      }
    } else {
      setFormSubcategories([]);
      setNewSubcatId('');
    }
  };

  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files).slice(0, 8);
    setImageFiles(files);
    if (files.length > 0) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreviewUrl(event.target.result);
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const handleGeolocation = () => {
    if (navigator.geolocation && window.isSecureContext) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNewLatitude(pos.coords.latitude);
          setNewLongitude(pos.coords.longitude);
          alert(lang === 'en' ? 'Location captured successfully!' : 'இடம் வெற்றிகரமாக பதிவு செய்யப்பட்டது!');
        },
        () => alert(lang === 'en' ? 'Unable to retrieve your location.' : 'உங்கள் இருப்பிடத்தை மீட்டெடுக்க முடியவில்லை.')
      );
    } else {
      alert(lang === 'en' ? 'Geolocation requires HTTPS connection.' : 'புவிஇருப்பிடம் HTTPS இணைப்பை கோருகிறது.');
    }
  };

  // OPEN PREVIEW MODAL BEFORE SUBMISSION
  const handleOpenPreview = (e) => {
    e.preventDefault();
    if (!newTitle || (!newPrice && !isFree) || !newPhone || !newDesc) {
      alert(lang === 'en' ? 'Please fill all required fields before previewing.' : 'முன்னோட்டம் பார்ப்பதற்கு முன் தேவையான அனைத்து புலங்களையும் நிரப்பவும்.');
      return;
    }
    setShowPreviewModal(true);
  };

  // FINAL SUBMISSION OF AD (PENDING APPROVAL)
  const handleConfirmSubmit = async () => {
    setUploadingMedia(true);
    let uploadedUrls = [];

    // Attempt file upload if API is present
    for (let file of imageFiles) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetchApi('/classifieds/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.url) uploadedUrls.push(res.url);
      } catch (err) {
        console.warn("File upload notice: local preview used", err);
      }
    }

    const selectedCatObj = categories.find(c => String(c.id) === String(newCatId)) || DEFAULT_CATEGORIES[0];
    const selectedDistObj = districts.find(d => String(d.id) === String(newDistrictId)) || DEFAULT_DISTRICTS[0];
    const displayImg = uploadedUrls[0] || imagePreviewUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500';

    const newAdObj = {
      title: newTitle,
      description: newDesc,
      price: isFree ? 0 : parseFloat(newPrice || '0'),
      priceDetail: isFree ? 'FREE' : `₹${parseFloat(newPrice || '0').toLocaleString()}`,
      negotiable: newNegotiable,
      categoryId: newCatId,
      categoryName: selectedCatObj.name,
      districtId: newDistrictId,
      location: `${selectedDistObj.nameEn} / ${selectedDistObj.nameTa}`,
      contactPhone: newPhone,
      whatsappNumber: newWhatsapp || newPhone,
      email: newEmail,
      imageUrl: displayImg,
      status: 'pending',
    };

    try {
      // Attempt backend save first
      const savedAd = await fetchApi('/classifieds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdObj)
      });
      
      // Update local state and notify admin portal through BroadcastChannel
      setPendingAds(prev => [savedAd, ...prev]);
      try {
        const channel = new BroadcastChannel('kings_classifieds_channel');
        channel.postMessage({ type: 'NEW_PENDING_AD', ad: savedAd });
      } catch (bcErr) {}
      
    } catch (err) {
      console.warn("API Offline notice, failed to post ad", err);
      alert(lang === 'en' ? 'Failed to submit ad. Please try again later.' : 'விளம்பரத்தை சமர்ப்பிக்க முடியவில்லை. பிறகு முயற்சிக்கவும்.');
      setUploadingMedia(false);
      return;
    }

    setUploadingMedia(false);
    setShowPreviewModal(false);
    setShowPostModal(false);

    // Reset Form
    setNewTitle('');
    setNewPrice('');
    setNewBrand('');
    setNewDesc('');
    setNewPhone('');
    setNewWhatsapp('');
    setImageFiles([]);
    setImagePreviewUrl('');
    setIsFree(false);

    setShowPreviewModal(false);
    setShowPostModal(false);
    setShowSuccessPopup(true);
  };

  // ADMIN APPROVE AD
  const handleApproveAd = (adId) => {
    const adToApprove = pendingAds.find(a => a.id === adId);
    if (!adToApprove) return;

    // Update status to active
    const approvedAd = { ...adToApprove, status: 'active' };

    // 1. Remove from pending list
    const updatedPending = pendingAds.filter(a => a.id !== adId);
    setPendingAds(updatedPending);
    localStorage.setItem('kings_classifieds_pending', JSON.stringify(updatedPending));

    // 2. Add to approved list
    try {
      const existingApproved = JSON.parse(localStorage.getItem('kings_classifieds_approved') || '[]');
      const updatedApproved = [approvedAd, ...existingApproved];
      localStorage.setItem('kings_classifieds_approved', JSON.stringify(updatedApproved));
    } catch (e) {
      console.warn("Local storage write error", e);
    }

    // 3. Call API approval if backend is live
    fetchApi(`/classifieds/admin/${adId}/approve`, { method: 'PUT' }).catch(() => {});

    alert(lang === 'en' ? `✅ Ad "${adToApprove.title}" has been APPROVED and is now live!` : `✅ விளம்பரம் "${adToApprove.title}" ஒப்புதல் அளிக்கப்பட்டு வெளியிடப்பட்டது!`);

    // Reload active ads
    loadAds();
  };

  // ADMIN REJECT AD
  const handleRejectAd = (adId) => {
    if (!window.confirm(lang === 'en' ? 'Are you sure you want to reject this ad?' : 'இந்த விளம்பரத்தை நிராகரிக்க விரும்புகிறீர்களா?')) return;
    const updatedPending = pendingAds.filter(a => a.id !== adId);
    setPendingAds(updatedPending);
    localStorage.setItem('kings_classifieds_pending', JSON.stringify(updatedPending));
  };

  const handleShareClick = (ad, platform) => {
    const pageUrl = window.location.origin + `/classifieds?id=${ad.id}`;
    const shareText = encodeURIComponent(`Check out this deal! ${ad.title} at ${ad.priceDetail}`);
    
    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${shareText}%20${encodeURIComponent(pageUrl)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`, '_blank');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(pageUrl);
      alert(lang === 'en' ? 'Link copied!' : 'இணைப்பு நகலெடுக்கப்பட்டது!');
    }
    setShowShareModal(false);
  };

  const generateTemplate = async () => {
    if (!newTitle.trim() || !newCatId) {
      alert(lang === 'en' ? 'Please enter a title and select a category first.' : 'தயவுசெய்து முதலில் தலைப்பை உள்ளிட்டு வகையை தேர்ந்தெடுக்கவும்.');
      return;
    }

    setIsGeneratingDesc(true);
    try {
      const cat = categories.find(c => c.id == newCatId);
      const subcat = formSubcategories.find(s => s.id == newSubcatId);
      
      const payloadText = `Title: ${newTitle}\nCategory: ${cat ? cat.name : ''}\nSubcategory: ${subcat ? subcat.name : ''}\nCurrent Description: ${newDesc}`;
      
      const data = await fetchApi('/classifieds/ai-description', {
        method: 'POST',
        body: JSON.stringify({ text: payloadText, lang })
      });
      if (!data.error && data.result) {
        setNewDesc(data.result);
        setLastGeneratedDesc(data.result);
      }
    } catch (e) {
      console.error("AI Template Generation failed:", e);
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const enhanceDescription = async () => {
    if (!newTitle.trim() || !newCatId) {
      alert(lang === 'en' ? 'Please enter a title and select a category first.' : 'தயவுசெய்து முதலில் தலைப்பை உள்ளிட்டு வகையை தேர்ந்தெடுக்கவும்.');
      return;
    }

    setIsEnhancing(true);
    try {
      const cat = categories.find(c => c.id == newCatId);
      const subcat = formSubcategories.find(s => s.id == newSubcatId);
      
      const payloadText = `Title: ${newTitle}\nCategory: ${cat ? cat.name : ''}\nSubcategory: ${subcat ? subcat.name : ''}\nUser Description: ${newDesc}`;
      
      const data = await fetchApi('/classifieds/ai-enhance', {
        method: 'POST',
        body: JSON.stringify({ text: payloadText, lang })
      });
      if (!data.error && data.result) {
        let parsedData;
        try {
          parsedData = JSON.parse(data.result.replace(/```json/g, '').replace(/```/g, '').trim());
          setAiEnhancedData(parsedData);
          setShowAiEnhanceModal(true);
        } catch (parseError) {
          console.error("Failed to parse AI response", data.result);
          alert(lang === 'en' ? 'Failed to process AI response.' : 'AI பதிலைச் செயலாக்க முடியவில்லை.');
        }
      }
    } catch (e) {
      console.error("AI Enhancement failed:", e);
    } finally {
      setIsEnhancing(false);
    }
  };

  const autoCategorize = async () => {
    if (!newTitle.trim()) {
      alert(lang === 'en' ? 'Please enter a title first!' : 'தயவுசெய்து முதலில் தலைப்பை உள்ளிடவும்!');
      return;
    }
    
    setIsGeneratingDesc(true);
    try {
      const data = await fetchApi('/classifieds/ai-categorize', {
        method: 'POST',
        body: JSON.stringify({ text: newTitle })
      });
      if (!data.error && data.result) {
        try {
          const parsed = JSON.parse(data.result);
          // Find matching category
          const cat = categories.find(c => c.name.toLowerCase().includes(parsed.categoryName.toLowerCase()) || parsed.categoryName.toLowerCase().includes(c.name.split('/')[0].toLowerCase()));
          if (cat) {
            setNewCatId(cat.id);
            const subcats = cat.subcategories || [];
            setFormSubcategories(subcats);
            
            // Strictly match subcategory within the newly found category's subcategories
            if (subcats.length > 0) {
              const subcat = subcats.find(s => 
                s.name.toLowerCase().includes(parsed.subcategoryName.toLowerCase()) || 
                parsed.subcategoryName.toLowerCase().includes(s.name.split('/')[0].toLowerCase())
              );
              if (subcat) {
                setNewSubcatId(subcat.id);
              } else {
                setNewSubcatId(subcats[0].id);
              }
            } else {
              setNewSubcatId('');
            }
          }
        } catch (e) {
          console.error("Failed to parse AI category output", e);
        }
      }
    } catch (e) {
      console.error("AI Categorize failed:", e);
    } finally {
      setIsGeneratingDesc(false);
    }
  };


  // Removed automatic description generation on title typing to prevent unwanted overriding


  const handleSmartSearch = async () => {
    if (!searchQuery.trim()) return;
    setSmartSearchLoading(true);
    setLoading(true);
    try {
      const data = await fetchApi(`/classifieds/smart-search?page=0&size=50`, {
        method: 'POST',
        body: JSON.stringify({ query: searchQuery })
      });
      if (data.results) {
        setAds(data.results);
        setSmartSearchIntent(data.intent);
      } else {
        setAds(Array.isArray(data) ? data : []);
        setSmartSearchIntent(null);
      }
    } catch (e) {
      console.error("Smart search failed:", e);
    } finally {
      setSmartSearchLoading(false);
      setLoading(false);
    }
  };

  const clearSmartSearch = () => {
    setSearchQuery('');
    setSmartSearchIntent(null);
    loadAds();
  };

  return (
    <main className="container class-module-container" style={{ paddingTop: '20px' }}>
      
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div className="breadcrumbs" style={{ fontSize: '13px', color: '#64748b' }}>
          <Link to="/" style={{ color: '#4f46e5', textDecoration: 'none' }}>{lang === 'en' ? 'Home' : 'முகப்பு'}</Link>
          <i className="fas fa-chevron-right" style={{ fontSize: '9px', margin: '0 8px' }}></i>
          <span>{lang === 'en' ? 'Classifieds' : 'வகைப்படுத்தப்பட்டவை'}</span>
        </div>
      </div>

      {/* SECTION 1: MASTHEAD */}
      <section className="class-masthead">
        <div className="class-masthead-left">
          <span className="badge-tag" style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', width: 'fit-content' }}>
            {lang === 'en' ? 'Classifieds Desk' : 'வகைப்படுத்தப்பட்ட செய்திமையம்'}
          </span>
          <h1>{lang === 'en' ? 'Buy, Sell & Discover' : 'வாங்க, விற்க & சிறந்த சலுகைகளை அறிய'}</h1>
        </div>
        <div className="class-masthead-right">
          <div className="class-live-counter">
             <span className="pulsing-dot"></span>
             {lang === 'en' ? `${ads.length} ads live now` : `${ads.length} விளம்பரங்கள் நேரலையில்`}
          </div>
          <button 
            className="class-post-btn-sidebar" 
            style={{ width: 'auto', padding: '10px 16px' }}
            onClick={() => setShowPostModal(true)}
          >
            <i className="fas fa-bullhorn"></i> {lang === 'en' ? 'Post a Free Ad' : 'இலவச விளம்பரம்'}
          </button>
        </div>
      </section>

      {/* CATEGORIES ROW */}
      <div className="class-categories-row">
        <div 
          className={`class-category-card ${selectedCat === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCat('all')}
        >
          <i className="fas fa-border-all"></i>
          <span>{lang === 'en' ? 'All Categories' : 'அனைத்தும்'}</span>
        </div>

        {categories.map(c => (
          <div 
            className={`class-category-card ${selectedCat === c.slug ? 'active' : ''}`}
            key={c.id} 
            onClick={() => setSelectedCat(c.slug)}
          >
            <i className={`fas ${c.iconClass}`}></i>
            <span>{c.name.split('/')[0]}</span>
          </div>
        ))}
      </div>

      {/* SECTION 2 & 3: MAIN LAYOUT */}
      <div className="class-main-layout">
        
        {/* Mobile overlay for sidebar drawer */}
        <div 
          className={`class-sidebar-overlay ${mobileDrawerOpen ? 'drawer-open' : ''}`}
          onClick={() => setMobileDrawerOpen(false)}
        ></div>

        {/* SECTION 2: STICKY SIDEBAR */}
        <aside className={`class-sidebar ${mobileDrawerOpen ? 'drawer-open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', display: mobileDrawerOpen ? 'flex' : 'none' }}>
            <h3 style={{ margin: 0 }}>{lang === 'en' ? 'Filters' : 'வடிகட்டிகள்'}</h3>
            <button onClick={() => setMobileDrawerOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px' }}>&times;</button>
          </div>

          <button 
            className="class-post-btn-sidebar"
            onClick={() => { setShowPostModal(true); setMobileDrawerOpen(false); }}
          >
            <i className="fas fa-pen"></i> {lang === 'en' ? 'Post a Free Ad' : 'புதிய விளம்பரம் பதிய'}
          </button>

          <div className="class-filter-group">
            <h4 style={{ margin: '0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {lang === 'en' ? 'Search' : 'தேடல்'}
            </h4>
            <div className="class-filter-input-wrap">
              <i className="fas fa-search"></i>
              <input 
                type="text" 
                placeholder={lang === 'en' ? 'What are you looking for?' : 'நீங்கள் என்ன தேடுகிறீர்கள்?'} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter') handleSmartSearch(); }}
              />
            </div>
            
            <button 
              onClick={handleSmartSearch}
              disabled={smartSearchLoading}
              style={{ width: '100%', marginTop: '8px', padding: '8px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
            >
              <i className={smartSearchLoading ? "fas fa-spinner fa-spin" : "fas fa-magic"}></i> 
              {smartSearchLoading ? (lang === 'en' ? 'Searching...' : 'தேடுகிறது...') : (lang === 'en' ? 'Smart Search' : 'ஸ்மார்ட் தேடல்')}
            </button>
            
            {smartSearchIntent && (
              <div style={{ marginTop: '12px', padding: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '11px', color: '#166534' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>✨ AI Understood:</div>
                {smartSearchIntent.query && <div>• <b>Keyword:</b> {smartSearchIntent.query}</div>}
                {smartSearchIntent.priceMax && <div>• <b>Max Price:</b> ₹{smartSearchIntent.priceMax}</div>}
                {smartSearchIntent.priceMin && <div>• <b>Min Price:</b> ₹{smartSearchIntent.priceMin}</div>}
                {smartSearchIntent.condition && smartSearchIntent.condition !== 'null' && <div>• <b>Condition:</b> {smartSearchIntent.condition}</div>}
                <button onClick={clearSmartSearch} style={{ background: 'transparent', border: 'none', color: '#ef4444', textDecoration: 'underline', marginTop: '6px', cursor: 'pointer', padding: 0 }}>Clear Smart Search</button>
              </div>
            )}

            <div className="class-filter-input-wrap" style={{ marginTop: '16px' }}>
              <i className="fas fa-map-marker-alt"></i>
              <select value={selectedLoc} onChange={(e) => setSelectedLoc(e.target.value)}>
                <option value="all">{lang === 'en' ? 'All Districts' : 'அனைத்து மாவட்டங்கள்'}</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.nameEn} - {d.nameTa}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="class-filter-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: '0', fontSize: '14px' }}>{lang === 'en' ? 'Price Range' : 'விலை வரம்பு'}</h4>
              <span style={{ fontSize: '11px', color: 'var(--primary, #B3732A)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setPriceMax(1000000)}>Reset</span>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="1000000" 
              value={priceMax} 
              onChange={(e) => {
                setPriceMax(parseInt(e.target.value));
                if (selectedSort === 'newest') setSelectedSort('price_asc');
              }}
              style={{ width: '100%', accentColor: 'var(--primary, #B3732A)', marginTop: '6px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>₹0</span>
              <span>Max: ₹{priceMax.toLocaleString()}</span>
            </div>
          </div>

          <div className="class-filter-group">
            <h4 style={{ margin: '0', fontSize: '14px' }}>{lang === 'en' ? 'Condition' : 'நிலை'}</h4>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={conditionNew} onChange={(e) => setConditionNew(e.target.checked)} /> {lang === 'en' ? 'New' : 'புதியது'}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={conditionUsed} onChange={(e) => setConditionUsed(e.target.checked)} /> {lang === 'en' ? 'Used' : 'பயன்படுத்தப்பட்டது'}
            </label>
          </div>
        </aside>

        {/* SECTION 4 & 5: FEED AREA & SORT HEADER */}
        <section className="class-feed-area">
          
          <div className="class-sort-header">
            <div className="class-sort-header-left">
              <h2 style={{margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)'}}>
                {lang === 'en' ? 'CLASSIFIED ADS' : 'விளம்பரங்கள்'}
              </h2>
              <div style={{fontSize: '13px', marginTop: '4px'}}>{lang === 'en' ? `${ads.length} ads available` : `${ads.length} விளம்பரங்கள் உள்ளன`}</div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="mobile-filter-toggle" onClick={() => setMobileDrawerOpen(true)}>
                <i className="fas fa-sliders-h"></i> {lang === 'en' ? 'Filters' : 'வடிகட்டிகள்'}
              </button>
              
              <select 
                value={selectedSort} 
                onChange={(e) => setSelectedSort(e.target.value)}
                className="class-sort-select"
              >
                <option value="newest">{lang === 'en' ? 'Newest First' : 'சமீபத்தியது'}</option>
                <option value="price_asc">{lang === 'en' ? 'Price: Low to High' : 'விலை: குறைவு முதல் அதிகம்'}</option>
                <option value="price_desc">{lang === 'en' ? 'Price: High to Low' : 'விலை: அதிகம் முதல் குறைவு'}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: 'var(--primary, #B3732A)' }}></i>
              <p style={{ marginTop: '10px' }}>{lang === 'en' ? 'Loading classifieds list...' : 'விளம்பரங்கள் ஏற்றப்படுகின்றன...'}</p>
            </div>
          ) : ads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
              <i className="fas fa-search" style={{ fontSize: '32px', color: '#94a3b8', marginBottom: '12px' }}></i>
              <h3 style={{ margin: 0, fontSize: '15px' }}>{lang === 'en' ? 'No confirmed ads found in this selection.' : 'விளம்பரங்கள் எதுவும் கிடைக்கவில்லை.'}</h3>
              <p style={{ fontSize: '12px', color: '#64748b' }}>{lang === 'en' ? 'Try changing filters or post a new ad!' : 'வடிகட்டிகளை மாற்றவும் அல்லது புதிய விளம்பரத்தைப் பதியவும்!'}</p>
            </div>
          ) : (
            <div className="class-ads-grid">
              {ads.map(ad => (
                <div className="class-ad-card" key={ad.id} onClick={() => handleOpenDetails(ad)}>
                  <div className="class-ad-img-wrapper">
                    <img src={getImageUrl(ad.imageUrl)} alt={ad.title} loading="lazy" />
                    {ad.status === 'active' && (
                       <span className="class-ad-badge" style={{ background: 'rgba(16, 185, 129, 0.9)' }}>
                         {lang === 'en' ? 'Verified' : 'உறுதிசெய்யப்பட்டது'}
                       </span>
                    )}
                    <span className="class-ad-heart" style={{ color: wishlist.includes(ad.id) ? '#ef4444' : 'var(--text-muted, #64748b)' }} onClick={(e) => toggleWishlist(ad.id, e)}>
                      <i className={wishlist.includes(ad.id) ? "fas fa-heart" : "far fa-heart"}></i>
                    </span>
                  </div>
                  <div className="class-ad-body">
                    <h3 className="class-ad-price">{ad.priceDetail}</h3>
                    <h4 className="class-ad-title" title={ad.title}>{ad.title}</h4>
                    <div className="class-ad-meta">
                      <i className="fas fa-map-marker-alt"></i> {ad.location.split('/')[0].trim()} • {ad.createdAt || 'Active'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>
      </div>

      {/* SECTION 6: MODALS (UNCHANGED FUNCTIONALLY) */}
      
      {/* CLASSIFIED DETAILS VIEW MODAL */}
      {selectedAd && (
        <div className="modal open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '1000' }}>
          <div className="modal-content" style={{ maxWidth: '900px', width: '90%', padding: '0', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ margin: 0 }}>{selectedAd.title}</h3>
                {selectedAd.conditionId ? (
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{selectedAd.conditionId === 1 ? (lang === 'en' ? 'Brand New' : 'புதியது') : (lang === 'en' ? 'Used' : 'பயன்படுத்தப்பட்டது')}</span>
                ) : (
                  <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{lang === 'en' ? 'Used' : 'பயன்படுத்தப்பட்டது'}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button onClick={(e) => toggleWishlist(selectedAd.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: wishlist.includes(selectedAd.id) ? '#ef4444' : 'var(--text-muted, #94a3b8)', transition: 'color 0.2s', padding: 0 }}>
                  <i className={wishlist.includes(selectedAd.id) ? "fas fa-heart" : "far fa-heart"}></i>
                </button>
                <button className="modal-close" onClick={() => setSelectedAd(null)} style={{ margin: 0, padding: 0, display: 'flex', alignItems: 'center' }}>&times;</button>
              </div>
            </div>

            <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
              {/* Left Side: Image */}
              <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
                <div style={{ height: '100%', minHeight: '350px', borderRadius: '12px', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundColor: '#f8fafc', backgroundImage: `url('${getImageUrl(selectedAd.imageUrl)}')`, border: '1px solid #e2e8f0' }}></div>
              </div>

              {/* Right Side: Details */}
              <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-light, #f8fafc)', padding: '20px', borderRadius: '12px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{lang === 'en' ? 'Price:' : 'விலை:'}</span>
                    <span style={{ color: 'var(--primary, #B3732A)', fontWeight: '800', fontSize: '18px' }}>{selectedAd.priceDetail}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{lang === 'en' ? 'Location:' : 'இடம்:'}</span>
                    <span style={{ fontWeight: '600' }}>{selectedAd.location}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{lang === 'en' ? 'Category:' : 'வகை:'}</span>
                    <span style={{ fontWeight: '600' }}>{selectedAd.categoryName || 'Classifieds'}</span>
                  </div>
                  
                  {/* TAGS */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                    <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', padding: '4px 10px', borderRadius: '16px', fontWeight: '600' }}>#{selectedAd.categoryName ? selectedAd.categoryName.split(' ')[0] : 'Item'}</span>
                    <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', padding: '4px 10px', borderRadius: '16px', fontWeight: '600' }}>#{selectedAd.location ? selectedAd.location.split(' ')[0] : 'Local'}</span>
                  </div>
                  
                  {selectedAd.whatsappNumber && (
                     <div style={{ marginTop: '8px' }}>
                       <a href={`https://wa.me/${selectedAd.whatsappNumber}`} target="_blank" rel="noreferrer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#25D366', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px', textDecoration: 'none', fontWeight: 'bold', transition: 'background 0.2s' }}>
                         <i className="fab fa-whatsapp" style={{ fontSize: '16px' }}></i> {lang === 'en' ? 'Chat on WhatsApp' : 'வாட்ஸ்அப்பில் சாட் செய்யவும்'}
                       </a>
                     </div>
                  )}
                </div>

                {/* SELLER PROFILE BLOCK */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #B3732A 0%, #d97706 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
                    {selectedAd.sellerId ? "U" : "A"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-dark)' }}>{lang === 'en' ? 'Verified Seller' : 'விற்பனையாளர்'}</h4>
                      <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '14px' }}></i>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{lang === 'en' ? 'Member since 2024' : '2024 முதல் உறுப்பினர்'}</p>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-dark)', fontSize: '15px' }}>{lang === 'en' ? 'Product Description' : 'தயாரிப்பு விளக்கம்'}</h4>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted, #475569)', lineHeight: '1.6', background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '120px' }}>
                    {selectedAd.description}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '16px' }}>
                  {phoneRevealed ? (
                    <a 
                      href={`tel:${selectedAd.contactPhone}`}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', background: 'var(--primary, #B3732A)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      <i className="fas fa-phone-alt"></i> {selectedAd.contactPhone}
                    </a>
                  ) : (
                    <button 
                      onClick={() => setPhoneRevealed(true)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--primary, #B3732A)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      <i className="fas fa-eye"></i> {lang === 'en' ? 'Show Phone Number' : 'தொலைபேசி எண்ணைக் காட்டு'}
                    </button>
                  )}
                  <button 
                    onClick={() => { setShareAdObj(selectedAd); setShowShareModal(true); }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--bg-light, #f1f5f9)', color: 'var(--text-dark, #334155)', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    <i className="far fa-share-square"></i> {lang === 'en' ? 'Share Deal' : 'பகிர்'}
                  </button>
                </div>
              </div>

              {/* BOTTOM FULL WIDTH SECTION */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* SAFETY TIPS */}
                <div style={{ background: '#fffbf1', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ background: '#fef3c7', color: '#d97706', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#92400e', fontSize: '14px' }}>{lang === 'en' ? 'Safety Tips for Buyers' : 'பாதுகாப்பு குறிப்புகள்'}</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#b45309', fontSize: '13px', lineHeight: '1.5' }}>
                      <li>{lang === 'en' ? 'Meet in a public place for the transaction.' : 'பரிவர்த்தனைக்கு பொது இடத்தில் சந்திக்கவும்.'}</li>
                      <li>{lang === 'en' ? 'Never pay in advance before receiving the item.' : 'பொருளைப் பெறுவதற்கு முன்பு பணம் செலுத்த வேண்டாம்.'}</li>
                    </ul>
                  </div>
                  <button onClick={() => alert(lang === 'en' ? 'Ad Reported to Admins!' : 'நிர்வாகிகளுக்கு புகாரளிக்கப்பட்டது!')} style={{ background: 'none', border: '1px solid #fca5a5', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <i className="fas fa-flag"></i> {lang === 'en' ? 'Report Ad' : 'புகாரளி'}
                  </button>
                </div>

                {/* SIMILAR ADS */}
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-dark)' }}>{lang === 'en' ? 'Similar Ads' : 'ஒத்த விளம்பரங்கள்'}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                    {ads.filter(a => a.id !== selectedAd.id && a.categoryId === selectedAd.categoryId).slice(0, 4).map(ad => (
                      <div key={ad.id} onClick={() => setSelectedAd(ad)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' }}>
                         <div style={{ height: '120px', backgroundImage: `url('${getImageUrl(ad.imageUrl)}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                         <div style={{ padding: '8px' }}>
                           <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-dark)' }}>{ad.priceDetail}</div>
                           <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.title}</div>
                         </div>
                      </div>
                    ))}
                    {ads.filter(a => a.id !== selectedAd.id && a.categoryId === selectedAd.categoryId).length === 0 && (
                      <div style={{ gridColumn: '1 / -1', padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: '#f8fafc', borderRadius: '8px' }}>
                        {lang === 'en' ? 'No similar ads found.' : 'ஒத்த விளம்பரங்கள் இல்லை.'}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* POST NEW AD FORM MODAL */}
      {showPostModal && (
        <div className="modal open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '1000' }}>
          <div className="modal-content" style={{ maxWidth: '650px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '0', borderRadius: '12px' }}>
            <div className="modal-header" style={{ padding: '16px 24px', borderBottom: 'none', background: 'rgba(0, 73, 144, 1)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{lang === 'en' ? 'Post New Ad' : 'புதிய விளம்பரம் பதியவும்'}</h3>
              <button className="modal-close" onClick={() => setShowPostModal(false)} style={{ color: 'white', background: 'transparent', border: 'none', fontSize: '28px', cursor: 'pointer', lineHeight: '1' }}>&times;</button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <form onSubmit={handleOpenPreview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 'bold' }}>
                    {lang === 'en' ? 'Product Title *' : 'பொருள் தலைப்பு *'}
                  </label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required 
                    placeholder={lang === 'en' ? 'e.g. iPhone 14 Pro Max / Honda City' : 'எ.கா: Splendor பைக் விற்பனைக்கு'}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', color: 'black', marginTop: '4px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'en' ? 'Category *' : 'வகை *'}
                    </label>
                    <select 
                      value={newCatId}
                      onChange={handleCategoryChange}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', color: 'black' }}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'en' ? 'Subcategory' : 'துணை வகை'}
                    </label>
                    <select 
                      value={newSubcatId}
                      onChange={(e) => setNewSubcatId(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', color: 'black' }}
                    >
                      {formSubcategories.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {lang === 'en' ? 'Price (INR) *' : 'விலை (INR) *'}
                      <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                        <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} /> {lang === 'en' ? 'Free' : 'இலவசம்'}
                      </label>
                    </label>
                    <input 
                      type="number" 
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      required={!isFree}
                      disabled={isFree}
                      placeholder={lang === 'en' ? 'e.g. 85000' : 'எ.கா: 85000'}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', color: 'black', background: isFree ? '#f1f5f9' : 'white', marginBottom: '8px' }}
                    />
                    <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={newNegotiable}
                        onChange={(e) => setNewNegotiable(e.target.checked)}
                      />
                      {lang === 'en' ? 'Price is negotiable' : 'விலை பேசித் தீர்மானிக்கலாம்'}
                    </label>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'en' ? 'District / Location *' : 'மாவட்டம் / இடம் *'}
                    </label>
                    <select 
                      value={newDistrictId}
                      onChange={(e) => setNewDistrictId(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', color: 'black' }}
                    >
                      {districts.map(d => (
                        <option key={d.id} value={d.id}>{d.nameEn} - {d.nameTa}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'en' ? 'Contact Phone *' : 'தொடர்பு எண் *'}
                    </label>
                    <input 
                      type="text" 
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      required 
                      placeholder="e.g. 9876543210"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', color: 'black' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'en' ? 'WhatsApp Number' : 'வாட்ஸ்அப் எண்'}
                    </label>
                    <input 
                      type="text" 
                      value={newWhatsapp}
                      onChange={(e) => setNewWhatsapp(e.target.value)}
                      placeholder="e.g. 9876543210"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', color: 'black' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'en' ? 'Product Description *' : 'விளம்பரம் விளக்கம் *'}
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button" 
                        onClick={generateTemplate}
                        disabled={isGeneratingDesc || isEnhancing}
                        style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {isGeneratingDesc ? (lang === 'en' ? 'Generating...' : 'உருவாக்குகிறது...') : (lang === 'en' ? '✨ AI Template' : '✨ AI வார்ப்புரு')}
                      </button>
                      <button 
                        type="button" 
                        onClick={enhanceDescription}
                        disabled={isEnhancing || isGeneratingDesc || !newDesc.trim()}
                        style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: !newDesc.trim() ? 0.5 : 1 }}
                      >
                        {isEnhancing ? (lang === 'en' ? 'Enhancing...' : 'மேம்படுத்துகிறது...') : (lang === 'en' ? '✨ Enhance with AI' : '✨ AI உடன் மேம்படுத்து')}
                      </button>
                    </div>
                  </div>
                  <textarea 
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    required 
                    rows="6"
                    placeholder={lang === 'en' ? 'Provide details about condition, specifications...' : 'பொருளின் நிலை, மாடல் அல்லது நிபந்தனைகள்...'}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', color: 'black' }}
                  ></textarea>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 'bold' }}>
                    {lang === 'en' ? 'Upload Photos' : 'புகைப்படங்களை பதிவேற்றவும்'}
                  </label>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    onChange={handleFileSelection}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px dashed var(--border-color, #cbd5e1)', color: 'black' }}
                  />
                  {imagePreviewUrl && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={imagePreviewUrl} alt="Preview thumbnail" style={{ width: '60px', height: '60px', borderRadius: '6px', objectFit: 'cover' }} />
                      <span style={{ fontSize: '12px', color: '#10b981' }}>Photo attached ready for preview</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button 
                    type="submit"
                    style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-eye"></i> {lang === 'en' ? 'Preview Ad First' : 'விளம்பரத்தை முன்னோட்டம் பார்க்க'}
                  </button>

                  <button 
                    type="button"
                    onClick={handleConfirmSubmit}
                    disabled={uploadingMedia}
                    style={{ flex: 1, background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(234, 88, 12, 0.2)' }}
                  >
                    {uploadingMedia ? 'Posting...' : (lang === 'en' ? 'Submit Direct' : 'நேரடியாக சமர்ப்பிக்க')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AD PREVIEW MODAL BEFORE SUBMISSION */}
      {showPreviewModal && (
        <div className="modal open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '1100' }}>
          <div className="modal-content" style={{ maxWidth: '650px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '0', borderRadius: '16px' }}>
            <div className="modal-header" style={{ padding: '16px 24px', background: 'var(--primary, #B3732A)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>👁️ {lang === 'en' ? 'Ad Preview Mode' : 'விளம்பர முன்னோட்டம்'}</h3>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>{lang === 'en' ? 'This is how your ad will appear to buyers once approved by Admin' : 'நிர்வாகி ஒப்புதல் அளித்த பின் விளம்பரம் இவ்வாறு தோன்றும்'}</div>
              </div>
              <button className="modal-close" onClick={() => setShowPreviewModal(false)} style={{ color: 'white', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>

            <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ height: '240px', borderRadius: '12px', backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: `url(${imagePreviewUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500'})`, position: 'relative' }}>
                <span style={{ position: 'absolute', top: '12px', left: '12px', background: '#f59e0b', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>PENDING ADMIN APPROVAL</span>
              </div>

              <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-dark, #1e293b)' }}>{newTitle}</h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', background: 'var(--bg-light, #f8fafc)', padding: '14px', borderRadius: '12px', fontSize: '13px' }}>
                <div><strong>{lang === 'en' ? 'Price:' : 'விலை:'}</strong> <span style={{ color: 'var(--primary, #B3732A)', fontWeight: 'bold' }}>{isFree ? 'FREE' : `₹${parseFloat(newPrice || '0').toLocaleString()}`}</span> {newNegotiable && <span style={{ fontSize: '11px', color: '#10b981' }}>(Negotiable)</span>}</div>
                <div><strong>{lang === 'en' ? 'Location:' : 'இடம்:'}</strong> {districts.find(d => String(d.id) === String(newDistrictId))?.nameEn || 'Tamil Nadu'}</div>
                <div><strong>{lang === 'en' ? 'Category:' : 'வகை:'}</strong> {categories.find(c => String(c.id) === String(newCatId))?.name || 'Classifieds'}</div>
                <div><strong>{lang === 'en' ? 'Contact Phone:' : 'தொடர்பு எண்:'}</strong> {newPhone}</div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px' }}>{lang === 'en' ? 'Description' : 'விளக்கம்'}</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted, #475569)', lineHeight: '1.5', margin: 0 }}>{newDesc}</p>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '16px' }}>
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  style={{ flex: 1, background: 'var(--border-color, #cbd5e1)', color: 'var(--text-dark, #1e293b)', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '13.5px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ✏️ {lang === 'en' ? 'Edit Details' : 'விவரங்களை திருத்து'}
                </button>
                <button 
                  onClick={handleConfirmSubmit}
                  disabled={uploadingMedia}
                  style={{ flex: 1.5, background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '13.5px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  🚀 {lang === 'en' ? 'Confirm & Submit for Admin Approval' : 'உறுதிசெய்து நிர்வாக ஒப்புதலுக்கு சமர்ப்பிக்கவும்'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && shareAdObj && (
        <div className="modal open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '1100' }}>
          <div className="modal-content" style={{ maxWidth: '400px', width: '90%', padding: '24px' }}>
            <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
              <h3 style={{ margin: 0 }}>{lang === 'en' ? 'Share Deal' : 'பகிர்'}</h3>
              <button className="modal-close" onClick={() => { setShowShareModal(false); setShareAdObj(null); }}>&times;</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '16px 0' }}>
              <button onClick={() => handleShareClick(shareAdObj, 'whatsapp')} style={{ padding: '10px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                <i className="fab fa-whatsapp"></i> WhatsApp
              </button>
              <button onClick={() => handleShareClick(shareAdObj, 'facebook')} style={{ padding: '10px', background: '#1877F2', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                <i className="fab fa-facebook-f"></i> Facebook
              </button>
            </div>
            <button 
              onClick={() => handleShareClick(shareAdObj, 'copy')} 
              style={{ width: '100%', padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              <i className="far fa-copy"></i> {lang === 'en' ? 'Copy Link' : 'நகலெடுக்க'}
            </button>
          </div>
        </div>
      )}


      {showAiEnhanceModal && aiEnhancedData && (
        <div className="modal open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '1100' }}>
          <div className="modal-content" style={{ maxWidth: '700px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '0', borderRadius: '12px' }}>
            <div className="modal-header" style={{ padding: '16px 24px', background: 'linear-gradient(90deg, #10b981, #059669)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>✨ {lang === 'en' ? 'AI Enhanced Description' : 'AI மேம்படுத்தப்பட்ட விளக்கம்'}</h3>
              <button onClick={() => setShowAiEnhanceModal(false)} style={{ color: 'white', background: 'transparent', border: 'none', fontSize: '28px', cursor: 'pointer', lineHeight: '1' }}>&times;</button>
            </div>
            
            <div className="modal-body" style={{ padding: '24px' }}>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{lang === 'en' ? 'Description Quality' : 'விளக்கத்தின் தரம்'}</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: aiEnhancedData.qualityScore >= 80 ? '#10b981' : (aiEnhancedData.qualityScore >= 50 ? '#f59e0b' : '#ef4444') }}>
                    {aiEnhancedData.qualityScore}% {aiEnhancedData.qualityScore >= 80 ? (lang === 'en' ? 'Excellent' : 'சிறப்பானது') : (aiEnhancedData.qualityScore >= 50 ? (lang === 'en' ? 'Good' : 'நன்று') : (lang === 'en' ? 'Needs Improvement' : 'மேம்படுத்த வேண்டும்'))}
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${aiEnhancedData.qualityScore}%`, height: '100%', background: `linear-gradient(90deg, #ef4444, #f59e0b, #10b981)`, borderRadius: '4px', transition: 'width 0.5s ease-out' }}></div>
                </div>
              </div>

              {aiEnhancedData.missingAttributes && aiEnhancedData.missingAttributes.length > 0 && (
                <div style={{ padding: '12px', background: '#fffbeb', borderLeft: '4px solid #f59e0b', borderRadius: '4px', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#b45309' }}>⚠ {lang === 'en' ? 'Complete your listing' : 'பட்டியலை முழுமையாக்குங்கள்'}</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#92400e' }}>
                    {aiEnhancedData.missingAttributes.map((attr, idx) => (
                      <li key={idx}>{attr}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#64748b' }}>{lang === 'en' ? 'Original' : 'அசல்'}</h4>
                  <div style={{ flex: 1, padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', whiteSpace: 'pre-wrap', maxHeight: '280px', overflowY: 'auto' }}>
                    {newDesc}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#10b981' }}>{lang === 'en' ? 'AI Enhanced (Editable)' : 'AI மேம்படுத்தப்பட்டது (திருத்தலாம்)'}</h4>
                  <textarea 
                    value={aiEnhancedData.enhancedDescription}
                    onChange={(e) => setAiEnhancedData({...aiEnhancedData, enhancedDescription: e.target.value})}
                    style={{ flex: 1, height: '280px', padding: '12px', border: '2px solid #10b981', borderRadius: '8px', fontSize: '13px', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShowAiEnhanceModal(false)}
                  style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}
                >
                  {lang === 'en' ? 'Cancel' : 'ரத்து செய்'}
                </button>
                <button 
                  onClick={() => {
                    setNewDesc(aiEnhancedData.enhancedDescription);
                    setShowAiEnhanceModal(false);
                  }}
                  style={{ padding: '10px 20px', border: 'none', background: '#10b981', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {lang === 'en' ? 'Use This Description' : 'இதைப் பயன்படுத்து'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SUCCESS POPUP MODAL */}
      {showSuccessPopup && (
        <div className="modal open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '1200' }}>
          <div className="modal-content" style={{ maxWidth: '400px', width: '90%', padding: '32px', textAlign: 'center', borderRadius: '16px' }}>
            <div style={{ width: '80px', height: '80px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <i className="fas fa-check-circle" style={{ fontSize: '40px', color: '#10b981' }}></i>
            </div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '22px', color: '#1e293b' }}>
              {lang === 'en' ? 'Success!' : 'வெற்றி!'}
            </h2>
            <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', marginBottom: '24px' }}>
              <p style={{ margin: 0, fontSize: '15px', color: '#b45309', fontWeight: '600' }}>
                <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
                {lang === 'en' ? 'Pending Admin Approval' : 'நிர்வாக ஒப்புதலுக்காக காத்திருக்கிறது'}
              </p>
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              {lang === 'en' ? 'Your ad has been successfully submitted and is currently under review by our admin team. It will be live on the platform once approved.' : 'உங்கள் விளம்பரம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது மற்றும் எங்கள் நிர்வாக குழுவால் சரிபார்க்கப்படுகிறது. ஒப்புதல் அளித்தவுடன் அது மேடையில் வெளியிடப்படும்.'}
            </p>
            <button 
              onClick={() => setShowSuccessPopup(false)}
              style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {lang === 'en' ? 'Got it, Thanks!' : 'புரிந்தது, நன்றி!'}
            </button>
          </div>
        </div>
      )}

    </main>
  );
};

export default Classifieds;
