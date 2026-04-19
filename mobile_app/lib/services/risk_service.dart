import 'dart:convert';
import '../config/api_config.dart';
import '../models/risk_flag.dart';
import 'api_service.dart';
import 'auth_service.dart';

class RiskService {
  /// Fetch proactive risk predictions for today (DB-aware, no body needed).
  static Future<List<RiskFlag>> predictRisks() async {
    final token = await AuthService.getToken();
    final response = await ApiService.get(
      ApiConfig.baseUrl + ApiConfig.aiPredictRisks,
      token: token,
    );
    if (response.statusCode != 200) {
      throw Exception('Risk prediction failed: ${response.statusCode}');
    }
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final flags = data['flags'] as List? ?? [];
    return flags
        .map((e) => RiskFlag.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Apply a risk action: "move_to_tomorrow" or "defer".
  static Future<bool> applyAction(int blockId, String action) async {
    final token = await AuthService.getToken();
    final response = await ApiService.post(
      ApiConfig.baseUrl + ApiConfig.aiRiskAction,
      token: token,
      body: {'blockId': blockId, 'action': action},
    );
    return response.statusCode == 200;
  }
}
