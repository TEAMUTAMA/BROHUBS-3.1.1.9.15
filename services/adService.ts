import { Ad } from '../types';
import { serverData } from '../lib/serverData';

/** Ads — penyimpanan lewat lib/serverData (Firebase / localStorage) */
export const getAds = async (): Promise<Ad[]> => {
  return serverData.ads.getAll();
};

export const saveAds = async (ads: Ad[]): Promise<void> => {
  return serverData.ads.saveAll(ads);
};
