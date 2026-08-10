package com.kingstv.controllers.admin;

import com.kingstv.models.SystemConfig;
import com.kingstv.security.RequiresPermission;
import com.kingstv.services.SystemConfigService;
import com.kingstv.services.DbCleanupService;
import com.kingstv.models.Permission;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.HashMap;

/**
 * System configuration controller.
 * GPS radius (#3), Firebase/SMTP/SMS (#4), API failover (#5),
 * YouTube API (#7), video limit (#9), CDN (#13), live stream (#14),
 * PWA (#17), AI LLM config.
 */
@RestController
@RequestMapping("/api/v1/admin/config")
@RequiresPermission(Permission.CONFIG_WRITE)
public class SystemConfigController {

    @Autowired
    private SystemConfigService configService;

    @Autowired
    private DbCleanupService dbCleanupService;

    @GetMapping
    @RequiresPermission(Permission.CONFIG_READ)
    public ResponseEntity<?> getAllConfigs() {
        return ResponseEntity.ok(configService.getAllConfigs());
    }

    @GetMapping("/group/{group}")
    @RequiresPermission(Permission.CONFIG_READ)
    public ResponseEntity<?> getConfigsByGroup(@PathVariable String group) {
        return ResponseEntity.ok(configService.getConfigsByGroup(group));
    }

    @GetMapping("/{key}")
    @RequiresPermission(Permission.CONFIG_READ)
    public ResponseEntity<?> getConfig(@PathVariable String key) {
        String value = configService.getConfigValue(key);
        if (value == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("key", key, "value", value));
    }

    private void setConfigsIfPresent(Map<String, String> request, String[][] keysAndRequestKeys, String group, Long userId) {
        Map<String, String> configsToSet = new HashMap<>();
        for (String[] mapping : keysAndRequestKeys) {
            String configKey = mapping[0];
            String requestKey = mapping[1];
            if (request.containsKey(requestKey)) {
                configsToSet.put(configKey, request.get(requestKey));
            }
        }
        if (!configsToSet.isEmpty()) {
            configService.setMultipleConfigs(configsToSet, group, userId);
        }
    }

