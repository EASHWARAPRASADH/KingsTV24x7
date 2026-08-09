package com.kingstv.repository;

import com.kingstv.models.ClassifiedListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassifiedRepository extends JpaRepository<ClassifiedListing, Long>, JpaSpecificationExecutor<ClassifiedListing> {
    List<ClassifiedListing> findByStatus(String status);
}
