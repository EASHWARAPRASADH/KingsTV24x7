const fs = require('fs');
let content = fs.readFileSync('src/pages/Classifieds.jsx', 'utf8');

const oldDistrictsBlock = `export const DEFAULT_DISTRICTS = [
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
  { id: 19, nameEn: 'Viluppuram', nameTa: 'விழுப்புரம்' },
  { id: 20, nameEn: 'Tiruvannamalai', nameTa: 'திருவண்ணாமலை' },
  { id: 21, nameEn: 'Krishnagiri', nameTa: 'கிருஷ்ணகிரி' },
  { id: 22, nameEn: 'Karur', nameTa: 'கரூர்' },
  { id: 23, nameEn: 'Namakkal', nameTa: 'நாமக்கல்' },
  { id: 24, nameEn: 'Pudukkottai', nameTa: 'புதுக்கோட்டை' },
  { id: 25, nameEn: 'Virudhunagar', nameTa: 'விருதுநகர்' },
  { id: 26, nameEn: 'Ramanathapuram', nameTa: 'ராமநாதபுரம்' },
  { id: 27, nameEn: 'Sivaganga', nameTa: 'சிவகங்கை' },
  { id: 28, nameEn: 'Nilgiris', nameTa: 'நீலகிரி' },
  { id: 29, nameEn: 'Theni', nameTa: 'தேனி' },
  { id: 30, nameEn: 'Perambalur', nameTa: 'பெரம்பலூர்' },
  { id: 31, nameEn: 'Ariyalur', nameTa: 'அரியலூர்' },
  { id: 32, nameEn: 'Tiruvarur', nameTa: 'திருவாரூர்' },
  { id: 33, nameEn: 'Tenkasi', nameTa: 'தென்காசி' },
  { id: 34, nameEn: 'Kallakurichi', nameTa: 'கள்ளக்குறிச்சி' },
  { id: 35, nameEn: 'Tirupattur', nameTa: 'திருப்பத்தூர்' },
  { id: 36, nameEn: 'Ranipet', nameTa: 'ராணிப்பேட்டை' },
  { id: 37, nameEn: 'Chengalpattu', nameTa: 'செங்கல்பட்டு' },
  { id: 38, nameEn: 'Mayiladuthurai', nameTa: 'மயிலாடுதுறை' }
];`;

// But wait, the file has exactly 38 districts.
// I will just use a regex to replace the whole DEFAULT_DISTRICTS block.
const regex = /export const DEFAULT_DISTRICTS = \[\s*(\{.*\},\s*)*(\{.*\})\s*\];/m;

