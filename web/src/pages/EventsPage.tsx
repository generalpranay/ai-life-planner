import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Calendar, Clock, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../lib/api';

interface Event {
  id: number; title: string; description?: string;
  start_datetime: string; end_datetime?: string; location?: string;
}

function EventSkeleton() {
  return (
    <div className="bg-[#111113] border border-white/[0.06] rounded-xl px-4 py-3.5 flex items-center gap-4">
      <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-44 rounded-md" />
        <div className="skeleton h-3 w-32 rounded-md" />
      </div>
      <div className="flex gap-1">
        <div className="skeleton w-7 h-7 rounded-lg" />
        <div className="skeleton w-7 h-7 rounded-lg" />
      </div>
    </div>
  );
}

function EventModal({ event, onClose, onSaved }: { event?: Event; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [startDt, setStartDt] = useState(
    event?.start_datetime ? format(new Date(event.start_datetime), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [endDt, setEndDt] = useState(
    event?.end_datetime ? format(new Date(event.end_datetime), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [location, setLocation] = useState(event?.location ?? '');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      title, description: description || undefined,
      start_datetime: startDt, end_datetime: endDt || undefined,
      location: location || undefined,
    };
    try {
      if (event) { await api.put(`/events/${event.id}`, payload); toast.success('Event updated'); }
      else { await api.post('/events', payload); toast.success('Event created'); }
      onSaved(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setLoading(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md gradient-border bg-[#111113] rounded-2xl shadow-2xl shadow-black/70 animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[14px] font-semibold text-[#F2F2F2]">{event ? 'Edit event' : 'New event'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#88888E] hover:text-[#F2F2F2] transition-colors">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Event title" className="input-glow" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">Start *</label>
              <input type="datetime-local" value={startDt} onChange={e => setStartDt(e.target.value)} required className="input-glow" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">End</label>
              <input type="datetime-local" value={endDt} onChange={e => setEndDt(e.target.value)} className="input-glow" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Optional location" className="input-glow" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Optional description" className="input-glow" style={{ resize: 'none', borderRadius: 10 }} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full" style={{ borderRadius: 10, padding: '11px 20px' }}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {event ? 'Save changes' : 'Create event'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | undefined>();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/events');
      setEvents(Array.isArray(data) ? data : data.events ?? []);
    } catch { toast.error('Could not load events'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  const deleteEvent = async (id: number) => {
    if (!confirm('Delete this event?')) return;
    try { await api.delete(`/events/${id}`); toast.success('Event deleted'); fetchEvents(); }
    catch { toast.error('Delete failed'); }
  };

  const sorted = [...events].sort(
    (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
  );

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0 sticky top-0 z-10"
        style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <div>
          <h1 className="text-[18px] font-bold text-[#F2F2F2] tracking-tight">Events</h1>
          <p className="text-[12px] text-[#88888E] mt-0.5">{events.length} upcoming</p>
        </div>
        <button
          onClick={() => { setEditEvent(undefined); setShowModal(true); }}
          className="btn-primary"
          style={{ borderRadius: 10, padding: '9px 16px', fontSize: 13 }}
        >
          <Plus size={14} /> New event
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="space-y-2 max-w-2xl">
            {[...Array(4)].map((_, i) => <EventSkeleton key={i} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-center animate-fade-in">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}
            >
              <Calendar size={22} className="text-[#3B82F6]/60" />
            </div>
            <p className="text-[14px] font-semibold text-[#D4D4D8] mb-1">No events yet</p>
            <p className="text-[12.5px] text-[#88888E] mb-4">Add meetings, reminders, and deadlines</p>
            <button
              onClick={() => { setEditEvent(undefined); setShowModal(true); }}
              className="btn-primary"
              style={{ borderRadius: 10, padding: '9px 18px', fontSize: 13 }}
            >
              <Plus size={13} /> Add event
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl stagger">
            {sorted.map(ev => (
              <div
                key={ev.id}
                className="card-hover group bg-[#111113] border border-white/[0.06] rounded-xl px-4 py-3.5 flex items-center gap-4"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.18)' }}
                >
                  <Calendar size={16} className="text-[#3B82F6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-[#F2F2F2] truncate">{ev.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Clock size={11} className="text-[#88888E]" />
                    <span className="text-[12px] text-[#88888E]">
                      {format(new Date(ev.start_datetime), 'MMM d, h:mm a')}
                      {ev.end_datetime && ` – ${format(new Date(ev.end_datetime), 'h:mm a')}`}
                    </span>
                    {ev.location && (
                      <>
                        <span className="text-[#52525B]">·</span>
                        <MapPin size={10} className="text-[#88888E]" />
                        <span className="text-[12px] text-[#88888E] truncate max-w-[120px]">{ev.location}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditEvent(ev); setShowModal(true); }}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#88888E] hover:text-[#D4D4D8] transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => deleteEvent(ev.id)}
                    className="p-1.5 rounded-lg hover:bg-[#EF4444]/[0.10] text-[#88888E] hover:text-[#EF4444] transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <EventModal event={editEvent} onClose={() => setShowModal(false)} onSaved={fetchEvents} />
      )}
    </div>
  );
}
