
import { Ad } from '../types';

const ADS_STORAGE_KEY = 'BROHUBS_ADS';

const DEFAULT_ADS: Ad[] = [
  {
    id: '1',
    imageUrl: 'https://picsum.photos/seed/ad1/1200/400',
    targetUrl: 'https://discord.gg/Qper2dY2Y',
    active: true
  },
  {
    id: '2',
    imageUrl: 'https://picsum.photos/seed/ad2/1200/400',
    targetUrl: 'https://ais-dev-alv446s3bayuh33j6o6ikj-39309596873.asia-east1.run.app',
    active: true
  }
];

export const getAds = (): Ad[] => {
  const saved = localStorage.getItem(ADS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse ads", e);
      return DEFAULT_ADS;
    }
  }
  return DEFAULT_ADS;
};

export const saveAds = (ads: Ad[]) => {
  localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
};
