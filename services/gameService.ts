
import { Game, Theme } from '../types';

const STORAGE_KEY_GAMES = 'BROHUBS_GAMES';
const STORAGE_KEY_THEMES = 'BROHUBS_THEMES';

const DEFAULT_GAMES: Game[] = [
  { title: 'PUBG MOBILE', id: 'pubg', active: true, image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop', isReleased: true, tier: 'BASIC' },
  { title: 'MOBILE LEGENDS', id: 'mlbb', active: true, image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop', isReleased: true, tier: 'BASIC' },
  { title: 'VALORANT', id: 'val', active: true, image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070&auto=format&fit=crop', isReleased: true, tier: 'BASIC' },
  { title: 'FREE FIRE', id: 'ff', active: true, image: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=2070&auto=format&fit=crop', isReleased: true, tier: 'BASIC' },
  { title: 'HONOR OF KINGS', id: 'hok', active: true, image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=2070&auto=format&fit=crop', isReleased: true, tier: 'BASIC' },
  { title: 'DOTA 2', id: 'dota', active: true, image: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?q=80&w=2084&auto=format&fit=crop', isReleased: true, tier: 'BASIC' },
];

const DEFAULT_THEMES: Theme[] = [
    // PUBG MOBILE THEMES (Only PMGC OFFICIAL remaining)
    { id: 'pubg-t3', gameId: 'pubg', name: 'PMGC OFFICIAL', desc: 'Global Championship Style', image: 'https://images.unsplash.com/photo-1620505157895-7d5262e3d30e?q=80&w=2070&auto=format&fit=crop', tier: 'ULTIMATE', locked: false },

    // MOBILE LEGENDS THEMES (Fantasy/Magic)
    { id: 'mlbb-t1', gameId: 'mlbb', name: 'LAND OF DAWN', desc: 'Classic MOBA Interface', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop', tier: 'BASIC', locked: false },
    { id: 'mlbb-t2', gameId: 'mlbb', name: 'MYSTIC GOLD', desc: 'M-Series Championship Look', image: 'https://images.unsplash.com/photo-1519669556878-63bd08b1312b?q=80&w=2070&auto=format&fit=crop', tier: 'PREMIUM', locked: false },
    { id: 'mlbb-t3', gameId: 'mlbb', name: 'ABYSSAL VOID', desc: 'Dark Mode Fantasy', image: 'https://images.unsplash.com/photo-1632213702844-1e0615781374?q=80&w=1932&auto=format&fit=crop', tier: 'ULTIMATE', locked: true },

    // VALORANT THEMES (Cyber/Tech)
    { id: 'val-t1', gameId: 'val', name: 'PROTOCOL 781-A', desc: 'Clean Future Tech', image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070&auto=format&fit=crop', tier: 'BASIC', locked: false },
    { id: 'val-t2', gameId: 'val', name: 'GLITCHPOP', desc: 'Cyberpunk Neon Burst', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop', tier: 'PREMIUM', locked: false },
    
    // FREE FIRE THEMES
    { id: 'ff-t1', gameId: 'ff', name: 'BOOYAH BASE', desc: 'Survivor Default', image: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=2070&auto=format&fit=crop', tier: 'BASIC', locked: false },
    { id: 'ff-t2', gameId: 'ff', name: 'COBRA INITIATIVE', desc: 'Aggressive Red/Black', image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2070&auto=format&fit=crop', tier: 'PREMIUM', locked: false },

    // HONOR OF KINGS THEMES
    { id: 'hok-t1', gameId: 'hok', name: 'DRAGON GATE', desc: 'Traditional MOBA Style', image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=2070&auto=format&fit=crop', tier: 'BASIC', locked: false },

    // DOTA 2 THEMES
    { id: 'dota-t1', gameId: 'dota', name: 'THE INTERNATIONAL', desc: 'Aegis Champion Style', image: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?q=80&w=2084&auto=format&fit=crop', tier: 'ULTIMATE', locked: false },
];

export const getGames = async (): Promise<Game[]> => {
    // Simulasi loading asset game
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Cek LocalStorage
    const saved = localStorage.getItem(STORAGE_KEY_GAMES);
    if (saved) {
        return JSON.parse(saved).map((g: any) => ({
          ...g,
          isReleased: g.isReleased ?? true,
          tier: g.tier ?? 'BASIC'
        }));
    }

    return [...DEFAULT_GAMES];
};

// Fungsi helper untuk mendapatkan data default (untuk fitur Reset)
export const getDefaultGames = async (): Promise<Game[]> => {
    return [...DEFAULT_GAMES];
};

// Helper untuk reset theme
export const getDefaultThemes = async (): Promise<Theme[]> => {
    return [...DEFAULT_THEMES];
};

export const saveGames = async (games: Game[]) => {
    try {
        localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(games));
    } catch (e) {
        console.warn("Local Storage Quota Exceeded for Games. Data not persisted.");
    }
};

export const getThemes = async (): Promise<Theme[]> => {
    // Simulasi loading asset theme
    await new Promise(resolve => setTimeout(resolve, 400));

    const saved = localStorage.getItem(STORAGE_KEY_THEMES);
    if (saved) {
        return JSON.parse(saved);
    }
    return [...DEFAULT_THEMES];
}

export const saveThemes = async (themes: Theme[]) => {
    try {
        localStorage.setItem(STORAGE_KEY_THEMES, JSON.stringify(themes));
    } catch (e) {
        console.warn("Local Storage Quota Exceeded for Themes. Data not persisted.");
    }
}
