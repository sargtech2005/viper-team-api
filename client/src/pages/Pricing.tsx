import { useState } from 'react';
import { Link } from 'wouter';
import { CheckCircle, XCircle, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { paymentApi } from '@/lib/api';
import { toast } from 'sonner';

const PLANS = [
  {
    key: 'free', name: 'Free', price: 0, credits: 5, period: 'month',
    color: 'border-slate-700', headerBg: 'bg-slate-800/50',
    btn: 'bg-slate-700 hover:bg-slate-600 text-white',
    features: { allCategories: true, creditTopup: false, emailSupport: false, prioritySupport: false, apiDocs: true },
  },
  {
    key: 'starter', name: 'Starter', price: 5000, credits: 150, period: 'month',
    color: 'border-blue-500/40', headerBg: 'bg-blue-900/20',
    btn: 'bg-blue-600 hover:bg-blue-500 text-white',
    features: { allCategories: true, creditTopup: true, emailSupport: true, prioritySupport: false, apiDocs: true },
  },
  {
    key: 'basic', name: 'Basic', price: 9000, credits: 300, period: 'month',
    color: 'border-purple-500/40', headerBg: 'bg-purple-900/20',
    btn: 'bg-purple-600 hover:bg-purple-500 text-white',
    features: { allCategories: true, creditTopup: true, emailSupport: true, prioritySupport: false, apiDocs: true },
  },
  {
    key: 'pro', name: 'Pro', price: 15000, credits: 500, period: 'month',
    color: 'border-viper-green/60', headerBg: 'bg-viper-green/10',
    btn: 'bg-viper-green hover:bg-green-400 text-black font-bold',
    badge: 'Most Popular',
    features: { allCategories: true, creditTopup: true, emailSupport: true, prioritySupport: true, apiDocs: true },
  },
  {
    key: 'business', name: 'Business', price: 25000, credits: 800, period: 'month',
    color: 'border-amber-500/40', headerBg: 'bg-amber-900/20',
    btn: 'bg-amber-500 hover:bg-amber-400 text-black font-bold',
    badge: 'Best Value',
    features: { allCategories: true, creditTopup: true, emailSupport: true, prioritySupport: true, apiDocs: true },
  },
];

const CREDIT_PACKS = [
  { key: 'pack_100', credits: 100, price: 2000, color: 'border-cyan-500/40',  btn: 'bg-cyan-600 hover:bg-cyan-500 text-white' },
  { key: 'pack_300', credits: 300, price: 5500, color: 'border-green-500/40', btn: 'bg-viper-green hover:bg-green-400 text-black font-bold' },
  { key: 'pack_500', credits: 500, price: 8500, color: 'border-orange-500/40',btn: 'bg-orange-500 hover:bg-orange-400 text-black font-bold' },
];

const FEATURE_LABELS: Record<string, string> = {
  allCategories:    'All API categories',
  creditTopup:      'Credit top-up packs',
  emailSupport:     'Email support',
  prioritySupport:  'Priority support',
  apiDocs:          'Full API documentation',
};

export default function Pricing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(planKey: string) {
    if (!user) { window.location.href = '/register'; return; }
    if (planKey === 'free') return;
    setLoading(planKey);
    try {
      const { data } = await paymentApi.subscribe(planKey);
      window.location.href = data.payment_url;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Payment failed. Try again.');
    } finally {
      setLoading(null);
    }
  }

  async function handleBuyCredits(packKey: string) {
    if (!user) { window.location.href = '/register'; return; }
    setLoading(packKey);
    try {
      const { data } = await paymentApi.buyCredits(packKey);
      window.location.href = data.payment_url;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Payment failed. Try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-viper-dark">
      <Navbar />

      <div className="pt-28 pb-20 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-14">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Simple ₦ Pricing</h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              All plans unlock every API category. One price, everything included.
            </p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-20">
            {PLANS.map(plan => (
              <div key={plan.key} className={`relative flex flex-col border ${plan.color} rounded-2xl overflow-hidden`}>
                {plan.badge && (
                  <div className="absolute top-3 right-3">
                    <span className="bg-viper-green text-black text-[10px] font-bold px-2 py-0.5 rounded-full">{plan.badge}</span>
                  </div>
                )}
                {/* Header */}
                <div className={`${plan.headerBg} px-5 pt-6 pb-4`}>
                  <h2 className="text-white font-bold text-xl mb-1">{plan.name}</h2>
                  {plan.price === 0
                    ? <div className="text-3xl font-extrabold text-white">Free</div>
                    : <div><span className="text-3xl font-extrabold text-white">₦{plan.price.toLocaleString()}</span><span className="text-slate-400 text-sm">/mo</span></div>
                  }
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-black/20 border border-white/10 rounded-full px-3 py-1">
                    <Zap size={12} className="text-viper-green" />
                    <span className="text-xs font-mono text-slate-300">{plan.credits} calls/mo</span>
                  </div>
                </div>

                {/* Features */}
                <div className="px-5 py-4 flex-1 space-y-2.5 bg-viper-surface/50">
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {(plan.features as any)[key]
                        ? <CheckCircle size={14} className="text-viper-green shrink-0" />
                        : <XCircle size={14} className="text-slate-700 shrink-0" />
                      }
                      <span className={(plan.features as any)[key] ? 'text-slate-300' : 'text-slate-600'}>{label}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="px-5 py-4 bg-viper-surface/30 border-t border-white/5">
                  <button
                    onClick={() => plan.price === 0 ? (window.location.href = user ? '/dashboard' : '/register') : handleSubscribe(plan.key)}
                    disabled={loading === plan.key}
                    className={`w-full py-2.5 rounded-xl text-sm transition-all ${plan.btn} disabled:opacity-50`}>
                    {loading === plan.key ? 'Redirecting...' : plan.price === 0 ? 'Start Free' : 'Subscribe via Paystack'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Credit top-up packs */}
          <div className="bg-viper-surface border border-viper-border rounded-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Need More Credits? Top Up</h2>
              <p className="text-slate-400 text-sm">Buy extra credits without changing your plan. They stack on top of your monthly allocation.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {CREDIT_PACKS.map(pack => (
                <div key={pack.key} className={`border ${pack.color} rounded-xl p-6 flex flex-col items-center text-center gap-4`}>
                  <div>
                    <div className="text-3xl font-extrabold text-white">{pack.credits}</div>
                    <div className="text-slate-400 text-sm mt-1">extra API calls</div>
                  </div>
                  <div className="text-xl font-bold text-white">₦{pack.price.toLocaleString()}</div>
                  <button
                    onClick={() => handleBuyCredits(pack.key)}
                    disabled={loading === pack.key}
                    className={`w-full py-2.5 rounded-xl text-sm transition-all ${pack.btn} disabled:opacity-50`}>
                    {loading === pack.key ? 'Redirecting...' : 'Buy Credits'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-16 grid md:grid-cols-2 gap-6">
            {[
              { q: 'What happens when my credits run out?', a: 'Your API calls will return a 429 error. You can buy a top-up pack instantly without changing your plan.' },
              { q: 'Do credits roll over to next month?', a: 'No. Monthly plan credits reset each billing cycle. Purchased top-up credits do not expire.' },
              { q: 'Can I switch plans anytime?', a: 'Yes. Upgrading takes effect immediately. Your new credit limit applies right away.' },
              { q: 'What payment methods does Paystack support?', a: 'Cards (Visa/Mastercard), bank transfers, USSD, and mobile money — all in Naira.' },
            ].map(faq => (
              <div key={faq.q} className="bg-viper-surface border border-viper-border rounded-xl p-6">
                <h3 className="text-white font-semibold mb-2 text-sm">{faq.q}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
