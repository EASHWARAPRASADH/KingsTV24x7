package com.kingstv.controllers;

import com.kingstv.models.Article;
import com.kingstv.models.ArticleRevision;
import com.kingstv.models.Comment;
import com.kingstv.models.User;
import com.kingstv.repository.ArticleRepository;
import com.kingstv.repository.ArticleRevisionRepository;
import com.kingstv.repository.CategoryRepository;
import com.kingstv.repository.CommentRepository;
import com.kingstv.repository.SubCategoryRepository;
import com.kingstv.repository.UserRepository;
import com.kingstv.models.MediaAsset;
import com.kingstv.repository.MediaAssetRepository;
import com.kingstv.services.SlugService;
import com.kingstv.services.StorageService;
import com.kingstv.services.SeoGeneratorService;
import com.kingstv.services.TelegramBotService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import com.kingstv.repository.SpecificationBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.io.IOException;
import com.kingstv.security.RequiresPermission;
import com.kingstv.models.Role;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "News", description = "News articles, web stories, draft & publishing workflows")
@RestController
@RequestMapping("/api/v1/articles")
public class ArticleController {

    @Autowired
    private ArticleRepository articleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private SubCategoryRepository subCategoryRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private SlugService slugService;

    @Autowired
    private SeoGeneratorService seoGeneratorService;

    @Autowired
    private com.kingstv.services.AiAssistService aiAssistService;

    @Autowired
    private StorageService storageService;

    @Autowired
    private TelegramBotService telegramBotService;

    @Autowired
    private com.kingstv.services.SystemConfigService configService;

    @Autowired
    private com.kingstv.services.ProfanityService profanityService;

    @Autowired
    private ArticleRevisionRepository articleRevisionRepository;

    @Autowired
    private MediaAssetRepository mediaAssetRepository;

    // --- KEEP Existing Front-End Endpoint Map ---
    @GetMapping
    public List<Article> getArticles(@RequestParam(required = false) String status) {
        String activeStatus = status != null ? status : "published";
        return articleRepository.findTop50ByStatusOrderByPublishedAtDesc(activeStatus);
    }

    @GetMapping("/public/trending")
    public List<Article> getTrendingArticles() {
        return articleRepository.findTop5ByStatusOrderByViewsCountDesc("published");
    }

    @GetMapping("/public/institution-news")
    public List<Article> getInstitutionNews() {
        List<User> institutions = userRepository.findByRole("INSTITUTION_LOGIN");
        List<String> names = institutions.stream().map(User::getFullName).toList();
        if (names.isEmpty()) {
            return articleRepository.findTop50ByStatusOrderByPublishedAtDesc("published").stream().limit(6).toList();
        }
        return articleRepository.findByAuthorNameInAndStatusOrderByPublishedAtDesc(names, "published");
    }

    @GetMapping("/{idOrSlug}")
    public ResponseEntity<?> getArticleById(@PathVariable String idOrSlug, HttpServletRequest request) {
        Optional<Article> artOpt = Optional.empty();
        
        // Try parsing numerical ID first
        if (idOrSlug.matches("^\\d+$")) {
            artOpt = articleRepository.findById(Long.parseLong(idOrSlug));
        }
        
        // Fall back to slug lookup
        if (artOpt.isEmpty()) {
            artOpt = articleRepository.findBySlug(idOrSlug);
        }
        
        if (artOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Article not found"));
        }

        Article article = artOpt.get();
        articleRepository.incrementViewsCount(article.getId());
        article.setViewsCount((article.getViewsCount() != null ? article.getViewsCount() : 0) + 1);

        // Record ArticleView and calculate earnings asynchronously
        String ip = request.getRemoteAddr();
        if (ip != null && !ip.isEmpty()) {
            java.util.concurrent.CompletableFuture.runAsync(() -> {
                try {
                    com.kingstv.repository.ArticleViewRepository viewRepo = org.springframework.web.context.support.WebApplicationContextUtils.getWebApplicationContext(request.getServletContext()).getBean(com.kingstv.repository.ArticleViewRepository.class);
                    com.kingstv.repository.EarningLedgerRepository ledgerRepo = org.springframework.web.context.support.WebApplicationContextUtils.getWebApplicationContext(request.getServletContext()).getBean(com.kingstv.repository.EarningLedgerRepository.class);
                    com.kingstv.repository.SystemConfigRepository configRepo = org.springframework.web.context.support.WebApplicationContextUtils.getWebApplicationContext(request.getServletContext()).getBean(com.kingstv.repository.SystemConfigRepository.class);
                    
                    if (viewRepo.findByArticleIdAndIpAddress(article.getId(), ip).isEmpty()) {
                        com.kingstv.models.ArticleView view = new com.kingstv.models.ArticleView();
                        view.setArticleId(article.getId());
                        view.setIpAddress(ip);
                        view.setUserAgent(request.getHeader("User-Agent"));
                        
                        // Handle earnings if the article has an author
                        if (article.getAuthorName() != null && !article.getAuthorName().equalsIgnoreCase("Kings TV News Desk")) {
                            Optional<User> authorOpt = userRepository.findByFullName(article.getAuthorName());
                            if (authorOpt.isPresent()) {
                                User author = authorOpt.get();
                                view.setAuthorId(author.getId());
                                view.setIsCountedForEarnings(true);
                                
                                // Fetch cost_per_view (default 0.01)
                                Double costPerView = 0.01;
                                Optional<com.kingstv.models.SystemConfig> costConfig = configRepo.findByConfigKey("cost_per_view");
                                if (costConfig.isPresent()) {
                                    try { costPerView = Double.parseDouble(costConfig.get().getConfigValue()); } catch (Exception e) {}
                                }
                                
                                com.kingstv.models.EarningLedger ledger = new com.kingstv.models.EarningLedger();
                                ledger.setAuthorId(author.getId());
                                ledger.setArticleId(article.getId());
                                ledger.setAmount(costPerView);
                                ledger.setTransactionType("PAGEVIEW");
                                ledgerRepo.save(ledger);
                            }
                        }
                        viewRepo.save(view);
                    }
                } catch (Exception e) {
                    // Ignore async errors
                }
            });
        }

        if (article.getAuthorName() != null) {
            userRepository.findByFullName(article.getAuthorName()).ifPresent(user -> {
                article.setAuthorProfileImage(user.getProfileImage());
            });
        }

        if (article.getCategoryId() != null) {
            categoryRepository.findById(article.getCategoryId()).ifPresent(cat -> {
                article.setCategoryName(cat.getName());
                article.setCategoryNameTa(cat.getNameTa());
                article.setCategorySlug(cat.getSlug());
            });
        }

        if (article.getSubcategoryId() != null) {
            subCategoryRepository.findById(article.getSubcategoryId()).ifPresent(sub -> {
                article.setSubCategoryName(sub.getName());
                article.setSubCategoryNameTa(sub.getNameTa());
                article.setSubCategorySlug(sub.getSlug());
            });
        }

        // Dynamic JSON-LD structured data attachment
        article.setStructuredDataJson(generateJsonLd(article, request));

        return ResponseEntity.ok(article);
    }

