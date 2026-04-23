import 'dart:convert';
import 'package:intl/intl.dart';
import '../config/api_config.dart';
import '../models/goal_decomposition.dart';
import 'api_service.dart';
import 'auth_service.dart';

class GoalService {
  static Future<GoalDecomposition> decompose({
    required String goal,
    required String deadline,
    required String today,
    int? weeksAvailable,
    List<String> strongCategories = const [],
    List<String> avoidCategories = const [],
    List<String> productiveHours = const [],
  }) async {
    final token = await AuthService.getToken();
    final body = <String, dynamic>{
      'goal': goal,
      'deadline': deadline,
      'today': today,
      if (weeksAvailable != null) 'weeks_available': weeksAvailable,
      'user_behavior': {
        'productive_hours': productiveHours,
        'strong_categories': strongCategories,
        'avoid_categories': avoidCategories,
      },
    };
    final response = await ApiService.post(
      '${ApiConfig.baseUrl}${ApiConfig.aiDecomposeGoal}',
      token: token,
      body: body,
    );
    if (response.statusCode == 200) {
      return GoalDecomposition.fromJson(
          jsonDecode(response.body) as Map<String, dynamic>);
    }
    final msg =
        (jsonDecode(response.body) as Map?)?.containsKey('message') == true
            ? (jsonDecode(response.body) as Map)['message'] as String
            : 'Goal decomposition failed';
    throw Exception(msg);
  }

  static Future<Map<String, dynamic>> saveGoalPlan({
    required List<Week> weeks,
  }) async {
    final token = await AuthService.getToken();
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final weeksJson = weeks
        .map((w) => {
              'week': w.week,
              'daily_tasks': w.dailyTasks
                  .map((t) => {
                        'title': t.title,
                        'category': t.category,
                        'duration_mins': t.durationMins,
                        'day_of_week': t.dayOfWeek,
                      })
                  .toList(),
            })
        .toList();

    final response = await ApiService.post(
      '${ApiConfig.baseUrl}${ApiConfig.aiSaveGoalPlan}',
      token: token,
      body: {'weeks': weeksJson, 'today': today},
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final msg =
        (jsonDecode(response.body) as Map?)?.containsKey('message') == true
            ? (jsonDecode(response.body) as Map)['message'] as String
            : 'Save failed';
    throw Exception(msg);
  }
}
