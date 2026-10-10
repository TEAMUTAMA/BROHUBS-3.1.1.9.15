import { useEffect, useRef } from 'react';
import { applyCompanionToProgramLayers, type CompanionTriggerPayload } from './companionProgram';
import { applyCompanionAnimationPayload, type CompanionAnimationPayload } from './overlayAnimation';
import { applyCompanionDataPayload, type CompanionDataPayload } from './overlayData';
import { companionStreamUrl } from './streamUrl';
import { companionScopeMatches } from './programLayers';

type LayerUpdater = (
  updater: (prev: Record<number, string | null>) => Record<number, string | null>
) => void;

/** Single SSE connection: PGM triggers, animation presets, and overlay data → OBS output links. */
export function useCompanionOutputSync(
  setProgramLayers?: LayerUpdater,
  enabled = true,
  localProjectScope?: string | null,
  onTrigger?: (payload: CompanionTriggerPayload) => void
): void {
  const setProgramLayersRef = useRef(setProgramLayers);
  const localScopeRef = useRef(localProjectScope);
  const onTriggerRef = useRef(onTrigger);

  useEffect(() => {
    setProgramLayersRef.current = setProgramLayers;
  }, [setProgramLayers]);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    localScopeRef.current = localProjectScope;
  }, [localProjectScope]);

  useEffect(() => {
    if (!enabled || !localProjectScope) return;

    let sse: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const matchesScope = (payloadScope?: string) =>
      companionScopeMatches(payloadScope, localScopeRef.current);

    const connect = () => {
      sse = new EventSource(companionStreamUrl(localScopeRef.current));

      sse.addEventListener('trigger', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data) as CompanionTriggerPayload;
          if (!payload?.assetId) return;
          if (!matchesScope(payload.projectScope)) return;
          if (setProgramLayersRef.current) {
            setProgramLayersRef.current((prev) => applyCompanionToProgramLayers(prev, payload));
          }
          // Beritahu konsumer tiap trigger (mis. untuk memaksa replay animasi walau
          // asset di layer tidak berganti — samakan perilaku dengan Monitor PROGRAM).
          onTriggerRef.current?.(payload);
        } catch (err) {
          console.error('Companion trigger SSE error:', err);
        }
      });

      sse.addEventListener('animation', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data) as CompanionAnimationPayload;
          if (!payload?.assetId || !payload.animation) return;
          if (!matchesScope(payload.projectScope)) return;
          applyCompanionAnimationPayload(payload);
        } catch (err) {
          console.error('Companion animation SSE error:', err);
        }
      });

      sse.addEventListener('data', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data) as CompanionDataPayload;
          if (!payload?.assetId || !payload.data) return;
          if (!matchesScope(payload.projectScope)) return;
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
  }, [enabled, localProjectScope]);
}
