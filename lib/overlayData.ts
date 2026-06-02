import { applyCompanionSharedState } from './overlayAnimation';

export interface CompanionDataPayload {
  assetId: string;
  data: Record<string, unknown>;
}

export function applyCompanionDataPayload(payload: CompanionDataPayload): void {
  if (!payload?.data) return;
  for (const [key, value] of Object.entries(payload.data)) {
    applyCompanionSharedState(key, value);
  }
}

export async function notifyCompanionData(payload: CompanionDataPayload): Promise<void> {
  try {
    await fetch('/api/companion/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Companion data sync failed:', err);
  }
}
