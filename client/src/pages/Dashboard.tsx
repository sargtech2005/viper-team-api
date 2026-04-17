import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Key, BarChart2, CreditCard, User, Copy, Check, RefreshCw, Zap, TrendingUp, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { userApi, paymentApi } from '@/lib/api';
import { toast } from 'sonner';

const PLANS_INFO: Record<string, { label: string; color: string; limit: number }> = {
  free:     { label: 'Free',     color: 'text-slate-400',  limit: 5 },
  starter:  { label: 'Starter',  color: 'text-blue-400',   limit: 150 },
  basic:    { label: 'Basic',    color: 'text-purple-400',  limit: 300 },
  pro:      { label: 'Pro',      color: 'text-viper-green', limit: 500 },
  business: { label: 'Business', color: 'text-amber-400',   limit: 800 },
};

const CREDIT_PACKS = [
  { key: 'pack_100', credits: 100, price: '₦2,000', color: 'bg-cyan-600 hover:bg-cyan-500 text-white' },
  { key: 'pack_300', credits: 300, price: '₦5,500', color: 'bg-viper-green hover:bg-green-400 text-black font-bold' },
  { key: 'pack_500', credits: 500, price: '₦8,500', color: 'bg-orange-500 hover:bg-orange-400 text-black font-bold' },
];

const SUB_PLANS = [
  { key: 'starter',  label: 'Starter',  price: '₦5,000',  credits: 150, color: 'bg-blue-600 hover:bg-blue-500 text-white' },
  { key: 'basic',    label: 'Basic',    price: '₦9,000',  credits: 300, color: 'bg-purple-600 hover:bg-purple-500 text-white' },
  { key: 'pro',      label: 'Pro',      price: '₦15,000', credits: 500, color: 'bg-viper-green hover:bg-green-400 text-black font-bold' },
  { key: 'business', label: 'Business', price: '₦25,000', credits: 800, color: 'bg-amber-500 hover:bg-amber-400 text-black font-bold' },
];

