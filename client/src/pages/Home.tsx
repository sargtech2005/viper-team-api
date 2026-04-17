import { useState } from 'react';
import { Link } from 'wouter';
import { ChevronRight, Download, Code2, Bitcoin, Globe, Server, MessageSquare, Share2, RefreshCw, Zap, Shield, Clock, CheckCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';

const CATEGORIES = [
  { icon: <Download size={22} />, name: 'Downloads',        desc: 'Download media, APKs, files from any URL',       color: 'from-blue-500/20 to-blue-600/5',   border: 'border-blue-500/30',   text: 'text-blue-400' },
  { icon: <Code2 size={22} />,    name: 'Code Automation',  desc: 'Run, format and analyse code in 40+ languages',  color: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/30', text: 'text-purple-400' },
  { icon: <Bitcoin size={22} />,  name: 'Crypto',           desc: 'Real-time prices, wallets, blockchain data',     color: 'from-amber-500/20 to-amber-600/5',  border: 'border-amber-500/30',  text: 'text-amber-400' },
  { icon: <Globe size={22} />,    name: 'Geo & IP',         desc: 'IP lookup, geocoding, timezone detection',       color: 'from-green-500/20 to-green-600/5',  border: 'border-green-500/30',  text: 'text-green-400' },
  { icon: <Server size={22} />,   name: 'Hosting & DNS',    desc: 'DNS lookup, uptime checks, SSL analysis',        color: 'from-red-500/20 to-red-600/5',      border: 'border-red-500/30',    text: 'text-red-400' },
  { icon: <MessageSquare size={22} />, name: 'Messaging',   desc: 'WhatsApp bot helpers, SMS, notifications',       color: 'from-teal-500/20 to-teal-600/5',    border: 'border-teal-500/30',   text: 'text-teal-400' },
  { icon: <Share2 size={22} />,   name: 'Social Media',     desc: 'Scrape profiles, fetch posts, check engagement', color: 'from-pink-500/20 to-pink-600/5',    border: 'border-pink-500/30',   text: 'text-pink-400' },
  { icon: <RefreshCw size={22} />,name: 'File Convert',     desc: 'PDF, image, audio and document conversions',     color: 'from-indigo-500/20 to-indigo-600/5',border: 'border-indigo-500/30', text: 'text-indigo-400' },
];

const CODE_TABS = [
  {
    lang: 'JavaScript',
    code: `// Download a YouTube video using Viper API
const response = await fetch(
  'https://viper-team-api.fly.dev/api/v1/downloads/youtube',
  {
    headers: {
      'X-API-Key': 'viper_your_api_key_here',
      'Content-Type': 'application/json'
    }
  }
);
const data = await response.json();
console.log(data.download_url); // direct MP4 link`,
  },
  {
    lang: 'Python',
    code: `import requests

url = "https://viper-team-api.fly.dev/api/v1/geo/ip-lookup"
headers = {"X-API-Key": "viper_your_api_key_here"}
params  = {"ip": "8.8.8.8"}

res  = requests.get(url, headers=headers, params=params)
data = res.json()
print(data["country"], data["city"])  # United States, Mountain View`,
  },
  {
    lang: 'cURL',
    code: `# Get live crypto price
curl -X GET \\
  "https://viper-team-api.fly.dev/api/v1/crypto/price?coin=bitcoin" \\
  -H "X-API-Key: viper_your_api_key_here"

# Response:
# { "coin": "bitcoin", "price_usd": 67420.55, 
#   "change_24h": "+2.3%", "price_ngn": 104500000 }`,
  },
];

const PLANS = [
  { name: 'Free',     price: 0,     credits: 5,   color: 'border-slate-600',                    btn: 'bg-slate-700 hover:bg-slate-600 text-white',           badge: null },
  { name: 'Starter',  price: 5000,  credits: 150, color: 'border-blue-500/50',                  btn: 'bg-blue-600 hover:bg-blue-500 text-white',             badge: null },
  { name: 'Basic',    price: 9000,  credits: 300, color: 'border-purple-500/50',                btn: 'bg-purple-600 hover:bg-purple-500 text-white',         badge: null },
  { name: 'Pro',      price: 15000, credits: 500, color: 'border-viper-green/60 shadow-lg shadow-viper-green/10', btn: 'bg-viper-green hover:bg-green-400 text-black font-bold', badge: 'Most Popular' },
  { name: 'Business', price: 25000, credits: 800, color: 'border-amber-500/50',                 btn: 'bg-amber-500 hover:bg-amber-400 text-black font-bold', badge: 'Best Value' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-screen bg-viper-dark grid-bg">
      <Navbar />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="pt-36 pb-24 px-4 text-center relative overflow-hidden">
        {/* Glow blob */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-viper-green/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-viper-surface border border-viper-border rounded-full px-4 py-1.5 mb-6 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-viper-green animate-pulse" />
            8 API categories · 50+ endpoints · NGN billing
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            One API Key.<br />
            <span className="text-gradient">Unlimited Automation.</span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Build WhatsApp bots, download managers, crypto trackers and more — powered by a single Viper API key. Affordable ₦ pricing for African developers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-viper-green text-black font-bold px-8 py-3.5 rounded-xl hover:bg-green-400 transition-all glow-green text-base">
              Start Free — 5 calls/month <ChevronRight size={18} />
            </Link>
            <Link href="/docs"
              className="w-full sm:w-auto flex items-center justify-center gap-2 border border-viper-border text-slate-300 px-8 py-3.5 rounded-xl hover:border-viper-green/50 hover:text-white transition-all text-base">
              Read Docs
            </Link>
          </div>
        </div>
      </section>

      {/* ── Categories Grid ──────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Every API You Need</h2>
            <p className="text-slate-400 max-w-xl mx-auto">One subscription unlocks all categories. No per-endpoint billing, no complexity.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map(cat => (
              <Link key={cat.name} href="/docs"
                className={`group bg-gradient-to-br ${cat.color} border ${cat.border} rounded-xl p-5 hover:scale-[1.02] transition-all cursor-pointer`}>
                <div className={`${cat.text} mb-3`}>{cat.icon}</div>
                <h3 className="text-white font-semibold mb-1 text-sm">{cat.name}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Code Demo ────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Simple to Integrate</h2>
            <p className="text-slate-400">Works with any language. Just pass your API key.</p>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-viper-surface border border-viper-border rounded-xl p-1 mb-0 w-fit mx-auto">
            {CODE_TABS.map((t, i) => (
              <button key={t.lang} onClick={() => setActiveTab(i)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${i === activeTab ? 'bg-viper-green text-black' : 'text-slate-400 hover:text-white'}`}>
                {t.lang}
              </button>
            ))}
          </div>

          {/* Code card */}
          <div className="mt-3 bg-[#0a0f1e] border border-viper-border rounded-2xl overflow-hidden shadow-2xl">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-viper-border bg-viper-surface/50">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-amber-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs font-mono text-slate-500">{CODE_TABS[activeTab].lang.toLowerCase()}_example.{activeTab === 1 ? 'py' : activeTab === 2 ? 'sh' : 'js'}</span>
            </div>
            <pre className="p-6 text-sm font-mono text-slate-300 overflow-x-auto leading-relaxed">
              <code>{CODE_TABS[activeTab].code}</code>
            </pre>
            <div className="px-5 py-3 border-t border-viper-border bg-viper-surface/30 flex items-center justify-between">
              <span className="text-xs font-mono text-viper-green">✓ Live endpoint</span>
              <Link href="/docs" className="text-xs text-slate-500 hover:text-viper-green transition-colors font-mono">View full docs →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Viper ─────────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <Zap size={20} />, title: 'Fast & Reliable',    desc: 'Sub-200ms average response. Hosted on fly.io with global edge routing.' },
            { icon: <Shield size={20} />, title: 'Secure by Default', desc: 'API keys scoped per user. HTTPS only. No plain-text secrets exposed.' },
            { icon: <Clock size={20} />, title: 'Pay in Naira',      desc: 'No dollar card needed. Pay with Paystack — cards, transfers, USSD.' },
          ].map(f => (
            <div key={f.title} className="bg-viper-surface border border-viper-border rounded-xl p-6">
              <div className="text-viper-green mb-3">{f.icon}</div>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing Preview ───────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple ₦ Pricing</h2>
            <p className="text-slate-400">Start free. Upgrade when you need more calls.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PLANS.map(plan => (
              <div key={plan.name} className={`relative bg-viper-surface border ${plan.color} rounded-2xl p-5 flex flex-col`}>
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-viper-green text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </span>
                )}
                <h3 className="text-white font-bold text-lg mb-1">{plan.name}</h3>
                <div className="mb-4">
                  {plan.price === 0
                    ? <span className="text-2xl font-extrabold text-white">Free</span>
                    : <><span className="text-2xl font-extrabold text-white">₦{plan.price.toLocaleString()}</span><span className="text-slate-500 text-sm">/mo</span></>
                  }
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle size={14} className="text-viper-green shrink-0" />
                    <span>{plan.credits} API calls/mo</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle size={14} className="text-viper-green shrink-0" />
                    All categories
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle size={14} className="text-viper-green shrink-0" />
                    {plan.price === 0 ? 'Community support' : plan.price >= 15000 ? 'Priority support' : 'Email support'}
                  </li>
                </ul>
                <Link href={plan.price === 0 ? '/register' : '/pricing'}
                  className={`block text-center py-2.5 rounded-xl text-sm transition-all ${plan.btn}`}>
                  {plan.price === 0 ? 'Get started free' : 'Subscribe now'}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-600 text-sm mt-6">
            Credits exhausted? <Link href="/pricing" className="text-viper-green hover:underline">Buy a top-up pack</Link> — no plan change needed.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-viper-border py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-mono font-bold text-white">Viper<span className="text-viper-green">.</span>API</span>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/register" className="hover:text-white transition-colors">Sign up</Link>
          </div>
          <span className="text-slate-600 text-xs">© {new Date().getFullYear()} Viper-Team API</span>
        </div>
      </footer>
    </div>
  );
}
