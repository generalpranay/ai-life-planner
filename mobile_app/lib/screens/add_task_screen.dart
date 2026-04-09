
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/task_service.dart';

class AddTaskScreen extends StatefulWidget {
  const AddTaskScreen({super.key});

  @override
  State<AddTaskScreen> createState() => _AddTaskScreenState();
}

class _AddTaskScreenState extends State<AddTaskScreen> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _goalCtrl = TextEditingController(); // Todays Goal
  
  String _category = "study";
  DateTime? _selectedDate; // For one-time tasks
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;
  int _priority = 3;
  
  // Recurrence
  bool _isRecurring = false;
  final List<String> _recurrenceDays = []; // ["Mon", "Tue"...]
  DateTime? _rangeStart;
  DateTime? _rangeEnd;

  // Checklist
  final List<TextEditingController> _checklistCtrls = [];

  bool _loading = false;

  final _daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  void _addChecklistItem() {
    setState(() {
      _checklistCtrls.add(TextEditingController());
    });
  }

  void _removeChecklistItem(int index) {
      setState(() {
          _checklistCtrls[index].dispose();
          _checklistCtrls.removeAt(index);
      });
  }

  @override
  void initState() {
    super.initState();
    // Default to today for non-recurring tasks
    _selectedDate = DateTime.now();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: now,
      lastDate: DateTime(now.year + 1),
    );
    if (date != null) setState(() => _selectedDate = date);
  }

  Future<void> _pickRangeStart() async {
     final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _rangeStart ?? now,
      firstDate: now,
      lastDate: DateTime(now.year + 1),
    );
    if (date != null) setState(() => _rangeStart = date);
  }

  Future<void> _pickRangeEnd() async {
     final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _rangeEnd ?? _rangeStart ?? now,
      firstDate: _rangeStart ?? now,
      lastDate: DateTime(now.year + 2),
    );
    if (date != null) setState(() => _rangeEnd = date);
  }

  Future<void> _pickTime(bool isStart) async {
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (time != null) {
      setState(() {
        if (isStart) {
          _startTime = time;
        } else {
          _endTime = time;
        }
      });
    }
  }

  void _submit() async {
    if (_titleCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Title is required")),
      );
      return;
    }
    
    // Validation
    if (_isRecurring) {
        if (_recurrenceDays.isEmpty) {
             ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Select at least one day for recurrence")),
            );
            return;
        }
    } else {
        if (_selectedDate == null) {
            ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Please select a date")),
            );
            return;
        }
    }

    setState(() => _loading = true);

    DateTime? specificDueDate;
    // If not recurring, we can optionally use the date.
    // If recurring, we rely on the days.
    if (!_isRecurring && _selectedDate != null) {
         if (_startTime != null) {
             specificDueDate = DateTime(
                 _selectedDate!.year, _selectedDate!.month, _selectedDate!.day,
                 _startTime!.hour, _startTime!.minute
             );
         } else {
             specificDueDate = _selectedDate; // All day or just date
         }
    }
    
    final checklistItems = _checklistCtrls
        .map((c) => c.text)
        .where((i) => i.trim().isNotEmpty)
        .toList();

    final result = await TaskService.createTask(
      title: _titleCtrl.text,
      description: _descCtrl.text,
      todaysGoal: _goalCtrl.text.isEmpty ? null : _goalCtrl.text,
      category: _category,
      dueDate: specificDueDate,
      priority: _priority,
      // Pass recurrence info
      isRecurring: _isRecurring,
      recurrenceDays: _isRecurring ? _recurrenceDays : null,
      startTime: _isRecurring ? _startTime : _startTime, // Use start time for both
      endTime: _isRecurring ? _endTime : _endTime,
      dateRangeStart: _isRecurring ? _rangeStart : null,
      dateRangeEnd: _isRecurring ? _rangeEnd : null,
      checklist: checklistItems,
    );

    setState(() => _loading = false);

    if (result.success) {
      if (mounted) Navigator.pop(context, true);
    } else {
      if (result.conflictData != null && result.conflictData!['conflict'] == true && mounted) {
        final newTaskId = result.conflictData!['newTaskId'];
        final existingTaskId = result.conflictData!['existingTaskId'];
        final existingTaskTitle = result.conflictData!['existingTaskTitle'];
        
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            title: const Text("Time Conflict Detected!"),
            content: Text("The new task conflicts with '$existingTaskTitle'. Which task should take priority?"),
            actions: [
              TextButton(
                onPressed: () async {
                  final success = await TaskService.resolveConflict(existingTaskId, newTaskId);
                  if (context.mounted) {
                    Navigator.pop(context); // close dialog
                    if (success) {
                      Navigator.pop(this.context, true); // close screen
                    } else {
                      ScaffoldMessenger.of(this.context).showSnackBar(const SnackBar(content: Text("Failed to resolve conflict")));
                    }
                  }
                },
                child: const Text("Keep Existing"),
              ),
              FilledButton(
                onPressed: () async {
                  final success = await TaskService.resolveConflict(newTaskId, existingTaskId);
                  if (context.mounted) {
                    Navigator.pop(context); // close dialog
                    if (success) {
                      Navigator.pop(this.context, true); // close screen
                    } else {
                      ScaffoldMessenger.of(this.context).showSnackBar(const SnackBar(content: Text("Failed to resolve conflict")));
                    }
                  }
                },
                style: FilledButton.styleFrom(backgroundColor: Colors.teal),
                child: const Text("Prioritize New"),
              ),
            ],
          ),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
           SnackBar(content: Text(result.errorMessage ?? "Failed to create task")),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Add New Task"),
        backgroundColor: Colors.teal.shade700,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _titleCtrl,
              decoration: InputDecoration(
                labelText: "Task Title",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.title),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descCtrl,
              decoration: InputDecoration(
                labelText: "Description",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.description_outlined),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 16),
             TextField(
              controller: _goalCtrl,
              decoration: InputDecoration(
                labelText: "Today's Goal (Optional)",
                helperText: "What do you want to achieve?",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.flag_outlined),
              ),
            ),
            const SizedBox(height: 24),
            
            // Checklist Section
            const Text("Checklist", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            ..._checklistCtrls.asMap().entries.map((entry) {
                int index = entry.key;
                var controller = entry.value;
                return Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: Row(
                        children: [
                            const Icon(Icons.check_box_outline_blank, color: Colors.grey),
                            const SizedBox(width: 8),
                            Expanded(child: TextField(
                                controller: controller,
                                decoration: const InputDecoration(
                                    hintText: "Item...",
                                    isDense: true,
                                ),
                            )),
                            IconButton(
                                icon: const Icon(Icons.close, color: Colors.red),
                                onPressed: () => _removeChecklistItem(index),
                            ),
                        ],
                    ),
                );
            }).toList(),
            OutlinedButton.icon(
                onPressed: _addChecklistItem,
                icon: const Icon(Icons.add),
                label: const Text("Add Item"),
            ),
            
            const SizedBox(height: 24),
            
            // Category
            DropdownButtonFormField<String>(
              value: _category,
              decoration: InputDecoration(
                labelText: "Category",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.category_outlined),
              ),
              items: ["study", "work", "health", "personal", "other"]
                  .map((c) => DropdownMenuItem(value: c, child: Text(c.toUpperCase())))
                  .toList(),
              onChanged: (v) => setState(() => _category = v!),
            ),
            const SizedBox(height: 24),
            
            // Recurrence Switch
            Container(
              decoration: BoxDecoration(
                color: Colors.teal.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.teal.shade100),
              ),
              child: SwitchListTile(
                  title: Text("Recurring Task?", style: TextStyle(color: Colors.teal.shade900, fontWeight: FontWeight.bold)),
                  subtitle: const Text("Happens cleanly every week (e.g., Classes, Work)"),
                  activeColor: Colors.teal.shade700,
                  value: _isRecurring,
                  onChanged: (val) => setState(() => _isRecurring = val),
              ),
            ),
            
            const SizedBox(height: 24),

            if (_isRecurring) ...[
                const Text("Repeats On:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 8),
                Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _daysOfWeek.map((day) {
                        final isSelected = _recurrenceDays.contains(day);
                        return FilterChip(
                            label: Text(day),
                            selected: isSelected,
                            selectedColor: Colors.teal.shade100,
                            checkmarkColor: Colors.teal.shade700,
                            labelStyle: TextStyle(color: isSelected ? Colors.teal.shade900 : Colors.black),
                            onSelected: (selected) {
                                setState(() {
                                    if (selected) {
                                        _recurrenceDays.add(day);
                                    } else {
                                        _recurrenceDays.remove(day);
                                    }
                                });
                            },
                        );
                    }).toList(),
                ),
                const SizedBox(height: 16),
                Row(
                   children: [
                       Expanded(
                           child: OutlinedButton.icon(
                               onPressed: _pickRangeStart,
                               icon: const Icon(Icons.date_range),
                               label: Text(_rangeStart == null ? "Start Date" : DateFormat('MM/dd').format(_rangeStart!)),
                               style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                           ),
                       ),
                       const SizedBox(width: 8),
                       Expanded(
                           child: OutlinedButton.icon(
                               onPressed: _pickRangeEnd,
                               icon: const Icon(Icons.date_range),
                               label: Text(_rangeEnd == null ? "End Date" : DateFormat('MM/dd').format(_rangeEnd!)),
                               style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                           ),
                       ),
                   ], 
                ),
            ] else ...[
                 ListTile(
                  title: Text(_selectedDate == null
                      ? "Pick Date"
                      : DateFormat('EEE, MMM d, yyyy').format(_selectedDate!)),
                  trailing: const Icon(Icons.calendar_today, color: Colors.teal),
                  onTap: _pickDate,
                  tileColor: Colors.grey.shade100,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade300)),
                ),
            ],
            
            const SizedBox(height: 16),
            Row(
                children: [
                    Expanded(
                        child: ListTile(
                            title: Text(_startTime == null ? "Start Time" : _startTime!.format(context)),
                            trailing: const Icon(Icons.access_time, color: Colors.teal),
                            onTap: () => _pickTime(true),
                            tileColor: Colors.grey.shade100,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade300)),
                        ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                        child: ListTile(
                            title: Text(_endTime == null ? "End Time" : _endTime!.format(context)),
                            trailing: const Icon(Icons.access_time, color: Colors.teal),
                            onTap: () => _pickTime(false),
                            tileColor: Colors.grey.shade100,
                             shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade300)),
                        ),
                    ),
                ],
            ),
            
            const SizedBox(height: 24),

            // Priority
            Row(
              children: [
                const Text("Priority: ", style: TextStyle(fontWeight: FontWeight.bold)),
                Expanded(
                  child: Slider(
                    value: _priority.toDouble(),
                    min: 1,
                    max: 5,
                    divisions: 4,
                    label: _priority.toString(),
                    activeColor: Colors.teal,
                    onChanged: (v) => setState(() => _priority = v.round()),
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 32),
            SizedBox(
              height: 50,
              child: FilledButton(
                onPressed: _loading ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.teal.shade700,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _loading 
                  ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) 
                  : const Text("Create Task", style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
