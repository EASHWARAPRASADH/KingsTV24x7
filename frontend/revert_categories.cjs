const fs = require('fs');
let content = fs.readFileSync('src/pages/Classifieds.jsx', 'utf8');

// The categories row code we want to add back
const categoriesRowStr = `
      {/* CATEGORIES ROW */}
      <div className="class-categories-row" style={{ display: 'flex', gap: '15px', overflowX: 'auto', padding: '15px 0', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', scrollbarWidth: 'none' }}>
        <div 
          className={\`class-category-card \${selectedCat === 'all' ? 'active' : ''}\`}
          onClick={() => setSelectedCat('all')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '80px', cursor: 'pointer', opacity: selectedCat === 'all' ? '1' : '0.6', color: selectedCat === 'all' ? '#B3732A' : '#333' }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: selectedCat === 'all' ? '#fdf5eb' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            <i className="fas fa-border-all"></i>
          </div>
          <span style={{ fontSize: '12px', fontWeight: selectedCat === 'all' ? 'bold' : 'normal', textAlign: 'center' }}>{lang === 'en' ? 'All' : 'அனைத்தும்'}</span>
        </div>

        {categories.map(c => (
          <div 
            className={\`class-category-card \${selectedCat === c.slug ? 'active' : ''}\`}
            key={c.id} 
            onClick={() => setSelectedCat(c.slug)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '80px', cursor: 'pointer', opacity: selectedCat === c.slug ? '1' : '0.6', color: selectedCat === c.slug ? '#B3732A' : '#333' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: selectedCat === c.slug ? '#fdf5eb' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              <i className={\`fas \${c.iconClass}\`}></i>
            </div>
            <span style={{ fontSize: '12px', fontWeight: selectedCat === c.slug ? 'bold' : 'normal', textAlign: 'center' }}>{c.name.split('/')[0]}</span>
          </div>
        ))}
      </div>
`;

// Insert the categories row just before {/* SECTION 2 & 3: MAIN LAYOUT */}
content = content.replace('{/* SECTION 2 & 3: MAIN LAYOUT */}', categoriesRowStr + '\n      {/* SECTION 2 & 3: MAIN LAYOUT */}');

// Remove the categories from the sidebar
// This is the block:
// {/* CATEGORIES */}
// <div style={{ marginBottom: '20px' }}>
// ...
// </div>
// <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '0 0 20px 0' }} />

const catRegex = /\{\/\* CATEGORIES \*\/\}\s*<div style=\{\{ marginBottom: '20px' \}\}>\s*<h4(.|\n)*?<\/div>\s*<\/div>\s*<hr style=\{\{ border: '0', borderTop: '1px solid #e2e8f0', margin: '0 0 20px 0' \}\} \/>/;
content = content.replace(catRegex, '');

fs.writeFileSync('src/pages/Classifieds.jsx', content);
