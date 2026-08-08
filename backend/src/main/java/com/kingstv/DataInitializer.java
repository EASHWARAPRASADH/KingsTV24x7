package com.kingstv;

import com.kingstv.models.*;
import com.kingstv.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Component
public class DataInitializer {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private SubCategoryRepository subCategoryRepository;

    @Autowired
    private DistrictRepository districtRepository;

    @Autowired
    private ArticleRepository articleRepository;

    @Autowired
    private VideoContentRepository videoContentRepository;

    @Autowired
    private ObituaryRepository obituaryRepository;

    @Autowired
    private ClassifiedRepository classifiedRepository;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private DirectoryRepository directoryRepository;

    @Autowired
    private WishRepository wishRepository;

    @Autowired
    private WishCategoryRepository wishCategoryRepository;

    @Autowired
    private WebStoryRepository webStoryRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    @Autowired
    private ProfanityWordRepository profanityWordRepository;

    @Autowired
    private HomeLayoutConfigRepository homeLayoutConfigRepository;

    @Autowired
    private NavigationMenuRepository navigationMenuRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    private SitemapConfigRepository sitemapConfigRepository;


    @Autowired
    private NfcCardRepository nfcCardRepository;

    @Autowired
    private NfcTapHistoryRepository nfcTapHistoryRepository;

    @Autowired
    private BreakingNewsRepository breakingNewsRepository;

