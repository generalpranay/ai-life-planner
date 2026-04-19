import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/task_service.dart';
import '../theme/app_theme.dart';

class AddTaskScreen extends StatefulWidget {
  const AddTaskScreen({super.key});

  @override
  State<AddTaskScreen> createState() => _AddTaskScreenState();
}

class _AddTaskScreenState extends State<AddTaskScreen> {
  final _titleCtrl = TextEditingController();
  final _descCtrl  = TextEditingController();
  final _goalCtrl  = TextEditingController();
  final _minsCtrl  = TextEditingController();

  String   _category  = 'study';
  int      _priority  = 3;
  bool     _loading   = false;

  // One-time scheduling
  DateTime?  _selectedDate;
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;

  // Recurrence
  bool            _isRecurring    = false;
  final List<String> _recurrenceDays = [];
  DateTime?       _rangeStart;
  DateTime?       _rangeEnd;

  // Checklist
  final List<TextEditingController> _checklistCtrls = [];

  static const _categories = ['study', 'work', 'health', 'personal', 'other'];
  static const _days        = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _goalCtrl.dispose();
    _minsCtrl.dispose();
    for (final c in _checklistCtrls) c.dispose();
    super.dispose();
  }

  // ── Pickers ────────────────────────────────────────────────────────────────

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final d   = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: now,
      lastDate: DateTime(now.year + 2),
    );
    if (d != null) setState(() => _selectedDate = d);
  }

  Future<void> _pickRangeStart() async {
    final now = DateTime.now();
    final d   = await showDatePicker(
      context: context,
      initialDate: _rangeStart ?? now,
      firstDate: now,
      lastDate: DateTime(now.year + 2),
    );
    if (d != null) setState(() => _rangeStart = d);
  }

  Future<void> _pickRangeEnd() async {
    final now = DateTime.now();
    final d   = await showDatePicker(
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
      initialTime: isStart
          ? (_startTime ?? TimeOfDay.now())
          : (_endTime   ?? TimeOfDay.now()),
    );
    if (t != null) setState(() => isStart ? _startTime = t : _endTime = t);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  void _submit() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      _snack('Title is required');
      return;
    }
    if (_isRecurring && _recurrenceDays.isEmpty) {
      _snack('Select at least one day for recurrence');
      return;
    }
    if (!_isRecurring && _selectedDate == null) {
      _snack('Please select a date');
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

    final estimatedMins = int.tryParse(_minsCtrl.text.trim());

    final result = await TaskService.createTask(
      title:            title,
      description:      _descCtrl.text.trim(),
      todaysGoal:       _goalCtrl.text.trim().isEmpty ? null : _goalCtrl.text.trim(),
      category:         _category,
      dueDate:          dueDate,
      estimatedMinutes: estimatedMins,
      priority:         _priority,
      isRecurring:      _isRecurring,
      recurrenceDays:   _isRecurring ? _recurrenceDays : null,
      startTime:        _startTime,
      endTime:          _endTime,
      dateRangeStart:   _isRecurring ? _rangeStart : null,
      dateRangeEnd:     _isRecurring ? _rangeEnd   : null,
      checklist:        checklist,
    );

    setState(() => _loading = false);

    if (!mounted) return;

    if (result.success) {
      Navigator.pop(context, true);
      return;
    }

    if (result.conflictData?['conflict'] == true) {
      await _showConflictDialog(result);
    } else {
      _snack(result.errorMessage ?? 'Failed to create task');
    }
  }

  Future<void> _showConflictDialog(TaskCreationResult result) async {
    final data           = result.conflictData!;
    final newTaskId      = data['newTaskId']          as int?;
    final existingTaskId = data['existingTaskId']     as int?;
    final existingTitle  = data['existingTaskTitle']?.toString() ?? 'Existing task';
    final newTitle       = _titleCtrl.text.trim();

    if (newTaskId == null || existingTaskId == null) return;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        icon: Container(
          width: 48, height: 48,
          decoration: BoxDecoration(
            color: AppColors.warning.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.swap_horiz_rounded,
              size: 26, color: AppColors.warning),
        ),
        title: Text('Schedule Conflict',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Both tasks have equal priority and overlap in time. '
              'They will be scheduled back-to-back — pick which goes first.',
              style: GoogleFonts.inter(fontSize: 13, height: 1.5),
            ),
            const SizedBox(height: 16),
            _ConflictOption(
              icon: Icons.push_pin_rounded,
              title: existingTitle,
              badge: 'Existing',
              color: AppColors.info,
            ),
            const SizedBox(height: 8),
            _ConflictOption(
              icon: Icons.add_task_rounded,
              title: newTitle,
              badge: 'New',
              color: AppColors.accent,
            ),
          ],
        ),
        actions: [
          OutlinedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              setState(() => _loading = true);
              final ok = await TaskService.resolveConflict(
                  existingTaskId, newTaskId);
              setState(() => _loading = false);
              if (!mounted) return;
              if (ok) {
                _snack("'$existingTitle' first, then '$newTitle'");
                Navigator.pop(context, true);
              } else {
                _snack('Failed to resolve conflict');
              }
            },
            child: Text(existingTitle,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(fontSize: 13)),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              setState(() => _loading = true);
              final ok = await TaskService.resolveConflict(
                  newTaskId, existingTaskId);
              setState(() => _loading = false);
              if (!mounted) return;
              if (ok) {
                _snack("'$newTitle' first, then '$existingTitle'");
                Navigator.pop(context, true);
              } else {
                _snack('Failed to resolve conflict');
              }
            },
            child: Text(newTitle,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(fontSize: 13)),
          ),
        ],
      ),
    );
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg)));
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded,
              color: isDark ? AppColors.darkText : AppColors.lightText),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('New Task',
            style: GoogleFonts.inter(
              fontWeight: FontWeight.w700,
              fontSize: 20,
              color: isDark ? AppColors.darkText : AppColors.lightText,
            )),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: _loading
                ? const SizedBox(
                    width: 20, height: 20,
                    child: CircularProgressIndicator(
                        color: AppColors.accent, strokeWidth: 2),
                  )
                : TextButton(
                    onPressed: _submit,
                    child: Text('Save',
                        style: GoogleFonts.inter(
                          color: AppColors.accent,
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        )),
                  ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Basic Info ─────────────────────────────────────────────────
            _Section(
              label: 'DETAILS',
              isDark: isDark,
              child: Column(
                children: [
                  _AppTextField(
                    controller: _titleCtrl,
                    label: 'Task title',
                    hint: 'What needs to be done?',
                    icon: Icons.title_rounded,
                    isDark: isDark,
                  ),
                  const SizedBox(height: 12),
                  _AppTextField(
                    controller: _descCtrl,
                    label: 'Description',
                    hint: 'Optional details…',
                    icon: Icons.notes_rounded,
                    maxLines: 3,
                    isDark: isDark,
                  ),
                  const SizedBox(height: 12),
                  _AppTextField(
                    controller: _goalCtrl,
                    label: "Today's goal",
                    hint: 'What do you want to achieve?',
                    icon: Icons.flag_rounded,
                    isDark: isDark,
                  ),
                  const SizedBox(height: 12),
                  _AppTextField(
                    controller: _minsCtrl,
                    label: 'Estimated minutes',
                    hint: 'e.g. 60',
                    icon: Icons.timer_rounded,
                    keyboardType: TextInputType.number,
                    isDark: isDark,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // ── Category ───────────────────────────────────────────────────
            _Section(
              label: 'CATEGORY',
              isDark: isDark,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _categories.map((cat) {
                  final selected  = cat == _category;
                  final catColor  = AppTheme.getCategoryColor(
                      cat, Theme.of(context).brightness);
                  return GestureDetector(
                    onTap: () => setState(() => _category = cat),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: selected
                            ? catColor.withValues(alpha: 0.15)
                            : (isDark
                                ? AppColors.darkSurface2
                                : AppColors.lightBg),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: selected
                              ? catColor.withValues(alpha: 0.60)
                              : (isDark
                                  ? AppColors.darkBorder
                                  : AppColors.lightBorder),
                          width: selected ? 1.5 : 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8, height: 8,
                            decoration: BoxDecoration(
                              color: catColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 7),
                          Text(
                            cat[0].toUpperCase() + cat.substring(1),
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: selected
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                              color: selected
                                  ? catColor
                                  : (isDark
                                      ? AppColors.darkMuted
                                      : AppColors.lightMuted),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 16),

            // ── Priority ───────────────────────────────────────────────────
            _Section(
              label: 'PRIORITY',
              isDark: isDark,
              child: Row(
                children: List.generate(5, (i) {
                  final val      = i + 1;
                  final selected = val == _priority;
                  final color    = _priorityColor(val);
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _priority = val),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        margin: EdgeInsets.only(right: i < 4 ? 6 : 0),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: selected
                              ? color.withValues(alpha: 0.15)
                              : (isDark
                                  ? AppColors.darkSurface2
                                  : AppColors.lightBg),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: selected
                                ? color.withValues(alpha: 0.60)
                                : (isDark
                                    ? AppColors.darkBorder
                                    : AppColors.lightBorder),
                            width: selected ? 1.5 : 1,
                          ),
                        ),
                        child: Column(
                          children: [
                            Text(
                              val.toString(),
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: selected
                                    ? color
                                    : (isDark
                                        ? AppColors.darkMuted
                                        : AppColors.lightMuted),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _priorityLabel(val),
                              style: GoogleFonts.inter(
                                fontSize: 9,
                                fontWeight: FontWeight.w500,
                                color: selected
                                    ? color.withValues(alpha: 0.80)
                                    : (isDark
                                        ? AppColors.darkSubtle
                                        : AppColors.lightMuted),
                                letterSpacing: 0.3,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),

            const SizedBox(height: 16),

            // ── Schedule ───────────────────────────────────────────────────
            _Section(
              label: 'SCHEDULE',
              isDark: isDark,
              child: Column(
                children: [
                  // Recurring toggle
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 4),
                    decoration: BoxDecoration(
                      color: _isRecurring
                          ? AppColors.accent.withValues(alpha: 0.08)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: _isRecurring
                            ? AppColors.accent.withValues(alpha: 0.25)
                            : (isDark
                                ? AppColors.darkBorder
                                : AppColors.lightBorder),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.repeat_rounded,
                            size: 18,
                            color: _isRecurring
                                ? AppColors.accent
                                : (isDark
                                    ? AppColors.darkMuted
                                    : AppColors.lightMuted)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Recurring task',
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: isDark
                                        ? AppColors.darkText
                                        : AppColors.lightText,
                                  )),
                              Text('Happens weekly (classes, workouts…)',
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    color: isDark
                                        ? AppColors.darkMuted
                                        : AppColors.lightMuted,
                                  )),
                            ],
                          ),
                        ),
                        Switch(
                          value: _isRecurring,
                          onChanged: (v) => setState(() => _isRecurring = v),
                          activeColor: AppColors.accent,
                          materialTapTargetSize:
                              MaterialTapTargetSize.shrinkWrap,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  if (_isRecurring) ...[
                    // Day chips
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: _days.map((day) {
                        final on = _recurrenceDays.contains(day);
                        return GestureDetector(
                          onTap: () => setState(() => on
                              ? _recurrenceDays.remove(day)
                              : _recurrenceDays.add(day)),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 130),
                            width: 42, height: 38,
                            decoration: BoxDecoration(
                              color: on
                                  ? AppColors.accent.withValues(alpha: 0.15)
                                  : (isDark
                                      ? AppColors.darkSurface2
                                      : AppColors.lightBg),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: on
                                    ? AppColors.accent.withValues(alpha: 0.50)
                                    : (isDark
                                        ? AppColors.darkBorder
                                        : AppColors.lightBorder),
                                width: on ? 1.5 : 1,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                day,
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: on
                                      ? FontWeight.w700
                                      : FontWeight.w400,
                                  color: on
                                      ? AppColors.accent
                                      : (isDark
                                          ? AppColors.darkMuted
                                          : AppColors.lightMuted),
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),
                    // Date range
                    Row(children: [
                      Expanded(
                        child: _DateChip(
                          label: _rangeStart == null
                              ? 'Start date'
                              : DateFormat('MMM d').format(_rangeStart!),
                          icon: Icons.calendar_today_rounded,
                          active: _rangeStart != null,
                          isDark: isDark,
                          onTap: _pickRangeStart,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Icon(Icons.arrow_forward_rounded,
                            size: 14,
                            color: isDark
                                ? AppColors.darkMuted
                                : AppColors.lightMuted),
                      ),
                      Expanded(
                        child: _DateChip(
                          label: _rangeEnd == null
                              ? 'End date'
                              : DateFormat('MMM d').format(_rangeEnd!),
                          icon: Icons.event_rounded,
                          active: _rangeEnd != null,
                          isDark: isDark,
                          onTap: _pickRangeEnd,
                        ),
                      ),
                    ]),
                  ] else ...[
                    // One-time date picker
                    _DateChip(
                      label: _selectedDate == null
                          ? 'Pick a date'
                          : DateFormat('EEE, MMM d yyyy')
                              .format(_selectedDate!),
                      icon: Icons.calendar_month_rounded,
                      active: _selectedDate != null,
                      isDark: isDark,
                      onTap: _pickDate,
                      fullWidth: true,
                    ),
                  ],

                  const SizedBox(height: 12),

                  // Time pickers
                  Row(children: [
                    Expanded(
                      child: _DateChip(
                        label: _startTime == null
                            ? 'Start time'
                            : _startTime!.format(context),
                        icon: Icons.schedule_rounded,
                        active: _startTime != null,
                        isDark: isDark,
                        onTap: () => _pickTime(true),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _DateChip(
                        label: _endTime == null
                            ? 'End time'
                            : _endTime!.format(context),
                        icon: Icons.schedule_rounded,
                        active: _endTime != null,
                        isDark: isDark,
                        onTap: () => _pickTime(false),
                      ),
                    ),
                  ]),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // ── Checklist ──────────────────────────────────────────────────
            _Section(
              label: 'CHECKLIST',
              isDark: isDark,
              child: Column(
                children: [
                  ..._checklistCtrls.asMap().entries.map((e) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Icon(Icons.radio_button_unchecked_rounded,
                              size: 16,
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
                                    : AppColors.lightText,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Sub-task…',
                                hintStyle: GoogleFonts.inter(
                                  fontSize: 14,
                                  color: isDark
                                      ? AppColors.darkMuted
                                      : AppColors.lightMuted,
                                ),
                                isDense: true,
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                contentPadding: EdgeInsets.zero,
                              ),
                            ),
                          ),
                          GestureDetector(
                            onTap: () => setState(() {
                              _checklistCtrls[e.key].dispose();
                              _checklistCtrls.removeAt(e.key);
                            }),
                            child: Icon(Icons.remove_circle_outline_rounded,
                                size: 18, color: AppColors.error),
                          ),
                        ],
                      ),
                    );
                  }),
                  if (_checklistCtrls.isNotEmpty)
                    Divider(
                      height: 1,
                      color: isDark
                          ? AppColors.darkBorder
                          : AppColors.lightBorder,
                    ),
                  const SizedBox(height: 4),
                  GestureDetector(
                    onTap: () => setState(() =>
                        _checklistCtrls.add(TextEditingController())),
                    child: Row(
                      children: [
                        const Icon(Icons.add_circle_outline_rounded,
                            size: 18, color: AppColors.accent),
                        const SizedBox(width: 8),
                        Text('Add item',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: AppColors.accent,
                            )),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // ── Submit button ──────────────────────────────────────────────
            Container(
              width: double.infinity,
              height: 52,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.accent, Color(0xFF5B21B6)],
                ),
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.accent.withValues(alpha: 0.35),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: _loading ? null : _submit,
                  child: Center(
                    child: _loading
                        ? const SizedBox(
                            width: 22, height: 22,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2.5),
                          )
                        : Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.add_rounded,
                                  color: Colors.white, size: 20),
                              const SizedBox(width: 8),
                              Text('Create Task',
                                  style: GoogleFonts.inter(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 15,
                                  )),
                            ],
                          ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  static Color _priorityColor(int p) {
    if (p <= 1) return AppColors.darkMuted;
    if (p == 2) return AppColors.info;
    if (p == 3) return AppColors.warning;
    if (p == 4) return AppColors.catPersonal;
    return AppColors.error;
  }

  static String _priorityLabel(int p) {
    const labels = ['', 'Low', 'Normal', 'Medium', 'High', 'Critical'];
    return labels[p];
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _Section extends StatelessWidget {
  final String label;
  final Widget child;
  final bool isDark;

  const _Section({
    required this.label,
    required this.child,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
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
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
            ),
          ),
          child: child,
        ),
      ],
    );
  }
}

class _AppTextField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData icon;
  final int maxLines;
  final TextInputType? keyboardType;
  final bool isDark;

  const _AppTextField({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    required this.isDark,
    this.maxLines = 1,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      style: GoogleFonts.inter(
        fontSize: 14,
        color: isDark ? AppColors.darkText : AppColors.lightText,
      ),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon, size: 18),
        labelStyle: GoogleFonts.inter(
          fontSize: 13,
          color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
        ),
        hintStyle: GoogleFonts.inter(
          fontSize: 13,
          color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
        ),
      ),
    );
  }
}

class _DateChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool active;
  final bool isDark;
  final VoidCallback onTap;
  final bool fullWidth;

  const _DateChip({
    required this.label,
    required this.icon,
    required this.active,
    required this.isDark,
    required this.onTap,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: fullWidth ? double.infinity : null,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: active
              ? AppColors.accent.withValues(alpha: 0.08)
              : (isDark ? AppColors.darkSurface2 : AppColors.lightBg),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: active
                ? AppColors.accent.withValues(alpha: 0.35)
                : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
          ),
        ),
        child: Row(
          mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
          children: [
            Icon(icon,
                size: 15,
                color: active
                    ? AppColors.accent
                    : (isDark ? AppColors.darkMuted : AppColors.lightMuted)),
            const SizedBox(width: 7),
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight:
                      active ? FontWeight.w500 : FontWeight.w400,
                  color: active
                      ? AppColors.accent
                      : (isDark
                          ? AppColors.darkMuted
                          : AppColors.lightMuted),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ConflictOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final String badge;
  final Color color;

  const _ConflictOption({
    required this.icon,
    required this.title,
    required this.badge,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              title,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: color),
            ),
          ),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(badge,
                style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: color)),
          ),
        ],
      ),
    );
  }
}
