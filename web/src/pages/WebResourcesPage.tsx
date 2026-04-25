import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2, X, Loader2, Globe, ExternalLink, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface WebResource { id: number; name: string; url: string; description?: string; category?: string; }

function ResourceSkeleton() {
  return (
    <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="skeleton w-9 h-9 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-40 rounded-md" />
          <div className="skeleton h-3 w-28 rounded-md" />
          <div className="skeleton h-3 w-48 rounded-md" />
        </div>
      </div>
      <div className="skeleton h-8 w-full rounded-lg mt-4" />
    </div>
  );
}

function ResourceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/web-resources', { name: title, url, description: description || undefined, category: category || undefined });
      toast.success('Resource saved');
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
          <h2 className="text-[14px] font-semibold text-[#F2F2F2]">Add resource</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#88888E] hover:text-[#F2F2F2] transition-colors">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Resource title" className="input-glow" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">URL *</label>
            <input value={url} onChange={e => setUrl(e.target.value)} required type="url" placeholder="https://..." className="input-glow" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. study, work, research" className="input-glow" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="What is this resource for?" className="input-glow" style={{ resize: 'none', borderRadius: 10 }} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full" style={{ borderRadius: 10, padding: '11px 20px' }}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            Save resource
          </button>
        </form>
      </div>
    </div>
  );
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

export default function WebResourcesPage() {
  const [resources, setResources] = useState<WebResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchResources = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/web-resources');
      setResources(Array.isArray(data) ? data : data.resources ?? []);
    } catch { toast.error('Could not load resources'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResources(); }, []);

  const deleteResource = async (id: number) => {
    if (!confirm('Delete this resource?')) return;
    try { await api.delete(`/web-resources/${id}`); toast.success('Resource deleted'); fetchResources(); }
    catch { toast.error('Delete failed'); }
  };

  const cats = ['all', ...Array.from(new Set(resources.map(r => r.category).filter(Boolean) as string[]))];
  const filtered = filter === 'all' ? resources : resources.filter(r => r.category === filter);

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0 sticky top-0 z-10"
        style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <div>
          <h1 className="text-[18px] font-bold text-[#F2F2F2] tracking-tight">Web Resources</h1>
          <p className="text-[12px] text-[#88888E] mt-0.5">{resources.length} saved</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ borderRadius: 10, padding: '9px 16px', fontSize: 13 }}>
          <Plus size={14} /> Add resource
        </button>
      </div>

      {cats.length > 1 && (
        <div className="flex gap-2 px-6 py-3 overflow-x-auto flex-shrink-0 border-b border-white/[0.06] [scrollbar-width:none]">
          {cats.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium flex-shrink-0 transition-all duration-150"
              style={
                filter === c
                  ? { background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff' }
                  : { background: '#111113', border: '1px solid rgba(255,255,255,0.06)', color: '#88888E' }
              }
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
            {[...Array(4)].map((_, i) => <ResourceSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-center animate-fade-in">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)' }}
            >
              <Globe size={22} className="text-[#7C3AED]/60" />
            </div>
            <p className="text-[14px] font-semibold text-[#D4D4D8] mb-1">No resources saved</p>
            <p className="text-[12.5px] text-[#88888E] mb-4">Save useful links and references</p>
            <button onClick={() => setShowModal(true)} className="btn-primary" style={{ borderRadius: 10, padding: '9px 18px', fontSize: 13 }}>
              <Plus size={13} /> Add resource
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl stagger">
            {filtered.map(r => (
              <div
                key={r.id}
                className="card-hover group bg-[#111113] border border-white/[0.06] rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.18)' }}
                  >
                    <Link2 size={14} className="text-[#7C3AED]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-[#F2F2F2] truncate">{r.name}</p>
                    <p className="text-[12px] text-[#88888E] truncate">{getDomain(r.url)}</p>
                    {r.description && (
                      <p className="text-[12px] text-[#88888E] mt-1 line-clamp-2 leading-relaxed">{r.description}</p>
                    )}
                    {r.category && (
                      <span className="inline-block mt-2 text-[9px] uppercase font-bold tracking-widest px-2 py-[3px] rounded-md"
                        style={{ background: 'rgba(124,58,237,0.10)', color: '#7C3AED' }}>
                        {r.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.05]">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium flex-1 justify-center transition-all duration-150"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#A1A1A8' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#F2F2F2'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#A1A1A8'; }}
                  >
                    <ExternalLink size={12} /> Open
                  </a>
                  <button
                    onClick={() => deleteResource(r.id)}
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

      {showModal && <ResourceModal onClose={() => setShowModal(false)} onSaved={fetchResources} />}
    </div>
  );
}
