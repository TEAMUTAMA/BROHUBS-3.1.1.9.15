import React, { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ListOrdered,
  Minus,
  Plus,
  Play,
  RefreshCw,
  Repeat2,
  Settings2,
  Zap,
} from 'lucide-react';
import type { AnimationConfig } from '@/constants/transitions';
import {
  LEADERBOARD_ANIMATION_PRESETS,
  LEADERBOARD_ANIMATION_STORAGE_KEY,
  LEADERBOARD_PRESET_OVERRIDES_STORAGE_KEY,
  LEADERBOARD_TRANSITION_TYPES,
  type LeaderboardPresetOverrides,
} from './config';

type TranslationFn = (key: string) => string;

function getTransitionLabel(type: AnimationConfig['inType']): string {
  if (type === 'leaderboard-slide-left') return 'ranking slide left';
  if (type === 'leaderboard-slide-up') return 'ranking slide up';
  return type.replace('-', ' ');
}

interface LeaderboardAnimationPanelProps {
  t: TranslationFn;
  userRole: string;
  animationConfig: AnimationConfig;
  setAnimationConfig: (config: AnimationConfig) => void;
  draftAnimationConfig: AnimationConfig;
  setDraftAnimationConfig: (config: AnimationConfig) => void;
  presetOverrides: LeaderboardPresetOverrides;
  setPresetOverrides: (overrides: LeaderboardPresetOverrides) => void;
  isSaving: boolean;
  onSave: () => void;
  onPlay: () => void;
  onPlayInOut: () => void;
}

