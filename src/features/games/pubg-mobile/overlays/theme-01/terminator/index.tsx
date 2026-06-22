import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, ImageIcon, Palette, Zap } from 'lucide-react';
import { notifyCompanionData } from '@/features/companion/overlayData';
import { useSharedState } from '@/lib/useSharedState';
import {
  DEFAULT_TERMINATOR_VISUAL,
  TERMINATOR_DESIGN_PRESETS,
  TERMINATOR_CONFIG_KEY,
  TERMINATOR_COLOR_KEYS,
  TERMINATOR_COLOR_LABELS,
  TERMINATOR_PLAYER_KILL_HISTORY_KEY,
  applyTerminatorDesignPreset,
  clampTerminatorDisplaySeconds,
  clampTerminatorKillThreshold,
  clampTerminatorPlayerImageScale,
  clampTerminatorPosition,
  clampTerminatorScale,
  getTerminatorDesignPreset,
  migrateTerminatorPlayerImageDefaults,
  terminatorPlayerKey,
  type TerminatorDesignPresetId,
  type TerminatorPlayerKillHistory,
  type TerminatorVisualConfig,
} from '@/features/games/pubg-mobile/logic/terminatorVisual';
import {
  TerminatorBanner,
  TERMINATOR_PREVIEW_TARGET,
  preloadTerminatorImage,
  type TerminatorTarget,
} from './TerminatorBanner';
import type { Asset, Game, PlayerData, Theme } from '@/types';

interface OverlayTerminatorViewProps {
  asset: Asset;
  theme: Theme;
  games: Game[];
  themes: Theme[];
  availableAssets: Asset[];
  userRole: 'admin' | 'member';
  onBack: () => void;
  onSelectTheme?: (theme: Theme) => void;
  onSelectAsset?: (asset: Asset) => void;
  globalLogo?: string | null;
  projectPlayers?: PlayerData[];
  companionProjectScope?: string | null;
  isGlobalStudio?: boolean;
  visualOnly?: boolean;
  monitorFeed?: boolean;
  feedPlayKey?: number;
  style?: React.CSSProperties;
}

interface TerminatorTeam {
  rank: number;
  team: string;
  teamAbbreviation?: string;
  teamLogo?: string;
  country?: string;
  playerNames?: string[];
  playerImages?: string[];
  playerKills?: number[];
  active?: boolean;
}

const LEADERBOARD_TEAMS_KEY = 'BROHUBS_LEADERBOARD_TEAMS';
const LEADERBOARD_MATCH_KEY = 'BROHUBS_LEADERBOARD_MATCH';

const INITIAL_TEAMS: TerminatorTeam[] = [];

const findPlayerImage = (
  projectPlayers: PlayerData[],
  team: TerminatorTeam,
  playerName: string
) => {
  const normalizedPlayerName = playerName.trim().toLowerCase();
  const normalizedTeamName = team.team.trim().toLowerCase();
  const normalizedTeamAbbr = (team.teamAbbreviation || '').trim().toLowerCase();

  const exactTeamMatch = projectPlayers.find((player) => {
    const sameName = player.name.trim().toLowerCase() === normalizedPlayerName;
    const playerTeam = player.team.trim().toLowerCase();
    const playerAbbr = (player.teamAbbreviation || '').trim().toLowerCase();
    const sameTeam =
      playerTeam === normalizedTeamName ||
      playerTeam === normalizedTeamAbbr ||
      playerAbbr === normalizedTeamAbbr ||
      playerAbbr === normalizedTeamName;
    return sameName && sameTeam && player.image?.trim();
  });

  const nameOnlyMatch = projectPlayers.find(
    (player) =>
      player.name.trim().toLowerCase() === normalizedPlayerName && player.image?.trim()
  );

  return exactTeamMatch?.image?.trim() || nameOnlyMatch?.image?.trim() || '';
};

