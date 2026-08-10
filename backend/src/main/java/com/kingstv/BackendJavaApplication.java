package com.kingstv;

import com.kingstv.repository.ClassifiedCategoryRepository;
import com.kingstv.models.ClassifiedCategory;
import com.kingstv.repository.ClassifiedSubcategoryRepository;
import com.kingstv.models.ClassifiedSubcategory;

import com.kingstv.repository.JobCategoryRepository;
import com.kingstv.models.JobCategory;
import com.kingstv.repository.CompanyRepository;
import com.kingstv.models.Company;

import com.kingstv.repository.ObituaryFrameTemplateRepository;
import com.kingstv.models.ObituaryFrameTemplate;

import com.kingstv.models.User;
import com.kingstv.models.Role;
import com.kingstv.repository.UserRepository;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;

@SpringBootApplication(exclude = {
    org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration.class
})
@EnableCaching
@EnableScheduling
public class BackendJavaApplication implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private com.kingstv.repository.WishCategoryRepository wishCategoryRepository;

    @Autowired
    private com.kingstv.repository.WishFrameTemplateRepository wishFrameTemplateRepository;

    @Autowired
    private ObituaryFrameTemplateRepository obituaryFrameTemplateRepository;

    @Autowired
    private JobCategoryRepository jobCategoryRepository;

    @Autowired
    private ClassifiedCategoryRepository classifiedCategoryRepository;

    @Autowired
    private ClassifiedSubcategoryRepository classifiedSubcategoryRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private com.kingstv.repository.CandidateRepository candidateRepository;

    @Autowired
    private com.kingstv.services.ClassifiedService classifiedService;

    public static void main(String[] args) {
        System.setOut(new com.kingstv.services.MaskingPrintStream(System.out, System.out));
        System.setErr(new com.kingstv.services.MaskingPrintStream(System.err, System.err));
        SpringApplication.run(BackendJavaApplication.class, args);
    }

    @Autowired
    private com.kingstv.services.LoginAttemptService loginAttemptService;

    @Override
    public void run(String... args) throws Exception {
        updatePasswordIfPresent("admin@king24x7.com", "admin123", Role.SUPER_ADMIN, "Super Admin");
        updatePasswordIfPresent("vendor@king24x7.com", "vendor123", Role.INSTITUTION_LOGIN, "Government Vendor");
        updatePasswordIfPresent("editor@king24x7.com", "editor123", Role.CHIEF_EDITOR, "Chief Editor");
        updatePasswordIfPresent("district@king24x7.com", "district123", Role.DISTRICT_ADMIN, "District Admin Coimbatore");
        updatePasswordIfPresent("reporter@king24x7.com", "reporter123", Role.MOBILE_JOURNALIST, "Mobile Journalist");
        updatePasswordIfPresent("user@king24x7.com", "user123", Role.READER, "Public Reader");

        seedCategories();
        seedFrameTemplates();
        seedObituaryFrameTemplates();
        seedJobCategoriesAndCompanies();
        seedClassifiedCategoriesAndSubcategories();
        seedDummyClassifieds();
    }

    private void seedCategories() {
        if (wishCategoryRepository.count() == 0) {
            saveCategory("birthday", "Birthday", "பிறந்தநாள்", "fa-birthday-cake", "bg-pink-50 text-pink-500");
            saveCategory("anniversary", "Anniversary", "திருமண ஆண்டு", "fa-heart", "bg-red-50 text-red-500");
            saveCategory("wedding", "Wedding", "திருமணம்", "fa-ring", "bg-rose-50 text-rose-500");
            saveCategory("achievement", "Achievement", "சாதனை", "fa-trophy", "bg-yellow-50 text-yellow-500");
            saveCategory("graduation", "Graduation", "படிப்பு சாதனை", "fa-graduation-cap", "bg-indigo-50 text-indigo-500");
            saveCategory("festival", "Festival", "விழா வாழ்த்து", "fa-star", "bg-orange-50 text-orange-500");
            saveCategory("house-warming", "House Warming", "வீடு புகுவிழா", "fa-home", "bg-teal-50 text-teal-500");
            saveCategory("retirement", "Retirement", "ஓய்வு பெறுதல்", "fa-user-tie", "bg-blue-50 text-blue-500");
            saveCategory("newborn", "Newborn", "புதிய குழந்தை", "fa-baby", "bg-cyan-50 text-cyan-500");
            saveCategory("general", "General", "பொது வாழ்த்து", "fa-smile", "bg-gray-50 text-gray-500");
            System.out.println("Default wish categories seeded.");
        }
    }

    private void saveCategory(String slug, String name, String nameTa, String icon, String color) {
        com.kingstv.models.WishCategory cat = new com.kingstv.models.WishCategory();
        cat.setSlug(slug);
        cat.setName(name);
        cat.setNameTa(nameTa);
        cat.setIcon(icon);
        cat.setColor(color);
        wishCategoryRepository.save(cat);
    }

    private void seedFrameTemplates() {
        if (wishFrameTemplateRepository.count() == 0) {
            saveTemplate("birthday-frame", "Birthday Frame", "#ec4899", "#ec4899");
            saveTemplate("anniversary-frame", "Anniversary Frame", "#ef4444", "#ef4444");
            saveTemplate("graduation-frame", "Graduation Frame", "#6366f1", "#6366f1");
            saveTemplate("achievement-frame", "Achievement Frame", "#eab308", "#eab308");
            System.out.println("Default wish frame templates seeded.");
        }
    }

    private void saveTemplate(String slug, String name, String borderColor, String textColor) {
        com.kingstv.models.WishFrameTemplate t = new com.kingstv.models.WishFrameTemplate();
        t.setSlug(slug);
        t.setName(name);
        t.setBorderColor(borderColor);
        t.setTextColor(textColor);
        wishFrameTemplateRepository.save(t);
    }

    private void updatePasswordIfPresent(String email, String rawPassword, String defaultRole, String fullName) {
        String cleanEmail = email.toLowerCase().trim();
        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        User user = userOpt.orElseGet(() -> {
            User u = new User();
            u.setEmail(cleanEmail);
            u.setFullName(fullName);
            u.setRole(defaultRole);
            return u;
        });

        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setProvider("LOCAL");
        user.setIsActive(true);
        user.setIsVerified(true);
        userRepository.save(user);

        if (loginAttemptService != null) {
            loginAttemptService.loginSucceeded(cleanEmail);
        }
        System.out.println("Seeded/Updated credentials and reset lockouts for: " + cleanEmail);
    }


    private void seedObituaryFrameTemplates() {
        if (obituaryFrameTemplateRepository.count() == 0) {
            saveObitTemplate("floral", "Floral Frame");
            saveObitTemplate("golden", "Golden Frame");
            saveObitTemplate("traditional", "Traditional Frame");
            saveObitTemplate("white", "White Memorial Frame");
            saveObitTemplate("premium", "Premium Frame");
            System.out.println("Default obituary frame templates seeded.");
        }
    }

    private void saveObitTemplate(String category, String name) {
        ObituaryFrameTemplate t = new ObituaryFrameTemplate();
        t.setCategory(category);
        t.setName(name);
        t.setIsActive(true);
        t.setDisplayOrder(0);
        obituaryFrameTemplateRepository.save(t);
    }


    private void seedJobCategoriesAndCompanies() {
        if (jobCategoryRepository.count() == 0) {
            saveJobCategory("IT & Software", "it-software", "fa-laptop-code", 2845, 120);
            saveJobCategory("Sales & Marketing", "sales-marketing", "fa-bullhorn", 4126, 180);
            saveJobCategory("Education", "education", "fa-book-reader", 3245, 95);
            saveJobCategory("Healthcare", "healthcare", "fa-heartbeat", 2087, 60);
            saveJobCategory("Engineering", "engineering", "fa-cog", 3789, 140);
            saveJobCategory("Government", "government", "fa-landmark", 1678, 20);
            saveJobCategory("Banking & Finance", "banking-finance", "fa-money-check-alt", 2345, 75);
            saveJobCategory("Others", "others", "fa-th-large", 5678, 300);
            System.out.println("Default job categories seeded.");
        }

        saveCompany("Tata Consultancy Services", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100", "Coimbatore, Tamil Nadu", "it", "hr@tcs.com", "+91 9876543210");
        saveCompany("Zoho Corporation", "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100", "Chennai, Tamil Nadu", "it", "careers@zoho.com", "+91 9876543211");
        saveCompany("HDFC Bank", "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=100", "Salem, Tamil Nadu", "finance", "jobs@hdfc.com", "+91 9876543212");
        saveCompany("Apollo Hospitals", "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=100", "Trichy, Tamil Nadu", "healthcare", "hr@apollo.com", "+91 9876543213");
        System.out.println("Default companies seeded/updated.");

        saveCandidate("Rahul Kumar", "rahul@example.com", "+91 9876543220", "React, Node.js, JavaScript", "Chennai, Tamil Nadu");
        saveCandidate("Priya Sharma", "priya@example.com", "+91 9876543221", "Java, Spring Boot, MySQL", "Coimbatore, Tamil Nadu");
        saveCandidate("Anil Patel", "anil@example.com", "+91 9876543222", "HTML, CSS, UI/UX Design", "Madurai, Tamil Nadu");
        System.out.println("Default candidates seeded/updated.");
    }

    private void saveJobCategory(String name, String slug, String icon, int jobs, int companies) {
        JobCategory c = new JobCategory();
        c.setName(name);
        c.setSlug(slug);
        c.setIcon(icon);
        c.setActiveJobCount(jobs);
        c.setCompaniesHiringCount(companies);
        jobCategoryRepository.save(c);
    }

    private void saveCompany(String name, String logo, String address, String industry, String email, String phone) {
        Optional<Company> opt = companyRepository.findByCompanyName(name);
        Company c = opt.orElseGet(() -> {
            Company comp = new Company();
            comp.setCompanyName(name);
            comp.setUserId(1L);
            return comp;
        });
        c.setLogo(logo);
        c.setAddress(address);
        c.setIndustry(industry);
        c.setEmail(email);
        c.setPhone(phone);
        c.setVerified(true);
        c.setStatus("active");
        companyRepository.save(c);
    }

    private void saveCandidate(String name, String email, String phone, String skills, String location) {
        Optional<com.kingstv.models.Candidate> opt = candidateRepository.findByEmail(email);
        com.kingstv.models.Candidate c = opt.orElseGet(() -> {
            com.kingstv.models.Candidate cand = new com.kingstv.models.Candidate();
            cand.setEmail(email);
            return cand;
        });
        c.setName(name);
        c.setPhone(phone);
        c.setSkills(skills);
        c.setLocation(location);
        c.setStatus("active");
        candidateRepository.save(c);
    }


    private void seedClassifiedCategoriesAndSubcategories() {
        if (classifiedCategoryRepository.count() == 0) {
            ClassifiedCategory v = saveClassifiedCategory("Vehicles", "vehicles", "fa-car", 12458);
            saveClassifiedSubcat(v, "Cars", "cars");
            saveClassifiedSubcat(v, "Bikes", "bikes");

            ClassifiedCategory p = saveClassifiedCategory("Property", "property", "fa-home", 8923);
            saveClassifiedSubcat(p, "Apartments", "apartments");
            saveClassifiedSubcat(p, "Houses", "houses");

            ClassifiedCategory m = saveClassifiedCategory("Mobiles & Tablets", "mobiles-tablets", "fa-mobile-alt", 15267);
            saveClassifiedSubcat(m, "Mobiles", "mobiles");
            saveClassifiedSubcat(m, "Tablets", "tablets");

            ClassifiedCategory e = saveClassifiedCategory("Electronics", "electronics", "fa-laptop", 6482);
            saveClassifiedSubcat(e, "Laptops", "laptops");
            saveClassifiedSubcat(e, "TVs", "tvs");

            ClassifiedCategory h = saveClassifiedCategory("Home & Furniture", "home-furniture", "fa-couch", 7351);
            saveClassifiedSubcat(h, "Furniture", "furniture");
            saveClassifiedSubcat(h, "Home Appliances", "appliances");

            ClassifiedCategory f = saveClassifiedCategory("Fashion & Lifestyle", "fashion-lifestyle", "fa-tshirt", 5632);
            saveClassifiedSubcat(f, "Clothing", "clothing");

            ClassifiedCategory s = saveClassifiedCategory("Services", "services", "fa-tools", 9845);
            saveClassifiedSubcat(s, "Electrician", "electrician");

            ClassifiedCategory j = saveClassifiedCategory("Jobs", "jobs", "fa-briefcase", 2341);
            ClassifiedCategory pets = saveClassifiedCategory("Pets & Animals", "pets-animals", "fa-paw", 1254);
            ClassifiedCategory b = saveClassifiedCategory("Books & Education", "books-education", "fa-book", 3278);
            ClassifiedCategory ag = saveClassifiedCategory("Agriculture", "agriculture", "fa-tractor", 1987);
            ClassifiedCategory bi = saveClassifiedCategory("Business & Industrial", "business-industrial", "fa-industry", 2156);
            ClassifiedCategory hs = saveClassifiedCategory("Hobbies & Sports", "hobbies-sports", "fa-running", 2315);

            System.out.println("Default classified categories seeded.");
        }
    }

    private ClassifiedCategory saveClassifiedCategory(String name, String slug, String icon, int count) {
        ClassifiedCategory c = new ClassifiedCategory();
        c.setName(name);
        c.setSlug(slug);
        c.setIconClass(icon);
        c.setActiveAdCount(count);
        return classifiedCategoryRepository.save(c);
    }

    private void saveClassifiedSubcat(ClassifiedCategory cat, String name, String slug) {
        ClassifiedSubcategory s = new ClassifiedSubcategory();
        s.setCategory(cat);
        s.setName(name);
        s.setSlug(slug);
        classifiedSubcategoryRepository.save(s);
    }

    private void seedDummyClassifieds() {
        if (classifiedService.getClassifieds(null, null, null, null, null, null, null, null, "newest", org.springframework.data.domain.PageRequest.of(0, 1)).getTotalElements() == 0) {
            
            // Dummy Ad 1
            com.kingstv.models.ClassifiedListing ad1 = new com.kingstv.models.ClassifiedListing();
            ad1.setTitle("iPhone 13 Pro - 256GB Excellent Condition");
            ad1.setDescription("Used for 1 year, no scratches, battery health 89%. Comes with box and charger.");
            ad1.setPrice(45000.0);
            ad1.setContactPhone("9876543210");
            ad1.setLocation("Chennai, Tamil Nadu");
            ad1.setCategoryId(3L); // Mobiles
            ad1.setSubcategoryId(5L); // Mobiles
            ad1.setStatus("active");
            ad1.setConditionId(3L);
            classifiedService.createClassified(ad1, java.util.Arrays.asList("https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500"));

            // Dummy Ad 2
            com.kingstv.models.ClassifiedListing ad2 = new com.kingstv.models.ClassifiedListing();
            ad2.setTitle("Sony Bravia 55 inch 4K Smart TV");
            ad2.setDescription("Like new, 6 months old. Moving out of city, need to sell urgently.");
            ad2.setPrice(32000.0);
            ad2.setContactPhone("9876543211");
            ad2.setLocation("Coimbatore, Tamil Nadu");
            ad2.setCategoryId(4L); // Electronics
            ad2.setSubcategoryId(8L); // TVs
            ad2.setStatus("active");
            ad2.setConditionId(2L);
            classifiedService.createClassified(ad2, java.util.Arrays.asList("https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500"));

            // Dummy Ad 3
            com.kingstv.models.ClassifiedListing ad3 = new com.kingstv.models.ClassifiedListing();
            ad3.setTitle("Honda City V MT Petrol - 2018");
            ad3.setDescription("Single owner, showroom track, fully insured. Price slightly negotiable.");
            ad3.setPrice(750000.0);
            ad3.setNegotiable(true);
            ad3.setContactPhone("9876543212");
            ad3.setLocation("Madurai, Tamil Nadu");
            ad3.setCategoryId(1L); // Vehicles
            ad3.setSubcategoryId(1L); // Cars
            ad3.setStatus("active");
            ad3.setConditionId(3L);
            classifiedService.createClassified(ad3, java.util.Arrays.asList("https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=500", "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=500"));

            System.out.println("Default classifieds dummy dataset seeded.");
        }
    }
}

