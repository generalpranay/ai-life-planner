import { useEffect, useState, useCallback } from 'react';
import { format, addDays, isToday, isSameDay } from 'date-fns';
import {
  RefreshCw, Sparkles, Trash2, CheckCircle2, SkipForward,
  Clock, AlertTriangle, Flame, CalendarDays,
} from 'lucide-react';
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

const CAT_COLORS: Record<string, string> = {
  work: '#F59E0B', study: '#3B82F6', health: '#10B981', exercise: '#10B981',
  personal: '#8B5CF6', break: '#06B6D4', routine: '#EC4899', default: '#71717A',
};
const catColor = (t: string) => CAT_COLORS[t.toLowerCase()] ?? CAT_COLORS.default;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── Skeleton ─────────────────────────────────────────────────── */
function BlockSkeleton() {
  return (
    <div className="bg-[#111113] border border-white/[0.06] rounded-2xl p-4 overflow-hidden">
      <div className="flex gap-4">
        <div className="skeleton w-0.5 self-stretch rounded-full flex-shrink-0" style={{ minHeight: 64 }} />
        <div className="flex-1 space-y-2.5">
          <div className="skeleton h-4 w-16 rounded-md" />
          <div className="skeleton h-4 w-48 rounded-md" />
          <div className="skeleton h-3 w-36 rounded-md" />
          <div className="flex gap-2 pt-1">
            <div className="skeleton h-7 w-24 rounded-lg" />
            <div className="skeleton h-7 w-20 rounded-lg" />
          </div>
        </div>
        <div className="skeleton h-4 w-20 rounded-md flex-shrink-0" />
      </div>
    </div>
  );
}

