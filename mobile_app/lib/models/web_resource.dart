
class WebResource {
  final int id;
  final String name;
  final String url;

  WebResource({
    required this.id,
    required this.name,
    required this.url,
  });

  factory WebResource.fromJson(Map<String, dynamic> json) {
    return WebResource(
      id: json['id'],
      name: json['name'],
      url: json['url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'url': url,
    };
  }
}
