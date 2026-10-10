import React, { useState } from 'react';
import { Bell, X, Zap, Gamepad2, Megaphone, ChevronRight, Check, Clock } from 'lucide-react';
import type { MemberNotification, NotificationType } from '@/types';

interface MemberNotificationModalProps {
  notifications: MemberNotification[];
  memberEmail: string;
  onAcknowledge: (ids: string[]) => void;
  onClose: () => void;
}

const TYPE_META: Record<NotificationType, { icon: React.ElementType; label: string; accent: string }> = {
  UPDATE_TASK: { icon: Zap, label: 'FITUR BARU', accent: '#ccff00' },
  GAME_ASSET: { icon: Gamepad2, label: 'KONTEN BARU', accent: '#00d4ff' },
  ANNOUNCEMENT: { icon: Megaphone, label: 'PENGUMUMAN', accent: '#ff9900' },
};

const PRIORITY_BORDER: Record<string, string> = {
  IMPORTANT: 'border-red-500/40',
  WARNING: 'border-yellow-500/40',
  INFO: 'border-white/10',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export const MemberNotificationModal: React.FC<MemberNotificationModalProps> = ({
  notifications,
  memberEmail,
  onAcknowledge,
  onClose,
}) => {
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const unread = notifications.filter(
    (n) =>
      !n.readBy.includes(memberEmail) &&
      (!n.targetEmails?.length || n.targetEmails.includes(memberEmail))
  );

  if (unread.length === 0) return null;

  const handleAcknowledgeAll = () => {
    const ids = unread.map((n) => n.id);
    setAcknowledged(new Set(ids));
    setTimeout(() => {
      onAcknowledge(ids);
      onClose();
    }, 300);
  };

  const handleAcknowledgeOne = (id: string) => {
    setAcknowledged((prev) => new Set([...prev, id]));
    onAcknowledge([id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleAcknowledgeAll}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg animate-in fade-in slide-in-from-bottom-6 duration-300">
        {/* Header */}
        <div className="bg-zinc-950 border border-white/10 rounded-t-2xl px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse shadow-[0_0_8px_#ccff00]" />
              <span className="text-[10px] font-black text-zinc-500 tracking-[0.4em] uppercase">
                Pembaruan Tersedia
              </span>
            </div>
            <button
              onClick={handleAcknowledgeAll}
              className="text-zinc-600 hover:text-white transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex items-end gap-3">
            <div className="p-2 rounded-xl bg-[#ccff00]/10 border border-[#ccff00]/20">
              <Bell size={20} className="text-[#ccff00]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none">
                Ada {unread.length} Update Baru
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Berikut perubahan yang perlu kamu ketahui
              </p>
            </div>
          </div>
        </div>

        {/* Notification list */}
        <div className="bg-zinc-950/95 border-x border-white/10 max-h-72 overflow-y-auto">
          {unread.map((notif, idx) => {
            const meta = TYPE_META[notif.type];
            const Icon = meta.icon;
            const isAcked = acknowledged.has(notif.id);
            const borderClass = PRIORITY_BORDER[notif.priority ?? 'INFO'] ?? 'border-white/10';

            return (
              <div
                key={notif.id}
                className={`
                  px-6 py-4 border-b border-white/5 transition-all duration-300
                  ${idx === 0 ? '' : ''}
                  ${isAcked ? 'opacity-40' : 'opacity-100'}
                `}
              >
                <div className={`flex gap-3 p-3 rounded-xl border ${borderClass} bg-white/[0.02]`}>
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${meta.accent}15`, border: `1px solid ${meta.accent}30` }}
                  >
                    <Icon size={14} style={{ color: meta.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-[9px] font-black tracking-[0.2em] uppercase"
                        style={{ color: meta.accent }}
                      >
                        {meta.label}
                      </span>
                      {notif.priority === 'IMPORTANT' && (
                        <span className="text-[9px] font-black text-red-400 tracking-wider uppercase">
                          · PENTING
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-white truncate">{notif.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                        <Clock size={9} />
                        {formatDate(notif.createdAt)}
                      </span>
                      {!isAcked && (
                        <button
                          onClick={() => handleAcknowledgeOne(notif.id)}
                          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-white transition-colors group"
                        >
                          <span>Tandai dibaca</span>
                          <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      )}
                      {isAcked && (
                        <span className="flex items-center gap-1 text-[10px] text-[#ccff00]">
                          <Check size={10} />
                          Dibaca
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-zinc-950 border border-white/10 rounded-b-2xl px-6 py-4 flex items-center justify-between gap-3">
          <p className="text-[10px] text-zinc-600 leading-relaxed">
            Kamu bisa mengatur fitur ini di menu masing-masing
          </p>
          <button
            onClick={handleAcknowledgeAll}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[#ccff00] text-black text-xs font-black uppercase tracking-wider rounded-lg hover:bg-[#d4ff33] transition-colors"
          >
            <Check size={12} />
            Mengerti Semua
          </button>
        </div>
      </div>
    </div>
  );
};
