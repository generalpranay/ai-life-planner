import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';
import '../models/schedule_block.dart';
import '../models/task.dart';
import '../services/schedule_service.dart';
import '../services/task_service.dart';
import '../services/auth_service.dart';
import '../services/risk_service.dart';
import '../models/risk_flag.dart';
import '../widgets/custom_agenda_view.dart';
import '../widgets/risk_banner.dart';
import 'add_task_screen.dart';
import 'web_resources_screen.dart';
import 'insights_screen.dart';
import '../theme/app_theme.dart';
import '../services/notification_service.dart';
import 'edit_task_screen.dart';
import 'goal_decompose_screen.dart';
import 'events_screen.dart';
import '../widgets/error_retry_view.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabConfig;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  List<ScheduleBlock> _blocks = [];
  bool _loading = true;
  bool _error = false;
  int _streak = 0;
  OverlayEntry? _notifOverlay;

  List<RiskFlag> _riskFlags = [];
  bool _risksLoading = false;

  @override
  void initState() {
    super.initState();
    _tabConfig = TabController(length: 2, vsync: this);
    _selectedDay = _focusedDay;
    _fetchSchedule();
    _fetchStreak();
    _fetchRisks();
    NotificationService.start(
      getBlocks: () => _blocks,
      onNotify: _showBlockNotification,
    );
  }

  @override
  void dispose() {
    NotificationService.stop();
    _notifOverlay?.remove();
    _tabConfig.dispose();
    super.dispose();
  }

  void _showBlockNotification(ScheduleBlock block, int minsUntil) {
    _notifOverlay?.remove();
    _notifOverlay = OverlayEntry(
      builder: (_) => Positioned(
        top: MediaQuery.of(context).padding.top + 8,
        left: 0, right: 0,
        child: Material(
          color: Colors.transparent,
          child: UpcomingBlockBanner(
            block: block,
            minsUntil: minsUntil,
            onDismiss: () {
              _notifOverlay?.remove();
              _notifOverlay = null;
            },
          ),
        ),
      ),
    );
    Overlay.of(context).insert(_notifOverlay!);
  }

  Future<void> _fetchRisks() async {
    setState(() => _risksLoading = true);
    try {
      final flags = await RiskService.predictRisks();
      if (mounted) setState(() { _riskFlags = flags; _risksLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _risksLoading = false);
    }
  }

  Future<void> _handleRiskAction(int blockId, String action) async {
    final ok = await RiskService.applyAction(blockId, action);
    if (!mounted) return;
    if (ok) {
      final label = action == 'move_to_tomorrow' ? 'Moved to tomorrow' : 'Task deferred';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(label)),
      );
      if (action == 'move_to_tomorrow') _fetchSchedule();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Action failed — please try again')),
      );
    }
  }

  Future<void> _fetchStreak() async {
    try {
      final s = await ScheduleService.getStreak();
      if (mounted) setState(() => _streak = s['current'] ?? 0);
    } catch (_) {}
  }

  Future<void> _fetchSchedule() async {
    setState(() => _loading = true);
    try {
      final blocks = await ScheduleService.fetchSchedule();
      if (!mounted) return;
      setState(() { _blocks = blocks; _loading = false; _error = false; });
      _fetchStreak();
    } catch (e) {
      debugPrint('Error fetching schedule: $e');
      if (!mounted) return;
      setState(() { _loading = false; _error = true; });
    }
  }

  Future<void> _generateSchedule() async {
    setState(() => _loading = true);
    try {
      await ScheduleService.generateWeek();
      await _fetchSchedule();
    } catch (e) {
      debugPrint('Error generating schedule: $e');
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _confirmClearSchedule() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear Schedule'),
        content: const Text(
            'All scheduled blocks will be removed. Your tasks will be preserved.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
    if (confirmed == true) await _clearSchedule();
  }

  Future<void> _clearSchedule() async {
    setState(() => _loading = true);
    try {
      await ScheduleService.clearSchedule();
      await _fetchSchedule();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Schedule cleared')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  int _getDaysUntilMonthEnd() {
    final now = DateTime.now();
    final lastDay = DateTime(now.year, now.month + 1, 0);
    return lastDay.difference(now).inDays + 5;
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.transparent,
        toolbarHeight: 72,
        title: Row(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _greeting(),
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.w700,
                    fontSize: 22,
                    color: isDark ? AppColors.darkText : AppColors.lightText,
                  ),
                ),
                Text(
                  DateFormat('EEEE, MMMM d').format(_focusedDay),
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ],
            ),
            if (_streak > 0) ...[
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.warning.withValues(alpha: 0.30)),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Text('🔥', style: TextStyle(fontSize: 13)),
                  const SizedBox(width: 4),
                  Text('$_streak',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.warning,
                      )),
                ]),
              ),
            ],
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: TabBar(
            controller: _tabConfig,
            indicatorColor: AppColors.accent,
            indicatorWeight: 2,
            indicatorSize: TabBarIndicatorSize.label,
            labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
            unselectedLabelStyle: GoogleFonts.inter(fontWeight: FontWeight.w400, fontSize: 14),
            labelColor: AppColors.accent,
            unselectedLabelColor: isDark ? AppColors.darkMuted : AppColors.lightMuted,
            tabs: const [Tab(text: 'Daily'), Tab(text: 'Monthly')],
          ),
        ),
        actions: [
          _AppBarIcon(
            icon: isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
            color: isDark ? AppColors.warning : AppColors.darkSubtle,
            onTap: () => AppTheme.themeNotifier.value =
                isDark ? ThemeMode.light : ThemeMode.dark,
            tooltip: 'Toggle theme',
          ),
          _AppBarIcon(
            icon: Icons.auto_awesome_rounded,
            color: AppColors.accent,
            onTap: _generateSchedule,
            tooltip: 'Generate schedule',
          ),
          _AppBarIcon(
            icon: Icons.refresh_rounded,
            onTap: _fetchSchedule,
            tooltip: 'Refresh',
          ),
          _AppBarIcon(
            icon: Icons.delete_sweep_outlined,
            color: AppColors.error,
            onTap: _confirmClearSchedule,
            tooltip: 'Clear schedule',
          ),
          const SizedBox(width: 4),
        ],
      ),
      drawer: _buildDrawer(isDark),
      body: _loading
          ? const _LoadingSpinner()
          : _error
              ? ErrorRetryView(
                  message: 'Could not load schedule',
                  onRetry: _fetchSchedule,
                )
              : TabBarView(
              controller: _tabConfig,
              children: [_buildDayView(isDark), _buildMonthView(isDark)],
            ),
      floatingActionButton: _buildFab(),
    );
  }

  Widget _buildFab() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          colors: [AppColors.accent, Color(0xFF5B21B6)],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.accent.withValues(alpha: 0.40),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () async {
            final result = await Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const AddTaskScreen()),
            );
            if (!context.mounted) return;
            if (result == true) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Task added! Updating schedule…')),
              );
              _generateSchedule();
            }
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.add, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Text('New Task',
                    style: GoogleFonts.inter(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 14)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDrawer(bool isDark) {
    return Drawer(
      backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.fromLTRB(24, 56, 24, 24),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface2 : AppColors.lightBg,
              border: Border(
                bottom: BorderSide(
                    color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [AppColors.accent, Color(0xFF5B21B6)],
                    ),
                    boxShadow: [BoxShadow(
                      color: AppColors.accent.withValues(alpha: 0.30),
                      blurRadius: 12, offset: const Offset(0, 4),
                    )],
                  ),
                  child: const Icon(Icons.person, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('My Account',
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                        color: isDark ? AppColors.darkText : AppColors.lightText,
                      )),
                    Text('online',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.success,
                        fontWeight: FontWeight.w500,
                      )),
                  ],
                ),
              ],
            ),
          ),
          // Nav items
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                _DrawerItem(
                  icon: Icons.event_outlined,
                  label: 'Events',
                  subtitle: 'Meetings & reminders',
                  accentColor: AppColors.info,
                  isDark: isDark,
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const EventsScreen()));
                  },
                ),
                _DrawerItem(
                  icon: Icons.public_rounded,
                  label: 'Web Resources',
                  isDark: isDark,
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const WebResourcesScreen()));
                  },
                ),
                _DrawerItem(
                  icon: Icons.auto_awesome_rounded,
                  label: 'AI Insights',
                  subtitle: 'Behavior & productivity',
                  accentColor: AppColors.accent,
                  isDark: isDark,
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const InsightsScreen()));
                  },
                ),
                _DrawerItem(
                  icon: Icons.track_changes_rounded,
                  label: 'Goal Decomposer',
                  subtitle: 'Break goals into daily tasks',
                  accentColor: const Color(0xFF2563EB),
                  isDark: isDark,
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const GoalDecomposeScreen()));
                  },
                ),
              ],
            ),
          ),
          // Logout
          Padding(
            padding: const EdgeInsets.all(16),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: AppColors.error.withValues(alpha: 0.30)),
                color: AppColors.error.withValues(alpha: 0.06),
              ),
              child: ListTile(
                dense: true,
                leading: const Icon(Icons.logout_rounded, color: AppColors.error, size: 20),
                title: Text('Logout',
                    style: GoogleFonts.inter(
                        color: AppColors.error,
                        fontWeight: FontWeight.w500,
                        fontSize: 14)),
                onTap: () {
                  AuthService.logout();
                  Navigator.pushReplacementNamed(context, '/');
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  bool get _isTodaySelected =>
      isSameDay(_selectedDay ?? DateTime.now(), DateTime.now());

  Widget _buildDayView(bool isDark) {
    return Column(
      children: [
        SizedBox(
          height: 96,
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            scrollDirection: Axis.horizontal,
            itemCount: _getDaysUntilMonthEnd(),
            itemBuilder: (context, index) {
              final d = DateTime.now().add(Duration(days: index - 2));
              final isSelected = isSameDay(d, _selectedDay);
              final isToday = isSameDay(d, DateTime.now());

              return GestureDetector(
                onTap: () => setState(() {
                  _selectedDay = d;
                  _focusedDay = d;
                }),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.easeOutCubic,
                  width: 60,
                  margin: const EdgeInsets.only(right: 10),
                  decoration: BoxDecoration(
                    gradient: isSelected
                        ? const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [AppColors.accent, Color(0xFF5B21B6)],
                          )
                        : null,
                    color: isSelected
                        ? null
                        : isDark
                            ? AppColors.darkSurface
                            : AppColors.lightSurface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isSelected
                          ? Colors.transparent
                          : isToday
                              ? AppColors.accent.withValues(alpha: 0.50)
                              : isDark
                                  ? AppColors.darkBorder
                                  : AppColors.lightBorder,
                    ),
                    boxShadow: isSelected
                        ? [BoxShadow(
                            color: AppColors.accent.withValues(alpha: 0.35),
                            blurRadius: 10, offset: const Offset(0, 4))]
                        : [],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        DateFormat('E').format(d).toUpperCase(),
                        style: GoogleFonts.inter(
                          color: isSelected
                              ? Colors.white70
                              : isDark ? AppColors.darkMuted : AppColors.lightMuted,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        d.day.toString(),
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.w700,
                          fontSize: 17,
                          color: isSelected
                              ? Colors.white
                              : isDark ? AppColors.darkText : AppColors.lightText,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        if (_isTodaySelected)
          RiskBannerSection(
            flags: _riskFlags,
            loading: _risksLoading,
            onAction: _handleRiskAction,
          ),
        Expanded(
          child: RefreshIndicator(
            color: AppColors.accent,
            backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
            onRefresh: () async {
              await _fetchSchedule();
              await _fetchRisks();
            },
            child: CustomAgendaView(
              date: _selectedDay ?? DateTime.now(),
              blocks: _blocks,
              onBlockTap: _showBlockDetails,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMonthView(bool isDark) {
    return TableCalendar(
      firstDay: DateTime.utc(2024, 1, 1),
      lastDay: DateTime.utc(2030, 12, 31),
      focusedDay: _focusedDay,
      selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
      onDaySelected: (selected, focused) {
        setState(() { _selectedDay = selected; _focusedDay = focused; });
      },
      calendarFormat: CalendarFormat.month,
      eventLoader: (day) =>
          _blocks.where((b) => isSameDay(b.startDatetime, day)).toList(),
      calendarStyle: CalendarStyle(
        selectedDecoration: const BoxDecoration(
            color: AppColors.accent, shape: BoxShape.circle),
        todayDecoration: BoxDecoration(
            color: AppColors.accent.withValues(alpha: 0.25),
            shape: BoxShape.circle),
        todayTextStyle: GoogleFonts.inter(
            color: AppColors.accent, fontWeight: FontWeight.w600),
        markerDecoration: const BoxDecoration(
            color: AppColors.cyan, shape: BoxShape.circle),
        markerSize: 5,
        defaultTextStyle: GoogleFonts.inter(
            color: isDark ? AppColors.darkText : AppColors.lightText),
        weekendTextStyle: GoogleFonts.inter(
            color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
        outsideTextStyle: GoogleFonts.inter(color: AppColors.darkSubtle),
      ),
      headerStyle: HeaderStyle(
        formatButtonVisible: false,
        titleCentered: true,
        titleTextStyle: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            fontSize: 16,
            color: isDark ? AppColors.darkText : AppColors.lightText),
        leftChevronIcon: Icon(Icons.chevron_left,
            color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
        rightChevronIcon: Icon(Icons.chevron_right,
            color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
      ),
      daysOfWeekStyle: DaysOfWeekStyle(
        weekdayStyle: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
        weekendStyle: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isDark ? AppColors.darkSubtle : AppColors.lightMuted),
      ),
    );
  }

  void _showBlockDetails(ScheduleBlock block) async {
    Task? task;
    if (block.taskId != null) {
      task = await TaskService.getTaskById(block.taskId!);
    }
    if (!mounted) return;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = AppTheme.getCategoryColor(
        block.blockType, Theme.of(context).brightness);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(
              top: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
            ),
          ),
          padding: EdgeInsets.fromLTRB(
              24, 20, 24, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkBorder2 : AppColors.lightBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              // Block type badge + edit button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (block.taskId != null)
                    GestureDetector(
                      onTap: () async {
                        final t = task ?? await TaskService.getTaskById(block.taskId!);
                        if (t == null || !context.mounted) return;
                        Navigator.pop(context);
                        final result = await Navigator.push(context,
                            MaterialPageRoute(builder: (_) => EditTaskScreen(task: t)));
                        if (result != null) _fetchSchedule();
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.accent.withValues(alpha: 0.10),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.accent.withValues(alpha: 0.25)),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.edit_rounded, size: 13, color: AppColors.accent),
                          const SizedBox(width: 5),
                          Text('Edit', style: GoogleFonts.inter(
                              fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.accent)),
                        ]),
                      ),
                    )
                  else
                    const SizedBox(),
                ],
              ),
              const SizedBox(height: 12),
              // Block type badge + title
              Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: color.withValues(alpha: 0.30)),
                  ),
                  child: Text(
                    block.blockType.toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 11, fontWeight: FontWeight.w700,
                      color: color, letterSpacing: 0.6),
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              Text(
                block.taskTitle ?? block.blockType,
                style: GoogleFonts.inter(
                  fontSize: 20, fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.darkText : AppColors.lightText,
                ),
              ),
              const SizedBox(height: 6),
              Row(children: [
                Icon(Icons.schedule_rounded, size: 14,
                    color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                const SizedBox(width: 6),
                Text(
                  '${DateFormat('h:mm a').format(block.startDatetime)} – ${DateFormat('h:mm a').format(block.endDatetime)}',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                  ),
                ),
              ]),
              const SizedBox(height: 20),
              Divider(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
              const SizedBox(height: 16),
              if (block.taskDescription != null) ...[
                _SheetLabel('Description', isDark: isDark),
                const SizedBox(height: 6),
                Text(block.taskDescription!,
                    style: GoogleFonts.inter(
                        fontSize: 14,
                        color: isDark ? AppColors.darkText : AppColors.lightText)),
                const SizedBox(height: 16),
              ],
              if (block.todaysGoal != null) ...[
                _SheetLabel("Today's goal", isDark: isDark),
                const SizedBox(height: 6),
                Text(block.todaysGoal!,
                    style: GoogleFonts.inter(
                        fontSize: 14,
                        color: isDark ? AppColors.darkText : AppColors.lightText)),
                const SizedBox(height: 16),
              ],
              if (task != null && task.checklist.isNotEmpty) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _SheetLabel('Checklist', isDark: isDark),
                    Text(
                      '${task.checklist.where((i) => i.done).length}/${task.checklist.length}',
                      style: GoogleFonts.inter(
                          fontSize: 12,
                          color: isDark ? AppColors.darkMuted : AppColors.lightMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: task.checklist.isEmpty
                        ? 0
                        : task.checklist.where((i) => i.done).length /
                            task.checklist.length,
                    backgroundColor: isDark
                        ? AppColors.darkSurface2
                        : AppColors.lightBg,
                    color: AppColors.accent,
                    minHeight: 4,
                  ),
                ),
                const SizedBox(height: 12),
                ...task.checklist.map((item) => CheckboxListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    item.text,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      decoration: item.done ? TextDecoration.lineThrough : null,
                      color: item.done
                          ? isDark ? AppColors.darkMuted : AppColors.lightMuted
                          : isDark ? AppColors.darkText : AppColors.lightText,
                    ),
                  ),
                  value: item.done,
                  onChanged: (val) async {
                    if (val != null) {
                      final ok = await TaskService.updateChecklistItem(item.id, val);
                      if (ok) {
                        setModal(() {
                          final idx = task!.checklist.indexOf(item);
                          task.checklist[idx] = ChecklistItem(
                            id: item.id, taskId: item.taskId,
                            text: item.text, done: val,
                          );
                        });
                      }
                    }
                  },
                )),
              ],
              // ── Action buttons ─────────────────────────────────────────────
              const SizedBox(height: 20),
              Divider(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
              const SizedBox(height: 12),
              _BlockActionButtons(
                block: block,
                isDark: isDark,
                onActionDone: () {
                  Navigator.pop(ctx);
                  if (mounted) _fetchSchedule();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Sub-widgets ──────────────────────────────────────────────────────────────

class _AppBarIcon extends StatelessWidget {
  final IconData icon;
  final Color? color;
  final VoidCallback onTap;
  final String tooltip;

  const _AppBarIcon({
    required this.icon,
    required this.onTap,
    required this.tooltip,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Tooltip(
      message: tooltip,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, size: 20,
              color: color ?? (isDark ? AppColors.darkMuted : AppColors.lightMuted)),
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final Color? accentColor;
  final bool isDark;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.isDark,
    required this.onTap,
    this.subtitle,
    this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    final iconColor = accentColor ?? (isDark ? AppColors.darkMuted : AppColors.lightMuted);
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
      leading: Container(
        width: 36, height: 36,
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, size: 18, color: iconColor),
      ),
      title: Text(label,
          style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: isDark ? AppColors.darkText : AppColors.lightText)),
      subtitle: subtitle != null
          ? Text(subtitle!,
              style: GoogleFonts.inter(
                  fontSize: 12,
                  color: isDark ? AppColors.darkMuted : AppColors.lightMuted))
          : null,
      onTap: onTap,
    );
  }
}

class _LoadingSpinner extends StatelessWidget {
  const _LoadingSpinner();

  @override
  Widget build(BuildContext context) => const Center(
    child: SizedBox(
      width: 28, height: 28,
      child: CircularProgressIndicator(
        color: AppColors.accent, strokeWidth: 2.5),
    ),
  );
}

class _SheetLabel extends StatelessWidget {
  final String text;
  final bool isDark;
  const _SheetLabel(this.text, {required this.isDark});

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: GoogleFonts.inter(
      fontSize: 12,
      fontWeight: FontWeight.w600,
      color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
      letterSpacing: 0.5,
    ),
  );
}

// ── Mark Done / Skip action buttons shown in the block detail sheet ──────────
class _BlockActionButtons extends StatefulWidget {
  final ScheduleBlock block;
  final bool isDark;
  final VoidCallback onActionDone;

  const _BlockActionButtons({
    required this.block,
    required this.isDark,
    required this.onActionDone,
  });

  @override
  State<_BlockActionButtons> createState() => _BlockActionButtonsState();
}

class _BlockActionButtonsState extends State<_BlockActionButtons> {
  bool _loading = false;

  Future<void> _complete() async {
    setState(() => _loading = true);
    final newVal = !widget.block.completed;
    final ok = await ScheduleService.completeBlock(widget.block.id, completed: newVal);
    if (!mounted) return;
    if (ok) {
      widget.onActionDone();
    } else {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not update block')),
      );
    }
  }

  Future<void> _skip() async {
    setState(() => _loading = true);
    final ok = await ScheduleService.skipBlock(widget.block.id);
    if (!mounted) return;
    if (ok) {
      widget.onActionDone();
    } else {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not skip block')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final done = widget.block.completed;
    final skipped = widget.block.skipped;

    // If already completed: offer "Unmark Done" only
    // If already skipped: offer "Mark Done" (which also clears the skip)
    // If neither: offer both "Mark Done" and "Skip"
    return Row(
      children: [
        Expanded(
          child: FilledButton.icon(
            onPressed: _loading ? null : _complete,
            icon: Icon(done ? Icons.refresh_rounded : Icons.check_rounded, size: 16),
            label: Text(done ? 'Unmark Done' : 'Mark Done'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.success,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        if (!done) ...[
          const SizedBox(width: 12),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: _loading || skipped ? null : _skip,
              icon: Icon(
                skipped ? Icons.not_interested_rounded : Icons.skip_next_rounded,
                size: 16,
              ),
              label: Text(skipped ? 'Skipped' : 'Skip'),
              style: OutlinedButton.styleFrom(
                foregroundColor: skipped ? Colors.grey : Colors.orange,
                side: BorderSide(
                  color: skipped ? Colors.grey.withValues(alpha: 0.4) : Colors.orange,
                ),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
