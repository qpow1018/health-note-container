export type TToastType = 'success' | 'error' | 'info';

export type TToastOptions = {
  duration?: number;
  isShowCloseButton?: boolean;
};

export type TToastItem = {
  id: string;
  message: string;
  type: TToastType;
  duration: number;
  isShowCloseButton: boolean;
};

export const DEFAULT_TOAST_DURATION = 3000;
const DEFAULT_ERROR_TOAST_DURATION = 5000;
export const DEFAULT_IS_SHOW_CLOSE_BUTTON = false;
export const MAX_TOAST_COUNT = 3;

type TToastListener = () => void;

let toasts: TToastItem[] = [];
const listeners = new Set<TToastListener>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function createToast(type: TToastType, message: string, options: TToastOptions = {}): TToastItem {
  return {
    id: crypto.randomUUID(),
    message,
    type,
    duration:
      options.duration ??
      (type === 'error' ? DEFAULT_ERROR_TOAST_DURATION : DEFAULT_TOAST_DURATION),
    isShowCloseButton: options.isShowCloseButton ?? DEFAULT_IS_SHOW_CLOSE_BUTTON,
  };
}

function addToast(type: TToastType, message: string, options?: TToastOptions) {
  const nextToast = createToast(type, message, options);
  toasts = [...toasts, nextToast].slice(-MAX_TOAST_COUNT);
  emitChange();
  return nextToast.id;
}

export function subscribeToast(listener: TToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToastSnapshot() {
  return toasts;
}

export function removeToast(id: string) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emitChange();
}

const toast = {
  success(message: string, options?: TToastOptions) {
    return addToast('success', message, options);
  },
  error(message: string, options?: TToastOptions) {
    return addToast('error', message, options);
  },
  info(message: string, options?: TToastOptions) {
    return addToast('info', message, options);
  },
};

export default toast;
