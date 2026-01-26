
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';
import '../models/schedule_block.dart';
import '../models/task.dart';
import '../services/schedule_service.dart';
import '../services/task_service.dart';
import '../services/auth_service.dart';
import '../widgets/custom_agenda_view.dart';
import 'add_task_screen.dart';
import 'web_resources_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabConfig;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  List<ScheduleBlock> _blocks = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabConfig = TabController(length: 2, vsync: this);
    _selectedDay = _focusedDay;
    _fetchSchedule();
  }

  Future<void> _fetchSchedule() async {
    setState(() => _loading = true);
    try {
        final blocks = await ScheduleService.fetchSchedule();
        setState(() {
            _blocks = blocks;
            _loading = false;
        });
    } catch(e) {
        print("Error fetching schedule: $e");
        setState(() => _loading = false);
    }
  }

  Future<void> _generateSchedule() async {
      setState(() => _loading = true);
      try {
          await ScheduleService.generateWeek();
          await _fetchSchedule();
      } catch (e) {
          print("Error generating schedule: $e");
          setState(() => _loading = false);
      }
  }

  Future<void> _confirmClearSchedule() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Clear Schedule & Tasks"),
        content: const Text("Are you sure you want to clear your schedule? \n\nThis will also DELETE all pending non-recurring tasks. This action cannot be undone."),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Cancel"),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text("Clear"),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _clearSchedule();
    }
  }

  Future<void> _clearSchedule() async {
    setState(() => _loading = true);
    try {
      await ScheduleService.clearSchedule();
      await _fetchSchedule();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Schedule cleared successfully")),
        );
      }
    } catch (e) {
      print("Error clearing schedule: $e");
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error clearing schedule: $e")),
        );
      }
    }
  }

  int _getDaysUntilMonthEnd() {
    final now = DateTime.now();
    // Get last day of current month
    final lastDay = DateTime(now.year, now.month + 1, 0);
    final daysRemaining = lastDay.difference(now).inDays;
    // Ensure we show at least a reasonable buffer if end of month is near?
    // User requested "till the month end". If today is 31st, it shows 0 days?
    // Let's add at least a buffer of +5 days if it's near end of month,
    // or just strictly follow "month end". 
    // "it stops after 15 days i can see till the month end"
    // I'll make it show until the last day of THIS month + maybe 2 days into next? 
    // Or just strictly (lastDay - now) + padding for the "index - 2" offset.
    // The list starts at index - 2 (2 days ago). 
    // So to reach month end, we need (daysRemaining + 2 + 1).
    return daysRemaining + 5; // A bit extra just in case
  }

  @override
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50], // Light background
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.cyan.shade200,
        title: Row(
          children: [
            const Icon(Icons.calendar_today, size: 20, color: Colors.white),
            const SizedBox(width: 8),
            Text(
              DateFormat('MMMM yyyy').format(_focusedDay),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
            ),
          ],
        ),
        bottom: TabBar(
          controller: _tabConfig,
          indicatorColor: Colors.amber, // Accent color
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.normal),
          tabs: const [
            Tab(text: "Daily"),
            Tab(text: "Monthly"),
          ],
        ),
        actions: [
           IconButton(
            icon: const Icon(Icons.auto_awesome),
            onPressed: _generateSchedule,
            tooltip: "Generate Schedule",
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchSchedule,
          ),
          IconButton(
            icon: const Icon(Icons.delete_sweep),
            onPressed: _confirmClearSchedule,
            tooltip: "Clear Schedule",
          ),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            UserAccountsDrawerHeader(
              decoration: BoxDecoration(
                color: Colors.cyan.shade200,
              ),
              accountName: const Text("User", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              accountEmail: const Text("online", style: TextStyle(color: Colors.white70)),
              currentAccountPicture: CircleAvatar(
                backgroundColor: Colors.white,
                child: Icon(Icons.person, size: 40, color: Colors.cyan.shade200),
              ),
            ),
            ListTile(
              leading: Icon(Icons.public, color: Colors.cyan.shade200),
              title: const Text("Web Resources"),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const WebResourcesScreen()));
              },
            ),
            const Divider(),
             ListTile(
              leading: const Icon(Icons.logout, color: Colors.redAccent),
              title: const Text("Logout", style: TextStyle(color: Colors.redAccent)),
              onTap: () {
                 AuthService.logout();
                 Navigator.pushReplacementNamed(context, "/");
              },
            ),
          ],
        ),
      ),
      body: _loading 
        ? Center(child: CircularProgressIndicator(color: Colors.cyan.shade200))
        : TabBarView(
            controller: _tabConfig,
            children: [
              _buildDayView(),
              _buildMonthView(),
            ],
          ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const AddTaskScreen()),
          );
            if (result == true) {
             ScaffoldMessenger.of(context).showSnackBar(
               const SnackBar(content: Text("Task added! Updating schedule...")),
             );
             _generateSchedule();
           }
        },
        backgroundColor: Colors.cyan.shade200,
        icon: const Icon(Icons.add),
        label: const Text("New Task"),
      ),
    );
  }

  Widget _buildDayView() {
    return Column(
      children: [
        // Day selector strip
        Container(
           height: 90,
           decoration: BoxDecoration(
             color: Colors.white,
             boxShadow: [
               BoxShadow(color: Colors.grey.withOpacity(0.1), blurRadius: 4, offset: const Offset(0, 2)),
             ],
           ),
           child: ListView.builder(
               padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
               scrollDirection: Axis.horizontal,
               itemCount: _getDaysUntilMonthEnd(), 
               itemBuilder: (context, index) {
                   final d = DateTime.now().add(Duration(days: index - 2)); // Start slightly in past
                   final isSelected = isSameDay(d, _selectedDay);
                   final isToday = isSameDay(d, DateTime.now());
                   
                   return GestureDetector(
                       onTap: () => setState(() {
                            _selectedDay = d; 
                            _focusedDay = d;
                       }),
                       child: AnimatedContainer(
                           duration: const Duration(milliseconds: 200),
                           width: 60,
                           margin: const EdgeInsets.symmetric(horizontal: 6),
                           decoration: BoxDecoration(
                               color: isSelected ? Colors.cyan.shade600 : (isToday ? Colors.cyan.shade50 : Colors.grey.shade50),
                               borderRadius: BorderRadius.circular(16),
                               border: Border.all(
                                 color: isSelected ? Colors.cyan.shade600 : (isToday ? Colors.cyan.shade200 : Colors.grey.shade300),
                                 width: isSelected ? 0 : 1,
                               ),
                               boxShadow: isSelected 
                                ? [BoxShadow(color: Colors.cyan.withOpacity(0.4), blurRadius: 6, offset: const Offset(0, 4))] 
                                : [],
                           ),
                           child: Column(
                               mainAxisAlignment: MainAxisAlignment.center,
                               children: [
                                   Text(
                                     DateFormat('E').format(d).toUpperCase(), 
                                     style: TextStyle(
                                       color: isSelected ? Colors.white70 : Colors.grey.shade600, 
                                       fontSize: 10,
                                       fontWeight: FontWeight.bold
                                     )
                                   ),
                                   const SizedBox(height: 4),
                                   Text(
                                     d.day.toString(), 
                                     style: TextStyle(
                                       fontWeight: FontWeight.bold, 
                                       fontSize: 18, 
                                       color: isSelected ? Colors.white : Colors.black87
                                     )
                                   ),
                               ],
                           ),
                       ),
                   );
               },
           ),
        ),
        Expanded(
            child: CustomAgendaView(
                date: _selectedDay ?? DateTime.now(),
                blocks: _blocks,
                onBlockTap: _showBlockDetails,
            ),
        ),
      ],
    );
  }

  Widget _buildMonthView() {
    return TableCalendar(
      firstDay: DateTime.utc(2024, 1, 1),
      lastDay: DateTime.utc(2030, 12, 31),
      focusedDay: _focusedDay,
      selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
      onDaySelected: (selectedDay, focusedDay) {
        setState(() {
          _selectedDay = selectedDay;
          _focusedDay = focusedDay;
        });
      },
      calendarFormat: CalendarFormat.month,
      eventLoader: (day) {
        return _blocks.where((b) => isSameDay(b.startDatetime, day)).toList();
      },
      calendarStyle: const CalendarStyle(
          markerDecoration: BoxDecoration(color: Colors.blue, shape: BoxShape.circle),
      ),
    );
  }

  void _showBlockDetails(ScheduleBlock block) async {
    // If this block has a task, fetch the full task details including checklist
    Task? task;
    if (block.taskId != null) {
      task = await TaskService.getTaskById(block.taskId!);
    }

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                block.taskTitle ?? block.blockType.toUpperCase(),
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                "${DateFormat('HH:mm').format(block.startDatetime)} - ${DateFormat('HH:mm').format(block.endDatetime)}",
                style: TextStyle(color: Colors.grey[600]),
              ),
              const Divider(height: 32),
              if (block.taskDescription != null) ...[
                const Text("Description", style: TextStyle(fontWeight: FontWeight.bold)),
                Text(block.taskDescription!),
                const SizedBox(height: 16),
              ],
              if (block.todaysGoal != null) ...[
                const Text("Today's Goal", style: TextStyle(fontWeight: FontWeight.bold)),
                Text(block.todaysGoal!),
                const SizedBox(height: 16),
              ],
              if (task != null && task.checklist.isNotEmpty) ...[
                const Text("Checklist", style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ...task.checklist.map((item) => CheckboxListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    item.text,
                    style: TextStyle(
                      decoration: item.done ? TextDecoration.lineThrough : null,
                      color: item.done ? Colors.grey : null,
                    ),
                  ),
                  value: item.done,
                  onChanged: (value) async {
                    if (value != null) {
                      final success = await TaskService.updateChecklistItem(item.id, value);
                      if (success) {
                        setModalState(() {
                          // Update local state
                          final index = task!.checklist.indexOf(item);
                          task.checklist[index] = ChecklistItem(
                            id: item.id,
                            taskId: item.taskId,
                            text: item.text,
                            done: value,
                          );
                        });
                      }
                    }
                  },
                )),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: task.checklist.isEmpty
                      ? 0
                      : task.checklist.where((i) => i.done).length / task.checklist.length,
                  backgroundColor: Colors.grey[200],
                  color: Colors.cyan.shade200,
                ),
                const SizedBox(height: 4),
                Text(
                  "${task.checklist.where((i) => i.done).length}/${task.checklist.length} completed",
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
