import 'dart:convert';
import '../config/api_config.dart';
import 'api_service.dart';
import 'auth_service.dart';

class AiService {
  /// Parse a natural language string into structured task fields.
  /// Returns a map or null on failure.
  static Future<Map<String, dynamic>?> parseTask(String text) async {
    final token = await AuthService.getToken();
    final response = await ApiService.post(
      '${ApiConfig.baseUrl}/api/ai/parse-task',
      token: token,
      body: {'text': text},
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    return null;
  }
}
