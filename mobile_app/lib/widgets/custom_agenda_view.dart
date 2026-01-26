
import 'package:flutter/material.dart';
import '../models/schedule_block.dart';
import 'package:intl/intl.dart';

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
    // Filter blocks for this specific date
    final dayBlocks = blocks.where((block) => 
      block.startDatetime.year == date.year && 
      block.startDatetime.month == date.month && 
      block.startDatetime.day == date.day
    ).toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        const hourHeight = 70.0; // Increased height for better readability
        final totalHeight = hourHeight * 24;
        
        return SingleChildScrollView(
          padding: const EdgeInsets.only(top: 16, bottom: 16),
          child: SizedBox(
            height: totalHeight,
            child: Stack(
              children: [
                // Grid Lines
                ...List.generate(24, (index) {
                  return Positioned(
                    top: index * hourHeight,
                    left: 70,
                    right: 0,
                    child: Container(
                      height: 1,
                      color: Colors.grey.shade200,
                    ),
                  );
                }),
                
                // Time Labels
                ...List.generate(24, (index) {
                  return Positioned(
                    top: index * hourHeight - 6,
                    left: 8,
                    width: 50,
                    child: Text(
                      "${index == 0 ? 12 : index > 12 ? index - 12 : index} ${index < 12 ? 'AM' : 'PM'}",
                      style: TextStyle(
                        fontSize: 13, 
                        color: Colors.grey.shade500,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  );
                }),

                // Events
                ...dayBlocks.map((block) {
                  final startOp = block.startDatetime.hour + (block.startDatetime.minute / 60);
                  final endOp = block.endDatetime.hour + (block.endDatetime.minute / 60);
                  double duration = endOp - startOp;

                  if (duration < 0.5) duration = 0.5;

                  final color = _getCategoryColor(block.blockType);

                  return Positioned(
                    top: startOp * hourHeight + 2,
                    left: 70,
                    right: 16,
                    height: (duration * hourHeight) - 4,
                    child: GestureDetector(
                      onTap: () => onBlockTap(block),
                      child: Container(
                        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.15),
                          border: Border(
                              left: BorderSide(color: color, width: 6),
                          ),
                          borderRadius: const BorderRadius.only(
                            topRight: Radius.circular(8),
                            bottomRight: Radius.circular(8),
                            topLeft: Radius.circular(4),
                            bottomLeft: Radius.circular(4),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 2,
                              offset: const Offset(0, 2),
                            )
                          ]
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(_getCategoryIcon(block.blockType), size: 16, color: color),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    block.taskTitle ?? block.blockType.toUpperCase(),
                                    style: TextStyle(
                                      color: Colors.black87,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                             if (block.taskDescription != null && duration > 0.75)
                             Padding(
                               padding: const EdgeInsets.only(top: 4, left: 22),
                               child: Text(
                                 block.taskDescription!,
                                 style: TextStyle(
                                   fontSize: 11,
                                   color: Colors.black54,
                                 ),
                                 maxLines: 2,
                                 overflow: TextOverflow.ellipsis,
                               ),
                             ),
                             if ((block.checklistTotal ?? 0) > 0)
                               Padding(
                                 padding: const EdgeInsets.only(top: 4, left: 22),
                                 child: Row(
                                   children: [
                                     Icon(Icons.check_circle_outline, size: 12, color: color),
                                     const SizedBox(width: 4),
                                     Text(
                                       "${block.checklistDone}/${block.checklistTotal}",
                                       style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color),
                                     ),
                                   ],
                                 ),
                               ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

   Color _getCategoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'work': return Colors.orange;
      case 'personal': return Colors.teal;
      case 'exercise': return Colors.green;
      case 'break': return Colors.purple;
      case 'study': return Colors.indigo;
      default: return Colors.blueGrey;
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'work': return Icons.work_outline;
      case 'personal': return Icons.person_outline;
      case 'exercise': return Icons.fitness_center;
      case 'break': return Icons.coffee;
      case 'study': return Icons.menu_book;
      default: return Icons.event;
    }
  }
}
