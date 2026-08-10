package com.kingstv.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@RestController
@RequestMapping({"/api/v1/weather", "/api/weather"})
public class WeatherController {

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.kingstv.services.SystemConfigService systemConfigService;

    private String getApiKey() {
        String envKey = System.getenv("WEATHER_API_KEY");
        if (envKey != null && !envKey.isBlank()) return envKey.trim();
        if (systemConfigService != null) {
            String dbKey = systemConfigService.getConfigValue("weather.api_key");
            if (dbKey != null && !dbKey.isBlank()) return dbKey.trim();
        }
        return "093a08cc906ab147fe8d8f306a799653";
    }

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping
    public ResponseEntity<?> getWeather(@RequestParam(required = false) Double lat, 
                                         @RequestParam(required = false) Double lon,
                                         @RequestParam(required = false) String city) {
        double latitude = 13.0827;
        double longitude = 80.2707;
        String cityName = "Chennai";

        if (lat != null && lon != null) {
            latitude = lat;
            longitude = lon;
        } else if (city != null) {
            cityName = city;
            if (city.equalsIgnoreCase("Coimbatore")) {
                latitude = 11.0168; longitude = 76.9558;
            } else if (city.equalsIgnoreCase("Madurai")) {
                latitude = 9.9252; longitude = 78.1198;
            } else if (city.equalsIgnoreCase("Trichy") || city.equalsIgnoreCase("Tiruchirappalli")) {
                latitude = 10.7905; longitude = 78.7047;
            } else if (city.equalsIgnoreCase("Salem")) {
                latitude = 11.6643; longitude = 78.1460;
            } else if (city.equalsIgnoreCase("Erode")) {
                latitude = 11.3410; longitude = 77.7172;
            }
        }

        String activeKey = getApiKey();
        try {
            // 1. Fetch current weather from OpenWeatherMap
            String url = String.format(Locale.US, "https://api.openweathermap.org/data/2.5/weather?lat=%f&lon=%f&appid=%s&units=metric", 
                                       latitude, longitude, activeKey);
            Map<String, Object> currentResponse = restTemplate.getForObject(url, Map.class);

            // 2. Fetch 5-day forecast from OpenWeatherMap
            String forecastUrl = String.format(Locale.US, "https://api.openweathermap.org/data/2.5/forecast?lat=%f&lon=%f&appid=%s&units=metric", 
                                               latitude, longitude, activeKey);
            Map<String, Object> forecastResponse = restTemplate.getForObject(forecastUrl, Map.class);

            // Parse response and format response JSON
            Map<String, Object> result = formatWeatherResponse(currentResponse, forecastResponse, cityName);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            // Retry with backup key if primary key is activating
            try {
                String backupKey = "091acd3c80db2f3c1676f60ad2fa55d0";
                String url = String.format(Locale.US, "https://api.openweathermap.org/data/2.5/weather?lat=%f&lon=%f&appid=%s&units=metric", 
                                           latitude, longitude, backupKey);
                Map<String, Object> currentResponse = restTemplate.getForObject(url, Map.class);
                String forecastUrl = String.format(Locale.US, "https://api.openweathermap.org/data/2.5/forecast?lat=%f&lon=%f&appid=%s&units=metric", 
                                                   latitude, longitude, backupKey);
                Map<String, Object> forecastResponse = restTemplate.getForObject(forecastUrl, Map.class);
                return ResponseEntity.ok(formatWeatherResponse(currentResponse, forecastResponse, cityName));
            } catch (Exception ex) {
                return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
            }
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> formatWeatherResponse(Map<String, Object> current, Map<String, Object> forecast, String cityName) {
        Map<String, Object> formatted = new LinkedHashMap<>();

        // Current Main
        Map<String, Object> main = (Map<String, Object>) current.get("main");
        Map<String, Object> wind = (Map<String, Object>) current.get("wind");
        List<Map<String, Object>> weatherList = (List<Map<String, Object>>) current.get("weather");
        Map<String, Object> weather = weatherList.get(0);

        double tempVal = ((Number) main.get("temp")).doubleValue();
        int humidityVal = ((Number) main.get("humidity")).intValue();
        double windVal = ((Number) wind.get("speed")).doubleValue() * 3.6; // Convert m/s to km/h
        int pressureVal = ((Number) main.get("pressure")).intValue();
        int visibilityVal = current.containsKey("visibility") ? ((Number) current.get("visibility")).intValue() / 1000 : 10;

        String conditionEn = (String) weather.get("main");
        String conditionDesc = (String) weather.get("description");

        // Translate conditions to Tamil
        String conditionTa = translateConditionToTamil(conditionEn);

        formatted.put("temp", String.format("%d°C", Math.round(tempVal)));
        formatted.put("condition", conditionEn);
        formatted.put("conditionTa", conditionTa);
        formatted.put("humidity", String.format("%d%%", humidityVal));
        formatted.put("wind", String.format("%d km/h", Math.round(windVal)));
        formatted.put("uv", "Index (6)");
        
        Map<String, Object> sys = (Map<String, Object>) current.get("sys");
        long sunriseTime = ((Number) sys.get("sunrise")).longValue() * 1000;
        long sunsetTime = ((Number) sys.get("sunset")).longValue() * 1000;
        
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("hh:mm a", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
        
        formatted.put("sunrise", sdf.format(new Date(sunriseTime)));
        formatted.put("sunset", sdf.format(new Date(sunsetTime)));
        formatted.put("pressure", String.format("%d hPa", pressureVal));
        formatted.put("aqi", "Good (35)");
        formatted.put("aqiTa", "நன்று (35)");
        formatted.put("visibility", String.format("%d km", visibilityVal));
        formatted.put("visibilityTa", String.format("%d கி.மீ", visibilityVal));
        formatted.put("precipitation", "15%");
        formatted.put("precipitationTa", "15%");
        formatted.put("dewPoint", String.format("%d°C", Math.round(tempVal - ((100 - humidityVal)/5.0))));
        formatted.put("dewPointTa", String.format("%d°C", Math.round(tempVal - ((100 - humidityVal)/5.0))));
        
        formatted.put("forecastSummaryEn", String.format("Expect %s skies today with a high of %d°C.", conditionDesc, Math.round(tempVal)));
        formatted.put("forecastSummaryTa", String.format("இன்று %s வானிலை காணப்படும், அதிகபட்சமாக %d°C வெப்பம் பதிவாகும்.", conditionTa, Math.round(tempVal)));
        
        // Forecast list
        List<Map<String, Object>> forecastList = (List<Map<String, Object>>) forecast.get("list");
        List<Map<String, Object>> dailyForecast = new ArrayList<>();
        
        String[] daysOfWeek = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
        String[] daysOfWeekTa = {"ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"};

        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
        Set<String> processedDays = new HashSet<>();
        
        for (Map<String, Object> entry : forecastList) {
            long dt = ((Number) entry.get("dt")).longValue() * 1000;
            cal.setTimeInMillis(dt);
            int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK) - 1;
            String dayName = daysOfWeek[dayOfWeek];
            
            Calendar todayCal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
            String todayName = daysOfWeek[todayCal.get(Calendar.DAY_OF_WEEK) - 1];
            if (dayName.equals(todayName) || processedDays.contains(dayName)) {
                continue;
            }
            
            processedDays.add(dayName);
            
            Map<String, Object> fMain = (Map<String, Object>) entry.get("main");
            double fTemp = ((Number) fMain.get("temp")).doubleValue();
            
            List<Map<String, Object>> fWeatherList = (List<Map<String, Object>>) entry.get("weather");
            Map<String, Object> fWeather = fWeatherList.get(0);
            String fCond = (String) fWeather.get("main");
            
            Map<String, Object> fItem = new LinkedHashMap<>();
            fItem.put("day", dayName);
            fItem.put("dayTa", daysOfWeekTa[dayOfWeek]);
            fItem.put("icon", getWeatherIconEmoji(fCond));
            fItem.put("temp", String.format("%d°", Math.round(fTemp)));
            fItem.put("desc", fCond);
            fItem.put("descTa", translateConditionToTamil(fCond));
            dailyForecast.add(fItem);
            
            if (dailyForecast.size() >= 7) {
                break;
            }
        }
        
        formatted.put("forecast", dailyForecast);
        formatted.put("ta", translateCityToTamil(cityName));
        
        return formatted;
    }

    private String translateConditionToTamil(String cond) {
        if (cond == null) return "மேகமூட்டம்";
        switch (cond.toLowerCase()) {
            case "thunderstorm": return "இடியுடன் கூடிய மழை";
            case "drizzle": return "சாரல் மழை";
            case "rain": return "மழை";
            case "snow": return "பனிப்பொழிவு";
            case "clear": return "தெளிவான வானம்";
            case "clouds": return "மேகமூட்டம்";
            case "mist":
            case "smoke":
            case "haze":
            case "dust":
            case "fog":
            case "sand":
            case "ash":
            case "squall":
            case "tornado": return "பனிமூட்டம்";
            default: return "மேகமூட்டம்";
        }
    }

    private String translateCityToTamil(String city) {
        if (city == null) return "";
        switch (city.toLowerCase()) {
            case "chennai": return "சென்னை";
            case "coimbatore": return "கோயம்புத்தூர்";
            case "madurai": return "மதுரை";
            case "trichy":
            case "tiruchirappalli": return "திருச்சி";
            case "salem": return "சேலம்";
            case "erode": return "ஈரோடு";
            default: return city;
        }
    }

    private String getWeatherIconEmoji(String cond) {
        if (cond == null) return "☁️";
        switch (cond.toLowerCase()) {
            case "thunderstorm": return "⛈️";
            case "drizzle": return "🌧️";
            case "rain": return "🌧️";
            case "snow": return "❄️";
            case "clear": return "☀️";
            case "clouds": return "☁️";
            default: return "⛅";
        }
    }
}
