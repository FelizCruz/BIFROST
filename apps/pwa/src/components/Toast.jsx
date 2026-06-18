import { useEffect } from 'react';

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(timeoutId);
  }, [toast, onDismiss]);

  if (!toast) {
    return null;
  }

  return (
    <div className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
      <p>{toast.message}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification">
        x
      </button>
    </div>
  );
}

export default Toast;
