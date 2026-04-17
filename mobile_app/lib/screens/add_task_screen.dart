import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/task_service.dart';
import '../services/ai_service.dart';
import '../theme/app_theme.dart';

class AddTaskScreen extends StatefulWidget {
  const AddTaskScreen({super.key});

  @override
  State<AddTaskScreen> createState() => _AddTaskScreenState();
}

class _AddTaskScreenState extends State<AddTaskScreen>
    with SingleTickerProviderStateMixin {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _goalCtrl = TextEditingController();

  String _category = 'study';
  DateTime? _selectedDate;
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;
  int _priority = 3;

  bool _isRecurring = false;
  final List<String> _recurrenceDays = [];
  DateTime? _rangeStart;
  DateTime? _rangeEnd;

  final List<TextEditingController> _checklistCtrls = [];
  bool _loading = false;

  // Natural language input
  final _nlCtrl = TextEditingController();
  bool _nlParsing = false;

  final _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  final _categories = [
    ('study', Icons.menu_book_rounded, AppColors.catStudy),
    ('work', Icons.work_outline_rounded, AppColors.catWork),
    ('health', Icons.fitness_center_rounded, AppColors.catHealth),
    ('personal', Icons.person_outline_rounded, AppColors.catPersonal),
    ('other', Icons.tag_rounded, AppColors.catDefault),
  ];

  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;

  Future<void> _parseNaturalInput() async {
    final text = _nlCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _nlParsing = true);
    final parsed = await AiService.parseTask(text);
    setState(() => _nlParsing = false);
    if (parsed == null) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not parse — try rephrasing')));
      return;
    }
    setState(() {
      if (parsed['title'] != null) _titleCtrl.text = parsed['title'];
      if (parsed['description'] != null) _descCtrl.text = parsed['description'];
      if (parsed['category'] != null) _category = parsed['category'];
      if (parsed['priority'] != null) _priority = (parsed['priority'] as num).toInt();
      if (parsed['is_recurring'] == true) _isRecurring = true;
      if (parsed['recurrence_days'] != null) {
        _recurrenceDays.clear();
        _recurrenceDays.addAll(List<String>.from(parsed['recurrence_days']));
      }
      if (parsed['start_time'] != null) {
        final p = (parsed['start_time'] as String).split(':');
        _startTime = TimeOfDay(hour: int.parse(p[0]), minute: int.parse(p[1]));
      }
      if (parsed['end_time'] != null) {
        final p = (parsed['end_time'] as String).split(':');
        _endTime = TimeOfDay(hour: int.parse(p[0]), minute: int.parse(p[1]));
      }
      if (parsed['due_date'] != null) _selectedDate = DateTime.parse(parsed['due_date']);
    });
    _nlCtrl.clear();
  }

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now();
    _animCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 400));
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut);
    _animCtrl.forward();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _goalCtrl.dispose();
    _nlCtrl.dispose();
    for (final c in _checklistCtrls) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: now,
      lastDate: DateTime(now.year + 1),
    );
    if (d != null) setState(() => _selectedDate = d);
  }

  Future<void> _pickRangeStart() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: _rangeStart ?? now,
      firstDate: now,
      lastDate: DateTime(now.year + 1),
    );
    if (d != null) setState(() => _rangeStart = d);
  }

  Future<void> _pickRangeEnd() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: _rangeEnd ?? _rangeStart ?? now,
      firstDate: _rangeStart ?? now,
      lastDate: DateTime(now.year + 2),
    );
    if (d != null) setState(() => _rangeEnd = d);
  }

  Future<void> _pickTime(bool isStart) async {
    final t = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (t != null) setState(() => isStart ? _startTime = t : _endTime = t);
  }

  void _submit() async {
    if (_titleCtrl.text.isEmpty) {
      _showSnack('Title is required');
      return;
    }
    if (_isRecurring && _recurrenceDays.isEmpty) {
      _showSnack('Select at least one day for recurrence');
      return;
    }

    setState(() => _loading = true);

    DateTime? dueDate;
    if (!_isRecurring && _selectedDate != null) {
      dueDate = _startTime != null
          ? DateTime(_selectedDate!.year, _selectedDate!.month,
              _selectedDate!.day, _startTime!.hour, _startTime!.minute)
          : _selectedDate;
    }

    final checklist = _checklistCtrls
        .map((c) => c.text.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    final result = await TaskService.createTask(
      title: _titleCtrl.text,
      description: _descCtrl.text,
      todaysGoal: _goalCtrl.text.isEmpty ? null : _goalCtrl.text,
      category: _category,
      dueDate: dueDate,
      priority: _priority,
      isRecurring: _isRecurring,
      recurrenceDays: _isRecurring ? _recurrenceDays : null,
      startTime: _startTime,
      endTime: _endTime,
      dateRangeStart: _isRecurring ? _rangeStart : null,
      dateRangeEnd: _isRecurring ? _rangeEnd : null,
      checklist: checklist,
    );

    setState(() => _loading = false);

    if (result.success) {
      if (mounted) Navigator.pop(context, true);
    } else if (result.conflictData != null &&
        result.conflictData!['conflict'] == true &&
        mounted) {
      final newId = result.conflictData!['newTaskId'];
      final existingId = result.conflictData!['existingTaskId'];
      final existingTitle =
          result.conflictData!['existingTaskTitle'] ?? 'Existing task';
      final newTitle = _titleCtrl.text;
      await _showConflictDialog(newId, existingId, newTitle, existingTitle);
    } else if (mounted) {
      _showSnack(result.errorMessage ?? 'Failed to create task');
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _showConflictDialog(
      int newId, int existingId, String newTitle, String existingTitle) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Row(children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.swap_horiz_rounded,
                color: AppColors.warning, size: 20),
          ),
          const SizedBox(width: 12),
          Text('Schedule Conflict',
              style: GoogleFonts.inter(
                  fontWeight: FontWeight.w600, fontSize: 16)),
        ]),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Both tasks have equal priority and overlap. They\'ll be scheduled back-to-back.',
              style: GoogleFonts.inter(
                  fontSize: 13,
                  color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
            ),
            const SizedBox(height: 16),
            Text('Which goes first?',
                style: GoogleFonts.inter(
                    fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 10),
            _ConflictOption(
                icon: Icons.push_pin_rounded,
                title: existingTitle,
                color: AppColors.info,
                badge: 'Existing'),
            const SizedBox(height: 8),
            _ConflictOption(
                icon: Icons.add_task_rounded,
                title: newTitle,
                color: AppColors.catHealth,
                badge: 'New'),
          ],
        ),
        actions: [
          OutlinedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              setState(() => _loading = true);
              final ok =
                  await TaskService.resolveConflict(existingId, newId);
              setState(() => _loading = false);
              if (mounted) {
                _showSnack(ok
                    ? "'$existingTitle' first, then '$newTitle'"
                    : 'Failed to resolve conflict');
                if (ok) Navigator.pop(context, true);
              }
            },
            child: Text(existingTitle,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              setState(() => _loading = true);
              final ok =
                  await TaskService.resolveConflict(newId, existingId);
              setState(() => _loading = false);
              if (mounted) {
                _showSnack(ok
                    ? "'$newTitle' first, then '$existingTitle'"
                    : 'Failed to resolve conflict');
                if (ok) Navigator.pop(context, true);
              }
            },
            style: FilledButton.styleFrom(
                backgroundColor: AppColors.catHealth),
            child: Text(newTitle,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: () => Navigator.pop(context),
          child: Icon(Icons.arrow_back,
              color: isDark ? AppColors.darkText : AppColors.lightText),
        ),
        title: Text('New Task',
            style: GoogleFonts.inter(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                color: isDark ? AppColors.darkText : AppColors.lightText)),
      ),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Natural language input ───────────────────────────────
              _NlInputBar(
                controller: _nlCtrl,
                parsing: _nlParsing,
                onParse: _parseNaturalInput,
                isDark: isDark,
              ),
              const SizedBox(height: 8),

              // ── Basic info ───────────────────────────────────────────
              _Section(
                label: 'DETAILS',
                isDark: isDark,
                child: Column(children: [
                  _ThemedField(
                    controller: _titleCtrl,
                    label: 'Task title',
                    icon: Icons.title_rounded,
                    isDark: isDark,
                  ),
                  const SizedBox(height: 12),
                  _ThemedField(
                    controller: _descCtrl,
                    label: 'Description',
                    icon: Icons.notes_rounded,
                    maxLines: 3,
                    isDark: isDark,
                  ),
                  const SizedBox(height: 12),
                  _ThemedField(
                    controller: _goalCtrl,
                    label: "Today's goal (optional)",
                    icon: Icons.flag_rounded,
                    isDark: isDark,
                  ),
                ]),
              ),

              // ── Category ─────────────────────────────────────────────
              _Section(
                label: 'CATEGORY',
                isDark: isDark,
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _categories.map((cat) {
                    final selected = _category == cat.$1;
                    return GestureDetector(
                      onTap: () => setState(() => _category = cat.$1),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: selected
                              ? cat.$3.withValues(alpha: 0.18)
                              : isDark
                                  ? AppColors.darkSurface2
                                  : AppColors.lightBg,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: selected
                                ? cat.$3.withValues(alpha: 0.50)
                                : isDark
                                    ? AppColors.darkBorder
                                    : AppColors.lightBorder,
                            width: selected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(cat.$2,
                              size: 16,
                              color: selected
                                  ? cat.$3
                                  : isDark
                                      ? AppColors.darkMuted
                                      : AppColors.lightMuted),
                          const SizedBox(width: 6),
                          Text(
                            cat.$1[0].toUpperCase() + cat.$1.substring(1),
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: selected
                                  ? cat.$3
                                  : isDark
                                      ? AppColors.darkText
                                      : AppColors.lightText,
                            ),
                          ),
                        ]),
                      ),
                    );
                  }).toList(),
                ),
              ),

              // ── Schedule ─────────────────────────────────────────────
              _Section(
                label: 'SCHEDULE',
                isDark: isDark,
                child: Column(children: [
                  // Recurring toggle
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    decoration: BoxDecoration(
                      color: _isRecurring
                          ? AppColors.accent.withValues(alpha: 0.08)
                          : isDark
                              ? AppColors.darkSurface2
                              : AppColors.lightBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _isRecurring
                            ? AppColors.accent.withValues(alpha: 0.35)
                            : isDark
                                ? AppColors.darkBorder
                                : AppColors.lightBorder,
                      ),
                    ),
                    child: SwitchListTile(
                      dense: true,
                      title: Text('Recurring task',
                          style: GoogleFonts.inter(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: isDark
                                  ? AppColors.darkText
                                  : AppColors.lightText)),
                      subtitle: Text('Repeats every week',
                          style: GoogleFonts.inter(
                              fontSize: 12,
                              color: isDark
                                  ? AppColors.darkMuted
                                  : AppColors.lightMuted)),
                      activeColor: AppColors.accent,
                      value: _isRecurring,
                      onChanged: (v) => setState(() => _isRecurring = v),
                    ),
                  ),
                  const SizedBox(height: 12),

                  if (_isRecurring) ...[
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text('Repeats on',
                          style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isDark
                                  ? AppColors.darkMuted
                                  : AppColors.lightMuted,
                              letterSpacing: 0.3)),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      children: _days.map((day) {
                        final sel = _recurrenceDays.contains(day);
                        return GestureDetector(
                          onTap: () => setState(() => sel
                              ? _recurrenceDays.remove(day)
                              : _recurrenceDays.add(day)),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 160),
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: sel
                                  ? AppColors.accent
                                  : isDark
                                      ? AppColors.darkSurface2
                                      : AppColors.lightBg,
                              border: Border.all(
                                color: sel
                                    ? AppColors.accent
                                    : isDark
                                        ? AppColors.darkBorder
                                        : AppColors.lightBorder,
                              ),
                            ),
                            child: Center(
                              child: Text(day[0],
                                  style: GoogleFonts.inter(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: sel
                                          ? Colors.white
                                          : isDark
                                              ? AppColors.darkMuted
                                              : AppColors.lightMuted)),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),
                    Row(children: [
                      Expanded(
                        child: _DateTile(
                          icon: Icons.calendar_today_rounded,
                          label: _rangeStart == null
                              ? 'Start date'
                              : DateFormat('MMM d').format(_rangeStart!),
                          onTap: _pickRangeStart,
                          isDark: isDark,
                          active: _rangeStart != null,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _DateTile(
                          icon: Icons.event_rounded,
                          label: _rangeEnd == null
                              ? 'End date'
                              : DateFormat('MMM d').format(_rangeEnd!),
                          onTap: _pickRangeEnd,
                          isDark: isDark,
                          active: _rangeEnd != null,
                        ),
                      ),
                    ]),
                  ] else ...[
                    _DateTile(
                      icon: Icons.calendar_today_rounded,
                      label: _selectedDate == null
                          ? 'Pick date'
                          : DateFormat('EEE, MMM d, yyyy')
                              .format(_selectedDate!),
                      onTap: _pickDate,
                      isDark: isDark,
                      active: _selectedDate != null,
                    ),
                  ],

                  const SizedBox(height: 8),
                  Row(children: [
                    Expanded(
                      child: _DateTile(
                        icon: Icons.schedule_rounded,
                        label: _startTime == null
                            ? 'Start time'
                            : _startTime!.format(context),
                        onTap: () => _pickTime(true),
                        isDark: isDark,
                        active: _startTime != null,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _DateTile(
                        icon: Icons.schedule_rounded,
                        label: _endTime == null
                            ? 'End time'
                            : _endTime!.format(context),
                        onTap: () => _pickTime(false),
                        isDark: isDark,
                        active: _endTime != null,
                      ),
                    ),
                  ]),
                ]),
              ),

              // ── Priority ─────────────────────────────────────────────
              _Section(
                label: 'PRIORITY',
                isDark: isDark,
                child: Row(
                  children: List.generate(5, (i) {
                    final level = i + 1;
                    final sel = _priority == level;
                    final colors = [
                      AppColors.catHealth,
                      AppColors.catStudy,
                      AppColors.warning,
                      AppColors.catRoutine,
                      AppColors.error,
                    ];
                    final labels = ['Low', '', 'Mid', '', 'High'];
                    return Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _priority = level),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 160),
                          margin: EdgeInsets.only(right: i < 4 ? 6 : 0),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: sel
                                ? colors[i].withValues(alpha: 0.18)
                                : isDark
                                    ? AppColors.darkSurface2
                                    : AppColors.lightBg,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: sel
                                  ? colors[i].withValues(alpha: 0.50)
                                  : isDark
                                      ? AppColors.darkBorder
                                      : AppColors.lightBorder,
                              width: sel ? 1.5 : 1,
                            ),
                          ),
                          child: Column(children: [
                            Text('$level',
                                style: GoogleFonts.inter(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 16,
                                    color: sel
                                        ? colors[i]
                                        : isDark
                                            ? AppColors.darkMuted
                                            : AppColors.lightMuted)),
                            if (labels[i].isNotEmpty)
                              Text(labels[i],
                                  style: GoogleFonts.inter(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w500,
                                      color: sel
                                          ? colors[i]
                                          : isDark
                                              ? AppColors.darkSubtle
                                              : AppColors.lightMuted)),
                          ]),
                        ),
                      ),
                    );
                  }),
                ),
              ),

              // ── Checklist ────────────────────────────────────────────
              _Section(
                label: 'CHECKLIST',
                isDark: isDark,
                child: Column(
                  children: [
                    ..._checklistCtrls.asMap().entries.map((e) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(children: [
                            Icon(Icons.radio_button_unchecked_rounded,
                                size: 18,
                                color: isDark
                                    ? AppColors.darkMuted
                                    : AppColors.lightMuted),
                            const SizedBox(width: 10),
                            Expanded(
                              child: TextField(
                                controller: e.value,
                                style: GoogleFonts.inter(
                                    fontSize: 14,
                                    color: isDark
                                        ? AppColors.darkText
                                        : AppColors.lightText),
                                decoration: InputDecoration(
                                  hintText: 'Checklist item…',
                                  hintStyle: GoogleFonts.inter(
                                      fontSize: 14,
                                      color: isDark
                                          ? AppColors.darkSubtle
                                          : AppColors.lightMuted),
                                  isDense: true,
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: UnderlineInputBorder(
                                    borderSide: BorderSide(
                                        color: AppColors.accent
                                            .withValues(alpha: 0.50)),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(
                                      vertical: 6),
                                ),
                              ),
                            ),
                            GestureDetector(
                              onTap: () => setState(() {
                                e.value.dispose();
                                _checklistCtrls.removeAt(e.key);
                              }),
                              child: Padding(
                                padding: const EdgeInsets.all(4),
                                child: Icon(Icons.close_rounded,
                                    size: 16,
                                    color: isDark
                                        ? AppColors.darkMuted
                                        : AppColors.lightMuted),
                              ),
                            ),
                          ]),
                        )),
                    GestureDetector(
                      onTap: () => setState(() =>
                          _checklistCtrls.add(TextEditingController())),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.accent.withValues(alpha: 0.06),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: AppColors.accent.withValues(alpha: 0.20)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.add_rounded,
                                color: AppColors.accent, size: 16),
                            const SizedBox(width: 6),
                            Text('Add item',
                                style: GoogleFonts.inter(
                                    color: AppColors.accent,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 8),

              // ── Submit ───────────────────────────────────────────────
              _GradientButton(
                onPressed: _loading ? null : _submit,
                loading: _loading,
                label: 'Create Task',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Sub-widgets ──────────────────────────────────────────────────────────────

class _Section extends StatelessWidget {
  final String label;
  final bool isDark;
  final Widget child;

  const _Section(
      {required this.label, required this.isDark, required this.child});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Padding(
            padding: const EdgeInsets.only(left: 2, bottom: 10),
            child: Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
                color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
            ),
            child: child,
          ),
        ]),
      );
}

class _ThemedField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final int maxLines;
  final bool isDark;

  const _ThemedField({
    required this.controller,
    required this.label,
    required this.icon,
    required this.isDark,
    this.maxLines = 1,
  });

  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        maxLines: maxLines,
        style: GoogleFonts.inter(
            fontSize: 14,
            color: isDark ? AppColors.darkText : AppColors.lightText),
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, size: 18),
        ),
      );
}

