const fs = require('fs');

let content = fs.readFileSync('src/pages/Classifieds.jsx', 'utf8');

// 1. Remove Quick Filters and Categories Row
content = content.replace(/\{\/\* QUICK FILTERS CHIPS \*\/\}(.|\n)*?\{\/\* SECTION 2 & 3: MAIN LAYOUT \*\/\}/m, '{/* SECTION 2 & 3: MAIN LAYOUT */}');

// 2. We need to parse and replace the sidebar contents manually to avoid issues.
// Let's replace the whole sidebar.

const sidebarStartStr = '<aside className={`class-sidebar ${mobileDrawerOpen ? \'drawer-open\' : \'\'}`}>';
const sidebarEndStr = '</aside>';
const sidebarStartIndex = content.indexOf(sidebarStartStr);
// Find the end of aside
let currentIndex = sidebarStartIndex;
let depth = 0;
while(currentIndex < content.length) {
    if(content.substring(currentIndex, currentIndex+7) === '<aside ') depth++;
    if(content.substring(currentIndex, currentIndex+6) === '<aside>') depth++;
    if(content.substring(currentIndex, currentIndex+8) === '</aside>') {
        depth--;
        if(depth === 0) {
            break;
        }
    }
    currentIndex++;
}
const sidebarEndIndex = currentIndex + 8;

