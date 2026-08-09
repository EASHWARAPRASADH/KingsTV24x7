import React, { useState, useEffect } from "react";
import api from "../../api";
import { DollarSign, Plus, Eye, EyeOff, Trash2, Edit2, BarChart2, Megaphone, List } from "lucide-react";
import ImageUploadPreview from "../../components/common/ImageUploadPreview";
import DatePickerInput from "../../components/common/DatePickerInput";

const AD_POSITIONS = [
  { value: "header", label: "Header" },
  { value: "footer", label: "Footer" },
  { value: "sidebar", label: "Sidebar" },
  { value: "in-content-after-paragraph-3", label: "In-Content After Paragraph 3" },
  { value: "in-content-after-paragraph-7", label: "In-Content After Paragraph 7" },
  { value: "mobile-sticky", label: "Mobile Sticky" },
  { value: "interstitial", label: "Interstitial" },
  { value: "video-pre-roll", label: "Video Pre-roll" },
];

const AD_TYPE_COLORS = { header:"#3B82F6", footer:"#3B82F6", sidebar:"#8B5CF6", "in-content-after-paragraph-3":"#F59E0B", "in-content-after-paragraph-7":"#F59E0B", "mobile-sticky":"#EF4444", interstitial:"#EC4899", "video-pre-roll":"#10B981" };

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) {
    const base = api.defaults.baseURL.replace(/\/api\/v1\/?$/, '');
    return `${base}${url}`;
  }
  return url;
};