type Tab = 'overview' | 'usage' | 'billing' | 'profile';

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const params = useParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>((params.tab as Tab) || 'overview');
  const [copied, setCopied] = useState(false);
  const [usage, setUsage]   = useState<any>(null);
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [name, setName] = useState(user?.name || '');

  useEffect(() => { if (tab === 'usage')   userApi.usage().then(r => setUsage(r.data)); }, [tab]);
  useEffect(() => { if (tab === 'billing') userApi.billing().then(r => setBilling(r.data)); }, [tab]);

  function copyKey() {
    navigator.clipboard.writeText(user?.api_key || '');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success('API key copied!');
  }

  async function regenKey() {
    if (!confirm('Regenerate your API key? Your old key will stop working immediately.')) return;
    await userApi.regenerateKey();
    await refresh();
    toast.success('New API key generated');
  }

  async function handleSubscribe(planKey: string) {
    setLoading(planKey);
    try {
      const { data } = await paymentApi.subscribe(planKey);
      window.location.href = data.payment_url;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Payment failed');
    } finally { setLoading(null); }
  }

  async function handleBuyCredits(packKey: string) {
    setLoading(packKey);
    try {
      const { data } = await paymentApi.buyCredits(packKey);
      window.location.href = data.payment_url;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Payment failed');
    } finally { setLoading(null); }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    try { await userApi.updateProfile({ name }); await refresh(); toast.success('Profile updated'); }
    catch { toast.error('Update failed'); }
  }

  const planInfo = PLANS_INFO[user?.plan || 'free'];
  const usedPct  = Math.round(((user?.credits_used || 0) / planInfo.limit) * 100);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview',  icon: <Zap size={15} /> },
    { id: 'usage',    label: 'Usage',     icon: <BarChart2 size={15} /> },
    { id: 'billing',  label: 'Billing',   icon: <CreditCard size={15} /> },
    { id: 'profile',  label: 'Profile',   icon: <User size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-viper-dark">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-5xl mx-auto">

        {/* Tab bar */}
        <div className="flex gap-1 bg-viper-surface border border-viper-border rounded-xl p-1 mb-8 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${t.id === tab ? 'bg-viper-green text-black' : 'text-slate-400 hover:text-white'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-viper-surface border border-viper-border rounded-xl p-5">
                <p className="text-slate-500 text-xs mb-1 font-mono">Credits Remaining</p>
                <p className="text-3xl font-bold text-white">{user?.credits_remaining}</p>
                <p className="text-slate-600 text-xs mt-1">of {planInfo.limit} this month</p>
              </div>
              <div className="bg-viper-surface border border-viper-border rounded-xl p-5">
                <p className="text-slate-500 text-xs mb-1 font-mono">Credits Used</p>
                <p className="text-3xl font-bold text-white">{user?.credits_used}</p>
                <div className="mt-2 h-1.5 bg-viper-border rounded-full overflow-hidden">
                  <div className="h-full bg-viper-green rounded-full transition-all" style={{ width: `${Math.min(usedPct, 100)}%` }} />
                </div>
              </div>
              <div className="bg-viper-surface border border-viper-border rounded-xl p-5">
                <p className="text-slate-500 text-xs mb-1 font-mono">Current Plan</p>
                <p className={`text-3xl font-bold ${planInfo.color}`}>{planInfo.label}</p>
                <p className="text-slate-600 text-xs mt-1">Resets {new Date(user?.credits_reset_at || '').toLocaleDateString()}</p>
              </div>
            </div>

            {/* API Key */}
            <div className="bg-viper-surface border border-viper-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Key size={16} className="text-viper-green" />
                  <h2 className="text-white font-semibold">Your API Key</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={copyKey} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-viper-border px-3 py-1.5 rounded-lg transition-colors">
                    {copied ? <Check size={13} className="text-viper-green" /> : <Copy size={13} />} Copy
                  </button>
                  <button onClick={regenKey} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 border border-viper-border px-3 py-1.5 rounded-lg transition-colors">
                    <RefreshCw size={13} /> Regenerate
                  </button>
                </div>
              </div>
              <code className="block bg-viper-dark border border-viper-border rounded-xl px-5 py-4 text-viper-green font-mono text-sm break-all">
                {user?.api_key}
              </code>
              <p className="text-slate-600 text-xs mt-3">Pass as <code className="text-slate-400">X-API-Key</code> header in every request.</p>
            </div>

            {/* Quick example */}
            <div className="bg-viper-surface border border-viper-border rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-viper-green" /> Quick Start</h2>
              <pre className="bg-viper-dark rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto">
{`curl -X GET \\
  "https://viper-team-api.fly.dev/api/v1/geo/ip-lookup" \\
  -H "X-API-Key: ${user?.api_key}"`}
              </pre>
            </div>
          </div>
        )}

        {/* ── Usage ────────────────────────────────────────────────────── */}
        {tab === 'usage' && (
          <div className="bg-viper-surface border border-viper-border rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-5 flex items-center gap-2"><Clock size={16} className="text-viper-green" /> API Call History</h2>
            {!usage ? (
              <p className="text-slate-500 text-sm animate-pulse">Loading...</p>
            ) : usage.logs.length === 0 ? (
              <p className="text-slate-500 text-sm">No API calls yet. <a href="/docs" className="text-viper-green hover:underline">Read the docs</a> to get started.</p>
            ) : (
              <div className="divide-y divide-viper-border">
                {usage.logs.map((log: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 py-3 text-sm">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${log.status_code < 400 ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>{log.status_code}</span>
                    <span className="text-slate-400 font-mono">{log.category}/{log.endpoint}</span>
                    <span className="text-slate-600 text-xs ml-auto">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Billing ──────────────────────────────────────────────────── */}
        {tab === 'billing' && (
          <div className="space-y-6">
            {/* Subscribe */}
            <div className="bg-viper-surface border border-viper-border rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-5">Upgrade Plan</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SUB_PLANS.map(p => (
                  <button key={p.key} onClick={() => handleSubscribe(p.key)} disabled={loading === p.key || user?.plan === p.key}
                    className={`flex flex-col items-center gap-1 py-4 rounded-xl border border-transparent text-center transition-all ${p.color} disabled:opacity-40 disabled:cursor-not-allowed`}>
                    <span className="font-bold">{p.label}</span>
                    <span className="text-xs opacity-80">{p.credits} calls</span>
                    <span className="text-xs font-mono">{p.price}/mo</span>
                    {user?.plan === p.key && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full mt-1">Current</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Credit top-up */}
            <div className="bg-viper-surface border border-viper-border rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-2">Buy Credit Top-Up</h2>
              <p className="text-slate-500 text-sm mb-5">One-time purchase. Credits added on top of your monthly plan.</p>
              <div className="grid grid-cols-3 gap-3">
                {CREDIT_PACKS.map(p => (
                  <button key={p.key} onClick={() => handleBuyCredits(p.key)} disabled={loading === p.key}
                    className={`py-4 rounded-xl flex flex-col items-center gap-1 transition-all ${p.color} disabled:opacity-50`}>
                    <span className="font-bold text-lg">{p.credits}</span>
                    <span className="text-xs">credits</span>
                    <span className="text-xs font-mono">{p.price}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Billing history */}
            {billing?.subscriptions.length > 0 && (
              <div className="bg-viper-surface border border-viper-border rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-4">Subscription History</h2>
                <div className="divide-y divide-viper-border">
                  {billing.subscriptions.map((s: any) => (
                    <div key={s.id} className="flex justify-between items-center py-3 text-sm">
                      <span className="text-white capitalize">{s.plan_name} Plan</span>
                      <span className="text-slate-500">₦{s.price_ngn.toLocaleString()}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-900/40 text-green-400' : 'bg-slate-800 text-slate-500'}`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Profile ──────────────────────────────────────────────────── */}
        {tab === 'profile' && (
          <div className="bg-viper-surface border border-viper-border rounded-2xl p-6 max-w-lg">
            <h2 className="text-white font-semibold mb-6">Account Details</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-mono">Display Name</label>
                <input value={name} onChange={e => setName(e.target.value)} type="text" required
                  className="w-full bg-viper-dark border border-viper-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-viper-green/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-mono">Email</label>
                <input value={user?.email} readOnly
                  className="w-full bg-viper-dark/50 border border-viper-border rounded-xl px-4 py-3 text-slate-500 text-sm cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-mono">Account Status</label>
                <div className="flex items-center gap-2 px-4 py-3 bg-viper-dark border border-viper-border rounded-xl">
                  <span className={`w-2 h-2 rounded-full ${user?.email_verified ? 'bg-viper-green' : 'bg-amber-400'}`} />
                  <span className="text-sm text-slate-300">{user?.email_verified ? 'Email verified' : 'Email not verified — check your inbox'}</span>
                </div>
              </div>
              <button type="submit" className="bg-viper-green text-black font-bold px-6 py-2.5 rounded-xl hover:bg-green-400 transition-colors text-sm">
                Save Changes
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
