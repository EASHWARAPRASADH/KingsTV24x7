package com.kingstv.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import com.kingstv.security.JwtAuthenticationFilter;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000,http://localhost:8080}")
    private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; media-src 'self' https:; frame-src 'self' https:; connect-src 'self' https:;"))
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(contentType -> {}) // standard spring security default is nosniff anyway
                .referrerPolicy(referrer -> referrer.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .permissionsPolicy(permissions -> permissions.policy("geolocation=(self), microphone=(), camera=()"))
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/",
                    "/api/v1/auth/**", 
                    "/api/auth/**",
                    "/uploads/**",
                    "/api/v1/health", 
                    "/api/v1/breaking-news", "/api/v1/breaking-news/**",
                    "/api/v1/articles", "/api/v1/articles/**",
                    "/api/v1/categories", "/api/v1/categories/**",
                    "/api/v1/subcategories", "/api/v1/subcategories/**",
                    "/api/v1/videos", "/api/v1/videos/**",
                    "/api/v1/pdfs", "/api/v1/pdfs/**",
                    "/api/v1/jobs", "/api/v1/jobs/**",
                    "/api/jobs", "/api/jobs/**",
                    "/api/resume/**", "/api/candidate/**",
                    "/api/obituaries", "/api/obituaries/**",
                    "/api/v1/classifieds", "/api/v1/classifieds/**",
                    "/api/classifieds", "/api/classifieds/**",
                    "/api/v1/wishes", "/api/v1/wishes/**",
                    "/api/wishes", "/api/wishes/**",
                    "/api/v1/obituaries", "/api/v1/obituaries/**",
                    "/api/v1/directory", "/api/v1/directory/**",
                    "/api/v1/districts", "/api/v1/districts/**",
                    "/api/v1/weather", "/api/v1/weather/**", "/api/weather", "/api/weather/**",
                    "/api/v1/home", "/api/v1/home/**",
                    "/api/v1/stories", "/api/v1/stories/**",
                    "/api/v1/web-stories", "/api/v1/web-stories/**",
                    "/api/v1/pages", "/api/v1/pages/**",
                    "/api/v1/comments", "/api/v1/comments/**",
                    "/api/v1/report-news", "/api/v1/report-news/**",
                    "/api/v1/public/**",
                    "/t/{shortCode}",
                    "/api/v1/deals", "/api/v1/deals/**",
                    "/api/v1/rfq", "/api/v1/rfq/**",
                    "/api/v1/nfc/stats", "/api/v1/nfc/taps", "/api/v1/nfc/request",
                    "/api/v1/rss-aggregator", "/api/v1/rss-aggregator/**",
                    "/api/v1/analytics/trending-keywords",
                    "/api/v1/advertisements", "/api/v1/advertisements/**",
                    "/robots.txt", "/sitemap.xml", "/rss.xml", "/news/**",
                    "/swagger-ui/**",
                    "/swagger-ui/index.html",
                    "/swagger-ui.html",
                    "/v3/api-docs",
                    "/v3/api-docs/**",
                    "/v3/api-docs.yaml",
                    "/ws/**",
                    "/actuator/health",
                    "/actuator/**",
                    "/api/uptime",
                    "/api/v1/uptime",
                    "/error"
                ).permitAll()
                // Admin & user portal endpoints require authentication
                .requestMatchers("/api/v1/admin/**", "/api/sellers/**", "/api/my-classifieds", "/api/employer/**").authenticated()
                .anyRequest().authenticated()
            )
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"" + authException.getMessage() + "\"}");
                })
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        org.springframework.web.filter.CharacterEncodingFilter encodingFilter = new org.springframework.web.filter.CharacterEncodingFilter();
        encodingFilter.setEncoding("UTF-8");
        encodingFilter.setForceEncoding(true);
        http.addFilterBefore(encodingFilter, org.springframework.security.web.header.HeaderWriterFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream((allowedOrigins != null ? allowedOrigins : "").split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        if (origins.isEmpty()) {
            origins = Arrays.asList(
                "https://king-tv.test-technoprint.online",
                "https://www.king-tv.test-technoprint.online",
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:8080"
            );
        }

        config.setAllowedOriginPatterns(origins);
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        config.setExposedHeaders(Arrays.asList("Authorization", "Content-Type", "Access-Control-Allow-Origin", "Access-Control-Allow-Credentials"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
