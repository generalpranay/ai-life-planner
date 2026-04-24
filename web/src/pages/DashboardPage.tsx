import { useEffect, useState, useCallback } from 'react';
import { format, addDays, isToday, isSameDay } from 'date-fns';
import { RefreshCw, Sparkles, Trash2, CheckCircle2, SkipForward, Clock, ChevronRight, AlertTriangle, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Block {
  id: number; block_type: string; start_datetime: string; end_datetime: string;
  task_id?: number; task_title?: string; task_description?: string;
  todays_goal?: string; checklist_total?: number; checklist_done?: number;
  completed: boolean; skipped_at?: string;
}
interface RiskFlag {
  block_id: number; task_title: string; risk_level: string;
  reason: string; suggested_action: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  work: '#F59E0B', study: '#3B82F6', health: '#10B981', exercise: '#10B981',
  personal: '#8B5CF6', break: '#06B6D4', routine: '#EC4899', default: '#71717A',
};
const catColor = (t: string) => CATEGORY_COLORS[t.toLowerCase()] ?? CATEGORY_COLORS.default;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function BlockCard({ block, onRefresh }: { block: Block; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const color = catColor(block.block_type);
  const start = new Date(block.start_datetime);
  const end = new Date(block.end_datetime);
  const skipped = !!block.skipped_at;

  const complete = async () => {
    setLoading(true);
    try {
      await api.patch(`/schedule/${block.id}/complete`, { completed: !block.completed });
      onRefresh();
    } catch { toast.error('Could not update block'); }
    finally { setLoading(false); }
  };

  const skip = async () => {
    setLoading(true);
    try {
      await api.patch(`/schedule/${block.id}/skip`);
      onRefresh();
    } catch { toast.error('Could not skip block'); }
    finally { setLoading(false); }
  };

  return (
    <div
      className={`relative bg-[#18181B] border rounded-2xl p-4 transition-opacity ${
        block.completed ? 'opacity-60' : skipped ? 'opacity-40' : ''
      }`}
      style={{ borderColor: `${color}25` }}
    >
      <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full ml-4" style={{ background: color }} />
      <div className="pl-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md"
                style={{ color, background: `${color}18` }}
              >
                {block.block_type}
              </span>
              {block.completed && (
                <span className="text-[10px] font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-md">Done</span>
              )}
              {skipped && (
                <span className="text-[10px] font-semibold text-[#71717A] bg-white/5 px-2 py-0.5 rounded-md">Skipped</span>
              )}
            </div>
            <p className="text-sm font-semibold text-[#F4F4F5] truncate">
              {block.task_title || block.block_type}
            </p>
            {block.todays_goal && (
              <p className="text-xs text-[#71717A] mt-0.5 line-clamp-1">{block.todays_goal}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-[#71717A] flex-shrink-0">
            <Clock size={11} />
            <span className="text-xs">
              {format(start, 'h:mm')}–{format(end, 'h:mm a')}
            </span>
          </div>
        </div>

        {block.checklist_total ? (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[11px] text-[#71717A] mb-1">
              <span>Checklist</span>
              <span>{block.checklist_done}/{block.checklist_total}</span>
            </div>
            <div className="h-1 bg-[#27272A] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${((block.checklist_done || 0) / block.checklist_total) * 100}%`, background: color }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 mt-3">
          <button
            onClick={complete}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={13} />
            {block.completed ? 'Unmark' : 'Mark done'}
          </button>
          {!block.completed && (
            <button
              onClick={skip}
              disabled={loading || skipped}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-[#71717A] hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <SkipForward size={13} />
              {skipped ? 'Skipped' : 'Skip'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [risks, setRisks] = useState<RiskFlag[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i - 2));

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/schedule/today');
      setBlocks(Array.isArray(data) ? data : data.blocks ?? []);
    } catch { toast.error('Could not load schedule'); }
    finally { setLoading(false); }
  }, []);

  const fetchRisks = useCallback(async () => {
    try {
      const { data } = await api.post('/ai/predict-risks');
      setRisks(Array.isArray(data) ? data : data.flags ?? []);
    } catch { /* silent */ }
  }, []);

  const fetchStreak = useCallback(async () => {
    try {
      const { data } = await api.get('/schedule/streak');
      setStreak(data?.current ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchBlocks();
    fetchRisks();
    fetchStreak();
  }, [fetchBlocks, fetchRisks, fetchStreak]);

  const generateSchedule = async () => {
    const toastId = toast.loading('Generating schedule…');
    try {
      await api.post('/schedule/generate-week');
      await fetchBlocks();
      toast.success('Schedule generated!', { id: toastId });
    } catch {
      toast.error('Failed to generate', { id: toastId });
    }
  };

  const clearSchedule = async () => {
    if (!confirm('Clear all scheduled blocks? Tasks will be preserved.')) return;
    const toastId = toast.loading('Clearing schedule…');
    try {
      await api.delete('/schedule/clear');
      await fetchBlocks();
      toast.success('Schedule cleared', { id: toastId });
    } catch {
      toast.error('Failed to clear', { id: toastId });
    }
  };

  const handleRiskAction = async (blockId: number, action: string) => {
    try {
      await api.post('/ai/risk-action', { block_id: blockId, action });
      toast.success(action === 'move_to_tomorrow' ? 'Moved to tomorrow' : 'Deferred');
      setRisks((r) => r.filter((f) => f.block_id !== blockId));
      await fetchBlocks();
    } catch { toast.error('Action failed'); }
  };

  const dayBlocks = blocks.filter((b) => isSameDay(new Date(b.start_datetime), selectedDay));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#F4F4F5]">
              {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            {streak > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-[#F59E0B] bg-[#F59E0B]/12 border border-[#F59E0B]/25">
                <Flame size={12} />
                {streak}
              </span>
            )}
          </div>
          <p className="text-xs text-[#71717A] mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBlocks} className="p-2 rounded-lg hover:bg-white/5 text-[#71717A] hover:text-[#F4F4F5] transition-colors" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={generateSchedule} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#7C3AED] bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 transition-colors">
            <Sparkles size={14} />
            Generate
          </button>
          <button onClick={clearSchedule} className="p-2 rounded-lg hover:bg-[#EF4444]/10 text-[#71717A] hover:text-[#EF4444] transition-colors" title="Clear schedule">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Day strip */}
      <div className="flex gap-2 px-6 py-3 overflow-x-auto flex-shrink-0 border-b border-white/8">
        {days.map((d) => {
          const sel = isSameDay(d, selectedDay);
          const tod = isToday(d);
          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelectedDay(d)}
              className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[52px] flex-shrink-0 transition-all ${
                sel
                  ? 'gradient-accent text-white shadow-lg shadow-[#7C3AED]/30'
                  : tod
                  ? 'border border-[#7C3AED]/40 text-[#F4F4F5]'
                  : 'border border-white/8 text-[#71717A] hover:border-white/20 hover:text-[#F4F4F5]'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                {format(d, 'EEE')}
              </span>
              <span className="text-base font-bold mt-0.5">{format(d, 'd')}</span>
            </button>
          );
        })}
      </div>

      {/* Risk banners */}
      {isToday(selectedDay) && risks.length > 0 && (
        <div className="px-6 py-3 space-y-2 flex-shrink-0 border-b border-white/8">
          {risks.slice(0, 3).map((r) => (
            <div key={r.block_id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F59E0B]/8 border border-[#F59E0B]/20">
              <AlertTriangle size={15} className="text-[#F59E0B] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#F4F4F5] truncate">{r.task_title}</p>
                <p className="text-xs text-[#71717A] truncate">{r.reason}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleRiskAction(r.block_id, 'move_to_tomorrow')}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] hover:bg-[#F59E0B]/25 transition-colors"
                >
                  Tomorrow
                </button>
                <button
                  onClick={() => handleRiskAction(r.block_id, 'defer')}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white/5 text-[#71717A] hover:bg-white/10 transition-colors"
                >
                  Defer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dayBlocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#18181B] border border-white/8 flex items-center justify-center mb-3">
              <ChevronRight size={20} className="text-[#52525B]" />
            </div>
            <p className="text-sm font-medium text-[#71717A]">No blocks scheduled</p>
            <button
              onClick={generateSchedule}
              className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold gradient-accent text-white hover:opacity-90 transition-opacity"
            >
              <Sparkles size={13} /> Generate schedule
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {dayBlocks
              .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
              .map((b) => (
                <BlockCard key={b.id} block={b} onRefresh={fetchBlocks} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
