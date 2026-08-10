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
            "You are an expert news editor and chief bilingual reporter for KINGS 24x7. Given the following raw source notes/documents, generate a complete, high-quality, publish-ready news article in both English and Tamil.\n\nSTRICT RULES:\n1. HEADLINES: Generate catchy, factual, professional headlines (max 12 words) in Tamil and English.\n2. CONTENT: Write comprehensive, well-structured news articles formatted as clean HTML paragraphs (<p>). Ensure natural, professional journalistic Tamil (இலக்கிய/செய்தி தமிழ்) and polished AP-style English.\n3. EXCERPTS: Write crisp 1-2 sentence lead summaries for Tamil and English.\n4. SEO METADATA: Generate optimized Meta Title (max 60 chars), Meta Description (max 160 chars), Focus Keywords, comma-separated News Tags, and a clean English URL slug (lowercase, hyphens only).\n5. CATEGORY: Select the most accurate Category ID from this list: {catNames}.\n\nReturn ONLY a valid JSON object matching this exact schema with NO markdown formatting outside the JSON:\n\n{\n  \"titleEn\": \"English Title (max 12 words)\",\n  \"titleTa\": \"Tamil Title (max 12 words)\",\n  \"contentEn\": \"Full professional English news article with HTML paragraphs <p>\",\n  \"contentTa\": \"Full professional Tamil news article with HTML paragraphs <p>\",\n  \"excerptEn\": \"1-2 sentence English lead summary\",\n  \"excerptTa\": \"1-2 sentence Tamil lead summary\",\n  \"seoTitle\": \"SEO optimized title max 60 chars\",\n  \"metaDescription\": \"SEO description max 160 chars\",\n  \"metaKeywords\": \"comma, separated, news, tags\",\n  \"focusKeywords\": \"primary, focus, keywords\",\n  \"slug\": \"clean-english-url-slug\",\n  \"categoryId\": \"suggested_category_id\"\n}\n\nSource Notes:\n\"{baseContent}\""
        );

        String catNames = (categoryList != null && !categoryList.isBlank()) ? categoryList : "1:General";
        String prompt = promptTemplate.replace("{catNames}", catNames).replace("{baseContent}", baseContent != null ? baseContent.substring(0, Math.min(baseContent.length(), 4000)) : "");

        return executeAiPrompt(prompt);
    }

    public String proofreadAndAutoFill(String baseContent, String categoryList) throws Exception {
        String promptTemplate = systemConfigService.getConfigValueOrDefault(
            com.kingstv.models.SystemConfig.AI_PROMPT_PROOFREAD_AUTOFILL,
            "You are a world-class news editor and SEO director for KINGS 24x7.\nAnalyze the following draft news article, proofread it thoroughly, fix all grammar/spelling errors, translate missing sections between Tamil & English, and auto-generate complete high-ranking SEO metadata.\n\nSTRICT GUIDELINES:\n1. PROOFREAD & FIX: Correct all typos, grammatical mistakes, awkward phrasing, and formatting errors in both Tamil and English text. Use formal Tamil news register (செய்தித் தமிழ்) and AP-style English journalism.\n2. BILINGUAL COMPLETION: If content is provided only in Tamil, generate a complete English version. If provided only in English, translate into fluent Tamil. Always format content as clean HTML paragraphs (<p>).\n3. HEADLINES & SUMMARIES: Create engaging headlines (titleTa, titleEn) and concise lead summaries (shortDescTa, shortDescEn).\n4. HIGH-IMPACT KEYWORDS & TAGS: Extract 6-10 highly prominent, specific news entities, proper nouns, locations, politician/official names, scheme/event names, and catchy keyphrase tags DIRECTLY from the provided article content for both Tamil and English. Do NOT return generic filler words like 'news', 'breaking', 'செய்திகள்', or 'தமிழ்நாடு'.\n5. CATEGORY & METADATA: Match the best Category ID from: {catNames}. Infer News Source (e.g. Kings TV Desk) and City/Location (e.g. Chennai).\n\nReturn ONLY a valid JSON object matching this schema with NO markdown formatting outside the JSON:\n\n{\n  \"titleTa\": \"Proofread Tamil Headline\",\n  \"titleEn\": \"Proofread English Headline\",\n  \"contentTa\": \"<p>Corrected HTML Tamil content</p>\",\n  \"contentEn\": \"<p>Corrected HTML English content</p>\",\n  \"shortDescTa\": \"1-2 sentence Tamil summary\",\n  \"shortDescEn\": \"1-2 sentence English summary\",\n  \"metaTitleTa\": \"Tamil Meta Title (50-60 chars)\",\n  \"metaTitleEn\": \"English Meta Title (50-60 chars)\",\n  \"metaDescriptionTa\": \"Tamil Meta Description (140-160 chars)\",\n  \"metaDescriptionEn\": \"English Meta Description (140-160 chars)\",\n  \"focusKeywordsTa\": \" prominent, extracted, tamil, keywords\",\n  \"focusKeywordsEn\": \"prominent, extracted, english, keywords\",\n  \"metaKeywordsTa\": \"catchy, specific, news, tags, tamil\",\n  \"metaKeywordsEn\": \"catchy, specific, news, tags, english\",\n  \"metaTitle\": \"Meta Title max 60 chars\",\n  \"metaDescription\": \"Meta Description max 160 chars\",\n  \"focusKeywords\": \"prominent, keywords\",\n  \"metaKeywords\": \"catchy, news, tags\",\n  \"slug\": \"clean-english-url-slug\",\n  \"categoryId\": \"suggested_category_id\",\n  \"suggestedSource\": \"Kings TV Desk\",\n  \"suggestedLocation\": \"Chennai\"\n}\n\nDraft Content to Proofread & Process:\n\"{baseContent}\""
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

        String title = "";
        String excerpt = "";
        String body = content;

        if (content.contains("TITLE:") || content.contains("EXCERPT:") || content.contains("CONTENT:")) {
            int titleIdx = content.indexOf("TITLE:");
            int excerptIdx = content.indexOf("EXCERPT:");
            int contentIdx = content.indexOf("CONTENT:");

            if (titleIdx != -1) {
                int end = (excerptIdx != -1) ? excerptIdx : ((contentIdx != -1) ? contentIdx : content.length());
                title = content.substring(titleIdx + 6, end).trim();
            }
            if (excerptIdx != -1) {
                int end = (contentIdx != -1) ? contentIdx : content.length();
                excerpt = content.substring(excerptIdx + 8, end).trim();
            }
            if (contentIdx != -1) {
                body = content.substring(contentIdx + 8).trim();
            }
        }

        String cleanText = body.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
        if (title.isEmpty()) {
            title = cleanText.length() > 60 ? cleanText.substring(0, 60) : (cleanText.isEmpty() ? "Kings TV News Update" : cleanText);
        }
        if (excerpt.isEmpty()) {
            excerpt = cleanText.length() > 150 ? cleanText.substring(0, 150) + "..." : cleanText;
        }

        String titleTa = title;
        String titleEn = title;
        String contentHtml = body.startsWith("<p>") ? body : "<p>" + cleanText + "</p>";
        
        // Generate dynamic SEO slug from title or content
        String slugBase = titleEn.toLowerCase().replaceAll("[^a-z0-9\\s]", "").replaceAll("\\s+", "-").replaceAll("-+", "-").replaceAll("^-|-$", "");
        if (slugBase.isEmpty()) {
            slugBase = "news-article-" + Math.abs(title.hashCode() % 100000);
        }
        String slug = slugBase;

        // Dynamic Frequency-Weighted Keyword Extraction from Content & Title
        Set<String> stopWords = Set.of("the", "and", "for", "with", "that", "this", "from", "news", "breaking", "மற்றும்", "ஒரு", "என்று", "இந்த", "செய்திகள்");
        List<String> textWords = Arrays.stream((title + " " + cleanText).split("[\\s,.:;!\"'()\\-]+"))
            .map(w -> w.trim().replaceAll("^[^\\w\\u0B80-\\u0BFF]+|[^\\w\\u0B80-\\u0BFF]+$", ""))
            .filter(w -> w.length() > 2 && !stopWords.contains(w.toLowerCase()))
            .distinct()
            .toList();

        List<String> taWords = textWords.stream().filter(w -> w.matches(".*[\\u0B80-\\u0BFF].*")).limit(8).toList();
        List<String> enWords = textWords.stream().filter(w -> w.matches(".*[a-zA-Z].*")).limit(8).toList();

        String kwTa = !taWords.isEmpty() ? String.join(", ", taWords) : "";
        String kwEn = !enWords.isEmpty() ? String.join(", ", enWords) : "";

        if (kwEn.isBlank() && !kwTa.isBlank()) {
            kwEn = translateViaGoogleGtx(kwTa, "en");
        }
        if (kwTa.isBlank() && !kwEn.isBlank()) {
            kwTa = translateViaGoogleGtx(kwEn, "ta");
        }

        if (kwTa.isBlank()) kwTa = title.length() > 5 ? title : "செய்திகள், தமிழ்நாடு";
        if (kwEn.isBlank()) kwEn = title.length() > 5 ? title : "news, breaking updates";

        String focusTa = taWords.size() >= 2 ? String.join(", ", taWords.subList(0, Math.min(3, taWords.size()))) : kwTa;
        String focusEn = enWords.size() >= 2 ? String.join(", ", enWords.subList(0, Math.min(3, enWords.size()))) : kwEn;

        String descTa = excerpt.length() > 10 ? excerpt : (cleanText.length() > 150 ? cleanText.substring(0, 150) : cleanText);
        String descEn = excerpt.length() > 10 ? excerpt : (cleanText.length() > 150 ? cleanText.substring(0, 150) : cleanText);

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
              "seoTitle": "%s",
              "metaTitle": "%s",
              "metaTitleTa": "%s",
              "metaTitleEn": "%s",
              "metaDescription": "%s",
              "metaDescriptionTa": "%s",
              "metaDescriptionEn": "%s",
              "focusKeywords": "%s",
              "focusKeywordsTa": "%s",
              "focusKeywordsEn": "%s",
              "metaKeywords": "%s",
              "metaKeywordsTa": "%s",
              "metaKeywordsEn": "%s",
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
            escapeJson(excerpt),
            escapeJson(excerpt),
            escapeJson(excerpt),
            escapeJson(excerpt),
            escapeJson(title),
            escapeJson(title),
            escapeJson(titleTa),
            escapeJson(titleEn),
            escapeJson(descTa),
            escapeJson(descTa),
            escapeJson(descEn),
            escapeJson(focusEn),
            escapeJson(focusTa),
            escapeJson(focusEn),
            escapeJson(kwEn),
            escapeJson(kwTa),
            escapeJson(kwEn),
            escapeJson(slug)
        );
    }

    private String translateViaGoogleGtx(String text, String targetLang) {
        if (text == null || text.isBlank()) return "";
        try {
            String clean = text.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
            if (clean.isBlank()) return "";
            if (clean.length() > 1000) clean = clean.substring(0, 1000);
            String url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + targetLang + "&dt=t&q=" + java.net.URLEncoder.encode(clean, java.nio.charset.StandardCharsets.UTF_8);
            org.springframework.web.client.RestTemplate rt = new org.springframework.web.client.RestTemplate();
            List<?> res = rt.getForObject(url, List.class);
            if (res != null && !res.isEmpty() && res.get(0) instanceof List) {
                List<?> sentences = (List<?>) res.get(0);
                StringBuilder sb = new StringBuilder();
                for (Object s : sentences) {
                    if (s instanceof List && !((List<?>) s).isEmpty()) {
                        Object first = ((List<?>) s).get(0);
                        if (first != null) sb.append(first.toString());
                    }
                }
                return sb.toString().trim();
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(AiConfigurationService.class).warn("Google GTX fallback error in AiConfigurationService:", e);
        }
        return "";
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
