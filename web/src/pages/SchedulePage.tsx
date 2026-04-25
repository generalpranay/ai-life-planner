import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { Sparkles, Trash2, RefreshCw, Clock, CheckCircle2, Plus, X, CalendarDays, ListTodo } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface Block {
  id: number; block_type: string; start_datetime: string; end_datetime: string;
  task_id?: number; task_title?: string; task_description?: string;
  todays_goal?: string; completed: boolean; skipped_at?: string;
}

interface LocalEvent {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  category: string;
  description: string;
  type: 'task' | 'event';
}

const CAT_COLORS: Record<string, string> = {
  work: '#F59E0B', study: '#3B82F6', health: '#10B981', exercise: '#10B981',
  personal: '#8B5CF6', break: '#06B6D4', routine: '#EC4899', event: '#F97316', default: '#71717A',
};
const catColor = (t: string) => CAT_COLORS[t.toLowerCase()] ?? CAT_COLORS.default;

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am–11pm
const CATEGORIES = ['work', 'study', 'health', 'personal', 'break', 'routine', 'event'];
const LS_KEY = 'ailp_local_events';

function loadLocalEvents(): LocalEvent[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}
function saveLocalEvents(events: LocalEvent[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(events));
}

interface AddModalProps {
  prefillDate?: string;
  prefillHour?: number;
  onClose: () => void;
  onSaved: (ev: LocalEvent) => void;
}