    @Autowired
    private AdvertisementRepository adRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void initDatabase() {
        // Ensure database tables use UTF-8 character encoding (utf8mb4) - skipped on startup to prevent TiDB DDL latency
        /*
        String[] tables = {
            "articles", "categories", "comments", "video_contents", "web_stories", 
            "local_business_directory", "jobs", "classified_listings", "local_obituaries", 
            "wishes", "districts", "breaking_news"
        };
        for (String table : tables) {
            try {
                jdbcTemplate.execute("ALTER TABLE `" + table + "` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
            } catch (Exception e) {
                System.out.println("Could not alter table " + table + " charset: " + e.getMessage());
            }
        }
        */
        // Synchronize standard web categories & subcategories matching website navigation & header
        syncStandardWebCategories();

        // Ensure all 38 Tamil Nadu districts exist (always runs, even on servers with existing data)
        String[][] allDistricts = {
            {"Chennai", "சென்னை"}, {"Coimbatore", "கோயம்புத்தூர்"}, {"Madurai", "மதுரை"},
            {"Trichy", "திருச்சிராப்பள்ளி"}, {"Salem", "சேலம்"}, {"Tirunelveli", "திருநெல்வேலி"},
            {"Vellore", "வேலூர்"}, {"Erode", "ஈரோடு"}, {"Thoothukudi", "தூத்துக்குடி"},
            {"Tiruppur", "திருப்பூர்"}, {"Tiruvallur", "திருவள்ளூர்"}, {"Kanchipuram", "காஞ்சிபுரம்"},
            {"Chengalpattu", "செங்கல்பட்டு"}, {"Villupuram", "விழுப்புரம்"}, {"Cuddalore", "கடலூர்"},
            {"Nagapattinam", "நாகப்பட்டினம்"}, {"Thanjavur", "தஞ்சாவூர்"}, {"Pudukkottai", "புதுக்கோட்டை"},
            {"Sivaganga", "சிவகங்கை"}, {"Ramanathapuram", "ராமநாதபுரம்"}, {"Virudhunagar", "விருதுநகர்"},
            {"Namakkal", "நாமக்கல்"}, {"Dharmapuri", "தருமபுரி"}, {"Krishnagiri", "கிருஷ்ணகிரி"},
            {"Tiruvannamalai", "திருவண்ணாமலை"}, {"Ranipet", "ராணிப்பேட்டை"}, {"Tirupathur", "திருப்பத்தூர்"},
            {"Kallakurichi", "கள்ளக்குறிச்சி"}, {"Ariyalur", "அரியலூர்"}, {"Perambalur", "பெரம்பலூர்"},
            {"Karur", "கரூர்"}, {"Dindigul", "திண்டுக்கல்"}, {"Nilgiris", "நீலகிரி"},
            {"Tiruvarur", "திருவாரூர்"}, {"Mayiladuthurai", "மயிலாடுதுறை"}, {"Theni", "தேனி"},
            {"Tenkasi", "தென்காசி"}, {"Kanyakumari", "கன்னியாகுமரி"}
        };
        for (String[] dist : allDistricts) {
            try {
                boolean exists = districtRepository.findAll().stream()
                    .anyMatch(d -> dist[0].equalsIgnoreCase(d.getNameEn()));
                if (!exists) {
                    District d = new District();
                    d.setNameEn(dist[0]);
                    d.setNameTa(dist[1]);
                    districtRepository.save(d);
                }
            } catch (Exception e) {
                System.out.println("Could not seed district " + dist[0] + ": " + e.getMessage());
            }
        }

        seedAdvertisements();

        // Ensure default sitemaps, home layout configs, and Chief Editor permissions are initialized/updated on every boot
        seedSitemapConfigs();
        seedHomeLayoutConfigs();
        updateChiefEditorPermissions();
        seedNavigationMenus();
        // 12. Seed Roles and Permissions
        System.out.println("Seeding Roles and Permissions...");
        
        // Define all permissions
        List<Permission> permissionsList = Arrays.asList(
            new Permission(Permission.USER_CREATE, "Create user accounts", "User Management"),
            new Permission(Permission.USER_READ, "View user accounts", "User Management"),
            new Permission(Permission.USER_UPDATE, "Update user accounts", "User Management"),
            new Permission(Permission.USER_DELETE, "Delete user accounts", "User Management"),
            new Permission(Permission.USER_SUSPEND, "Suspend user accounts", "User Management"),
            new Permission(Permission.ARTICLE_CREATE, "Create articles", "Content"),
            new Permission(Permission.ARTICLE_READ, "Read articles", "Content"),
            new Permission(Permission.ARTICLE_UPDATE, "Update articles", "Content"),
            new Permission(Permission.ARTICLE_DELETE, "Delete articles", "Content"),
            new Permission(Permission.ARTICLE_PUBLISH, "Publish articles", "Content"),
            new Permission(Permission.ARTICLE_REVIEW, "Review articles", "Content"),
            new Permission(Permission.AUDIT_VIEW, "View system audit logs", "System"),
            new Permission(Permission.CONFIG_READ, "Read system settings", "System"),
            new Permission(Permission.CONFIG_WRITE, "Write system settings", "System"),
            new Permission(Permission.PROFANITY_MANAGE, "Manage profanity dictionary", "Profanity"),
            new Permission(Permission.PROFANITY_VIEW_REPORTS, "View profanity reports", "Profanity"),
            new Permission(Permission.HOME_LAYOUT_MANAGE, "Manage home screen layout", "Layout"),
            new Permission(Permission.HOME_LAYOUT_DELEGATED, "Manage delegated home screen layout", "Layout"),
            new Permission(Permission.PUSH_NOTIFICATION_SEND, "Send push notifications", "Marketing"),
            new Permission(Permission.SEO_CONFIG_MANAGE, "Manage SEO settings", "SEO"),
            new Permission(Permission.TAXONOMY_MANAGE, "Manage categories and districts", "Taxonomy"),
            new Permission(Permission.SURVEY_MANAGE, "Manage surveys and polls", "Survey"),
            new Permission(Permission.WEBSTORE_MANAGE, "Manage webstore products", "Webstore"),
            new Permission(Permission.FONT_MANAGE, "Manage system typography", "System"),
            new Permission(Permission.SITEMAP_MANAGE, "Manage sitemaps", "SEO"),
            new Permission(Permission.MOBILE_APP_LAYOUT_MANAGE, "Manage mobile app layouts", "Layout"),
            new Permission(Permission.JOURNALIST_CREATE, "Create mobile journalists", "District Admin"),
            new Permission(Permission.JOURNALIST_UPDATE, "Update mobile journalists", "District Admin"),
            new Permission(Permission.JOURNALIST_SUSPEND, "Suspend mobile journalists", "District Admin"),
            new Permission(Permission.CONTENT_REVIEW, "Review editorial content", "Chief Editor"),
            new Permission(Permission.UGC_REVIEW, "Review user generated content", "Chief Editor"),
            new Permission(Permission.ANALYTICS_VIEW, "View dashboard reports", "Analytics"),
            new Permission(Permission.AI_REWRITER_USE, "Use AI assistant rewriter", "Content")
        );
        
        Map<String, Permission> savedPerms = new HashMap<>();
        for (Permission p : permissionsList) {
            Optional<Permission> existing = permissionRepository.findByName(p.getName());
            savedPerms.put(p.getName(), existing.orElseGet(() -> permissionRepository.save(p)));
        }

        // Create Roles
        Role superAdmin = roleRepository.findByName(Role.SUPER_ADMIN).orElseGet(() -> roleRepository.save(new Role(Role.SUPER_ADMIN, "Super Administrator with full bypass access")));
        Role chiefEditor = roleRepository.findByName(Role.CHIEF_EDITOR).orElseGet(() -> roleRepository.save(new Role(Role.CHIEF_EDITOR, "Chief Editor managing content publish flows")));
        Role districtAdmin = roleRepository.findByName(Role.DISTRICT_ADMIN).orElseGet(() -> roleRepository.save(new Role(Role.DISTRICT_ADMIN, "District Admin managing local journalists")));
        Role mobileJournalist = roleRepository.findByName(Role.MOBILE_JOURNALIST).orElseGet(() -> roleRepository.save(new Role(Role.MOBILE_JOURNALIST, "Field Mobile Journalist submitting posts")));
        Role institutionLogin = roleRepository.findByName(Role.INSTITUTION_LOGIN).orElseGet(() -> roleRepository.save(new Role(Role.INSTITUTION_LOGIN, "Institutional publisher account")));
        Role reader = roleRepository.findByName(Role.READER).orElseGet(() -> roleRepository.save(new Role(Role.READER, "Standard public/reader account")));

        // Assign Permissions to Chief Editor
        chiefEditor.getPermissions().addAll(Arrays.asList(
            savedPerms.get(Permission.USER_CREATE), savedPerms.get(Permission.USER_READ), savedPerms.get(Permission.USER_UPDATE),
            savedPerms.get(Permission.ARTICLE_CREATE), savedPerms.get(Permission.ARTICLE_READ), savedPerms.get(Permission.ARTICLE_UPDATE),
            savedPerms.get(Permission.ARTICLE_REVIEW), savedPerms.get(Permission.ARTICLE_PUBLISH), savedPerms.get(Permission.CONTENT_REVIEW),
            savedPerms.get(Permission.UGC_REVIEW), savedPerms.get(Permission.PROFANITY_VIEW_REPORTS), savedPerms.get(Permission.HOME_LAYOUT_DELEGATED),
            savedPerms.get(Permission.HOME_LAYOUT_MANAGE), savedPerms.get(Permission.TAXONOMY_MANAGE),
            savedPerms.get(Permission.ANALYTICS_VIEW), savedPerms.get(Permission.AI_REWRITER_USE), savedPerms.get(Permission.PUSH_NOTIFICATION_SEND)
        ));
        roleRepository.save(chiefEditor);

        // Assign Permissions to District Admin
        districtAdmin.getPermissions().addAll(Arrays.asList(
            savedPerms.get(Permission.JOURNALIST_CREATE), savedPerms.get(Permission.JOURNALIST_UPDATE), savedPerms.get(Permission.JOURNALIST_SUSPEND),
            savedPerms.get(Permission.USER_READ), savedPerms.get(Permission.ARTICLE_READ), savedPerms.get(Permission.ANALYTICS_VIEW)
        ));
        roleRepository.save(districtAdmin);

        // Assign Permissions to Mobile Journalist
        mobileJournalist.getPermissions().addAll(Arrays.asList(
            savedPerms.get(Permission.ARTICLE_CREATE), savedPerms.get(Permission.ARTICLE_READ), savedPerms.get(Permission.ARTICLE_UPDATE),
            savedPerms.get(Permission.AI_REWRITER_USE)
        ));
        roleRepository.save(mobileJournalist);

        // Assign Permissions to Institution Login
        institutionLogin.getPermissions().addAll(Arrays.asList(
            savedPerms.get(Permission.ARTICLE_CREATE), savedPerms.get(Permission.ARTICLE_READ), savedPerms.get(Permission.ARTICLE_UPDATE),
            savedPerms.get(Permission.AI_REWRITER_USE)
        ));
        roleRepository.save(institutionLogin);

        // Assign Permissions to Reader
        reader.getPermissions().addAll(Arrays.asList(
            savedPerms.get(Permission.ARTICLE_READ)
        ));
        roleRepository.save(reader);

        seedBreakingNews();
        seedFiftyArticlesPerCategory();

        if (categoryRepository.count() > 0 && articleRepository.count() >= 300) {
            System.out.println("Database already has data. Skipping database seeding to preserve dynamic data.");
            return;
        }
        System.out.println("Starting Database Seeding...");

        // Clean up legacy records to force correct UTF-8 re-seeding
        try {
            jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 0;");
            
            // Truncate dependent child tables to avoid foreign key violations
            jdbcTemplate.execute("TRUNCATE TABLE wish_reactions;");
            jdbcTemplate.execute("TRUNCATE TABLE wish_comments;");
            jdbcTemplate.execute("TRUNCATE TABLE wish_comment_likes;");
            jdbcTemplate.execute("TRUNCATE TABLE wish_saved;");
            jdbcTemplate.execute("TRUNCATE TABLE wish_shares;");
            jdbcTemplate.execute("TRUNCATE TABLE wish_views;");
            jdbcTemplate.execute("TRUNCATE TABLE wish_reports;");
            jdbcTemplate.execute("TRUNCATE TABLE wish_gallery;");
            jdbcTemplate.execute("TRUNCATE TABLE wish_notifications;");
            
            jdbcTemplate.execute("TRUNCATE TABLE job_applications;");
            jdbcTemplate.execute("TRUNCATE TABLE job_views;");
            jdbcTemplate.execute("TRUNCATE TABLE job_shares;");
            jdbcTemplate.execute("TRUNCATE TABLE job_reports;");
            jdbcTemplate.execute("TRUNCATE TABLE saved_jobs;");
            
            jdbcTemplate.execute("TRUNCATE TABLE classified_images;");
            jdbcTemplate.execute("TRUNCATE TABLE classified_reviews;");
            jdbcTemplate.execute("TRUNCATE TABLE classified_seller_profiles;");
            jdbcTemplate.execute("TRUNCATE TABLE classified_views;");
            jdbcTemplate.execute("TRUNCATE TABLE classified_reports;");
            jdbcTemplate.execute("TRUNCATE TABLE classified_shares;");
            jdbcTemplate.execute("TRUNCATE TABLE classified_favourites;");
            
            jdbcTemplate.execute("TRUNCATE TABLE obituary_views;");
            jdbcTemplate.execute("TRUNCATE TABLE obituary_tributes;");
            jdbcTemplate.execute("TRUNCATE TABLE obituary_reports;");
            jdbcTemplate.execute("TRUNCATE TABLE obituary_notifications;");
            jdbcTemplate.execute("TRUNCATE TABLE obituary_guestbook_likes;");
            jdbcTemplate.execute("TRUNCATE TABLE obituary_guestbook;");
            jdbcTemplate.execute("TRUNCATE TABLE obituary_gallery;");
            
            jdbcTemplate.execute("TRUNCATE TABLE business_favorites;");
            jdbcTemplate.execute("TRUNCATE TABLE business_gallery;");
            jdbcTemplate.execute("TRUNCATE TABLE business_reviews;");

            // Truncate primary tables
            jdbcTemplate.execute("TRUNCATE TABLE nfc_tap_history;");
            jdbcTemplate.execute("TRUNCATE TABLE nfc_cards;");
            jdbcTemplate.execute("TRUNCATE TABLE web_stories;");
            jdbcTemplate.execute("TRUNCATE TABLE local_business_directory;");
            jdbcTemplate.execute("TRUNCATE TABLE jobs;");
            jdbcTemplate.execute("TRUNCATE TABLE classified_listings;");
            jdbcTemplate.execute("TRUNCATE TABLE local_obituaries;");
            jdbcTemplate.execute("TRUNCATE TABLE video_contents;");
            jdbcTemplate.execute("TRUNCATE TABLE articles;");
            jdbcTemplate.execute("TRUNCATE TABLE districts;");
            jdbcTemplate.execute("TRUNCATE TABLE sub_categories;");
            jdbcTemplate.execute("TRUNCATE TABLE categories;");
            

            
            System.out.println("Old seeded records cleaned successfully.");
        } catch(Exception e) {
            System.err.println("Clean up failed: " + e.getMessage());
        } finally {
            try {
                jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 1;");
            } catch(Exception ex) {
                // ignore
            }
        }

        // 1. Seed Categories
        System.out.println("Seeding Categories...");
        Category politicsCat = seedCategory("Politics", "அரசியல்", "politics", 1, "fas fa-newspaper");
        Category businessCat = seedCategory("Business", "வணிகம்", "business", 2, "fas fa-briefcase");
        Category sportsCat = seedCategory("Sports", "விளையாட்டு", "sports", 3, "fas fa-trophy");
        Category cinemaCat = seedCategory("Cinema", "சினிமா", "cinema", 4, "fas fa-film");
        Category techCat = seedCategory("Technology", "தொழில்நுட்பம்", "tech", 5, "fas fa-laptop");
        Category internationalCat = seedCategory("International", "சர்வதேசம்", "international", 6, "fas fa-globe");

        // 2. Seed SubCategories
        System.out.println("Seeding SubCategories...");
        Long polId = politicsCat.getId();
        Long busId = businessCat.getId();
        Long spoId = sportsCat.getId();
        Long cinId = cinemaCat.getId();
        Long tecId = techCat.getId();

        seedSubCategory(polId, "State", "மாநிலம்", "state", 1);
        seedSubCategory(polId, "National", "தேசியம்", "national", 2);
        seedSubCategory(polId, "International", "சர்வதேசம்", "international", 3);
        seedSubCategory(polId, "Governance", "அரசு கொள்கைகள்", "governance", 4);

        seedSubCategory(busId, "Markets", "சந்தை", "markets", 1);
        seedSubCategory(busId, "Companies", "நிறுவனங்கள்", "companies", 2);
        seedSubCategory(busId, "Investment", "முதலீடு", "investment", 3);
        seedSubCategory(busId, "Startups", "ஸ்டார்ட்அப்", "startups", 4);

        seedSubCategory(spoId, "Cricket", "கிரிக்கெட்", "cricket", 1);
        seedSubCategory(spoId, "Football", "கால்பந்து", "football", 2);
        seedSubCategory(spoId, "Tennis", "டென்னிஸ்", "tennis", 3);
        seedSubCategory(spoId, "Local Sports", "உள்ளூர்", "local-sports", 4);

        seedSubCategory(cinId, "Kollywood", "கோலிவுட்", "kollywood", 1);
        seedSubCategory(cinId, "Bollywood", "பாலிவுட்", "bollywood", 2);
        seedSubCategory(cinId, "Reviews", "விமர்சனங்கள்", "reviews", 3);
        seedSubCategory(cinId, "Music", "இசை", "music", 4);

        seedSubCategory(tecId, "Smartphones", "ஸ்மார்ட் போன்", "smartphones", 1);
        seedSubCategory(tecId, "Software", "மென்பொருள்", "software", 2);
        seedSubCategory(tecId, "AI", "செயற்கை நுண்ணறிவு", "ai", 3);
        seedSubCategory(tecId, "Space", "விண்வெளி", "space", 4);

        Long intId = internationalCat.getId();
        seedSubCategory(intId, "World News", "உலக செய்திகள்", "world-news", 1);
        seedSubCategory(intId, "Neighboring Countries", "அண்டை நாடுகள்", "neighbors", 2);

        // 3. Seed Districts - All 38 Tamil Nadu Districts
        System.out.println("Seeding Districts...");
        seedDistrict("Chennai", "சென்னை");
        seedDistrict("Coimbatore", "கோயம்புத்தூர்");
        seedDistrict("Madurai", "மதுரை");
        seedDistrict("Trichy", "திருச்சிராப்பள்ளி");
        seedDistrict("Salem", "சேலம்");
        seedDistrict("Tirunelveli", "திருநெல்வேலி");
        seedDistrict("Vellore", "வேலூர்");
        seedDistrict("Erode", "ஈரோடு");
        seedDistrict("Thoothukudi", "தூத்துக்குடி");
        seedDistrict("Tiruppur", "திருப்பூர்");
        seedDistrict("Tiruvallur", "திருவள்ளூர்");
        seedDistrict("Kanchipuram", "காஞ்சிபுரம்");
        seedDistrict("Chengalpattu", "செங்கல்பட்டு");
        seedDistrict("Villupuram", "விழுப்புரம்");
        seedDistrict("Cuddalore", "கடலூர்");
        seedDistrict("Nagapattinam", "நாகப்பட்டினம்");
        seedDistrict("Thanjavur", "தஞ்சாவூர்");
        seedDistrict("Pudukkottai", "புதுக்கோட்டை");
        seedDistrict("Sivaganga", "சிவகங்கை");
        seedDistrict("Ramanathapuram", "ராமநாதபுரம்");
        seedDistrict("Virudhunagar", "விருதுநகர்");
        seedDistrict("Namakkal", "நாமக்கல்");
        seedDistrict("Dharmapuri", "தருமபுரி");
        seedDistrict("Krishnagiri", "கிருஷ்ணகிரி");
        seedDistrict("Tiruvannamalai", "திருவண்ணாமலை");
        seedDistrict("Ranipet", "ராணிப்பேட்டை");
        seedDistrict("Tirupathur", "திருப்பத்தூர்");
        seedDistrict("Kallakurichi", "கள்ளக்குறிச்சி");
        seedDistrict("Ariyalur", "அரியலூர்");
        seedDistrict("Perambalur", "பெரம்பலூர்");
        seedDistrict("Karur", "கரூர்");
        seedDistrict("Dindigul", "திண்டுக்கல்");
        seedDistrict("Nilgiris", "நீலகிரி");
        seedDistrict("Tiruvarur", "திருவாரூர்");
        seedDistrict("Mayiladuthurai", "மயிலாடுதுறை");
        seedDistrict("Theni", "தேனி");
        seedDistrict("Tenkasi", "தென்காசி");
        seedDistrict("Kanyakumari", "கன்னியாகுமரி");

        // 4. Seed Articles
        System.out.println("Seeding Articles...");
        seedArticle(polId, null,
                "தமிழக சட்டமன்றக் கூட்டத்தொடர் புதிய பட்ஜெட் அறிவிப்புகள் – நேரடித் தகவல்கள்",
                "TN assembly budget session new announcements - live reports",
                "பட்ஜெட் கூட்டத்தொடரில் முக்கிய துறைகளுக்கான நிதி ஒதுக்கீடுகள் மற்றும் புதிய திட்டங்கள் குறித்த தகவல்கள் வெளியிடப்பட்டன. கல்வி, சுகாதாரம் மற்றும் உட்கட்டமைப்பு மேம்பாட்டிற்காக கூடுதல் நிதி ஒதுக்கப்பட்டுள்ளது.",
                "Important budget allocations and welfare schemes announced during the state assembly session. Additional funds have been setup for education, health, and urban infrastructure projects.",
                "தமிழக பட்ஜெட் கூட்டத்தொடர் முக்கிய அறிவிப்புகள்.",
                "Tamil Nadu state assembly budget session announcements.",
                "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800",
                150, "tn-budget-session-updates");
        
        seedArticle(polId, null,
                "தேசிய தேர்தல் களம்: புது தில்லியில் அனைத்துக் கட்சிக் கூட்டம் இன்று",
                "National elections: all-party meet in New Delhi today",
                "எதிர்வரும் பாராளுமன்றக் கூட்டத்தொடரை சுமுகமாக நடத்துவது குறித்து முக்கிய விவாதங்கள் நடைபெறுகின்றன. எதிர்கட்சிகள் மற்றும் ஆளுங்கட்சியினர் முக்கிய பிரச்சனைகள் குறித்து ஆலோசிக்கின்றனர்.",
                "Opposition and ruling parties meet to deliberate on parliamentary updates and guidelines. Senior political leaders have joined the discussion to resolve the parliamentary schedule.",
                "புது தில்லியில் அனைத்துக் கட்சிக் கூட்டம் இன்று.",
                "All-party meeting in New Delhi today.",
                "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800",
                120, "national-elections-all-party-meet");

        seedArticle(busId, null,
                "பங்குச்சந்தை வரலாறு காணாத உயர்வு – சென்செக்ஸ் 83,000 புள்ளிகளைத் தாண்டியது",
                "Stock markets reach record highs - Sensex crosses 83,000 points",
                "தொழில்நுட்ப மற்றும் வங்கி பங்குகள் பெரும் லாபம் ஈட்டியதை அடுத்து முதலீட்டாளர்கள் மகிழ்ச்சி அடைந்துள்ளனர். உலகளாவிய சாதகமான சூழல் சந்தை உயர்வுக்கு வழிவகுத்தது.",
                "Tech and Banking sector shares register major gains as domestic markets hit new historic milestones. Favorable global trade signals have fueled the rally.",
                "பங்குச்சந்தை புதிய உச்சம்.",
                "Stock markets hit new records.",
                "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800",
                220, "stock-markets-record-highs");

        seedArticle(spoId, null,
                "இந்தியா vs இங்கிலாந்து ஒருநாள் தொடர்: புதிய அணி விவரம் வெளியீடு",
                "India vs England ODI Series: New Squad Announced",
                "இளம் வீரர்களுக்கு வாய்ப்பளிக்கும் வகையில் புதிய இந்திய அணி தேர்வு செய்யப்பட்டுள்ளது. சீனியர் வீரர்களுக்கு ஓய்வளிக்கப்பட்டுள்ளது.",
                "The selection committee has presented the new ODI squad focusing on young talent and resting senior players for the upcoming series.",
                "இந்தியா vs இங்கிலாந்து ஒருநாள் தொடர் அணி விவரம்.",
                "India vs England ODI squad details.",
                "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800",
                310, "india-england-odi-squad");

        seedArticle(cinId, null,
                "தளபதி விஜய்யின் இறுதித் திரைப்படம்: ரசிகர்களிடையே பெரும் எதிர்பார்ப்பு",
                "Thalapathy Vijay final movie: Huge expectations among fans",
                "அரசியல் பிரவேசத்திற்கு முன்னதாக நடிகர் விஜய் நடிக்கும் இறுதித் திரைப்படம் என்பதால் உலகம் முழுவதும் பெரும் எதிர்பார்ப்பு நிலவி வருகிறது.",
                "As it marks the final cinematic outing of Thalapathy Vijay before his political entry, expectations are running high globally.",
                "விஜய்யின் இறுதித் திரைப்படம் பெரும் எதிர்பார்ப்பு.",
                "Vijay's final movie expectations.",
                "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800",
                500, "vijay-final-movie-grand-news");

        // 5. Seed VideoContent
        System.out.println("Seeding Videos...");
        seedVideo(polId, "தமிழக சட்டமன்ற பட்ஜெட் உரை நேரடி ஒளிபரப்பு 2026", "https://www.youtube.com/watch?v=live1", "தமிழக பட்ஜெட் கூட்டத்தொடர் நேரடித் தகவல்கள்.", 1, "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800", 7200);
        seedVideo(spoId, "ஐபிஎல் 2025: சிஎஸ்கே அணியின் புதிய வியூகங்கள் மற்றும் பயிற்சி ஆட்டங்கள்", "https://www.youtube.com/watch?v=csk1", "சென்னை சூப்பர் கிங்ஸ் அணியின் புதிய கேப்டன் தலைமையில் பயிற்சி.", 0, "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800", 300);

        // 6. Seed Obituaries
        System.out.println("Seeding Obituaries...");
        seedObituary("கிருஷ்ணசாமி நடராஜன் (வயது 78)", 78, "மயிலாப்பூர், சென்னை", LocalDate.now().minusDays(2), "மின்கம்ப மயானத்தில் நாளை மாலை 4:00 மணியளவில் உடல் தகனம் செய்யப்படவுள்ளது.", "முன்னாள் அரசு அதிகாரிகள் சங்கத் தலைவர் கிருஷ்ணசாமி நடராஜன் அவர்கள் மயிலாப்பூரில் உள்ள அவரது இல்லத்தில் இயற்கை எய்தினார்.");
        seedObituary("மீனாட்சி சுப்பிரமணியன் (வயது 65)", 65, "ஆர்.எஸ்.புரம், கோயம்புத்தூர்", LocalDate.now().minusDays(1), "காந்திபுரம் மயானத்தில் இன்று காலை 11:30 மணியளவில் இறுதிச்சடங்கு நடைபெற்றது.", "அன்பான இல்லத்தரசி மற்றும் சமூக ஆர்வலர் மீனாட்சி சுப்பிரமணியன் அவர்கள் கோயம்புத்தூரில் காலமானார்.");

        // 7. Seed Classifieds
        System.out.println("Seeding Classifieds...");
        seedClassified("2 BHK அடுக்குமாடி குடியிருப்பு விற்பனைக்கு", "Properties", "ரூ. 65 லட்சம்", "அடையாறு, சென்னை", "9876543210", "அடையாறில் உள்ள முக்கிய குடியிருப்பில் 1200 சதுர அடி கொண்ட புதிய 2 BHK பிளாட் விற்பனைக்கு உள்ளது. கார் பார்க்கிங் மற்றும் லிப்ட் வசதி கொண்டது.");
        seedClassified("பயன்படுத்தப்பட்ட மாருதி ஸ்விஃப்ட் கார் விற்பனைக்கு", "Vehicles", "ரூ. 4.2 லட்சம்", "பீளமேடு, கோயம்புத்தூர்", "9876543211", "2020 மாடல் மாருதி ஸ்விஃப்ட் விஎக்ஸ்ஐ பெட்ரோல் கார் விற்பனைக்கு. சிங்கிள் ஓனர், சிறந்த நிலையில் உள்ளது.");

        // 8. Seed Jobs
        System.out.println("Seeding Jobs...");
        seedJob("ஜாவா மென்பொருள் பொறியாளர் (Java Developer)", "Kings Info Solutions", "IT / Tech", "சோழிங்கநல்லூர், சென்னை", "ரூ. 5 - 8 எல்பிஏ (LPA)", "Full Time", "குறைந்தபட்சம் 2 வருட அனுபவம் உள்ள ஜாவா ஸ்பிரிங் பூட் மென்பொருள் பொறியாளர் தேவை. சிறந்த நிரலாக்க அறிவு பெற்றிருக்க வேண்டும்.");
        seedJob("மனிதவள மேலாளர் (HR Manager)", "Royal Group", "Management", "ஆர்.எஸ்.புரம், கோயம்புத்தூர்", "ரூ. 4 - 6 எல்பிஏ (LPA)", "Full Time", "நிறுவனத்தின் மனிதவள செயல்பாடுகள் மற்றும் பணியாளர் சேர்ப்பு பணிகளை நிர்வகிப்பதற்கான திறமை வாய்ந்த எச்.ஆர் மேலாளர் தேவை.");

        // 9. Seed Directory Listings
        System.out.println("Seeding Directory Listings...");
        DirectoryListing kingCafe = seedDirectory("King Cafe", "Cafe / Restaurant", "Anna Nagar, Chennai", "5th Avenue, Anna Nagar", "08:00 AM - 11:00 PM", "9876543210");
        DirectoryListing abirami = seedDirectory("அபிராமி பல்பொருள் அங்காடி", "Retail / Grocery", "மயிலாப்பூர், சென்னை", "கபாலீஸ்வரர் கோவில் தெரு", "09:00 AM - 10:00 PM", "044-24951234");
        DirectoryListing dental = seedDirectory("ஸ்ரீ பாலாஜி டென்டல் கிளினிக்", "Healthcare / Dental", "காந்திபுரம், கோயம்புத்தூர்", "நூறடி சாலை, காந்திபுரம்", "10:00 AM - 08:30 PM", "0422-2521234");

        // Seed NFC Card for King Cafe (first item with ID 1)
        NfcCard card = new NfcCard();
        card.setListingId(kingCafe.getId());
        card.setShortCode("KCARD-10024");
        card.setLinkType("payment");
        card.setUpiId("kingcafe@upi");
        card.setUpiName("King Cafe");
        card.setIsPaymentEnabled(true);
        card.setCardStatus("activated");
        card.setOtpHash("1234");
        card.setTrackingNumber("TRK-987654321");
        NfcCard savedCard = nfcCardRepository.save(card);
        
        // Seed Tap History for King Cafe
        seedTap(savedCard.getId(), "payment", 250.00, "success", "Hari Prakash", "Anna Nagar, Chennai", LocalDateTime.now().minusHours(2));
        seedTap(savedCard.getId(), "profile", 0.0, "success", "Unknown", "T. Nagar, Chennai", LocalDateTime.now().minusHours(3));
        seedTap(savedCard.getId(), "payment", 1120.00, "success", "Priya Sharma", "Anna Nagar, Chennai", LocalDateTime.now().minusDays(1));
        seedTap(savedCard.getId(), "payment", 560.00, "success", "Vignesh R", "Anna Nagar, Chennai", LocalDateTime.now().minusDays(1));

        // 10. Seed Wishes
        System.out.println("Seeding Wishes...");
        seedWish("கார்த்திகேயன் - அனிதா தம்பதியினர்", "Anniversary", "அன்பான கார்த்திகேயன் மற்றும் அனிதா தம்பதியினருக்கு எங்களது இனிய திருமண நாள் நல்வாழ்த்துக்கள்! உங்கள் வாழ்வில் மகிழ்ச்சி என்றும் நிலைக்கட்டும்.", "சுரேஷ் மற்றும் குடும்பத்தினர்");
        seedWish("செல்வன். சஞ்சய் ராஜ் (வயது 12)", "Birthday", "அன்பு மகன் சஞ்சய் ராஜுக்கு இனிய பிறந்தநாள் நல்வாழ்த்துக்கள்! கல்வியிலும் ஒழுக்கத்திலும் சிறந்து விளங்க வாழ்த்துகிறோம்.", "பெற்றோர்கள் மற்றும் உறவினர்கள்");

        // 11. Seed Web Stories
        System.out.println("Seeding Web Stories...");
        String slidesJson1 = "[" +
                "{\"titleTa\":\"ருதுராஜ் கெய்க்வாட் நியமனம்\",\"titleEn\":\"Ruturaj Gaikwad Appointed\",\"descTa\":\"சென்னை சூப்பர் கிங்ஸ் அணியின் புதிய கேப்டனாக ருதுராஜ் கெய்க்வாட் நியமிக்கப்பட்டுள்ளார்.\",\"descEn\":\"Ruturaj Gaikwad has been officially appointed as the new captain of Chennai Super Kings.\"}," +
                "{\"titleTa\":\"தோனியின் ஆலோசனை\",\"titleEn\":\"Dhoni Advises\",\"descTa\":\"ருதுராஜின் தலைமைப் பண்பை வளர்க்கும் வகையில் தோனி அவருக்கு முக்கிய ஆலோசனைகளை வழங்கியுள்ளார்.\",\"descEn\":\"Dhoni has shared key leadership strategies with Gaikwad to ensure a smooth transition.\"}," +
                "{\"titleTa\":\"ரசிகர்களின் எதிர்பார்ப்பு\",\"titleEn\":\"Fans Expectations\",\"descTa\":\"புதிய கேப்டனின் தலைமையில் சென்னை அணி மீண்டும் சாம்பியன் கோப்பையை வெல்லும் என ரசிகர்கள் நம்புகின்றனர்.\",\"descEn\":\"Fans are highly optimistic that Chennai will lift the cup again under the new captaincy.\"}" +
                "]";
        seedWebStory(sportsCat, "ஐபிஎல் 2025: சிஎஸ்கே புதிய கேப்டன் யார்?", "IPL 2025: Who is the next captain of CSK?", "sports", "NEW", "linear-gradient(135deg, #FF5722, #FF9800)", slidesJson1);

        String slidesJson2 = "[" +
                "{\"titleTa\":\"மாபெரும் எதிர்பார்ப்புகள்\",\"titleEn\":\"High Expectations\",\"descTa\":\"தளபதி விஜய் நடிக்கும் கடைசி திரைப்படம் என்பதால் தமிழகம் முழுவதும் பெரும் எதிர்பார்ப்பு கிளம்பியுள்ளது.\",\"descEn\":\"As it marks the final on-screen outing of Thalapathy Vijay, expectations are soaring sky-high.\"}," +
                "{\"titleTa\":\"வெங்கட் பிரபு இயக்கம்\",\"titleEn\":\"Direction by Venkat Prabhu\",\"descTa\":\"புதுமையான பாணியில் திரைக்கதை அமைப்பதில் வல்லவரான வெங்கட் பிரபு இந்த படத்தை இயக்குகிறார்.\",\"descEn\":\"Director Venkat Prabhu known for his screenplay tricks is handling this political action entertainer.\"}," +
                "{\"titleTa\":\"அனிருத் இசையமைப்பு\",\"titleEn\":\"Musical Scores by Anirudh\",\"descTa\":\"திரைப்படத்தின் பாடல்கள் மற்றும் பின்னணி இசையை ராக்ஸ்டார் அனிருத் வடிவமைக்கிறார்.\",\"descEn\":\"Rockstar Anirudh is scoring the tracks, promising a massive audio treat for fans.\"}" +
                "]";
        seedWebStory(cinemaCat, "விஜய்யின் கடைசி படம்: என்ன எதிர்பார்ப்பு?", "Vijay final movie: What can we expect?", "cinema", "HOT", "linear-gradient(135deg, #E91E63, #9C27B0)", slidesJson2);

        // 13. Seed Users with precise role designations
        System.out.println("Seeding User Accounts...");
        seedUser("Super Admin", "admin@king24x7.com", "admin123", Role.SUPER_ADMIN);
        seedUser("Chief Editor", "editor@king24x7.com", "editor123", Role.CHIEF_EDITOR);
        seedUser("District Admin Coimbatore", "district@king24x7.com", "district123", Role.DISTRICT_ADMIN);
        seedUser("Mobile Journalist", "reporter@king24x7.com", "reporter123", Role.MOBILE_JOURNALIST);
        seedUser("Government Institution", "vendor@king24x7.com", "vendor123", Role.INSTITUTION_LOGIN);
        seedUser("Public Reader", "user@king24x7.com", "user123", Role.READER);

        // 14. Seed System Configurations
        System.out.println("Seeding System Configs...");
        seedSystemConfig(SystemConfig.GPS_NEWS_RADIUS_KM, "15.0", "gps", "GPS news radius in km");
        seedSystemConfig(SystemConfig.MAINTENANCE_MODE, "false", "system", "Whether the system is undergoing maintenance (true/false)");
        seedSystemConfig(SystemConfig.VIDEO_MAX_DURATION_SECONDS, "55", "video", "Maximum video duration in seconds");
        seedSystemConfig(SystemConfig.PWA_NAME, "KING24X7 News", "pwa", "PWA full application name");
        seedSystemConfig(SystemConfig.PWA_SHORT_NAME, "KING24X7", "pwa", "PWA short application name");
        seedSystemConfig(SystemConfig.PWA_THEME_COLOR, "#1e3a8a", "pwa", "PWA theme brand color");
        seedSystemConfig(SystemConfig.PWA_BACKGROUND_COLOR, "#ffffff", "pwa", "PWA background color");
        seedSystemConfig(SystemConfig.CDN_BASE_URL, "", "s3", "CDN Base URL for AWS S3 Assets");
        seedSystemConfig(SystemConfig.TELEGRAM_BOT_TOKEN, "", "telegram", "Telegram Bot API Auth Token");
        seedSystemConfig(SystemConfig.TELEGRAM_CHAT_ID, "", "telegram", "Telegram Channel/Chat Target ID");
        seedSystemConfig(SystemConfig.TELEGRAM_ENABLED, "false", "telegram", "Enable or disable automatic Telegram pushes (true/false)");
        seedSystemConfig(SystemConfig.AI_LLM_API_KEY, "", "ai", "AI LLM API Key");
        seedSystemConfig(SystemConfig.AI_LLM_MODEL, "gemini-2.0-flash", "ai", "AI Model Name");
        seedSystemConfig(SystemConfig.SMS_GATEWAY_API_KEY, "", "sms", "SMS Gateway API Key");
        seedSystemConfig(SystemConfig.AI_PROMPT_GENERATE_DRAFT, 
            "You are a professional news editor. Given the following source notes/documents, generate a complete, ready-to-publish news article in both English and Tamil. Return ONLY a valid JSON object matching this exact schema, with no markdown formatting or explanation outside the JSON:\n\n{\n  \"titleEn\": \"English Title (max 12 words)\",\n  \"titleTa\": \"Tamil Title (max 12 words)\",\n  \"contentEn\": \"Full professional English news article with HTML paragraphs <p>\",\n  \"contentTa\": \"Full professional Tamil news article with HTML paragraphs <p>\",\n  \"excerptEn\": \"1-2 sentence English summary\",\n  \"excerptTa\": \"1-2 sentence Tamil summary\",\n  \"seoTitle\": \"SEO optimized title max 60 chars\",\n  \"metaDescription\": \"SEO description max 160 chars\",\n  \"metaKeywords\": \"comma, separated, tags\",\n  \"focusKeywords\": \"primary, keywords\",\n  \"slug\": \"english-url-slug\",\n  \"categoryId\": \"Suggest the best category ID from this list: {catNames}\"\n}\n\nSource Notes:\n\"{baseContent}\"",
            "ai", "Prompt template for generating full article draft");
        seedSystemConfig(SystemConfig.AI_PROMPT_PROOFREAD_AUTOFILL,
            "You are a world-class news editor and SEO expert.\nGiven the following draft news content (which may contain spelling, grammar, punctuation, or formatting mistakes), perform the following:\n1. Proofread and correct all spelling, grammar, typography, and phrasing mistakes. Return production-ready HTML for both Tamil and English versions.\n2. Generate optimized headlines (Tamil Title & English Title).\n3. Generate concise 1-2 sentence excerpts (Tamil & English).\n4. Generate complete SEO metadata: Meta Title (max 60 chars), Meta Description (max 160 chars), Focus Keywords, News Tags, clean English URL Slug.\n5. Suggest the best category ID from this list: {catNames}.\n6. Infer or suggest News Source/Agency (e.g. Kings TV Desk) and News Location/City (e.g. Chennai).\n\nReturn ONLY a valid JSON object matching this schema with NO markdown formatting outside the JSON:\n\n{\n  \"titleTa\": \"Tamil Title\",\n  \"titleEn\": \"English Title\",\n  \"contentTa\": \"Proofread corrected HTML for Tamil\",\n  \"contentEn\": \"Proofread corrected HTML for English\",\n  \"shortDescTa\": \"1-2 sentence Tamil summary\",\n  \"shortDescEn\": \"1-2 sentence English summary\",\n  \"metaTitle\": \"SEO Meta Title max 60 chars\",\n  \"metaDescription\": \"SEO Meta Description max 160 chars\",\n  \"focusKeywords\": \"primary, keywords\",\n  \"metaKeywords\": \"news, tags, comma, separated\",\n  \"slug\": \"english-url-slug\",\n  \"categoryId\": \"suggested category ID\",\n  \"suggestedSource\": \"Kings TV Desk\",\n  \"suggestedLocation\": \"Chennai\"\n}\n\nDraft Content to Proofread & Process:\n\"{baseContent}\"",
            "ai", "Prompt template for AI proofread and auto-fill");

        // Seed Dynamic Social Media Links & Site Settings
        seedSystemConfig("site.name", "KING 24x7", "site", "Global website brand name");
        seedSystemConfig("site.logo_url", "/assets/icons/logo-icon-light.png", "site", "Logo image URL");
        seedSystemConfig("site.logo_footer", "/assets/icons/logo-icon-light.png", "site", "Footer logo image URL");
        seedSystemConfig("site.tagline", "Truth. Responsibility. In Tamil.", "site", "Website tagline in English");
        seedSystemConfig("site.tagline_ta", "உண்மை. பொறுப்புடன். தமிழ்.", "site", "Website tagline in Tamil");
        seedSystemConfig("site.description", "KING 24x7 is a leading Tamil news portal. We deliver instant, reliable news from Tamil Nadu, India, and across the globe.", "site", "Site description in English");
        seedSystemConfig("site.description_ta", "KING 24x7 ஒரு முன்னணி தமிழ் செய்தி போர்டல். தமிழகம், இந்தியா மற்றும் உலகம் முழுவதும் இருந்து தமிழில் உடனடி, நம்பகமான செய்திகளை வழங்குகிறோம்.", "site", "Site description in Tamil");
        seedSystemConfig("social.facebook", "https://www.facebook.com/profile.php?id=61551357861905", "social", "Facebook Page URL");
        seedSystemConfig("social.twitter", "https://x.com/onlinethamizhan", "social", "Twitter Profile URL");
        seedSystemConfig("social.instagram", "https://www.instagram.com/king24x7/", "social", "Instagram Profile URL");
        seedSystemConfig("social.youtube", "https://www.youtube.com/@king24x7", "social", "YouTube Channel URL");

        // 15. Seed Profanity Words
        System.out.println("Seeding Profanity Words...");
        seedProfanity("abuse");
        seedProfanity("spam");
        seedProfanity("offensive");

        // 16. Seed Default Layouts
        System.out.println("Seeding Web and Mobile Home Layout Sections...");
        seedLayoutSection("news_ticker", "⚡ Breaking News Ticker", 1, "WEB");
        seedLayoutSection("hero", "📰 Hero Section", 2, "WEB");
        seedLayoutSection("quick_access", "🔘 Quick Access Icons", 3, "WEB");
        seedLayoutSection("latest_news", "🆕 Latest News", 4, "WEB");
        seedLayoutSection("video_news", "🎥 Video News", 5, "WEB");
        seedLayoutSection("web_stories", "📱 Web Stories", 6, "WEB");
        seedLayoutSection("trending_sidebar", "🔥 Trending Sidebar", 7, "WEB");
        seedLayoutSection("weather", "🌦️ Weather Widget", 8, "WEB");
        seedLayoutSection("live_tv", "📺 Live TV Widget", 9, "WEB");
        seedLayoutSection("business_case", "💼 Business Case Studies", 10, "WEB");
        seedLayoutSection("crowd_reporter", "📢 Crowd Reporter", 11, "WEB");
        seedLayoutSection("news_digest", "📑 News Digest", 12, "WEB");
        seedLayoutSection("crowd_reporter_highlight", "📢 Crowd Reporter Highlights", 13, "WEB");
        seedLayoutSection("institution_news", "🏫 Institution News", 14, "WEB");
        
        seedLayoutSection("mobile_hero", "Trending Stories Feed", 1, "MOBILE");
        seedLayoutSection("mobile_live_tv", "Live Broadcast", 2, "MOBILE");

        System.out.println("Database Seeding Check Complete!");
    }