/* ── Block card ───────────────────────────────────────────────── */
function BlockCard({ block, onRefresh }: { block: Block; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const color = catColor(block.block_type);
  const start = new Date(block.start_datetime);
  const end   = new Date(block.end_datetime);
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
      className={`card-hover relative bg-[#111113] border rounded-2xl p-4 ${
        block.completed ? 'opacity-55' : skipped ? 'opacity-35' : ''
      }`}
      style={{ borderColor: `${color}22` }}
    >
      {/* Category bar */}
      <div
        className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full ml-[3px]"
        style={{ background: `linear-gradient(to bottom, ${color}, ${color}88)` }}
      />

      <div className="pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[10px] font-bold tracking-widest uppercase px-2 py-[3px] rounded-md"
                style={{ color, background: `${color}16` }}
              >
                {block.block_type}
              </span>
              {block.completed && (
                <span className="text-[10px] font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-[3px] rounded-md">
                  ✓ Done
                </span>
              )}
              {skipped && !block.completed && (
                <span className="text-[10px] font-semibold text-[#88888E] bg-white/[0.06] px-2 py-[3px] rounded-md">
                  Skipped
                </span>
              )}
            </div>

            <p className={`text-[13.5px] font-semibold leading-snug ${block.completed ? 'line-through text-[#52525B]' : 'text-[#F2F2F2]'}`}>
              {block.task_title || block.block_type}
            </p>

            {block.todays_goal && !block.completed && (
              <p className="text-[12px] text-[#88888E] mt-1 line-clamp-1">
                {block.todays_goal}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 text-[#88888E] flex-shrink-0 mt-0.5">
            <Clock size={11} />
            <span className="text-[12px]">
              {format(start, 'h:mm')}–{format(end, 'h:mm a')}
            </span>
          </div>
        </div>

        {/* Checklist progress */}
        {!!block.checklist_total && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-[#88888E] mb-1.5">
              <span>Checklist</span>
              <span className="font-medium">{block.checklist_done}/{block.checklist_total}</span>
            </div>
            <div className="h-1 bg-[#28282C] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${((block.checklist_done || 0) / block.checklist_total) * 100}%`,
                  background: color,
                }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={complete}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 disabled:opacity-50"
            style={{
              background: block.completed ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.10)',
              color: '#10B981',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = block.completed ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.10)')}
          >
            <CheckCircle2 size={13} />
            {block.completed ? 'Unmark' : 'Mark done'}
          </button>

          {!block.completed && (
            <button
              onClick={skip}
              disabled={loading || skipped}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white/[0.04] text-[#88888E] hover:bg-white/[0.08] hover:text-[#D4D4D8] transition-all duration-150 disabled:opacity-50"
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

/* ── Main page ────────────────────────────────────────────────── */
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
    const id = toast.loading('Generating schedule…');
    try {
      await api.post('/schedule/generate-week');
      await fetchBlocks();
      toast.success('Schedule generated!', { id });
    } catch { toast.error('Failed to generate', { id }); }
  };

  const clearSchedule = async () => {
    if (!confirm('Clear all scheduled blocks? Tasks will be preserved.')) return;
    const id = toast.loading('Clearing schedule…');
    try {
      await api.delete('/schedule/clear');
      await fetchBlocks();
      toast.success('Schedule cleared', { id });
    } catch { toast.error('Failed to clear', { id }); }
  };

  const handleRiskAction = async (blockId: number, action: string) => {
    try {
      await api.post('/ai/risk-action', { block_id: blockId, action });
      toast.success(action === 'move_to_tomorrow' ? 'Moved to tomorrow' : 'Deferred');
      setRisks(r => r.filter(f => f.block_id !== blockId));
      await fetchBlocks();
    } catch { toast.error('Action failed'); }
  };

  const dayBlocks = blocks
    .filter(b => isSameDay(new Date(b.start_datetime), selectedDay))
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  const completedCount = dayBlocks.filter(b => b.completed).length;
  const totalCount = dayBlocks.length;

  return (
    <div className="h-full flex flex-col">
      {/* ── Sticky header ──────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0 sticky top-0 z-10"
        style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-bold text-[#F2F2F2] tracking-tight">
              {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            {streak > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold text-[#F59E0B] bg-[#F59E0B]/12 border border-[#F59E0B]/22">
                <Flame size={11} />
                {streak}
              </span>
            )}
            {totalCount > 0 && (
              <span className="text-[12px] text-[#88888E] font-medium">
                {completedCount}/{totalCount} done
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#88888E] mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchBlocks}
            className="p-2 rounded-lg hover:bg-white/[0.05] text-[#88888E] hover:text-[#D4D4D8] transition-all duration-150"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={generateSchedule}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-[#7C3AED] bg-[#7C3AED]/[0.10] hover:bg-[#7C3AED]/[0.18] transition-all duration-150"
          >
            <Sparkles size={13} />
            Generate
          </button>
          <button
            onClick={clearSchedule}
            className="p-2 rounded-lg hover:bg-[#EF4444]/[0.08] text-[#88888E] hover:text-[#EF4444] transition-all duration-150"
            title="Clear schedule"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* ── Day strip ──────────────────────────────────────── */}
      <div className="flex gap-2 px-6 py-3 overflow-x-auto flex-shrink-0 border-b border-white/[0.06] [scrollbar-width:none]">
        {days.map(d => {
          const sel = isSameDay(d, selectedDay);
          const tod = isToday(d);
          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelectedDay(d)}
              className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[52px] flex-shrink-0 transition-all duration-150 ${
                sel
                  ? 'gradient-accent text-white shadow-lg shadow-[#7C3AED]/25'
                  : tod
                  ? 'border border-[#7C3AED]/35 text-[#F2F2F2] bg-[#7C3AED]/[0.06]'
                  : 'border border-white/[0.06] text-[#88888E] hover:border-white/15 hover:text-[#D4D4D8] hover:bg-white/[0.03]'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                {format(d, 'EEE')}
              </span>
              <span className="text-[16px] font-bold mt-0.5">{format(d, 'd')}</span>
              {tod && !sel && (
                <div className="w-1 h-1 rounded-full bg-[#7C3AED] mt-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Risk banners ───────────────────────────────────── */}
      {isToday(selectedDay) && risks.length > 0 && (
        <div className="px-6 py-3 space-y-2 flex-shrink-0 border-b border-white/[0.06] animate-fade-in">
          {risks.slice(0, 3).map(r => (
            <div
              key={r.block_id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.18)' }}
            >
              <AlertTriangle size={14} className="text-[#F59E0B] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-[#F2F2F2] truncate">{r.task_title}</p>
                <p className="text-[11.5px] text-[#88888E] truncate">{r.reason}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleRiskAction(r.block_id, 'move_to_tomorrow')}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors duration-150"
                  style={{ background: 'rgba(245,158,11,0.14)', color: '#F59E0B' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.24)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.14)')}
                >
                  Tomorrow
                </button>
                <button
                  onClick={() => handleRiskAction(r.block_id, 'defer')}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.05] text-[#88888E] hover:bg-white/[0.09] transition-colors duration-150"
                >
                  Defer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Schedule list ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="space-y-3 max-w-2xl">
            {[...Array(4)].map((_, i) => <BlockSkeleton key={i} />)}
          </div>
        ) : dayBlocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center animate-fade-in">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)' }}
            >
              <CalendarDays size={22} className="text-[#7C3AED]/60" />
            </div>
            <p className="text-[14px] font-semibold text-[#D4D4D8] mb-1">
              {isToday(selectedDay) ? 'Nothing scheduled today' : 'No blocks for this day'}
            </p>
            <p className="text-[12.5px] text-[#88888E] mb-4">
              {isToday(selectedDay) ? 'Generate your AI schedule to get started' : 'Select another day or generate a new schedule'}
            </p>
            {isToday(selectedDay) && (
              <button onClick={generateSchedule} className="btn-primary" style={{ borderRadius: 10, padding: '9px 18px' }}>
                <Sparkles size={14} /> Generate schedule
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl stagger">
            {dayBlocks.map(b => (
              <BlockCard key={b.id} block={b} onRefresh={fetchBlocks} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
