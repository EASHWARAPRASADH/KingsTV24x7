package com.kingstv.controllers;

import com.kingstv.models.*;
import com.kingstv.services.ClassifiedService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@RestController
@RequestMapping({"/api/classifieds", "/api/v1/classifieds"})
public class ClassifiedController {

    @Autowired
    private ClassifiedService classifiedService;

    @Autowired
    private com.kingstv.services.AiAssistService aiAssistService;

    @Autowired
    private com.kingstv.repository.ClassifiedRepository classifiedRepository;

    @Autowired
    private com.kingstv.repository.ClassifiedReportRepository classifiedReportRepository;

    @GetMapping
    public ResponseEntity<?> getClassifieds(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long subcategoryId,
            @RequestParam(required = false) Long districtId,
            @RequestParam(required = false) Double priceMin,
            @RequestParam(required = false) Double priceMax,
            @RequestParam(required = false) String condition,
            @RequestParam(required = false) Boolean negotiable,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        
        Page<ClassifiedListing> ads = classifiedService.getClassifieds(
            search, categoryId, subcategoryId, districtId, priceMin, priceMax, condition, negotiable, sort, PageRequest.of(page, size)
        );
        return ResponseEntity.ok(ads.getContent());
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchAds(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Page<ClassifiedListing> ads = classifiedService.getClassifieds(query, null, null, null, null, null, null, null, "newest", PageRequest.of(page, size));
        return ResponseEntity.ok(ads.getContent());
    }

    @GetMapping("/filter")
    public ResponseEntity<?> filterAds(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long subcategoryId,
            @RequestParam(required = false) Long districtId,
            @RequestParam(required = false) Double priceMin,
            @RequestParam(required = false) Double priceMax,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Page<ClassifiedListing> ads = classifiedService.getClassifieds(null, categoryId, subcategoryId, districtId, priceMin, priceMax, null, null, sort, PageRequest.of(page, size));
        return ResponseEntity.ok(ads.getContent());
    }

    @GetMapping("/featured")
    public ResponseEntity<?> getFeatured(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Page<ClassifiedListing> ads = classifiedService.getClassifieds(null, null, null, null, null, null, null, null, "newest", PageRequest.of(page, size));
        return ResponseEntity.ok(ads.getContent());
    }

    @GetMapping("/latest")
    public ResponseEntity<?> getLatest(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Page<ClassifiedListing> ads = classifiedService.getClassifieds(null, null, null, null, null, null, null, null, "newest", PageRequest.of(page, size));
        return ResponseEntity.ok(ads.getContent());
    }

    @GetMapping("/categories")
    public ResponseEntity<?> getCategories() {
        return ResponseEntity.ok(classifiedService.getCategories());
    }

    @GetMapping("/subcategories")
    public ResponseEntity<?> getSubcategories(@RequestParam Long categoryId) {
        return ResponseEntity.ok(classifiedService.getSubcategories(categoryId));
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "File is empty"));
        }
        try {
            Path uploadPath = Paths.get("uploads/classifieds");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            String fileName = "ad_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            return ResponseEntity.ok(Map.of("url", "/uploads/classifieds/" + fileName));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to upload file: " + e.getMessage()));
        }
    }

    // Dynamic path variable mappings at the bottom
    @GetMapping("/{id}")
    public ResponseEntity<?> getClassifiedById(@PathVariable Long id) {
        Optional<ClassifiedListing> adOpt = classifiedService.getClassifiedById(id);
        if (adOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Listing not found"));
        }
        
        ClassifiedListing listing = adOpt.get();
        List<ClassifiedImage> images = classifiedService.getImages(id);
        
        Map<String, Object> details = new HashMap<>();
        details.put("listing", listing);
        details.put("images", images);
        
        return ResponseEntity.ok(details);
    }

    @PostMapping
    public ResponseEntity<?> createClassified(@RequestBody ClassifiedListing classified, @RequestParam(required = false) List<String> images) {
        if (classified.getTitle() == null || classified.getDescription() == null || classified.getPrice() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Title, description, and price are required."));
        }
        
        // AI Moderation check
        String adContent = "Title: " + classified.getTitle() + "\nDescription: " + classified.getDescription() + "\nPrice: " + classified.getPrice();
        Map<String, Object> modResult = aiAssistService.assist("moderate_ad", adContent, "en");
        
        classified.setStatus("pending"); // Default
        
        if (!Boolean.TRUE.equals(modResult.get("error")) && modResult.get("result") != null) {
            String res = modResult.get("result").toString();
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(res);
                if (root.has("isSafe") && !root.get("isSafe").asBoolean()) {
                    classified.setStatus("flagged_for_review");
                }
            } catch (Exception e) {
                // If parsing fails, fall back to simple string check
                if (res.replace(" ", "").contains("\"isSafe\":false")) {
                    classified.setStatus("flagged_for_review");
                }
            }
        }
        
        ClassifiedListing saved = classifiedService.createClassified(classified, images);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateClassified(@PathVariable Long id, @RequestBody ClassifiedListing ad) {
        try {
            ClassifiedListing updated = classifiedService.updateClassified(id, ad);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteClassified(@PathVariable Long id) {
        try {
            classifiedService.deleteClassified(id);
            return ResponseEntity.ok(Map.of("message", "Listing deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/save")
    public ResponseEntity<?> saveAd(@PathVariable Long id, @RequestParam Long userId) {
        try {
            ClassifiedFavourite fav = classifiedService.saveAd(id, userId);
            return ResponseEntity.ok(fav);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/save")
    public ResponseEntity<?> unsaveAd(@PathVariable Long id, @RequestParam Long userId) {
        try {
            classifiedService.unsaveAd(id, userId);
            return ResponseEntity.ok(Map.of("message", "Listing unsaved successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<?> shareAd(@PathVariable Long id, @RequestParam String platform) {
        classifiedService.logShare(id, platform);
        return ResponseEntity.ok(Map.of("message", "Share logged successfully"));
    }

    @PostMapping("/{id}/report")
    public ResponseEntity<?> reportAd(
            @PathVariable Long id,
            @RequestParam String reporterName,
            @RequestParam String reason) {
        classifiedService.logReport(id, reporterName, reason);
        return ResponseEntity.ok(Map.of("message", "Report logged successfully"));
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<?> logView(@PathVariable Long id, HttpServletRequest request) {
        classifiedService.logView(id, request.getRemoteAddr(), request.getHeader("User-Agent"));
        return ResponseEntity.ok(Map.of("message", "View logged successfully"));
    }

    @PostMapping("/{id}/renew")
    public ResponseEntity<?> renewAd(@PathVariable Long id) {
        try {
            classifiedService.renewAd(id);
            return ResponseEntity.ok(Map.of("message", "Listing renewed successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/boost")
    public ResponseEntity<?> boostAd(@PathVariable Long id) {
        try {
            classifiedService.boostAd(id);
            return ResponseEntity.ok(Map.of("message", "Listing boosted to featured successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // --- Admin Moderation Endpoints ---
    @GetMapping("/admin/reports")
    public ResponseEntity<?> getReports() {
        List<ClassifiedReport> reports = classifiedReportRepository.findAll();
        List<Map<String, Object>> responses = new ArrayList<>();
        for (ClassifiedReport r : reports) {
            Optional<ClassifiedListing> listOpt = classifiedRepository.findById(r.getClassifiedId());
            Map<String, Object> map = new HashMap<>();
            map.put("report", r);
            map.put("classified", listOpt.orElse(null));
            responses.add(map);
        }
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/admin/reports/{id}")
    public ResponseEntity<?> dismissReport(@PathVariable Long id) {
        if (!classifiedReportRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Report not found"));
        }
        classifiedReportRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Report dismissed"));
    }

    @GetMapping("/admin/pending")
    public ResponseEntity<?> getPendingClassifieds() {
        List<ClassifiedListing> pending = classifiedRepository.findByStatus("pending");
        return ResponseEntity.ok(pending);
    }

    @PutMapping("/admin/{id}/approve")
    public ResponseEntity<?> approveClassified(@PathVariable Long id) {
        Optional<ClassifiedListing> listingOpt = classifiedRepository.findById(id);
        if (listingOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Classified not found"));
        }
        ClassifiedListing listing = listingOpt.get();
        listing.setStatus("active");
        classifiedRepository.save(listing);
        return ResponseEntity.ok(Map.of("message", "Classified approved and is now active"));
    }

    @PostMapping("/ai-description")
    public ResponseEntity<?> generateAiDescription(@RequestBody Map<String, String> payload) {
        String text = payload.get("text");
        String lang = payload.getOrDefault("lang", "en");
        
        if (text == null || text.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", true, "result", "Text payload is required"));
        }

        Map<String, Object> result = aiAssistService.assist("generate_ad_description", text, lang);
        if (Boolean.TRUE.equals(result.get("error"))) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/ai-enhance")
    public ResponseEntity<?> enhanceAiDescription(@RequestBody Map<String, String> payload) {
        String text = payload.get("text");
        String lang = payload.getOrDefault("lang", "en");
        
        if (text == null || text.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", true, "result", "Text payload is required"));
        }

        Map<String, Object> result = aiAssistService.assist("enhance_ad_description", text, lang);
        if (Boolean.TRUE.equals(result.get("error"))) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/ai-categorize")
    public ResponseEntity<?> autoCategorizeAd(@RequestBody Map<String, String> payload) {
        String text = payload.get("text");
        
        if (text == null || text.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", true, "result", "Text payload is required"));
        }

        // Fetch categories to pass as context
        List<ClassifiedCategory> categories = classifiedService.getCategories();
        StringBuilder catContext = new StringBuilder();
        for (ClassifiedCategory cat : categories) {
            catContext.append(cat.getName()).append(" (");
            List<ClassifiedSubcategory> subcategories = classifiedService.getSubcategories(cat.getId());
            if (subcategories != null) {
                subcategories.forEach(sub -> catContext.append(sub.getName()).append(", "));
            }
            catContext.append("); ");
        }

        Map<String, Object> result = aiAssistService.assist("categorize_ad", text, catContext.toString());
        if (Boolean.TRUE.equals(result.get("error"))) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/smart-search")
    public ResponseEntity<?> smartSearch(@RequestBody Map<String, String> payload,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "12") int size) {
        String query = payload.get("query");
        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Search query is required"));
        }

        Map<String, Object> aiResult = aiAssistService.assist("parse_search_intent", query, null);
        if (Boolean.TRUE.equals(aiResult.get("error")) || aiResult.get("result") == null) {
            // Fallback to normal search
            Page<ClassifiedListing> ads = classifiedService.getClassifieds(query, null, null, null, null, null, null, null, "newest", PageRequest.of(page, size));
            return ResponseEntity.ok(ads.getContent());
        }

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(aiResult.get("result").toString());
            
            String parsedQuery = root.has("query") && !root.get("query").isNull() ? root.get("query").asText() : query;
            Double priceMax = root.has("priceMax") && !root.get("priceMax").isNull() ? root.get("priceMax").asDouble() : null;
            Double priceMin = root.has("priceMin") && !root.get("priceMin").isNull() ? root.get("priceMin").asDouble() : null;
            String condition = root.has("condition") && !root.get("condition").isNull() && !root.get("condition").asText().equals("null") ? root.get("condition").asText() : null;

            Page<ClassifiedListing> ads = classifiedService.getClassifieds(parsedQuery, null, null, null, priceMin, priceMax, condition, null, "newest", PageRequest.of(page, size));
            
            Map<String, Object> response = new HashMap<>();
            response.put("results", ads.getContent());
            response.put("intent", root); // Return the parsed intent for the UI
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            // Fallback to normal search
            Page<ClassifiedListing> ads = classifiedService.getClassifieds(query, null, null, null, null, null, null, null, "newest", PageRequest.of(page, size));
            return ResponseEntity.ok(ads.getContent());
        }
    }
}
