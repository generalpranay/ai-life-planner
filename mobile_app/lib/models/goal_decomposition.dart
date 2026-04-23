class WeeklyMilestone {
  final int week;
  final String milestone;

  const WeeklyMilestone({required this.week, required this.milestone});

  factory WeeklyMilestone.fromJson(Map<String, dynamic> j) =>
      WeeklyMilestone(week: j['week'] as int, milestone: j['milestone'] as String);
}

class DailyTask {
  final String day;
  final String task;
  final int durationMins;
  final String category;

  const DailyTask({
    required this.day,
    required this.task,
    required this.durationMins,
    required this.category,
  });

  factory DailyTask.fromJson(Map<String, dynamic> j) => DailyTask(
        day: j['day'] as String,
        task: j['task'] as String,
        durationMins: j['durationMins'] as int,
        category: j['category'] as String,
      );
}

class GoalDecomposition {
  final List<WeeklyMilestone> weeklyMilestones;
  final List<DailyTask> dailyTasks;
  final List<String> skills;

  const GoalDecomposition({
    required this.weeklyMilestones,
    required this.dailyTasks,
    required this.skills,
  });

  factory GoalDecomposition.fromJson(Map<String, dynamic> j) => GoalDecomposition(
        weeklyMilestones: (j['weeklyMilestones'] as List)
            .map((e) => WeeklyMilestone.fromJson(e as Map<String, dynamic>))
            .toList(),
        dailyTasks: (j['dailyTasks'] as List)
            .map((e) => DailyTask.fromJson(e as Map<String, dynamic>))
            .toList(),
        skills: List<String>.from(j['skills'] as List),
      );
}
