import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Save, Sparkles, Key, Settings, Globe, Search, RefreshCw, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const PROVIDER_PRESETS = {
  gemini: {
    label: 'Google Gemini',
    defaultUrl: 'https://generativelanguage.googleapis.com/v1',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash']
  },
  openai: {
    label: 'OpenAI GPT',
    defaultUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo']
  },
  anthropic: {
    label: 'Anthropic Claude',
    defaultUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229']
  },
  groq: {
    label: 'Groq Cloud',
    defaultUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.2-11b-vision-preview', 'mixtral-8x7b-32768']
  },
  openrouter: {
    label: 'OpenRouter AI',
    defaultUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.0-flash-exp:free',
    models: ['google/gemini-2.0-flash-exp:free', 'meta-llama/llama-3.3-70b-instruct:free', 'openrouter/auto']
  },
  ollama: {
    label: 'Ollama (Local LLM)',
    defaultUrl: 'http://localhost:11434/api/chat',
    defaultModel: 'llama3',
    models: ['llama3', 'llama3.2', 'mistral', 'gemma2']
  }
};

const AiConfiguration = () => {
  const [configs, setConfigs] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [form, setForm] = useState({
    id: null,
    provider: 'gemini',
    apiKey: '',
    model: '',
    baseUrl: '',
    temperature: 0.3,
    maxTokens: 1024,
    timeout: 30,
    retryAttempts: 3,
    enableAi: false,
    enableTranslation: false,
    enableSeo: false,
    enableSummary: false,
    enableRewrite: false,
    enableTags: false,
    enableKeywords: false,
    enableLogging: false,
    enableCache: false,
    isActive: false
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/ai-config');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setConfigs(res.data);
        // Load active provider or fallback to first item
        const active = res.data.find(c => c.isActive) || res.data[0];
        setSelectedProvider(active.provider);
        loadProviderIntoForm(active.provider, res.data);
      }
    } catch (err) {
      showMsg('Failed to load AI configurations', true);
    } finally {
      setLoading(false);
    }
  };

  const loadProviderIntoForm = (providerName, allConfigs = configs) => {
    const matched = allConfigs.find(c => c.provider.toLowerCase() === providerName.toLowerCase());
    if (matched) {
      setForm({ ...matched });
      setTestResult(null);
      setShowKey(false);
    }
  };

  const handleProviderChange = (e) => {
    const val = e.target.value;
    setSelectedProvider(val);
    loadProviderIntoForm(val);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const showMsg = (text, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post(`/admin/ai-config/${form.provider}/test`, form);
      if (res.data?.success) {
        setTestResult({ success: true, message: 'Connected Successfully!' });
      } else {
        setTestResult({ success: false, message: res.data?.message || 'Connection test failed.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.message || err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save chosen provider config settings
      const saveRes = await api.put(`/admin/ai-config/${form.provider}`, form);
      
      // 2. Activate this provider
      await api.post(`/admin/ai-config/${form.provider}/activate`);

      showMsg(`AI Configuration saved & ${PROVIDER_PRESETS[form.provider].label} set as active!`);
      
      // Reload lists
      const listRes = await api.get('/admin/ai-config');
      if (Array.isArray(listRes.data)) {
        setConfigs(listRes.data);
        const updated = listRes.data.find(c => c.provider === form.provider);
        if (updated) {
          setForm(updated);
        }
      }
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to save AI configuration settings.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset this provider settings to default presets?')) return;
    try {
      const res = await api.post(`/admin/ai-config/${form.provider}/reset`);
      setForm(res.data);
      setTestResult(null);
      showMsg('Configuration parameters reset to defaults.');
    } catch (err) {
      showMsg('Failed to reset configuration.', true);
    }
  };

  const applyPreset = (presetKey) => {
    const preset = PROVIDER_PRESETS[presetKey];
    if (preset) {
      setForm(prev => ({
        ...prev,
        baseUrl: preset.defaultUrl,
        model: preset.defaultModel
      }));
      showMsg(`Applied presets for ${preset.label}.`);
    }
  };

  if (loading) {
    return <div className="animate-fade-in" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading AI configuration...</div>;
  }

  const activePreset = PROVIDER_PRESETS[form.provider] || {};

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--body-bg)',
    color: 'var(--text-dark)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.15s'
  };

  const labelStyle = {
    display: 'block',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.4rem'
  };

  const toggleContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.85rem 1rem',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    marginBottom: '0.5rem'
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={24} color="var(--primary)" /> AI & LLM Engine Settings
          </h1>
          <p className="text-secondary" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Configure default and secondary third-party language models for translation, SEO automation, OCR, and summaries.
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 99999,
          padding: '10px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem',
          background: toast.isError ? '#EF4444' : '#10B981', color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          {toast.isError ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          {toast.text}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Side: Connection Parameters */}
        <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '16px', fontWeight: 700 }}>
            <Key size={18} color="var(--primary)" /> API & Connection Settings
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Provider Dropdown */}
            <div>
              <label style={labelStyle}>AI Provider Endpoint</label>
              <select 
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={selectedProvider} 
                onChange={handleProviderChange}
                name="provider"
              >
                {Object.entries(PROVIDER_PRESETS).map(([key, val]) => (
                  <option key={key} value={key} style={{ color: '#000', background: '#fff' }}>
                    {val.label} {configs.find(c => c.provider === key)?.isActive ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Base URL */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>API Base Endpoint URL</label>
                <button 
                  type="button" 
                  onClick={() => applyPreset(form.provider)} 
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Use Default Preset Url
                </button>
              </div>
              <input 
                type="text" 
                name="baseUrl" 
                style={inputStyle}
                value={form.baseUrl || ''} 
                onChange={handleInputChange} 
                placeholder="https://..."
              />
            </div>

            {/* Model Name */}
            <div>
              <label style={labelStyle}>Target LLM Model</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  name="model" 
                  style={{ ...inputStyle, flex: 1 }}
                  value={form.model || ''} 
                  onChange={handleInputChange} 
                  placeholder="e.g. gemini-2.0-flash"
                />
                {activePreset.models && (
                  <select 
                    style={{ ...inputStyle, width: '150px', cursor: 'pointer' }} 
                    onChange={(e) => setForm(p => ({ ...p, model: e.target.value }))}
                    value={activePreset.models.includes(form.model) ? form.model : ''}
                  >
                    <option value="" style={{ color: '#000' }}>— Preset Models —</option>
                    {activePreset.models.map(m => (
                      <option key={m} value={m} style={{ color: '#000', background: '#fff' }}>{m}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* API Key */}
            {form.provider !== 'ollama' && (
              <div>
                <label style={labelStyle}>Secret API Authorization Key</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showKey ? 'text' : 'password'} 
                    name="apiKey" 
                    style={{ ...inputStyle, paddingRight: '45px' }}
                    value={form.apiKey || ''} 
                    onChange={handleInputChange} 
                    placeholder={form.id ? "••••••••••••••••" : "Paste your provider API key..."}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center'
                    }}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Keys are securely encrypted using standard AES-256 at rest.
                </span>
              </div>
            )}

            {/* Advanced configurations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <div>
                <label style={labelStyle}>Timeout (sec)</label>
                <input 
                  type="number" name="timeout" style={inputStyle}
                  value={form.timeout || 30} onChange={handleInputChange} min="1" max="180"
                />
              </div>
              <div>
                <label style={labelStyle}>Retry Attempts</label>
                <input 
                  type="number" name="retryAttempts" style={inputStyle}
                  value={form.retryAttempts || 3} onChange={handleInputChange} min="0" max="10"
                />
              </div>
              <div>
                <label style={labelStyle}>Max Tokens</label>
                <input 
                  type="number" name="maxTokens" style={inputStyle}
                  value={form.maxTokens || 1024} onChange={handleInputChange} min="1" max="16384"
                />
              </div>
            </div>

            {/* Temperature Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Temperature (Creativity): {form.temperature}</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0 (Focused) to 1 (Creative)</span>
              </div>
              <input 
                type="range" name="temperature" min="0" max="1" step="0.1"
                style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                value={form.temperature || 0.3} onChange={handleInputChange}
              />
            </div>

            {/* Actions Footer */}
            <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '10px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                onClick={testConnection} 
                disabled={testing || saving}
              >
                <RefreshCw size={15} className={testing ? "animate-spin" : ""} />
                {testing ? 'Testing connection...' : 'Test Connection'}
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ flex: 1.2, padding: '10px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                onClick={handleSave} 
                disabled={testing || saving}
              >
                <Save size={15} />
                {saving ? 'Saving config...' : 'Save & Activate'}
              </button>
            </div>

            {/* Reset */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={handleReset} 
                style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Reset to default parameters
              </button>
            </div>

            {/* Connection Test Response Banner */}
            {testResult && (
              <div style={{
                padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500,
                border: `1px solid ${testResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                background: testResult.success ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                color: testResult.success ? '#10B981' : '#EF4444',
                display: 'flex', flexDirection: 'column', gap: '6px'
              }}>
                <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {testResult.success ? '✓ Connection Succeeded' : '✕ Connection Failed'}
                </span>
                <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>{testResult.message}</span>
                
                {testResult.message && (testResult.message.includes('429') || testResult.message.includes('Quota Exceeded') || testResult.message.includes('depleted')) && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(239,68,68,0.2)' }}>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', background: '#EF4444', color: '#fff',
                        borderRadius: '6px', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem'
                      }}
                    >
                      🔑 Get a Fresh Free Gemini API Key on Google AI Studio ↗
                    </a>
                    <div style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-muted)' }}>
                      Paste your new key into <strong>Secret API Authorization Key</strong> above and click <strong>Save & Activate</strong>.
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Feature Flag Toggles */}
        <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '16px', fontWeight: 700 }}>
            <Settings size={18} color="var(--primary)" /> Feature Flags & Toggles
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            
            {/* Global Enable */}
            <div style={{ ...toggleContainerStyle, background: form.enableAi ? 'rgba(139,92,246,0.05)' : 'rgba(255,255,255,0.02)', borderColor: form.enableAi ? 'var(--primary)' : 'var(--border-color)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Master Enable AI Automation
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Enable dynamic LLM routing across the platform editor.
                </div>
              </div>
              <input 
                type="checkbox" 
                name="enableAi" 
                checked={form.enableAi || false} 
                onChange={handleInputChange}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
            </div>

            {/* Translation toggle */}
            <div style={toggleContainerStyle}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Globe size={14} color="var(--primary)" /> Bilingual Translation AI
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Translate and localize articles on-the-fly.
                </div>
              </div>
              <input 
                type="checkbox" 
                name="enableTranslation" 
                checked={form.enableTranslation || false} 
                onChange={handleInputChange}
                disabled={!form.enableAi}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: form.enableAi ? 'pointer' : 'not-allowed' }}
              />
            </div>

            {/* SEO Automation */}
            <div style={toggleContainerStyle}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Search size={14} color="var(--primary)" /> SEO Metadata Engine
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Auto-fill SEO Titles, URLs, Focus keywords, and snippets.
                </div>
              </div>
              <input 
                type="checkbox" 
                name="enableSeo" 
                checked={form.enableSeo || false} 
                onChange={handleInputChange}
                disabled={!form.enableAi}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: form.enableAi ? 'pointer' : 'not-allowed' }}
              />
            </div>

            {/* Summarization */}
            <div style={toggleContainerStyle}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Article Summarization AI
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Generate short teasers and descriptions from content.
                </div>
              </div>
              <input 
                type="checkbox" 
                name="enableSummary" 
                checked={form.enableSummary || false} 
                onChange={handleInputChange}
                disabled={!form.enableAi}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: form.enableAi ? 'pointer' : 'not-allowed' }}
              />
            </div>

            {/* AI Rewrite */}
            <div style={toggleContainerStyle}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  AI Content Rewriting & Tone
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Enable paraphrasing tools inside the journalist composer.
                </div>
              </div>
              <input 
                type="checkbox" 
                name="enableRewrite" 
                checked={form.enableRewrite || false} 
                onChange={handleInputChange}
                disabled={!form.enableAi}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: form.enableAi ? 'pointer' : 'not-allowed' }}
              />
            </div>

            {/* Auto Tags */}
            <div style={toggleContainerStyle}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Auto Tag Suggestions
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Extract news keywords as search tags.
                </div>
              </div>
              <input 
                type="checkbox" 
                name="enableTags" 
                checked={form.enableTags || false} 
                onChange={handleInputChange}
                disabled={!form.enableAi}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: form.enableAi ? 'pointer' : 'not-allowed' }}
              />
            </div>

            {/* Focus Keywords */}
            <div style={toggleContainerStyle}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Focus Keyword Discovery
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Suggest high-relevance terms to optimization scoring.
                </div>
              </div>
              <input 
                type="checkbox" 
                name="enableKeywords" 
                checked={form.enableKeywords || false} 
                onChange={handleInputChange}
                disabled={!form.enableAi}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: form.enableAi ? 'pointer' : 'not-allowed' }}
              />
            </div>

            {/* AI Logging */}
            <div style={toggleContainerStyle}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Enable AI Logging & Audit
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Track provider latency, response status, and token usage.
                </div>
              </div>
              <input 
                type="checkbox" 
                name="enableLogging" 
                checked={form.enableLogging || false} 
                onChange={handleInputChange}
                disabled={!form.enableAi}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: form.enableAi ? 'pointer' : 'not-allowed' }}
              />
            </div>

            {/* Prompt Cache */}
            <div style={toggleContainerStyle}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Enable Prompt Caching
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Store identical queries locally to reduce cost and latency.
                </div>
              </div>
              <input 
                type="checkbox" 
                name="enableCache" 
                checked={form.enableCache || false} 
                onChange={handleInputChange}
                disabled={!form.enableAi}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: form.enableAi ? 'pointer' : 'not-allowed' }}
              />
            </div>

          </div>
        </div>

      </div>

      {/* AI Prompt Settings & Templates Section */}
      <AiPromptSettingsSection showMsg={showMsg} />

    </div>
  );
};

const AiPromptSettingsSection = ({ showMsg }) => {
  const [prompts, setPrompts] = useState({
    article_generate_draft: '',
    article_proofread_autofill: ''
  });
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [savingPrompts, setSavingPrompts] = useState(false);

  useEffect(() => {
    api.get('/admin/ai-config/prompts').then(res => {
      if (res.data) {
        setPrompts({
          article_generate_draft: res.data.article_generate_draft || '',
          article_proofread_autofill: res.data.article_proofread_autofill || ''
        });
      }
    }).catch(() => {}).finally(() => setLoadingPrompts(false));
  }, []);

  const handleSavePrompts = async () => {
    setSavingPrompts(true);
    try {
      await api.put('/admin/ai-config/prompts', prompts);
      showMsg('✨ AI Prompt Templates updated successfully!');
    } catch (err) {
      showMsg('Failed to update AI prompt templates.', true);
    } finally {
      setSavingPrompts(false);
    }
  };

  const textareaStyle = {
    width: '100%',
    minHeight: '140px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #cbd5e1)',
    background: 'var(--bg-secondary, #ffffff)',
    color: 'var(--text-primary, #0f172a)',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
    outline: 'none'
  };

  return (
    <div style={{ marginTop: '2rem', background: 'var(--card-bg, #ffffff)', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
            📝 AI Prompt Settings & Templates
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>
            Edit prompt templates used by the AI Content Engine on the Edit Article page without code deployment. Placeholders supported: <code>{'{catNames}'}</code> and <code>{'{baseContent}'}</code>.
          </p>
        </div>
        <button
          onClick={handleSavePrompts}
          disabled={savingPrompts || loadingPrompts}
          style={{
            padding: '8px 18px', background: 'var(--primary, #2563eb)', color: '#ffffff',
            border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <Save size={16} /> {savingPrompts ? 'Saving...' : 'Save Prompts'}
        </button>
      </div>

      {loadingPrompts ? (
        <div style={{ color: 'var(--text-secondary)', padding: '1rem' }}>Loading prompt templates...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text-primary)' }}>
              1. Generate Full Draft Prompt (`article_generate_draft`)
            </label>
            <textarea
              value={prompts.article_generate_draft}
              onChange={e => setPrompts(p => ({ ...p, article_generate_draft: e.target.value }))}
              style={textareaStyle}
              placeholder="Enter prompt for Generate Full Draft..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text-primary)' }}>
              2. AI Proofread & Auto-Fill Prompt (`article_proofread_autofill`)
            </label>
            <textarea
              value={prompts.article_proofread_autofill}
              onChange={e => setPrompts(p => ({ ...p, article_proofread_autofill: e.target.value }))}
              style={textareaStyle}
              placeholder="Enter prompt for AI Proofread & Auto-Fill..."
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AiConfiguration;
