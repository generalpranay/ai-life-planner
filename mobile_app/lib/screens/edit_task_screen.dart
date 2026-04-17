import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../models/task.dart';
import '../services/task_service.dart';
import '../theme/app_theme.dart';

class EditTaskScreen extends StatefulWidget {
  final Task task;
  const EditTaskScreen({super.key, required this.task});

  @override
  State<EditTaskScreen> createState() => _EditTaskScreenState();
}

class _EditTaskScreenState extends State<EditTaskScreen>
    with SingleTickerProviderStateMixin {
  late TextEditingController _titleCtrl;
  late TextEditingController _descCtrl;
  late TextEditingController _goalCtrl;

  late String _category;
  DateTime? _selectedDate;
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;
  late int _priority;

  late bool _isRecurring;
  late List<String> _recurrenceDays;
  DateTime? _rangeStart;
  DateTime? _rangeEnd;

  bool _loading = false;
  bool _deleting = false;

  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;

  final _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  final _categories = [
    ('study', Icons.menu_book_rounded, AppColors.catStudy),
    ('work', Icons.work_outline_rounded, AppColors.catWork),
    ('health', Icons.fitness_center_rounded, AppColors.catHealth),
    ('personal', Icons.person_outline_rounded, AppColors.catPersonal),
    ('other', Icons.tag_rounded, AppColors.catDefault),
  ];

  @override
  void initState() {
    super.initState();
    final t = widget.task;
    _titleCtrl = TextEditingController(text: t.title);
    _descCtrl = TextEditingController(text: t.description ?? '');
    _goalCtrl = TextEditingController(text: t.todaysGoal ?? '');
    _category = t.category;
    _priority = t.priority;
    _isRecurring = t.isRecurring;
    _recurrenceDays = List<String>.from(t.recurrenceDays ?? []);
    _selectedDate = t.dueDate;
    _rangeStart = t.dateRangeStart;
    _rangeEnd = t.dateRangeEnd;

    if (t.startTime != null) {
      final parts = t.startTime!.split(':');
      _startTime = TimeOfDay(
          hour: int.parse(parts[0]), minute: int.parse(parts[1].split(':')[0]));
    }
    if (t.endTime != null) {
      final parts = t.endTime!.split(':');
      _endTime = TimeOfDay(
          hour: int.parse(parts[0]), minute: int.parse(parts[1].split(':')[0]));
    }

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
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 2),
    );
    if (d != null) setState(() => _selectedDate = d);
  }

  Future<void> _pickTime(bool isStart) async {
    final t = await showTimePicker(
        context: context, initialTime: TimeOfDay.now());
    if (t != null) setState(() => isStart ? _startTime = t : _endTime = t);
  }

  Future<void> _pickRangeStart() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: _rangeStart ?? now,
      firstDate: now,
      lastDate: DateTime(now.year + 2),
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

  Future<void> _save() async {
    if (_titleCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Title is required')));
      return;
    }
    setState(() => _loading = true);

    final fields = <String, dynamic>{
      'title': _titleCtrl.text,
      'description': _descCtrl.text.isEmpty ? null : _descCtrl.text,
      'todays_goal': _goalCtrl.text.isEmpty ? null : _goalCtrl.text,
      'category': _category,
      'priority': _priority,
      'is_recurring': _isRecurring,
      'recurrence_days': _isRecurring ? _recurrenceDays.join(',') : null,
      if (_startTime != null)
        'start_time':
            '${_startTime!.hour.toString().padLeft(2, '0')}:${_startTime!.minute.toString().padLeft(2, '0')}:00',
      if (_endTime != null)
        'end_time':
            '${_endTime!.hour.toString().padLeft(2, '0')}:${_endTime!.minute.toString().padLeft(2, '0')}:00',
      if (!_isRecurring && _selectedDate != null)
        'due_datetime': _selectedDate!.toIso8601String(),
      if (_isRecurring && _rangeStart != null)
        'date_range_start': _rangeStart!.toIso8601String(),
      if (_isRecurring && _rangeEnd != null)
        'date_range_end': _rangeEnd!.toIso8601String(),
    };

    final ok = await TaskService.updateTask(widget.task.id, fields);
    setState(() => _loading = false);

    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Task updated')));
      Navigator.pop(context, true);
    } else {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Failed to update task')));
    }
  }

  Future<void> _delete() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete task'),
        content: Text('Delete "${widget.task.title}"? This cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _deleting = true);
    final ok = await TaskService.deleteTask(widget.task.id);
    setState(() => _deleting = false);
    if (!mounted) return;
    if (ok) {
      Navigator.pop(context, 'deleted');
    } else {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Failed to delete task')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
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
        title: Text('Edit Task',
            style: GoogleFonts.inter(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                color: isDark ? AppColors.darkText : AppColors.lightText)),
        actions: [
          IconButton(
            icon: _deleting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        color: AppColors.error, strokeWidth: 2))
                : const Icon(Icons.delete_outline_rounded,
                    color: AppColors.error),
            onPressed: _deleting ? null : _delete,
            tooltip: 'Delete task',
          ),
        ],
      ),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _Section(
                label: 'DETAILS',
                isDark: isDark,
                child: Column(children: [
                  _ThemedField(controller: _titleCtrl, label: 'Task title',
                      icon: Icons.title_rounded, isDark: isDark),
                  const SizedBox(height: 12),
                  _ThemedField(controller: _descCtrl, label: 'Description',
                      icon: Icons.notes_rounded, maxLines: 3, isDark: isDark),
                  const SizedBox(height: 12),
                  _ThemedField(controller: _goalCtrl,
                      label: "Today's goal (optional)",
                      icon: Icons.flag_rounded, isDark: isDark),
                ]),
              ),
              _Section(
                label: 'CATEGORY',
                isDark: isDark,
                child: Wrap(
                  spacing: 8, runSpacing: 8,
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
                              : isDark ? AppColors.darkSurface2 : AppColors.lightBg,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: selected
                                ? cat.$3.withValues(alpha: 0.50)
                                : isDark ? AppColors.darkBorder : AppColors.lightBorder,
                            width: selected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(cat.$2, size: 16,
                              color: selected ? cat.$3
                                  : isDark ? AppColors.darkMuted : AppColors.lightMuted),
                          const SizedBox(width: 6),
                          Text(
                            cat.$1[0].toUpperCase() + cat.$1.substring(1),
                            style: GoogleFonts.inter(fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: selected ? cat.$3
                                    : isDark ? AppColors.darkText : AppColors.lightText),
                          ),
                        ]),
                      ),
                    );
                  }).toList(),
                ),
              ),
              _Section(
                label: 'SCHEDULE',
                isDark: isDark,
                child: Column(children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    decoration: BoxDecoration(
                      color: _isRecurring
                          ? AppColors.accent.withValues(alpha: 0.08)
                          : isDark ? AppColors.darkSurface2 : AppColors.lightBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _isRecurring
                            ? AppColors.accent.withValues(alpha: 0.35)
                            : isDark ? AppColors.darkBorder : AppColors.lightBorder,
                      ),
                    ),
                    child: SwitchListTile(
                      dense: true,
                      title: Text('Recurring task',
                          style: GoogleFonts.inter(fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: isDark ? AppColors.darkText : AppColors.lightText)),
                      subtitle: Text('Repeats every week',
                          style: GoogleFonts.inter(fontSize: 12,
                              color: isDark ? AppColors.darkMuted : AppColors.lightMuted)),
                      activeColor: AppColors.accent,
                      value: _isRecurring,
                      onChanged: (v) => setState(() => _isRecurring = v),
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_isRecurring) ...[
                    Align(alignment: Alignment.centerLeft,
                      child: Text('Repeats on',
                          style: GoogleFonts.inter(fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                              letterSpacing: 0.3)),
                    ),
                    const SizedBox(height: 8),
                    Wrap(spacing: 6,
                      children: _days.map((day) {
                        final sel = _recurrenceDays.contains(day);
                        return GestureDetector(
                          onTap: () => setState(() => sel
                              ? _recurrenceDays.remove(day)
                              : _recurrenceDays.add(day)),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 160),
                            width: 40, height: 40,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: sel ? AppColors.accent
                                  : isDark ? AppColors.darkSurface2 : AppColors.lightBg,
                              border: Border.all(
                                  color: sel ? AppColors.accent
                                      : isDark ? AppColors.darkBorder : AppColors.lightBorder),
                            ),
                            child: Center(child: Text(day[0],
                                style: GoogleFonts.inter(fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: sel ? Colors.white
                                        : isDark ? AppColors.darkMuted : AppColors.lightMuted))),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),
                    Row(children: [
                      Expanded(child: _DateTile(icon: Icons.calendar_today_rounded,
                          label: _rangeStart == null ? 'Start date' : DateFormat('MMM d').format(_rangeStart!),
                          onTap: _pickRangeStart, isDark: isDark, active: _rangeStart != null)),
                      const SizedBox(width: 8),
                      Expanded(child: _DateTile(icon: Icons.event_rounded,
                          label: _rangeEnd == null ? 'End date' : DateFormat('MMM d').format(_rangeEnd!),
                          onTap: _pickRangeEnd, isDark: isDark, active: _rangeEnd != null)),
                    ]),
                  ] else ...[
                    _DateTile(icon: Icons.calendar_today_rounded,
                        label: _selectedDate == null ? 'Pick date'
                            : DateFormat('EEE, MMM d, yyyy').format(_selectedDate!),
                        onTap: _pickDate, isDark: isDark, active: _selectedDate != null),
                  ],
                  const SizedBox(height: 8),
                  Row(children: [
                    Expanded(child: _DateTile(icon: Icons.schedule_rounded,
                        label: _startTime == null ? 'Start time' : _startTime!.format(context),
                        onTap: () => _pickTime(true), isDark: isDark, active: _startTime != null)),
                    const SizedBox(width: 8),
                    Expanded(child: _DateTile(icon: Icons.schedule_rounded,
                        label: _endTime == null ? 'End time' : _endTime!.format(context),
                        onTap: () => _pickTime(false), isDark: isDark, active: _endTime != null)),
                  ]),
                ]),
              ),
              _Section(
                label: 'PRIORITY',
                isDark: isDark,
                child: Row(
                  children: List.generate(5, (i) {
                    final level = i + 1;
                    final sel = _priority == level;
                    final colors = [AppColors.catHealth, AppColors.catStudy,
                      AppColors.warning, AppColors.catRoutine, AppColors.error];
                    final labels = ['Low', '', 'Mid', '', 'High'];
                    return Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _priority = level),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 160),
                          margin: EdgeInsets.only(right: i < 4 ? 6 : 0),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: sel ? colors[i].withValues(alpha: 0.18)
                                : isDark ? AppColors.darkSurface2 : AppColors.lightBg,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: sel ? colors[i].withValues(alpha: 0.50)
                                  : isDark ? AppColors.darkBorder : AppColors.lightBorder,
                              width: sel ? 1.5 : 1,
                            ),
                          ),
                          child: Column(children: [
                            Text('$level',
                                style: GoogleFonts.inter(fontWeight: FontWeight.w700,
                                    fontSize: 16,
                                    color: sel ? colors[i]
                                        : isDark ? AppColors.darkMuted : AppColors.lightMuted)),
                            if (labels[i].isNotEmpty)
                              Text(labels[i],
                                  style: GoogleFonts.inter(fontSize: 10,
                                      fontWeight: FontWeight.w500,
                                      color: sel ? colors[i]
                                          : isDark ? AppColors.darkSubtle : AppColors.lightMuted)),
                          ]),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 8),
              _GradientButton(onPressed: _loading ? null : _save,
                  loading: _loading, label: 'Save changes'),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Shared sub-widgets (same as add_task_screen) ─────────────────────────────

