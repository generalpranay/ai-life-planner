import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/risk_flag.dart';
import '../theme/app_theme.dart';

class RiskBannerSection extends StatefulWidget {
  final List<RiskFlag> flags;
  final bool loading;

  /// Called when the user taps "Move to Tomorrow".
  /// The widget removes the flag locally; the parent handles the API call.
  final Future<void> Function(int blockId, String action) onAction;

  const RiskBannerSection({
    super.key,
    required this.flags,
    required this.onAction,
    this.loading = false,
  });

  @override
  State<RiskBannerSection> createState() => _RiskBannerSectionState();
}

class _RiskBannerSectionState extends State<RiskBannerSection>
    with SingleTickerProviderStateMixin {
  bool _expanded = true;
  final Set<int> _dismissed = {};
  final Set<int> _acting = {};

  late final AnimationController _controller;
  late final Animation<double> _expandAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
      value: 1.0,
    );
    _expandAnim = CurvedAnimation(parent: _controller, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() => _expanded = !_expanded);
    _expanded ? _controller.forward() : _controller.reverse();
  }

  List<RiskFlag> get _visible =>
      widget.flags.where((f) => !_dismissed.contains(f.blockId)).toList();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (widget.loading) return _buildShimmer(isDark);

    final visible = _visible;
    if (visible.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Column(
        children: [
          _buildHeader(isDark, visible.length),
          SizeTransition(
            sizeFactor: _expandAnim,
            child: Column(
              children: [
                const SizedBox(height: 8),
                ...visible.map((f) => _RiskCard(
                      key: ValueKey(f.blockId),
                      flag: f,
                      isDark: isDark,
                      acting: _acting.contains(f.blockId),
                      onMoveToTomorrow: () => _handleAction(f, 'move_to_tomorrow'),
                      onDismiss: () => setState(() => _dismissed.add(f.blockId)),
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(bool isDark, int count) {
    final overloadCount  = _visible.where((f) => f.type == 'OVERLOAD').length;
    final skipCount      = _visible.where((f) => f.type == 'SKIP_RISK').length;
    final conflictCount  = _visible.where((f) => f.type == 'CONFLICT').length;

    return GestureDetector(
      onTap: _toggle,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isDark
              ? AppColors.warning.withValues(alpha: 0.08)
              : AppColors.warning.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppColors.warning.withValues(alpha: 0.25),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 28, height: 28,
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Text('⚠️', style: TextStyle(fontSize: 14)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$count risk${count == 1 ? '' : 's'} detected for today',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkText : AppColors.lightText,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(children: [
                    if (overloadCount > 0)  _TypePill('OVERLOAD',  AppColors.warning, overloadCount),
                    if (skipCount > 0) ...[
                      if (overloadCount > 0) const SizedBox(width: 4),
                      _TypePill('SKIP RISK', AppColors.accent, skipCount),
                    ],
                    if (conflictCount > 0) ...[
                      if (overloadCount + skipCount > 0) const SizedBox(width: 4),
                      _TypePill('CONFLICT', AppColors.error, conflictCount),
                    ],
                  ]),
                ],
              ),
            ),
            AnimatedRotation(
              turns: _expanded ? 0 : -0.5,
              duration: const Duration(milliseconds: 200),
              child: Icon(
                Icons.expand_less_rounded,
                size: 18,
                color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShimmer(bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          ),
        ),
        child: const Center(
          child: SizedBox(
            width: 18, height: 18,
            child: CircularProgressIndicator(
              color: AppColors.warning, strokeWidth: 2,
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleAction(RiskFlag flag, String action) async {
    setState(() => _acting.add(flag.blockId));
    try {
      await widget.onAction(flag.blockId, action);
      if (mounted) setState(() => _dismissed.add(flag.blockId));
    } finally {
      if (mounted) setState(() => _acting.remove(flag.blockId));
    }
  }
}

// ── Type pill badge ───────────────────────────────────────────────────────────

class _TypePill extends StatelessWidget {
  final String label;
  final Color color;
  final int count;
  const _TypePill(this.label, this.color, this.count);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        count > 1 ? '$count $label' : label,
        style: GoogleFonts.inter(
          fontSize: 10, fontWeight: FontWeight.w700,
          color: color, letterSpacing: 0.4,
        ),
      ),
    );
  }
}

// ── Individual risk card ──────────────────────────────────────────────────────

class _RiskCard extends StatelessWidget {
  final RiskFlag flag;
  final bool isDark;
  final bool acting;
  final VoidCallback onMoveToTomorrow;
  final VoidCallback onDismiss;

  const _RiskCard({
    super.key,
    required this.flag,
    required this.isDark,
    required this.acting,
    required this.onMoveToTomorrow,
    required this.onDismiss,
  });

  static const _icons = {
    'OVERLOAD':  '🔥',
    'SKIP_RISK': '⚡',
    'CONFLICT':  '⚠️',
  };

  static Color _typeColor(String type) {
    switch (type) {
      case 'OVERLOAD':  return AppColors.warning;
      case 'SKIP_RISK': return AppColors.accent;
      case 'CONFLICT':  return AppColors.error;
      default:          return AppColors.darkMuted;
    }
  }

  static String _actionLabel(String type) {
    switch (type) {
      case 'CONFLICT':  return 'Move to Tomorrow';
      case 'OVERLOAD':  return 'Move to Tomorrow';
      default:          return 'Move to Tomorrow';
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _typeColor(flag.type);
    final icon  = _icons[flag.type] ?? '⚠️';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: (isDark ? Colors.black : Colors.black).withValues(alpha: 0.04),
            blurRadius: 8, offset: const Offset(0, 2),
          ),
        ],
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            // Left accent bar
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: color,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  bottomLeft: Radius.circular(12),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header row
                    Row(
                      children: [
                        Text(icon, style: const TextStyle(fontSize: 14)),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            flag.type.replaceAll('_', ' '),
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: color,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const Spacer(),
                        GestureDetector(
                          onTap: acting ? null : onDismiss,
                          child: Icon(
                            Icons.close_rounded,
                            size: 16,
                            color: isDark
                                ? AppColors.darkMuted
                                : AppColors.lightMuted,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Task title
                    Text(
                      flag.title,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.darkText : AppColors.lightText,
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Suggestion
                    Text(
                      flag.suggestion,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color:
                            isDark ? AppColors.darkMuted : AppColors.lightMuted,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Action buttons
                    Row(
                      children: [
                        _ActionButton(
                          label: _actionLabel(flag.type),
                          icon: Icons.calendar_today_rounded,
                          color: color,
                          loading: acting,
                          onTap: acting ? null : onMoveToTomorrow,
                        ),
                        const SizedBox(width: 8),
                        _ActionButton(
                          label: 'Dismiss',
                          icon: Icons.check_circle_outline_rounded,
                          color: isDark
                              ? AppColors.darkMuted
                              : AppColors.lightMuted,
                          onTap: acting ? null : onDismiss,
                          outlined: true,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;
  final bool loading;
  final bool outlined;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    this.onTap,
    this.loading = false,
    this.outlined = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: outlined
              ? Colors.transparent
              : color.withValues(alpha: onTap == null ? 0.06 : 0.12),
          borderRadius: BorderRadius.circular(8),
          border: outlined
              ? Border.all(
                  color: color.withValues(alpha: 0.35),
                )
              : Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: loading
            ? SizedBox(
                width: 14, height: 14,
                child: CircularProgressIndicator(
                  color: color, strokeWidth: 1.5,
                ),
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 12, color: color),
                  const SizedBox(width: 5),
                  Text(
                    label,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: outlined
                          ? (isDark
                              ? AppColors.darkMuted
                              : AppColors.lightMuted)
                          : color,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
