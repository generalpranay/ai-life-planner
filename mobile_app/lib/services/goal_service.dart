import 'dart:convert';
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
}
