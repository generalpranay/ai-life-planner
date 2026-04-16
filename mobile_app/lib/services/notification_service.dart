import 'dart:async';
import 'package:flutter/material.dart';
import '../models/schedule_block.dart';

typedef NotificationCallback = void Function(ScheduleBlock block, int minsUntil);

class NotificationService {
  static Timer? _timer;
  static final Set<int> _notified = {}; // block ids already notified this session

  /// Start polling. [getBlocks] returns the current loaded blocks.
  /// [onNotify] is called when a block is ≤5 min away.
  static void start({
    required List<ScheduleBlock> Function() getBlocks,
    required NotificationCallback onNotify,
  }) {
    stop();
    // Check immediately, then every 60s
    _check(getBlocks, onNotify);
    _timer = Timer.periodic(const Duration(seconds: 60), (_) {
      _check(getBlocks, onNotify);
    });
  }

  static void stop() {
    _timer?.cancel();
    _timer = null;
  }

  static void clearNotified() => _notified.clear();

  static void _check(
    List<ScheduleBlock> Function() getBlocks,
    NotificationCallback onNotify,
  ) {
    final now = DateTime.now();
    for (final block in getBlocks()) {
      if (block.completed) continue;
      if (_notified.contains(block.id)) continue;

      final diff = block.startDatetime.difference(now).inMinutes;
      if (diff >= 0 && diff <= 5) {
        _notified.add(block.id);
        onNotify(block, diff);
      }
    }
  }
}

/// A themed notification banner that slides in from the top.
class UpcomingBlockBanner extends StatefulWidget {
  final ScheduleBlock block;
  final int minsUntil;
  final VoidCallback onDismiss;

  const UpcomingBlockBanner({
    super.key,
    required this.block,
    required this.minsUntil,
    required this.onDismiss,
  });

  @override
  State<UpcomingBlockBanner> createState() => _UpcomingBlockBannerState();
}

class _UpcomingBlockBannerState extends State<UpcomingBlockBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<Offset> _slide;
  late Animation<double> _fade;
  Timer? _autoClose;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 400));
    _slide = Tween<Offset>(
            begin: const Offset(0, -1.2), end: Offset.zero)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic));
    _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _ctrl.forward();

    _autoClose = Timer(const Duration(seconds: 8), _dismiss);
  }

  void _dismiss() {
    _ctrl.reverse().then((_) => widget.onDismiss());
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _autoClose?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(
        position: _slide,
        child: GestureDetector(
          onTap: _dismiss,
          child: Container(
            margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFF18181B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0x1FFFFFFF)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.40),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF7C3AED).withValues(alpha: 0.20),
                ),
                child: const Icon(Icons.notifications_active_rounded,
                    color: Color(0xFF7C3AED), size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      widget.minsUntil == 0
                          ? 'Starting now'
                          : 'In ${widget.minsUntil} min',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF7C3AED),
                        letterSpacing: 0.4,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      widget.block.taskTitle ??
                          widget.block.blockType.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFFF4F4F5),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              GestureDetector(
                onTap: _dismiss,
                child: const Padding(
                  padding: EdgeInsets.all(4),
                  child: Icon(Icons.close_rounded,
                      size: 16, color: Color(0xFF71717A)),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}
