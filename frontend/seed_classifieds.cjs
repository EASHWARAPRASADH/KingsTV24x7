const http = require('http');

const districts = [
  { id: 1, stateId: 1, nameEn: 'Chennai', nameTa: 'சென்னை' },
  { id: 2, stateId: 1, nameEn: 'Coimbatore', nameTa: 'கோயம்புத்தூர்' },
  { id: 3, stateId: 1, nameEn: 'Madurai', nameTa: 'மதுரை' },
  { id: 47, stateId: 4, nameEn: 'Bengaluru', nameTa: 'Bengaluru' },
  { id: 48, stateId: 4, nameEn: 'Mysuru', nameTa: 'Mysuru' },
  { id: 39, stateId: 2, nameEn: 'Pondicherry', nameTa: 'புதுச்சேரி' },
  { id: 43, stateId: 3, nameEn: 'Thiruvananthapuram', nameTa: 'Thiruvananthapuram' }
];

const categories = [
  { slug: 'property', name: 'Property / ரியல் எஸ்டேட்', id: 2 },
  { slug: 'vehicle', name: 'Vehicles / வாகனங்கள்', id: 1 },
  { slug: 'electronics', name: 'Electronics / எலெக்ட்ரானிக்ஸ்', id: 4 }
];

const dummyAds = [
  // Properties
  { cat: 'property', title: '3 BHK Villa in Premium Gated Community', price: 15000000, desc: 'East facing 3 BHK villa with garden. 24/7 security, club house.', attrs: { 'BHK': '3 BHK', 'Furnishing': 'Semi-Furnished', 'Facing': 'East' } },
  { cat: 'property', title: '2 BHK Apartment Near Metro', price: 6000000, desc: 'Brand new 2 BHK apartment. 5 mins walk from metro station.', attrs: { 'BHK': '2 BHK', 'Furnishing': 'Unfurnished', 'Facing': 'North' } },
  { cat: 'property', title: 'Fully Furnished 4 BHK Penthouse', price: 25000000, desc: 'Luxury penthouse with private terrace and premium interiors.', attrs: { 'BHK': '4+ BHK', 'Furnishing': 'Furnished', 'Facing': 'West' } },
  
  // Vehicles
  { cat: 'vehicle', title: 'Hyundai Creta SX 2021 Petrol', price: 1350000, desc: 'Single owner, excellent condition. Full service history available.', attrs: { 'Year': '2021', 'KM Driven': '35000', 'Fuel Type': 'Petrol' } },
  { cat: 'vehicle', title: 'Maruti Suzuki Swift VXI', price: 550000, desc: 'Well maintained family car. New tyres and battery.', attrs: { 'Year': '2019', 'KM Driven': '55000', 'Fuel Type': 'Petrol' } },
  { cat: 'vehicle', title: 'Toyota Innova Crysta 2.4 Z', price: 2100000, desc: 'Dealer maintained, pristine condition. Insurance valid till next year.', attrs: { 'Year': '2020', 'KM Driven': '68000', 'Fuel Type': 'Diesel' } },
  
  // Electronics
  { cat: 'electronics', title: 'Samsung 65 inch 4K Smart TV', price: 55000, desc: 'Like new condition, rarely used. Comes with wall mount.', attrs: { 'Brand': 'Samsung', 'Screen Size (inch)': '65', 'Type': 'Smart TV' } },
  { cat: 'electronics', title: 'LG Double Door Refrigerator 450L', price: 28000, desc: '3 years old, working perfectly. Moving out sale.', attrs: { 'Brand': 'LG', 'Type': 'Refrigerator (Double Door)' } },
  { cat: 'electronics', title: 'Daikin 1.5 Ton Split AC', price: 32000, desc: 'Energy efficient AC, 5 star rating. 6 months old.', attrs: { 'Brand': 'Daikin', 'Type': 'AC (Split)' } }
];

async function postAd(ad) {
  const district = districts[Math.floor(Math.random() * districts.length)];
  const category = categories.find(c => c.slug === ad.cat);
  
  const payload = {
    title: ad.title,
    description: ad.desc,
    price: ad.price,
    categoryId: category.id,
    districtId: district.id,
    stateId: district.stateId,
    stateName: district.stateId === 1 ? 'Tamil Nadu' : district.stateId === 2 ? 'Pondicherry' : district.stateId === 3 ? 'Kerala' : 'Karnataka',
    contactPhone: '9876543210',
    status: 'active',
    dynamicAttributes: ad.attrs
  };

  return new Promise((resolve, reject) => {
    const req = http.request('http://localhost:8080/api/classifieds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(data);
        } else {
          reject(`Status ${res.statusCode}: ${data}`);
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function run() {
  for (let ad of dummyAds) {
    try {
      await postAd(ad);
      console.log(`Posted: ${ad.title}`);
    } catch (e) {
      console.error(`Failed to post: ${ad.title}`, e);
    }
  }
}

run();