class _Section extends StatelessWidget {
  final String label;
  final bool isDark;
  final Widget child;
  const _Section({required this.label, required this.isDark, required this.child});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Padding(
        padding: const EdgeInsets.only(left: 2, bottom: 10),
        child: Text(label, style: GoogleFonts.inter(fontSize: 11,
            fontWeight: FontWeight.w700, letterSpacing: 0.8,
            color: isDark ? AppColors.darkMuted : AppColors.lightMuted)),
      ),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
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
  const _ThemedField({required this.controller, required this.label,
      required this.icon, required this.isDark, this.maxLines = 1});

  @override
  Widget build(BuildContext context) => TextField(
    controller: controller, maxLines: maxLines,
    style: GoogleFonts.inter(fontSize: 14,
        color: isDark ? AppColors.darkText : AppColors.lightText),
    decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon, size: 18)),
  );
}

class _DateTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isDark;
  final bool active;
  const _DateTile({required this.icon, required this.label,
      required this.onTap, required this.isDark, this.active = false});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: active ? AppColors.accent.withValues(alpha: 0.08)
            : isDark ? AppColors.darkSurface2 : AppColors.lightBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: active ? AppColors.accent.withValues(alpha: 0.35)
              : isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      child: Row(children: [
        Icon(icon, size: 16,
            color: active ? AppColors.accent
                : isDark ? AppColors.darkMuted : AppColors.lightMuted),
        const SizedBox(width: 8),
        Expanded(child: Text(label,
          style: GoogleFonts.inter(fontSize: 13,
              fontWeight: active ? FontWeight.w500 : FontWeight.w400,
              color: active ? (isDark ? AppColors.darkText : AppColors.lightText)
                  : isDark ? AppColors.darkMuted : AppColors.lightMuted),
          overflow: TextOverflow.ellipsis)),
      ]),
    ),
  );
}

class _GradientButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final bool loading;
  final String label;
  const _GradientButton({required this.onPressed, required this.loading, required this.label});

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
        gradient: const LinearGradient(colors: [AppColors.accent, Color(0xFF5B21B6)]),
        boxShadow: widget.onPressed != null ? [BoxShadow(
          color: AppColors.accent.withValues(alpha: _hovered ? 0.50 : 0.30),
          blurRadius: _hovered ? 20 : 12, offset: const Offset(0, 4),
        )] : [],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: widget.onPressed,
          child: Center(child: widget.loading
            ? const SizedBox(width: 22, height: 22,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
            : Text(widget.label, style: GoogleFonts.inter(color: Colors.white,
                fontWeight: FontWeight.w600, fontSize: 15))),
        ),
      ),
    ),
  );
}
