import { useEffect } from 'react';
import { applyCompanionAnimationPayload, type CompanionAnimationPayload } from './overlayAnimation';

/** Apply animation settings from control desk to OBS / output link via SSE. */
export function useCompanionAnimationSync(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    let sse: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      sse = new EventSource('/api/companion/stream');

      sse.addEventListener('animation', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data) as CompanionAnimationPayload;
          if (!payload?.assetId || !payload.animation) return;
          applyCompanionAnimationPayload(payload);
        } catch (err) {
          console.error('Companion animation SSE error:', err);
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