    @PostMapping
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.DISTRICT_ADMIN, Role.SECTION_EDITOR, Role.SUB_EDITOR, Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN})
    @CacheEvict(value = {"articles", "articles_all", "articles_web"}, allEntries = true)
    public ResponseEntity<?> createArticle(@RequestBody Article article, HttpServletRequest request) {
        if ((article.getTitleTa() == null || article.getTitleTa().trim().isEmpty()) && article.getTitleEn() != null) {
            article.setTitleTa(article.getTitleEn());
        }
        if ((article.getContentTa() == null || article.getContentTa().trim().isEmpty()) && article.getContentEn() != null) {
            article.setContentTa(article.getContentEn());
        }
        if (article.getTitleTa() == null || article.getContentTa() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Title and Content are required"));
        }
        if (article.getFeaturedImage() != null && !article.getFeaturedImage().isEmpty() && (article.getImageUrl() == null || article.getImageUrl().isEmpty())) {
            article.setImageUrl(article.getFeaturedImage());
        }
        if (article.getImageUrl() != null && !article.getImageUrl().isEmpty() && (article.getFeaturedImage() == null || article.getFeaturedImage().isEmpty())) {
            article.setFeaturedImage(article.getImageUrl());
        }
        // Auto-extract first image from content HTML if featuredImage/imageUrl is missing
        if ((article.getImageUrl() == null || article.getImageUrl().trim().isEmpty()) && 
            (article.getFeaturedImage() == null || article.getFeaturedImage().trim().isEmpty())) {
            String htmlContent = article.getContentTa() != null ? article.getContentTa() : article.getContentEn();
            if (htmlContent != null) {
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("src=[\"']([^\"']+\\.(?:png|jpg|jpeg|webp|gif|svg))[\"']", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(htmlContent);
                if (m.find()) {
                    String extracted = m.group(1);
                    article.setImageUrl(extracted);
                    article.setFeaturedImage(extracted);
                }
            }
        }
        if (article.getPublishedAt() == null) {
            article.setPublishedAt(LocalDateTime.now());
        }

        // Profanity Check
        if ("published".equalsIgnoreCase(article.getStatus()) || "pending".equalsIgnoreCase(article.getStatus())) {
            var authCtx = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            Long authorId = authCtx != null && authCtx.getDetails() instanceof Long ? (Long) authCtx.getDetails() : null;
            String authorName = authCtx != null ? authCtx.getName() : "Unknown";
            com.kingstv.services.ProfanityService.ProfanityCheckResult check = profanityService.checkContent(
                "ARTICLE", null, article.getTitleEn(), authorId, authorName, 
                article.getTitleTa(), article.getTitleEn(), article.getContentTa(), article.getContentEn()
            );
            if (!check.isClean()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "Content blocked due to profanity filter.",
                    "matchedTerms", check.getMatchedTerms()
                ));
            }
        }

        populateSeoFields(article, request);
        Article saved = articleRepository.save(article);
        if ("published".equals(saved.getStatus()) && !saved.getTelegramSent()) {
            telegramBotService.pushArticleToChannel(saved);
            saved.setTelegramSent(true);
            saved = articleRepository.save(saved);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // --- NEW Standardized API Standard Endpoints ---
    @GetMapping("/getAll")
    @Cacheable(value = "articles_all", key = "T(java.util.Objects).hash(#search, #status, #categoryId, #districtId, #authorId, #tag, #startDateStr, #endDateStr, #year, #month, #page, #size, #sortBy, #direction)")
    public Page<Article> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String districtId,
            @RequestParam(required = false) String authorId,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String startDateStr,
            @RequestParam(required = false) String endDateStr,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "publishedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String role = auth.getAuthorities().stream()
                .filter(a -> a.getAuthority().startsWith("ROLE_")).map(a -> a.getAuthority().substring(5))
                .findFirst().orElse("READER");
            if ("MOBILE_JOURNALIST".equals(role) || "INSTITUTION_LOGIN".equals(role)) {
                authorId = String.valueOf(auth.getDetails());
            }
        }

        LocalDateTime startDate = null;
        LocalDateTime endDate = null;
        if (startDateStr != null && !startDateStr.isEmpty()) {
            try {
                startDate = java.time.LocalDate.parse(startDateStr).atStartOfDay();
            } catch (Exception e) {}
        }
        if (endDateStr != null && !endDateStr.isEmpty()) {
            try {
                endDate = java.time.LocalDate.parse(endDateStr).atTime(23, 59, 59);
            } catch (Exception e) {}
        }

        Sort sort = Sort.by(direction.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        Specification<Article> spec = SpecificationBuilder.build(search, status, categoryId, districtId, authorId, tag, startDate, endDate, year, month);
        return articleRepository.findAll(spec, pageable);
    }

    @GetMapping("/getAllWeb")
    @Cacheable(value = "articles_web", key = "T(java.util.Objects).hash(#search, #categoryId, #districtId, #tag, #startDateStr, #endDateStr, #year, #month, #page, #size, #sortBy, #direction)")
    public Page<Article> getAllWeb(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String districtId,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String startDateStr,
            @RequestParam(required = false) String endDateStr,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "publishedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        
        return getAll(search, "published", categoryId, districtId, null, tag, startDateStr, endDateStr, year, month, page, size, sortBy, direction);
    }

    @GetMapping("/{id}/related")
    public ResponseEntity<?> getRelatedArticles(@PathVariable Long id) {
        return articleRepository.findById(id).map(article -> {
            Long categoryId = article.getCategoryId();
            List<Article> sameCategory = articleRepository.findTop10ByStatusAndCategoryIdAndIdNotOrderByPublishedAtDesc("published", categoryId, id);
            
            List<String> targetTags = parseKeywords(article.getMetaKeywords());
            
            sameCategory.sort((a, b) -> {
                long overlapA = countOverlap(parseKeywords(a.getMetaKeywords()), targetTags);
                long overlapB = countOverlap(parseKeywords(b.getMetaKeywords()), targetTags);
                if (overlapA != overlapB) {
                    return Long.compare(overlapB, overlapA); // descending by overlap
                }
                return b.getPublishedAt().compareTo(a.getPublishedAt()); // descending by date
            });
            
            List<Article> result = sameCategory.subList(0, Math.min(3, sameCategory.size()));
            return ResponseEntity.ok(result);
        }).orElse(ResponseEntity.notFound().build());
    }

    private List<String> parseKeywords(String keywords) {
        if (keywords == null || keywords.trim().isEmpty()) {
            return List.of();
        }
        return List.of(keywords.toLowerCase().split("\\s*,\\s*"));
    }

    private long countOverlap(List<String> tagsA, List<String> tagsB) {
        return tagsA.stream().filter(tagsB::contains).count();
    }

    @PostMapping("/saveUpdate")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.DISTRICT_ADMIN, Role.SECTION_EDITOR, Role.SUB_EDITOR, Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN})
    @CacheEvict(value = {"articles", "articles_all", "articles_web"}, allEntries = true)
    public ResponseEntity<?> save(@RequestBody Article entity, HttpServletRequest request) {
        return createArticle(entity, request);
    }

    @Autowired
    private com.kingstv.services.ContentEditService contentEditService;

    @PutMapping("/saveUpdate")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.DISTRICT_ADMIN, Role.SECTION_EDITOR, Role.SUB_EDITOR, Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN})
    @CacheEvict(value = {"articles", "articles_all", "articles_web"}, allEntries = true)
    public ResponseEntity<?> update(@RequestBody Article entity, HttpServletRequest request) {
        if (entity.getId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Id is required for update"));
        }
        
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isLimitedEditor = auth != null && auth.getAuthorities().stream().anyMatch(a -> 
            a.getAuthority().equals("ROLE_MOBILE_JOURNALIST") || a.getAuthority().equals("ROLE_INSTITUTION_LOGIN") || a.getAuthority().equals("ROLE_DISTRICT_ADMIN"));
            
        if (isLimitedEditor) {
            try {
                Long userId = auth.getDetails() instanceof Long ? (Long) auth.getDetails() : 0L;
                contentEditService.attemptEdit("ARTICLE", entity.getId(), userId);
            } catch (com.kingstv.services.ContentEditService.MaxEditsExceededException ex) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", ex.getMessage()));
            }
        }
        
        Optional<Article> artOpt = articleRepository.findById(entity.getId());
        if (artOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Article not found"));
        }
        
        Article article = artOpt.get();

        // ── Save revision snapshot BEFORE applying changes ──
        try {
            var authCtx = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            Long editorId = authCtx != null && authCtx.getDetails() instanceof Long ? (Long) authCtx.getDetails() : null;
            String editorName = authCtx != null ? authCtx.getName() : "Unknown";
            int nextRev = (article.getRevisionNumber() != null ? article.getRevisionNumber() : 0) + 1;
            ArticleRevision snapshot = new ArticleRevision();
            snapshot.setArticleId(article.getId());
            snapshot.setRevisionNumber(nextRev);
            snapshot.setTitleTa(article.getTitleTa());
            snapshot.setTitleEn(article.getTitleEn());
            snapshot.setContentTa(article.getContentTa());
            snapshot.setContentEn(article.getContentEn());
            snapshot.setStatus(article.getStatus());
            snapshot.setChangedByUserId(editorId);
            snapshot.setChangedByName(editorName);
            snapshot.setChangeSummary("Article updated");
            articleRevisionRepository.save(snapshot);
            entity.setRevisionNumber(nextRev);
        } catch (Exception revEx) {
            // Non-blocking — revision save failure must not block the article save
            System.err.println("[Revision] Failed to save revision for article #" + entity.getId() + ": " + revEx.getMessage());
        }

        if (entity.getFeaturedImage() != null && !entity.getFeaturedImage().isEmpty() && (entity.getImageUrl() == null || entity.getImageUrl().isEmpty())) {
            entity.setImageUrl(entity.getFeaturedImage());
        }
        if (entity.getImageUrl() != null && !entity.getImageUrl().isEmpty() && (entity.getFeaturedImage() == null || entity.getFeaturedImage().isEmpty())) {
            entity.setFeaturedImage(entity.getImageUrl());
        }
        // Auto-extract first image from content HTML if missing
        if ((entity.getImageUrl() == null || entity.getImageUrl().trim().isEmpty()) && 
            (entity.getFeaturedImage() == null || entity.getFeaturedImage().trim().isEmpty())) {
            String htmlContent = entity.getContentTa() != null ? entity.getContentTa() : entity.getContentEn();
            if (htmlContent != null) {
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("src=[\"']([^\"']+\\.(?:png|jpg|jpeg|webp|gif|svg))[\"']", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(htmlContent);
                if (m.find()) {
                    String extracted = m.group(1);
                    entity.setImageUrl(extracted);
                    entity.setFeaturedImage(extracted);
                }
            }
        }

        article.setCategoryId(entity.getCategoryId());
        article.setDistrictId(entity.getDistrictId());
        article.setTitleTa(entity.getTitleTa());
        article.setTitleEn(entity.getTitleEn());
        article.setContentTa(entity.getContentTa());
        article.setContentEn(entity.getContentEn());
        article.setShortDescTa(entity.getShortDescTa());
        article.setShortDescEn(entity.getShortDescEn());
        article.setImageUrl(entity.getImageUrl());
        article.setFeaturedImage(entity.getFeaturedImage());
        article.setStatus(entity.getStatus());

        // SEO Fields
        article.setMetaTitle(entity.getMetaTitle());
        article.setMetaDescription(entity.getMetaDescription());
        article.setMetaKeywords(entity.getMetaKeywords());
        article.setFocusKeywords(entity.getFocusKeywords());
        article.setSlug(entity.getSlug());
        article.setCanonicalUrl(entity.getCanonicalUrl());
        article.setFeaturedImage(entity.getFeaturedImage());
        article.setAuthorName(entity.getAuthorName());
        article.setReporterName(entity.getReporterName());
        article.setReadabilityScore(entity.getReadabilityScore());
        article.setSeoScore(entity.getSeoScore());
        article.setSeoStatus(entity.getSeoStatus());

        // Enterprise fields
        if (entity.getRevisionNumber() != null) article.setRevisionNumber(entity.getRevisionNumber());
        if (entity.getScheduledAt() != null) article.setScheduledAt(entity.getScheduledAt());
        if (entity.getEmbargoedUntil() != null) article.setEmbargoedUntil(entity.getEmbargoedUntil());
        if (entity.getExpiresAt() != null) article.setExpiresAt(entity.getExpiresAt());
        article.setFactCheckStatus(entity.getFactCheckStatus());
        article.setFactCheckNote(entity.getFactCheckNote());
        if (entity.getRequiresLegalReview() != null) article.setRequiresLegalReview(entity.getRequiresLegalReview());
        article.setContentType(entity.getContentType());
        if (entity.getIsBreaking() != null) article.setIsBreaking(entity.getIsBreaking());
        if (entity.getIsPremium() != null) article.setIsPremium(entity.getIsPremium());
        if (entity.getIsSponsored() != null) article.setIsSponsored(entity.getIsSponsored());
        article.setSponsorName(entity.getSponsorName());
        if (entity.getIsAiGenerated() != null) article.setIsAiGenerated(entity.getIsAiGenerated());
        if (entity.getIsAiAssisted() != null) article.setIsAiAssisted(entity.getIsAiAssisted());
        article.setOgImage(entity.getOgImage());
        article.setOgTitle(entity.getOgTitle());
        article.setOgDescription(entity.getOgDescription());
        if (entity.getCorrectionNote() != null) article.setCorrectionNote(entity.getCorrectionNote());
        if (entity.getSubcategoryId() != null) article.setSubcategoryId(entity.getSubcategoryId());
        if (entity.getConstituency() != null) article.setConstituency(entity.getConstituency());
        if (entity.getLatitude() != null) article.setLatitude(entity.getLatitude());
        if (entity.getLongitude() != null) article.setLongitude(entity.getLongitude());
        if (entity.getVisibilityRadiusKm() != null) article.setVisibilityRadiusKm(entity.getVisibilityRadiusKm());
        if (entity.getShowRightColumn() != null) article.setShowRightColumn(entity.getShowRightColumn());
        if (entity.getIsPluggedIn() != null) article.setIsPluggedIn(entity.getIsPluggedIn());
        if (entity.getFeaturedCategory() != null) article.setFeaturedCategory(entity.getFeaturedCategory());
        if (entity.getPriorityScore() != null) article.setPriorityScore(entity.getPriorityScore());
        
        // Profanity Check
        if ("published".equalsIgnoreCase(article.getStatus()) || "pending".equalsIgnoreCase(article.getStatus())) {
            var authCtx = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            Long editorId = authCtx != null && authCtx.getDetails() instanceof Long ? (Long) authCtx.getDetails() : null;
            String editorName = authCtx != null ? authCtx.getName() : "Unknown";
            com.kingstv.services.ProfanityService.ProfanityCheckResult check = profanityService.checkContent(
                "ARTICLE", article.getId(), article.getTitleEn(), editorId, editorName, 
                article.getTitleTa(), article.getTitleEn(), article.getContentTa(), article.getContentEn()
            );
            if (!check.isClean()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "Content blocked due to profanity filter.",
                    "matchedTerms", check.getMatchedTerms()
                ));
            }
        }

        populateSeoFields(article, request);
        Article updated = articleRepository.save(article);
        if ("published".equals(updated.getStatus()) && !updated.getTelegramSent()) {
            telegramBotService.pushArticleToChannel(updated);
            updated.setTelegramSent(true);
            updated = articleRepository.save(updated);
        }
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.DISTRICT_ADMIN, Role.SECTION_EDITOR, Role.SUB_EDITOR, Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN})
    @CacheEvict(value = {"articles", "articles_all", "articles_web"}, allEntries = true)
    public ResponseEntity<?> updateWithId(@PathVariable Long id, @RequestBody Article entity, HttpServletRequest request) {
        entity.setId(id);
        return update(entity, request);
    }

    @PatchMapping("/changeStatus")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.DISTRICT_ADMIN, Role.SECTION_EDITOR, Role.SUB_EDITOR})
    @CacheEvict(value = {"articles", "articles_all", "articles_web"}, allEntries = true)
    public ResponseEntity<?> changeStatus(@RequestBody Map<String, Object> request) {
        if (!request.containsKey("id") || !request.containsKey("status")) {
            return ResponseEntity.badRequest().body(Map.of("message", "id and status are required"));
        }
        Long id = Long.valueOf(request.get("id").toString());
        String status = request.get("status").toString();

        // RBAC State Machine Validation
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isSubEditor = auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SUB_EDITOR"));
        boolean isSectionEditor = auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SECTION_EDITOR"));
        
        if (isSubEditor && "published".equalsIgnoreCase(status)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Sub Editors cannot publish directly."));
        }
        if (isSectionEditor && "published".equalsIgnoreCase(status)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Section Editors cannot publish directly."));
        }
        
        Optional<Article> opt = articleRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Article not found"));
        }
        Article existing = opt.get();
        existing.setStatus(status);
        if ("published".equals(status) && !existing.getTelegramSent()) {
            telegramBotService.pushArticleToChannel(existing);
            existing.setTelegramSent(true);
        }
        articleRepository.save(existing);
        return ResponseEntity.ok(Map.of("message", "Status updated successfully", "id", id, "status", status));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR})
    @CacheEvict(value = {"articles", "articles_all", "articles_web"}, allEntries = true)
    public ResponseEntity<?> deleteArticle(@PathVariable Long id) {
        Optional<Article> artOpt = articleRepository.findById(id);
        if (artOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Article not found"));
        }
        Article existing = artOpt.get();
        existing.setStatus("deleted"); // Soft delete
        articleRepository.save(existing);
        return ResponseEntity.ok(Map.of("message", "Article soft-deleted successfully"));
    }

    // Article Comments Endpoints
    @GetMapping("/{id}/comments")
    public List<Comment> getCommentsForArticle(@PathVariable Long id) {
        return commentRepository.findByArticleId(id);
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addCommentToArticle(@PathVariable Long id, @RequestBody Comment comment) {
        Optional<Article> artOpt = articleRepository.findById(id);
        if (artOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Article not found"));
        }
        if (comment.getCommentorName() == null || comment.getCommentText() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Commentor name and comment text are required"));
        }
        comment.setArticleId(id);
        if (comment.getCreatedAt() == null) {
            comment.setCreatedAt(LocalDateTime.now());
        }
        Comment saved = commentRepository.save(comment);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // Helper methods for SEO
    private void populateSeoFields(Article article, HttpServletRequest request) {
        seoGeneratorService.populateSeoFields(article, request);
    }

    private String generateJsonLd(Article article, HttpServletRequest request) {
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int port = request.getServerPort();
        String portStr = (port == 8080) ? ":5173" : ((port != 80 && port != 443) ? ":" + port : "");
        String baseUrl = scheme + "://" + serverName + portStr;
        
        String headline = article.getTitleTa() != null ? article.getTitleTa() : article.getTitleEn();
        String description = article.getMetaDescription() != null ? article.getMetaDescription() : "";
        String imageUrl = article.getImageUrl() != null ? article.getImageUrl() : (baseUrl + "/assets/images/default-news.png");
        if (imageUrl.startsWith("/")) {
            imageUrl = baseUrl + imageUrl;
        }
        String pubDate = article.getPublishedAt() != null ? article.getPublishedAt().toString() : LocalDateTime.now().toString();
        String modDate = article.getUpdatedAt() != null ? article.getUpdatedAt().toString() : pubDate;
        String author = article.getAuthorName() != null ? article.getAuthorName() : "Kings TV News Desk";
        
        // Escape quotes
        headline = headline.replace("\"", "\\\"");
        description = description.replace("\"", "\\\"");
        author = author.replace("\"", "\\\"");
        
        return "{\n" +
                "  \"@context\": \"https://schema.org\",\n" +
                "  \"@graph\": [\n" +
                "    {\n" +
                "      \"@type\": \"NewsArticle\",\n" +
                "      \"headline\": \"" + headline + "\",\n" +
                "      \"description\": \"" + description + "\",\n" +
                "      \"image\": [\"" + imageUrl + "\"],\n" +
                "      \"datePublished\": \"" + pubDate + "\",\n" +
                "      \"dateModified\": \"" + modDate + "\",\n" +
                "      \"author\": [{\n" +
                "        \"@type\": \"Person\",\n" +
                "        \"name\": \"" + author + "\"\n" +
                "      }],\n" +
                "      \"publisher\": {\n" +
                "        \"@type\": \"Organization\",\n" +
                "        \"name\": \"KINGS 24x7\",\n" +
                "        \"logo\": {\n" +
                "          \"@type\": \"ImageObject\",\n" +
                "          \"url\": \"" + baseUrl + "/assets/icons/logo.png\"\n" +
                "        }\n" +
                "      }\n" +
                "    },\n" +
                "    {\n" +
                "      \"@type\": \"BreadcrumbList\",\n" +
                "      \"itemListElement\": [\n" +
                "        {\n" +
                "          \"@type\": \"ListItem\",\n" +
                "          \"position\": 1,\n" +
                "          \"name\": \"Home\",\n" +
                "          \"item\": \"" + baseUrl + "/\"\n" +
                "        },\n" +
                "        {\n" +
                "          \"@type\": \"ListItem\",\n" +
                "          \"position\": 2,\n" +
                "          \"name\": \"News\",\n" +
                "          \"item\": \"" + baseUrl + "/article/" + article.getSlug() + "\"\n" +
                "        }\n" +
                "      ]\n" +
                "    }\n" +
                "  ]\n" +
                "}";
    }

    @PostMapping("/ai-assist")
    public ResponseEntity<?> aiAssist(@RequestBody Map<String, String> payload) {
        String action = payload.get("action");
        String text = payload.get("text");
        String context = payload.get("context");

        if (action == null || text == null) {
            return ResponseEntity.badRequest().body(Map.of("error", true, "result", "Action and text are required"));
        }

        Map<String, Object> result = aiAssistService.assist(action, text, context);
        if (Boolean.TRUE.equals(result.get("error"))) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "File is empty"));
        }
        try {
            String url = storageService.uploadFile(file, "articles");

            // Save to Media Library (MediaAsset) automatically
            try {
                MediaAsset asset = new MediaAsset();
                asset.setFilename(file.getOriginalFilename());
                asset.setUrl(url);
                asset.setMimeType(file.getContentType());
                asset.setFileSize(file.getSize());

                String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
                String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
                String category = "other";

                if (contentType.startsWith("image/") || 
                    fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png") || 
                    fileName.endsWith(".gif") || fileName.endsWith(".webp") || fileName.endsWith(".bmp") || 
                    fileName.endsWith(".svg")) {
                    category = "image";
                } else if (contentType.startsWith("video/") || 
                           fileName.endsWith(".mp4") || fileName.endsWith(".mov") || fileName.endsWith(".avi") || 
                           fileName.endsWith(".mkv") || fileName.endsWith(".webm") || fileName.endsWith(".3gp") || 
                           fileName.endsWith(".mpeg")) {
                    category = "video";
                } else if (contentType.startsWith("audio/") || 
                           fileName.endsWith(".mp3") || fileName.endsWith(".wav") || fileName.endsWith(".ogg") || 
                           fileName.endsWith(".m4a") || fileName.endsWith(".aac") || fileName.endsWith(".flac")) {
                    category = "audio";
                } else if (fileName.endsWith(".pdf") || fileName.endsWith(".doc") || fileName.endsWith(".docx") || 
                         fileName.endsWith(".xls") || fileName.endsWith(".xlsx") || fileName.endsWith(".ppt") || 
                         fileName.endsWith(".pptx") || fileName.endsWith(".txt") || fileName.endsWith(".csv")) {
                    category = "document";
                }
                asset.setCategory(category);

                // Get uploader ID if available
                org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.getDetails() instanceof Long) {
                    asset.setUploaderId((Long) auth.getDetails());
                }

                mediaAssetRepository.save(asset);
            } catch (Exception ex) {
                System.err.println("Warning: Failed to save uploaded article file to Media Library: " + ex.getMessage());
            }

            return ResponseEntity.ok(Map.of("url", url));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to upload file: " + e.getMessage()));
        }
    }

    @GetMapping("/public/authors/{name}")
    public ResponseEntity<?> getPublicAuthorProfile(@PathVariable String name) {
        return userRepository.findByFullName(name).map(user -> {
            return ResponseEntity.ok(Map.of(
                "fullName", user.getFullName(),
                "role", user.getRole(),
                "profileImage", user.getProfileImage() != null ? user.getProfileImage() : "",
                "bio", "Experienced journalist covering news and updates at Kings TV.",
                "location", "Chennai, India",
                "twitter", "https://twitter.com/kingstv",
                "facebook", "https://facebook.com/kingstv"
            ));
        }).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Author profile not found")));
    }

    @GetMapping(value = "/public/news/{id}/amp", produces = "text/html;charset=UTF-8")
    @ResponseBody
    public String getAmpArticle(@PathVariable Long id, HttpServletRequest request) {
        Optional<Article> artOpt = articleRepository.findById(id);
        if (artOpt.isEmpty()) {
            return "<html><body><h1>Article Not Found</h1></body></html>";
        }
        Article article = artOpt.get();
        String title = article.getTitleTa() != null ? article.getTitleTa() : "";
        String content = article.getContentTa() != null ? article.getContentTa() : "";
        String author = article.getAuthorName() != null ? article.getAuthorName() : "Kings TV News Desk";
        String date = article.getPublishedAt() != null ? article.getPublishedAt().toString() : LocalDateTime.now().toString();
        
        String appUrl = configService.getConfigValueOrDefault("app.web_url", "http://localhost:5173");
        String canonicalUrl = appUrl + "/news/" + article.getId();
        
        // Convert standard images in content to amp-img
        String processedContent = content;
        processedContent = processedContent.replaceAll("<img([^>]+)>", "<amp-img$1 layout=\"responsive\" width=\"600\" height=\"400\"></amp-img>");

        String ampImgTag = "";
        if (article.getImageUrl() != null && !article.getImageUrl().isEmpty()) {
            ampImgTag = "<amp-img src=\"" + article.getImageUrl() + "\" width=\"600\" height=\"400\" layout=\"responsive\" alt=\"" + title + "\"></amp-img>";
        }

        return "<!doctype html>\n" +
                "<html amp lang=\"ta\">\n" +
                "<head>\n" +
                "  <meta charset=\"utf-8\">\n" +
                "  <script async src=\"https://cdn.ampproject.org/v0.js\"></script>\n" +
                "  <title>" + title + "</title>\n" +
                "  <link rel=\"canonical\" href=\"" + canonicalUrl + "\">\n" +
                "  <meta name=\"viewport\" content=\"width=device-width,minimum-scale=1,initial-scale=1\">\n" +
                "  <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>\n" +
                "  <style amp-custom>\n" +
                "    body { font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #f9fafb; margin: 0; padding: 0; }\n" +
                "    .header { background-color: #1e3a8a; color: white; padding: 16px; text-align: center; font-weight: bold; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }\n" +
                "    .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }\n" +
                "    h1 { font-size: 24px; color: #1e3a8a; margin-top: 10px; margin-bottom: 8px; }\n" +
                "    .meta { font-size: 13px; color: #6b7280; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }\n" +
                "    .content { font-size: 16px; color: #374151; }\n" +
                "    .footer { text-align: center; padding: 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; margin-top: 40px; }\n" +
                "  </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "  <div class=\"header\">KINGS 24x7 NEWS</div>\n" +
                "  <div class=\"container\">\n" +
                "    <h1>" + title + "</h1>\n" +
                "    <div class=\"meta\">By " + author + " | Published: " + date + "</div>\n" +
                "    " + ampImgTag + "\n" +
                "    <div class=\"content\">\n" +
                "      " + processedContent + "\n" +
                "    </div>\n" +
                "  </div>\n" +
                "  <div class=\"footer\">&copy; 2026 Kings TV News Media. All rights reserved.</div>\n" +
                "</body>\n" +
                "</html>";
    }

    // ============================================================
    // ENTERPRISE: Article Locking
    // ============================================================

    @PostMapping("/{id}/lock")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.DISTRICT_ADMIN, Role.SECTION_EDITOR, Role.SUB_EDITOR, Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN})
    public ResponseEntity<?> lockArticle(@PathVariable Long id) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Long userId = auth != null && auth.getDetails() instanceof Long ? (Long) auth.getDetails() : null;

        Optional<Article> opt = articleRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Article not found"));
        Article article = opt.get();

        // Check if locked by someone else with non-expired lock
        if (article.getLockedByUserId() != null && !article.getLockedByUserId().equals(userId)) {
            LocalDateTime expiry = article.getLockExpiresAt();
            if (expiry != null && expiry.isAfter(LocalDateTime.now())) {
                String lockerName = userRepository.findById(article.getLockedByUserId())
                    .map(User::getFullName).orElse("Another editor");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "message", "Article is locked by " + lockerName,
                    "lockedBy", lockerName,
                    "lockExpiresAt", expiry.toString()
                ));
            }
        }

        article.setLockedByUserId(userId);
        article.setLockedAt(LocalDateTime.now());
        article.setLockExpiresAt(LocalDateTime.now().plusMinutes(30));
        articleRepository.save(article);
        return ResponseEntity.ok(Map.of(
            "message", "Lock acquired",
            "lockedByUserId", userId != null ? userId : 0L,
            "lockExpiresAt", article.getLockExpiresAt().toString()
        ));
    }

    @PostMapping("/{id}/unlock")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.DISTRICT_ADMIN, Role.SECTION_EDITOR, Role.SUB_EDITOR, Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN})
    public ResponseEntity<?> unlockArticle(@PathVariable Long id) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Long userId = auth != null && auth.getDetails() instanceof Long ? (Long) auth.getDetails() : null;
        String role = auth != null ? auth.getAuthorities().stream()
            .filter(a -> a.getAuthority().startsWith("ROLE_")).map(a -> a.getAuthority().substring(5))
            .findFirst().orElse("") : "";

        Optional<Article> opt = articleRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Article not found"));
        Article article = opt.get();

        boolean isAdmin = "SUPER_ADMIN".equals(role) || "CHIEF_EDITOR".equals(role);
        boolean isOwner = article.getLockedByUserId() != null && article.getLockedByUserId().equals(userId);
        if (!isOwner && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Only the lock owner or an admin can unlock this article"));
        }

        article.setLockedByUserId(null);
        article.setLockedAt(null);
        article.setLockExpiresAt(null);
        articleRepository.save(article);
        return ResponseEntity.ok(Map.of("message", "Article unlocked"));
    }

    @PostMapping("/{id}/heartbeat")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.DISTRICT_ADMIN, Role.SECTION_EDITOR, Role.SUB_EDITOR, Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN})
    public ResponseEntity<?> heartbeatLock(@PathVariable Long id) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Long userId = auth != null && auth.getDetails() instanceof Long ? (Long) auth.getDetails() : null;

        Optional<Article> opt = articleRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Article not found"));
        Article article = opt.get();

        if (!java.util.Objects.equals(article.getLockedByUserId(), userId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "You do not hold the lock on this article"));
        }
        article.setLockExpiresAt(LocalDateTime.now().plusMinutes(30));
        articleRepository.save(article);
        return ResponseEntity.ok(Map.of("message", "Lock extended", "lockExpiresAt", article.getLockExpiresAt().toString()));
    }

    @GetMapping("/{id}/lock-status")
    public ResponseEntity<?> getLockStatus(@PathVariable Long id) {
        Optional<Article> opt = articleRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Article not found"));
        Article article = opt.get();
        boolean isLocked = article.getLockedByUserId() != null
            && article.getLockExpiresAt() != null
            && article.getLockExpiresAt().isAfter(LocalDateTime.now());

        if (!isLocked) return ResponseEntity.ok(Map.of("locked", false));
        String lockerName = userRepository.findById(article.getLockedByUserId())
            .map(User::getFullName).orElse("Unknown editor");
        return ResponseEntity.ok(Map.of(
            "locked", true,
            "lockedBy", lockerName,
            "lockedByUserId", article.getLockedByUserId(),
            "lockedAt", article.getLockedAt().toString(),
            "lockExpiresAt", article.getLockExpiresAt().toString()
        ));
    }

    // ============================================================
    // ENTERPRISE: Revision History
    // ============================================================

    @GetMapping("/{id}/revisions")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.DISTRICT_ADMIN, Role.SECTION_EDITOR, Role.SUB_EDITOR})
    public ResponseEntity<?> getRevisions(@PathVariable Long id) {
        return ResponseEntity.ok(articleRevisionRepository.findByArticleIdOrderByRevisionNumberDesc(id));
    }

    @GetMapping("/{id}/revisions/{revNum}")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.DISTRICT_ADMIN, Role.SECTION_EDITOR, Role.SUB_EDITOR})
    public ResponseEntity<?> getRevision(@PathVariable Long id, @PathVariable Integer revNum) {
        return articleRevisionRepository.findByArticleIdOrderByRevisionNumberDesc(id).stream()
            .filter(r -> r.getRevisionNumber().equals(revNum))
            .findFirst()
            .<ResponseEntity<?>>map(ResponseEntity::ok)
            .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Revision not found")));
    }

    @DeleteMapping("/purge-demo-articles")
    public ResponseEntity<?> purgeDemoArticles() {
        java.util.List<Article> dummyArticles = articleRepository.findAll().stream()
            .filter(a -> "Kings TV Desk".equalsIgnoreCase(a.getAuthorName()) && 
                         ((a.getTitleEn() != null && a.getTitleEn().contains(" #")) || 
                          (a.getTitleTa() != null && a.getTitleTa().contains(" #"))))
            .toList();
        int count = dummyArticles.size();
        if (count > 0) {
            articleRepository.deleteAll(dummyArticles);
        }
        return ResponseEntity.ok(Map.of("message", "Successfully purged " + count + " demo template articles.", "purgedCount", count));
    }
}