    private void seedUser(String name, String email, String password, String role) {
        String cleanEmail = email.toLowerCase().trim();
        Optional<User> existing = userRepository.findByEmail(cleanEmail);
        User u = existing.orElse(new User());
        u.setFullName(name);
        u.setEmail(cleanEmail);
        u.setPassword(passwordEncoder.encode(password));
        u.setRole(role);
        u.setProvider("LOCAL");
        u.setIsVerified(true);
        u.setIsActive(true);
        userRepository.save(u);
    }

    private void seedAdvertisements() {
        if (adRepository.count() == 0) {
            System.out.println("Seeding Advertisements...");
            
            // 1. Header Banner Ad
            Advertisement headerAd = new Advertisement();
            headerAd.setPlacementId("header-ad-1");
            headerAd.setTitle("Learn Java Coding - Premium Bootcamp");
            headerAd.setImageUrl("https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000");
            headerAd.setLinkUrl("https://github.com/google/gemini-api");
            headerAd.setStatus("active");
            headerAd.setPlacement("header");
            headerAd.setTargetDevice("all");
            headerAd.setTargetGeo("all");
            headerAd.setRemainingBudget(150.0);
            headerAd.setCostPerClick(0.15);
            headerAd.setCostPerImpression(0.01);
            adRepository.save(headerAd);

            // 2. Sidebar Ad
            Advertisement sidebarAd = new Advertisement();
            sidebarAd.setPlacementId("sidebar-ad-1");
            sidebarAd.setTitle("Develop Android Apps - Zero to Hero");
            sidebarAd.setImageUrl("https://images.unsplash.com/photo-1607799279861-4dd421887fb3?q=80&w=1000");
            sidebarAd.setLinkUrl("https://developer.android.com");
            sidebarAd.setStatus("active");
            sidebarAd.setPlacement("sidebar");
            sidebarAd.setTargetDevice("all");
            sidebarAd.setTargetGeo("all");
            sidebarAd.setRemainingBudget(80.0);
            sidebarAd.setCostPerClick(0.20);
            sidebarAd.setCostPerImpression(0.02);
            adRepository.save(sidebarAd);

            // 3. Mid-Article Ad
            Advertisement midAd = new Advertisement();
            midAd.setPlacementId("mid-article-ad-1");
            midAd.setTitle("Cloud Computing Solutions with AWS & Google Cloud");
            midAd.setImageUrl("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000");
            midAd.setLinkUrl("https://cloud.google.com");
            midAd.setStatus("active");
            midAd.setPlacement("mid-article");
            midAd.setTargetDevice("all");
            midAd.setTargetGeo("all");
            midAd.setRemainingBudget(200.0);
            midAd.setCostPerClick(0.25);
            midAd.setCostPerImpression(0.03);
            adRepository.save(midAd);
        }
    }

