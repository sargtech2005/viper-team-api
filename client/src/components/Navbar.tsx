import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X, Zap, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const NAV_LINKS = [
  { label: 'Home',    href: '/' },
  { label: 'Docs',    href: '/docs' },
  { label: 'Pricing', href: '/pricing' },
];

export default function Navbar() {
  const [open, setOpen]       = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location]            = useLocation();
  const { user, logout }      = useAuth();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => setOpen(false), [location]);

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-viper-dark/95 backdrop-blur-md border-b border-viper-border' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-viper-green/10 border border-viper-green/30 flex items-center justify-center group-hover:bg-viper-green/20 transition-colors">
              <Zap size={16} className="text-viper-green" />
            </div>
            <span className="font-mono font-bold text-white text-lg">Viper<span className="text-viper-green">.</span>API</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location === l.href ? 'text-viper-green bg-viper-green/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">Dashboard</Link>
                {user.is_admin && <Link href="/admin" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">Admin</Link>}
                <button onClick={logout} className="text-sm text-slate-500 hover:text-white transition-colors">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">Log in</Link>
                <Link href="/register" className="flex items-center gap-1.5 bg-viper-green text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-400 transition-colors">
                  Get Started <ChevronRight size={14} />
                </Link>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setOpen(o => !o)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg border border-viper-border text-slate-400 hover:text-white hover:border-viper-green/50 transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

        {/* Panel */}
        <div className={`absolute top-16 left-0 right-0 bg-viper-surface border-b border-viper-border p-5 transition-transform duration-300 ${open ? 'translate-y-0' : '-translate-y-4'}`}>
          <nav className="flex flex-col gap-1 mb-5">
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${location === l.href ? 'text-viper-green bg-viper-green/10' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 border-t border-viper-border pt-4">
            {user ? (
              <>
                <Link href="/dashboard" className="px-4 py-3 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors">Dashboard</Link>
                {user.is_admin && <Link href="/admin" className="px-4 py-3 text-sm text-amber-400 rounded-lg hover:bg-white/5 transition-colors">Admin Panel</Link>}
                <button onClick={logout} className="px-4 py-3 text-sm text-slate-500 rounded-lg hover:bg-white/5 transition-colors text-left">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-3 text-center text-sm text-slate-300 border border-viper-border rounded-lg hover:border-viper-green/50 transition-colors">Log in</Link>
                <Link href="/register" className="px-4 py-3 text-center text-sm font-semibold bg-viper-green text-black rounded-lg hover:bg-green-400 transition-colors">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
