// lib/screens/optimization_screen.dart
import 'package:flutter/material.dart';
import '../services/analysis_service.dart';

class OptimizationScreen extends StatefulWidget {
  const OptimizationScreen({super.key});

  @override
  State<OptimizationScreen> createState() => _OptimizationScreenState();
}

class _OptimizationScreenState extends State<OptimizationScreen>
    with SingleTickerProviderStateMixin {
  OptimizationResult? _result;
  bool _loading = false;
  String? _error;
  late AnimationController _shimmerCtrl;

  @override
  void initState() {
    super.initState();
    _shimmerCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
    _runOptimization();
  }

  @override
  void dispose() {
    _shimmerCtrl.dispose();
    super.dispose();
  }

  Future<void> _runOptimization() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await AnalysisService.optimizeSchedule();
      setState(() {
        _result = result;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF0D0D1A) : const Color(0xFFF3F5FB);

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFEC4899), Color(0xFFF97316)],
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.auto_fix_high, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            const Text('Optimize Schedule',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Re-optimize',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loading ? null : _runOptimization,
          ),
        ],
      ),
      body: _loading
          ? _buildLoading(isDark)
          : _error != null
              ? _buildError()
              : _result != null
                  ? _buildResults(isDark)
                  : const SizedBox(),
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  Widget _buildLoading(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedBuilder(
            animation: _shimmerCtrl,
            builder: (context, child) {
              return Transform.rotate(
                angle: _shimmerCtrl.value * 6.28,
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFEC4899), Color(0xFFF97316)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFEC4899).withOpacity(0.35),
                        blurRadius: 24,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.auto_fix_high,
                      color: Colors.white, size: 42),
                ),
              );
            },
          ),
          const SizedBox(height: 28),
          const Text('Optimizing your schedule…',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text('Gemini is analyzing patterns & rearranging tasks',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
        ],
      ),
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded,
                size: 56, color: Colors.redAccent),
            const SizedBox(height: 16),
            const Text('Optimization Failed',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(_error ?? 'Unknown error',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade600)),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _runOptimization,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
              style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFEC4899)),
            ),
          ],
        ),
      ),
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  Widget _buildResults(bool isDark) {
    final r = _result!;
    final cardBg = isDark ? const Color(0xFF1A1A2E) : Colors.white;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        // Summary card
        _summaryCard(r.optimizationSummary, cardBg, isDark),
        const SizedBox(height: 16),

        // Adjusted tasks
        if (r.adjustedSchedule.isNotEmpty) ...[
          _sectionTitle('🔄 Adjusted Tasks', const Color(0xFFEC4899)),
          const SizedBox(height: 8),
          ...r.adjustedSchedule.asMap().entries.map(
                (e) => _adjustedTaskCard(e.value, e.key, cardBg, isDark),
              ),
          const SizedBox(height: 16),
        ],

        // Tasks kept unchanged
        if (r.tasksKeptUnchanged.isNotEmpty) ...[
          _sectionTitle('✅ Already Optimal', const Color(0xFF22C55E)),
          const SizedBox(height: 8),
          _unchangedCard(r.tasksKeptUnchanged, cardBg, isDark),
          const SizedBox(height: 16),
        ],

        // Footer
        Center(
          child: Text(
            'Optimized at ${_formatTs(r.generatedAt)}',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
          ),
        ),
      ],
    );
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  Widget _summaryCard(String summary, Color cardBg, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [const Color(0xFF1E1B3A), const Color(0xFF2D1B4E)]
              : [const Color(0xFFFDF2F8), const Color(0xFFFFF7ED)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFEC4899).withOpacity(0.2),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.05),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFEC4899), Color(0xFFF97316)],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.lightbulb_rounded,
                color: Colors.white, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Optimization Summary',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  summary,
                  style: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Section title ─────────────────────────────────────────────────────────
  Widget _sectionTitle(String title, Color accent) {
    return Text(title,
        style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: accent));
  }

  // ── Adjusted task card ────────────────────────────────────────────────────
  Widget _adjustedTaskCard(
      AdjustedTask task, int index, Color cardBg, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFEC4899).withOpacity(0.15),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Task name + new time
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFEC4899), Color(0xFFF97316)],
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: Text('${index + 1}',
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  task.taskName,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Time + Duration chips
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              _infoChip(
                  Icons.schedule_rounded,
                  task.suggestedTime,
                  const Color(0xFF3B82F6)),
              _infoChip(
                  Icons.calendar_today_rounded,
                  task.suggestedDate,
                  const Color(0xFF8B5CF6)),
              _infoChip(
                  Icons.timer_rounded,
                  '${task.durationMinutes} min',
                  const Color(0xFF22C55E)),
            ],
          ),
          const SizedBox(height: 10),

          // Reason
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withOpacity(0.04)
                  : Colors.grey.shade50,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.auto_awesome,
                    size: 14, color: Colors.amber.shade600),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    task.reason,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: isDark
                          ? Colors.grey.shade400
                          : Colors.grey.shade700,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Info chip ─────────────────────────────────────────────────────────────
  Widget _infoChip(IconData icon, String label, Color accent) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: accent.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: accent.withOpacity(0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: accent),
          const SizedBox(width: 5),
          Text(label,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: accent)),
        ],
      ),
    );
  }

  // ── Unchanged tasks card ──────────────────────────────────────────────────
  Widget _unchangedCard(
      List<String> tasks, Color cardBg, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFF22C55E).withOpacity(0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: tasks
            .map((name) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_rounded,
                          size: 16, color: Color(0xFF22C55E)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(name,
                            style: const TextStyle(fontSize: 13.5)),
                      ),
                    ],
                  ),
                ))
            .toList(),
      ),
    );
  }

  String _formatTs(String iso) {
    if (iso.isEmpty) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}  ${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return iso;
    }
  }
}