    private void seedSystemConfig(String key, String val, String group, String desc) {
        SystemConfig sc = new SystemConfig();
        sc.setConfigKey(key);
        sc.setConfigValue(val);
        sc.setConfigGroup(group);
        sc.setDescription(desc);
        sc.setIsEncrypted(false);
        systemConfigRepository.save(sc);
    }

    private void seedProfanity(String term) {
        ProfanityWord w = new ProfanityWord();
        w.setTerm(term);
        w.setLanguage("ALL");
        profanityWordRepository.save(w);
    }

    private void seedLayoutSection(String key, String label, int order, String type) {
        HomeLayoutConfig l = new HomeLayoutConfig();
        l.setSectionKey(key);
        l.setSectionLabel(label);
        l.setDisplayOrder(order);
        l.setIsVisible(true);
        l.setLayoutType(type);
        homeLayoutConfigRepository.save(l);
    }

    private Category seedCategory(String name, String nameTa, String slug, int order, String icon) {
        Category cat = new Category();
        cat.setName(name);
        cat.setNameTa(nameTa);
        cat.setSlug(slug);
        cat.setDisplayOrder(order);
        cat.setIcon(icon);
        cat.setIsNav(true);
        cat.setIsActive(true);
        return categoryRepository.save(cat);
    }

