import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowRight, Mail, Lock, User } from 'lucide-react';

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
        const prox=Math.max(0,1-Math.sqrt(dx*dx+dy*dy)/RADIUS);
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
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#091508' }}>
      <TriangleCanvas />

      <div className="absolute top-4 right-5 z-20 text-[10px] text-[#4a5e4e] font-mono tracking-[0.18em] select-none">
        V 2.0
      </div>

      <div className="absolute pointer-events-none" style={{
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,160,23,0.07) 0%, transparent 70%)',
        left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 1,
      }} />

      <div className="absolute inset-0 flex flex-col items-center justify-center p-4" style={{ zIndex: 10 }}>

        <div className="text-center mb-6 animate-fade-slide-up">
          <h1 className="text-[13px] font-bold tracking-[0.22em] text-[#d4a017] uppercase">
            AI Life Planner
          </h1>
          <p className="text-[9px] tracking-[0.20em] text-[#4a5e4e] uppercase mt-1">
            Your Intelligent Companion
          </p>
        </div>

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
              Begin Your Journey
            </h2>
            <p className="text-[12px] text-[#4a5e4e] tracking-wide">Claim your sovereign path</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-[12.5px] text-[#f87171] flex items-center gap-2"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)' }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">
                Name
              </label>
              <div className="relative">
                <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a5e4e]" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Your name"
                  className="input-glow"
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

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

            <div>
              <label className="block text-[10px] font-semibold text-[#8a9a8d] uppercase tracking-[0.14em] mb-1.5">
                Access Key
              </label>
              <div className="relative">
                <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a5e4e]" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="input-glow"
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
              style={{ borderRadius: 12, padding: '13px 20px', fontSize: 14, marginTop: 4 }}
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : <><span>Create Account</span><ArrowRight size={15} /></>
              }
            </button>
          </form>

          <p className="text-center text-[12px] text-[#4a5e4e] mt-5">
            Already initiated?{' '}
            <Link to="/login" className="text-[#d4a017] hover:text-[#f0b429] font-semibold transition-colors">
              Sign in →
            </Link>
          </p>
        </div>

        <p className="mt-6 text-[10px] tracking-[0.18em] text-[#4a5e4e] uppercase animate-fade-in" style={{ animationDelay: '200ms' }}>
          Privacy · Terms · Contact
        </p>
      </div>
    </div>
  );
}
