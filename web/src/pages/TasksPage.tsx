import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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
  work: '#F59E0B', study: '#3B82F6', health: '#10B981', personal: '#8B5CF6',
  routine: '#EC4899', break: '#06B6D4',
};

function TaskModal({
  task,
  onClose,
  onSaved,
}: {
  task?: Task;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [category, setCategory] = useState(task?.category ?? 'study');
  const [priority, setPriority] = useState(task?.priority ?? 3);
  const [dueDate, setDueDate] = useState(
    task?.due_datetime ? format(new Date(task.due_datetime), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    task?.estimated_duration_minutes?.toString() ?? ''
  );
  const [todaysGoal, setTodaysGoal] = useState(task?.todays_goal ?? '');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      title, description: description || undefined,
      category, priority, todays_goal: todaysGoal || undefined,
      due_datetime: dueDate || undefined,
      estimated_duration_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
    };
    try {
      if (task) {
        await api.put(`/tasks/${task.id}`, payload);
        toast.success('Task updated');
      } else {
        await api.post('/tasks', payload);
        toast.success('Task created');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#18181B] border border-white/8 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-[#F4F4F5]">
            {task ? 'Edit task' : 'New task'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-[#71717A]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Task title"
              className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#71717A] mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] focus:border-[#7C3AED] transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#71717A] mb-1.5">Priority (1–5)</label>
              <input
                type="number" min={1} max={5} value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] focus:border-[#7C3AED] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description"
              className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">Today's goal</label>
            <input
              value={todaysGoal}
              onChange={(e) => setTodaysGoal(e.target.value)}
              placeholder="What to accomplish today"
              className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#71717A] mb-1.5">Due date</label>
              <input
                type="datetime-local" value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] focus:border-[#7C3AED] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#71717A] mb-1.5">Est. minutes</label>
              <input
                type="number" min={1} value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="60"
                className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl gradient-accent text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {task ? 'Save changes' : 'Create task'}
          </button>
        </form>
      </div>
    </div>
  );
}

function TaskRow({ task, onEdit, onDelete }: { task: Task; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const color = CAT_COLORS[task.category] ?? '#71717A';

  return (
    <div className="bg-[#18181B] border border-white/8 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#F4F4F5] truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] uppercase font-semibold tracking-wide" style={{ color }}>
              {task.category}
            </span>
            <span className="text-[#52525B]">·</span>
            <span className="text-xs text-[#71717A]">P{task.priority}</span>
            {task.estimated_duration_minutes && (
              <>
                <span className="text-[#52525B]">·</span>
                <span className="text-xs text-[#71717A]">{task.estimated_duration_minutes}min</span>
              </>
            )}
            {task.due_datetime && (
              <>
                <span className="text-[#52525B]">·</span>
                <span className="text-xs text-[#71717A]">
                  due {format(new Date(task.due_datetime), 'MMM d')}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {(task.description || task.todays_goal || task.checklist.length > 0) && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-[#71717A] hover:text-[#F4F4F5] transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/5 text-[#71717A] hover:text-[#F4F4F5] transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-[#EF4444]/10 text-[#71717A] hover:text-[#EF4444] transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 border-t border-white/5 pt-3 space-y-2">
          {task.description && (
            <p className="text-xs text-[#71717A]">{task.description}</p>
          )}
          {task.todays_goal && (
            <p className="text-xs text-[#7C3AED]">Goal: {task.todays_goal}</p>
          )}
          {task.checklist.length > 0 && (
            <div className="space-y-1">
              {task.checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${item.done ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-white/20'}`}>
                    {item.done && <svg viewBox="0 0 10 8" className="w-2 h-2 fill-white"><path d="M1 4l3 3 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className={`text-xs ${item.done ? 'line-through text-[#52525B]' : 'text-[#A1A1AA]'}`}>{item.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task deleted');
      fetchTasks();
    } catch { toast.error('Delete failed'); }
  };

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.category === filter);
  const cats = ['all', ...Array.from(new Set(tasks.map((t) => t.category)))];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F5]">Tasks</h1>
          <p className="text-xs text-[#71717A] mt-0.5">{tasks.length} total</p>
        </div>
        <button
          onClick={() => { setEditTask(undefined); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold gradient-accent text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          New task
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 px-6 py-3 overflow-x-auto flex-shrink-0 border-b border-white/8">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors ${
              filter === c
                ? 'gradient-accent text-white'
                : 'bg-[#18181B] border border-white/8 text-[#71717A] hover:text-[#F4F4F5] hover:border-white/20'
            }`}
          >
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-sm text-[#71717A]">No tasks found</p>
            <button
              onClick={() => { setEditTask(undefined); setShowModal(true); }}
              className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold gradient-accent text-white hover:opacity-90"
            >
              <Plus size={13} /> Add first task
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {filtered.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onEdit={() => { setEditTask(t); setShowModal(true); }}
                onDelete={() => deleteTask(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal
          task={editTask}
          onClose={() => setShowModal(false)}
          onSaved={fetchTasks}
        />
      )}
    </div>
  );
}
