import React, { useState } from 'react';
import { testRateLimitDirect, trialRateLimitCheck } from '../../api/gateway';
import { DecisionResult, TestRateLimitRequest, TrialRateLimitRequest } from '../../types/gateway';
import { useAuth } from '../../context/AuthContext';
import { 
  Play, 
  Zap, 
  RotateCcw, 
  Flame, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Cpu,
  Key,
  Globe,
  Sparkles,
  Lock,
  Unlock
} from 'lucide-react';

export const QuickTestBench: React.FC = () => {
  const { isAuthenticated, customer } = useAuth();
  const [testMode, setTestMode] = useState<'free' | 'trial'>('free');
  const [trialApiKey, setTrialApiKey] = useState<string>('');
  
  const [algorithmType, setAlgorithmType] = useState<'TOKEN_BUCKET' | 'ANCHORED_WINDOW'>('TOKEN_BUCKET');
  const [bucketKey, setBucketKey] = useState<string>('test:dev:user_42');
  const [capacity, setCapacity] = useState<number>(5);
  const [refillRate, setRefillRate] = useState<number>(1);
  const [refillIntervalMs, setRefillIntervalMs] = useState<number>(1000);
  const [windowMs, setWindowMs] = useState<number>(60000);
  const [windowLimit, setWindowLimit] = useState<number>(10);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<DecisionResult | null>(null);
  const [eventHistory, setEventHistory] = useState<DecisionResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const executeRateLimitCall = async (): Promise<DecisionResult> => {
    if (testMode === 'trial') {
      const payload: TrialRateLimitRequest = {
        bucketKey,
        algorithmType,
        ...(algorithmType === 'TOKEN_BUCKET'
          ? {
              capacity: Number(capacity),
              refillRate: Number(refillRate),
              refillIntervalMs: Number(refillIntervalMs),
              ttlMs: 60000,
            }
          : {
              limit: Number(windowLimit),
              windowMs: Number(windowMs),
            }),
      };
      return await trialRateLimitCheck(payload, {
        apiKey: trialApiKey.trim() || undefined,
      });
    } else {
      const payload: TestRateLimitRequest = {
        bucketKey,
        algorithmType,
        config: algorithmType === 'TOKEN_BUCKET'
          ? {
              capacity: Number(capacity),
              refillRate: Number(refillRate),
              refillIntervalMs: Number(refillIntervalMs),
              ttlMs: 60000,
            }
          : {
              limit: Number(windowLimit),
              windowMs: Number(windowMs),
            },
      };
      return await testRateLimitDirect(payload);
    }
  };

  const handleTestSingle = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await executeRateLimitCall();
      setLastResult(result);
      setEventHistory(prev => [result, ...prev.slice(0, 9)]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBurstTest = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    for (let i = 0; i < 5; i++) {
      try {
        const result = await executeRateLimitCall();
        setLastResult(result);
        setEventHistory(prev => [result, ...prev.slice(0, 14)]);
      } catch (err: any) {
        setErrorMessage(err.message || 'Burst request failed');
        break;
      }
      // Brief stagger
      await new Promise(r => setTimeout(r, 80));
    }
    setIsLoading(false);
  };

  const handleConcurrentTest = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const promises = Array.from({ length: 5 }, () => executeRateLimitCall());
      const results = await Promise.all(promises);
      if (results.length > 0) {
        setLastResult(results[results.length - 1]);
        setEventHistory(prev => [...results.reverse(), ...prev].slice(0, 15));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Concurrent request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetKey = () => {
    const newRandomId = Math.floor(1000 + Math.random() * 9000);
    setBucketKey(`test:dev:user_${newRandomId}`);
    setLastResult(null);
    setErrorMessage(null);
  };

  return (
    <section id="quick-test-section" className="w-full py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-[#1f1f21] text-[#fb923c] font-semibold border border-white/[0.08]">
            Interactive Test Console
          </span>
          <span className="text-xs font-mono text-[#a1a1aa]">
            {testMode === 'free' ? 'Public Free Demo (IP-Scoped)' : 'Trial Sandbox (Auth Token / API Key)'}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#fafafa]">
          Rate Limiter Testing Engine
        </h2>
        <p className="text-sm text-[#a1a1aa] max-w-3xl">
          {testMode === 'free' ? (
            <>
              Testing against public <code className="text-[#fb923c] bg-[#18181b] px-1.5 py-0.5 rounded text-xs">POST /test/rate-limit/check</code>. No authentication required (visitor IP scoped with safe boundaries).
            </>
          ) : (
            <>
              Testing against trial <code className="text-[#fb923c] bg-[#18181b] px-1.5 py-0.5 rounded text-xs">POST /v1/trial/check</code>. Dual authentication via <code className="text-[#4edea3] bg-[#18181b] px-1 py-0.5 rounded text-xs">Authorization: Bearer</code> or <code className="text-[#fb923c] bg-[#18181b] px-1 py-0.5 rounded text-xs">X-API-Key</code>.
            </>
          )}
        </p>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setTestMode('free'); setErrorMessage(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              testMode === 'free'
                ? 'bg-[#f97316] text-[#09090b] font-semibold shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                : 'bg-[#18181b] text-[#a1a1aa] hover:text-[#fafafa] border border-white/[0.08]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Quick Free Test (Guest)</span>
          </button>

          <button
            type="button"
            onClick={() => { setTestMode('trial'); setErrorMessage(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              testMode === 'trial'
                ? 'bg-[#f97316] text-[#09090b] font-semibold shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                : 'bg-[#18181b] text-[#a1a1aa] hover:text-[#fafafa] border border-white/[0.08]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trial Test (Auth Token / API Key)</span>
          </button>
        </div>
      </div>

      {/* Trial Mode Authentication Banner */}
      {testMode === 'trial' && (
        <div className="mb-6 p-4 rounded-xl bg-[#131315] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isAuthenticated ? 'bg-[#4edea3]/15 text-[#4edea3]' : 'bg-[#fb923c]/15 text-[#fb923c]'}`}>
              {isAuthenticated ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#fafafa]">
                {isAuthenticated
                  ? `Authenticated Session Active: ${customer?.email || 'Customer'}`
                  : 'Trial Credentials Required'}
              </p>
              <p className="text-[11px] text-[#a1a1aa]">
                {isAuthenticated
                  ? 'Your session auth token is automatically attached. Or provide an X-API-Key below to test API key auth.'
                  : 'Enter an active API key below, or sign in to use your session token automatically.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 min-w-[280px]">
            <Key className="w-4 h-4 text-[#a1a1aa] flex-shrink-0" />
            <input
              type="text"
              placeholder={isAuthenticated ? "Optional X-API-Key override" : "Enter X-API-Key (e.g. rlaas_...)"}
              value={trialApiKey}
              onChange={e => setTrialApiKey(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#18181b] border border-white/[0.1] text-xs font-mono text-[#fafafa] focus:outline-none focus:border-[#f97316] placeholder-[#71717a]"
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-3 rounded-lg bg-[#f43f5e]/15 border border-[#f43f5e]/30 text-xs text-[#f43f5e] font-mono">
          {errorMessage}
        </div>
      )}

      {/* Main Grid: Parameters on Left, Live Telemetry Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Parameter Tuning */}
        <div className="lg:col-span-5 bg-[#18181b] border border-white/[0.08] rounded-xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <span className="text-sm font-semibold text-[#fafafa] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#f97316]" />
              Algorithm & Bucket Config
            </span>
            <button
              onClick={handleResetKey}
              title="Generate new bucket identifier to test fresh capacity"
              className="flex items-center gap-1 text-xs text-[#a1a1aa] hover:text-[#fb923c] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Key</span>
            </button>
          </div>

          {/* Algorithm Type Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#a1a1aa]">Algorithm Type</label>
            <div className="grid grid-cols-2 gap-2 bg-[#131315] p-1 rounded-lg border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setAlgorithmType('TOKEN_BUCKET')}
                className={`py-1.5 text-xs font-medium rounded transition-all ${
                  algorithmType === 'TOKEN_BUCKET'
                    ? 'bg-[#f97316] text-[#09090b] font-semibold shadow-sm'
                    : 'text-[#a1a1aa] hover:text-[#fafafa]'
                }`}
              >
                Token Bucket
              </button>
              <button
                type="button"
                onClick={() => setAlgorithmType('ANCHORED_WINDOW')}
                className={`py-1.5 text-xs font-medium rounded transition-all ${
                  algorithmType === 'ANCHORED_WINDOW'
                    ? 'bg-[#f97316] text-[#09090b] font-semibold shadow-sm'
                    : 'text-[#a1a1aa] hover:text-[#fafafa]'
                }`}
              >
                Anchored Window
              </button>
            </div>
          </div>

          {/* Bucket Target Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#a1a1aa]">Target Bucket Key (Redis Key)</label>
            <input
              type="text"
              value={bucketKey}
              onChange={e => setBucketKey(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-mono text-[#fafafa] focus:outline-none focus:border-[#f97316]"
            />
          </div>

          {/* Dynamic Inputs based on Algorithm */}
          {algorithmType === 'TOKEN_BUCKET' ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-medium text-[#a1a1aa]">Capacity</label>
                  <span className="text-[10px] text-[#71717a]">{testMode === 'free' ? '1-200' : '1-1000'}</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max={testMode === 'free' ? 200 : 1000}
                  value={capacity}
                  onChange={e => setCapacity(parseInt(e.target.value) || 1)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-mono text-[#fafafa] focus:outline-none focus:border-[#f97316]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-medium text-[#a1a1aa]">Refill Rate</label>
                  <span className="text-[10px] text-[#71717a]">{testMode === 'free' ? '1-50' : '1-500'}</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max={testMode === 'free' ? 50 : 500}
                  value={refillRate}
                  onChange={e => setRefillRate(parseInt(e.target.value) || 1)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-mono text-[#fafafa] focus:outline-none focus:border-[#f97316]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-medium text-[#a1a1aa]">Interval (ms)</label>
                  <span className="text-[10px] text-[#71717a]">{testMode === 'free' ? '500+' : '100+'}</span>
                </div>
                <input
                  type="number"
                  step="100"
                  min={testMode === 'free' ? 500 : 100}
                  value={refillIntervalMs}
                  onChange={e => setRefillIntervalMs(parseInt(e.target.value) || 1000)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-mono text-[#fafafa] focus:outline-none focus:border-[#f97316]"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-medium text-[#a1a1aa]">Window Limit</label>
                  <span className="text-[10px] text-[#71717a]">{testMode === 'free' ? '1-500' : '1-10000'}</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max={testMode === 'free' ? 500 : 10000}
                  value={windowLimit}
                  onChange={e => setWindowLimit(parseInt(e.target.value) || 1)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-mono text-[#fafafa] focus:outline-none focus:border-[#f97316]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-medium text-[#a1a1aa]">Window (ms)</label>
                  <span className="text-[10px] text-[#71717a]">{testMode === 'free' ? '1s-5m' : '1s-1h'}</span>
                </div>
                <input
                  type="number"
                  step="1000"
                  min="1000"
                  max={testMode === 'free' ? 300000 : 3600000}
                  value={windowMs}
                  onChange={e => setWindowMs(parseInt(e.target.value) || 60000)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-mono text-[#fafafa] focus:outline-none focus:border-[#f97316]"
                />
              </div>
            </div>
          )}

          {/* Test Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              onClick={handleTestSingle}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#f97316] hover:bg-[#fb923c] active:bg-[#ea580c] text-[#09090b] font-semibold text-xs transition-all shadow-[0_0_16px_-2px_rgba(249,115,22,0.35)] disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>1 Request</span>
            </button>

            <button
              onClick={handleBurstTest}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#27272a] hover:bg-[#353437] text-[#fafafa] font-semibold text-xs border border-white/[0.1] transition-all disabled:opacity-50 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-[#fb923c]" />
              <span>Burst (5x)</span>
            </button>

            <button
              onClick={handleConcurrentTest}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#1f1f21] hover:bg-[#2a2a2c] text-[#4edea3] font-semibold text-xs border border-[#4edea3]/30 transition-all shadow-[0_0_12px_-2px_rgba(78,222,163,0.2)] disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-[#4edea3]" />
              <span>Concurrent (5x)</span>
            </button>
          </div>
        </div>

        {/* Right Col: Visual Response & Live Decision Stream */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Top Live Decision Card */}
          <div className="bg-[#18181b] border border-white/[0.08] rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <span className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider">
                Current Bucket State
              </span>
              <span className="text-xs font-mono text-[#fb923c]">
                Live Evaluation Latency: <strong className="text-[#fafafa]">{lastResult?.latencyMs ?? 'X'}ms</strong>
              </span>
            </div>

            {lastResult ? (
              <div className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Decision Badge */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      lastResult.decision === 'ALLOW'
                        ? 'bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/40'
                        : 'bg-[#f43f5e]/20 text-[#f43f5e] border border-[#f43f5e]/40'
                    }`}
                  >
                    {lastResult.decision === 'ALLOW' ? (
                      <CheckCircle className="w-7 h-7" />
                    ) : (
                      <XCircle className="w-7 h-7" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-mono text-[#a1a1aa]">HTTP Decision</span>
                    <span
                      className={`text-xl font-bold font-mono ${
                        lastResult.decision === 'ALLOW' ? 'text-[#4edea3]' : 'text-[#f43f5e]'
                      }`}
                    >
                      {lastResult.decision === 'ALLOW' ? '200 ALLOW' : '429 THROTTLED'}
                    </span>
                  </div>
                </div>

                {/* Tokens Remaining */}
                <div className="flex items-center gap-4 bg-[#131315] px-4 py-2.5 rounded-lg border border-white/[0.06]">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono text-[#a1a1aa]">Remaining Allowance</span>
                    <span className="text-lg font-bold font-mono text-[#fb923c]">
                      {lastResult.remaining} tokens
                    </span>
                  </div>
                  {lastResult.retryAfterSeconds !== undefined && lastResult.retryAfterSeconds > 0 && (
                    <div className="flex flex-col pl-4 border-l border-white/[0.08]">
                      <span className="text-[11px] font-mono text-[#a1a1aa]">Retry-After</span>
                      <span className="text-lg font-bold font-mono text-[#f43f5e]">
                        {lastResult.retryAfterSeconds}s
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center text-[#71717a]">
                <Clock className="w-8 h-8 mb-2 opacity-50 text-[#a1a1aa]" />
                <span className="text-xs font-mono">No request sent yet. Click "1 Request" to evaluate!</span>
              </div>
            )}
          </div>

          {/* Event Stream Log Table */}
          <div className="bg-[#18181b] border border-white/[0.08] rounded-xl p-4 shadow-lg flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
              <span className="text-xs font-mono text-[#a1a1aa] uppercase tracking-wider">
                Event Buffer (Last {eventHistory.length} Calls)
              </span>
              {eventHistory.length > 0 && (
                <button
                  onClick={() => setEventHistory([])}
                  className="text-[10px] font-mono text-[#a1a1aa] hover:text-[#fb923c]"
                >
                  Clear Buffer
                </button>
              )}
            </div>

            {eventHistory.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#71717a] font-mono">
                Awaiting edge events...
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {eventHistory.map((ev, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded bg-[#131315] border border-white/[0.04] text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          ev.decision === 'ALLOW'
                            ? 'bg-[#4edea3]/15 text-[#4edea3]'
                            : 'bg-[#f43f5e]/15 text-[#f43f5e]'
                        }`}
                      >
                        {ev.decision}
                      </span>
                      <span className="text-[#a1a1aa] truncate max-w-[140px] sm:max-w-[200px]">
                        {ev.bucketKey}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#fb923c]">rem: {ev.remaining}</span>
                      <span className="text-[#71717a]">{ev.latencyMs ?? 'X'}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
