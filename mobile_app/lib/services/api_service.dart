import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static Future<http.Response> get(
    String url, {
    String? token,
  }) async {
    return await http.get(
      Uri.parse(url),
      headers: _headers(token),
    );
  }

  static Future<http.Response> post(
    String url, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    return await http.post(
      Uri.parse(url),
      headers: _headers(token),
      body: jsonEncode(body),
    );
  }

  static Future<http.Response> patch(
    String url, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    return await http.patch(
      Uri.parse(url),
      headers: _headers(token),
      body: jsonEncode(body),
    );
  }

  static Future<http.Response> delete(
    String url, {
    String? token,
  }) async {
    return await http.delete(
      Uri.parse(url),
      headers: _headers(token),
    );
  }

  static Map<String, String> _headers(String? token) {
    final headers = {
      "Content-Type": "application/json",
    };

    if (token != null) {
      headers["Authorization"] = "Bearer $token";
    }

    return headers;
  }
}
