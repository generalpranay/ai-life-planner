import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static Future<http.Response> get(String url, {String? token}) async {
    var res = await http.get(Uri.parse(url), headers: _headers(token));
    if (res.statusCode == 401 && token != null) {
      final newToken = await _tryRefresh(token);
      if (newToken != null) {
        res = await http.get(Uri.parse(url), headers: _headers(newToken));
      }
    }
    return res;
  }

  static Future<http.Response> post(String url,
      {Map<String, dynamic>? body, String? token}) async {
    var res = await http.post(Uri.parse(url),
        headers: _headers(token), body: jsonEncode(body));
    if (res.statusCode == 401 && token != null) {
      final newToken = await _tryRefresh(token);
      if (newToken != null) {
        res = await http.post(Uri.parse(url),
            headers: _headers(newToken), body: jsonEncode(body));
      }
    }
    return res;
  }

  static Future<http.Response> patch(String url,
      {Map<String, dynamic>? body, String? token}) async {
    var res = await http.patch(Uri.parse(url),
        headers: _headers(token), body: jsonEncode(body));
    if (res.statusCode == 401 && token != null) {
      final newToken = await _tryRefresh(token);
      if (newToken != null) {
        res = await http.patch(Uri.parse(url),
            headers: _headers(newToken), body: jsonEncode(body));
      }
    }
    return res;
  }

  static Future<http.Response> delete(String url, {String? token}) async {
    var res = await http.delete(Uri.parse(url), headers: _headers(token));
    if (res.statusCode == 401 && token != null) {
      final newToken = await _tryRefresh(token);
      if (newToken != null) {
        res = await http.delete(Uri.parse(url), headers: _headers(newToken));
      }
    }
    return res;
  }

  /// Try to refresh the JWT. Returns the new token on success, null on failure.
  static Future<String?> _tryRefresh(String oldToken) async {
    try {
      final res = await http.post(
        Uri.parse('http://localhost:4000/api/auth/refresh'),
        headers: _headers(oldToken),
      );
      if (res.statusCode == 200) {
        final newToken = jsonDecode(res.body)['token'] as String;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', newToken);
        return newToken;
      }
    } catch (_) {}
    return null;
  }

  static Map<String, String> _headers(String? token) {
    final h = {'Content-Type': 'application/json'};
    if (token != null) h['Authorization'] = 'Bearer $token';
    return h;
  }
}
