class DailyTask {
  final String title;
  final String category;
  final int durationMins;
  final String energyType;
  final String dayOfWeek;

  const DailyTask({
    required this.title,
    required this.category,
    required this.durationMins,
    required this.energyType,
    required this.dayOfWeek,
  });

  factory DailyTask.fromJson(Map<String, dynamic> j) => DailyTask(
        title:       j['title'] as String,
        category:    j['category'] as String,
        durationMins: j['duration_mins'] as int,
        energyType:  j['energy_type'] as String,
        dayOfWeek:   j['day_of_week'] as String,
      );
}

class Week {
  final int week;
  final String milestone;
  final String focus;
  final List<DailyTask> dailyTasks;

  const Week({
    required this.week,
    required this.milestone,
    required this.focus,
    required this.dailyTasks,
  });

  factory Week.fromJson(Map<String, dynamic> j) => Week(
        week:      j['week'] as int,
        milestone: j['milestone'] as String,
        focus:     j['focus'] as String,
        dailyTasks: (j['daily_tasks'] as List)
            .map((e) => DailyTask.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class GoalDecomposition {
  final String goalId;
  final String summary;
  final List<String> skills;
  final List<Week> weeks;

  const GoalDecomposition({
    required this.goalId,
    required this.summary,
    required this.skills,
    required this.weeks,
  });

  factory GoalDecomposition.fromJson(Map<String, dynamic> j) => GoalDecomposition(
        goalId:  j['goal_id'] as String,
        summary: j['summary'] as String,
        skills:  List<String>.from(j['skills'] as List),
        weeks: (j['weeks'] as List)
            .map((e) => Week.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
