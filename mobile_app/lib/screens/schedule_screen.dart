import 'package:flutter/material.dart';
import '../models/schedule_block.dart';
import '../services/schedule_service.dart';

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  List<ScheduleBlock> _blocks = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSchedule();
  }

  Future<void> _loadSchedule() async {
    setState(() => _loading = true);
    final blocks = await ScheduleService.fetchSchedule();
    setState(() {
      _blocks = blocks;
      _loading = false;
    });
  }

  Future<void> _generateSchedule() async {
    setState(() => _loading = true);
    await ScheduleService.generateWeek();
    await _loadSchedule();
  }

  Future<void> _confirmClearSchedule() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Clear Schedule"),
        content: const Text("Are you sure you want to clear your schedule?\n\nAll scheduled blocks will be removed. Your tasks will be preserved."),
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
      await _loadSchedule();
    } catch (e) {
      debugPrint("Error clearing schedule: $e");
      setState(() => _loading = false);
    }
  }

  Map<String, List<ScheduleBlock>> get _groupedBlocks {
    final Map<String, List<ScheduleBlock>> groups = {};
    for (var block in _blocks) {
      // Format date as YYYY-MM-DD using the already-parsed DateTime
      final dt = block.startDatetime;
      final date =
          '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
      groups.putIfAbsent(date, () => []).add(block);
    }
    return groups;
  }

  String _formatTime(DateTime dt) {
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final groups = _groupedBlocks;
    final sortedDates = groups.keys.toList()..sort();

    return Scaffold(
      appBar: AppBar(
        title: const Text("Weekly Schedule"),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_sweep),
            onPressed: _confirmClearSchedule,
            tooltip: "Clear Schedule",
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _generateSchedule,
        child: const Icon(Icons.auto_fix_high),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _blocks.isEmpty
              ? const Center(child: Text("No scheduled blocks"))
              : ListView.builder(
                  itemCount: sortedDates.length,
                  itemBuilder: (context, sectionIndex) {
                    final date = sortedDates[sectionIndex];
                    final blocks = groups[date]!;
                    
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                          child: Text(
                            date, // Simple date display, could be formatted better
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: Colors.blueGrey,
                            ),
                          ),
                        ),
                        ...blocks.map((block) => Card(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          child: ListTile(
                            leading: Icon(
                              Icons.schedule,
                              color: block.blockType == "study"
                                  ? Colors.blue
                                  : Colors.green,
                            ),
                            title: Text(block.taskTitle ?? block.blockType.toUpperCase()),
                            subtitle: Text(
                              "${_formatTime(block.startDatetime)} - ${_formatTime(block.endDatetime)}",
                            ),
                          ),
                        )),
                      ],
                    );
                  },
                ),
    );
  }
}
