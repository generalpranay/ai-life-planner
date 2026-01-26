// lib/models/schedule_block.dart

class ScheduleBlock {
  final int id;
  final String blockType;
  final DateTime startDatetime;
  final DateTime endDatetime;
  final int? taskId;
  final String? taskTitle;
  final String? taskDescription;
  final String? todaysGoal;
  final int? checklistTotal;
  final int? checklistDone;

  ScheduleBlock({
    required this.id,
    required this.blockType,
    required this.startDatetime,
    required this.endDatetime,
    this.taskId,
    this.taskTitle,
    this.taskDescription,
    this.todaysGoal,
    this.checklistTotal,
    this.checklistDone,
  });

  factory ScheduleBlock.fromJson(Map<String, dynamic> json) {
    return ScheduleBlock(
      id: json["id"],
      blockType: json["block_type"],
      startDatetime: DateTime.parse(json["start_datetime"]).toLocal(),
      endDatetime: DateTime.parse(json["end_datetime"]).toLocal(),
      taskId: json["task_id"],
      taskTitle: json["task_title"],
      taskDescription: json["task_description"],
      todaysGoal: json["todays_goal"],
      checklistTotal: json["checklist_total"] != null ? int.tryParse(json["checklist_total"].toString()) : 0,
      checklistDone: json["checklist_done"] != null ? int.tryParse(json["checklist_done"].toString()) : 0,
    );
  }
}
