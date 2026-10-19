import { useEffect } from 'react';

let lockCount = 0;
let savedOverflow: string | null = null;

export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow ?? '';
        savedOverflow = null;
      }
    };
  }, [isLocked]);
}
