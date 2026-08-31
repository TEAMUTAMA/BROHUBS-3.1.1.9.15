
import { Asset } from '@/types';

export const ASSET_DATABASE: Asset[] = [
    { id: 'pmgc-fraggers', name: 'TOP FRAGGERS', type: 'PMGC OFFICIAL', gameId: 'pubg', description: 'Official PMGC Top 5 player eliminations.', active: true, locked: false, category: 'SOCIAL', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },
    { id: 'pmgc-leaderboard', name: 'OVERALL RANKING', type: 'PMGC OFFICIAL', gameId: 'pubg', description: 'Live in-game overall ranking for 16 PUBG Mobile teams.', active: true, locked: false, category: 'ENDGAME', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },
    { id: 'pmgc-team-roster', name: 'TEAM ROSTER', type: 'PMGC OFFICIAL', gameId: 'pubg', description: 'Premium 16:9 esports roster — 5-player horizontal lineup with captain focus, HUD effects, and PMGO color sync.', active: true, locked: false, category: 'SOCIAL', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },
    { id: 'pmgc-terminator', name: 'TERMINATOR', type: 'PMGC OFFICIAL', gameId: 'pubg', description: 'Featured player domination banner with live highlight controls.', active: true, locked: false, category: 'INGAME', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },
    
    { id: 'val-team-roster', name: 'TEAM ROSTER', type: 'VCT OFFICIAL', gameId: 'val', description: 'Premium 16:9 esports roster — 5-player horizontal lineup with captain focus, HUD effects, and color sync.', active: true, locked: false, category: 'SOCIAL', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },

    { id: 'mlbb-team-roster', name: 'TEAM ROSTER', type: 'MPL OFFICIAL', gameId: 'mlbb', description: 'Premium 16:9 esports roster — 5-player horizontal lineup with captain focus, HUD effects, and color sync.', active: true, locked: false, category: 'SOCIAL', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },
    { id: 'mlbb-draf-n-pick', name: 'DRAF N PICK', type: 'MPL OFFICIAL', gameId: 'mlbb', description: 'Cyber blue vs magenta Mobile Legends draft template using the Theme 1 Draf N Pick master frame.', active: true, locked: false, category: 'PREGAME', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },

    { id: 'ff-booyah', name: 'BOOYAH SCREEN', type: 'VICTORY', gameId: 'ff', description: 'Champion celebratory overlay.', active: true, locked: false, category: 'ENDGAME', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },
    
    { id: 'hok-dragon', name: 'OBJECTIVE TIMER', type: 'TIMER', gameId: 'hok', description: 'Beast respawn tracking.', active: true, locked: false, category: 'INGAME', nodeStatus: 'LOCAL NODE', tier: 'ULTIMATE' },
    
    { id: 'dota-roshan', name: 'ROSHAN STATUS', type: 'STATE', gameId: 'dota', description: 'Aegis reclamation unit.', active: true, locked: false, category: 'INGAME', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },
];
