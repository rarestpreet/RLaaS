import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Zap, 
  ShieldCheck, 
  Key, 
  Layers, 
  LogOut, 
  User, 
  ChevronDown, 
  Activity,
  CheckCircle2
} from 'lucide-react';

interface HeaderProps {
  currentView: 'landing' | 'policies' | 'keys';
  onNavigate: (view: 'landing' | 'policies' | 'keys') => void;
  onOpenAuth: (initialTab?: 'login' | 'register') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onOpenAuth }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0e0e10]/90 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div 
          onClick={() => onNavigate('landing')} 
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#f97316]/20 to-[#ea580c]/10 border border-[#f97316]/40 flex items-center justify-center text-[#f97316] group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 fill-[#f97316]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-bold text-lg tracking-tight text-[#fafafa]">
                RLaaS<span className="text-[#f97316] font-mono text-sm">.io</span>
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#1f1f21] text-[#fb923c] border border-white/[0.06] font-medium">
                Gateway Edge
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#71717a] leading-none">
              Distributed Control Plane
            </span>
          </div>
        </div>

        {/* Center: System Status & Latency as Xms */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181b] border border-white/[0.08] text-xs font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4edea3]"></span>
            </span>
            <span className="text-[#a1a1aa]">Redis Cluster:</span>
            <span className="text-[#4edea3] font-medium">Operational</span>
            <span className="text-[#71717a]">|</span>
            <span className="text-[#a1a1aa]">Latency:</span>
            <span className="text-[#fb923c] font-semibold">Xms</span>
          </div>
        </div>

        {/* Right: Auth Action or User Profile */}
        <div className="flex items-center gap-3">
          {!isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-[#fafafa] hover:text-[#fb923c] hover:bg-[#1f1f21] transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-[#f97316] hover:bg-[#fb923c] active:bg-[#ea580c] text-[#09090b] shadow-[0_0_16px_-2px_rgba(249,115,22,0.4)] transition-all transform hover:-translate-y-0.5"
              >
                Get Started
              </button>
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-white/[0.08] transition-all group"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#f97316] to-[#fb923c] text-[#09090b] font-bold text-xs flex items-center justify-center">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#fafafa] leading-tight max-w-[120px] truncate">
                    {user?.name || 'Operator'}
                  </span>
                  <span className="text-[10px] font-mono text-[#fb923c] leading-tight">
                    SRE Operator
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-[#a1a1aa] group-hover:text-[#fafafa] transition-transform duration-200" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#18181b] border border-white/[0.12] shadow-2xl p-2 z-50 text-sm animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-white/[0.08] mb-1">
                    <p className="text-xs text-[#a1a1aa]">Signed in as</p>
                    <p className="text-sm font-semibold text-[#fafafa] truncate">{user?.email}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
                      <span className="text-[10px] font-mono text-[#a1a1aa]">Session Active (4h TTL)</span>
                    </div>
                  </div>

                  {/* Policy Studio Under Profile */}
                  <button
                    onClick={() => {
                      onNavigate('policies');
                      setProfileDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                      currentView === 'policies'
                        ? 'bg-[#f97316]/15 text-[#fb923c] font-medium'
                        : 'text-[#e5e1e4] hover:bg-[#27272a] hover:text-[#fafafa]'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-[#f97316]" />
                    <div className="flex flex-col">
                      <span className="font-medium text-xs">Policy Studio & Projects</span>
                      <span className="text-[10px] text-[#a1a1aa]">Configure limit rules & fail modes</span>
                    </div>
                  </button>

                  {/* API Keys Under Profile */}
                  <button
                    onClick={() => {
                      onNavigate('keys');
                      setProfileDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                      currentView === 'keys'
                        ? 'bg-[#f97316]/15 text-[#fb923c] font-medium'
                        : 'text-[#e5e1e4] hover:bg-[#27272a] hover:text-[#fafafa]'
                    }`}
                  >
                    <Key className="w-4 h-4 text-[#f97316]" />
                    <div className="flex flex-col">
                      <span className="font-medium text-xs">API Key Studio</span>
                      <span className="text-[10px] text-[#a1a1aa]">Generate & revoke Bearer tokens</span>
                    </div>
                  </button>

                  {/* Return to Landing View */}
                  <button
                    onClick={() => {
                      onNavigate('landing');
                      setProfileDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                      currentView === 'landing'
                        ? 'bg-[#f97316]/15 text-[#fb923c] font-medium'
                        : 'text-[#e5e1e4] hover:bg-[#27272a] hover:text-[#fafafa]'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-[#4edea3]" />
                    <div className="flex flex-col">
                      <span className="font-medium text-xs">Quick Test Bench</span>
                      <span className="text-[10px] text-[#a1a1aa]">Live rate limiter simulator</span>
                    </div>
                  </button>

                  <div className="my-1 border-t border-white/[0.08]" />

                  {/* Logout Button */}
                  <button
                    onClick={async () => {
                      setProfileDropdownOpen(false);
                      await logout();
                      onNavigate('landing');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[#ffb4ab] hover:bg-[#93000a]/20 hover:text-[#ffdad6] transition-colors text-xs font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
