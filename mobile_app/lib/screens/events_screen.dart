import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/event.dart';
import '../services/event_service.dart';
import '../theme/app_theme.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  List<Event> _events = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final events = await EventService.getEvents();
      setState(() {
        _events = events;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _delete(Event event) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Event'),
        content: Text('Delete "${event.title}"?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await EventService.deleteEvent(event.id);
      setState(() => _events.removeWhere((e) => e.id == event.id));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Delete failed: $e')));
      }
    }
  }

  void _openAddSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AddEventSheet(
        onCreated: (event) {
          setState(() => _events.add(event));
          _events.sort((a, b) => a.startDatetime.compareTo(b.startDatetime));
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final mutedColor = isDark ? AppColors.darkMuted : AppColors.lightMuted;
    final surfaceColor = isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        backgroundColor: surfaceColor,
        title: const Text('Events', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _load,
              tooltip: 'Refresh'),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddSheet,
        backgroundColor: AppColors.accent,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Event', style: TextStyle(color: Colors.white)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildError()
              : _events.isEmpty
                  ? _buildEmpty(isDark, textColor, mutedColor)
                  : _buildList(isDark, surfaceColor, borderColor, textColor, mutedColor),
    );
  }

  Widget _buildList(bool isDark, Color surfaceColor, Color borderColor,
      Color textColor, Color mutedColor) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
      itemCount: _events.length,
      itemBuilder: (context, i) {
        final event = _events[i];
        final color = _resolveColor(event.color);
        final sameDay = event.startDatetime.day == event.endDatetime.day &&
            event.startDatetime.month == event.endDatetime.month;
        final isUpcoming = event.startDatetime.isAfter(DateTime.now());

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: borderColor),
          ),
          child: IntrinsicHeight(
            child: Row(
              children: [
                Container(
                  width: 4,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(14),
                        bottomLeft: Radius.circular(14)),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      event.title,
                                      style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14,
                                          color: textColor),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  if (isUpcoming)
                                    Container(
                                      margin: const EdgeInsets.only(left: 6),
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 7, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: color.withValues(alpha: 0.15),
                                        borderRadius:
                                            BorderRadius.circular(8),
                                      ),
                                      child: Text('Upcoming',
                                          style: TextStyle(
                                              color: color,
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold)),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 5),
                              Row(
                                children: [
                                  Icon(Icons.calendar_today_outlined,
                                      size: 12, color: mutedColor),
                                  const SizedBox(width: 4),
                                  Text(
                                    event.isAllDay
                                        ? DateFormat('MMM d, yyyy')
                                            .format(event.startDatetime)
                                        : sameDay
                                            ? '${DateFormat('MMM d').format(event.startDatetime)}  ${DateFormat('h:mm a').format(event.startDatetime)} – ${DateFormat('h:mm a').format(event.endDatetime)}'
                                            : '${DateFormat('MMM d').format(event.startDatetime)} – ${DateFormat('MMM d').format(event.endDatetime)}',
                                    style: TextStyle(
                                        fontSize: 12, color: mutedColor),
                                  ),
                                ],
                              ),
                              if (event.location != null &&
                                  event.location!.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(Icons.location_on_outlined,
                                        size: 12, color: mutedColor),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        event.location!,
                                        style: TextStyle(
                                            fontSize: 12, color: mutedColor),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                              if (event.description != null &&
                                  event.description!.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  event.description!,
                                  style: TextStyle(
                                      fontSize: 12, color: mutedColor),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline,
                              size: 20, color: Colors.redAccent),
                          onPressed: () => _delete(event),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmpty(bool isDark, Color textColor, Color mutedColor) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppColors.info.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(Icons.event_outlined,
                size: 36, color: AppColors.info),
          ),
          const SizedBox(height: 16),
          Text('No Events Yet',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: textColor)),
          const SizedBox(height: 8),
          Text('Tap "Add Event" to create your first event.',
              style: TextStyle(fontSize: 13, color: mutedColor)),
        ],
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.redAccent, size: 40),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.redAccent)),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }

  Color _resolveColor(String name) {
    switch (name) {
      case 'red':    return const Color(0xFFEF4444);
      case 'green':  return const Color(0xFF10B981);
      case 'yellow': return const Color(0xFFF59E0B);
      case 'purple': return const Color(0xFF7C3AED);
      case 'pink':   return const Color(0xFFEC4899);
      default:       return AppColors.info;
    }
  }
}

// ── Add Event bottom sheet ────────────────────────────────────────────────────

class _AddEventSheet extends StatefulWidget {
  final void Function(Event) onCreated;

  const _AddEventSheet({required this.onCreated});

  @override
  State<_AddEventSheet> createState() => _AddEventSheetState();
}