const newDistrictsBlock = `export const DEFAULT_DISTRICTS = [
  // Tamil Nadu (State 1)
  { id: 1, stateId: 1, nameEn: 'Chennai', nameTa: 'சென்னை' },
  { id: 2, stateId: 1, nameEn: 'Coimbatore', nameTa: 'கோயம்புத்தூர்' },
  { id: 3, stateId: 1, nameEn: 'Madurai', nameTa: 'மதுரை' },
  { id: 4, stateId: 1, nameEn: 'Salem', nameTa: 'சேலம்' },
  { id: 5, stateId: 1, nameEn: 'Tiruchirappalli', nameTa: 'திருச்சி' },
  { id: 6, stateId: 1, nameEn: 'Tirunelveli', nameTa: 'திருநெல்வேலி' },
  { id: 7, stateId: 1, nameEn: 'Vellore', nameTa: 'வேலூர்' },
  { id: 8, stateId: 1, nameEn: 'Erode', nameTa: 'ஈரோடு' },
  { id: 9, stateId: 1, nameEn: 'Thanjavur', nameTa: 'தஞ்சாவூர்' },
  { id: 10, stateId: 1, nameEn: 'Kanyakumari', nameTa: 'கன்னியாகுமரி' },
  { id: 11, stateId: 1, nameEn: 'Dindigul', nameTa: 'திண்டுக்கல்' },
  { id: 12, stateId: 1, nameEn: 'Tiruppur', nameTa: 'திருப்பூர்' },
  { id: 13, stateId: 1, nameEn: 'Kanchipuram', nameTa: 'காஞ்சிபுரம்' },
  { id: 14, stateId: 1, nameEn: 'Tiruvallur', nameTa: 'திருவள்ளூர்' },
  { id: 15, stateId: 1, nameEn: 'Cuddalore', nameTa: 'கடலூர்' },
  { id: 16, stateId: 1, nameEn: 'Dharmapuri', nameTa: 'தர்மபுரி' },
  { id: 17, stateId: 1, nameEn: 'Thoothukudi', nameTa: 'தூத்துக்குடி' },
  { id: 18, stateId: 1, nameEn: 'Nagapattinam', nameTa: 'நாகப்பட்டினம்' },
  { id: 19, stateId: 1, nameEn: 'Viluppuram', nameTa: 'விழுப்புரம்' },
  { id: 20, stateId: 1, nameEn: 'Tiruvannamalai', nameTa: 'திருவண்ணாமலை' },
  { id: 21, stateId: 1, nameEn: 'Krishnagiri', nameTa: 'கிருஷ்ணகிரி' },
  { id: 22, stateId: 1, nameEn: 'Karur', nameTa: 'கரூர்' },
  { id: 23, stateId: 1, nameEn: 'Namakkal', nameTa: 'நாமக்கல்' },
  { id: 24, stateId: 1, nameEn: 'Pudukkottai', nameTa: 'புதுக்கோட்டை' },
  { id: 25, stateId: 1, nameEn: 'Virudhunagar', nameTa: 'விருதுநகர்' },
  { id: 26, stateId: 1, nameEn: 'Ramanathapuram', nameTa: 'ராமநாதபுரம்' },
  { id: 27, stateId: 1, nameEn: 'Sivaganga', nameTa: 'சிவகங்கை' },
  { id: 28, stateId: 1, nameEn: 'Nilgiris', nameTa: 'நீலகிரி' },
  { id: 29, stateId: 1, nameEn: 'Theni', nameTa: 'தேனி' },
  { id: 30, stateId: 1, nameEn: 'Perambalur', nameTa: 'பெரம்பலூர்' },
  { id: 31, stateId: 1, nameEn: 'Ariyalur', nameTa: 'அரியலூர்' },
  { id: 32, stateId: 1, nameEn: 'Tiruvarur', nameTa: 'திருவாரூர்' },
  { id: 33, stateId: 1, nameEn: 'Tenkasi', nameTa: 'தென்காசி' },
  { id: 34, stateId: 1, nameEn: 'Kallakurichi', nameTa: 'கள்ளக்குறிச்சி' },
  { id: 35, stateId: 1, nameEn: 'Tirupattur', nameTa: 'திருப்பத்தூர்' },
  { id: 36, stateId: 1, nameEn: 'Ranipet', nameTa: 'ராணிப்பேட்டை' },
  { id: 37, stateId: 1, nameEn: 'Chengalpattu', nameTa: 'செங்கல்பட்டு' },
  { id: 38, stateId: 1, nameEn: 'Mayiladuthurai', nameTa: 'மயிலாடுதுறை' },
  
  // Pondicherry (State 2)
  { id: 39, stateId: 2, nameEn: 'Pondicherry', nameTa: 'புதுச்சேரி' },
  { id: 40, stateId: 2, nameEn: 'Karaikal', nameTa: 'காரைக்கால்' },
  { id: 41, stateId: 2, nameEn: 'Mahe', nameTa: 'மாஹே' },
  { id: 42, stateId: 2, nameEn: 'Yanam', nameTa: 'யானாம்' },
  
  // Kerala (State 3)
  { id: 43, stateId: 3, nameEn: 'Thiruvananthapuram', nameTa: 'Thiruvananthapuram' },
  { id: 44, stateId: 3, nameEn: 'Kochi', nameTa: 'Kochi' },
  { id: 45, stateId: 3, nameEn: 'Kozhikode', nameTa: 'Kozhikode' },
  { id: 46, stateId: 3, nameEn: 'Thrissur', nameTa: 'Thrissur' },
  
  // Karnataka (State 4)
  { id: 47, stateId: 4, nameEn: 'Bengaluru', nameTa: 'Bengaluru' },
  { id: 48, stateId: 4, nameEn: 'Mysuru', nameTa: 'Mysuru' },
  { id: 49, stateId: 4, nameEn: 'Mangaluru', nameTa: 'Mangaluru' },
  { id: 50, stateId: 4, nameEn: 'Hubli', nameTa: 'Hubli' },
  
  // Andhra Pradesh (State 5)
  { id: 51, stateId: 5, nameEn: 'Visakhapatnam', nameTa: 'Visakhapatnam' },
  { id: 52, stateId: 5, nameEn: 'Vijayawada', nameTa: 'Vijayawada' },
  { id: 53, stateId: 5, nameEn: 'Guntur', nameTa: 'Guntur' },
  { id: 54, stateId: 5, nameEn: 'Tirupati', nameTa: 'Tirupati' }
];`;

content = content.replace(regex, newDistrictsBlock);

// Now update the sidebar district map logic:
// Search for:
// {districts.map(d => (
//   <option key={d.id} value={d.id}>{d.nameEn}</option>
// ))}
const sidebarDistrictsRegex = /\{districts\.map\(d => \(\s*<option key=\{d\.id\} value=\{d\.id\}>\{d\.nameEn\}<\/option>\s*\)\)\}/m;

const newSidebarDistricts = `{districts.filter(d => filterStateId === 'all' || String(d.stateId) === String(filterStateId)).map(d => (
                      <option key={d.id} value={d.id}>{d.nameEn}</option>
                    ))}`;

content = content.replace(sidebarDistrictsRegex, newSidebarDistricts);

// Also we must update the Post Modal district rendering
const modalDistrictsRegex = /\{districts\.map\(d => \(\s*<option key=\{d\.id\} value=\{d\.id\}>\{d\.nameEn\} \- \{d\.nameTa\}<\/option>\s*\)\)\}/m;

const newModalDistricts = `{districts.filter(d => newStateId === 'all' || String(d.stateId) === String(newStateId)).map(d => (
                        <option key={d.id} value={d.id}>{d.nameEn} - {d.nameTa}</option>
                      ))}`;

content = content.replace(modalDistrictsRegex, newModalDistricts);

fs.writeFileSync('src/pages/Classifieds.jsx', content);
