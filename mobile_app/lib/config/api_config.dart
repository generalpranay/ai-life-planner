class ApiConfig {
  // CHANGE IP IF USING REAL DEVICE
  // Android Emulator: 10.0.2.2
  // iOS Simulator / Web: localhost
  static const String baseUrl = "http://localhost:4000";

  static const String login = "/api/auth/login";
  static const String register = "/api/auth/register";
  static const String tasks = "/api/tasks";
  static const String scheduleGenerate = "/api/schedule/generate-week";
  static const String scheduleWeek = "/api/schedule/week";
  static const String webResources = "/api/web-resources";
  static const String aiAnalyze    = "/api/ai/analyze";
}
