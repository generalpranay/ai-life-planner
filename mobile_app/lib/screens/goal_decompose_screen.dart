import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../models/goal_decomposition.dart';
import '../services/goal_service.dart';

class GoalDecomposeScreen extends StatefulWidget {
  const GoalDecomposeScreen({super.key});

  @override
  State<GoalDecomposeScreen> createState() => _GoalDecomposeScreenState();
}

class _GoalDecomposeScreenState extends State<GoalDecomposeScreen>
    with SingleTickerProviderStateMixin {
  final _goalCtrl = TextEditingController();
  DateTime? _deadline;
  GoalDecomposition? _result;
  bool _loading = false;
  String? _error;
  late AnimationController _pulseCtrl;
  late Animation<double> _pulseAnim;

  static const _accent = Color(0xFF7C3AED);
  static const _green  = Color(0xFF22C55E);
  static const _orange = Color(0xFFF97316);
  static const _blue   = Color(0xFF3B82F6);

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.85, end: 1.0)
        .animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _goalCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDeadline() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now().add(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.dark(primary: _accent),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _deadline = picked);
  }

  Future<void> _decompose() async {
    final goal = _goalCtrl.text.trim();
    if (goal.isEmpty) {
      setState(() => _error = 'Please describe your goal');
      return;
    }
    if (_deadline == null) {
      setState(() => _error = 'Please select a deadline');
      return;
    }
    setState(() { _loading = true; _error = null; _result = null; });
    try {
      final today    = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final deadline = DateFormat('yyyy-MM-dd').format(_deadline!);
      final result   = await GoalService.decompose(goal: goal, deadline: deadline, today: today);
      setState(() { _result = result; _loading = false; });
    } catch (e) {
      setState(() {
        _error   = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark  = Theme.of(context).brightness == Brightness.dark;
    final bg      = isDark ? const Color(0xFF0F0F1A) : const Color(0xFFF5F7FF);
    final cardBg  = isDark ? const Color(0xFF1A1A2E) : Colors.white;

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [_accent, Color(0xFF2563EB)]),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.track_changes_rounded, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            Text('Goal Decomposer',
                style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          _buildInputCard(cardBg, isDark),
          if (_error != null) ...[
            const SizedBox(height: 12),
            _buildError(),
          ],
          if (_loading) ...[
            const SizedBox(height: 32),
            _buildLoading(),
          ],
          if (_result != null) ...[
            const SizedBox(height: 20),
            _buildResults(_result!, cardBg, isDark),
          ],
        ],
      ),
    );
  }

  // ── Input card ───────────────────────────────────────────────────────────────
  Widget _buildInputCard(Color cardBg, bool isDark) {
    final hasDl = _deadline != null;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _accent.withValues(alpha: 0.15)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('What do you want to achieve?',
              style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 10),
          TextField(
            controller: _goalCtrl,
            maxLines: 3,
            style: GoogleFonts.inter(fontSize: 14),
            decoration: InputDecoration(
              hintText: 'e.g. Learn React and build a portfolio website',
              hintStyle: GoogleFonts.inter(color: Colors.grey.shade500, fontSize: 13),
              filled: true,
              fillColor: isDark ? const Color(0xFF0F0F1A) : const Color(0xFFF8F8FF),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: _accent.withValues(alpha: 0.2)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: _accent),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: _accent.withValues(alpha: 0.2)),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
          const SizedBox(height: 14),
          Text('Deadline', style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: _pickDeadline,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF0F0F1A) : const Color(0xFFF8F8FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: hasDl ? _accent : _accent.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  Icon(Icons.calendar_today_rounded, size: 16,
                      color: hasDl ? _accent : Colors.grey.shade500),
                  const SizedBox(width: 10),
                  Text(
                    hasDl
                        ? DateFormat('MMMM d, yyyy').format(_deadline!)
                        : 'Select deadline',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      color: hasDl
                          ? (isDark ? Colors.white : Colors.black87)
                          : Colors.grey.shade500,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [_accent, Color(0xFF2563EB)]),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: _accent.withValues(alpha: 0.35),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: _loading ? null : _decompose,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.auto_fix_high_rounded,
                            color: Colors.white, size: 18),
                        const SizedBox(width: 8),
                        Text('Decompose Goal',
                            style: GoogleFonts.inter(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 15)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  Widget _buildLoading() {
    return Center(
      child: Column(
        children: [
          ScaleTransition(
            scale: _pulseAnim,
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [_accent, Color(0xFF2563EB)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: _accent.withValues(alpha: 0.4),
                    blurRadius: 20,
                    spreadRadius: 3,
                  ),
                ],
              ),
              child: const Icon(Icons.track_changes_rounded,
                  color: Colors.white, size: 36),
            ),
          ),
          const SizedBox(height: 20),
          Text('Breaking down your goal…',
              style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text('Building milestones and daily tasks',
              style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500)),
        ],
      ),
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  Widget _buildError() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 18),
          const SizedBox(width: 10),
          Expanded(
              child: Text(_error!,
                  style: GoogleFonts.inter(fontSize: 13, color: Colors.redAccent))),
        ],
      ),
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  Widget _buildResults(GoalDecomposition r, Color cardBg, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Skills
        _sectionTitle('Skills You\'ll Build'),
        const SizedBox(height: 8),
        _skillsCard(r.skills, cardBg),
        const SizedBox(height: 20),

        // Weekly milestones
        _sectionTitle('Weekly Milestones'),
        const SizedBox(height: 8),
        _milestonesCard(r.weeklyMilestones, cardBg, isDark),
        const SizedBox(height: 20),

        // Daily tasks
        _sectionTitle('Daily Tasks  •  ${r.dailyTasks.length} total'),
        const SizedBox(height: 8),
        _dailyTasksCard(r.dailyTasks, cardBg, isDark),
      ],
    );
  }

  Widget _sectionTitle(String t) => Text(
        t,
        style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold),
      );

  // ── Skills chips ─────────────────────────────────────────────────────────────
  Widget _skillsCard(List<String> skills, Color cardBg) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _green.withValues(alpha: 0.2)),
      ),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: skills
            .map((s) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _green.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _green.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle_outline_rounded,
                          size: 13, color: _green),
                      const SizedBox(width: 5),
                      Text(s,
                          style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _green)),
                    ],
                  ),
                ))
            .toList(),
      ),
    );
  }

  // ── Milestones timeline ───────────────────────────────────────────────────────
  Widget _milestonesCard(
      List<WeeklyMilestone> milestones, Color cardBg, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _accent.withValues(alpha: 0.15)),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: milestones.length,
        separatorBuilder: (context, index) => Divider(
          height: 1,
          color: _accent.withValues(alpha: 0.08),
        ),
        itemBuilder: (_, i) {
          final m      = milestones[i];
          final isLast = i == milestones.length - 1;
          final color  = isLast ? _green : _accent;
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                        border: Border.all(color: color.withValues(alpha: 0.3)),
                      ),
                      child: Center(
                        child: Text('${m.week}',
                            style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: color)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Week ${m.week}',
                          style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: color)),
                      const SizedBox(height: 2),
                      Text(m.milestone,
                          style: GoogleFonts.inter(
                              fontSize: 13,
                              color: isDark ? Colors.white : Colors.black87)),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── Daily tasks list ─────────────────────────────────────────────────────────
  Widget _dailyTasksCard(
      List<DailyTask> tasks, Color cardBg, bool isDark) {
    // Group by week number
    final Map<int, List<DailyTask>> byWeek = {};
    final first = DateTime.parse(tasks.first.day);
    for (final t in tasks) {
      final d    = DateTime.parse(t.day);
      final week = ((d.difference(first).inDays) / 7).floor() + 1;
      byWeek.putIfAbsent(week, () => []).add(t);
    }

    return Column(
      children: byWeek.entries.map((e) {
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _blue.withValues(alpha: 0.12)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Text('Week ${e.key}',
                    style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: _blue)),
              ),
              ...e.value.map((t) => _taskRow(t, isDark)),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _taskRow(DailyTask t, bool isDark) {
    final date    = DateTime.parse(t.day);
    final dayName = DateFormat('EEE, MMM d').format(date);
    final catColor = _categoryColor(t.category);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: catColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: catColor.withValues(alpha: 0.25)),
            ),
            child: Icon(_categoryIcon(t.category), size: 16, color: catColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t.task,
                    style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.white : Colors.black87)),
                const SizedBox(height: 2),
                Text('$dayName  •  ${t.durationMins} min',
                    style: GoogleFonts.inter(
                        fontSize: 11, color: Colors.grey.shade500)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _categoryColor(String cat) {
    switch (cat) {
      case 'study':    return _blue;
      case 'work':     return _accent;
      case 'health':   return _green;
      default:         return _orange;
    }
  }

  IconData _categoryIcon(String cat) {
    switch (cat) {
      case 'study':    return Icons.menu_book_rounded;
      case 'work':     return Icons.work_outline_rounded;
      case 'health':   return Icons.fitness_center_rounded;
      default:         return Icons.star_outline_rounded;
    }
  }
}
