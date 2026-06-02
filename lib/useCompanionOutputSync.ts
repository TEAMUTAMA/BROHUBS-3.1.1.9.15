import { useEffect, useRef } from 'react';
import { applyCompanionToProgramLayers, type CompanionTriggerPayload } from './companionProgram';
import { applyCompanionAnimationPayload, type CompanionAnimationPayload } from './overlayAnimation';
import { applyCompanionDataPayload, type CompanionDataPayload } from './overlayData';

type LayerUpdater = (
  updater: (prev: Record<number, string | null>) => Record<number, string | null>
) => void;

/** Single SSE connection: PGM triggers, animation presets, and overlay data → OBS output links. */
export function useCompanionOutputSync(
  setProgramLayers?: LayerUpdater,
  enabled = true
): void {
  const setProgramLayersRef = useRef(setProgramLayers);
  useEffect(() => {
    setProgramLayersRef.current = setProgramLayers;
  }, [setProgramLayers]);

  useEffect(() => {
    if (!enabled) return;

    let sse: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      sse = new EventSource('/api/companion/stream');

      sse.addEventListener('trigger', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data) as CompanionTriggerPayload;
          if (!payload?.assetId || !setProgramLayersRef.current) return;
          setProgramLayersRef.current((prev) => applyCompanionToProgramLayers(prev, payload));
        } catch (err) {
          console.error('Companion trigger SSE error:', err);
        }
      });

      sse.addEventListener('animation', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data) as CompanionAnimationPayload;
          if (!payload?.assetId || !payload.animation) return;
          applyCompanionAnimationPayload(payload);
        } catch (err) {
          console.error('Companion animation SSE error:', err);
        }
      });

      sse.addEventListener('data', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data) as CompanionDataPayload;
          if (!payload?.assetId || !payload.data) return;
          applyCompanionDataPayload(payload);
        } catch (err) {
          console.error('Companion data SSE error:', err);
        }
      });

      sse.addEventListener('error', () => {
        sse?.close();
        reconnectTimeout = setTimeout(connect, 5000);
      });
    };

    connect();

    return () => {
      sse?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [enabled]);
}
