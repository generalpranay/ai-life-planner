class Event {
  final int id;
  final String title;
  final String? description;
  final DateTime startDatetime;
  final DateTime endDatetime;
  final bool isAllDay;
  final String? location;
  final String color;

  const Event({
    required this.id,
    required this.title,
    this.description,
    required this.startDatetime,
    required this.endDatetime,
    this.isAllDay = false,
    this.location,
    this.color = 'blue',
  });

  factory Event.fromJson(Map<String, dynamic> j) => Event(
        id: j['id'] as int,
        title: j['title'] as String,
        description: j['description'] as String?,
        startDatetime: DateTime.parse(j['start_datetime'] as String).toLocal(),
        endDatetime: DateTime.parse(j['end_datetime'] as String).toLocal(),
        isAllDay: (j['is_all_day'] as bool?) ?? false,
        location: j['location'] as String?,
        color: (j['color'] as String?) ?? 'blue',
      );
}
