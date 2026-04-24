import { useState, type FormEvent } from 'react';
import { Target, Sparkles, Loader2, Save, ChevronDown, ChevronUp, Tag, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface DailyTask { title: string; category: string; duration_mins: number; energy_type: string; day_of_week: string; }
interface Week { week: number; milestone: string; focus: string; daily_tasks: DailyTask[]; }
interface GoalPlan { goal_id: string; summary: string; skills: string[]; weeks: Week[]; }

const CAT_COLORS: Record<string, string> = {
  work: '#F59E0B', study: '#3B82F6', health: '#10B981', personal: '#8B5CF6', default: '#71717A',
};
const catColor = (c: string) => CAT_COLORS[c] ?? CAT_COLORS.default;

const CATEGORIES = ['study', 'work', 'health', 'personal'];
const ENERGY_ICONS: Record<string, string> = { high: '⚡', medium: '🔥', low: '🌙' };

function WeekCard({ week }: { week: Week }) {
  const [open, setOpen] = useState(week.week === 1);
  const byDay: Record<string, DailyTask[]> = {};
  week.daily_tasks.forEach((t) => {
    (byDay[t.day_of_week] = byDay[t.day_of_week] || []).push(t);
  });
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-[#18181B] border border-white/8 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
          {week.week}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#F4F4F5] truncate">{week.milestone}</p>
          <p className="text-xs text-[#71717A] truncate">{week.focus}</p>
        </div>
        <div className="text-[#52525B] flex-shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/5 p-4 space-y-3">
          {days.map((day) => {
            const tasks = byDay[day];
            if (!tasks?.length) return null;
            return (
              <div key={day}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#52525B] mb-2">{day}</p>
                <div className="space-y-1.5">
                  {tasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#27272A]">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: catColor(t.category) }}
                      />
                      <p className="text-xs text-[#F4F4F5] flex-1 min-w-0 truncate">{t.title}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px]">{ENERGY_ICONS[t.energy_type] ?? '•'}</span>
                        <span className="flex items-center gap-1 text-[10px] text-[#71717A]">
                          <Clock size={10} />{t.duration_mins}m
                        </span>
                        <span
                          className="text-[9px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded"
                          style={{ color: catColor(t.category), background: `${catColor(t.category)}18` }}
                        >
                          {t.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [weeksAvailable, setWeeksAvailable] = useState(4);
  const [strong, setStrong] = useState<string[]>([]);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GoalPlan | null>(null);
  const [error, setError] = useState('');

  const toggleCat = (list: string[], setList: (v: string[]) => void, cat: string) =>
    setList(list.includes(cat) ? list.filter((c) => c !== cat) : [...list, cat]);

  const decompose = async (e: FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) { setError('Please describe your goal'); return; }
    if (!deadline) { setError('Please select a deadline'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/ai/decompose-goal', {
        goal: goal.trim(),
        deadline,
        weeks_available: weeksAvailable,
        strong_categories: strong,
        avoid_categories: avoid,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Decomposition failed');
      toast.error('Failed to decompose goal');
    } finally { setLoading(false); }
  };

  const saveGoalPlan = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await api.post('/ai/decompose-goal/save', { goal_id: result.goal_id });
      toast.success('Goal plan saved as tasks!');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="h-full flex flex-col">
      <div
        className="px-6 py-4 border-b border-white/[0.06] flex-shrink-0 sticky top-0 z-10"
        style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <h1 className="text-[18px] font-bold text-[#F2F2F2] tracking-tight">Goal Decomposer</h1>
        <p className="text-[12px] text-[#88888E] mt-0.5">Break big goals into a weekly plan</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl">
          {/* Input form */}
          <form onSubmit={decompose} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-[#71717A] mb-1.5">Your goal *</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                placeholder="e.g. Learn Spanish to conversational level"
                className="w-full px-4 py-3 rounded-xl bg-[#18181B] border border-white/8 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#71717A] mb-1.5">Deadline *</label>
                <input
                  type="date" value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#18181B] border border-white/8 text-sm text-[#F4F4F5] focus:border-[#7C3AED] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#71717A] mb-1.5">Weeks available</label>
                <input
                  type="number" min={1} max={52} value={weeksAvailable}
                  onChange={(e) => setWeeksAvailable(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#18181B] border border-white/8 text-sm text-[#F4F4F5] focus:border-[#7C3AED] transition-colors"
                />
              </div>
            </div>

            {/* Advanced */}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-xs text-[#71717A] hover:text-[#F4F4F5] flex items-center gap-1 transition-colors"
            >
              {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Advanced options
            </button>

            {showAdvanced && (
              <div className="space-y-3 p-4 rounded-xl bg-[#18181B] border border-white/8">
                <div>
                  <label className="block text-xs font-medium text-[#71717A] mb-2">Strong categories (prefer these)</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c} type="button"
                        onClick={() => toggleCat(strong, setStrong, c)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          strong.includes(c)
                            ? 'text-white'
                            : 'bg-[#27272A] border border-white/8 text-[#71717A]'
                        }`}
                        style={strong.includes(c) ? { background: catColor(c) } : {}}
                      >
                        <Tag size={10} className="inline mr-1" />{c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71717A] mb-2">Avoid categories</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c} type="button"
                        onClick={() => toggleCat(avoid, setAvoid, c)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                          avoid.includes(c)
                            ? 'border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]'
                            : 'bg-[#27272A] border-white/8 text-[#71717A]'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-[#EF4444]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-accent text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'Decomposing…' : 'Decompose goal'}
            </button>
          </form>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#7C3AED]/8 border border-[#7C3AED]/20">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-[#7C3AED] flex-shrink-0" />
                    <p className="text-sm font-semibold text-[#F4F4F5]">Plan summary</p>
                  </div>
                  <button
                    onClick={saveGoalPlan}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Save as tasks
                  </button>
                </div>
                <p className="text-sm text-[#A1A1AA] mb-3">{result.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.skills.map((s) => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-[#7C3AED]/15 text-[#7C3AED] border border-[#7C3AED]/20">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {result.weeks.map((w) => (
                <WeekCard key={w.week} week={w} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
