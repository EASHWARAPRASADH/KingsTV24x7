import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, X, Loader2, Image as ImageIcon, Film, FileText, Music, Check, FolderOpen,
  FolderPlus, UploadCloud, Plus, ArrowLeft, Trash2, Folder, HardDrive, Edit3
} from 'lucide-react';
import api from '../../api';

const getFileCategory = (fileType = '', fileName = '') => {
  const type = fileType || '';
  const name = fileName || '';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg','jpeg','png','gif','webp','bmp','svg'].includes(ext)) return 'image';
  if (['mp4','mov','avi','mkv','webm','3gp','mpeg'].includes(ext)) return 'video';
  if (['mp3','wav','ogg','m4a','aac','flac'].includes(ext)) return 'audio';
  if (['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv'].includes(ext)) return 'document';
  return 'other';
};

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getServerBase = () =>
  (api.defaults.baseURL || 'http://localhost:8085/api/v1')
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '');

const getPreviewUrl = (url) => {
  if (!url) return '';
  let finalUrl = url;
  if (typeof finalUrl === 'string' && finalUrl.includes('kings-tv.onrender.com')) {
    const path = finalUrl.replace(/^https?:\/\/kings-tv\.onrender\.com/, '');
    const cleanPath = path.startsWith('/api/v1') ? path.substring(7) : path;
    const serverBase = (api.defaults.baseURL || 'http://localhost:8085/api/v1')
      .replace(/\/api\/v1\/?$/, '')
      .replace(/\/api\/?$/, '');
    finalUrl = serverBase + (cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath);
  }
  if (finalUrl.startsWith('http') || finalUrl.startsWith('data:')) return finalUrl;
  return getServerBase() + (finalUrl.startsWith('/') ? finalUrl : '/' + finalUrl);
};

const DEFAULT_FOLDERS = ['General', 'Breaking News', 'Elections', 'Sports', 'Interviews'];

