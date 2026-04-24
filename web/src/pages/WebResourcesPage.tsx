import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2, X, Loader2, Globe, ExternalLink, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface WebResource { id: number; title: string; url: string; description?: string; category?: string; }

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
      await api.post('/web-resources', {
        title, url,
        description: description || undefined,
        category: category || undefined,
      });
      toast.success('Resource saved');
      onSaved(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#18181B] border border-white/8 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-[#F4F4F5]">Add resource</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-[#71717A]"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Resource title"
              className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">URL *</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} required type="url" placeholder="https://..."
              className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#71717A] mb-1.5">Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. study"
                className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What is this resource for?"
              className="w-full px-3 py-2.5 rounded-xl bg-[#27272A] border border-white/8 text-sm text-[#F4F4F5] placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl gradient-accent text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60">
            {loading && <Loader2 size={15} className="animate-spin" />}
            Add resource
          </button>
        </form>
      </div>
    </div>
  );
}

function getDomain(url: string) {
  try { return new URL(url).hostname; } catch { return url; }
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
    try {
      await api.delete(`/web-resources/${id}`);
      toast.success('Resource deleted');
      fetchResources();
    } catch { toast.error('Delete failed'); }
  };

  const cats = ['all', ...Array.from(new Set(resources.map((r) => r.category).filter(Boolean) as string[]))];
  const filtered = filter === 'all' ? resources : resources.filter((r) => r.category === filter);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[#F4F4F5]">Web Resources</h1>
          <p className="text-xs text-[#71717A] mt-0.5">{resources.length} saved</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold gradient-accent text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={15} /> Add resource
        </button>
      </div>

      {cats.length > 1 && (
        <div className="flex gap-2 px-6 py-3 overflow-x-auto flex-shrink-0 border-b border-white/8">
          {cats.map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors ${
                filter === c ? 'gradient-accent text-white' : 'bg-[#18181B] border border-white/8 text-[#71717A] hover:text-[#F4F4F5]'
              }`}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Globe size={28} className="text-[#52525B] mb-3" />
            <p className="text-sm text-[#71717A]">No resources saved</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
            {filtered.map((r) => (
              <div key={r.id} className="group bg-[#18181B] border border-white/8 rounded-xl p-4 hover:border-white/15 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center flex-shrink-0">
                    <Link2 size={15} className="text-[#7C3AED]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#F4F4F5] truncate">{r.title}</p>
                    <p className="text-xs text-[#71717A] truncate">{getDomain(r.url)}</p>
                    {r.description && (
                      <p className="text-xs text-[#71717A] mt-1 line-clamp-2">{r.description}</p>
                    )}
                    {r.category && (
                      <span className="inline-block mt-2 text-[9px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-md bg-[#7C3AED]/10 text-[#7C3AED]">
                        {r.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/10 transition-colors flex-1 justify-center"
                  >
                    <ExternalLink size={12} /> Open
                  </a>
                  <button
                    onClick={() => deleteResource(r.id)}
                    className="p-1.5 rounded-lg hover:bg-[#EF4444]/10 text-[#71717A] hover:text-[#EF4444] transition-colors"
                  >
                    <Trash2 size={14} />
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
