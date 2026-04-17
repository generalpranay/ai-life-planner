import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/schedule_block.dart';
import 'package:intl/intl.dart';
import '../services/schedule_service.dart';
import '../theme/app_theme.dart';

class CustomAgendaView extends StatefulWidget {
  final DateTime date;
  final List<ScheduleBlock> blocks;
  final void Function(ScheduleBlock) onBlockTap;

  const CustomAgendaView({
    super.key,
    required this.date,
    required this.blocks,
    required this.onBlockTap,
  });

  @override
  State<CustomAgendaView> createState() => _CustomAgendaViewState();
}

class _CustomAgendaViewState extends State<CustomAgendaView> {
  // Local state overrides keyed by block id
  final Map<int, bool> _completedOverride = {};
  final Map<int, bool> _skippedOverride = {};

  bool _isCompleted(ScheduleBlock b) =>
      _completedOverride.containsKey(b.id) ? _completedOverride[b.id]! : b.completed;

  bool _isSkipped(ScheduleBlock b) =>
      _skippedOverride.containsKey(b.id) ? _skippedOverride[b.id]! : b.skipped;

  Future<void> _toggleComplete(ScheduleBlock block) async {
    final newVal = !_isCompleted(block);
    setState(() {
      _completedOverride[block.id] = newVal;
      if (newVal) _skippedOverride[block.id] = false; // completing clears skip
    });
    final ok = await ScheduleService.completeBlock(block.id, completed: newVal);
    if (!ok && mounted) setState(() => _completedOverride[block.id] = !newVal);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final dayBlocks = widget.blocks.where((b) =>
        b.startDatetime.year == widget.date.year &&
        b.startDatetime.month == widget.date.month &&
        b.startDatetime.day == widget.date.day).toList();

    if (dayBlocks.isEmpty) {
      return _EmptyDay(isDark: isDark);
    }

    return LayoutBuilder(builder: (context, constraints) {
      const hourHeight = 80.0;
      final totalHeight = hourHeight * 24;

      return SingleChildScrollView(
        padding: const EdgeInsets.only(top: 16, bottom: 16),
        child: SizedBox(
          height: totalHeight,
          child: Stack(children: [
            // Timeline line
            Positioned(
              top: 0, bottom: 0, left: 69, width: 2,
              child: Container(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
              ),
            ),
            // Hour grid + labels
            ...List.generate(24, (i) => [
              Positioned(
                top: i * hourHeight, left: 70, right: 0,
                child: Container(
                  height: 1,
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.04)
                      : Colors.black.withValues(alpha: 0.04),
                ),
              ),
              Positioned(
                top: i * hourHeight - 8, left: 8, width: 44,
                child: Text(
                  '${i == 0 ? 12 : i > 12 ? i - 12 : i} ${i < 12 ? 'AM' : 'PM'}',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkSubtle : AppColors.lightMuted,
                  ),
                  textAlign: TextAlign.right,
                ),
              ),
            ]).expand((w) => w),

            // Blocks
            for (final block in dayBlocks)
              Builder(builder: (context) {
                final startOp = block.startDatetime.hour +
                    (block.startDatetime.minute / 60);
                final endOp = block.endDatetime.hour +
                    (block.endDatetime.minute / 60);
                final duration = (endOp - startOp).clamp(0.5, 24.0);
                final color = AppTheme.getCategoryColor(
                    block.blockType, Theme.of(context).brightness);
                final done = _isCompleted(block);
                final skipped = _isSkipped(block);
                final stateColor = done
                    ? AppColors.success
                    : skipped
                        ? Colors.orange
                        : color;

                return Stack(children: [
                  // Node
                  Positioned(
                    top: startOp * hourHeight - 5,
                    left: 65, width: 10, height: 10,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      decoration: BoxDecoration(
                        color: stateColor,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Theme.of(context).scaffoldBackgroundColor,
                          width: 2,
                        ),
                      ),
                    ),
                  ),
                  // Card
                  Positioned(
                    top: startOp * hourHeight + 2,
                    left: 84, right: 16,
                    height: (duration * hourHeight) - 8,
                    child: AnimatedOpacity(
                      duration: const Duration(milliseconds: 300),
                      opacity: (done || skipped) ? 0.55 : 1.0,
                      child: GestureDetector(
                        onTap: () => widget.onBlockTap(block),
                        child: Container(
                          padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppColors.darkSurface
                                : AppColors.lightSurface,
                            border: Border(
                              left: BorderSide(
                                color: stateColor,
                                width: 3,
                              ),
                            ),
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: done
                                ? []
                                : [
                                    BoxShadow(
                                      color: Colors.black.withValues(
                                          alpha: isDark ? 0.18 : 0.06),
                                      blurRadius: 8,
                                      offset: const Offset(0, 3),
                                    )
                                  ],
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Row(children: [
                                      Icon(
                                        done
                                            ? Icons.check_circle_rounded
                                            : skipped
                                                ? Icons.not_interested_rounded
                                                : _categoryIcon(block.blockType),
                                        size: 14,
                                        color: stateColor,
                                      ),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          block.taskTitle ??
                                              block.blockType.toUpperCase(),
                                          style: GoogleFonts.inter(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 13,
                                            color: isDark
                                                ? AppColors.darkText
                                                : AppColors.lightText,
                                            decoration: (done || skipped)
                                                ? TextDecoration.lineThrough
                                                : null,
                                            decorationColor: isDark
                                                ? AppColors.darkMuted
                                                : AppColors.lightMuted,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ]),
                                    if (block.taskDescription != null &&
                                        duration > 0.75)
                                      Padding(
                                        padding: const EdgeInsets.only(
                                            top: 4, left: 20),
                                        child: Text(
                                          block.taskDescription!,
                                          style: GoogleFonts.inter(
                                            fontSize: 11,
                                            color: isDark
                                                ? AppColors.darkMuted
                                                : AppColors.lightMuted,
                                          ),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    if (duration > 1.0)
                                      Padding(
                                        padding: const EdgeInsets.only(
                                            top: 6, left: 20),
                                        child: Text(
                                          '${DateFormat('h:mm a').format(block.startDatetime)} – ${DateFormat('h:mm a').format(block.endDatetime)}',
                                          style: GoogleFonts.inter(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                            color: (done
                                                    ? AppColors.success
                                                    : color)
                                                .withValues(alpha: 0.80),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              // Complete toggle
                              GestureDetector(
                                onTap: () => _toggleComplete(block),
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 250),
                                  width: 28, height: 28,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: done
                                        ? AppColors.success.withValues(alpha: 0.15)
                                        : skipped
                                            ? Colors.orange.withValues(alpha: 0.15)
                                            : Colors.transparent,
                                    border: Border.all(
                                      color: done
                                          ? AppColors.success
                                          : skipped
                                              ? Colors.orange
                                              : isDark
                                                  ? AppColors.darkBorder2
                                                  : AppColors.lightBorder,
                                      width: 1.5,
                                    ),
                                  ),
                                  child: done
                                      ? const Icon(Icons.check_rounded,
                                          size: 14, color: AppColors.success)
                                      : skipped
                                          ? const Icon(Icons.not_interested_rounded,
                                              size: 14, color: Colors.orange)
                                          : null,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ]);
              }),
          ]),
        ),
      );
    });
  }

  IconData _categoryIcon(String cat) {
    switch (cat.toLowerCase()) {
      case 'work': return Icons.work_outline_rounded;
      case 'personal': return Icons.person_outline_rounded;
      case 'health':
      case 'exercise': return Icons.fitness_center_rounded;
      case 'routine': return Icons.sync_rounded;
      case 'break': return Icons.coffee_rounded;
      case 'study': return Icons.menu_book_rounded;
      default: return Icons.event_rounded;
    }
  }
}

class _EmptyDay extends StatelessWidget {
  final bool isDark;
  const _EmptyDay({required this.isDark});

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 64, height: 64,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.accent.withValues(alpha: 0.10),
          ),
          child: const Icon(Icons.event_available_rounded,
              color: AppColors.accent, size: 28),
        ),
        const SizedBox(height: 16),
        Text('No blocks scheduled',
            style: GoogleFonts.inter(
              fontWeight: FontWeight.w600,
              fontSize: 15,
              color: isDark ? AppColors.darkText : AppColors.lightText,
            )),
        const SizedBox(height: 6),
        Text('Tap ✦ Generate to build your schedule',
            style: GoogleFonts.inter(
              fontSize: 13,
              color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
            )),
      ],
    ),
  );
}
