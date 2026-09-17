import React, { useState, useEffect } from 'react';
import { testRateLimitDirect, trialRateLimitCheck } from '../../api/gateway';
import { createApiKey } from '../../api/apiKeys';
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
  Unlock,
  Info,
  HelpCircle,
  AlertCircle,
  X,
  Layers,
  Trash2
} from 'lucide-react';

interface QuickTestBenchProps {
  onOpenAuth?: (tab?: 'login' | 'register') => void;
}

interface BatchSummary {
  runType: '1 Request' | 'Burst' | 'Concurrent';
  totalReqMade: number;
  reqAllowed: number;
  reqDenied: number;
  avgLatencyMs: number;
  timestamp: string;
}

interface TestBatchRun {
  id: string;
  runType: '1 Request' | 'Burst' | 'Concurrent';
  total: number;
  allowed: number;
  denied: number;
  timestamp: string;
  results: DecisionResult[];
}

// Hover Tooltip Component for parameters
const ParamTooltip: React.FC<{ title: string; desc: string }> = ({ title, desc }) => {
  return (
    <span className="group relative inline-flex items-center ml-1 cursor-help">
      <Info className="w-3 h-3 text-[#71717a] group-hover:text-[#fb923c] transition-colors" />
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:flex flex-col w-56 p-2 rounded-lg bg-[#18181b] border border-white/[0.15] text-[11px] text-[#e4e4e7] shadow-2xl z-30 pointer-events-none transition-all font-sans font-normal normal-case">
        <span className="font-semibold text-[#fb923c] mb-0.5">{title}</span>
        <span className="text-[#a1a1aa] leading-tight">{desc}</span>
      </span>
    </span>
  );
};

// Tooltip Component for the 'rem' field
const RemTooltipBadge: React.FC<{ remaining: number }> = ({ remaining }) => {
  return (
    <span className="group relative inline-flex items-center">
      <span className="text-[#fb923c] underline decoration-dotted decoration-[#fb923c]/50 underline-offset-2 cursor-help font-mono font-medium">
        rem: {remaining}
      </span>
      <span className="absolute right-0 bottom-full mb-1.5 hidden group-hover:flex flex-col w-52 p-2 rounded-lg bg-[#1c1c1f] border border-white/[0.15] text-[11px] text-[#e4e4e7] shadow-2xl z-30 pointer-events-none font-sans font-normal normal-case">
        <span className="font-semibold text-[#fb923c] mb-0.5">Remaining Allowance</span>
        <span className="text-[#a1a1aa] leading-tight">
          Number of tokens or requests remaining in the bucket/window before subsequent calls are throttled.
        </span>
      </span>
    </span>
  );
};

// Explanatory badge for why Ephemeral Keys have a short TTL
const WhyLowTtlBadge: React.FC = () => {
  return (
    <div className="group relative inline-flex items-center cursor-pointer">
      <HelpCircle className="w-3.5 h-3.5 text-[#a1a1aa] group-hover:text-[#fb923c] transition-colors" />
      <div className="absolute right-0 top-full mt-2 hidden group-hover:flex flex-col w-72 p-3 rounded-xl bg-[#1c1c20] border border-white/[0.15] text-[11px] shadow-2xl z-40 pointer-events-none text-left">
        <span className="font-bold text-[#fafafa] mb-1.5 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#f97316]" />
          Why a 10 Min Ephemeral TTL?
        </span>
        <ul className="text-[#a1a1aa] space-y-1.5 leading-normal list-disc pl-3">
          <li><strong className="text-[#fafafa]">Sandbox Isolation:</strong> Minimizes blast radius by preventing exposure of permanent secrets in browser storage or shared demo recordings.</li>
          <li><strong className="text-[#fafafa]">Zero Clutter:</strong> Automatically expires so temporary benchmarking keys do not crowd your active production dashboard.</li>
          <li><strong className="text-[#fafafa]">Playground Stress-Testing:</strong> Full multi-tenant Redis throughput validation without managing long-term credential rotation.</li>
        </ul>
      </div>
    </div>
  );
};

export const QuickTestBench: React.FC<QuickTestBenchProps> = ({ onOpenAuth }) => {
  const { isAuthenticated, user } = useAuth();
  const [testMode, setTestMode] = useState<'free' | 'trial'>('free');
  const [trialApiKey, setTrialApiKey] = useState<string>('');

  // Algorithm Configurations
  const [algorithmType, setAlgorithmType] = useState<'TOKEN_BUCKET' | 'ANCHORED_WINDOW'>('TOKEN_BUCKET');
  const [bucketKey, setBucketKey] = useState<string>('test:dev:user_42');
  const [capacity, setCapacity] = useState<number>(5);
  const [refillRate, setRefillRate] = useState<number>(1);
  const [refillIntervalMs, setRefillIntervalMs] = useState<number>(1000);
  const [windowMs, setWindowMs] = useState<number>(60000);
  const [windowLimit, setWindowLimit] = useState<number>(10);

  // Request Batch Count Configuration (configurable for checking concurrency)
  const [requestCount, setRequestCount] = useState<number>(10);

  // User-decided Fail-Safe Action when Redis/backend services are down
  const [failMode, setFailMode] = useState<'FAIL_CLOSED' | 'FAIL_OPEN'>('FAIL_CLOSED');

  // Execution & Results State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const [testBatches, setTestBatches] = useState<TestBatchRun[]>([]);
  const [autoClearBuffer, setAutoClearBuffer] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ephemeral key generation state
  const [isGeneratingKey, setIsGeneratingKey] = useState<boolean>(false);
  const [ephemeralKeyFeedback, setEphemeralKeyFeedback] = useState<string | null>(null);

  // Short TTL Popup for Auth/Key Required Notifications
  const [authPopup, setAuthPopup] = useState<{ message: string; ttlSeconds: number } | null>(null);

  // Auto-dismiss short-TTL auth popup
  useEffect(() => {
    if (!authPopup) return;
    const timer = setTimeout(() => {
      setAuthPopup(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [authPopup]);

  const showAuthNotification = (message: string) => {
    setAuthPopup({ message, ttlSeconds: 5 });
  };

  const handleGenerateEphemeralKey = async () => {
    if (!isAuthenticated) {
      showAuthNotification("Sign in or register a free account to automatically generate a 10-minute ephemeral trial key.");
      if (onOpenAuth) onOpenAuth('register');
      return;
    }

    setIsGeneratingKey(true);
    setErrorMessage(null);
    try {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const resp = await createApiKey({
        name: `Ephemeral Sandbox Key (10m TTL)`,
        expiresAt,
      });

      setTrialApiKey(resp.rawKey || '');
      setEphemeralKeyFeedback("10-minute ephemeral trial key generated & attached!");
      setTimeout(() => setEphemeralKeyFeedback(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate ephemeral API key.");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const executeRateLimitCall = async (): Promise<DecisionResult> => {
    if (testMode === 'trial') {
      const payload: TrialRateLimitRequest = {
        bucketKey,
        algorithmType,
        failMode,
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
        apiKey: trialApiKey?.trim() || undefined,
      });
    } else {
      const payload: TestRateLimitRequest = {
        bucketKey,
        algorithmType,
        failMode,
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

  // Helper to process and record batch test outcomes
  const recordBatchResults = (runType: '1 Request' | 'Burst' | 'Concurrent', results: DecisionResult[]) => {
    const totalReqMade = results.length;
    const reqAllowed = results.filter(r => r.decision === 'ALLOW').length;
    const reqDenied = results.filter(r => r.decision !== 'ALLOW').length;
    const totalLatency = results.reduce((acc, r) => acc + (r.latencyMs || 0), 0);
    const avgLatencyMs = totalReqMade > 0 ? Math.round((totalLatency / totalReqMade) * 100) / 100 : 0;
    const timestamp = new Date().toLocaleTimeString();

    const summary: BatchSummary = {
      runType,
      totalReqMade,
      reqAllowed,
      reqDenied,
      avgLatencyMs,
      timestamp,
    };
    setBatchSummary(summary);

    const newBatch: TestBatchRun = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      runType,
      total: totalReqMade,
      allowed: reqAllowed,
      denied: reqDenied,
      timestamp,
      results,
    };

    if (autoClearBuffer) {
      setTestBatches([newBatch]);
    } else {
      setTestBatches(prev => [newBatch, ...prev.slice(0, 19)]); // Keep up to 20 separated batches
    }
  };

  const validateTrialAuth = (): boolean => {
    if (testMode === 'trial' && !trialApiKey?.trim() && !isAuthenticated) {
      showAuthNotification("Trial testing requires authentication: please enter an API key or generate a 10-minute ephemeral key to test.");
      return false;
    }
    return true;
  };

  const handleTestSingle = async () => {
    if (!validateTrialAuth()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await executeRateLimitCall();
      recordBatchResults('1 Request', [result]);
    } catch (err: any) {
      if (err.isAuthError || err.status === 401 || err.status === 403) {
        showAuthNotification(err.message || "Authentication Required (401): Missing or invalid API key.");
      } else {
        setErrorMessage(err.message || 'Single request failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBurstTest = async () => {
    if (!validateTrialAuth()) return;

    const count = Math.max(1, Math.min(requestCount || 10, 100));
    setIsLoading(true);
    setErrorMessage(null);

    const results: DecisionResult[] = [];
    try {
      for (let i = 0; i < count; i++) {
        const result = await executeRateLimitCall();
        results.push(result);
        if (i < count - 1) {
          // Brief stagger between sequential calls
          await new Promise(r => setTimeout(r, 60));
        }
      }
      recordBatchResults('Burst', results);
    } catch (err: any) {
      if (err.isAuthError || err.status === 401 || err.status === 403) {
        showAuthNotification(err.message || "Authentication Required (401): Missing or invalid API key.");
      } else {
        setErrorMessage(err.message || 'Burst execution interrupted');
        if (results.length > 0) {
          recordBatchResults('Burst', results);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConcurrentTest = async () => {
    if (!validateTrialAuth()) return;

    const count = Math.max(1, Math.min(requestCount || 10, 100));
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const promises = Array.from({ length: count }, () => executeRateLimitCall());
      const results = await Promise.all(promises);
      recordBatchResults('Concurrent', results);
    } catch (err: any) {
      if (err.isAuthError || err.status === 401 || err.status === 403) {
        showAuthNotification(err.message || "Authentication Required (401): Missing or invalid API key.");
      } else {
        setErrorMessage(err.message || 'Concurrent requests failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetKey = () => {
    const newRandomId = Math.floor(1000 + Math.random() * 9000);
    setBucketKey(`test:dev:user_${newRandomId}`);
    setErrorMessage(null);
  };

  return (
    <section id="quick-test-section" className="w-full py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative">
      {/* Short TTL Popup / Toast for Real Auth Reasons */}
      {authPopup && (
        <div className="fixed top-20 right-6 z-50 max-w-md w-full p-4 rounded-xl bg-[#1c1315] border border-[#f43f5e]/40 shadow-[0_10px_30px_rgba(244,63,94,0.25)] flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-2 rounded-lg bg-[#f43f5e]/20 text-[#f43f5e] flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[#fafafa] font-mono">Authentication Required</span>
              <span className="text-[10px] text-[#a1a1aa] font-mono">Auto-dismissing...</span>
            </div>
            <p className="text-[#d4d4d8] leading-relaxed mb-3">
              {authPopup.message}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateEphemeralKey}
                disabled={isGeneratingKey}
                className="px-2.5 py-1 rounded bg-[#f97316] text-[#09090b] font-semibold text-[11px] hover:bg-[#fb923c] transition-colors"
              >
                {isAuthenticated ? "Generate 10m Key" : "Sign In / Register"}
              </button>
              <button
                type="button"
                onClick={() => setAuthPopup(null)}
                className="px-2 py-1 rounded bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] text-[11px]"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAuthPopup(null)}
            className="text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Modes */}
      <div className="flex flex-col gap-3 mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-[#1f1f21] text-[#fb923c] font-semibold border border-white/[0.08]">
            Interactive Test Console
          </span>
          <span className="text-xs font-mono text-[#a1a1aa]">
            {testMode === 'free' ? 'Public Free Demo (IP-Scoped)' : 'Trial Sandbox (Multi-tenant Redis Isolation)'}
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
              Testing against trial <code className="text-[#fb923c] bg-[#18181b] px-1.5 py-0.5 rounded text-xs">POST /v1/trial/check</code> with multi-tenant cryptographic verification and tenant-scoped Redis keys.
            </>
          )}
        </p>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setTestMode('free'); setErrorMessage(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${testMode === 'free'
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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${testMode === 'trial'
                ? 'bg-[#f97316] text-[#09090b] font-semibold shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                : 'bg-[#18181b] text-[#a1a1aa] hover:text-[#fafafa] border border-white/[0.08]'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trial Test (API Key Required)</span>
          </button>
        </div>
      </div>

      {/* Trial Mode Mandatory Authentication Banner & Ephemeral Key Generator */}
      {testMode === 'trial' && (
        <div className="mb-6 p-4 rounded-xl bg-[#131315] border border-white/[0.08] flex flex-col gap-3 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isAuthenticated || trialApiKey?.trim() ? 'bg-[#4edea3]/15 text-[#4edea3]' : 'bg-[#fb923c]/15 text-[#fb923c]'}`}>
                {isAuthenticated || trialApiKey?.trim() ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#fafafa] flex items-center gap-2">
                  <span>
                    {trialApiKey?.trim()
                      ? 'Trial API Key Active'
                      : isAuthenticated
                        ? `Authenticated Session Active: ${user?.email || 'Customer'}`
                        : 'API Key Required for Trial Testing'}
                  </span>
                  {!trialApiKey?.trim() && !isAuthenticated && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#f43f5e]/20 text-[#f43f5e] font-medium border border-[#f43f5e]/30">
                      Mandatory
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-[#a1a1aa] mt-0.5">
                  Trial mode verifies multi-tenant rate limiting using dedicated tenant namespaces in Redis. An API key is required to isolate your quotas.
                </p>
              </div>
            </div>

            {/* Actions: Ephemeral Key Button + Info Badge */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={handleGenerateEphemeralKey}
                disabled={isGeneratingKey}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#353437] text-[#fb923c] font-mono text-xs font-medium border border-[#fb923c]/30 hover:border-[#fb923c]/60 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#fb923c]" />
                <span>{isGeneratingKey ? "Generating..." : "Generate 10m Ephemeral Key"}</span>
              </button>

              <WhyLowTtlBadge />
            </div>
          </div>

          {/* API Key Input Field */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-white/[0.06]">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717a]">
                <Key className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                placeholder={isAuthenticated ? "Enter or override X-API-Key (e.g. rlaas_...)" : "Enter mandatory X-API-Key (e.g. rlaas_...)"}
                value={trialApiKey}
                onChange={e => setTrialApiKey(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#18181b] border border-white/[0.1] text-xs font-mono text-[#fafafa] focus:outline-none focus:border-[#f97316] placeholder-[#71717a]"
              />
            </div>
            {trialApiKey && (
              <button
                type="button"
                onClick={() => setTrialApiKey('')}
                className="px-2.5 py-2 rounded-lg bg-[#18181b] text-[#a1a1aa] hover:text-[#fafafa] text-xs font-mono border border-white/[0.08]"
              >
                Clear
              </button>
            )}
          </div>

          {ephemeralKeyFeedback && (
            <div className="text-[11px] font-mono text-[#4edea3] flex items-center gap-1.5 animate-in fade-in duration-200">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{ephemeralKeyFeedback}</span>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-3 rounded-lg bg-[#f43f5e]/15 border border-[#f43f5e]/30 text-xs text-[#f43f5e] font-mono flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-[#f43f5e] hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid: Parameters & Batch Size on Left, Live Telemetry Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Parameter Tuning & Request Count */}
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
                className={`py-1.5 text-xs font-medium rounded transition-all ${algorithmType === 'TOKEN_BUCKET'
                    ? 'bg-[#f97316] text-[#09090b] font-semibold shadow-sm'
                    : 'text-[#a1a1aa] hover:text-[#fafafa]'
                  }`}
              >
                Token Bucket
              </button>
              <button
                type="button"
                onClick={() => setAlgorithmType('ANCHORED_WINDOW')}
                className={`py-1.5 text-xs font-medium rounded transition-all ${algorithmType === 'ANCHORED_WINDOW'
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

          {/* Dynamic Inputs with Hover Descriptions */}
          {algorithmType === 'TOKEN_BUCKET' ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium text-[#a1a1aa] flex items-center">
                    Capacity
                    <ParamTooltip
                      title="Bucket Capacity"
                      desc="Maximum burst capacity. Defines the peak token volume the bucket holds when idle."
                    />
                  </span>
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
                  <span className="text-[11px] font-medium text-[#a1a1aa] flex items-center">
                    Refill Rate
                    <ParamTooltip
                      title="Refill Rate"
                      desc="Replenishment rate. Number of tokens replenished back into the bucket every cycle."
                    />
                  </span>
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
                  <span className="text-[11px] font-medium text-[#a1a1aa] flex items-center">
                    Interval (ms)
                    <ParamTooltip
                      title="Refill Interval"
                      desc="Refill frequency in milliseconds (e.g., 1000ms = 1 refill batch added per second)."
                    />
                  </span>
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
                  <span className="text-[11px] font-medium text-[#a1a1aa] flex items-center">
                    Window Limit
                    <ParamTooltip
                      title="Window Limit"
                      desc="Request quota. The maximum total requests permitted within each discrete window."
                    />
                  </span>
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
                  <span className="text-[11px] font-medium text-[#a1a1aa] flex items-center">
                    Window (ms)
                    <ParamTooltip
                      title="Window Duration"
                      desc="Duration of anchored window in milliseconds (e.g., 60,000ms = 1m). Counter resets across window boundary."
                    />
                  </span>
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

          {/* Configurable Request Count for Testing Concurrency */}
          <div className="pt-2 flex flex-col gap-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#a1a1aa] flex items-center">
                Number of Requests (Batch Size)
                <ParamTooltip
                  title="Concurrency Batch Size"
                  desc="Number of requests dispatched during Burst or Concurrent tests. Use higher values (e.g. 15, 25, 50) to evaluate Redis concurrency accuracy and race conditions."
                />
              </label>
              <span className="text-[11px] font-mono text-[#fb923c] font-semibold">{requestCount} req</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={requestCount}
                onChange={e => setRequestCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-24 px-3 py-1.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-mono text-[#fafafa] focus:outline-none focus:border-[#f97316]"
              />
              {/* Presets */}
              <div className="flex items-center gap-1.5">
                {[1, 5, 10, 20, 50].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRequestCount(val)}
                    className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${requestCount === val
                        ? 'bg-[#fb923c]/20 text-[#fb923c] font-semibold border border-[#fb923c]/40'
                        : 'bg-[#131315] text-[#a1a1aa] hover:text-[#fafafa] border border-white/[0.06]'
                      }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fail-Safe Mode Selection (User-Decided Outage Behavior) */}
          <div className="pt-2 flex flex-col gap-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#a1a1aa] flex items-center">
                Outage Fail-Safe Action
                <ParamTooltip
                  title="Fail-Safe Behavior"
                  desc="Determines how rate-limiting responds if Redis or backend services go down: FAIL_CLOSED rejects/throttles traffic to protect internal services; FAIL_OPEN allows requests through uninterrupted."
                />
              </label>
              <span className={`text-[11px] font-mono font-semibold ${failMode === 'FAIL_CLOSED' ? 'text-[#f87171]' : 'text-[#4edea3]'}`}>
                {failMode}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFailMode('FAIL_CLOSED')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all text-left flex items-center justify-between border cursor-pointer ${
                  failMode === 'FAIL_CLOSED'
                    ? 'bg-[#f87171]/15 text-[#f87171] border-[#f87171]/40'
                    : 'bg-[#131315] text-[#71717a] hover:text-[#a1a1aa] border-white/[0.06]'
                }`}
              >
                <span>Fail-Closed (Deny)</span>
                {failMode === 'FAIL_CLOSED' && <span className="w-1.5 h-1.5 rounded-full bg-[#f87171]" />}
              </button>
              <button
                type="button"
                onClick={() => setFailMode('FAIL_OPEN')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all text-left flex items-center justify-between border cursor-pointer ${
                  failMode === 'FAIL_OPEN'
                    ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                    : 'bg-[#131315] text-[#71717a] hover:text-[#a1a1aa] border-white/[0.06]'
                }`}
              >
                <span>Fail-Open (Allow)</span>
                {failMode === 'FAIL_OPEN' && <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]" />}
              </button>
            </div>
          </div>

          {/* Test Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              onClick={handleTestSingle}
              disabled={isLoading || (testMode === 'trial' && !trialApiKey?.trim() && !isAuthenticated)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#f97316] hover:bg-[#fb923c] active:bg-[#ea580c] text-[#09090b] font-semibold text-xs transition-all shadow-[0_0_16px_-2px_rgba(249,115,22,0.35)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>1 Request</span>
            </button>

            <button
              onClick={handleBurstTest}
              disabled={isLoading || (testMode === 'trial' && !trialApiKey?.trim() && !isAuthenticated)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#27272a] hover:bg-[#353437] text-[#fafafa] font-semibold text-xs border border-white/[0.1] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-[#fb923c]" />
              <span>Burst ({requestCount}x)</span>
            </button>

            <button
              onClick={handleConcurrentTest}
              disabled={isLoading || (testMode === 'trial' && !trialApiKey?.trim() && !isAuthenticated)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#1f1f21] hover:bg-[#2a2a2c] text-[#4edea3] font-semibold text-xs border border-[#4edea3]/30 transition-all shadow-[0_0_12px_-2px_rgba(78,222,163,0.2)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-[#4edea3]" />
              <span>Concurrent ({requestCount}x)</span>
            </button>
          </div>

          {testMode === 'trial' && !trialApiKey?.trim() && !isAuthenticated && (
            <p className="text-[11px] text-[#fb923c] font-mono text-center">
              * Enter an API key or generate an ephemeral key above to enable testing buttons.
            </p>
          )}
        </div>

        {/* Right Col: Visual Results (Bucket State Summary & Separated Event Buffer) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Top Card: Current Test Batch Summary (No status code, No remaining token, Shows Total, Allowed, Denied) */}
          <div className="bg-[#18181b] border border-white/[0.08] rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#f97316]" />
                <span className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider">
                  Current Bucket State
                </span>
              </div>
              {batchSummary && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-[#a1a1aa]">
                    Mode: <strong className="text-[#fafafa]">{batchSummary.runType}</strong>
                  </span>
                  <span className="text-[#fb923c]">
                    Avg Latency: <strong className="text-[#fafafa]">{batchSummary.avgLatencyMs}ms</strong>
                  </span>
                </div>
              )}
            </div>

            {batchSummary ? (
              <div className="py-4 flex flex-col gap-4">
                {/* 3 Metric Cards: Total Requests Made, Allowed, Denied */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Total Requests Made */}
                  <div className="bg-[#131315] border border-white/[0.08] rounded-xl p-3.5 flex flex-col justify-between shadow-inner">
                    <span className="text-[11px] font-mono text-[#a1a1aa] uppercase tracking-wider">Total Requests</span>
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-[#fafafa] mt-1">
                      {batchSummary.totalReqMade}
                    </span>
                    <span className="text-[10px] text-[#71717a] font-mono mt-0.5">Dispatched</span>
                  </div>

                  {/* Requests Allowed */}
                  <div className="bg-[#4edea3]/5 border border-[#4edea3]/25 rounded-xl p-3.5 flex flex-col justify-between shadow-inner">
                    <span className="text-[11px] font-mono text-[#4edea3] uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-[#4edea3]" />
                      Allowed
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-[#4edea3] mt-1">
                      {batchSummary.reqAllowed}
                    </span>
                    <span className="text-[10px] text-[#4edea3]/70 font-mono mt-0.5">
                      {Math.round((batchSummary.reqAllowed / batchSummary.totalReqMade) * 100)}% Permitted
                    </span>
                  </div>

                  {/* Requests Denied */}
                  <div className="bg-[#f43f5e]/5 border border-[#f43f5e]/25 rounded-xl p-3.5 flex flex-col justify-between shadow-inner">
                    <span className="text-[11px] font-mono text-[#f43f5e] uppercase tracking-wider flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-[#f43f5e]" />
                      Denied
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-[#f43f5e] mt-1">
                      {batchSummary.reqDenied}
                    </span>
                    <span className="text-[10px] text-[#f43f5e]/70 font-mono mt-0.5">
                      {Math.round((batchSummary.reqDenied / batchSummary.totalReqMade) * 100)}% Throttled
                    </span>
                  </div>
                </div>

                {/* Progress / Ratio Bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="w-full h-2 rounded-full bg-[#27272a] overflow-hidden flex shadow-inner">
                    <div
                      className="h-full bg-[#4edea3] transition-all duration-300"
                      style={{ width: `${(batchSummary.reqAllowed / batchSummary.totalReqMade) * 100}%` }}
                    />
                    <div
                      className="h-full bg-[#f43f5e] transition-all duration-300"
                      style={{ width: `${(batchSummary.reqDenied / batchSummary.totalReqMade) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center text-[#71717a]">
                <Clock className="w-8 h-8 mb-2 opacity-50 text-[#a1a1aa]" />
                <span className="text-xs font-mono">No evaluation recorded yet. Select request count and trigger a test!</span>
              </div>
            )}
          </div>

          {/* Event Stream Log Table: Grouped & Separated by Test Runs */}
          <div className="bg-[#18181b] border border-white/[0.08] rounded-xl p-4 shadow-lg flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#a1a1aa] uppercase tracking-wider">
                  Event Buffer ({testBatches.reduce((acc, b) => acc + b.total, 0)} Total Requests)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] font-mono text-[#a1a1aa] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoClearBuffer}
                    onChange={e => setAutoClearBuffer(e.target.checked)}
                    className="rounded bg-[#131315] border-white/[0.2] text-[#f97316] focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Auto-clear on run</span>
                </label>

                {testBatches.length > 0 && (
                  <button
                    onClick={() => { setTestBatches([]); setBatchSummary(null); }}
                    className="flex items-center gap-1 text-[11px] font-mono text-[#a1a1aa] hover:text-[#fb923c] transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {testBatches.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#71717a] font-mono">
                Awaiting edge events... Trigger 1 Request, Burst, or Concurrent test to observe telemetry.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-4 pr-1">
                {testBatches.map((batch, bIdx) => (
                  <div key={batch.id || bIdx} className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#131315]/80 border border-white/[0.06]">
                    {/* Batch Separation Header */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.04] text-[11px] font-mono">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-[#27272a] text-[#fafafa] font-semibold text-[10px]">
                          Batch #{testBatches.length - bIdx}
                        </span>
                        <span className="text-[#fafafa] font-semibold">
                          {batch.runType} ({batch.total} req)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#4edea3] font-medium">{batch.allowed} Allowed</span>
                        <span className="text-[#71717a]">•</span>
                        <span className="text-[#f43f5e] font-medium">{batch.denied} Denied</span>
                        <span className="text-[#71717a]">•</span>
                        <span className="text-[#71717a]">{batch.timestamp}</span>
                      </div>
                    </div>

                    {/* Batch Items */}
                    <div className="space-y-1">
                      {batch.results.map((ev, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#18181b]/70 border border-white/[0.03] text-xs font-mono"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ev.decision === 'ALLOW'
                                  ? 'bg-[#4edea3]/15 text-[#4edea3]'
                                  : 'bg-[#f43f5e]/15 text-[#f43f5e]'
                                }`}
                            >
                              {ev.decision === 'ALLOW' ? 'ALLOWED' : 'DENIED'}
                            </span>
                            <span className="text-[#a1a1aa] truncate max-w-[140px] sm:max-w-[220px]">
                              {ev.bucketKey}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <RemTooltipBadge remaining={ev.remaining} />
                            <span className="text-[#71717a]">{ev.latencyMs ?? 'X'}ms</span>
                          </div>
                        </div>
                      ))}
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
