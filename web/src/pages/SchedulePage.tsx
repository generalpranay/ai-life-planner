import { useEffect, useState, useCallback } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { Sparkles, Trash2, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface Block {
  id: number; block_type: string; start_datetime: string; end_datetime: string;
  task_id?: number; task_title?: string; task_description?: string;
  todays_goal?: string; completed: boolean; skipped_at?: string;
}

const CAT_COLORS: Record<string, string> = {
  work: '#F59E0B', study: '#3B82F6', health: '#10B981', exercise: '#10B981',
  personal: '#8B5CF6', break: '#06B6D4', routine: '#EC4899', default: '#71717A',
};
const catColor = (t: string) => CAT_COLORS[t.toLowerCase()] ?? CAT_COLORS.default;

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am–11pm

function TimelineView({ blocks, date }: { blocks: Block[]; date: Date }) {
  const dayBlocks = blocks.filter((b) => {
    const bd = new Date(b.start_datetime);
    return bd.getDate() === date.getDate() && bd.getMonth() === date.getMonth();
  });

  const completeBlock = async (id: number, current: boolean) => {
    try {
      await api.patch(`/schedule/${id}/complete`, { completed: !current });
      toast.success(!current ? 'Marked done' : 'Unmarked');
    } catch { toast.error('Update failed'); }
  };

  return (
    <div className="relative" style={{ minHeight: `${HOURS.length * 64}px` }}>
      {/* Hour gridlines */}
      {HOURS.map((h) => (
        <div key={h} className="absolute w-full flex items-start" style={{ top: `${(h - 6) * 64}px`, height: 64 }}>
          <span className="text-[10px] text-[#52525B] w-14 flex-shrink-0 pt-0.5">
            {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
          </span>
          <div className="flex-1 border-t border-white/5 mt-2" />
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

        return (
          <div
            key={b.id}
            className="absolute left-14 right-0 px-2"
            style={{ top, height }}
          >
            <div
              className={`h-full rounded-xl p-2.5 flex flex-col justify-between border transition-opacity ${
                b.completed ? 'opacity-50' : skipped ? 'opacity-30' : ''
              }`}
              style={{ borderColor: `${color}30`, background: `${color}10` }}
            >
              <div>
                <p className="text-xs font-semibold text-[#F4F4F5] truncate leading-tight">
                  {b.task_title || b.block_type}
                </p>
                <p className="text-[10px] text-[#71717A] flex items-center gap-1 mt-0.5">
                  <Clock size={9} />
                  {format(start, 'h:mm')}–{format(end, 'h:mm a')}
                </p>
              </div>
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => completeBlock(b.id, b.completed)}
                  className="p-1 rounded-md hover:bg-white/10 transition-colors"
                  title={b.completed ? 'Unmark' : 'Mark done'}
                >
                  <CheckCircle2 size={12} className={b.completed ? 'text-[#10B981]' : 'text-[#52525B]'} />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {dayBlocks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-[#52525B]">No blocks</p>
        </div>
      )}
    </div>
  );
}

export default function SchedulePage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [activeDay, setActiveDay] = useState(new Date());

  const fetchWeek = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/schedule/week');
      setBlocks(Array.isArray(data) ? data : data.blocks ?? []);
    } catch { toast.error('Could not load schedule'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWeek(); }, [fetchWeek]);

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
    blocks.filter((b) => {
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
          <button onClick={fetchWeek} className="p-2 rounded-lg hover:bg-white/5 text-[#71717A] hover:text-[#F4F4F5] transition-colors">
            <RefreshCw size={15} />
          </button>
          <button onClick={generateSchedule} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#7C3AED] bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 transition-colors">
            <Sparkles size={13} /> Generate
          </button>
          <button onClick={clearSchedule} className="p-2 rounded-lg hover:bg-[#EF4444]/10 text-[#71717A] hover:text-[#EF4444] transition-colors">
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
          <TimelineView blocks={blocks} date={activeDay} />
        )}
      </div>
    </div>
  );
}
