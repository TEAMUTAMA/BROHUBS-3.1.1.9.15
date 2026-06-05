
import React from 'react';
import { ArrowLeft, Trophy, Layout } from 'lucide-react';
import { Theme, Asset } from '../../../types';
import AssetView from '../../AssetView';

interface FreeFireViewProps {
  onBack: () => void;
  themes: Theme[];
  setThemes: React.Dispatch<React.SetStateAction<Theme[]>>;
  onSelectTheme: (theme: Theme) => void;
  selectedTheme: Theme | null;
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset | null) => void;
  onPreviewAsset?: (asset: Asset) => void;
  userRole: 'admin' | 'member';
  memberPackage: string;
  isDeployMode?: boolean;
  deployedAssetIds?: string[];
  onBackToProject?: () => void;
  onBackToTerminal?: () => void;
}

const FF_ASSETS: Asset[] = [
    { id: 'ff-a1', name: 'BOOYAH SCREEN', type: 'VICTORY UI', gameId: 'FF', description: 'High energy winner overlay animation.', active: true, locked: false, category: 'ENDGAME', nodeStatus: 'GLOBAL NODE' },
];

const FreeFireView: React.FC<FreeFireViewProps> = ({
  onBack,
  themes,
  setThemes,
  onSelectTheme,
  selectedTheme,
  selectedAsset,
  onSelectAsset,
  onPreviewAsset,
  userRole,
  memberPackage,
  isDeployMode = false,
  deployedAssetIds = [],
  onBackToProject,
  onBackToTerminal,
}) => {
  
  const ffThemes = themes.filter(t => t.gameId === 'ff');

  if (selectedTheme) {
    return (
      <AssetView 
          gameId="ff"
          theme={selectedTheme}
          assets={FF_ASSETS}
          onBackToGame={() => onSelectTheme(null as any)}
          onBackToHub={onBack}
          onSelectAsset={onSelectAsset}
          onPreviewAsset={onPreviewAsset}
          userRole={userRole}
          memberPackage={memberPackage}
          isDeployMode={isDeployMode}
          deployedAssetIds={deployedAssetIds}
          onBackToProject={onBackToProject}
          onBackToTerminal={onBackToTerminal}
      />
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 min-h-full flex flex-col">
      <div className="relative w-full h-80 rounded-[40px] overflow-hidden mb-8 group shrink-0">
        <div className="absolute inset-0">
            <img 
                src="https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=2070&auto=format&fit=crop" 
                className="w-full h-full object-cover opacity-60"
                alt="Free Fire Background"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        </div>
        <div className="absolute top-6 left-6 z-20">
             <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                <ArrowLeft size={14} /> BACK TO HUB
             </button>
        </div>
        <div className="absolute bottom-8 left-8 z-20">
            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase leading-none mb-4">
                FREE <span className="text-[#ccff00]">FIRE</span>
            </h1>
            <p className="text-gray-400 text-sm font-medium max-w-lg leading-relaxed">
                Dynamic battle royale overlays for Garena Free Fire. Integrated kill-feeds, character ability HUDs, and survival trackers.
            </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-20">
        {ffThemes.map(theme => (
          <div 
            key={theme.id}
            onClick={() => onSelectTheme(theme)}
            className="group relative aspect-[16/10] rounded-[32px] overflow-hidden border border-white/10 bg-black cursor-pointer hover:border-[#ccff00]/50 transition-all"
          >
            <img src={theme.image} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-70 transition-all" />
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
            <div className="absolute bottom-6 left-6">
                <h3 className="text-lg font-black italic text-white uppercase leading-none mb-1">{theme.name}</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">{theme.tier} DESIGN</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FreeFireView;
