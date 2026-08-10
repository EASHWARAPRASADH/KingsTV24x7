import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft, Send, CheckCircle, Image as ImageIcon, Video, FileText, Music, Sparkles, X, RefreshCw, Zap, AlignLeft, Check, Download, AlertCircle, Maximize, Loader2, UploadCloud, FileDown, Mic, LayoutTemplate, MapPin, MessageSquare, RotateCcw, FolderOpen, ExternalLink } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import ImageUploadPreview from '../../components/common/ImageUploadPreview';
import CategorySubcategorySelect from '../../components/common/CategorySubcategorySelect';
import DatePickerInput from '../../components/common/DatePickerInput';
import { useAuth } from '../../context/AuthContext';
import MediaSelectModal from '../../components/common/MediaSelectModal';

// ── Secure Backend AI Helpers ────────────────────────────────────────────────
export let activeAiConfig = { 
  model: 'gemini-2.0-flash' 
};

const callGemini = async (prompt, action = 'assist') => {
  const promptText = (prompt || '').trim();
  if (!promptText) {
    throw new Error('AI Prompt is empty. Please enter an article title or notes for AI generation.');
  }

  const res = await api.post('/articles/ai-assist', { action, text: promptText });
  if (res.data && res.data.result) {
    return res.data.result;
  }
  throw new Error(res.data?.message || 'Backend AI Service unavailable');
};

const callGeminiMultimodal = async (base64Data, mimeType, prompt) => {
  if (!base64Data || !base64Data.trim()) throw new Error('Source file data is empty or invalid.');
  const res = await api.post('/admin/ai-config/generate-multimodal', { base64Data, mimeType, prompt });
  if (res.data && res.data.resultText) {
    return res.data.resultText;
  }
  throw new Error(res.data?.message || 'Backend AI Multimodal processing failed');
};

const cleanAndParseJson = (raw) => {
  if (!raw || typeof raw !== 'string') return {};
  
  // 1. Strip markdown code fences (```json ... ``` or ``` ...)
  let clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  // 2. Find outermost braces
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  
  // 3. Try standard JSON parse
  try {
    return JSON.parse(clean);
  } catch (e1) {
    // 4. Sanitize control chars, unescaped newlines inside JSON string values
    try {
      const sanitized = clean
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
        .replace(/(?<=:\s*"(?:[^"\\]|\\.)*)\n(?=(?:[^"\\]|\\.)*")/g, "\\n");
      return JSON.parse(sanitized);
    } catch (e2) {
      console.warn("JSON repair attempt failed, extracting keys via regex...", e2);
      
      const extractKey = (key) => {
        const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*?)"`, 'i');
        const match = clean.match(regex);
        if (match && match[1]) {
          return match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
        }
        return '';
      };

      const extracted = {
        titleTa: extractKey('titleTa'),
        titleEn: extractKey('titleEn'),
        contentTa: extractKey('contentTa'),
        contentEn: extractKey('contentEn'),
        shortDescTa: extractKey('shortDescTa'),
        shortDescEn: extractKey('shortDescEn'),
        excerptTa: extractKey('excerptTa'),
        excerptEn: extractKey('excerptEn'),
        metaTitleTa: extractKey('metaTitleTa'),
        metaTitleEn: extractKey('metaTitleEn'),
        metaDescriptionTa: extractKey('metaDescriptionTa'),
        metaDescriptionEn: extractKey('metaDescriptionEn'),
        focusKeywordsTa: extractKey('focusKeywordsTa'),
        focusKeywordsEn: extractKey('focusKeywordsEn'),
        metaKeywordsTa: extractKey('metaKeywordsTa'),
        metaKeywordsEn: extractKey('metaKeywordsEn'),
        metaTitle: extractKey('metaTitle'),
        metaDescription: extractKey('metaDescription'),
        focusKeywords: extractKey('focusKeywords'),
        metaKeywords: extractKey('metaKeywords'),
        slug: extractKey('slug'),
        categoryId: extractKey('categoryId'),
        suggestedSource: extractKey('suggestedSource'),
        suggestedLocation: extractKey('suggestedLocation')
      };

      if (extracted.titleTa || extracted.titleEn || extracted.contentTa || extracted.contentEn) {
        return extracted;
      }
      return {};
    }
  }
};

const slugify = (text) => {
  if (!text) return '';
  const cleaned = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
  if (cleaned && cleaned.length > 2) return cleaned;
  // Smart Fallback for Tamil / Non-Latin scripts: create clean unique slug
  const hash = Math.floor(100000 + Math.random() * 900000);
  return `article-${Date.now().toString(36)}-${hash}`;
};

// ── Contextual AI Helper ─────────────────────────────────────────────────────
const handleAiInlineAction = async (editor, action, lang) => {
  const selectedText = editor.selection.getContent({ format: 'text' }).trim();
  if (!selectedText) {
    alert('Please select some text first.');
    return;
  }
  
  // Create a temporary loading span and insert it
  const tempId = 'ai-temp-' + Math.random().toString(36).substr(2, 9);
  const loadingSpan = `<span id="${tempId}" style="background: rgba(245,158,11,0.2); border-bottom: 2px dashed #F59E0B; padding: 2px 4px; border-radius: 4px;">${selectedText} ⏳</span>`;
  editor.selection.setContent(loadingSpan);
  
  let prompt = '';
  if (action === 'grammar') prompt = `Fix any grammar, spelling, or stylistic issues in this text. Keep the same language. Return ONLY the corrected text without explanations or quotes:\n"${selectedText}"`;
  else if (action === 'rephrase') prompt = `Rephrase this text to be clearer and more engaging, while keeping the same meaning and language. Return ONLY the new text:\n"${selectedText}"`;
  else if (action === 'summarize') prompt = `Summarize this text concisely. Keep the same language. Return ONLY the summary:\n"${selectedText}"`;
  else if (action === 'expand') prompt = `Expand on this text by providing more professional detail without inventing false facts. Keep the same language. Return ONLY the expanded text:\n"${selectedText}"`;
  else if (action === 'translate') prompt = `Translate this text to ${lang === 'ta' ? 'English' : 'Tamil'}. Return ONLY the translated text:\n"${selectedText}"`;

  try {
    const aiResult = await callGemini(prompt);
    // Replace the loading span with an interactive diff span
    const resultSpan = `<span class="ai-suggestion" data-original="${encodeURIComponent(selectedText)}" data-result="${encodeURIComponent(aiResult)}" style="background: rgba(16, 185, 129, 0.15); border-bottom: 2px solid #10B981; padding: 2px 4px; border-radius: 4px; cursor: pointer;">${aiResult}</span>`;
    const doc = editor.getDoc();
    const tempNode = doc.getElementById(tempId);
    if (tempNode) {
      tempNode.outerHTML = resultSpan;
    }
  } catch (err) {
    console.error(err);
    alert('AI Error: ' + err.message);
    const doc = editor.getDoc();
    const tempNode = doc.getElementById(tempId);
    if (tempNode) {
      tempNode.outerHTML = selectedText;
    }
  }
};

const handleAcceptReject = (editor, accept) => {
  const node = editor.selection.getNode();
  if (node && node.classList.contains('ai-suggestion')) {
    if (accept) {
      const text = decodeURIComponent(node.getAttribute('data-result'));
      node.outerHTML = text;
    } else {
      const text = decodeURIComponent(node.getAttribute('data-original'));
      node.outerHTML = text;
    }
  }
};

