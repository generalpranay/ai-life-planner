import 'dart:convert';

// Parses recurrence_days from the backend which stores either a JSON array
// string (e.g. '["Mon","Wed"]') or a comma-separated string (e.g. "Mon,Wed").
List<String>? _parseRecurrenceDays(dynamic value) {
  if (value == null) return null;
  final s = value as String;
  if (s.isEmpty) return null;
  if (s.startsWith('[')) {
    try {
      return List<String>.from(jsonDecode(s) as List);
    } catch (_) {}
  }
  return s.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
}

class Task {
  final int id;
  final String title;
  final String? description;
  final String category;
  final DateTime? dueDate;
  final int? estimatedMinutes;
  final int priority;
  final String? todaysGoal;
  
  // Recurrence
  final bool isRecurring;
  final List<String>? recurrenceDays;
  final String? startTime;
  final String? endTime;
  final DateTime? dateRangeStart;
  final DateTime? dateRangeEnd;
  
  // UI helper
  final List<ChecklistItem> checklist;

  Task({
    required this.id,
    required this.title,
    this.description,
    required this.category,
    this.dueDate,
    this.estimatedMinutes,
    required this.priority,
    this.todaysGoal,
    this.isRecurring = false,
    this.recurrenceDays,
    this.startTime,
    this.endTime,
    this.dateRangeStart,
    this.dateRangeEnd,
    this.checklist = const [],
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json["id"],
      title: json["title"],
      description: json["description"],
      category: json["category"] ?? "study",
      dueDate: json["due_datetime"] != null
          ? DateTime.parse(json["due_datetime"])
          : null,
      estimatedMinutes: json["estimated_duration_minutes"],
      priority: json["priority"] ?? 3,
      todaysGoal: json["todays_goal"],
      isRecurring: json["is_recurring"] ?? false,
      recurrenceDays: _parseRecurrenceDays(json["recurrence_days"]),
      startTime: json["start_time"],
      endTime: json["end_time"],
      dateRangeStart: json["date_range_start"] != null
          ? DateTime.parse(json["date_range_start"])
          : null,
      dateRangeEnd: json["date_range_end"] != null
          ? DateTime.parse(json["date_range_end"])
          : null,
      checklist: (json["checklist"] as List<dynamic>?)
              ?.map((item) => ChecklistItem.fromJson(item))
              .toList() ??
          [],
    );
  }
}

class ChecklistItem {
  final int id;
  final int taskId;
  final String text;
  final bool done;

  ChecklistItem({
    required this.id,
    required this.taskId,
    required this.text,
    required this.done,
  });

  factory ChecklistItem.fromJson(Map<String, dynamic> json) {
    return ChecklistItem(
      id: json["id"],
      taskId: json["task_id"],
      text: json["text"],
      done: json["done"] ?? false,
    );
  }
}
