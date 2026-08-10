package com.kingstv.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * System configuration key-value store.
 * Sensitive values (API keys, passwords) are encrypted at rest via AES-256.
 */
@Entity
@Table(name = "system_config")
public class SystemConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "config_id")
    private Long id;

    @Column(name = "config_key", nullable = false, unique = true, length = 100)
    private String configKey;

    @Column(name = "config_value", columnDefinition = "TEXT")
    private String configValue;

    @Column(name = "is_encrypted")
    private Boolean isEncrypted = false;

    @Column(name = "config_group", length = 50)
    private String configGroup;

    @Column(length = 255)
    private String description;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;

    @PrePersist
    @PreUpdate
    protected void onSave() {
        this.updatedAt = LocalDateTime.now();
    }

    // Config key constants
    public static final String GPS_NEWS_RADIUS_KM = "gps.news_radius_km";
    public static final String VIDEO_MAX_DURATION_SECONDS = "video.max_duration_seconds";
    public static final String FIREBASE_CONFIG = "firebase.config";
    public static final String SMTP_HOST = "smtp.host";
    public static final String SMTP_PORT = "smtp.port";
    public static final String SMTP_USERNAME = "smtp.username";
    public static final String SMTP_PASSWORD = "smtp.password";
    public static final String SMS_GATEWAY_URL = "sms.gateway_url";
    public static final String SMS_GATEWAY_API_KEY = "sms.gateway_api_key";
    public static final String WEATHER_API_KEY = "weather.api_key";
    public static final String YOUTUBE_API_KEY = "youtube.api_key";
    public static final String YOUTUBE_CHANNEL_ID = "youtube.channel_id";
    public static final String CDN_BASE_URL = "cdn.base_url";
    public static final String CDN_API_KEY = "cdn.api_key";
    public static final String LIVE_STREAM_SERVER_URL = "livestream.server_url";
    public static final String LIVE_STREAM_BROADCAST_URL = "livestream.broadcast_url";
    public static final String MAINTENANCE_MODE = "system.maintenance_mode";
    public static final String LIVE_STREAM_KEY = "livestream.stream_key";
    public static final String PWA_NAME = "pwa.name";
    public static final String PWA_SHORT_NAME = "pwa.short_name";
    public static final String PWA_THEME_COLOR = "pwa.theme_color";
    public static final String PWA_BACKGROUND_COLOR = "pwa.background_color";
    public static final String API_FAILOVER_PRIMARY_URL = "api.failover_primary_url";
    public static final String API_FAILOVER_SECONDARY_URL = "api.failover_secondary_url";
    public static final String AI_LLM_API_KEY = "ai.llm_api_key";
    public static final String AI_LLM_API_URL = "ai.llm_api_url";
    public static final String AI_LLM_MODEL = "ai.llm_model";
    public static final String TELEGRAM_BOT_TOKEN = "telegram.bot_token";
    public static final String TELEGRAM_CHAT_ID = "telegram.chat_id";
    public static final String TELEGRAM_ENABLED = "telegram.enabled";
    public static final String RENDER_API_KEY = "hosting.render_api_key";
    public static final String VERCEL_API_KEY = "hosting.vercel_api_key";
    public static final String FONT_PRIMARY = "font.primary";
    public static final String FONT_SECONDARY = "font.secondary";
    public static final String FONT_TERTIARY = "font.tertiary";
    public static final String NOTIFY_EMAIL_BREAKING = "notify.email.breaking";
    public static final String NOTIFY_EMAIL_DAILY = "notify.email.daily";
    public static final String NOTIFY_SMS_BREAKING = "notify.sms.breaking";
    public static final String NOTIFY_SMS_OTP = "notify.sms.otp";
    public static final String AI_PROMPT_GENERATE_DRAFT = "ai.prompt_generate_draft";
    public static final String AI_PROMPT_PROOFREAD_AUTOFILL = "ai.prompt_proofread_autofill";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getConfigKey() { return configKey; }
    public void setConfigKey(String configKey) { this.configKey = configKey; }
    public String getConfigValue() { return configValue; }
    public void setConfigValue(String configValue) { this.configValue = configValue; }
    public Boolean getIsEncrypted() { return isEncrypted; }
    public void setIsEncrypted(Boolean isEncrypted) { this.isEncrypted = isEncrypted; }
    public String getConfigGroup() { return configGroup; }
    public void setConfigGroup(String configGroup) { this.configGroup = configGroup; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