class _AddEventSheetState extends State<_AddEventSheet> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  DateTime _startDt = DateTime.now().add(const Duration(hours: 1));
  DateTime _endDt = DateTime.now().add(const Duration(hours: 2));
  bool _allDay = false;
  String _color = 'blue';
  bool _saving = false;
  String? _error;

  static const _colors = ['blue', 'green', 'purple', 'red', 'yellow', 'pink'];

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _locationCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime({required bool isStart}) async {
    final initial = isStart ? _startDt : _endDt;
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(initial));
    if (time == null) return;
    final result = DateTime(
        date.year, date.month, date.day, time.hour, time.minute);
    setState(() {
      if (isStart) {
        _startDt = result;
        if (_endDt.isBefore(_startDt)) {
          _endDt = _startDt.add(const Duration(hours: 1));
        }
      } else {
        _endDt = result;
      }
    });
  }

  Future<void> _submit() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'Title is required');
      return;
    }
    if (_endDt.isBefore(_startDt)) {
      setState(() => _error = 'End must be after start');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final event = await EventService.createEvent(
        title: title,
        description:
            _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        startDatetime: _startDt,
        endDatetime: _endDt,
        isAllDay: _allDay,
        location: _locationCtrl.text.trim().isEmpty
            ? null
            : _locationCtrl.text.trim(),
        color: _color,
      );
      if (mounted) {
        widget.onCreated(event);
        Navigator.pop(context);
      }
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sheetBg = isDark ? AppColors.darkSurface : Colors.white;
    final inputBg = isDark ? AppColors.darkBg : const Color(0xFFF8F8FF);
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;

    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (ctx, scrollCtrl) => Container(
        decoration: BoxDecoration(
          color: sheetBg,
          borderRadius:
              const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Column(
          children: [
            const SizedBox(height: 8),
            Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: Colors.grey.shade400,
                    borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Text('New Event',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: textColor)),
                  const Spacer(),
                  IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context)),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                controller: scrollCtrl,
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                children: [
                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: Colors.red.withValues(alpha: 0.3)),
                      ),
                      child: Text(_error!,
                          style: const TextStyle(
                              color: Colors.redAccent, fontSize: 13)),
                    ),
                  ],
                  _label('Title'),
                  const SizedBox(height: 6),
                  _input(_titleCtrl, 'e.g. Team standup', inputBg),
                  const SizedBox(height: 14),
                  _label('Description (optional)'),
                  const SizedBox(height: 6),
                  _input(_descCtrl, 'Add notes…', inputBg, maxLines: 3),
                  const SizedBox(height: 14),
                  _label('Location (optional)'),
                  const SizedBox(height: 6),
                  _input(_locationCtrl, 'e.g. Room 202', inputBg),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      _label('All Day'),
                      const Spacer(),
                      Switch(
                        value: _allDay,
                        onChanged: (v) => setState(() => _allDay = v),
                        activeThumbColor: AppColors.accent,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _label('Start'),
                  const SizedBox(height: 6),
                  _dtButton(
                    _allDay
                        ? DateFormat('MMM d, yyyy').format(_startDt)
                        : DateFormat('MMM d, yyyy  h:mm a').format(_startDt),
                    () => _allDay ? null : _pickDateTime(isStart: true),
                  ),
                  const SizedBox(height: 12),
                  _label('End'),
                  const SizedBox(height: 6),
                  _dtButton(
                    _allDay
                        ? DateFormat('MMM d, yyyy').format(_endDt)
                        : DateFormat('MMM d, yyyy  h:mm a').format(_endDt),
                    () => _allDay ? null : _pickDateTime(isStart: false),
                  ),
                  const SizedBox(height: 14),
                  _label('Color'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 10,
                    children: _colors.map((c) {
                      final col = _colorVal(c);
                      final selected = _color == c;
                      return GestureDetector(
                        onTap: () => setState(() => _color = c),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: col,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: selected
                                  ? Colors.white
                                  : Colors.transparent,
                              width: 3,
                            ),
                            boxShadow: selected
                                ? [
                                    BoxShadow(
                                        color: col.withValues(alpha: 0.5),
                                        blurRadius: 8)
                                  ]
                                : null,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _saving ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accent,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: _saving
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Text('Create Event',
                              style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Text(text,
      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13));

  Widget _input(TextEditingController ctrl, String hint, Color bg,
      {int maxLines = 1}) =>
      TextField(
        controller: ctrl,
        maxLines: maxLines,
        style: const TextStyle(fontSize: 14),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 13),
          filled: true,
          fillColor: bg,
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(
                  color: AppColors.accent.withValues(alpha: 0.2))),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(
                  color: AppColors.accent.withValues(alpha: 0.2))),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: AppColors.accent)),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
      );

  Widget _dtButton(String label, VoidCallback? onTap) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF1A1A2E),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
                color: AppColors.accent.withValues(alpha: 0.2)),
          ),
          child: Row(
            children: [
              Icon(Icons.access_time_rounded,
                  size: 16, color: AppColors.accent),
              const SizedBox(width: 10),
              Text(label,
                  style: const TextStyle(fontSize: 14, color: Colors.white70)),
            ],
          ),
        ),
      );

  Color _colorVal(String name) {
    switch (name) {
      case 'red':    return const Color(0xFFEF4444);
      case 'green':  return const Color(0xFF10B981);
      case 'yellow': return const Color(0xFFF59E0B);
      case 'purple': return const Color(0xFF7C3AED);
      case 'pink':   return const Color(0xFFEC4899);
      default:       return AppColors.info;
    }
  }
}
