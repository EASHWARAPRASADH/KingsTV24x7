import React, { useEffect, useState, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../api';
import {
  Plus, Search, Filter, Edit3, Eye, Trash2, CheckCircle,
  XCircle, RefreshCw, ChevronLeft, ChevronRight, Radio,
  FileText, Clock, Archive
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'published', label: '✅ Published' },
  { value: 'draft', label: '📝 Draft' },
  { value: 'pending', label: '⏳ Pending Review' },
  { value: 'rejected', label: '❌ Rejected' },
  { value: 'archived', label: '📦 Archived' },
];

const STATUS_BADGE = {
  published: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', label: 'Published' },
  draft: { bg: 'rgba(156,163,175,0.2)', color: '#9CA3AF', label: 'Draft' },
  pending: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: 'Pending' },
  rejected: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444', label: 'Rejected' },
  archived: { bg: 'rgba(107,114,128,0.15)', color: '#6B7280', label: 'Archived' },
  deleted: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', label: 'Deleted' },
};

const NewsManagement = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [actionMsg, setActionMsg] = useState(null);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data || [])).catch(() => {});
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        size: 12,
        sortBy: 'id',
        direction: 'desc',
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('categoryId', categoryFilter);
      if (startDateFilter) params.set('startDateStr', startDateFilter);
      if (endDateFilter) params.set('endDateStr', endDateFilter);

      const res = await api.get(`/articles/getAll?${params}`);
      const data = res.data;
      setArticles(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    const t = setTimeout(fetchArticles, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchArticles]);

  const showMsg = (msg, isError = false) => {
    setActionMsg({ msg, isError });
    setTimeout(() => setActionMsg(null), 3000);
  };

  const changeStatus = async (id, status) => {
    try {
      await api.patch('/articles/changeStatus', { id, status });
      showMsg(`Article ${status} successfully.`);
      fetchArticles();
    } catch (err) {
      showMsg('Failed to update status.', true);
    }
  };

  const deleteArticle = async (id) => {
    if (!confirm('Soft-delete this article?')) return;
    try {
      await api.delete(`/articles/${id}`);
      showMsg('Article deleted.');
      fetchArticles();
    } catch (err) {
      showMsg('Failed to delete article.', true);
    }
  };

  const toggleSelect = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const selectAll = () => {
    if (selected.size === articles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(articles.map(a => a.id)));
    }
  };

  const bulkAction = async (status) => {
    if (selected.size === 0) return;
    try {
      await Promise.all([...selected].map(id => api.patch('/articles/changeStatus', { id, status })));
      showMsg(`${selected.size} articles updated to ${status}.`);
      setSelected(new Set());
      fetchArticles();
    } catch {
      showMsg('Bulk action failed.', true);
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selected.size} selected articles?`)) return;
    try {
      await Promise.all([...selected].map(id => api.delete(`/articles/${id}`)));
      showMsg(`${selected.size} articles deleted successfully.`);
      setSelected(new Set());
      fetchArticles();
    } catch {
      showMsg('Bulk delete failed.', true);
    }
  };

  const purgeDemoArticles = async () => {
    if (!window.confirm("Are you sure you want to purge all initial demo template articles from the database? Your manually created articles will NOT be deleted.")) return;
    try {
      const res = await api.delete('/articles/purge-demo-articles');
      showMsg(res.data?.message || 'Demo articles purged successfully.');
      fetchArticles();
    } catch {
      showMsg('Failed to purge demo articles.', true);
    }
  };

  const badge = (status) => {
    const s = STATUS_BADGE[status] || STATUS_BADGE.draft;
    return (
      <span style={{
        background: s.bg, color: s.color,
        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600
      }}>{s.label}</span>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>📰 News Management</h1>
          <p className="text-secondary">{totalElements.toLocaleString()} total articles</p>
        </div>
        <NavLink to="/admin/news/create" className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Plus size={16} /> Create Article
        </NavLink>
      </div>

      {/* Action Message */}
      {actionMsg && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 'var(--radius-sm)',
          background: actionMsg.isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
          color: actionMsg.isError ? '#EF4444' : '#10B981',
          border: `1px solid ${actionMsg.isError ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          fontSize: '0.875rem', fontWeight: 600
        }}>{actionMsg.msg}</div>
      )}

      {/* Filters & Bulk Actions */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-control"
            style={{ paddingLeft: '36px' }}
            placeholder="Search articles by title, slug or author…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select className="form-control" style={{ minWidth: '140px' }}
            value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nameTa ? `${c.nameTa} / ${c.name}` : c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select className="form-control" style={{ minWidth: '130px' }}
            value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="date" className="form-control" style={{ maxWidth: '130px' }} title="Start Date"
            value={startDateFilter} onChange={e => { setStartDateFilter(e.target.value); setPage(0); }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
          <input type="date" className="form-control" style={{ maxWidth: '130px' }} title="End Date"
            value={endDateFilter} onChange={e => { setEndDateFilter(e.target.value); setPage(0); }} />
        </div>
        
        {(search || categoryFilter || statusFilter || startDateFilter || endDateFilter) && (
          <button 
            onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); setStartDateFilter(''); setEndDateFilter(''); setPage(0); }}
            className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            Clear Filters
          </button>
        )}

        <button onClick={fetchArticles} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={14} /> Refresh
        </button>

        <button onClick={purgeDemoArticles} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F59E0B', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)' }} title="Clean up sample seed articles">
          <Trash2 size={14} /> Purge Demo Data
        </button>

        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{selected.size} selected:</span>
            <button onClick={() => bulkAction('published')} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
              Publish All
            </button>
            <button onClick={() => bulkAction('draft')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
              Move to Draft
            </button>
            <button onClick={() => bulkAction('archived')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', color: '#6B7280' }}>
              Archive All
            </button>
            <button onClick={bulkDelete} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Trash2 size={14} /> Delete Selected ({selected.size})
            </button>
          </div>
        )}
      </div>

      {/* Articles Data Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
            Loading news articles…
          </div>
        ) : articles.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
            No articles found matching filters. <NavLink to="/admin/news/create" style={{ color: 'var(--primary)' }}>Create one →</NavLink>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem', width: '36px' }}>
                  <input type="checkbox" checked={selected.size === articles.length && articles.length > 0}
                    onChange={selectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ARTICLE TITLE</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, width: '110px' }}>CATEGORY</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, width: '90px' }}>LANG</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, width: '100px' }}>STATUS</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, width: '110px' }}>AUTHOR</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, width: '65px' }}>SEO</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, width: '65px' }}>VIEWS</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, width: '110px' }}>DATE</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, width: '180px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(art => {
                const hasTa = Boolean(art.titleTa || art.contentTa);
                const hasEn = Boolean(art.titleEn || art.contentEn);
                const categoryObj = categories.find(c => String(c.id) === String(art.categoryId || art.category?.id));
                const seoScore = art.seoScore ?? 75;
                const seoColor = seoScore >= 80 ? '#10B981' : (seoScore >= 50 ? '#F59E0B' : '#EF4444');

                return (
                  <tr key={art.id} style={{
                    borderBottom: '1px solid var(--border)',
                    background: selected.has(art.id) ? 'var(--primary-glow)' : 'transparent',
                    transition: 'background 0.15s'
                  }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <input type="checkbox" checked={selected.has(art.id)}
                        onChange={() => toggleSelect(art.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                        {art.titleTa || art.titleEn || '(Untitled Article)'}
                      </div>
                      {art.titleEn && art.titleTa && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                          {art.titleEn}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem' }}>
                      <span style={{ 
                        background: categoryObj?.color ? `${categoryObj.color}20` : 'rgba(59,130,246,0.15)',
                        color: categoryObj?.color || '#3B82F6',
                        padding: '3px 8px', borderRadius: '10px', fontWeight: 600, fontSize: '0.75rem'
                      }}>
                        {categoryObj ? (categoryObj.nameTa || categoryObj.name) : 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {hasTa && hasEn ? (
                        <span style={{ fontSize: '0.72rem', background: '#EEF2FF', color: '#4F46E5', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>🌐 Dual</span>
                      ) : hasTa ? (
                        <span style={{ fontSize: '0.72rem', background: '#FEF2F2', color: '#DC2626', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>🔴 தமிழ்</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', background: '#EFF6FF', color: '#2563EB', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>🔵 Eng</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{badge(art.status)}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {art.authorName || 'Kings TV Desk'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 700, color: seoColor }}>{seoScore}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {(art.viewsCount ?? 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {art.publishedAt ? new Date(art.publishedAt).toLocaleDateString() : (art.createdAt ? new Date(art.createdAt).toLocaleDateString() : '—')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button title="Edit Article" onClick={() => navigate(`/admin/news/${art.id}/edit`)}
                          style={{ background: 'var(--primary-glow)', border: 'none', color: 'var(--primary)', padding: '5px 7px', borderRadius: '6px', cursor: 'pointer' }}>
                          <Edit3 size={13} />
                        </button>
                        
                        {/* View Live Article on Reader App */}
                        <a 
                          href={`${window.location.origin}/article/${art.slug || art.id}`}
                          target="_blank" 
                          rel="noreferrer"
                          title="View Live Reader Page"
                          style={{ background: 'rgba(59,130,246,0.1)', border: 'none', color: '#2563EB', padding: '5px 7px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Eye size={13} />
                        </a>

                        {art.status !== 'published' && (
                          <button title="Publish Article" onClick={() => changeStatus(art.id, 'published')}
                            style={{ background: 'rgba(16,185,129,0.1)', border: 'none', color: '#10B981', padding: '5px 7px', borderRadius: '6px', cursor: 'pointer' }}>
                            <CheckCircle size={13} />
                          </button>
                        )}
                        {art.status === 'published' && (
                          <button title="Move to Draft" onClick={() => changeStatus(art.id, 'draft')}
                            style={{ background: 'rgba(245,158,11,0.1)', border: 'none', color: '#F59E0B', padding: '5px 7px', borderRadius: '6px', cursor: 'pointer' }}>
                            <Clock size={13} />
                          </button>
                        )}
                        <button title="Archive" onClick={() => changeStatus(art.id, 'archived')}
                          style={{ background: 'rgba(107,114,128,0.1)', border: 'none', color: '#6B7280', padding: '5px 7px', borderRadius: '6px', cursor: 'pointer' }}>
                          <Archive size={13} />
                        </button>
                        <button title="Delete" onClick={() => deleteArticle(art.id)}
                          style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', padding: '5px 7px', borderRadius: '6px', cursor: 'pointer' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1rem 1.5rem', borderTop: '1px solid var(--border)'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Page {page + 1} of {totalPages} ({totalElements.toLocaleString()} articles)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem' }}
                disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = page < 4 ? i : page - 3 + i;
                if (p >= totalPages) return null;
                return (
                  <button key={p} className={`btn ${p === page ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.4rem 0.65rem', minWidth: '32px' }}
                    onClick={() => setPage(p)}>{p + 1}</button>
                );
              })}
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem' }}
                disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsManagement;