    private void seedSubCategory(Long catId, String name, String nameTa, String slug, int order) {
        SubCategory sub = new SubCategory();
        sub.setCategoryId(catId);
        sub.setName(name);
        sub.setNameTa(nameTa);
        sub.setSlug(slug);
        sub.setDisplayOrder(order);
        sub.setStatus("active");
        subCategoryRepository.save(sub);
    }

    private void seedDistrict(String nameEn, String nameTa) {
        District dist = new District();
        dist.setNameEn(nameEn);
        dist.setNameTa(nameTa);
        districtRepository.save(dist);
    }

    private void seedArticle(Long catId, Long distId, String titleTa, String titleEn, String contentTa, String contentEn, String shortDescTa, String shortDescEn, String imageUrl, int views, String slug) {
        Article art = new Article();
        art.setCategoryId(catId);
        art.setDistrictId(distId);
        art.setTitleTa(titleTa);
        art.setTitleEn(titleEn);
        art.setContentTa(contentTa);
        art.setContentEn(contentEn);
        art.setShortDescTa(shortDescTa);
        art.setShortDescEn(shortDescEn);
        art.setImageUrl(imageUrl);
        art.setViewsCount(views);
        art.setStatus("published");
        art.setSlug(slug);
        art.setMetaTitle(titleEn);
        art.setMetaDescription(shortDescEn);
        art.setMetaKeywords(slug.replace("-", ", "));
        art.setCanonicalUrl("http://localhost:5000/articles/" + slug);
        art.setFeaturedImage(imageUrl);
        articleRepository.save(art);
    }

    private void seedVideo(Long catId, String title, String youtubeUrl, String desc, int isLive, String thumb, int duration) {
        VideoContent vid = new VideoContent();
        vid.setCategoryId(catId);
        vid.setTitle(title);
        vid.setYoutubeUrl(youtubeUrl);
        vid.setDescription(desc);
        vid.setIsLiveTv(isLive);
        vid.setThumbnailUrl(thumb);
        vid.setDurationSeconds(duration);
        vid.setStatus("published");
        videoContentRepository.save(vid);
    }

    private void seedObituary(String deceasedName, int age, String location, LocalDate demiseDate, String funeralDetails, String shortDesc) {
        Obituary obit = new Obituary();
        obit.setDeceasedName(deceasedName);
        obit.setAge(age);
        obit.setLocation(location);
        obit.setDemiseDate(demiseDate);
        obit.setFuneralDetails(funeralDetails);
        obit.setShortDescription(shortDesc);
        obit.setTributeCount(0);
        obit.setStatus("published");
        obituaryRepository.save(obit);
    }

    private void seedClassified(String title, String category, String price, String location, String contact, String desc) {
        ClassifiedListing listing = new ClassifiedListing();
        listing.setTitle(title);
        listing.setCategory(category);
        listing.setPriceDetail(price);
        listing.setLocation(location);
        listing.setContactInfo(contact);
        listing.setDescription(desc);
        listing.setStatus("active");
        classifiedRepository.save(listing);
    }

    private void seedJob(String title, String company, String category, String location, String salary, String type, String desc) {
        JobPosting job = new JobPosting();
        job.setTitle(title);
        job.setCompanyName(company);
        job.setCategory(category);
        job.setLocation(location);
        job.setSalaryRange(salary);
        job.setEmploymentType(type);
        job.setDescription(desc);
        job.setStatus("active");
        jobRepository.save(job);
    }

    private DirectoryListing seedDirectory(String name, String cat, String locality, String street, String hours, String phone) {
        DirectoryListing business = new DirectoryListing();
        business.setBusinessName(name);
        business.setCategory(cat);
        business.setAddressLocality(locality);
        business.setAddressStreet(street);
        business.setWorkingHours(hours);
        business.setPhoneNumber(phone);
        business.setStatus("active");
        return directoryRepository.save(business);
    }

