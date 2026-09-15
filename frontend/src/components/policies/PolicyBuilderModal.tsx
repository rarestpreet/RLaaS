import React, { useState } from 'react';
import { createPolicy } from '../../api/policies';
import { AlgorithmType, CreatePolicyRequest, FailMode, KeyStrategyType, Policy } from '../../types/policy';
import { Layers, X, AlertCircle, ShieldAlert, Cpu } from 'lucide-react';

interface PolicyBuilderModalProps {
  isOpen: boolean;
  projectId: string;
  projectName: string;
  onClose: () => void;
  onPolicyCreated: (policy: Policy) => void;
}

export const PolicyBuilderModal: React.FC<PolicyBuilderModalProps> = ({
  isOpen,
  projectId,
  projectName,
  onClose,
  onPolicyCreated,
}) => {
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [algorithmType, setAlgorithmType] = useState<AlgorithmType>('TOKEN_BUCKET');

  // Token Bucket fields
  const [capacity, setCapacity] = useState<number>(20);
  const [refillRate, setRefillRate] = useState<number>(5);
  const [refillIntervalMs, setRefillIntervalMs] = useState<number>(1000);
  const [ttlMs, setTtlMs] = useState<number>(60000);

  // Anchored Window fields
  const [windowLimit, setWindowLimit] = useState<number>(100);
  const [windowMs, setWindowMs] = useState<number>(60000);

  // Key Strategy & FailMode
  const [keyStrategyType, setKeyStrategyType] = useState<KeyStrategyType>('IP');
  const [customHeaderName, setCustomHeaderName] = useState('X-Client-Id');
  const [failMode, setFailMode] = useState<FailMode>('FAIL_OPEN');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: CreatePolicyRequest = {
      name,
      endpoint: endpoint.startsWith('/') ? endpoint : `/${endpoint}`,
      algorithmType,
      algorithmConfig: algorithmType === 'TOKEN_BUCKET'
        ? {
            capacity: Number(capacity),
            refillRate: Number(refillRate),
            refillIntervalMs: Number(refillIntervalMs),
            ttlMs: Number(ttlMs),
          }
        : {
            limit: Number(windowLimit),
            windowMs: Number(windowMs),
          },
      keyStrategy: keyStrategyType === 'CUSTOM'
        ? { type: 'CUSTOM', headerName: customHeaderName }
        : { type: keyStrategyType },
      failMode,
    };

    try {
      const created = await createPolicy(projectId, payload);
      onPolicyCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create rate limiting policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="w-full max-w-xl bg-[#18181b] border border-white/[0.12] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#f97316]/20 border border-[#f97316]/40 flex items-center justify-center text-[#f97316]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#fafafa]">Create Rate Limit Policy</h3>
              <span className="text-[11px] text-[#fb923c] font-mono">Target Project: {projectName}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#a1a1aa] hover:text-[#fafafa] p-1 rounded-lg hover:bg-[#27272a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[#93000a]/20 border border-[#f43f5e]/40 text-xs text-[#ffdad6] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#f43f5e] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          {/* Policy Name & Endpoint */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#a1a1aa]">Policy Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Checkout Strict Throttle"
                value={name}
                onChange={e => setName(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-sans text-[#fafafa] focus:outline-none focus:border-[#f97316]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#a1a1aa]">Endpoint Path</label>
              <input
                type="text"
                required
                placeholder="e.g. /api/v1/payments/checkout"
                value={endpoint}
                onChange={e => setEndpoint(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-mono text-[#fafafa] focus:outline-none focus:border-[#f97316]"
              />
            </div>
          </div>

          {/* Algorithm Choice */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="font-medium text-[#a1a1aa]">Rate Limiting Algorithm</label>
            <div className="grid grid-cols-2 gap-2 bg-[#131315] p-1 rounded-lg border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setAlgorithmType('TOKEN_BUCKET')}
                className={`py-2 rounded text-xs font-medium transition-all ${
                  algorithmType === 'TOKEN_BUCKET'
                    ? 'bg-[#f97316] text-[#09090b] font-semibold'
                    : 'text-[#a1a1aa] hover:text-[#fafafa]'
                }`}
              >
                Token Bucket (Burst & Refill)
              </button>
              <button
                type="button"
                onClick={() => setAlgorithmType('ANCHORED_WINDOW')}
                className={`py-2 rounded text-xs font-medium transition-all ${
                  algorithmType === 'ANCHORED_WINDOW'
                    ? 'bg-[#f97316] text-[#09090b] font-semibold'
                    : 'text-[#a1a1aa] hover:text-[#fafafa]'
                }`}
              >
                Anchored Window (Fixed Quota)
              </button>
            </div>
          </div>

          {/* Algorithm Specific Parameters */}
          {algorithmType === 'TOKEN_BUCKET' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#131315] border border-white/[0.06]">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#a1a1aa] font-mono uppercase">Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={e => setCapacity(parseInt(e.target.value) || 1)}
                  className="px-2 py-1.5 rounded bg-[#18181b] border border-white/[0.1] text-xs font-mono text-[#fafafa]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#a1a1aa] font-mono uppercase">Refill Rate</label>
                <input
                  type="number"
                  min="1"
                  value={refillRate}
                  onChange={e => setRefillRate(parseInt(e.target.value) || 1)}
                  className="px-2 py-1.5 rounded bg-[#18181b] border border-white/[0.1] text-xs font-mono text-[#fafafa]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#a1a1aa] font-mono uppercase">Interval (ms)</label>
                <input
                  type="number"
                  step="100"
                  min="100"
                  value={refillIntervalMs}
                  onChange={e => setRefillIntervalMs(parseInt(e.target.value) || 1000)}
                  className="px-2 py-1.5 rounded bg-[#18181b] border border-white/[0.1] text-xs font-mono text-[#fafafa]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#a1a1aa] font-mono uppercase">Bucket TTL (ms)</label>
                <input
                  type="number"
                  step="1000"
                  min="1000"
                  value={ttlMs}
                  onChange={e => setTtlMs(parseInt(e.target.value) || 60000)}
                  className="px-2 py-1.5 rounded bg-[#18181b] border border-white/[0.1] text-xs font-mono text-[#fafafa]"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#131315] border border-white/[0.06]">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#a1a1aa] font-mono uppercase">Window Limit</label>
                <input
                  type="number"
                  min="1"
                  value={windowLimit}
                  onChange={e => setWindowLimit(parseInt(e.target.value) || 1)}
                  className="px-2.5 py-1.5 rounded bg-[#18181b] border border-white/[0.1] text-xs font-mono text-[#fafafa]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#a1a1aa] font-mono uppercase">Window Duration (ms)</label>
                <input
                  type="number"
                  step="1000"
                  min="1000"
                  value={windowMs}
                  onChange={e => setWindowMs(parseInt(e.target.value) || 60000)}
                  className="px-2.5 py-1.5 rounded bg-[#18181b] border border-white/[0.1] text-xs font-mono text-[#fafafa]"
                />
              </div>
            </div>
          )}

          {/* Key Strategy */}
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-[#a1a1aa]">Key Extraction Strategy</label>
            <div className="grid grid-cols-4 gap-1.5 bg-[#131315] p-1 rounded-lg border border-white/[0.06]">
              {(['IP', 'USER', 'API_KEY', 'CUSTOM'] as KeyStrategyType[]).map(strategy => (
                <button
                  key={strategy}
                  type="button"
                  onClick={() => setKeyStrategyType(strategy)}
                  className={`py-1.5 text-xs font-mono rounded transition-all ${
                    keyStrategyType === strategy
                      ? 'bg-[#27272a] text-[#fb923c] font-bold shadow-sm'
                      : 'text-[#a1a1aa] hover:text-[#fafafa]'
                  }`}
                >
                  {strategy}
                </button>
              ))}
            </div>
            {keyStrategyType === 'CUSTOM' && (
              <div className="mt-1 flex flex-col gap-1">
                <label className="text-[11px] text-[#a1a1aa]">Custom HTTP Header Name</label>
                <input
                  type="text"
                  required
                  value={customHeaderName}
                  onChange={e => setCustomHeaderName(e.target.value)}
                  placeholder="X-Tenant-Id"
                  className="px-3 py-1.5 rounded bg-[#131315] border border-white/[0.1] text-xs font-mono text-[#fafafa]"
                />
              </div>
            )}
          </div>

          {/* Fail Mode */}
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-[#a1a1aa]">Failure Semantics (When Redis is degraded)</label>
            <div className="grid grid-cols-2 gap-2">
              <label
                onClick={() => setFailMode('FAIL_OPEN')}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  failMode === 'FAIL_OPEN'
                    ? 'bg-[#4edea3]/10 border-[#4edea3]/40 text-[#fafafa]'
                    : 'bg-[#131315] border-white/[0.08] text-[#a1a1aa]'
                }`}
              >
                <input
                  type="radio"
                  name="failMode"
                  checked={failMode === 'FAIL_OPEN'}
                  onChange={() => setFailMode('FAIL_OPEN')}
                  className="mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-[#4edea3]">FAIL_OPEN</span>
                  <span className="text-[10px] text-[#a1a1aa]">Allow request to proceed if Redis times out.</span>
                </div>
              </label>

              <label
                onClick={() => setFailMode('FAIL_CLOSED')}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  failMode === 'FAIL_CLOSED'
                    ? 'bg-[#f43f5e]/10 border-[#f43f5e]/40 text-[#fafafa]'
                    : 'bg-[#131315] border-white/[0.08] text-[#a1a1aa]'
                }`}
              >
                <input
                  type="radio"
                  name="failMode"
                  checked={failMode === 'FAIL_CLOSED'}
                  onChange={() => setFailMode('FAIL_CLOSED')}
                  className="mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-[#f43f5e]">FAIL_CLOSED</span>
                  <span className="text-[10px] text-[#a1a1aa]">Strictly reject (429) if Redis is unreachable.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#27272a] hover:bg-[#353437] text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !endpoint.trim()}
              className="px-5 py-2 rounded-lg bg-[#f97316] hover:bg-[#fb923c] text-xs font-semibold text-[#09090b] shadow-[0_0_16px_-2px_rgba(249,115,22,0.4)] transition-all disabled:opacity-50"
            >
              {loading ? 'Creating Policy...' : 'Save & Deploy Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
