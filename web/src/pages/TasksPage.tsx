import { useEffect, useState, useRef, type FormEvent } from 'react';
import {
  Plus, Pencil, Trash2, X, Loader2, ChevronDown, ChevronUp,
  CheckSquare, Sparkles, ArrowUpDown, CalendarClock,
} from 'lucide-react';
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
const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string; desc: string }> = {
  1: { label: 'P1', color: '#f87171', bg: 'rgba(248,113,113,0.12)', desc: 'Critical' },
  2: { label: 'P2', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', desc: 'High' },
  3: { label: 'P3', color: '#d4a017', bg: 'rgba(212,160,23,0.12)', desc: 'Medium' },
  4: { label: 'P4', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', desc: 'Low' },
  5: { label: 'P5', color: '#6a7a6d', bg: 'rgba(106,122,109,0.10)', desc: 'Minimal' },
};

type SortKey = 'default' | 'priority' | 'due' | 'title';

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

function PrioritySelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">
        Priority
        <span className="ml-2 normal-case text-[#4a5e4e] font-normal">
          — {PRIORITY_CONFIG[value]?.desc}
        </span>
      </label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(p => {
          const pc = PRIORITY_CONFIG[p];
          const isSelected = value === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              title={pc.desc}
              className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all duration-150"
              style={
                isSelected
                  ? { background: pc.bg, color: pc.color, border: `1px solid ${pc.color}50`, boxShadow: `0 0 10px ${pc.color}20` }
                  : { background: 'rgba(255,255,255,0.03)', color: '#4a5e4e', border: '1px solid rgba(255,255,255,0.06)' }
              }
              onMouseEnter={e => !isSelected && (e.currentTarget.style.color = pc.color, e.currentTarget.style.borderColor = `${pc.color}30`)}
              onMouseLeave={e => !isSelected && (e.currentTarget.style.color = '#4a5e4e', e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
            >
              {pc.label}
            </button>
          );
        })}
      </div>
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
  const [checklistDraft, setChecklistDraft] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNlp, setShowNlp] = useState(false);
  const [nlpInput, setNlpInput] = useState('');
  const [parsing, setParsing] = useState(false);
  // Scheduling fields
  const [scheduleDate, setScheduleDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const addItem = () => {
    const t = newItem.trim();
    if (!t) return;
    setChecklistDraft(d => [...d, t]);
    setNewItem('');
  };

  const parseWithAI = async () => {
    if (!nlpInput.trim()) return;
    setParsing(true);
    try {
      const { data } = await api.post('/ai/parse-task', { text: nlpInput });
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.category && CATEGORIES.includes(data.category)) setCategory(data.category);
      if (data.priority && data.priority >= 1 && data.priority <= 5) setPriority(Number(data.priority));
      if (data.due_datetime) setDueDate(format(new Date(data.due_datetime), "yyyy-MM-dd'T'HH:mm"));
      if (data.estimated_duration_minutes) setEstimatedMinutes(String(data.estimated_duration_minutes));
      setShowNlp(false);
      setNlpInput('');
      toast.success('Fields filled from text');
    } catch { toast.error('AI parse failed'); }
    finally { setParsing(false); }
  };

  const scheduleForToday = () => {
    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd');
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);
    const mins = estimatedMinutes ? parseInt(estimatedMinutes) : 60;
    const endDate = new Date(nextHour.getTime() + mins * 60000);
    setScheduleDate(dateStr);
    setStartTime(format(nextHour, 'HH:mm'));
    setEndTime(format(endDate, 'HH:mm'));
    if (!dueDate) setDueDate(`${dateStr}T${format(nextHour, 'HH:mm')}`);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Build scheduling datetime: scheduleDate + startTime takes priority over dueDate for the date
    const scheduledOn = scheduleDate && startTime && endTime;
    const effectiveDue = scheduledOn
      ? `${scheduleDate}T${startTime}`
      : dueDate || undefined;

    const payload: any = {
      title, description: description || undefined, category, priority,
      todays_goal: todaysGoal || undefined,
      due_datetime: effectiveDue,
      estimated_duration_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
    };
    if (scheduledOn) {
      payload.start_time = startTime;
      payload.end_time = endTime;
    }
    if (!task && checklistDraft.length > 0) {
      payload.checklist = checklistDraft.map(text => ({ text }));
    }
    try {
      if (task) {
        await api.patch(`/tasks/${task.id}`, payload);
        for (const text of checklistDraft) {
          await api.post(`/tasks/${task.id}/checklist`, { text });
        }
        toast.success('Task updated');
      } else {
        await api.post('/tasks', payload);
        toast.success(scheduledOn ? 'Task created and scheduled!' : 'Task created');
      }
      onSaved(); onClose();
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('Time conflict — another task is already scheduled then');
      } else {
        toast.error(err.response?.data?.message || 'Save failed');
      }
    }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl shadow-black/70 animate-scale-in overflow-y-auto"
        style={{ background: '#0f2314', border: '1px solid rgba(212,160,23,0.15)', maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(212,160,23,0.08)' }}>
          <h2 className="text-[14px] font-semibold text-[#e8e8e0]">{task ? 'Edit task' : 'New task'}</h2>
          <div className="flex items-center gap-1.5">
            {!task && (
              <button type="button" onClick={() => setShowNlp(v => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{ background: showNlp ? 'rgba(212,160,23,0.18)' : 'rgba(212,160,23,0.08)', color: '#d4a017' }}
                title="Describe task in plain text and let AI fill the form">
                <Sparkles size={12} /> AI Parse
              </button>
            )}
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-[#4a5e4e] hover:text-[#e8e8e0] transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* AI parse panel */}
        {showNlp && (
          <div className="px-5 pt-4">
            <div className="p-3 rounded-xl space-y-2.5"
              style={{ background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.14)' }}>
              <p className="text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em]">Describe your task naturally</p>
              <textarea value={nlpInput} onChange={e => setNlpInput(e.target.value)} rows={2}
                placeholder='e.g. "Study math for 90 minutes tomorrow at 3pm, high priority"'
                className="input-glow text-[12.5px] w-full" style={{ resize: 'none', borderRadius: 8 }} />
              <button type="button" onClick={parseWithAI} disabled={parsing || !nlpInput.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-50 transition-all"
                style={{ background: 'rgba(212,160,23,0.15)', color: '#d4a017' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,160,23,0.24)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,160,23,0.15)')}>
                {parsing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Parse &amp; fill form
              </button>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Task title" className="input-glow" />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input-glow cursor-pointer">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

          {/* Visual priority selector */}
          <PrioritySelector value={priority} onChange={setPriority} />

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
              <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Deadline</label>
              <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input-glow" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">Est. minutes</label>
              <input type="number" min={1} value={estimatedMinutes} onChange={e => setEstimatedMinutes(e.target.value)} placeholder="60" className="input-glow" />
            </div>
          </div>

          {/* Schedule time section */}
          <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(212,160,23,0.04)', border: '1px solid rgba(212,160,23,0.10)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock size={13} className="text-[#d4a017]" />
                <span className="text-[11px] font-semibold text-[#8a9a8d] uppercase tracking-[0.12em]">Schedule on calendar</span>
              </div>
              <button type="button" onClick={scheduleForToday}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                style={{ background: 'rgba(212,160,23,0.12)', color: '#d4a017' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,160,23,0.22)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,160,23,0.12)')}>
                Today ↗
              </button>
            </div>
            <p className="text-[10.5px] text-[#4a5e4e] -mt-1">
              Set a date + time so this task appears on the dashboard schedule.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3 sm:col-span-1">
                <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.12em] mb-1">Date</label>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="input-glow text-[12.5px]" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.12em] mb-1">Start</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input-glow text-[12.5px]" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.12em] mb-1">End</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input-glow text-[12.5px]" />
              </div>
            </div>
            {scheduleDate && startTime && endTime && (
              <p className="text-[11px] text-[#4ade80] font-medium">
                ✓ Will appear on schedule for {scheduleDate} at {startTime}–{endTime}
              </p>
            )}
          </div>

          {/* Checklist builder */}
          <div>
            <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">
              Checklist
              {task && task.checklist.length > 0 && (
                <span className="ml-1.5 normal-case font-normal text-[#4a5e4e]">
                  ({task.checklist.filter(i => i.done).length}/{task.checklist.length} done — toggle in task view)
                </span>
              )}
            </label>
            {checklistDraft.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {checklistDraft.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-3 h-3 rounded-[3px] border flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
                    <span className="text-[12.5px] text-[#c8d4c0] flex-1 min-w-0 truncate">{item}</span>
                    <button type="button" onClick={() => setChecklistDraft(d => d.filter((_, i) => i !== idx))}
                      className="p-0.5 text-[#4a5e4e] hover:text-[#f87171] transition-colors flex-shrink-0">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add checklist item…"
                className="input-glow flex-1 text-[12.5px]"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
              <button type="button" onClick={addItem}
                className="px-3 py-2 rounded-lg text-[12px] font-semibold flex-shrink-0 transition-all"
                style={{ background: 'rgba(212,160,23,0.10)', color: '#d4a017' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,160,23,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,160,23,0.10)')}>
                <Plus size={13} />
              </button>
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

function TaskRow({
  task, onEdit, onDelete, onRefresh,
}: {
  task: Task; onEdit: () => void; onDelete: () => void; onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const color = CAT_COLORS[task.category] ?? '#6a7a6d';
  const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG[5];
  const hasDetails = !!(task.description || task.todays_goal || task.checklist.length > 0);
  const doneCount = task.checklist.filter(i => i.done).length;

  const toggleItem = async (item: ChecklistItem) => {
    setToggling(item.id);
    try {
      await api.patch(`/tasks/checklist/${item.id}`, { done: !item.done });
      onRefresh();
    } catch { toast.error('Could not update checklist item'); }
    finally { setToggling(null); }
  };

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
            {task.checklist.length > 0 && (
              <><span className="text-[#4a5e4e]">·</span>
                <span className="text-[11px] text-[#4a5e4e]">{doneCount}/{task.checklist.length} done</span></>
            )}
          </div>
        </div>

        {/* Priority badge */}
        <span className="text-[10px] font-bold px-2 py-[3px] rounded-md flex-shrink-0 cursor-default"
          style={{ color: pc.color, background: pc.bg }} title={pc.desc}>
          {pc.label}
        </span>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {hasDetails && (
            <button onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded-lg text-[#4a5e4e] hover:text-[#8a9a8d] transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button onClick={onEdit}
            className="p-1.5 rounded-lg text-[#4a5e4e] hover:text-[#d4a017] transition-colors opacity-0 group-hover:opacity-100"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,160,23,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Pencil size={13} />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg text-[#4a5e4e] hover:text-[#f87171] transition-colors opacity-0 group-hover:opacity-100"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <div style={{ maxHeight: expanded ? 500 : 0, opacity: expanded ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.22s ease, opacity 0.18s ease' }}>
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
              {doneCount > 0 && doneCount === task.checklist.length && (
                <p className="text-[11px] text-[#4ade80] font-semibold">All items complete!</p>
              )}
              {task.checklist.map(item => (
                <button key={item.id} onClick={() => toggleItem(item)} disabled={toggling === item.id}
                  className="flex items-center gap-2 w-full text-left group/item transition-opacity disabled:opacity-40">
                  <div className="w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all duration-150"
                    style={{ background: item.done ? '#d4a017' : 'transparent', borderColor: item.done ? '#d4a017' : 'rgba(255,255,255,0.18)' }}>
                    {item.done && (
                      <svg viewBox="0 0 10 8" className="w-2 h-2">
                        <path d="M1 4l3 3 5-5" stroke="#0a1a0f" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-[12px] transition-colors ${item.done ? 'line-through text-[#4a5e4e]' : 'text-[#8a9a8d] group-hover/item:text-[#c8d4c0]'}`}>
                    {item.text}
                  </span>
                  {toggling === item.id && <Loader2 size={10} className="animate-spin text-[#4a5e4e] flex-shrink-0" />}
                </button>
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
  const [catFilter, setCatFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [showSort, setShowSort] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks');
      setTasks(Array.isArray(data) ? data : data.tasks ?? []);
    } catch { toast.error('Could not load tasks'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  // close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const deleteTask = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    try { await api.delete(`/tasks/${id}`); toast.success('Task deleted'); fetchTasks(); }
    catch { toast.error('Delete failed'); }
  };

  // Filter
  let filtered = tasks;
  if (catFilter !== 'all') filtered = filtered.filter(t => t.category === catFilter);
  if (priorityFilter > 0) filtered = filtered.filter(t => t.priority === priorityFilter);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'priority') return a.priority - b.priority;
    if (sortKey === 'due') {
      if (!a.due_datetime && !b.due_datetime) return 0;
      if (!a.due_datetime) return 1;
      if (!b.due_datetime) return -1;
      return new Date(a.due_datetime).getTime() - new Date(b.due_datetime).getTime();
    }
    if (sortKey === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  const cats = ['all', ...Array.from(new Set(tasks.map(t => t.category)))];

  const SORT_LABELS: Record<SortKey, string> = {
    default: 'Default',
    priority: 'Priority',
    due: 'Due date',
    title: 'Title A–Z',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0 sticky top-0 z-10"
        style={{ background: 'rgba(10,26,15,0.90)', backdropFilter: 'blur(14px)', borderColor: 'rgba(212,160,23,0.08)' }}>
        <div>
          <h1 className="text-[18px] font-bold text-[#e8e8e0] tracking-tight">Tasks</h1>
          <p className="text-[12px] text-[#8a9a8d] mt-0.5">{tasks.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <div ref={sortRef} className="relative">
            <button onClick={() => setShowSort(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                background: showSort ? 'rgba(212,160,23,0.12)' : 'rgba(255,255,255,0.04)',
                color: showSort ? '#d4a017' : '#6a7a6d',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
              <ArrowUpDown size={13} />
              <span className="hidden sm:inline">{SORT_LABELS[sortKey]}</span>
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1 rounded-xl shadow-2xl z-20 overflow-hidden min-w-[160px]"
                style={{ background: '#0f2314', border: '1px solid rgba(212,160,23,0.14)' }}>
                {(Object.keys(SORT_LABELS) as SortKey[]).map(sk => (
                  <button key={sk} onClick={() => { setSortKey(sk); setShowSort(false); }}
                    className="w-full text-left px-4 py-2.5 text-[12.5px] transition-colors"
                    style={sortKey === sk
                      ? { color: '#d4a017', background: 'rgba(212,160,23,0.08)' }
                      : { color: '#8a9a8d', background: 'transparent' }
                    }
                    onMouseEnter={e => sortKey !== sk && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => sortKey !== sk && (e.currentTarget.style.background = 'transparent')}>
                    {SORT_LABELS[sk]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => { setEditTask(undefined); setShowModal(true); }} className="btn-primary"
            style={{ borderRadius: 10, padding: '9px 16px', fontSize: 13 }}>
            <Plus size={14} /> New task
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 px-6 py-2.5 overflow-x-auto flex-shrink-0 [scrollbar-width:none]"
        style={{ borderBottom: '1px solid rgba(212,160,23,0.06)' }}>
        {cats.map(c => {
          const color = CAT_COLORS[c];
          const isActive = catFilter === c;
          return (
            <button key={c} onClick={() => setCatFilter(c)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium flex-shrink-0 transition-all duration-150"
              style={isActive
                ? c === 'all'
                  ? { background: 'linear-gradient(135deg,#d4a017,#b8860b)', color: '#0a1a0f' }
                  : { background: `${color}18`, color, border: `1px solid ${color}30` }
                : { background: '#0f2314', border: '1px solid rgba(255,255,255,0.06)', color: '#6a7a6d' }
              }
              onMouseEnter={e => !isActive && (e.currentTarget.style.color = '#c8d4c0', e.currentTarget.style.borderColor = 'rgba(212,160,23,0.20)')}
              onMouseLeave={e => !isActive && (e.currentTarget.style.color = '#6a7a6d', e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Priority filter */}
      <div className="flex items-center gap-2 px-6 py-2 overflow-x-auto flex-shrink-0 [scrollbar-width:none]"
        style={{ borderBottom: '1px solid rgba(212,160,23,0.06)' }}>
        <span className="text-[10px] font-semibold text-[#4a5e4e] uppercase tracking-wider flex-shrink-0">Priority:</span>
        <button onClick={() => setPriorityFilter(0)}
          className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium flex-shrink-0 transition-all duration-150"
          style={priorityFilter === 0
            ? { background: 'rgba(255,255,255,0.08)', color: '#e8e8e0', border: '1px solid rgba(255,255,255,0.14)' }
            : { background: 'transparent', color: '#4a5e4e', border: '1px solid rgba(255,255,255,0.05)' }
          }>
          All
        </button>
        {[1, 2, 3, 4, 5].map(p => {
          const pc = PRIORITY_CONFIG[p];
          const isActive = priorityFilter === p;
          return (
            <button key={p} onClick={() => setPriorityFilter(isActive ? 0 : p)}
              className="px-2.5 py-1 rounded-lg text-[11.5px] font-bold flex-shrink-0 transition-all duration-150"
              style={isActive
                ? { background: pc.bg, color: pc.color, border: `1px solid ${pc.color}40` }
                : { background: 'transparent', color: '#4a5e4e', border: '1px solid rgba(255,255,255,0.05)' }
              }
              title={pc.desc}
              onMouseEnter={e => !isActive && (e.currentTarget.style.color = pc.color, e.currentTarget.style.borderColor = `${pc.color}30`)}
              onMouseLeave={e => !isActive && (e.currentTarget.style.color = '#4a5e4e', e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}>
              {pc.label}
            </button>
          );
        })}
        {(catFilter !== 'all' || priorityFilter > 0) && (
          <button onClick={() => { setCatFilter('all'); setPriorityFilter(0); }}
            className="ml-auto flex-shrink-0 text-[11px] text-[#4a5e4e] hover:text-[#f87171] transition-colors px-2 py-1 rounded-lg"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            Clear filters
          </button>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="space-y-2 max-w-2xl">{[...Array(5)].map((_, i) => <TaskSkeleton key={i} />)}</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.18)' }}>
              <CheckSquare size={22} className="text-[#d4a017]/60" />
            </div>
            <p className="text-[14px] font-semibold text-[#c8d4c0] mb-1">No tasks found</p>
            <p className="text-[12.5px] text-[#8a9a8d] mb-4">
              {catFilter === 'all' && priorityFilter === 0 ? 'Add your first task to get started' : 'No tasks match this filter'}
            </p>
            <button onClick={() => { setEditTask(undefined); setShowModal(true); }} className="btn-primary"
              style={{ borderRadius: 10, padding: '9px 18px', fontSize: 13 }}>
              <Plus size={13} /> Add task
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl stagger">
            {sorted.map(t => (
              <TaskRow key={t.id} task={t}
                onEdit={() => { setEditTask(t); setShowModal(true); }}
                onDelete={() => deleteTask(t.id)}
                onRefresh={fetchTasks}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal task={editTask} onClose={() => setShowModal(false)} onSaved={fetchTasks} />
      )}
    </div>
  );
}
