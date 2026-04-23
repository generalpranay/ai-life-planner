import 'dart:convert';
import '../config/api_config.dart';
import '../models/event.dart';
import 'api_service.dart';
import 'auth_service.dart';

class EventService {
  static Future<List<Event>> getEvents() async {
    final token = await AuthService.getToken();
    final response = await ApiService.get(
      '${ApiConfig.baseUrl}${ApiConfig.events}',
      token: token,
    );
    if (response.statusCode == 200) {
      final list = jsonDecode(response.body) as List;
      return list.map((e) => Event.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load events');
  }

  static Future<Event> createEvent({
    required String title,
    String? description,
    required DateTime startDatetime,
    required DateTime endDatetime,
    bool isAllDay = false,
    String? location,
    String color = 'blue',
  }) async {
    final token = await AuthService.getToken();
    final response = await ApiService.post(
      '${ApiConfig.baseUrl}${ApiConfig.events}',
      token: token,
      body: {
        'title': title,
        if (description != null) 'description': description,
        'start_datetime': startDatetime.toUtc().toIso8601String(),
        'end_datetime': endDatetime.toUtc().toIso8601String(),
        'is_all_day': isAllDay,
        if (location != null) 'location': location,
        'color': color,
      },
    );
    if (response.statusCode == 201) {
      return Event.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
    }
    final msg = (jsonDecode(response.body) as Map?)?.containsKey('message') == true
        ? (jsonDecode(response.body) as Map)['message'] as String
        : 'Failed to create event';
    throw Exception(msg);
  }

  static Future<void> deleteEvent(int id) async {
    final token = await AuthService.getToken();
    final response = await ApiService.delete(
      '${ApiConfig.baseUrl}${ApiConfig.eventById(id)}',
      token: token,
    );
    if (response.statusCode != 204) {
      throw Exception('Failed to delete event');
    }
  }
}
