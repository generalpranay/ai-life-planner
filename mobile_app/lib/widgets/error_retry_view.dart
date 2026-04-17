import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

class ErrorRetryView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const ErrorRetryView({
    super.key,
    this.message = 'Something went wrong',
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.error.withValues(alpha: 0.10),
              ),
              child: const Icon(Icons.wifi_off_rounded,
                  color: AppColors.error, size: 28),
            ),
            const SizedBox(height: 20),
            Text(
              message,
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w600,
                fontSize: 15,
                color: isDark ? AppColors.darkText : AppColors.lightText,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Check your connection and try again.',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: onRetry,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  color: AppColors.accent.withValues(alpha: 0.10),
                  border: Border.all(color: AppColors.accent.withValues(alpha: 0.30)),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.refresh_rounded,
                      color: AppColors.accent, size: 16),
                  const SizedBox(width: 8),
                  Text('Try again',
                      style: GoogleFonts.inter(
                          color: AppColors.accent,
                          fontWeight: FontWeight.w600,
                          fontSize: 14)),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
