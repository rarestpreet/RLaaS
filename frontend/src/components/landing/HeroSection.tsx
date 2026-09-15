import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Zap, 
  Terminal, 
  Key, 
  ShieldAlert, 
  CheckCircle2, 
  Gauge, 
  ArrowDown, 
  ExternalLink 
} from 'lucide-react';

interface HeroSectionProps {
  onScrollToTest: () => void;
  onNavigateKeys: () => void;
  onOpenAuth: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onScrollToTest,
  onNavigateKeys,
  onOpenAuth,
}) => {
  const { isAuthenticated } = useAuth();

  const handleKeyAction = () => {
    if (isAuthenticated) {
      onNavigateKeys();
    } else {
      onOpenAuth();
    }
  };

  return (
    <section className="relative w-full pt-12 pb-16 overflow-hidden">
      {/* Top Ambient Glow Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-gradient-to-b from-[#f97316]/15 via-[#fb923c]/5 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center text-center">
        {/* Status Pill with Xms Latency */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#18181b] border border-white/[0.1] shadow-lg mb-6">
          <span className="w-2 h-2 rounded-full bg-[#f97316] animate-pulse"></span>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#fb923c]">
            ⚡ Distributed Edge Token Buckets
          </span>
          <span className="w-1 h-1 rounded-full bg-[#71717a]"></span>
          <span className="text-xs font-mono text-[#fafafa]">
            Latency: <strong className="text-[#4edea3]">Xms Evaluation</strong>
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="font-sans text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#fafafa] max-w-4xl leading-[1.15]">
          High-Concurrency{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] via-[#fb923c] to-[#ffb690]">
            Rate Limiting as a Service
          </span>{' '}
          for Modern Microservices
        </h1>

        {/* Sub-headline */}
        <p className="mt-6 text-base sm:text-lg text-[#a1a1aa] max-w-2xl leading-relaxed">
          Decouple throttling and quota enforcement from your application instances. Evaluate distributed Token Buckets and Anchored Windows at Redis speed with full RFC 6585 compliance.
        </p>

        {/* Main Call to Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onScrollToTest}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-[#f97316] hover:bg-[#fb923c] active:bg-[#ea580c] text-[#09090b] shadow-[0_0_24px_-4px_rgba(249,115,22,0.45)] transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Quick Test Service</span>
            <ArrowDown className="w-4 h-4" />
          </button>

          <button
            onClick={handleKeyAction}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-[#18181b] hover:bg-[#27272a] text-[#fafafa] border border-white/[0.12] transition-all transform hover:-translate-y-0.5 cursor-pointer shadow-md"
          >
            <Key className="w-4 h-4 text-[#f97316]" />
            <span>{isAuthenticated ? 'Open API Key Studio' : 'Generate API Key (Sign In)'}</span>
          </button>
        </div>

        {/* Micro Telemetry Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-[#a1a1aa] font-mono">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#4edea3]" />
            <span>Zero Cold Starts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-[#fb923c]" />
            <span>Atomic Redis Lua Scripts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-[#4edea3]" />
            <span>Fail-Open Resiliency</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-[#a1a1aa]" />
            <span>RFC 6585 Headers</span>
          </div>
        </div>
      </div>
    </section>
  );
};