class _DateTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isDark;
  final bool active;

  const _DateTile({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.isDark,
    this.active = false,
  });

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: active
                ? AppColors.accent.withValues(alpha: 0.08)
                : isDark
                    ? AppColors.darkSurface2
                    : AppColors.lightBg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: active
                  ? AppColors.accent.withValues(alpha: 0.35)
                  : isDark
                      ? AppColors.darkBorder
                      : AppColors.lightBorder,
            ),
          ),
          child: Row(children: [
            Icon(icon,
                size: 16,
                color: active
                    ? AppColors.accent
                    : isDark
                        ? AppColors.darkMuted
                        : AppColors.lightMuted),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: active ? FontWeight.w500 : FontWeight.w400,
                  color: active
                      ? isDark
                          ? AppColors.darkText
                          : AppColors.lightText
                      : isDark
                          ? AppColors.darkMuted
                          : AppColors.lightMuted,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ]),
        ),
      );
}

class _ConflictOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color color;
  final String badge;

  const _ConflictOption(
      {required this.icon,
      required this.title,
      required this.color,
      required this.badge});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.30)),
        ),
        child: Row(children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(title,
                style: GoogleFonts.inter(
                    fontWeight: FontWeight.w500, color: color, fontSize: 13),
                overflow: TextOverflow.ellipsis),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(badge,
                style: GoogleFonts.inter(
                    fontSize: 10,
                    color: color,
                    fontWeight: FontWeight.w700)),
          ),
        ]),
      );
}

