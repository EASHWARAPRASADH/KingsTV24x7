package com.kingstv.controllers;

import com.kingstv.models.MediaAsset;
import com.kingstv.models.Role;
import com.kingstv.repository.MediaAssetRepository;
import com.kingstv.security.RequiresPermission;
import com.kingstv.services.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/media")
public class MediaAssetController {

    @Autowired
    private MediaAssetRepository mediaAssetRepository;

    @Autowired
    private StorageService storageService;

    @GetMapping("/list")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.SUB_EDITOR, Role.SECTION_EDITOR, Role.DISTRICT_ADMIN, Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN})
    public ResponseEntity<Page<MediaAsset>> listMedia(
            @RequestParam(required = false, defaultValue = "all") String category,
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        // MediaLibrary.jsx passes page 1-indexed, but spring data is 0-indexed. 
        // We will accept page as 0-indexed and let frontend adjust, OR if frontend passes page=1 we might need to adjust.
        // Wait, MediaLibrary.jsx doesn't pass page/size to backend yet! It fetches all and paginates on client.
        // Let's check what MediaLibrary.jsx does: it calls `api.get('/media/list')` without params.
        // So this will just return the first 20 if we don't handle it, but wait!
        // We should return the full list if no params are passed, or a large page.
        // I will return a large page or list. Let's return max 1000 items.
        Pageable pageable = PageRequest.of(0, 1000, Sort.by(Sort.Direction.DESC, "uploadedAt"));
        Page<MediaAsset> result = mediaAssetRepository.findByCategoryAndSearch(category, search, pageable);
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/upload")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.SUB_EDITOR, Role.SECTION_EDITOR, Role.DISTRICT_ADMIN, Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN})
    public ResponseEntity<?> uploadMedia(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "File is empty"));
        }
        
        try {
            String url = storageService.uploadFile(file, "media");
            
            MediaAsset asset = new MediaAsset();
            asset.setFilename(file.getOriginalFilename());
            asset.setUrl(url);
            asset.setMimeType(file.getContentType());
            asset.setFileSize(file.getSize());
            
            // Determine category
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
            
            // Get uploader ID
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getDetails() instanceof Long) {
                asset.setUploaderId((Long) auth.getDetails());
            }
            
            MediaAsset saved = mediaAssetRepository.save(asset);
            
            // Return in format expected by MediaLibrary.jsx: { url: "..." }
            // But we should also return the full asset so the UI has all data.
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to upload file: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR, Role.SUB_EDITOR, Role.SECTION_EDITOR, Role.DISTRICT_ADMIN, Role.MOBILE_JOURNALIST, Role.INSTITUTION_LOGIN})
    public ResponseEntity<?> updateMediaFilename(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newName = body.get("name");
        if (newName == null || newName.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "New filename is required"));
        }
        Optional<MediaAsset> opt = mediaAssetRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Media not found"));
        }
        MediaAsset asset = opt.get();
        asset.setFilename(newName.trim());
        MediaAsset updated = mediaAssetRepository.save(asset);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(anyOf = {Role.SUPER_ADMIN, Role.CHIEF_EDITOR})
    public ResponseEntity<?> deleteMedia(@PathVariable Long id) {
        Optional<MediaAsset> opt = mediaAssetRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Media not found"));
        }
        
        // We delete the DB record. Physical file deletion from S3/local is complex and potentially unsafe 
        // if file is referenced in articles. So we just remove it from the library listing.
        mediaAssetRepository.deleteById(id);
        
        return ResponseEntity.ok(Map.of("message", "Media deleted from library"));
    }
}
