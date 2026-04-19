class RiskFlag {
  final int blockId;
  final int? taskId;
  final String title;
  final String type; // OVERLOAD | SKIP_RISK | CONFLICT
  final String suggestion;

  const RiskFlag({
    required this.blockId,
    this.taskId,
    required this.title,
    required this.type,
    required this.suggestion,
  });

  factory RiskFlag.fromJson(Map<String, dynamic> json) => RiskFlag(
        blockId:    (json['blockId']  as num?)?.toInt() ?? 0,
        taskId:     (json['taskId']   as num?)?.toInt(),
        title:      json['title']?.toString()      ?? 'Task',
        type:       json['type']?.toString()       ?? 'UNKNOWN',
        suggestion: json['suggestion']?.toString() ?? '',
      );
}