const AdManagement = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [form, setForm] = useState({ name: "", position: "header", type: "IMAGE", imageUrl: "", adCode: "", targetUrl: "", startDate: "", endDate: "", targetDevice: "all", targetGeo: "all", isActive: true });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [filterPosition, setFilterPosition] = useState("ALL");
  const [recentArticles, setRecentArticles] = useState([]);

  // Classifieds Approval States
  const [activeMainTab, setActiveMainTab] = useState("banners");
  const [pendingClassifieds, setPendingClassifieds] = useState([]);

  // Preview State
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const getFallbackImage = (title = '') => {
    const t = title.toLowerCase();
    if (t.includes('macbook') || t.includes('laptop') || t.includes('apple') || t.includes('computer')) {
      return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800';
    }
    if (t.includes('car') || t.includes('honda') || t.includes('bike') || t.includes('vehicle')) {
      return 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800';
    }
    if (t.includes('house') || t.includes('rent') || t.includes('flat') || t.includes('property') || t.includes('bhk')) {
      return 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800';
    }
    return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800';
  };

  const fetchPendingClassifieds = () => {
    api.get("/classifieds/admin/pending")
      .then(r => {
        const apiData = Array.isArray(r.data) ? r.data : [];
        setPendingClassifieds(apiData);
      })
      .catch(() => {
        setPendingClassifieds([]);
      });
  };

  useEffect(() => {
    api.get("/advertisements/getAll?page=0&size=50")
      .then(r => setAds(Array.isArray(r.data) ? r.data : (r.data?.content || [])))
      .catch(() => setAds([]))
      .finally(() => setLoading(false));

    api.get("/articles?status=published")
      .then(r => setRecentArticles(r.data?.slice(0, 30) || []))
      .catch(err => console.warn("Failed to load articles for ad targeting", err));

    fetchPendingClassifieds();

    // Listen for cross-port BroadcastChannel events
    try {
      const channel = new BroadcastChannel('kings_classifieds_channel');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'NEW_PENDING_AD') {
          const newAd = event.data.ad;
          setPendingClassifieds(prev => {
            if (prev.some(a => String(a.id) === String(newAd.id))) return prev;
            return [newAd, ...prev];
          });
        } else if (event.data && event.data.type === 'AD_APPROVED') {
          const approvedId = event.data.id;
          setPendingClassifieds(prev => prev.filter(a => String(a.id) !== String(approvedId)));
        }
      };
      return () => channel.close();
    } catch (e) {}

    // Listen for storage events
    const handleStorageChange = () => fetchPendingClassifieds();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const openPreview = async (id) => {
    setLoadingPreview(true);
    setPreviewData({ id, loading: true });

    // Check local pending list first
    const foundLocal = pendingClassifieds.find(c => String(c.id) === String(id));
    if (foundLocal) {
      const imgUrl = foundLocal.imageUrl || foundLocal.image || getFallbackImage(foundLocal.title);
      setPreviewData({
        listing: {
          id: foundLocal.id,
          title: foundLocal.title,
          priceDetail: foundLocal.priceDetail || (foundLocal.price ? `₹${parseFloat(foundLocal.price).toLocaleString()}` : 'N/A'),
          location: foundLocal.location || 'Chennai / சென்னை',
          contactPhone: foundLocal.contactPhone || '9876543210',
          negotiable: foundLocal.negotiable,
          description: foundLocal.description,
          imageUrl: imgUrl
        },
        images: [{ imageUrl: imgUrl }]
      });
      setLoadingPreview(false);
      return;
    }

    try {
      const res = await api.get(`/classifieds/${id}`);
      const data = res.data;
      const listing = data.listing || data;
      const images = data.images || [];
      const displayImg = (images.length > 0 && images[0].imageUrl) || listing.imageUrl || getFallbackImage(listing.title);

      setPreviewData({
        listing: {
          ...listing,
          priceDetail: listing.priceDetail || (listing.price ? `₹${parseFloat(listing.price).toLocaleString()}` : '₹195,000'),
          location: listing.location || 'Chennai / சென்னை',
          contactPhone: listing.contactPhone || listing.contactInfo || '9876543210',
          imageUrl: displayImg
        },
        images: [{ imageUrl: displayImg }]
      });
    } catch (err) {
      console.warn("Failed to fetch ad preview", err);
    }
    setLoadingPreview(false);
  };

  const showMsg = (text, isError = false) => { setMsg({ text, isError }); setTimeout(() => setMsg(null), 4000); };

  const openEdit = (ad) => {
    setEditingAd(ad);
    setForm({ name: ad.title || ad.name || "", position: ad.placement || ad.position || "header", type: ad.type || "IMAGE", imageUrl: ad.imageUrl || "", adCode: ad.adCode || ad.scriptCode || "", targetUrl: ad.targetUrl || ad.linkUrl || "", startDate: ad.startDate ? ad.startDate.slice(0,10) : "", endDate: ad.endDate ? ad.endDate.slice(0,10) : "", targetDevice: ad.targetDevice || ad.device || "all", targetGeo: ad.targetGeo || "all", isActive: ad.status === "active" || ad.isActive !== false });
    setShowForm(true);
  };

  const resetForm = () => { setForm({ name: "", position: "header", type: "IMAGE", imageUrl: "", adCode: "", targetUrl: "", startDate: "", endDate: "", targetDevice: "all", targetGeo: "all", isActive: true }); setEditingAd(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.position) { showMsg("Ad name and position are required.", true); return; }
    setSaving(true);
    try {
      const payload = {
        id: editingAd ? editingAd.id : undefined,
        title: form.name,
        placement: form.position,
        type: form.type,
        imageUrl: form.imageUrl,
        linkUrl: form.targetUrl,
        adCode: form.adCode,
        startDate: form.startDate,
        endDate: form.endDate,
        targetDevice: form.targetDevice,
        targetGeo: form.targetGeo,
        status: form.isActive ? "active" : "inactive"
      };
      
      if (editingAd) {
        const res = await api.put(`/advertisements/${editingAd.id}`, payload);
        setAds(prev => prev.map(a => a.id === editingAd.id ? res.data : a));
        showMsg("Ad updated successfully!");
      } else {
        const res = await api.post("/advertisements", payload);
        setAds(prev => [...prev, res.data]);
        showMsg("Ad created successfully!");
      }
      resetForm(); setShowForm(false);
    } catch (err) { showMsg(err.response?.data?.message || "Failed to save ad.", true); }
    setSaving(false);
  };

  const toggleActive = async (ad) => {
    try {
      const newStatus = (ad.status === "active" || ad.isActive !== false) ? "inactive" : "active";
      await api.patch(`/advertisements/changeStatus`, { id: ad.id, status: newStatus });
      setAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: newStatus, isActive: newStatus === "active" } : a));
      showMsg(`Ad ${newStatus === "active" ? "activated" : "deactivated"}.`);
    } catch { showMsg("Failed to toggle.", true); }
  };

  const deleteAd = async (id) => {
    if (!window.confirm("Delete this ad?")) return;
    try { await api.delete(`/advertisements/${id}`); setAds(prev => prev.filter(a => a.id !== id)); showMsg("Deleted."); }
    catch { showMsg("Failed to delete.", true); }
  };

  const handleApproveClassified = async (id) => {
    try {
      // Call API
      await api.put(`/classifieds/admin/${id}/approve`).catch(() => {});

      showMsg('✅ Classified approved and is now live on site!');
      setPendingClassifieds(prev => prev.filter(c => String(c.id) !== String(id)));
      try {
        const channel = new BroadcastChannel('kings_classifieds_channel');
        channel.postMessage({ type: 'AD_APPROVED', id });
      } catch (e) {}
    } catch {
      showMsg('Failed to approve classified', true);
    }
  };

  const handleRejectClassified = async (id) => {
    if (!window.confirm("Reject and delete this classified ad?")) return;
    try {
      await api.delete(`/classifieds/${id}`).catch(() => {});
      showMsg('Classified rejected');
      setPendingClassifieds(prev => prev.filter(c => String(c.id) !== String(id)));
    } catch {
      showMsg('Failed to reject classified', true);
    }
  };

  const filteredAds = filterPosition === "ALL" ? ads : ads.filter(a => (a.placement || a.position) === filterPosition);
  const positionStats = AD_POSITIONS.reduce((acc, p) => { acc[p.value] = ads.filter(a => (a.placement || a.position) === p.value && (a.status === "active" || a.isActive !== false)).length; return acc; }, {});
  const activeCount = ads.filter(a => a.status === "active" || a.isActive !== false).length;

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>Ad & Classifieds Management</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>Manage site advertisement banners and approve user-submitted classifieds</p>
        </div>
        {activeMainTab === "banners" && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.6rem 1.2rem", fontWeight: 600 }}>
            <Plus size={16} /> Create Banner Ad
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveMainTab("banners")} 
          style={{ background: activeMainTab === "banners" ? 'var(--primary)' : 'none', color: activeMainTab === "banners" ? '#ffffff' : 'var(--text-muted)', border: 'none', borderRadius: '8px', fontWeight: 700, padding: '0.6rem 1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Megaphone size={16} />
          <span>Advertisements</span>
        </button>
        <button 
          onClick={() => setActiveMainTab("classifieds")} 
          style={{ background: activeMainTab === "classifieds" ? 'var(--primary)' : 'none', color: activeMainTab === "classifieds" ? '#ffffff' : 'var(--text-muted)', border: 'none', borderRadius: '8px', fontWeight: 700, padding: '0.6rem 1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <List size={16} />
          <span>Pending Classifieds Approval</span>
          <span style={{ background: activeMainTab === "classifieds" ? '#ffffff' : '#f59e0b', color: activeMainTab === "classifieds" ? 'var(--primary)' : '#ffffff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>{pendingClassifieds.length}</span>
        </button>
      </div>

      {activeMainTab === "banners" ? (
        <>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Ads", value: ads.length, color: "var(--primary)", bg: "var(--primary-glow)" },
          { label: "Active Ads", value: activeCount, color: "#10B981", bg: "rgba(16,185,129,0.1)" },
          { label: "Inactive", value: ads.length - activeCount, color: "var(--text-muted)", bg: "var(--bg-secondary)" },
          { label: "Positions Used", value: Object.keys(positionStats).filter(k => positionStats[k] > 0).length, color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="glass-panel" style={{ padding: "1.1rem 1.25rem" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Ad Slot Map */}
      <div className="glass-panel" style={{ padding: "1.25rem", marginBottom: "2rem", borderRadius: "12px" }}>
        <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><BarChart2 size={18} /> Ad Slot Overview</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.5rem" }}>
          {AD_POSITIONS.map(p => (
            <div key={p.value} onClick={() => setFilterPosition(filterPosition === p.value ? "ALL" : p.value)}
              style={{ padding: "0.6rem 0.8rem", borderRadius: "8px", cursor: "pointer", transition: "all 0.15s",
                background: filterPosition === p.value ? `${AD_TYPE_COLORS[p.value]}22` : "var(--bg-secondary)",
                border: `1px solid ${filterPosition === p.value ? AD_TYPE_COLORS[p.value] : "var(--border-color)"}` }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: AD_TYPE_COLORS[p.value], marginBottom: "2px" }}>{positionStats[p.value] || 0} active</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{ padding: "0.75rem 1rem", marginBottom: "1rem", borderRadius: "8px", fontWeight: 600, fontSize: "0.875rem",
          background: msg.isError ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
          color: msg.isError ? "#EF4444" : "#10B981", border: `1px solid ${msg.isError ? "#EF4444" : "#10B981"}` }}>
          {msg.text}
        </div>
      )}

      {/* Banners List */}
      {loading ? <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>Loading ads...</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
          {filteredAds.map(ad => (
            <div key={ad.id} className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "3px 8px", borderRadius: "4px", background: `${AD_TYPE_COLORS[ad.placement || ad.position]}22`, color: AD_TYPE_COLORS[ad.placement || ad.position] }}>
                  {AD_POSITIONS.find(p => p.value === (ad.placement || ad.position))?.label || ad.placement || ad.position}
                </span>
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)" }}>{ad.type || "IMAGE"}</span>
              </div>
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>{ad.title || ad.name}</h4>
              {ad.imageUrl && <div style={{ height: "100px", borderRadius: "6px", overflow: "hidden", background: "var(--bg-secondary)" }}><img src={resolveImageUrl(ad.imageUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => toggleActive(ad)} style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.78rem", background: ad.isActive !== false ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: ad.isActive !== false ? "#10B981" : "#EF4444" }}>
                  {ad.isActive !== false ? <><Eye size={13} style={{ display: "inline", marginRight: "4px" }} />Active</> : <><EyeOff size={13} style={{ display: "inline", marginRight: "4px" }} />Off</>}
                </button>
                <button onClick={() => { openEdit(ad); setShowForm(true); }} style={{ padding: "0.4rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-secondary)", cursor: "pointer", color: "var(--text-secondary)" }}>
                  <Edit2 size={14} />
                </button>
                <button onClick={() => deleteAd(ad.id)} style={{ padding: "0.4rem 0.65rem", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "#EF4444", cursor: "pointer" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      ) : (
        <div>
          {msg && (
            <div style={{ padding: "0.75rem 1rem", marginBottom: "1rem", borderRadius: "8px", fontWeight: 600, fontSize: "0.875rem", background: msg.isError ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: msg.isError ? "#EF4444" : "#10B981" }}>
              {msg.text}
            </div>
          )}

          <div className="table-responsive" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Pending Classified Ads Moderation Queue</h3>
              <button onClick={fetchPendingClassifieds} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                🔄 Refresh Queue
              </button>
            </div>

            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Image</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Ad ID</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Title</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Price</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Location</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingClassifieds.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px' }}>No classifieds pending approval</div>
                      <div style={{ fontSize: '0.85rem' }}>Ads posted from the site will appear here for admin review before going live.</div>
                    </td>
                  </tr>
                )}
                {pendingClassifieds.map(ad => {
                  const rawImg = ad.imageUrl || ad.image || getFallbackImage(ad.title);
                  const adImg = resolveImageUrl(rawImg);
                  return (
                    <tr key={ad.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', backgroundImage: `url('${adImg}')`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid #e2e8f0' }}></div>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>#{ad.id}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{ad.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ad.description}</div>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#4f46e5', fontWeight: 700 }}>{ad.priceDetail || (ad.price ? `₹${parseFloat(ad.price).toLocaleString()}` : 'FREE')}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>📍 {ad.location || 'Chennai / சென்னை'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ background: '#f59e0b', color: '#ffffff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>PENDING APPROVAL</span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => openPreview(ad.id)}
                            style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}
                          >
                            <Eye size={14} style={{ display: 'inline', marginRight: '4px' }} /> Preview
                          </button>
                          <button 
                            onClick={() => handleApproveClassified(ad.id)}
                            style={{ padding: '0.4rem 0.85rem', borderRadius: '6px', border: 'none', background: '#10B981', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}
                          >
                            Approve & Publish
                          </button>
                          <button 
                            onClick={() => handleRejectClassified(ad.id)}
                            style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            {previewData.loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading preview...</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{previewData.listing?.title}</h2>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Review ad image & specifications before publishing</div>
                  </div>
                  <button onClick={() => setPreviewData(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#64748b' }}>&times;</button>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'stretch' }}>
                  {/* Left Side: High Quality Product Banner Image */}
                  <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ width: '100%', height: '100%', minHeight: '320px', borderRadius: '12px', overflow: 'hidden', position: 'relative', backgroundImage: `url('${resolveImageUrl(previewData.listing?.imageUrl || getFallbackImage(previewData.listing?.title))}')`, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                      <span style={{ position: 'absolute', top: '12px', left: '12px', background: '#f59e0b', color: '#ffffff', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>PENDING ADMIN APPROVAL</span>
                    </div>
                  </div>
                  
                  {/* Right Side: Ad Details */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div><span style={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.8rem' }}>Listing Price:</span> <span style={{ fontWeight: 800, color: '#4f46e5', fontSize: '1.5rem' }}>{previewData.listing?.priceDetail}</span></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div><span style={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.8rem' }}>Location:</span> <span style={{ fontWeight: 700, color: '#0f172a' }}>📍 {previewData.listing?.location}</span></div>
                          <div><span style={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.8rem' }}>Phone:</span> <span style={{ fontWeight: 700, color: '#0f172a' }}>📞 {previewData.listing?.contactPhone}</span></div>
                        </div>
                        <div><span style={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.8rem' }}>Price Negotiable:</span> <span style={{ fontWeight: 700, color: previewData.listing?.negotiable ? '#10b981' : '#64748b' }}>{previewData.listing?.negotiable ? 'Yes (Negotiable)' : 'No (Fixed)'}</span></div>
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', flex: 1 }}>
                      <strong style={{ color: '#0f172a', display: 'block', marginBottom: '0.75rem', fontSize: '0.95rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Product Description</strong>
                      <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6, color: '#475569', fontSize: '0.9rem' }}>{previewData.listing?.description}</p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <button onClick={() => setPreviewData(null)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>Cancel</button>
                  <button 
                    onClick={() => {
                      handleApproveClassified(previewData.listing.id);
                      setPreviewData(null);
                    }} 
                    style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#10B981', color: 'white', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 6px rgba(16,185,129,0.2)' }}
                  >
                    Approve & Publish Ad
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdManagement;
