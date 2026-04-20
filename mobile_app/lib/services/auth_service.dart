// lib/services/auth_service.dart
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import 'api_service.dart';

class AuthService {
  static Future<bool> login(String email, String password) async {
    final response = await ApiService.post(
      ApiConfig.baseUrl + ApiConfig.login,
      body: {
        "email": email,
        "password": password,
      },
    );

    if (response.statusCode == 200) {
      try {
        final data = jsonDecode(response.body);
        if (data is! Map || data["token"] is! String) return false;
        final token = data["token"] as String;

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString("token", token);

        return true;
      } catch (_) {
        return false;
      }
    }

    return false;
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString("token");
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove("token");
  }
  static Future<bool> register(String email, String password) async {
  final response = await ApiService.post(
    ApiConfig.baseUrl + ApiConfig.register,
    body: {
      "email": email,
      "password": password,
      "role": "student"
    },
  );

  return response.statusCode == 201;
}

}
