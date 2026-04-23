import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/schedule_block.dart';
import '../services/schedule_service.dart';
import '../theme/app_theme.dart';

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  List<ScheduleBlock> _blocks = [];
  bool _loading = true;
  bool _generating = false;

  @override
  void initState() {
    super.initState();
    _loadSchedule();
  }

  Future<void> _loadSchedule() async {
    setState(() => _loading = true);
    try {
      final blocks = await ScheduleService.fetchSchedule();
      setState(() {
        _blocks = blocks;
        _loading = false;
      });
    } catch (e) {
      debugPrint('Error loading schedule: $e');
      setState(() => _loading = false);
    }
  }

  Future<void> _generateSchedule() async {
    setState(() => _generating = true);
    try {
      await ScheduleService.generateWeek();
      await _loadSchedule();
    } catch (e) {
      debugPrint('Error generating schedule: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to generate schedule: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  Future<void> _confirmClear() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear Schedule'),
        content: const Text(
            'Remove all scheduled blocks? Your tasks will be preserved.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('Clear')),
        ],
      ),
    );
    if (confirmed == true) {
      setState(() => _loading = true);
      try {
        await ScheduleService.clearSchedule();
        await _loadSchedule();
      } catch (e) {
        debugPrint('Error clearing schedule: $e');
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _completeBlock(ScheduleBlock block) async {
    final idx = _blocks.indexOf(block);
    if (idx == -1) return;
    setState(() => _blocks[idx] = block.copyWith(completed: true));
    try {
      await ScheduleService.completeBlock(block.id);
    } catch (e) {
      setState(() => _blocks[idx] = block);
    }
  }

  Future<void> _skipBlock(ScheduleBlock block) async {
    final idx = _blocks.indexOf(block);
    if (idx == -1) return;
    setState(() => _blocks[idx] = block.copyWith(skipped: true));
    try {
      await ScheduleService.skipBlock(block.id);
    } catch (e) {
      setState(() => _blocks[idx] = block);
    }
  }

  Map<String, List<ScheduleBlock>> get _grouped {
    final map = <String, List<ScheduleBlock>>{};
    for (final b in _blocks) {
      final dt = b.startDatetime;
      final key =
          '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
      map.putIfAbsent(key, () => []).add(b);
    }
    return map;
  }

  int get _doneCount => _blocks.where((b) => b.completed).length;
  int get _skippedCount => _blocks.where((b) => b.skipped).length;
  int get _pendingCount =>
      _blocks.where((b) => !b.completed && !b.skipped).length;

  bool _isToday(String dateKey) {
    final now = DateTime.now();
    final todayKey =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    return dateKey == todayKey;
  }

  bool _isNow(ScheduleBlock block) {
    final now = DateTime.now();
    return now.isAfter(block.startDatetime) && now.isBefore(block.endDatetime);
  }

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final isDark = brightness == Brightness.dark;
    final surfaceColor =
        isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final mutedColor = isDark ? AppColors.darkMuted : AppColors.lightMuted;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        title: const Text('Weekly Schedule',
            style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_sweep_outlined),
            onPressed: _loading ? null : _confirmClear,
            tooltip: 'Clear Schedule',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _loadSchedule,
            tooltip: 'Refresh',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _generating ? null : _generateSchedule,
        backgroundColor: AppColors.accent,
        icon: _generating
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white))
            : const Icon(Icons.auto_fix_high, color: Colors.white),
        label: Text(_generating ? 'Generating…' : 'Generate Week',
            style: const TextStyle(color: Colors.white)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _blocks.isEmpty
              ? _buildEmpty(isDark, textColor, mutedColor)
              : Column(
                  children: [
                    _buildStatsBar(isDark, surfaceColor, borderColor),
                    Expanded(child: _buildList(isDark, surfaceColor, borderColor, textColor, mutedColor)),
                  ],
                ),
    );
  }

  Widget _buildStatsBar(bool isDark, Color surfaceColor, Color borderColor) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          _statCell('Total', _blocks.length.toString(), Colors.blueGrey),
          _statDivider(),
          _statCell('Done', _doneCount.toString(), AppColors.success),
          _statDivider(),
          _statCell('Skipped', _skippedCount.toString(), AppColors.warning),
          _statDivider(),
          _statCell('Pending', _pendingCount.toString(), AppColors.info),
        ],
      ),
    );
  }

  Widget _statCell(String label, String value, Color color) => Expanded(
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 20, color: color)),
            const SizedBox(height: 2),
            Text(label,
                style: TextStyle(
                    fontSize: 11,
                    color: color.withValues(alpha: 0.8),
                    fontWeight: FontWeight.w500)),
          ],
        ),
      );

  Widget _statDivider() => Container(
      width: 1, height: 32, color: Colors.grey.withValues(alpha: 0.3));

  Widget _buildList(bool isDark, Color surfaceColor, Color borderColor,
      Color textColor, Color mutedColor) {
    final grouped = _grouped;
    final dates = grouped.keys.toList()..sort();

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      itemCount: dates.length,
      itemBuilder: (context, i) {
        final dateKey = dates[i];
        final blocks = grouped[dateKey]!;
        final dt = DateTime.parse(dateKey);
        final today = _isToday(dateKey);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 16),
            Row(
              children: [
                Text(
                  DateFormat('EEEE, MMMM d').format(dt),
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: today ? AppColors.accent : textColor),
                ),
                if (today) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.accent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text('Today',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold)),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 8),
            ...blocks.map((b) => _buildBlockCard(
                b, isDark, surfaceColor, borderColor, textColor, mutedColor)),
          ],
        );
      },
    );
  }

  Widget _buildBlockCard(ScheduleBlock block, bool isDark, Color surfaceColor,
      Color borderColor, Color textColor, Color mutedColor) {
    final brightness = isDark ? Brightness.dark : Brightness.light;
    final catColor =
        AppTheme.getCategoryColor(block.blockType, brightness);
    final isActive = !block.completed && !block.skipped;
    final nowActive = isActive && _isNow(block);
    final duration = block.endDatetime.difference(block.startDatetime).inMinutes;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: nowActive
                ? AppColors.accent.withValues(alpha: 0.6)
                : borderColor),
        boxShadow: nowActive
            ? [
                BoxShadow(
                    color: AppColors.accent.withValues(alpha: 0.12),
                    blurRadius: 8,
                    offset: const Offset(0, 2))
              ]
            : null,
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: block.completed
                    ? AppColors.success
                    : block.skipped
                        ? Colors.grey
                        : catColor,
                borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(12),
                    bottomLeft: Radius.circular(12)),
              ),
            ),
            Expanded(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                child: Row(
                  children: [
                    _statusIcon(block),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  block.taskTitle ?? block.blockType.toUpperCase(),
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                    color: textColor,
                                    decoration: block.completed
                                        ? TextDecoration.lineThrough
                                        : null,
                                    decorationColor: mutedColor,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (nowActive)
                                Container(
                                  margin: const EdgeInsets.only(left: 6),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.accent,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text('Now',
                                      style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold)),
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(Icons.access_time_outlined,
                                  size: 12, color: mutedColor),
                              const SizedBox(width: 3),
                              Text(
                                '${DateFormat('h:mm a').format(block.startDatetime)} – ${DateFormat('h:mm a').format(block.endDatetime)}',
                                style:
                                    TextStyle(fontSize: 12, color: mutedColor),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 1),
                                decoration: BoxDecoration(
                                  color: catColor.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text('${duration}m',
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: catColor,
                                        fontWeight: FontWeight.w600)),
                              ),
                              if ((block.checklistTotal ?? 0) > 0) ...[
                                const SizedBox(width: 8),
                                Icon(Icons.checklist,
                                    size: 12, color: mutedColor),
                                const SizedBox(width: 2),
                                Text(
                                    '${block.checklistDone ?? 0}/${block.checklistTotal}',
                                    style: TextStyle(
                                        fontSize: 11, color: mutedColor)),
                              ],
                            ],
                          ),
                          if (block.todaysGoal != null &&
                              block.todaysGoal!.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              block.todaysGoal!,
                              style:
                                  TextStyle(fontSize: 12, color: mutedColor),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (isActive) ...[
                      const SizedBox(width: 4),
                      IconButton(
                        icon: Icon(Icons.check_circle_outline,
                            color: AppColors.success, size: 22),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () => _completeBlock(block),
                        tooltip: 'Complete',
                      ),
                      const SizedBox(width: 6),
                      IconButton(
                        icon: Icon(Icons.arrow_forward_ios_rounded,
                            color: mutedColor, size: 18),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () => _skipBlock(block),
                        tooltip: 'Skip',
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statusIcon(ScheduleBlock block) {
    if (block.completed) {
      return Icon(Icons.check_circle, color: AppColors.success, size: 20);
    }
    if (block.skipped) {
      return Icon(Icons.cancel, color: Colors.grey.shade500, size: 20);
    }
    if (_isNow(block)) {
      return Icon(Icons.play_circle, color: AppColors.accent, size: 20);
    }
    return Icon(Icons.radio_button_unchecked,
        color: Colors.grey.shade400, size: 20);
  }

  Widget _buildEmpty(bool isDark, Color textColor, Color mutedColor) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.accent.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(Icons.calendar_today_outlined,
                  size: 40, color: AppColors.accent),
            ),
            const SizedBox(height: 20),
            Text('No Schedule Yet',
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: textColor)),
            const SizedBox(height: 8),
            Text(
              'Tap "Generate Week" to let the AI build\na personalised schedule from your tasks.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: mutedColor, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}
