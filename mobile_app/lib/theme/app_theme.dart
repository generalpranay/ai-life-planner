import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Brand accent
  static const accent = Color(0xFF7C3AED);
  static const accentHover = Color(0xFF6D28D9);
  static const accentSoft = Color(0x207C3AED);
  static const accentGlow = Color(0x337C3AED);
  static const cyan = Color(0xFF06B6D4);
  static const cyanSoft = Color(0x1A06B6D4);

  // Dark surfaces
  static const darkBg = Color(0xFF09090B);
  static const darkSurface = Color(0xFF18181B);
  static const darkSurface2 = Color(0xFF27272A);
  static const darkBorder = Color(0x14FFFFFF);
  static const darkBorder2 = Color(0x1FFFFFFF);
  static const darkText = Color(0xFFF4F4F5);
  static const darkMuted = Color(0xFF71717A);
  static const darkSubtle = Color(0xFF52525B);

  // Light surfaces
  static const lightBg = Color(0xFFF4F4F5);
  static const lightSurface = Color(0xFFFFFFFF);
  static const lightBorder = Color(0xFFE4E4E7);
  static const lightText = Color(0xFF18181B);
  static const lightMuted = Color(0xFF71717A);

  // Semantic
  static const success = Color(0xFF10B981);
  static const warning = Color(0xFFF59E0B);
  static const error = Color(0xFFEF4444);
  static const info = Color(0xFF3B82F6);

  // Categories
  static const catWork = Color(0xFFF59E0B);
  static const catStudy = Color(0xFF3B82F6);
  static const catHealth = Color(0xFF10B981);
  static const catPersonal = Color(0xFF8B5CF6);
  static const catBreak = Color(0xFF06B6D4);
  static const catRoutine = Color(0xFFEC4899);
  static const catDefault = Color(0xFF71717A);
}

class AppTheme {
  static final ValueNotifier<ThemeMode> themeNotifier =
      ValueNotifier(ThemeMode.dark);

