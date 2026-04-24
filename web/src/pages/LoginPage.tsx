import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Brain, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `
          radial-gradient(ellipse 900px 550px at 50% -8%, rgba(124,58,237,0.20) 0%, transparent 75%),
          radial-gradient(ellipse 500px 400px at 88% 92%, rgba(6,182,212,0.08) 0%, transparent 70%),
          #09090B
        `,
      }}
    >
      <div className="w-full max-w-[360px] animate-fade-slide-up">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="w-[52px] h-[52px] rounded-2xl gradient-accent flex items-center justify-center animate-float-glow">
              <Brain size={22} className="text-white" />
            </div>
            <div
              className="absolute -inset-3 rounded-3xl -z-10"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)' }}
            />
          </div>
          <h1 className="text-[22px] font-bold text-[#F2F2F2] tracking-tight">Welcome back</h1>
          <p className="text-[13px] text-[#88888E] mt-1">Sign in to your AI Life Planner</p>
        </div>

        {/* Card */}
        <div className="gradient-border bg-[#111113] rounded-2xl p-6 shadow-2xl shadow-black/60">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-[#EF4444]/[0.08] border border-[#EF4444]/20 text-[13px] text-[#EF4444] animate-fade-in flex items-center gap-2">
              <span className="text-base">⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="input-glow"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#88888E] uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="input-glow"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-1"
              style={{ borderRadius: 10, padding: '11px 20px' }}
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : <><span>Sign in</span><ArrowRight size={14} /></>
              }
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-[#52525B] mt-5">
          No account?{' '}
          <Link to="/register" className="text-[#7C3AED] hover:text-[#9F66FF] font-semibold transition-colors">
            Create one free →
          </Link>
        </p>
      </div>
    </div>
  );
}
