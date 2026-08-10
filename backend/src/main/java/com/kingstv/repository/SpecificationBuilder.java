package com.kingstv.repository;

import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.*;
import java.util.ArrayList;
import java.util.List;

public class SpecificationBuilder {
    public static <T> Specification<T> build(String search, String status, String categoryId, String districtId) {
        return build(search, status, categoryId, districtId, null);
    }

    public static <T> Specification<T> build(String search, String status, String categoryId, String districtId, String authorId) {
        return build(search, status, categoryId, districtId, authorId, null);
    }

    public static <T> Specification<T> build(String search, String status, String categoryId, String districtId, String authorId, String tag) {
        return build(search, status, categoryId, districtId, authorId, tag, null, null, null, null);
    }

    public static <T> Specification<T> build(String search, String status, String categoryId, String districtId, String authorId, String tag,
                                             java.time.LocalDateTime startDate, java.time.LocalDateTime endDate, Integer year, Integer month) {
        return (Root<T> root, CriteriaQuery<?> query, CriteriaBuilder cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null && !status.isEmpty()) {
                try {
                    root.getModel().getAttribute("status");
                    predicates.add(cb.equal(root.get("status"), status));
                } catch (IllegalArgumentException e) {
                    try {
                        root.getModel().getAttribute("isActive");
                        if ("active".equalsIgnoreCase(status)) {
                            predicates.add(cb.equal(root.get("isActive"), true));
                        } else if ("inactive".equalsIgnoreCase(status)) {
                            predicates.add(cb.equal(root.get("isActive"), false));
                        }
                    } catch (IllegalArgumentException ex) {
                        // ignore if neither status nor isActive is present
                    }
                }
            } else {
                try {
                    root.getModel().getAttribute("status");
                    predicates.add(cb.notEqual(root.get("status"), "deleted"));
                } catch (IllegalArgumentException e) {
                    // Entity doesn't have a status field, ignore
                }
            }

            if (tag != null && !tag.isEmpty()) {
                try {
                    root.get("metaKeywords");
                    predicates.add(cb.like(cb.lower(root.get("metaKeywords")), "%" + tag.toLowerCase() + "%"));
                } catch (Exception e) {
                    // Entity doesn't have metaKeywords, ignore
                }
            }

            if (startDate != null) {
                try {
                    root.get("publishedAt");
                    predicates.add(cb.greaterThanOrEqualTo(root.get("publishedAt"), startDate));
                } catch (Exception e) {
                    // ignore
                }
            }

            if (endDate != null) {
                try {
                    root.get("publishedAt");
                    predicates.add(cb.lessThanOrEqualTo(root.get("publishedAt"), endDate));
                } catch (Exception e) {
                    // ignore
                }
            }

            if (year != null) {
                try {
                    root.get("publishedAt");
                    predicates.add(cb.equal(cb.function("YEAR", Integer.class, root.get("publishedAt")), year));
                } catch (Exception e) {
                    // ignore
                }
            }

            if (month != null) {
                try {
                    root.get("publishedAt");
                    predicates.add(cb.equal(cb.function("MONTH", Integer.class, root.get("publishedAt")), month));
                } catch (Exception e) {
                    // ignore
                }
            }

            if (categoryId != null && !categoryId.isEmpty()) {
                try {
                    root.get("categoryId");
                    predicates.add(cb.equal(root.get("categoryId"), Long.parseLong(categoryId)));
                } catch (Exception e) {
                    // Entity doesn't have a categoryId field, ignore
                }
            }

            if (districtId != null && !districtId.isEmpty()) {
                try {
                    root.get("districtId");
                    predicates.add(cb.equal(root.get("districtId"), Long.parseLong(districtId)));
                } catch (Exception e) {
                    // Entity doesn't have a districtId field, ignore
                }
            }

            if (authorId != null && !authorId.isEmpty()) {
                try {
                    root.get("authorName");
                    predicates.add(cb.equal(root.get("authorName"), authorId));
                } catch (Exception e) {
                    // Entity doesn't have an authorName field, ignore
                }
            }



            if (search != null && !search.isEmpty()) {
                String searchPattern = "%" + search.toLowerCase() + "%";
                List<Predicate> searchPredicates = new ArrayList<>();
                
                List<String> textFields = List.of(
                    "title", "titleTa", "titleEn", "name", "nameTa", "slug",
                    "description", "descriptionTa", "content", "contentTa", "contentEn", 
                    "shortDescription", "shortDescTa", "shortDescEn", "deceasedName", 
                    "businessName", "companyName", "subject", "message", "question", "questionTa"
                );
                
                for (String field : textFields) {
                    try {
                        root.getModel().getAttribute(field);
                        searchPredicates.add(cb.like(cb.lower(root.get(field)), searchPattern));
                    } catch (IllegalArgumentException e) {
                        // Field doesn't exist on this entity metamodel, ignore
                    }
                }
                
                if (!searchPredicates.isEmpty()) {
                    predicates.add(cb.or(searchPredicates.toArray(new Predicate[0])));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