function AddModal({ prefillDate, prefillHour, onClose, onSaved }: AddModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [type, setType] = useState<'task' | 'event'>('task');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(prefillDate ?? today);
  const [startTime, setStartTime] = useState(
    prefillHour !== undefined
      ? `${String(prefillHour).padStart(2, '0')}:00`
      : '09:00'
  );
  const [endTime, setEndTime] = useState(
    prefillHour !== undefined
      ? `${String(prefillHour + 1).padStart(2, '0')}:00`
      : '10:00'
  );
  const [category, setCategory] = useState('work');
  const [description, setDescription] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (startTime >= endTime) { toast.error('End time must be after start time'); return; }

    const ev: LocalEvent = {
      id: `local_${Date.now()}`,
      title: title.trim(),
      date,
      start_time: startTime,
      end_time: endTime,
      category,
      description: description.trim(),
      type,
    };
    onSaved(ev);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl shadow-black/70 animate-scale-in"
        style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[14px] font-semibold text-[#F2F2F2]">Add to schedule</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#88888E] hover:text-[#F2F2F2] transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-white/[0.08] p-0.5 gap-0.5" style={{ background: '#0D0D0F' }}>
            {(['task', 'event'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold transition-all"
                style={
                  type === t
                    ? { background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff' }
                    : { color: '#71717A' }
                }
              >
                {t === 'task' ? <ListTodo size={13} /> : <CalendarDays size={13} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">
              Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'task' ? 'e.g. Review project proposal' : 'e.g. Team standup'}
              required
              className="input-glow"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-glow"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-glow"
                style={{ cursor: 'pointer' }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ background: '#111113' }}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">Start time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-glow"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">End time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-glow"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional notes…"
              className="input-glow"
              style={{ resize: 'none', borderRadius: 10 }}
            />
          </div>

          <button type="submit" className="btn-primary w-full" style={{ borderRadius: 10, padding: '11px 20px' }}>
            <Plus size={14} />
            Add {type}
          </button>
        </form>
      </div>
    </div>
  );
}

function localEventToBlock(ev: LocalEvent): Block {
  const startDT = `${ev.date}T${ev.start_time}:00`;
  const endDT = `${ev.date}T${ev.end_time}:00`;
  return {
    id: parseInt(ev.id.replace('local_', ''), 10) || Math.random() * -1e9,
    block_type: ev.category,
    start_datetime: startDT,
    end_datetime: endDT,
    task_title: ev.title,
    task_description: ev.description,
    completed: false,
  };
}

function TimelineView({
  blocks,
  date,
  onSlotClick,
  onDeleteLocal,
  localIds,
}: {
  blocks: Block[];
  date: Date;
  onSlotClick: (hour: number) => void;
  onDeleteLocal: (id: number) => void;
  localIds: Set<number>;
}) {
  const dayBlocks = blocks.filter((b) => {
    const bd = new Date(b.start_datetime);
    return bd.getDate() === date.getDate() && bd.getMonth() === date.getMonth();
  });

  const completeBlock = async (id: number, current: boolean) => {
    if (localIds.has(id)) { toast('Local events cannot be toggled via API'); return; }
    try {
      await api.patch(`/schedule/${id}/complete`, { completed: !current });
      toast.success(!current ? 'Marked done' : 'Unmarked');
    } catch { toast.error('Update failed'); }
  };

  return (
    <div className="relative" style={{ minHeight: `${HOURS.length * 64}px` }}>
      {/* Clickable hour slots */}
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute w-full flex items-start group cursor-pointer"
          style={{ top: `${(h - 6) * 64}px`, height: 64 }}
          onClick={() => onSlotClick(h)}
        >
          <span className="text-[10px] text-[#52525B] w-14 flex-shrink-0 pt-0.5 select-none">
            {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
          </span>
          <div className="flex-1 border-t border-white/5 mt-2 relative">
            <span className="absolute right-2 top-1 text-[10px] text-[#3A3A3F] opacity-0 group-hover:opacity-100 transition-opacity select-none pointer-events-none">
              + Add
            </span>
          </div>
        </div>
      ))}

      {/* Blocks */}
      {dayBlocks.map((b) => {
        const start = new Date(b.start_datetime);
        const end = new Date(b.end_datetime);
        const startMins = (start.getHours() - 6) * 60 + start.getMinutes();
        const dur = (end.getTime() - start.getTime()) / 60000;
        const top = (startMins / 60) * 64;
        const height = Math.max((dur / 60) * 64, 32);
        const color = catColor(b.block_type);
        const skipped = !!b.skipped_at;
        const isLocal = localIds.has(b.id);

        return (
          <div
            key={b.id}
            className="absolute left-14 right-0 px-2"
            style={{ top, height, zIndex: 2 }}
          >
            <div
              className={`h-full rounded-xl p-2.5 flex flex-col justify-between border transition-opacity group/block ${
                b.completed ? 'opacity-50' : skipped ? 'opacity-30' : ''
              }`}
              style={{ borderColor: `${color}35`, background: `${color}12` }}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-[#F4F4F5] truncate leading-tight flex-1">
                    {b.task_title || b.block_type}
                  </p>
                  {isLocal && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteLocal(b.id); }}
                      className="opacity-0 group-hover/block:opacity-100 p-0.5 rounded hover:bg-[#EF4444]/20 text-[#EF4444] transition-all flex-shrink-0"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-[#71717A] flex items-center gap-1 mt-0.5">
                  <Clock size={9} />
                  {format(start, 'h:mm')}–{format(end, 'h:mm a')}
                  {isLocal && <span className="ml-1 text-[#7C3AED] font-medium">local</span>}
                </p>
              </div>
              {!isLocal && (
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={() => completeBlock(b.id, b.completed)}
                    className="p-1 rounded-md hover:bg-white/10 transition-colors"
                    title={b.completed ? 'Unmark' : 'Mark done'}
                  >
                    <CheckCircle2 size={12} className={b.completed ? 'text-[#10B981]' : 'text-[#52525B]'} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {dayBlocks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-xs text-[#52525B]">No blocks — click a time slot to add</p>
        </div>
      )}
    </div>
  );
}

export default function SchedulePage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>(loadLocalEvents);
  const [loading, setLoading] = useState(true);
  const [weekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [activeDay, setActiveDay] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [prefillHour, setPrefillHour] = useState<number | undefined>();

  const localIds = new Set(
    localEvents.map((ev) => parseInt(ev.id.replace('local_', ''), 10))
  );

  const allBlocks = [
    ...blocks,
    ...localEvents.map(localEventToBlock),
  ];

  const fetchWeek = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/schedule/week');
      setBlocks(Array.isArray(data) ? data : data.blocks ?? []);
    } catch { toast.error('Could not load schedule'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWeek(); }, [fetchWeek]);

  const handleSaveLocal = (ev: LocalEvent) => {
    const updated = [...localEvents, ev];
    setLocalEvents(updated);
    saveLocalEvents(updated);
    toast.success(`${ev.type === 'task' ? 'Task' : 'Event'} added`);
  };

  const handleDeleteLocal = (blockId: number) => {
    const evId = `local_${blockId}`;
    const updated = localEvents.filter((e) => e.id !== evId);
    setLocalEvents(updated);
    saveLocalEvents(updated);
    toast.success('Removed');
  };

  const handleSlotClick = (hour: number) => {
    setPrefillHour(hour);
    setShowModal(true);
  };

  const openModal = () => {
    setPrefillHour(undefined);
    setShowModal(true);
  };

  const generateSchedule = async () => {
    const id = toast.loading('Generating schedule…');
    try {
      await api.post('/schedule/generate-week');
      await fetchWeek();
      toast.success('Done!', { id });
    } catch { toast.error('Failed', { id }); }
  };

  const clearSchedule = async () => {
    if (!confirm('Clear all scheduled blocks?')) return;
    const id = toast.loading('Clearing…');
    try {
      await api.delete('/schedule/clear');
      await fetchWeek();
      toast.success('Cleared', { id });
    } catch { toast.error('Failed', { id }); }
  };

  const dayBlockCount = (d: Date) =>
    allBlocks.filter((b) => {
      const bd = new Date(b.start_datetime);
      return bd.getDate() === d.getDate() && bd.getMonth() === d.getMonth();
    }).length;

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0 sticky top-0 z-10"
        style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <div>
          <h1 className="text-[18px] font-bold text-[#F2F2F2] tracking-tight">Schedule</h1>
          <p className="text-[12px] text-[#88888E] mt-0.5">
            Week of {format(weekStart, 'MMM d')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchWeek} className="p-2 rounded-lg hover:bg-white/5 text-[#71717A] hover:text-[#F4F4F5] transition-colors" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F4F4F5] bg-white/[0.07] hover:bg-white/[0.12] transition-colors border border-white/[0.08]"
          >
            <Plus size={13} /> Add
          </button>
          <button onClick={generateSchedule} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#7C3AED] bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 transition-colors">
            <Sparkles size={13} /> Generate
          </button>
          <button onClick={clearSchedule} className="p-2 rounded-lg hover:bg-[#EF4444]/10 text-[#71717A] hover:text-[#EF4444] transition-colors" title="Clear schedule">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex border-b border-white/8 flex-shrink-0 overflow-x-auto">
        {weekDays.map((d) => {
          const isActive = d.toDateString() === activeDay.toDateString();
          const count = dayBlockCount(d);
          return (
            <button
              key={d.toISOString()}
              onClick={() => setActiveDay(d)}
              className={`flex flex-col items-center px-4 py-3 min-w-[80px] flex-shrink-0 transition-colors border-b-2 ${
                isActive ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-[#71717A] hover:text-[#F4F4F5]'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide">{format(d, 'EEE')}</span>
              <span className="text-base font-bold mt-0.5">{format(d, 'd')}</span>
              {count > 0 && (
                <span className={`mt-1 text-[9px] font-bold px-1.5 rounded-full ${isActive ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'bg-white/8 text-[#71717A]'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <TimelineView
            blocks={allBlocks}
            date={activeDay}
            onSlotClick={handleSlotClick}
            onDeleteLocal={handleDeleteLocal}
            localIds={localIds}
          />
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openModal}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-[#7C3AED]/40 transition-transform hover:scale-110 active:scale-95 z-20"
        style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}
        title="Add task or event"
      >
        <Plus size={20} className="text-white" />
      </button>

      {showModal && (
        <AddModal
          prefillDate={format(activeDay, 'yyyy-MM-dd')}
          prefillHour={prefillHour}
          onClose={() => { setShowModal(false); setPrefillHour(undefined); }}
          onSaved={handleSaveLocal}
        />
      )}
    </div>
  );
}
