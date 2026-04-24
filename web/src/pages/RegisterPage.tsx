import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Brain } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center mb-4 shadow-lg shadow-[#7C3AED]/30">
            <Brain size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#F4F4F5] tracking-tight">Get started</h1>
          <p className="text-sm text-[#71717A] mt-1">Create your account</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl bg-[#18181B] border border-white/8 text-[#F4F4F5] text-sm placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl bg-[#18181B] border border-white/8 text-[#F4F4F5] text-sm placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-[#18181B] border border-white/8 text-[#F4F4F5] text-sm placeholder:text-[#52525B] focus:border-[#7C3AED] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl gradient-accent text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Create account
          </button>
        </form>

        <p className="text-center text-sm text-[#71717A] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[#7C3AED] hover:text-[#6D28D9] font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