const collectTerminatorTargets = (
  teams: TerminatorTeam[],
  threshold: number,
  projectPlayers: PlayerData[],
  killHistory: TerminatorPlayerKillHistory
): TerminatorTarget[] => {
  const rows = teams.flatMap((team, teamIndex) => {
    const names = team.playerNames ?? [];
    const kills = team.playerKills ?? [];
    return names.map((name, playerIndex) => {
      const playerName = name || `P${playerIndex + 1}`;
      const matchKills = Number(kills[playerIndex] ?? 0);
      const cumulativeKills = (killHistory[terminatorPlayerKey(team.team, playerName)] ?? 0) + matchKills;
      return {
        player: playerName,
        team: (team.teamAbbreviation || team.team || 'TEAM').toUpperCase(),
        teamName: team.team || 'TEAM',
        logo: team.teamLogo,
        image:
          findPlayerImage(projectPlayers, team, playerName) ||
          team.playerImages?.[playerIndex]?.trim() ||
          '',
        kills: matchKills,
        cumulativeKills,
        teamIndex,
      };
    });
  });

  const rankedRows = [...rows]
    .sort(
      (a, b) =>
        b.cumulativeKills - a.cumulativeKills ||
        b.kills - a.kills ||
        a.player.localeCompare(b.player)
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return rankedRows
    .filter((candidate) => candidate.kills > 0 && candidate.cumulativeKills >= threshold)
    .sort((a, b) => a.kills - b.kills || a.rank - b.rank);
};

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
    {children}
  </label>
);

const ColorField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <FieldLabel>{label}</FieldLabel>
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black p-2">
      <input
        aria-label={label}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm font-black uppercase text-white outline-none"
      />
    </div>
  </div>
);

