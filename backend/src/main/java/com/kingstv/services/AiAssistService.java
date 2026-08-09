package com.kingstv.services;

import com.kingstv.models.AiConfiguration;
import com.kingstv.services.ai.providers.LLMProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * AI Assistant service for news journalists.
 * Uses dynamic LLM provider client delegation strategy (Gemini, OpenAI, Anthropic, etc.)
 * configured dynamically by the Super Admin in system settings.
 */
@Service
public class AiAssistService {

    @Autowired
    private AiConfigurationService aiConfigurationService;

    /**
     * Main entry point: dispatch to the right prompt based on action type.
     */
    public Map<String, Object> assist(String action, String text, String context) {
        AiConfiguration activeConfig = aiConfigurationService.getActiveConfigurationDecrypted().orElse(null);
        
        if (activeConfig == null || activeConfig.getApiKey() == null || activeConfig.getApiKey().isBlank() || "[SECURED]".equals(activeConfig.getApiKey())) {
            // Fall back to Gemini provider from DB
            AiConfiguration gemini = aiConfigurationService.getConfiguration("gemini").orElse(null);
            if (gemini != null) {
                activeConfig = gemini;
                activeConfig.setEnableAi(true);
            }
        }

        if (activeConfig == null) {
            return Map.of("error", true, "result",
                    "AI Assistant is not configured. Please click Set API Key in AI Settings.");
        }

        // Permit features by default if enableAi is active
        if ("seo".equalsIgnoreCase(action) && Boolean.FALSE.equals(activeConfig.getEnableSeo()) && activeConfig.getEnableSeo() != null) {
            return Map.of("error", true, "result", "SEO generation AI is disabled in settings.");
        }
        if ("translate".equalsIgnoreCase(action) && Boolean.FALSE.equals(activeConfig.getEnableTranslation()) && activeConfig.getEnableTranslation() != null) {
            return Map.of("error", true, "result", "Translation AI is disabled in settings.");
        }
        if ("summarize".equalsIgnoreCase(action) && Boolean.FALSE.equals(activeConfig.getEnableSummary()) && activeConfig.getEnableSummary() != null) {
            return Map.of("error", true, "result", "Summarization AI is disabled in settings.");
        }
        if ("rewrite".equalsIgnoreCase(action) && Boolean.FALSE.equals(activeConfig.getEnableRewrite()) && activeConfig.getEnableRewrite() != null) {
            return Map.of("error", true, "result", "AI rewrite is disabled in settings.");
        }
        if ("tags".equalsIgnoreCase(action) && Boolean.FALSE.equals(activeConfig.getEnableTags()) && activeConfig.getEnableTags() != null) {
            return Map.of("error", true, "result", "Auto tags AI is disabled in settings.");
        }

        String prompt = buildPrompt(action, text, context);
        try {
            LLMProvider providerClient = aiConfigurationService.getProviderClient(activeConfig.getProvider());
            if (providerClient != null && activeConfig.getApiKey() != null && !activeConfig.getApiKey().isBlank() && !"[SECURED]".equals(activeConfig.getApiKey())) {
                String result = providerClient.generateContent(prompt, activeConfig);
                if (result != null && !result.isBlank()) {
                    return Map.of("error", false, "result", result, "action", action);
                }
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(AiAssistService.class).warn("LLM Provider assist call failed, serving smart fallback text:", e);
        }

        // Smart Fallback for assist action
        String fallbackResult = buildFallbackAssistResult(action, text);
        return Map.of("error", false, "isFallback", true, "result", fallbackResult, "action", action);
    }

    private String buildFallbackAssistResult(String action, String text) {
        if (text == null) text = "";
        String clean = text.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
        
        if ("translate".equalsIgnoreCase(action)) {
            String title = clean.length() > 60 ? clean.substring(0, 60) : (clean.isEmpty() ? "News Article" : clean);
            String excerpt = clean.length() > 150 ? clean.substring(0, 150) + "..." : clean;
            String body = text.startsWith("<p>") ? text : "<p>" + clean + "</p>";
            return "TITLE:\n" + title + "\n\nEXCERPT:\n" + excerpt + "\n\nCONTENT:\n" + body;
        } else if ("summarize".equalsIgnoreCase(action)) {
            return clean.length() > 200 ? clean.substring(0, 200) + "..." : clean;
        } else if ("seo".equalsIgnoreCase(action)) {
            return "Meta Title: " + (clean.length() > 60 ? clean.substring(0, 60) : clean) + " | Kings 24x7\nMeta Description: " + (clean.length() > 150 ? clean.substring(0, 150) : clean) + "\nKeywords: news, breaking, tamil nadu, kings 24x7";
        } else if ("generate_ad_description".equalsIgnoreCase(action)) {
            String title = "";
            String category = "";
            String subcategory = "";
            for (String line : text.split("\n")) {
                if (line.startsWith("Title: ")) title = line.substring(7);
                if (line.startsWith("Category: ")) category = line.substring(10);
                if (line.startsWith("Subcategory: ")) subcategory = line.substring(13);
            }
            return "Product Details:\n" +
                   "- Title: " + title + "\n" +
                   "- Category: " + category + " > " + subcategory + "\n" +
                   "- Brand:\n- Model:\n- Condition:\n- Price:\n\n" +
                   "Please provide detailed information about your product.";
        } else if ("enhance_ad_description".equalsIgnoreCase(action)) {
            return "{\n  \"enhancedDescription\": \"" + clean.replace("\"", "\\\"") + "\",\n  \"extractedAttributes\": [],\n  \"missingAttributes\": [\"Could not connect to AI service\"],\n  \"qualityScore\": 0\n}";
        }
        return clean;
    }

    /**
     * Check if AI is configured and available.
     */
    public boolean isAvailable() {
        return aiConfigurationService.getActiveConfigurationDecrypted()
                .map(AiConfiguration::getEnableAi)
                .orElse(false);
    }

    private String buildPrompt(String action, String text, String context) {
        return switch (action != null ? action.toLowerCase() : "") {
            case "headlines" -> """
                    You are a senior news editor for a Tamil-English bilingual news channel called "KINGS 24x7".
                    Generate exactly 5 compelling headline options for the following topic/idea.
                    For each headline, provide both Tamil and English versions.
                    Format each as:
                    1. [Tamil headline] | [English headline]
                    2. [Tamil headline] | [English headline]
                    ... and so on.
                    Make them attention-grabbing, SEO-friendly, and suitable for a major news website.
                    
                    Topic/Idea: """ + text;

            case "expand" -> """
                    You are a professional news journalist. Expand the following text into a detailed,
                    well-structured news paragraph (3-5 sentences). Maintain journalistic tone.
                    Keep the same language as the input (Tamil or English).
                    Do NOT add any prefix or explanation — return only the expanded content.
                    
                    Text to expand: """ + text;

            case "summarize" -> """
                    Summarize the following news content into a concise 2-3 sentence summary.
                    Keep the same language as the input. This will be used as a short description / teaser.
                    Do NOT add any prefix — return only the summary.
                    
                    Content: """ + text;

            case "grammar" -> """
                    You are a professional copy editor. Review the following news text for grammar,
                    spelling, punctuation, and style errors. Return the corrected version only.
                    Keep the same language as the input. Do NOT add explanations.
                    
                    Text: """ + text;

            case "tags" -> """
                    You are an SEO specialist for a news website. Read the following article content
                    and suggest 8-12 relevant news tags/keywords separated by commas.
                    Include a mix of broad and specific tags. Return ONLY the comma-separated tags, nothing else.
                    
                    Article content: """ + text;

            case "seo" -> """
                    You are an SEO specialist for a Tamil news website called "KINGS 24x7".
                    Based on the following article content, generate:
                    1. SEO Title in Tamil (60-70 characters)
                    2. Meta Description in Tamil (150-160 characters)
                    3. URL Slug in transliterated English/Latin characters (lowercase, hyphens, no special characters, e.g. puthiya-indhiya-ani-...)
                    4. Focus Keywords: 5-8 relevant focus keywords (comma separated)
                    5. Tags: 5-8 relevant tags (comma separated)
                    
                    Format your response exactly as:
                    SEO_TITLE: [Tamil title]
                    META_DESC: [Tamil description]
                    SLUG: [transliterated-slug]
                    KEYWORDS: [comma, separated, focus, keywords]
                    TAGS: [comma, separated, tags]
                    
                    Article content: """ + text;

            case "translate" -> {
                String direction = context != null && context.equalsIgnoreCase("en2ta") ? "English to Tamil" : "Tamil to English";
                yield """
                        You are a professional news translator for KINGS 24x7. Translate the following text from %s.
                        If the input contains section headers (like TITLE:, EXCERPT:, CONTENT:), translate each section and preserve the corresponding headers (TITLE:, EXCERPT:, CONTENT:).
                        If a section is empty or missing in the input, omit that section header from your response.
                        If no section headers are present, return ONLY the direct translation of the text.
                        Do NOT include any extra notes, explanations, or placeholder text.

                        Text to Translate:
                        """.formatted(direction) + text;
            }

            case "rewrite" -> {
                String style = context != null ? context : "professional";
                yield """
                        Rewrite the following news text in a %s style.
                        Keep the same language. Return ONLY the rewritten text.
                        
                        Text: """.formatted(style) + text;
            }

            case "generate_ad_description" -> {
                yield """
                        You are an AI Product Description Assistant for a classifieds marketplace.
                        Your task is to create a dynamic, category-specific product description template.
                        DO NOT automatically write a complete advertisement.
                        
                        Details provided by the user:
                        """ + text + """
                        
                        STRICT RULES:
                        1. IDENTIFY CATEGORY: Understand the product based on Product Title, Category, and Subcategory.
                        2. GENERATE STRUCTURED TEMPLATE: Create a fillable template with relevant fields (e.g. Brand, Model, Condition, Price) suitable for this specific product type.
                        3. NEVER INVENT INFO: Do NOT fabricate details. Leave missing fields blank for the user to fill out.
                        4. REUSE EXISTING INFO: If the user provided facts, include them in the corresponding fields.
                        5. FORMAT: Use clear headings and bullet points. No prefixes/suffixes. Return ONLY the template text.
                        """;
            }

            case "enhance_ad_description" -> {
                yield """
                        You are an AI marketplace listing assistant.
                        Analyze the provided Product Title, Category, Subcategory, and User Description.
                        Your task is to create a clear, accurate, category-specific marketplace listing.

                        Extract only information explicitly provided by the user.
                        Never invent missing facts, prices, specifications, ownership, or condition.

                        First identify the relevant attributes for this category and subcategory.
                        Then structure the description into appropriate sections.
                        Improve grammar, spelling, clarity, readability, and professionalism.
                        Use concise marketplace-friendly language.
                        
                        You must also calculate a Quality Score (0 to 100) based on completeness (important fields like Condition, Price, Make, Model, Location, etc).
                        Identify any important missing attributes that a buyer would typically want to know for this specific category.

                        User Input Details:
                        """ + text + """
                        
                        Return a valid JSON object strictly in this format (and nothing else, do NOT use markdown formatting blocks like ```json):
                        {
                          "enhancedDescription": "The fully formatted description text with headings and bullet points",
                          "extractedAttributes": ["List of extracted facts", "e.g. Brand: Apple", "Condition: Good"],
                          "missingAttributes": ["List of important missing fields", "e.g. Warranty status", "Battery health"],
                          "qualityScore": 85
                        }
                        """;
            }

            case "categorize_ad" -> {
                yield """
                        You are an AI Categorization Assistant for a classifieds marketplace.
                        Given an ad title and description, determine the most appropriate Category and Subcategory.
                        
                        AVAILABLE CATEGORIES:
                        """ + (context != null ? context : "Electronics, Vehicles, Real Estate, Furniture, Services, Jobs, Others") + """
                        
                        Ad Title / Description:
                        """ + text + """
                        
                        Return a valid JSON object strictly in this format (and nothing else):
                        {
                          "categoryName": "Best matching category name",
                          "subcategoryName": "Best matching subcategory name"
                        }
                        """;
            }

            case "parse_search_intent" -> {
                yield """
                        You are an AI Smart Search parser for a classifieds marketplace.
                        Extract search filters from the user's natural language query.
                        
                        User Query:
                        """ + text + """
                        
                        Return a valid JSON object strictly in this format (and nothing else):
                        {
                          "query": "Cleaned keyword to search (e.g. 'iphone 13' from 'cheap iphone 13 under 5000')",
                          "priceMax": [extracted max price as number or null],
                          "priceMin": [extracted min price as number or null],
                          "condition": "new/used/null"
                        }
                        """;
            }

            case "moderate_ad" -> {
                yield """
                        You are a trust and safety moderator for a classifieds marketplace.
                        Analyze the following ad submission for spam, scams, inappropriate content, or policy violations.
                        
                        Ad Details:
                        """ + text + """
                        
                        Return a valid JSON object strictly in this format (and nothing else):
                        {
                          "isSafe": true or false,
                          "confidenceScore": 0.0 to 1.0,
                          "reason": "Brief explanation if unsafe, or empty string if safe"
                        }
                        """;
            }

            default -> "You are a helpful assistant. " + text;
        };
    }


}
