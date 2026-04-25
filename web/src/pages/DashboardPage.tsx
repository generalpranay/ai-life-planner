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
  work: '#f0b429', study: '#60a5fa', health: '#4ade80', exercise: '#4ade80',
  personal: '#c084fc', break: '#22d3ee', routine: '#f472b6', default: '#6a7a6d',
};
const catColor = (t: string) => CAT_COLORS[t.toLowerCase()] ?? CAT_COLORS.default;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function BlockSkeleton() {
  return (
    <div className="rounded-2xl p-4 overflow-hidden" style={{ background: '#0f2314', border: '1px solid rgba(255,255,255,0.05)' }}>
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

function BlockCard({ block, onRefresh }: { block: Block; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const color = catColor(block.block_type);
  const start = new Date(block.start_datetime);
  const end   = new Date(block.end_datetime);
  const skipped = !!block.skipped_at;

  const complete = async () => {
    setLoading(true);
    try { await api.patch(`/schedule/${block.id}/complete`, { completed: !block.completed }); onRefresh(); }
    catch { toast.error('Could not update block'); }
    finally { setLoading(false); }
  };

  const skip = async () => {
    setLoading(true);
    try { await api.patch(`/schedule/${block.id}/skip`); onRefresh(); }
    catch { toast.error('Could not skip block'); }
    finally { setLoading(false); }
  };

  return (
    <div
      className={`card-hover relative rounded-2xl p-4 ${block.completed ? 'opacity-50' : skipped ? 'opacity-30' : ''}`}
      style={{ background: '#0f2314', border: `1px solid ${color}20` }}
    >
      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full ml-[3px]"
        style={{ background: `linear-gradient(to bottom, ${color}, ${color}66)` }} />

      <div className="pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-[3px] rounded-md"
                style={{ color, background: `${color}16` }}>
                {block.block_type}
              </span>
              {block.completed && (
                <span className="text-[10px] font-semibold text-[#4ade80] px-2 py-[3px] rounded-md"
                  style={{ background: 'rgba(74,222,128,0.10)' }}>✓ Done</span>
              )}
              {skipped && !block.completed && (
                <span className="text-[10px] font-semibold text-[#6a7a6d] px-2 py-[3px] rounded-md"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>Skipped</span>
              )}
            </div>
            <p className={`text-[13.5px] font-semibold leading-snug ${block.completed ? 'line-through text-[#4a5e4e]' : 'text-[#e8e8e0]'}`}>
              {block.task_title || block.block_type}
            </p>
            {block.todays_goal && !block.completed && (
              <p className="text-[12px] text-[#8a9a8d] mt-1 line-clamp-1">{block.todays_goal}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-[#4a5e4e] flex-shrink-0 mt-0.5">
            <Clock size={11} />
            <span className="text-[12px]">{format(start, 'h:mm')}–{format(end, 'h:mm a')}</span>
          </div>
        </div>

        {!!block.checklist_total && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-[#8a9a8d] mb-1.5">
              <span>Checklist</span>
              <span className="font-medium">{block.checklist_done}/{block.checklist_total}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1c3a22' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${((block.checklist_done || 0) / block.checklist_total) * 100}%`, background: color }} />
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button onClick={complete} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 disabled:opacity-50"
            style={{ background: 'rgba(74,222,128,0.10)', color: '#4ade80' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.10)')}>
            <CheckCircle2 size={13} />
            {block.completed ? 'Unmark' : 'Mark done'}
          </button>
          {!block.completed && (
            <button onClick={skip} disabled={loading || skipped}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#6a7a6d] transition-all duration-150 disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
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

  useEffect(() => { fetchBlocks(); fetchRisks(); fetchStreak(); }, [fetchBlocks, fetchRisks, fetchStreak]);

  const generateSchedule = async () => {
    const id = toast.loading('Generating schedule…');
    try { await api.post('/schedule/generate-week'); await fetchBlocks(); toast.success('Schedule generated!', { id }); }
    catch { toast.error('Failed to generate', { id }); }
  };

  const clearSchedule = async () => {
    if (!confirm('Clear all scheduled blocks?')) return;
    const id = toast.loading('Clearing…');
    try { await api.delete('/schedule/clear'); await fetchBlocks(); toast.success('Cleared', { id }); }
    catch { toast.error('Failed', { id }); }
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
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0 sticky top-0 z-10"
        style={{ background: 'rgba(10,26,15,0.90)', backdropFilter: 'blur(14px)', borderColor: 'rgba(212,160,23,0.08)' }}
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-bold text-[#e8e8e0] tracking-tight">
              {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            {streak > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold text-[#d4a017]"
                style={{ background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.22)' }}>
                <Flame size={11} /> {streak}
              </span>
            )}
            {totalCount > 0 && (
              <span className="text-[12px] text-[#8a9a8d] font-medium">
                {completedCount}/{totalCount} done
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#8a9a8d] mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={fetchBlocks} className="p-2 rounded-lg text-[#4a5e4e] hover:text-[#d4a017] transition-colors duration-150"
            style={{ background: 'transparent' }} onMouseEnter={e => (e.currentTarget.style.background='rgba(212,160,23,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.background='transparent')} title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button onClick={generateSchedule}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-[#d4a017] transition-all duration-150"
            style={{ background: 'rgba(212,160,23,0.10)' }}
            onMouseEnter={e => (e.currentTarget.style.background='rgba(212,160,23,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background='rgba(212,160,23,0.10)')}>
            <Sparkles size={13} /> Generate
          </button>
          <button onClick={clearSchedule} className="p-2 rounded-lg text-[#4a5e4e] hover:text-[#f87171] transition-colors duration-150"
            style={{ background: 'transparent' }} onMouseEnter={e => (e.currentTarget.style.background='rgba(248,113,113,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background='transparent')} title="Clear">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Day strip */}
      <div className="flex gap-2 px-6 py-3 overflow-x-auto flex-shrink-0 border-b [scrollbar-width:none]"
        style={{ borderColor: 'rgba(212,160,23,0.06)' }}>
        {days.map(d => {
          const sel = isSameDay(d, selectedDay);
          const tod = isToday(d);
          return (
            <button key={d.toISOString()} onClick={() => setSelectedDay(d)}
              className="flex flex-col items-center px-3 py-2 rounded-xl min-w-[52px] flex-shrink-0 transition-all duration-150"
              style={
                sel
                  ? { background: 'linear-gradient(135deg,#d4a017,#b8860b)', color: '#0a1a0f', boxShadow: '0 4px 16px rgba(212,160,23,0.25)' }
                  : tod
                  ? { border: '1px solid rgba(212,160,23,0.35)', color: '#e8e8e0', background: 'rgba(212,160,23,0.07)' }
                  : { border: '1px solid rgba(255,255,255,0.05)', color: '#6a7a6d', background: 'transparent' }
              }
              onMouseEnter={e => !sel && (e.currentTarget.style.borderColor='rgba(212,160,23,0.25)', e.currentTarget.style.color='#c8d4c0')}
              onMouseLeave={e => !sel && (e.currentTarget.style.borderColor = tod ? 'rgba(212,160,23,0.35)' : 'rgba(255,255,255,0.05)', e.currentTarget.style.color = tod ? '#e8e8e0' : '#6a7a6d')}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{format(d, 'EEE')}</span>
              <span className="text-[16px] font-bold mt-0.5">{format(d, 'd')}</span>
              {tod && !sel && <div className="w-1 h-1 rounded-full bg-[#d4a017] mt-1" />}
            </button>
          );
        })}
      </div>

      {/* Risk banners */}
      {isToday(selectedDay) && risks.length > 0 && (
        <div className="px-6 py-3 space-y-2 flex-shrink-0 border-b animate-fade-in"
          style={{ borderColor: 'rgba(212,160,23,0.06)' }}>
          {risks.slice(0, 3).map(r => (
            <div key={r.block_id} className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{ background: 'rgba(212,160,23,0.06)', borderColor: 'rgba(212,160,23,0.18)' }}>
              <AlertTriangle size={14} className="text-[#d4a017] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-[#e8e8e0] truncate">{r.task_title}</p>
                <p className="text-[11.5px] text-[#8a9a8d] truncate">{r.reason}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => handleRiskAction(r.block_id, 'move_to_tomorrow')}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-[#d4a017] transition-colors"
                  style={{ background: 'rgba(212,160,23,0.14)' }}
                  onMouseEnter={e => (e.currentTarget.style.background='rgba(212,160,23,0.24)')}
                  onMouseLeave={e => (e.currentTarget.style.background='rgba(212,160,23,0.14)')}>
                  Tomorrow
                </button>
                <button onClick={() => handleRiskAction(r.block_id, 'defer')}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-[#6a7a6d] transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.09)')}
                  onMouseLeave={e => (e.currentTarget.style.background='rgba(255,255,255,0.05)')}>
                  Defer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="space-y-3 max-w-2xl">{[...Array(4)].map((_, i) => <BlockSkeleton key={i} />)}</div>
        ) : dayBlocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.18)' }}>
              <CalendarDays size={22} className="text-[#d4a017]/60" />
            </div>
            <p className="text-[14px] font-semibold text-[#c8d4c0] mb-1">
              {isToday(selectedDay) ? 'Nothing scheduled today' : 'No blocks for this day'}
            </p>
            <p className="text-[12.5px] text-[#8a9a8d] mb-4">
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
            {dayBlocks.map(b => <BlockCard key={b.id} block={b} onRefresh={fetchBlocks} />)}
          </div>
        )}
      </div>
    </div>
  );
}
