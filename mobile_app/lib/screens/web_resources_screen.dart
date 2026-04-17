
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import '../models/web_resource.dart';
import '../services/web_resource_service.dart';
import 'webview_screen.dart';

class WebResourcesScreen extends StatefulWidget {
  const WebResourcesScreen({super.key});

  @override
  State<WebResourcesScreen> createState() => _WebResourcesScreenState();
}

class _WebResourcesScreenState extends State<WebResourcesScreen> {
  List<WebResource> _resources = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    try {
      final data = await WebResourceService.getResources();
      setState(() {
        _resources = data;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _addResource() async {
    final nameCtrl = TextEditingController();
    final urlCtrl = TextEditingController();

    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Add Website"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: "Name (e.g., Canvas)"),
            ),
            TextField(
              controller: urlCtrl,
              decoration: const InputDecoration(labelText: "URL (https://...)"),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancel"),
          ),
          FilledButton(
            onPressed: () async {
              if (nameCtrl.text.isEmpty || urlCtrl.text.isEmpty) return;
              await WebResourceService.createResource(nameCtrl.text, urlCtrl.text);
              if (!context.mounted) return;
              Navigator.pop(context);
              _refresh();
            },
            child: const Text("Add"),
          ),
        ],
      ),
    );
  }

  Future<void> _delete(int id) async {
    await WebResourceService.deleteResource(id);
    _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Web Resources")),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _resources.isEmpty
              ? Center(
                  child: Text(
                    "No websites added yet.\nAdd your school/work portals here.",
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                )
              : ListView.builder(
                  itemCount: _resources.length,
                  padding: const EdgeInsets.all(16),
                  itemBuilder: (context, index) {
                    final res = _resources[index];
                    return Card(
                      child: ListTile(
                        leading: const Icon(Icons.public),
                        title: Text(res.name),
                        subtitle: Text(res.url),
                        onTap: () {
                          if (kIsWeb) {
                            html.window.open(res.url, '_blank');
                          } else {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => WebViewScreen(title: res.name, url: res.url),
                              ),
                            );
                          }
                        },
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.red),
                          onPressed: () => _delete(res.id),
                        ),
                      ),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addResource,
        child: const Icon(Icons.add),
      ),
    );
  }
}
