
import { Asset } from '../types';

export const ASSET_DATABASE: Asset[] = [
    { id: 'pmgc-fraggers', name: 'TOP FRAGGERS', type: 'PMGC OFFICIAL', gameId: 'pubg', description: 'Official PMGC Top 5 players leaderboard.', active: true, locked: false, category: 'SOCIAL', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },
    { id: 'pmgc-leaderboard', name: 'OVERALL RANKING', type: 'PMGC OFFICIAL', gameId: 'pubg', description: 'Official PMGC Full 16-team leaderboard.', active: true, locked: false, category: 'ENDGAME', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },
    
    { id: 'mlbb-draft', name: 'DRAFT PICK UI', type: 'BAN/PICK', gameId: 'mlbb', description: 'Tournament standard ban & pick.', active: true, locked: false, category: 'INGAME', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },
    { id: 'mlbb-gold', name: 'GOLD GRAPH', type: 'DATA WIDGET', gameId: 'mlbb', description: 'Real-time economy visualizer.', active: true, locked: false, category: 'INGAME', nodeStatus: 'LOCAL NODE', tier: 'PREMIUM' },
    
    { id: 'val-agent', name: 'AGENT SELECT', type: 'PRE-GAME', gameId: 'val', description: 'Tactical agent selection.', active: true, locked: false, category: 'INGAME', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },
    { id: 'val-spike', name: 'SPIKE TIMER', type: 'WIDGET', gameId: 'val', description: 'Sync with game clock.', active: true, locked: false, category: 'INGAME', nodeStatus: 'LOCAL NODE', tier: 'PREMIUM' },
    
    { id: 'ff-booyah', name: 'BOOYAH SCREEN', type: 'VICTORY', gameId: 'ff', description: 'Champion celebratory overlay.', active: true, locked: false, category: 'ENDGAME', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },
    
    { id: 'hok-dragon', name: 'OBJECTIVE TIMER', type: 'TIMER', gameId: 'hok', description: 'Beast respawn tracking.', active: true, locked: false, category: 'INGAME', nodeStatus: 'LOCAL NODE', tier: 'ULTIMATE' },
    
    { id: 'dota-roshan', name: 'ROSHAN STATUS', type: 'STATE', gameId: 'dota', description: 'Aegis reclamation unit.', active: true, locked: false, category: 'INGAME', nodeStatus: 'GLOBAL NODE', tier: 'ULTIMATE' },
];
