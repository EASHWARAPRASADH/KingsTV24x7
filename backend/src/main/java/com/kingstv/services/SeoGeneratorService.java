package com.kingstv.services;

import com.kingstv.models.Article;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class SeoGeneratorService {

    @Autowired
    private SlugService slugService;

    public void populateSeoFields(Article article, HttpServletRequest request) {
        // 1. Generate & Set Slug
        slugService.generateAndSetSlug(article);

        String headline = article.getTitleTa() != null ? article.getTitleTa() : article.getTitleEn();
        if (headline == null) {
            headline = "Kings TV News";
        }

        // 2. Meta Title Format Enforcement: "Headline | KINGS 24x7"
        if (article.getMetaTitle() == null || article.getMetaTitle().trim().isEmpty()) {
            article.setMetaTitle(headline + " | KINGS 24x7");
        }

        // 3. Meta Description: 150-160 Characters Auto-Pull
        if (article.getMetaDescription() == null || article.getMetaDescription().trim().isEmpty()) {
            String desc = article.getShortDescTa() != null ? article.getShortDescTa() : article.getShortDescEn();
            if (desc == null || desc.trim().isEmpty()) {
                desc = article.getContentTa() != null ? article.getContentTa() : article.getContentEn();
            }
            if (desc == null) {
                desc = "";
            }
            
            // Clean HTML if present
            desc = desc.replaceAll("<[^>]*>", "").trim();
            if (desc.length() > 155) {
                desc = desc.substring(0, 152) + "...";
            }
            article.setMetaDescription(desc);
        }

        // 4. Focus Keywords
        if (article.getFocusKeywords() == null || article.getFocusKeywords().trim().isEmpty()) {
            String cleanKeywords = headline.toLowerCase()
                .replaceAll("[^a-zA-Z0-9\\sஅ-ஹ]", "")
                .replaceAll("\\s+", ", ")
                .trim();
            article.setFocusKeywords("news, KINGS 24x7, Tamil news, " + cleanKeywords);
        }

        // 4b. Meta Keywords (News Tags)
        if (article.getMetaKeywords() == null || article.getMetaKeywords().trim().isEmpty()) {
            String cleanKeywords = headline.toLowerCase()
                .replaceAll("[^a-zA-Z0-9\\sஅ-ஹ]", "")
                .replaceAll("\\s+", ", ")
                .trim();
            article.setMetaKeywords("news, KINGS 24x7, Tamil news, " + cleanKeywords);
        }

        // 5. Featured Image and Alt text
        if (article.getFeaturedImage() == null || article.getFeaturedImage().trim().isEmpty()) {
            article.setFeaturedImage(article.getImageUrl());
        }
        
        // 6. Canonical URLs
        if (article.getCanonicalUrl() == null || article.getCanonicalUrl().trim().isEmpty()) {
            String baseUrl = "https://king-tv.test-technoprint.online";
            if (request != null && request.getServerName() != null && (request.getServerName().contains("localhost") || request.getServerName().contains("127.0.0.1"))) {
                baseUrl = "http://localhost:5173";
            }
            article.setCanonicalUrl(baseUrl + "/news/" + article.getSlug());
        }
    }
}
