import { useState } from 'react';
import { Link } from 'wouter';
import { Download, Code2, Bitcoin, Globe, Server, MessageSquare, Share2, RefreshCw, ChevronRight, Copy, Check, ExternalLink } from 'lucide-react';
import Navbar from '@/components/Navbar';

const CATEGORIES = [
  {
    id: 'downloads', icon: <Download size={16} />, name: 'Downloads', color: 'text-blue-400',
    description: 'Download media, APKs, and files from popular platforms.',
    endpoints: [
      {
        name: 'YouTube Download',
        method: 'GET', path: '/api/v1/downloads/youtube',
        desc: 'Get a direct download link for a YouTube video or audio.',
        params: [
          { name: 'url', type: 'string', required: true, desc: 'Full YouTube video URL' },
          { name: 'format', type: 'string', required: false, desc: '"mp4" or "mp3" (default: mp4)' },
        ],
        example: `GET /api/v1/downloads/youtube?url=https://youtube.com/watch?v=xxx&format=mp4
X-API-Key: viper_your_key`,
        response: `{
  "title": "My Video",
  "download_url": "https://...",
  "duration": "3:45",
  "size_mb": 42.1
}`,
      },
      {
        name: 'APK Downloader',
        method: 'GET', path: '/api/v1/downloads/apk',
        desc: 'Download APK files by package name from known sources.',
        params: [
          { name: 'package', type: 'string', required: true, desc: 'Android package name e.g. com.whatsapp' },
        ],
        example: `GET /api/v1/downloads/apk?package=com.whatsapp
X-API-Key: viper_your_key`,
        response: `{ "apk_url": "https://...", "version": "2.24.1", "size_mb": 75.4 }`,
      },
    ],
  },
  {
    id: 'crypto', icon: <Bitcoin size={16} />, name: 'Crypto', color: 'text-amber-400',
    description: 'Real-time cryptocurrency prices, wallet checks, and blockchain data.',
    endpoints: [
      {
        name: 'Coin Price',
        method: 'GET', path: '/api/v1/crypto/price',
        desc: 'Get the current price of any cryptocurrency in USD and NGN.',
        params: [
          { name: 'coin', type: 'string', required: true, desc: 'Coin ID e.g. bitcoin, ethereum, solana' },
        ],
        example: `GET /api/v1/crypto/price?coin=bitcoin
X-API-Key: viper_your_key`,
        response: `{
  "coin": "bitcoin",
  "price_usd": 67420.55,
  "price_ngn": 104500000,
  "change_24h": "+2.3%",
  "market_cap": "1.3T"
}`,
      },
    ],
  },
  {
    id: 'geo', icon: <Globe size={16} />, name: 'Geo & IP', color: 'text-green-400',
    description: 'IP lookup, geocoding, timezone and country detection.',
    endpoints: [
      {
        name: 'IP Lookup',
        method: 'GET', path: '/api/v1/geo/ip-lookup',
        desc: 'Get detailed location info for any IP address.',
        params: [
          { name: 'ip', type: 'string', required: false, desc: 'IP address to look up. Omit to use caller IP.' },
        ],
        example: `GET /api/v1/geo/ip-lookup?ip=8.8.8.8
X-API-Key: viper_your_key`,
        response: `{
  "ip": "8.8.8.8",
  "country": "United States",
  "country_code": "US",
  "city": "Mountain View",
  "timezone": "America/Los_Angeles",
  "isp": "Google LLC",
  "lat": 37.386,
  "lng": -122.0838
}`,
      },
    ],
  },
  {
    id: 'code', icon: <Code2 size={16} />, name: 'Code Automation', color: 'text-purple-400',
    description: 'Execute, format, and analyse code in 40+ programming languages.',
    endpoints: [
      {
        name: 'Run Code',
        method: 'POST', path: '/api/v1/code/run',
        desc: 'Execute a code snippet and get the output. Powered by Piston.',
        params: [
          { name: 'language', type: 'string', required: true,  desc: 'e.g. python, javascript, php, go' },
          { name: 'code',     type: 'string', required: true,  desc: 'The source code to execute' },
          { name: 'stdin',    type: 'string', required: false, desc: 'Optional stdin input' },
        ],
        example: `POST /api/v1/code/run
X-API-Key: viper_your_key
Content-Type: application/json

{ "language": "python", "code": "print('Hello Viper!')" }`,
        response: `{ "stdout": "Hello Viper!\\n", "stderr": "", "exit_code": 0, "runtime_ms": 45 }`,
      },
    ],
  },
  {
    id: 'hosting', icon: <Server size={16} />, name: 'Hosting & DNS', color: 'text-red-400',
    description: 'DNS lookup, uptime monitoring, SSL checks, server info.',
    endpoints: [
      {
        name: 'DNS Lookup',
        method: 'GET', path: '/api/v1/hosting/dns',
        desc: 'Retrieve DNS records for any domain.',
        params: [
          { name: 'domain', type: 'string', required: true, desc: 'Domain name e.g. google.com' },
          { name: 'type',   type: 'string', required: false, desc: 'Record type: A, MX, TXT, CNAME (default: A)' },
        ],
        example: `GET /api/v1/hosting/dns?domain=google.com&type=MX
X-API-Key: viper_your_key`,
        response: `{ "domain": "google.com", "type": "MX", "records": ["10 smtp.google.com", "20 alt1.aspmx.l.google.com"] }`,
      },
    ],
  },
  {
    id: 'messaging', icon: <MessageSquare size={16} />, name: 'Messaging', color: 'text-teal-400',
    description: 'WhatsApp bot helpers, number checking, and notification tools.',
    endpoints: [
      {
        name: 'WhatsApp Check',
        method: 'GET', path: '/api/v1/messaging/wa-check',
        desc: 'Check if a phone number has a WhatsApp account.',
        params: [
          { name: 'phone', type: 'string', required: true, desc: 'Phone number with country code e.g. 2348012345678' },
        ],
        example: `GET /api/v1/messaging/wa-check?phone=2348012345678
X-API-Key: viper_your_key`,
        response: `{ "phone": "2348012345678", "has_whatsapp": true, "name": "John Doe" }`,
      },
    ],
  },
  {
    id: 'social', icon: <Share2 size={16} />, name: 'Social Media', color: 'text-pink-400',
    description: 'Scrape profiles, fetch posts, check follower counts.',
    endpoints: [
      {
        name: 'Instagram Profile',
        method: 'GET', path: '/api/v1/social/instagram',
        desc: 'Get public profile data for any Instagram username.',
        params: [
          { name: 'username', type: 'string', required: true, desc: 'Instagram username without @' },
        ],
        example: `GET /api/v1/social/instagram?username=natgeo
X-API-Key: viper_your_key`,
        response: `{ "username": "natgeo", "followers": 22100000, "posts": 14800, "bio": "..." }`,
      },
    ],
  },
  {
    id: 'convert', icon: <RefreshCw size={16} />, name: 'File Convert', color: 'text-indigo-400',
    description: 'Convert between file formats — PDF, images, audio and documents.',
    endpoints: [
      {
        name: 'Image Convert',
        method: 'POST', path: '/api/v1/convert/image',
        desc: 'Convert an image URL to a different format.',
        params: [
          { name: 'url',    type: 'string', required: true, desc: 'Public URL of the source image' },
          { name: 'format', type: 'string', required: true, desc: 'Target format: png, jpg, webp, gif' },
        ],
        example: `POST /api/v1/convert/image
X-API-Key: viper_your_key

{ "url": "https://example.com/photo.jpg", "format": "webp" }`,
        response: `{ "converted_url": "https://...", "format": "webp", "size_kb": 35 }`,
      },
    ],
  },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative bg-[#07101f] border border-viper-border rounded-xl overflow-hidden">
      <button onClick={copy} className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors p-1">
        {copied ? <Check size={14} className="text-viper-green" /> : <Copy size={14} />}
      </button>
      <pre className="p-5 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

export default function Docs() {
  const [activeCat, setActiveCat] = useState('downloads');
  const [mobileOpen, setMobileOpen] = useState(false);

  const cat = CATEGORIES.find(c => c.id === activeCat) || CATEGORIES[0];

  return (
    <div className="min-h-screen bg-viper-dark">
      <Navbar />

      <div className="pt-16 flex min-h-screen">

        {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-64 border-r border-viper-border pt-8 px-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="mb-6">
            <p className="text-xs text-slate-600 font-mono uppercase tracking-widest mb-3 px-2">Authentication</p>
            <div className="bg-viper-surface border border-viper-border rounded-lg p-3 text-xs font-mono text-slate-400">
              X-API-Key: viper_xxx
            </div>
          </div>
          <p className="text-xs text-slate-600 font-mono uppercase tracking-widest mb-3 px-2">Categories</p>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setActiveCat(c.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm transition-all mb-1 text-left ${c.id === activeCat ? 'bg-viper-green/10 text-viper-green' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span className={c.id === activeCat ? 'text-viper-green' : c.color}>{c.icon}</span>
              {c.name}
              {c.id === activeCat && <ChevronRight size={12} className="ml-auto" />}
            </button>
          ))}
          <div className="mt-auto pb-6">
            <Link href="/register" className="block text-center bg-viper-green text-black text-xs font-bold py-2.5 px-4 rounded-lg hover:bg-green-400 transition-colors">
              Get API Key →
            </Link>
          </div>
        </aside>

        {/* ── Mobile sidebar toggle ─────────────────────────────────────── */}
        <div className="md:hidden fixed bottom-5 right-5 z-40">
          <button onClick={() => setMobileOpen(o => !o)}
            className="bg-viper-green text-black rounded-full px-4 py-2 text-sm font-bold shadow-lg">
            {mobileOpen ? 'Close' : '📖 Categories'}
          </button>
          {mobileOpen && (
            <div className="absolute bottom-12 right-0 bg-viper-surface border border-viper-border rounded-xl p-3 w-52 shadow-2xl">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => { setActiveCat(c.id); setMobileOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm mb-1 text-left ${c.id === activeCat ? 'bg-viper-green/10 text-viper-green' : 'text-slate-300 hover:bg-white/5'}`}>
                  <span className={c.color}>{c.icon}</span>{c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main className="flex-1 px-4 md:px-10 py-10 max-w-4xl">

          {/* Base URL banner */}
          <div className="bg-viper-surface border border-viper-border rounded-xl px-5 py-3 flex items-center justify-between mb-8 flex-wrap gap-2">
            <span className="text-xs text-slate-500 font-mono">Base URL</span>
            <code className="text-sm font-mono text-viper-green">https://viper-team-api.fly.dev</code>
            <a href="https://viper-team-api.fly.dev" target="_blank" rel="noopener noreferrer"
              className="text-slate-500 hover:text-white transition-colors"><ExternalLink size={14} /></a>
          </div>

          {/* Authentication section */}
          <section className="mb-12 bg-viper-surface border border-viper-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-3">Authentication</h2>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              Every request must include your API key. You can pass it as a header (recommended) or as a query parameter.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-mono mb-2">Header (recommended)</p>
                <CodeBlock code="X-API-Key: viper_your_api_key_here" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-mono mb-2">Query param</p>
                <CodeBlock code="?apiKey=viper_your_api_key_here" />
              </div>
            </div>
            <div className="mt-4 bg-amber-900/20 border border-amber-500/30 rounded-lg px-4 py-3 text-xs text-amber-300">
              ⚠️ Never expose your API key in frontend JavaScript. Use a backend proxy for production apps.
            </div>
          </section>

          {/* Category */}
          <div className="mb-6 flex items-center gap-3">
            <span className={`text-2xl ${cat.color}`}>{cat.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">{cat.name}</h1>
              <p className="text-slate-400 text-sm">{cat.description}</p>
            </div>
          </div>

          {/* Endpoints */}
          {cat.endpoints.map((ep, i) => (
            <section key={i} className="mb-10 border border-viper-border rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-viper-surface px-6 py-4 flex items-center gap-3 border-b border-viper-border">
                <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${ep.method === 'GET' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'}`}>
                  {ep.method}
                </span>
                <code className="text-viper-green font-mono text-sm">{ep.path}</code>
              </div>

              <div className="p-6 space-y-6">
                <p className="text-slate-400 text-sm">{ep.desc}</p>

                {/* Params */}
                <div>
                  <h4 className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-3">Parameters</h4>
                  <div className="divide-y divide-viper-border border border-viper-border rounded-xl overflow-hidden">
                    {ep.params.map(p => (
                      <div key={p.name} className="flex items-start gap-4 px-4 py-3 bg-viper-surface/50">
                        <div className="min-w-[100px]">
                          <code className="text-xs font-mono text-white">{p.name}</code>
                          {p.required && <span className="ml-1.5 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-mono">required</span>}
                        </div>
                        <code className="text-xs font-mono text-slate-500 min-w-[50px]">{p.type}</code>
                        <p className="text-xs text-slate-400">{p.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Example request */}
                <div>
                  <h4 className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">Request Example</h4>
                  <CodeBlock code={ep.example} />
                </div>

                {/* Example response */}
                <div>
                  <h4 className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">Response</h4>
                  <CodeBlock code={ep.response} />
                </div>
              </div>
            </section>
          ))}

          {/* Errors section */}
          <section className="mt-12 border border-viper-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Error Codes</h2>
            <div className="divide-y divide-viper-border">
              {[
                { code: '401', label: 'Unauthorized',    desc: 'Missing or invalid API key' },
                { code: '403', label: 'Forbidden',       desc: 'Account suspended' },
                { code: '404', label: 'Not Found',       desc: 'Endpoint does not exist or is inactive' },
                { code: '429', label: 'Too Many Requests',desc: 'Monthly credit limit reached' },
                { code: '502', label: 'Bad Gateway',     desc: 'Upstream API error — try again shortly' },
              ].map(e => (
                <div key={e.code} className="flex items-center gap-4 py-3">
                  <code className="text-sm font-mono font-bold text-red-400 w-10">{e.code}</code>
                  <span className="text-white text-sm font-medium w-36">{e.label}</span>
                  <span className="text-slate-400 text-sm">{e.desc}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-8 text-center">
            <Link href="/register" className="inline-flex items-center gap-2 bg-viper-green text-black font-bold px-6 py-3 rounded-xl hover:bg-green-400 transition-colors">
              Get Your Free API Key <ChevronRight size={16} />
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
