
import 'dart:convert';
import '../config/api_config.dart';
import '../models/web_resource.dart';
import 'api_service.dart';
import 'auth_service.dart';

class WebResourceService {
  static Future<List<WebResource>> getResources() async {
    final response = await ApiService.get(ApiConfig.baseUrl + ApiConfig.webResources, token: await AuthService.getToken());
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => WebResource.fromJson(json)).toList();
    }
    return [];
  }

  static Future<bool> createResource(String name, String url) async {
    final response = await ApiService.post(
      ApiConfig.baseUrl + ApiConfig.webResources,
      body: {"name": name, "url": url},
      token: await AuthService.getToken(),
    );
    return response.statusCode == 201;
  }

  static Future<bool> deleteResource(int id) async {
    final response = await ApiService.delete(
      ApiConfig.baseUrl + "${ApiConfig.webResources}/$id",
      token: await AuthService.getToken(),
    );
    return response.statusCode == 204;
  }
}
