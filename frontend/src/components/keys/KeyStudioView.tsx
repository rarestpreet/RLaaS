import React, { useState, useEffect } from 'react';
import { fetchApiKeys, updateApiKeyStatus, revokeApiKey } from '../../api/apiKeys';
import { ApiKey, ApiKeyCreatedResponse, ApiKeyStatus } from '../../types/apiKey';
import { CreateKeyModal } from './CreateKeyModal';
import { KeySecretModal } from './KeySecretModal';
import { 
  Key, 
  Plus, 
  Trash2, 
  Power, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Calendar, 
  Activity, 
  RotateCw 
} from 'lucide-react';

export const KeyStudioView: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyCreatedResponse | null>(null);

  const loadKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApiKeys();
      setKeys(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleStatusToggle = async (key: ApiKey) => {
    const nextStatus: ApiKeyStatus = key.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateApiKeyStatus(key.id, nextStatus);
      setKeys(prev =>
        prev.map(k => (k.id === key.id ? { ...k, status: nextStatus } : k))
      );
    } catch (err: any) {
      alert(`Could not update status: ${err.message}`);
    }
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    if (!window.confirm(`Are you sure you want to permanently revoke API key "${keyName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await revokeApiKey(keyId);
      setKeys(prev => prev.filter(k => k.id !== keyId));
    } catch (err: any) {
      alert(`Could not revoke key: ${err.message}`);
    }
  };

  const handleKeyCreated = (created: ApiKeyCreatedResponse) => {
    setNewlyCreatedKey(created);
    setSecretModalOpen(true);
    loadKeys();
  };

  const activeKeysCount = keys.filter(k => k.status === 'ACTIVE').length;

  return (
    <div className="w-full py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[#1f1f21] text-[#fb923c] font-semibold border border-white/[0.06]">
              Credential Plane
            </span>
            <span className="text-xs font-mono text-[#71717a]">/</span>
            <span className="text-xs font-mono text-[#a1a1aa]">Client Bearer Tokens</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#fafafa]">
            API Key Generation & Lifecycle Management
          </h1>
          <p className="text-xs sm:text-sm text-[#a1a1aa]">
            Issue cryptographically secure tokens for microservices calling <code className="text-[#fb923c] font-mono">POST /v1/check</code> via the <code className="text-[#fb923c] font-mono">X-API-Key</code> header.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadKeys}
            title="Refresh keys"
            className="p-2.5 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] border border-white/[0.08] transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#fb923c] active:bg-[#ea580c] text-[#09090b] font-semibold text-xs transition-all shadow-[0_0_20px_-2px_rgba(249,115,22,0.4)]"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Key</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#18181b] border border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#a1a1aa] uppercase">Active Keys</span>
            <div className="w-7 h-7 rounded-lg bg-[#4edea3]/10 text-[#4edea3] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#fafafa]">{activeKeysCount}</span>
            <span className="text-xs text-[#71717a]">of {keys.length} total keys</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#18181b] border border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#a1a1aa] uppercase">Security Standard</span>
            <div className="w-7 h-7 rounded-lg bg-[#f97316]/10 text-[#f97316] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-[#fafafa]">SHA-256 Hash at Rest</span>
            <span className="text-xs text-[#4edea3] font-mono">Immutable</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#18181b] border border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#a1a1aa] uppercase">Gateway Header</span>
            <div className="w-7 h-7 rounded-lg bg-[#131315] text-[#fb923c] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <code className="text-xs font-mono text-[#fb923c] bg-[#131315] px-2 py-0.5 rounded border border-white/[0.06]">
              X-API-Key: rlaas_...
            </code>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-[#93000a]/20 border border-[#f43f5e]/40 text-xs text-[#ffdad6] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#f43f5e] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Keys Table Container */}
      <div className="bg-[#18181b] border border-white/[0.08] rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#f97316]" />
            <span className="text-sm font-semibold text-[#fafafa]">Customer Credentials List</span>
          </div>
          <span className="text-xs font-mono text-[#a1a1aa]">{keys.length} Credential(s)</span>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-center text-[#a1a1aa] gap-2">
            <RotateCw className="w-6 h-6 animate-spin text-[#f97316]" />
            <span className="text-xs font-mono">Loading API keys...</span>
          </div>
        ) : keys.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center text-[#a1a1aa] gap-3">
            <Key className="w-10 h-10 opacity-30 text-[#fafafa]" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-[#fafafa]">No API Keys Generated Yet</span>
              <p className="text-xs text-[#71717a] max-w-sm">
                Generate your first API key to start enforcing distributed rate limits from your microservices.
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f97316] text-[#09090b] font-semibold text-xs hover:bg-[#fb923c] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Key</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#131315] text-[#a1a1aa] font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">Key Label & Prefix</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Invocations</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Expires At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-[#e5e1e4]">
                {keys.map(key => (
                  <tr key={key.id} className="hover:bg-[#1f1f21] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-[#fafafa]">{key.name}</span>
                        <code className="text-xs font-mono text-[#fb923c] mt-0.5">
                          {key.keyPrefix}••••••••••••
                        </code>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold ${
                          key.status === 'ACTIVE'
                            ? 'bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30'
                            : key.status === 'INACTIVE'
                            ? 'bg-[#fb923c]/15 text-[#fb923c] border border-[#fb923c]/30'
                            : 'bg-[#f43f5e]/15 text-[#f43f5e] border border-[#f43f5e]/30'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            key.status === 'ACTIVE' ? 'bg-[#4edea3] animate-pulse' : 'bg-current'
                          }`}
                        ></span>
                        {key.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#fafafa]">
                      {key.usageCount.toLocaleString()} calls
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#a1a1aa]">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {key.expiresAt ? (
                        <span className="text-[#a1a1aa]">
                          {new Date(key.expiresAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-[#71717a]">Never expires</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Status toggle button */}
                        <button
                          onClick={() => handleStatusToggle(key)}
                          title={key.status === 'ACTIVE' ? 'Deactivate Key' : 'Activate Key'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            key.status === 'ACTIVE'
                              ? 'bg-[#27272a] text-[#a1a1aa] hover:text-[#fb923c] border-white/[0.08]'
                              : 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {/* Revoke button */}
                        <button
                          onClick={() => handleRevokeKey(key.id, key.name)}
                          title="Permanently Revoke Key"
                          className="p-1.5 rounded-lg bg-[#93000a]/20 hover:bg-[#93000a]/40 text-[#ffb4ab] border border-[#f43f5e]/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateKeyModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onKeyCreated={handleKeyCreated}
      />

      <KeySecretModal
        keyData={newlyCreatedKey}
        onClose={() => {
          setSecretModalOpen(false);
          setNewlyCreatedKey(null);
        }}
      />
    </div>
  );
};
