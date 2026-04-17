import { Link } from 'wouter';
import { Zap } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-viper-dark flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-viper-green/10 border border-viper-green/30 flex items-center justify-center mx-auto mb-6">
          <Zap size={36} className="text-viper-green" />
        </div>
        <h1 className="text-6xl font-extrabold font-mono text-white mb-2">404</h1>
        <p className="text-slate-400 mb-8">This page does not exist or was moved.</p>
        <Link href="/" className="bg-viper-green text-black font-bold px-6 py-3 rounded-xl hover:bg-green-400 transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