    private void seedTap(Long cardId, String type, Double amount, String status, String customer, String city, LocalDateTime time) {
        NfcTapHistory tap = new NfcTapHistory();
        tap.setCardId(cardId);
        tap.setTapType(type);
        tap.setAmount(amount);
        tap.setStatus(status);
        tap.setCustomerName(customer);
        tap.setLocationCity(city);
        tap.setTappedAt(time);
        nfcTapHistoryRepository.save(tap);
    }

    private void seedWish(String recipient, String catSlug, String message, String sender) {
        Wish wish = new Wish();
        wish.setRecipientName(recipient);
        
        WishCategory category = wishCategoryRepository.findBySlug(catSlug)
            .orElseGet(() -> wishCategoryRepository.findBySlug("general").orElse(null));
        wish.setCategory(category);
        
        wish.setMessage(message);
        wish.setSenderName(sender);
        wish.setStatus("published");
        wishRepository.save(wish);
    }

    private void seedWebStory(Category cat, String titleTa, String titleEn, String catSlug, String badge, String gradient, String slidesJson) {
        WebStory story = new WebStory();
        story.setTitleTa(titleTa);
        story.setTitleEn(titleEn);
        story.setTitle(titleEn);
        story.setCat(catSlug);
        story.setCategoryId(cat != null ? cat.getId() : 1L);
        story.setBadge(badge);
        story.setBackgroundGradient(gradient);
        story.setSlidesJson(slidesJson);
        story.setStatus("published");
        webStoryRepository.save(story);
    }

    private NavigationMenu seedMenu(String titleTa, String titleEn, String linkUrl, int displayOrder, Long parentId) {
        NavigationMenu menu = new NavigationMenu();
        menu.setTitleTa(titleTa);
        menu.setTitleEn(titleEn);
        menu.setLinkUrl(linkUrl);
        menu.setDisplayOrder(displayOrder);
        menu.setParentId(parentId);
        menu.setIsActive(true);
        return navigationMenuRepository.save(menu);
    }

    private void seedSitemapConfigs() {
        if (sitemapConfigRepository.count() == 0) {
            System.out.println("Seeding default sitemap configurations...");
            String[][] sitemaps = {
                {"/", "Home", "1.0", "daily"},
                {"/category/politics", "Politics Category", "0.8", "daily"},
                {"/category/business", "Business Category", "0.8", "daily"},
                {"/category/sports", "Sports Category", "0.8", "daily"},
                {"/category/cinema", "Cinema Category", "0.8", "daily"},
                {"/category/tech", "Tech Category", "0.8", "daily"},
                {"/category/international", "International Category", "0.8", "daily"},
                {"/directory", "Local Business Directory", "0.6", "weekly"},
                {"/wishes", "Wishes", "0.6", "weekly"},
                {"/obituaries", "Obituaries", "0.6", "weekly"},
                {"/jobs", "Jobs", "0.6", "weekly"},
                {"/classifieds", "Classifieds", "0.6", "weekly"},
                {"/videos", "Videos", "0.7", "daily"},
                {"/web-stories", "Web Stories", "0.7", "daily"}
            };
            for (String[] sm : sitemaps) {
                SitemapConfig c = new SitemapConfig();
                c.setPagePath(sm[0]);
                c.setPageLabel(sm[1]);
                c.setPriority(sm[2]);
                c.setChangeFreq(sm[3]);
                c.setIsExcluded(false);
                sitemapConfigRepository.save(c);
            }
        }
    }

    private void updateChiefEditorPermissions() {
        Optional<Role> chiefEditorOpt = roleRepository.findByName(Role.CHIEF_EDITOR);
        if (chiefEditorOpt.isPresent()) {
            Role chiefEditor = chiefEditorOpt.get();
            List<String> requiredPerms = Arrays.asList(
                Permission.SITEMAP_MANAGE,
                Permission.SEO_CONFIG_MANAGE,
                Permission.TAXONOMY_MANAGE
            );
            
            // Map of all permissions seeded in DB
            Map<String, Permission> savedPerms = new HashMap<>();
            for (String permName : requiredPerms) {
                Optional<Permission> permOpt = permissionRepository.findByName(permName);
                if (permOpt.isEmpty()) {
                    String desc = "Manage " + permName.split(":")[0];
                    String module = permName.split(":")[0].substring(0, 1).toUpperCase() + permName.split(":")[0].substring(1);
                    Permission newPerm = permissionRepository.save(new Permission(permName, desc, module));
                    savedPerms.put(permName, newPerm);
                } else {
                    savedPerms.put(permName, permOpt.get());
                }
            }

            boolean updated = false;
            for (String permName : requiredPerms) {
                boolean hasPerm = chiefEditor.getPermissions().stream()
                    .anyMatch(p -> p.getName().equals(permName));
                if (!hasPerm) {
                    chiefEditor.getPermissions().add(savedPerms.get(permName));
                    updated = true;
                }
            }
            if (updated) {
                roleRepository.save(chiefEditor);
                System.out.println("Updated Chief Editor permissions successfully.");
            }
        }
    }

