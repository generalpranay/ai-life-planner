// lib/services/task_service.dart
import '../models/task.dart';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api_config.dart';
import 'api_service.dart';
import 'auth_service.dart';

class TaskCreationResult {
  final bool success;
  final String? errorMessage;
  final Map<String, dynamic>? conflictData; // Additional data for equal priority conflict
  TaskCreationResult(this.success, [this.errorMessage, this.conflictData]);
}

class TaskService {
  static Future<List<Task>> getAllTasks() async {
     final response = await ApiService.get(ApiConfig.baseUrl + ApiConfig.tasks, token: await AuthService.getToken());
     if (response.statusCode == 200) {
       final List<dynamic> data = jsonDecode(response.body);
       return data.map((e) => Task.fromJson(e)).toList();
     }
     return [];
  }
  static Future<TaskCreationResult> createTask({
    required String title,
    String? description,
    String? todaysGoal,
    required String category,
    DateTime? dueDate,
    int? estimatedMinutes,
    int priority = 3,
    List<String> checklist = const [],
    TimeOfDay? preferredStartTime,
    TimeOfDay? preferredEndTime,
    // Recurrence
    bool isRecurring = false,
    List<String>? recurrenceDays,
    TimeOfDay? startTime,
    TimeOfDay? endTime,
    DateTime? dateRangeStart,
    DateTime? dateRangeEnd,
  }) async {
    final token = await AuthService.getToken();

    // Build request body with input sanitization
    final body = <String, dynamic>{
      "title": _sanitizeInput(title),
      "description": description != null ? _sanitizeInput(description) : null,
      "todays_goal": todaysGoal != null ? _sanitizeInput(todaysGoal) : null,
      "category": category,
      "due_datetime": dueDate?.toIso8601String(),
      "estimated_duration_minutes": estimatedMinutes,
      "priority": priority.clamp(1, 5), // Ensure priority is within valid range
      "checklist": checklist.map((e) => {"text": _sanitizeInput(e)}).toList(),
    };

    // Add preferred time if manual scheduling is used
    if (preferredStartTime != null) {
      body["preferred_start_time"] = "${preferredStartTime.hour.toString().padLeft(2, '0')}:${preferredStartTime.minute.toString().padLeft(2, '0')}";
    }
    if (preferredEndTime != null) {
      body["preferred_end_time"] = "${preferredEndTime.hour.toString().padLeft(2, '0')}:${preferredEndTime.minute.toString().padLeft(2, '0')}";
    }

    // Send start/end times if provided, regardless of recurrence
    if (startTime != null) body["start_time"] = "${startTime.hour}:${startTime.minute}";
    if (endTime != null) body["end_time"] = "${endTime.hour}:${endTime.minute}";

    if (isRecurring) {
        body["is_recurring"] = true;
        body["recurrence_days"] = recurrenceDays?.join(",");
        if (dateRangeStart != null) body["date_range_start"] = dateRangeStart.toIso8601String();
        if (dateRangeEnd != null) body["date_range_end"] = dateRangeEnd.toIso8601String();
    }

    final response = await ApiService.post(
      ApiConfig.baseUrl + ApiConfig.tasks,
      token: token,
      body: body,
    );

    if (response.statusCode == 201) {
       return TaskCreationResult(true);
    } else if (response.statusCode == 409) {
       // Conflict
       final data = jsonDecode(response.body);
       return TaskCreationResult(false, data['message'] ?? "Time slot overlap detected", data);
    } else {
       return TaskCreationResult(false, "Failed to create task");
    }
  }

  /// Sanitize user input to prevent XSS and injection attacks
  static String _sanitizeInput(String input) {
    // Remove potential script tags and trim whitespace
    return input
        .replaceAll(RegExp(r'<script[^>]*>.*?</script>', caseSensitive: false, dotAll: true), '')
        .replaceAll(RegExp(r'<[^>]*>'), '') // Remove HTML tags
        .trim();
  }

  /// Get a single task by ID with checklist
  static Future<Task?> getTaskById(int taskId) async {
    final token = await AuthService.getToken();
    final response = await ApiService.get(
      '${ApiConfig.baseUrl}${ApiConfig.tasks}/$taskId',
      token: token,
    );

    if (response.statusCode == 200) {
      return Task.fromJson(jsonDecode(response.body));
    }
    return null;
  }

  /// Resolve a task conflict when two tasks request the same time slot with equal priority.
  /// - [winnerTaskId]: This task will keep the time slot block.
  /// - [loserTaskId]: This task gets removed from the fixed schedule, becomes flexible, 
  ///   and gets re-allocated automatically by the Python AI scheduler.
  static Future<bool> resolveConflict(int winnerTaskId, int loserTaskId) async {
    final token = await AuthService.getToken();
    final response = await ApiService.post(
      '${ApiConfig.baseUrl}${ApiConfig.tasks}/resolve-conflict',
      token: token,
      body: {
        'winnerTaskId': winnerTaskId,
        'loserTaskId': loserTaskId,
      },
    );
    return response.statusCode == 200;
  }

  /// Update a checklist item's done status
  static Future<bool> updateChecklistItem(int itemId, bool done) async {
    final token = await AuthService.getToken();
    final response = await ApiService.post(
      '${ApiConfig.baseUrl}/api/tasks/checklist/$itemId',
      token: token,
      body: {'done': done},
    );

    return response.statusCode == 200;
  }
}
