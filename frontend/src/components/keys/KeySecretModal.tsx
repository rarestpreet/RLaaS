import React, { useState } from 'react';
import { Copy, Check, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { ApiKeyCreatedResponse } from '../../types/apiKey';

interface KeySecretModalProps {
  keyData: ApiKeyCreatedResponse | null;
  onClose: () => void;
}

export const KeySecretModal: React.FC<KeySecretModalProps> = ({ keyData, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!keyData) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(keyData.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#18181b] border border-[#f97316]/40 rounded-2xl shadow-2xl p-6 flex flex-col gap-5 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow ambient bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#f97316] to-transparent"></div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f97316]/20 border border-[#f97316]/40 flex items-center justify-center text-[#f97316]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-[#fafafa]">API Key Generated Successfully</h3>
              <span className="text-xs text-[#a1a1aa] font-mono">ID: {keyData.id.slice(0, 12)}...</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#a1a1aa] hover:text-[#fafafa] p-1 rounded-lg hover:bg-[#27272a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Alert Warning */}
        <div className="p-3.5 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 flex items-start gap-3 text-xs text-[#ffb4ab]">
          <AlertTriangle className="w-5 h-5 text-[#ffb4ab] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="font-semibold text-[#fafafa]">Save your API key now:</strong> For security reasons, the full secret entropy is only displayed once. You will not be able to retrieve it again after closing this window.
          </p>
        </div>

        {/* Raw Key Display Box */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-[#a1a1aa] uppercase tracking-wider">
            Raw Gateway Key ({keyData.name})
          </label>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#09090b] border border-white/[0.12] font-mono text-xs text-[#4edea3] select-all break-all gap-3">
            <span>{keyData.rawKey}</span>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                copied
                  ? 'bg-[#4edea3] text-[#09090b]'
                  : 'bg-[#f97316] hover:bg-[#fb923c] text-[#09090b] shadow-sm'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#27272a] hover:bg-[#353437] text-xs font-semibold text-[#fafafa] transition-colors"
          >
            I Have Saved My Key
          </button>
        </div>
      </div>
    </div>
  );
};
