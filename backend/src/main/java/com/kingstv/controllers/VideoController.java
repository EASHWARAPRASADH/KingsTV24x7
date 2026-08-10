package com.kingstv.controllers;

import com.kingstv.models.VideoContent;
import com.kingstv.repository.VideoContentRepository;
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

@RestController
@RequestMapping("/api/v1/videos")
public class VideoController {

    @Autowired
    private VideoContentRepository videoContentRepository;

    // --- KEEP Existing Front-End Endpoint Map ---
    @GetMapping
    public List<VideoContent> getVideos() {
        return videoContentRepository.findByIsLiveTvOrderByPublishedAtDesc(0);
    }

    @GetMapping("/live")
    public ResponseEntity<?> getLiveTv() {
        List<VideoContent> liveList = videoContentRepository.findByIsLiveTvOrderByPublishedAtDesc(1);
        if (!liveList.isEmpty()) {
            return ResponseEntity.ok(liveList.get(0));
        }

        // Fallback: Create and save a default working Live TV video entry in DB if none exists
        VideoContent fallbackLive = new VideoContent();
        fallbackLive.setTitle("KINGS 24x7 Live Broadcast | கிங்ஸ் 24x7 நேரலை");
        fallbackLive.setYoutubeUrl("https://www.youtube.com/embed/jfKfPfyJRdk");
        fallbackLive.setThumbnailUrl("https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800");
        fallbackLive.setDescription("Watch continuous live news coverage in Tamil & English.");
        fallbackLive.setIsLiveTv(1);
        fallbackLive.setPublishedAt(LocalDateTime.now());
        fallbackLive.setStatus("published");

        try {
            VideoContent saved = videoContentRepository.save(fallbackLive);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.ok(fallbackLive);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getVideoById(@PathVariable Long id) {
        Optional<VideoContent> vidOpt = videoContentRepository.findById(id);
        if (vidOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Video not found"));
        }
        return ResponseEntity.ok(vidOpt.get());
    }

    @PostMapping
    public ResponseEntity<?> createVideo(@RequestBody VideoContent video) {
        if (video.getTitle() == null || video.getYoutubeUrl() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Title and YouTube URL are required"));
        }
        if (video.getPublishedAt() == null) {
            video.setPublishedAt(LocalDateTime.now());
        }
        VideoContent saved = videoContentRepository.save(video);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // --- NEW Standardized API Standard Endpoints ---
    @GetMapping("/getAll")
    public Page<VideoContent> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        
        Sort sort = Sort.by(direction.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        Specification<VideoContent> spec = SpecificationBuilder.build(search, status, categoryId, null);
        return videoContentRepository.findAll(spec, pageable);
    }

    @GetMapping("/getAllWeb")
    public Page<VideoContent> getAllWeb(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        
        return getAll(search, "published", categoryId, page, size, sortBy, direction);
    }

    @PostMapping("/saveUpdate")
    public ResponseEntity<?> save(@RequestBody VideoContent entity) {
        return createVideo(entity);
    }

    @PutMapping("/saveUpdate")
    public ResponseEntity<?> update(@RequestBody VideoContent entity) {
        if (entity.getId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Id is required for update"));
        }
        Optional<VideoContent> vidOpt = videoContentRepository.findById(entity.getId());
        if (vidOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Video not found"));
        }
        VideoContent video = vidOpt.get();
        if (entity.getCategoryId() != null) video.setCategoryId(entity.getCategoryId());
        if (entity.getTitle() != null) video.setTitle(entity.getTitle());
        if (entity.getYoutubeUrl() != null) video.setYoutubeUrl(entity.getYoutubeUrl());
        if (entity.getDescription() != null) video.setDescription(entity.getDescription());
        if (entity.getIsLiveTv() != null) video.setIsLiveTv(entity.getIsLiveTv());
        if (entity.getViewsCount() != null) video.setViewsCount(entity.getViewsCount());
        if (entity.getThumbnailUrl() != null) video.setThumbnailUrl(entity.getThumbnailUrl());
        if (entity.getDurationSeconds() != null) video.setDurationSeconds(entity.getDurationSeconds());
        
        VideoContent updated = videoContentRepository.save(video);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/changeStatus")
    public ResponseEntity<?> changeStatus(@RequestBody Map<String, Object> request) {
        if (!request.containsKey("id") || !request.containsKey("status")) {
            return ResponseEntity.badRequest().body(Map.of("message", "id and status are required"));
        }
        Long id = Long.valueOf(request.get("id").toString());
        String status = request.get("status").toString();
        
        Optional<VideoContent> opt = videoContentRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Video not found"));
        }
        VideoContent existing = opt.get();
        existing.setStatus(status);
        videoContentRepository.save(existing);
        return ResponseEntity.ok(Map.of("message", "Status updated successfully", "id", id, "status", status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteVideo(@PathVariable Long id) {
        Optional<VideoContent> vidOpt = videoContentRepository.findById(id);
        if (vidOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Video not found"));
        }
        VideoContent existing = vidOpt.get();
        existing.setStatus("deleted"); // Soft delete
        videoContentRepository.save(existing);
        return ResponseEntity.ok(Map.of("message", "Video soft-deleted successfully"));
    }
}
