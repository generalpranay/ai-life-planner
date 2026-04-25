import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { format, addDays, isToday, isSameDay } from 'date-fns';
import {
  RefreshCw, Sparkles, Trash2, CheckCircle2, SkipForward,
  Clock, AlertTriangle, Flame, CalendarDays, Plus, X,
  ListTodo, LayoutList, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// ─── Interfaces ────────────────────────────────────────────────────────────────

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
interface LocalEvent {
  id: string; title: string; date: string; start_time: string;
  end_time: string; category: string; description: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  work: '#f0b429', study: '#60a5fa', health: '#4ade80', exercise: '#4ade80',
  personal: '#c084fc', break: '#22d3ee', routine: '#f472b6', event: '#f97316', default: '#6a7a6d',
};
const CATEGORIES = ['work', 'study', 'health', 'personal', 'break', 'routine', 'event'];
const catColor = (t: string) => CAT_COLORS[t.toLowerCase()] ?? CAT_COLORS.default;
const LS_KEY = 'ailp_local_events';
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM – 11 PM

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function loadLocalEvents(): LocalEvent[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}
function saveLocalEvents(evs: LocalEvent[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(evs));
}
function localEventToBlock(ev: LocalEvent): Block {
  return {
    id: parseInt(ev.id.replace('local_', ''), 10) || Math.floor(Math.random() * -1e9),
    block_type: ev.category,
    start_datetime: `${ev.date}T${ev.start_time}:00`,
    end_datetime: `${ev.date}T${ev.end_time}:00`,
    task_title: ev.title,
    task_description: ev.description,
    completed: false,
  };
}

// ─── Block skeleton ────────────────────────────────────────────────────────────

function BlockSkeleton() {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#0f2314', border: '1px solid rgba(255,255,255,0.05)' }}>
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

// ─── Agenda block card ─────────────────────────────────────────────────────────

function BlockCard({ block, onRefresh, isLocal, onDeleteLocal }: {
  block: Block; onRefresh: () => void; isLocal?: boolean; onDeleteLocal?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const color = catColor(block.block_type);
  const start = new Date(block.start_datetime);
  const end = new Date(block.end_datetime);
  const skipped = !!block.skipped_at;

  const complete = async () => {
    if (isLocal) { toast('Local events cannot be toggled'); return; }
    setBusy(true);
    try { await api.patch(`/schedule/blocks/${block.id}/complete`, { completed: !block.completed }); onRefresh(); }
    catch { toast.error('Could not update block'); }
    finally { setBusy(false); }
  };

  const skip = async () => {
    if (isLocal) return;
    setBusy(true);
    try { await api.patch(`/schedule/blocks/${block.id}/skip`); onRefresh(); }
    catch { toast.error('Could not skip block'); }
    finally { setBusy(false); }
  };

  return (
    <div className={`card-hover relative rounded-2xl p-4 ${block.completed ? 'opacity-50' : skipped ? 'opacity-30' : ''}`}
      style={{ background: '#0f2314', border: `1px solid ${color}20` }}>
      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full ml-[3px]"
        style={{ background: `linear-gradient(to bottom, ${color}, ${color}66)` }} />
      <div className="pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-[3px] rounded-md"
                style={{ color, background: `${color}16` }}>{block.block_type}</span>
              {block.completed && (
                <span className="text-[10px] font-semibold text-[#4ade80] px-2 py-[3px] rounded-md"
                  style={{ background: 'rgba(74,222,128,0.10)' }}>✓ Done</span>
              )}
              {skipped && !block.completed && (
                <span className="text-[10px] font-semibold text-[#6a7a6d] px-2 py-[3px] rounded-md"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>Skipped</span>
              )}
              {isLocal && (
                <span className="text-[10px] font-semibold text-[#c084fc] px-2 py-[3px] rounded-md"
                  style={{ background: 'rgba(192,132,252,0.08)' }}>local</span>
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
          {!isLocal && (
            <>
              <button onClick={complete} disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 disabled:opacity-50"
                style={{ background: 'rgba(74,222,128,0.10)', color: '#4ade80' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.10)')}>
                <CheckCircle2 size={13} />
                {block.completed ? 'Unmark' : 'Mark done'}
              </button>
              {!block.completed && (
                <button onClick={skip} disabled={busy || skipped}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#6a7a6d] transition-all duration-150 disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                  <SkipForward size={13} />
                  {skipped ? 'Skipped' : 'Skip'}
                </button>
              )}
            </>
          )}
          {isLocal && onDeleteLocal && (
            <button onClick={onDeleteLocal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#f87171] transition-all"
              style={{ background: 'rgba(248,113,113,0.07)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.07)')}>
              <Trash2 size={12} /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Timeline view ─────────────────────────────────────────────────────────────

function TimelineView({ blocks, date, onSlotClick, onDeleteLocal, localIds, onRefresh }: {
  blocks: Block[]; date: Date; onSlotClick: (hour: number) => void;
  onDeleteLocal: (id: number) => void; localIds: Set<number>; onRefresh: () => void;
}) {
  const dayBlocks = blocks.filter(b => {
    const bd = new Date(b.start_datetime);
    return bd.getDate() === date.getDate() && bd.getMonth() === date.getMonth() && bd.getFullYear() === date.getFullYear();
  });

  const nowHour = new Date().getHours();
  const nowMin = new Date().getMinutes();
  const showNowLine = isToday(date) && nowHour >= 6 && nowHour <= 23;
  const nowTop = showNowLine ? ((nowHour - 6) * 60 + nowMin) / 60 * 64 : 0;

  return (
    <div className="relative" style={{ minHeight: `${HOURS.length * 64}px` }}>
      {/* Hour rows */}
      {HOURS.map(h => (
        <div key={h} className="absolute w-full flex items-start group cursor-pointer"
          style={{ top: `${(h - 6) * 64}px`, height: 64 }}
          onClick={() => onSlotClick(h)}>
          <span className="text-[10px] text-[#4a5e4e] w-14 flex-shrink-0 pt-0.5 select-none">
            {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
          </span>
          <div className="flex-1 border-t mt-2 relative" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <span className="absolute right-2 top-1 text-[10px] text-[#2a3a2e] opacity-0 group-hover:opacity-100 transition-opacity select-none pointer-events-none">
              + Add
            </span>
          </div>
        </div>
      ))}

      {/* Current time indicator */}
      {showNowLine && (
        <div className="absolute left-14 right-0 flex items-center pointer-events-none z-10"
          style={{ top: nowTop }}>
          <div className="w-2 h-2 rounded-full bg-[#f87171] -ml-1 flex-shrink-0" />
          <div className="flex-1 border-t border-[#f87171] opacity-60" />
        </div>
      )}

      {/* Blocks */}
      {dayBlocks.map(b => {
        const start = new Date(b.start_datetime);
        const end = new Date(b.end_datetime);
        const startMins = (start.getHours() - 6) * 60 + start.getMinutes();
        const dur = (end.getTime() - start.getTime()) / 60000;
        const top = (startMins / 60) * 64;
        const height = Math.max((dur / 60) * 64, 32);
        const color = catColor(b.block_type);
        const isLocal = localIds.has(b.id);

        return (
          <div key={b.id} className="absolute left-14 right-0 px-2" style={{ top, height, zIndex: 2 }}>
            <div className={`h-full rounded-xl p-2.5 flex flex-col justify-between border transition-opacity group/blk ${b.completed ? 'opacity-40' : ''}`}
              style={{ borderColor: `${color}35`, background: `${color}12` }}>
              <div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[11.5px] font-semibold text-[#e8e8e0] truncate leading-tight flex-1">
                    {b.task_title || b.block_type}
                  </p>
                  {isLocal && (
                    <button onClick={e => { e.stopPropagation(); onDeleteLocal(b.id); }}
                      className="opacity-0 group-hover/blk:opacity-100 p-0.5 rounded hover:bg-[#f87171]/20 text-[#f87171] transition-all flex-shrink-0">
                      <X size={10} />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-[#4a5e4e] flex items-center gap-1 mt-0.5">
                  <Clock size={9} />
                  {format(start, 'h:mm')}–{format(end, 'h:mm a')}
                </p>
              </div>
              {!isLocal && (
                <button onClick={async () => {
                  try { await api.patch(`/schedule/blocks/${b.id}/complete`, { completed: !b.completed }); onRefresh(); }
                  catch { toast.error('Update failed'); }
                }}
                  className="mt-1 w-fit p-1 rounded-md hover:bg-white/10 transition-colors"
                  title={b.completed ? 'Unmark' : 'Mark done'}>
                  <CheckCircle2 size={12} className={b.completed ? 'text-[#4ade80]' : 'text-[#4a5e4e]'} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {dayBlocks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-[12px] text-[#2a3a2e]">No blocks — click a time slot to add</p>
        </div>
      )}
    </div>
  );
}

// ─── Add event / quick task modal ──────────────────────────────────────────────

function AddModal({ prefillDate, prefillHour, onClose, onSaved }: {
  prefillDate?: string; prefillHour?: number; onClose: () => void; onSaved: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [type, setType] = useState<'task' | 'event'>('task');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(prefillDate ?? today);
  const [startTime, setStartTime] = useState(
    prefillHour !== undefined ? `${String(prefillHour).padStart(2, '0')}:00` : '09:00'
  );
  const [endTime, setEndTime] = useState(
    prefillHour !== undefined ? `${String(prefillHour + 1).padStart(2, '0')}:00` : '10:00'
  );
  const [category, setCategory] = useState('work');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (startTime >= endTime) { toast.error('End time must be after start time'); return; }
    setLoading(true);
    try {
      if (type === 'task') {
        await api.post('/tasks', {
          title: title.trim(),
          category,
          description: description.trim() || undefined,
          due_datetime: `${date}T${startTime}`,
          start_time: startTime,
          end_time: endTime,
          priority: 3,
        });
        toast.success('Task scheduled');
      } else {
        const ev: LocalEvent = {
          id: `local_${Date.now()}`,
          title: title.trim(), date, start_time: startTime, end_time: endTime,
          category, description: description.trim(),
        };
        const existing = loadLocalEvents();
        saveLocalEvents([...existing, ev]);
        toast.success('Event added');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl shadow-black/70 animate-scale-in"
        style={{ background: '#0f2314', border: '1px solid rgba(212,160,23,0.15)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(212,160,23,0.08)' }}>
          <h2 className="text-[14px] font-semibold text-[#e8e8e0]">Add to schedule</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#4a5e4e] hover:text-[#e8e8e0] transition-colors"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <X size={15} />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden p-0.5 gap-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['task', 'event'] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold transition-all"
                style={type === t
                  ? { background: 'linear-gradient(135deg,#d4a017,#b8860b)', color: '#0a1a0f' }
                  : { color: '#6a7a6d' }
                }>
                {t === 'task' ? <ListTodo size={13} /> : <CalendarDays size={13} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {type === 'event' && (
            <p className="text-[11px] text-[#4a5e4e] -mt-1">
              Events are saved locally (this browser only). Use the Tasks page for persistent scheduled tasks.
            </p>
          )}
          <div>
            <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              placeholder={type === 'task' ? 'Task title' : 'Event title'} className="input-glow" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-glow" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="input-glow cursor-pointer">
                {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#0f2314' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Start time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input-glow" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">End time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input-glow" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Notes</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Optional notes…" className="input-glow" style={{ resize: 'none', borderRadius: 10 }} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full" style={{ borderRadius: 10, padding: '11px 20px' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {type === 'task' ? 'Schedule task' : 'Add event'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>(loadLocalEvents);
  const [risks, setRisks] = useState<RiskFlag[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'agenda' | 'timeline'>('agenda');
  const [showAddModal, setShowAddModal] = useState(false);
  const [prefillHour, setPrefillHour] = useState<number | undefined>();

  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i - 3));

  // ── Local event helpers ──────────────────────────────────────────────────────
  const localIds = new Set(localEvents.map(ev => parseInt(ev.id.replace('local_', ''), 10)));
  const allBlocks = [
    ...blocks,
    ...localEvents.map(localEventToBlock),
  ];

  // ── Fetchers ─────────────────────────────────────────────────────────────────
  const fetchBlocks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/schedule/week');
      setBlocks(Array.isArray(data) ? data : data.blocks ?? []);
    } catch { if (!silent) toast.error('Could not load schedule'); }
    finally { if (!silent) setLoading(false); }
  }, []);

  const fetchRisks = useCallback(async () => {
    try {
      const { data } = await api.get('/ai/predict-risks');
      setRisks(Array.isArray(data) ? data : data.flags ?? []);
    } catch { /* silent */ }
  }, []);

  const fetchStreak = useCallback(async () => {
    try {
      const { data } = await api.get('/schedule/streak');
      setStreak(data?.current_streak ?? 0);
    } catch { /* silent */ }
  }, []);

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBlocks(); fetchRisks(); fetchStreak();
  }, [fetchBlocks, fetchRisks, fetchStreak]);

  // Refresh when the user comes back to this tab
  useEffect(() => {
    const onFocus = () => fetchBlocks(true);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchBlocks(true); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchBlocks]);

  // ── Actions ──────────────────────────────────────────────────────────────────
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

  const handleDeleteLocal = (blockId: number) => {
    const evId = `local_${blockId}`;
    const updated = localEvents.filter(e => e.id !== evId);
    setLocalEvents(updated);
    saveLocalEvents(updated);
  };

  const handleAddSaved = () => {
    setLocalEvents(loadLocalEvents());
    fetchBlocks();
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const dayBlocks = allBlocks
    .filter(b => isSameDay(new Date(b.start_datetime), selectedDay))
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  const completedCount = dayBlocks.filter(b => b.completed).length;
  const totalCount = dayBlocks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0 sticky top-0 z-10"
        style={{ background: 'rgba(10,26,15,0.90)', backdropFilter: 'blur(14px)', borderColor: 'rgba(212,160,23,0.08)' }}>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
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
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#8a9a8d] font-medium">{completedCount}/{totalCount}</span>
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#1c3a22' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: progress === 100 ? '#4ade80' : '#d4a017' }} />
                </div>
              </div>
            )}
          </div>
          <p className="text-[12px] text-[#8a9a8d] mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => fetchBlocks()}
            className="p-2 rounded-lg text-[#4a5e4e] hover:text-[#d4a017] transition-colors duration-150"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,160,23,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')} title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => { setPrefillHour(undefined); setShowAddModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-all duration-150"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#c8d4c0', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}>
            <Plus size={13} /> Add
          </button>
          <button onClick={generateSchedule}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-[#d4a017] transition-all duration-150"
            style={{ background: 'rgba(212,160,23,0.10)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,160,23,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,160,23,0.10)')}>
            <Sparkles size={13} /> Generate
          </button>
          <button onClick={clearSchedule}
            className="p-2 rounded-lg text-[#4a5e4e] hover:text-[#f87171] transition-colors duration-150"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')} title="Clear schedule">
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
          const dayBlockCount = allBlocks.filter(b => isSameDay(new Date(b.start_datetime), d)).length;
          return (
            <button key={d.toISOString()} onClick={() => setSelectedDay(d)}
              className="flex flex-col items-center px-3 py-2 rounded-xl min-w-[52px] flex-shrink-0 transition-all duration-150 relative"
              style={
                sel
                  ? { background: 'linear-gradient(135deg,#d4a017,#b8860b)', color: '#0a1a0f', boxShadow: '0 4px 16px rgba(212,160,23,0.25)' }
                  : tod
                  ? { border: '1px solid rgba(212,160,23,0.35)', color: '#e8e8e0', background: 'rgba(212,160,23,0.07)' }
                  : { border: '1px solid rgba(255,255,255,0.05)', color: '#6a7a6d', background: 'transparent' }
              }
              onMouseEnter={e => !sel && (e.currentTarget.style.borderColor = 'rgba(212,160,23,0.25)', e.currentTarget.style.color = '#c8d4c0')}
              onMouseLeave={e => !sel && (e.currentTarget.style.borderColor = tod ? 'rgba(212,160,23,0.35)' : 'rgba(255,255,255,0.05)', e.currentTarget.style.color = tod ? '#e8e8e0' : '#6a7a6d')}>
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{format(d, 'EEE')}</span>
              <span className="text-[16px] font-bold mt-0.5">{format(d, 'd')}</span>
              {dayBlockCount > 0 && (
                <span className="text-[9px] font-bold mt-0.5 opacity-70">{dayBlockCount}</span>
              )}
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
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,160,23,0.24)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,160,23,0.14)')}>Tomorrow</button>
                <button onClick={() => handleRiskAction(r.block_id, 'defer')}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-[#6a7a6d] transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>Defer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center justify-between px-6 py-2.5 flex-shrink-0 border-b"
        style={{ borderColor: 'rgba(212,160,23,0.06)' }}>
        <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {([['agenda', LayoutList, 'Agenda'], ['timeline', CalendarDays, 'Timeline']] as const).map(([v, Icon, label]) => (
            <button key={v} onClick={() => setView(v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all duration-150"
              style={view === v
                ? { background: 'rgba(212,160,23,0.14)', color: '#d4a017' }
                : { color: '#4a5e4e' }
              }>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        <span className="text-[11.5px] text-[#4a5e4e]">
          {dayBlocks.length} block{dayBlocks.length !== 1 ? 's' : ''}
          {completedCount > 0 && ` · ${completedCount} done`}
        </span>
      </div>

      {/* Content */}
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
              Add a task with a scheduled time, or generate an AI schedule
            </p>
            <div className="flex gap-2">
              <button onClick={() => { setPrefillHour(undefined); setShowAddModal(true); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#c8d4c0', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}>
                <Plus size={13} /> Add task
              </button>
              {isToday(selectedDay) && (
                <button onClick={generateSchedule} className="btn-primary" style={{ borderRadius: 10, padding: '9px 18px', fontSize: 12.5 }}>
                  <Sparkles size={13} /> Generate
                </button>
              )}
            </div>
          </div>
        ) : view === 'agenda' ? (
          <div className="space-y-3 max-w-2xl stagger">
            {dayBlocks.map(b => (
              <BlockCard key={b.id} block={b} onRefresh={fetchBlocks}
                isLocal={localIds.has(b.id)}
                onDeleteLocal={localIds.has(b.id) ? () => handleDeleteLocal(b.id) : undefined} />
            ))}
          </div>
        ) : (
          <div className="max-w-2xl">
            <TimelineView
              blocks={allBlocks}
              date={selectedDay}
              onSlotClick={h => { setPrefillHour(h); setShowAddModal(true); }}
              onDeleteLocal={handleDeleteLocal}
              localIds={localIds}
              onRefresh={fetchBlocks}
            />
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => { setPrefillHour(undefined); setShowAddModal(true); }}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 z-20"
        style={{ background: 'linear-gradient(135deg,#d4a017,#b8860b)', boxShadow: '0 4px 20px rgba(212,160,23,0.35)' }}
        title="Add to schedule">
        <Plus size={20} className="text-[#0a1a0f]" />
      </button>

      {showAddModal && (
        <AddModal
          prefillDate={format(selectedDay, 'yyyy-MM-dd')}
          prefillHour={prefillHour}
          onClose={() => { setShowAddModal(false); setPrefillHour(undefined); }}
          onSaved={handleAddSaved}
        />
      )}
    </div>
  );
}
