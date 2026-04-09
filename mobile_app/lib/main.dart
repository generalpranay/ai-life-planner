import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const LifePlannerApp());
}

class LifePlannerApp extends StatelessWidget {
  const LifePlannerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: AppTheme.themeNotifier,
      builder: (context, currentMode, _) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: "AI Life Planner",
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: currentMode,
          routes: {
            "/": (context) => const LoginScreen(),
            "/home": (context) => const HomeScreen(),
          },
        );
      },
    );
  }
}
