// lib/services/analysis_service.dart
import 'dart:convert';
import '../config/api_config.dart';
import 'api_service.dart';
import 'auth_service.dart';

// ─── DB-computed stats models ─────────────────────────────────────────────────

class CategoryStat {
  final String category;
  final int total;
  final int completed;
  final int skipped;
  final double successRate;

  const CategoryStat({
    required this.category,
    required this.total,
    required this.completed,
    required this.skipped,
    required this.successRate,
  });

  factory CategoryStat.fromJson(Map<String, dynamic> json) => CategoryStat(
        category: json['category']?.toString() ?? 'other',
        total: (json['total'] as num?)?.toInt() ?? 0,
        completed: (json['completed'] as num?)?.toInt() ?? 0,
        skipped: (json['skipped'] as num?)?.toInt() ?? 0,
        successRate: (json['success_rate'] as num?)?.toDouble() ?? 0.0,
      );
}

class TimeBucketStat {
  final String period; // morning | afternoon | evening | night
  final int total;
  final int completed;
  final int skipped;
  final double successRate;

  const TimeBucketStat({
    required this.period,
    required this.total,
    required this.completed,
    required this.skipped,
    required this.successRate,
  });

  factory TimeBucketStat.fromJson(Map<String, dynamic> json) => TimeBucketStat(
        period: json['period']?.toString() ?? '',
        total: (json['total'] as num?)?.toInt() ?? 0,
        completed: (json['completed'] as num?)?.toInt() ?? 0,
        skipped: (json['skipped'] as num?)?.toInt() ?? 0,
        successRate: (json['success_rate'] as num?)?.toDouble() ?? 0.0,
      );

  static TimeBucketStat empty(String period) => TimeBucketStat(
      period: period, total: 0, completed: 0, skipped: 0, successRate: 0);
}

class DbStats {
  final int consistencyScore;
  final int totalBlocks;
  final int completedBlocks;
  final int skippedBlocks;
  final int skipRate;
  final List<CategoryStat> categoryStats;
  final List<TimeBucketStat> timeBucketStats;

  const DbStats({
    required this.consistencyScore,
    required this.totalBlocks,
    required this.completedBlocks,
    required this.skippedBlocks,
    required this.skipRate,
    required this.categoryStats,
    required this.timeBucketStats,
  });

  factory DbStats.fromJson(Map<String, dynamic> json) => DbStats(
        consistencyScore: (json['consistency_score'] as num?)?.toInt() ?? 0,
        totalBlocks: (json['total_blocks'] as num?)?.toInt() ?? 0,
        completedBlocks: (json['completed_blocks'] as num?)?.toInt() ?? 0,
        skippedBlocks: (json['skipped_blocks'] as num?)?.toInt() ?? 0,
        skipRate: (json['skip_rate'] as num?)?.toInt() ?? 0,
        categoryStats: (json['category_stats'] as List?)
                ?.map((e) => CategoryStat.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        timeBucketStats: (json['time_bucket_stats'] as List?)
                ?.map((e) => TimeBucketStat.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
      );

  static DbStats empty() => const DbStats(
        consistencyScore: 0,
        totalBlocks: 0,
        completedBlocks: 0,
        skippedBlocks: 0,
        skipRate: 0,
        categoryStats: [],
        timeBucketStats: [],
      );
}

// ─── Behavioral Analysis Models ──────────────────────────────────────────────

class BehaviorAnalysis {
  final List<String> productiveHours;
  final List<String> lowProductivityHours;
  final List<String> preferredTaskTypes;
  final List<String> avoidedTaskTypes;
  final List<String> procrastinationPatterns;
  final int consistencyScore;
  final List<String> insights;
  final DbStats dbStats;
  final String generatedAt;

  BehaviorAnalysis({
    required this.productiveHours,
    required this.lowProductivityHours,
    required this.preferredTaskTypes,
    required this.avoidedTaskTypes,
    required this.procrastinationPatterns,
    required this.consistencyScore,
    required this.insights,
    required this.dbStats,
    required this.generatedAt,
  });

  factory BehaviorAnalysis.fromJson(Map<String, dynamic> json) {
    final a = json['analysis'] as Map<String, dynamic>? ?? json;
    final d = json['db_stats'] as Map<String, dynamic>?;
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
      dbStats: d != null ? DbStats.fromJson(d) : DbStats.empty(),
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