// ── Auto-Expanding Textarea Component for News Tags / Multiline Inputs ───────
const AutoExpandTextarea = ({ value, onChange, placeholder, style, minHeight = '42px', maxHeight = '160px' }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, parseInt(maxHeight) || 160)}px`;
    }
  }, [value, maxHeight]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        fontSize: '14px',
        color: 'var(--text-primary)',
        resize: 'none',
        overflowY: 'auto',
        fontFamily: 'inherit',
        lineHeight: '1.4',
        boxSizing: 'border-box',
        minHeight: minHeight,
        maxHeight: maxHeight,
        transition: 'height 0.15s ease',
        ...style
      }}
    />
  );
};

// ── Component ────────────────────────────────────────────────────────────────
const NewsEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState(0); 
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [reporters, setReporters] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [msg, setMsg] = useState(null);
  
  // Content Moderation State
  const [profanityDict, setProfanityDict] = useState([]);
  const [detectedWords, setDetectedWords] = useState([]);
  const [hasShownAlert, setHasShownAlert] = useState(false);
  const hasProfanity = detectedWords.length > 0;

  // Common alternative word suggestions for profanity replacement
  const WORD_ALTERNATIVES = {
    // add domain-specific entries here if needed
    default: ['appropriate term', 'suitable word', 'correct expression']
  };
  const getSuggestions = (word) => WORD_ALTERNATIVES[word.toLowerCase()] || WORD_ALTERNATIVES.default;
  
  const [mediaList, setMediaList] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadType, setUploadType] = useState('source'); 

  // Draft Backup & Auto-Save State
  const [hasDraftBackup, setHasDraftBackup] = useState(false);
  const [draftSavedTime, setDraftSavedTime] = useState('');
  
  const [form, setForm] = useState({
    titleTa: '', titleEn: '', contentTa: '', contentEn: '',
    shortDescTa: '', shortDescEn: '', imageUrl: '', featuredImage: '',
    authorName: user?.name || user?.username || 'Kings TV News Desk', 
    reporterName: '', readabilityScore: '', seoScore: '', status: 'draft',
    categoryId: '', subcategoryId: '', districtId: '', constituency: '',
    metaTitle: '', metaDescription: '', metaKeywords: '', focusKeywords: '', slug: '', canonicalUrl: '',
    publishedAt: '', showRightColumn: true, isPluggedIn: false, featuredCategory: '',
    allowComments: true, allowPingbacks: true
  });

  // ── Auto-Save to LocalStorage every 15s ────────────────────────────────────
  useEffect(() => {
    const draftKey = `news_editor_draft_${isEdit ? id : 'new'}`;
    const timer = setInterval(() => {
      if (form.titleEn || form.titleTa || form.contentEn || form.contentTa) {
        const draftData = {
          ...form,
          contentTa: editorRefTa.current ? editorRefTa.current.getContent() : form.contentTa,
          contentEn: editorRefEn.current ? editorRefEn.current.getContent() : form.contentEn,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem(draftKey, JSON.stringify(draftData));
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [form, isEdit, id]);

  // Check for auto-saved draft on mount
  useEffect(() => {
    const draftKey = `news_editor_draft_${isEdit ? id : 'new'}`;
    const savedDraftStr = localStorage.getItem(draftKey);
    if (savedDraftStr && !isEdit) {
      try {
        const saved = JSON.parse(savedDraftStr);
        if (saved && (saved.titleEn || saved.titleTa || saved.contentEn || saved.contentTa)) {
          setHasDraftBackup(true);
          setDraftSavedTime(saved.savedAt ? new Date(saved.savedAt).toLocaleTimeString() : 'recently');
        }
      } catch (e) {}
    }
  }, [isEdit, id]);

  const handleRestoreDraft = () => {
    const draftKey = `news_editor_draft_${isEdit ? id : 'new'}`;
    const savedDraftStr = localStorage.getItem(draftKey);
    if (savedDraftStr) {
      try {
        const saved = JSON.parse(savedDraftStr);
        setForm(f => ({ ...f, ...saved }));
        if (editorRefTa.current && saved.contentTa) editorRefTa.current.setContent(saved.contentTa);
        if (editorRefEn.current && saved.contentEn) editorRefEn.current.setContent(saved.contentEn);
        showMsg('⚡ Unsaved draft restored from local backup!');
      } catch (e) {}
    }
    setHasDraftBackup(false);
  };

  const handleDiscardDraft = () => {
    const draftKey = `news_editor_draft_${isEdit ? id : 'new'}`;
    localStorage.removeItem(draftKey);
    setHasDraftBackup(false);
    showMsg('Local draft backup discarded.');
  };

  const [aiGeneratingDraft, setAiGeneratingDraft] = useState(false);
  const [aiDraftProgress, setAiDraftProgress] = useState('');
  
  const editorRefTa = useRef(null);
  const editorRefEn = useRef(null);

  // Hidden File Input Refs for Media Toolbar
  const mediaInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const docInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaSelectModalOpen, setMediaSelectModalOpen] = useState(false);
  const [isCustomAuthor, setIsCustomAuthor] = useState(false);
  const [aiProofreading, setAiProofreading] = useState(false);

  // Gallery Creator Modal State
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState('Media & Document Vault');
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryUploading, setGalleryUploading] = useState(false);

  // Media Library Integration inside Gallery Modal
  const [mediaLibraryItems, setMediaLibraryItems] = useState([]);
  const [loadingMediaLibrary, setLoadingMediaLibrary] = useState(false);
  const [galleryModalTab, setGalleryModalTab] = useState('library'); // 'library' | 'upload'
  const [mediaLibrarySearch, setMediaLibrarySearch] = useState('');
  const [mediaLibraryCategory, setMediaLibraryCategory] = useState('all');

  const fetchMediaLibraryItems = async () => {
    setLoadingMediaLibrary(true);
    try {
      const res = await api.get('/media/list');
      const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      const formatted = list.map(m => {
        const fileType = m.mimeType || m.type || '';
        const fileName = m.filename || m.name || m.url?.split('/').pop() || 'file';
        let cat = 'document';
        if (fileType.startsWith('image/')) cat = 'image';
        else if (fileType.startsWith('video/')) cat = 'video';
        else if (fileType.startsWith('audio/')) cat = 'audio';

        const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';
        const sizeMb = m.fileSize ? (m.fileSize / (1024 * 1024)).toFixed(2) : (m.size ? (m.size / (1024 * 1024)).toFixed(2) : '0.50');

        return {
          id: m.id || m.url,
          url: m.url || m.path,
          name: fileName,
          type: fileType,
          ext,
          sizeMb,
          category: cat
        };
      });
      setMediaLibraryItems(formatted);
    } catch (err) {
      console.warn('Failed to load media library items', err);
    } finally {
      setLoadingMediaLibrary(false);
    }
  };

  useEffect(() => {
    if (galleryModalOpen) {
      fetchMediaLibraryItems();
    }
  }, [galleryModalOpen]);

  // API Key Modal State
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem('gemini_api_key') || localStorage.getItem('ai.llm_api_key') || '');
  const [apiModelInput, setApiModelInput] = useState('gemini-flash-latest');

  const handleSaveApiKey = async () => {
    const key = apiKeyInput.trim();
    if (!key || key.length < 8) return showMsg('Please enter a valid Gemini API Key', true);

    activeAiConfig.apiKey = key;
    activeAiConfig.model = apiModelInput;
    localStorage.setItem('ai.llm_api_key', key);

    try {
      await api.put('/admin/ai-config/gemini', {
        provider: 'gemini',
        apiKey: key,
        model: apiModelInput,
        enableAi: true,
        enableTranslation: true,
        enableSeo: true,
        enableSummary: true,
        enableRewrite: true,
        enableTags: true,
        enableKeywords: true,
        isActive: true
      }).catch(() => {});
      await api.post('/admin/ai-config/gemini/activate').catch(() => {});
      
      localStorage.setItem('gemini_api_key', key);
      localStorage.setItem('ai.llm_api_key', key);
      
      setApiKeyInput(key);
      setKeyModalOpen(false);
      showMsg('🔑 Gemini API Key saved & activated securely on server!');
    } catch(e) {
      console.error(e);
      const errMsg = e.response?.data?.message || 'Error saving API Key to server.';
      showMsg(errMsg, true);
    }

  };

  const getActiveEditor = () => activeTab === 0 ? editorRefTa.current : editorRefEn.current;

  // Safe helper to insert HTML into TinyMCE or fall back to form state
  const insertIntoActiveContent = (html) => {
    const editor = getActiveEditor();
    if (editor) {
      editor.insertContent(html);
    } else {
      const field = activeTab === 0 ? 'contentTa' : 'contentEn';
      setForm(f => ({
        ...f,
        [field]: (f[field] || '') + html
      }));
    }
  };

  // Helper to upload a single file
  const uploadSingleFile = async (file) => {
    const maxSizeBytes = 50 * 1024 * 1024; // 50 MB max limit
    if (file.size > maxSizeBytes) {
      throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 50MB.`);
    }
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/articles/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    if (res.data?.url) {
      const serverBase = (api.defaults.baseURL || 'http://localhost:8080/api/v1').replace(/\/api(\/v1)?\/?$/, '');
      return res.data.url.startsWith('http') ? res.data.url : serverBase + res.data.url;
    }
    throw new Error('Upload failed');
  };

  const getPreviewUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const serverBase = (api.defaults.baseURL || 'http://localhost:8080/api/v1')
      .replace(/\/api\/v1\/?$/, '')
      .replace(/\/api\/?$/, '');
    return serverBase + (url.startsWith('/') ? url : '/' + url);
  };

  const handleInsertFromLibrary = (selectedItems) => {
    selectedItems.forEach(item => {
      let html = '';
      const finalUrl = getPreviewUrl(item.url);
      if (item.category === 'image') {
        html = `<p><img src="${finalUrl}" alt="${item.name}" style="width: 100%; max-width: 800px; height: auto; border-radius: 8px; margin: 12px 0; display: block;" /></p><p>&nbsp;</p>`;
      } else if (item.category === 'video') {
        html = `<p><video controls style="max-width: 100%; width: 100%; border-radius: 8px; margin: 12px 0;" src="${finalUrl}"><source src="${finalUrl}" type="video/mp4"></video></p><p>&nbsp;</p>`;
      } else if (item.category === 'audio') {
        html = `<p><audio controls style="width: 100%; margin: 12px 0;" src="${finalUrl}"></audio></p><p>&nbsp;</p>`;
      } else {
        html = `<p><a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${item.name}</a></p><p>&nbsp;</p>`;
      }
      insertIntoActiveContent(html);
    });
    showMsg('Media inserted from library successfully!');
  };

  // 1. Add Media (Images)
  const handleAddMedia = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setMediaUploading(true);
    try {
      for (const file of files) {
        const url = await uploadSingleFile(file);
        insertIntoActiveContent(`<p><img src="${url}" alt="${file.name}" style="width: 100%; max-width: 800px; height: auto; border-radius: 8px; margin: 12px 0; display: block;" /></p><p>&nbsp;</p>`);
      }
      showMsg('Image(s) added to editor successfully!');
    } catch (err) {
      console.error(err);
      showMsg('Failed to upload image.', true);
    } finally {
      setMediaUploading(false);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  };

  // 2. Add Video File
  const handleAddVideoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaUploading(true);
    try {
      const url = await uploadSingleFile(file);
      insertIntoActiveContent(`<p><video controls style="max-width: 100%; width: 100%; border-radius: 8px; margin: 12px 0;" src="${url}"><source src="${url}" type="${file.type}"></video></p><p>&nbsp;</p>`);
      showMsg('Video added to editor successfully!');
    } catch (err) {
      console.error(err);
      showMsg('Failed to upload video.', true);
    } finally {
      setMediaUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
      setVideoModalOpen(false);
    }
  };

  // 2b. Add Video URL (YouTube / Embed / Direct MP4)
  const handleInsertVideoUrl = () => {
    if (!videoUrlInput.trim()) return;

    let html = '';
    const url = videoUrlInput.trim();
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0];
      else if (url.includes('v=')) videoId = url.split('v=')[1]?.split('&')[0];
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      html = `<p><iframe src="${embedUrl}" width="100%" height="400" frameborder="0" allowfullscreen style="border-radius: 8px; margin: 12px 0; max-width: 100%;"></iframe></p><p>&nbsp;</p>`;
    } else {
      html = `<p><video controls style="max-width: 100%; width: 100%; border-radius: 8px; margin: 12px 0;" src="${url}"></video></p><p>&nbsp;</p>`;
    }

    insertIntoActiveContent(html);
    setVideoUrlInput('');
    setVideoModalOpen(false);
    showMsg('Video embedded successfully!');
  };

  // 3. Add Audio
  const handleAddAudio = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaUploading(true);
    try {
      const url = await uploadSingleFile(file);
      insertIntoActiveContent(`<p><audio controls style="width: 100%; margin: 12px 0;" src="${url}"></audio></p><p>&nbsp;</p>`);
      showMsg('Audio added to editor successfully!');
    } catch (err) {
      console.error(err);
      showMsg('Failed to upload audio.', true);
    } finally {
      setMediaUploading(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  // 4. Add Document (PDF, DOCX, TXT, etc.)
  const handleAddDocument = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaUploading(true);
    try {
      const url = await uploadSingleFile(file);
      const ext = file.name.split('.').pop()?.toUpperCase() || 'DOC';
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      
      const docHtml = `
        <div class="document-card" style="display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; margin: 16px 0;">
          <div style="font-size: 28px; line-height: 1;">📄</div>
          <div style="flex: 1; overflow: hidden;">
            <strong style="display: block; font-size: 15px; color: #0f172a; margin-bottom: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${file.name}</strong>
            <span style="font-size: 12px; color: #64748b; font-weight: 500;">${ext} Document • ${sizeMb} MB</span>
          </div>
          <a href="${url}" target="_blank" download style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; white-space: nowrap;">
            ⬇ Download Document
          </a>
        </div>
        <p>&nbsp;</p>
      `;
      insertIntoActiveContent(docHtml);
      showMsg('Document attached to editor successfully!');
    } catch (err) {
      console.error(err);
      showMsg('Failed to upload document.', true);
    } finally {
      setMediaUploading(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  // 5. Interactive Gallery Modal Upload Handler (Images, Videos, Audio, Docs)
  const handleUploadGalleryModalFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setGalleryUploading(true);
    try {
      const newItems = [];
      for (const file of files) {
        const url = await uploadSingleFile(file);
        const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        let category = 'image';
        if (file.type.startsWith('video/')) category = 'video';
        else if (file.type.startsWith('audio/')) category = 'audio';
        else if (!file.type.startsWith('image/')) category = 'document';

        newItems.push({
          id: Date.now() + Math.random(),
          url,
          name: file.name,
          type: file.type,
          ext,
          sizeMb,
          category
        });
      }
      setGalleryItems(prev => [...prev, ...newItems]);
      showMsg(`Added ${newItems.length} file(s) to gallery modal!`);
    } catch (err) {
      console.error(err);
      showMsg('Failed to upload gallery item.', true);
    } finally {
      setGalleryUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  // Insert complete gallery HTML card into article content
  const handleInsertGalleryModal = () => {
    if (!galleryItems.length) return showMsg('Please upload at least one image, video, audio, or document to the gallery.', true);

    const images = galleryItems.filter(i => i.category === 'image');
    const videos = galleryItems.filter(i => i.category === 'video');
    const audios = galleryItems.filter(i => i.category === 'audio');
    const docs = galleryItems.filter(i => i.category === 'document');

    let html = `
      <div class="interactive-gallery-container" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin: 24px 0; font-family: sans-serif;">
        <h4 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px;">
          📂 ${galleryTitle || 'Media & Document Gallery'}
        </h4>
    `;

    // Images Grid
    if (images.length > 0) {
      html += `
        <div class="article-gallery" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px;">
          ${images.map(img => `<div style="overflow:hidden; border-radius:10px; height:180px;"><img src="${img.url}" alt="${img.name}" style="width:100%; height:100%; object-fit:cover; display:block; border-radius:10px;" /></div>`).join('')}
        </div>
      `;
    }

    // Videos
    if (videos.length > 0) {
      videos.forEach(v => {
        html += `<p><video controls style="max-width: 100%; width: 100%; border-radius: 8px; margin: 12px 0;" src="${v.url}"><source src="${v.url}" type="${v.type}"></video></p>`;
      });
    }

    // Audio Clips
    if (audios.length > 0) {
      audios.forEach(a => {
        html += `<p><audio controls style="width: 100%; margin: 8px 0;" src="${a.url}"></audio></p>`;
      });
    }

    // Document Downloads
    if (docs.length > 0) {
      html += `<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 12px;">`;
      docs.forEach(d => {
        html += `
          <div class="document-card" style="display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;">
            <div style="font-size: 24px;">📄</div>
            <div style="flex: 1; overflow: hidden;">
              <strong style="display: block; font-size: 14px; color: #0f172a; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${d.name}</strong>
              <span style="font-size: 11px; color: #64748b; font-weight: 500;">${d.ext} Document • ${d.sizeMb} MB</span>
            </div>
            <a href="${d.url}" target="_blank" download style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 600;">
              ⬇ Download
            </a>
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `</div><p>&nbsp;</p>`;

    insertIntoActiveContent(html);
    setGalleryModalOpen(false);
    setGalleryItems([]);
    setGalleryTitle('Media & Document Vault');
    showMsg('Interactive Gallery attached to article successfully!');
  };

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data || [])).catch(() => {});
    api.get('/districts').then(r => setDistricts(r.data || [])).catch(() => {});
    api.get('/user/reporters').then(r => {
      const users = (Array.isArray(r.data) ? r.data : []).filter(u => {
        const roleName = u.role ? u.role.replace(/^ROLE_/, '') : '';
        return ['MOBILE_JOURNALIST', 'DISTRICT_ADMIN', 'CHIEF_EDITOR', 'INSTITUTION_LOGIN', 'SUPER_ADMIN', 'SECTION_EDITOR', 'SUB_EDITOR'].includes(roleName);
      });
      setReporters(users);
    }).catch(() => {});
    
    api.get('/user/profile').then(r => {
      if (r.data && (r.data.fullName || r.data.username)) {
        const userAuthor = r.data.fullName || r.data.username;
        setForm(f => ({ ...f, authorName: f.authorName || userAuthor }));
      }
    }).catch(() => {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser.fullName || storedUser.username) {
          const userAuthor = storedUser.fullName || storedUser.username;
          setForm(f => ({ ...f, authorName: f.authorName || userAuthor }));
        }
      } catch (e) {}
    });

    const savedKey = localStorage.getItem('gemini_api_key') || localStorage.getItem('ai.llm_api_key') || '';
    if (savedKey) {
      activeAiConfig.apiKey = savedKey;
      setApiKeyInput(savedKey);
    }

    api.get('/admin/ai-config/gemini').then(res => {
      if (res.data) {
        if (res.data.model && !res.data.model.includes('2.0-flash')) {
          activeAiConfig.model = res.data.model;
          setApiModelInput(res.data.model);
        } else {
          activeAiConfig.model = 'gemini-flash-latest';
          setApiModelInput('gemini-flash-latest');
        }
      }
    }).catch(() => {});

    if (isEdit) {
      api.get(`/articles/${id}`).then(r => {
        const a = r.data;
        setForm({
          ...a,
          publishedAt: a.publishedAt ? a.publishedAt.substring(0, 16) : '',
          showRightColumn: a.showRightColumn !== false,
          isPluggedIn: a.isPluggedIn === true,
          allowComments: a.allowComments !== false,
          allowPingbacks: a.allowPingbacks !== false,
          authorName: a.authorName || 'Kings TV News Desk',
          status: a.status || 'draft'
        });
      }).catch(() => {});
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (form.categoryId) {
      api.get(`/subcategories/getAllWeb?categoryId=${form.categoryId}&size=200`)
        .then(r => setSubCategories(r.data?.content || r.data || []))
        .catch(() => {
          api.get('/admin/taxonomy/subcategories')
            .then(res => {
              const allSubs = Array.isArray(res.data) ? res.data : [];
              const filtered = allSubs.filter(sc => String(sc.categoryId || sc.category?.id) === String(form.categoryId));
              setSubCategories(filtered);
            })
            .catch(() => setSubCategories([]));
        });
    } else {
      setSubCategories([]);
    }
  }, [form.categoryId]);

  const showMsg = (text, isError = false) => {
    setMsg({ text, type: isError ? 'error' : 'success' });
    setTimeout(() => setMsg(null), 4000);
  };

  const getLiveArticleUrl = () => {
    const mainOrigin = window.location.origin;
    let baseDomain = 'https://king-tv.test-technoprint.online';
    if (mainOrigin.includes('localhost') || mainOrigin.includes('127.0.0.1')) {
      baseDomain = 'http://localhost:5173';
    } else if (mainOrigin.includes('test-technoprint.online')) {
      baseDomain = 'https://king-tv.test-technoprint.online';
    } else if (mainOrigin.includes('admin')) {
      baseDomain = mainOrigin.replace('admin.', '').replace('/admin', '');
    }

    const artSlug = (form.slug || slugify(form.titleEn || form.titleTa || 'article-title')).toLowerCase();
    return `${baseDomain}/news/${artSlug}`;
  };

  // --- Content Moderation: Dictionary Fetch & Scanning ---
  useEffect(() => {
    const fetchDict = async () => {
      try {
        const res = await api.get('/admin/profanity/public/dictionary');
        setProfanityDict(res.data || []);
      } catch (err) {
        console.warn('Could not fetch profanity dictionary', err);
      }
    };
    fetchDict();
  }, []);

  const scanForProfanity = useCallback(() => {
    if (!profanityDict || profanityDict.length === 0) {
      setDetectedWords([]);
      return;
    }

    const textEn = editorRefEn.current ? editorRefEn.current.getContent({ format: 'text' }) : (form.contentEn || '').replace(/<[^>]*>/g, ' ');
    const textTa = editorRefTa.current ? editorRefTa.current.getContent({ format: 'text' }) : (form.contentTa || '').replace(/<[^>]*>/g, ' ');

    const textParts = [
      form.titleEn, form.titleTa, textEn, textTa,
      form.shortDescEn, form.shortDescTa, form.metaTitle, form.metaDescription,
      form.metaTitleEn, form.metaTitleTa, form.metaDescriptionEn, form.metaDescriptionTa,
      form.focusKeywords, form.metaKeywords, form.slug
    ];

    const cleanCombinedText = textParts.filter(Boolean).join(' ').toLowerCase();

    const found = profanityDict.filter(item => {
      const term = (typeof item === 'string' ? item : item.term || '').trim().toLowerCase();
      if (!term || term.length < 2) return false;
      const safeTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\s|[^\\w\\u0B80-\\u0BFF])${safeTerm}(?:$|\\s|[^\\w\\u0B80-\\u0BFF])`, 'i');
      return regex.test(cleanCombinedText);
    }).map(item => (typeof item === 'string' ? item : item.term));

    const uniqueFound = [...new Set(found)];
    setDetectedWords(uniqueFound);
  }, [form.titleEn, form.titleTa, form.contentEn, form.contentTa, form.shortDescEn, form.shortDescTa, form.metaTitle, form.metaDescription, form.metaTitleEn, form.metaTitleTa, form.metaDescriptionEn, form.metaDescriptionTa, form.focusKeywords, form.metaKeywords, form.slug, profanityDict]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scanForProfanity();
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [form, scanForProfanity]);

  // --- End Content Moderation ---
  
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Unified Uploader ───────────────────────────────────────────────────────
  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadProgress(0);
    
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isSourceMode = uploadType === 'source';
      const isTextOrPdfOrAudio = file.type === 'application/pdf' || 
                                file.type.startsWith('text/') || 
                                file.type.startsWith('audio/') || 
                                file.name.endsWith('.txt') || 
                                file.name.endsWith('.pdf') ||
                                file.name.endsWith('.doc') ||
                                file.name.endsWith('.docx');

      if (isSourceMode && isTextOrPdfOrAudio) {
        let textContent = '';
        if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
          textContent = await new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result); reader.readAsText(file); });
        } else {
          try {
            const base64Data = await new Promise((r) => {
              const reader = new FileReader();
              reader.onload = () => r((reader.result || '').split(',')[1] || '');
              reader.readAsDataURL(file);
            });
            setUploadProgress(Math.round(((i + 0.5) / files.length) * 100));
            if (base64Data) {
              const prompt = file.type.startsWith('audio/') 
                ? "Transcribe all audio speech into clear news text." 
                : "Extract all news text and key points from this document exactly.";
              textContent = await callGeminiMultimodal(base64Data, file.type || 'application/pdf', prompt);
            }
          } catch(err) {
            console.error('File text extraction failed', err);
          }
        }
        uploaded.push({ name: file.name, type: file.type || 'document', text: textContent, isSource: true });
      } else {
        // Image or Video upload for insertion into rich text editor
        let fileUrl = '';
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await api.post('/articles/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          if (res.data?.url) {
            const serverBase = (api.defaults.baseURL || 'http://localhost:8080/api/v1').replace(/\/api(\/v1)?\/?$/, '');
            fileUrl = res.data.url.startsWith('http') ? res.data.url : serverBase + res.data.url;
          }
        } catch (err) {
          console.warn('Server upload failed, using local object URL', err);
          fileUrl = URL.createObjectURL(file);
        }

        if (fileUrl) {
          uploaded.push({ name: file.name, url: fileUrl, type: file.type || 'image/jpeg', isInsert: true });
        }
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    
    setMediaList(p => [...p, ...uploaded]);
    setUploadProgress(null);
    showMsg(`Successfully processed ${uploaded.length} file(s) for ${uploadType === 'source' ? 'AI Source Notes' : 'Article Insertion'}!`);
  };

  const insertMedia = (url, type) => {
    const editor = activeTab === 0 ? editorRefTa.current : editorRefEn.current;
    if (!editor) return showMsg('Click inside the editor first.', true);
    
    const html = type.startsWith('video/') 
      ? `<video controls style="max-width: 100%; border-radius: 8px;"><source src="${url}" type="${type}"></video><p>&nbsp;</p>`
      : (type.startsWith('audio/') 
        ? `<audio controls src="${url}"></audio><p>&nbsp;</p>`
        : `<img src="${url}" style="width: 100%; max-width: 800px; height: auto; border-radius: 8px; display: block; margin: 12px 0;" /><p>&nbsp;</p>`);
    editor.insertContent(html);
  };

  // ── Full Draft Generation ──────────────────────────────────────────────────
  const handleGenerateDraft = async () => {
    const sourceTexts = mediaList.filter(m => m.text).map(m => m.text).join('\n\n');
    if (!sourceTexts && !form.contentTa && !form.contentEn) {
      showMsg('Please upload a source document or paste raw notes first.', true);
      return;
    }
    
    setAiGeneratingDraft(true);
    setAiDraftProgress('Reading source & generating draft...');
    
    const baseContent = sourceTexts || form.contentTa || form.contentEn || form.titleTa || form.titleEn;
    const catNames = categories.map(c => `${c.id}:${c.nameEn || c.name}`).join(', ');
    const prompt = `You are a professional news journalist and editor for Kings 24x7. Analyze and expand this raw news note into a full draft:\n"${baseContent.substring(0, 4000)}"\nAvailable Categories: [${catNames}]\nRespond in strictly valid JSON format with keys: titleTa, titleEn, contentTa, contentEn, excerptTa, excerptEn, seoTitle, metaDescription, metaKeywords, focusKeywords, slug, categoryId.`;

    try {
      const draftPrompt = `You are a professional Tamil & English news editor for Kings 24x7. Generate a complete news article from this raw content:\n"${baseContent.substring(0, 4000)}"\nAvailable Categories: [${catNames}]\n\nRespond in strictly valid JSON format with keys: titleTa, titleEn, contentTa (HTML), contentEn (HTML), excerptTa, excerptEn, seoTitle, metaDescription, metaKeywords, focusKeywords, slug, categoryId.`;

      let raw = '';
      try {
        const res = await api.post('/admin/ai-config/generate-draft', {
          baseContent,
          categoryList: catNames
        });
        raw = res.data?.resultText || '';
      } catch (e) {
        raw = await callGemini(draftPrompt);
      }

      let parsed = cleanAndParseJson(raw);
      
      setForm(f => ({
        ...f,
        titleEn: parsed.titleEn || f.titleEn,
        titleTa: parsed.titleTa || f.titleTa,
        contentEn: parsed.contentEn || f.contentEn,
        contentTa: parsed.contentTa || f.contentTa,
        shortDescEn: parsed.excerptEn || f.shortDescEn,
        shortDescTa: parsed.excerptTa || f.shortDescTa,
        metaTitle: parsed.seoTitle || f.metaTitle,
        metaDescription: parsed.metaDescription || f.metaDescription,
        metaKeywords: parsed.metaKeywords || f.metaKeywords,
        focusKeywords: parsed.focusKeywords || f.focusKeywords,
        slug: parsed.slug || f.slug,
        categoryId: parsed.categoryId || f.categoryId
      }));
      
      if (editorRefEn.current) editorRefEn.current.setContent(parsed.contentEn || '');
      if (editorRefTa.current) editorRefTa.current.setContent(parsed.contentTa || '');
      
      showMsg('Draft generation complete!');
    } catch (err) {
      console.error(err);
      const errDetail = err.response?.data?.message || err.message || 'Draft generation failed. Try again.';
      showMsg(`Draft generation error: ${errDetail}`, true);
    } finally {
      setAiGeneratingDraft(false);
      setAiDraftProgress('');
    }
  };

  // ── Rule-Based Instant Auto-SEO (Dual Language: Tamil & English) ─────────────
  const handleRuleBasedAutoFill = () => {
    const titleTa = (form.titleTa || '').trim();
    const titleEn = (form.titleEn || '').trim();
    
    const contentTa = editorRefTa.current ? editorRefTa.current.getContent({ format: 'text' }) : (form.contentTa || '');
    const contentEn = editorRefEn.current ? editorRefEn.current.getContent({ format: 'text' }) : (form.contentEn || '');

    if (!titleTa && !titleEn && !contentTa && !contentEn) {
      showMsg('Please enter an Article Title or Content first.', true);
      return;
    }

    const cleanTa = contentTa.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const cleanEn = contentEn.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    // Context metadata
    const category = categories.find(c => String(c.id) === String(form.categoryId));
    const district = districts.find(d => String(d.id) === String(form.districtId));
    
    const catTa = category?.nameTa || '';
    const catEn = category?.name || category?.nameEn || '';
    const distTa = district?.nameTa || '';
    const distEn = district?.nameEn || district?.name || '';
    const city = form.constituency || '';

    // 1. Tamil SEO Generation
    let descTa = cleanTa.slice(0, 155) || (titleTa ? `${titleTa} - கிங்ஸ் 24x7 செய்திகள்` : (titleEn ? `${titleEn} - தமிழ் செய்திகள்` : ''));
    if (descTa.length < 90) {
      descTa = `${descTa} - கிங்ஸ் 24x7 செய்தித் தளத்தில் அண்மைச் செய்திகள் மற்றும் நேரடிச் செய்திகளை உடனுக்குடன் தெரிந்து கொள்ளுங்கள்.`.slice(0, 160);
    }

    let metaTitleTa = titleTa ? `${titleTa} | கிங்ஸ் 24x7 நேரலைச் செய்திகள்` : (form.metaTitleTa || '');
    if (metaTitleTa.length < 35) {
      metaTitleTa = `${metaTitleTa || titleEn || 'செய்திகள்'} | கிங்ஸ் 24x7 தமிழ் செய்திகள்`.slice(0, 68);
    }

    const wordsTaRaw = `${titleTa} ${cleanTa}`.split(/\s+/).filter(w => w.length > 3 && !/^[\x00-\x7F]+$/.test(w));
    const setTa = new Set(wordsTaRaw);
    if (catTa) setTa.add(catTa);
    if (distTa) setTa.add(distTa);
    if (city) setTa.add(city);
    setTa.add('செய்திகள்');
    setTa.add('தமிழ்நாடு');

    const keywordsTaArr = Array.from(setTa).filter(Boolean);
    const keywordsTa = keywordsTaArr.slice(0, 8).join(', ');
    const focusTa = keywordsTaArr.slice(0, 3).join(', ');

    // 2. English SEO Generation
    let descEn = cleanEn.slice(0, 155) || (titleEn ? `${titleEn} - Kings 24x7 News Update` : (titleTa ? `${titleTa} - Kings 24x7 Latest News` : ''));
    if (descEn.length < 90) {
      descEn = `${descEn} - Get the latest news and live updates on Kings 24x7, your trusted news source covering Politics, Cinema, Sports, Business, and more.`.slice(0, 160);
    }

    let metaTitleEn = titleEn ? `${titleEn} | Kings 24x7 Latest News` : (titleTa ? `${titleTa} | Kings 24x7 News` : (form.metaTitleEn || ''));
    if (metaTitleEn.length < 35) {
      metaTitleEn = `${metaTitleEn || 'Kings 24x7 News'} | Kings 24x7 Breaking Updates`.slice(0, 68);
    }

    const wordsEnRaw = `${titleEn} ${cleanEn}`.split(/\s+/).filter(w => w.length > 3 && /^[a-zA-Z0-9]+$/.test(w) && !/^(the|and|for|with|that|this|from|about|which|their|there|would|could|should|have|been|has|had)$/i.test(w));
    const setEn = new Set(wordsEnRaw);
    if (catEn) setEn.add(catEn);
    if (distEn) setEn.add(distEn);
    if (city) setEn.add(city);
    
    if (form.slug) {
      form.slug.split('-').filter(w => w.length > 2).forEach(w => setEn.add(w.charAt(0).toUpperCase() + w.slice(1)));
    }
    setEn.add('Tamil Nadu');
    setEn.add('Breaking News');
    setEn.add('Kings 24x7');
    setEn.add('Latest Updates');

    const keywordsEnArr = Array.from(setEn).filter(Boolean);
    const keywordsEn = keywordsEnArr.slice(0, 8).join(', ');
    const focusEn = keywordsEnArr.slice(0, 3).join(', ');

    // 3. Search Slug Generation & Dual-Language Combining
    const generatedSlug = form.slug ? slugify(form.slug) : slugify(titleEn || titleTa);
    const dualKeywords = [keywordsTa, keywordsEn].filter(Boolean).join(', ');
    const dualFocus = [focusTa, focusEn].filter(Boolean).join(', ');

    setForm(f => ({
      ...f,
      // Tamil SEO
      metaTitleTa: metaTitleTa,
      metaDescriptionTa: descTa,
      focusKeywordsTa: dualFocus || focusTa || keywordsTa,
      metaKeywordsTa: dualKeywords || keywordsTa || 'செய்திகள், தமிழ்நாடு, சென்னை',
      shortDescTa: f.shortDescTa || cleanTa.slice(0, 200),
      
      // English SEO
      metaTitleEn: metaTitleEn,
      metaDescriptionEn: descEn,
      focusKeywordsEn: dualFocus || focusEn || keywordsEn,
      metaKeywordsEn: dualKeywords || keywordsEn || 'Tamil Nadu, Breaking News, Politics, Latest Updates',
      shortDescEn: f.shortDescEn || cleanEn.slice(0, 200),

      // Unified Dual-Language Keywords across both tabs
      metaTitle: activeTab === 0 ? metaTitleTa : metaTitleEn,
      metaDescription: activeTab === 0 ? descTa : descEn,
      focusKeywords: dualFocus || focusTa || keywordsTa,
      metaKeywords: dualKeywords || keywordsTa || keywordsEn,
      slug: generatedSlug
    }));

    showMsg('⚡ Dual Language Auto-SEO generated: Tamil (🔴 தமிழ்) & English (🔵 English) Metadata Updated!');
  };

  // ── RankMath-Style Dynamic SEO Score & Readability Metrics Engine ──────────
  const getSeoMetrics = () => {
    const isTa = activeTab === 0;
    const title = (isTa ? form.titleTa : form.titleEn) || form.titleEn || form.titleTa || '';
    const metaTitle = (isTa ? (form.metaTitleTa || form.metaTitle) : (form.metaTitleEn || form.metaTitle)) || title || '';
    const metaDesc = (isTa ? (form.metaDescriptionTa || form.metaDescription) : (form.metaDescriptionEn || form.metaDescription)) || '';
    const content = (isTa
      ? (editorRefTa.current ? editorRefTa.current.getContent({ format: 'text' }) : form.contentTa) 
      : (editorRefEn.current ? editorRefEn.current.getContent({ format: 'text' }) : form.contentEn)) || '';

    const cleanContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    
    const words = cleanContent ? cleanContent.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;
    const sentenceCount = cleanContent ? (cleanContent.match(/[.!?]+(\s|$)/g) || []).length + 1 : 0;
    const paragraphCount = cleanContent ? cleanContent.split(/\n\s*\n/).filter(Boolean).length : 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    let score = 0;
    const checklist = [];

    if (metaTitle.length >= 35 && metaTitle.length <= 70) {
      score += 15;
      checklist.push({ label: 'Title length is optimal (35-70 chars)', pass: true });
    } else {
      checklist.push({ label: 'Title length should be between 35-70 characters', pass: false });
    }

    if (metaDesc.length >= 90 && metaDesc.length <= 165) {
      score += 15;
      checklist.push({ label: 'Meta Description length is optimal (90-165 chars)', pass: true });
    } else {
      checklist.push({ label: 'Meta Description should be between 90-165 characters', pass: false });
    }

    if (form.categoryId) {
      score += 15;
      checklist.push({ label: 'Primary Category assigned', pass: true });
    } else {
      checklist.push({ label: 'Assign a Category for proper site indexing', pass: false });
    }

    if (form.featuredImage || form.imageUrl) {
      score += 15;
      checklist.push({ label: 'Featured Image present', pass: true });
    } else {
      checklist.push({ label: 'Add a Featured Image for social sharing & SERP', pass: false });
    }

    if (form.focusKeywords || form.metaKeywords) {
      score += 15;
      checklist.push({ label: 'Focus / Meta Keywords defined', pass: true });
    } else {
      checklist.push({ label: 'Add Focus Keywords for search relevance', pass: false });
    }

    if (form.slug && form.slug.length >= 3) {
      score += 15;
      checklist.push({ label: 'Clean search-friendly URL slug', pass: true });
    } else {
      checklist.push({ label: 'Generate a clean URL slug', pass: false });
    }

    if (wordCount >= 100) {
      score += 10;
      checklist.push({ label: 'Content length meets depth standards (>100 words)', pass: true });
    } else {
      checklist.push({ label: 'Expand content depth (at least 100 words)', pass: false });
    }

    return {
      score: Math.min(100, score),
      wordCount,
      sentenceCount,
      paragraphCount,
      readingTime,
      checklist
    };
  };

  const isGenericKeyword = (kwStr) => {
    if (!kwStr || String(kwStr).trim().length === 0) return true;
    const lower = String(kwStr).toLowerCase().trim();
    const genericList = ['news', 'breaking', 'tamil nadu', 'breaking news', 'news tags', 'primary keywords', 'செய்திகள்', 'தமிழ்நாடு', 'அண்மைச்செய்தி', 'செய்தி', 'தமிழ்'];
    const items = lower.split(',').map(s => s.trim());
    const matchCount = items.filter(it => genericList.includes(it)).length;
    return matchCount >= items.length / 2;
  };

  const extractNewsKeywordsFromContent = (title = '', excerpt = '', content = '', lang = 'en') => {
    const combinedText = `${title} ${excerpt} ${(content || '').replace(/<[^>]*>/g, ' ')}`.trim();
    if (!combinedText || combinedText.length < 5) return { focusKeywords: '', metaKeywords: '' };

    const words = combinedText.split(/\s+/);
    const stopWordsEn = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'this', 'that', 'these', 'those', 'news', 'breaking', 'latest', 'update', 'said', 'also', 'which', 'their', 'there', 'they', 'other', 'more', 'some', 'than', 'them', 'first']);
    const stopWordsTa = new Set(['மற்றும்', 'ஒரு', 'என்று', 'இந்த', 'அந்த', 'என', 'அவர்', 'அவர்கள்', 'செய்தி', 'செய்திகள்', 'அண்மைச்செய்தி', 'போது', 'செய்து', 'உள்ளது', 'உள்ளனர்', 'குறித்து', 'ஆகிய', 'எனத்', 'முதல்', 'அனைத்து', 'எனவே', 'அரசு', 'நிலை', 'மறுபடி', 'இல்லை', 'வந்த', 'செய்ய', 'கொண்டு', 'பற்றி']);

    const stopWords = lang === 'ta' ? stopWordsTa : stopWordsEn;
    const isTa = lang === 'ta';
    const frequencyMap = new Map();

    const addTerm = (term, weight = 1) => {
      const cleanTerm = term.trim().replace(/^[^\w\u0B80-\u0BFF]+|[^\w\u0B80-\u0BFF]+$/g, '');
      if (!cleanTerm || cleanTerm.length < 3) return;
      const lower = cleanTerm.toLowerCase();
      if (stopWords.has(lower)) return;
      frequencyMap.set(cleanTerm, (frequencyMap.get(cleanTerm) || 0) + weight);
    };

    const titleWords = title.split(/\s+/);
    for (let i = 0; i < titleWords.length; i++) {
      addTerm(titleWords[i], 4);
      if (i < titleWords.length - 1) {
        const phrase = `${titleWords[i]} ${titleWords[i+1]}`;
        const parts = phrase.toLowerCase().split(' ');
        if (!parts.some(p => stopWords.has(p))) addTerm(phrase, 6);
      }
    }

    for (let i = 0; i < words.length; i++) {
      const w = words[i].replace(/^[^\w\u0B80-\u0BFF]+|[^\w\u0B80-\u0BFF]+$/g, '');
      if (!w || stopWords.has(w.toLowerCase())) continue;

      if (!isTa && /^[A-Z][a-z0-9]{2,}$/.test(w)) {
        addTerm(w, 3);
      } else if (isTa && w.length >= 3) {
        addTerm(w, 2);
      }

      if (i < words.length - 1) {
        const nextW = words[i+1].replace(/^[^\w\u0B80-\u0BFF]+|[^\w\u0B80-\u0BFF]+$/g, '');
        if (nextW && !stopWords.has(nextW.toLowerCase())) {
          if (!isTa && /^[A-Z]/.test(w) && /^[A-Z]/.test(nextW)) {
            addTerm(`${w} ${nextW}`, 5);
          } else if (isTa && w.length >= 3 && nextW.length >= 3) {
            addTerm(`${w} ${nextW}`, 4);
          }
        }
      }
    }

    const sorted = Array.from(frequencyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0]);

    const uniqueKeywords = [];
    for (const kw of sorted) {
      if (!uniqueKeywords.some(ex => ex.toLowerCase().includes(kw.toLowerCase()) || kw.toLowerCase().includes(ex.toLowerCase()))) {
        uniqueKeywords.push(kw);
      }
      if (uniqueKeywords.length >= 10) break;
    }

    const focusKeywords = uniqueKeywords.slice(0, 3).join(', ');
    const metaKeywords = uniqueKeywords.slice(0, 8).join(', ');

    return { focusKeywords, metaKeywords };
  };

  // ── 1-Click AI Proofread, Grammar Correction & Full Auto-Fill ───────────────
  const handleAiProofreadAndAutoFill = async () => {
    const taHtml = editorRefTa.current ? editorRefTa.current.getContent({ format: 'html' }) : form.contentTa;
    const enHtml = editorRefEn.current ? editorRefEn.current.getContent({ format: 'html' }) : form.contentEn;
    const sourceTexts = mediaList.filter(m => m.text).map(m => m.text).join('\n\n');
    
    const baseRaw = (taHtml || enHtml || sourceTexts || form.titleTa || form.titleEn || '').trim();
    if (!baseRaw || baseRaw.replace(/<[^>]*>/g, '').trim().length < 5) {
      showMsg('Please write or paste content in TinyMCE first, or upload a source document.', true);
      return;
    }

    setAiProofreading(true);
    showMsg('⚡ AI is proofreading content, correcting grammar, translating, and auto-filling all metadata...');

    const catNames = categories.map(c => `${c.id}:${c.nameEn || c.name}`).join(', ');
    const firstCategoryId = categories.length > 0 ? String(categories[0].id) : '';

    try {
      let raw = '';
      let isFallback = false;
      try {
        const res = await api.post('/admin/ai-config/proofread-autofill', {
          baseContent: baseRaw,
          categoryList: catNames
        });
        raw = res.data?.resultText || '';
      } catch (proxyErr) {
        console.warn('Backend proxy AI call failed, attempting direct Gemini call...', proxyErr);
      }

      if (!raw) {
        const prompt = `You are a professional Tamil & English chief news editor for Kings 24x7. Analyze this article draft:\n"${baseRaw.substring(0, 3000)}"\nAvailable Categories: [${catNames}]\nPerform the following:\n1. Proofread and correct grammar/spelling in English AND translate/proofread into high-quality Tamil.\n2. Create production-ready HTML for contentTa (Tamil) and contentEn (English).\n3. Create proper headlines (titleTa in Tamil, titleEn in English).\n4. Create 1-2 sentence excerpts (shortDescTa in Tamil, shortDescEn in English).\n5. Create HIGH-IMPACT SEO metadata extracted DIRECTLY from the provided content:\n   - metaKeywordsTa: 6-10 comma-separated prominent news tags/entities in TAMIL script extracted from content (proper nouns, locations, politician/event terms). Do NOT use generic words like "செய்திகள்" or "தமிழ்நாடு".\n   - metaKeywordsEn: 6-10 comma-separated prominent news tags/entities in ENGLISH extracted from content. Do NOT use generic words like "news" or "breaking".\n   - focusKeywordsTa: 2-4 main focus keyphrases in TAMIL script extracted from headline & key topic.\n   - focusKeywordsEn: 2-4 main focus keyphrases in ENGLISH extracted from headline & key topic.\n   - metaTitleTa: SEO title in TAMIL\n   - metaTitleEn: SEO title in ENGLISH\n   - metaDescriptionTa: SEO description in TAMIL\n   - metaDescriptionEn: SEO description in ENGLISH\n\nRespond in strictly valid JSON format with keys: titleTa, titleEn, contentTa, contentEn, shortDescTa, shortDescEn, metaTitleTa, metaTitleEn, metaDescriptionTa, metaDescriptionEn, focusKeywordsTa, focusKeywordsEn, metaKeywordsTa, metaKeywordsEn, slug, categoryId, suggestedSource, suggestedLocation.`;
        try {
          raw = await callGemini(prompt);
        } catch (e) {
          console.warn('Browser Gemini fallback failed:', e);
        }
      }

      let parsed = cleanAndParseJson(raw);

      setForm(f => {
        // ── 1. Smart Category Resolver ──────────────────────────────────────
        let matchedCatId = f.categoryId;
        if (parsed.categoryId && categories.length > 0) {
          const catStr = String(parsed.categoryId).trim().toLowerCase();
          const found = categories.find(c =>
            String(c.id) === catStr ||
            catStr.startsWith(String(c.id) + ':') ||
            (c.slug && c.slug.toLowerCase() === catStr) ||
            (c.name && c.name.toLowerCase() === catStr) ||
            (c.nameEn && c.nameEn.toLowerCase() === catStr) ||
            (c.nameTa && c.nameTa.toLowerCase() === catStr) ||
            (c.nameEn && catStr.includes(c.nameEn.toLowerCase())) ||
            (c.name && catStr.includes(c.name.toLowerCase()))
          );
          if (found) matchedCatId = String(found.id);
        }
        if (!matchedCatId && firstCategoryId) matchedCatId = firstCategoryId;

        // ── 2. Featured Image ──────────────────────────────────────────────
        const firstImg = (mediaList || []).find(m => m.url)?.url || '';
        const PLACEHOLDER = 'https://kings24x7.com/assets/placeholder-news.jpg';
        const updatedImg = f.featuredImage || f.imageUrl || firstImg || PLACEHOLDER;

        // ── 3. Meta Title & Meta Description ──────────
        let metaTitleEn = parsed.metaTitleEn || parsed.metaTitle || parsed.titleEn || f.titleEn || '';
        let metaTitleTa = parsed.metaTitleTa || parsed.metaTitle || parsed.titleTa || f.titleTa || '';

        let metaDescEn = parsed.metaDescriptionEn || parsed.metaDescription || parsed.shortDescEn || f.metaDescriptionEn || '';
        let metaDescTa = parsed.metaDescriptionTa || parsed.metaDescription || parsed.shortDescTa || f.metaDescriptionTa || '';

        // ── 4. Article Content ──────────
        let finalContentEn = parsed.contentEn || f.contentEn || '';
        let finalContentTa = parsed.contentTa || f.contentTa || '';

        // ── 5. Dynamic Content-Extracted Meta Keywords & Focus Keywords ──────────
        let metaKeywordsTa = parsed.metaKeywordsTa || f.metaKeywordsTa || '';
        let focusKeywordsTa = parsed.focusKeywordsTa || f.focusKeywordsTa || '';
        let metaKeywordsEn = parsed.metaKeywordsEn || parsed.metaKeywords || f.metaKeywordsEn || '';
        let focusKeywordsEn = parsed.focusKeywordsEn || parsed.focusKeywords || f.focusKeywordsEn || '';

        const extractedTa = extractNewsKeywordsFromContent(parsed.titleTa || f.titleTa, parsed.shortDescTa || f.shortDescTa, finalContentTa, 'ta');
        const extractedEn = extractNewsKeywordsFromContent(parsed.titleEn || f.titleEn, parsed.shortDescEn || f.shortDescEn, finalContentEn, 'en');

        if (isGenericKeyword(metaKeywordsTa) || !metaKeywordsTa) metaKeywordsTa = extractedTa.metaKeywords || extractedEn.metaKeywords;
        if (isGenericKeyword(focusKeywordsTa) || !focusKeywordsTa) focusKeywordsTa = extractedTa.focusKeywords || extractedEn.focusKeywords;

        if (isGenericKeyword(metaKeywordsEn) || !metaKeywordsEn) metaKeywordsEn = extractedEn.metaKeywords || extractedTa.metaKeywords;
        if (isGenericKeyword(focusKeywordsEn) || !focusKeywordsEn) focusKeywordsEn = extractedEn.focusKeywords || extractedTa.focusKeywords;

        return {
          ...f,
          titleTa: parsed.titleTa || f.titleTa,
          titleEn: parsed.titleEn || f.titleEn,
          contentTa: finalContentTa,
          contentEn: finalContentEn,
          shortDescTa: parsed.shortDescTa || f.shortDescTa,
          shortDescEn: parsed.shortDescEn || f.shortDescEn,
          metaTitle: activeTab === 0 ? metaTitleTa : metaTitleEn,
          metaTitleTa: metaTitleTa,
          metaTitleEn: metaTitleEn,
          metaDescription: activeTab === 0 ? metaDescTa : metaDescEn,
          metaDescriptionTa: metaDescTa,
          metaDescriptionEn: metaDescEn,
          focusKeywords: activeTab === 0 ? focusKeywordsTa : focusKeywordsEn,
          focusKeywordsTa: focusKeywordsTa,
          focusKeywordsEn: focusKeywordsEn,
          metaKeywords: activeTab === 0 ? metaKeywordsTa : metaKeywordsEn,
          metaKeywordsTa: metaKeywordsTa,
          metaKeywordsEn: metaKeywordsEn,
          slug: parsed.slug || f.slug,
          categoryId: matchedCatId,
          featuredImage: updatedImg,
          imageUrl: updatedImg,
          reporterName: f.reporterName || parsed.suggestedSource || 'Kings TV Desk',
          constituency: f.constituency || parsed.suggestedLocation || ''
        };
      });

      if (editorRefTa.current && parsed.contentTa) editorRefTa.current.setContent(parsed.contentTa);
      if (editorRefEn.current && parsed.contentEn) editorRefEn.current.setContent(parsed.contentEn);

      showMsg('⚡ AI Grammar Check, Translation & Auto-Fill completed! All fields verified and filled.');
    } catch (err) {
      console.error(err);
      const errDetail = err.response?.data?.message || err.message || 'Please check Gemini API Key in settings.';
      showMsg(`AI Auto-Fill error: ${errDetail}`, true);
    } finally {
      setAiProofreading(false);
    }
  };

  // ── Helper to Clean and Extract Translation Fields ─────────────────────────
  const cleanAndExtractTranslation = (rawText) => {
    let title = '';
    let excerpt = '';
    let content = '';

    if (!rawText) return { title, excerpt, content };

    let clean = String(rawText).trim();

    // Strip markdown code blocks ```json ... ```
    if (clean.startsWith('```json')) {
      clean = clean.substring(7);
    } else if (clean.startsWith('```')) {
      clean = clean.substring(3);
    }
    if (clean.endsWith('```')) {
      clean = clean.substring(0, clean.length - 3);
    }
    clean = clean.trim();

    // Try parsing as JSON object
    try {
      const parsed = JSON.parse(clean);
      if (parsed && typeof parsed === 'object') {
        title = parsed.title || parsed.titleEn || parsed.titleTa || '';
        excerpt = parsed.excerpt || parsed.excerptEn || parsed.excerptTa || parsed.shortDescEn || parsed.shortDescTa || '';
        content = parsed.content || parsed.contentEn || parsed.contentTa || '';
      }
    } catch (e) {
      // Regex JSON extraction fallback
      const titleMatch = clean.match(/"title"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"excerpt"|\s*,\s*"content"|\s*})/i);
      const excerptMatch = clean.match(/"excerpt"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"content"|\s*})/i);
      const contentMatch = clean.match(/"content"\s*:\s*"([\s\S]*?)"(?=\s*})/i);

      if (titleMatch) title = titleMatch[1];
      if (excerptMatch) excerpt = excerptMatch[1];
      if (contentMatch) content = contentMatch[1];
    }

    // Legacy format fallback (TITLE: ... EXCERPT: ... CONTENT: ...)
    if (!title && !excerpt && !content) {
      const tMatch = clean.match(/TITLE:\s*([\s\S]*?)(?=\n\nEXCERPT:|\n\nCONTENT:|$)/i);
      const eMatch = clean.match(/EXCERPT:\s*([\s\S]*?)(?=\n\nCONTENT:|$)/i);
      const cMatch = clean.match(/CONTENT:\s*([\s\S]*)$/i);

      if (tMatch) title = tMatch[1];
      if (eMatch) excerpt = eMatch[1];
      if (cMatch) content = cMatch[1];

      if (!title && !excerpt && !content) {
        content = clean;
      }
    }

    // Strip ALL placeholder / template tags
  const safeUrlDecode = (str) => {
    if (!str || typeof str !== 'string') return str || '';
    let result = str;
    if (result.includes('%')) {
      try {
        if (/%[0-9A-Fa-f]{2}/.test(result)) {
          result = decodeURIComponent(result);
          if (/%[0-9A-Fa-f]{2}/.test(result)) {
            result = decodeURIComponent(result);
          }
        }
      } catch (e) {
        console.warn('URL decode failed:', e);
      }
    }
    return result;
  };

    const badRegex = /\[Translated Title\]|\[Translated Excerpt\]|\[Translated HTML Paragraphs\]|\[Translated Content\]|English translated headline|English translated summary|English translated HTML content|Tamil translated headline|Tamil translated summary|Tamil translated HTML content|Original Text:|Text to Translate:|Source Content:|TITLE:|EXCERPT:|CONTENT:/gi;
    title = safeUrlDecode(title).replace(badRegex, '').trim();
    excerpt = safeUrlDecode(excerpt).replace(badRegex, '').trim();
    content = safeUrlDecode(content).replace(badRegex, '').trim();

    if (content && !content.startsWith('<') && !content.startsWith('&lt;')) {
      content = `<p>${content}</p>`;
    }

    return { title, excerpt, content };
  };

  // ── Google GTX Zero-Failure Translation Fallback Engine ───────────────────
  const fetchSingleGoogleGtx = async (plainText, targetLang) => {
    if (!plainText || !plainText.trim()) return '';
    const clean = safeUrlDecode(plainText.trim());
    const maxLen = 1000;
    const chunks = [];
    for (let i = 0; i < clean.length; i += maxLen) {
      chunks.push(clean.substring(i, i + maxLen));
    }
    const translatedChunks = [];
    for (const chunk of chunks) {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data[0]) {
          const str = data[0].map(item => (item && item[0]) ? item[0] : '').join('');
          translatedChunks.push(safeUrlDecode(str || chunk));
        } else {
          translatedChunks.push(safeUrlDecode(chunk));
        }
      } catch (err) {
        console.error('Google GTX error:', err);
        translatedChunks.push(safeUrlDecode(chunk));
      }
    }
    return safeUrlDecode(translatedChunks.join(' '));
  };

  const fetchGoogleGtxTranslation = async (text, targetLang) => {
    if (!text || !text.trim()) return '';
    const raw = text.trim();

    if (raw.includes('<p>') || raw.includes('<P>') || raw.includes('<div') || raw.includes('<li')) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(raw, 'text/html');
        const elements = Array.from(doc.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6'));
        if (elements.length > 0) {
          for (const el of elements) {
            const txt = el.innerText.trim();
            if (txt) {
              const trans = await fetchSingleGoogleGtx(txt, targetLang);
              if (trans) el.innerText = trans;
            }
          }
          return doc.body.innerHTML;
        }
      } catch (e) {
        console.warn('HTML translation fallback warning:', e);
      }
    }

    const plain = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const trans = await fetchSingleGoogleGtx(plain, targetLang);
    return trans ? `<p>${trans}</p>` : raw;
  };

  const validateTargetLanguage = (title, excerpt, content, targetLang) => {
    const plainTitle = (title || '').replace(/<[^>]*>/g, '').trim();
    const plainExcerpt = (excerpt || '').replace(/<[^>]*>/g, '').trim();
    const plainContent = (content || '').replace(/<[^>]*>/g, '').trim();
    const combined = (plainTitle + ' ' + plainExcerpt + ' ' + plainContent).replace(/[0-9\s\p{P}\p{S}]/gu, '');

    if (!combined || combined.length < 2) return false;

    if (targetLang === 'en') {
      const hasTamil = /[\u0B80-\u0BFF]/.test(combined);
      const hasEnglish = /[a-zA-Z]{2,}/.test(combined);
      const isNotPlaceholder = !plainTitle.toLowerCase().includes('english translated') && 
                               !plainContent.toLowerCase().includes('english translated');
      return !hasTamil && hasEnglish && isNotPlaceholder;
    } else {
      const hasTamil = /[\u0B80-\u0BFF]/.test(combined);
      const isNotPlaceholder = !plainTitle.toLowerCase().includes('tamil translated') && 
                               !plainContent.toLowerCase().includes('tamil translated');
      return hasTamil && isNotPlaceholder;
    }
  };

  // ── Auto Translate Title, Excerpt, Content ─────────────────────────────────
  const handleAutoTranslate = async (direction) => {
    setIsTranslating(true);
    const targetLang = direction === 'ta2en' ? 'en' : 'ta';
    showMsg(`⚡ Translating content to ${targetLang === 'en' ? 'English' : 'Tamil'}...`);
    try {
      const sourceTitle = direction === 'ta2en' ? form.titleTa : form.titleEn;
      const sourceExcerpt = direction === 'ta2en' ? form.shortDescTa : form.shortDescEn;
      const sourceContent = direction === 'ta2en' ? (editorRefTa.current ? editorRefTa.current.getContent() : form.contentTa) : (editorRefEn.current ? editorRefEn.current.getContent() : form.contentEn);

      if ((!sourceTitle || sourceTitle.length < 2) && (!sourceExcerpt || sourceExcerpt.length < 2) && (!sourceContent || sourceContent.length < 5)) {
        showMsg('Please write some content to translate first.', true);
        setIsTranslating(false);
        return;
      }

      const inputPayload = JSON.stringify({
        title: sourceTitle || '',
        excerpt: sourceExcerpt || '',
        content: sourceContent || ''
      });

      let rawResponse = '';
      let backendErrorMsg = '';
      let geminiErrorMsg = '';

      try {
        const res = await api.post('/articles/ai-assist', {
          action: 'translate',
          context: direction,
          text: inputPayload
        });
        if (res.data && !res.data.error && res.data.result) {
          rawResponse = res.data.result;
        } else if (res.data && res.data.message) {
          backendErrorMsg = res.data.message;
        }
      } catch (backendErr) {
        console.warn('Backend translation failed, falling back to direct browser Gemini call...', backendErr);
        backendErrorMsg = backendErr.response?.data?.message || backendErr.message || '';
      }

      // If backend call failed or returned empty result, fallback to client-side Gemini
      if (!rawResponse) {
        try {
          const prompt = `You are a professional chief news editor and translator for KINGS 24x7 news.
Translate the following ${direction === 'ta2en' ? 'Tamil news article into clear, publication-ready English (AP news style)' : 'English news article into natural news Tamil'}.

Source Title: ${sourceTitle || ''}
Source Excerpt: ${sourceExcerpt || ''}
Source Content: ${sourceContent || ''}

RULES FOR TRANSLATION:
1. Translate the ACTUAL text in Source Title and Source Content.
2. Preserve all HTML tags (<p>, <strong>, <em>, <br>).
3. Respond ONLY with a valid JSON object in this exact structure:
{
  "title": "...",
  "excerpt": "...",
  "content": "<p>...</p>"
}
4. CRITICAL: Do NOT output placeholder text, schema instructions, or labels like "English translated headline". Return ONLY the JSON object.`;

          rawResponse = await callGemini(prompt);
        } catch (geminiErr) {
          console.warn('Direct Gemini fallback failed:', geminiErr);
          geminiErrorMsg = geminiErr.message || '';
        }
      }

      let { title: newTitle, excerpt: newExcerpt, content: newContent } = cleanAndExtractTranslation(rawResponse);

      // ── Target Language Validation & Zero-Failure Fallback Guard ──────────
      let isValidTargetLang = validateTargetLanguage(newTitle, newExcerpt, newContent, targetLang);

      // If translation failed, returned non-target language text, or returned placeholder text: run Google Translate GTX
      if (!isValidTargetLang || !newTitle || newTitle.trim().length === 0) {
        console.warn(`Translation output invalid for ${direction}. Executing Google Translate GTX fallback...`);
        try {
          if (sourceTitle && sourceTitle.trim()) {
            newTitle = await fetchSingleGoogleGtx(sourceTitle, targetLang);
          }
          if (sourceExcerpt && sourceExcerpt.trim()) {
            newExcerpt = await fetchSingleGoogleGtx(sourceExcerpt, targetLang);
          } else if (sourceContent && sourceContent.trim()) {
            const tempEx = await fetchSingleGoogleGtx(sourceContent, targetLang);
            newExcerpt = tempEx.length > 180 ? tempEx.substring(0, 180) + '...' : tempEx;
          }
          if (sourceContent && sourceContent.trim()) {
            newContent = await fetchGoogleGtxTranslation(sourceContent, targetLang);
          }
        } catch (gtxErr) {
          console.error('Google GTX fallback failed:', gtxErr);
        }
      }

      if (!newTitle && !newExcerpt && !newContent) {
        let finalError = 'Translation service returned empty content.';
        if (backendErrorMsg) finalError += ` (Backend Error: ${backendErrorMsg})`;
        if (geminiErrorMsg) finalError += ` (Direct Fallback Error: ${geminiErrorMsg})`;
        showMsg(`Translation error: ${finalError}`, true);
        setIsTranslating(false);
        return;
      }

      newTitle = safeUrlDecode(newTitle);
      newExcerpt = safeUrlDecode(newExcerpt);
      newContent = safeUrlDecode(newContent);

      if (direction === 'ta2en') {
        setForm(f => ({
          ...f,
          titleEn: newTitle || f.titleEn,
          shortDescEn: newExcerpt || f.shortDescEn,
          contentEn: newContent || f.contentEn,
          metaTitleEn: newTitle || f.metaTitleEn,
          metaDescriptionEn: newExcerpt || f.metaDescriptionEn
        }));
        if (editorRefEn.current && newContent) {
          editorRefEn.current.setContent(newContent);
        }
        setActiveTab(1);
      } else {
        setForm(f => ({
          ...f,
          titleTa: newTitle || f.titleTa,
          shortDescTa: newExcerpt || f.shortDescTa,
          contentTa: newContent || f.contentTa,
          metaTitleTa: newTitle || f.metaTitleTa,
          metaDescriptionTa: newExcerpt || f.metaDescriptionTa
        }));
        if (editorRefTa.current && newContent) {
          editorRefTa.current.setContent(newContent);
        }
        setActiveTab(0);
      }

      showMsg(`✅ Content translated successfully to ${direction === 'ta2en' ? 'English' : 'Tamil'}!`);
    } catch (e) {
      console.error('Translation failed:', e);
      showMsg('Translation failed: ' + e.message, true);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async (statusOverride) => {
    const finalStatus = statusOverride || form.status;

    // 1. Mandatory Validation Guardrails
    const title = (form.titleEn || form.titleTa || '').trim();
    if (!title) {
      showMsg('Validation Error: Article Title (English or Tamil) is required.', true);
      return;
    }
    if (!form.categoryId) {
      showMsg('Validation Error: Please select a Category for the article.', true);
      return;
    }

    // 2. Role-Based Editorial Workflow Guard
    const userRole = user?.role ? String(user.role).replace(/^ROLE_/, '') : '';
    const isChiefOrAdmin = ['SUPER_ADMIN', 'CHIEF_EDITOR', 'ADMIN'].includes(userRole);
    let targetStatus = finalStatus;
    if (finalStatus === 'published' && !isChiefOrAdmin) {
      targetStatus = 'pending_review';
    }

    // --- Content Moderation: Pre-Save Block & Sanitize ---
    if (detectedWords.length > 0) {
      if (targetStatus === 'published' || targetStatus === 'pending_review') {
        // Publish button is already disabled when hasProfanity; this guard handles direct calls
        showMsg(`⛔ Cannot publish: article contains prohibited words (${detectedWords.join(', ')}). Please fix them first.`, true);
        api.post('/admin/profanity/public/log-event', { action: 'BLOCKED', details: `Blocked publish attempt containing: ${detectedWords.join(', ')}` }).catch(()=>{});
        setSaving(false);
        return;
      } else if (targetStatus === 'draft') {
        showMsg('Draft saved with content moderation warnings.', true);
        api.post('/admin/profanity/public/log-event', { action: 'IGNORED', details: `Draft saved with warnings: ${detectedWords.join(', ')}` }).catch(()=>{});
      }
    }

    // Clean out highlight spans before saving
    const cleanContent = (html) => html ? html.replace(/<span class="profanity-highlight"[^>]*>(.*?)<\/span>/gi, '$1') : html;
    let finalContentTa = cleanContent(editorRefTa.current ? editorRefTa.current.getContent() : form.contentTa);
    let finalContentEn = cleanContent(editorRefEn.current ? editorRefEn.current.getContent() : form.contentEn);

    let finalTitleTa = (form.titleTa || '').trim();
    let finalTitleEn = (form.titleEn || '').trim();
    let finalDescTa = (form.shortDescTa || '').trim();
    let finalDescEn = (form.shortDescEn || '').trim();

    // Cross-populate missing language fields so content & title are NEVER missing in DB
    if (!finalContentTa && finalContentEn) finalContentTa = finalContentEn;
    if (!finalContentEn && finalContentTa) finalContentEn = finalContentTa;
    if (!finalTitleTa && finalTitleEn) finalTitleTa = finalTitleEn;
    if (!finalTitleEn && finalTitleTa) finalTitleEn = finalTitleTa;
    if (!finalDescTa && finalDescEn) finalDescTa = finalDescEn;
    if (!finalDescEn && finalDescTa) finalDescEn = finalDescTa;

    // 3. Ensure valid unique slug
    let finalSlug = form.slug ? slugify(form.slug) : slugify(title);
    if (!finalSlug) finalSlug = `article-${Date.now()}`;

    const toCommaString = (val) => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join(', ').slice(0, 240);
      if (typeof val === 'string') return val.slice(0, 240);
      return String(val).slice(0, 240);
    };

    const cleanLong = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    setSaving(true);
    setMsg(null);
    try {
      const payload = { 
        ...form, 
        categoryId: cleanLong(form.categoryId),
        subcategoryId: cleanLong(form.subcategoryId),
        districtId: cleanLong(form.districtId),
        titleTa: finalTitleTa,
        titleEn: finalTitleEn,
        shortDescTa: finalDescTa,
        shortDescEn: finalDescEn,
        metaKeywords: toCommaString(form.metaKeywords || form.focusKeywords),
        metaKeywordsTa: toCommaString(form.metaKeywordsTa || form.focusKeywordsTa),
        metaKeywordsEn: toCommaString(form.metaKeywordsEn || form.focusKeywordsEn),
        focusKeywords: toCommaString(form.focusKeywords || form.metaKeywords),
        focusKeywordsTa: toCommaString(form.focusKeywordsTa || form.metaKeywordsTa),
        focusKeywordsEn: toCommaString(form.focusKeywordsEn || form.metaKeywordsEn),
        imageUrl: form.imageUrl || form.featuredImage,
        featuredImage: form.featuredImage || form.imageUrl,
        slug: finalSlug,
        status: targetStatus,
        contentTa: finalContentTa,
        contentEn: finalContentEn
      };
      if (!payload.publishedAt) delete payload.publishedAt;
      
      let res;
      if (isEdit) {
        res = await api.put(`/articles/${id}`, payload);
      } else {
        res = await api.post('/articles', payload);
      }
      
      // Clear local draft backup after successful save/publish
      const draftKey = `news_editor_draft_${isEdit ? id : 'new'}`;
      localStorage.removeItem(draftKey);
      setHasDraftBackup(false);

      const successLabel = targetStatus === 'published' 
        ? 'published' 
        : (targetStatus === 'pending_review' ? 'submitted for Chief Editor review' : 'saved as draft');
      showMsg(`Article ${successLabel} successfully!`);

      if (targetStatus === 'published' || targetStatus === 'pending_review') {
        setTimeout(() => navigate('/admin/news'), 1500);
      } else if (!isEdit && res.data?.id) {
        setTimeout(() => navigate(`/admin/news/${res.data.id}/edit`), 1500);
      }
    } catch (err) {
      const errDetail = err.response?.data?.message || err.message || 'Failed to save article.';
      showMsg(`Save Error: ${errDetail}`, true);
    } finally {
      setSaving(false);
    }
  };

  // ── TinyMCE Setup ──────────────────────────────────────────────────────────
  const tinyInit = (lang) => ({
    height: 600,
    menubar: false,
    extended_valid_elements: 'video[src|controls|width|height|style|class|type],audio[src|controls|style|class],source[src|type],iframe[src|width|height|frameborder|allowfullscreen|style|class],div[*],a[*],span[*],img[*],figure[*],figcaption[*]',
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount', 'quickbars'
    ],
    automatic_uploads: true,
    images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', blobInfo.blob(), blobInfo.filename());
      api.post('/articles/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) progress(Math.round((e.loaded / e.total) * 100));
        }
      })
      .then(res => {
        if (res.data && res.data.url) {
          let imgUrl = res.data.url;
          if (imgUrl.startsWith('http://localhost:8080')) {
            imgUrl = imgUrl.replace('http://localhost:8080', '');
          }
          resolve(imgUrl);
        } else {
          reject('Image upload failed: Invalid response from server');
        }
      })
      .catch(err => {
        const msg = err.response?.data?.message || err.message || 'Server upload error';
        reject('Image upload failed: ' + msg);
      });
    }),
    image_advtab: true,
    toolbar: 'formatselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media blockquote add_draggable_box add_columns | undo redo | fullscreen code',
    quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
    contextmenu: 'link image table',
    skin: document.documentElement.classList.contains('dark') ? 'oxide-dark' : 'oxide',
    content_css: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
    content_style: `
      body { font-family:Inter,Outfit,-apple-system,BlinkMacSystemFont,sans-serif; font-size:16px; line-height: 1.6; padding: 12px; } 
      .ai-suggestion { background: rgba(16, 185, 129, 0.15); border-bottom: 2px solid #10B981; cursor: pointer; }
      .document-card { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; margin: 16px 0; }
      .article-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 20px 0; }
      video, audio, img, iframe { max-width: 100%; border-radius: 8px; }
      .layout-grid { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0; }
      .layout-col { flex: 1; min-width: 250px; padding: 10px; border: 1px dashed #cbd5e1; border-radius: 8px; }
      .draggable-box { position: absolute; z-index: 50; padding: 10px; border: 2px dashed #4F46E5; background: rgba(255,255,255,0.85); cursor: move; min-width: 150px; min-height: 50px; font-weight: bold; resize: both; overflow: auto; }
    `,
    setup: (editor) => {
      // Draggable Box Tool
      editor.ui.registry.addButton('add_draggable_box', {
        icon: 'comment-add',
        tooltip: 'Add Freely Movable Text Box',
        onAction: () => {
          editor.insertContent('<div class="draggable-box" style="left: 50px; top: 50px;"><br data-mce-bogus="1"></div><br/>');
        }
      });
      
      let isDragging = false;
      let hasMoved = false;
      let dragEl = null;
      let offsetX = 0;
      let offsetY = 0;

      editor.on('init', () => {
        const doc = editor.getDoc();
        
        // Prevent native browser drag-and-drop from cloning the box
        doc.addEventListener('dragstart', (e) => {
          if (e.target.classList && e.target.classList.contains('draggable-box')) {
            e.preventDefault();
          }
        });
        
        doc.addEventListener('mousedown', (e) => {
          if (e.target.classList && e.target.classList.contains('draggable-box')) {
            const rect = e.target.getBoundingClientRect();
            
            // If clicking the bottom-right corner (resize handle), do not trigger drag
            const isResizeHandle = (e.clientX >= rect.right - 20) && (e.clientY >= rect.bottom - 20);
            if (isResizeHandle) {
              return; // Let native CSS resize take over
            }
            
            isDragging = true;
            hasMoved = false;
            dragEl = e.target;
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
          }
        });
        doc.addEventListener('mousemove', (e) => {
          if (isDragging && dragEl) {
            hasMoved = true;
            const scrollY = doc.defaultView.scrollY || doc.documentElement.scrollTop;
            const scrollX = doc.defaultView.scrollX || doc.documentElement.scrollLeft;
            
            let rawLeft = e.clientX + scrollX - offsetX;
            let rawTop = e.clientY + scrollY - offsetY;
            
            let bodyWidth = doc.body.clientWidth || 800;
            let leftPercent = (rawLeft / bodyWidth) * 100;
            
            editor.dom.setStyle(dragEl, 'left', leftPercent + '%');
            editor.dom.setStyle(dragEl, 'top', rawTop + 'px');
          }
        });
        doc.addEventListener('mouseup', () => {
          if (isDragging && dragEl) {
            // ONLY save the whole HTML if it was actually dragged.
            // If they just clicked it to type, DO NOT reset content as it destroys cursor.
            if (hasMoved) {
              const rawHtml = editor.getBody().innerHTML;
              editor.setContent(rawHtml);
              
              setForm(prev => ({
                ...prev,
                [activeTab === 0 ? 'contentTa' : 'contentEn']: rawHtml
              }));
              
              editor.setDirty(true);
              editor.fire('change');
            }
          }
          isDragging = false;
          hasMoved = false;
          dragEl = null;
        });
      });

      // Add Two-Column Layout Button
      editor.ui.registry.addButton('add_columns', {
        icon: 'table',
        tooltip: 'Insert Side-by-Side Image & Text Layout',
        onAction: () => {
          editor.insertContent(`
            <div class="layout-grid">
              <div class="layout-col"><p><em>[Insert Image Here]</em></p></div>
              <div class="layout-col"><p><strong>Type your text here...</strong></p></div>
            </div>
            <p><br></p>
          `);
        }
      });
      // AI Context Toolbar definition
      editor.ui.registry.addButton('ai_fix', { icon: 'format-painter', tooltip: 'Fix Grammar', onAction: () => handleAiInlineAction(editor, 'grammar', lang) });
      editor.ui.registry.addButton('ai_rephrase', { icon: 'change-case', tooltip: 'Rephrase', onAction: () => handleAiInlineAction(editor, 'rephrase', lang) });
      editor.ui.registry.addButton('ai_summarize', { icon: 'align-left', tooltip: 'Summarize', onAction: () => handleAiInlineAction(editor, 'summarize', lang) });
      editor.ui.registry.addButton('ai_expand', { icon: 'add-row-bottom', tooltip: 'Expand', onAction: () => handleAiInlineAction(editor, 'expand', lang) });
      editor.ui.registry.addButton('ai_translate', { icon: 'translate', tooltip: 'Translate', onAction: () => handleAiInlineAction(editor, 'translate', lang) });
      
      editor.ui.registry.addContextToolbar('ai_selection', {
        predicate: (node) => !editor.selection.isCollapsed() && !node.classList.contains('ai-suggestion'),
        items: 'ai_fix ai_rephrase ai_summarize ai_expand ai_translate',
        position: 'selection',
        scope: 'editor'
      });

      // Accept/Reject Toolbar for applied AI suggestions
      editor.ui.registry.addButton('ai_accept', { icon: 'check', text: 'Accept', onAction: () => handleAcceptReject(editor, true) });
      editor.ui.registry.addButton('ai_reject', { icon: 'close', text: 'Reject', onAction: () => handleAcceptReject(editor, false) });
      
      editor.ui.registry.addContextToolbar('ai_decision', {
        predicate: (node) => node.classList.contains('ai-suggestion'),
        items: 'ai_accept ai_reject',
        position: 'node',
        scope: 'node'
      });
    }
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Hidden File Inputs for Media Upload Toolbar */}
      <input type="file" ref={mediaInputRef} onChange={handleAddMedia} accept="image/*" multiple style={{ display: 'none' }} />
      <input type="file" ref={videoInputRef} onChange={handleAddVideoFile} accept="video/*" style={{ display: 'none' }} />
      <input type="file" ref={audioInputRef} onChange={handleAddAudio} accept="audio/*" style={{ display: 'none' }} />
      <input type="file" ref={docInputRef} onChange={handleAddDocument} accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx" style={{ display: 'none' }} />
      <input type="file" ref={galleryInputRef} onChange={handleUploadGalleryModalFiles} accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx" multiple style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/admin/news')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Article' : 'Write New Article'}
          </h1>
        </div>

      {/* Local Draft Recovery Banner */}
      {hasDraftBackup && (
        <div style={{
          background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '8px',
          padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', color: '#92400E', fontSize: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RotateCcw size={18} color="#D97706" />
            <span>
              <strong>Unsaved Draft Backup Found:</strong> An unsaved draft from {draftSavedTime} was recovered from your local session.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleRestoreDraft}
              style={{
                padding: '6px 14px', background: '#D97706', color: '#ffffff',
                border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px'
              }}
            >
              Restore Unsaved Draft
            </button>
            <button
              onClick={handleDiscardDraft}
              style={{
                padding: '6px 14px', background: 'transparent', color: '#92400E',
                border: '1px solid #D97706', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px'
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => {
            const previewWin = window.open('about:blank', '_blank');
            previewWin.document.write(`<html><head><title>Preview</title></head><body style="max-width:800px; margin:0 auto; padding:40px; font-family:sans-serif;"><h1>${form.titleEn || form.titleTa || 'Untitled'}</h1>${form.contentEn || form.contentTa}</body></html>`);
          }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
            Preview
          </button>
          
          <button onClick={() => handleSave('draft')} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
            <Save size={16} /> Save Draft
          </button>
          
          <button
            onClick={() => handleSave('published')}
            disabled={saving || hasProfanity}
            title={hasProfanity ? `Cannot publish: article has prohibited words — ${detectedWords.join(', ')}` : ''}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: hasProfanity ? '#94a3b8' : '#2563EB', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: hasProfanity ? 'not-allowed' : 'pointer', fontWeight: 600, boxShadow: hasProfanity ? 'none' : '0 2px 4px rgba(37,99,235,0.3)', opacity: hasProfanity ? 0.7 : 1, transition: 'all 0.2s' }}
          >
            <Send size={16} /> {saving ? 'Saving...' : hasProfanity ? '🚫 Publish Blocked' : 'Publish Now'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ padding: '12px 16px', marginBottom: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', background: msg.type === 'error' ? '#FEF2F2' : '#ECFDF5', color: msg.type === 'error' ? '#DC2626' : '#059669', border: `1px solid ${msg.type === 'error' ? '#FCA5A5' : '#6EE7B7'}` }}>
          {msg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {msg.text}
        </div>
      )}

      {/* Main Grid: 8px aligned */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '24px', alignItems: 'start', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        
        {/* Left Column: Editor & Media */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          

          {/* AI Master Control Panel */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid #F59E0B', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: '#F59E0B', color: '#fff', padding: '6px', borderRadius: '6px' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>AI Content Engine & Auto-Fill</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Proofread grammar/spelling in TinyMCE & auto-fill all title, excerpt, and SEO fields in 1-click.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  onClick={handleAiProofreadAndAutoFill} 
                  disabled={aiProofreading}
                  style={{ background: '#10B981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: aiProofreading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {aiProofreading ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
                  {aiProofreading ? 'Proofreading...' : '⚡ AI Proofread & Auto-Fill All Fields'}
                </button>

                <button 
                  onClick={handleGenerateDraft} 
                  disabled={aiGeneratingDraft}
                  style={{ background: '#F59E0B', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: aiGeneratingDraft ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {aiGeneratingDraft ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                  {aiGeneratingDraft ? 'Drafting...' : 'Generate Full Draft'}
                </button>

                <a 
                  href={getLiveArticleUrl()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ background: '#3B82F6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <ExternalLink size={16} /> View Published Article
                </a>


              </div>
            </div>
          </div>

          {/* Editor Tabs */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              {['Tamil', 'English', 'Settings'].map((tab, idx) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(idx)}
                  style={{
                    flex: 1, padding: '14px', border: 'none', background: activeTab === idx ? 'var(--bg-surface)' : 'transparent',
                    borderBottom: activeTab === idx ? '2px solid #2563EB' : '2px solid transparent',
                    fontWeight: activeTab === idx ? 700 : 600,
                    color: activeTab === idx ? '#2563EB' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '14px'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ padding: '24px', minHeight: '720px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              {(activeTab === 0 || activeTab === 1) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Add title ({activeTab === 0 ? 'Tamil' : 'English'})</label>
                    <button 
                      type="button"
                      onClick={() => handleAutoTranslate(activeTab === 0 ? 'ta2en' : 'en2ta')}
                      disabled={isTranslating}
                      style={{
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', border: 'none', 
                        padding: '6px 12px', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: isTranslating ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px', opacity: isTranslating ? 0.7 : 1
                      }}
                    >
                      {isTranslating ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                      {isTranslating ? 'Translating...' : (activeTab === 0 ? 'Auto-Translate to English' : 'Auto-Translate to Tamil')}
                    </button>
                  </div>
                    <input 
                      type="text" 
                      value={activeTab === 0 ? form.titleTa : form.titleEn}
                      onChange={e => set(activeTab === 0 ? 'titleTa' : 'titleEn', e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '18px', fontWeight: '600', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      placeholder="Add title"
                    />
                  </div>

                  {/* Reference Media Upload Toolbar matching user request image */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '8px 14px',
                    background: 'var(--bg-secondary, #f8fafc)',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '8px 8px 0 0',
                    borderBottom: 'none',
                    marginTop: '4px',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => mediaInputRef.current?.click()}
                        disabled={mediaUploading}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                          background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px',
                          fontSize: '13px', fontWeight: 600, color: '#1e293b', cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <ImageIcon size={15} color="#2563EB" /> Add Media
                      </button>

                      <button
                        type="button"
                        onClick={() => setVideoModalOpen(true)}
                        disabled={mediaUploading}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                          background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px',
                          fontSize: '13px', fontWeight: 600, color: '#1e293b', cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <Video size={15} color="#0EA5E9" /> Add Video
                      </button>

                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        disabled={mediaUploading}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                          background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px',
                          fontSize: '13px', fontWeight: 600, color: '#1e293b', cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <Mic size={15} color="#8B5CF6" /> Add Audio
                      </button>

                      <button
                        type="button"
                        onClick={() => docInputRef.current?.click()}
                        disabled={mediaUploading}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                          background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px',
                          fontSize: '13px', fontWeight: 600, color: '#1e293b', cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <FileText size={15} color="#F59E0B" /> Add Document
                      </button>

                      <button
                        type="button"
                        onClick={() => setGalleryModalOpen(true)}
                        disabled={mediaUploading}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                          background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px',
                          fontSize: '13px', fontWeight: 600, color: '#1e293b', cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <LayoutTemplate size={15} color="#10B981" /> Create Gallery
                      </button>

                      <button
                        type="button"
                        onClick={() => setMediaSelectModalOpen(true)}
                        disabled={mediaUploading}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                          background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px',
                          fontSize: '13px', fontWeight: 600, color: '#1e293b', cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <FolderOpen size={15} color="#4F46E5" /> Choose from Library
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '14px' }}>
                      {mediaUploading ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#2563eb' }}>
                          <Loader2 size={14} className="spin" /> Uploading & inserting...
                        </span>
                      ) : (
                        <span title="Rich Media Toolbar Active" style={{ cursor: 'pointer', padding: '2px 6px', color: '#94a3b8' }}>
                          ↕
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 0 }}>
                    <Editor
                      key={activeTab === 0 ? 'editor-ta' : 'editor-en'}
                      onInit={(evt, editor) => { 
                        if (activeTab === 0) {
                          editorRefTa.current = editor;
                          if (form.contentTa) editor.setContent(form.contentTa);
                        } else {
                          editorRefEn.current = editor;
                          if (form.contentEn) editor.setContent(form.contentEn);
                        }
                      }}
                      value={activeTab === 0 ? form.contentTa : form.contentEn}
                      onEditorChange={(newContent) => set(activeTab === 0 ? 'contentTa' : 'contentEn', newContent)}
                      init={tinyInit(activeTab === 0 ? 'ta' : 'en')}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Short Excerpt</label>
                    <AutoExpandTextarea 
                      value={activeTab === 0 ? (form.shortDescTa || '') : (form.shortDescEn || '')}
                      onChange={e => set(activeTab === 0 ? 'shortDescTa' : 'shortDescEn', e.target.value)}
                      placeholder="Brief summary..."
                      minHeight="60px"
                      maxHeight="250px"
                      style={{ background: 'var(--bg-secondary)' }}
                    />
                  </div>

                  {/* ── SEO & Meta Engine Section (Rendered Down Below Content Editor) ── */}
                  <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>🔍 SEO & Meta Engine Settings</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Automated or custom meta titles, description, keywords, and URL slug optimization.</p>
                      </div>
                      {form.seoScore > 0 && (
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, background: form.seoScore > 70 ? '#10B981' : '#F59E0B', color: '#fff' }}>
                          SEO Score: {form.seoScore}/100
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            SEO Meta Title 🌐 (Combined Tamil & English)
                          </label>
                          <span style={{ 
                            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                            background: (form.metaTitle || '').length >= 35 && (form.metaTitle || '').length <= 80 ? '#D1FAE5' : ((form.metaTitle || '').length > 80 ? '#FEE2E2' : '#FEF3C7'),
                            color: (form.metaTitle || '').length >= 35 && (form.metaTitle || '').length <= 80 ? '#10B981' : ((form.metaTitle || '').length > 80 ? '#EF4444' : '#F59E0B')
                          }}>
                            {(form.metaTitle || '').length} chars
                          </span>
                        </div>
                        <AutoExpandTextarea 
                          value={form.metaTitle || ''} 
                          onChange={e => {
                            const val = e.target.value;
                            setForm(f => ({ ...f, metaTitle: val, metaTitleTa: val, metaTitleEn: val }));
                          }} 
                          placeholder="தேடு பொறிகளுக்கான தலைப்பு (இரு மொழி) / SEO Title..."
                          minHeight="46px"
                          maxHeight="180px"
                          style={{ fontSize: '14px', fontWeight: '600' }}
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>URL Slug</label>
                          <button 
                            type="button" 
                            onClick={() => {
                              navigator.clipboard.writeText(getLiveArticleUrl());
                              showMsg('📋 Article Link copied to clipboard!');
                            }}
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Copy Link
                          </button>
                        </div>
                        <AutoExpandTextarea 
                          value={getLiveArticleUrl()} 
                          onChange={e => {
                            const rawVal = e.target.value;
                            const parts = rawVal.split('/');
                            const lastPart = parts[parts.length - 1] || rawVal;
                            const cleanSlug = slugify(lastPart);
                            set('slug', cleanSlug);
                          }} 
                          placeholder="https://king-tv.test-technoprint.online/news/article-slug"
                          minHeight="46px"
                          maxHeight="180px"
                          style={{ fontSize: '13px', fontWeight: '600', color: '#059669', fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          SEO Meta Description 🌐 (Combined Tamil & English)
                        </label>
                        <span style={{ 
                          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                          background: (form.metaDescription || '').length >= 90 && (form.metaDescription || '').length <= 200 ? '#D1FAE5' : ((form.metaDescription || '').length > 200 ? '#FEE2E2' : '#FEF3C7'),
                          color: (form.metaDescription || '').length >= 90 && (form.metaDescription || '').length <= 200 ? '#10B981' : ((form.metaDescription || '').length > 200 ? '#EF4444' : '#F59E0B')
                        }}>
                          {(form.metaDescription || '').length} chars
                        </span>
                      </div>
                      <textarea 
                        rows="3" 
                        value={form.metaDescription || ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setForm(f => ({ ...f, metaDescription: val, metaDescriptionTa: val, metaDescriptionEn: val }));
                        }} 
                        placeholder="தேடு முடிவுகளுக்கான இரு மொழி சுருக்கம் (தமிழ் & English Combined)..."
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: '14px', resize: 'vertical', color: 'var(--text-primary)' }} 
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Focus Keywords 🌐 (Dual Language / இரு மொழி)
                        </label>
                        <AutoExpandTextarea 
                          value={form.focusKeywords || [form.focusKeywordsTa, form.focusKeywordsEn].filter(Boolean).join(', ')} 
                          onChange={e => {
                            const val = e.target.value;
                            setForm(f => ({ ...f, focusKeywords: val, focusKeywordsTa: val, focusKeywordsEn: val }));
                          }} 
                          placeholder="தமிழ், முக்கிய, சொற்கள், primary, focus, keywords"
                          minHeight="42px"
                          maxHeight="160px"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          News Tags 🌐 (Dual Language / இரு மொழி)
                        </label>
                        <AutoExpandTextarea 
                          value={form.metaKeywords || [form.metaKeywordsTa, form.metaKeywordsEn].filter(Boolean).join(', ')} 
                          onChange={e => {
                            const val = e.target.value;
                            setForm(f => ({ ...f, metaKeywords: val, metaKeywordsTa: val, metaKeywordsEn: val }));
                          }} 
                          placeholder="செய்திகள், தமிழ்நாடு, சென்னை, news, breaking, tamil, india"
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Canonical URL</label>
                      <input 
                        type="text" 
                        value={form.canonicalUrl || ''} 
                        onChange={e => set('canonicalUrl', e.target.value)} 
                        placeholder="https://king-tv.com/..."
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: '14px', color: 'var(--text-primary)' }} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Settings Tab (Author Dropdown + Custom Name, Source, Location) ── */}
              {activeTab === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600 }}>Publication & Author Controls</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Configure author credentials, news source agency, location, and interaction policies.</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Author Dropdown with Others Option */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600 }}>Author / Journalist Name *</label>
                      <select 
                        value={isCustomAuthor ? 'OTHER' : (form.authorName || (reporters[0]?.fullName || reporters[0]?.username || ''))}
                        onChange={e => {
                          if (e.target.value === 'OTHER') {
                            setIsCustomAuthor(true);
                            set('authorName', '');
                          } else {
                            setIsCustomAuthor(false);
                            set('authorName', e.target.value);
                          }
                        }}
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: '14px' }}
                      >
                        {form.authorName && !reporters.some(r => (r.fullName || r.username) === form.authorName) && (
                          <option value={form.authorName}>{form.authorName} (Active Profile)</option>
                        )}
                        {reporters.map(r => (
                          <option key={r.id} value={r.fullName || r.username}>
                            {r.fullName || r.username} ({r.role ? r.role.replace(/^ROLE_/, '').replace('_', ' ') : 'Reporter'})
                          </option>
                        ))}
                        <option value="OTHER">➕ Others / Type Custom Author Name...</option>
                      </select>

                      {/* Custom Author Name Input if Others selected */}
                      {(isCustomAuthor || (!form.authorName && !reporters.length)) && (
                        <div style={{ marginTop: '10px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Custom Author Name</label>
                          <input 
                            type="text" 
                            value={form.authorName} 
                            onChange={e => { setIsCustomAuthor(true); set('authorName', e.target.value); }}
                            placeholder="Type author / journalist name..."
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #2563EB', background: '#F0F9FF', fontSize: '14px', fontWeight: 600 }}
                          />
                        </div>
                      )}
                    </div>

                    {/* News Source / Agency */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600 }}>News Source / Agency</label>
                      <input 
                        type="text" 
                        value={form.reporterName} 
                        onChange={e => set('reporterName', e.target.value)} 
                        placeholder="e.g. Kings TV Desk, PTI, ANI, Press Release"
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: '14px' }} 
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* News Location / City */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600 }}>News Location / City</label>
                      <input 
                        type="text" 
                        value={form.constituency} 
                        onChange={e => set('constituency', e.target.value)} 
                        placeholder="e.g. Chennai, Coimbatore, New Delhi"
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: '14px' }} 
                      />
                    </div>
                    {/* Target District */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600 }}>Target District</label>
                      <select 
                        value={form.districtId} 
                        onChange={e => set('districtId', e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: '14px' }}
                      >
                        <option value="">All Districts</option>
                        {districts.map(d => <option key={d.id} value={d.id}>{d.nameEn || d.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>Reader Engagement Controls</h4>
                    <div style={{ display: 'flex', gap: '24px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.allowComments} onChange={e => set('allowComments', e.target.checked)} /> Allow reader comments
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.allowPingbacks} onChange={e => set('allowPingbacks', e.target.checked)} /> Allow trackbacks & pingbacks
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Unified Media & Source Upload */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Media & Source Upload</h3>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                <input type="radio" name="uploadType" checked={uploadType === 'source'} onChange={() => setUploadType('source')} /> Use as AI Source (Docs, Audio)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                <input type="radio" name="uploadType" checked={uploadType === 'insert'} onChange={() => setUploadType('insert')} /> Insert into Article (Images, Video)
              </label>
            </div>
            
            <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '32px', textAlign: 'center', position: 'relative' }}>
              <input type="file" multiple onChange={handleMediaUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              <UploadCloud size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Drag & drop files here, or click to browse</p>
              {uploadProgress !== null && (
                <div style={{ marginTop: '16px', background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, background: 'var(--primary-color)', height: '100%', transition: 'width 0.3s' }}></div>
                </div>
              )}
            </div>

            {mediaList.length > 0 && (
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Uploaded Files</h4>
                {mediaList.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                      {m.type.startsWith('image/') ? <ImageIcon size={20} color="#8B5CF6"/> : 
                       m.type.startsWith('video/') ? <Video size={20} color="#EF4444"/> : 
                       m.type.startsWith('audio/') ? <Mic size={20} color="#F59E0B"/> : 
                       <FileText size={20} color="#3B82F6"/>}
                      <span style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                      {m.text && <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>Extracted {m.text.split(' ').length} words</span>}
                    </div>
                    {m.url && uploadType === 'insert' && (
                      <button onClick={() => insertMedia(m.url, m.type)} style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Insert to Editor
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '340px' }}>
          
          {/* RankMath-Style SEO Scorecard & SERP Card */}
          {(() => {
            const metrics = getSeoMetrics();
            const scoreColor = metrics.score >= 80 ? '#10B981' : (metrics.score >= 50 ? '#F59E0B' : '#EF4444');
            const scoreBadgeBg = metrics.score >= 80 ? '#D1FAE5' : (metrics.score >= 50 ? '#FEF3C7' : '#FEE2E2');
            
            return (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color={scoreColor} /> SEO & Audit Score
                  </h3>
                  <div style={{ background: scoreBadgeBg, color: scoreColor, padding: '4px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '14px' }}>
                    {metrics.score} / 100
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.wordCount}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Words</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.paragraphCount}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Paragraphs</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#2563EB' }}>⏱️ {metrics.readingTime}m</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Read Time</div>
                  </div>
                </div>

                {/* Quick Auto-SEO Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={handleRuleBasedAutoFill}
                    style={{
                      width: '100%', padding: '10px', background: '#2563EB', color: '#ffffff',
                      border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '13px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <Zap size={16} /> ⚡ Auto-SEO (Instant Rule-Based)
                  </button>


                </div>

                {/* Checklist items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {metrics.checklist.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px' }}>
                      {item.pass ? <CheckCircle size={14} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} /> : <AlertCircle size={14} color="#EF4444" style={{ marginTop: '2px', flexShrink: 0 }} />}
                      <span style={{ color: item.pass ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Google SERP Preview Card */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', background: '#ffffff', color: '#1a0dab' }}>
                  <div style={{ fontSize: '11px', color: '#5f6368', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getLiveArticleUrl()}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a0dab', marginBottom: '4px', lineHeight: 1.3, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {form.metaTitle || form.titleEn || form.titleTa || 'Article Title Preview'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4d5156', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {form.metaDescription || form.shortDescEn || form.shortDescTa || 'Article description preview will appear here in Google Search results...'}
                  </div>
                </div>

              </div>
            );
          })()}

          {/* Content Moderation Status */}
          <div style={{ background: 'var(--bg-surface)', border: `1.5px solid ${detectedWords.length > 0 ? '#ef4444' : 'var(--border-color)'}`, borderRadius: '8px', padding: '16px', transition: 'border-color 0.3s' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} color={detectedWords.length > 0 ? '#EF4444' : '#10B981'} />
              Content Moderation
            </h3>

            {detectedWords.length > 0 ? (
              <div>
                {/* Warning banner */}
                <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⛔ {detectedWords.length} prohibited {detectedWords.length === 1 ? 'word' : 'words'} found — Publish blocked
                </div>

                {/* Per-word list with alternatives */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {detectedWords.map((word, i) => (
                    <div key={i} style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, border: '1px solid #fca5a5' }}>
                          🚫 {word}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>→ use instead:</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {(getSuggestions(word)).map((alt, j) => (
                          <button
                            key={j}
                            onClick={() => {
                              const safeWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                              const re = new RegExp(safeWord, 'gi');

                              const replaceInEditor = (editor) => {
                                if (!editor) return;
                                let content = editor.getContent({ format: 'html' });
                                content = content.replace(re, alt);
                                editor.setContent(content);
                              };

                              replaceInEditor(editorRefEn.current);
                              replaceInEditor(editorRefTa.current);

                              setForm(f => ({
                                ...f,
                                titleEn: (f.titleEn || '').replace(re, alt),
                                titleTa: (f.titleTa || '').replace(re, alt),
                                contentEn: (f.contentEn || '').replace(re, alt),
                                contentTa: (f.contentTa || '').replace(re, alt),
                                shortDescEn: (f.shortDescEn || '').replace(re, alt),
                                shortDescTa: (f.shortDescTa || '').replace(re, alt),
                                metaTitle: (f.metaTitle || '').replace(re, alt),
                                metaTitleTa: (f.metaTitleTa || '').replace(re, alt),
                                metaTitleEn: (f.metaTitleEn || '').replace(re, alt),
                                metaDescription: (f.metaDescription || '').replace(re, alt),
                                metaDescriptionTa: (f.metaDescriptionTa || '').replace(re, alt),
                                metaDescriptionEn: (f.metaDescriptionEn || '').replace(re, alt),
                              }));

                              setDetectedWords(prev => prev.filter(w => w.toLowerCase() !== word.toLowerCase()));
                            }}
                            style={{ padding: '3px 10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            ✓ {alt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  💡 Click a suggestion to auto-replace, or edit the red-highlighted words in the editor above.
                </p>
              </div>
            ) : (
              <div style={{ background: '#D1FAE5', color: '#047857', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🟢 No prohibited words detected — Publish ready
              </div>
            )}
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><LayoutTemplate size={16} /> Featured Image</h3>
            <ImageUploadPreview imageUrl={form.featuredImage || form.imageUrl} onUploadSuccess={(url) => {
              set('featuredImage', url);
              set('imageUrl', url);
              // Auto Image SEO: auto-populate meta fields if blank
              const title = (form.titleEn || form.titleTa || '').trim();
              if (title && !form.metaDescription) {
                set('metaDescription', `${title} - Kings 24x7 Coverage`);
              }
            }} />
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlignLeft size={16} /> Taxonomy</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>Category</label>
                <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}>
                  <option value="" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{c.nameTa ? `${c.nameTa} (${c.name || c.nameEn})` : (c.name || c.nameEn)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>Subcategory</label>
                <select value={form.subcategoryId} onChange={e => set('subcategoryId', e.target.value)} disabled={!subCategories.length} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}>
                  <option value="" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Select Subcategory</option>
                  {subCategories.map(s => <option key={s.subcategoryId || s.id} value={s.subcategoryId || s.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{s.nameTa ? `${s.nameTa} / ${s.name}` : s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                  News Tags (comma separated) 🌐 (Dual Language / இரு மொழி)
                </label>
                <AutoExpandTextarea 
                  value={form.metaKeywords || [form.metaKeywordsTa, form.metaKeywordsEn].filter(Boolean).join(', ')} 
                  onChange={e => {
                    const val = e.target.value;
                    setForm(f => ({ ...f, metaKeywords: val, metaKeywordsTa: val, metaKeywordsEn: val }));
                  }} 
                  style={{ background: 'var(--bg-secondary)' }}
                  placeholder="செய்திகள், தமிழ்நாடு, சென்னை, e.g. TamilNadu, Politics, Breaking" 
                />
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      <MediaSelectModal
        isOpen={mediaSelectModalOpen}
        onClose={() => setMediaSelectModalOpen(false)}
        onSelect={handleInsertFromLibrary}
      />

      {/* Video Upload / Embed Modal */}
      {videoModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-surface, #ffffff)', borderRadius: '12px',
            border: '1px solid var(--border-color, #e2e8f0)', width: '100%', maxWidth: '480px',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video size={20} color="#0EA5E9" /> Add Video to Article
              </h3>
              <button onClick={() => setVideoModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Option 1: Upload Video File
                </label>
                <button
                  onClick={() => videoInputRef.current?.click()}
                  disabled={mediaUploading}
                  style={{
                    width: '100%', padding: '12px', background: 'var(--bg-secondary, #f8fafc)',
                    border: '1px dashed #0EA5E9', borderRadius: '8px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontWeight: 600, color: '#0284C7'
                  }}
                >
                  <UploadCloud size={18} /> Choose Video File (.mp4, .webm)
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px', margin: '4px 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                OR
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Option 2: Video URL (YouTube, Vimeo, MP4)
                </label>
                <input
                  type="text"
                  value={videoUrlInput}
                  onChange={e => setVideoUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)', fontSize: '14px',
                    background: 'var(--bg-secondary, #fff)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  onClick={() => setVideoModalOpen(false)}
                  style={{ padding: '8px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsertVideoUrl}
                  disabled={!videoUrlInput.trim()}
                  style={{
                    padding: '8px 16px', background: videoUrlInput.trim() ? '#0EA5E9' : '#cbd5e1',
                    color: '#ffffff', border: 'none', borderRadius: '6px', cursor: videoUrlInput.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 600
                  }}
                >
                  Embed Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {keyModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-surface, #ffffff)', borderRadius: '12px',
            border: '1px solid var(--border-color, #e2e8f0)', width: '100%', maxWidth: '500px',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#92400E', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#F59E0B" /> Configure Gemini API Key
              </h3>
              <button onClick={() => setKeyModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Gemini API Key (Google AI Studio Key)
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)', fontSize: '14px',
                    background: 'var(--bg-secondary, #fff)', fontFamily: 'monospace'
                  }}
                />
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Get your free API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#2563EB', textDecoration: 'underline' }}>Google AI Studio</a>.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Gemini Model Endpoint
                </label>
                <select
                  value={apiModelInput}
                  onChange={e => setApiModelInput(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)', fontSize: '14px',
                    background: 'var(--bg-secondary, #fff)'
                  }}
                >
                  <option value="gemini-flash-latest">gemini-flash-latest (Recommended Fast & Multimodal)</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Next Generation High-Speed)</option>
                  <option value="gemini-3.6-flash">gemini-3.6-flash (Latest Interactions API Model)</option>
                  <option value="gemini-2.0-flash-001">gemini-2.0-flash-001 (Stable 2.0 Endpoint)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  onClick={() => setKeyModalOpen(false)}
                  style={{ padding: '8px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveApiKey}
                  style={{
                    padding: '8px 18px', background: '#F59E0B',
                    color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Check size={16} /> Save & Activate Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Gallery & Media Vault Creator Modal */}
      {galleryModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-surface, #ffffff)', borderRadius: '16px',
            border: '1px solid var(--border-color, #e2e8f0)', width: '100%', maxWidth: '680px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#10B981', color: '#ffffff', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                  <LayoutTemplate size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Interactive Gallery & Media Vault Creator</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Combine images, videos, audio clips, and documents into a clean interactive reader gallery.</p>
                </div>
              </div>
              <button onClick={() => setGalleryModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #1e293b)', marginBottom: '6px' }}>Gallery Title / Header</label>
                <input
                  type="text"
                  value={galleryTitle}
                  onChange={e => setGalleryTitle(e.target.value)}
                  placeholder="e.g. Event Photo Album & Downloadable Press Release"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '14px', background: 'var(--bg-secondary, #ffffff)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Source Tab Selector */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color, #e2e8f0)', pb: '8px' }}>
                <button
                  onClick={() => setGalleryModalTab('library')}
                  style={{
                    padding: '8px 16px', borderRadius: '6px 6px 0 0', border: 'none',
                    background: galleryModalTab === 'library' ? '#2563EB' : 'var(--bg-secondary, #f1f5f9)',
                    color: galleryModalTab === 'library' ? '#ffffff' : 'var(--text-secondary, #475569)',
                    fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <FolderIcon size={16} /> Choose from Media Library ({mediaLibraryItems.length})
                </button>
                <button
                  onClick={() => setGalleryModalTab('upload')}
                  style={{
                    padding: '8px 16px', borderRadius: '6px 6px 0 0', border: 'none',
                    background: galleryModalTab === 'upload' ? '#2563EB' : 'var(--bg-secondary, #f1f5f9)',
                    color: galleryModalTab === 'upload' ? '#ffffff' : 'var(--text-secondary, #475569)',
                    fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <UploadCloud size={16} /> Upload New Files
                </button>
              </div>

              {/* Tab 1: Media Library Picker */}
              {galleryModalTab === 'library' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary, #f8fafc)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  {/* Search and Category Filter Bar */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <input
                      type="text"
                      placeholder="Search media library..."
                      value={mediaLibrarySearch}
                      onChange={e => setMediaLibrarySearch(e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', width: '200px', background: '#ffffff' }}
                    />

                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['all', 'image', 'video', 'audio', 'document'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setMediaLibraryCategory(cat)}
                          style={{
                            padding: '4px 10px', borderRadius: '12px', border: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer',
                            background: mediaLibraryCategory === cat ? '#2563EB' : '#e2e8f0',
                            color: mediaLibraryCategory === cat ? '#ffffff' : '#475569'
                          }}
                        >
                          {cat === 'all' ? 'All' : cat === 'image' ? 'Photos 🖼️' : cat === 'video' ? 'Videos 🎥' : cat === 'audio' ? 'Audio 🎙️' : 'Docs 📄'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Media Library Items Grid */}
                  {loadingMediaLibrary ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#2563eb', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Loader2 size={18} className="spin" /> Loading Media Library...
                    </div>
                  ) : (
                    (() => {
                      const itemsToShow = mediaLibraryItems.filter(item => {
                        const matchesCat = mediaLibraryCategory === 'all' || item.category === mediaLibraryCategory;
                        const matchesSearch = !mediaLibrarySearch || item.name.toLowerCase().includes(mediaLibrarySearch.toLowerCase());
                        return matchesCat && matchesSearch;
                      });

                      if (itemsToShow.length === 0) {
                        return (
                          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', background: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                            No files found in Media Library under this filter. Switch to "Upload New Files" to add files.
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', maxHeight: '210px', overflowY: 'auto', paddingRight: '4px' }}>
                          {itemsToShow.map(item => {
                            const isAdded = galleryItems.some(i => i.id === item.id || i.url === item.url);
                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  if (isAdded) {
                                    setGalleryItems(prev => prev.filter(i => i.id !== item.id && i.url !== item.url));
                                  } else {
                                    setGalleryItems(prev => [...prev, item]);
                                  }
                                }}
                                style={{
                                  border: `2px solid ${isAdded ? '#10B981' : '#cbd5e1'}`,
                                  borderRadius: '8px', padding: '8px', background: isAdded ? '#ecfdf5' : '#ffffff',
                                  cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: '6px',
                                  position: 'relative'
                                }}
                              >
                                {item.category === 'image' && (
                                  <div style={{ height: '70px', borderRadius: '4px', overflow: 'hidden', background: '#f1f5f9' }}>
                                    <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                )}
                                {item.category === 'video' && (
                                  <div style={{ height: '70px', borderRadius: '4px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                                    <Video size={24} />
                                  </div>
                                )}
                                {item.category === 'audio' && (
                                  <div style={{ height: '70px', borderRadius: '4px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                                    <Mic size={24} />
                                  </div>
                                )}
                                {item.category === 'document' && (
                                  <div style={{ height: '70px', borderRadius: '4px', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: '24px' }}>
                                    📄
                                  </div>
                                )}

                                <div style={{ overflow: 'hidden' }}>
                                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                                  <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase' }}>{item.category}</span>
                                </div>

                                <button
                                  style={{
                                    width: '100%', padding: '4px', borderRadius: '4px', border: 'none',
                                    background: isAdded ? '#10B981' : '#2563EB', color: '#ffffff',
                                    fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px'
                                  }}
                                >
                                  {isAdded ? <Check size={12} /> : <Plus size={12} />}
                                  {isAdded ? 'Added' : 'Select'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* Tab 2: Upload Dropzone */}
              {galleryModalTab === 'upload' && (
                <div
                  onClick={() => galleryInputRef.current?.click()}
                  style={{
                    border: '2px dashed #3b82f6', borderRadius: '12px', padding: '24px',
                    textAlign: 'center', background: '#eff6ff', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <UploadCloud size={36} color="#2563eb" style={{ marginBottom: '8px' }} />
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#1e40af', fontWeight: 600 }}>Click or Drag Files to Add to Gallery</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#3b82f6' }}>Supports Photos, Videos (MP4), Audio (MP3), Documents (PDF, DOCX, TXT)</p>
                  {galleryUploading && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px', color: '#2563eb', fontSize: '13px', fontWeight: 600 }}>
                      <Loader2 size={16} className="spin" /> Uploading media files...
                    </div>
                  )}
                </div>
              )}

              {/* Items Selected Preview Grid */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #334155)' }}>Selected Gallery Vault Items ({galleryItems.length})</h4>
                  {galleryItems.length > 0 && (
                    <button onClick={() => setGalleryItems([])} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                      Clear All
                    </button>
                  )}
                </div>

                {galleryItems.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', color: '#94a3b8', fontSize: '12px' }}>
                    No files added to gallery yet. Select files from Media Library above or upload new files.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                    {galleryItems.map((item) => (
                      <div key={item.id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', background: '#ffffff', position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.category === 'image' && (
                          <div style={{ height: '70px', borderRadius: '4px', overflow: 'hidden', background: '#f1f5f9' }}>
                            <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        {item.category === 'video' && (
                          <div style={{ height: '70px', borderRadius: '4px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                            <Video size={24} />
                          </div>
                        )}
                        {item.category === 'audio' && (
                          <div style={{ height: '70px', borderRadius: '4px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                            <Mic size={24} />
                          </div>
                        )}
                        {item.category === 'document' && (
                          <div style={{ height: '70px', borderRadius: '4px', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: '24px' }}>
                            📄
                          </div>
                        )}

                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                          <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase' }}>{item.category} • {item.sizeMb} MB</span>
                        </div>

                        <button
                          onClick={() => setGalleryItems(prev => prev.filter(i => i.id !== item.id && i.url !== item.url))}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          title="Remove item"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
              <button onClick={() => setGalleryModalOpen(false)} style={{ padding: '9px 18px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleInsertGalleryModal}
                disabled={!galleryItems.length}
                style={{
                  padding: '9px 20px', background: galleryItems.length ? '#10B981' : '#cbd5e1',
                  color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '14px',
                  fontWeight: 600, cursor: galleryItems.length ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Check size={16} /> Insert Gallery to Article ({galleryItems.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Gemini API Key Modal */}
      {keyModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#ffffff', width: '480px', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔑 Configure Google Gemini API Key
              </h3>
              <button onClick={() => setKeyModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                Enter your free Google Gemini API Key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>Google AI Studio</a>.
                This enables 1-click AI Proofreading, Auto-Translation, SEO Generation, and Full Draft Creation.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Gemini API Key</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>AI Model</label>
                <select
                  value={apiModelInput}
                  onChange={(e) => setApiModelInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                >
                  <option value="gemini-2.0-flash">gemini-2.0-flash (Fast & Recommended)</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Latest)</option>
                  <option value="gemini-flash-latest">gemini-flash-latest</option>
                </select>
              </div>
            </div>
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setKeyModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveApiKey} style={{ padding: '8px 18px', background: '#10B981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Save & Activate Key</button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for TinyMCE Spinners */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
};

export default NewsEditor;
