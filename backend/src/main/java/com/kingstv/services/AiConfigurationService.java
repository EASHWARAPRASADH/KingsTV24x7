package com.kingstv.services;

import com.kingstv.models.AiConfiguration;
import com.kingstv.repository.AiConfigurationRepository;
import com.kingstv.services.ai.providers.*;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class AiConfigurationService {

    @Autowired
    private AiConfigurationRepository aiConfigurationRepository;

    @Autowired
    private EncryptionService encryptionService;

    @Autowired
    private SystemConfigService systemConfigService;

    private final Map<String, LLMProvider> providerInstances = new HashMap<>();

    public AiConfigurationService() {
        providerInstances.put("gemini", new GeminiProvider());
        providerInstances.put("openai", new OpenAIProvider());
        providerInstances.put("anthropic", new AnthropicProvider());
        providerInstances.put("groq", new GroqProvider());
        providerInstances.put("openrouter", new OpenRouterProvider());
        providerInstances.put("ollama", new OllamaProvider());
    }

    @PostConstruct
    @Transactional
    public void seedDefaults() {
        // Initialize default configuration templates if table is empty or missing configurations
        List<String> defaultProviders = List.of("gemini", "openai", "anthropic", "groq", "openrouter", "ollama");
        Map<String, String> defaultUrls = Map.of(
            "gemini", "https://generativelanguage.googleapis.com/v1beta",
            "openai", "https://api.openai.com/v1",
            "anthropic", "https://api.anthropic.com/v1",
            "groq", "https://api.groq.com/openai/v1",
            "openrouter", "https://openrouter.ai/api/v1",
            "ollama", "http://localhost:11434/api/chat"
        );
        Map<String, String> defaultModels = Map.of(
            "gemini", "gemini-flash-latest",
            "openai", "gpt-4o-mini",
            "anthropic", "claude-3-5-sonnet-20241022",
            "groq", "llama-3.3-70b-versatile",
            "openrouter", "google/gemini-2.0-flash-exp:free",
            "ollama", "llama3"
        );

        for (String prov : defaultProviders) {
            Optional<AiConfiguration> existing = aiConfigurationRepository.findByProvider(prov);
            if (existing.isEmpty()) {
                AiConfiguration conf = new AiConfiguration();
                conf.setProvider(prov);
                conf.setBaseUrl(defaultUrls.get(prov));
                conf.setModel(defaultModels.get(prov));
                if ("gemini".equals(prov)) {
                    String geminiKey = System.getenv("GEMINI_API_KEY");
                    if (geminiKey != null && !geminiKey.isBlank()) {
                        try {
                            conf.setApiKey(encryptionService.encrypt(geminiKey));
                            conf.setIsEncrypted(true);
                        } catch (Exception e) {
                            conf.setApiKey(geminiKey);
                            conf.setIsEncrypted(false);
                        }
                    } else {
                        conf.setApiKey("");
                        conf.setIsEncrypted(false);
                    }
                    conf.setEnableAi(true);
                }
                conf.setTemperature(0.3);
                conf.setMaxTokens(1024);
                conf.setTimeout(30);
                conf.setRetryAttempts(3);
                conf.setEnableAi(prov.equals("gemini"));
                conf.setEnableTranslation(true);
                conf.setEnableSeo(true);
                conf.setEnableSummary(true);
                conf.setEnableRewrite(true);
                conf.setEnableTags(true);
                conf.setEnableKeywords(true);
                conf.setEnableLogging(false);
                conf.setEnableCache(false);
                conf.setIsActive(prov.equals("gemini")); // Make gemini active by default
                conf.setCreatedAt(LocalDateTime.now());
                conf.setUpdatedAt(LocalDateTime.now());
                aiConfigurationRepository.save(conf);
            }
        }
    }

    public List<AiConfiguration> getAllConfigurations() {
        List<AiConfiguration> configs = aiConfigurationRepository.findAll();
        // Mask API Keys for display security
        for (AiConfiguration c : configs) {
            if (c.getApiKey() != null && !c.getApiKey().isBlank()) {
                c.setApiKey("[SECURED]");
            }
        }
        return configs;
    }

    public Optional<AiConfiguration> getConfiguration(String provider) {
        Optional<AiConfiguration> opt = aiConfigurationRepository.findByProvider(provider.toLowerCase());
        opt.ifPresent(c -> {
            if (c.getApiKey() != null && !c.getApiKey().isBlank()) {
                c.setApiKey("[SECURED]");
            }
        });
        return opt;
    }

    public Optional<AiConfiguration> getActiveConfigurationDecrypted() {
        Optional<AiConfiguration> opt = aiConfigurationRepository.findByIsActiveTrue();
        if (opt.isPresent()) {
            AiConfiguration dec = cloneConfig(opt.get());
            if (dec.getApiKey() != null && !dec.getApiKey().isBlank() && Boolean.TRUE.equals(dec.getIsEncrypted())) {
                try {
                    dec.setApiKey(encryptionService.decrypt(dec.getApiKey()));
                } catch (Exception e) {
                    // Ignore decryption failure if it wasn't valid AES
                }
            }
            if ("gemini".equalsIgnoreCase(dec.getProvider())) {
                if (dec.getApiKey() == null || dec.getApiKey().isBlank() || "[SECURED]".equals(dec.getApiKey())) {
                    String configKey = systemConfigService.getConfigValue(com.kingstv.models.SystemConfig.AI_LLM_API_KEY);
                    if (configKey != null && !configKey.isBlank()) {
                        dec.setApiKey(configKey);
                    }
                }
                if (dec.getApiKey() == null || dec.getApiKey().isBlank() || "[SECURED]".equals(dec.getApiKey())) {
                    String envKey = System.getenv("GEMINI_API_KEY");
                    if (envKey != null && !envKey.isBlank()) {
                        dec.setApiKey(envKey);
                    }
                }
                String configUrl = systemConfigService.getConfigValue(com.kingstv.models.SystemConfig.AI_LLM_API_URL);
                if (configUrl != null && !configUrl.isBlank()) {
                    dec.setBaseUrl(configUrl);
                }
                String configModel = systemConfigService.getConfigValue(com.kingstv.models.SystemConfig.AI_LLM_MODEL);
                if (configModel != null && !configModel.isBlank()) {
                    dec.setModel(configModel);
                }
            }
            if ((dec.getApiKey() == null || dec.getApiKey().isBlank() || "[SECURED]".equals(dec.getApiKey())) && "openrouter".equalsIgnoreCase(dec.getProvider())) {
                String envKey = System.getenv("OPENROUTER_API_KEY");
                if (envKey != null && !envKey.isBlank()) {
                    dec.setApiKey(envKey);
                }
            }
            return Optional.of(dec);
        }
        return Optional.empty();
    }

    public Optional<AiConfiguration> getConfigurationDecrypted(String provider) {
        Optional<AiConfiguration> opt = aiConfigurationRepository.findByProvider(provider.toLowerCase());
        if (opt.isPresent()) {
            AiConfiguration dec = cloneConfig(opt.get());
            if (dec.getApiKey() != null && !dec.getApiKey().isBlank() && Boolean.TRUE.equals(dec.getIsEncrypted())) {
                try {
                    dec.setApiKey(encryptionService.decrypt(dec.getApiKey()));
                } catch (Exception e) {
                    // Ignore decryption failure
                }
            }
            if ("gemini".equalsIgnoreCase(dec.getProvider())) {
                if (dec.getApiKey() == null || dec.getApiKey().isBlank() || "[SECURED]".equals(dec.getApiKey())) {
                    String configKey = systemConfigService.getConfigValue(com.kingstv.models.SystemConfig.AI_LLM_API_KEY);
                    if (configKey != null && !configKey.isBlank()) {
                        dec.setApiKey(configKey);
                    }
                }
                if (dec.getApiKey() == null || dec.getApiKey().isBlank() || "[SECURED]".equals(dec.getApiKey())) {
                    String envKey = System.getenv("GEMINI_API_KEY");
                    if (envKey != null && !envKey.isBlank()) {
                        dec.setApiKey(envKey);
                    }
                }
                String configUrl = systemConfigService.getConfigValue(com.kingstv.models.SystemConfig.AI_LLM_API_URL);
                if (configUrl != null && !configUrl.isBlank()) {
                    dec.setBaseUrl(configUrl);
                }
                String configModel = systemConfigService.getConfigValue(com.kingstv.models.SystemConfig.AI_LLM_MODEL);
                if (configModel != null && !configModel.isBlank()) {
                    dec.setModel(configModel);
                }
            }
            if ((dec.getApiKey() == null || dec.getApiKey().isBlank() || "[SECURED]".equals(dec.getApiKey())) && "openrouter".equalsIgnoreCase(dec.getProvider())) {
                String envKey = System.getenv("OPENROUTER_API_KEY");
                if (envKey != null && !envKey.isBlank()) {
                    dec.setApiKey(envKey);
                }
            }
            return Optional.of(dec);
        }
        return Optional.empty();
    }

    @Transactional
    public AiConfiguration saveConfiguration(String provider, AiConfiguration request, Long userId) throws Exception {
        AiConfiguration existing = aiConfigurationRepository.findByProvider(provider.toLowerCase())
            .orElseThrow(() -> new IllegalArgumentException("Provider not supported: " + provider));

        existing.setBaseUrl(request.getBaseUrl());
        existing.setModel(request.getModel());
        existing.setTemperature(request.getTemperature());
        existing.setMaxTokens(request.getMaxTokens());
        existing.setTimeout(request.getTimeout());
        existing.setRetryAttempts(request.getRetryAttempts());
        existing.setEnableAi(request.getEnableAi());
        existing.setEnableTranslation(request.getEnableTranslation());
        existing.setEnableSeo(request.getEnableSeo());
        existing.setEnableSummary(request.getEnableSummary());
        existing.setEnableRewrite(request.getEnableRewrite());
        existing.setEnableTags(request.getEnableTags());
        existing.setEnableKeywords(request.getEnableKeywords());
        existing.setEnableLogging(request.getEnableLogging());
        existing.setEnableCache(request.getEnableCache());
        existing.setUpdatedAt(LocalDateTime.now());
        existing.setUpdatedBy(userId);

        // Only update API Key if a new non-masked value is provided
        if (request.getApiKey() != null && !request.getApiKey().isBlank() && !"[SECURED]".equals(request.getApiKey())) {
            existing.setApiKey(encryptionService.encrypt(request.getApiKey()));
            existing.setIsEncrypted(true);
        }

        AiConfiguration saved = aiConfigurationRepository.save(existing);
        // Return masked config
        AiConfiguration response = cloneConfig(saved);
        if (response.getApiKey() != null && !response.getApiKey().isBlank()) {
            response.setApiKey("[SECURED]");
        }
        return response;
    }

    @Transactional
    public void activateProvider(String provider, Long userId) {
        List<AiConfiguration> all = aiConfigurationRepository.findAll();
        for (AiConfiguration c : all) {
            c.setIsActive(c.getProvider().equalsIgnoreCase(provider));
            c.setUpdatedAt(LocalDateTime.now());
            c.setUpdatedBy(userId);
        }
        aiConfigurationRepository.saveAll(all);
    }

    @Transactional
    public AiConfiguration resetToDefault(String provider, Long userId) {
        AiConfiguration config = aiConfigurationRepository.findByProvider(provider.toLowerCase())
            .orElseThrow(() -> new IllegalArgumentException("Provider not found"));

        Map<String, String> defaultUrls = Map.of(
            "gemini", "https://generativelanguage.googleapis.com/v1beta",
            "openai", "https://api.openai.com/v1",
            "anthropic", "https://api.anthropic.com/v1",
            "groq", "https://api.groq.com/openai/v1",
            "openrouter", "https://openrouter.ai/api/v1",
            "ollama", "http://localhost:11434/api/chat"
        );
        Map<String, String> defaultModels = Map.of(
            "gemini", "gemini-2.0-flash",
            "openai", "gpt-4o-mini",
            "anthropic", "claude-3-5-sonnet-20241022",
            "groq", "llama-3.3-70b-versatile",
            "openrouter", "google/gemini-2.0-flash-exp:free",
            "ollama", "llama3"
        );

        config.setBaseUrl(defaultUrls.get(provider.toLowerCase()));
        config.setModel(defaultModels.get(provider.toLowerCase()));
        config.setTemperature(0.3);
        config.setMaxTokens(1024);
        config.setTimeout(30);
        config.setRetryAttempts(3);
        config.setUpdatedAt(LocalDateTime.now());
        config.setUpdatedBy(userId);

        return aiConfigurationRepository.save(config);
    }

    public boolean testProviderConnection(String provider, AiConfiguration config) throws Exception {
        LLMProvider client = providerInstances.get(provider.toLowerCase());
        if (client == null) {
            throw new IllegalArgumentException("Unsupported connection provider: " + provider);
        }
        
        // Decrypt key if masked or encrypted
        if (config.getApiKey() != null && ("[SECURED]".equals(config.getApiKey()) || config.getIsEncrypted())) {
            AiConfiguration existing = aiConfigurationRepository.findByProvider(provider.toLowerCase()).orElse(null);
            if (existing != null && existing.getApiKey() != null) {
                config.setApiKey(encryptionService.decrypt(existing.getApiKey()));
            }
        }

        return client.testConnection(config);
    }

    public String generateArticleDraft(String baseContent, String categoryList) throws Exception {
        String promptTemplate = systemConfigService.getConfigValueOrDefault(
            com.kingstv.models.SystemConfig.AI_PROMPT_GENERATE_DRAFT,
            "You are a professional news editor. Given the following source notes/documents, generate a complete, ready-to-publish news article in both English and Tamil. Return ONLY a valid JSON object matching this exact schema, with no markdown formatting or explanation outside the JSON:\n\n{\n  \"titleEn\": \"English Title (max 12 words)\",\n  \"titleTa\": \"Tamil Title (max 12 words)\",\n  \"contentEn\": \"Full professional English news article with HTML paragraphs <p>\",\n  \"contentTa\": \"Full professional Tamil news article with HTML paragraphs <p>\",\n  \"excerptEn\": \"1-2 sentence English summary\",\n  \"excerptTa\": \"1-2 sentence Tamil summary\",\n  \"seoTitle\": \"SEO optimized title max 60 chars\",\n  \"metaDescription\": \"SEO description max 160 chars\",\n  \"metaKeywords\": \"comma, separated, tags\",\n  \"focusKeywords\": \"primary, keywords\",\n  \"slug\": \"english-url-slug\",\n  \"categoryId\": \"Suggest the best category ID from this list: {catNames}\"\n}\n\nSource Notes:\n\"{baseContent}\""
        );

        String catNames = (categoryList != null && !categoryList.isBlank()) ? categoryList : "1:General";
        String prompt = promptTemplate.replace("{catNames}", catNames).replace("{baseContent}", baseContent != null ? baseContent.substring(0, Math.min(baseContent.length(), 4000)) : "");

        return executeAiPrompt(prompt);
    }

    public String proofreadAndAutoFill(String baseContent, String categoryList) throws Exception {
        String promptTemplate = systemConfigService.getConfigValueOrDefault(
            com.kingstv.models.SystemConfig.AI_PROMPT_PROOFREAD_AUTOFILL,
            "You are a world-class news editor and SEO expert.\nGiven the following draft news content (which may contain spelling, grammar, punctuation, or formatting mistakes), perform the following:\n1. Proofread and correct all spelling, grammar, typography, and phrasing mistakes. Return production-ready HTML for both Tamil and English versions.\n2. Generate optimized headlines (Tamil Title & English Title).\n3. Generate concise 1-2 sentence excerpts (Tamil & English).\n4. Generate complete SEO metadata for BOTH languages: Meta Title (Tamil & English), Meta Description (Tamil & English), Focus Keywords (Tamil & English), News Tags (Tamil & English), clean English URL Slug.\n5. Suggest the best category ID from this list: {catNames}.\n6. Infer or suggest News Source/Agency (e.g. Kings TV Desk) and News Location/City (e.g. Chennai).\n\nReturn ONLY a valid JSON object matching this schema with NO markdown formatting outside the JSON:\n\n{\n  \"titleTa\": \"Tamil Title\",\n  \"titleEn\": \"English Title\",\n  \"contentTa\": \"Proofread corrected HTML for Tamil\",\n  \"contentEn\": \"Proofread corrected HTML for English\",\n  \"shortDescTa\": \"1-2 sentence Tamil summary\",\n  \"shortDescEn\": \"1-2 sentence English summary\",\n  \"metaTitleTa\": \"SEO Meta Title in Tamil\",\n  \"metaTitleEn\": \"SEO Meta Title in English\",\n  \"metaDescriptionTa\": \"SEO Meta Description in Tamil\",\n  \"metaDescriptionEn\": \"SEO Meta Description in English\",\n  \"focusKeywordsTa\": \"தமிழ், முக்கிய, சொற்கள்\",\n  \"focusKeywordsEn\": \"primary, focus, keywords\",\n  \"metaKeywordsTa\": \"செய்திகள், தமிழ், சென்னை, பிரேக்கிங்\",\n  \"metaKeywordsEn\": \"news, tags, comma, separated\",\n  \"metaTitle\": \"SEO Meta Title max 60 chars\",\n  \"metaDescription\": \"SEO Meta Description max 160 chars\",\n  \"focusKeywords\": \"primary, keywords\",\n  \"metaKeywords\": \"news, tags, comma, separated\",\n  \"slug\": \"english-url-slug\",\n  \"categoryId\": \"suggested category ID\",\n  \"suggestedSource\": \"Kings TV Desk\",\n  \"suggestedLocation\": \"Chennai\"\n}\n\nDraft Content to Proofread & Process:\n\"{baseContent}\""
        );

        String catNames = (categoryList != null && !categoryList.isBlank()) ? categoryList : "1:General";
        String prompt = promptTemplate.replace("{catNames}", catNames).replace("{baseContent}", baseContent != null ? baseContent.substring(0, Math.min(baseContent.length(), 4000)) : "");

        return executeAiPrompt(prompt);
    }

    private String executeAiPrompt(String prompt) throws Exception {
        try {
            AiConfiguration config = getActiveConfigurationDecrypted()
                .orElseGet(() -> getConfigurationDecrypted("gemini").orElse(null));

            if (config != null && config.getApiKey() != null && !config.getApiKey().isBlank() && !"[SECURED]".equals(config.getApiKey())) {
                LLMProvider providerClient = getProviderClient(config.getProvider());
                if (providerClient == null) {
                    providerClient = getProviderClient("gemini");
                }
                String result = providerClient.generateContent(prompt, config);
                if (result != null && !result.isBlank()) {
                    return result;
                }
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(AiConfigurationService.class).warn("LLM API execution failed on server, activating smart fallback response:", e);
            return buildSmartFallbackJson(prompt);
        }

        return buildSmartFallbackJson(prompt);
    }

    public String generateMultimodal(byte[] base64Data, String mimeType, String prompt) throws Exception {
        AiConfiguration config = getActiveConfigurationDecrypted().orElse(null);
        if (config == null || config.getApiKey() == null || config.getApiKey().isBlank() || "[SECURED]".equals(config.getApiKey())) {
            config = getConfigurationDecrypted("gemini").orElse(null);
        }
        if (config == null || config.getApiKey() == null || config.getApiKey().isBlank() || "[SECURED]".equals(config.getApiKey())) {
            throw new IllegalStateException("Backend Gemini API Key is not configured. Please set GEMINI_API_KEY environment variable on server.");
        }
        LLMProvider providerClient = getProviderClient(config.getProvider());
        if (providerClient == null) {
            providerClient = getProviderClient("gemini");
        }
        return providerClient.generateContentMultimodal(base64Data, mimeType, prompt, config);
    }

    private String buildSmartFallbackJson(String prompt) {
        String content = prompt;
        int idx = prompt.indexOf("Draft Content to Proofread & Process:");
        if (idx != -1) {
            content = prompt.substring(idx + "Draft Content to Proofread & Process:".length()).trim();
        } else {
            idx = prompt.indexOf("Source Notes:\n\"");
            if (idx != -1) {
                content = prompt.substring(idx + "Source Notes:\n\"".length()).trim();
            }
        }
        content = content.replaceAll("^\"|\"$", "").trim();

        String cleanText = content.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
        String firstSentence = cleanText.length() > 150 ? cleanText.substring(0, 150) + "..." : cleanText;
        if (firstSentence.isEmpty()) firstSentence = "Kings TV News Update";

        String titleEn = firstSentence.length() > 60 ? firstSentence.substring(0, 60) : firstSentence;
        String titleTa = titleEn;
        String slug = titleEn.toLowerCase().replaceAll("[^a-z0-9\\s]", "").replaceAll("\\s+", "-");
        if (slug.isEmpty()) slug = "news-update-" + System.currentTimeMillis();

        String contentHtml = content.startsWith("<p>") ? content : "<p>" + content + "</p>";

        return String.format("""
            {
              "isFallback": true,
              "titleTa": "%s",
              "titleEn": "%s",
              "contentTa": "%s",
              "contentEn": "%s",
              "shortDescTa": "%s",
              "shortDescEn": "%s",
              "excerptTa": "%s",
              "excerptEn": "%s",
              "seoTitle": "%s | Kings 24x7",
              "metaTitle": "%s | Kings 24x7",
              "metaTitleTa": "%s | Kings 24x7",
              "metaTitleEn": "%s | Kings 24x7",
              "metaDescription": "%s",
              "metaDescriptionTa": "%s",
              "metaDescriptionEn": "%s",
              "focusKeywords": "kings tv, breaking news, tamil nadu news",
              "focusKeywordsTa": "செய்திகள், தமிழ்நாடு",
              "focusKeywordsEn": "kings tv, breaking news",
              "metaKeywords": "news, update, tamil nadu, chennai, kings 24x7",
              "metaKeywordsTa": "செய்திகள், தமிழ்நாடு, சென்னை",
              "metaKeywordsEn": "news, update, tamil nadu, chennai",
              "slug": "%s",
              "categoryId": "1",
              "suggestedSource": "Kings TV Desk",
              "suggestedLocation": "Chennai"
            }
            """,
            escapeJson(titleTa),
            escapeJson(titleEn),
            escapeJson(contentHtml),
            escapeJson(contentHtml),
            escapeJson(firstSentence),
            escapeJson(firstSentence),
            escapeJson(firstSentence),
            escapeJson(firstSentence),
            escapeJson(titleEn),
            escapeJson(titleEn),
            escapeJson(titleTa),
            escapeJson(titleEn),
            escapeJson(firstSentence),
            escapeJson(firstSentence),
            escapeJson(firstSentence),
            slug
        );
    }

    private String escapeJson(String input) {
        if (input == null) return "";
        return input.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", " ")
                    .replace("\r", " ");
    }

    public LLMProvider getProviderClient(String provider) {
        return providerInstances.get(provider.toLowerCase());
    }

    private AiConfiguration cloneConfig(AiConfiguration src) {
        AiConfiguration dest = new AiConfiguration();
        dest.setId(src.getId());
        dest.setProvider(src.getProvider());
        dest.setApiKey(src.getApiKey());
        dest.setModel(src.getModel());
        dest.setBaseUrl(src.getBaseUrl());
        dest.setTemperature(src.getTemperature());
        dest.setMaxTokens(src.getMaxTokens());
        dest.setTimeout(src.getTimeout());
        dest.setRetryAttempts(src.getRetryAttempts());
        dest.setEnableAi(src.getEnableAi());
        dest.setEnableTranslation(src.getEnableTranslation());
        dest.setEnableSeo(src.getEnableSeo());
        dest.setEnableSummary(src.getEnableSummary());
        dest.setEnableRewrite(src.getEnableRewrite());
        dest.setEnableTags(src.getEnableTags());
        dest.setEnableKeywords(src.getEnableKeywords());
        dest.setEnableLogging(src.getEnableLogging());
        dest.setEnableCache(src.getEnableCache());
        dest.setIsActive(src.getIsActive());
        dest.setIsEncrypted(src.getIsEncrypted());
        dest.setCreatedAt(src.getCreatedAt());
        dest.setUpdatedAt(src.getUpdatedAt());
        dest.setCreatedBy(src.getCreatedBy());
        dest.setUpdatedBy(src.getUpdatedBy());
        return dest;
    }
}
