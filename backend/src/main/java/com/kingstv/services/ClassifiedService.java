package com.kingstv.services;

import com.kingstv.models.*;
import com.kingstv.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.*;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class ClassifiedService {

    @Autowired
    private ClassifiedRepository classifiedRepository;

    @Autowired
    private ClassifiedCategoryRepository categoryRepository;

    @Autowired
    private ClassifiedSubcategoryRepository subcategoryRepository;

    @Autowired
    private ClassifiedImageRepository imageRepository;

    @Autowired
    private ClassifiedFavouriteRepository favouriteRepository;

    @Autowired
    private ClassifiedViewRepository viewRepository;

    @Autowired
    private ClassifiedReportRepository reportRepository;

    @Autowired
    private ClassifiedShareRepository shareRepository;

    @Autowired
    private ClassifiedSellerProfileRepository sellerProfileRepository;

    @Autowired
    private ClassifiedReviewRepository reviewRepository;

    public Page<ClassifiedListing> getClassifieds(String search, Long categoryId, Long subcategoryId, 
                                                Long districtId, Double priceMin, Double priceMax,
                                                String condition, Boolean negotiable, String sort, Pageable pageable) {
        
        Specification<ClassifiedListing> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("deleted"), false));
            predicates.add(cb.equal(root.get("status"), "active"));

            if (categoryId != null) {
                predicates.add(cb.equal(root.get("categoryId"), categoryId));
            }
            if (subcategoryId != null) {
                predicates.add(cb.equal(root.get("subcategoryId"), subcategoryId));
            }
            if (districtId != null) {
                predicates.add(cb.equal(root.get("districtId"), districtId));
            }
            if (priceMin != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), priceMin));
            }
            if (priceMax != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), priceMax));
            }
            if (negotiable != null) {
                predicates.add(cb.equal(root.get("negotiable"), negotiable));
            }

            if (search != null && !search.isEmpty()) {
                String likePattern = "%" + search.toLowerCase() + "%";
                Predicate titlePred = cb.like(cb.lower(root.get("title")), likePattern);
                Predicate descPred = cb.like(cb.lower(root.get("description")), likePattern);
                predicates.add(cb.or(titlePred, descPred));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Sort sortOrder = Sort.by(Sort.Direction.DESC, "createdAt");
        if (sort != null) {
            switch (sort.toLowerCase()) {
                case "price_asc":
                    sortOrder = Sort.by(Sort.Direction.ASC, "price");
                    break;
                case "price_desc":
                    sortOrder = Sort.by(Sort.Direction.DESC, "price");
                    break;
                case "most_viewed":
                    sortOrder = Sort.by(Sort.Direction.DESC, "viewCount");
                    break;
                case "newest":
                default:
                    sortOrder = Sort.by(Sort.Direction.DESC, "createdAt");
                    break;
            }
        }

        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sortOrder);
        return classifiedRepository.findAll(spec, sortedPageable);
    }

    public Optional<ClassifiedListing> getClassifiedById(Long id) {
        return classifiedRepository.findById(id).filter(c -> !c.getDeleted());
    }

    public ClassifiedListing createClassified(ClassifiedListing listing, List<String> images) {
        listing.setDeleted(false);
        listing.setCreatedAt(LocalDateTime.now());
        listing.setViewCount(0);
        listing.setFavouriteCount(0);
        if (listing.getStatus() == null) {
            listing.setStatus("pending");
        }
        ClassifiedListing saved = classifiedRepository.save(listing);

        if (images != null) {
            for (int i = 0; i < images.size(); i++) {
                ClassifiedImage img = new ClassifiedImage();
                img.setClassifiedId(saved.getId());
                img.setImageUrl(images.get(i));
                img.setDisplayOrder(i);
                imageRepository.save(img);
            }
        }
        return saved;
    }

    public ClassifiedListing updateClassified(Long id, ClassifiedListing updated) throws Exception {
        ClassifiedListing existing = classifiedRepository.findById(id)
                .orElseThrow(() -> new Exception("Classified listing not found"));

        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setPrice(updated.getPrice());
        existing.setNegotiable(updated.getNegotiable());
        existing.setCategoryId(updated.getCategoryId());
        existing.setSubcategoryId(updated.getSubcategoryId());
        existing.setDistrictId(updated.getDistrictId());
        existing.setTalukId(updated.getTalukId());
        existing.setPincode(updated.getPincode());
        existing.setLatitude(updated.getLatitude());
        existing.setLongitude(updated.getLongitude());
        existing.setContactPhone(updated.getContactPhone());
        existing.setWhatsappNumber(updated.getWhatsappNumber());
        existing.setEmail(updated.getEmail());
        existing.setStatus(updated.getStatus());

        return classifiedRepository.save(existing);
    }

    public void deleteClassified(Long id) throws Exception {
        ClassifiedListing existing = classifiedRepository.findById(id)
                .orElseThrow(() -> new Exception("Classified listing not found"));
        existing.setDeleted(true);
        existing.setStatus("expired");
        classifiedRepository.save(existing);
    }

    public ClassifiedFavourite saveAd(Long classifiedId, Long userId) throws Exception {
        Optional<ClassifiedFavourite> existing = favouriteRepository.findByClassifiedIdAndUserId(classifiedId, userId);
        if (existing.isPresent()) {
            return existing.get();
        }

        ClassifiedListing listing = classifiedRepository.findById(classifiedId)
                .orElseThrow(() -> new Exception("Listing not found"));

        ClassifiedFavourite fav = new ClassifiedFavourite();
        fav.setClassifiedId(classifiedId);
        fav.setUserId(userId);
        fav.setCreatedAt(LocalDateTime.now());

        ClassifiedFavourite saved = favouriteRepository.save(fav);

        listing.setFavouriteCount(listing.getFavouriteCount() + 1);
        classifiedRepository.save(listing);

        return saved;
    }

    public void unsaveAd(Long classifiedId, Long userId) throws Exception {
        favouriteRepository.findByClassifiedIdAndUserId(classifiedId, userId)
                .ifPresent(f -> {
                    favouriteRepository.delete(f);
                    classifiedRepository.findById(classifiedId).ifPresent(l -> {
                        l.setFavouriteCount(Math.max(0, l.getFavouriteCount() - 1));
                        classifiedRepository.save(l);
                    });
                });
    }

    public List<ClassifiedFavourite> getSavedAds(Long userId) {
        return favouriteRepository.findByUserId(userId);
    }

    public void logView(Long classifiedId, String ip, String ua) {
        ClassifiedView view = new ClassifiedView();
        view.setClassifiedId(classifiedId);
        view.setIpAddress(ip);
        view.setUserAgent(ua);
        view.setCreatedAt(LocalDateTime.now());
        viewRepository.save(view);

        classifiedRepository.findById(classifiedId).ifPresent(l -> {
            l.setViewCount(l.getViewCount() + 1);
            classifiedRepository.save(l);
        });
    }

    public void logReport(Long classifiedId, String name, String reason) {
        ClassifiedReport report = new ClassifiedReport();
        report.setClassifiedId(classifiedId);
        report.setReporterName(name);
        report.setReason(reason);
        reportRepository.save(report);
    }

    public void logShare(Long classifiedId, String platform) {
        ClassifiedShare share = new ClassifiedShare();
        share.setClassifiedId(classifiedId);
        share.setPlatform(platform);
        shareRepository.save(share);
    }

    public List<ClassifiedCategory> getCategories() {
        return categoryRepository.findAll();
    }

    public List<ClassifiedSubcategory> getSubcategories(Long categoryId) {
        return subcategoryRepository.findByCategoryId(categoryId);
    }

    public List<ClassifiedImage> getImages(Long classifiedId) {
        return imageRepository.findByClassifiedId(classifiedId);
    }

    public ClassifiedSellerProfile getSellerProfile(Long userId) {
        return sellerProfileRepository.findByUserId(userId).orElseGet(() -> {
            ClassifiedSellerProfile profile = new ClassifiedSellerProfile();
            profile.setUserId(userId);
            profile.setSellerName("Seller_" + userId);
            profile.setVerified(false);
            profile.setRating(5.0);
            profile.setReviewCount(0);
            return sellerProfileRepository.save(profile);
        });
    }

    public ClassifiedSellerProfile updateSellerProfile(Long userId, ClassifiedSellerProfile updated) {
        ClassifiedSellerProfile profile = getSellerProfile(userId);
        profile.setSellerName(updated.getSellerName());
        profile.setProfilePhoto(updated.getProfilePhoto());
        profile.setCoverImage(updated.getCoverImage());
        profile.setLocation(updated.getLocation());
        return sellerProfileRepository.save(profile);
    }

    public List<ClassifiedListing> getMyClassifieds(Long sellerId) {
        return classifiedRepository.findAll(Specification.where((root, query, cb) -> 
            cb.and(
                cb.equal(root.get("deleted"), false),
                cb.equal(root.get("sellerId"), sellerId)
            )
        ));
    }

    public void boostAd(Long id) throws Exception {
        ClassifiedListing existing = classifiedRepository.findById(id)
                .orElseThrow(() -> new Exception("Classified listing not found"));
        existing.setFeatured(true);
        classifiedRepository.save(existing);
    }

    public void renewAd(Long id) throws Exception {
        ClassifiedListing existing = classifiedRepository.findById(id)
                .orElseThrow(() -> new Exception("Classified listing not found"));
        existing.setCreatedAt(LocalDateTime.now());
        existing.setStatus("active");
        classifiedRepository.save(existing);
    }
}
