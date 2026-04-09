import 'package:flutter/material.dart';

class AppTheme {
  // Global notifier to toggle theme anywhere in the app
  static final ValueNotifier<ThemeMode> themeNotifier = ValueNotifier(ThemeMode.light);

  static final ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorSchemeSeed: Colors.deepPurple,
    scaffoldBackgroundColor: const Color(0xFFF7F9FC),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      foregroundColor: Colors.black87,
    ),
    canvasColor: Colors.white,
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 2,
      shadowColor: Colors.black12,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    textTheme: const TextTheme(
      titleLarge: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87),
    ),
  );

  static final ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorSchemeSeed: Colors.deepPurple,
    scaffoldBackgroundColor: const Color(0xFF141416),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      foregroundColor: Colors.white,
    ),
    canvasColor: const Color(0xFF1C1D21),
    cardTheme: CardThemeData(
      color: const Color(0xFF222328),
      elevation: 4,
      shadowColor: Colors.black45,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    textTheme: const TextTheme(
      titleLarge: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
    ),
  );

  // Helper method for category colors based on brightness
  static Color getCategoryColor(String category, Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    switch (category.toLowerCase()) {
      case 'work': return isDark ? Colors.orange.shade300 : Colors.orange.shade400;
      case 'personal': return isDark ? Colors.teal.shade300 : Colors.teal.shade400;
      case 'health': 
      case 'exercise': return isDark ? Colors.green.shade300 : Colors.green.shade400;
      case 'routine': return isDark ? Colors.pink.shade300 : Colors.pink.shade400;
      case 'study': return isDark ? Colors.blue.shade300 : Colors.blue.shade500;
      case 'break': return isDark ? Colors.purple.shade300 : Colors.deepPurple.shade400;
      default: return isDark ? Colors.grey.shade400 : Colors.blueGrey.shade400;
    }
  }
}
