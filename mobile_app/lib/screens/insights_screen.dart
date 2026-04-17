// lib/screens/insights_screen.dart
import 'package:flutter/material.dart';
import 'dart:math' show max;
import '../services/analysis_service.dart';
import 'optimization_screen.dart';

class InsightsScreen extends StatefulWidget {
  const InsightsScreen({super.key});

  @override
  State<InsightsScreen> createState() => _InsightsScreenState();
}

class _InsightsScreenState extends State<InsightsScreen>
    with SingleTickerProviderStateMixin {
  BehaviorAnalysis? _analysis;
  bool _loading = false;
  String? _error;
  late AnimationController _pulseCtrl;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );
    _runAnalysis();
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  Future<void> _runAnalysis() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await AnalysisService.analyze();
      setState(() {
        _analysis = result;
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
    final bg = isDark ? const Color(0xFF0F0F1A) : const Color(0xFFF5F7FF);
    final cardBg = isDark ? const Color(0xFF1A1A2E) : Colors.white;

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
                  colors: [Color(0xFF7C3AED), Color(0xFF2563EB)],
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.auto_awesome, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            const Text('AI Behavior Insights',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Re-analyze',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loading ? null : _runAnalysis,
          ),
        ],
      ),
      body: _loading
          ? _buildLoading()
          : _error != null
              ? _buildError()
              : _analysis != null
                  ? _buildResults(cardBg, isDark)
                  : const SizedBox(),
      floatingActionButton: _analysis != null
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const OptimizationScreen()),
                );
              },
              backgroundColor: const Color(0xFFEC4899),
              icon: const Icon(Icons.auto_fix_high),
              label: const Text('Optimize Schedule'),
            )
          : null,
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  Widget _buildLoading() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          ScaleTransition(
            scale: _pulseAnim,
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF7C3AED), Color(0xFF2563EB)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF7C3AED).withValues(alpha:0.4),
                    blurRadius: 24,
                    spreadRadius: 4,
                  ),
                ],
              ),
              child: const Icon(Icons.psychology_rounded,
                  color: Colors.white, size: 42),
            ),
          ),
          const SizedBox(height: 28),
          const Text('Analyzing your habits…',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text('Gemini is reading your task patterns',
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
            const Text('Analysis Failed',
                style:
                    TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(_error ?? 'Unknown error',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade600)),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _runAnalysis,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
              style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED)),
            ),
          ],
        ),
      ),
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  Widget _buildResults(Color cardBg, bool isDark) {
    final a = _analysis!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        // Consistency Score card
        _scoreCard(a.consistencyScore, cardBg, isDark),
        const SizedBox(height: 16),

        // Insights bullets
        if (a.insights.isNotEmpty) ...[
          _sectionTitle('💡 Key Insights'),
          _insightsList(a.insights, cardBg),
          const SizedBox(height: 16),
        ],

        // Productive / low-productivity hours
        Row(children: [
          Expanded(
              child: _chipCard('⚡ Productive Hours', a.productiveHours,
                  const Color(0xFF22C55E), cardBg)),
          const SizedBox(width: 12),
          Expanded(
              child: _chipCard('😴 Low Output Hours', a.lowProductivityHours,
                  const Color(0xFFEF4444), cardBg)),
        ]),
        const SizedBox(height: 12),

        // Preferred / avoided types
        Row(children: [
          Expanded(
              child: _chipCard('✅ Preferred Tasks', a.preferredTaskTypes,
                  const Color(0xFF3B82F6), cardBg)),
          const SizedBox(width: 12),
          Expanded(
              child: _chipCard('🚫 Avoided Tasks', a.avoidedTaskTypes,
                  const Color(0xFFF97316), cardBg)),
        ]),
        const SizedBox(height: 12),

        // Procrastination patterns
        if (a.procrastinationPatterns.isNotEmpty) ...[
          _sectionTitle('⚠️ Procrastination Patterns'),
          _insightsList(a.procrastinationPatterns, cardBg,
              color: Colors.orange.shade700),
          const SizedBox(height: 16),
        ],

        // Category success rates
        if (a.dbStats.categoryStats.isNotEmpty) ...[
          _sectionTitle('📊 Success Rate by Category'),
          _categoryRatesCard(a.dbStats.categoryStats, cardBg, isDark),
          const SizedBox(height: 16),
        ],

        // Time-of-day productivity
        if (a.dbStats.totalBlocks > 0) ...[
          _sectionTitle('⏰ Productivity by Time of Day'),
          _timeBucketCard(a.dbStats.timeBucketStats, cardBg, isDark),
          const SizedBox(height: 16),
        ],

        // Skip rate summary
        if (a.dbStats.totalBlocks > 0) ...[
          _skipSummaryCard(a.dbStats, cardBg, isDark),
          const SizedBox(height: 16),
        ],

        // Footer timestamp
        Center(
          child: Text(
            'Analyzed at ${_formatTs(a.generatedAt)}',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
          ),
        ),
      ],
    );
  }

  // ── Consistency Score donut-style card ───────────────────────────────────────
  Widget _scoreCard(int score, Color cardBg, bool isDark) {
    final color = score >= 70
        ? const Color(0xFF22C55E)
        : score >= 40
            ? const Color(0xFFF59E0B)
            : const Color(0xFFEF4444);

    final label = score >= 70
        ? 'Great consistency!'
        : score >= 40
            ? 'Room for improvement'
            : 'Needs attention';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha:isDark ? 0.3 : 0.06),
              blurRadius: 16,
              offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            height: 80,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: score / 100,
                  strokeWidth: 8,
                  backgroundColor: color.withValues(alpha:0.15),
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                ),
                Text('$score',
                    style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: color)),
              ],
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Consistency Score',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey)),
                const SizedBox(height: 4),
                Text(label,
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: color)),
                const SizedBox(height: 6),
                Text(
                  'Based on your last 30 days of tasks',
                  style: TextStyle(
                      fontSize: 12, color: Colors.grey.shade500),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Section title ─────────────────────────────────────────────────────────────
  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(title,
          style: const TextStyle(
              fontSize: 15, fontWeight: FontWeight.bold)),
    );
  }

  // ── Bullet list card ──────────────────────────────────────────────────────────
  Widget _insightsList(List<String> items, Color cardBg,
      {Color color = const Color(0xFF7C3AED)}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha:0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: items
            .map((i) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.circle, size: 7, color: color),
                      const SizedBox(width: 10),
                      Expanded(
                          child: Text(i,
                              style: const TextStyle(fontSize: 13.5))),
                    ],
                  ),
                ))
            .toList(),
      ),
    );
  }

  // ── Chip grid card ────────────────────────────────────────────────────────────
  Widget _chipCard(
      String title, List<String> items, Color accent, Color cardBg) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accent.withValues(alpha:0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: accent)),
          const SizedBox(height: 8),
          items.isEmpty
              ? Text('None detected',
                  style: TextStyle(
                      fontSize: 12, color: Colors.grey.shade500))
              : Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: items
                      .map((e) => Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: accent.withValues(alpha:0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                  color: accent.withValues(alpha:0.3)),
                            ),
                            child: Text(e,
                                style: TextStyle(
                                    fontSize: 11,
                                    color: accent,
                                    fontWeight: FontWeight.w600)),
                          ))
                      .toList(),
                ),
        ],
      ),
    );
  }

  // ── Category success-rate bars ────────────────────────────────────────────────
  Widget _categoryRatesCard(List<CategoryStat> stats, Color cardBg, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06), blurRadius: 12, offset: const Offset(0, 3))],
      ),
      child: Column(
        children: stats.map((s) => _rateRow(
          '${_categoryEmoji(s.category)} ${_capitalize(s.category)}',
          s.successRate / 100,
          '${s.successRate.toStringAsFixed(0)}%  (${s.completed}/${s.total})',
          _categoryAccent(s.category),
          isDark,
        )).toList(),
      ),
    );
  }

  // ── Time-of-day bars ──────────────────────────────────────────────────────────
  Widget _timeBucketCard(List<TimeBucketStat> stats, Color cardBg, bool isDark) {
    const order = ['morning', 'afternoon', 'evening', 'night'];
    const icons  = {'morning': '🌅', 'afternoon': '☀️', 'evening': '🌆', 'night': '🌙'};
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06), blurRadius: 12, offset: const Offset(0, 3))],
      ),
      child: Column(
        children: order.map((period) {
          final stat = stats.firstWhere(
            (s) => s.period == period,
            orElse: () => TimeBucketStat.empty(period),
          );
          final label = '${icons[period]} ${_capitalize(period)}';
          final sub   = stat.total > 0 ? '${stat.successRate.toStringAsFixed(0)}%  (${stat.completed}/${stat.total})' : 'No data';
          final color = stat.successRate >= 70
              ? const Color(0xFF22C55E)
              : stat.successRate >= 40
                  ? const Color(0xFFF59E0B)
                  : stat.total > 0
                      ? const Color(0xFFEF4444)
                      : Colors.grey;
          return _rateRow(label, stat.total > 0 ? stat.successRate / 100 : 0, sub, color, isDark);
        }).toList(),
      ),
    );
  }

  // ── Skip summary card ─────────────────────────────────────────────────────────
  Widget _skipSummaryCard(DbStats s, Color cardBg, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange.withValues(alpha: 0.25)),
      ),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: Colors.orange.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.not_interested_rounded, color: Colors.orange, size: 22),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Skip Rate  ${s.skipRate}%',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 2),
            Text('${s.skippedBlocks} skipped · ${s.completedBlocks} completed · ${s.totalBlocks} total blocks',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          ]),
        ),
        // Mini progress arc
        SizedBox(
          width: 44, height: 44,
          child: CircularProgressIndicator(
            value: max(0, 1 - s.skipRate / 100),
            strokeWidth: 5,
            backgroundColor: Colors.orange.withValues(alpha: 0.15),
            valueColor: AlwaysStoppedAnimation<Color>(
              s.skipRate <= 20 ? const Color(0xFF22C55E) : Colors.orange,
            ),
          ),
        ),
      ]),
    );
  }

  // ── Shared progress row ───────────────────────────────────────────────────────
  Widget _rateRow(String label, double value, String sub, Color color, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          Text(sub, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
        ]),
        const SizedBox(height: 5),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: value.clamp(0.0, 1.0),
            backgroundColor: color.withValues(alpha: 0.12),
            valueColor: AlwaysStoppedAnimation<Color>(color),
            minHeight: 7,
          ),
        ),
      ]),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  String _categoryEmoji(String cat) {
    switch (cat.toLowerCase()) {
      case 'study':    return '📚';
      case 'work':     return '💼';
      case 'health':   return '🏃';
      case 'personal': return '🧘';
      default:         return '📌';
    }
  }

  Color _categoryAccent(String cat) {
    switch (cat.toLowerCase()) {
      case 'study':    return const Color(0xFF3B82F6);
      case 'work':     return const Color(0xFF8B5CF6);
      case 'health':   return const Color(0xFF22C55E);
      case 'personal': return const Color(0xFFF59E0B);
      default:         return const Color(0xFF6B7280);
    }
  }

  String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);

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
