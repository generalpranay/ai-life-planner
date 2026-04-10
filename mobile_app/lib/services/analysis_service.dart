// lib/services/analysis_service.dart
import 'dart:convert';
import '../config/api_config.dart';
import 'api_service.dart';
import 'auth_service.dart';

// ─── Behavioral Analysis Models ──────────────────────────────────────────────

class BehaviorAnalysis {
  final List<String> productiveHours;
  final List<String> lowProductivityHours;
  final List<String> preferredTaskTypes;
  final List<String> avoidedTaskTypes;
  final List<String> procrastinationPatterns;
  final int consistencyScore;
  final List<String> insights;
  final String generatedAt;

  BehaviorAnalysis({
    required this.productiveHours,
    required this.lowProductivityHours,
    required this.preferredTaskTypes,
    required this.avoidedTaskTypes,
    required this.procrastinationPatterns,
    required this.consistencyScore,
    required this.insights,
    required this.generatedAt,
  });

  factory BehaviorAnalysis.fromJson(Map<String, dynamic> json) {
    final a = json['analysis'] as Map<String, dynamic>? ?? json;
    List<String> toList(dynamic v) =>
        (v as List?)?.map((e) => e.toString()).toList() ?? [];
    return BehaviorAnalysis(
      productiveHours: toList(a['productive_hours']),
      lowProductivityHours: toList(a['low_productivity_hours']),
      preferredTaskTypes: toList(a['preferred_task_types']),
      avoidedTaskTypes: toList(a['avoided_task_types']),
      procrastinationPatterns: toList(a['procrastination_patterns']),
      consistencyScore: (a['consistency_score'] as num?)?.toInt() ?? 0,
      insights: toList(a['insights']),
      generatedAt: json['generatedAt']?.toString() ?? '',
    );
  }
}

// ─── Schedule Optimization Models ────────────────────────────────────────────

class AdjustedTask {
  final String taskName;
  final String suggestedTime;
  final String suggestedDate;
  final int durationMinutes;
  final String reason;

  AdjustedTask({
    required this.taskName,
    required this.suggestedTime,
    required this.suggestedDate,
    required this.durationMinutes,
    required this.reason,
  });

  factory AdjustedTask.fromJson(Map<String, dynamic> json) {
    return AdjustedTask(
      taskName: json['task_name']?.toString() ?? '',
      suggestedTime: json['suggested_time']?.toString() ?? '',
      suggestedDate: json['suggested_date']?.toString() ?? '',
      durationMinutes: (json['duration_minutes'] as num?)?.toInt() ?? 60,
      reason: json['reason']?.toString() ?? '',
    );
  }
}

class OptimizationResult {
  final List<AdjustedTask> adjustedSchedule;
  final List<String> tasksKeptUnchanged;
  final String optimizationSummary;
  final String generatedAt;

  OptimizationResult({
    required this.adjustedSchedule,
    required this.tasksKeptUnchanged,
    required this.optimizationSummary,
    required this.generatedAt,
  });

  factory OptimizationResult.fromJson(Map<String, dynamic> json) {
    final opt = json['optimization'] as Map<String, dynamic>? ?? json;
    return OptimizationResult(
      adjustedSchedule: (opt['adjusted_schedule'] as List?)
              ?.map((e) => AdjustedTask.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      tasksKeptUnchanged: (opt['tasks_kept_unchanged'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      optimizationSummary:
          opt['optimization_summary']?.toString() ?? 'No summary provided.',
      generatedAt: json['generatedAt']?.toString() ?? '',
    );
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

class AnalysisService {
  /// Behavioral analysis
  static Future<BehaviorAnalysis> analyze() async {
    final token = await AuthService.getToken();
    final response = await ApiService.post(
      ApiConfig.baseUrl + ApiConfig.aiAnalyze,
      token: token,
      body: {},
    );
    if (response.statusCode == 200) {
      return BehaviorAnalysis.fromJson(jsonDecode(response.body));
    }
    throw Exception('Analysis failed: ${response.statusCode} ${response.body}');
  }

  /// Intelligent schedule optimization
  static Future<OptimizationResult> optimizeSchedule() async {
    final token = await AuthService.getToken();
    final response = await ApiService.post(
      '${ApiConfig.baseUrl}/api/ai/optimize',
      token: token,
      body: {},
    );
    if (response.statusCode == 200) {
      return OptimizationResult.fromJson(jsonDecode(response.body));
    }
    throw Exception(
        'Optimization failed: ${response.statusCode} ${response.body}');
  }
}