const newSidebar = `
        <aside className={\`class-sidebar \${mobileDrawerOpen ? 'drawer-open' : ''}\`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', display: mobileDrawerOpen ? 'flex' : 'none' }}>
            <h3 style={{ margin: 0 }}>{lang === 'en' ? 'Filters' : 'வடிகட்டிகள்'}</h3>
            <button onClick={() => setMobileDrawerOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px' }}>&times;</button>
          </div>

          <div style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <button 
              className="class-post-btn-sidebar"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--primary, #B3732A)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
              onClick={() => { setShowPostModal(true); setMobileDrawerOpen(false); }}
            >
              <i className="fas fa-plus-circle" style={{ marginRight: '8px' }}></i> {lang === 'en' ? 'POST A FREE AD' : 'புதிய விளம்பரம் பதிய'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: '0', fontSize: '12px', fontWeight: 'bold', color: '#333', letterSpacing: '0.5px' }}>FILTERS</h4>
            <span style={{ fontSize: '11px', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => {
              setSearchQuery(''); setPriceMin(0); setPriceMax(1000000); setCondition(''); setPostedWithinDays(''); setSellerType(''); setNegotiableFilter(false); setPriceDropFilter(false); setFilterBrand(''); setFilterStateId('all'); setSelectedLoc('all'); setFilterDynamicAttributes({}); setHasWarranty(false);
            }}>Reset All</span>
          </div>

          {/* SEARCH */}
          <div className="class-filter-input-wrap" style={{ marginBottom: '20px', background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-search" style={{ color: '#64748b' }}></i>
            <input 
              type="text" 
              placeholder={lang === 'en' ? 'Search items...' : 'தேடுக...'} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter') handleSmartSearch(); }}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px' }}
            />
          </div>

          {/* CATEGORIES */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 'bold', color: '#333', letterSpacing: '0.5px' }}>CATEGORIES</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div 
                style={{ fontSize: '13px', cursor: 'pointer', color: selectedCat === 'all' ? '#111' : '#64748b', fontWeight: selectedCat === 'all' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => setSelectedCat('all')}
              >
                <i className="fas fa-border-all" style={{ width: '16px', textAlign: 'center' }}></i> <span>All Categories</span>
              </div>
              {categories.map(c => (
                <div 
                  key={c.id}
                  style={{ fontSize: '13px', cursor: 'pointer', color: selectedCat === c.slug ? '#111' : '#64748b', fontWeight: selectedCat === c.slug ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px' }}
                  onClick={() => setSelectedCat(c.slug)}
                >
                  <i className={\`fas \${c.iconClass}\`} style={{ width: '16px', textAlign: 'center' }}></i> <span>{c.name.split('/')[0]}</span>
                </div>
              ))}
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '0 0 20px 0' }} />

          {/* LOCATIONS */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 'bold', color: '#333', letterSpacing: '0.5px' }}>LOCATIONS</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#111' }}>
                <i className="fas fa-flag" style={{ color: '#64748b', width: '16px' }}></i> India
              </div>
              <div style={{ paddingLeft: '26px' }}>
                <select value={filterStateId} onChange={(e) => { setFilterStateId(e.target.value); setSelectedLoc('all'); }} style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', outline: 'none' }}>
                  <option value="all">All States</option>
                  {DEFAULT_STATES.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              {filterStateId !== 'all' && (
                <div style={{ paddingLeft: '36px' }}>
                  <select value={selectedLoc} onChange={(e) => setSelectedLoc(e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', outline: 'none' }}>
                    <option value="all">All Districts</option>
                    {districts.map(d => (
                      <option key={d.id} value={d.id}>{d.nameEn}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '0 0 20px 0' }} />

          {/* DYNAMIC CATEGORY-SPECIFIC FILTERS (BRAND, MODEL, YEAR, ETC) */}
          {selectedCat !== 'all' && CATEGORY_ATTRIBUTES_SCHEMA[selectedCat] && (
            <div style={{ marginBottom: '20px' }}>
              {CATEGORY_ATTRIBUTES_SCHEMA[selectedCat].map((field, idx) => (
                <div key={idx} style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 'bold', color: '#333', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{field.name}</h4>
                  {field.type === 'select' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                      {field.options.map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#333' }}>
                          <input 
                            type="checkbox" 
                            checked={filterDynamicAttributes[field.name] === opt} 
                            onChange={(e) => {
                              const val = e.target.checked ? opt : '';
                              setFilterDynamicAttributes(prev => {
                                const next = {...prev};
                                if (val) next[field.name] = val; else delete next[field.name];
                                return next;
                              });
                            }} 
                            style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                          /> {opt}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input 
                      type={field.type} 
                      placeholder={\`Enter \${field.name}\`}
                      value={filterDynamicAttributes[field.name] || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setFilterDynamicAttributes(prev => {
                          const next = {...prev};
                          if (val) next[field.name] = val; else delete next[field.name];
                          return next;
                        });
                      }}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', outline: 'none' }}
                    />
                  )}
                </div>
              ))}
              <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '0 0 20px 0' }} />
            </div>
          )}

          {/* BUDGET */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 'bold', color: '#333', letterSpacing: '0.5px' }}>BUDGET</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
               {[
                 { label: 'Below ₹10,000', max: 10000 },
                 { label: '₹10,000 - ₹50,000', max: 50000 },
                 { label: '₹50,000 - ₹2,00,000', max: 200000 },
                 { label: '₹2,00,000 and Above', max: 5000000 }
               ].map(range => (
                 <label key={range.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#333' }}>
                    <input 
                      type="radio" 
                      name="budget_quick"
                      checked={priceMax === range.max}
                      onChange={() => setPriceMax(range.max)}
                      style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                    /> {range.label}
                 </label>
               ))}
            </div>

            <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 8px 0' }}>Choose a range below</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="number" placeholder="Min" value={priceMin} onChange={e => setPriceMin(parseInt(e.target.value) || 0)} style={{ width: '50%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', outline: 'none' }} />
              <span style={{ color: '#64748b' }}>to</span>
              <input type="number" placeholder="Max" value={priceMax} onChange={e => setPriceMax(parseInt(e.target.value) || 0)} style={{ width: '50%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', outline: 'none' }} />
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '0 0 20px 0' }} />

          {/* CONDITION */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 'bold', color: '#333', letterSpacing: '0.5px' }}>CONDITION</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['New', 'Like New', 'Used', 'Refurbished', 'Good', 'Fair'].map(cond => (
                <label key={cond} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#333' }}>
                  <input type="checkbox" checked={condition === cond} onChange={(e) => setCondition(e.target.checked ? cond : '')} style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }} /> {cond}
                </label>
              ))}
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '0 0 20px 0' }} />

          {/* SELLER TYPE */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 'bold', color: '#333', letterSpacing: '0.5px' }}>SELLER TYPE</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#333' }}>
                <input type="checkbox" checked={sellerType === 'INDIVIDUAL'} onChange={(e) => setSellerType(e.target.checked ? 'INDIVIDUAL' : '')} style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }} /> Individual
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#333' }}>
                <input type="checkbox" checked={sellerType === 'DEALER'} onChange={(e) => setSellerType(e.target.checked ? 'DEALER' : '')} style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }} /> Business / Dealer
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#333' }}>
                <input type="checkbox" checked={sellerType === 'VERIFIED'} onChange={(e) => setSellerType(e.target.checked ? 'VERIFIED' : '')} style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }} /> Verified Sellers Only
              </label>
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '0 0 20px 0' }} />

          {/* POSTED DATE */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 'bold', color: '#333', letterSpacing: '0.5px' }}>POSTED WITHIN</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { val: '1', label: 'Today' },
                { val: '3', label: 'Last 3 days' },
                { val: '7', label: 'Last 7 days' },
                { val: '30', label: 'Last 30 days' },
                { val: '', label: 'Any time' }
              ].map(opt => (
                <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#333' }}>
                  <input type="radio" name="posted_time" checked={postedWithinDays === opt.val} onChange={() => setPostedWithinDays(opt.val)} style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }} /> {opt.label}
                </label>
              ))}
            </div>
          </div>
        </aside>`;

content = content.substring(0, sidebarStartIndex) + newSidebar + content.substring(sidebarEndIndex);
fs.writeFileSync('src/pages/Classifieds.jsx', content);
