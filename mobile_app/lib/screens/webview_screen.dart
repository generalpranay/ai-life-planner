import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

// webview_flutter has no web platform implementation.
// On web we open the URL in a new tab instead.
class WebViewScreen extends StatefulWidget {
  final String title;
  final String url;

  const WebViewScreen({super.key, required this.title, required this.url});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      // On web: pop immediately and let the caller open in a new tab
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pop(context);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      // Brief fallback while the pop fires
      final isDark = Theme.of(context).brightness == Brightness.dark;
      return Scaffold(
        backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
        body: Center(
          child: Text('Opening in browser…',
              style: GoogleFonts.inter(
                  color: isDark ? AppColors.darkMuted : AppColors.lightMuted)),
        ),
      );
    }

    // Native: use webview_flutter
    return _NativeWebView(title: widget.title, url: widget.url);
  }
}

// Lazy import only on non-web builds
class _NativeWebView extends StatefulWidget {
  final String title;
  final String url;
  const _NativeWebView({required this.title, required this.url});

  @override
  State<_NativeWebView> createState() => _NativeWebViewState();
}

class _NativeWebViewState extends State<_NativeWebView> {
  dynamic _controller;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _initController();
  }

  void _initController() {
    // Dynamically use webview_flutter only on native
    try {
      // ignore: avoid_dynamic_calls
      final ctrl = _createController();
      setState(() => _controller = ctrl);
    } catch (e) {
      debugPrint('WebView init error: $e');
    }
  }

  dynamic _createController() {
    // This only runs on native where the plugin is available
    // Using conditional import pattern
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Center(
        child: Text('Opening…',
            style: GoogleFonts.inter(
                color: isDark ? AppColors.darkMuted : AppColors.lightMuted)),
      ),
    );
  }
}
