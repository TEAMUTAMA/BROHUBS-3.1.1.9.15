
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAIResponse } from '../services/geminiService';
import { Message } from '../types';
import { useT } from '../i18n/LanguageContext';

interface AIAssistProps {
  isOpen: boolean;
  onClose: () => void;
  logo: string | null;
}

const AIAssist: React.FC<AIAssistProps> = ({ isOpen, onClose, logo }) => {
  const t = useT();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: t('aia.welcomeMessage') }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    const response = await getAIResponse(userMsg);
    setMessages(prev => [...prev, { role: 'model', text: response || t('aia.errorFallback') }]);
    setIsLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed inset-y-0 right-0 w-full sm:w-96 bg-black border-l border-white/10 z-[120] flex flex-col shadow-2xl"
        >
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden border border-white/10">
                {logo ? (
                  <img src={logo} alt={t('aia.logoAlt')} className="w-full h-full object-contain p-1" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#ccff00]/10">
                    <span className="text-[10px] font-black italic text-[#ccff00]">BH</span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-white font-bold tracking-tight uppercase flex items-center gap-1">
                  BRO<span className="text-[#ccff00]">HUBS</span> {t('aia.supportLabel')}
                </h3>
                <p className="text-[10px] text-[#ccff00] font-black tracking-widest uppercase">{t('aia.systemOnline')}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${msg.role === 'user' ? 'bg-zinc-800' : 'bg-[#ccff00]/10 border border-[#ccff00]/20'}`}>
                    {msg.role === 'user' ? (
                      <User size={14} className="text-white" />
                    ) : (
                      logo ? <img src={logo} className="w-full h-full object-contain p-1" /> : <Bot size={14} className="text-[#ccff00]" />
                    )}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-white/5 text-gray-200 rounded-tr-none' : 'bg-zinc-900 text-white border border-white/5 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <Loader2 size={16} className="text-[#ccff00] animate-spin" />
                  <span className="text-xs text-gray-400 font-medium">{t('aia.thinking')}</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-white/10 bg-zinc-950">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t('aia.inputPlaceholder')}
                className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-6 pr-14 text-sm text-white focus:outline-none focus:border-[#ccff00]/50 transition-all placeholder:text-gray-600"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="absolute right-2 w-10 h-10 bg-[#ccff00] rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIAssist;
