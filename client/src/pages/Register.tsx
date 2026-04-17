import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Zap, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Register() {
  const [, nav] = useLocation();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refresh();
      toast.success('Account created! Welcome to Viper API 🐍');
      nav('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const perks = ['5 free API calls every month', 'Access to all API categories', 'Your own unique API key', 'No credit card required'];

  return (
    <div className="min-h-screen bg-viper-dark grid-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-viper-green/10 border border-viper-green/30 flex items-center justify-center">
            <Zap size={18} className="text-viper-green" />
          </div>
          <span className="font-mono font-bold text-white text-xl">Viper<span className="text-viper-green">.</span>API</span>
        </Link>

        <div className="bg-viper-surface border border-viper-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-slate-400 text-sm mb-5">Start automating with your free API key today.</p>

          {/* Perks */}
          <div className="grid grid-cols-2 gap-2 mb-7">
            {perks.map(p => (
              <div key={p} className="flex items-center gap-2">
                <CheckCircle size={12} className="text-viper-green shrink-0" />
                <span className="text-xs text-slate-400">{p}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-mono">Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} type="text" required
                className="w-full bg-viper-dark border border-viper-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-viper-green/60 transition-colors"
                placeholder="Your name" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-mono">Email</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" required
                className="w-full bg-viper-dark border border-viper-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-viper-green/60 transition-colors"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-mono">Password</label>
              <div className="relative">
                <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  type={showPwd ? 'text' : 'password'} required minLength={8}
                  className="w-full bg-viper-dark border border-viper-border rounded-xl px-4 py-3 pr-11 text-white text-sm focus:outline-none focus:border-viper-green/60 transition-colors"
                  placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-viper-green text-black font-bold py-3 rounded-xl hover:bg-green-400 transition-colors disabled:opacity-60 mt-2">
              {loading ? 'Creating account...' : 'Create Free Account'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-viper-green hover:underline font-medium">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
