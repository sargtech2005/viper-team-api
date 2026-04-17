import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';

export default function Login() {
  const [, nav] = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      nav('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail);
      toast.success('Reset link sent! Check your inbox.');
      setForgotMode(false);
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-viper-dark grid-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8 group">
          <div className="w-9 h-9 rounded-xl bg-viper-green/10 border border-viper-green/30 flex items-center justify-center">
            <Zap size={18} className="text-viper-green" />
          </div>
          <span className="font-mono font-bold text-white text-xl">Viper<span className="text-viper-green">.</span>API</span>
        </Link>

        <div className="bg-viper-surface border border-viper-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">{forgotMode ? 'Reset Password' : 'Welcome back'}</h1>
          <p className="text-slate-400 text-sm mb-7">{forgotMode ? 'Enter your email to receive a reset link.' : 'Log in to your Viper API account.'}</p>

          {forgotMode ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-mono">Email</label>
                <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} type="email" required
                  className="w-full bg-viper-dark border border-viper-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-viper-green/60 transition-colors"
                  placeholder="you@example.com" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-viper-green text-black font-bold py-3 rounded-xl hover:bg-green-400 transition-colors disabled:opacity-60">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button type="button" onClick={() => setForgotMode(false)} className="w-full text-slate-400 text-sm hover:text-white transition-colors">← Back to login</button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
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
                    type={showPwd ? 'text' : 'password'} required
                    className="w-full bg-viper-dark border border-viper-border rounded-xl px-4 py-3 pr-11 text-white text-sm focus:outline-none focus:border-viper-green/60 transition-colors"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-slate-500 hover:text-viper-green transition-colors">Forgot password?</button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-viper-green text-black font-bold py-3 rounded-xl hover:bg-green-400 transition-colors disabled:opacity-60">
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>
          )}

          {!forgotMode && (
            <p className="text-center text-slate-500 text-sm mt-6">
              Don't have an account?{' '}
              <Link href="/register" className="text-viper-green hover:underline font-medium">Sign up free</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