class _GradientButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final bool loading;
  final String label;

  const _GradientButton({
    required this.onPressed,
    required this.loading,
    required this.label,
  });

  @override
  State<_GradientButton> createState() => _GradientButtonState();
}

class _GradientButtonState extends State<_GradientButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) => MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          height: 52,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            gradient: const LinearGradient(
                colors: [AppColors.accent, Color(0xFF5B21B6)]),
            boxShadow: widget.onPressed != null
                ? [
                    BoxShadow(
                      color: AppColors.accent
                          .withValues(alpha: _hovered ? 0.50 : 0.30),
                      blurRadius: _hovered ? 20 : 12,
                      offset: const Offset(0, 4),
                    )
                  ]
                : [],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: widget.onPressed,
              child: Center(
                child: widget.loading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2.5))
                    : Text(widget.label,
                        style: GoogleFonts.inter(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 15)),
              ),
            ),
          ),
        ),
      );
}

class _NlInputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool parsing;
  final VoidCallback onParse;
  final bool isDark;

  const _NlInputBar({
    required this.controller,
    required this.parsing,
    required this.onParse,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      gradient: LinearGradient(
        colors: [
          AppColors.accent.withValues(alpha: isDark ? 0.12 : 0.07),
          AppColors.cyan.withValues(alpha: isDark ? 0.06 : 0.04),
        ],
      ),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppColors.accent.withValues(alpha: 0.25)),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Icon(Icons.auto_awesome_rounded, size: 14, color: AppColors.accent),
        const SizedBox(width: 6),
        Text('Describe your task in plain English',
            style: GoogleFonts.inter(
                fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.accent)),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(
          child: TextField(
            controller: controller,
            style: GoogleFonts.inter(
                fontSize: 13,
                color: isDark ? AppColors.darkText : AppColors.lightText),
            decoration: InputDecoration(
              hintText: 'e.g. Study React every Tuesday 7–9pm',
              hintStyle: GoogleFonts.inter(
                  fontSize: 13,
                  color: isDark ? AppColors.darkSubtle : AppColors.lightMuted),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              filled: true,
              fillColor: isDark ? AppColors.darkSurface2 : AppColors.lightSurface,
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none),
              enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
              ),
            ),
            onSubmitted: (_) => onParse(),
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: parsing ? null : onParse,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 40, height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              gradient: const LinearGradient(
                  colors: [AppColors.accent, Color(0xFF5B21B6)]),
            ),
            child: parsing
                ? const Center(child: SizedBox(width: 16, height: 16,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)))
                : const Icon(Icons.send_rounded, color: Colors.white, size: 16),
          ),
        ),
      ]),
    ]),
  );
}
