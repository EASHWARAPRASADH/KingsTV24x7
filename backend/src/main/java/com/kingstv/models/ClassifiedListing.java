package com.kingstv.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "classified_listings")
public class ClassifiedListing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "classified_id")
    private Long id;

    @Column(nullable = false, unique = true)
    private String uuid = UUID.randomUUID().toString();

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "subcategory_id")
    private Long subcategoryId;

    @Column(name = "seller_id")
    private Long sellerId;

    @Column(nullable = false)
    private String title;

    private String slug;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "brand_id")
    private Long brandId;

    @Column(name = "condition_id")
    private Long conditionId;

    private Double price = 0.0;

    private Boolean negotiable = false;

    @Column(name = "district_id")
    private Long districtId;

    @Column(name = "taluk_id")
    private Long talukId;

    private String pincode;

    private Double latitude;
    private Double longitude;

    private Boolean featured = false;
    private Boolean sponsored = false;

    @Column(nullable = false)
    private String status = "active"; // active, pending, expired, sold, draft

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "whatsapp_number")
    private String whatsappNumber;

    private String email;

    @Column(name = "view_count")
    private Integer viewCount = 0;

    @Column(name = "favourite_count")
    private Integer favouriteCount = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    private Boolean deleted = false;

    // Compatibility fields to store legacy data initialized by DataInitializer
    @Column(nullable = false)
    private String category = "Others";

    @Column(name = "price_detail", nullable = false)
    private String priceDetail = "₹ 0";

    @Column(nullable = false)
    private String location = "Tamil Nadu";

    @Column(name = "contact_info", nullable = false)
    private String contactInfo = "N/A";

    @Column(name = "image_url")
    private String imageUrl;

    @PrePersist
    @PreUpdate
    public void onUpdate() {
        if (uuid == null) {
            uuid = UUID.randomUUID().toString();
        }
        if (slug == null && title != null) {
            slug = title.toLowerCase().replaceAll("[^a-z0-9]+", "-");
        }
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUuid() { return uuid; }
    public void setUuid(String uuid) { this.uuid = uuid; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public Long getSubcategoryId() { return subcategoryId; }
    public void setSubcategoryId(Long subcategoryId) { this.subcategoryId = subcategoryId; }

    public Long getSellerId() { return sellerId; }
    public void setSellerId(Long sellerId) { this.sellerId = sellerId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Long getBrandId() { return brandId; }
    public void setBrandId(Long brandId) { this.brandId = brandId; }

    public Long getConditionId() { return conditionId; }
    public void setConditionId(Long conditionId) { this.conditionId = conditionId; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public Boolean getNegotiable() { return negotiable; }
    public void setNegotiable(Boolean negotiable) { this.negotiable = negotiable; }

    public Long getDistrictId() { return districtId; }
    public void setDistrictId(Long districtId) { this.districtId = districtId; }

    public Long getTalukId() { return talukId; }
    public void setTalukId(Long talukId) { this.talukId = talukId; }

    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Boolean getFeatured() { return featured; }
    public void setFeatured(Boolean featured) { this.featured = featured; }

    public Boolean getSponsored() { return sponsored; }
    public void setSponsored(Boolean sponsored) { this.sponsored = sponsored; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getWhatsappNumber() { return whatsappNumber; }
    public void setWhatsappNumber(String whatsappNumber) { this.whatsappNumber = whatsappNumber; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Integer getViewCount() { return viewCount; }
    public void setViewCount(Integer viewCount) { this.viewCount = viewCount; }

    public Integer getFavouriteCount() { return favouriteCount; }
    public void setFavouriteCount(Integer favouriteCount) { this.favouriteCount = favouriteCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Boolean getDeleted() { return deleted; }
    public void setDeleted(Boolean deleted) { this.deleted = deleted; }

    // Compatibility getters & setters
    public String getCategory() {
        return category;
    }
    public void setCategory(String category) {
        this.category = category;
    }

    public String getPriceDetail() {
        return price != null && price > 0 ? "₹ " + price : priceDetail;
    }
    public void setPriceDetail(String priceDetail) {
        this.priceDetail = priceDetail;
        if (priceDetail != null) {
            try {
                String clean = priceDetail.replaceAll("[^0-9.]", "");
                if (!clean.isEmpty()) {
                    this.price = Double.parseDouble(clean);
                }
            } catch (Exception e) {
                // ignore
            }
        }
    }

    public String getLocation() {
        return location;
    }
    public void setLocation(String location) {
        this.location = location;
    }

    public String getContactInfo() {
        return contactPhone != null ? contactPhone : contactInfo;
    }
    public void setContactInfo(String contactInfo) {
        this.contactInfo = contactInfo;
        this.contactPhone = contactInfo;
    }

    public String getImageUrl() {
        return imageUrl;
    }
    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
