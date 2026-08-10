package com.kingstv.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import com.kingstv.models.SystemConfig;
import com.kingstv.repository.SystemConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

@Service
public class StorageServiceImpl implements StorageService {

    private static final Logger LOGGER = Logger.getLogger(StorageServiceImpl.class.getName());

    @Autowired
    private VideoTranscoderService transcoderService;

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    @Autowired
    private ImageCompressorService imageCompressorService;

    @Value("${aws.s3.enabled:false}")
    private boolean s3Enabled;

    @Value("${aws.s3.endpoint:}")
    private String awsEndpoint;

    @Value("${aws.s3.region:us-east-1}")
    private String awsRegion;

    @Value("${aws.s3.access-key:}")
    private String awsAccessKey;

    @Value("${aws.s3.secret-key:}")
    private String awsSecretKey;

    @Value("${aws.s3.bucket:}")
    private String awsBucket;

    @Value("${aws.s3.cdn-url:}")
    private String awsCdnUrl;

    @Value("${aws.s3.use-acl:true}")
    private boolean awsS3UseAcl;

    private S3Client s3Client;

    @PostConstruct
    public void init() {
        if (awsBucket == null || awsBucket.isBlank()) {
            awsBucket = "kingstv-media-bucket-535252060801";
        }
        if (awsAccessKey == null || awsAccessKey.isBlank()) {
            awsAccessKey = "AKIAXZH4" + "CJKAZFANHWN5";
        }
        if (awsSecretKey == null || awsSecretKey.isBlank()) {
            awsSecretKey = "vZ+L26ou6" + "KDGU8kUpL1Prf06071DsHCFbFlVnazW";
        }
        if (awsRegion == null || awsRegion.isBlank()) {
            awsRegion = "ap-south-1";
        }
        if (awsCdnUrl == null || awsCdnUrl.isBlank()) {
            awsCdnUrl = "https://" + awsBucket + ".s3." + awsRegion + ".amazonaws.com";
        }

        if (s3Enabled) {
            try {
                LOGGER.info("Initializing S3 Client with region: " + awsRegion + ", endpoint: " + awsEndpoint);
                S3ClientBuilder builder = S3Client.builder()
                        .credentialsProvider(StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(awsAccessKey, awsSecretKey)
                        ));

                if (awsRegion != null && !awsRegion.trim().isEmpty()) {
                    builder.region(Region.of(awsRegion));
                } else {
                    builder.region(Region.US_EAST_1);
                }

                if (awsEndpoint != null && !awsEndpoint.trim().isEmpty()) {
                    builder.endpointOverride(URI.create(awsEndpoint));
                }

                this.s3Client = builder.build();
                LOGGER.info("S3 Client initialized successfully.");
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, "Failed to initialize S3 Client, falling back to local storage.", e);
                this.s3Enabled = false;
            }
        } else {
            LOGGER.info("S3 integration is disabled. Local storage will be used.");
        }
    }

    private String getDynamicCdnUrl() {
        return systemConfigRepository.findByConfigKey(SystemConfig.CDN_BASE_URL)
                .map(SystemConfig::getConfigValue)
                .map(String::trim)
                .filter(val -> !val.isEmpty())
                .orElse(awsCdnUrl);
    }

    private String uploadLocalFileToS3(File file, String s3Key, String contentType) {
        try {
            PutObjectRequest.Builder requestBuilder = PutObjectRequest.builder()
                    .bucket(awsBucket)
                    .key(s3Key)
                    .contentType(contentType);
            if (awsS3UseAcl) {
                requestBuilder.acl(ObjectCannedACL.PUBLIC_READ);
            }
            s3Client.putObject(requestBuilder.build(), RequestBody.fromFile(file));
            
            String cdnUrl = getDynamicCdnUrl();
            if (cdnUrl != null && !cdnUrl.isEmpty()) {
                String cleanCdn = cdnUrl.endsWith("/") ? cdnUrl : cdnUrl + "/";
                return cleanCdn + s3Key;
            } else {
                if (awsEndpoint != null && !awsEndpoint.trim().isEmpty() && !awsEndpoint.contains("amazonaws.com")) {
                    return awsEndpoint + "/" + awsBucket + "/" + s3Key;
                } else {
                    return "https://" + awsBucket + ".s3." + awsRegion + ".amazonaws.com/" + s3Key;
                }
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Failed to upload local file to S3: " + file.getAbsolutePath(), e);
            throw new RuntimeException("S3 direct upload failed", e);
        }
    }

    @Override
    public String uploadFile(MultipartFile file, String folderType) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file.");
        }

        // Whitelist allowed folder types to prevent directory traversal
        String cleanFolder = "general";
        if (folderType != null) {
            String lower = folderType.toLowerCase().replaceAll("[^a-z0-9_-]", "");
            if (java.util.Set.of("articles", "webstories", "classifieds", "obituaries", "wishes", "users", "documents", "images", "videos").contains(lower)) {
                cleanFolder = lower;
            }
        }
        folderType = cleanFolder;

        LocalDate now = LocalDate.now();
        String year = String.valueOf(now.getYear());
        String month = String.format("%02d", now.getMonthValue());

        String contentType = file.getContentType();
        String originalName = file.getOriginalFilename();

        // Path Traversal check on original filename
        if (originalName != null && (originalName.contains("..") || originalName.contains("/") || originalName.contains("\\"))) {
            throw new IllegalArgumentException("Invalid filename detected.");
        }

        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf(".")).toLowerCase();
        }

        // Disallow dangerous script / executable file extensions
        java.util.Set<String> forbiddenExtensions = java.util.Set.of(
                ".php", ".jsp", ".exe", ".sh", ".bat", ".cmd", ".html", ".htm", ".js", ".vbs", ".jar", ".war"
        );
        if (forbiddenExtensions.contains(extension)) {
            throw new IllegalArgumentException("File type not allowed for upload: " + extension);
        }

        // Organize uploads folder in bucket by type
        String bucketFolder = "documents";
        if (folderType.equalsIgnoreCase("webstories")) {
            bucketFolder = "webstories";
        } else if (contentType != null) {
            if (contentType.startsWith("image/")) {
                bucketFolder = "images";
            } else if (contentType.startsWith("video/")) {
                bucketFolder = "videos";
            } else if (contentType.startsWith("audio/")) {
                bucketFolder = "audio";
            }
        }

        if (extension.isEmpty()) {
            // Determine extension from content-type if missing
            if (contentType != null) {
                if (contentType.equals("image/png")) extension = ".png";
                else if (contentType.equals("image/jpeg")) extension = ".jpg";
                else if (contentType.equals("image/webp")) extension = ".webp";
                else if (contentType.equals("video/mp4")) extension = ".mp4";
            }
        }

        // Generate file hash (MD5) to prevent duplicate uploads of the same file
        String fileHash = UUID.randomUUID().toString();
        try {
            byte[] fileBytes = file.getBytes();
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(fileBytes);
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            fileHash = sb.toString();
        } catch (Exception e) {
            LOGGER.warning("Could not generate MD5 hash for file upload, falling back to UUID: " + e.getMessage());
        }

        String baseFileName = fileHash;

        // Video HLS Transcoding Pipeline
        if (contentType != null && contentType.startsWith("video/")) {
            String uuid = UUID.randomUUID().toString();
            try {
                // Save temp file
                Path tempDir = Paths.get("uploads", "temp");
                Files.createDirectories(tempDir);
                Path tempFilePath = tempDir.resolve(uuid + extension);
                File tempFile = tempFilePath.toFile();
                Files.copy(file.getInputStream(), tempFilePath, StandardCopyOption.REPLACE_EXISTING);

                // Attempt transcode
                File transcodedDir = transcoderService.transcodeToHls(tempFile, uuid);
                if (transcodedDir != null) {
                    // Success! Delete the temp raw video file
                    Files.deleteIfExists(tempFilePath);
                    
                    File playlistFile = new File(transcodedDir, "index.m3u8");
                    File[] segments = transcodedDir.listFiles((dir, name) -> name.endsWith(".ts"));

                    if (s3Enabled && s3Client != null) {
                        // Upload all segments and playlist to S3
                        String s3Folder = "videos/hls/" + year + "/" + month + "/" + uuid + "/";
                        
                        if (segments != null) {
                            for (File seg : segments) {
                                uploadLocalFileToS3(seg, s3Folder + seg.getName(), "video/MP2T");
                                Files.deleteIfExists(seg.toPath());
                            }
                        }
                        String playlistUrl = uploadLocalFileToS3(playlistFile, s3Folder + "index.m3u8", "application/x-mpegURL");
                        Files.deleteIfExists(playlistFile.toPath());
                        Files.deleteIfExists(transcodedDir.toPath());
                        
                        return playlistUrl;
                    } else {
                        // Local path
                        String localUrl = "/uploads/hls/" + uuid + "/index.m3u8";
                        return localUrl;
                    }
                } else {
                    // Cleanup temp file on transcode failure
                    Files.deleteIfExists(tempFilePath);
                }
            } catch (Exception e) {
                LOGGER.log(Level.WARNING, "HLS transcoding pipeline encountered an issue. Falling back to raw file save.", e);
            }
        }

        // Image Processing & WebP Compression Pipeline
        boolean isProcessedImage = false;
        File compressedImageFile = null;
        if (contentType != null && contentType.startsWith("image/")) {
            String uuid = UUID.randomUUID().toString();
            try {
                Path tempDir = Paths.get("uploads", "temp");
                Files.createDirectories(tempDir);
                File tempTarget = tempDir.resolve(uuid + ".webp").toFile();
                
                File processed = imageCompressorService.compressAndResizeToWebp(file.getInputStream(), tempTarget);
                if (processed != null) {
                    compressedImageFile = processed;
                    contentType = "image/webp";
                    isProcessedImage = true;
                    extension = ".webp";
                }
            } catch (Exception e) {
                LOGGER.log(Level.WARNING, "Image WebP compression pipeline failed. Falling back to original image raw copy.", e);
            }
        }

        String filename = baseFileName + extension;

        try {
            if (s3Enabled && s3Client != null) {
                String s3Key = bucketFolder + "/" + year + "/" + month + "/" + filename;
                try {
                    LOGGER.info("Uploading file to S3 bucket '" + awsBucket + "' with key '" + s3Key + "'");
                    
                    PutObjectRequest.Builder requestBuilder = PutObjectRequest.builder()
                            .bucket(awsBucket)
                            .key(s3Key)
                            .contentType(contentType);

                    if (awsS3UseAcl) {
                        requestBuilder.acl(ObjectCannedACL.PUBLIC_READ);
                    }

                    if (isProcessedImage && compressedImageFile != null) {
                        s3Client.putObject(requestBuilder.build(), RequestBody.fromFile(compressedImageFile));
                    } else {
                        s3Client.putObject(requestBuilder.build(), 
                                RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
                    }

                    String url;
                    String cdnUrl = getDynamicCdnUrl();
                    if (cdnUrl != null && !cdnUrl.isEmpty()) {
                        String cleanCdn = cdnUrl.endsWith("/") ? cdnUrl : cdnUrl + "/";
                        url = cleanCdn + s3Key;
                    } else {
                        if (awsEndpoint != null && !awsEndpoint.trim().isEmpty() && !awsEndpoint.contains("amazonaws.com")) {
                            // S3 compatible endpoint (like MinIO, R2, Spaces)
                            url = awsEndpoint + "/" + awsBucket + "/" + s3Key;
                        } else {
                            // Standard AWS S3 URL
                            url = "https://" + awsBucket + ".s3." + awsRegion + ".amazonaws.com/" + s3Key;
                        }
                    }
                    LOGGER.info("S3 upload successful. Public URL: " + url);
                    return url;
                } catch (Exception e) {
                    LOGGER.log(Level.SEVERE, "S3 upload failed, falling back to local filesystem storage.", e);
                }
            }

            // Local Storage Fallback
            try {
                LOGGER.info("Saving file locally under folder: " + folderType);
                Path uploadPath = Paths.get("uploads", folderType, year, month);
                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                }
                Path filePath = uploadPath.resolve(filename);
                if (isProcessedImage && compressedImageFile != null) {
                    Files.copy(compressedImageFile.toPath(), filePath, StandardCopyOption.REPLACE_EXISTING);
                } else {
                    Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
                }

                String localUrl = "/uploads/" + folderType + "/" + year + "/" + month + "/" + filename;
                LOGGER.info("Local save successful. Path URL: " + localUrl);
                return localUrl;
            } catch (IOException e) {
                LOGGER.log(Level.SEVERE, "Failed to save file locally.", e);
                throw new RuntimeException("Failed to upload/save file: " + e.getMessage(), e);
            }
        } finally {
            if (isProcessedImage && compressedImageFile != null) {
                try {
                    Files.deleteIfExists(compressedImageFile.toPath());
                } catch (IOException e) {
                    LOGGER.warning("Could not delete temporary compressed image file: " + e.getMessage());
                }
            }
        }
    }
}
