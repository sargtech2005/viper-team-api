import { useState, useEffect } from 'react';
import { BarChart2, Users, CreditCard, Settings, Activity, List, LayoutDashboard } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

type AdminTab = 'overview' | 'users' | 'payments' | 'categories' | 'logs' | 'settings';

export default function AdminLayout() {
  const [tab, setTab] = useState<AdminTab>('overview');

  const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',    label: 'Overview',    icon: <LayoutDashboard size={15} /> },
    { id: 'users',       label: 'Users',       icon: <Users size={15} /> },
    { id: 'payments',    label: 'Payments',    icon: <CreditCard size={15} /> },
    { id: 'categories',  label: 'API Cats',    icon: <List size={15} /> },
    { id: 'logs',        label: 'API Logs',    icon: <Activity size={15} /> },
    { id: 'settings',    label: 'Settings',    icon: <Settings size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-viper-dark">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-7">
          <span className="bg-amber-500/10 text-amber-400 text-xs font-mono px-3 py-1 rounded-full border border-amber-500/30">⚡ Admin Panel</span>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-viper-surface border border-viper-border rounded-xl p-1 mb-8 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${t.id === tab ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview'   && <AdminOverview />}
        {tab === 'users'      && <AdminUsers />}
        {tab === 'payments'   && <AdminPayments />}
        {tab === 'categories' && <AdminCategories />}
        {tab === 'logs'       && <AdminLogs />}
        {tab === 'settings'   && <AdminSettings />}
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { adminApi.stats().then(r => setStats(r.data)); }, []);
  if (!stats) return <p className="text-slate-500 animate-pulse">Loading...</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Total Users',      value: stats.users.total,       sub: `+${stats.users.this_week} this week`,     color: 'text-blue-400' },
        { label: 'Active Subs',      value: stats.subs.active,       sub: `${stats.subs.total} total`,              color: 'text-viper-green' },
        { label: 'API Calls Today',  value: stats.calls.today,       sub: `${stats.calls.total} all time`,          color: 'text-purple-400' },
        { label: 'Revenue (NGN)',     value: `₦${Number(stats.revenue.total).toLocaleString()}`, sub: 'active subscriptions', color: 'text-amber-400' },
      ].map(s => (
        <div key={s.label} className="bg-viper-surface border border-viper-border rounded-xl p-5">
          <p className="text-slate-500 text-xs mb-1 font-mono">{s.label}</p>
          <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-slate-600 text-xs mt-1">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────
function AdminUsers() {
  const [users, setUsers]   = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => { load(); }, [search]);
  async function load() {
    const { data } = await adminApi.users({ search });
    setUsers(data.users);
  }

  async function save(u: any) {
    try {
      await adminApi.updateUser(u.id, { plan: u.plan, credits_remaining: u.credits_remaining, is_active: u.is_active, is_admin: u.is_admin });
      toast.success('User updated');
      setEditing(null); load();
    } catch { toast.error('Update failed'); }
  }

  return (
    <div className="space-y-4">
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
        className="w-full bg-viper-surface border border-viper-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-viper-green/60" />

      <div className="bg-viper-surface border border-viper-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-viper-border">
              <tr className="text-xs text-slate-500 font-mono">
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Plan</th>
                <th className="px-5 py-3 text-left">Credits</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-viper-border">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-white/3">
                  <td className="px-5 py-3">
                    <p className="text-white font-medium">{u.name}</p>
                    <p className="text-slate-500 text-xs">{u.email}</p>
                    {u.is_admin && <span className="text-amber-400 text-[10px] font-mono">admin</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-300 capitalize">{u.plan}</td>
                  <td className="px-5 py-3 text-slate-300">{u.credits_remaining}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                      {u.is_active ? 'Active' : 'Banned'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => setEditing({ ...u })} className="text-xs text-viper-green hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-viper-surface border border-viper-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-white font-semibold">Edit: {editing.name}</h3>
            <div>
              <label className="text-xs text-slate-400 font-mono">Plan</label>
              <select value={editing.plan} onChange={e => setEditing((u: any) => ({ ...u, plan: e.target.value }))}
                className="w-full mt-1 bg-viper-dark border border-viper-border rounded-xl px-3 py-2 text-white text-sm">
                {['free','starter','basic','pro','business'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-mono">Credits Remaining</label>
              <input type="number" value={editing.credits_remaining}
                onChange={e => setEditing((u: any) => ({ ...u, credits_remaining: parseInt(e.target.value) }))}
                className="w-full mt-1 bg-viper-dark border border-viper-border rounded-xl px-3 py-2 text-white text-sm" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={editing.is_active} onChange={e => setEditing((u: any) => ({ ...u, is_active: e.target.checked }))} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={editing.is_admin} onChange={e => setEditing((u: any) => ({ ...u, is_admin: e.target.checked }))} />
                Admin
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => save(editing)} className="flex-1 bg-viper-green text-black font-bold py-2.5 rounded-xl hover:bg-green-400">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 bg-viper-border text-white py-2.5 rounded-xl hover:bg-slate-700">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Payments ──────────────────────────────────────────────────────────────────
function AdminPayments() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { adminApi.payments().then(r => setRows(r.data)); }, []);

  return (
    <div className="bg-viper-surface border border-viper-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-viper-border">
            <tr className="text-xs text-slate-500 font-mono">
              <th className="px-5 py-3 text-left">User</th>
              <th className="px-5 py-3 text-left">Plan</th>
              <th className="px-5 py-3 text-left">Amount</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-viper-border">
            {rows.map(r => (
              <tr key={r.id}>
                <td className="px-5 py-3 text-slate-300">{r.email}</td>
                <td className="px-5 py-3 text-slate-300 capitalize">{r.plan_name}</td>
                <td className="px-5 py-3 text-white font-mono">₦{r.price_ngn.toLocaleString()}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'active' ? 'bg-green-900/40 text-green-400' : 'bg-slate-800 text-slate-400'}`}>{r.status}</span>
                </td>
                <td className="px-5 py-3 text-slate-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── API Categories ─────────────────────────────────────────────────────────────
function AdminCategories() {
  const [cats, setCats] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', slug: '', description: '', icon: '⚡' });

  useEffect(() => { load(); }, []);
  async function load() { const { data } = await adminApi.categories(); setCats(data); }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try { await adminApi.createCategory(form); toast.success('Category created'); load(); setForm({ name: '', slug: '', description: '', icon: '⚡' }); }
    catch { toast.error('Failed'); }
  }

  async function toggle(id: number, is_active: boolean) {
    await adminApi.updateCategory(id, { is_active: !is_active }); load();
  }

  return (
    <div className="space-y-6">
      <div className="bg-viper-surface border border-viper-border rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Add New Category</h3>
        <form onSubmit={create} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" required
            className="bg-viper-dark border border-viper-border rounded-xl px-3 py-2 text-white text-sm" />
          <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="slug" required
            className="bg-viper-dark border border-viper-border rounded-xl px-3 py-2 text-white text-sm font-mono" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description"
            className="bg-viper-dark border border-viper-border rounded-xl px-3 py-2 text-white text-sm" />
          <div className="flex gap-2">
            <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="Icon emoji"
              className="w-20 bg-viper-dark border border-viper-border rounded-xl px-3 py-2 text-white text-sm" />
            <button type="submit" className="flex-1 bg-viper-green text-black font-bold rounded-xl text-sm hover:bg-green-400">Add</button>
          </div>
        </form>
      </div>

      <div className="bg-viper-surface border border-viper-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-viper-border">
            <tr className="text-xs text-slate-500 font-mono">
              <th className="px-5 py-3 text-left">Icon</th>
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-5 py-3 text-left">Slug</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-viper-border">
            {cats.map(c => (
              <tr key={c.id}>
                <td className="px-5 py-3 text-xl">{c.icon}</td>
                <td className="px-5 py-3 text-white">{c.name}</td>
                <td className="px-5 py-3 text-viper-green font-mono text-xs">{c.slug}</td>
                <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-900/40 text-green-400' : 'bg-slate-800 text-slate-500'}`}>{c.is_active ? 'Active' : 'Hidden'}</span></td>
                <td className="px-5 py-3">
                  <button onClick={() => toggle(c.id, c.is_active)} className="text-xs text-slate-400 hover:text-white">{c.is_active ? 'Hide' : 'Show'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── API Logs ──────────────────────────────────────────────────────────────────
function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { adminApi.logs(200).then(r => setLogs(r.data)); }, []);

  return (
    <div className="bg-viper-surface border border-viper-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-viper-border">
            <tr className="text-xs text-slate-500 font-mono">
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Endpoint</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Latency</th>
              <th className="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-viper-border">
            {logs.map(l => (
              <tr key={l.id}>
                <td className="px-4 py-2.5 text-slate-400 text-xs">{l.email || 'unknown'}</td>
                <td className="px-4 py-2.5 text-viper-green font-mono text-xs">{l.category}/{l.endpoint}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${l.status_code < 400 ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>{l.status_code}</span>
                </td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{l.latency_ms}ms</td>
                <td className="px-4 py-2.5 text-slate-600 text-xs">{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { adminApi.settings().then(r => setSettings(r.data)); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await adminApi.saveSettings(settings);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      toast.success('Settings saved');
    } catch { toast.error('Save failed'); }
  }

  const field = (key: string, label: string, type = 'text') => (
    <div key={key}>
      <label className="block text-xs text-slate-400 mb-1.5 font-mono">{label}</label>
      {type === 'checkbox' ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={settings[key] === 'true'} onChange={e => setSettings(s => ({ ...s, [key]: String(e.target.checked) }))} />
          <span className="text-sm text-slate-300">Enabled</span>
        </label>
      ) : (
        <input value={settings[key] || ''} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} type={type}
          className="w-full bg-viper-dark border border-viper-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-viper-green/60" />
      )}
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-xl">
      <div className="bg-viper-surface border border-viper-border rounded-2xl p-6 space-y-5">
        <h3 className="text-white font-semibold">Site</h3>
        {field('site_name', 'Site Name')}
        {field('site_tagline', 'Tagline')}
      </div>
      <div className="bg-viper-surface border border-viper-border rounded-2xl p-6 space-y-5">
        <h3 className="text-white font-semibold">Security</h3>
        {field('recaptcha_enabled', 'Enable reCAPTCHA on Registration', 'checkbox')}
        {field('maintenance_mode', 'Maintenance Mode', 'checkbox')}
      </div>
      <div className="bg-viper-surface border border-viper-border rounded-2xl p-6 space-y-5">
        <h3 className="text-white font-semibold">Credit Pack Prices (₦)</h3>
        {field('credit_pack_100', '100-credit pack price')}
        {field('credit_pack_300', '300-credit pack price')}
        {field('credit_pack_500', '500-credit pack price')}
      </div>
      <button type="submit" className={`w-full py-3 rounded-xl font-bold transition-all text-sm ${saved ? 'bg-green-500 text-white' : 'bg-viper-green text-black hover:bg-green-400'}`}>
        {saved ? '✓ Saved!' : 'Save All Settings'}
      </button>
    </form>
  );
}