const OverlayTerminatorView: React.FC<OverlayTerminatorViewProps> = ({
  asset,
  projectPlayers = [],
  companionProjectScope = null,
  visualOnly = false,
  style,
}) => {
  const [config, setConfig] = useSharedState<TerminatorVisualConfig>(
    TERMINATOR_CONFIG_KEY,
    DEFAULT_TERMINATOR_VISUAL
  );
  const [teams] = useSharedState<TerminatorTeam[]>(LEADERBOARD_TEAMS_KEY, INITIAL_TEAMS);
  const [currentMatch] = useSharedState<number>(LEADERBOARD_MATCH_KEY, 1);
  const [killHistory] = useSharedState<TerminatorPlayerKillHistory>(
    TERMINATOR_PLAYER_KILL_HISTORY_KEY,
    {}
  );
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [activeTarget, setActiveTarget] = useState<TerminatorTarget | null>(null);
  const triggeredTargetKeysRef = useRef<Set<string>>(new Set());
  const pendingTargetsRef = useRef<TerminatorTarget[]>([]);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPreviewTokenRef = useRef(config.previewToken ?? 0);
  const isPreviewTargetActive =
    activeTarget?.player === TERMINATOR_PREVIEW_TARGET.player && activeTarget.team === TERMINATOR_PREVIEW_TARGET.team;

  useEffect(() => {
    setConfig((prev) => migrateTerminatorPlayerImageDefaults({ ...DEFAULT_TERMINATOR_VISUAL, ...prev }));
  }, [setConfig]);

  useEffect(() => {
    if (visualOnly) return;
    void notifyCompanionData(
      {
        assetId: asset.id,
        data: {
          [TERMINATOR_CONFIG_KEY]: config,
        },
      },
      companionProjectScope
    );
  }, [asset.id, companionProjectScope, config, visualOnly]);

  const threshold = clampTerminatorKillThreshold(config.killThreshold);
  const presetDefaults = useMemo(
    () => getTerminatorDesignPreset(config.designPreset).config,
    [config.designPreset]
  );
  const liveTargets = useMemo(
    () => collectTerminatorTargets(teams, threshold, projectPlayers, killHistory),
    [teams, threshold, projectPlayers, killHistory]
  );

  useEffect(() => {
    liveTargets.forEach((target) => preloadTerminatorImage(target.image));
  }, [liveTargets]);

  const targetKey = useCallback(
    (nextTarget: TerminatorTarget) =>
      `match-${currentMatch}:${threshold}:${nextTarget.team}:${nextTarget.player}`,
    [currentMatch, threshold]
  );
  const target = activeTarget;
  const isTerminatorPreviewActive =
    target?.player === TERMINATOR_PREVIEW_TARGET.player && target.team === TERMINATOR_PREVIEW_TARGET.team;
  const shouldShowHud = (config.enabled || isTerminatorPreviewActive) && Boolean(target);

  const clearHideTimer = () => {
    if (!hideTimerRef.current) return;
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  };

  const showTarget = (nextTarget: TerminatorTarget, holdSeconds = config.displaySeconds) => {
    setActiveTarget(nextTarget);
    clearHideTimer();
    if (
      config.previewHold &&
      nextTarget.player === TERMINATOR_PREVIEW_TARGET.player &&
      nextTarget.team === TERMINATOR_PREVIEW_TARGET.team
    ) {
      return;
    }
    hideTimerRef.current = setTimeout(() => {
      setActiveTarget(null);
      hideTimerRef.current = null;
    }, clampTerminatorDisplaySeconds(holdSeconds) * 1000);
  };

  useEffect(() => () => clearHideTimer(), []);

  useEffect(() => {
    if (!config.enabled) {
      clearHideTimer();
      setActiveTarget(null);
    }
  }, [config.enabled]);

  useEffect(() => {
    triggeredTargetKeysRef.current.clear();
    pendingTargetsRef.current = [];
    clearHideTimer();
    setActiveTarget(null);
  }, [currentMatch, threshold]);

  useEffect(() => {
    if (!config.enabled || config.previewHold || previewEnabled || liveTargets.length === 0) return;
    const nextTargets = liveTargets.filter((nextTarget) => {
      const key = targetKey(nextTarget);
      if (triggeredTargetKeysRef.current.has(key)) return false;
      triggeredTargetKeysRef.current.add(key);
      return true;
    });
    if (nextTargets.length === 0) return;

    pendingTargetsRef.current.push(...nextTargets);
    if (!activeTarget && !hideTimerRef.current) {
      const nextTarget = pendingTargetsRef.current.shift();
      if (nextTarget) showTarget(nextTarget);
    }
  }, [activeTarget, config.enabled, config.previewHold, liveTargets, previewEnabled, targetKey]);

  useEffect(() => {
    if (activeTarget || config.previewHold || previewEnabled || !config.enabled) return;
    const nextTarget = pendingTargetsRef.current.shift();
    if (nextTarget) showTarget(nextTarget);
  }, [activeTarget, config.enabled, config.previewHold, previewEnabled]);

  useEffect(() => {
    if (visualOnly) return;
    if (!previewEnabled) {
      if (isPreviewTargetActive) {
        clearHideTimer();
        setActiveTarget(null);
      }
      return;
    }
    showTarget(TERMINATOR_PREVIEW_TARGET);
  }, [previewEnabled, visualOnly]);

  useEffect(() => {
    if (!config.previewHold) {
      if (isPreviewTargetActive) {
        clearHideTimer();
        setActiveTarget(null);
      }
      return;
    }
    setActiveTarget(TERMINATOR_PREVIEW_TARGET);
    clearHideTimer();
  }, [config.previewHold]);

  useEffect(() => {
    const previewToken = config.previewToken ?? 0;
    if (!previewToken || lastPreviewTokenRef.current === previewToken) return;
    lastPreviewTokenRef.current = previewToken;
    showTarget(TERMINATOR_PREVIEW_TARGET);
  }, [config.previewToken]);

  const updateConfig = <K extends keyof TerminatorVisualConfig>(key: K, value: TerminatorVisualConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const applyDesignPreset = (presetId: TerminatorDesignPresetId) => {
    setConfig((prev) => applyTerminatorDesignPreset(prev, presetId));
  };

  const renderHud = (scale = 1) => (
    <div
      className="relative h-[1080px] w-[1920px] overflow-hidden font-sans select-none"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      {!visualOnly && (
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'conic-gradient(#0a0a0a 90deg, #050505 90deg 180deg, #0a0a0a 180deg 270deg, #050505 270deg)',
            backgroundSize: '40px 40px',
          }}
        />
      )}

      <TerminatorBanner
        target={shouldShowHud ? target : null}
        config={config}
        currentMatch={currentMatch}
        forceShow={isTerminatorPreviewActive}
      />
    </div>
  );

  if (visualOnly) {
    return (
      <div className="relative h-[1080px] w-[1920px] overflow-hidden" style={style}>
        {shouldShowHud ? renderHud() : null}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen bg-[#08090b] text-white">
      <aside className="w-[380px] shrink-0 overflow-y-auto border-r border-white/10 bg-[#111217] p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ccff00]">
              Visual Input
            </div>
            <h1 className="mt-2 text-2xl font-black uppercase leading-none">Terminator</h1>
          </div>
          <button
            type="button"
            onClick={() => updateConfig('enabled', !config.enabled)}
            className={`flex h-11 w-11 items-center justify-center rounded-lg ${
              config.enabled ? 'bg-[#ccff00] text-black' : 'bg-white/10 text-white/60'
            }`}
            title={config.enabled ? 'Terminator ON' : 'Terminator OFF'}
          >
            {config.enabled ? <Eye size={20} strokeWidth={3} /> : <EyeOff size={20} strokeWidth={3} />}
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <FieldLabel>Game Kill Trigger</FieldLabel>
              <input
                type="number"
                min={1}
                max={99}
                value={threshold}
                onChange={(event) =>
                  updateConfig('killThreshold', clampTerminatorKillThreshold(Number(event.target.value)))
                }
                className="h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-center text-lg font-black text-[#ccff00] outline-none"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Preview</FieldLabel>
              <button
                type="button"
                onClick={() => setPreviewEnabled((prev) => !prev)}
                className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg text-xs font-black uppercase tracking-[0.16em] ${
                  previewEnabled ? 'bg-[#ccff00] text-black' : 'bg-black text-white'
                }`}
              >
                <Zap size={16} strokeWidth={3} />
                {previewEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
            <FieldLabel>Default Design</FieldLabel>
            <div className="grid grid-cols-1 gap-2">
              {TERMINATOR_DESIGN_PRESETS.map((preset) => {
                const isSelected =
                  (config.designPreset ?? DEFAULT_TERMINATOR_VISUAL.designPreset) === preset.id &&
                  !config.useCustomBackground;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyDesignPreset(preset.id)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-[#ccff00] bg-[#ccff00]/10'
                        : 'border-white/10 bg-black hover:border-white/25'
                    }`}
                  >
                    <div
                      className="mb-2 h-7 rounded border border-white/10"
                      style={{
                        background: `linear-gradient(110deg, ${preset.swatches[0]} 0%, ${preset.swatches[1]} 58%, ${preset.swatches[2]} 100%)`,
                      }}
                    />
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white">
                      {preset.name}
                    </div>
                    <div className="mt-1 text-[9px] font-medium text-white/45">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel>Duration</FieldLabel>
            <input
              type="number"
              min={1}
              max={30}
              value={clampTerminatorDisplaySeconds(config.displaySeconds)}
              onChange={(event) =>
                updateConfig('displaySeconds', clampTerminatorDisplaySeconds(Number(event.target.value)))
              }
              className="h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-center text-lg font-black text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <FieldLabel>Scale (%)</FieldLabel>
              <input
                type="number"
                value={clampTerminatorScale(config.scale) - presetDefaults.scale}
                onChange={(event) =>
                  updateConfig('scale', clampTerminatorScale(presetDefaults.scale + Number(event.target.value)))
                }
                className="h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-center text-sm font-black text-white outline-none"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Pos X</FieldLabel>
              <input
                type="number"
                value={clampTerminatorPosition(config.x, presetDefaults.x) - presetDefaults.x}
                onChange={(event) =>
                  updateConfig(
                    'x',
                    clampTerminatorPosition(presetDefaults.x + Number(event.target.value), presetDefaults.x)
                  )
                }
                className="h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-center text-sm font-black text-white outline-none"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Pos Y</FieldLabel>
              <input
                type="number"
                value={clampTerminatorPosition(config.y, presetDefaults.y) - presetDefaults.y}
                onChange={(event) =>
                  updateConfig(
                    'y',
                    clampTerminatorPosition(presetDefaults.y + Number(event.target.value), presetDefaults.y)
                  )
                }
                className="h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-center text-sm font-black text-white outline-none"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Player X</FieldLabel>
              <input
                type="number"
                value={
                  clampTerminatorPosition(config.playerImageX, presetDefaults.playerImageX) -
                  presetDefaults.playerImageX
                }
                onChange={(event) =>
                  updateConfig(
                    'playerImageX',
                    clampTerminatorPosition(
                      presetDefaults.playerImageX + Number(event.target.value),
                      presetDefaults.playerImageX
                    )
                  )
                }
                className="h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-center text-sm font-black text-white outline-none"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Player Y</FieldLabel>
              <input
                type="number"
                value={
                  clampTerminatorPosition(config.playerImageY, presetDefaults.playerImageY) -
                  presetDefaults.playerImageY
                }
                onChange={(event) =>
                  updateConfig(
                    'playerImageY',
                    clampTerminatorPosition(
                      presetDefaults.playerImageY + Number(event.target.value),
                      presetDefaults.playerImageY
                    )
                  )
                }
                className="h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-center text-sm font-black text-white outline-none"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Player S (%)</FieldLabel>
              <input
                type="number"
                value={
                  clampTerminatorPlayerImageScale(config.playerImageScale) -
                  presetDefaults.playerImageScale
                }
                onChange={(event) =>
                  updateConfig(
                    'playerImageScale',
                    clampTerminatorPlayerImageScale(
                      presetDefaults.playerImageScale + Number(event.target.value)
                    )
                  )
                }
                className="h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-center text-sm font-black text-[#ccff00] outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel>Title</FieldLabel>
            <input
              value={config.title}
              onChange={(event) => updateConfig('title', event.target.value.toUpperCase())}
              className="h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-sm font-black uppercase tracking-[0.14em] text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {TERMINATOR_COLOR_KEYS.map((key) => (
              <ColorField
                key={key}
                label={TERMINATOR_COLOR_LABELS[key]}
                value={config[key]}
                onChange={(value) => updateConfig(key, value)}
              />
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-[#ccff00]" strokeWidth={3} />
                <FieldLabel>Custom Design</FieldLabel>
              </div>
              <button
                type="button"
                onClick={() => updateConfig('useCustomBackground', !config.useCustomBackground)}
                className={`h-7 rounded px-3 text-[10px] font-black uppercase tracking-[0.16em] ${
                  config.useCustomBackground ? 'bg-[#ccff00] text-black' : 'bg-white/10 text-white/60'
                }`}
              >
                {config.useCustomBackground ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setConfig(DEFAULT_TERMINATOR_VISUAL)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.18em] text-white/70"
          >
            <Palette size={14} strokeWidth={3} />
            Reset Visual
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 items-center justify-center overflow-hidden p-8">
        <div className="relative aspect-video w-full max-w-[1200px] overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
          <div className="absolute left-1/2 top-1/2 h-[1080px] w-[1920px] -translate-x-1/2 -translate-y-1/2 scale-[0.56]">
            {renderHud()}
          </div>
          {!shouldShowHud && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-lg border border-white/10 bg-[#111217] px-6 py-4 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                  Waiting For Match Kill
                </div>
                <div className="mt-2 text-3xl font-black text-[#ccff00]">{threshold}+ Kills</div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OverlayTerminatorView;
