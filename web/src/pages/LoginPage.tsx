import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowRight, Mail, Lock, Fingerprint, Home } from 'lucide-react';

const ACCENTS: [number, number, number][] = [
  [212, 160, 23],
  [240, 180, 41],
  [74, 222, 128],
  [20, 110, 50],
];

function TriangleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const CELL = 90, JITTER = 28, RADIUS = 240;

    type Tri = { pts: [[number,number],[number,number],[number,number]]; cx:number; cy:number; seed:number; ai:number; };
    let tris: Tri[] = [];

    const build = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      tris = [];
      const cols = Math.ceil(canvas.width / CELL) + 1;
      const rows = Math.ceil(canvas.height / CELL) + 1;
      const grid: [number,number][][] = Array.from({length: rows+1}, (_,r) =>
        Array.from({length: cols+1}, (_,c) => [
          c*CELL + (Math.random()-0.5)*JITTER,
          r*CELL + (Math.random()-0.5)*JITTER,
        ])
      );
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const tl=grid[r][c], tr=grid[r][c+1], bl=grid[r+1][c], br=grid[r+1][c+1];
        const s1=Math.random(), s2=Math.random();
        tris.push({ pts:[tl,tr,bl], cx:(tl[0]+tr[0]+bl[0])/3, cy:(tl[1]+tr[1]+bl[1])/3, seed:s1, ai:Math.floor(s1*ACCENTS.length) });
        tris.push({ pts:[tr,br,bl], cx:(tr[0]+br[0]+bl[0])/3, cy:(tr[1]+br[1]+bl[1])/3, seed:s2, ai:Math.floor(s2*ACCENTS.length) });
      }
    };
    build();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const {x:mx,y:my} = mouse.current;
      for (const tri of tris) {
        const dx=tri.cx-mx, dy=tri.cy-my;
        const dist=Math.sqrt(dx*dx+dy*dy);
        const prox=Math.max(0,1-dist/RADIUS);
        const t=prox*prox*(3-2*prox);
        ctx.beginPath();
        ctx.moveTo(tri.pts[0][0],tri.pts[0][1]);
        ctx.lineTo(tri.pts[1][0],tri.pts[1][1]);
        ctx.lineTo(tri.pts[2][0],tri.pts[2][1]);
        ctx.closePath();
        if (t > 0.001) {
          const [r,g,b]=ACCENTS[tri.ai];
          ctx.fillStyle = `rgba(${r},${g},${b},${t*0.20*(0.7+tri.seed*0.5)})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${r},${g},${b},${t*0.25})`;
        } else {
          ctx.fillStyle = `rgba(255,255,255,${0.006+tri.seed*0.006})`;
          ctx.fill();
          ctx.strokeStyle = 'rgba(212,160,23,0.05)';
        }
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);

    const onResize = () => build();
    const onMove = (e: MouseEvent) => { mouse.current = {x:e.clientX,y:e.clientY}; };
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener('resize',onResize); window.removeEventListener('mousemove',onMove); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{zIndex:0}} />;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
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
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#091508' }}>
      <TriangleCanvas />

      {/* Version tag */}
      <div className="absolute top-4 right-5 z-20 text-[10px] text-[#4a5e4e] font-mono tracking-[0.18em] select-none">
        V 2.0
      </div>

      {/* Ambient glow */}
      <div className="absolute pointer-events-none" style={{
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,160,23,0.07) 0%, transparent 70%)',
        left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 1,
      }} />

      {/* Center layer */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4" style={{ zIndex: 10 }}>

        {/* App title above card */}
        <div className="text-center mb-6 animate-fade-slide-up">
          <h1 className="text-[13px] font-bold tracking-[0.22em] text-[#d4a017] uppercase"
            style={{ fontFamily: 'Inter, sans-serif' }}>
            AI Life Planner
          </h1>
          <p className="text-[9px] tracking-[0.20em] text-[#4a5e4e] uppercase mt-1">
            Your Intelligent Companion
          </p>
        </div>

        {/* Card */}
        <div
          className="w-full max-w-[400px] rounded-2xl p-7 animate-fade-slide-up shadow-2xl shadow-black/60"
          style={{
            background: 'rgba(15,35,20,0.88)',
            backdropFilter: 'blur(18px)',
            border: '1px solid rgba(212,160,23,0.14)',
            animationDelay: '50ms',
          }}
        >
          <div className="mb-6">
            <h2
              className="text-[22px] font-bold text-[#e8e8e0] mb-1"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Welcome Back
            </h2>
            <p className="text-[12px] text-[#4a5e4e] tracking-wide">Re-enter your sovereign path</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-[12.5px] text-[#f87171] flex items-center gap-2"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)' }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a5e4e]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="sovereign@domain.com"
                  className="input-glow"
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em]">
                  Access Key
                </label>
                <button type="button" className="text-[11px] text-[#d4a017] hover:text-[#f0b429] transition-colors">
                  Forgotten?
                </button>
              </div>
              <div className="relative">
                <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a5e4e]" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-glow"
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className="w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all"
                  style={{
                    background: remember ? '#d4a017' : 'transparent',
                    borderColor: remember ? '#d4a017' : 'rgba(255,255,255,0.15)',
                  }}
                >
                  {remember && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2.5">
                      <path d="M1 4l3 3 5-5" stroke="#0a1a0f" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-[12px] text-[#4a5e4e] group-hover:text-[#8a9a8d] transition-colors">
                Remember me on this device
              </span>
            </label>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
              style={{ borderRadius: 12, padding: '13px 20px', fontSize: 14, marginTop: 4 }}
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : <><span>Sign In</span><ArrowRight size={15} /></>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-[10px] tracking-widest text-[#4a5e4e] uppercase">or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Secondary buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn-ghost" style={{ borderRadius: 10, padding: '10px 12px', fontSize: 12 }}>
              <Home size={14} /> Google
            </button>
            <button type="button" className="btn-ghost" style={{ borderRadius: 10, padding: '10px 12px', fontSize: 12 }}>
              <Fingerprint size={14} /> Biometrics
            </button>
          </div>

          {/* Register link */}
          <p className="text-center text-[12px] text-[#4a5e4e] mt-5">
            New here?{' '}
            <Link to="/register" className="text-[#d4a017] hover:text-[#f0b429] font-semibold transition-colors">
              Begin your journey →
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-[10px] tracking-[0.18em] text-[#4a5e4e] uppercase animate-fade-in" style={{ animationDelay: '200ms' }}>
          Privacy · Terms · Contact
        </p>
      </div>
    </div>
  );
}
