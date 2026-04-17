import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/onboarding_screen.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final showOnboarding = await OnboardingScreen.shouldShow();
  runApp(LifePlannerApp(showOnboarding: showOnboarding));
}

class LifePlannerApp extends StatelessWidget {
  final bool showOnboarding;
  const LifePlannerApp({super.key, this.showOnboarding = false});

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
          initialRoute: showOnboarding ? "/onboarding" : "/",
          routes: {
            "/": (context) => const LoginScreen(),
            "/onboarding": (context) => const OnboardingScreen(),
            "/home": (context) => const HomeScreen(),
          },
        );
      },
    );
  }
}
