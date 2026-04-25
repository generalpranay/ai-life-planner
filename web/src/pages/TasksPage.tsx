import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, ChevronDown, ChevronUp, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../lib/api';

interface ChecklistItem { id: number; task_id: number; text: string; done: boolean; }
interface Task {
  id: number; title: string; description?: string; category: string;
  due_datetime?: string; estimated_duration_minutes?: number; priority: number;
  todays_goal?: string; is_recurring: boolean; checklist: ChecklistItem[];
}

const CATEGORIES = ['work', 'study', 'health', 'personal', 'routine', 'break'];
const CAT_COLORS: Record<string, string> = {
  work: '#f0b429', study: '#60a5fa', health: '#4ade80',
  personal: '#c084fc', routine: '#f472b6', break: '#22d3ee',
};
const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'P1', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  2: { label: 'P2', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  3: { label: 'P3', color: '#d4a017', bg: 'rgba(212,160,23,0.12)' },
  4: { label: 'P4', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  5: { label: 'P5', color: '#6a7a6d', bg: 'rgba(106,122,109,0.10)' },
};

function TaskSkeleton() {
  return (
    <div className="rounded-xl px-4 py-3.5 flex items-center gap-3"
      style={{ background: '#0f2314', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="skeleton w-[3px] h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-52 rounded-md" />
        <div className="skeleton h-3 w-36 rounded-md" />
      </div>
      <div className="skeleton h-6 w-8 rounded-md flex-shrink-0" />
      <div className="skeleton h-7 w-7 rounded-lg flex-shrink-0" />
      <div className="skeleton h-7 w-7 rounded-lg flex-shrink-0" />
    </div>
  );
}

function TaskModal({ task, onClose, onSaved }: { task?: Task; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [category, setCategory] = useState(task?.category ?? 'study');
  const [priority, setPriority] = useState(task?.priority ?? 3);
  const [dueDate, setDueDate] = useState(
    task?.due_datetime ? format(new Date(task.due_datetime), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(task?.estimated_duration_minutes?.toString() ?? '');
  const [todaysGoal, setTodaysGoal] = useState(task?.todays_goal ?? '');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { title, description: description || undefined, category, priority,
      todays_goal: todaysGoal || undefined, due_datetime: dueDate || undefined,
      estimated_duration_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined };
    try {
      if (task) { await api.put(`/tasks/${task.id}`, payload); toast.success('Task updated'); }
      else { await api.post('/tasks', payload); toast.success('Task created'); }
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl shadow-black/70 animate-scale-in"
        style={{ background: '#0f2314', border: '1px solid rgba(212,160,23,0.15)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(212,160,23,0.08)' }}>
          <h2 className="text-[14px] font-semibold text-[#e8e8e0]">{task ? 'Edit task' : 'New task'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#4a5e4e] hover:text-[#e8e8e0] transition-colors"
            onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
            <X size={15} />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Task title" className="input-glow" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="input-glow cursor-pointer">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Priority (1–5)</label>
              <input type="number" min={1} max={5} value={priority} onChange={e => setPriority(parseInt(e.target.value))} className="input-glow" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Today's goal</label>
            <input value={todaysGoal} onChange={e => setTodaysGoal(e.target.value)} placeholder="What to accomplish today" className="input-glow" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Optional description" className="input-glow" style={{ resize: 'none', borderRadius: 10 }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Due date</label>
              <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input-glow" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Est. minutes</label>
              <input type="number" min={1} value={estimatedMinutes} onChange={e => setEstimatedMinutes(e.target.value)} placeholder="60" className="input-glow" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full" style={{ borderRadius: 10, padding: '11px 20px', marginTop: 4 }}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {task ? 'Save changes' : 'Create task'}
          </button>
        </form>
      </div>
    </div>
  );
}

function TaskRow({ task, onEdit, onDelete }: { task: Task; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const color = CAT_COLORS[task.category] ?? '#6a7a6d';
  const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG[5];
  const hasDetails = !!(task.description || task.todays_goal || task.checklist.length > 0);

  return (
    <div className="card-hover rounded-xl overflow-hidden group"
      style={{ background: '#0f2314', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-[3px] h-10 rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-medium text-[#e8e8e0] truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color }}>{task.category}</span>
            <span className="text-[#4a5e4e]">·</span>
            {task.estimated_duration_minutes && (
              <><span className="text-[11.5px] text-[#8a9a8d]">{task.estimated_duration_minutes}m</span><span className="text-[#4a5e4e]">·</span></>
            )}
            {task.due_datetime && (
              <span className="text-[11.5px] text-[#8a9a8d]">due {format(new Date(task.due_datetime), 'MMM d')}</span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-[3px] rounded-md flex-shrink-0" style={{ color: pc.color, background: pc.bg }}>
          {pc.label}
        </span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {hasDetails && (
            <button onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded-lg text-[#4a5e4e] hover:text-[#8a9a8d] transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button onClick={onEdit}
            className="p-1.5 rounded-lg text-[#4a5e4e] hover:text-[#d4a017] transition-colors opacity-0 group-hover:opacity-100"
            onMouseEnter={e => (e.currentTarget.style.background='rgba(212,160,23,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
            <Pencil size={13} />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg text-[#4a5e4e] hover:text-[#f87171] transition-colors opacity-0 group-hover:opacity-100"
            onMouseEnter={e => (e.currentTarget.style.background='rgba(248,113,113,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div style={{ maxHeight: expanded ? 400 : 0, opacity: expanded ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.22s ease, opacity 0.18s ease' }}>
        <div className="px-5 pb-4 pt-3 border-t space-y-2.5" style={{ borderColor: 'rgba(212,160,23,0.06)' }}>
          {task.description && <p className="text-[12.5px] text-[#8a9a8d] leading-relaxed">{task.description}</p>}
          {task.todays_goal && (
            <div className="flex items-start gap-2">
              <span className="text-[11px] font-bold text-[#d4a017] uppercase tracking-wide flex-shrink-0 mt-[1px]">Goal</span>
              <p className="text-[12.5px] text-[#c8b870]">{task.todays_goal}</p>
            </div>
          )}
          {task.checklist.length > 0 && (
            <div className="space-y-1.5">
              {task.checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center flex-shrink-0"
                    style={{ background: item.done ? '#d4a017' : 'transparent', borderColor: item.done ? '#d4a017' : 'rgba(255,255,255,0.15)' }}>
                    {item.done && <svg viewBox="0 0 10 8" className="w-2 h-2"><path d="M1 4l3 3 5-5" stroke="#0a1a0f" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <span className={`text-[12px] ${item.done ? 'line-through text-[#4a5e4e]' : 'text-[#8a9a8d]'}`}>{item.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | undefined>();
  const [filter, setFilter] = useState('all');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks');
      setTasks(Array.isArray(data) ? data : data.tasks ?? []);
    } catch { toast.error('Could not load tasks'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const deleteTask = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    try { await api.delete(`/tasks/${id}`); toast.success('Task deleted'); fetchTasks(); }
    catch { toast.error('Delete failed'); }
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.category === filter);
  const cats = ['all', ...Array.from(new Set(tasks.map(t => t.category)))];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0 sticky top-0 z-10"
        style={{ background: 'rgba(10,26,15,0.90)', backdropFilter: 'blur(14px)', borderColor: 'rgba(212,160,23,0.08)' }}>
        <div>
          <h1 className="text-[18px] font-bold text-[#e8e8e0] tracking-tight">Tasks</h1>
          <p className="text-[12px] text-[#8a9a8d] mt-0.5">{tasks.length} total</p>
        </div>
        <button onClick={() => { setEditTask(undefined); setShowModal(true); }} className="btn-primary"
          style={{ borderRadius: 10, padding: '9px 16px', fontSize: 13 }}>
          <Plus size={14} /> New task
        </button>
      </div>

      <div className="flex gap-2 px-6 py-3 overflow-x-auto flex-shrink-0 border-b [scrollbar-width:none]"
        style={{ borderColor: 'rgba(212,160,23,0.06)' }}>
        {cats.map(c => {
          const color = CAT_COLORS[c];
          const isActive = filter === c;
          return (
            <button key={c} onClick={() => setFilter(c)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium flex-shrink-0 transition-all duration-150"
              style={isActive
                ? c === 'all'
                  ? { background: 'linear-gradient(135deg,#d4a017,#b8860b)', color: '#0a1a0f' }
                  : { background: `${color}18`, color, border: `1px solid ${color}30` }
                : { background: '#0f2314', border: '1px solid rgba(255,255,255,0.06)', color: '#6a7a6d' }
              }
              onMouseEnter={e => !isActive && (e.currentTarget.style.color='#c8d4c0', e.currentTarget.style.borderColor='rgba(212,160,23,0.20)')}
              onMouseLeave={e => !isActive && (e.currentTarget.style.color='#6a7a6d', e.currentTarget.style.borderColor='rgba(255,255,255,0.06)')}>
              {c.charAt(0).toUpperCase()+c.slice(1)}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="space-y-2 max-w-2xl">{[...Array(5)].map((_, i) => <TaskSkeleton key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.18)' }}>
              <CheckSquare size={22} className="text-[#d4a017]/60" />
            </div>
            <p className="text-[14px] font-semibold text-[#c8d4c0] mb-1">No tasks found</p>
            <p className="text-[12.5px] text-[#8a9a8d] mb-4">
              {filter === 'all' ? 'Add your first task to get started' : `No ${filter} tasks yet`}
            </p>
            <button onClick={() => { setEditTask(undefined); setShowModal(true); }} className="btn-primary"
              style={{ borderRadius: 10, padding: '9px 18px', fontSize: 13 }}>
              <Plus size={13} /> Add task
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl stagger">
            {filtered.map(t => (
              <TaskRow key={t.id} task={t} onEdit={() => { setEditTask(t); setShowModal(true); }} onDelete={() => deleteTask(t.id)} />
            ))}
          </div>
        )}
      </div>

      {showModal && <TaskModal task={editTask} onClose={() => setShowModal(false)} onSaved={fetchTasks} />}
    </div>
  );
}