    private void seedHomeLayoutConfigs() {
        try {
            if (homeLayoutConfigRepository.count() == 0) {
                System.out.println("Seeding Default Home Layout Configs...");
                String[][] webSections = {
                    {"hero", "Hero Section", "1"},
                    {"quick_access", "Quick Access", "2"},
                    {"latest_news", "Latest News", "3"},
                    {"web_stories", "Web Stories", "4"},
                    {"video_news", "Video News", "5"},
                    {"agri", "Agriculture & Market Rates", "6"},
                    {"business", "Business Dashboard", "7"},
                    {"district", "District News", "8"},
                    {"election", "Election Center 2026", "9"},
                    {"live_tv", "Live TV", "10"},
                    {"poll", "Opinion Poll", "11"},
                    {"news_digest", "Readers Page", "12"},
                    {"crowd_reporter_highlight", "Reporter Highlight", "13"},
                    {"institution_news", "Institution News", "14"}
                };
                for (String[] sec : webSections) {
                    com.kingstv.models.HomeLayoutConfig c = new com.kingstv.models.HomeLayoutConfig();
                    c.setLayoutType("WEB");
                    c.setSectionKey(sec[0]);
                    c.setSectionLabel(sec[1]);
                    c.setDisplayOrder(Integer.parseInt(sec[2]));
                    c.setIsVisible(true);
                    c.setConfigJson("{}");
                    homeLayoutConfigRepository.save(c);
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to seed home layout configs: " + e.getMessage());
        }

        seedBreakingNews();
    }

    private void seedBreakingNews() {
        try {
            if (breakingNewsRepository.count() == 0) {
                String[][] newsList = {
                    {"BREAKING: Tamil Nadu Assembly Budget Session 2026 Key Announcements", "தமிழக சட்டமன்ற பட்ஜெட் கூட்டத்தொடர் 2026: முக்கியமான திட்டங்கள் அறிவிப்பு."},
                    {"Gold Price Drop: Gold drops by Rs 400 per sovereign in Chennai today", "ஆபரணத் தங்கத்தின் விலை சவரனுக்கு ரூ.400 குறைந்தது - இல்லத்தரசிகள் மகிழ்ச்சி."},
                    {"IPL 2026: Chennai Super Kings qualifies for playoffs with high NRR", "ஐபிஎல் 2026: சென்னை சூப்பர் கிங்ஸ் அணி அபார வெற்றியுடன் பிளே-ஆஃப் சுற்றுக்கு தகுதி!"},
                    {"Heavy Rainfall Warning: Red alert issued for 4 coastal districts in Tamil Nadu", "தமிழகத்தில் 4 கடலோர மாவட்டங்களுக்கு அதிபலத்த மழை எச்சரிக்கை - வானிலை மையம் அறிவிப்பு."}
                };
                for (int i = 0; i < newsList.length; i++) {
                    BreakingNews bn = new BreakingNews();
                    bn.setTitle(newsList[i][0]);
                    bn.setTitleTa(newsList[i][1]);
                    bn.setStatus("published");
                    bn.setPriority(i + 1);
                    bn.setBreaking(true);
                    bn.setPublishedAt(LocalDateTime.now().minusMinutes(i * 15));
                    breakingNewsRepository.save(bn);
                }
            }
        } catch (Exception e) {
            System.err.println("Could not seed breaking news: " + e.getMessage());
        }
    }

    private void seedFiftyArticlesPerCategory() {
        try {
            List<Category> categories = categoryRepository.findAll();
            if (categories.isEmpty()) return;

            String[] sampleImages = {
                "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800",
                "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800",
                "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800",
                "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800",
                "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800",
                "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800",
                "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800",
                "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800",
                "https://images.unsplash.com/photo-1508962914676-134849a727f0?w=800",
                "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800",
                "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800"
            };

            Map<String, String[][]> categoryTemplates = new HashMap<>();

            categoryTemplates.put("politics", new String[][]{
                {"தமிழக சட்டமன்ற பட்ஜெட் விவாதம்: முக்கிய திட்டங்கள் அறிவிப்பு", "Tamil Nadu Assembly Budget Debate: Key Welfare Schemes Announced", "சட்டமன்றத்தில் இன்று பட்ஜெட் மீதான விவாதம் காரசாரமாக நடைபெற்றது. மக்கள் நலன் சார்ந்த பல முக்கிய புதிய அறிவிப்புகளை முதல்வர் வெளியிட்டார்."},
                {"மத்திய அமைச்சரவை கூட்டம்: புதிய கொள்கை முடிவுகளுக்கு ஒப்புதல்", "Union Cabinet Meeting: Approval Granted for New Policy Reforms", "புது தில்லியில் நடைபெற்ற மத்திய அமைச்சரவைக் கூட்டத்தில் முக்கிய வளர்ச்சி திட்டங்கள் மற்றும் பொருளாதார கொள்கைகளுக்கு ஒப்புதல் வழங்கப்பட்டது."},
                {"தேர்தல் ஆணையம் முக்கிய அறிவிப்பு: வாக்காளர் பட்டியல் சரிபார்ப்பு முகாம்", "Election Commission Notice: Voter List Verification Drive", "வாக்காளர் பட்டியலில் பெயர் சேர்த்தல் மற்றும் திருத்தங்களை செய்ய மாநிலம் முழுவதும் சிறப்பு முகாம்கள் நடத்த திட்டமிடப்பட்டுள்ளது."},
                {"தமிழகத்தில் உள்கட்டமைப்பு மேம்பாடு: புதிய நெடுஞ்சாலை திட்டங்களுக்கு அனுமதி", "TN Infrastructure Expansion: Approval for New Highway Projects", "மாவட்டங்களுக்கு இடையேயான போக்குவரத்து தொடர்பை வலுப்படுத்த புதிய 4 வழி நெடுஞ்சாலை பணிகளை துவங்க அனுமதி வழங்கப்பட்டுள்ளது."},
                {"உள்ளாட்சி அமைப்புகளுக்கு கூடுதல் நிதி: அரசு அரசாணை வெளியீடு", "Additional Grants for Local Bodies: Government Order Released", "கிராமப்புற மற்றும் நகர்ப்புற உள்ளாட்சி அமைப்புகளின் குடிநீர் மற்றும் சுகாதார மேம்பாட்டிற்காக சிறப்பு நிதி ஒதுக்கப்பட்டுள்ளது."}
            });

            categoryTemplates.put("business", new String[][]{
                {"பங்குச்சந்தை புதிய உச்சம்: சென்செக்ஸ் 84,000 புள்ளிகளை தொட்டது", "Stock Market Milestone: Sensex Reaches 84,000 Points", "உள்நாட்டு மற்றும் சர்வதேச சாதகமான பொருளாதார காரணிகளால் இந்திய பங்குச்சந்தைகள் வரலாறு காணாத உயர்வை பதிவு செய்துள்ளன."},
                {"தங்கம் விலை மாற்றம்: சவரனுக்கு அதிரடி விலை குறைவு", "Gold Rate Update: Significant Price Reduction Per Sovereign", "சர்வதேச சந்தையில் தங்கம் விலை குறைந்ததை அடுத்து தமிழகத்தில் ஆபரண தங்கம் விலை சவரனுக்கு கணிசமாக குறைந்துள்ளது."},
                {"ஸ்டார்ட்அப் நிறுவனங்களுக்கு புதிய முதலீட்டு நிதி: அரசு திட்டம்", "New Venture Fund Launched to Support Growing Startups", "இளம் தொழில் முனைவோரை ஊக்குவிக்கும் வகையில் ரூ. 500 கோடி மதிப்பிலான புதிய ஸ்டார்ட்அப் நிதி திட்டம் தொடங்கப்பட்டுள்ளது."},
                {"இந்திய ஏற்றுமதி 12% உயர்வு: வணிக அமைச்சகம் அறிக்கை", "Indian Exports Surge 12%: Commerce Ministry Report", "நடப்பு நிதியாண்டின் முதல் காலாண்டில் மின்னணு பொருள்கள் மற்றும் ஜவுளி ஏற்றுமதி எதிர்பார்த்ததை விட பெருமளவு அதிகரித்துள்ளது."},
                {"வங்கிகளின் வட்டி விகிதங்கள் சீரமைப்பு: முதலீட்டாளர்களுக்கு நல்ல செய்தி", "Bank Interest Rates Revised: Positive News for Fixed Deposit Holders", "வாடிக்கையாளர்களின் வைப்புத்தொகைகளுக்கான வட்டி விகிதங்களை முன்னணி பொதுத்துறை மற்றும் தனியார் வங்கிகள் உயர்த்தியுள்ளன."}
            });

            categoryTemplates.put("sports", new String[][]{
                {"ஐபிஎல் 2026: சிஎஸ்கே அணியின் தீவிர பயிற்சி ஆட்டங்கள் தொடக்கம்", "IPL 2026: CSK Commences Intensive Training Camp", "சென்னை சேப்பாக்கம் மைதானத்தில் சிஎஸ்கே அணி வீரர்கள் தீவிர பயிற்சியில் ஈடுபட்டு வருகின்றனர். ரசிகர்கள் உற்சாகம்."},
                {"இந்திய கிரிக்கெட் அணி வரலாற்று வெற்றி: 3-0 என தொடரை கைப்பற்றியது", "Indian Cricket Team Historic Series Win: Clean Sweep 3-0", "ஆஸ்திரேலியாவுக்கு எதிரான ஒருநாள் தொடரை இந்திய அணி முழுமையாக வென்று புதிய சாதனை படைத்துள்ளது."},
                {"உலக செஸ் சாம்பியன்ஷிப்: இந்திய இளம் வீரர் அபார வெற்றி", "World Chess Championship: Indian Prodigy Claims Victory", "சர்வதேச செஸ் தொடரில் முன்னணி வீரர்களை வீழ்த்தி இந்திய இளம் செஸ் கிராண்ட்மாஸ்டர் முதலிடம் பிடித்துள்ளார்."},
                {"ஆசிய தடகளப் போட்டி: தமிழக வீராங்கனை தங்கப் பதக்கம் வென்றார்", "Asian Athletics Championships: TN Athlete Secures Gold Medal", "மகளிர் 400 மீட்டர் ஓட்டப்பந்தயத்தில் தமிழகத்தைச் சேர்ந்த வீராங்கனை தங்கப் பதக்கம் வென்று இந்தியாவிற்கு பெருமை சேர்த்துள்ளார்."},
                {"ஒலிம்பிக் தகுதிச் சுற்று: இந்திய ஆடவர் ஹாக்கி அணி அபார செயல்பாடு", "Olympic Qualifiers: Indian Men's Hockey Team Dominates", "தகுதிச் சுற்று ஆட்டத்தில் இந்திய ஹாக்கி அணி 5-1 என்ற கோல் கணக்கில் அபார வெற்றி பெற்று அடுத்த சுற்றுக்கு முன்னேறியுள்ளது."}
            });

            categoryTemplates.put("cinema", new String[][]{
                {"தளபதி விஜய்யின் 69-வது படம்: பிரம்மாண்ட இசை வெளியீட்டு விழா", "Thalapathy Vijay's 69th Movie: Grand Audio Launch Scheduled", "திரையுலகில் பெரும் எதிர்பார்ப்பை ஏற்படுத்தியுள்ள தளபதி விஜய்யின் புதிய திரைப்பட இசை வெளியீட்டு விழா மலேசியாவில் நடைபெறுகிறது."},
                {"சர்வதேச திரைப்பட விழா: சிறந்த தமிழ் படத்திற்கு விருது", "International Film Festival: Prestigious Award for Tamil Film", "பிரான்ஸ் நாட்டில் நடைபெற்ற சர்வதேச திரைப்பட விழாவில் தமிழ் திரைப்படம் நடுவர்களின் சிறப்பு விருதை வென்றுள்ளது."},
                {"சூப்பர் ஸ்டார் ரஜினிகாந்தின் புதிய படப்பிடிப்பு சென்னையில் தொடக்கம்", "Superstar Rajinikanth Begins Shooting for New Action Entertainer", "சென்னையில் அமைக்கப்பட்டுள்ள பிரம்மாண்ட செட்டில் சூப்பர் ஸ்டார் ரஜினிகாந்தின் புதிய படத்தின் முதல்கட்ட படப்பிடிப்பு தொடங்கியது."},
                {"திரையரங்குகளில் வசூல் சாதனை: பாக்ஸ் ஆபீஸில் ரூ. 200 கோடி கடந்தது", "Box Office Triumph: New Movie Crosses Rs 200 Crore Mark Globally", "ரசிகர்களின் அமோக வரவேற்பால் கடந்த வாரம் வெளியான புதிய திரைப்படம் உலகளவில் ரூ. 200 கோடி வசூலை எட்டியுள்ளது."},
                {"இசைஞானி இளையராஜாவின் நேரடி இசைக்கச்சேரி கோவை நகரில்", "Maestro Ilaiyaraaja Live Symphony Concert Announced in Coimbatore", "கோயம்புத்தூரில் நடைபெறவுள்ள இசைஞானி இளையராஜாவின் பிரம்மாண்ட நேரடி இசைக்கச்சேரிக்கு நுழைவுச்சீட்டுகள் விறுவிறுப்பாக விற்பனையாகின்றன."}
            });

            categoryTemplates.put("tech", new String[][]{
                {"செயற்கை நுண்ணறிவு புரட்சி: புதிய AI மாடலை அறிமுகப்படுத்தியது கூகுள்", "AI Revolution: Google Unveils Next-Gen Multimodal Model", "தொழில்நுட்ப உலகில் புதிய மைல்கல்லாக அதிவேகமாக செயல்படும் புதிய செயற்கை நுண்ணறிவு தொழில்நுட்பம் அறிமுகப்படுத்தப்பட்டுள்ளது."},
                {"இந்தியாவில் 6G தொழில்நுட்ப ஆராய்ச்சி: புதிய மையத்தை திறந்தது அரசு", "6G Telecom Research Hub Inaugurated in India", "அடுத்த தலைமுறை தொலைத்தொடர்பு சேவையான 6G ஆராய்ச்சிக்காக சென்னை ஐஐடியில் சிறப்பு தொழில்நுட்ப மையம் அமைக்கப்பட்டுள்ளது."},
                {"ஸ்மார்ட்போன் சந்தையில் புதிய அறிமுகம்: 200MP கேமரா சிறப்பம்சம்", "New Smartphone Launch Features 200MP Ultra Camera", "அதிநவீன செயலி மற்றும் 200 மெகாபிக்சல் கேமரா வசதியுடன் கூடிய புதிய ஸ்மார்ட்போன் சந்தையில் விற்பனைக்கு வந்துள்ளது."},
                {"சைய்பர் பாதுகாப்பு விழிப்புணர்வு: பயனர்களுக்கு புதிய வழிகாட்டுதல்கள்", "Cybersecurity Awareness: Essential Guidelines Issued for Internet Users", "இணையவழி நிதி மோசடிகளை தடுக்க பொதுமக்கள் பின்பற்ற வேண்டிய முக்கிய பாதுகாப்பு வழிமுறைகளை இந்திய சைய்பர் பிரிவு வெளியிட்டுள்ளது."},
                {"இந்திய விண்வெளி ஆராய்ச்சி மையம் சாதனை: புதிய செயற்கைக்கோள் ஏவப்பட்டது", "ISRO Satellite Launch Success: Advanced Earth Observation Satellite Switched On", "ஸ்ரீஹரிகோட்டா விண்வெளி தளத்தில் இருந்து வெற்றிகரமாக செலுத்தப்பட்ட புதிய புவி கண்காணிப்பு செயற்கைக்கோள் சுற்றுப்பாதையில் நிலைநிறுத்தப்பட்டது."}
            });

            String[][] defaultTemplate = new String[][]{
                {"முக்கிய செய்திகள் மற்றும் புதுப்பிப்புகள்: புதிய அறிவிப்பு", "Major News Updates: Key Announcements Released Today", "பொதுமக்கள் நலன் மற்றும் உள்கட்டமைப்பு சார்ந்த புதிய அறிவிப்புகள் மற்றும் தகவல்கள் விரிவாக வெளியிடப்பட்டுள்ளன."},
                {"வளர்ச்சி திட்டங்கள் மற்றும் புதிய முன்முயற்சிகள்", "Developmental Projects and Strategic Initiatives Launched", "மாவட்டங்கள் தோறும் மேற்கொள்ளப்பட்டு வரும் உள்கட்டமைப்பு பணிகளின் தற்போதைய நிலவரம் குறித்து ஆய்வுக் கூட்டம் நடைபெற்றது."},
                {"சிறப்பு நிகழ்வுகள் மற்றும் செயல்பாடுகள் நேரடி பதிவு", "Special Coverage on Live Events and Civic Activities", "நகர்ப்புற மேம்பாடு மற்றும் பொது சுகாதார சேவைகளை விரைவுபடுத்த சிறப்பு குழுக்கள் அமைக்கப்பட்டு நடவடிக்கைகள் தீவிரப்படுத்தப்பட்டுள்ளன."}
            };

            int totalSeeded = 0;
            int imgIndex = 0;

            for (Category cat : categories) {
                long existingCount = articleRepository.countByCategoryId(cat.getId());
                int targetCount = 50;
                int toAdd = (int) (targetCount - existingCount);
                if (toAdd <= 0) continue;

                String catSlug = cat.getSlug() != null ? cat.getSlug().toLowerCase() : "";
                String[][] templates = categoryTemplates.getOrDefault(catSlug, defaultTemplate);

                for (int i = 1; i <= toAdd; i++) {
                    String[] template = templates[(i - 1) % templates.length];
                    Article article = new Article();
                    article.setCategoryId(cat.getId());
                    
                    String seqTag = " #" + (existingCount + i);
                    article.setTitleTa(template[0] + seqTag);
                    article.setTitleEn(template[1] + seqTag);
                    
                    article.setContentTa("<p>" + template[2] + "</p><p>இந்த செய்தி குறித்து மேலும் விவரங்கள் மற்றும் கருத்துக்களை Kings 24x7 செய்தித் தளத்தில் தொடர்ந்து பெறலாம்.</p>");
                    article.setContentEn("<p>" + template[1] + "</p><p>" + template[2] + "</p><p>Stay tuned to Kings 24x7 for continuous updates on this developing story.</p>");
                    
                    article.setShortDescTa(template[2]);
                    article.setShortDescEn(template[1]);
                    
                    article.setImageUrl(sampleImages[imgIndex % sampleImages.length]);
                    imgIndex++;

                    article.setViewsCount(100 + (i * 23) % 1500);
                    article.setStatus("published");
                    article.setPublishedAt(LocalDateTime.now().minusHours(i * 3));
                    article.setSlug(catSlug + "-news-item-" + (existingCount + i) + "-" + (System.currentTimeMillis() % 100000) + i);
                    article.setMetaTitle(template[1]);
                    article.setMetaDescription(template[2]);
                    article.setMetaKeywords(catSlug + ", news, tamil, india, updates");
                    article.setFocusKeywords(catSlug + " news");
                    article.setAuthorName("Kings TV Desk");

                    articleRepository.save(article);
                    totalSeeded++;
                }
            }
            if (totalSeeded > 0) {
                System.out.println("Successfully seeded " + totalSeeded + " dynamic articles across database categories.");
            }
        } catch (Exception e) {
            System.err.println("Failed to seed fifty articles per category: " + e.getMessage());
        }
    }

    private void syncStandardWebCategories() {
        try {
            System.out.println("Synchronizing standard web categories & subcategories...");
            
            // 1. Politics
            Category politics = seedOrUpdateCategory("Politics", "அரசியல்", "politics", 1, "fas fa-newspaper");
            seedOrUpdateSubCategory(politics.getId(), "State", "மாநிலம்", "state", 1);
            seedOrUpdateSubCategory(politics.getId(), "National", "தேசியம்", "national", 2);
            seedOrUpdateSubCategory(politics.getId(), "Governance", "அரசு கொள்கைகள்", "governance", 3);

            // 2. Business
            Category business = seedOrUpdateCategory("Business", "வணிகம்", "business", 2, "fas fa-briefcase");
            seedOrUpdateSubCategory(business.getId(), "Markets", "சந்தை", "markets", 1);
            seedOrUpdateSubCategory(business.getId(), "Companies", "நிறுவனங்கள்", "companies", 2);
            seedOrUpdateSubCategory(business.getId(), "Investment", "முதலீடு", "investment", 3);
            seedOrUpdateSubCategory(business.getId(), "Startups", "ஸ்டார்ட்அப்", "startups", 4);

            // 3. Sports
            Category sports = seedOrUpdateCategory("Sports", "விளையாட்டு", "sports", 3, "fas fa-trophy");
            seedOrUpdateSubCategory(sports.getId(), "Cricket", "கிரிக்கெட்", "cricket", 1);
            seedOrUpdateSubCategory(sports.getId(), "Football", "கால்பந்து", "football", 2);
            seedOrUpdateSubCategory(sports.getId(), "Tennis", "டென்னிஸ்", "tennis", 3);
            seedOrUpdateSubCategory(sports.getId(), "Local Sports", "உள்ளூர்", "local-sports", 4);

            // 4. Cinema
            Category cinema = seedOrUpdateCategory("Cinema", "சினிமா", "cinema", 4, "fas fa-film");
            seedOrUpdateSubCategory(cinema.getId(), "Kollywood", "கோலிவுட்", "kollywood", 1);
            seedOrUpdateSubCategory(cinema.getId(), "Bollywood", "பாலிவுட்", "bollywood", 2);
            seedOrUpdateSubCategory(cinema.getId(), "Reviews", "விமர்சனங்கள்", "reviews", 3);
            seedOrUpdateSubCategory(cinema.getId(), "Music", "இசை", "music", 4);

            // 5. Technology
            Category tech = seedOrUpdateCategory("Technology", "தொழில்நுட்பம்", "tech", 5, "fas fa-laptop");
            seedOrUpdateSubCategory(tech.getId(), "Smartphones", "ஸ்மார்ட்போன்", "smartphones", 1);
            seedOrUpdateSubCategory(tech.getId(), "Software", "மென்பொருள்", "software", 2);
            seedOrUpdateSubCategory(tech.getId(), "AI", "செயற்கை நுண்ணறிவு", "ai", 3);
            seedOrUpdateSubCategory(tech.getId(), "Space", "விண்வெளி", "space", 4);

            // 6. Regional
            Category regional = seedOrUpdateCategory("Regional", "மண்டலம்", "regional", 6, "fas fa-map-marked-alt");
            seedOrUpdateSubCategory(regional.getId(), "Tamil Nadu", "தமிழ்நாடு", "regional-tamilnadu", 1);
            seedOrUpdateSubCategory(regional.getId(), "Districts", "மாவட்டங்கள்", "districts", 2);

            // 7. International
            Category international = seedOrUpdateCategory("International", "சர்வதேசம்", "international", 7, "fas fa-globe");
            seedOrUpdateSubCategory(international.getId(), "World News", "உலக செய்திகள்", "world-news", 1);
            seedOrUpdateSubCategory(international.getId(), "Neighboring Countries", "அண்டை நாடுகள்", "neighbors", 2);

            // 8. Events
            seedOrUpdateCategory("Events", "நிகழ்ச்சிகள்", "events", 8, "fas fa-calendar-alt");

            // 9. Donations
            seedOrUpdateCategory("Donations", "தானம்", "donations", 9, "fas fa-hand-holding-heart");

            // Deactivate legacy categories so only the main web categories remain
            String[] legacySlugs = {"tamilnadu", "india", "lifestyle", "crime", "education", "agriculture"};
            for (String legacySlug : legacySlugs) {
                categoryRepository.findBySlug(legacySlug).ifPresent(c -> {
                    c.setIsActive(false);
                    c.setIsNav(false);
                    categoryRepository.save(c);
                });
            }

            System.out.println("Categories & SubCategories synchronized successfully.");
        } catch (Exception e) {
            System.err.println("Could not sync categories & subcategories: " + e.getMessage());
        }
    }

    private Category seedOrUpdateCategory(String nameEn, String nameTa, String slug, int displayOrder, String icon) {
        Optional<Category> opt = categoryRepository.findBySlug(slug);
        Category cat = opt.orElseGet(Category::new);
        cat.setName(nameEn);
        cat.setNameTa(nameTa);
        cat.setSlug(slug);
        cat.setDisplayOrder(displayOrder);
        cat.setIcon(icon);
        cat.setIsNav(true);
        cat.setIsActive(true);
        return categoryRepository.save(cat);
    }

    private SubCategory seedOrUpdateSubCategory(Long categoryId, String nameEn, String nameTa, String slug, int displayOrder) {
        Optional<SubCategory> opt = subCategoryRepository.findBySlug(slug);
        SubCategory sub = opt.orElseGet(SubCategory::new);
        sub.setCategoryId(categoryId);
        sub.setName(nameEn);
        sub.setNameTa(nameTa);
        sub.setSlug(slug);
        sub.setDisplayOrder(displayOrder);
        sub.setStatus("active");
        return subCategoryRepository.save(sub);
    }

    private void seedNavigationMenus() {
        try {
            // Delete old navigation menus to force-refresh order requested by user
            navigationMenuRepository.deleteAll();

            System.out.println("Seeding default navigation menus in custom order...");

            // 1. Home Link -> Path: "/"
            createNavMenu("Home", "முகப்பு", "/", 1, null);

            // 2. நம்ம ஊர் -> Path: "/directory"
            NavigationMenu regional = createNavMenu("Regional", "நம்ம ஊர்", "/directory", 2, null);
            createNavMenu("Local Business", "உள்ளூர் வணிகம்", "/directory", 1, regional.getId());
            createNavMenu("Deals", "சலுகைகள்", "/deals", 2, regional.getId());
            createNavMenu("RFQ", "கோரிக்கைகள்", "/rfq", 3, regional.getId());

            // 3. செய்திகள் -> Path: "/News"
            createNavMenu("News", "செய்திகள்", "/News", 3, null);

            // 4. புகார் -> Path: "/submit-report"
            createNavMenu("Complaints", "புகார்", "/submit-report", 4, null);

            // 5. நிகழ்ச்சிகள் -> Path: "/category/events"
            createNavMenu("Events", "நிகழ்ச்சிகள்", "/category/events", 5, null);

            // 6. வாழ்த்து -> Path: "/wishes"
            createNavMenu("Wishes", "வாழ்த்து", "/wishes", 6, null);

            // 7. இரங்கல் -> Path: "/obituaries"
            createNavMenu("Obituaries", "இரங்கல்", "/obituaries", 7, null);

            // 8. தானம் -> Path: "/category/donations"
            createNavMenu("Donations", "தானம்", "/category/donations", 8, null);

            // 9. வேலை -> Path: "/jobs"
            createNavMenu("Jobs", "வேலை", "/jobs", 9, null);

            // 10. தள்ளுபடி -> Path: "/deals"
            createNavMenu("Discounts", "தள்ளுபடி", "/deals", 10, null);

            // 11. வாங்க விற்க -> Path: "/classifieds"
            createNavMenu("Classifieds", "வாங்க விற்க", "/classifieds", 11, null);

            System.out.println("Default Navigation Menus seeded successfully.");
        } catch (Exception e) {
            System.err.println("Could not seed navigation menus: " + e.getMessage());
        }
    }

    private NavigationMenu createNavMenu(String titleEn, String titleTa, String linkUrl, int displayOrder, Long parentId) {
        NavigationMenu menu = new NavigationMenu();
        menu.setTitleEn(titleEn);
        menu.setTitleTa(titleTa);
        menu.setLinkUrl(linkUrl);
        menu.setDisplayOrder(displayOrder);
        menu.setParentId(parentId);
        menu.setIsActive(true);
        return navigationMenuRepository.save(menu);
    }
}
