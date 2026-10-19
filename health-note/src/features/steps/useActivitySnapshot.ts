import { useEffect, useState } from 'react';

import { isDevelopmentPreview, isSnapshot, previewActivity, requestActivity } from './activity';
import type { TStepSnapshot } from './activity';

export function useActivitySnapshot(today: string) {
  const isPreview = isDevelopmentPreview();
  const [snapshot, setSnapshot] = useState<TStepSnapshot | null>(() =>
    isPreview ? previewActivity(today) : null,
  );
  useEffect(() => {
    if (isPreview) return;
    const receive = (event: Event) => {
      const value: unknown = (event as CustomEvent).detail;
      if (isSnapshot(value)) setSnapshot(value);
    };
    const refresh = () => {
      if (document.visibilityState === 'visible') requestActivity('snapshot');
    };
    window.addEventListener('health-note-steps', receive);
    document.addEventListener('visibilitychange', refresh);
    refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => {
      window.removeEventListener('health-note-steps', receive);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(interval);
    };
  }, [isPreview]);
  function reset() {
    if (isPreview) setSnapshot(previewActivity(today, true));
    else requestActivity('reset');
  }
  return { snapshot: snapshot?.date === today ? snapshot : null, isPreview, reset };
}
