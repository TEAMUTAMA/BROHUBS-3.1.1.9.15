
import React, { useState } from 'react';
import { Theme, Asset, AccessTier } from '@/types';
import { AssetCard } from './AssetCard';
import { useT } from '@/i18n/LanguageContext';

interface AssetViewProps {
  gameId: string;
  theme: Theme;
  assets: Asset[]; // New Prop to receive dynamic assets
  onBackToGame: () => void;
  onBackToHub: () => void;
  onSelectAsset: (asset: Asset) => void;
  onPreviewAsset?: (asset: Asset) => void;
  userRole?: 'admin' | 'member';
  memberPackage?: string;
  isDeployMode?: boolean;
  deployedAssetIds?: string[];
  onBackToProject?: () => void;
  onBackToTerminal?: () => void;
}

const AssetView: React.FC<AssetViewProps> = ({
  gameId,
  theme,
  assets: initialAssets,
  onBackToGame,
  onBackToHub,
  onSelectAsset,
  onPreviewAsset,
  userRole = 'member',
  memberPackage = 'BASIC',
  isDeployMode = false,
  deployedAssetIds = [],
  onBackToProject,
  onBackToTerminal,
}) => {
  const t = useT();

  const [localAssets, setLocalAssets] = useState<Asset[]>(initialAssets.map(a => ({
    ...a,
    isReleased: a.isReleased ?? true,
    tier: a.tier ?? 'BASIC'
  })));

  const handleToggleRelease = (id: string) => {
    setLocalAssets(prev => prev.map(a => a.id === id ? { ...a, isReleased: !a.isReleased } : a));
  };

  const handleSetTier = (id: string, tier: AccessTier) => {
    setLocalAssets(prev => prev.map(a => a.id === id ? { ...a, tier } : a));
  };

  const filteredAssets = userRole === 'admin' 
    ? localAssets 
    : localAssets.filter(a => a.isReleased);

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">{t('av.masterAssetHub')}</h1>
        <p className="text-gray-500 text-sm font-medium">{t('av.configureGlobalStandards')}</p>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-4 mb-12 flex-wrap">
        {isDeployMode ? (
          <>
            {onBackToTerminal && (
              <>
                <button 
                  onClick={onBackToTerminal}
                  className="bg-white/5 text-gray-400 border border-white/10 px-4 py-2 rounded-lg font-black text-[10px] tracking-[0.2em] uppercase hover:bg-white/10 hover:text-white transition-all"
                >
                  {t('av.terminal')}
                </button>
                <span className="text-white/20 text-[10px] font-black">/</span>
              </>
            )}
            {onBackToProject && (
              <>
                <button 
                  onClick={onBackToProject}
                  className="bg-white/5 text-gray-400 border border-white/10 px-4 py-2 rounded-lg font-black text-[10px] tracking-[0.2em] uppercase hover:bg-white/10 hover:text-white transition-all"
                >
                  {t('av.project')}
                </button>
                <span className="text-white/20 text-[10px] font-black">/</span>
              </>
            )}
          </>
        ) : (
          <button 
            onClick={onBackToHub}
            className="bg-white/5 text-gray-400 border border-white/10 px-4 py-2 rounded-lg font-black text-[10px] tracking-[0.2em] uppercase hover:bg-white/10 hover:text-white transition-all"
          >
            {t('av.gameHub')}
          </button>
        )}
        {!isDeployMode && (
          <span className="text-white/20 text-[10px] font-black">/</span>
        )}
        <button 
          onClick={onBackToGame}
          className="bg-white/5 text-gray-400 border border-white/10 px-4 py-2 rounded-lg font-black text-[10px] tracking-[0.2em] uppercase hover:bg-white/10 hover:text-white transition-all"
        >
          {gameId.toUpperCase()}
        </button>
        <span className="text-white/20 text-[10px] font-black">/</span>
        <button className="bg-[#ccff00] text-black px-4 py-2 rounded-lg font-black text-[10px] tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(204,255,0,0.3)] border border-[#ccff00]">
          {theme.name}
        </button>
      </div>

      {/* Title Bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ccff00] shadow-[0_0_8px_#ccff00]" />
            <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">
                {gameId.toUpperCase()} <span className="text-gray-600 not-italic mx-1">//</span> {theme.name}
            </h2>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black tracking-widest uppercase">
            {t('av.assetsAvailable').replace('{n}', String(filteredAssets.length))}
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.length > 0 ? (
            filteredAssets.map((asset) => (
                <AssetCard 
                    key={asset.id}
                    asset={asset}
                    onSelect={onSelectAsset}
                    onPreview={onPreviewAsset}
                    userRole={userRole}
                    memberTier={memberPackage}
                    onToggleRelease={handleToggleRelease}
                    onSetTier={handleSetTier}
                    isDeployed={isDeployMode && deployedAssetIds.includes(asset.id)}
                />
            ))
        ) : (
            <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-2xl">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{t('av.noAssetsConfigured')}</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default AssetView;