export function LeaderboardAnimationPanel({
  t,
  userRole,
  animationConfig,
  setAnimationConfig,
  draftAnimationConfig,
  setDraftAnimationConfig,
  presetOverrides,
  setPresetOverrides,
  isSaving,
  onSave,
  onPlay,
  onPlayInOut,
}: LeaderboardAnimationPanelProps) {
  const [activeDropdown, setActiveDropdown] = useState<{ presetId: string; type: 'in' | 'out' } | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    if (activeDropdown) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  const setPresetTransition = (
    preset: (typeof LEADERBOARD_ANIMATION_PRESETS)[number],
    direction: 'in' | 'out',
    type: AnimationConfig['inType']
  ) => {
    const newOverrides = {
      ...presetOverrides,
      [preset.id]: {
        ...presetOverrides[preset.id],
        [direction === 'in' ? 'inType' : 'outType']: type,
      },
    };
    setPresetOverrides(newOverrides);
    localStorage.setItem(LEADERBOARD_PRESET_OVERRIDES_STORAGE_KEY, JSON.stringify(newOverrides));

    const newConfig = {
      ...animationConfig,
      mode: 'default' as const,
      presetId: preset.id,
      ...(animationConfig.presetId === preset.id ? {} : preset.config),
      [direction === 'in' ? 'inType' : 'outType']: type,
    } as AnimationConfig;
    setAnimationConfig(newConfig);
    localStorage.setItem(LEADERBOARD_ANIMATION_STORAGE_KEY, JSON.stringify(newConfig));
    setActiveDropdown(null);
    onPlay();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="p-2 bg-zinc-900 border border-white/5 rounded-[24px] flex gap-2">
        <button
          onClick={() =>
            setAnimationConfig({
              ...animationConfig,
              mode: 'default',
              presetId: LEADERBOARD_ANIMATION_PRESETS[0].id,
              ...LEADERBOARD_ANIMATION_PRESETS[0].config,
            })
          }
          className={`flex-1 py-4 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${animationConfig.mode === 'default' ? 'bg-[#ccff00] text-black shadow-lg shadow-[#ccff00]/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
        >
          <Zap size={14} fill={animationConfig.mode === 'default' ? 'currentColor' : 'none'} />
          {t('olb.defaultPreset')}
        </button>
        <button
          onClick={() => setAnimationConfig({ ...animationConfig, mode: 'custom' })}
          className={`flex-1 py-4 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${animationConfig.mode === 'custom' ? 'bg-white text-black shadow-lg shadow-white/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
        >
          <Settings2 size={14} />
          {t('olb.customConfig')}
        </button>
      </div>

      {animationConfig.mode === 'custom' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-zinc-950 border border-white/5 rounded-[32px] shadow-xl">
              <h4 className="text-[10px] font-black text-[#ccff00] uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <ArrowDownLeft size={14} /> {t('olb.inTransition')}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {LEADERBOARD_TRANSITION_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setDraftAnimationConfig({ ...draftAnimationConfig, inType: type })}
                    className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${draftAnimationConfig.inType === type ? 'bg-[#ccff00] text-black border-[#ccff00]' : 'bg-black border-white/5 text-zinc-600 hover:text-white hover:border-white/20'}`}
                  >
                    {getTransitionLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-zinc-950 border border-white/5 rounded-[32px] shadow-xl">
              <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <ArrowUpRight size={14} /> {t('olb.outTransition')}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {LEADERBOARD_TRANSITION_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setDraftAnimationConfig({ ...draftAnimationConfig, outType: type })}
                    className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${draftAnimationConfig.outType === type ? 'bg-red-500 text-white border-red-500' : 'bg-black border-white/5 text-zinc-600 hover:text-white hover:border-white/20'}`}
                  >
                    {getTransitionLabel(type)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-zinc-900 border border-white/5 rounded-[32px] shadow-xl">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <Settings2 size={14} /> {t('olb.timingConfiguration')}
            </h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-3">{t('olb.durationSec')}</label>
                <div className="flex items-center gap-4 bg-black/40 border border-white/5 rounded-2xl p-2">
                  <button onClick={() => setDraftAnimationConfig({ ...draftAnimationConfig, duration: Math.max(0.1, draftAnimationConfig.duration - 0.1) })} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white">
                    <Minus size={16} />
                  </button>
                  <div className="flex-1 text-center font-black text-white text-lg">{draftAnimationConfig.duration.toFixed(1)}s</div>
                  <button onClick={() => setDraftAnimationConfig({ ...draftAnimationConfig, duration: draftAnimationConfig.duration + 0.1 })} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-3">{t('olb.delaySec')}</label>
                <div className="flex items-center gap-4 bg-black/40 border border-white/5 rounded-2xl p-2">
                  <button onClick={() => setDraftAnimationConfig({ ...draftAnimationConfig, delay: Math.max(0, draftAnimationConfig.delay - 0.1) })} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white">
                    <Minus size={16} />
                  </button>
                  <div className="flex-1 text-center font-black text-white text-lg">{draftAnimationConfig.delay.toFixed(1)}s</div>
                  <button onClick={() => setDraftAnimationConfig({ ...draftAnimationConfig, delay: draftAnimationConfig.delay + 0.1 })} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-white/5">
              <div>
                <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-3">{t('olb.easingFunction')}</label>
                <select
                  value={draftAnimationConfig.easing}
                  onChange={(e) => setDraftAnimationConfig({ ...draftAnimationConfig, easing: e.target.value as AnimationConfig['easing'] })}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-3 text-[10px] font-black text-white outline-none focus:border-[#ccff00]/30 transition-all uppercase tracking-widest"
                >
                  <option value="linear">Linear</option>
                  <option value="easeIn">Ease In</option>
                  <option value="easeOut">Ease Out</option>
                  <option value="easeInOut">Ease In Out</option>
                  <option value="backOut">Back Out (Overshoot)</option>
                </select>
              </div>
              <div className="flex flex-col justify-center">
                <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-3">{t('olb.springPhysics')}</label>
                <button
                  onClick={() => setDraftAnimationConfig({ ...draftAnimationConfig, useSpring: !draftAnimationConfig.useSpring })}
                  className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-3 ${draftAnimationConfig.useSpring ? 'bg-[#ccff00] text-black border-[#ccff00]' : 'bg-black border-white/5 text-zinc-600'}`}
                >
                  <Zap size={14} fill={draftAnimationConfig.useSpring ? 'currentColor' : 'none'} />
                  {draftAnimationConfig.useSpring ? t('olb.springOn') : t('olb.springOff')}
                </button>
              </div>
              <div className="flex flex-col justify-center">
                <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-3">{t('olb.staggerRows')}</label>
                <button
                  onClick={() => setDraftAnimationConfig({ ...draftAnimationConfig, staggerChildren: !draftAnimationConfig.staggerChildren })}
                  className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-3 ${draftAnimationConfig.staggerChildren ? 'bg-[#ccff00] text-black border-[#ccff00]' : 'bg-black border-white/5 text-zinc-600'}`}
                >
                  <ListOrdered size={14} />
                  {draftAnimationConfig.staggerChildren ? t('olb.staggerOn') : t('olb.staggerOff')}
                </button>
              </div>
              <div className="flex flex-col justify-center">
                <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-3">{t('olb.staggerDirection')}</label>
                <select
                  value={draftAnimationConfig.staggerDirection || 'top-down'}
                  onChange={(e) => {
                    const staggerDirection = e.target.value as AnimationConfig['staggerDirection'];
                    setDraftAnimationConfig({
                      ...draftAnimationConfig,
                      staggerDirection,
                      staggerChildren: draftAnimationConfig.staggerChildren,
                      staggerDelay: draftAnimationConfig.staggerDelay,
                    });
                  }}
                  disabled={!draftAnimationConfig.staggerChildren}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-3 text-[10px] font-black text-white outline-none focus:border-[#ccff00]/30 transition-all uppercase tracking-widest disabled:opacity-50"
                >
                  <option value="top-down">Top to Bottom</option>
                  <option value="bottom-up">Bottom to Top</option>
                  <option value="center-out">Center Out</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-6 border-t border-white/5">
              <button
                type="button"
                onClick={onPlay}
                className="px-5 py-3 rounded-xl border border-[#ccff00]/40 bg-[#ccff00]/10 text-[#ccff00] hover:bg-[#ccff00] hover:text-black transition-all text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
              >
                <Play size={13} fill="currentColor" />
                {t('olb.playTransition')}
              </button>
              <button
                type="button"
                onClick={onPlayInOut}
                className="px-5 py-3 rounded-xl border border-white/15 bg-black text-white hover:border-[#ccff00]/50 hover:text-[#ccff00] transition-all text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
              >
                <Repeat2 size={13} />
                {t('olb.playTransitionInOut')}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LEADERBOARD_ANIMATION_PRESETS.map((basePreset) => {
              const presetConfig = { ...basePreset.config, ...presetOverrides[basePreset.id] };
              const preset = { ...basePreset, config: presetConfig };
              return (
                <div
                  key={preset.id}
                  onClick={() => {
                    setAnimationConfig({
                      ...animationConfig,
                      mode: 'default',
                      presetId: preset.id,
                      ...preset.config,
                    } as AnimationConfig);
                    onPlay();
                  }}
                  className={`p-6 rounded-[32px] border text-left transition-all group relative overflow-hidden cursor-pointer ${animationConfig.presetId === preset.id ? 'bg-[#ccff00] border-[#ccff00] shadow-xl shadow-[#ccff00]/20' : 'bg-zinc-900/50 border-white/5 hover:border-white/20'}`}
                >
                  <div className="relative z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${animationConfig.presetId === preset.id ? 'bg-black/10 text-black' : 'bg-[#ccff00]/10 text-[#ccff00]'}`}>
                      <Zap size={20} fill="currentColor" />
                    </div>
                    <h4 className={`text-sm font-black uppercase tracking-widest mb-1 ${animationConfig.presetId === preset.id ? 'text-black' : 'text-white'}`}>{preset.name}</h4>
                    <p className={`text-[10px] font-bold leading-relaxed ${animationConfig.presetId === preset.id ? 'text-black/60' : 'text-zinc-500'}`}>{preset.description}</p>

                    <div className="flex gap-2 mt-4">
                      {(['in', 'out'] as const).map((direction) => {
                        const selectedType =
                          direction === 'in'
                            ? animationConfig.presetId === preset.id
                              ? animationConfig.inType
                              : preset.config.inType
                            : animationConfig.presetId === preset.id
                              ? animationConfig.outType
                              : preset.config.outType;

                        return (
                          <div key={direction} className="relative">
                            <div
                              onClick={(e) => {
                                if (userRole === 'admin') {
                                  e.stopPropagation();
                                  setActiveDropdown(
                                    activeDropdown?.presetId === preset.id && activeDropdown?.type === direction
                                      ? null
                                      : { presetId: preset.id, type: direction }
                                  );
                                }
                              }}
                              className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${userRole === 'admin' ? 'cursor-pointer hover:ring-1 hover:ring-current' : ''} ${animationConfig.presetId === preset.id ? 'bg-black/10 text-black' : 'bg-black/40 text-zinc-400'}`}
                              title={userRole === 'admin' ? `Click to change ${direction === 'in' ? 'In' : 'Out'}-Transition` : ''}
                            >
                              <span className="opacity-50">{direction.toUpperCase()}:</span>
                              {getTransitionLabel(selectedType)}
                              {userRole === 'admin' && <ChevronDown size={8} />}
                            </div>

                            {activeDropdown?.presetId === preset.id && activeDropdown?.type === direction && (
                              <div className="absolute bottom-full left-0 mb-2 w-32 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[100] py-2 animate-in fade-in zoom-in duration-200">
                                {LEADERBOARD_TRANSITION_TYPES.map((type) => (
                                  <button
                                    key={type}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPresetTransition(preset, direction, type);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-[8px] font-black uppercase tracking-widest hover:bg-[#ccff00] hover:text-black transition-colors ${selectedType === type ? 'text-[#ccff00]' : 'text-zinc-400'}`}
                                  >
                                    {getTransitionLabel(type)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {animationConfig.presetId === preset.id && (
                    <div className="absolute top-4 right-4 text-black">
                      <Check size={20} strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={() => setAnimationConfig({ ...animationConfig, mode: 'custom' })}
              className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] hover:text-[#ccff00] transition-colors"
            >
              Need more control? Switch to Custom Configuration
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center pt-8 gap-4">
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`px-12 py-5 rounded-[24px] font-black text-xs tracking-[0.3em] uppercase flex items-center gap-4 transition-all active:scale-95 shadow-2xl ${isSaving ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-[#ccff00] text-black hover:bg-white hover:scale-[1.02] shadow-[#ccff00]/20'}`}
        >
          {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Settings2 size={18} />}
          {isSaving ? t('olb.updatingBroadcastNode') : t('olb.saveAnimationProtocol')}
        </button>

        <p className="text-[9px] font-black text-zinc-700 tracking-[0.4em] uppercase italic opacity-50">Transmitting configuration to global master node</p>
      </div>
    </div>
  );
}
