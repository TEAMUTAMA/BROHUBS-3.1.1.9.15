import type { Dispatch, SetStateAction } from 'react';
import { DEFAULT_PROGRAM_LAYERS } from './programLayers';

export type CompanionAction = 'play' | 'stop' | 'toggle';

export interface CompanionTriggerPayload {
  assetId: string;
  action?: CompanionAction;
  layer?: number;
  projectScope?: string;
}

export async function notifyCompanionTrigger(
  assetId: string,
  action: CompanionAction,
  layer?: number,
  projectScope?: string | null
): Promise<void> {
  if (!projectScope) return;
  try {
    await fetch('/api/companion/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, action, layer, projectScope }),
    });
  } catch (err) {
    console.warn('Companion trigger broadcast failed:', err);
  }
}

/** Apply companion play/stop/toggle to program layer state (PGM bus). */
export function applyCompanionToProgramLayers(
  prev: Record<number, string | null>,
  payload: CompanionTriggerPayload,
  assetLayerSelection: Record<string, number | null> = {}
): Record<number, string | null> {
  const { assetId, action = 'toggle', layer } = payload;
  const isProgram = Object.values(prev).includes(assetId);

  if (action === 'play') {
    const activeLayer = layer || assetLayerSelection[assetId] || 1;
    const newLayers = { ...prev };
    Object.keys(newLayers).forEach((key) => {
      if (newLayers[Number(key)] === assetId) newLayers[Number(key)] = null;
    });
    newLayers[activeLayer] = assetId;
    return newLayers;
  }

  if (action === 'stop') {
    const newLayers = { ...prev };
    Object.keys(newLayers).forEach((key) => {
      if (newLayers[Number(key)] === assetId) newLayers[Number(key)] = null;
    });
    return newLayers;
  }

  // toggle
  if (layer !== undefined && layer > 0) {
    const newLayers = { ...prev };
    if (newLayers[layer] === assetId) {
      newLayers[layer] = null;
    } else {
      Object.keys(newLayers).forEach((key) => {
        if (newLayers[Number(key)] === assetId) newLayers[Number(key)] = null;
      });
      newLayers[layer] = assetId;
    }
    return newLayers;
  }

  if (isProgram) {
    const newLayers = { ...prev };
    Object.keys(newLayers).forEach((key) => {
      if (newLayers[Number(key)] === assetId) newLayers[Number(key)] = null;
    });
    return newLayers;
  }

  const activeLayer = assetLayerSelection[assetId] || 1;
  const newLayers = { ...prev };
  Object.keys(newLayers).forEach((key) => {
    if (newLayers[Number(key)] === assetId) newLayers[Number(key)] = null;
  });
  newLayers[activeLayer] = assetId;
  return newLayers;
}

export function createProgramLayerSetter(
  setProgramLayers: Dispatch<SetStateAction<Record<number, string | null>>>,
  assetLayerSelectionRef: { current: Record<string, number | null> }
) {
  return (payload: CompanionTriggerPayload) => {
    setProgramLayers((prev) =>
      applyCompanionToProgramLayers(prev, payload, assetLayerSelectionRef.current)
    );
  };
}

export { DEFAULT_PROGRAM_LAYERS };
