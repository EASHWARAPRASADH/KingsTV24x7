package com.kingstv.controllers.journalist;

import com.kingstv.models.*;
import com.kingstv.repository.*;
import com.kingstv.security.RequiresPermission;
import com.kingstv.services.ContentEditService;
import com.kingstv.services.ProfanityService;
import com.kingstv.services.VideoUploadService;
import com.kingstv.services.AiRewriterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Mobile Journalist (#34-#39) and Institution Login (#40-#46) content endpoints.
 *
 * Enforced restrictions:
 * - No DELETE endpoint (API layer enforcement)
 * - Max 2 edits per submitted post
 * - Video upload validation against configured limit
 * - Category picker restricted to assigned categories
 * - Private fields excluded from public API responses
 * - AI Content Rewriter tool
 */
@RestController
@RequestMapping("/api/v1/admin/my-content")
public class JournalistContentController {

    @Autowired private ArticleRepository articleRepository;
    @Autowired private UserCategoryRepository userCategoryRepository;
    @Autowired private ContentEditService contentEditService;
    @Autowired private ProfanityService profanityService;
    @Autowired private VideoUploadService videoUploadService;
    @Autowired private AiRewriterService aiRewriterService;
    @Autowired private AuditLogRepository auditLogRepository;

    /**
     * List own posts (#34, #40)
     */
    @GetMapping
    @RequiresPermission(anyOf = {Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN, Role.DISTRICT_ADMIN})
    public ResponseEntity<?> listMyPosts() {
        Long userId = getCallerId();
        // Find articles by author (using authorName as userId for now)
        List<Article> articles = articleRepository.findAll().stream()
                .filter(a -> String.valueOf(userId).equals(a.getAuthorName()))
                .collect(Collectors.toList());

        // Add remaining edits info
        List<Map<String, Object>> response = articles.stream().map(a -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("article", a);
            map.put("remainingEdits", contentEditService.getRemainingEdits("ARTICLE", a.getId()));
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * Create a new post (#34, #40)
     * Category restricted to assigned categories (#37, #43)
     */
    @PostMapping
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.DISTRICT_ADMIN, Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN})
    @CacheEvict(value = {"articles", "articles_all", "articles_web"}, allEntries = true)
    public ResponseEntity<?> createPost(@RequestBody Map<String, Object> request) {
        Long userId = getCallerId();
        String userRole = getCallerRole();

        // Validate category restriction (#37, #43)
        Long categoryId = request.get("categoryId") != null ? ((Number) request.get("categoryId")).longValue() : null;
        if (categoryId != null && (Role.MOBILE_JOURNALIST.equals(userRole) || Role.INSTITUTION_LOGIN.equals(userRole))) {
            List<Long> assignedCategories = userCategoryRepository.findByUserId(userId)
                    .stream().map(UserCategory::getCategoryId).collect(Collectors.toList());
            if (!assignedCategories.isEmpty() && !assignedCategories.contains(categoryId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "You are not assigned to this category. Allowed categories: " + assignedCategories));
            }
        }

        // Check video duration if provided (#36, #42)
        String imageUrl = (String) request.get("imageUrl");
        boolean isVideo = imageUrl != null && (imageUrl.toLowerCase().endsWith(".mp4") || imageUrl.toLowerCase().endsWith(".mov") || 
            imageUrl.toLowerCase().endsWith(".avi") || imageUrl.toLowerCase().endsWith(".webm") || imageUrl.toLowerCase().endsWith(".mkv"));

        if (isVideo && (!request.containsKey("videoDurationSeconds") || request.get("videoDurationSeconds") == null)) {
            return ResponseEntity.badRequest().body(Map.of("message", "videoDurationSeconds is required when uploading a video"));
        }

        if (request.containsKey("videoDurationSeconds") && request.get("videoDurationSeconds") != null) {
            try {
                int duration = ((Number) request.get("videoDurationSeconds")).intValue();
                videoUploadService.validateDuration(duration);
            } catch (VideoUploadService.VideoTooLongException e) {
                return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
            }
        }

        Article article = new Article();
        article.setTitleTa((String) request.get("titleTa"));
        article.setTitleEn((String) request.get("titleEn"));
        article.setContentTa((String) request.get("contentTa"));
        article.setContentEn((String) request.get("contentEn"));
        article.setShortDescTa((String) request.get("shortDescTa"));
        article.setShortDescEn((String) request.get("shortDescEn"));
        article.setImageUrl((String) request.get("imageUrl"));
        article.setCategoryId(categoryId);
        article.setDistrictId(request.get("districtId") != null ? ((Number) request.get("districtId")).longValue() : null);
        
        if (request.get("latitude") != null) article.setLatitude(((Number) request.get("latitude")).doubleValue());
        if (request.get("longitude") != null) article.setLongitude(((Number) request.get("longitude")).doubleValue());
        if (request.get("visibilityRadiusKm") != null) article.setVisibilityRadiusKm(((Number) request.get("visibilityRadiusKm")).doubleValue());
        
        article.setAuthorName(String.valueOf(userId)); // Store userId as author reference
        article.setStatus("submitted"); // Goes to Chief Editor queue

        Article saved = articleRepository.save(article);
        logAudit("CREATE", "Article", saved.getId(), "Created article: " + article.getTitleEn());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "message", "Post submitted for review",
            "articleId", saved.getId(),
            "remainingEdits", contentEditService.getRemainingEdits("ARTICLE", saved.getId())
        ));
    }

    /**
     * Edit own post (#34, #40) with max-2-edits enforcement (#35, #41)
     * NOTE: No DELETE endpoint exists for these roles — this is intentional API-layer enforcement.
     */
    @PutMapping("/{id}")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.DISTRICT_ADMIN, Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN})
    @CacheEvict(value = {"articles", "articles_all", "articles_web"}, allEntries = true)
    public ResponseEntity<?> editPost(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        Long userId = getCallerId();
        String userRole = getCallerRole();

        Optional<Article> articleOpt = articleRepository.findById(id);
        if (articleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Article article = articleOpt.get();

        // Verify ownership
        if (!String.valueOf(userId).equals(article.getAuthorName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You can only edit your own posts"));
        }

        // Max 2 edits enforcement (#35, #41)
        if (Role.MOBILE_JOURNALIST.equals(userRole) || Role.INSTITUTION_LOGIN.equals(userRole) || Role.DISTRICT_ADMIN.equals(userRole)) {
            try {
                contentEditService.attemptEdit("ARTICLE", id, userId);
            } catch (ContentEditService.MaxEditsExceededException e) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", e.getMessage(), "error", "MAX_EDITS_EXCEEDED"));
            }
        }

        // Apply updates
        if (request.containsKey("imageUrl")) {
            String updatedImageUrl = (String) request.get("imageUrl");
            boolean isUpdatedVideo = updatedImageUrl != null && (updatedImageUrl.toLowerCase().endsWith(".mp4") || updatedImageUrl.toLowerCase().endsWith(".mov") || 
                updatedImageUrl.toLowerCase().endsWith(".avi") || updatedImageUrl.toLowerCase().endsWith(".webm") || updatedImageUrl.toLowerCase().endsWith(".mkv"));

            if (isUpdatedVideo && (!request.containsKey("videoDurationSeconds") || request.get("videoDurationSeconds") == null)) {
                return ResponseEntity.badRequest().body(Map.of("message", "videoDurationSeconds is required when uploading a video"));
            }

            if (request.containsKey("videoDurationSeconds") && request.get("videoDurationSeconds") != null) {
                try {
                    int duration = ((Number) request.get("videoDurationSeconds")).intValue();
                    videoUploadService.validateDuration(duration);
                } catch (VideoUploadService.VideoTooLongException e) {
                    return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
                }
            }
        }

        if (request.containsKey("titleTa")) article.setTitleTa((String) request.get("titleTa"));
        if (request.containsKey("titleEn")) article.setTitleEn((String) request.get("titleEn"));
        if (request.containsKey("contentTa")) article.setContentTa((String) request.get("contentTa"));
        if (request.containsKey("contentEn")) article.setContentEn((String) request.get("contentEn"));
        if (request.containsKey("shortDescTa")) article.setShortDescTa((String) request.get("shortDescTa"));
        if (request.containsKey("shortDescEn")) article.setShortDescEn((String) request.get("shortDescEn"));
        if (request.containsKey("imageUrl")) article.setImageUrl((String) request.get("imageUrl"));

        if (request.containsKey("latitude")) article.setLatitude(request.get("latitude") != null ? ((Number) request.get("latitude")).doubleValue() : null);
        if (request.containsKey("longitude")) article.setLongitude(request.get("longitude") != null ? ((Number) request.get("longitude")).doubleValue() : null);
        if (request.containsKey("visibilityRadiusKm")) article.setVisibilityRadiusKm(request.get("visibilityRadiusKm") != null ? ((Number) request.get("visibilityRadiusKm")).doubleValue() : null);

        // Reset status to submitted so it must be reviewed again
        article.setStatus("submitted");

        Article saved = articleRepository.save(article);
        logAudit("UPDATE", "Article", id, "Edited article");
        return ResponseEntity.ok(Map.of(
            "message", "Post updated and resubmitted for review",
            "remainingEdits", contentEditService.getRemainingEdits("ARTICLE", id)
        ));
    }

    /**
     * AI Content Rewriter (#46) — available to MJ and Institution Login
     */
    @PostMapping("/ai-rewrite")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.DISTRICT_ADMIN, Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN})
    public ResponseEntity<?> rewriteContent(@RequestBody Map<String, String> request) {
        String text = request.get("text");
        String style = request.getOrDefault("style", "professional");

        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Text is required"));
        }

        String rewritten = aiRewriterService.rewriteContent(text, style);
        return ResponseEntity.ok(Map.of("original", text, "rewritten", rewritten, "style", style));
    }

    // NOTE: DELETE endpoint intentionally omitted for MJ and Institution roles.
    // This is server-side enforcement — the API simply does not expose a delete capability.

    private Long getCallerId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getDetails() instanceof Long) return (Long) auth.getDetails();
        return null;
    }

    private String getCallerRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            return auth.getAuthorities().stream()
                .filter(a -> a.getAuthority().startsWith("ROLE_")).map(a -> a.getAuthority().substring(5))
                .findFirst().orElse("READER");
        }
        return "READER";
    }

    private void logAudit(String action, String entity, Long entityId, String details) {
        try {
            AuditLog log = new AuditLog();
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                log.setActorEmail((String) auth.getPrincipal());
                log.setActorRole(getCallerRole());
                if (auth.getDetails() instanceof Long) log.setActorId((Long) auth.getDetails());
            }
            log.setActionType(action);
            log.setEntityType(entity);
            log.setEntityId(entityId);
            log.setDetails(details);
            auditLogRepository.save(log);
        } catch (Exception e) {
            System.err.println("Audit log write failed: " + e.getMessage());
        }
    }
}
