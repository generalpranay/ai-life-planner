import 'package:flutter/material.dart';
import '../models/schedule_block.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';

class CustomAgendaView extends StatelessWidget {
  final DateTime date;
  final List<ScheduleBlock> blocks;
  final void Function(ScheduleBlock) onBlockTap;

  const CustomAgendaView({
    super.key,
    required this.date,
    required this.blocks,
    required this.onBlockTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    // Filter blocks for this specific date
    final dayBlocks = blocks.where((block) => 
      block.startDatetime.year == date.year && 
      block.startDatetime.month == date.month && 
      block.startDatetime.day == date.day
    ).toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        const hourHeight = 80.0; // Taller for premium feel
        final totalHeight = hourHeight * 24;
        
        return SingleChildScrollView(
          padding: const EdgeInsets.only(top: 16, bottom: 16),
          child: SizedBox(
            height: totalHeight,
            child: Stack(
              children: [
                // Vertical Timeline Line
                Positioned(
                  top: 0,
                  bottom: 0,
                  left: 69,
                  width: 2,
                  child: Container(
                    color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
                  ),
                ),
                
                // Grid Lines
                ...List.generate(24, (index) {
                  return Positioned(
                    top: index * hourHeight,
                    left: 70,
                    right: 0,
                    child: Container(
                      height: 1,
                      color: isDark ? Colors.grey.withValues(alpha:0.1) : Colors.grey.shade200,
                    ),
                  );
                }),
                
                // Time Labels
                ...List.generate(24, (index) {
                  return Positioned(
                    top: index * hourHeight - 8,
                    left: 8,
                    width: 44,
                    child: Text(
                      "${index == 0 ? 12 : index > 12 ? index - 12 : index} ${index < 12 ? 'AM' : 'PM'}",
                      style: TextStyle(
                        fontSize: 12, 
                        color: isDark ? Colors.grey.shade500 : Colors.grey.shade500,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  );
                }),

                // Events
                for (var block in dayBlocks) ...[
                  Builder(builder: (context) {
                    final startOp = block.startDatetime.hour + (block.startDatetime.minute / 60);
                    final endOp = block.endDatetime.hour + (block.endDatetime.minute / 60);
                    double duration = endOp - startOp;

                    if (duration < 0.5) duration = 0.5;

                    final color = AppTheme.getCategoryColor(block.blockType, Theme.of(context).brightness);
                    final textColor = isDark ? Colors.white : Colors.black87;

                    return Stack(
                      children: [
                        // Timeline Node
                        Positioned(
                          top: startOp * hourHeight - 5,
                          left: 65,
                          width: 10,
                          height: 10,
                          child: Container(
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Theme.of(context).scaffoldBackgroundColor, 
                                width: 2
                              ),
                            ),
                          ),
                        ),
                        // Event Card
                        Positioned(
                          top: startOp * hourHeight + 2,
                          left: 84, // Push right from timeline
                          right: 16,
                          height: (duration * hourHeight) - 8,
                          child: GestureDetector(
                            onTap: () => onBlockTap(block),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: Theme.of(context).cardColor,
                                border: Border(
                                    left: BorderSide(color: color, width: 4),
                                ),
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha:isDark ? 0.2 : 0.05),
                                    blurRadius: 8,
                                    offset: const Offset(0, 4),
                                  )
                                ]
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(_getCategoryIcon(block.blockType), size: 16, color: color),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          block.taskTitle ?? block.blockType.toUpperCase(),
                                          style: TextStyle(
                                            color: textColor,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (block.taskDescription != null && duration > 0.75)
                                   Padding(
                                     padding: const EdgeInsets.only(top: 6, left: 24),
                                     child: Text(
                                       block.taskDescription!,
                                       style: TextStyle(
                                         fontSize: 12,
                                         color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                                       ),
                                       maxLines: 2,
                                       overflow: TextOverflow.ellipsis,
                                     ),
                                   ),
                                  if (duration > 1.0)
                                   Padding(
                                     padding: const EdgeInsets.only(top: 8, left: 24),
                                     child: Text(
                                       "${DateFormat('h:mm a').format(block.startDatetime)} - ${DateFormat('h:mm a').format(block.endDatetime)}",
                                       style: TextStyle(
                                          fontSize: 11,
                                          color: color.withValues(alpha:0.8),
                                          fontWeight: FontWeight.bold,
                                       ),
                                     ),
                                   ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  }),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'work': return Icons.work_outline;
      case 'personal': return Icons.person_outline;
      case 'health':
      case 'exercise': return Icons.fitness_center;
      case 'routine': return Icons.sync;
      case 'break': return Icons.coffee;
      case 'study': return Icons.menu_book;
      default: return Icons.event;
    }
  }
}
