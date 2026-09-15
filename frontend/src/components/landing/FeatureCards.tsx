import React from 'react';
import { Layers, Shield, KeyRound, Cpu } from 'lucide-react';

export const FeatureCards: React.FC = () => {
  const features = [
    {
      icon: Cpu,
      title: 'Token Bucket Algorithm',
      description:
        'Continuous fractional refills with burst capacity control executed atomically via Redis Lua scripts without concurrency race conditions.',
      tag: 'BURST TOLERANT',
    },
    {
      icon: Layers,
      title: 'Anchored Window Counter',
      description:
        'Fixed wall-clock boundaries with deterministic reset intervals. Ideal for hourly and daily API consumption quotas.',
      tag: 'QUOTA COMPLIANT',
    },
    {
      icon: KeyRound,
      title: 'Polymorphic Key Strategies',
      description:
        'Extract rate limiting target identity dynamically by Client IP, Authenticated User ID, API Key hash, or Custom Header headers.',
      tag: 'MULTI-TENANT',
    },
    {
      icon: Shield,
      title: 'Resilient Fail Modes',
      description:
        'Configure per-policy behavior when Redis or edge network encounters transient faults: gracefully degrade via FAIL_OPEN or strictly protect via FAIL_CLOSED.',
      tag: 'CIRCUIT SAFE',
    },
  ];

  return (
    <section className="w-full py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
      <div className="flex flex-col items-center text-center mb-10">
        <span className="text-xs font-mono uppercase tracking-widest text-[#fb923c] mb-2 font-semibold">
          Engineered for Technical Operators
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#fafafa] tracking-tight">
          Centralized Policy Decisions, Distributed Enforcement
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-xl bg-[#18181b] border border-white/[0.08] hover:border-[#f97316]/40 flex flex-col justify-between transition-all group hover:bg-[#1f1f21]"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#131315] border border-white/[0.08] flex items-center justify-center text-[#f97316] group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#131315] text-[#a1a1aa] border border-white/[0.06] font-semibold">
                    {feat.tag}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[#fafafa] mb-2">{feat.title}</h3>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">{feat.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-1.5 text-[11px] font-mono text-[#fb923c]">
                <span>Ready for edge runtime</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