const MediaSelectModal = ({ isOpen, onClose, onSelect }) => {
  const [allMedia, setAllMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [filterCategory, setFilterCategory] = useState('all'); // 'all', 'image', 'video', 'audio', 'document', 'folder'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());

  // ── Folder Management States ────────────────────────────────────────────────
  const [folders, setFolders] = useState(() => {
    try {
      const saved = localStorage.getItem('media_folders_v1');
      return saved ? JSON.parse(saved) : DEFAULT_FOLDERS;
    } catch (e) {
      return DEFAULT_FOLDERS;
    }
  });

  const [folderMap, setFolderMap] = useState(() => {
    try {
      const saved = localStorage.getItem('media_folder_map_v1');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [activeFolderName, setActiveFolderName] = useState(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const [showAddExistingModal, setShowAddExistingModal] = useState(false);
  const [existingSelectSet, setExistingSelectSet] = useState(new Set());
  const [folderSubCategory, setFolderSubCategory] = useState('all');
  const [uploadingToFolder, setUploadingToFolder] = useState(false);

  const [showBatchFolderModal, setShowBatchFolderModal] = useState(false);
  const [batchTargetFolder, setBatchTargetFolder] = useState('');
  const [existingModalCatFilter, setExistingModalCatFilter] = useState('all');
  const [existingModalSearch, setExistingModalSearch] = useState('');

  const [renamingItem, setRenamingItem] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  const folderFileInputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('media_folders_v1', JSON.stringify(folders));
    } catch (e) {}
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem('media_folder_map_v1', JSON.stringify(folderMap));
    } catch (e) {}
  }, [folderMap]);

  const loadMedia = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/media/list');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      setAllMedia(list.map(m => {
        const itemCategory = m.category || getFileCategory(m.fileType, m.name || m.filename);
        const folderName = m.folderName || folderMap[m.id || m.url] || null;
        return {
          id: m.id || m.url,
          name: m.name || m.filename || 'Unnamed File',
          url: m.url,
          category: itemCategory,
          size: m.size || m.fileSize,
          uploadedAt: m.uploadedAt || m.createdAt,
          folderName: folderName
        };
      }));
    } catch (err) {
      console.error('Failed to load media list', err);
      setError('Could not fetch media files from the server.');
    } finally {
      setLoading(false);
    }
  }, [isOpen, folderMap]);

  useEffect(() => {
    loadMedia();
    if (!isOpen) {
      setSelectedItems(new Set());
      setSearchQuery('');
      setFilterCategory('all');
      setActiveFolderName(null);
    }
  }, [isOpen, loadMedia]);

  if (!isOpen) return null;

  const toggleSelect = (item) => {
    const next = new Set(selectedItems);
    if (next.has(item.id)) {
      next.delete(item.id);
    } else {
      next.add(item.id);
    }
    setSelectedItems(next);
  };

  const handleInsert = () => {
    const selectedList = allMedia.filter(m => selectedItems.has(m.id));
    if (selectedList.length > 0) {
      onSelect(selectedList);
    }
    onClose();
  };

  // ── Folder Handlers ────────────────────────────────────────────────────────
  const handleCreateFolder = (e) => {
    e.preventDefault();
    const name = newFolderNameInput.trim();
    if (!name) return;
    if (!folders.includes(name)) {
      setFolders(prev => [...prev, name]);
    }
    setNewFolderNameInput('');
    setShowCreateFolderModal(false);
    setActiveFolderName(name);
  };

  const handleDeleteFolder = (folderName, e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the folder "${folderName}"? Files inside will be unassigned.`)) {
      setFolders(prev => prev.filter(f => f !== folderName));
      setAllMedia(prev => prev.map(m => m.folderName === folderName ? { ...m, folderName: null } : m));
      if (activeFolderName === folderName) setActiveFolderName(null);
    }
  };

  const handleFolderFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !activeFolderName) return;

    setUploadingToFolder(true);
    try {
      const uploadedAssets = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderName', activeFolderName);

        try {
          const res = await api.post('/media/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (res.data) {
            const m = res.data;
            const itemCat = m.category || getFileCategory(m.fileType || file.type, m.filename || file.name);
            const newAsset = {
              id: m.id || m.url || URL.createObjectURL(file),
              name: m.filename || m.name || file.name,
              url: m.url || URL.createObjectURL(file),
              category: itemCat,
              size: m.fileSize || file.size,
              uploadedAt: m.uploadedAt || new Date().toISOString(),
              folderName: activeFolderName
            };
            uploadedAssets.push(newAsset);
            setFolderMap(prev => ({ ...prev, [newAsset.id]: activeFolderName }));
          }
        } catch (err) {
          console.warn('Folder file upload error:', err);
        }
      }

      if (uploadedAssets.length > 0) {
        setAllMedia(prev => [...uploadedAssets, ...prev]);
      }
    } finally {
      setUploadingToFolder(false);
      if (folderFileInputRef.current) folderFileInputRef.current.value = '';
    }
  };

  const handleBatchMoveToFolder = async (targetFolder) => {
    if (!targetFolder || selectedItems.size === 0) return;
    const idsToAssign = Array.from(selectedItems);

    setAllMedia(prev => prev.map(m => idsToAssign.includes(m.id) ? { ...m, folderName: targetFolder } : m));
    setFolderMap(prev => {
      const next = { ...prev };
      idsToAssign.forEach(id => { next[id] = targetFolder; });
      return next;
    });

    for (const id of idsToAssign) {
      if (typeof id === 'number') {
        api.put(`/media/${id}`, { folderName: targetFolder }).catch(() => {});
      }
    }
    setShowBatchFolderModal(false);
  };

  const handleRenameSave = async (e) => {
    e.preventDefault();
    if (!renamingItem || !renameInput.trim()) return;
    const newName = renameInput.trim();
    const itemId = renamingItem.id;

    setAllMedia(prev => prev.map(m => m.id === itemId ? { ...m, name: newName } : m));

    if (typeof itemId === 'number') {
      try {
        await api.put(`/media/${itemId}`, { name: newName });
      } catch (err) {
        console.warn('Failed to save filename on backend:', err);
      }
    }

    setRenamingItem(null);
    setRenameInput('');
  };

  const handleDeleteSingleFile = async (item, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${item.name}" from the media library?`)) return;

    const itemId = item.id;
    setAllMedia(prev => prev.filter(m => m.id !== itemId));
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });

    if (typeof itemId === 'number') {
      try {
        await api.delete(`/media/${itemId}`);
      } catch (err) {
        console.warn('Failed to delete media file on server:', err);
      }
    }
  };

  const handleBatchDeleteFiles = async () => {
    if (selectedItems.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedItems.size} selected file(s) from the library?`)) return;

    const idsToDelete = Array.from(selectedItems);

    setAllMedia(prev => prev.filter(m => !idsToDelete.includes(m.id)));
    setSelectedItems(new Set());

    for (const id of idsToDelete) {
      if (typeof id === 'number') {
        api.delete(`/media/${id}`).catch(() => {});
      }
    }
  };

  const handleAddExistingToFolder = async () => {
    if (!activeFolderName || existingSelectSet.size === 0) return;

    const idsToAssign = Array.from(existingSelectSet);
    
    // Update local state
    setAllMedia(prev => prev.map(m => {
      if (idsToAssign.includes(m.id)) {
        return { ...m, folderName: activeFolderName };
      }
      return m;
    }));

    // Update folder map
    setFolderMap(prev => {
      const next = { ...prev };
      idsToAssign.forEach(id => {
        next[id] = activeFolderName;
      });
      return next;
    });

    // Attempt to persist on backend
    for (const id of idsToAssign) {
      if (typeof id === 'number') {
        api.put(`/media/${id}`, { folderName: activeFolderName }).catch(() => {});
      }
    }

    setExistingSelectSet(new Set());
    setShowAddExistingModal(false);
  };

  const handleRemoveFromFolder = (itemId, e) => {
    e.stopPropagation();
    setAllMedia(prev => prev.map(m => m.id === itemId ? { ...m, folderName: null } : m));
    setFolderMap(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    if (typeof itemId === 'number') {
      api.put(`/media/${itemId}`, { folderName: '' }).catch(() => {});
    }
  };

  // ── Filtering Logic ─────────────────────────────────────────────────────────
  const filteredMedia = allMedia.filter(item => {
    if (filterCategory === 'folder') {
      if (!activeFolderName) return false;
      const inThisFolder = item.folderName === activeFolderName;
      const matchesCategory = folderSubCategory === 'all' || item.category === folderSubCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return inThisFolder && matchesCategory && matchesSearch;
    }
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: 'var(--bg-surface, #ffffff)',
        color: 'var(--text-primary, #0f172a)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '900px',
        height: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)',
        border: '1px solid var(--border-color, #cbd5e1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid var(--border-color, #cbd5e1)',
          background: 'var(--bg-secondary, #f8fafc)'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpen size={22} color="#2563EB" /> Select Media from Library
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #64748b)',
            padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Category Tabs Row */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '14px 24px',
          borderBottom: '1px solid var(--border-color, #cbd5e1)',
          alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-surface, #ffffff)'
        }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['all', 'image', 'video', 'audio', 'document', 'folder'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setFilterCategory(cat);
                  if (cat !== 'folder') setActiveFolderName(null);
                }}
                style={{
                  padding: '7px 14px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: filterCategory === cat ? '#2563EB' : 'var(--bg-secondary, #f8fafc)',
                  color: filterCategory === cat ? '#ffffff' : 'var(--text-primary, #0f172a)',
                  boxShadow: filterCategory === cat ? '0 2px 4px rgba(37,99,235,0.2)' : 'none'
                }}
              >
                {cat === 'folder' && <Folder size={15} color={filterCategory === 'folder' ? '#fff' : '#2563EB'} />}
                {cat}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: '240px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '7px 12px 7px 30px', borderRadius: '6px',
                border: '1px solid var(--border-color, #cbd5e1)', fontSize: '13px',
                background: 'var(--bg-secondary, #f8fafc)', color: 'var(--text-primary, #0f172a)'
              }}
            />
          </div>
        </div>

        {/* Main Content View */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--bg-surface, #ffffff)' }}>
          
          {/* ── FOLDER VIEW MODE ─────────────────────────────────────────────── */}
          {filterCategory === 'folder' ? (
            <div>
              {!activeFolderName ? (
                /* Root Folder List View */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>📁 Media Folders</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Organize images, videos, audio, and documents into custom folders.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreateFolderModal(true)}
                      style={{
                        padding: '8px 14px', background: '#2563EB', color: '#fff', border: 'none',
                        borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <FolderPlus size={16} /> Create Folder
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {folders.map(folderName => {
                      const count = allMedia.filter(m => m.folderName === folderName).length;
                      return (
                        <div
                          key={folderName}
                          onClick={() => setActiveFolderName(folderName)}
                          style={{
                            border: '1px solid var(--border-color, #cbd5e1)',
                            borderRadius: '8px', padding: '16px', cursor: 'pointer',
                            background: 'var(--bg-secondary, #f8fafc)', display: 'flex',
                            flexDirection: 'column', gap: '8px', position: 'relative',
                            transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}
                          onMouseOver={e => e.currentTarget.style.borderColor = '#2563EB'}
                          onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color, #cbd5e1)'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ background: '#DBEAFE', color: '#2563EB', padding: '8px', borderRadius: '8px' }}>
                              <Folder size={24} />
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteFolder(folderName, e)}
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                              title="Delete Folder"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{folderName}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{count} file(s) inside</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Inside Active Folder View */
                <div>
                  {/* Active Folder Header Toolbar */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '16px', flexWrap: 'wrap', gap: '12px',
                    padding: '12px 16px', background: 'var(--bg-secondary, #f8fafc)',
                    borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setActiveFolderName(null)}
                        style={{
                          background: 'var(--bg-surface, #fff)', border: '1px solid var(--border-color)',
                          padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                          fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        <ArrowLeft size={14} /> Back to Folders
                      </button>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Folder size={18} color="#2563EB" /> {activeFolderName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        multiple
                        ref={folderFileInputRef}
                        onChange={handleFolderFileUpload}
                        style={{ display: 'none' }}
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                      />
                      
                      <button
                        type="button"
                        onClick={() => folderFileInputRef.current?.click()}
                        disabled={uploadingToFolder}
                        style={{
                          padding: '6px 12px', background: '#059669', color: '#fff', border: 'none',
                          borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: uploadingToFolder ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        {uploadingToFolder ? <Loader2 size={14} className="spin" /> : <UploadCloud size={14} />}
                        {uploadingToFolder ? 'Uploading...' : 'Upload Files to Folder'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setExistingSelectSet(new Set());
                          setShowAddExistingModal(true);
                        }}
                        style={{
                          padding: '6px 12px', background: '#2563EB', color: '#fff', border: 'none',
                          borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        <Plus size={14} /> Add Existing Media
                      </button>
                    </div>
                  </div>

                  {/* Folder Sub-Category Filter Bar */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                    {['all', 'image', 'video', 'audio', 'document'].map(subCat => (
                      <button
                        key={subCat}
                        type="button"
                        onClick={() => setFolderSubCategory(subCat)}
                        style={{
                          padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-color)',
                          fontSize: '12px', fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer',
                          background: folderSubCategory === subCat ? '#1e293b' : 'transparent',
                          color: folderSubCategory === subCat ? '#ffffff' : 'var(--text-secondary)'
                        }}
                      >
                        {subCat}
                      </button>
                    ))}
                  </div>

                  {/* Grid of files inside Folder */}
                  {filteredMedia.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
                      <FolderOpen size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>This folder is empty</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "Upload Files to Folder" or "Add Existing Media" above to populate this folder.</div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '14px'
                    }}>
                      {filteredMedia.map((item) => {
                        const isSelected = selectedItems.has(item.id);
                        const isImage = item.category === 'image';
                        const isVideo = item.category === 'video';
                        const isAudio = item.category === 'audio';

                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleSelect(item)}
                            style={{
                              border: `2px solid ${isSelected ? '#2563EB' : 'var(--border-color, #e2e8f0)'}`,
                              borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                              display: 'flex', flexDirection: 'column', position: 'relative',
                              background: 'var(--bg-card, #ffffff)',
                              boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.2)' : 'none'
                            }}
                          >
                            <div style={{
                              position: 'absolute', top: '6px', left: '6px', zIndex: 10,
                              width: '18px', height: '18px', borderRadius: '4px',
                              background: isSelected ? '#2563EB' : 'rgba(0,0,0,0.3)',
                              border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                            </div>

                            <div style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 10, display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenamingItem(item);
                                  setRenameInput(item.name);
                                }}
                                style={{
                                  background: 'rgba(37, 99, 235, 0.85)', color: '#fff', border: 'none',
                                  borderRadius: '4px', padding: '3px', cursor: 'pointer', display: 'flex'
                                }}
                                title="Rename File"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleRemoveFromFolder(item.id, e)}
                                style={{
                                  background: 'rgba(245, 158, 11, 0.85)', color: '#fff', border: 'none',
                                  borderRadius: '4px', padding: '3px', cursor: 'pointer', display: 'flex'
                                }}
                                title="Remove from Folder"
                              >
                                <X size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSingleFile(item, e)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.85)', color: '#fff', border: 'none',
                                  borderRadius: '4px', padding: '3px', cursor: 'pointer', display: 'flex'
                                }}
                                title="Delete File from Library"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <div style={{
                              height: '95px', background: 'var(--bg-secondary, #f8fafc)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              overflow: 'hidden', position: 'relative'
                            }}>
                              {isImage ? (
                                <img
                                  src={getPreviewUrl(item.url)}
                                  alt={item.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  loading="lazy"
                                />
                              ) : isVideo ? (
                                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Film size={28} color="#f59e0b" />
                                  <span style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', padding: '1px 3px', borderRadius: '2px' }}>VIDEO</span>
                                </div>
                              ) : isAudio ? (
                                <Music size={28} color="#8b5cf6" />
                              ) : (
                                <FileText size={28} color="#64748b" />
                              )}
                            </div>

                            <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '4px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary, #0f172a)' }} title={item.name}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: '9px', color: 'var(--text-secondary, #64748b)' }}>
                                {formatBytes(item.size)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── ALL / STANDARD CATEGORY GRID VIEW ──────────────────────────────── */
            loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
                <Loader2 size={36} className="spin" color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '14px' }}>Loading media files...</span>
              </div>
            ) : error ? (
              <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px', fontSize: '14px' }}>{error}</div>
            ) : filteredMedia.length === 0 ? (
              <div style={{ color: 'var(--text-secondary, #64748b)', textAlign: 'center', padding: '40px', fontSize: '14px' }}>
                No media files found matching the criteria.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '16px'
              }}>
                {filteredMedia.map((item) => {
                  const isSelected = selectedItems.has(item.id);
                  const isImage = item.category === 'image';
                  const isVideo = item.category === 'video';
                  const isAudio = item.category === 'audio';

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelect(item)}
                      style={{
                        border: `2px solid ${isSelected ? '#2563EB' : 'var(--border-color, #e2e8f0)'}`,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        background: 'var(--bg-card, #ffffff)',
                        boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.2)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: '6px', left: '6px', zIndex: 10,
                        width: '18px', height: '18px', borderRadius: '4px',
                        background: isSelected ? '#2563EB' : 'rgba(0,0,0,0.3)',
                        border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                      </div>

                      <div style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 10, display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingItem(item);
                            setRenameInput(item.name);
                          }}
                          style={{
                            background: 'rgba(37, 99, 235, 0.85)', color: '#fff', border: 'none',
                            borderRadius: '4px', padding: '3px', cursor: 'pointer', display: 'flex'
                          }}
                          title="Rename File"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSingleFile(item, e)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.85)', color: '#fff', border: 'none',
                            borderRadius: '4px', padding: '3px', cursor: 'pointer', display: 'flex'
                          }}
                          title="Delete File"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div style={{
                        height: '95px', background: 'var(--bg-secondary, #f8fafc)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', position: 'relative'
                      }}>
                        {isImage ? (
                          <img
                            src={getPreviewUrl(item.url)}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                          />
                        ) : isVideo ? (
                          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Film size={28} color="#f59e0b" />
                            <span style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', padding: '1px 3px', borderRadius: '2px' }}>VIDEO</span>
                          </div>
                        ) : isAudio ? (
                          <Music size={28} color="#8b5cf6" />
                        ) : (
                          <FileText size={28} color="#64748b" />
                        )}
                      </div>

                      <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '4px' }}>
                        <div style={{
                          fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap', color: 'var(--text-primary, #0f172a)'
                        }} title={item.name}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary, #64748b)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{formatBytes(item.size)}</span>
                          {item.folderName && <span style={{ color: '#2563EB', fontWeight: 600 }}>📁 {item.folderName}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--border-color, #cbd5e1)',
          background: 'var(--bg-secondary, #f8fafc)', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>
            {selectedItems.size} item(s) selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              disabled={selectedItems.size === 0}
              onClick={handleBatchDeleteFiles}
              style={{
                padding: '8px 14px', borderRadius: '6px', border: '1px solid #ef4444',
                background: selectedItems.size === 0 ? 'transparent' : '#FEE2E2',
                color: selectedItems.size === 0 ? '#94a3b8' : '#ef4444',
                fontSize: '13px', fontWeight: 600,
                cursor: selectedItems.size === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Trash2 size={15} /> Delete Selected
            </button>
            <button
              type="button"
              disabled={selectedItems.size === 0}
              onClick={() => setShowBatchFolderModal(true)}
              style={{
                padding: '8px 14px', borderRadius: '6px', border: '1px solid #2563EB',
                background: selectedItems.size === 0 ? 'transparent' : '#DBEAFE',
                color: selectedItems.size === 0 ? '#94a3b8' : '#2563EB',
                fontSize: '13px', fontWeight: 600,
                cursor: selectedItems.size === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Folder size={15} /> Move to Folder
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)',
                background: '#ffffff', color: 'var(--text-primary, #0f172a)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedItems.size === 0}
              onClick={handleInsert}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: 'none',
                background: selectedItems.size === 0 ? '#94a3b8' : '#2563EB',
                color: '#ffffff', fontSize: '13px', fontWeight: 600,
                cursor: selectedItems.size === 0 ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Insert Selected
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL: Create New Folder ────────────────────────────────────────── */}
      {showCreateFolderModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <form onSubmit={handleCreateFolder} style={{
            background: 'var(--bg-surface, #fff)', padding: '24px', borderRadius: '10px',
            width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '14px'
          }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>📁 Create New Folder</h4>
            <input
              type="text"
              placeholder="e.g. Breaking News, Elections, Sports"
              value={newFolderNameInput}
              onChange={e => setNewFolderNameInput(e.target.value)}
              autoFocus
              style={{
                width: '100%', padding: '10px', borderRadius: '6px',
                border: '1px solid var(--border-color)', fontSize: '14px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowCreateFolderModal(false)}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: Add Existing Library Media to Active Folder ────────────── */}
      {showAddExistingModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-surface, #fff)', padding: '20px', borderRadius: '10px',
            width: '100%', maxWidth: '750px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                ➕ Select Already Uploaded Files for "{activeFolderName}"
              </h4>
              <button onClick={() => setShowAddExistingModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Sub Filter & Search Row */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['all', 'image', 'video', 'audio', 'document'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setExistingModalCatFilter(cat)}
                    style={{
                      padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-color)',
                      fontSize: '12px', fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer',
                      background: existingModalCatFilter === cat ? '#2563EB' : 'transparent',
                      color: existingModalCatFilter === cat ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search uploaded files..."
                value={existingModalSearch}
                onChange={e => setExistingModalSearch(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', width: '200px' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', padding: '4px' }}>
              {allMedia
                .filter(m => m.folderName !== activeFolderName)
                .filter(m => existingModalCatFilter === 'all' || m.category === existingModalCatFilter)
                .filter(m => m.name.toLowerCase().includes(existingModalSearch.toLowerCase()))
                .map(item => {
                  const isSelected = existingSelectSet.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        const next = new Set(existingSelectSet);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        setExistingSelectSet(next);
                      }}
                      style={{
                        border: `2px solid ${isSelected ? '#2563EB' : 'var(--border-color)'}`,
                        borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', padding: '4px', position: 'relative',
                        background: isSelected ? '#EFF6FF' : '#fff'
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: '4px', left: '4px', zIndex: 10,
                        width: '16px', height: '16px', borderRadius: '3px',
                        background: isSelected ? '#2563EB' : 'rgba(0,0,0,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                      </div>

                      <div style={{ height: '75px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {item.category === 'image' ? (
                          <img src={getPreviewUrl(item.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : item.category === 'video' ? (
                          <Film size={24} color="#f59e0b" />
                        ) : item.category === 'audio' ? (
                          <Music size={24} color="#8b5cf6" />
                        ) : (
                          <FileText size={24} color="#64748b" />
                        )}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '4px', padding: '2px' }} title={item.name}>
                        {item.name}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{existingSelectSet.size} item(s) chosen</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddExistingModal(false)}
                  style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={existingSelectSet.size === 0}
                  onClick={handleAddExistingToFolder}
                  style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#fff', fontWeight: 600, cursor: existingSelectSet.size === 0 ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                >
                  Add to "{activeFolderName}" ({existingSelectSet.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Batch Move Selected Items to Folder ─────────────────────── */}
      {showBatchFolderModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-surface, #fff)', padding: '24px', borderRadius: '10px',
            width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '14px'
          }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              📁 Move {selectedItems.size} Selected Item(s) to Folder
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Select a target folder to assign these files:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
              {folders.map(fName => (
                <button
                  key={fName}
                  type="button"
                  onClick={() => handleBatchMoveToFolder(fName)}
                  style={{
                    padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary, #f8fafc)', color: 'var(--text-primary)',
                    fontSize: '13px', fontWeight: 600, textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#2563EB'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Folder size={16} color="#2563EB" /> {fName}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {allMedia.filter(m => m.folderName === fName).length} files
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowBatchFolderModal(false)}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {renamingItem && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <form onSubmit={handleRenameSave} style={{
            background: 'var(--bg-surface, #fff)', padding: '24px', borderRadius: '10px',
            width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '14px'
          }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit3 size={18} color="#2563EB" /> Rename File
            </h4>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Enter New Filename:</label>
              <input
                type="text"
                value={renameInput}
                onChange={e => setRenameInput(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '6px',
                  border: '1px solid var(--border-color)', fontSize: '14px',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setRenamingItem(null)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!renameInput.trim()}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
              >
                Save Name
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MediaSelectModal;
