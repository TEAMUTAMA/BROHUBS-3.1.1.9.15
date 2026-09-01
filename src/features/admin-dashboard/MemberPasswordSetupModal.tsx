import React, { useState } from 'react';
import { Key, Lock, ShieldCheck, X, Eye, EyeOff } from 'lucide-react';
import { useT } from '@/i18n/LanguageContext';

interface MemberPasswordSetupModalProps {
  memberName: string;
  isFirstSetup?: boolean;
  onSubmit: (verificationCode: string, newPassword: string) => string | null;
  onCancel?: () => void;
  allowCancel?: boolean;
}

const MemberPasswordSetupModal: React.FC<MemberPasswordSetupModalProps> = ({
  memberName,
  isFirstSetup = true,
  onSubmit,
  onCancel,
  allowCancel = false,
}) => {
  const t = useT();
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    setError('');
    if (!verificationCode.trim()) {
      setError(t('mps.errEnterCode'));
      return;
    }
    if (!newPassword.trim()) {
      setError(t('mps.errEnterPassword'));
      return;
    }
    if (newPassword.trim().toUpperCase() !== confirmPassword.trim().toUpperCase()) {
      setError(t('mps.errMismatch'));
      return;
    }
    setSaving(true);
    setSuccess(false);
    const submitError = onSubmit(verificationCode, newPassword);
    setSaving(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />
      <div className="relative w-full max-w-md bg-zinc-950 border border-[#ccff00]/20 rounded-[32px] overflow-hidden p-8 shadow-[0_0_50px_rgba(204,255,0,0.08)]">
        {allowCancel && onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}

        <div className="w-16 h-16 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/20 flex items-center justify-center mb-6 text-[#ccff00] mx-auto">
          <ShieldCheck size={28} />
        </div>

        <h2 className="text-xl font-black tracking-wide uppercase text-white mb-2 text-center">
          {isFirstSetup ? t('mps.titleFirst') : t('mps.titleChange')}
        </h2>
        <p className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase mb-6 text-center leading-relaxed">
          {isFirstSetup
            ? t('mps.greetFirst').replace('{name}', memberName)
            : t('mps.greetChange')}
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-black text-zinc-500 tracking-widest uppercase mb-2 flex items-center gap-2">
              <Key size={12} /> {t('mps.verifCode')}
            </label>
            <input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
              placeholder="BHSXXXXXXXX"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-[#ccff00] font-mono font-bold tracking-wider outline-none focus:border-[#ccff00]/40 uppercase"
            />
          </div>

          <div>
            <label className="text-[9px] font-black text-zinc-500 tracking-widest uppercase mb-2 flex items-center gap-2">
              <Lock size={12} /> {t('mps.newPassword')}
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('mps.newPasswordPlaceholder')}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#ccff00]/40 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-zinc-500 tracking-widest uppercase mb-2 flex items-center gap-2">
              <Lock size={12} /> {t('mps.confirmPassword')}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('mps.confirmPlaceholder')}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#ccff00]/40 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 uppercase tracking-wide">
              {error}
            </p>
          )}

          {success && (
            <p className="text-[10px] font-black text-[#ccff00] bg-[#ccff00]/10 border border-[#ccff00]/20 rounded-lg px-3 py-2 uppercase tracking-wide">
              {t('mps.success')}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 rounded-xl bg-[#ccff00] text-black text-[10px] font-black tracking-widest uppercase hover:opacity-90 transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] disabled:opacity-50"
          >
            {saving ? t('mps.saving') : t('mps.savePassword')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberPasswordSetupModal;