  static TextTheme _textTheme(Color text, Color muted) => TextTheme(
        displayLarge: GoogleFonts.inter(
            fontSize: 48, fontWeight: FontWeight.w700, color: text, height: 1.1),
        headlineLarge: GoogleFonts.inter(
            fontSize: 32, fontWeight: FontWeight.w700, color: text),
        headlineMedium: GoogleFonts.inter(
            fontSize: 24, fontWeight: FontWeight.w600, color: text),
        headlineSmall: GoogleFonts.inter(
            fontSize: 20, fontWeight: FontWeight.w600, color: text),
        titleLarge: GoogleFonts.inter(
            fontSize: 18, fontWeight: FontWeight.w600, color: text),
        titleMedium: GoogleFonts.inter(
            fontSize: 16, fontWeight: FontWeight.w500, color: text),
        titleSmall: GoogleFonts.inter(
            fontSize: 14, fontWeight: FontWeight.w500, color: text),
        bodyLarge: GoogleFonts.inter(
            fontSize: 16, fontWeight: FontWeight.w400, color: text),
        bodyMedium: GoogleFonts.inter(
            fontSize: 14, fontWeight: FontWeight.w400, color: text),
        bodySmall: GoogleFonts.inter(
            fontSize: 12, fontWeight: FontWeight.w400, color: muted),
        labelLarge: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: text,
            letterSpacing: 0.1),
        labelMedium: GoogleFonts.inter(
            fontSize: 12, fontWeight: FontWeight.w500, color: muted),
        labelSmall: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: muted,
            letterSpacing: 0.4),
      );

  static InputDecorationTheme _inputTheme(Color fill, Color border) =>
      InputDecorationTheme(
        filled: true,
        fillColor: fill,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.accent, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        labelStyle: GoogleFonts.inter(color: AppColors.darkMuted, fontSize: 14),
        hintStyle: GoogleFonts.inter(color: AppColors.darkMuted, fontSize: 14),
        prefixIconColor: AppColors.darkMuted,
        suffixIconColor: AppColors.darkMuted,
      );

  static final ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.accent,
      brightness: Brightness.dark,
    ).copyWith(
      primary: AppColors.accent,
      surface: AppColors.darkSurface,
      onSurface: AppColors.darkText,
    ),
    scaffoldBackgroundColor: AppColors.darkBg,
    canvasColor: AppColors.darkSurface,
    textTheme: _textTheme(AppColors.darkText, AppColors.darkMuted),
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      foregroundColor: AppColors.darkText,
      titleTextStyle: GoogleFonts.inter(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: AppColors.darkText,
      ),
      iconTheme: const IconThemeData(color: AppColors.darkText),
    ),
    cardTheme: CardThemeData(
      color: AppColors.darkSurface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.darkBorder),
      ),
    ),
    inputDecorationTheme:
        _inputTheme(AppColors.darkSurface2, AppColors.darkBorder),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        elevation: 0,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle:
            GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 15),
        padding:
            const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
        minimumSize: const Size(double.infinity, 50),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.accent,
        textStyle:
            GoogleFonts.inter(fontWeight: FontWeight.w500, fontSize: 14),
      ),
    ),
    dividerTheme:
        const DividerThemeData(color: AppColors.darkBorder, space: 1),
    listTileTheme: ListTileThemeData(
      iconColor: AppColors.darkMuted,
      titleTextStyle: GoogleFonts.inter(
          fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.darkText),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: AppColors.accent,
      foregroundColor: Colors.white,
      elevation: 0,
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AppColors.darkSurface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: AppColors.darkSurface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: AppColors.darkText),
      contentTextStyle: GoogleFonts.inter(
          fontSize: 14, color: AppColors.darkMuted),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: AppColors.darkSurface2,
      contentTextStyle:
          GoogleFonts.inter(color: AppColors.darkText, fontSize: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      behavior: SnackBarBehavior.floating,
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) =>
          states.contains(WidgetState.selected)
              ? AppColors.accent
              : Colors.transparent),
      checkColor: WidgetStateProperty.all(Colors.white),
      side: const BorderSide(color: AppColors.darkBorder2, width: 1.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.darkSurface2,
      selectedColor: AppColors.accentSoft,
      labelStyle: GoogleFonts.inter(
          fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.darkText),
      side: const BorderSide(color: AppColors.darkBorder),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    ),
  );

  static final ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.accent,
      brightness: Brightness.light,
    ).copyWith(
      primary: AppColors.accent,
      surface: AppColors.lightSurface,
    ),
    scaffoldBackgroundColor: AppColors.lightBg,
    canvasColor: AppColors.lightSurface,
    textTheme: _textTheme(AppColors.lightText, AppColors.lightMuted),
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      foregroundColor: AppColors.lightText,
      titleTextStyle: GoogleFonts.inter(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: AppColors.lightText,
      ),
      iconTheme: const IconThemeData(color: AppColors.lightText),
    ),
    cardTheme: CardThemeData(
      color: AppColors.lightSurface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.lightBorder),
      ),
    ),
    inputDecorationTheme:
        _inputTheme(AppColors.lightSurface, AppColors.lightBorder),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        elevation: 0,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle:
            GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 15),
        padding:
            const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
        minimumSize: const Size(double.infinity, 50),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.accent,
        textStyle:
            GoogleFonts.inter(fontWeight: FontWeight.w500, fontSize: 14),
      ),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: AppColors.accent,
      foregroundColor: Colors.white,
      elevation: 0,
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AppColors.lightSurface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: AppColors.lightSurface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: AppColors.lightText),
      contentTextStyle: GoogleFonts.inter(
          fontSize: 14, color: AppColors.lightMuted),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: AppColors.lightText,
      contentTextStyle:
          GoogleFonts.inter(color: Colors.white, fontSize: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      behavior: SnackBarBehavior.floating,
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) =>
          states.contains(WidgetState.selected)
              ? AppColors.accent
              : Colors.transparent),
      checkColor: WidgetStateProperty.all(Colors.white),
      side: const BorderSide(color: AppColors.lightBorder, width: 1.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.lightBg,
      selectedColor: AppColors.accentSoft,
      labelStyle: GoogleFonts.inter(
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: AppColors.lightText),
      side: const BorderSide(color: AppColors.lightBorder),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    ),
  );

  static Color getCategoryColor(String category, Brightness brightness) {
    switch (category.toLowerCase()) {
      case 'work':
        return AppColors.catWork;
      case 'personal':
        return AppColors.catPersonal;
      case 'health':
      case 'exercise':
        return AppColors.catHealth;
      case 'routine':
        return AppColors.catRoutine;
      case 'study':
        return AppColors.catStudy;
      case 'break':
        return AppColors.catBreak;
      default:
        return AppColors.catDefault;
    }
  }
}
