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
  int _weeksAvailable = 4;
  final Set<String> _strongCategories = {};
  final Set<String> _avoidCategories = {};
  bool _showAdvanced = false;

  GoalDecomposition? _result;
  bool _loading = false;
  String? _error;

  late AnimationController _pulseCtrl;
  late Animation<double> _pulseAnim;

  static const _accent  = Color(0xFF7C3AED);
  static const _green   = Color(0xFF22C55E);
  static const _orange  = Color(0xFFF97316);
  static const _blue    = Color(0xFF3B82F6);
  static const _rose    = Color(0xFFF43F5E);

  static const _allCategories = ['study', 'work', 'health', 'personal'];

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
    setState(() {
      _loading = true;
      _error = null;
      _result = null;
    });
    try {
      final today    = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final deadline = DateFormat('yyyy-MM-dd').format(_deadline!);
      final result   = await GoalService.decompose(
        goal:             goal,
        deadline:         deadline,
        today:            today,
        weeksAvailable:   _weeksAvailable,
        strongCategories: _strongCategories.toList(),
        avoidCategories:  _avoidCategories.toList(),
      );
      setState(() {
        _result  = result;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error   = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg     = isDark ? const Color(0xFF0F0F1A) : const Color(0xFFF5F7FF);
    final cardBg = isDark ? const Color(0xFF1A1A2E) : Colors.white;

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
                gradient: const LinearGradient(colors: [_accent, _blue]),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.track_changes_rounded,
                  color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            Text('Goal Decomposer',
                style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
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
              style:
                  GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 10),
          TextField(
            controller: _goalCtrl,
            maxLines: 3,
            style: GoogleFonts.inter(fontSize: 14),
            decoration: InputDecoration(
              hintText: 'e.g. Get a software internship in 3 months',
              hintStyle:
                  GoogleFonts.inter(color: Colors.grey.shade500, fontSize: 13),
              filled: true,
              fillColor: isDark
                  ? const Color(0xFF0F0F1A)
                  : const Color(0xFFF8F8FF),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    BorderSide(color: _accent.withValues(alpha: 0.2)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: _accent),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    BorderSide(color: _accent.withValues(alpha: 0.2)),
              ),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
          const SizedBox(height: 14),
          Text('Deadline',
              style:
                  GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: _pickDeadline,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF0F0F1A)
                    : const Color(0xFFF8F8FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color:
                        hasDl ? _accent : _accent.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  Icon(Icons.calendar_today_rounded,
                      size: 16,
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
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Weeks available: $_weeksAvailable',
                  style: GoogleFonts.inter(
                      fontWeight: FontWeight.w600, fontSize: 14)),
              Text('${_weeksAvailable}w',
                  style: GoogleFonts.inter(
                      fontSize: 12,
                      color: _accent,
                      fontWeight: FontWeight.bold)),
            ],
          ),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: _accent,
              thumbColor: _accent,
              inactiveTrackColor: _accent.withValues(alpha: 0.2),
              overlayColor: _accent.withValues(alpha: 0.12),
              trackHeight: 3,
            ),
            child: Slider(
              value: _weeksAvailable.toDouble(),
              min: 1,
              max: 26,
              divisions: 25,
              onChanged: (v) => setState(() => _weeksAvailable = v.round()),
            ),
          ),
          GestureDetector(
            onTap: () => setState(() => _showAdvanced = !_showAdvanced),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Icon(
                    _showAdvanced
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.tune_rounded,
                    size: 16,
                    color: Colors.grey.shade500,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _showAdvanced
                        ? 'Hide preferences'
                        : 'Personalize (optional)',
                    style: GoogleFonts.inter(
                        fontSize: 12, color: Colors.grey.shade500),
                  ),
                ],
              ),
            ),
          ),
          if (_showAdvanced) ...[
            const SizedBox(height: 10),
            _buildCategoryPicker(
              label: 'Strong at',
              selected: _strongCategories,
              activeColor: _green,
              onToggle: (cat) => setState(() {
                _strongCategories.contains(cat)
                    ? _strongCategories.remove(cat)
                    : _strongCategories.add(cat);
              }),
              isDark: isDark,
            ),
            const SizedBox(height: 10),
            _buildCategoryPicker(
              label: 'Avoid',
              selected: _avoidCategories,
              activeColor: _rose,
              onToggle: (cat) => setState(() {
                _avoidCategories.contains(cat)
                    ? _avoidCategories.remove(cat)
                    : _avoidCategories.add(cat);
              }),
              isDark: isDark,
            ),
          ],
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: Container(
              decoration: BoxDecoration(
                gradient:
                    const LinearGradient(colors: [_accent, _blue]),
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

  Widget _buildCategoryPicker({
    required String label,
    required Set<String> selected,
    required Color activeColor,
    required void Function(String) onToggle,
    required bool isDark,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade500)),
        const SizedBox(height: 6),
        Wrap(
          spacing: 8,
          children: _allCategories.map((cat) {
            final isOn = selected.contains(cat);
            return GestureDetector(
              onTap: () => onToggle(cat),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isOn
                      ? activeColor.withValues(alpha: 0.15)
                      : (isDark
                          ? const Color(0xFF0F0F1A)
                          : const Color(0xFFF1F1F8)),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isOn
                        ? activeColor.withValues(alpha: 0.5)
                        : Colors.transparent,
                  ),
                ),
                child: Text(
                  cat,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight:
                        isOn ? FontWeight.w600 : FontWeight.normal,
                    color: isOn ? activeColor : Colors.grey.shade500,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
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
                  colors: [_accent, _blue],
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
          Text('Building your roadmap…',
              style: GoogleFonts.inter(
                  fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text('Distributing tasks across $_weeksAvailable weeks',
              style: GoogleFonts.inter(
                  fontSize: 13, color: Colors.grey.shade500)),
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
          const Icon(Icons.error_outline_rounded,
              color: Colors.redAccent, size: 18),
          const SizedBox(width: 10),
          Expanded(
              child: Text(_error!,
                  style: GoogleFonts.inter(
                      fontSize: 13, color: Colors.redAccent))),
        ],
      ),
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  Widget _buildResults(GoalDecomposition r, Color cardBg, bool isDark) {
    final totalTasks =
        r.weeks.fold<int>(0, (sum, w) => sum + w.dailyTasks.length);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSummaryCard(r, cardBg, isDark),
        const SizedBox(height: 16),
        _sectionLabel('Skills You\'ll Build'),
        const SizedBox(height: 8),
        _buildSkillsCard(r.skills, cardBg),
        const SizedBox(height: 20),
        _sectionLabel('${r.weeks.length}-Week Roadmap  •  $totalTasks tasks'),
        const SizedBox(height: 8),
        ...r.weeks.map((w) => _buildWeekCard(w, cardBg, isDark)),
      ],
    );
  }

  // ── Summary card ─────────────────────────────────────────────────────────────
  Widget _buildSummaryCard(
      GoalDecomposition r, Color cardBg, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            _accent.withValues(alpha: 0.12),
            _blue.withValues(alpha: 0.08),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _accent.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.flag_rounded, size: 16, color: _accent),
              const SizedBox(width: 6),
              Text('Goal Plan',
                  style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: _accent,
                      letterSpacing: 0.5)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: _accent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${r.weeks.length}w plan',
                  style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: _accent),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            r.summary,
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  // ── Skills chips ─────────────────────────────────────────────────────────────
  Widget _buildSkillsCard(List<String> skills, Color cardBg) {
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
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _green.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border:
                        Border.all(color: _green.withValues(alpha: 0.3)),
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

  // ── Week card ────────────────────────────────────────────────────────────────
  Widget _buildWeekCard(Week w, Color cardBg, bool isDark) {
    final isLast   = w.week == _result!.weeks.length;
    final accent   = isLast ? _green : _accent;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accent.withValues(alpha: 0.15)),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          childrenPadding: EdgeInsets.zero,
          leading: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              shape: BoxShape.circle,
              border: Border.all(color: accent.withValues(alpha: 0.3)),
            ),
            child: Center(
              child: Text('${w.week}',
                  style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: accent)),
            ),
          ),
          title: Text(
            w.focus,
            style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: accent),
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              w.milestone,
              style: GoogleFonts.inter(
                  fontSize: 12,
                  color: isDark
                      ? Colors.white70
                      : Colors.black54),
            ),
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('${w.dailyTasks.length} tasks',
                  style: GoogleFonts.inter(
                      fontSize: 11, color: Colors.grey.shade500)),
              const SizedBox(width: 4),
              Icon(Icons.keyboard_arrow_down_rounded,
                  size: 18, color: Colors.grey.shade500),
            ],
          ),
          children: [
            Divider(
                height: 1,
                color: accent.withValues(alpha: 0.1)),
            ...w.dailyTasks.map((t) => _buildTaskRow(t, isDark)),
            const SizedBox(height: 4),
          ],
        ),
      ),
    );
  }

  // ── Task row ─────────────────────────────────────────────────────────────────
  Widget _buildTaskRow(DailyTask t, bool isDark) {
    final catColor   = _categoryColor(t.category);
    final energyIcon = _energyIcon(t.energyType);
    final energyColor = _energyColor(t.energyType);
    final dayColor   = _dayColor(t.dayOfWeek);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: catColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(9),
              border:
                  Border.all(color: catColor.withValues(alpha: 0.25)),
            ),
            child:
                Icon(_categoryIcon(t.category), size: 15, color: catColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t.title,
                  style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.white : Colors.black87),
                ),
                const SizedBox(height: 5),
                Row(
                  children: [
                    _pill(t.dayOfWeek, dayColor),
                    const SizedBox(width: 6),
                    _pill('${t.durationMins} min', Colors.grey.shade500),
                    const SizedBox(width: 6),
                    Icon(energyIcon, size: 12, color: energyColor),
                    const SizedBox(width: 3),
                    Text(t.energyType,
                        style: GoogleFonts.inter(
                            fontSize: 11, color: energyColor)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _pill(String label, Color color) => Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color),
        ),
      );

  Widget _sectionLabel(String t) => Text(t,
      style:
          GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold));

  // ── Helpers ──────────────────────────────────────────────────────────────────
  Color _categoryColor(String cat) {
    switch (cat) {
      case 'study':  return _blue;
      case 'work':   return _accent;
      case 'health': return _green;
      default:       return _orange;
    }
  }

  IconData _categoryIcon(String cat) {
    switch (cat) {
      case 'study':  return Icons.menu_book_rounded;
      case 'work':   return Icons.work_outline_rounded;
      case 'health': return Icons.fitness_center_rounded;
      default:       return Icons.star_outline_rounded;
    }
  }

  IconData _energyIcon(String energy) {
    switch (energy) {
      case 'deep':    return Icons.bolt_rounded;
      case 'light':   return Icons.wb_sunny_rounded;
      default:        return Icons.headphones_rounded;
    }
  }

  Color _energyColor(String energy) {
    switch (energy) {
      case 'deep':    return _accent;
      case 'light':   return _orange;
      default:        return _blue;
    }
  }

  Color _dayColor(String day) {
    switch (day) {
      case 'Mon': return _rose;
      case 'Tue': return _orange;
      case 'Wed': return _green;
      case 'Thu': return _blue;
      case 'Fri': return _accent;
      case 'Sat': return const Color(0xFFEC4899);
      default:    return const Color(0xFF14B8A6);
    }
  }
}
