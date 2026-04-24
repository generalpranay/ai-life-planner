import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../lib/api';

interface Event {
  id: number; title: string; description?: string;
  start_datetime: string; end_datetime?: string; location?: string;
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
      if (event) {
        await api.put(`/events/${event.id}`, payload);
        toast.success('Event updated');
      } else {
        await api.post('/events', payload);
        toast.success('Event created');
      }
      onSaved(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#18181B] border border-white/8 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-[#F4F4F5]">{event ? 'Edit event' : 'New event'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-[#71717A]"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Event title"
              className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#71717A] mb-1.5">Start *</label>
              <input type="datetime-local" value={startDt} onChange={(e) => setStartDt(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] focus:border-[#7C3AED] transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#71717A] mb-1.5">End</label>
              <input type="datetime-local" value={endDt} onChange={(e) => setEndDt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] focus:border-[#7C3AED] transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional location"
              className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Optional description"
              className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl gradient-accent text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60">
            {loading && <Loader2 size={15} className="animate-spin" />}
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
    try {
      await api.delete(`/events/${id}`);
      toast.success('Event deleted');
      fetchEvents();
    } catch { toast.error('Delete failed'); }
  };

  const sorted = [...events].sort(
    (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F5]">Events</h1>
          <p className="text-xs text-[#71717A] mt-0.5">{events.length} upcoming</p>
        </div>
        <button
          onClick={() => { setEditEvent(undefined); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold gradient-accent text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={15} /> New event
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-sm text-[#71717A]">No events yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {sorted.map((ev) => (
              <div key={ev.id} className="bg-[#18181B] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/12 border border-[#3B82F6]/20 flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="text-[#3B82F6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#F4F4F5] truncate">{ev.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock size={11} className="text-[#71717A]" />
                    <span className="text-xs text-[#71717A]">
                      {format(new Date(ev.start_datetime), 'MMM d, h:mm a')}
                      {ev.end_datetime && ` – ${format(new Date(ev.end_datetime), 'h:mm a')}`}
                    </span>
                    {ev.location && (
                      <>
                        <span className="text-[#52525B]">·</span>
                        <span className="text-xs text-[#71717A] truncate">{ev.location}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setEditEvent(ev); setShowModal(true); }}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-[#71717A] hover:text-[#F4F4F5] transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteEvent(ev.id)}
                    className="p-1.5 rounded-lg hover:bg-[#EF4444]/10 text-[#71717A] hover:text-[#EF4444] transition-colors">
                    <Trash2 size={14} />
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
