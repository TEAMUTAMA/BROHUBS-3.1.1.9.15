import { Game, Theme } from '../types';
import { getSeedGames, getSeedThemes, serverData } from '../lib/serverData';

export const getGames = async (): Promise<Game[]> => {
  const games = await serverData.games.getAll();
  return games.map((g) => ({
    ...g,
    isReleased: g.isReleased ?? true,
    tier: g.tier ?? 'BASIC',
  }));
};

export const getDefaultGames = async (): Promise<Game[]> => {
  return getSeedGames();
};

export const getDefaultThemes = async (): Promise<Theme[]> => {
  return getSeedThemes();
};

export const saveGames = async (games: Game[]): Promise<void> => {
  return serverData.games.saveAll(games);
};

export const getThemes = async (): Promise<Theme[]> => {
  return serverData.themes.getAll();
};

export const saveThemes = async (themes: Theme[]): Promise<void> => {
  return serverData.themes.saveAll(themes);
};
