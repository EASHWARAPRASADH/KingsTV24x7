package com.kingstv.controllers;

import com.kingstv.models.User;
import com.kingstv.models.RefreshToken;
import com.kingstv.models.PasswordResetOtp;
import com.kingstv.repository.UserRepository;
import com.kingstv.repository.RefreshTokenRepository;
import com.kingstv.repository.PasswordResetOtpRepository;
import com.kingstv.security.JwtUtil;
import com.kingstv.services.LoginAttemptService;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

import com.kingstv.models.AuditLog;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;

@Tag(name = "Authentication", description = "User registration, login, 2FA, OTP, token refresh operations")
@RestController
@RequestMapping({"/api/v1/auth", "/api/auth"})
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private final SecureRandom secureRandom = new SecureRandom();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordResetOtpRepository otpRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private com.kingstv.repository.RoleRepository roleRepository;

    @Autowired
    private com.kingstv.repository.AuditLogRepository auditLogRepository;

    @Autowired
    private LoginAttemptService loginAttemptService;

    @Autowired
    private com.kingstv.services.SystemConfigService systemConfigService;

    @Autowired
    private com.kingstv.services.SmsService smsService;

    private final Map<String, String> temp2faSessions = new ConcurrentHashMap<>();

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");

    private String createRefreshToken(User user) {
        Optional<RefreshToken> existing = refreshTokenRepository.findByUser(user);
        existing.ifPresent(token -> refreshTokenRepository.delete(token));

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshTokenRepository.save(refreshToken);
        return refreshToken.getToken();
    }

    private List<String> getUserPermissions(User user) {
        if (user == null || user.getRole() == null) return Collections.emptyList();
        return roleRepository.findByName(user.getRole())
                .map(role -> role.getPermissions() != null ? role.getPermissions().stream()
                        .filter(Objects::nonNull)
                        .map(com.kingstv.models.Permission::getName)
                        .filter(Objects::nonNull)
                        .collect(java.util.stream.Collectors.toList()) : Collections.<String>emptyList())
                .orElse(Collections.emptyList());
    }

    private Map<String, Object> buildUserMap(User user) {
        Map<String, Object> userMap = new HashMap<>();
        if (user != null) {
            userMap.put("id", user.getId());
            userMap.put("fullName", user.getFullName() != null ? user.getFullName() : "");
            userMap.put("email", user.getEmail() != null ? user.getEmail() : "");
            userMap.put("provider", user.getProvider() != null ? user.getProvider() : "LOCAL");
            userMap.put("role", user.getRole() != null ? user.getRole() : "READER");
            userMap.put("profileImage", user.getProfileImage() != null ? user.getProfileImage() : "");
            userMap.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : LocalDateTime.now().toString());
            userMap.put("lastLogin", user.getLastLogin() != null ? user.getLastLogin().toString() : LocalDateTime.now().toString());
        }
        return userMap;
    }

    @Operation(summary = "Register new user account", description = "Creates a new user with READER role and returns access and refresh JWT tokens.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "User registered successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid payload or password requirements not met"),
        @ApiResponse(responseCode = "409", description = "Email address already registered")
    })
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        String fullName = request.get("fullName");
        String email = request.get("email");
        String password = request.get("password");

        String location = request.get("location");
        String interests = request.get("interests");

        if (fullName == null || fullName.trim().isEmpty() || email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Full Name, Email, and Password are required"));
        }

        if (!EMAIL_PATTERN.matcher(email).matches()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid email address format"));
        }

        if (password.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 8 characters long"));
        }

        if (userRepository.findByEmail(email.toLowerCase()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Email is already registered"));
        }

        User user = new User();
        user.setFullName(fullName);
        user.setEmail(email.toLowerCase());
        user.setPassword(passwordEncoder.encode(password));
        user.setRole("READER"); // seed as READER by default
        user.setProvider("LOCAL");
        user.setIsVerified(false);
        user.setIsActive(true);
        user.setLastLogin(LocalDateTime.now());
        
        if (location != null && !location.trim().isEmpty()) {
            user.setLocation(location.trim());
        }
        if (interests != null && !interests.trim().isEmpty()) {
            user.setInterests(interests.trim());
        }

        User savedUser = userRepository.save(user);

        String accessToken = jwtUtil.generateToken(savedUser.getEmail(), savedUser.getRole(), savedUser.getId(), getUserPermissions(savedUser));
        String refreshToken = createRefreshToken(savedUser);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Registration successful");
        response.put("accessToken", accessToken);
        response.put("refreshToken", refreshToken);
        response.put("user", buildUserMap(savedUser));

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String email = request.get("email");
        String password = request.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and Password are required"));
        }

        email = email.trim().toLowerCase();
        String ipAddress = httpRequest != null ? httpRequest.getRemoteAddr() : "127.0.0.1";

        if (loginAttemptService.isBlocked(email)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Account locked out due to multiple failed login attempts. Please try again in 15 minutes."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            loginAttemptService.loginFailed(email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid email or password"));
        }

        User user = userOpt.get();

        if (Boolean.FALSE.equals(user.getIsActive())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Your account has been deactivated. Please contact administrator."));
        }

        String provider = user.getProvider() != null ? user.getProvider() : "LOCAL";

        if (!passwordEncoder.matches(password, user.getPassword())) {
            loginAttemptService.loginFailed(email);
            int remaining = loginAttemptService.getRemainingAttempts(email);
            String providerNote = (!"LOCAL".equalsIgnoreCase(provider)) ? " (Note: Account was created via " + provider + ")" : "";
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email or password" + providerNote + ". Remaining attempts: " + remaining));
        }

        if (!"LOCAL".equalsIgnoreCase(user.getProvider())) {
            user.setProvider("LOCAL");
        }

        // Check if 2FA is enabled
        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            String tempSessionId = UUID.randomUUID().toString();
            temp2faSessions.put(tempSessionId, user.getEmail());
            return ResponseEntity.ok(Map.of(
                "twoFactorRequired", true,
                "tempSessionId", tempSessionId
            ));
        }

        loginAttemptService.loginSucceeded(email);
        loginAttemptService.loginSucceeded(ipAddress);

        user.setLastLogin(LocalDateTime.now());
        User savedUser = userRepository.save(user);

        String accessToken = jwtUtil.generateToken(savedUser.getEmail(), savedUser.getRole(), savedUser.getId(), getUserPermissions(savedUser));
        String refreshToken = createRefreshToken(savedUser);

        // Record Audit Log entry for login action
        try {
            AuditLog log = new AuditLog();
            log.setActorId(savedUser.getId());
            log.setActorEmail(savedUser.getEmail());
            log.setActorRole(savedUser.getRole());
            log.setActionType("LOGIN");
            log.setEntityType("USER");
            log.setEntityId(savedUser.getId());
            log.setDetails("Logged in successfully via LOCAL credentials");
            log.setIpAddress(ipAddress);
            auditLogRepository.save(log);
        } catch (Exception ex) {
            System.err.println("Audit log save failed: " + ex.getMessage());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Login successful");
        response.put("accessToken", accessToken);
        response.put("refreshToken", refreshToken);
        response.put("user", buildUserMap(savedUser));

        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody Map<String, String> request) {
        String refreshTokenVal = request.get("refreshToken");
        if (refreshTokenVal != null) {
            Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByToken(refreshTokenVal);
            tokenOpt.ifPresent(token -> refreshTokenRepository.delete(token));
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> request) {
        String tokenVal = request.get("refreshToken");
        if (tokenVal == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Refresh Token is required"));
        }

        Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByToken(tokenVal);
        if (tokenOpt.isEmpty() || tokenOpt.get().getExpiryDate().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Expired or invalid refresh token"));
        }

        User user = tokenOpt.get().getUser();
        String newAccessToken = jwtUtil.generateToken(user.getEmail(), user.getRole(), user.getId(), getUserPermissions(user));
        return ResponseEntity.ok(Map.of("accessToken", newAccessToken, "refreshToken", tokenVal));
    }

    private ResponseEntity<?> processSocialLogin(String email, String name, String profileImage, String provider) {
        if (email == null || name == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and name are required from social provider"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        User user;

        if (userOpt.isPresent()) {
            user = userOpt.get();
            if (user.getProvider().equals("LOCAL")) {
                user.setProvider(provider);
            }
            if (profileImage != null && (user.getProfileImage() == null || user.getProfileImage().isEmpty())) {
                user.setProfileImage(profileImage);
            }
            user.setLastLogin(LocalDateTime.now());
            user = userRepository.save(user);
        } else {
            user = new User();
            user.setFullName(name);
            user.setEmail(email.toLowerCase());
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setProvider(provider);
            user.setProfileImage(profileImage != null ? profileImage : "");
            user.setRole("READER");
            user.setIsVerified(true);
            user.setIsActive(true);
            user.setLastLogin(LocalDateTime.now());
            user = userRepository.save(user);
        }

        String accessToken = jwtUtil.generateToken(user.getEmail(), user.getRole(), user.getId(), getUserPermissions(user));
        String refreshToken = createRefreshToken(user);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Social login successful");
        response.put("accessToken", accessToken);
        response.put("refreshToken", refreshToken);
        response.put("user", buildUserMap(user));

        return ResponseEntity.ok(response);
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> request) {
        return processSocialLogin(request.get("email"), request.get("name"), request.get("profileImage"), "GOOGLE");
    }

    @PostMapping("/apple")
    public ResponseEntity<?> appleLogin(@RequestBody Map<String, String> request) {
        return processSocialLogin(request.get("email"), request.get("name"), null, "APPLE");
    }

    @PostMapping("/facebook")
    public ResponseEntity<?> facebookLogin(@RequestBody Map<String, String> request) {
        return processSocialLogin(request.get("email"), request.get("name"), request.get("profileImage"), "FACEBOOK");
    }

    @PostMapping("/send-sms-otp")
    public ResponseEntity<?> sendSmsOtp(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Phone number is required"));
        }

        String cleanPhone = phoneNumber.replaceAll("[^0-9]", "");
        if (cleanPhone.length() < 10) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid phone number"));
        }

        // Generate a cryptographically secure 6-digit OTP
        String otp = String.format("%06d", secureRandom.nextInt(1000000));

        // Use cleanPhone to save OTP in password_reset_otps table
        String lookupKey = "phone_" + cleanPhone;
        List<PasswordResetOtp> existingOtps = otpRepository.findByEmail(lookupKey);
        if (!existingOtps.isEmpty()) {
            otpRepository.deleteAll(existingOtps);
        }

        PasswordResetOtp resetOtp = new PasswordResetOtp();
        resetOtp.setEmail(lookupKey);
        resetOtp.setOtpCode(otp);
        resetOtp.setExpiryTime(LocalDateTime.now().plusMinutes(5));
        resetOtp.setIsVerified(false);
        otpRepository.save(resetOtp);

        boolean sent = smsService.sendOtpSms(cleanPhone, otp);

        Map<String, Object> response = new HashMap<>();
        if (sent) {
            response.put("message", "SMS OTP sent successfully!");
            response.put("sandbox", false);
        } else {
            response.put("message", "SMS Gateway not configured. OTP logged successfully.");
            response.put("sandbox", true);
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-sms-otp")
    public ResponseEntity<?> verifySmsOtp(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        String otp = request.get("otpCode");

        if (phoneNumber == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Phone number and OTP code are required"));
        }

        String cleanPhone = phoneNumber.replaceAll("[^0-9]", "");
        String lookupKey = "phone_" + cleanPhone;

        Optional<PasswordResetOtp> otpOpt = otpRepository.findByEmailAndOtpCode(lookupKey, otp);
        if (otpOpt.isEmpty() || otpOpt.get().getExpiryTime().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid or expired OTP code"));
        }

        PasswordResetOtp resetOtp = otpOpt.get();
        resetOtp.setIsVerified(true);
        otpRepository.save(resetOtp);

        // Delete verified OTP to prevent reuse
        otpRepository.delete(resetOtp);

        // Perform login/registration
        String mockEmail = "phone_" + cleanPhone + "@king24x7.com";
        String mockName = "Phone User " + (cleanPhone.length() > 4 ? cleanPhone.substring(cleanPhone.length() - 4) : cleanPhone);
        
        return processSocialLogin(mockEmail, mockName, null, "PHONE");
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "No account registered with this email address"));
        }

        String otp = String.format("%06d", secureRandom.nextInt(1000000));
        
        List<PasswordResetOtp> existingOtps = otpRepository.findByEmail(email.toLowerCase());
        if (!existingOtps.isEmpty()) {
            otpRepository.deleteAll(existingOtps);
        }

        PasswordResetOtp resetOtp = new PasswordResetOtp();
        resetOtp.setEmail(email.toLowerCase());
        resetOtp.setOtpCode(otp);
        resetOtp.setExpiryTime(LocalDateTime.now().plusMinutes(15));
        resetOtp.setIsVerified(false);
        otpRepository.save(resetOtp);

        log.info("Password reset OTP generated for account: {}", email);

        return ResponseEntity.ok(Map.of("message", "Password reset OTP has been sent to your registered email/phone."));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");

        if (email == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and OTP code are required"));
        }

        Optional<PasswordResetOtp> otpOpt = otpRepository.findByEmailAndOtpCode(email.toLowerCase(), otp);
        if (otpOpt.isEmpty() || otpOpt.get().getExpiryTime().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid or expired OTP code"));
        }

        PasswordResetOtp resetOtp = otpOpt.get();
        resetOtp.setIsVerified(true);
        otpRepository.save(resetOtp);

        return ResponseEntity.ok(Map.of("message", "OTP verified successfully. You can now reset your password."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");

        if (email == null || otp == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email, OTP, and New Password are required"));
        }

        if (newPassword.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "New password must be at least 8 characters long"));
        }

        Optional<PasswordResetOtp> otpOpt = otpRepository.findByEmailAndOtpCode(email.toLowerCase(), otp);
        if (otpOpt.isEmpty() || !otpOpt.get().getIsVerified()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "OTP has not been verified. Cannot reset password."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        otpRepository.delete(otpOpt.get());

        return ResponseEntity.ok(Map.of("message", "Password reset successfully. Please log in with your new password."));
    }

    @PostMapping("/2fa/setup")
    public ResponseEntity<?> setup2fa() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        }
        String email = (String) auth.getPrincipal();
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        User user = userOpt.get();

        GoogleAuthenticator gAuth = new GoogleAuthenticator();
        GoogleAuthenticatorKey key = gAuth.createCredentials();
        String secret = key.getKey();

        user.setTwoFactorSecret(secret);
        userRepository.save(user);

        String qrCodeUrl = "otpauth://totp/KINGS24x7:" + email + "?secret=" + secret + "&issuer=KINGS24x7";

        return ResponseEntity.ok(Map.of(
            "secret", secret,
            "qrCodeUrl", qrCodeUrl
        ));
    }

    @PostMapping("/2fa/verify")
    public ResponseEntity<?> verify2fa(@RequestBody Map<String, String> request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        }
        String codeStr = request.get("code");
        if (codeStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Verification code is required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(((String) auth.getPrincipal()).toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        User user = userOpt.get();

        if (user.getTwoFactorSecret() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "2FA setup has not been initiated. Call /2fa/setup first."));
        }

        try {
            int code = Integer.parseInt(codeStr);
            GoogleAuthenticator gAuth = new GoogleAuthenticator();
            boolean isAuthorized = gAuth.authorize(user.getTwoFactorSecret(), code);
            if (isAuthorized) {
                user.setTwoFactorEnabled(true);
                userRepository.save(user);
                return ResponseEntity.ok(Map.of("message", "2FA enabled successfully"));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid verification code"));
            }
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Code must be a 6-digit number"));
        }
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<?> disable2fa(@RequestBody Map<String, String> request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        }
        String codeStr = request.get("code");
        if (codeStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Verification code is required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(((String) auth.getPrincipal()).toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        User user = userOpt.get();

        if (!Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            return ResponseEntity.badRequest().body(Map.of("message", "2FA is not enabled"));
        }

        try {
            int code = Integer.parseInt(codeStr);
            GoogleAuthenticator gAuth = new GoogleAuthenticator();
            boolean isAuthorized = gAuth.authorize(user.getTwoFactorSecret(), code);
            if (isAuthorized) {
                user.setTwoFactorEnabled(false);
                user.setTwoFactorSecret(null);
                userRepository.save(user);
                return ResponseEntity.ok(Map.of("message", "2FA disabled successfully"));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid verification code"));
            }
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Code must be a 6-digit number"));
        }
    }

    @PostMapping("/2fa/login")
    public ResponseEntity<?> login2fa(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String tempSessionId = request.get("tempSessionId");
        String codeStr = request.get("code");

        if (tempSessionId == null || codeStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "tempSessionId and verification code are required"));
        }

        String email = temp2faSessions.get(tempSessionId);
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid or expired 2FA session"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }

        User user = userOpt.get();
        String ipAddress = httpRequest != null ? httpRequest.getRemoteAddr() : "127.0.0.1";

        if (loginAttemptService.isBlocked(user.getEmail())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Account locked out due to multiple failed login attempts. Try again in 15 minutes."));
        }

        try {
            int code = Integer.parseInt(codeStr);
            GoogleAuthenticator gAuth = new GoogleAuthenticator();
            boolean isAuthorized = gAuth.authorize(user.getTwoFactorSecret(), code);
            if (!isAuthorized) {
                loginAttemptService.loginFailed(user.getEmail());
                int remaining = loginAttemptService.getRemainingAttempts(user.getEmail());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Invalid verification code. Remaining attempts: " + remaining));
            }

            // Success! Generate final tokens
            temp2faSessions.remove(tempSessionId);
            loginAttemptService.loginSucceeded(user.getEmail());
            loginAttemptService.loginSucceeded(ipAddress);

            user.setLastLogin(LocalDateTime.now());
            User savedUser = userRepository.save(user);

            String accessToken = jwtUtil.generateToken(savedUser.getEmail(), savedUser.getRole(), savedUser.getId(), getUserPermissions(savedUser));
            String refreshToken = createRefreshToken(savedUser);

            // Record Audit Log entry for login action
            try {
                AuditLog log = new AuditLog();
                log.setActorId(savedUser.getId());
                log.setActorEmail(savedUser.getEmail());
                log.setActorRole(savedUser.getRole());
                log.setActionType("LOGIN");
                log.setEntityType("USER");
                log.setEntityId(savedUser.getId());
                log.setDetails("Logged in successfully via 2FA verification");
                log.setIpAddress(ipAddress);
                auditLogRepository.save(log);
            } catch (Exception ex) {
                System.err.println("Audit log save failed: " + ex.getMessage());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Login successful");
            response.put("accessToken", accessToken);
            response.put("refreshToken", refreshToken);
            response.put("user", buildUserMap(savedUser));

            return ResponseEntity.ok(response);

        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Code must be a 6-digit number"));
        }
    }
}
