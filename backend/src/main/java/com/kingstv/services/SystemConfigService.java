package com.kingstv.services;

import com.kingstv.models.SystemConfig;
import com.kingstv.repository.SystemConfigRepository;
import com.kingstv.security.Auditable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service for managing system configuration with encryption support.
 */
@Service
public class SystemConfigService {

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    @Autowired
    private EncryptionService encryptionService;

    // Keys that require encryption
    private static final List<String> ENCRYPTED_KEYS = List.of(
        SystemConfig.SMTP_PASSWORD,
        SystemConfig.SMS_GATEWAY_API_KEY,
        SystemConfig.WEATHER_API_KEY,
        SystemConfig.YOUTUBE_API_KEY,
        SystemConfig.CDN_API_KEY,
        SystemConfig.LIVE_STREAM_KEY,
        SystemConfig.AI_LLM_API_KEY,
        SystemConfig.TELEGRAM_BOT_TOKEN,
        SystemConfig.RENDER_API_KEY,
        SystemConfig.VERCEL_API_KEY
    );

    public String getConfigValue(String key) {
        Optional<SystemConfig> config = systemConfigRepository.findByConfigKey(key);
        if (config.isPresent()) {
            SystemConfig sc = config.get();
            if (Boolean.TRUE.equals(sc.getIsEncrypted())) {
                try {
                    return encryptionService.decrypt(sc.getConfigValue());
                } catch (Exception e) {
                    org.slf4j.LoggerFactory.getLogger(SystemConfigService.class).warn("Failed to decrypt config value for key: {}. Returning null.", key, e);
                    return null;
                }
            }
            return sc.getConfigValue();
        }
        return null;
    }

    public String getConfigValueOrDefault(String key, String defaultValue) {
        String val = getConfigValue(key);
        return val != null ? val : defaultValue;
    }

    @Auditable(action = "UPDATE", entity = "SystemConfig")
    public SystemConfig setConfigValue(String key, String value, String group, String description, Long updatedBy) {
        SystemConfig config = systemConfigRepository.findByConfigKey(key)
                .orElse(new SystemConfig());

        config.setConfigKey(key);
        config.setConfigGroup(group);
        if (description != null) config.setDescription(description);
        config.setUpdatedBy(updatedBy);

        boolean shouldEncrypt = ENCRYPTED_KEYS.contains(key);
        if (shouldEncrypt) {
            if ("••••••••".equals(value)) {
                if (config.getId() != null) {
                    return config; // Skip updating since it's the mask placeholder
                } else {
                    config.setConfigValue(encryptionService.encrypt(""));
                    config.setIsEncrypted(true);
                }
            } else {
                config.setConfigValue(encryptionService.encrypt(value));
                config.setIsEncrypted(true);
            }
        } else {
            config.setConfigValue(value);
            config.setIsEncrypted(false);
        }

        return systemConfigRepository.save(config);
    }

    public List<SystemConfig> getConfigsByGroup(String group) {
        return systemConfigRepository.findByConfigGroup(group);
    }

    public List<SystemConfig> getAllConfigs() {
        List<SystemConfig> configs = systemConfigRepository.findAll();
        // Mask encrypted values for display
        configs.forEach(c -> {
            if (Boolean.TRUE.equals(c.getIsEncrypted())) {
                c.setConfigValue("••••••••");
            }
        });
        return configs;
    }

    @Auditable(action = "BULK_UPDATE", entity = "SystemConfig")
    public void setMultipleConfigs(Map<String, String> configs, String group, Long updatedBy) {
        configs.forEach((key, value) -> setConfigValue(key, value, group, null, updatedBy));
    }
}
