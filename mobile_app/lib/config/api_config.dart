class ApiConfig {
  // CHANGE baseUrl when running on a real device:
  //   Android Emulator → "http://10.0.2.2:4000"
  //   iOS Simulator / Web → "http://localhost:4000"
  static const String baseUrl = "http://localhost:4000";

  // Auth
  static const String login = "/api/auth/login";
  static const String register = "/api/auth/register";

  // Tasks
  static const String tasks = "/api/tasks";
  static String taskById(int id) => "/api/tasks/$id";
  static String taskChecklist(int id) => "/api/tasks/$id/checklist";
  static const String resolveConflict = "/api/tasks/resolve-conflict";

  // Schedule
  static const String scheduleToday = "/api/schedule/today";
  static const String scheduleWeek = "/api/schedule/week";
  static const String scheduleGenerate = "/api/schedule/generate-week";
  static const String scheduleClear = "/api/schedule/clear";

  // Events
  static const String events = "/api/events";
  static String eventById(int id) => "/api/events/$id";

  // AI
  static const String aiAnalyze       = "/api/ai/analyze";
  static const String aiOptimize      = "/api/ai/optimize";
  static const String aiPredictRisks  = "/api/ai/predict-risks";
  static const String aiRiskAction    = "/api/ai/risk-action";

  // Web Resources
  static const String webResources = "/api/web-resources";
  static String webResourceById(int id) => "/api/web-resources/$id";
}
