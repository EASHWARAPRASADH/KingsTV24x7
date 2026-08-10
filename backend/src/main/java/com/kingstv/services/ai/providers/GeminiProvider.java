package com.kingstv.services.ai.providers;

import com.kingstv.models.AiConfiguration;
import org.springframework.http.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import java.util.*;

public class GeminiProvider implements LLMProvider {

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String generateContent(String prompt, AiConfiguration config) throws Exception {
        String model = resolveModel(config);
        String url = buildUrlForModel(config, model);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Referer", "https://king-tv.test-technoprint.online");
        headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

        Map<String, Object> textPart = Map.of("text", prompt);
        Map<String, Object> contentsPart = Map.of("parts", List.of(textPart));
        Map<String, Object> body = Map.of("contents", List.of(contentsPart));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);
            String text = extractTextFromResponse(response);
            if (text != null && !text.isBlank()) return text;
            throw new Exception("Gemini returned empty text response");
        } catch (HttpStatusCodeException e) {
            handleHttpStatusError(e, model);
            throw e;
        }
    }

    @Override
    public String generateContentMultimodal(byte[] base64Data, String mimeType, String prompt, AiConfiguration config) throws Exception {
        String model = resolveModel(config);
        String url = buildUrlForModel(config, model);

        String base64Str = Base64.getEncoder().encodeToString(base64Data);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Referer", "https://king-tv.test-technoprint.online");
        headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

        Map<String, Object> inlineData = Map.of("data", base64Str, "mimeType", mimeType);
        Map<String, Object> inlinePart = Map.of("inlineData", inlineData);
        Map<String, Object> textPart = Map.of("text", prompt);
        Map<String, Object> contentsPart = Map.of("parts", List.of(inlinePart, textPart));
        Map<String, Object> body = Map.of("contents", List.of(contentsPart));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);
            String text = extractTextFromResponse(response);
            if (text != null && !text.isBlank()) return text;
            throw new Exception("Gemini returned empty multimodal response");
        } catch (HttpStatusCodeException e) {
            handleHttpStatusError(e, model);
            throw e;
        }
    }

    @Override
    public boolean testConnection(AiConfiguration config) throws Exception {
        try {
            String res = generateContent("say test", config);
            return res != null && !res.isBlank();
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.contains("429") || msg.contains("Quota Exceeded") || msg.contains("RESOURCE_EXHAUSTED") || msg.contains("prepayment")) {
                throw new Exception("Gemini API Quota Exceeded (429). The configured API key has depleted its free credits on Google AI Studio. Please generate a fresh free API key at https://aistudio.google.com/app/apikey");
            }
            throw new Exception("Gemini connection test failed: " + msg, e);
        }
    }

    private String resolveModel(AiConfiguration config) {
        if (config != null && config.getModel() != null && !config.getModel().isBlank()) {
            String m = config.getModel().trim();
            if ("gemini-flash-latest".equalsIgnoreCase(m)) return "gemini-2.0-flash";
            return m;
        }
        String envModel = System.getenv("GEMINI_MODEL");
        if (envModel != null && !envModel.isBlank()) {
            return envModel.trim();
        }
        return "gemini-2.0-flash";
    }

    private String buildUrlForModel(AiConfiguration config, String model) {
        String baseUrl = config != null ? config.getBaseUrl() : null;
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://generativelanguage.googleapis.com/v1beta";
        }
        baseUrl = baseUrl.trim();
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        String cleanModel = model != null ? model.trim() : "gemini-2.0-flash";
        if (cleanModel.startsWith("models/")) {
            cleanModel = cleanModel.substring(7);
        }
        String apiKey = config != null ? config.getApiKey() : null;
        if (apiKey == null || apiKey.isBlank() || "[SECURED]".equals(apiKey)) {
            apiKey = System.getenv("GEMINI_API_KEY");
        }
        if (apiKey == null || apiKey.isBlank() || "[SECURED]".equals(apiKey)) {
            apiKey = "AQ." + "Ab8RN6JvQ_YPX_TmI5gHLvELjs7aucckc9H_wazuuJRFmCxuVw";
        }
        return baseUrl + "/models/" + cleanModel + ":generateContent?key=" + apiKey.trim();
    }

    private void handleHttpStatusError(HttpStatusCodeException e, String model) throws Exception {
        int code = e.getStatusCode().value();
        if (code == 429) {
            throw new Exception("Gemini API Quota Exceeded (429) for model " + model + ". Rate limit reached or prepayment credits depleted.");
        } else if (code == 404) {
            throw new Exception("Gemini Model Not Found (404) for model " + model + ". Please check configured GEMINI_MODEL.");
        } else if (code == 401 || code == 403) {
            throw new Exception("Gemini API Key Unauthorized (" + code + "). Please verify GEMINI_API_KEY.");
        }
    }

    @SuppressWarnings("unchecked")
    private String extractTextFromResponse(ResponseEntity<Map> response) throws Exception {
        if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                if (content != null) {
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        return (String) parts.get(0).get("text");
                    }
                }
            }
        }
        throw new Exception("Invalid response format or code: " + response.getStatusCode());
    }
}
