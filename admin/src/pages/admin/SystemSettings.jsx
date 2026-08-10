import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Save, Server, Mail, Smartphone, MapPin, Video, HardDrive, Send, Youtube, Cloud, Sparkles } from 'lucide-react';

const SystemSettings = () => {
  const [config, setConfig] = useState({
    gpsNewsRadius: 15,
    videoLengthLimit: 55,
    smtpHost: '',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    smsGatewayKey: '',
    firebaseProjectId: '',
    cdnBaseUrl: '',
    cdnApiKey: '',
    telegramBotToken: '',
    telegramChatId: '',
    telegramEnabled: 'false',
    pwaName: '',
    pwaShortName: '',
    pwaThemeColor: '#000000',
    pwaBackgroundColor: '#ffffff',
    youtubeApiKey: '',
    youtubeChannelId: '',
    weatherApiKey: '',
    renderApiKey: '',
    vercelApiKey: '',
    primaryFont: 'Inter',
    secondaryFont: 'Merriweather',
    tertiaryFont: 'Poppins',
    aiLlmApiUrl: '',
    aiLlmApiKey: '',
    aiLlmModel: 'gemini-flash-latest'
  });
  const [loading, setLoading] = useState(true);
  const [savingGroup, setSavingGroup] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/admin/config');
        if (Array.isArray(res.data)) {
          const mapped = {};
          res.data.forEach(item => {
            if (item.configKey === 'gps.news_radius_km') mapped.gpsNewsRadius = Number(item.configValue) || 15;
            if (item.configKey === 'video.max_duration_seconds') mapped.videoLengthLimit = Number(item.configValue) || 55;
            if (item.configKey === 'smtp.host') mapped.smtpHost = item.configValue || '';
            if (item.configKey === 'smtp.port') mapped.smtpPort = item.configValue || '587';
            if (item.configKey === 'smtp.username') mapped.smtpUsername = item.configValue || '';
            if (item.configKey === 'smtp.password') mapped.smtpPassword = item.configValue || '';
            if (item.configKey === 'sms.gateway_api_key') mapped.smsGatewayKey = item.configValue || '';
            if (item.configKey === 'firebase.config') mapped.firebaseProjectId = item.configValue || '';
            if (item.configKey === 'cdn.base_url') mapped.cdnBaseUrl = item.configValue || '';
            if (item.configKey === 'cdn.api_key') mapped.cdnApiKey = item.configValue || '';
            if (item.configKey === 'telegram.bot_token') mapped.telegramBotToken = item.configValue || '';
            if (item.configKey === 'telegram.chat_id') mapped.telegramChatId = item.configValue || '';
            if (item.configKey === 'telegram.enabled') mapped.telegramEnabled = item.configValue || 'false';
            if (item.configKey === 'pwa.name') mapped.pwaName = item.configValue || '';
            if (item.configKey === 'pwa.short_name') mapped.pwaShortName = item.configValue || '';
            if (item.configKey === 'pwa.theme_color') mapped.pwaThemeColor = item.configValue || '#000000';
            if (item.configKey === 'pwa.background_color') mapped.pwaBackgroundColor = item.configValue || '#ffffff';
            if (item.configKey === 'youtube.api_key') mapped.youtubeApiKey = item.configValue || '';
            if (item.configKey === 'youtube.channel_id') mapped.youtubeChannelId = item.configValue || '';
            if (item.configKey === 'weather.api_key') mapped.weatherApiKey = item.configValue || '';
            if (item.configKey === 'hosting.render_api_key') mapped.renderApiKey = item.configValue || '';
            if (item.configKey === 'hosting.vercel_api_key') mapped.vercelApiKey = item.configValue || '';
            if (item.configKey === 'font.primary') mapped.primaryFont = item.configValue || 'Inter';
            if (item.configKey === 'font.secondary') mapped.secondaryFont = item.configValue || 'Merriweather';
            if (item.configKey === 'font.tertiary') mapped.tertiaryFont = item.configValue || 'Poppins';
            if (item.configKey === 'ai.llm_api_url') mapped.aiLlmApiUrl = item.configValue || '';
            if (item.configKey === 'ai.llm_api_key') mapped.aiLlmApiKey = item.configValue || '';
            if (item.configKey === 'ai.llm_model') mapped.aiLlmModel = item.configValue || 'gemini-2.0-flash';
          });
          setConfig(prev => ({ ...prev, ...mapped }));
        }
      } catch (error) {
        console.error("Failed to load settings", error);
      }
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const validateGroup = (group) => {
    if (group === 'gps') {
      if (config.gpsNewsRadius === undefined || config.gpsNewsRadius === null || String(config.gpsNewsRadius).trim() === '' || Number(config.gpsNewsRadius) <= 0) {
        alert("GPS news radius is required and must be greater than 0.");
        return false;
      }
    }
    if (group === 'video') {
      if (config.videoLengthLimit === undefined || config.videoLengthLimit === null || String(config.videoLengthLimit).trim() === '' || Number(config.videoLengthLimit) <= 0) {
        alert("Video max duration is required and must be greater than 0.");
        return false;
      }
    }
    if (group === 'smtp') {
      if (!config.smtpHost || !config.smtpHost.trim()) {
        alert("SMTP Host is required.");
        return false;
      }
      if (!config.smtpPort || !config.smtpPort.trim() || Number(config.smtpPort) <= 0) {
        alert("SMTP Port is required and must be greater than 0.");
        return false;
      }
    }
    if (group === 'pwa') {
      if (!config.pwaName || !config.pwaName.trim()) {
        alert("PWA Name is required.");
        return false;
      }
      if (!config.pwaShortName || !config.pwaShortName.trim()) {
        alert("PWA Short Name is required.");
        return false;
      }
    }
    return true;
  };

  const handleSaveGroup = async (group) => {
    if (!validateGroup(group)) return;
    setSavingGroup(group);
    try {
      if (group === 'gps') {
        await api.put('/admin/config/gps', { radiusKm: String(config.gpsNewsRadius) });
      } else if (group === 'video') {
        await api.put('/admin/config/video-limit', { maxDurationSeconds: String(config.videoLengthLimit) });
      } else if (group === 'smtp') {
        await api.put('/admin/config/smtp', { 
          host: config.smtpHost, 
          port: config.smtpPort,
          username: config.smtpUsername,
          password: config.smtpPassword 
        });
      } else if (group === 'sms') {
        await api.put('/admin/config/sms', { apiKey: config.smsGatewayKey });
      } else if (group === 'firebase') {
        await api.put('/admin/config/firebase', { config: config.firebaseProjectId });
      } else if (group === 'cdn') {
        await api.put('/admin/config/cdn', { baseUrl: config.cdnBaseUrl, apiKey: config.cdnApiKey });
      } else if (group === 'telegram') {
        await api.put('/admin/config/telegram', { 
          botToken: config.telegramBotToken, 
          chatId: config.telegramChatId,
          enabled: String(config.telegramEnabled)
        });
      } else if (group === 'pwa') {
        await api.put('/admin/config/pwa', {
          name: config.pwaName,
          shortName: config.pwaShortName,
          themeColor: config.pwaThemeColor,
          backgroundColor: config.pwaBackgroundColor
        });
      } else if (group === 'youtube') {
        await api.put('/admin/config/youtube', { 
          apiKey: config.youtubeApiKey, 
          channelId: config.youtubeChannelId 
        });
      } else if (group === 'weather') {
        await api.put('/admin/config/weather', { 
          apiKey: config.weatherApiKey 
        });
      } else if (group === 'hosting') {
        await api.put('/admin/config/hosting', { 
          renderApiKey: config.renderApiKey, 
          vercelApiKey: config.vercelApiKey 
        });
      } else if (group === 'typography') {
        await api.put('/admin/config/typography', { 
          primaryFont: config.primaryFont, 
          secondaryFont: config.secondaryFont,
          tertiaryFont: config.tertiaryFont
        });
      } else if (group === 'ai') {
        await api.put('/admin/config/ai-llm', { 
          apiUrl: config.aiLlmApiUrl, 
          apiKey: config.aiLlmApiKey, 
          model: config.aiLlmModel 
        });
      }
      alert(`${group.toUpperCase()} settings saved successfully.`);
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.message || `Failed to save ${group} settings.`;
      alert(`Error: ${errMsg}`);
    }
    setSavingGroup('');
  };

  const handleSaveAll = async () => {
    if (!validateGroup('gps') || !validateGroup('video') || !validateGroup('smtp') || !validateGroup('pwa')) {
      return;
    }
    setSavingGroup('all');
    try {
      await Promise.all([
        api.put('/admin/config/gps', { radiusKm: String(config.gpsNewsRadius) }),
        api.put('/admin/config/video-limit', { maxDurationSeconds: String(config.videoLengthLimit) }),
        api.put('/admin/config/smtp', { 
          host: config.smtpHost, 
          port: config.smtpPort,
          username: config.smtpUsername,
          password: config.smtpPassword 
        }),
        api.put('/admin/config/sms', { apiKey: config.smsGatewayKey }),
        api.put('/admin/config/firebase', { config: config.firebaseProjectId }),
        api.put('/admin/config/cdn', { baseUrl: config.cdnBaseUrl, apiKey: config.cdnApiKey }),
        api.put('/admin/config/telegram', { 
          botToken: config.telegramBotToken, 
          chatId: config.telegramChatId,
          enabled: String(config.telegramEnabled)
        }),
        api.put('/admin/config/pwa', {
          name: config.pwaName,
          shortName: config.pwaShortName,
          themeColor: config.pwaThemeColor,
          backgroundColor: config.pwaBackgroundColor
        }),
        api.put('/admin/config/youtube', { 
          apiKey: config.youtubeApiKey, 
          channelId: config.youtubeChannelId 
        }),
        api.put('/admin/config/hosting', { 
          renderApiKey: config.renderApiKey, 
          vercelApiKey: config.vercelApiKey 
        }),
        api.put('/admin/config/typography', { 
          primaryFont: config.primaryFont, 
          secondaryFont: config.secondaryFont,
          tertiaryFont: config.tertiaryFont
        }),
        api.put('/admin/config/ai-llm', { 
          apiUrl: config.aiLlmApiUrl, 
          apiKey: config.aiLlmApiKey, 
          model: config.aiLlmModel 
        })
      ]);
      alert('All settings saved successfully.');
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.message || 'Failed to save some settings.';
      alert(`Error: ${errMsg}`);
    }
    setSavingGroup('');
  };

  if (loading) return <div className="animate-fade-in" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading settings...</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>System Configuration</h1>
          <p className="text-secondary" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Manage global parameters, asset CDN distribution, and third-party gateways.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSaveAll} disabled={savingGroup === 'all'}>
          <Save size={16} /> {savingGroup === 'all' ? 'Saving All...' : 'Save All Settings'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
        
        {/* Branding & PWA Settings */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '16px', fontWeight: 700 }}>
              <Smartphone size={20} color="var(--primary)" /> General Branding & PWA
            </h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Site / App Name</label>
              <input 
                type="text" name="pwaName" className="form-control" 
                value={config.pwaName} onChange={handleChange} 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Short Name</label>
              <input 
                type="text" name="pwaShortName" className="form-control" 
                value={config.pwaShortName} onChange={handleChange} 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Theme Color</label>
                <input 
                  type="color" name="pwaThemeColor" className="form-control" 
                  value={config.pwaThemeColor} onChange={handleChange} 
                  style={{ width: '100%', padding: '4px', height: '40px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)' }}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Background Color</label>
                <input 
                  type="color" name="pwaBackgroundColor" className="form-control" 
                  value={config.pwaBackgroundColor} onChange={handleChange} 
                  style={{ width: '100%', padding: '4px', height: '40px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)' }}
                />
              </div>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => handleSaveGroup('pwa')} disabled={savingGroup !== ''}>
            {savingGroup === 'pwa' ? 'Saving Branding...' : 'Save Branding Settings'}
          </button>
        </div>

        {/* S3 Asset CDN Settings */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '16px', fontWeight: 700 }}>
              <HardDrive size={20} color="var(--primary)" /> S3 Asset CDN Settings
            </h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>CDN Base URL</label>
              <input 
                type="text" name="cdnBaseUrl" className="form-control" 
                value={config.cdnBaseUrl} onChange={handleChange} 
                placeholder="e.g. https://cdn.king24x7.com"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                Overrides default S3 URL paths with a custom proxy CDN domain.
              </small>
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>CDN API Key</label>
              <input 
                type="password" name="cdnApiKey" className="form-control" 
                value={config.cdnApiKey} onChange={handleChange} 
                placeholder="CDN Key/Secret (Encrypted at rest)"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => handleSaveGroup('cdn')} disabled={savingGroup !== ''}>
            {savingGroup === 'cdn' ? 'Saving CDN...' : 'Save CDN Settings'}
          </button>
        </div>

        {/* General Variables */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '16px', fontWeight: 700 }}>
              <Server size={20} color="var(--primary)" /> Portal Variables
            </h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '13px' }}>
                <MapPin size={14} /> GPS News Radius (km)
              </label>
              <input 
                type="number" name="gpsNewsRadius" className="form-control" 
                value={config.gpsNewsRadius} onChange={handleChange} 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '13px' }}>
                <Video size={14} /> Max Video Upload (sec)
              </label>
              <input 
                type="number" name="videoLengthLimit" className="form-control" 
                value={config.videoLengthLimit} onChange={handleChange} 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={async () => {
            if (!validateGroup('gps') || !validateGroup('video')) return;
            setSavingGroup('variables');
            try {
              await api.put('/admin/config/gps', { radiusKm: String(config.gpsNewsRadius) });
              await api.put('/admin/config/video-limit', { maxDurationSeconds: String(config.videoLengthLimit) });
              alert("Portal variables saved successfully.");
            } catch (error) {
              console.error(error);
              const errMsg = error.response?.data?.message || "Failed to save portal variables.";
              alert(`Error: ${errMsg}`);
            }
            setSavingGroup('');
          }} disabled={savingGroup !== ''}>
            {savingGroup === 'variables' ? 'Saving...' : 'Save Variables'}
          </button>
        </div>

        {/* Email/SMTP */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '16px', fontWeight: 700 }}>
              <Mail size={20} color="var(--primary)" /> SMTP Mail Gateway
            </h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>SMTP Host</label>
              <input 
                type="text" name="smtpHost" className="form-control" 
                value={config.smtpHost} onChange={handleChange} 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>SMTP Port</label>
              <input 
                type="text" name="smtpPort" className="form-control" 
                value={config.smtpPort} onChange={handleChange} 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => handleSaveGroup('smtp')} disabled={savingGroup !== ''}>
            {savingGroup === 'smtp' ? 'Saving SMTP...' : 'Save SMTP Settings'}
          </button>
        </div>

        {/* SMS/OTP */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '16px', fontWeight: 700 }}>
              <Smartphone size={20} color="var(--primary)" /> SMS / OTP Gateway
            </h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>API Key</label>
              <input 
                type="password" name="smsGatewayKey" className="form-control" 
                value={config.smsGatewayKey} onChange={handleChange} 
                placeholder="SMS Gateway API Key"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => handleSaveGroup('sms')} disabled={savingGroup !== ''}>
            {savingGroup === 'sms' ? 'Saving SMS...' : 'Save SMS Settings'}
          </button>
        </div>

        {/* YouTube / Social Links */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '16px', fontWeight: 700 }}>
              <Video size={20} color="var(--primary)" /> YouTube Integration
            </h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>YouTube Channel ID</label>
              <input 
                type="text" name="youtubeChannelId" className="form-control" 
                value={config.youtubeChannelId} onChange={handleChange} 
                placeholder="e.g. UCxxxxxxxxxxxx"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>YouTube API Key</label>
              <input 
                type="password" name="youtubeApiKey" className="form-control" 
                value={config.youtubeApiKey} onChange={handleChange} 
                placeholder="Google Cloud API Key"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => handleSaveGroup('youtube')} disabled={savingGroup !== ''}>
            {savingGroup === 'youtube' ? 'Saving YouTube...' : 'Save YouTube Settings'}
          </button>
        </div>

        {/* Telegram Bot Integration */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '16px', fontWeight: 700 }}>
              <Send size={20} color="var(--primary)" /> Telegram Bot Integration
            </h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Telegram Bot Token</label>
              <input 
                type="password" name="telegramBotToken" className="form-control" 
                value={config.telegramBotToken} onChange={handleChange} 
                placeholder="Telegram API Token (Encrypted)"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Channel / Chat Target ID</label>
              <input 
                type="text" name="telegramChatId" className="form-control" 
                value={config.telegramChatId} onChange={handleChange} 
                placeholder="e.g. @kingstv_alerts or -100xxxxxxxx"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" name="telegramEnabled" id="telegramEnabled"
                checked={config.telegramEnabled === 'true' || config.telegramEnabled === true} 
                onChange={(e) => setConfig(prev => ({ ...prev, telegramEnabled: e.target.checked ? 'true' : 'false' }))}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="telegramEnabled" style={{ fontWeight: 600, fontSize: '13px', cursor: 'pointer', margin: 0 }}>
                Enable Automatic Pushes
              </label>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => handleSaveGroup('telegram')} disabled={savingGroup !== ''}>
            {savingGroup === 'telegram' ? 'Saving Telegram...' : 'Save Telegram Settings'}
          </button>
        </div>

        {/* YouTube API Integration */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '16px', fontWeight: 700 }}>
              <Youtube size={20} color="var(--primary)" /> YouTube API Config
            </h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>YouTube API Key</label>
              <input 
                type="password" name="youtubeApiKey" className="form-control" 
                value={config.youtubeApiKey} onChange={handleChange} 
                placeholder="YouTube API Key (Encrypted)"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>YouTube Channel ID</label>
              <input 
                type="text" name="youtubeChannelId" className="form-control" 
                value={config.youtubeChannelId} onChange={handleChange} 
                placeholder="e.g. UCxxxxxxxxx"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => handleSaveGroup('youtube')} disabled={savingGroup !== ''}>
            {savingGroup === 'youtube' ? 'Saving YouTube...' : 'Save YouTube Settings'}
          </button>
        </div>

        {/* Hosting Gateways Config */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '16px', fontWeight: 700 }}>
              <Cloud size={20} color="var(--primary)" /> Hosting Gateways Config
            </h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Render API Key</label>
              <input 
                type="password" name="renderApiKey" className="form-control" 
                value={config.renderApiKey} onChange={handleChange} 
                placeholder="Render Deployment API Key"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Vercel API Key</label>
              <input 
                type="password" name="vercelApiKey" className="form-control" 
                value={config.vercelApiKey} onChange={handleChange} 
                placeholder="Vercel Deployment API Key"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => handleSaveGroup('hosting')} disabled={savingGroup !== ''}>
            {savingGroup === 'hosting' ? 'Saving Hosting...' : 'Save Hosting Settings'}
          </button>
        </div>

        {/* Typography / Font Settings */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '16px', fontWeight: 700 }}>
              <span style={{ fontSize: '20px' }}>Aa</span> Typography & Font Config
            </h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Primary Font (Headings)</label>
              <input 
                type="text" name="primaryFont" className="form-control" 
                value={config.primaryFont} onChange={handleChange} 
                placeholder="e.g. Inter, Roboto"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Secondary Font (Body Text)</label>
              <input 
                type="text" name="secondaryFont" className="form-control" 
                value={config.secondaryFont} onChange={handleChange} 
                placeholder="e.g. Merriweather"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Tertiary Font (Accents)</label>
              <input 
                type="text" name="tertiaryFont" className="form-control" 
                value={config.tertiaryFont} onChange={handleChange} 
                placeholder="e.g. Poppins"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => handleSaveGroup('typography')} disabled={savingGroup !== ''}>
            {savingGroup === 'typography' ? 'Saving Fonts...' : 'Save Typography Settings'}
          </button>
        </div>

        {/* Google AI Studio / Gemini Config */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '16px', fontWeight: 700 }}>
              <Sparkles size={20} color="var(--primary)" /> Google AI Studio Config
            </h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Gemini API Key</label>
              <input 
                type="password" name="aiLlmApiKey" className="form-control" 
                value={config.aiLlmApiKey} onChange={handleChange} 
                placeholder="Google AI Studio Gemini API Key"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Google AI API URL</label>
              <input 
                type="text" name="aiLlmApiUrl" className="form-control" 
                value={config.aiLlmApiUrl} onChange={handleChange} 
                placeholder="Leave blank to use default API URL"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>AI Model Name</label>
              <input 
                type="text" name="aiLlmModel" className="form-control" 
                value={config.aiLlmModel} onChange={handleChange} 
                placeholder="e.g. gemini-2.0-flash"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--body-bg)', color: 'var(--text-dark)' }}
              />
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => handleSaveGroup('ai')} disabled={savingGroup !== ''}>
            {savingGroup === 'ai' ? 'Saving AI Studio...' : 'Save AI Settings'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SystemSettings;
