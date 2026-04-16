import 'dart:convert';
import '../config/api_config.dart';
import '../models/schedule_block.dart';
import 'api_service.dart';
import 'auth_service.dart';

class ScheduleService {
  /// Generate weekly schedule
  static Future<void> generateWeek() async {
    final token = await AuthService.getToken();

    await ApiService.post(
      ApiConfig.baseUrl + ApiConfig.scheduleGenerate,
      token: token,
      body: {},
    );
  }

  /// Fetch weekly schedule
  static Future<List<ScheduleBlock>> fetchSchedule() async {
    final token = await AuthService.getToken();

    final response = await ApiService.get(
      ApiConfig.baseUrl + ApiConfig.scheduleWeek,
      token: token,
    );

    final data = jsonDecode(response.body) as List;

    return data.map((e) => ScheduleBlock.fromJson(e)).toList();
  }

  /// Clear all scheduled blocks
  static Future<void> clearSchedule() async {
    final token = await AuthService.getToken();

    await ApiService.delete(
      '${ApiConfig.baseUrl}${ApiConfig.scheduleClear}',
      token: token,
    );
  }
}
