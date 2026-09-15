import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { loginCustomer, registerCustomer, generatePasswordOtp, resetPassword } from '../../api/auth';
import { 
  X, 
  LogIn, 
  UserPlus, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'otp';
  onSuccessRedirect?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  onSuccessRedirect,
}) => {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'otp'>(initialTab);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // OTP form state
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPassword, setOtpNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTabChange = (tab: 'login' | 'register' | 'otp') => {
    setActiveTab(tab);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const resp = await loginCustomer({ email: loginEmail, password: loginPassword });
      login(resp.token, {
        customerId: resp.customerId,
        name: resp.name,
        email: resp.email,
      });
      setSuccessMsg('Authentication successful. Session active (4h TTL).');
      setTimeout(() => {
        onClose();
        if (onSuccessRedirect) onSuccessRedirect();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await registerCustomer({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      });

      // Auto login immediately
      const resp = await loginCustomer({ email: registerEmail, password: registerPassword });
      login(resp.token, {
        customerId: resp.customerId,
        name: resp.name,
        email: resp.email,
      });
      setSuccessMsg('Account created successfully! Session initiated.');
      setTimeout(() => {
        onClose();
        if (onSuccessRedirect) onSuccessRedirect();
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. An account with this email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await generatePasswordOtp({ email: otpEmail });
      setOtpStep(2);
      setSuccessMsg('6-digit OTP has been generated and dispatched to your email.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch OTP. Please check the email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await resetPassword({
        email: otpEmail,
        otp: otpCode,
        newPassword: otpNewPassword,
      });
      setSuccessMsg('Password reset successfully! Please sign in with your new password.');
      setTimeout(() => {
        setActiveTab('login');
        setLoginEmail(otpEmail);
        setOtpStep(1);
        setOtpCode('');
        setOtpNewPassword('');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password. Verify your OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#18181b] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#f97316]/20 border border-[#f97316]/40 flex items-center justify-center text-[#f97316]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-sans font-bold text-sm text-[#fafafa] tracking-tight">
              RLaaS Operator Console
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#a1a1aa] hover:text-[#fafafa] p-1 rounded-lg hover:bg-[#27272a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="p-3 bg-[#131315] border-b border-white/[0.08]">
          <div className="grid grid-cols-3 gap-1 bg-[#18181b] p-1 rounded-xl border border-white/[0.06] text-xs font-medium">
            <button
              onClick={() => handleTabChange('login')}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'login'
                  ? 'bg-[#27272a] text-[#fafafa] shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-[#fafafa]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => handleTabChange('register')}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'register'
                  ? 'bg-[#27272a] text-[#fafafa] shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-[#fafafa]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
            <button
              onClick={() => handleTabChange('otp')}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'otp'
                  ? 'bg-[#27272a] text-[#fafafa] shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-[#fafafa]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Forgot OTP</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-[#93000a]/20 border border-[#f43f5e]/40 text-xs text-[#ffdad6] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#f43f5e] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-[#003824]/30 border border-[#4edea3]/40 text-xs text-[#4edea3] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6">
          {/* TAB 1: SIGN IN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#a1a1aa]">Operator Email</label>
                <input
                  type="email"
                  required
                  placeholder="sre@example.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-sans text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#f97316]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#a1a1aa]">Account Password</label>
                  <button
                    type="button"
                    onClick={() => handleTabChange('otp')}
                    className="text-[11px] text-[#fb923c] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-sans text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#f97316]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-2.5 rounded-lg bg-[#f97316] hover:bg-[#fb923c] active:bg-[#ea580c] text-[#09090b] font-semibold text-xs transition-all shadow-[0_0_16px_-2px_rgba(249,115,22,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In & Issue Session'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#a1a1aa]">Full Name / Identity</label>
                <input
                  type="text"
                  required
                  placeholder="Alex Thorne"
                  value={registerName}
                  onChange={e => setRegisterName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-sans text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#f97316]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#a1a1aa]">Work Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="operator@company.com"
                  value={registerEmail}
                  onChange={e => setRegisterEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-sans text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#f97316]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#a1a1aa]">Secure Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={registerPassword}
                  onChange={e => setRegisterPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-sans text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#f97316]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-2.5 rounded-lg bg-[#f97316] hover:bg-[#fb923c] active:bg-[#ea580c] text-[#09090b] font-semibold text-xs transition-all shadow-[0_0_16px_-2px_rgba(249,115,22,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Registering...' : 'Create Account & Start Session'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* TAB 3: OTP PASSWORD RECOVERY */}
          {activeTab === 'otp' && (
            <div className="flex flex-col gap-4">
              {otpStep === 1 ? (
                <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#a1a1aa]">Account Registered Email</label>
                    <input
                      type="email"
                      required
                      placeholder="operator@company.com"
                      value={otpEmail}
                      onChange={e => setOtpEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-sans text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#f97316]"
                    />
                    <p className="text-[11px] text-[#71717a]">
                      A 6-digit one-time code will be dispatched to this address (5 min validity).
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-[#f97316] hover:bg-[#fb923c] text-[#09090b] font-semibold text-xs transition-all disabled:opacity-50"
                  >
                    {loading ? 'Sending OTP...' : 'Send Verification OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#a1a1aa]">6-Digit OTP Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#131315] border border-white/[0.1] text-sm font-mono tracking-widest text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#f97316]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#a1a1aa]">New Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="••••••••••••"
                      value={otpNewPassword}
                      onChange={e => setOtpNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#131315] border border-white/[0.1] text-xs font-sans text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#f97316]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setOtpStep(1)}
                      className="py-2 px-3 rounded-lg bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] text-xs font-medium"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 rounded-lg bg-[#f97316] hover:bg-[#fb923c] text-[#09090b] font-semibold text-xs transition-all disabled:opacity-50"
                    >
                      {loading ? 'Updating Password...' : 'Verify & Reset Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