    // --- GPS / Location Config (#3) ---
    @PutMapping("/gps")
    public ResponseEntity<?> updateGpsConfig(@RequestBody Map<String, String> request) {
        String radius = request.get("radiusKm");
        if (radius == null || radius.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "GPS news radius is required."));
        }
        try {
            double val = Double.parseDouble(radius);
            if (val <= 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "GPS news radius must be greater than 0."));
            }
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "GPS news radius must be a valid number."));
        }
        Long userId = getCallerId();
        configService.setConfigValue(SystemConfig.GPS_NEWS_RADIUS_KM, radius.trim(), "gps", "GPS news radius in km", userId);
        return ResponseEntity.ok(Map.of("message", "GPS config updated"));
    }

    // --- Firebase Config (#4) ---
    @PutMapping("/firebase")
    public ResponseEntity<?> updateFirebaseConfig(@RequestBody Map<String, String> request) {
        if (request.containsKey("config")) {
            Long userId = getCallerId();
            configService.setConfigValue(SystemConfig.FIREBASE_CONFIG, request.get("config"), "firebase", "Firebase configuration JSON", userId);
        }
        return ResponseEntity.ok(Map.of("message", "Firebase config updated"));
    }

    // --- SMTP Config (#4) ---
    @PutMapping("/smtp")
    public ResponseEntity<?> updateSmtpConfig(@RequestBody Map<String, String> request) {
        String host = request.get("host");
        String port = request.get("port");
        if (host == null || host.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "SMTP Host is required."));
        }
        if (port == null || port.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "SMTP Port is required."));
        }
        try {
            int val = Integer.parseInt(port);
            if (val <= 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "SMTP Port must be greater than 0."));
            }
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "SMTP Port must be a valid integer."));
        }
        Long userId = getCallerId();
        setConfigsIfPresent(request, new String[][]{
            {SystemConfig.SMTP_HOST, "host"},
            {SystemConfig.SMTP_PORT, "port"},
            {SystemConfig.SMTP_USERNAME, "username"},
            {SystemConfig.SMTP_PASSWORD, "password"}
        }, "smtp", userId);
        return ResponseEntity.ok(Map.of("message", "SMTP config updated"));
    }

    // --- SMS/OTP Gateway Config (#4) ---
    @PutMapping("/sms")
    public ResponseEntity<?> updateSmsConfig(@RequestBody Map<String, String> request) {
        Long userId = getCallerId();
        setConfigsIfPresent(request, new String[][]{
            {SystemConfig.SMS_GATEWAY_URL, "gatewayUrl"},
            {SystemConfig.SMS_GATEWAY_API_KEY, "apiKey"}
        }, "sms", userId);
        return ResponseEntity.ok(Map.of("message", "SMS gateway config updated"));
    }

    // --- API Failover Config (#5) ---
    @PutMapping("/api-failover")
    public ResponseEntity<?> updateApiFailover(@RequestBody Map<String, String> request) {
        Long userId = getCallerId();
        setConfigsIfPresent(request, new String[][]{
            {SystemConfig.API_FAILOVER_PRIMARY_URL, "primaryUrl"},
            {SystemConfig.API_FAILOVER_SECONDARY_URL, "secondaryUrl"}
        }, "api_failover", userId);
        return ResponseEntity.ok(Map.of("message", "API failover config updated"));
    }

    // --- YouTube API Config (#7) ---
    @PutMapping("/youtube")
    public ResponseEntity<?> updateYoutubeConfig(@RequestBody Map<String, String> request) {
        Long userId = getCallerId();
        setConfigsIfPresent(request, new String[][]{
            {SystemConfig.YOUTUBE_API_KEY, "apiKey"},
            {SystemConfig.YOUTUBE_CHANNEL_ID, "channelId"}
        }, "youtube", userId);
        return ResponseEntity.ok(Map.of("message", "YouTube config updated"));
    }

    // --- Video Length Limit (#9) ---
    @PutMapping("/video-limit")
    public ResponseEntity<?> updateVideoLimit(@RequestBody Map<String, String> request) {
        String maxDuration = request.get("maxDurationSeconds");
        if (maxDuration == null || maxDuration.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Video max duration is required."));
        }
        try {
            int val = Integer.parseInt(maxDuration);
            if (val <= 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Video max duration must be greater than 0."));
            }
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Video max duration must be a valid integer."));
        }
        Long userId = getCallerId();
        configService.setConfigValue(SystemConfig.VIDEO_MAX_DURATION_SECONDS, maxDuration.trim(), "video", "Max video duration in seconds", userId);
        return ResponseEntity.ok(Map.of("message", "Video limit updated"));
    }

    // --- CDN Config (#13) ---
    @PutMapping("/cdn")
    public ResponseEntity<?> updateCdnConfig(@RequestBody Map<String, String> request) {
        Long userId = getCallerId();
        setConfigsIfPresent(request, new String[][]{
            {SystemConfig.CDN_BASE_URL, "baseUrl"},
            {SystemConfig.CDN_API_KEY, "apiKey"}
        }, "cdn", userId);
        return ResponseEntity.ok(Map.of("message", "CDN config updated"));
    }

    // --- Hosting Config ---
    @PutMapping("/hosting")
    public ResponseEntity<?> updateHostingConfig(@RequestBody Map<String, String> request) {
        Long userId = getCallerId();
        setConfigsIfPresent(request, new String[][]{
            {SystemConfig.RENDER_API_KEY, "renderApiKey"},
            {SystemConfig.VERCEL_API_KEY, "vercelApiKey"}
        }, "hosting", userId);
        return ResponseEntity.ok(Map.of("message", "Hosting config updated"));
    }

    // --- Live Stream Config (#14) ---
    @PutMapping("/livestream")
    public ResponseEntity<?> updateLivestreamConfig(@RequestBody Map<String, String> request) {
        Long userId = getCallerId();
        setConfigsIfPresent(request, new String[][]{
            {SystemConfig.LIVE_STREAM_SERVER_URL, "serverUrl"},
            {SystemConfig.LIVE_STREAM_BROADCAST_URL, "broadcastUrl"},
            {SystemConfig.LIVE_STREAM_KEY, "streamKey"}
        }, "livestream", userId);
        return ResponseEntity.ok(Map.of("message", "Livestream config updated"));
    }

    // --- PWA Config (#17) ---
    @PutMapping("/pwa")
    public ResponseEntity<?> updatePwaConfig(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String shortName = request.get("shortName");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "PWA Name is required."));
        }
        if (shortName == null || shortName.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "PWA Short Name is required."));
        }
        Long userId = getCallerId();
        setConfigsIfPresent(request, new String[][]{
            {SystemConfig.PWA_NAME, "name"},
            {SystemConfig.PWA_SHORT_NAME, "shortName"},
            {SystemConfig.PWA_THEME_COLOR, "themeColor"},
            {SystemConfig.PWA_BACKGROUND_COLOR, "backgroundColor"}
        }, "pwa", userId);
        return ResponseEntity.ok(Map.of("message", "PWA config updated"));
    }

    // --- Typography Config ---
    @PutMapping("/typography")
    public ResponseEntity<?> updateTypographyConfig(@RequestBody Map<String, String> request) {
        Long userId = getCallerId();
        setConfigsIfPresent(request, new String[][]{
            {SystemConfig.FONT_PRIMARY, "primaryFont"},
            {SystemConfig.FONT_SECONDARY, "secondaryFont"},
            {SystemConfig.FONT_TERTIARY, "tertiaryFont"}
        }, "typography", userId);
        return ResponseEntity.ok(Map.of("message", "Typography config updated"));
    }

    // --- Notification Preferences ---
    @PutMapping("/notifications")
    public ResponseEntity<?> updateNotificationPreferences(@RequestBody Map<String, String> request) {
        Long userId = getCallerId();
        setConfigsIfPresent(request, new String[][]{
            {SystemConfig.NOTIFY_EMAIL_BREAKING, "emailBreaking"},
            {SystemConfig.NOTIFY_EMAIL_DAILY, "emailDaily"},
            {SystemConfig.NOTIFY_SMS_BREAKING, "smsBreaking"},
            {SystemConfig.NOTIFY_SMS_OTP, "smsOtp"}
        }, "notifications", userId);
        return ResponseEntity.ok(Map.of("message", "Notification preferences updated"));
    }

    // --- AI/LLM Config (#46) ---
    @PutMapping("/ai-llm")
    public ResponseEntity<?> updateAiLlmConfig(@RequestBody Map<String, String> request) {
        Long userId = getCallerId();
        setConfigsIfPresent(request, new String[][]{
            {SystemConfig.AI_LLM_API_URL, "apiUrl"},
            {SystemConfig.AI_LLM_API_KEY, "apiKey"},
            {SystemConfig.AI_LLM_MODEL, "model"}
        }, "ai", userId);
        return ResponseEntity.ok(Map.of("message", "AI/LLM config updated"));
    }

    private Long getCallerId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getDetails() instanceof Long) return (Long) auth.getDetails();
        return null;
    }

    // --- Weather Config ---
    @PutMapping("/weather")
    public ResponseEntity<?> updateWeatherConfig(@RequestBody Map<String, String> request) {
        Long userId = getCallerId();
        setConfigsIfPresent(request, new String[][]{
            {SystemConfig.WEATHER_API_KEY, "apiKey"}
        }, "weather", userId);
        return ResponseEntity.ok(Map.of("message", "Weather API config updated"));
    }

    // --- Telegram Config ---
    @PutMapping("/telegram")
    public ResponseEntity<?> updateTelegramConfig(@RequestBody Map<String, String> request) {
        Long userId = getCallerId();
        setConfigsIfPresent(request, new String[][]{
            {SystemConfig.TELEGRAM_BOT_TOKEN, "botToken"},
            {SystemConfig.TELEGRAM_CHAT_ID, "chatId"},
            {SystemConfig.TELEGRAM_ENABLED, "enabled"}
        }, "telegram", userId);
        return ResponseEntity.ok(Map.of("message", "Telegram config updated"));
    }

    @PostMapping("/db-cleanup")
    public ResponseEntity<?> runManualDbCleanup() {
        dbCleanupService.executeCleanup();
        return ResponseEntity.ok(Map.of("message", "Database cleanup routine executed successfully."));
    }
}
