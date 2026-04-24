import { useState, useCallback } from 'react';
import { Brain, RefreshCw, Loader2, TrendingUp, Zap, AlertCircle, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface CategoryStat { category: string; total_minutes: number; completed: number; total: number; completion_rate: number; }
interface PeakHour { hour: number; avg_completion_rate: number; }
interface BehaviorAnalysis {
  insights: string[];
  recommendations: string[];
  productivity_score: number;
  peak_hours: PeakHour[];
  category_stats: CategoryStat[];
  streak: { current: number; longest: number };
}

interface OptimizationResult {
  summary: string;
  schedule_changes: Array<{ task_title: string; action: string; reason: string }>;
}

const CAT_COLORS: Record<string, string> = {
  work: '#F59E0B', study: '#3B82F6', health: '#10B981', personal: '#8B5CF6',
  routine: '#EC4899', break: '#06B6D4', default: '#71717A',
};
const catColor = (c: string) => CAT_COLORS[c] ?? CAT_COLORS.default;

function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const progress = circ - (score / 100) * circ;
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#27272A" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-[#F4F4F5]">{score}</span>
        <span className="text-[9px] text-[#71717A] uppercase tracking-wide">score</span>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [analysis, setAnalysis] = useState<BehaviorAnalysis | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingOpt, setLoadingOpt] = useState(false);

  const runAnalysis = useCallback(async () => {
    setLoadingAnalysis(true);
    try {
      const { data } = await api.post('/ai/analyze');
      setAnalysis(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Analysis failed');
    } finally { setLoadingAnalysis(false); }
  }, []);

  const runOptimization = async () => {
    setLoadingOpt(true);
    try {
      const { data } = await api.post('/ai/optimize');
      setOptimization(data);
      toast.success('Optimization complete');
    } catch { toast.error('Optimization failed'); }
    finally { setLoadingOpt(false); }
  };

  const fmtHour = (h: number) => {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F5]">AI Insights</h1>
          <p className="text-xs text-[#71717A] mt-0.5">Behavior & productivity analysis</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loadingAnalysis}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold gradient-accent text-white hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loadingAnalysis ? <Loader2 size={15} className="animate-spin" /> : <Brain size={15} />}
          {analysis ? 'Re-analyze' : 'Analyze'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!analysis && !loadingAnalysis && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center mb-4 shadow-lg shadow-[#7C3AED]/30">
              <Brain size={24} className="text-white" />
            </div>
            <p className="text-sm font-medium text-[#F4F4F5] mb-1">No analysis yet</p>
            <p className="text-xs text-[#71717A] mb-4">Run the AI to get personalized insights</p>
            <button
              onClick={runAnalysis}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold gradient-accent text-white hover:opacity-90"
            >
              <Zap size={15} /> Run analysis
            </button>
          </div>
        )}

        {loadingAnalysis && (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-[#71717A]">Analyzing your behavior…</p>
          </div>
        )}

        {analysis && !loadingAnalysis && (
          <div className="max-w-2xl space-y-4">
            {/* Score + streak */}
            <div className="bg-[#18181B] border border-white/8 rounded-2xl p-5 flex items-center gap-5">
              <ScoreRing score={analysis.productivity_score} />
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-[#F4F4F5] mb-1">Productivity score</p>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-[#71717A]">Current streak</p>
                    <p className="text-lg font-bold text-[#F59E0B]">🔥 {analysis.streak.current}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#71717A]">Best streak</p>
                    <p className="text-lg font-bold text-[#F4F4F5]">{analysis.streak.longest}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Category stats */}
            {analysis.category_stats?.length > 0 && (
              <div className="bg-[#18181B] border border-white/8 rounded-2xl p-4">
                <p className="text-sm font-semibold text-[#F4F4F5] mb-3 flex items-center gap-2">
                  <TrendingUp size={15} className="text-[#7C3AED]" /> Category breakdown
                </p>
                <div className="space-y-3">
                  {analysis.category_stats.map((s) => (
                    <div key={s.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium capitalize" style={{ color: catColor(s.category) }}>
                          {s.category}
                        </span>
                        <span className="text-xs text-[#71717A]">
                          {s.completed}/{s.total} · {Math.round(s.completion_rate * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#27272A] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${s.completion_rate * 100}%`, background: catColor(s.category) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Peak hours */}
            {analysis.peak_hours?.length > 0 && (
              <div className="bg-[#18181B] border border-white/8 rounded-2xl p-4">
                <p className="text-sm font-semibold text-[#F4F4F5] mb-3 flex items-center gap-2">
                  <Zap size={15} className="text-[#06B6D4]" /> Peak productivity hours
                </p>
                <div className="flex flex-wrap gap-2">
                  {analysis.peak_hours.slice(0, 5).map((ph) => (
                    <div key={ph.hour} className="px-3 py-2 rounded-xl bg-[#27272A] text-center min-w-[64px]">
                      <p className="text-xs font-semibold text-[#F4F4F5]">{fmtHour(ph.hour)}</p>
                      <p className="text-[10px] text-[#10B981] mt-0.5">{Math.round(ph.avg_completion_rate * 100)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights */}
            {analysis.insights?.length > 0 && (
              <div className="bg-[#18181B] border border-white/8 rounded-2xl p-4">
                <p className="text-sm font-semibold text-[#F4F4F5] mb-3">Insights</p>
                <div className="space-y-2">
                  {analysis.insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#27272A]">
                      <ChevronRight size={14} className="text-[#7C3AED] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[#A1A1AA] leading-relaxed">{ins}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations?.length > 0 && (
              <div className="bg-[#18181B] border border-white/8 rounded-2xl p-4">
                <p className="text-sm font-semibold text-[#F4F4F5] mb-3 flex items-center gap-2">
                  <AlertCircle size={15} className="text-[#F59E0B]" /> Recommendations
                </p>
                <div className="space-y-2">
                  {analysis.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/10">
                      <span className="text-[#F59E0B] text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                      <p className="text-xs text-[#A1A1AA] leading-relaxed">{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optimization */}
            <div className="bg-[#18181B] border border-white/8 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[#F4F4F5]">Schedule optimization</p>
                <button
                  onClick={runOptimization}
                  disabled={loadingOpt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#06B6D4]/10 text-[#06B6D4] hover:bg-[#06B6D4]/20 transition-colors disabled:opacity-60"
                >
                  {loadingOpt ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Optimize
                </button>
              </div>
              {optimization ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#A1A1AA]">{optimization.summary}</p>
                  {optimization.schedule_changes?.map((c, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#27272A]">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#F4F4F5]">{c.task_title}</p>
                        <p className="text-[11px] text-[#06B6D4]">{c.action}</p>
                        <p className="text-[11px] text-[#71717A] mt-0.5">{c.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#52525B]">
                  Run optimization to get AI-suggested schedule adjustments.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
